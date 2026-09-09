import { FormEvent, useEffect, useMemo, useState } from 'react';
import { catalogApi, subscriptionApi } from '../../services/api';
import { Package, Provider } from '../../lib/api';
import { Empty, Field, Modal, Spinner, useToast } from '../../components/ui';
import { fmtMoney } from '../../lib/format';

export function ProvidersCatalog() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [providerId, setProviderId] = useState('all');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [pick, setPick] = useState<{ provider: Provider; package: Package } | null>(null);
  const [phone, setPhone] = useState('');
  const [appPassword, setAppPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  useEffect(() => {
    catalogApi.providers().then((data) => setProviders(data.providers)).catch(() => undefined).finally(() => setLoading(false));
  }, []);

  const packages = useMemo(() => providers
    .filter((provider) => providerId === 'all' || provider.id === providerId)
    .flatMap((provider) => (provider.packages ?? []).map((pkg) => ({ provider, package: pkg })))
    .filter(({ package: pkg }) => pkg.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())), [providers, providerId, query]);

  function closeModal() {
    setPick(null);
    setPhone('');
    setAppPassword('');
  }

  async function subscribe(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!pick) return;
    setBusy(true);
    try {
      await subscriptionApi.create({ providerId: pick.provider.id, packageId: pick.package.id, phoneNumber: phone, appPassword });
      toast.toast('success', 'تم إنشاء طلب الاشتراك. كمل الدفع من تبويب مدفوعاتي.');
      closeModal();
    } catch (error: any) {
      toast.toast('error', error?.message ?? 'فشل إنشاء الاشتراك');
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <Spinner />;
  const packageCount = providers.reduce((total, provider) => total + (provider.packages?.length ?? 0), 0);
  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="mb-2 text-sm font-bold text-brand-700">اختار اللي يناسبك</p>
          <h1 className="section-title mb-1">مزودو الخدمة</h1>
          <p className="text-sm text-slate-500">قارن الباقات واشترك في خط جديد خلال دقيقة.</p>
        </div>
        <div className="rounded-2xl bg-brand-50 px-4 py-3 text-left"><p className="text-xs font-bold text-brand-700">الباقات المتاحة</p><p className="text-xl font-black text-brand-900">{packageCount}</p></div>
      </div>

      <div className="card flex flex-col gap-3 p-4 sm:flex-row">
        <div className="relative flex-1"><span className="pointer-events-none absolute right-3 top-2.5 text-slate-400">⌕</span><input className="input pr-9" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="دور على باقة باسمها" /></div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          <button className={`shrink-0 rounded-xl px-4 py-2 text-xs font-black ${providerId === 'all' ? 'bg-night text-white' : 'bg-slate-100 text-slate-600'}`} onClick={() => setProviderId('all')}>كل المزودين</button>
          {providers.map((provider) => <button key={provider.id} className={`flex shrink-0 items-center gap-2 rounded-xl px-4 py-2 text-xs font-black ${providerId === provider.id ? 'text-white' : 'bg-slate-100 text-slate-600'}`} style={providerId === provider.id ? { background: provider.primaryColor } : undefined} onClick={() => setProviderId(provider.id)}><span>{provider.logo}</span>{provider.name.replace(' مصر', '')}</button>)}
        </div>
      </div>

      {packages.length === 0 ? <div className="card"><Empty title="مفيش باقات مطابقة" hint="جرّب تغيّر البحث أو اختار مزود تاني." /></div> : <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{packages.map(({ provider, package: pkg }) => <PackageCard key={pkg.id} provider={provider} package={pkg} onSubscribe={() => setPick({ provider, package: pkg })} />)}</div>}

      <Modal open={!!pick} onClose={closeModal} title="ابدأ الاشتراك">
        {pick && <form className="space-y-4" onSubmit={subscribe}>
          <div className="rounded-2xl p-4" style={{ background: pick.provider.secondaryColor ?? '#ecfeff' }}><p className="text-xs font-bold" style={{ color: pick.provider.primaryColor }}>{pick.provider.name}</p><p className="mt-1 text-lg font-black text-night">{pick.package.name}</p><p className="mt-1 text-sm text-slate-500">{fmtMoney(pick.package.price)} · {pick.package.durationDays} يوم</p></div>
          <Field label="رقم الخط المراد الاشتراك له" required><input className="input" dir="ltr" value={phone} onChange={(event) => setPhone(event.target.value)} pattern="01[0-9]{9}" placeholder="01xxxxxxxxx" required /></Field>
          <Field label="كلمة مرور تطبيق المزوّد" required><input className="input" type="password" dir="ltr" value={appPassword} onChange={(event) => setAppPassword(event.target.value)} placeholder="كلمة المرور الخاصة بالتطبيق" required /><p className="mt-1 text-xs text-slate-400">بتتشفّر على الخادم ومش بتتحفظ في المتصفح.</p></Field>
          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end"><button type="button" className="btn btn-outline" onClick={closeModal}>إلغاء</button><button className="btn btn-primary" disabled={busy}>{busy ? 'جاري إنشاء الطلب…' : 'تأكيد الاشتراك'}</button></div>
        </form>}
      </Modal>
    </div>
  );
}

function PackageCard({ provider, package: pkg, onSubscribe }: { provider: Provider; package: Package; onSubscribe: () => void }) {
  return <article className="card overflow-hidden transition hover:-translate-y-1 hover:shadow-lg">
    <div className="flex items-center justify-between px-5 py-4" style={{ background: provider.secondaryColor ?? '#ecfeff' }}><div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-white text-lg font-black shadow-sm" style={{ color: provider.primaryColor }}>{provider.logo}</div><div><p className="text-[11px] font-bold" style={{ color: provider.primaryColor }}>{provider.name}</p><h2 className="font-black text-night">{pkg.name}</h2></div></div><span className="text-xs font-black text-slate-500">{pkg.durationDays} يوم</span></div>
    <div className="p-5"><div className="grid grid-cols-2 gap-2"><Feature label="إنترنت" value={`${pkg.internetGB ?? '—'} GB`} /><Feature label="دقائق" value={`${pkg.minutes ?? '—'}`} /></div><div className="mt-5 flex items-end justify-between gap-3"><div><p className="text-xs text-slate-400">السعر الشهري</p><p className="text-2xl font-black text-brand-700">{fmtMoney(pkg.price)}</p></div><button className="btn btn-primary" onClick={onSubscribe}>اشترك الآن</button></div></div>
  </article>;
}

function Feature({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl bg-slate-50 p-3"><p className="text-[10px] font-bold text-slate-400">{label}</p><p className="mt-1 font-black text-night">{value}</p></div>;
}
