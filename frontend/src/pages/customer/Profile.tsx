import { FormEvent, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { authApi } from '../../services/api';
import { Badge, Field, useToast } from '../../components/ui';

export function ProfilePage() {
  const { user, setUser } = useAuth();
  const toast = useToast();
  const [name, setName] = useState(user?.name ?? '');
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    try {
      const data = await authApi.updateMe({ name: name.trim() });
      setUser(data.user);
      toast.toast('success', 'تم تحديث الاسم');
    } catch (error: any) {
      toast.toast('error', error?.message ?? 'فشل تحديث الملف الشخصي');
    } finally {
      setBusy(false);
    }
  }

  return <div className="mx-auto max-w-3xl space-y-6">
    <div><p className="mb-2 text-sm font-bold text-brand-700">حسابك</p><h1 className="section-title mb-1">الملف الشخصي</h1><p className="text-sm text-slate-500">تحكم في بياناتك الأساسية واعرف حالة حسابك.</p></div>
    <div className="card flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6"><div className="flex items-center gap-4"><div className="grid h-16 w-16 place-items-center rounded-3xl bg-gradient-to-br from-brand-600 to-sky-400 text-2xl font-black text-white shadow-lg">{user?.name?.slice(0, 1) ?? '؟'}</div><div><h2 className="text-xl font-black text-night">{user?.name}</h2><p className="mt-1 text-sm text-slate-500" dir="ltr">{user?.phone}</p></div></div><Badge status={user?.isActive ? 'ACTIVE' : 'INACTIVE'} /></div>
    <div className="grid gap-6 lg:grid-cols-[1fr_.8fr]"><form className="card space-y-5 p-5 sm:p-6" onSubmit={submit}><div><h2 className="text-lg font-black text-night">البيانات الأساسية</h2><p className="mt-1 text-xs text-slate-500">تقدر تعدّل اسمك في أي وقت.</p></div><Field label="الاسم الظاهر" required><input className="input" value={name} onChange={(event) => setName(event.target.value)} minLength={2} maxLength={80} required /></Field><Field label="رقم الموبايل"><input className="input bg-slate-50" value={user?.phone ?? ''} dir="ltr" readOnly /></Field><button className="btn btn-primary" disabled={busy}>{busy ? 'جاري الحفظ…' : 'حفظ التغييرات'}</button></form><div className="card p-5 sm:p-6"><h2 className="text-lg font-black text-night">خصوصيتك وأمانك</h2><div className="mt-5 space-y-4"><SecurityItem icon="◉" title="جلسة آمنة" text="تسجيل الدخول محفوظ في جلسة HttpOnly آمنة." /><SecurityItem icon="◆" title="بيانات المزوّد" text="كلمة مرور التطبيق مش بتظهر في حسابك أو في الروابط." /><SecurityItem icon="✓" title="حسابك مباشر" text={user?.source === 'MERCHANT' ? 'الحساب مسجل عن طريق تاجر.' : 'أنت مسجل مباشرة على المنصة.'} /></div></div></div>
  </div>;
}

function SecurityItem({ icon, title, text }: { icon: string; title: string; text: string }) {
  return <div className="flex gap-3"><div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-50 font-black text-brand-700">{icon}</div><div><p className="text-sm font-black text-night">{title}</p><p className="mt-1 text-xs leading-6 text-slate-500">{text}</p></div></div>;
}
