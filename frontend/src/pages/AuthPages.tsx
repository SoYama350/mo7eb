import { api, qs, User, Provider, Package, PaymentMethod, Subscription, Payment, Merchant, MerchantObligation, AuditLog, AppNotification, MerchantFinancials, AdminCustomer, PointTransaction } from '../lib/api';

// Auth
export const authApi = {
  me: () => api.get<{ user: User }>('/auth/me'),
  login: (identifier: string, password: string) => api.post<{ user: User }>('/auth/login', { identifier, password }),
  register: (payload: { name: string; phone: string; password: string; email?: string }) => api.post<{ user: User }>('/auth/register', payload),
  merchantInvitation: (token: string) => api.get<{ invitation: { name: string; email: string; expiresAt: string } }>(`/auth/merchant-invitations/${encodeURIComponent(token)}`),
  acceptMerchantInvitation: (token: string, payload: { name: string; phone: string; password: string }) => api.post<{ user: User }>(`/auth/merchant-invitations/${encodeURIComponent(token)}/accept`, payload),
  customerActivation: (token: string) => api.get<{ customer: { name: string; phone: string; activationTokenExpiresAt: string } }>(`/auth/customer-activation/${encodeURIComponent(token)}`),
  acceptCustomerActivation: (token: string, password: string) => api.post<{ user: User }>(`/auth/customer-activation/${encodeURIComponent(token)}/accept`, { password }),
  updateMe: (payload: { name: string }) => api.patch<{ user: User }>('/auth/me', payload),
  changePassword: (payload: { currentPassword: string; password: string }) => api.patch<{ ok: boolean }>('/auth/password', payload),
  requestPasswordReset: (email: string) => api.post<{ message: string }>('/auth/password-reset/request', { email }),
  syncSupabasePassword: (accessToken: string, password: string) => api.postWithHeaders<{ ok: boolean }>('/auth/password/sync', { password }, { Authorization: `Bearer ${accessToken}` }),
};

export const pointsApi = {
  mine: () => api.get<{ points: number; transactions: PointTransaction[] }>('/auth/points'),
  adminAdjust: (userId: string, payload: { amount: number; reason: string }) => api.post<{ ok: boolean; points: number }>(`/admin/customers/${userId}/points`, payload),
};

// Public catalog
export const catalogApi = {
  providers: () => api.get<{ providers: Provider[] }>('/providers'),
  packages: () => api.get<{ packages: Package[] }>('/packages'),
  paymentMethods: () => api.get<{ paymentMethods: PaymentMethod[] }>('/payment-methods'),
};

// Subscriptions (customer)
export const subscriptionApi = {
  mine: () => api.get<{ subscriptions: Subscription[] }>('/subscriptions'),
  get: (id: string) => api.get<{ subscription: Subscription }>(`/subscriptions/${id}`),
  create: (payload: { providerId: string; packageId: string; phoneNumber: string; name?: string; appPassword?: string }) => api.post<{ subscription: Subscription }>('/subscriptions', payload),
  renew: (id: string) => api.post<{ subscription: Subscription; payment: Payment }>(`/subscriptions/${id}/renew`),
};

export const paymentApi = {
  submit: (form: FormData) => api.upload<{ payment: Payment; updated?: boolean }>('/payments', form),
  review: (id: string, payload: { decision: 'approved' | 'rejected'; reviewNote?: string }) => api.post<{ ok: boolean; status: string }>(`/payments/${id}/review`, payload),
 mine: () => api.get<{ payments: Payment[] }>('/payments'),
};

export const notificationApi = {
  mine: () => api.get<{ notifications: AppNotification[] }>('/notifications'),
  readAll: () => api.post<{ ok: boolean }>('/notifications/read-all'),
};

// Merchant
export const merchantApi = {
  financials: () => api.get<MerchantFinancials>('/merchant/financials'),
  customers: () => api.get<{ customers: User[] }>('/merchant/customers'),
  createCustomer: (payload: { name: string; phone: string; packageId: string; providerId: string }) => api.post<{ customer: User & { activationUrl?: string | null }; subscription: Subscription; newUser: boolean }>('/merchant/customers', payload),
};

// Admin
export const adminApi = {
  dashboard: () => api.get<{ kpis: Record<string, number>; recentSubscriptions: Subscription[]; recentPayments: Payment[] }>('/admin/dashboard'),
  customers: (query?: Record<string, string>) => api.get<{ customers: AdminCustomer[] }>('/admin/customers' + qs(query ?? {})),
  customer: (id: string) => api.get<{ customer: User }>(`/admin/customers/${id}`),
  payments: () => api.get<{ payments: Payment[] }>('/admin/payments'),
  subscriptions: () => api.get<{ subscriptions: Subscription[] }>('/admin/subscriptions'),
  activate: (id: string) => api.post<{ subscription: Subscription }>(`/admin/subscriptions/${id}/activate`),
  deactivate: (id: string) => api.post<{ subscription: Subscription }>(`/admin/subscriptions/${id}/deactivate`),
  merchants: () => api.get<{ merchants: Merchant[] }>('/admin/merchants'),
  updateMerchant: (id: string, body: { name?: string; isActive?: boolean }) => api.patch<{ ok: boolean }>(`/admin/merchants/${id}`, body),
  addObligation: (merchantId: string, body: { amount: number; dueDate: string }) => api.post<{ obligation: MerchantObligation }>(`/admin/merchants/${merchantId}/obligations`, body),
  markObligationPaid: (id: string) => api.post<{ ok: boolean }>(`/admin/obligations/${id}/paid`),
  auditLogs: () => api.get<{ logs: AuditLog[] }>('/admin/audit-logs'),
  adminNotifications: () => api.get<{ notifications: AppNotification[] }>('/admin/notifications'),
  createMerchant: (body: { name: string; email: string }) => api.post<{ invitation: { id: string; name: string; email: string; expiresAt: string; inviteUrl: string } }>('/admin/merchants', body),
  setMerchantActive: (id: string, isActive: boolean) => api.patch<{ ok: boolean }>(`/admin/merchants/${id}`, { isActive }),
};

// Admin catalog CRUD
export const adminCatalogApi = {
  providers: () => api.get<{ providers: Provider[] }>('/admin/providers'),
  createProvider: (body: Partial<Provider>) => api.post<{ provider: Provider }>('/admin/providers', body),
  updateProvider: (id: string, body: Partial<Provider>) => api.patch<{ provider: Provider }>(`/admin/providers/${id}`, body),
  deleteProvider: (id: string) => api.del<{ ok: boolean }>(`/admin/providers/${id}`),
  packages: () => api.get<{ packages: Package[] }>('/admin/packages'),
  createPackage: (body: Partial<Package>) => api.post<{ package: Package }>('/admin/packages', body),
  updatePackage: (id: string, body: Partial<Package>) => api.patch<{ package: Package }>(`/admin/packages/${id}`, body),
  deletePackage: (id: string) => api.del<{ ok: boolean }>(`/admin/packages/${id}`),
  paymentMethods: () => api.get<{ paymentMethods: PaymentMethod[] }>('/admin/payment-methods'),
  createPaymentMethod: (body: Partial<PaymentMethod>) => api.post<{ paymentMethod: PaymentMethod }>('/admin/payment-methods', body),
  updatePaymentMethod: (id: string, body: Partial<PaymentMethod>) => api.patch<{ paymentMethod: PaymentMethod }>(`/admin/payment-methods/${id}`, body),
  deletePaymentMethod: (id: string) => api.del<{ ok: boolean }>(`/admin/payment-methods/${id}`),
};
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
      <p className="mt-3 text-center text-sm"><Link to="/forgot-password" className="font-black text-brand-600">نسيت كلمة المرور؟</Link></p>
    </Shell>
  );
}

export function ForgotPasswordPage() {
  const toast = useToast();
  const [identifier, setIdentifier] = useState('');
  const [channel, setChannel] = useState<'email' | 'sms'>('sms');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    try {
      await authApi.requestPasswordReset({ identifier, channel });
      setSent(true);
      toast.toast('success', 'لو البيانات صحيحة، هيوصلك كود الاستعادة');
    } catch (error: any) {
      toast.toast('error', error?.message ?? 'تعذر إرسال كود الاستعادة');
    } finally { setBusy(false); }
  }

  return <Shell title="استعادة كلمة المرور" subtitle="اختار المكان اللي تحب تستقبل عليه كود الاستعادة">
    <form onSubmit={onSubmit} className="space-y-4">
      <Field label="البريد الإلكتروني أو رقم الموبايل" required><input className="input" dir="ltr" value={identifier} onChange={(event) => setIdentifier(event.target.value)} placeholder="name@example.com أو 01xxxxxxxxx" required /></Field>
      <Field label="استلام الكود" required><select className="input" value={channel} onChange={(event) => setChannel(event.target.value as 'email' | 'sms')}><option value="sms">رسالة SMS</option><option value="email">البريد الإلكتروني</option></select></Field>
      {sent && <p className="rounded-xl bg-brand-50 p-3 text-sm leading-6 text-brand-800">راجع الرسائل أو البريد، وبعدها أدخل الكود في صفحة إعادة التعيين.</p>}
      <button className="btn btn-primary w-full py-3" disabled={busy}>{busy ? 'جاري الإرسال…' : 'إرسال كود الاستعادة'}</button>
    </form>
    <p className="mt-6 text-center text-sm"><Link to="/reset-password" className="font-black text-brand-600">عندي كود بالفعل</Link></p>
    <p className="mt-3 text-center text-sm text-slate-500"><Link to="/login" className="font-black text-brand-600">العودة لتسجيل الدخول</Link></p>
  </Shell>;
}

export function ResetPasswordPage() {
  const toast = useToast();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    try {
      await authApi.confirmPasswordReset({ identifier: String(form.get('identifier')), code: String(form.get('code')), password: String(form.get('password')) });
      toast.toast('success', 'تم تغيير كلمة المرور. سجّل دخولك بالكلمة الجديدة.');
      navigate('/login', { replace: true });
    } catch (error: any) {
      toast.toast('error', error?.message ?? 'تعذر تغيير كلمة المرور');
    } finally { setBusy(false); }
  }

  return <Shell title="تعيين كلمة مرور جديدة" subtitle="اكتب الكود الذي وصلك ثم اختر كلمة مرور قوية">
    <form onSubmit={onSubmit} className="space-y-4">
      <Field label="البريد الإلكتروني أو رقم الموبايل" required><input name="identifier" className="input" dir="ltr" placeholder="name@example.com أو 01xxxxxxxxx" required /></Field>
      <Field label="كود الاستعادة" required><input name="code" className="input" dir="ltr" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} placeholder="123456" required /></Field>
      <Field label="كلمة المرور الجديدة" required><input name="password" type="password" className="input" dir="ltr" minLength={12} placeholder="12 حرف على الأقل" required /></Field>
      <button className="btn btn-primary w-full py-3" disabled={busy}>{busy ? 'جاري الحفظ…' : 'حفظ كلمة المرور'}</button>
    </form>
  </Shell>;
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
