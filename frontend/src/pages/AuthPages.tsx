import { FormEvent, ReactNode, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Field, useToast } from '../components/ui';
import { authApi } from '../services/api';

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
    </Shell>
  );
}

export function RegisterPage() {
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
