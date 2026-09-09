import { ReactNode, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { subscriptionApi } from '../../services/api';
import { Subscription } from '../../lib/api';
import { Badge, Empty, Spinner, Stat, useToast } from '../../components/ui';
import { fmtDate, fmtMoney } from '../../lib/format';

export function MySubscriptions() {
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [filter, setFilter] = useState('all');
  const toast = useToast();

  function load() {
    subscriptionApi.mine().then((data) => setSubs(data.subscriptions)).catch(() => undefined).finally(() => setLoading(false));
  }
  useEffect(load, []);

  async function renew(id: string) {
    setBusyId(id);
    try {
      const data = await subscriptionApi.renew(id);
      toast.toast('success', data.payment ? 'طلب التجديد جاهز. ارفع إثبات الدفع.' : 'تم التجديد بنجاح');
      load();
    } catch (error: any) {
      toast.toast('error', error?.message ?? 'فشل التجديد');
    } finally {
      setBusyId(null);
    }
  }

  const visible = useMemo(() => filter === 'all' ? subs : subs.filter((subscription) => subscription.status === filter), [filter, subs]);
  const active = subs.filter((subscription) => subscription.status === 'ACTIVE').length;
  const attention = subs.filter((subscription) => ['PENDING_PAYMENT', 'PENDING_REVIEW', 'EXPIRING_SOON', 'EXPIRED'].includes(subscription.status)).length;

  if (loading) return <Spinner />;
  return <div className="space-y-6">
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="mb-2 text-sm font-bold text-brand-700">كل خطوطك في مكان واحد</p><h1 className="section-title mb-1">اشتراكاتي</h1><p className="text-sm text-slate-500">تابع الحالة، ميعاد التجديد، وسجل كل دورة.</p></div><Link to="/providers" className="btn btn-primary">+ اشتراك جديد</Link></div>
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3"><Stat label="كل الاشتراكات" value={subs.length} icon="▣" /><Stat label="نشطة الآن" value={active} icon="✓" /><Stat label="تحتاج إجراء" value={attention} icon="◷" /></div>
    <div className="flex gap-2 overflow-x-auto pb-1"><FilterButton active={filter === 'all'} onClick={() => setFilter('all')}>الكل <span>{subs.length}</span></FilterButton><FilterButton active={filter === 'ACTIVE'} onClick={() => setFilter('ACTIVE')}>نشطة</FilterButton><FilterButton active={filter === 'EXPIRING_SOON'} onClick={() => setFilter('EXPIRING_SOON')}>قريبة الانتهاء</FilterButton><FilterButton active={filter === 'EXPIRED'} onClick={() => setFilter('EXPIRED')}>منتهية</FilterButton></div>
    {visible.length === 0 ? <div className="card"><Empty title="لا توجد اشتراكات في الفلتر ده" hint={<Link to="/providers" className="font-bold text-brand-700">استعرض الباقات المتاحة</Link>} /></div> : <div className="grid gap-4 lg:grid-cols-2">{visible.map((subscription) => <SubscriptionCard key={subscription.id} subscription={subscription} busy={busyId === subscription.id} onRenew={() => void renew(subscription.id)} />)}</div>}
  </div>;
}

function FilterButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return <button className={`shrink-0 rounded-xl px-4 py-2 text-xs font-black ${active ? 'bg-night text-white' : 'bg-white text-slate-500 shadow-sm ring-1 ring-slate-200'}`} onClick={onClick}>{children}</button>;
}

function SubscriptionCard({ subscription, busy, onRenew }: { subscription: Subscription; busy: boolean; onRenew: () => void }) {
  const provider = subscription.provider;
  const canRenew = ['ACTIVE', 'EXPIRING_SOON', 'EXPIRED'].includes(subscription.status);
  const latestPayment = subscription.payments?.[0];
  return <article className="card overflow-hidden"><div className="flex items-center justify-between gap-3 p-5" style={{ background: provider?.secondaryColor ?? '#ecfeff' }}><div className="flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-2xl bg-white text-lg font-black shadow-sm" style={{ color: provider?.primaryColor ?? '#0e7490' }}>{provider?.logo ?? '◈'}</div><div><p className="text-xs font-bold" style={{ color: provider?.primaryColor ?? '#0e7490' }}>{provider?.name ?? 'مزود الخدمة'}</p><h2 className="font-black text-night">{subscription.package?.name ?? 'باقة'}</h2></div></div><Badge status={subscription.status} /></div><div className="space-y-4 p-5"><div className="flex items-center justify-between rounded-xl bg-slate-50 p-3"><div><p className="text-[10px] font-bold text-slate-400">رقم الخط</p><p className="mt-1 font-black text-night" dir="ltr">{subscription.phoneNumber}</p></div><div className="text-left"><p className="text-[10px] font-bold text-slate-400">قيمة الباقة</p><p className="mt-1 font-black text-brand-700">{fmtMoney(subscription.package?.price)}</p></div></div><div className="grid grid-cols-2 gap-3"><Info label="بدأت في" value={fmtDate(subscription.startDate)} /><Info label="التجديد" value={fmtDate(subscription.renewalDate)} /></div>{latestPayment && <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-xs"><span className="text-slate-500">آخر دفعة</span><Badge status={latestPayment.status} /></div>}<div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">{subscription.status === 'PENDING_PAYMENT' || subscription.status === 'PENDING_REVIEW' ? <Link to="/payments" className="btn btn-primary">{subscription.status === 'PENDING_REVIEW' ? 'عرض الدفع المرسل' : 'إكمال الدفع'}</Link> : canRenew && <button className="btn btn-primary" disabled={busy} onClick={onRenew}>{busy ? 'جاري…' : 'جدّد الاشتراك'}</button>}</div></div></article>;
}

function Info({ label, value }: { label: string; value: string }) { return <div><p className="text-[10px] font-bold text-slate-400">{label}</p><p className="mt-1 text-sm font-black text-night">{value}</p></div>; }
