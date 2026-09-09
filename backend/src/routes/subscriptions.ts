import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth, AuthedRequest } from '../lib/auth';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { logAudit, notify, addDays, statusLabel } from '../lib/helpers';
import { encryptCredential } from '../lib/crypto';

const router = Router();
router.use(requireAuth);

export const subscriptionInclude = {
  provider: true,
  package: true,
  payments: { orderBy: { createdAt: 'desc' } },
  cycles: { orderBy: { createdAt: 'desc' }, include: { package: true } },
} satisfies Prisma.SubscriptionInclude;

const createSchema = z.object({
  providerId: z.string().min(1),
  packageId: z.string().min(1),
  phoneNumber: z.string().regex(/^01[0-9]{9}$/, 'رقم الموبايل المصري غير صحيح'),
  name: z.string().min(2).optional(),
});

// Customer: list own subscriptions
router.get('/', async (req: AuthedRequest, res) => {
  const where = req.user!.role === "ADMIN" ? {} : { userId: req.user!.id };
  const subscriptions = await prisma.subscription.findMany({
    where,
    include: subscriptionInclude,
    orderBy: { createdAt: 'desc' },
  });
  res.json({ subscriptions });
});

router.get('/:id', async (req: AuthedRequest, res) => {
  const sub = await prisma.subscription.findUnique({ where: { id: req.params.id }, include: subscriptionInclude });
  if (!sub) return void res.status(404).json({ message: 'الاشتراك مش موجود' });
  if (req.user!.role !== "ADMIN" && sub.userId !== req.user!.id) return void res.status(403).json({ message: 'مش مسموح' });
  res.json({ subscription: sub });
});

// Create a subscription request (customer)
router.post('/', async (req: AuthedRequest, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return void res.status(400).json({ message: parsed.error.issues[0]?.message ?? 'بيانات غير صحيحة' });
  const { providerId, packageId, phoneNumber, name } = parsed.data;
  const pkg = await prisma.package.findUnique({ where: { id: packageId }, include: { provider: true } });
  if (!pkg || !pkg.isActive) return void res.status(404).json({ message: 'الباقة مش موجودة' });
  if (pkg.providerId !== providerId) return void res.status(400).json({ message: 'المزوّد مش مطابق' });

  // app password handled separately (encrypted at /credentials)
  const duplicate = await prisma.subscription.findFirst({ where: { userId: req.user!.id, phoneNumber, status: { in: ["PENDING_PAYMENT", "PENDING_REVIEW", "ACTIVE", "EXPIRING_SOON"] } } });
  if (duplicate) return void res.status(409).json({ message: 'عندك اشتراك نشط بنفس الرقم. انتظر خلصه أو جدده' });

  const subscription = await prisma.subscription.create({
    data: {
      userId: req.user!.id,
      providerId,
      packageId,
      phoneNumber,
      status: "PENDING_PAYMENT",
    },
  });

  // auto-save credential if customer entered app password
  if (typeof req.body.appPassword === 'string' && req.body.appPassword.length > 0) {
    const encrypted = encryptCredential(req.body.appPassword.slice(0, 200));
    await prisma.customerCredential.upsert({
      where: { userId_providerId: { userId: req.user!.id, providerId } },
      update: { ...encrypted },
      create: { userId: req.user!.id, providerId, ...encrypted, subtitle: 'كلمة مرور تطبيق المزوّد' },
    });
  }

  if (name && name !== req.user!.name) {
    await prisma.user.update({ where: { id: req.user!.id }, data: { name } }).catch(() => undefined);
  }

  await logAudit({ actor: req.user!, action: 'subscription.create', entityType: 'Subscription', entityId: subscription.id, details: JSON.stringify({ packageId, phoneNumber }) });
  await notify({ userId: req.user!.id, type: 'subscription.created', title: 'اتعمل طلب اشتراك 🎉', message: `الباقة ${pkg.name} اتبعت طلب اشتراك. كمل الدفع.` });
  res.status(201).json({ subscription });
});

// Renew: create a new PENDING payment on current ACTIVE subscription
router.post('/:id/renew', async (req: AuthedRequest, res) => {
  const sub = await prisma.subscription.findUnique({ where: { id: req.params.id }, include: { package: true, payments: true } } );
  if (!sub) return void res.status(404).json({ message: 'الاشتراك مش موجود' });
  if (req.user!.role !== "ADMIN" && sub.userId !== req.user!.id) return void res.status(403).json({ message: 'مش مسموح' });
  if ((!["ACTIVE", "EXPIRING_SOON", "EXPIRED"].includes(sub.status))) return void res.status(400).json({ message: 'مش ممكن تجدد دلوقتي' });

  // idempotency: don't stack multiple pending renewals
  const pendingExists = await prisma.payment.findFirst({ where: { subscriptionId: sub.id, status: "PENDING" } } );
  if (pendingExists) return void res.status(409).json({ message: 'في طلب تجديد مستني المراجعة أصلًا' });

  const paymentMethodId = typeof req.body.paymentMethodId === 'string' && req.body.paymentMethodId
    ? req.body.paymentMethodId
    : (await prisma.paymentMethod.findFirst({ where: { isActive: true }, orderBy: { sortOrder: 'asc' } }))?.id;
  if (!paymentMethodId) return void res.status(400).json({ message: 'لا توجد وسيلة دفع متاحة' });

  const payment = await prisma.payment.create({
    data: {
      userId: req.user!.id,
      subscriptionId: sub.id,
      amount: sub.package.price,
      paymentMethodId,
      status: "PENDING",
      paidFromPhone: req.body.paidFromPhone ? String(req.body.paidFromPhone) : null,
    },
  });

  await prisma.subscription.update({ where: { id: sub.id }, data: { status: "PENDING_REVIEW" } });
  await notify({ userId: sub.userId, type: 'payment.submitted', title: 'اتبع طلب تجديد 💳', message: `اتبع إثبات دفع لتجديد ${sub.package.name}.` });
  await logAudit({ actor: req.user!, action: 'renewal.request', entityType: 'Subscription', entityId: sub.id, details: JSON.stringify({ paymentId: payment.id }) });
  res.status(201).json({ subscription: await prisma.subscription.findUnique({ where: { id: sub.id }, include: subscriptionInclude }), payment });
});

export { router };

// helper re-export for other routes
export function publicSubscription(sub: any) {
  return {
    ...sub,
    statusLabel: statusLabel(sub.status),
    paymentStatusLabel: sub.payments?.[0] ? statusLabel(sub.payments[0].status) : null,
  };
}
