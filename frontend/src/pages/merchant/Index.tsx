import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { catalogApi, merchantApi } from '../../services/api';
import { Package, Provider, MerchantFinancials } from '../../lib/api';
import { Badge, Empty, Field, Spinner, Stat, useToast } from '../../components/ui';
import { fmtDate, fmtMoney } from '../../lib/format';

export function MerchantDashboard() {
  const [data, setData] = useState<MerchantFinancials | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    merchantApi.financials().then(setData).catch(() => undefined).finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;
  const obligations = data?.merchant.obligations ?? [];
  const current = data?.currentDue;
  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="mb-2 text-sm font-bold text-brand-700">مساحة التاجر</p>
          <h1 className="section-title mb-1">أهلاً بيك في لوحة التاجر</h1>
          <p className="text-sm text-slate-500">سجّل بيانات العميل، وإحنا نوصل الطلب للإدارة.</p>
        </div>
        <Link to="/merchant/customers/new" className="btn btn-primary">+ تسجيل عميل</Link>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Stat label="العملاء المسجلون" value={data?.customerCount ?? 0} icon="👥" />
        <Stat label="إجمالي المستحقات" value={fmtMoney(data?.totalDueAmount)} icon="ج.م" />
        <Stat label="أقرب موعد سداد" value={current?.dueDate ? fmtDate(current.dueDate) : 'لا يوجد'} icon="◷" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.15fr_.85fr]">
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 p-5">
            <div>
              <h2 className="text-lg font-black text-night">المستحقات المالية</h2>
              <p className="mt-1 text-xs text-slate-500">كل دورة مالية محفوظة كسجل مستقل.</p>
            </div>
            {current?.status && <Badge status={current.status} />}
          </div>
          {obligations.length === 0 ? <Empty title="لا توجد مستحقات حالياً" /> : (
            <div className="divide-y divide-slate-100">
              {obligations.slice(0, 6).map((obligation) => (
                <div key={obligation.id} className="flex items-center justify-between gap-3 p-4">
                  <div>
                    <p className="font-black text-night">{fmtMoney(obligation.amount)}</p>
                    <p className="text-xs text-slate-500">موعد السداد: {fmtDate(obligation.dueDate)}</p>
                  </div>
                  <Badge status={obligation.status} />
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="card bg-night p-6 text-white">
          <p className="text-sm font-bold text-sky-300">دورك بسيط</p>
          <h2 className="mt-2 text-2xl font-black">سجّل العميل في أقل من دقيقة</h2>
          <p className="mt-3 text-sm leading-7 text-slate-300">مش مطلوب منك إدارة حساب العميل أو متابعة الدفع. اكتب البيانات الأساسية فقط، والإدارة هتراجع الطلب.</p>
          <Link to="/merchant/customers/new" className="btn mt-6 bg-white text-night hover:bg-sky-50">ابدأ تسجيل جديد</Link>
        </div>
      </div>
    </div>
  );
}

export function MerchantCustomers() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="section-title mb-1">تسجيل العملاء</h1>
        <p className="text-sm text-slate-500">التاجر بيقدّم طلبات جديدة فقط، من غير كشف قائمة العملاء أو مدفوعاتهم.</p>
      </div>
      <div className="card p-6">
        <div className="mb-5 grid h-14 w-14 place-items-center rounded-2xl bg-brand-50 text-2xl">👥</div>
        <h2 className="text-xl font-black text-night">عايز تسجل عميل جديد؟</h2>
        <p className="mt-2 max-w-xl text-sm leading-7 text-slate-500">اختار المزود والباقة، واكتب اسم العميل ورقم موبايله. بعد الإرسال، الطلب يظهر للإدارة لمراجعته.</p>
        <Link to="/merchant/customers/new" className="btn btn-primary mt-5">تسجيل عميل جديد</Link>
      </div>
    </div>
  );
}

export function NewCustomerPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [providerId, setProviderId] = useState('');
  const [packageId, setPackageId] = useState('');

  useEffect(() => {
    catalogApi.providers().then((data) => setProviders(data.providers)).catch(() => undefined).finally(() => setLoading(false));
  }, []);

  const packages = useMemo<Package[]>(() => providers.find((provider) => provider.id === providerId)?.packages ?? [], [providers, providerId]);

  function selectProvider(value: string) {
    setProviderId(value);
    setPackageId('');
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    try {
      await merchantApi.createCustomer({ name: String(form.get('name')), phone: String(form.get('phone')), providerId, packageId });
      toast.toast('success', 'تم تسجيل العميل وإرسال الطلب للإدارة');
      navigate('/merchant');
    } catch (error: any) {
      toast.toast('error', error?.message ?? 'فشل تسجيل العميل');
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <Spinner />;
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="section-title mb-1">تسجيل عميل جديد</h1>
        <p className="text-sm text-slate-500">البيانات دي بتوصل للإدارة فقط لمراجعة الاشتراك.</p>
      </div>
      <form className="card space-y-5 p-5 sm:p-6" onSubmit={submit}>
        <Field label="اسم العميل" required><input className="input" name="name" placeholder="مثال: أحمد محمد" minLength={2} required /></Field>
        <Field label="رقم العميل" required><input className="input" name="phone" dir="ltr" placeholder="01xxxxxxxxx" pattern="01[0-9]{9}" required /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="المزود" required>
            <select className="input" value={providerId} onChange={(event) => selectProvider(event.target.value)} required>
              <option value="">اختر المزود…</option>
              {providers.map((provider) => <option key={provider.id} value={provider.id}>{provider.name}</option>)}
            </select>
          </Field>
          <Field label="الباقة" required>
            <select className="input" value={packageId} onChange={(event) => setPackageId(event.target.value)} required disabled={!providerId}>
              <option value="">اختر الباقة…</option>
              {packages.map((pkg) => <option key={pkg.id} value={pkg.id}>{pkg.name} · {fmtMoney(pkg.price)}</option>)}
            </select>
          </Field>
        </div>
        <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
          <Link to="/merchant" className="btn btn-outline">إلغاء</Link>
          <button className="btn btn-primary" disabled={busy || !providerId || !packageId}>{busy ? 'جاري الإرسال…' : 'إرسال للإدارة'}</button>
        </div>
      </form>
    </div>
  );
}
