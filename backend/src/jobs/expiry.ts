import cron from 'node-cron';
import { prisma } from '../lib/prisma';

const T_EXP = 'الباقة هتخلص قريب';
const T_EXPIRED = 'الباقة خلصت';

// Detects expiring-soon / expired subscriptions and sends in-app notifications. Runs every hour; exposed as /jobs/run for demo.

export async function runExpiryJob(trigger: string = 'cron') {
  const now = new Date();
  const results = { expiringSoon: 0, expired:  0, overdueMerchants: 0 };

  // 1. Expiring soon — any ACTIVE subscription ending within package reminder window
  const active = await prisma.subscription.findMany({
    where: { status: { in: ["ACTIVE"] } },
    include: { package: true, user: true },
  });
 for (const sub of active) {
    if (!sub.renewalDate) continue;
    const daysLeft = Math.ceil((sub.renewalDate.getTime() - now.getTime()) / (24 * 3600 * 1000));
    if (daysLeft <= sub.package.reminderDays && daysLeft > 0) {
      await prisma.subscription.update({ where: { id: sub.id }, data: { status: "EXPIRING_SOON", reminderSent: true } } );
       await prisma.notification.create({ data: { userId: sub.userId, type: 'subscription.expiring', title: T_EXP, message: `باقة ${sub.package.name} هتنتهي بعد ${daysLeft} يوم. جدد قبل معاد الانتهاء.` } });
      results.expiringSoon++;
    } else if (daysLeft <= 0) {
      await prisma.subscription.update({ where: { id: sub.id }, data: { status: "EXPIRED" } } );
       await prisma.notification.create({ data: { userId: sub.userId, type: 'subscription.expired', title: T_EXPIRED, message: `باقة ${sub.package.name} خلصت. جدد دلوقتي لتكمل النت.` } });
      results.expired++;
    }
  }

  // 2. Overdue merchant obligations
    await prisma.merchantPaymentObligation.updateMany({
    where: { status: "PENDING", dueDate: { lt: now } },
    data: { status: "OVERDUE" },
  });
  results.overdueMerchants = await prisma.merchantPaymentObligation.count({ where: { status: "OVERDUE" } } );
 await prisma.auditLog.create({
    data: { action: 'job.expiry.run', entityType: 'Job', details: JSON.stringify({ trigger, results }) } },
  );

 console.log(`[job:${trigger}]`, results);
  return results;

}

export function startJobs() {
  // every hour
  cron.schedule('0 * * * *', () => { runExpiryJob().catch(console.error); });
 console.log('JOB_SCHED');
}
