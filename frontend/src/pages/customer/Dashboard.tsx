import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { subscriptionApi } from '../../services/api';
import { Subscription } from '../../lib/api';
import { Badge, Empty, Spinner, Stat } from '../../components/ui';
import { fmtDate, fmtMoney } from '../../lib/format';

export function CustomerDashboard() {
  const { user } = useAuth();
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    subscriptionApi.mine()
      .then((d) => setSubs(d.subscriptions))
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, []);

  const active = subs.filter((s) => s.status === 'ACTIVE');
  const due = subs.filter((s) => s.status === 'PENDING_PAYMENT' || s.status === 'EXPIRING_SOON';
  const next = [...subs].sort((a, b) => new Date(a.renewalDate ?? 0).getTime() — new Date(b.renewalDate ?? 0).getTime()); slice(0, 5);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="section-title">أهلاً، {user?.name} 👋</h1>
        <p className="-mt-4 text-sm text-slate-500">تابع اشتراكاتك وجدّدها في مكان واحد.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Stat label="إجمالي الاشتراكات" value={subs.length} icon="📦" />
        <Stat label="اشتراكات نشطة" value={active.length} icon="✅" />
        <Stat label="يستحق إجراء قريباً" value={due.length} icon="⏰" />
      </div>

      <div className="card p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-black text-night">اشتراكات قادمة للتجديد</h2>
          <Link to="/subscriptions" className="text-sm font-bold text-brand-600">عرض الكل ←</Link>
        </div>
        {loading ? (
          <Spinner />
        ) : next.length === 0 ? (
          <Empty title="لا توجد اشتراكات بعد" hint="تصفح المزودين واختر باقتك الأولى" />
        ) : (
          <ul className="divide-y divide-slate-100">
            {next.map((s) => (
              <li key={s.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="font-bold text-night">{s.package?.name ?? 'باقة'}</p>
                  <p className="text-xs text-slate-400" dir="ltr">{s.phoneNumber}</p>
                </div>
                <div className="text-left">
                  <Badge status={s.status} />
                  <p className="mt-1 text-xs text-slate-500">تجديد: {fmtDate(s.renewalDate)}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}