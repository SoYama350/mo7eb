import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { encryptCredential } from '../src/lib/crypto';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('password123', 10);

  // ── Providers ─────────────────────────────
  const providers = await Promise.all(
    ([
      { slug: 'vodafone', name: 'Vodafone مصر', logo: 'V', primaryColor: '#e60000', secondaryColor: '#fff1f1', order: 1 },
      { slug: 'orange', name: 'Orange مصر', logo: 'O', primaryColor: '#ff7900', secondaryColor: '#fff4e8', order: 2 },
      { slug: 'etisalat', name: 'اتصالات مصر', logo: 'E', primaryColor: '#00843d', secondaryColor: '#e9f7ef', order: 3 },
    ].map(async (p) => prisma.provider.upsert({ where: { slug: p.slug }, update: p, create: p }))),
  );

  const vodafone = providers[0]!, orange = providers[1]!, etisalat = providers[2]!;

  // ── Packages ─────────────────────────────
  const packageDefs = [
    { providerId: vodafone.id, name: 'باقة 40 GB', internetGB:40, minutes:500, price: 250, durationDays: 30, reminderDays: 3 },
    { providerId: vodafone.id, name: 'باقة 80 GB', internetGB:80, minutes:1000, price:400, durationDays: 30, reminderDays: 3 },
    { providerId: orange.id, name: 'باقة 30 GB', internetGB:30, minutes:600, price:220, durationDays:30, reminderDays:3 },
    { providerId: orange.id, name: 'باقة 60 GB', internetGB:60, minutes:1200, price:350, durationDays:30, reminderDays:3 },
    { providerId: etisalat.id, name: 'باقة 25 GB', internetGB:25, minutes:400, price:200, durationDays:30, reminderDays:3 },
    { providerId: etisalat.id, name: 'باقة 50 GB', internetGB:50, minutes:800, price:300, durationDays:30, reminderDays:3 },
  ];

  const packages = [];
  for (const p of packageDefs) {
    packages.push(await prisma.package.create({ data: p }));
  }

  // ── Payment methods ─────────────────────
  const methods = await Promise.all([
    prisma.paymentMethod.upsert({ where: { id: 'instapay' }, update: {}, create: { id: 'instapay', name: 'InstaPay', accountIdentifier: '01012345678', instructions: 'حوّل المبلغ على رقم InstaPay ده وبعد كده ارفع صورة التحويل.', sortOrder:  1 } }),
    prisma.paymentMethod.upsert({ where: { id: 'vodafone-cash' }, update: {}, create: { id: 'vodafone-cash', name: 'Vodafone Cash', accountIdentifier: '01012345678', instructions: 'ابعت المبلغ على محفظة Vodafone Cash.', sortOrder:2 } }),
    prisma.paymentMethod.upsert({ where: { id: 'orange-cash' }, update: {}, create: { id: 'orange-cash', name: 'Orange Cash', accountIdentifier: '01112345678', instructions: 'ابعت المبلغ على محفظة Orange Cash.', sortOrder:3 } }),
    prisma.paymentMethod.upsert({ where: { id: 'wallet' }, update: {}, create: { id: 'wallet', name: 'محفظة إلكترونية', accountIdentifier: 'Account-CIB-123', instructions: 'حوّل على المحفظة الإلكترونية وارفع الإثبات.', sortOrder:4 } }),
  ]);

  // ── Users ──────────────────────────────
  const admin = await prisma.user.upsert({
    where: { phone: '01000000000' },
    update: {},
    create: { phone: '01000000000', passwordHash, name: 'أدمن المنصة', role: "ADMIN" },
  });

  const merchantUser = await prisma.user.upsert({
    where: { phone: '01111111111' },
    update: {},
    create: { phone: '01111111111', passwordHash, name: 'محمود الحداد', role: "MERCHANT" },
  });

  let merchant = await prisma.merchant.findUnique({ where: { userId: merchantUser.id } });
  if (!merchant) {
    merchant = await prisma.merchant.create({ data: { userId: merchantUser.id, name: 'محمود الحداد' } });
  }

  const customer = await prisma.user.upsert({
    where: { phone: '01055555555' },
    update: {},
    create: { phone: '01055555555', passwordHash, name: 'أحمد السيد', role: "CUSTOMER" },
  });

  const merchantCustomer = await prisma.user.upsert({
    where: { phone: '01222222222' },
    update: {},
    create: { phone: '01222222222', passwordHash, name: 'سارة محمد', role: "CUSTOMER", source: "MERCHANT", merchantId: merchant.id },
  });

  // ── Sample subscription for customer ─────
  const existingSub = await prisma.subscription.findFirst({ where: { userId: customer.id } });
  if (!existingSub) {
    const sub = await prisma.subscription.create({
      data: {
        userId: customer.id,
        providerId: vodafone.id,
        packageId: packages[0]!.id,
        phoneNumber: '01055555555',
        status: "ACTIVE",
        startDate: new Date(Date.now() -  10 * 24 * 3600 * 1000),
        renewalDate: new Date(Date.now() +  20 * 24 * 3600 * 1000),
        cycles: { create: { packageId: packages[0]!.id, status: "ACTIVE", startDate: new Date(Date.now() - 10 *  24 *  3600 * 1000), endDate: new Date(Date.now() + 20 * 24 * 3600 * 1000) } },
      },
    });

    await prisma.payment.create({
      data: {
        userId: customer.id,
        subscriptionId: sub.id,
        amount: packages[0]!.price,
        paymentMethodId: 'instapay',
        paidFromPhone: '01055555555',
        screenshotUrl: '/uploads/screenshots/sample-payment.png',
        status: "APPROVED",
        reviewedBy: admin.id,
        reviewedAt: new Date(),
      },
    });

    await prisma.auditLog.create({ data: { actorId: admin.id, actorRole: "ADMIN", action: 'payment.approve', entityType: 'Payment', entityId: sub.id, details: 'Seed workflow' } });
  }

  // ── Merchant obligation ────────────────
  const hasObligation = await prisma.merchantPaymentObligation.findFirst({ where: { merchantId: merchant.id } });
  if (!hasObligation) {
    const dueDate = new Date(Date.now() +  5 * 24 * 3600 * 1000);
    const overdue = new Date(Date.now() -  2 *  24 * 3600 * 1000);
    await prisma.merchantPaymentObligation.createMany({
      data: [
        { merchantId: merchant.id, amount: 2000, dueDate, status: 'PENDING' },
        { merchantId: merchant.id, amount:1500, dueDate: overdue, status: 'OVERDUE' },
      ],
    });
  }

  // ── Encrypted sample credential (demo — admin can decrypt on demand )
  const sampleCred = await prisma.customerCredential.findFirst({ where: { userId: customer.id } });
  if (!sampleCred) {
    const encrypted = encryptCredential('DemoAppPass@2026');
    await prisma.customerCredential.create({
      data: {
        userId: customer.id,
        providerId: vodafone.id,
        encrypted: encrypted.encrypted,
        iv: encrypted.iv,
        authTag: encrypted.authTag,
        subtitle: 'كلمة مرور تطبيق فودافون (تجريبية )',
      },
    });
  }

  // ── Sample notifications ────────────────
  const notifCount = await prisma.notification.count({ where: { userId: customer.id } });
  if (notifCount === 0) {
    await prisma.notification.createMany({
      data: [
        { userId: customer.id, type: 'payment.approved', title: 'تم تأكيد الدفع ✅', message: 'باقة 40 GB اتصلت. استمتع بالنت!' },
        { userId: customer.id, type: 'subscription.expiring', title: 'الباقة هتخلص قريب', message: 'باقة 40 GB هتنتهي بعد 20 يوم. جدد قبل معاد الانتهاء.' },
        { userId: admin.id, role: "ADMIN", type: 'payment.pending', title: 'دفعة مستنية مراجعة', message: 'في دفعة جديدة مستنية مراجعتك.' },
      ],
    });
  }

  console.log('✅ Seed complete!');
  console.log('👤 Admin:        01000000000 / password123');
  console.log('🛒 Merchant:      01111111111 / password123');
  console.log('👤 Customer:      01055555555 / password123');
  console.log('👤 Merchant customer: 01222222222 / password123');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());