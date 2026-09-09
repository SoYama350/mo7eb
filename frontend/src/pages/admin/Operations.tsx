import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminApi, paymentApi } from '../../services/api';
import { AdminCustomer, Payment, Subscription } from '../../lib/api';
import { Badge, Empty, Spinner, useToast } from '../../components/ui';
import { fmtDate, fmtDateTime, fmtMoney } from '../../lib/format';

export function AdminCustomers() {
  const [customers, setCustomers] = useState<AdminCustomer[]>([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);

  function load() { setLoading(true); adminApi.customers({ search, status }).then((data) => setCustomers(data.customers)).catch(() => undefined).finally(() => setLoading(false)); }
  useEffect(load, [status]);

  return (
    <div className="space-y-6">
      <div><h1 className="section-title mb-1">العملاء</h1><p className="text-sm text-slate-500">ابحث حسب الاسم أو الرقم، واعرف مصدر الاشتراك وحالته.</p></div>
      <div className="card flex flex-col gap-3 p-4 sm:flex-row"><input className="input" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="ابحث بالاسم أو رقم الموبايل" /><select className="input sm:max-w-xs" value={status} onChange={(event) => setStatus(event.target.value)}><option value="">كل الحالات</option><option value="active">نشطة</option><option value="expiring">قريبة الانتهاء</option><option value="expired">منتهية</option><option value="pending">بانتظار الإجراء</option></select><button className="btn btn-primary shrink-0" onClick={load}>بحث</button></div>
      <div className="card overflow-x-auto">
        {loading ? <Spinner /> : customers.length === 0 ? <Empty title="لا توجد نتائج" /> : <table className="w-full min-w-[900px]"><thead><tr className="border-b border-slate-100 bg-slate-50"><th className="th">العميل</th><th className="th">المصدر</th><th className="th">التاجر</th><th className="th">المزود والباقة</th><th className="th">الحالة</th><th className="th">التجديد</th></tr></thead><tbody>{customers.map((customer) => <tr className="border-b border-slate-100 last:border-0" key={customer.id}><td className="td"><p className="font-black text-night">{customer.name}</p><p className="text-xs text-slate-400" dir="ltr">{customer.phone}</p></td><td className="td"><span className="badge badge-blue">{customer.source === 'MERCHANT' ? 'تاجر' : 'مباشر'}</span></td><td className="td">{customer.merchant?.name ?? '—'}</td><td className="td"><p className="font-bold">{customer.subscription?.provider?.name ?? '—'}</p><p className="text-xs text-slate-400">{customer.subscription?.package?.name ?? 'بدون اشتراك'}</p></td><td className="td"><Badge status={customer.subscriptionStatus} /></td><td className="td">{fmtDate(customer.subscription?.renewalDate)}</td></tr>)}</tbody></table>}
      </div>
    </div>
  );
}

export function AdminSubscriptions() {
  const toast = useToast();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);

  function load() { setLoading(true); adminApi.subscriptions().then((data) => setSubscriptions(data.subscriptions)).catch(() => undefined).finally(() => setLoading(false)); }
  useEffect(load, []);

  async function transition(id: string, action: 'activate' | 'deactivate') {
    try { await (action === 'activate' ? adminApi.activate(id) : adminApi.deactivate(id)); toast.toast('success', action === 'activate' ? 'تم تفعيل الاشتراك' : 'تم إيقاف الاشتراك'); load(); }
    catch (error: any) { toast.toast('error', error?.message ?? 'فشل تحديث الاشتراك'); }
  }

  const visible = status ? subscriptions.filter((subscription) => subscription.status === status) : subscriptions;
  return <div className="space-y-6"><div><h1 className="section-title mb-1">الاشتراكات</h1><p className="text-sm text-slate-500">استخدم أوامر انتقال الحالة بدل التعديل المباشر.</p></div><div className="flex justify-end"><select className="input max-w-xs" value={status} onChange={(event) => setStatus(event.target.value)}><option value="">كل الحالات</option><option value="PENDING_PAYMENT">بانتظار الدفع</option><option value="PENDING_REVIEW">بانتظار المراجعة</option><option value="ACTIVE">نشطة</option><option value="EXPIRING_SOON">قريبة الانتهاء</option><option value="EXPIRED">منتهية</option></select></div><div className="card overflow-x-auto">{loading ? <Spinner /> : visible.length === 0 ? <Empty title="لا توجد اشتراكات" /> : <table className="w-full min-w-[860px]"><thead><tr className="border-b border-slate-100 bg-slate-50"><th className="th">العميل</th><th className="th">المزود</th><th className="th">الباقة</th><th className="th">الخط</th><th className="th">الحالة</th><th className="th">التجديد</th><th className="th">إجراء</th></tr></thead><tbody>{visible.map((subscription) => <tr className="border-b border-slate-100 last:border-0" key={subscription.id}><td className="td font-black text-night">{subscription.user?.name ?? '—'}</td><td className="td">{subscription.provider?.name ?? '—'}</td><td className="td">{subscription.package?.name ?? '—'}</td><td className="td" dir="ltr">{subscription.phoneNumber}</td><td className="td"><Badge status={subscription.status} /></td><td className="td">{fmtDate(subscription.renewalDate)}</td><td className="td">{['PENDING_PAYMENT', 'PENDING_REVIEW', 'EXPIRED'].includes(subscription.status) ? <button className="btn btn-success px-3 py-2 text-xs" onClick={() => void transition(subscription.id, 'activate')}>تفعيل</button> : <button className="btn btn-danger px-3 py-2 text-xs" onClick={() => void transition(subscription.id, 'deactivate')}>إيقاف</button>}</td></tr>)}</tbody></table>}</div></div>;
}

export function AdminPayments() {
  const toast = useToast();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  function load() { setLoading(true); adminApi.payments().then((data) => setPayments(data.payments)).catch(() => undefined).finally(() => setLoading(false)); }
  useEffect(load, []);

  async function review(payment: Payment, decision: 'approved' | 'rejected') {
    const reviewNote = decision === 'rejected' ? window.prompt('سبب الرفض (اختياري):') ?? undefined : undefined;
    try { await paymentApi.review(payment.id, { decision, reviewNote }); toast.toast('success', decision === 'approved' ? 'تم اعتماد الدفع وتفعيل الاشتراك' : 'تم رفض الدفع'); load(); }
    catch (error: any) { toast.toast('error', error?.message ?? 'فشل مراجعة الدفع'); }
  }

  return <div className="space-y-6"><div><h1 className="section-title mb-1">مراجعة المدفوعات</h1><p className="text-sm text-slate-500">راجع إثبات التحويل ثم فعّل الاشتراك أو أعد الطلب للعميل.</p></div><div className="card overflow-x-auto">{loading ? <Spinner /> : payments.length === 0 ? <Empty title="لا توجد مدفوعات" /> : <table className="w-full min-w-[900px]"><thead><tr className="border-b border-slate-100 bg-slate-50"><th className="th">العميل</th><th className="th">الاشتراك</th><th className="th">الوسيلة</th><th className="th">المبلغ</th><th className="th">التاريخ</th><th className="th">الحالة</th><th className="th">إجراء</th></tr></thead><tbody>{payments.map((payment) => <tr className="border-b border-slate-100 last:border-0" key={payment.id}><td className="td"><p className="font-black text-night">{payment.user?.name ?? '—'}</p><p className="text-xs text-slate-400" dir="ltr">{payment.user?.phone}</p></td><td className="td">{payment.subscription?.package?.name ?? '—'}</td><td className="td">{payment.paymentMethod?.name ?? '—'}</td><td className="td font-black text-brand-700">{fmtMoney(payment.amount)}</td><td className="td">{fmtDateTime(payment.createdAt)}</td><td className="td"><Badge status={payment.status} /></td><td className="td flex gap-2">{payment.screenshotUrl && <a className="btn btn-outline px-3 py-2 text-xs" href={payment.screenshotUrl} target="_blank" rel="noreferrer">الإيصال</a>}{payment.status === 'PENDING' && <><button className="btn btn-success px-3 py-2 text-xs" onClick={() => void review(payment, 'approved')}>اعتماد</button><button className="btn btn-danger px-3 py-2 text-xs" onClick={() => void review(payment, 'rejected')}>رفض</button></>}</td></tr>)}</tbody></table>}</div></div>;
}
