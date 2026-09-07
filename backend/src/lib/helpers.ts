import { prisma } from './prisma';
import { User } from '@prisma/client';

export type Role = 'CUSTOMER' | 'MERCHANT' | 'ADMIN';

export async function logAudit(opts: {
  actor?: User | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  details?: string;
  ip?: string;
}) {
  const actorId = opts.actor?.id ?? null;
  const actorRole = opts.actor?.role ?? null;
  await prisma.auditLog.create({
    data: {
      actorId,
      actorRole,
      action: opts.action,
      entityType: opts.entityType,
      entityId: opts.entityId ?? null,
      details: opts.details ? JSON.stringify(opts.details).slice(0, 2000) : null,
      ip: opts.ip,
    },
  });
}

export async function notify(opts: {
  userId?: string;
  role?: Role;
  type: string;
  title: string;
  message: string;
  subscriptionId?: string;
}) {
  await prisma.notification.create({ data: { ...opts } });
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

export function isExpiringSoon(sub: { renewalDate: Date | null; reminderDays: number }): boolean {
  if (!sub.renewalDate) return false;
  const daysLeft = Math.ceil((sub.renewalDate.getTime() - Date.now()) / (24 * 3600 * 1000));
  return daysLeft >  0 && daysLeft <= sub.reminderDays;
}

export function isExpired(sub: { renewalDate: Date | null }): boolean {
  return sub.renewalDate !== null && sub.renewalDate.getTime() <= Date.now();
}

export function statusLabel(status: string): string {
  const map: Record<string, string> = {
    PENDING_PAYMENT: 'في انتظار الدفع',
    PENDING_REVIEW: 'في انتظار المراجعة',
    ACTIVE: 'نشطة',
    EXPIRING_SOON: 'هتنتهي قريب',
    EXPIRED: 'منتهية',
    REACTIVATED: 'مجددة',
    PENDING: 'معلقة',
    APPROVED: 'مقبولة',
    REJECTED: 'مرفوضة',
    PAID: 'مدفوعة',
    OVERDUE: 'متأخرة',
  };
  return map[status] ?? status;
}