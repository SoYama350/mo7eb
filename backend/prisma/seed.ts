import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { encryptCredential } from '../src/lib/crypto';

const prisma = new PrismaClient();

export async function seedCatalog() {
  console.log('📦 Seeding Providers and Packages...');

  // ── 1. Providers ─────────────────────────────
  const providers = await Promise.all([
    prisma.provider.upsert({
      where: { slug: 'etisalat' },
      update: { name: 'اتصالات أميراليد', logo: 'E', primaryColor: '#00843d', secondaryColor: '#e9f7ef', order: 1, isActive: true },
      create: { slug: 'etisalat', name: 'اتصالات أميراليد', logo: 'E', primaryColor: '#00843d', secondaryColor: '#e9f7ef', order: 1, isActive: true },
    }),
    prisma.provider.upsert({
      where: { slug: 'orange' },
      update: { name: 'باقات أورنج', logo: 'O', primaryColor: '#ff7900', secondaryColor: '#fff4e8', order: 2, isActive: true },
      create: { slug: 'orange', name: 'باقات أورنج', logo: 'O', primaryColor: '#ff7900', secondaryColor: '#fff4e8', order: 2, isActive: true },
    }),
    prisma.provider.upsert({
      where: { slug: 'we' },
      update: { name: 'WE GOLD', logo: 'W', primaryColor: '#5c2d91', secondaryColor: '#f5f0fa', order: 3, isActive: true },
      create: { slug: 'we', name: 'WE GOLD', logo: 'W', primaryColor: '#5c2d91', secondaryColor: '#f5f0fa', order: 3, isActive: true },
    }),
    prisma.provider.upsert({
      where: { slug: 'vodafone' },
      update: { name: 'Vodafone RED', logo: 'V', primaryColor: '#e60000', secondaryColor: '#fff1f1', order: 4, isActive: true },
      create: { slug: 'vodafone', name: 'Vodafone RED', logo: 'V', primaryColor: '#e60000', secondaryColor: '#fff1f1', order: 4, isActive: true },
    }),
  ]);

  const etisalat = providers[0]!, orange = providers[1]!, we = providers[2]!, vodafone = providers[3]!;

  // ── 2. Packages Definitions ───────────────────
  const packageDefs = [
    // ── اتصالات أميراليد (7 باقات)
    {
      providerId: etisalat.id,
      name: '14 جيجا + 1,500 دقيقة',
      internetGB: 14,
      minutes: 1500,
      price: 280,
      durationDays: 30,
      reminderDays: 3,
      notes: 'الخط على نظام 14 قرش. لا توجد أي مديونية على الخط. الخط مسجل باسم صاحبه.',
      activationInfo: 'التفعيل: يوم 1 أو يوم 15 من كل شهر.',
      bookingInfo: 'فترات الحجز: 25 - 30، و10 - 14 من كل شهر.',
    },
    {
      providerId: etisalat.id,
      name: '20 جيجا + 1,500 دقيقة',
      internetGB: 20,
      minutes: 1500,
      price: 350,
      durationDays: 30,
      reminderDays: 3,
      notes: 'الخط على نظام 14 قرش. لا توجد أي مديونية على الخط. الخط مسجل باسم صاحبه.',
      activationInfo: 'التفعيل: يوم 1 أو يوم 15 من كل شهر.',
      bookingInfo: 'فترات الحجز: 25 - 30، و10 - 14 من كل شهر.',
    },
    {
      providerId: etisalat.id,
      name: '25 جيجا + 1,500 دقيقة',
      internetGB: 25,
      minutes: 1500,
      price: 380,
      durationDays: 30,
      reminderDays: 3,
      notes: 'الخط على نظام 14 قرش. لا توجد أي مديونية على الخط. الخط مسجل باسم صاحبه.',
      activationInfo: 'التفعيل: يوم 1 أو يوم 15 من كل شهر.',
      bookingInfo: 'فترات الحجز: 25 - 30، و10 - 14 من كل شهر.',
    },
    {
      providerId: etisalat.id,
      name: '30 جيجا + 1,500 دقيقة',
      internetGB: 30,
      minutes: 1500,
      price: 400,
      durationDays: 30,
      reminderDays: 3,
      notes: 'الخط على نظام 14 قرش. لا توجد أي مديونية على الخط. الخط مسجل باسم صاحبه.',
      activationInfo: 'التفعيل: يوم 1 أو يوم 15 من كل شهر.',
      bookingInfo: 'فترات الحجز: 25 - 30، و10 - 14 من كل شهر.',
    },
    {
      providerId: etisalat.id,
      name: '35 جيجا + 1,500 دقيقة',
      internetGB: 35,
      minutes: 1500,
      price: 430,
      durationDays: 30,
      reminderDays: 3,
      notes: 'الخط على نظام 14 قرش. لا توجد أي مديونية على الخط. الخط مسجل باسم صاحبه.',
      activationInfo: 'التفعيل: يوم 1 أو يوم 15 من كل شهر.',
      bookingInfo: 'فترات الحجز: 25 - 30، و10 - 14 من كل شهر.',
    },
    {
      providerId: etisalat.id,
      name: '40 جيجا + 1,500 دقيقة',
      internetGB: 40,
      minutes: 1500,
      price: 485,
      durationDays: 30,
      reminderDays: 3,
      notes: 'الخط على نظام 14 قرش. لا توجد أي مديونية على الخط. الخط مسجل باسم صاحبه.',
      activationInfo: 'التفعيل: يوم 1 أو يوم 15 من كل شهر.',
      bookingInfo: 'فترات الحجز: 25 - 30، و10 - 14 من كل شهر.',
    },
    {
      providerId: etisalat.id,
      name: '50 جيجا + 2,000 دقيقة',
      internetGB: 50,
      minutes: 2000,
      price: 540,
      durationDays: 30,
      reminderDays: 3,
      notes: 'الخط على نظام 14 قرش. لا توجد أي مديونية على الخط. الخط مسجل باسم صاحبه.',
      activationInfo: 'التفعيل: يوم 1 أو يوم 15 من كل شهر.',
      bookingInfo: 'فترات الحجز: 25 - 30، و10 - 14 من كل شهر.',
    },

    // ── باقات أورنج (4 باقات)
    {
      providerId: orange.id,
      name: '10 جيجا + 1,000 دقيقة',
      internetGB: 10,
      minutes: 1000,
      price: 280,
      durationDays: 30,
      reminderDays: 3,
      notes: 'المطلوب: الرقم + الكاش.',
      activationInfo: 'التفعيل: يوم 1 من كل شهر.',
      bookingInfo: 'الحجز متاح الآن وفق الفترات المحددة للحجز.',
    },
    {
      providerId: orange.id,
      name: '14 جيجا + 2,000 دقيقة',
      internetGB: 14,
      minutes: 2000,
      price: 335,
      durationDays: 30,
      reminderDays: 3,
      notes: 'المطلوب: الرقم + الكاش.',
      activationInfo: 'التفعيل: يوم 1 من كل شهر.',
      bookingInfo: 'الحجز متاح الآن وفق الفترات المحددة للحجز.',
    },
    {
      providerId: orange.id,
      name: '20 جيجا + 2,000 دقيقة',
      internetGB: 20,
      minutes: 2000,
      price: 395,
      durationDays: 30,
      reminderDays: 3,
      notes: 'المطلوب: الرقم + الكاش.',
      activationInfo: 'التفعيل: يوم 1 من كل شهر.',
      bookingInfo: 'الحجز متاح الآن وفق الفترات المحددة للحجز.',
    },
    {
      providerId: orange.id,
      name: '30 جيجا + 2,000 دقيقة',
      internetGB: 30,
      minutes: 2000,
      price: 500,
      durationDays: 30,
      reminderDays: 3,
      notes: 'المطلوب: الرقم + الكاش.',
      activationInfo: 'التفعيل: يوم 1 من كل شهر.',
      bookingInfo: 'الحجز متاح الآن وفق الفترات المحددة للحجز.',
    },

    // ── WE GOLD (7 باقات)
    {
      providerId: we.id,
      name: '20 جيجا + 1,500 دقيقة',
      internetGB: 20,
      minutes: 1500,
      price: 300,
      durationDays: 30,
      reminderDays: 3,
      notes: 'مسموح الاشتراك حتى مع وجود سلفة على الخط. لا يشترط أن يكون الخط باسم المشترك. الدقيقة لأي شبكة والميجا لأي موقع.',
      activationInfo: 'التفعيل: يوم 1 ويوم 16 من كل شهر.',
      bookingInfo: 'الباقة لمدة شهر كامل.',
    },
    {
      providerId: we.id,
      name: '30 جيجا + 1,500 دقيقة',
      internetGB: 30,
      minutes: 1500,
      price: 350,
      durationDays: 30,
      reminderDays: 3,
      notes: 'مسموح الاشتراك حتى مع وجود سلفة على الخط. لا يشترط أن يكون الخط باسم المشترك. الدقيقة لأي شبكة والميجا لأي موقع.',
      activationInfo: 'التفعيل: يوم 1 ويوم 16 من كل شهر.',
      bookingInfo: 'الباقة لمدة شهر كامل.',
    },
    {
      providerId: we.id,
      name: '40 جيجا + 1,500 دقيقة',
      internetGB: 40,
      minutes: 1500,
      price: 430,
      durationDays: 30,
      reminderDays: 3,
      notes: 'مسموح الاشتراك حتى مع وجود سلفة على الخط. لا يشترط أن يكون الخط باسم المشترك. الدقيقة لأي شبكة والميجا لأي موقع.',
      activationInfo: 'التفعيل: يوم 1 ويوم 16 من كل شهر.',
      bookingInfo: 'الباقة لمدة شهر كامل.',
    },
    {
      providerId: we.id,
      name: '50 جيجا + 1,500 دقيقة',
      internetGB: 50,
      minutes: 1500,
      price: 490,
      durationDays: 30,
      reminderDays: 3,
      notes: 'مسموح الاشتراك حتى مع وجود سلفة على الخط. لا يشترط أن يكون الخط باسم المشترك. الدقيقة لأي شبكة والميجا لأي موقع.',
      activationInfo: 'التفعيل: يوم 1 ويوم 16 من كل شهر.',
      bookingInfo: 'الباقة لمدة شهر كامل.',
    },
    {
      providerId: we.id,
      name: '60 جيجا + 1,500 دقيقة',
      internetGB: 60,
      minutes: 1500,
      price: 570,
      durationDays: 30,
      reminderDays: 3,
      notes: 'مسموح الاشتراك حتى مع وجود سلفة على الخط. لا يشترط أن يكون الخط باسم المشترك. الدقيقة لأي شبكة والميجا لأي موقع.',
      activationInfo: 'التفعيل: يوم 1 ويوم 16 من كل شهر.',
      bookingInfo: 'الباقة لمدة شهر كامل.',
    },
    {
      providerId: we.id,
      name: '70 جيجا + 2,000 دقيقة',
      internetGB: 70,
      minutes: 2000,
      price: 670,
      durationDays: 30,
      reminderDays: 3,
      notes: 'مسموح الاشتراك حتى مع وجود سلفة على الخط. لا يشترط أن يكون الخط باسم المشترك. الدقيقة لأي شبكة والميجا لأي موقع.',
      activationInfo: 'التفعيل: يوم 1 ويوم 16 من كل شهر.',
      bookingInfo: 'الباقة لمدة شهر كامل.',
    },
    {
      providerId: we.id,
      name: '100 جيجا + 2,000 دقيقة',
      internetGB: 100,
      minutes: 2000,
      price: 950,
      durationDays: 30,
      reminderDays: 3,
      notes: 'مسموح الاشتراك حتى مع وجود سلفة على الخط. لا يشترط أن يكون الخط باسم المشترك. الدقيقة لأي شبكة والميجا لأي موقع.',
      activationInfo: 'التفعيل: يوم 1 ويوم 16 من كل شهر.',
      bookingInfo: 'الباقة لمدة شهر كامل بسعر 950 جنيه.',
    },

    // ── Vodafone RED — باقات ثابتة لمدة 8 شهور (8 باقات)
    {
      providerId: vodafone.id,
      name: 'باقة 1: 25 جيجا + 3,500 دقيقة',
      internetGB: 25,
      minutes: 3500,
      price: 380,
      durationDays: 30,
      reminderDays: 3,
      notes: 'العرض الخاص - باقات ثابتة لمدة 8 شهور بدون زيادة في السعر. الأماكن والخطوط المتاحة للتفعيل محدودة، وأولوية التفعيل بأسبقية الحجز.',
      activationInfo: 'التفعيل: يوم 7 ويوم 25 من كل شهر.',
      bookingInfo: 'الحجز: من يوم 18 إلى يوم 23، ومن يوم 1 إلى يوم 5.',
    },
    {
      providerId: vodafone.id,
      name: 'باقة 2: 30 جيجا + 4,000 دقيقة',
      internetGB: 30,
      minutes: 4000,
      price: 430,
      durationDays: 30,
      reminderDays: 3,
      notes: 'العرض الخاص - باقات ثابتة لمدة 8 شهور بدون زيادة في السعر. الأماكن والخطوط المتاحة للتفعيل محدودة، وأولوية التفعيل بأسبقية الحجز.',
      activationInfo: 'التفعيل: يوم 7 ويوم 25 من كل شهر.',
      bookingInfo: 'الحجز: من يوم 18 إلى يوم 23، ومن يوم 1 إلى يوم 5.',
    },
    {
      providerId: vodafone.id,
      name: 'باقة 3: 35 جيجا + 4,500 دقيقة',
      internetGB: 35,
      minutes: 4500,
      price: 480,
      durationDays: 30,
      reminderDays: 3,
      notes: 'العرض الخاص - باقات ثابتة لمدة 8 شهور بدون زيادة في السعر. الأماكن والخطوط المتاحة للتفعيل محدودة، وأولوية التفعيل بأسبقية الحجز.',
      activationInfo: 'التفعيل: يوم 7 ويوم 25 من كل شهر.',
      bookingInfo: 'الحجز: من يوم 18 إلى يوم 23، ومن يوم 1 إلى يوم 5.',
    },
    {
      providerId: vodafone.id,
      name: 'باقة 4: 40 جيجا + 5,000 دقيقة',
      internetGB: 40,
      minutes: 5000,
      price: 530,
      durationDays: 30,
      reminderDays: 3,
      notes: 'العرض الخاص - باقات ثابتة لمدة 8 شهور بدون زيادة في السعر. الأماكن والخطوط المتاحة للتفعيل محدودة، وأولوية التفعيل بأسبقية الحجز.',
      activationInfo: 'التفعيل: يوم 7 ويوم 25 من كل شهر.',
      bookingInfo: 'الحجز: من يوم 18 إلى يوم 23، ومن يوم 1 إلى يوم 5.',
    },
    {
      providerId: vodafone.id,
      name: 'باقة 5: 50 جيجا + 6,000 دقيقة',
      internetGB: 50,
      minutes: 6000,
      price: 580,
      durationDays: 30,
      reminderDays: 3,
      notes: 'العرض الخاص - باقات ثابتة لمدة 8 شهور بدون زيادة في السعر. الأماكن والخطوط المتاحة للتفعيل محدودة، وأولوية التفعيل بأسبقية الحجز.',
      activationInfo: 'التفعيل: يوم 7 ويوم 25 من كل شهر.',
      bookingInfo: 'الحجز: من يوم 18 إلى يوم 23، ومن يوم 1 إلى يوم 5.',
    },
    {
      providerId: vodafone.id,
      name: 'باقة 6: 60 جيجا + 7,000 دقيقة',
      internetGB: 60,
      minutes: 7000,
      price: 630,
      durationDays: 30,
      reminderDays: 3,
      notes: 'العرض الخاص - باقات ثابتة لمدة 8 شهور بدون زيادة في السعر. الأماكن والخطوط المتاحة للتفعيل محدودة، وأولوية التفعيل بأسبقية الحجز.',
      activationInfo: 'التفعيل: يوم 7 ويوم 25 من كل شهر.',
      bookingInfo: 'الحجز: من يوم 18 إلى يوم 23، ومن يوم 1 إلى يوم 5.',
    },
    {
      providerId: vodafone.id,
      name: 'باقة 7: 70 جيجا + 8,000 دقيقة',
      internetGB: 70,
      minutes: 8000,
      price: 680,
      durationDays: 30,
      reminderDays: 3,
      notes: 'العرض الخاص - باقات ثابتة لمدة 8 شهور بدون زيادة في السعر. الأماكن والخطوط المتاحة للتفعيل محدودة، وأولوية التفعيل بأسبقية الحجز.',
      activationInfo: 'التفعيل: يوم 7 ويوم 25 من كل شهر.',
      bookingInfo: 'الحجز: من يوم 18 إلى يوم 23، ومن يوم 1 إلى يوم 5.',
    },
    {
      providerId: vodafone.id,
      name: 'باقة 8: 85 جيجا + 9,000 دقيقة',
      internetGB: 85,
      minutes: 9000,
      price: 730,
      durationDays: 30,
      reminderDays: 3,
      notes: 'العرض الخاص - باقات ثابتة لمدة 8 شهور بدون زيادة في السعر. الأماكن والخطوط المتاحة للتفعيل محدودة، وأولوية التفعيل بأسبقية الحجز.',
      activationInfo: 'التفعيل: يوم 7 ويوم 25 من كل شهر.',
      bookingInfo: 'الحجز: من يوم 18 إلى يوم 23، ومن يوم 1 إلى يوم 5.',
    },
  ];

  // Disable old obsolete packages not in new list
  const newNamesByProvider = new Map<string, string[]>();
  for (const p of packageDefs) {
    const list = newNamesByProvider.get(p.providerId) || [];
    list.push(p.name);
    newNamesByProvider.set(p.providerId, list);
  }

  for (const [providerId, names] of newNamesByProvider.entries()) {
    await prisma.package.updateMany({
      where: {
        providerId,
        name: { notIn: names },
      },
      data: { isActive: false },
    });
  }

  // Upsert all defined packages
  for (const p of packageDefs) {
    const existing = await prisma.package.findFirst({ where: { providerId: p.providerId, name: p.name } });
    if (existing) {
      await prisma.package.update({
        where: { id: existing.id },
        data: {
          ...p,
          isActive: true,
        },
      });
    } else {
      await prisma.package.create({ data: p });
    }
  }

  // ── 3. Payment Methods ─────────────────────────
  await prisma.paymentMethod.updateMany({
    where: { id: { notIn: ['instapay', 'vodafone-cash', 'orange-cash'] } },
    data: { isActive: false },
  });

  await Promise.all([
    prisma.paymentMethod.upsert({
      where: { id: 'instapay' },
      update: {
        name: 'InstaPay (إنستا باي)',
        accountIdentifier: 'elmo7eb@instapay / 01550356806',
        instructions: 'حوّل المبلغ عبر تطبيق إنستا باي على المعرف elmo7eb@instapay أو الرقم 01550356806 أو من خلال الرابط: https://ipn.eg/S/elmo7eb/instapay/1aki2O ثم ارفع سكرين شوت بالتحويل للتأكيد.',
        sortOrder: 1,
        isActive: true,
      },
      create: {
        id: 'instapay',
        name: 'InstaPay (إنستا باي)',
        accountIdentifier: 'elmo7eb@instapay / 01550356806',
        instructions: 'حوّل المبلغ عبر تطبيق إنستا باي على المعرف elmo7eb@instapay أو الرقم 01550356806 أو من خلال الرابط: https://ipn.eg/S/elmo7eb/instapay/1aki2O ثم ارفع سكرين شوت بالتحويل للتأكيد.',
        sortOrder: 1,
        isActive: true,
      },
    }),
    prisma.paymentMethod.upsert({
      where: { id: 'vodafone-cash' },
      update: {
        name: 'Vodafone Cash (فودافون كاش)',
        accountIdentifier: null,
        instructions: 'بيانات محفظة Vodafone Cash غير متاحة حالياً. تواصل مع الإدارة قبل التحويل ثم ارفع سكرين شوت بالتحويل للتأكيد.',
        sortOrder: 2,
        isActive: true,
      },
      create: {
        id: 'vodafone-cash',
        name: 'Vodafone Cash (فودافون كاش)',
        accountIdentifier: null,
        instructions: 'بيانات محفظة Vodafone Cash غير متاحة حالياً. تواصل مع الإدارة قبل التحويل ثم ارفع سكرين شوت بالتحويل للتأكيد.',
        sortOrder: 2,
        isActive: true,
      },
    }),
    prisma.paymentMethod.upsert({
      where: { id: 'orange-cash' },
      update: {
        name: 'Orange Cash (أورنج كاش)',
        accountIdentifier: null,
        instructions: 'بيانات محفظة Orange Cash غير متاحة حالياً. تواصل مع الإدارة قبل التحويل ثم ارفع سكرين شوت بالتحويل للتأكيد.',
        sortOrder: 3,
        isActive: true,
      },
      create: {
        id: 'orange-cash',
        name: 'Orange Cash (أورنج كاش)',
        accountIdentifier: null,
        instructions: 'بيانات محفظة Orange Cash غير متاحة حالياً. تواصل مع الإدارة قبل التحويل ثم ارفع سكرين شوت بالتحويل للتأكيد.',
        sortOrder: 3,
        isActive: true,
      },
    }),
  ]);

  console.log('✅ Catalog Seed complete! (4 Providers, 26 Packages, 3 Manual Payment Methods)');
}

async function main() {
  // Always seed/update catalog idempotently
  await seedCatalog();

  // Demo user data is strictly optional and only seeded when explicitly enabled in non-prod
  if (process.env.NODE_ENV === 'production' || Boolean(process.env.VERCEL) || process.env.SEED_DEMO_DATA !== 'true') {
    console.log('ℹ️ Demo users seed skipped (Disabled in production / non-demo mode).');
    return;
  }

  const seedPassword = process.env.SEED_PASSWORD;
  const adminPhone = process.env.SEED_ADMIN_PHONE;
  const merchantPhone = process.env.SEED_MERCHANT_PHONE;
  const customerPhone = process.env.SEED_CUSTOMER_PHONE;
  const merchantCustomerPhone = process.env.SEED_MERCHANT_CUSTOMER_PHONE;
  const sampleAppPassword = process.env.SEED_APP_PASSWORD;
  if (!seedPassword || seedPassword.length < 12 || !adminPhone || !merchantPhone || !customerPhone || !merchantCustomerPhone || !sampleAppPassword) {
    console.log('ℹ️ Demo users seed skipped: SEED_* environment variables not set.');
    return;
  }

  const passwordHash = await bcrypt.hash(seedPassword, 10);

  // ── Users ──────────────────────────────
  const admin = await prisma.user.upsert({
    where: { phone: adminPhone },
    update: {},
    create: { phone: adminPhone, passwordHash, name: 'أدمن المنصة', role: 'ADMIN' },
  });

  const merchantUser = await prisma.user.upsert({
    where: { phone: merchantPhone },
    update: {},
    create: { phone: merchantPhone, passwordHash, name: 'محمود الحداد', role: 'MERCHANT' },
  });

  let merchant = await prisma.merchant.findUnique({ where: { userId: merchantUser.id } });
  if (!merchant) {
    merchant = await prisma.merchant.create({ data: { userId: merchantUser.id, name: 'محمود الحداد' } });
  }

  const customer = await prisma.user.upsert({
    where: { phone: customerPhone },
    update: {},
    create: { phone: customerPhone, passwordHash, name: 'أحمد السيد', role: 'CUSTOMER' },
  });

  await prisma.user.upsert({
    where: { phone: merchantCustomerPhone },
    update: {},
    create: { phone: merchantCustomerPhone, passwordHash, name: 'سارة محمد', role: 'CUSTOMER', source: 'MERCHANT', merchantId: merchant.id },
  });

  console.log('✅ Demo users seeded successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
