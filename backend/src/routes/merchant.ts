import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth, requireRole, AuthedRequest } from '../lib/auth';
import { z } from 'zod';
import { logAudit, notify } from '../lib/helpers';

const router = Router();
router.use(requireAuth, requireRole("MERCHANT"));

async function getMerchantId(req: AuthedRequest): Promise<string | null> {
  const merchant = await prisma.merchant.findUnique({ where: { userId: req.user!.id }, select: { id: true } });
  return merchant?.id ?? null;
}

// merchant financial snapshot
router.get('/financials', async (req: AuthedRequest, res) => {
  const merchantId = await getMerchantId(req);
  if (!merchantId) return void res.status(404).json({ message: 'التاجر مش موجود' });
  const merchant = await prisma.merchant.findUnique({
    where: { id: merchantId },
    include: {
      obligations: { orderBy: { dueDate: 'desc' } },
      _count: { select: { customers: true } },
    },
  });
  if (!merchant) return void res.status(404).json({ message: 'التاجر مش موجود' });

  const now = new Date();
  // auto-mark overdue (job also does this)
  await prisma.merchantPaymentObligation.updateMany({
    where: { merchantId, status: "PENDING", dueDate: { lt: now } },
    data: { status: "OVERDUE" },
  });
  const current = await prisma.merchantPaymentObligation.findFirst({
    where: { merchantId, status: { in: ["PENDING", "OVERDUE"] } },
    orderBy: { dueDate: 'asc' },
  });
  const totalDue = await prisma.merchantPaymentObligation.aggregate({
    where: { merchantId, status: { in: ["PENDING", "OVERDUE"] } },
    _sum: { amount: true },
  });
  res.json({
    merchant,
    customerCount: merchant._count.customers,
    currentDue: { amount: (current?.amount ?? 0), dueDate: current?.dueDate ?? null, status: current?.status ?? null },
    totalDueAmount: totalDue._sum.amount ?? 0,
  });
});

// merchant submits a customer record  (simple:  name/phone/provider/package)
const customerSchema = z.object({
  name: z.string().min(2).max(80),
  phone: z.string().regex(/^01[0-9]{9}$/, 'رقم موبايل مصري غير صحيح'),
  providerId: z.string().min(1),
  packageId: z.string().min(1),
});

router.post('/customers', async (req: AuthedRequest, res) => {
  const parsed = customerSchema.safeParse(req.body);
  if (!parsed.success) return void res.status(400).json({ message: parsed.error.issues[0]?.message ?? 'بيانات غير صحيحة' });
  const { name, phone, providerId, packageId } = parsed.data;
  const merchantId = await getMerchantId(req);
  if (!merchantId) return void res.status(404).json({ message: 'التاجر مش موجود' });

  const pkg = await prisma.package.findUnique({ where: { id: packageId }, include: { provider: true } } );
  if (!pkg || !pkg.isActive || pkg.providerId !== providerId) return void res.status(400).json({ message: 'الباقة غير موجودة' });

  const exists = await prisma.user.findUnique({ where: { phone } });
  if (exists && exists.source !== "MERCHANT") {
    return void res.status(409).json({ message: 'الرقم ده مرتبط بحساب عميل مباشر' });
  }
  if (exists && exists.source === "MERCHANT") {
    if (exists.merchantId !== merchantId) return void res.status(403).json({ message: 'العميل تابع لتاجر آخر' });
    // idempotency: same customer+package already submitted?
    const dupSubscription = await prisma.subscription.findFirst({
      where: { userId: exists.id, packageId, status: { in: ["PENDING_PAYMENT", "PENDING_REVIEW", "ACTIVE", "EXPIRING_SOON"] } },
    });
    if (dupSubscription) return void res.status(409).json({ message: 'العميل ده مسجل بنفس الباقة قبل كده' });
  }

  let customerId = exists?.id ?? null;
  let newUser = false;

  if (!exists) {
    const newCustomer = await prisma.user.create({
      data: {
        name,
        phone,
        passwordHash: await import('bcryptjs').then((b) => b.default.hash(`merchant-${phone}`, 10)),
        role: "CUSTOMER",
        source: "MERCHANT",
        merchantId,
      },
    });
    customerId = newCustomer.id;
    newUser = true;
    await logAudit({ actor: req.user!, action: 'merchant.customer.create', entityType: 'User', entityId: newCustomer.id, details: JSON.stringify({ providerId, packageId }) });
  }

  const subscription = await prisma.subscription.create({
    data: {
      userId: customerId!,
      providerId,
      packageId,
      phoneNumber: phone,
      status: "PENDING_PAYMENT",
    },
  });

  await notify({ userId: customerId!, type: 'subscription.created', title: 'التاجر سجل اشتراك ليك 🛒', message: `سجّل التاجر ${req.user!.name} اشتراك ${pkg.name}. سدد وكمل.` });
  await notify({ role: "ADMIN", type: 'merchant.submission', title: 'عميل جديد من تاجر', message: `${req.user!.name} سجّل عميل جديد (${name}).` });
  await logAudit({ actor: req.user!, action: 'merchant.customer.submit', entityType: 'Subscription', entityId: subscription.id, details: JSON.stringify({ providerId, packageId, phone }) });
  res.status(201).json({ customer: { id: customerId!, name, phone }, subscription, newUser });
});

export default router;
