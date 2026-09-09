import { FormEvent, useEffect, useState } from 'react';
import { adminCatalogApi } from '../../services/api';
import { Package, PaymentMethod, Provider } from '../../lib/api';
import { Empty, Field, Spinner, useToast } from '../../components/ui';
import { fmtMoney } from '../../lib/format';

export function AdminProviders() {
  const toast = useToast();
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  function load() { adminCatalogApi.providers().then((data) => setProviders(data.providers)).catch(() => undefined).finally(() => setLoading(false)); }
  useEffect(load, []);

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const target = event.currentTarget;
    const form = new FormData(target);
    setBusy(true);
    try {
      await adminCatalogApi.createProvider({ name: String(form.get('name')), slug: String(form.get('slug')), logo: String(form.get('logo')), primaryColor: String(form.get('primaryColor')), secondaryColor: String(form.get('secondaryColor')), order: Number(form.get('order') || 0) });
      target.reset();
      toast.toast('success', 'تم إنشاء المزود');
      load();
    } catch (error: any) { toast.toast('error', error?.message ?? 'فشل إنشاء المزود'); }
    finally { setBusy(false); }
  }

  async function toggle(provider: Provider) {
    try { await adminCatalogApi.updateProvider(provider.id, { isActive: !provider.isActive }); toast.toast('success', provider.isActive ? 'تم إيقاف المزود' : 'تم تفعيل المزود'); load(); }
    catch (error: any) { toast.toast('error', error?.message ?? 'تعذر تعديل المزود'); }
  }

  if (loading) return <Spinner />;
  return (
    <div className="space-y-6">
      <Header title="المزودون" subtitle="إدارة العلامات التجارية ومزودي الخدمة الثلاثة." />
      <form className="card grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4" onSubmit={create}>
        <Field label="اسم المزود" required><input className="input" name="name" placeholder="Vodafone مصر" required /></Field>
        <Field label="المعرف" required><input className="input" name="slug" dir="ltr" placeholder="vodafone" pattern="[a-z0-9-]+" required /></Field>
        <Field label="الحرف أو الشعار"><input className="input" name="logo" placeholder="V" /></Field>
        <Field label="الترتيب"><input className="input" name="order" type="number" defaultValue="0" min="0" /></Field>
        <Field label="اللون الأساسي"><input className="input h-11 p-1" name="primaryColor" type="color" defaultValue="#0e7490" /></Field>
        <Field label="اللون الثانوي"><input className="input h-11 p-1" name="secondaryColor" type="color" defaultValue="#ecfeff" /></Field>
        <div className="flex items-end lg:col-span-2"><button className="btn btn-primary w-full sm:w-auto" disabled={busy}>{busy ? 'جاري…' : '+ إضافة مزود'}</button></div>
      </form>
      <div className="grid gap-4 md:grid-cols-3">
        {providers.length === 0 ? <div className="card md:col-span-3"><Empty title="لا يوجد مزودون" /></div> : providers.map((provider) => (
          <div key={provider.id} className="card overflow-hidden">
            <div className="flex items-center gap-3 p-5 text-white" style={{ background: provider.primaryColor }}>
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white text-xl font-black" style={{ color: provider.primaryColor }}>{provider.logo || provider.name.slice(0, 1)}</div>
              <div className="min-w-0"><p className="truncate font-black">{provider.name}</p><p className="text-xs text-white/70">/{provider.slug}</p></div>
            </div>
            <div className="flex items-center justify-between p-4"><span className={`badge ${provider.isActive ? 'badge-green' : 'badge-slate'}`}>{provider.isActive ? 'نشط' : 'موقوف'}</span><button className="btn btn-outline px-3 py-2 text-xs" onClick={() => void toggle(provider)}>{provider.isActive ? 'إيقاف' : 'تفعيل'}</button></div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function AdminPackages() {
  const toast = useToast();
  const [providers, setProviders] = useState<Provider[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  function load() {
    Promise.all([adminCatalogApi.providers(), adminCatalogApi.packages()]).then(([providerData, packageData]) => { setProviders(providerData.providers); setPackages(packageData.packages); }).catch(() => undefined).finally(() => setLoading(false));
  }
  useEffect(load, []);

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const target = event.currentTarget;
    const form = new FormData(target);
    setBusy(true);
    try {
      await adminCatalogApi.createPackage({ providerId: String(form.get('providerId')), name: String(form.get('name')), internetGB: Number(form.get('internetGB')), minutes: Number(form.get('minutes')), price: Number(form.get('price')), durationDays: Number(form.get('durationDays')), reminderDays: Number(form.get('reminderDays')) });
      target.reset();
      toast.toast('success', 'تم إنشاء الباقة');
      load();
    } catch (error: any) { toast.toast('error', error?.message ?? 'فشل إنشاء الباقة'); }
    finally { setBusy(false); }
  }

  async function toggle(pkg: Package) {
    try { await adminCatalogApi.updatePackage(pkg.id, { isActive: !pkg.isActive }); toast.toast('success', pkg.isActive ? 'تم إيقاف الباقة' : 'تم تفعيل الباقة'); load(); }
    catch (error: any) { toast.toast('error', error?.message ?? 'تعذر تعديل الباقة'); }
  }

  if (loading) return <Spinner />;
  return (
    <div className="space-y-6">
      <Header title="الباقات" subtitle="السعر والمدة والإنترنت والدقائق قابلة للإدارة من هنا." />
      <form className="card grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4" onSubmit={create}>
        <Field label="المزود" required><select className="input" name="providerId" required><option value="">اختر…</option>{providers.map((provider) => <option key={provider.id} value={provider.id}>{provider.name}</option>)}</select></Field>
        <Field label="اسم الباقة" required><input className="input" name="name" placeholder="باقة 40 GB" required /></Field>
        <Field label="الإنترنت (GB)" required><input className="input" name="internetGB" type="number" min="0" required /></Field>
        <Field label="الدقائق" required><input className="input" name="minutes" type="number" min="0" required /></Field>
        <Field label="السعر (ج.م)" required><input className="input" name="price" type="number" min="0" step="0.01" required /></Field>
        <Field label="المدة (يوم)" required><input className="input" name="durationDays" type="number" min="1" defaultValue="30" required /></Field>
        <Field label="التذكير قبل (يوم)" required><input className="input" name="reminderDays" type="number" min="0" defaultValue="3" required /></Field>
        <div className="flex items-end"><button className="btn btn-primary w-full" disabled={busy}>{busy ? 'جاري…' : '+ إضافة باقة'}</button></div>
      </form>
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[720px]"><thead><tr className="border-b border-slate-100 bg-slate-50"><th className="th">الباقة</th><th className="th">المزود</th><th className="th">المزايا</th><th className="th">السعر</th><th className="th">إجراء</th></tr></thead><tbody>
          {packages.map((pkg) => <tr key={pkg.id} className="border-b border-slate-100 last:border-0"><td className="td font-black text-night">{pkg.name}</td><td className="td">{pkg.provider?.name ?? providers.find((provider) => provider.id === pkg.providerId)?.name ?? '—'}</td><td className="td">{pkg.internetGB ?? '—'} GB · {pkg.minutes ?? '—'} دقيقة · {pkg.durationDays} يوم</td><td className="td font-black text-brand-700">{fmtMoney(pkg.price)}</td><td className="td"><button className="btn btn-outline px-3 py-2 text-xs" onClick={() => void toggle(pkg)}>{pkg.isActive ? 'إيقاف' : 'تفعيل'}</button></td></tr>)}
        </tbody></table>
        {packages.length === 0 && <Empty title="لا توجد باقات" />}
      </div>
    </div>
  );
}

export function AdminPaymentMethods() {
  const toast = useToast();
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);

  function load() { adminCatalogApi.paymentMethods().then((data) => setMethods(data.paymentMethods)).catch(() => undefined).finally(() => setLoading(false)); }
  useEffect(load, []);

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const target = event.currentTarget;
    const form = new FormData(target);
    try { await adminCatalogApi.createPaymentMethod({ name: String(form.get('name')), accountIdentifier: String(form.get('accountIdentifier')), instructions: String(form.get('instructions')), sortOrder: Number(form.get('sortOrder') || 0) }); target.reset(); toast.toast('success', 'تمت إضافة وسيلة الدفع'); load(); }
    catch (error: any) { toast.toast('error', error?.message ?? 'فشل إضافة وسيلة الدفع'); }
  }

  async function toggle(method: PaymentMethod) {
    try { await adminCatalogApi.updatePaymentMethod(method.id, { isActive: !method.isActive }); toast.toast('success', method.isActive ? 'تم إيقاف وسيلة الدفع' : 'تم تفعيل وسيلة الدفع'); load(); }
    catch (error: any) { toast.toast('error', error?.message ?? 'تعذر تعديل وسيلة الدفع'); }
  }

  if (loading) return <Spinner />;
  return (
    <div className="space-y-6">
      <Header title="وسائل الدفع" subtitle="اعرض تعليمات التحويل والحساب المستلم للعميل." />
      <form className="card grid gap-4 p-5 lg:grid-cols-4" onSubmit={create}>
        <Field label="اسم الوسيلة" required><input className="input" name="name" placeholder="InstaPay" required /></Field>
        <Field label="الحساب أو الرقم" required><input className="input" name="accountIdentifier" dir="ltr" placeholder="01012345678" required /></Field>
        <Field label="ترتيب العرض"><input className="input" name="sortOrder" type="number" defaultValue="0" /></Field>
        <div className="flex items-end"><button className="btn btn-primary w-full">+ إضافة وسيلة</button></div>
        <div className="lg:col-span-4"><Field label="التعليمات"><textarea className="input min-h-20" name="instructions" placeholder="حوّل المبلغ ثم ارفع صورة الإيصال." /></Field></div>
      </form>
      <div className="grid gap-4 md:grid-cols-2">
        {methods.length === 0 ? <div className="card md:col-span-2"><Empty title="لا توجد وسائل دفع" /></div> : methods.map((method) => <div className="card p-5" key={method.id}><div className="flex items-start justify-between gap-3"><div><h2 className="font-black text-night">{method.name}</h2><p className="mt-1 font-mono text-sm text-brand-700" dir="ltr">{method.accountIdentifier || '—'}</p></div><button className="btn btn-outline px-3 py-2 text-xs" onClick={() => void toggle(method)}>{method.isActive ? 'إيقاف' : 'تفعيل'}</button></div><p className="mt-4 text-sm leading-6 text-slate-500">{method.instructions || 'بدون تعليمات إضافية'}</p></div>)}
      </div>
    </div>
  );
}

function Header({ title, subtitle }: { title: string; subtitle: string }) {
  return <div><h1 className="section-title mb-1">{title}</h1><p className="text-sm text-slate-500">{subtitle}</p></div>;
}
