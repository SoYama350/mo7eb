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

  // Form State
  const [subId, setSubId] = useState('');
  const [methodId, setMethodId] = useState('');
  const [fromPhone, setFromPhone] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileInputKey, setFileInputKey] = useState(0);

  // Success state after submitting
  const [lastSubmitted, setLastSubmitted] = useState<Payment | null>(null);

  const toast = useToast();

  function load() {
    Promise.all([
      paymentApi.mine().then((data) => setPayments(data.payments)).catch(() => undefined),
      subscriptionApi.mine().then((data) => setSubs(data.subscriptions)).catch(() => undefined),
      catalogApi.paymentMethods().then((data) => setMethods(data.paymentMethods)).catch(() => undefined),
    ]).finally(() => setLoading(false));
  }

  useEffect(load, []);

  // Cleanup preview URL
  useEffect(() => {
    if (file) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setPreviewUrl(null);
    }
  }, [file]);

  const payableSubs = subs.filter((s) => s.status === 'PENDING_PAYMENT' || s.status === 'PENDING_REVIEW');
  const selectedSub = subs.find((s) => s.id === subId);
  const selectedMethod = methods.find((m) => m.id === methodId);
  const pendingCount = payments.filter((p) => p.status === 'PENDING').length;
  const approvedTotal = payments.filter((p) => p.status === 'APPROVED' || p.status === 'PAID').reduce((sum, p) => sum + p.amount, 0);

  function handleCopy(text: string, label: string) {
    void navigator.clipboard.writeText(text);
    toast.toast('success', `تم نسخ ${label}: ${text}`);
  }

  async function submitManualPayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!subId) {
      toast.toast('error', 'يرجى اختيار الاشتراك المطلوب دفعه');
      return;
    }
    if (!methodId) {
      toast.toast('error', 'يرجى اختيار وسيلة الدفع المستخدمة');
      return;
    }
    if (!file) {
      toast.toast('error', 'يرجى إرفاق صورة إيصال التحويل');
      return;
    }

    const form = new FormData();
    form.append('subscriptionId', subId);
    form.append('paymentMethodId', methodId);
    if (selectedSub?.package?.price) {
      form.append('amount', String(selectedSub.package.price));
    }
    if (fromPhone) {
      form.append('paidFromPhone', fromPhone);
    }
    form.append('screenshot', file);

    setBusy(true);
    try {
      const res = await paymentApi.submit(form);
      setLastSubmitted(res.payment);
      toast.toast('success', 'تم إرسال إثبات الدفع بنجاح وهو الآن قيد المراجعة');
      setSubId('');
      setMethodId('');
      setFromPhone('');
      setFile(null);
      setFileInputKey((k) => k + 1);
      load();
    } catch (error: any) {
      toast.toast('error', error?.message ?? 'فشل إرسال إثبات الدفع');
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <Spinner />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="mb-1 text-sm font-bold text-brand-700">💵 الدفع اليدوي الآمن</p>
          <h1 className="section-title mb-1">مدفوعاتي واشتراكاتي</h1>
          <p className="text-sm text-slate-500">حوّل المبلغ لحساب الخدمة، ثم ارفع صورة الإيصال ليتم تفعيل باقتك فور المراجعة.</p>
        </div>
        <Link to="/subscriptions" className="btn btn-outline">عرض الاشتراكات</Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat label="إجمالي المدفوعات" value={payments.length} icon="↕" />
        <Stat label="قيد المراجعة" value={pendingCount} icon="◷" />
        <Stat label="الاشتراكات المفعلة" value={fmtMoney(approvedTotal)} icon="✓" />
      </div>

      {/* Payment Instructions & Official Accounts */}
      <section className="card overflow-hidden p-5 sm:p-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-lg font-black text-night">بيانات التحويل الرسمية</h2>
            <p className="mt-1 text-xs text-slate-500">استخدم أحد الحسابات المعتمدة أدناه للتحويل واحتفظ بلقطة الشاشة (Screenshot) لرفعها:</p>
          </div>
          <span className="badge badge-green font-black">حسابات معتمدة</span>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {methods.map((method) => (
            <article key={method.id} className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-slate-50/70 p-5">
              <div>
                <h3 className="text-base font-black text-night">{method.name}</h3>
                {method.accountIdentifier ? (
                  <div className="mt-4 rounded-xl border border-slate-200 bg-white p-3">
                    <p className="text-[10px] font-bold text-slate-400">بيانات التحويل:</p>
                    <span className="mt-1 block break-all text-sm font-black text-brand-800" dir="ltr">{method.accountIdentifier}</span>
                  </div>
                ) : <p className="mt-4 rounded-xl bg-amber-50 p-3 text-xs font-bold text-amber-800">بيانات التحويل غير متاحة حالياً. تواصل مع الإدارة قبل التحويل.</p>}
                <p className="mt-4 text-[11px] leading-5 text-slate-600">{method.instructions ?? 'بعد التحويل، احتفظ بصورة الإيصال لإرفاقها بالطلب.'}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Success Notification Banner after submission */}
      {lastSubmitted && (
        <div className="rounded-2xl border-2 border-emerald-400 bg-emerald-50 p-5 text-emerald-900 shadow-sm animate-fade-in">
          <div className="flex items-start gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-600 text-xl text-white">✓</div>
            <div className="space-y-1">
              <h3 className="text-base font-black">تم استلام طلب الدفع بنجاح!</h3>
              <p className="text-xs text-emerald-800">طلبك الآن في حالة <span className="font-bold underline">قيد المراجعة</span> من قبل الإدارة. سيتم تفعيل الباقة وإضافة نقاط الولاء فور التأكيد.</p>
              <div className="mt-3 flex flex-wrap gap-4 text-xs font-bold text-emerald-900 bg-white/70 p-3 rounded-xl">
                <div>المبلغ المطلوب: {fmtMoney(lastSubmitted.amount)}</div>
                <div>رقم المرجع: <span className="font-mono" dir="ltr">{lastSubmitted.id.slice(-8)}</span></div>
                <div>تاريخ الطلب: {fmtDateTime(lastSubmitted.createdAt)}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Upload Section */}
      <div className="grid gap-6 xl:grid-cols-[1.15fr_.85fr]">
        <form className="card p-5 sm:p-6" onSubmit={submitManualPayment}>
          <div className="mb-5">
            <h2 className="text-lg font-black text-night">إرسال إثبات الدفع</h2>
            <p className="mt-1 text-xs text-slate-500">اختر الاشتراك وطريقة الدفع ثم ارفع لقطة الشاشة للتأكيد.</p>
          </div>

          {payableSubs.length === 0 ? (
            <div className="rounded-2xl bg-slate-50 p-6 text-center">
              <p className="font-bold text-slate-600">لا يوجد اشتراك بانتظار الدفع حالياً.</p>
              <Link to="/providers" className="mt-3 inline-block rounded-xl bg-brand-600 px-4 py-2 text-xs font-black text-white hover:bg-brand-700">
                استعراض الباقات المتاحة
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Step 1: Select Subscription */}
              <Field label="1. اختر الاشتراك المطلوب سداده" required>
                <select
                  className="input"
                  value={subId}
                  onChange={(e) => setSubId(e.target.value)}
                  required
                >
                  <option value="">اختر الاشتراك…</option>
                  {payableSubs.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.provider?.name ?? 'شركة'} — {s.package?.name} ({fmtMoney(s.package?.price)}) · رقم الخط: {s.phoneNumber}
                    </option>
                  ))}
                </select>
              </Field>

              {/* Package Summary if Selected */}
              {selectedSub?.package && (
                <div className="rounded-2xl border border-brand-200 bg-brand-50/50 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-slate-500">الباقة المختارة:</p>
                      <p className="text-base font-black text-night">{selectedSub.package.name}</p>
                      <p className="text-xs text-slate-600 mt-0.5">رقم الخط: <span dir="ltr" className="font-mono font-bold">{selectedSub.phoneNumber}</span></p>
                    </div>
                    <div className="text-left">
                      <p className="text-xs font-bold text-slate-500">المبلغ الإجمالي:</p>
                      <p className="text-2xl font-black text-brand-700">{fmtMoney(selectedSub.package.price)}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: Payment Method */}
              <Field label="2. اختر طريقة التحويل المستخدمة" required>
                <select
                  className="input"
                  value={methodId}
                  onChange={(e) => setMethodId(e.target.value)}
                  required
                >
                  <option value="">اختر وسيلة الدفع…</option>
                  {methods.map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </Field>

              {/* Step 3: From Phone (Optional) */}
              <Field label="3. رقم الهاتف المحول منه (اختياري)">
                <input
                  className="input"
                  dir="ltr"
                  value={fromPhone}
                  onChange={(e) => setFromPhone(e.target.value)}
                  pattern="01[0-9]{9}"
                  placeholder="01xxxxxxxxx"
                />
              </Field>

              {/* Step 4: Screenshot Upload & Preview */}
              <Field label="4. صورة إيصال التحويل (Screenshot)" required>
                <input
                  key={fileInputKey}
                  className="input"
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  required
                />
              </Field>

              {/* Image Preview */}
              {previewUrl && (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs font-bold text-slate-500 mb-2">معاينة الإيصال المرفق:</p>
                  <img
                    src={previewUrl}
                    alt="معاينة إيصال الدفع"
                    className="max-h-56 w-auto rounded-xl border border-slate-200 object-contain mx-auto"
                  />
                </div>
              )}

              <button
                type="submit"
                className="btn btn-primary w-full py-3.5 text-base font-black shadow-lg shadow-brand-700/20"
                disabled={busy || !subId || !methodId || !file}
              >
                {busy ? 'جاري رفع الإيصال والإرسال…' : 'إرسال إثبات الدفع للمراجعة ←'}
              </button>
            </div>
          )}
        </form>

        {/* Steps Guide Card */}
        <div className="card overflow-hidden">
          <div className="border-b border-slate-100 bg-night p-5 text-white">
            <p className="text-sm font-bold text-sky-300">خطوات تفعيل الاشتراك</p>
            <h2 className="mt-1 text-xl font-black">سهل، سريع، ومضمون</h2>
          </div>
          <div className="space-y-5 p-5">
            <Step number="01" title="اختر الباقة وأنشئ الطلب" text="اختر الباقة المناسبة من كتالوج الباقات ليتم تسجيل طلب الاشتراك." />
            <Step number="02" title="حوّل المبلغ المطلوب" text="استخدم بيانات وسيلة الدفع المعروضة بالأعلى، ولا تنس الاحتفاظ بصورة التحويل." />
            <Step number="03" title="ارفع صورة الإيصال" text="ارفع لقطة الشاشة من النموذج وسيصل طلبك فوراً لمراجعة الإدارة." />
            <Step number="04" title="تفعيل فوري ونقاط ولاء" text="بمجرد مراجعة الإيصال يتم تفعيل خطك وإضافة نقاط الولاء لرصيدك ⭐" />
          </div>
          <div className="mx-5 mb-5 rounded-xl bg-amber-50 p-3 text-xs leading-6 text-amber-800">
            📌 يُقبل صور بصيغة PNG أو JPG أو WebP بحجم أقصى 5 ميجابايت.
          </div>
        </div>
      </div>

      {/* Payment History List */}
      <section className="card overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 p-5">
          <div>
            <h2 className="text-lg font-black text-night">سجل طلبات الدفع</h2>
            <p className="mt-1 text-xs text-slate-500">متابعة حالة جميع طلبات الدفع السابقة.</p>
          </div>
          <span className="badge badge-amber font-bold">{pendingCount} قيد المراجعة</span>
        </div>

        {payments.length === 0 ? (
          <Empty title="لا توجد مدفوعات مسجلة بعد" hint="عند إرسال أي إثبات تحويل سيظهر هنا مع حالته." />
        ) : (
          <div className="divide-y divide-slate-100">
            {payments.map((payment) => {
              const isApproved = payment.status === 'APPROVED' || payment.status === 'PAID';
              const isPending = payment.status === 'PENDING';
              return (
                <div key={payment.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`grid h-11 w-11 place-items-center rounded-2xl font-black text-lg ${isApproved ? 'bg-emerald-50 text-emerald-700' : isPending ? 'bg-amber-50 text-amber-700' : 'bg-rose-50 text-rose-700'}`}>
                      {isApproved ? '✓' : isPending ? '◷' : '✕'}
                    </div>
                    <div>
                      <p className="font-black text-night text-base">
                        {payment.subscription?.package?.name ?? 'اشتراك باقة'}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {payment.paymentMethod?.name ?? 'تحويل يدوي'} · {fmtDateTime(payment.createdAt)}
                      </p>
                      {payment.screenshotUrl && (
                        <a
                          href={payment.screenshotUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-1 inline-block text-xs font-bold text-brand-600 hover:underline"
                        >
                          عرض صورة الإيصال المرفقة ↗
                        </a>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-4 sm:justify-end">
                    <p className="font-black text-brand-700 text-lg">{fmtMoney(payment.amount)}</p>
                    <Badge status={payment.status} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function Step({ number, title, text }: { number: string; title: string; text: string }) {
  return (
    <div className="flex gap-3">
      <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-brand-600 text-xs font-black text-white">{number}</div>
      <div>
        <p className="font-black text-night text-sm">{title}</p>
        <p className="mt-0.5 text-xs leading-5 text-slate-500">{text}</p>
      </div>
    </div>
  );
}
