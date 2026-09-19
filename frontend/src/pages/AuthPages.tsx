import { FormEvent, ReactNode, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Field, useToast } from '../components/ui';
import { authApi } from '../services/api';
import { supabase } from '../lib/supabase';

const BRAND_GRADIENT = 'bg-gradient-to-br from-brand-700 via-brand-600 to-sky-500';

function Shell({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <div className={`hidden w-1/2 flex-col justify-between p-10 text-white lg:flex ${BRAND_GRADIENT}`}>
        <div className="flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white/20 text-2xl backdrop-blur">📡</div>
          <div>
            <p className="text-xl font-black">محب نت</p>
            <p className="text-sm text-white/70">منصة إدارة الاشتراكات</p>
          </div>
        </div>
        <div>
          <h1 className="text-4xl font-black leading-tight">اشتراكات خطوط الموبايل<br />إدارة كاملة في مكان واحد</h1>
          <p className="mt-4 max-w-md text-white/80">منصة متكاملة للمزودين والتجار والعملاء — متابعة الاشتراكات، الدفع، المراجعة، والتجديد التلقائي.</p>
        </div>
        <div className="flex gap-8">
          <div><p className="text-3xl font-black">+20</p><p className="text-sm text-white/70">مزود خدمة</p></div>
          <div><p className="text-3xl font-black">+50</p><p className="text-sm text-white/70">باقة متنوعة</p></div>
          <div><p className="text-3xl font-black">24/7</p><p className="text-sm text-white/70">متابعة لحظية</p></div>
        </div>
      </div>
      <div className="flex w-full items-center justify-center p-6 lg:w-1/2">
        <div className="w-full max-w-md fade-up">
          <div className="mb-8 text-center lg:hidden">
            <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-brand-600 to-sky-500 text-2xl text-white shadow-lg">📡</div>
            <h2 className="text-2xl font-black text-night">محب نت</h2>
          </div>
          <h2 className="mb-1 text-2xl font-black text-night">{title}</h2>
          <p className="mb-6 text-sm text-slate-500">{subtitle}</p>
          {children}
        </div>
      </div>
    </div>
  );
}

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErr('');
    setBusy(true);
    try {
      const user = await login(identifier, password);
      navigate(user.role === 'ADMIN' ? '/admin' : user.role === 'MERCHANT' ? '/merchant' : '/', { replace: true });
    } catch (ex: any) {
      setErr(ex?.message ?? 'فشل تسجيل الدخول');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Shell title="تسجيل الدخول" subtitle="أهلاً بعودتك — سجّل للوصول إلى لوحتك">
      <form onSubmit={onSubmit} className="space-y-4">
        {err && <div className="rounded-xl bg-rose-50 p-3 text-sm font-bold text-rose-700">{err}</div>}
        <Field label="البريد الإلكتروني أو رقم الموبايل" required>
          <input
            name="identifier"
            dir="ltr"
            className="input"
            placeholder="name@example.com أو 01xxxxxxxxx"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            required
          />
        </Field>
        <Field label="كلمة المرور" required>
          <input
            name="password"
            type="password"
            dir="ltr"
            className="input"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </Field>
        <button className="btn btn-primary w-full py-3" disabled={busy}>{busy ? 'جاري الدخول…' : 'دخول'}</button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500">
        حساب جديد؟ <Link to="/register" className="font-black text-brand-600">سجّل الآن</Link>
      </p>
      <p className="mt-3 text-center text-sm"><Link to="/forgot-password" className="font-black text-brand-600">نسيت كلمة المرور؟</Link></p>
    </Shell>
  );
}

export function ForgotPasswordPage() {
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    try {
      await authApi.requestPasswordReset(email);
      setSent(true);
      toast.toast('success', 'لو البريد صحيح، هيوصلك رابط الاستعادة');
    } catch (error: any) {
      toast.toast('error', error?.message ?? 'تعذر إرسال رابط الاستعادة');
    } finally { setBusy(false); }
  }
  return <Shell title="استعادة كلمة المرور" subtitle="هنبعت رابط آمن على بريدك الإلكتروني">
    <form onSubmit={onSubmit} className="space-y-4">
      <Field label="البريد الإلكتروني" required><input type="email" name="email" className="input" dir="ltr" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@example.com" required /></Field>
      {sent && <p className="rounded-xl bg-brand-50 p-3 text-sm leading-6 text-brand-800">راجع بريدك واضغط رابط الاستعادة. قد يصل إلى الرسائل غير المرغوب فيها.</p>}
      <button className="btn btn-primary w-full py-3" disabled={busy}>{busy ? 'جاري الإرسال…' : 'إرسال رابط الاستعادة'}</button>
    </form>
    <p className="mt-3 text-center text-sm text-slate-500"><Link to="/login" className="font-black text-brand-600">العودة لتسجيل الدخول</Link></p>
  </Shell>;
}

export function ResetPasswordPage() {
  const toast = useToast();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!supabase) { setError('استعادة كلمة المرور غير مفعلة في إعدادات الموقع'); setReady(true); return; }
    void supabase.auth.getSession().then(({ data, error: sessionError }) => {
      if (sessionError || !data.session) setError('الرابط غير صالح أو انتهت صلاحيته. اطلب رابطًا جديدًا.');
      setReady(true);
    });
  }, []);
  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const password = String(new FormData(event.currentTarget).get('password'));
    setBusy(true);
    try {
      if (!supabase) throw new Error('استعادة كلمة المرور غير مفعلة في إعدادات الموقع');
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) throw new Error('الرابط غير صالح أو انتهت صلاحيته. اطلب رابطًا جديدًا.');
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      await authApi.syncSupabasePassword(sessionData.session.access_token, password);
      await supabase.auth.signOut();
      toast.toast('success', 'تم تغيير كلمة المرور. سجّل دخولك بالكلمة الجديدة.');
      navigate('/login', { replace: true });
    } catch (error: any) { toast.toast('error', error?.message ?? 'تعذر تغيير كلمة المرور'); }
    finally { setBusy(false); }
  }
  return <Shell title="تعيين كلمة مرور جديدة" subtitle="اختر كلمة مرور قوية لا تقل عن 12 حرفًا">
    {error && <div className="mb-4 rounded-xl bg-rose-50 p-3 text-sm font-bold text-rose-700">{error}</div>}
    {ready && !error && <form onSubmit={onSubmit} className="space-y-4">
      <Field label="كلمة المرور الجديدة" required><input name="password" type="password" className="input" dir="ltr" minLength={12} placeholder="12 حرف على الأقل" required /></Field>
      <button className="btn btn-primary w-full py-3" disabled={busy}>{busy ? 'جاري الحفظ…' : 'حفظ كلمة المرور'}</button>
    </form>}
  </Shell>;
}export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErr('');
    setBusy(true);
    try {
      const f = e.currentTarget as HTMLFormElement;
      const fd = new FormData(f);
      const user = await register({
        name: String(fd.get('name')),
        phone: String(fd.get('phone')),
        password: String(fd.get('password')),
        email: String(fd.get('email') || '') || undefined,
      });
      toast.toast('success', 'تم إنشاء الحساب');
      navigate(user.role === 'ADMIN' ? '/admin' : user.role === 'MERCHANT' ? '/merchant' : '/', { replace: true });
    } catch (ex: any) {
      setErr(ex?.message ?? 'فشل إنشاء الحساب');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Shell title="إنشاء حساب جديد" subtitle="انضم إلى منصة محب نت">
      <form onSubmit={onSubmit} className="space-y-4">
        {err && <div className="rounded-xl bg-rose-50 p-3 text-sm font-bold text-rose-700">{err}</div>}
        <Field label="الاسم بالكامل" required>
          <input name="name" className="input" placeholder="مثال: أحمد محمد" required />
        </Field>
        <Field label="رقم الموبايل" required>
          <input name="phone" dir="ltr" className="input" placeholder="01xxxxxxxxx" required />
        </Field>
        <Field label="البريد الإلكتروني (اختياري)">
          <input name="email" type="email" dir="ltr" className="input" placeholder="name@example.com" />
        </Field>
        <Field label="كلمة المرور" required>
           <input name="password" type="password" dir="ltr" className="input" placeholder="12 حرف على الأقل" minLength={12} required />
        </Field>
        <button className="btn btn-primary w-full py-3" disabled={busy}>{busy ? 'جاري الإنشاء…' : 'إنشاء الحساب'}</button>
      </form>
      <p className="mt-6 text-center text-sm text-slate-500">
        لديك حساب؟ <Link to="/login" className="font-black text-brand-600">سجّل الدخول</Link>
      </p>
    </Shell>
  );
}

export function MerchantInvitePage() {
  const { token = '' } = useParams();
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const toast = useToast();
  const [invite, setInvite] = useState<{ name: string; email: string } | null>(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { void authApi.merchantInvitation(token).then((data) => setInvite(data.invitation)).catch((error: any) => setErr(error?.message ?? 'الدعوة غير صالحة')); }, [token]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setErr('');
    try {
      const data = await authApi.acceptMerchantInvitation(token, { name: String(form.get('name')), phone: String(form.get('phone')), password: String(form.get('password')) });
      setUser(data.user);
      toast.toast('success', 'تم تفعيل حساب التاجر');
      navigate('/merchant', { replace: true });
    } catch (error: any) {
      setErr(error?.message ?? 'تعذر تفعيل الدعوة');
    } finally { setBusy(false); }
  }

  return <Shell title="تفعيل حساب التاجر" subtitle={invite ? `الدعوة موجهة إلى ${invite.email}` : 'جارٍ التحقق من الدعوة'}>
    {err && <div className="mb-4 rounded-xl bg-rose-50 p-3 text-sm font-bold text-rose-700">{err}</div>}
    {invite && <form onSubmit={onSubmit} className="space-y-4">
      <Field label="اسم التاجر" required><input name="name" className="input" defaultValue={invite.name} minLength={2} required /></Field>
      <Field label="رقم الموبايل" required><input name="phone" dir="ltr" className="input" placeholder="01xxxxxxxxx" pattern="01[0-9]{9}" required /></Field>
      <Field label="كلمة المرور" required><input name="password" type="password" dir="ltr" className="input" minLength={12} placeholder="12 حرف على الأقل" required /></Field>
      <button className="btn btn-primary w-full py-3" disabled={busy}>{busy ? 'جاري التفعيل…' : 'تفعيل الحساب'}</button>
    </form>}
  </Shell>;
}

export function CustomerActivatePage() {
  const { token = '' } = useParams();
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const toast = useToast();
  const [customer, setCustomer] = useState<{ name: string; phone: string } | null>(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { void authApi.customerActivation(token).then((data) => setCustomer(data.customer)).catch((error: any) => setErr(error?.message ?? 'رابط التفعيل غير صالح')); }, [token]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setErr('');
    try {
      const data = await authApi.acceptCustomerActivation(token, String(new FormData(event.currentTarget).get('password')));
      setUser(data.user);
      toast.toast('success', 'تم تفعيل حسابك');
      navigate('/', { replace: true });
    } catch (error: any) {
      setErr(error?.message ?? 'تعذر تفعيل الحساب');
    } finally { setBusy(false); }
  }

  return <Shell title="تفعيل حساب العميل" subtitle={customer ? `مرحبًا ${customer.name} — رقمك ${customer.phone}` : 'جارٍ التحقق من رابط التفعيل'}>
    {err && <div className="mb-4 rounded-xl bg-rose-50 p-3 text-sm font-bold text-rose-700">{err}</div>}
    {customer && <form onSubmit={onSubmit} className="space-y-4">
      <Field label="كلمة المرور الجديدة" required><input name="password" type="password" dir="ltr" className="input" minLength={12} placeholder="12 حرف على الأقل" required /></Field>
      <button className="btn btn-primary w-full py-3" disabled={busy}>{busy ? 'جاري التفعيل…' : 'تفعيل الحساب'}</button>
    </form>}
  </Shell>;
}
