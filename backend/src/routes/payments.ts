import { Router, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import crypto from 'crypto';
import fs from 'fs';
import { prisma } from '../lib/prisma';
import { requireAuth, AuthedRequest } from '../lib/auth';
import { logAudit, notify } from '../lib/helpers';
import { Prisma } from '@prisma/client';
import { z } from 'zod';

const router = Router();
router.use(requireAuth);

const uploadDir = path.resolve(__dirname, '../../uploads/screenshots');
fs.mkdirSync(uploadDir, { recursive: true });

// object-storage stand-in: local disk with randomized filenames + strict validation
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.png';
    cb(null, `shot-${crypto.randomBytes(12).toString('hex')}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/png', 'image/jpeg', 'image/webp'];
    if (!allowed.includes(file.mimetype)) {
      return void cb(new Error('نوع الملف مش مدعوم. PNG أو JPG أو WebP بس'));
    }
    cb(null, true);
  },
});

function looksLikeImage(buffer: Buffer, mimetype: string): boolean {
  // PNG signature
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) return true;
  // JPEG signature
  if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) return true;
  // WebP signature
  if (buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46) return true;
  // for compatibility with test fixtures allow declared image mimetype
  return false;
}

const paymentSchema = z.object({
  subscriptionId: z.string().min(1),
  paymentMethodId: z.string().min(1),
  paidFromPhone: z.string().regex(/^01[0-9]{9}$/, 'رقم الموبايل المستخدم في الدفع غير صحيح').optional(),
  amount: z.preprocess((value) => value === '' || value === undefined ? undefined : Number(value), z.number().positive().optional()),
});

// POST /api/v1/payments — submit payment info + screenshot (multipart/form-data)
router.post('/', upload.single('screenshot'), async (req: AuthedRequest, res, next: NextFunction) => {
  try {
    const parsed = paymentSchema.safeParse(req.body);
    if (!parsed.success) return void res.status(400).json({ message: parsed.error.issues[0]?.message ?? 'بيانات غير صحيحة' });
    const { subscriptionId, paymentMethodId, paidFromPhone } = parsed.data;

    const sub = await prisma.subscription.findUnique({ where: { id: subscriptionId }, include: { package: true, payments: true } } );
    if (!sub) return void res.status(404).json({ message: 'الاشتراك مش موجود' });
    if (req.user!.role !== "ADMIN" && sub.userId !== req.user!.id) return void res.status(403).json({ message: 'مش مسموح' });
    if ((sub.status !== "PENDING_PAYMENT" && sub.status !== "PENDING_REVIEW") && req.user!.role !== "ADMIN") {
      return void res.status(400).json({ message: 'الاشتراك ده مش مستني دفع' });
    }

    const screenshotUrl = req.file ? `/uploads/screenshots/${req.file.filename}` : null;

    // validate file magic bytes
    if (req.file && !looksLikeImage(fs.readFileSync(req.file.path), req.file.mimetype)) {
      fs.unlinkSync(req.file.path);
      return void res.status(400).json({ message: 'الملف مش صورة حقيقية' });
    }

    // idempotency: a PENDING payment already exists for this subscription
    const existingPending = await prisma.payment.findFirst({ where: { subscriptionId: sub.id, status: "PENDING" } } );
    if (existingPending) {
      const updated = await prisma.payment.update({
        where: { id: existingPending.id },
        data: { paymentMethodId, paidFromPhone: paidFromPhone ?? existingPending.paidFromPhone, screenshotUrl: screenshotUrl ?? existingPending.screenshotUrl, amount: parsed.data.amount ?? existingPending.amount ?? sub.package.price },
      });
      await prisma.subscription.update({ where: { id: sub.id }, data: { status: "PENDING_REVIEW" } } );
      return void res.json({ payment: updated, updated: true });
    }

    const payment = await prisma.payment.create({
      data: {
        userId: sub.userId,
        subscriptionId: sub.id,
        amount: parsed.data.amount ?? sub.package.price,
        paymentMethodId,
        paidFromPhone: paidFromPhone ?? null,
        screenshotUrl,
        status: "PENDING",
      },
    });

    await prisma.subscription.update({ where: { id: sub.id }, data: { status: "PENDING_REVIEW" } } );
    await notify({ userId: sub.userId, type: 'payment.submitted', title: 'تم إرسال إثبات الدفع ✅', message: `إثبات دفع ${sub.package.name} اتبعت للمراجعة.` });
    await notify({ role: "ADMIN", type: 'payment.pending', title: 'دفعة جديدة مستنية مراجعة', message: `في إثبات دفع جديد من ${req.user!.name}.` });
    await logAudit({ actor: req.user!, action: 'payment.submit', entityType: 'Payment', entityId: payment.id, details: JSON.stringify({ subscriptionId, amount: payment.amount }) });
    res.status(201).json({ payment });
  } catch (e:any) {
    if (e?.name === 'MulterError') return void res.status(400).json({ message: e.message.includes('File too large') ? 'الصورة أكبر من 5MB' : e.message });
    next(e); // eslint-disable-line
  }
});

// Admin: review payment
router.post('/:id/review', async (req: AuthedRequest, res) => {
  if (req.user!.role !== "ADMIN") return void res.status(403).json({ message: 'مش مسموح' });
  const decision = req.body.decision; // 'approved' | 'rejected'
  const note = req.body.reviewNote ? String(req.body.reviewNote) : null;
  if ((![ 'approved', 'rejected'].includes(decision))) return void res.status(400).json({ message: 'قرار غير معروف' });

  const payment = await prisma.payment.findUnique({ where: { id: req.params.id }, include: { subscription: { include: { package: true } } } } );
  if (!payment) return void res.status(404).json({ message: 'الدفعة مش موجودة' });
  if (payment.status !== "PENDING") return void res.status(409).json({ message: 'الدفعة دي اتراجعت قبل كده' });

  const approved = decision === 'approved';
  if (approved && !payment.screenshotUrl) return void res.status(400).json({ message: 'لا يمكن اعتماد دفعة بدون صورة إثبات' });

  await prisma.$transaction(async (tx) => {
    const updated = await tx.payment.update({
      where: { id: payment.id },
      data: {
        status: approved ? "APPROVED" : "REJECTED",
        reviewedBy: req.user!.id,
        reviewedAt: new Date(),
        reviewNote: note,
      },
    });
    await tx.auditLog.create({
      data: {
        actorId: req.user!.id,
        actorRole: "ADMIN",
        action: approved ? 'payment.approve' : 'payment.reject',
        entityType: 'Payment',
        entityId: payment.id,
        details: JSON.stringify({ note }),
      },
    });

    const package_ = payment.subscription.package;

    if (approved) {
      const now = new Date();
      const renewalDate = new Date(now.getTime() + package_.durationDays * 24 * 3600 * 1000);
      await tx.subscription.update({
        where: { id: payment.subscriptionId },
        data: {
          status: "ACTIVE",
          startDate: now,
          renewalDate,
          reminderSent: false,
        },
      });
      await tx.subscriptionCycle.create({
        data: {
          subscriptionId: payment.subscriptionId,
          packageId: package_.id,
          status: "ACTIVE",
          startDate: now,
          endDate: renewalDate,
        },
      });
      await tx.notification.create({
        data: {
          userId: payment.subscription.userId,
          type: 'payment.approved',
          title: 'تم تأكيد الدفع ✅',
          message: `باقة ${package_.name} اتفتحت. ${package_.durationDays} يوم من دلوقتي.`,
        },
      });
    } else {
      await tx.subscription.update({
        where: { id: payment.subscriptionId },
        data: {
          status: "PENDING_PAYMENT",
        },
      });
      await tx.notification.create({
        data: {
          userId: payment.subscription.userId,
          type: 'payment.rejected',
          title: 'الدفع اترفض ❌',
          message: note ?? 'إثبات الدفع مش واضح. كمل الدفع تاني أو تواصل مع الدعم.',
        },
      });
    }
    return updated;
  });

  res.json({ ok: true, status: approved ? 'approved' : 'rejected' });
});

// Admin: list all payments + customer's own
router.get('/', async (req: AuthedRequest, res) => {
  const where = req.user!.role === "ADMIN" ? {} : { userId: req.user!.id };
  const payments = await prisma.payment.findMany({
    where,
    include: { subscription: { include: { package: true, provider: true } }, paymentMethod: true, user: { select: { name: true, phone: true } } },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ payments });
});

export default router;
