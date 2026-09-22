import { Router, NextFunction, Request, Response } from 'express';
import multer from 'multer';
import crypto from 'crypto';
import { prisma } from '../lib/prisma';
import { requireAuth, AuthedRequest } from '../lib/auth';
import { logAudit, notify } from '../lib/helpers';
import { z } from 'zod';
import { deletePrivateObject, uploadPrivateObject } from '../lib/storage';
import { paymentForClient, paymentsForClient } from '../lib/payment-view';
import { createPaymobIntention, getPaymobConfig, verifyPaymobWebhookHmac } from '../lib/paymob';

const router = Router();

// ==============================================================================
// PUBLIC ENDPOINTS (No session cookie required, webhook verifies Paymob HMAC)
// ==============================================================================

// GET /api/v1/payments/config — Public payment options & availability
router.get('/config', (_req, res) => {
  res.json({
    paymobAvailable: false,
    environment: 'disabled',
    manualOnly: true,
  });
});

// POST /api/v1/payments/paymob/webhook — Paymob Transaction Webhook
router.post('/paymob/webhook', async (req: Request, res: Response) => {
  if (process.env.PAYMOB_ENABLED !== 'true') return void res.status(410).json({ message: 'الدفع الإلكتروني غير متاح حالياً' });
  /* Legacy Paymob webhook retained below for future reactivation. */
  try {
    const payload = req.body;
    const obj = payload?.obj;

    if (!obj || typeof obj !== 'object') {
      return void res.status(400).json({ message: 'Invalid payload format' });
    }

    // Extract HMAC from query parameter, header, or body
    const receivedHmac =
      (req.query.hmac as string) ||
      (req.headers['x-paymob-hmac'] as string) ||
      payload.hmac ||
      '';

    const isValid = verifyPaymobWebhookHmac(obj, receivedHmac);
    if (!isValid) {
      console.warn('[Paymob Webhook] Rejected unauthorized callback: HMAC mismatch');
      return void res.status(401).json({ message: 'Invalid HMAC signature' });
    }

    const specialReference = String(obj.special_reference || obj.order?.merchant_order_id || '');
    const transactionId = String(obj.id || '');
    const amountCents = Number(obj.amount_cents || 0);
    const isSuccess = Boolean(obj.success);
    const isPending = Boolean(obj.pending);

    // Locate internal payment by special reference (payment ID), intention ID, or order ID
    let payment = await prisma.payment.findFirst({
      where: {
        OR: [
          ...(specialReference ? [{ id: specialReference }] : []),
          ...(obj.order?.id ? [{ paymobOrderId: String(obj.order.id) }] : []),
        ],
      },
      include: {
        subscription: { include: { package: true } },
      },
    });

    if (!payment) {
      console.error('[Paymob Webhook] Payment record not found for reference:', specialReference);
      return void res.status(404).json({ message: 'Payment record not found' });
    }

    // IDEMPOTENCY: Check if payment was already successfully processed
    if (payment.status === 'PAID' || payment.status === 'APPROVED') {
      return void res.status(200).json({ ok: true, message: 'Payment already processed' });
    }

    // VERIFY AMOUNT & CURRENCY
    const expectedAmount = payment.amount;
    const paidAmount = amountCents / 100;
    if (Math.abs(paidAmount - expectedAmount) > 0.01 || obj.currency !== 'EGP') {
      console.error(`[Paymob Webhook] Amount mismatch: expected ${expectedAmount} EGP, received ${paidAmount} ${obj.currency}`);
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: 'FAILED',
          failureReason: `Amount mismatch: expected ${expectedAmount}, got ${paidAmount}`,
          paymobTransactionId: transactionId,
        },
      });
      return void res.status(400).json({ message: 'Payment amount mismatch' });
    }

    if (isSuccess && !isPending) {
      // ATOMIC TRANSACTION: Mark payment paid, activate subscription, award points, and send notifications
      await prisma.$transaction(async (tx) => {
        // Prevent concurrent race condition update
        const currentPayment = await tx.payment.findUnique({ where: { id: payment.id } });
        if (currentPayment?.status === 'PAID' || currentPayment?.status === 'APPROVED') {
          return;
        }

        const now = new Date();
        const package_ = payment.subscription.package;
        const renewalDate = new Date(now.getTime() + package_.durationDays * 24 * 3600 * 1000);

        await tx.payment.update({
          where: { id: payment.id },
          data: {
            status: 'PAID',
            paymobTransactionId: transactionId,
            paidAt: now,
          },
        });

        await tx.subscription.update({
          where: { id: payment.subscriptionId },
          data: {
            status: 'ACTIVE',
            startDate: now,
            renewalDate,
            reminderSent: false,
          },
        });

        await tx.subscriptionCycle.create({
          data: {
            subscriptionId: payment.subscriptionId,
            packageId: package_.id,
            status: 'ACTIVE',
            startDate: now,
            endDate: renewalDate,
          },
        });

        // Award loyalty points: 100 EGP = 10 points
        const earnedPoints = Math.floor(payment.amount / 10);
        if (earnedPoints > 0) {
          await tx.user.update({
            where: { id: payment.subscription.userId },
            data: { points: { increment: earnedPoints } },
          });
          await tx.pointTransaction.create({
            data: {
              userId: payment.subscription.userId,
              amount: earnedPoints,
              reason: `نقاط عن سداد باقة ${package_.name} عبر Paymob (${payment.amount} ج)`,
            },
          });
        }

        await tx.notification.create({
          data: {
            userId: payment.subscription.userId,
            type: 'payment.approved',
            title: 'تم الدفع الإلكتروني بنجاح ✅',
            message: `تم تفعيل باقة ${package_.name} لمدة ${package_.durationDays} يوماً وإضافة ${earnedPoints} نقطة لرصيدك في محب نت! ⭐`,
          },
        });

        await tx.auditLog.create({
          data: {
            actorRole: 'SYSTEM',
            action: 'payment.paymob.success',
            entityType: 'Payment',
            entityId: payment.id,
            details: JSON.stringify({ transactionId, amount: payment.amount, subscriptionId: payment.subscriptionId }),
          },
        });
      });

      return void res.status(200).json({ ok: true, status: 'PAID' });
    } else if (!isSuccess && !isPending) {
      // Payment Failed or Cancelled
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: 'FAILED',
          paymobTransactionId: transactionId,
          failureReason: String(obj.data?.message || 'فشلت عملية الدفع الإلكتروني'),
        },
      });

      await notify({
        userId: payment.subscription.userId,
        type: 'payment.rejected',
        title: 'فشلت عملية الدفع الإلكتروني ❌',
        message: String(obj.data?.message || 'لم تتم عملية الدفع بنجاح. يمكنك المحاولة مرة أخرى أو اختيار وسيلة دفع أخرى.'),
      });

      return void res.status(200).json({ ok: true, status: 'FAILED' });
    }

    // Pending status
    res.status(200).json({ ok: true, status: 'PENDING' });
  } catch (error) {
    console.error('[Paymob Webhook Error]', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

// ==============================================================================
// AUTHENTICATED ENDPOINTS (Require Session Cookie)
// ==============================================================================
router.use(requireAuth);

// POST /api/v1/payments/paymob/initiate — Create Paymob payment intention for subscription
router.post('/paymob/initiate', async (req: AuthedRequest, res: Response) => {
  if (process.env.PAYMOB_ENABLED !== 'true') return void res.status(410).json({ message: 'الدفع الإلكتروني غير متاح حالياً' });
  try {
    const { subscriptionId } = req.body;
    if (!subscriptionId || typeof subscriptionId !== 'string') {
      return void res.status(400).json({ message: 'معرف الاشتراك مطلوب' });
    }

    const sub = await prisma.subscription.findUnique({
      where: { id: subscriptionId },
      include: { package: true },
    });

    if (!sub) {
      return void res.status(404).json({ message: 'الاشتراك غير موجود' });
    }

    if (req.user!.role !== 'ADMIN' && sub.userId !== req.user!.id) {
      return void res.status(403).json({ message: 'غير مصرح لك بالدفع لهذا الاشتراك' });
    }

    if (sub.status !== 'PENDING_PAYMENT' && sub.status !== 'PENDING_REVIEW' && req.user!.role !== 'ADMIN') {
      return void res.status(400).json({ message: 'هذا الاشتراك ليس بانتظار الدفع حالياً' });
    }

    // Amount is derived strictly from the database package price
    const amount = sub.package.price;
    const paymentId = crypto.randomUUID();

    // Create Paymob intention with backend credentials
    const intention = await createPaymobIntention({
      amountEgp: amount,
      packageId: sub.package.id,
      packageName: sub.package.name,
      customerName: req.user!.name,
      customerEmail: req.user!.email,
      customerPhone: req.user!.phone,
      paymentId,
    });

    // Create internal payment record
    const payment = await prisma.payment.create({
      data: {
        id: paymentId,
        userId: sub.userId,
        subscriptionId: sub.id,
        amount,
        paymentChannel: 'PAYMOB',
        status: 'PENDING',
        paymobIntentionId: intention.intentionId,
        paymobOrderId: intention.orderId ? String(intention.orderId) : null,
      },
    });

    await logAudit({
      actor: req.user!,
      action: 'payment.paymob.initiate',
      entityType: 'Payment',
      entityId: payment.id,
      details: JSON.stringify({ subscriptionId, amount, intentionId: intention.intentionId }),
    });

    res.status(201).json({
      payment: await paymentForClient(payment),
      checkoutUrl: intention.checkoutUrl,
      clientSecret: intention.clientSecret,
    });
  } catch (error: any) {
    console.error('[Paymob Initiate Error]', error);
    if (error?.message === 'PAYMOB_NOT_CONFIGURED') {
      return void res.status(503).json({ message: 'خدمة الدفع الإلكتروني Paymob غير مفعلة حالياً في الإعدادات' });
    }
    res.status(500).json({ message: error?.message ?? 'تعذر بدء عملية الدفع' });
  }
});

// GET /api/v1/payments/paymob/status/:id — Check status of a Paymob payment
router.get('/paymob/status/:id', async (req: AuthedRequest, res: Response) => {
  if (process.env.PAYMOB_ENABLED !== 'true') return void res.status(410).json({ message: 'الدفع الإلكتروني غير متاح حالياً' });
  const payment = await prisma.payment.findUnique({
    where: { id: req.params.id },
    include: { subscription: { include: { package: true } } },
  });

  if (!payment) {
    return void res.status(404).json({ message: 'عملية الدفع غير موجودة' });
  }

  if (req.user!.role !== 'ADMIN' && payment.userId !== req.user!.id) {
    return void res.status(403).json({ message: 'غير مصرح' });
  }

  res.json({
    payment: await paymentForClient(payment),
    status: payment.status,
    isPaid: payment.status === 'PAID' || payment.status === 'APPROVED',
  });
});

// ==============================================================================
// MANUAL TRANSFER PAYMENTS (InstaPay / Vodafone Cash / Orange Cash / etc.)
// ==============================================================================

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/png', 'image/jpeg', 'image/webp'];
    if (!allowed.includes(file.mimetype)) {
      return void cb(new Error('نوع الملف مش مدعوم. PNG أو JPG أو WebP بس'));
    }
    cb(null, true);
  },
});

function looksLikeImage(buffer: Buffer): boolean {
  if (buffer.length < 4) return false;
  // PNG signature
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) return true;
  // JPEG signature
  if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) return true;
  // WebP signature
  if (buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46) return true;
  return false;
}

function fileExtension(mimetype: string): string {
  return mimetype === 'image/png' ? 'png' : mimetype === 'image/webp' ? 'webp' : 'jpg';
}

const paymentSchema = z.object({
  subscriptionId: z.string().min(1),
  paymentMethodId: z.string().min(1),
  paidFromPhone: z.string().regex(/^01[0-9]{9}$/, 'رقم الموبايل المستخدم في الدفع غير صحيح').optional(),
});

// POST /api/v1/payments — submit manual payment info + screenshot (multipart/form-data)
router.post('/', upload.single('screenshot'), async (req: AuthedRequest, res: Response, next: NextFunction) => {
  try {
    const parsed = paymentSchema.safeParse(req.body);
    if (!parsed.success) return void res.status(400).json({ message: parsed.error.issues[0]?.message ?? 'بيانات غير صحيحة' });
    const { subscriptionId, paymentMethodId, paidFromPhone } = parsed.data;

    const sub = await prisma.subscription.findUnique({ where: { id: subscriptionId }, include: { package: true, payments: true } });
    if (!sub) return void res.status(404).json({ message: 'الاشتراك مش موجود' });
    const paymentMethod = await prisma.paymentMethod.findUnique({ where: { id: paymentMethodId } });
    if (!paymentMethod || (!paymentMethod.isActive && req.user!.role !== 'ADMIN')) return void res.status(400).json({ message: 'وسيلة الدفع غير متاحة' });
    if (req.user!.role !== 'ADMIN' && sub.userId !== req.user!.id) return void res.status(403).json({ message: 'مش مسموح' });
    if (sub.status !== 'PENDING_PAYMENT' && sub.status !== 'PENDING_REVIEW' && req.user!.role !== 'ADMIN') {
      return void res.status(400).json({ message: 'الاشتراك ده مش مستني دفع' });
    }

    if (!req.file) {
      return void res.status(400).json({ message: 'صورة إثبات الدفع مطلوبة' });
    }
    if (!looksLikeImage(req.file.buffer)) {
      return void res.status(400).json({ message: 'الملف مش صورة حقيقية' });
    }
    // The package in the database is the only source of truth for the amount.
    const amount = sub.package.price;

    // idempotency: a PENDING manual payment already exists for this subscription
    const existingPending = await prisma.payment.findFirst({
      where: { subscriptionId: sub.id, status: 'PENDING', paymentChannel: 'MANUAL' },
    });

    if (existingPending) {
      const screenshotPath = `payments/${existingPending.id}/${crypto.randomBytes(16).toString('hex')}.${fileExtension(req.file.mimetype)}`;
      await uploadPrivateObject(screenshotPath, req.file.buffer, req.file.mimetype);
      const updated = await prisma.payment.update({
        where: { id: existingPending.id },
        data: { paymentMethodId, paidFromPhone: paidFromPhone ?? existingPending.paidFromPhone, screenshotUrl: null, screenshotPath, amount },
      });
      if (existingPending.screenshotPath) await deletePrivateObject(existingPending.screenshotPath).catch(() => undefined);
      await prisma.subscription.update({ where: { id: sub.id }, data: { status: 'PENDING_REVIEW' } });
      return void res.json({ payment: await paymentForClient(updated), updated: true });
    }

    const paymentId = crypto.randomUUID();
    const screenshotPath = `payments/${paymentId}/${crypto.randomBytes(16).toString('hex')}.${fileExtension(req.file.mimetype)}`;
    await uploadPrivateObject(screenshotPath, req.file.buffer, req.file.mimetype);
    let payment;
    try {
      payment = await prisma.payment.create({
        data: {
          id: paymentId,
          userId: sub.userId,
          subscriptionId: sub.id,
          amount,
          paymentChannel: 'MANUAL',
          paymentMethodId,
          paidFromPhone: paidFromPhone ?? null,
          screenshotUrl: null,
          screenshotPath,
          status: 'PENDING',
        },
      });
    } catch (error) {
      await deletePrivateObject(screenshotPath).catch(() => undefined);
      throw error;
    }

    await prisma.subscription.update({ where: { id: sub.id }, data: { status: 'PENDING_REVIEW' } });
    await notify({ userId: sub.userId, type: 'payment.submitted', title: 'تم إرسال إثبات الدفع ✅', message: `إثبات دفع ${sub.package.name} اتبعت للمراجعة.` });
    await notify({ role: 'ADMIN', type: 'payment.pending', title: 'دفعة جديدة مستنية مراجعة', message: `في إثبات دفع جديد من ${req.user!.name}.` });
    await logAudit({ actor: req.user!, action: 'payment.submit', entityType: 'Payment', entityId: payment.id, details: JSON.stringify({ subscriptionId, amount: payment.amount }) });
    res.status(201).json({ payment: await paymentForClient(payment) });
  } catch (e: any) {
    if (e?.name === 'MulterError') return void res.status(400).json({ message: e.message.includes('File too large') ? 'الصورة أكبر من 5MB' : e.message });
    next(e);
  }
});

// Admin: review manual payment
router.post('/:id/review', async (req: AuthedRequest, res: Response) => {
  if (req.user!.role !== 'ADMIN') return void res.status(403).json({ message: 'مش مسموح' });
  const decision = req.body.decision; // 'approved' | 'rejected'
  const note = req.body.reviewNote ? String(req.body.reviewNote) : null;
  if (!['approved', 'rejected'].includes(decision)) return void res.status(400).json({ message: 'قرار غير معروف' });

  const payment = await prisma.payment.findUnique({ where: { id: req.params.id }, include: { subscription: { include: { package: true } } } });
  if (!payment) return void res.status(404).json({ message: 'الدفعة مش موجودة' });
  if (payment.status !== 'PENDING') return void res.status(409).json({ message: 'الدفعة دي اتراجعت قبل كده' });

  const approved = decision === 'approved';
  if (approved && !payment.screenshotPath && !payment.screenshotUrl) return void res.status(400).json({ message: 'لا يمكن اعتماد دفعة بدون صورة إثبات' });

  const processed = await prisma.$transaction(async (tx) => {
    const claimed = await tx.payment.updateMany({
      where: { id: payment.id, status: 'PENDING' },
      data: {
        status: approved ? 'APPROVED' : 'REJECTED',
        reviewedBy: req.user!.id,
        reviewedAt: new Date(),
        reviewNote: note,
      },
    });
    if (claimed.count !== 1) return false;

    await tx.auditLog.create({
      data: {
        actorId: req.user!.id,
        actorRole: 'ADMIN',
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
          status: 'ACTIVE',
          startDate: now,
          renewalDate,
          reminderSent: false,
        },
      });

      await tx.subscriptionCycle.create({
        data: {
          subscriptionId: payment.subscriptionId,
          packageId: package_.id,
          status: 'ACTIVE',
          startDate: now,
          endDate: renewalDate,
        },
      });

      // Award loyalty points: 100 EGP = 10 points
      const earnedPoints = Math.floor(payment.amount / 10);
      if (earnedPoints > 0) {
        await tx.user.update({
          where: { id: payment.subscription.userId },
          data: { points: { increment: earnedPoints } },
        });
        await tx.pointTransaction.create({
          data: {
            userId: payment.subscription.userId,
            amount: earnedPoints,
            reason: `نقاط عن سداد اشتراك باقة ${package_.name} (${payment.amount} ج)`,
          },
        });
      }

      await tx.notification.create({
        data: {
          userId: payment.subscription.userId,
          type: 'payment.approved',
          title: 'تم تأكيد الدفع وإضافة نقاط ✅',
          message: `باقة ${package_.name} اتفتحت. ${package_.durationDays} يوم من دلوقتي، وتمت إضافة ${earnedPoints} نقطة لرصيدك في محب نت! ⭐ (كل 100 ج = 10 نقاط)`,
        },
      });
    } else {
      await tx.subscription.update({
        where: { id: payment.subscriptionId },
        data: {
          status: 'PENDING_PAYMENT',
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

    return true;
  });

  if (!processed) return void res.status(409).json({ message: 'الدفعة دي اتراجعت قبل كده' });

  res.json({ ok: true, status: approved ? 'approved' : 'rejected' });
});

// Admin: list all payments + customer's own
router.get('/', async (req: AuthedRequest, res: Response) => {
  const where = req.user!.role === 'ADMIN' ? {} : { userId: req.user!.id };
  const payments = await prisma.payment.findMany({
    where,
    include: {
      subscription: { include: { package: true, provider: true } },
      paymentMethod: true,
      user: { select: { name: true, phone: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ payments: await paymentsForClient(payments) });
});

export default router;
