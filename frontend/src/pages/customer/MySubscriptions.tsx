import { useEffect, useState } from 'react';
import { subscriptionApi } from '../../services/api';
import { Subscription } from '../../lib/api';
import { Badge, Empty, Spinner, useToast } from '../../components/ui';
import { fmtDate, fmtMoney } from '../../lib/format';
import { Link } from 'react-router-dom';

export function MySubscriptions() {
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const toast = useToast();

  const load = () => {
    subscriptionApi.mine()
      .then((d) => setSubs(d.subscriptions))
      .catch(() => undefined)
      .finally(() => setLoading(false));
  };
  useEffect(load, []);
  useEffect(() => { if (!loading) load(); }, []);

  async function renew(id: string) {
    setBusyId(id;
    try {
      const d = await subscriptionApi.renew(id);
      toast.toast('success', d.payment ? 'تم طلب التجديد — أكمل الدفع' : 'تم التجديد بنجاح');
      load();
    } catch (e: any) {
      toast.toast('error', e?.message ?? 'فشل التجديد');
    } finally {
      setBusyId(null;
    }
  }

  if (loading) return <Spinner />;
  return (
    <div className="space-y-6">
      <div>
        <h1 className="section-title">اشتراكاتي</h1>
        <p className="-mt-4 text-sm text-slate-500">إدارة اشتراكاتك وتجديدها بسهولة.</p>
      </div>
      <div className="card overflow-hidden">
        {subs.length === 0 ? (
          <Empty title="لا توجد اشتراكات" hint={<Link to="/providers" className="text-brand-600 font-bold">تصفح المزودين</Link>} />
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="th">الباقة</th>
                <th className="th">المزود</th>
                <th className="th">رقم الخط</th>
                <th className="th">الحالة</th>
                <th className="th">التجديد</th>
                <th className="th">السعر</th>
                <th className="th">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {subs.map((s) => (
                <tr key={s.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60">
                  <td className="td font-bold text-night">{s.package?.name ?? '—'}</td>
                  <td className="td">{s.provider?.name ?? '—'}</td>
                  <td className="td" dir="ltr">{s.phoneNumber}</td>
                  <td className="td"><Badge status={s.status} /></td>
                  <td className="td">{fmtDate(s.renewalDate)}</td>
                  <td className="td font-black text-brand-700">{fmtMoney(s.package?.price)}</td>
                  <td className="td">
                    <button className="btn btn-outline btn-sm" disabled={busyId === s.id} onClick={() => renew(s.id)}>
                      {busyId === s.id ? 'جاري…' : 'جدّد'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}