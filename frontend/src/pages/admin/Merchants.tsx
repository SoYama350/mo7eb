import { FormEvent, useEffect, useState } from 'react';
import { adminApi } from '../../services/api';
import { Merchant } from '../../lib/api';
import { Badge, Empty, Field, Spinner, useToast } from '../../components/ui';
import { fmtDate, fmtMoney } from '../../lib/format';

type MerchantRow = Merchant & { _count?: { customers: number; obligations: number } };

export function AdminMerchants() {
  const toast = useToast();
  const [merchants, setMerchants] = useState<MerchantRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);

  function load() { adminApi.merchants().then((data) => setMerchants(data.merchants as MerchantRow[])).catch(() => undefined).finally(() => setLoading(false)); }
  useEffect(load, []);

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const target = event.currentTarget;
    const form = new FormData(target);
    try { await adminApi.createMerchant({ name: String(form.get('name')), phone: String(form.get('phone')), password: String(form.get('password') || '') || undefined }); target.reset(); toast.toast('success', 'تم إنشاء حساب التاجر'); load(); }
    catch (error: any) { toast.toast('error', error?.message ?? 'فشل إنشاء التاجر'); }
  }

  async function toggle(merchant: MerchantRow) {
    try { await adminApi.setMerchantActive(merchant.id, !merchant.user?.isActive); toast.toast('success', merchant.user?.isActive ? 'تم إيقاف التاجر' : 'تم تفعيل التاجر'); load(); }
    catch (error: any) { toast.toast('error', error?.message ?? 'تعذر تعديل حالة التاجر'); }
  }

  if (loading) return <Spinner />;
  return (
    <div className="space-y-6">
      <div><h1 className="section-title mb-1">التجار</h1><p className="text-sm text-slate-500">أنشئ الحسابات، تابع عدد العملاء، وأدر المستحقات المالية.</p></div>
      <form className="card grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4" onSubmit={create}>
        <Field label="اسم التاجر" required><input className="input" name="name" placeholder="محمود الحداد" required /></Field>
        <Field label="رقم الدخول" required><input className="input" name="phone" dir="ltr" placeholder="01xxxxxxxxx" pattern="01[0-9]{9}" required /></Field>
        <Field label="كلمة المرور"><input className="input" name="password" type="password" minLength={6} placeholder="افتراضي: password123" /></Field>
        <div className="flex items-end"><button className="btn btn-primary w-full">+ إنشاء تاجر</button></div>
      </form>

      <div className="grid gap-4 lg:grid-cols-2">
        {merchants.length === 0 ? <div className="card lg:col-span-2"><Empty title="لا يوجد تجار" /></div> : merchants.map((merchant) => {
          const obligations = merchant.obligations ?? [];
          return <div className="card overflow-hidden" key={merchant.id}>
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 p-5">
              <div><h2 className="font-black text-night">{merchant.user?.name ?? merchant.name}</h2><p className="mt-1 text-xs text-slate-500" dir="ltr">{merchant.user?.phone}</p></div>
              <button className="btn btn-outline px-3 py-2 text-xs" onClick={() => void toggle(merchant)}>{merchant.user?.isActive ? 'إيقاف' : 'تفعيل'}</button>
            </div>
            <div className="grid grid-cols-2 gap-3 p-5"><div className="rounded-xl bg-slate-50 p-3"><p className="stat-label">العملاء</p><p className="stat-value text-xl">{merchant._count?.customers ?? 0}</p></div><div className="rounded-xl bg-slate-50 p-3"><p className="stat-label">المستحقات</p><p className="stat-value text-xl">{merchant._count?.obligations ?? 0}</p></div></div>
            <div className="border-t border-slate-100 p-5">
              <div className="mb-3 flex items-center justify-between"><h3 className="font-black text-night">آخر المستحقات</h3><button className="text-sm font-bold text-brand-700" onClick={() => setSelected(selected === merchant.id ? null : merchant.id)}>{selected === merchant.id ? 'إغلاق' : '+ إضافة'}</button></div>
              {selected === merchant.id && <ObligationForm merchantId={merchant.id} onDone={() => { setSelected(null); load(); }} />}
              {obligations.length === 0 ? <p className="text-sm text-slate-400">لا توجد سجلات.</p> : <div className="space-y-2">{obligations.map((obligation) => <div key={obligation.id} className="flex items-center justify-between gap-2 rounded-xl bg-slate-50 p-3"><div><p className="font-black text-night">{fmtMoney(obligation.amount)}</p><p className="text-xs text-slate-500">{fmtDate(obligation.dueDate)}</p></div><div className="flex items-center gap-2"><Badge status={obligation.status} />{obligation.status !== 'PAID' && <button className="btn btn-success px-2 py-1 text-[11px]" onClick={async () => { await adminApi.markObligationPaid(obligation.id); toast.toast('success', 'تم تسجيل السداد'); load(); }}>تم السداد</button>}</div></div>)}</div>}
            </div>
          </div>;
        })}
      </div>
    </div>
  );
}

function ObligationForm({ merchantId, onDone }: { merchantId: string; onDone: () => void }) {
  const toast = useToast();
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try { await adminApi.addObligation(merchantId, { amount: Number(form.get('amount')), dueDate: String(form.get('dueDate')) }); toast.toast('success', 'تمت إضافة المستحقات'); onDone(); }
    catch (error: any) { toast.toast('error', error?.message ?? 'فشل إضافة المستحقات'); }
  }
  return <form className="mb-4 grid gap-3 rounded-xl border border-brand-100 bg-brand-50/50 p-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end" onSubmit={submit}><Field label="المبلغ"><input className="input" name="amount" type="number" min="0" required /></Field><Field label="تاريخ الاستحقاق"><input className="input" name="dueDate" type="date" required /></Field><button className="btn btn-primary">إضافة</button></form>;
}
