import { FormEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { paymentApi, subscriptionApi, catalogApi } from '../../services/api';
import { Payment, PaymentMethod, Subscription } from '../../lib/api';
import { Badge, Empty, Field, Spinner, Stat, useToast } from '../../components/ui';
import { fmtDateTime, fmtMoney } from '../../lib/format';

export function MyPayments() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [amount, setAmount] = useState('');
  const [subId, setSubId] = useState('');
  const [methodId, setMethodId] = useState('');
  const [fromPhone, setFromPhone] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [fileInputKey, setFileInputKey] = useState(0);
  const toast = useToast();

  function load() {
    Promise.all([
      paymentApi.mine().then((data) => setPayments(data.payments)).catch(() => undefined),
      subscriptionApi.mine().then((data) => setSubs(data.subscriptions)).catch(() => undefined),
      catalogApi.paymentMethods().then((data) => setMethods(data.paymentMethods)).catch(() => undefined),
    ]).finally(() => setLoading(false));
  }
  useEffect(load, []);

  const payableSubs = subs.filter((subscription) => subscription.status === 'PENDING_PAYMENT' || subscription.status === 'PENDING_REVIEW');
  const selectedMethod = methods.find((method) => method.id === methodId);
  const pendingCount = payments.filter((payment) => payment.status === 'PENDING').length;
  const approvedTotal = payments.filter((payment) => payment.status === 'APPROVED').reduce((total, payment) => total + payment.amount, 0);

  function selectSubscription(id: string) {
    setSubId(id);
    const price = subs.find((subscription) => subscription.id === id)?.package?.price;
    if (price) setAmount(String(price));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!subId || !methodId || !amount || !file) { toast.toast('error', 'أكمل كل بيانات الدفع'); return; }
    const form = new FormData();
    form.append('subscriptionId', subId);
    form.append('paymentMethodId', methodId);
    form.append('amount', amount);
    if (fromPhone) form.append('paidFromPhone', fromPhone);
    form.append('screenshot', file);
    setBusy(true);
    try {
      await paymentApi.submit(form);
      toast.toast('success', 'تم إرسال إثبات الدفع للمراجعة');
      setAmount(''); setSubId(''); setMethodId(''); setFromPhone(''); setFile(null); setFileInputKey((key) => key + 1);
      load();
    } catch (error: any) {
      toast.toast('error', error?.message ?? 'فشل إرسال الدفع');
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <Spinner />;
  return <div className="space-y-6">
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="mb-2 text-sm font-bold text-brand-700">الدفع الآمن</p><h1 className="section-title mb-1">مدفوعاتي</h1><p className="text-sm text-slate-500">ارفع صورة التحويل وتابع قرار المراجعة من هنا.</p></div><Link to="/subscriptions" className="btn btn-outline">عرض الاشتراكات</Link></div>
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3"><Stat label="كل المدفوعات" value={payments.length} icon="↕" /><Stat label="بانتظار المراجعة" value={pendingCount} icon="◷" /><Stat label="إجمالي المقبول" value={fmtMoney(approvedTotal)} icon="✓" /></div>
    <div className="grid gap-6 xl:grid-cols-[1.1fr_.9fr]">
      <form className="card p-5 sm:p-6" onSubmit={submit}><div className="mb-5"><h2 className="text-lg font-black text-night">إرسال إثبات دفع</h2><p className="mt-1 text-xs text-slate-500">بيانات التحويل بتوصل للإدارة للمراجعة فقط.</p></div>{payableSubs.length === 0 ? <div className="rounded-2xl bg-slate-50 p-5 text-center"><p className="font-bold text-slate-600">مفيش اشتراك محتاج دفع دلوقتي</p><Link to="/providers" className="mt-2 inline-block text-sm font-black text-brand-700">استعرض الباقات</Link></div> : <div className="space-y-4"><Field label="الاشتراك" required><select className="input" value={subId} onChange={(event) => selectSubscription(event.target.value)} required><option value="">اختر اشتراكاً…</option>{payableSubs.map((subscription) => <option key={subscription.id} value={subscription.id}>{subscription.package?.name} · {subscription.phoneNumber}</option>)}</select></Field><Field label="وسيلة الدفع" required><select className="input" value={methodId} onChange={(event) => setMethodId(event.target.value)} required><option value="">اختر الوسيلة…</option>{methods.map((method) => <option key={method.id} value={method.id}>{method.name}</option>)}</select>{selectedMethod && <div className="mt-2 rounded-xl bg-brand-50 p-3 text-xs leading-6 text-brand-900"><p className="font-black" dir="ltr">{selectedMethod.accountIdentifier}</p><p>{selectedMethod.instructions}</p></div>}</Field><div className="grid gap-4 sm:grid-cols-2"><Field label="المبلغ (ج.م)" required><input className="input" dir="ltr" type="number" min="1" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="مثال: 250" required /></Field><Field label="المحول من رقم"><input className="input" dir="ltr" value={fromPhone} onChange={(event) => setFromPhone(event.target.value)} pattern="01[0-9]{9}" placeholder="01xxxxxxxxx" /></Field></div><Field label="صورة إثبات التحويل" required><input key={fileInputKey} className="input" type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => setFile(event.target.files?.[0] ?? null)} required />{file && <p className="mt-1 text-xs font-bold text-emerald-700">تم اختيار: {file.name}</p>}</Field><button className="btn btn-primary w-full" disabled={busy}>{busy ? 'جاري الإرسال…' : 'إرسال للمراجعة'}</button></div>}</form>
      <div className="card overflow-hidden"><div className="border-b border-slate-100 bg-night p-5 text-white"><p className="text-sm font-bold text-sky-300">خطوات بسيطة</p><h2 className="mt-1 text-xl font-black">ادفع، صوّر، واستنى التأكيد</h2></div><div className="space-y-5 p-5"><Step number="01" title="اختار وسيلة الدفع" text="التعليمات والحساب المستلم بيظهروا بمجرد الاختيار." /><Step number="02" title="حوّل المبلغ" text="استخدم الرقم الظاهر واحتفظ بصورة الإيصال." /><Step number="03" title="ارفع الصورة" text="الإدارة تراجعها وتبعتلك إشعار بالقرار." /></div><div className="mx-5 mb-5 rounded-xl bg-amber-50 p-3 text-xs leading-6 text-amber-800">مسموح PNG وJPG وWebP فقط، وحجم الصورة الأقصى 5MB.</div></div>
    </div>
    <section className="card overflow-hidden"><div className="flex items-center justify-between border-b border-slate-100 p-5"><div><h2 className="text-lg font-black text-night">سجل المدفوعات</h2><p className="mt-1 text-xs text-slate-500">كل طلبات الدفع السابقة محفوظة.</p></div><span className="badge badge-amber">{pendingCount} قيد المراجعة</span></div>{payments.length === 0 ? <Empty title="لا توجد مدفوعات بعد" /> : <div className="divide-y divide-slate-100">{payments.map((payment) => <div key={payment.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-brand-50 font-black text-brand-700">↕</div><div><p className="font-black text-night">{payment.subscription?.package?.name ?? 'اشتراك'}</p><p className="mt-1 text-xs text-slate-400">{payment.paymentMethod?.name ?? 'وسيلة دفع'} · {fmtDateTime(payment.createdAt)}</p></div></div><div className="flex items-center justify-between gap-4 sm:justify-end"><p className="font-black text-brand-700">{fmtMoney(payment.amount)}</p><Badge status={payment.status} /></div></div>)}</div>}</section>
  </div>;
}

function Step({ number, title, text }: { number: string; title: string; text: string }) {
  return <div className="flex gap-3"><div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-600 text-xs font-black text-white">{number}</div><div><p className="font-black text-night">{title}</p><p className="mt-1 text-xs leading-6 text-slate-500">{text}</p></div></div>;
}
