export function fmtMoney(n: number | null | undefined): string {
  return (n ?? 0).toLocaleString('ar-EG', { style: 'currency', currency: 'EGP', maximumFractionDigits: 0 }) ?? `${n} ج.م`;
}

export function fmtDate(d: string | null | undefined): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' });
}

export function fmtDateTime(d: string | null | undefined): string {
  if (!d) return '—';
  return new Date(d).toLocaleString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'نشط',
  INACTIVE: 'موقوف',
  PENDING: 'قيد الانتظار',
  PENDING_PAYMENT: 'بانتظار الدفع',
  PENDING_REVIEW: 'بانتظار المراجعة',
  APPROVED: 'مقبولة',
  REJECTED: 'مرفوضة',
  PAID: 'مدفوعة',
  OVERDUE: 'متأخرة',
  EXPIRING_SOON: 'قارب على الانتهاء',
  EXPIRED: 'منتهي',
  SUSPENDED: 'موقوف',
};

export function statusLabel(s: string | null | undefined): string {
  return s ? (STATUS_LABELS[s] ?? s) : '—';
}

export function statusColor(s: string | null | undefined): string {
  switch (s) {
    case 'ACTIVE': return 'badge-green';
    case 'APPROVED': case 'PAID': return 'badge-green';
    case 'PENDING': return 'badge-amber';
    case 'PENDING_PAYMENT': return 'badge-amber';
    case 'PENDING_REVIEW': return 'badge-purple';
    case 'EXPIRING_SOON': return 'badge-amber';
    case 'EXPIRED': return 'badge-red';
    case 'REJECTED': case 'OVERDUE': return 'badge-red';
    case 'INACTIVE': case 'SUSPENDED': return 'badge-red';
    default: return 'badge-slate';
  }
}

export const ACTION_LABELS: Record<string, string> = {
  'provider.create': 'إنشاء مزود',
  'provider.update': 'تعديل مزود',
  'provider.delete': 'حذف مزود',
  'package.create': 'إنشاء باقة',
  'package.update': 'تعديل باقة',
  'package.delete': 'حذف باقة',
  'payment-method.create': 'إنشاء وسيلة دفع',
  'payment-method.update': 'تعديل وسيلة دفع',
  'payment-method.delete': 'حذف وسيلة دفع',
  'merchant.create': 'إنشاء تاجر',
  'merchant.customer.create': 'تسجيل عميل',
  'merchant.customer.submit': 'تقديم اشتراك عميل',
  'subscription.create': 'إنشاء اشتراك',
  'renewal.request': 'طلب تجديد',
  'payment.submit': 'تقديم إثبات دفع',
  'payment.review': 'مراجعة دفع',
  'credential.decrypt': 'فك تشفير بيانات',
  'obligation.create': 'إنشاء مستحقات',
  'subscription.activate': 'تفعيل اشتراك',
  'subscription.deactivate': 'إيقاف اشتراك',
  'obligation.paid': 'سداد مستحقات',
  'customer.update': 'تعديل عميل',
};
