import { useEffect, useState } from 'react';
import { paymentApi, subscriptionApi, catalogApi } from '../../services/api';
import { Payment, PaymentMethod, Subscription } from '../../lib/api';
import { Badge, Empty, Field, Spinner, useToast } from '../../components/ui';
import { fmtDateTime, fmtMoney } from '../../lib/format';

export function MyPayments() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true;
  const [busy, setBusy] = useState(false);
  const [amount, setAmount] = useState('');
  const [subId, setSubId] = useState('');
  const [methodId, setMethodId] = useState('');
  const [fromPhone, setFromPhone] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const toast = useToast();

  const load = () => {
    Promise.all([
      paymentApi.mine().then((d) => setPayments(d.payments).catch(() => undefined),
      subscriptionApi.mine().then((d) => setSubs(d.subscriptions).catch(() => undefined),
      catalogApi.paymentMethods().then((d) => setMethods(d.paymentMethods).catch(() => undefined),
    ]).finally(() => setLoading(false));
  };
  useEffect(load, []);
  useEffect(() => { if (!loading) load(); }, []);

  async function submit() {
    if (!subId || !methodId || !amount || !file) { toast.toast('error', 'أكمل كل الحقول'); return; }
    const form = new FormData();
    form.append('subscriptionId', subId;
    form.append('paymentMethodId', methodId;
    form.append('amount', amount;
    if (fromPhone) form.append('paidFromPhone', fromPhone;
    form.append('screenshot', file;
    setBusy(true;
    try {
      await paymentApi.submit(form;
      toast.toast('success', 'تم إرسال إثبات الدفع للمراجعة');
      setAmount(''); setFromPhone(''); setFile(null;
      load();
    } catch (e: any) {
      toast.toast('error', e?.message ?? 'فشل إرسال الدفع';
    } finally {
      setBusy(false;
    }
  }

  const pendingCount = payments.filter((p) => p.status === 'PENDING'.length;
  if (loading) return <Spinner />;
  return (
    <div className="space-y-6">
      <div>
        <h1 className="section-title">مدفوعاتي</h1>
        <p className="-mt-4 text-sm text-slate-500">أرسل إثباتات دفع وتابع حالة مراجعتها.</p>
      </div>

      <div className="card p-5">
        <h2 className="mb-4 text-lg font-black text-night">إرسال إثبات دفع جديد</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="الاشتراك" required>
            <select className="input" value={subId} onChange={(e) => setSubId(e.target.value)}>
              <option value="">اختر اشتراكاً…</option>
              {subs.map((s) => <option key={s.id} value={s.id}>{s.package?.name} — {s.phoneNumber}</option>)}
            </select>
          </Field>
          <Field label="وسيلة الدفع" required>
            <select className="input" value={methodId} onChange={(e) => setMethodId(e.target.value)}>
              <option value="">اختر الوسيلة…</option>
              {methods.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </Field>
          <Field label="المبلغ (ج.م)" required>
            <input className="input" dir="ltr" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="مثال: 300" />
          </Field>
          <Field label="المحول من رقم">
            <input className="input" dir="ltr" value={fromPhone} onChange={(e) => setFromPhone(e.target.value)} placeholder="01xxxxxxxxx (اختياري)" />
          </Field>
          <Field label="صورة إثبات التحويل" required>
            <input className="input" type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </Field>
        </div>
        <div className="mt-4 flex justify-end">
          <button className="btn btn-primary" disabled={busy} onClick={submit}>{busy ? 'جاري الإرسال…' : 'إرسال للمراجعة'}</button>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 p-4">
          <h2 className="text-lg font-black text-night">سجل المدفوعات</h2>
          <span className="badge badge-amber">{pendingCount} بانتظار المراجعة</span>
        </div>
        {payments.length === 0 ? (
          <Empty title="لا توجد مدفوعات بعد" />
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="th">التاريخ</th>
                <th className="th">الاشتراك</th>
                <th className="th">الوسيلة</th>
                <th className="th">المبلغ</th>
                <th className="th">الحالة</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id} className="border-b border-slate-100 last:border-0">
                  <td className="td">{fmtDateTime(p.createdAt)}</td>
                  <td className="td font-bold text-night">{p.subscription?.package?.name ?? '—'}</td>
                  <td className="td">{p.paymentMethod?.name ?? '—'}</td>
                  <td className="td font-black text-brand-700">{fmtMoney(p.amount)}</td>
                  <td className="td"><Badge status={p.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}