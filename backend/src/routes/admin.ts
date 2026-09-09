import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth, requireRole, AuthedRequest } from '../lib/auth';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { logAudit, notify, statusLabel } from '../lib/helpers';
import { decryptCredential } from '../lib/crypto';
import bcrypt from 'bcryptjs';

const router = Router();
router.use(requireAuth, requireRole("ADMIN"));

// ── Dashboard KPIs ─────────────────────────────
router.get('/dashboard', async (_req, res) => {
  const [
    customers, merchantsCount, pendingPayments, merchantDue, activeSubscriptions, expiringSubscriptions, expiredSubscriptions, pendingSubscriptions,
  ] = await Promise.all([
    prisma.user.count({ where: { role: "CUSTOMER" } } ),
    prisma.merchant.count(),
    prisma.payment.count({ where: { status: "PENDING" } } ),
    prisma.merchantPaymentObligation.aggregate({ where: { status: { in: ["PENDING", "OVERDUE"] } }, _sum: { amount: true } }),
    prisma.subscription.count({ where: { status: { in: ["ACTIVE", "EXPIRING_SOON"] } } }),
    prisma.subscription.count({ where: { status: "EXPIRING_SOON" } } ),
    prisma.subscription.count({ where: { status: "EXPIRED" } } ),
    prisma.subscription.count({ where: { status: "PENDING_REVIEW" } } ),
  ]);

  const recentSubscriptions = await prisma.subscription.findMany({
    include: { user: { select: { name: true, phone: true, source: true, merchant: { select: { name: true } } } } , package: true, provider: true },
    orderBy: { createdAt: 'desc' },
    take: 8,
  });
  const recentPayments = await prisma.payment.findMany({
    include: { user: { select: { name: true, phone: true } } , subscription: { include: { package: true, provider: true } }, paymentMethod: true },
    orderBy: { createdAt: 'desc' },
    take:8,
  });
  res.json({
    kpis: { customers, merchantsCount, pendingPayments, merchantDue: merchantDue._sum.amount ?? 0, activeSubscriptions, expiringSubscriptions, expiredSubscriptions, pendingSubscriptions },
    recentSubscriptions,
    recentPayments,
  });
});

// ── Customers table ────────────────────────────
router.get('/customers', async (req, res) => {
  const { search, source, merchantId, status } = req.query as Record<string, string | undefined>;

  const statuses: string[] = [];
  if (status === 'active') statuses.push("ACTIVE", "EXPIRING_SOON");
  else if (status === 'expiring') statuses.push("EXPIRING_SOON");
  else if (status === 'expired') statuses.push("EXPIRED");
  else if (status === 'pending') statuses.push("PENDING_PAYMENT", "PENDING_REVIEW");

  const where: Prisma.UserWhereInput = { role: "CUSTOMER" };
  if (source) where.source = source as any;
  if (merchantId) where.merchantId = merchantId;
  if (search) where.OR = [
    { name: { contains: search } }, { phone: { contains: search } },
  ];

  const customers = await prisma.user.findMany({
    where,
    include: {
      merchant: { select: { id: true, name: true } },
      subscriptions: {
        orderBy: { createdAt: 'desc' },
        take:1,
        include: { provider: true, package: true, payments: { orderBy: { createdAt: 'desc' }, take: 1 } },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const filtered = statuses.length ? customers.filter((c) => c.subscriptions?.[0] && statuses.includes(c.subscriptions[0].status)) : customers;

  res.json({
    customers: filtered.map((c) => ({
      id: c.id,
      name: c.name,
      phone: c.phone,
      source: c.source,
      merchant: c.merchant ?? null,
      subscription: c.subscriptions?.[0] ?? null,
      subscriptionStatus: c.subscriptions?.[0]?.status ?? null,
      subscriptionStatusLabel: c.subscriptions?.[0] ? statusLabel(c.subscriptions[0].status) : 'مفيش اشتراك',
    })),
  });
});

router.get('/customers/:id', async (req, res) => {
  const customer = await prisma.user.findUnique({
    where: { id: req.params.id },
    include: {
      merchant: { select: { id: true, name: true } },
      subscriptions: { include: { provider: true, package: true, payments: { include: { paymentMethod: true } }, cycles: { include: { package: true } } } },
      appCredentials: { include: { provider: true } },
    },
  });
  if (!customer || customer.role !== "CUSTOMER") return void res.status(404).json({ message: 'العميل مش موجود' });
  res.json({ customer: { ...customer, passwordHash: undefined } });
});

// ── Admin payment review list ───────────────────
router.get('/payments', async (req, res) => {
  const { status } = req.query as Record<string, string | undefined>;
  const where: Prisma.PaymentWhereInput = {};
  if (status === 'pending') where.status = "PENDING";
  else if (status) where.status = status as string;

  const payments = await prisma.payment.findMany({
    where,
    include: {
      user: { select: { name: true, phone: true }  },
      subscription: { include: { package: true, provider: true, user: { select: { name: true, phone: true } } } },
      paymentMethod: true,
    },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ payments });
});

// ── Admin subscriptions management ─────────────
router.get('/subscriptions', async (req, res) => {
  const { status } = req.query as Record<string, string | undefined>;
  const where: Prisma.SubscriptionWhereInput = {};
  if (status) where.status = status as string;

  const subscriptions = await prisma.subscription.findMany({
    where,
    include: {
      user: { select: { name: true, phone: true }  },
      provider: true,
      package: true,
      payments: { orderBy: { createdAt: 'desc' } },
    },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ subscriptions });
});

router.post('/subscriptions/:id/activate', async (req: AuthedRequest, res) => {
  const sub = await prisma.subscription.findUnique({ where: { id: req.params.id }, include: { package: true } } );
  if (!sub) return void res.status(404).json({ message: 'الاشتراك مش موجود' });
  await prisma.$transaction(async (tx) => {
    const now = new Date();
    const renewalDate = new Date(now.getTime() + sub.package.durationDays * 24 * 3600 * 1000);
    await tx.subscription.update({
      where: { id: sub.id },
      data: { status: "ACTIVE", startDate: now, renewalDate, reminderSent: false },
    });
    await tx.subscriptionCycle.create({ data: { subscriptionId: sub.id, packageId: sub.packageId, status: "ACTIVE", startDate: now, endDate: renewalDate } });
    await tx.auditLog.create({ data: { actorId: req.user!.id, actorRole: "ADMIN", action: 'subscription.activate', entityType: 'Subscription', entityId: sub.id } });
    await tx.notification.create({ data: { userId: sub.userId, type: 'subscription.activated', title: 'اشتراكك اتفتح ✅', message: `باقة ${sub.package.name} اتفتحت بنجاح.` } });
  });
  res.json({ ok: true });
});

router.post('/subscriptions/:id/deactivate', async (req: AuthedRequest, res) => {
  const sub = await prisma.subscription.findUnique({ where: { id: req.params.id }, include: { package: true } } );
  if (!sub) return void res.status(404).json({ message: 'الاشتراك مش موجود' });
  await prisma.$transaction(async (tx) => {
    await tx.subscription.update({ where: { id: sub.id }, data: { status: "EXPIRED", renewalDate: null } });
    await tx.subscriptionCycle.create({ data: { subscriptionId: sub.id, packageId: sub.packageId, status: "EXPIRED", endDate: new Date() } });
    await tx.auditLog.create({ data: { actorId: req.user!.id, actorRole: "ADMIN", action: 'subscription.deactivate', entityType: 'Subscription', entityId: sub.id } });
    await tx.notification.create({ data: { userId: sub.userId, type: 'subscription.expired', title: 'اشتراكك اتقفل', message: 'الأدمن قفل الاشتراك. لو محتاج مساعدة كلمنا.' } });
  });
  res.json({ ok: true });
});

// ── Admin merchants management ─────────────────
router.post('/merchants', async (req: AuthedRequest, res) => {
  const parsed = z.object({
    name: z.string().min(2).max(80),
    phone: z.string().regex(/^01[0-9]{9}$/),
    password: z.string().min(6).optional(),
  }).safeParse(req.body);
  if (!parsed.success) return void res.status(400).json({ message: parsed.error.issues[0]?.message ?? 'بيانات غير صحيحة' });
  const exists = await prisma.user.findUnique({ where: { phone: parsed.data.phone } });
  if (exists) return void res.status(409).json({ message: 'رقم الموبايل مستخدم بالفعل' });
  const passwordHash = await bcrypt.hash(parsed.data.password ?? 'password123', 10);
  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({ data: { name: parsed.data.name, phone: parsed.data.phone, passwordHash, role: 'MERCHANT' } });
    const merchant = await tx.merchant.create({ data: { userId: user.id, name: parsed.data.name } });
    return { merchant, user };
  });
  await logAudit({ actor: req.user!, action: 'merchant.create', entityType: 'Merchant', entityId: result.merchant.id, details: JSON.stringify({ phone: parsed.data.phone }) });
  res.status(201).json({ merchant: { ...result.merchant, user: { id: result.user.id, name: result.user.name, phone: result.user.phone, isActive: result.user.isActive } } });
});

router.get('/merchants', async (req, res) => {
  const merchants = await prisma.merchant.findMany({
    include: {
      user: { select: { id: true, phone: true, name: true, isActive: true } },
      _count: { select: { customers: true, obligations: true } },
      obligations: { orderBy: { dueDate: 'desc' }, take:  5 },
    },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ merchants });
});

router.patch('/merchants/:id', async (req: AuthedRequest, res) => {
  const merchant = await prisma.merchant.findUnique({ where: { id: req.params.id } });
  if (!merchant) return void res.status(404).json({ message: 'التاجر مش موجود' });
  const updates: Prisma.UserUpdateInput = {};
  if (typeof req.body.name === 'string') updates.name = req.body.name;
  if (typeof req.body.isActive === 'boolean') updates.isActive = req.body.isActive;
  await prisma.user.update({ where: { id: merchant.userId }, data: updates });
  await logAudit({ actor: req.user!, action: 'merchant.update', entityType: 'Merchant', entityId: merchant.id, details: req.body });
  res.json({ ok: true });
});

// ── Merchant obligations ────────────────────────
router.post('/merchants/:id/obligations', async (req: AuthedRequest, res) => {
  const parsed = z.object({ amount: z.number().min(0), dueDate: z.string().min(1), note: z.string().optional() }).safeParse(req.body);
  if (!parsed.success) return void res.status(400).json({ message: parsed.error.issues[0]?.message ?? 'بيانات غير صحيحة' });
  const obligation = await prisma.merchantPaymentObligation.create({
    data: { merchantId: req.params.id, amount: parsed.data.amount, dueDate: new Date(parsed.data.dueDate), note: parsed.data.note ?? null },
  });
  await notify({ userId: (await prisma.merchant.findUnique({ where: { id: req.params.id } } ))!.userId, type: 'merchant.payment.due', title: 'مستحقات جديدة عليك 💰', message: `عليك ${parsed.data.amount} جنيه مستحقة بتاريخ ${new Date(parsed.data.dueDate).toLocaleDateString('ar-EG')}.` });
  await logAudit({ actor: req.user!, action: 'obligation.create', entityType: 'MerchantPaymentObligation', entityId: obligation.id, details: JSON.stringify(parsed.data) });
  res.status(201).json({ obligation });
});

router.post('/obligations/:id/paid', async (req: AuthedRequest, res) => {
  const obligation = await prisma.merchantPaymentObligation.findUnique({ where: { id: req.params.id } } );
  if (!obligation) return void res.status(404).json({ message: 'المستحقات مش موجودة' });
  if (obligation.status === "PAID") return void res.status(409).json({ message: 'اتحسبت مدفوعة قبل كده' });
  await prisma.merchantPaymentObligation.update({ where: { id: obligation.id }, data: { status: "PAID", paidAt: new Date() } });
  const merchant = await prisma.merchant.findUnique({ where: { id: obligation.merchantId } });
  await notify({ userId: merchant!.userId, type: 'merchant.payment.paid', title: 'تم تسجيل الدفع ✅', message: 'الأدمن سجّل مستحقاتك كمدفوعة. شكرًا!' });
  await logAudit({ actor: req.user!, action: 'obligation.markPaid', entityType: 'MerchantPaymentObligation', entityId: obligation.id });
  res.json({ ok: true });
});

// ── Audit logs ─────────────────────────────────
router.get('/audit-logs', async (req, res) => {
  const logs = await prisma.auditLog.findMany({
    include: { actor: { select: { name: true, phone: true, role: true } } },
    orderBy: { createdAt: 'desc' },
    take:100,
  });
  res.json({ logs });
});

// ── Admin notifications ─────────────────────────
router.get('/notifications', async (req, res) => {
  const notifications = await prisma.notification.findMany({ orderBy: { createdAt: 'desc' }, take: 200 });
  res.json({ notifications });
});

// ── Decrypt telecom app password (audited )
router.get('/credentials/:userId/decrypt/:id', async (req: AuthedRequest, res) => {
  const credential = await prisma.customerCredential.findUnique({ where: { id: req.params.id } } );
  if (!credential || credential.userId !== req.params.userId) return void res.status(404).json({ message: 'البيانات مش موجودة' });
  const plaintext = decryptCredential(credential);
  await logAudit({ actor: req.user!, action: 'credential.decrypt', entityType: 'CustomerCredential', entityId: credential.id, details: JSON.stringify({ userId: req.params.userId, providerId: credential.providerId }) });
  res.json({ decrypted: plaintext });
});

export default router;
