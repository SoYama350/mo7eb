import { useEffect, useState } from 'react';
import { catalogApi, subscriptionApi } from '../../services/api';
import { Provider } from '../../lib/api';
import { Empty, Field, Modal, Spinner, useToast } from '../../components/ui';
import { fmtMoney } from '../../lib/format';

export function ProvidersCatalog() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [pick, setPick] = useState<{ provider: Provider; packageId: string } | null>(null);
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  useEffect(() => {
    catalogApi.providers()
      .then((d) => setProviders(d.providers))
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, []);

  async function subscribe() {
    if (!pick || !phone) return;
    setBusy(true);
    try {
      await subscriptionApi.create({ providerId: pick.provider.id, packageId: pick.packageId, phoneNumber: phone });
      toast.toast('success', 'تم إنشاء الاشتراك بنجاح');
      setPick(null);
      setPhone('');
    } catch (e: any) {
      toast.toast('error', e?.message ?? 'فشل إنشاء الاشتراك');
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <Spinner />;
  return (
    <div className="space-y-6">
      <div>
        <h1 className="section-title">مزودو الخدمة</h1>
        <p className="-mt-4 text-sm text-slate-500">اختر مزودك واستعرض الباقات المتاحة للاشتراك.</p>
      </div>

      {providers.length === 0 ? (
        <Empty title="لا يوجد مزودون حالياً" />
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {providers.map((p) => (
            <div key={p.id} className="card overflow-hidden">
              <div className="flex items-center gap-4 p-5" style={{ background: p.primaryColor ?? '#0e7490' }}>
                <div className="grid h-14 w-14 place-items-center rounded-2xl bg-white/90 text-2xl font-black shadow" style={{ color: p.primaryColor }}>{p.logo}</div>
                <div>
                  <h3 className="text-xl font-black text-white">{p.name}</h3>
                  <p className="text-sm text-white/80">{p.packages?.length ?? 0} باقة متاحة</p>
                </div>
              </div>
              <ul className="divide-y divide-slate-100">
                {(p.packages ?? []).map((pg) => (
                  <li key={pg.id} className="flex items-center justify-between gap-3 p-4">
                    <div>
                      <p className="font-bold text-night">{pg.name}</p>
                      <p className="text-xs text-slate-500">{pg.internetGB ?? '—'} جيجا • {pg.minutes ?? '—'} دقيقة • {pg.durationDays} يوم</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-black text-brand-700">{fmtMoney(pg.price)}</span>
                      <button className="btn btn-primary" onClick={() => setPick({ provider: p, packageId: pg.id })}>اشترك</button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      <Modal open={!!pick} onClose={() => setPick(null)} title="اشترك في الباقة">
        {pick && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              سيتم إنشاء اشتراك في <b>{pick.provider.name}</b> — باقة <b>{pick.provider.packages?.find((x) => x.id === pick.packageId)?.name}</b>
            </p>
            <Field label="رقم الموبايل المراد الاشتراك له" required>
              <input className="input" dir="ltr" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="01xxxxxxxxx" />
            </Field>
            <div className="flex justify-end gap-2">
              <button className="btn btn-outline" onClick={() => setPick(null)}>إلغاء</button>
              <button className="btn btn-primary" disabled={busy || !phone} onClick={subscribe}>{busy ? 'جاري…' : 'تأكيد'}</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}