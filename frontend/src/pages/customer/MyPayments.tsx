import { FormEvent, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { paymentApi, subscriptionApi, catalogApi } from '../../services/api';
import { Payment, PaymentMethod, Subscription } from '../../lib/api';
import { Badge, Empty, Field, Spinner, Stat, useToast } from '../../components/ui';
import { fmtDateTime, fmtMoney } from '../../lib/format';

export function MyPayments() {
  const [searchParams] = useSearchParams();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [paymobConfig, setPaymobConfig] = useState<{ paymobAvailable: boolean; environment: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [paymobBusy, setPaymobBusy] = useState(false);

  // Tab: 'paymob' (Online) or 'manual' (Transfer + Receipt)
  const [paymentMode, setPaymentMode] = useState<'paymob' | 'manual'>('paymob');

  // Manual payment state
  const [amount, setAmount] = useState('');
  const [subId, setSubId] = useState('');
  const [methodId, setMethodId] = useState('');
  const [fromPhone, setFromPhone] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [fileInputKey, setFileInputKey] = useState(0);

  // Paymob selected subscription
  const [paymobSubId, setPaymobSubId] = useState('');

  const toast = useToast();

  function load() {
    Promise.all([
      paymentApi.mine().then((data) => setPayments(data.payments)).catch(() => undefined),
      subscriptionApi.mine().then((data) => setSubs(data.subscriptions)).catch(() => undefined),
      catalogApi.paymentMethods().then((data) => setMethods(data.paymentMethods)).catch(() => undefined),
      paymentApi.config().then(setPaymobConfig).catch(() => undefined),
    ]).finally(() => setLoading(false));
  }

  useEffect(load, []);

  // Handle Paymob redirect query params
  useEffect(() => {
    const statusParam = searchParams.get('status');
    const ref = searchParams.get('ref');
    if (statusParam === 'processing' || statusParam === 'success') {
      if (ref) {
        paymentApi.paymobStatus(ref).then((res) => {
          if (res.isPaid) {
            toast.toast('success', 'تم تأكيد الدفع الإلكتروني وتفعيل الاشتراك بنجاح!');
          }
          load();
        }).catch(() => undefined);
      }
    } else if (statusParam === 'failed') {
      toast.toast('error', 'فشلت عملية الدفع الإلكتروني أو تم إلغاؤها');
    }
  }, [searchParams]);

  const payableSubs = subs.filter((subscription) => subscription.status === 'PENDING_PAYMENT' || subscription.status === 'PENDING_REVIEW');
  const selectedMethod = methods.find((method) => method.id === methodId);
  const pendingCount = payments.filter((payment) => payment.status === 'PENDING').length;
  const approvedTotal = payments.filter((payment) => payment.status === 'APPROVED' || payment.status === 'PAID').reduce((total, payment) => total + payment.amount, 0);

  function selectSubscription(id: string) {
    setSubId(id);
    const price = subs.find((subscription) => subscription.id === id)?.package?.price;
    if (price) setAmount(String(price));
  }

  async function submitManual(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!subId || !methodId || !amount || !file) {
      toast.toast('error', 'أكمل كل بيانات الدفع');
      return;
    }
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
      setAmount('');
      setSubId('');
      setMethodId('');
      setFromPhone('');
      setFile(null);
      setFileInputKey((key) => key + 1);
      load();
    } catch (error: any) {
      toast.toast('error', error?.message ?? 'فشل إرسال الدفع');
    } finally {
      setBusy(false);
    }
  }

  async function handlePaymobCheckout(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!paymobSubId) {
      toast.toast('error', 'يرجى اختيار الاشتراك أولاً');
      return;
    }
    setPaymobBusy(true);
    try {
      const res = await paymentApi.initiatePaymob(paymobSubId);
      if (res.checkoutUrl) {
        window.location.href = res.checkoutUrl;
      } else {
        throw new Error('تعذر فتح صفحة الدفع الإلكتروني');
      }
    } catch (error: any) {
      toast.toast('error', error?.message ?? 'فشل بدء الدفع الإلكتروني');
      setPaymobBusy(false);
    }
  }

  if (loading) return <Spinner />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="mb-2 text-sm font-bold text-brand-700">الدفع الآمن</p>
          <h1 className="section-title mb-1">مدفوعاتي</h1>
          <p className="text-sm text-slate-500">اختر الدفع الإلكتروني الفوري عبر Paymob أو التحويل اليدوي مع إرفاق الإيصال.</p>
        </div>
        <Link to="/subscriptions" className="btn btn-outline">عرض الاشتراكات</Link>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat label="كل المدفوعات" value={payments.length} icon="↕" />
        <Stat label="بانتظار المراجعة" value={pendingCount} icon="◷" />
        <Stat label="إجمالي المقبول" value={fmtMoney(approvedTotal)} icon="✓" />
      </div>

      {/* Payment Method Selector Tabs */}
      <div className="flex rounded-2xl bg-slate-100 p-1.5 font-bold">
        <button
          type="button"
          className={`flex-1 rounded-xl py-3 text-sm transition-all ${paymentMode === 'paymob' ? 'bg-white text-brand-700 shadow-sm font-black' : 'text-slate-600 hover:text-night'}`}
          onClick={() => setPaymentMode('paymob')}
        >
          💳 دفع إلكتروني فوري (Paymob)
        </button>
        <button
          type="button"
          className={`flex-1 rounded-xl py-3 text-sm transition-all ${paymentMode === 'manual' ? 'bg-white text-brand-700 shadow-sm font-black' : 'text-slate-600 hover:text-night'}`}
          onClick={() => setPaymentMode('manual')}
        >
          📱 تحويل يدوي وإرفاق إيصال
        </button>
      </div>

      {paymentMode === 'paymob' ? (
        /* Paymob Flow */
        <div className="grid gap-6 xl:grid-cols-[1.1fr_.9fr]">
          <form className="card p-5 sm:p-6" onSubmit={handlePaymobCheckout}>
            <div className="mb-5">
              <div className="flex items-center gap-2">
                <span className="badge badge-blue font-bold">دفع إلكتروني آمن</span>
                {paymobConfig?.environment === 'sandbox' && <span className="badge badge-amber font-bold">Sandbox Test Mode</span>}
              </div>
              <h2 className="mt-2 text-lg font-black text-night">الدفع المباشر عبر Paymob</h2>
              <p className="mt-1 text-xs text-slate-500">يقبل البطاقات البنكية (فيزا / ماستركارد / ميزة) والمحافظ الإلكترونية وتفعيل فوري للاشتراك بمجرد إتمام العملية.</p>
            </div>

            {payableSubs.length === 0 ? (
              <div className="rounded-2xl bg-slate-50 p-5 text-center">
                <p className="font-bold text-slate-600">مفيش اشتراك محتاج دفع دلوقتي</p>
                <Link to="/providers" className="mt-2 inline-block text-sm font-black text-brand-700">استعرض الباقات</Link>
              </div>
            ) : (
              <div className="space-y-4">
                <Field label="اختر الاشتراك المطلوب دفعه" required>
                  <select
                    className="input"
                    value={paymobSubId}
                    onChange={(e) => setPaymobSubId(e.target.value)}
                    required
                  >
                    <option value="">اختر اشتراكاً…</option>
                    {payableSubs.map((subscription) => (
                      <option key={subscription.id} value={subscription.id}>
                        {subscription.package?.name} · {subscription.phoneNumber} ({fmtMoney(subscription.package?.price)})
                      </option>
                    ))}
                  </select>
                </Field>

                {paymobSubId && (
                  <div className="rounded-2xl border border-brand-200 bg-brand-50/60 p-4">
                    <p className="text-xs font-bold text-slate-500">المبلغ الإجمالي للدفع:</p>
                    <p className="text-2xl font-black text-brand-700">
                      {fmtMoney(payableSubs.find((s) => s.id === paymobSubId)?.package?.price)}
                    </p>
                    <p className="mt-1 text-xs text-slate-600">يتم احتساب السعر رسمياً وتفعيله تلقائياً مع إضافة نقاط الولاء ⭐</p>
                  </div>
                )}

                <button
                  type="submit"
                  className="btn btn-primary w-full py-3.5 text-base font-black shadow-lg shadow-brand-700/20"
                  disabled={paymobBusy || !paymobSubId}
                >
                  {paymobBusy ? 'جاري التحويل لبوابة Paymob…' : 'الانتقال للدفع الآمن الآن ←'}
                </button>
              </div>
            )}
          </form>

          <div className="card overflow-hidden">
            <div className="border-b border-slate-100 bg-night p-5 text-white">
              <p className="text-sm font-bold text-sky-300">طريقة الدفع الفوري</p>
              <h2 className="mt-1 text-xl font-black">خطوات الدفع عبر Paymob</h2>
            </div>
            <div className="space-y-5 p-5">
              <Step number="01" title="اختر الباقة" text="حدد باقتك وسيتم جلب السعر الرسمي تلقائياً من السيرفر." />
              <Step number="02" title="ادفع عبر Paymob" text="اختر وسيلة الدفع المناسبة (بطاقة ائتمان، كارت ميزة، محفظة إلكترونية)." />
              <Step number="03" title="تفعيل لحظي" text="يتأكد السيرفر من إشعار الدفع الموثق عبر Webhook ويتم تفعيل باقتك فوراً." />
            </div>
          </div>
        </div>
      ) : (
        /* Manual Transfer Flow */
        <div className="space-y-6">
          <section className="card p-5 sm:p-6">
            <div>
              <h2 className="text-lg font-black text-night">بيانات التحويل المعتمدة</h2>
              <p className="mt-1 text-xs leading-6 text-slate-500">استخدم الرقم أو الحساب الظاهر هنا فقط عند التحويل، ثم ارفع صورة الإيصال.</p>
            </div>
            {methods.length === 0 ? (
              <p className="mt-4 rounded-xl bg-amber-50 p-4 text-sm font-bold text-amber-800">الإدارة لم تضف وسيلة دفع متاحة حتى الآن.</p>
            ) : (
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {methods.map((method) => (
                  <article key={method.id} className="rounded-2xl border border-brand-100 bg-brand-50/60 p-4">
                    <p className="font-black text-night">{method.name}</p>
                    {method.accountIdentifier ? (
                      <p className="mt-2 text-xl font-black tracking-wide text-brand-800" dir="ltr">{method.accountIdentifier}</p>
                    ) : (
                      <p className="mt-2 text-sm font-bold text-amber-700">رقم الحساب غير مضاف من الإدارة</p>
                    )}
                    {method.instructions && <p className="mt-2 text-xs leading-6 text-slate-600">{method.instructions}</p>}
                  </article>
                ))}
              </div>
            )}
          </section>

          <div className="grid gap-6 xl:grid-cols-[1.1fr_.9fr]">
            <form className="card p-5 sm:p-6" onSubmit={submitManual}>
              <div className="mb-5">
                <h2 className="text-lg font-black text-night">إرسال إثبات دفع</h2>
                <p className="mt-1 text-xs text-slate-500">بيانات التحويل بتوصل للإدارة للمراجعة وتفعيل الاشتراك يدوياً.</p>
              </div>
              {payableSubs.length === 0 ? (
                <div className="rounded-2xl bg-slate-50 p-5 text-center">
                  <p className="font-bold text-slate-600">مفيش اشتراك محتاج دفع دلوقتي</p>
                  <Link to="/providers" className="mt-2 inline-block text-sm font-black text-brand-700">استعرض الباقات</Link>
                </div>
              ) : (
                <div className="space-y-4">
                  <Field label="الاشتراك" required>
                    <select className="input" value={subId} onChange={(event) => selectSubscription(event.target.value)} required>
                      <option value="">اختر اشتراكاً…</option>
                      {payableSubs.map((subscription) => (
                        <option key={subscription.id} value={subscription.id}>
                          {subscription.package?.name} · {subscription.phoneNumber}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <Field label="وسيلة الدفع" required>
                    <select className="input" value={methodId} onChange={(event) => setMethodId(event.target.value)} required>
                      <option value="">اختر الوسيلة…</option>
                      {methods.map((method) => (
                        <option key={method.id} value={method.id}>{method.name}</option>
                      ))}
                    </select>
                    {selectedMethod && (
                      <div className="mt-2 rounded-xl bg-brand-50 p-3 text-xs leading-6 text-brand-900">
                        <p className="font-black" dir="ltr">{selectedMethod.accountIdentifier}</p>
                        <p>{selectedMethod.instructions}</p>
                      </div>
                    )}
                  </Field>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="المبلغ (ج.م)" required>
                      <input className="input" dir="ltr" type="number" min="1" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="مثال: 250" required />
                    </Field>
                    <Field label="المحول من رقم">
                      <input className="input" dir="ltr" value={fromPhone} onChange={(event) => setFromPhone(event.target.value)} pattern="01[0-9]{9}" placeholder="01xxxxxxxxx" />
                    </Field>
                  </div>

                  <Field label="صورة إثبات التحويل" required>
                    <input
                      key={fileInputKey}
                      className="input"
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                      required
                    />
                    {file && <p className="mt-1 text-xs font-bold text-emerald-700">تم اختيار: {file.name}</p>}
                  </Field>

                  <button className="btn btn-primary w-full" disabled={busy}>
                    {busy ? 'جاري الإرسال…' : 'إرسال للمراجعة'}
                  </button>
                </div>
              )}
            </form>

            <div className="card overflow-hidden">
              <div className="border-b border-slate-100 bg-night p-5 text-white">
                <p className="text-sm font-bold text-sky-300">خطوات بسيطة</p>
                <h2 className="mt-1 text-xl font-black">ادفع، صوّر، واستنى التأكيد</h2>
              </div>
              <div className="space-y-5 p-5">
                <Step number="01" title="اختار وسيلة الدفع" text="التعليمات والحساب المستلم بيظهروا بمجرد الاختيار." />
                <Step number="02" title="حوّل المبلغ" text="استخدم الرقم الظاهر واحتفظ بصورة الإيصال." />
                <Step number="03" title="ارفع الصورة" text="الإدارة تراجعها وتبعتلك إشعار بالقرار." />
              </div>
              <div className="mx-5 mb-5 rounded-xl bg-amber-50 p-3 text-xs leading-6 text-amber-800">
                مسموح PNG وJPG وWebP فقط، وحجم الصورة الأقصى 5MB.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payment History */}
      <section className="card overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 p-5">
          <div>
            <h2 className="text-lg font-black text-night">سجل المدفوعات</h2>
            <p className="mt-1 text-xs text-slate-500">كل طلبات الدفع السابقة الإلكترونية واليدوية محفوظة.</p>
          </div>
          <span className="badge badge-amber">{pendingCount} قيد المراجعة</span>
        </div>
        {payments.length === 0 ? (
          <Empty title="لا توجد مدفوعات بعد" />
        ) : (
          <div className="divide-y divide-slate-100">
            {payments.map((payment) => (
              <div key={payment.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand-50 font-black text-brand-700">
                    {payment.paymentChannel === 'PAYMOB' ? '💳' : '📱'}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-black text-night">{payment.subscription?.package?.name ?? 'اشتراك'}</p>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${payment.paymentChannel === 'PAYMOB' ? 'bg-sky-100 text-sky-800' : 'bg-slate-100 text-slate-700'}`}>
                        {payment.paymentChannel === 'PAYMOB' ? 'Paymob أونلاين' : 'تحويل يدوي'}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-400">
                      {payment.paymentMethod?.name ?? (payment.paymentChannel === 'PAYMOB' ? 'بوابة Paymob' : 'تحويل مباشر')} · {fmtDateTime(payment.createdAt)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-4 sm:justify-end">
                  <p className="font-black text-brand-700">{fmtMoney(payment.amount)}</p>
                  <Badge status={payment.status} />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Step({ number, title, text }: { number: string; title: string; text: string }) {
  return (
    <div className="flex gap-3">
      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-600 text-xs font-black text-white">{number}</div>
      <div>
        <p className="font-black text-night">{title}</p>
        <p className="mt-1 text-xs leading-6 text-slate-500">{text}</p>
      </div>
    </div>
  );
}
