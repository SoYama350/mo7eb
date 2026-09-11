import { FormEvent, ReactNode, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Field, useToast } from '../components/ui';

const BRAND_GRADIENT = 'bg-gradient-to-br from-brand-700 via-brand-600 to-sky-500';

function Shell({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <div className={`hidden w-1/2 flex-col justify-between p-10 text-white lg:flex ${BRAND_GRADIENT}`}>
        <div className="flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white/20 text-2xl backdrop-blur">📡</div>
          <div>
            <p className="text-xl font-black">اتصالات مصر</p>
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
            <h2 className="text-2xl font-black text-night">اتصالات مصر</h2>
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
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErr('');
    setBusy(true);
    try {
      const user = await login(phone, password);
      navigate(user.role === 'ADMIN' ? '/admin' : user.role === 'MERCHANT' ? '/merchant' : '/', { replace: true });
    } catch (ex: any) {
      setErr(ex?.message ?? 'فشل تسجيل الدخول');
    } finally {
      setBusy(false);
    }
  }

  function fillDemo(p: string, pw: string) {
    setPhone(p);
    setPassword(pw);
    setErr('');
  }

  return (
    <Shell title="تسجيل الدخول" subtitle="أهلاً بعودتك — سجّل للوصول إلى لوحتك">
      <form onSubmit={onSubmit} className="space-y-4">
        {err && <div className="rounded-xl bg-rose-50 p-3 text-sm font-bold text-rose-700">{err}</div>}
        <Field label="رقم الموبايل" required>
          <input
            name="phone"
            dir="ltr"
            className="input"
            placeholder="01xxxxxxxxx"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
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

      <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs">
        <p className="mb-2 font-bold text-slate-700">حسابات تجريبية سريعة:</p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-lg bg-white px-2.5 py-1 font-semibold text-slate-700 shadow-sm border border-slate-200 hover:bg-slate-100"
            onClick={() => fillDemo('01000000000', 'password123')}
          >
            👑 أدمن
          </button>
          <button
            type="button"
            className="rounded-lg bg-white px-2.5 py-1 font-semibold text-slate-700 shadow-sm border border-slate-200 hover:bg-slate-100"
            onClick={() => fillDemo('01111111111', 'password123')}
          >
            🛒 تاجر
          </button>
          <button
            type="button"
            className="rounded-lg bg-white px-2.5 py-1 font-semibold text-slate-700 shadow-sm border border-slate-200 hover:bg-slate-100"
            onClick={() => fillDemo('01055555555', 'password123')}
          >
            👤 عميل
          </button>
        </div>
      </div>

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
    <Shell title="إنشاء حساب جديد" subtitle="انضم إلى منصة اتصالات مصر">
      <form onSubmit={onSubmit} className="space-y-4">
        {err && <div className="rounded-xl bg-rose-50 p-3 text-sm font-bold text-rose-700">{err}</div>}
        <Field label="الاسم بالكامل" required>
          <input name="name" className="input" placeholder="مثال: أحمد محمد" required />
        </Field>
        <Field label="رقم الموبايل" required>
          <input name="phone" dir="ltr" className="input" placeholder="01xxxxxxxxx" required />
        </Field>
        <Field label="كلمة المرور" required>
          <input name="password" type="password" dir="ltr" className="input" placeholder="٨ أحرف على الأقل" minLength={8} required />
        </Field>
        <button className="btn btn-primary w-full py-3" disabled={busy}>{busy ? 'جاري الإنشاء…' : 'إنشاء الحساب'}</button>
      </form>
      <p className="mt-6 text-center text-sm text-slate-500">
        لديك حساب؟ <Link to="/login" className="font-black text-brand-600">سجّل الدخول</Link>
      </p>
    </Shell>
  );
}
