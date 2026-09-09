import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminApi } from '../../services/api';
import { Payment, Subscription } from '../../lib/api';
import { Badge, Empty, Spinner, Stat } from '../../components/ui';
import { fmtDate, fmtDateTime, fmtMoney } from '../../lib/format';

interface DashboardData {
  kpis: Record<string, number>;
  recentSubscriptions: Subscription[];
  recentPayments: Payment[];
}

export function AdminOverview() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi.dashboard().then(setData).catch(() => undefined).finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;
  const kpis = data?.kpis ?? {};
  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <p className="mb-2 text-sm font-bold text-brand-700">مركز التحكم</p>
          <h1 className="section-title mb-1">نظرة عامة</h1>
          <p className="text-sm text-slate-500">تابع العملاء، المدفوعات، الاشتراكات، والتجار من مكان واحد.</p>
        </div>
        <Link to="/admin/payments" className="btn btn-primary">مراجعة الدفعات ({kpis.pendingPayments ?? 0})</Link>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="إجمالي العملاء" value={kpis.customers ?? 0} icon="👥" />
        <Stat label="اشتراكات نشطة" value={kpis.activeSubscriptions ?? 0} icon="✓" />
        <Stat label="تحتاج مراجعة" value={kpis.pendingPayments ?? 0} icon="↺" />
        <Stat label="مستحقات التجار" value={fmtMoney(kpis.merchantDue)} icon="ج.م" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_.85fr]">
        <section className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 p-5">
            <div><h2 className="text-lg font-black text-night">آخر الاشتراكات</h2><p className="mt-1 text-xs text-slate-500">أحدث طلبات العملاء والتجار.</p></div>
            <Link to="/admin/subscriptions" className="text-sm font-bold text-brand-700">كل الاشتراكات</Link>
          </div>
          {(data?.recentSubscriptions ?? []).length === 0 ? <Empty title="لا توجد اشتراكات" /> : (
            <div className="divide-y divide-slate-100">
              {data?.recentSubscriptions.map((subscription) => (
                <div key={subscription.id} className="flex items-center justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <p className="truncate font-black text-night">{subscription.user?.name ?? 'عميل'} · {subscription.package?.name ?? 'باقة'}</p>
                    <p className="mt-1 text-xs text-slate-500" dir="ltr">{subscription.user?.phone ?? subscription.phoneNumber}</p>
                  </div>
                  <div className="shrink-0 text-left"><Badge status={subscription.status} /><p className="mt-1 text-[11px] text-slate-400">{fmtDate(subscription.renewalDate)}</p></div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 p-5">
            <div><h2 className="text-lg font-black text-night">آخر المدفوعات</h2><p className="mt-1 text-xs text-slate-500">الدفع المرسل للمراجعة.</p></div>
            <Link to="/admin/payments" className="text-sm font-bold text-brand-700">مراجعة</Link>
          </div>
          {(data?.recentPayments ?? []).length === 0 ? <Empty title="لا توجد مدفوعات" /> : (
            <div className="divide-y divide-slate-100">
              {data?.recentPayments.map((payment) => (
                <div key={payment.id} className="flex items-center justify-between gap-3 p-4">
                  <div className="min-w-0"><p className="truncate font-black text-night">{payment.user?.name ?? 'عميل'}</p><p className="mt-1 text-xs text-slate-400">{fmtDateTime(payment.createdAt)}</p></div>
                  <div className="shrink-0 text-left"><p className="font-black text-brand-700">{fmtMoney(payment.amount)}</p><Badge status={payment.status} /></div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Link to="/admin/customers" className="card p-4 text-center text-sm font-black text-night hover:border-brand-300">إدارة العملاء</Link>
        <Link to="/admin/merchants" className="card p-4 text-center text-sm font-black text-night hover:border-brand-300">إدارة التجار</Link>
        <Link to="/admin/packages" className="card p-4 text-center text-sm font-black text-night hover:border-brand-300">إدارة الباقات</Link>
        <Link to="/admin/audit-logs" className="card p-4 text-center text-sm font-black text-night hover:border-brand-300">سجل التدقيق</Link>
      </div>
    </div>
  );
}
