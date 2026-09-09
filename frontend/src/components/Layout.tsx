import { ReactNode, useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { notificationApi } from '../services/api';
import { AppNotification } from '../lib/api';
import { fmtDateTime } from '../lib/format';

interface NavItem { to: string; label: string; icon: string; end?: boolean; }

const NAV: Record<string, NavItem[]> = {
  CUSTOMER: [
    { to: '/', label: 'لوحة التحكم', icon: '⌂', end: true },
    { to: '/providers', label: 'مزودو الخدمة', icon: '◉' },
    { to: '/subscriptions', label: 'اشتراكاتي', icon: '▣' },
    { to: '/payments', label: 'مدفوعاتي', icon: '↕' },
    { to: '/profile', label: 'الملف الشخصي', icon: '◎' },
  ],
  MERCHANT: [
    { to: '/merchant', label: 'لوحة التحكم', icon: '⌂', end: true },
    { to: '/merchant/customers', label: 'تسجيل العملاء', icon: '👥' },
    { to: '/merchant/customers/new', label: 'تسجيل عميل جديد', icon: '+' },
  ],
  ADMIN: [
    { to: '/admin', label: 'نظرة عامة', icon: '⌂', end: true },
    { to: '/admin/customers', label: 'العملاء', icon: '👥' },
    { to: '/admin/providers', label: 'المزودون', icon: '◉' },
    { to: '/admin/packages', label: 'الباقات', icon: '▣' },
    { to: '/admin/payment-methods', label: 'وسائل الدفع', icon: '↕' },
    { to: '/admin/merchants', label: 'التجار', icon: '⌂' },
    { to: '/admin/subscriptions', label: 'الاشتراكات', icon: '↻' },
    { to: '/admin/payments', label: 'مراجعة الدفعات', icon: '◆' },
    { to: '/admin/notifications', label: 'الإشعارات', icon: '•' },
    { to: '/admin/audit-logs', label: 'سجل التدقيق', icon: '≡' },
  ],
};

const BRAND: Record<string, string> = { CUSTOMER: 'عميل', MERCHANT: 'تاجر', ADMIN: 'مدير المنصة' };

export function Layout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [notifs, setNotifs] = useState<AppNotification[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const role = user?.role ?? 'CUSTOMER';
  const items = NAV[role] ?? [];

  useEffect(() => {
    if (!user) return;
    let stale = false;
    notificationApi.mine()
      .then((d) => { if (!stale) setNotifs(d.notifications); })
      .catch(() => undefined);
    return () => { stale = true; };
  }, [user]);

  const unread = notifs.filter((n) => n.readAt == null).length;

  async function openNotifications() {
    setDrawerOpen(true);
    if (unread > 0) {
      setNotifs((items) => items.map((item) => ({ ...item, readAt: item.readAt ?? new Date().toISOString() })));
      await notificationApi.readAll().catch(() => undefined);
    }
  }

  return (
    <div className="min-h-screen">
      <aside className={`fixed inset-y-0 right-0 z-40 flex w-72 max-w-[85vw] flex-col bg-night text-white shadow-2xl transition-transform duration-200 lg:w-64 lg:translate-x-0 ${menuOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="flex items-center gap-3 border-b border-white/10 px-5 py-5">
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-sky-400 to-brand-600 text-xl shadow-lg">◈</div>
          <div>
            <p className="text-base font-black leading-tight">اتصالات مصر</p>
            <p className="text-xs text-sky-300">{BRAND[role]}</p>
          </div>
          <button className="btn btn-ghost mr-auto px-2 py-1 text-white lg:hidden" onClick={() => setMenuOpen(false)} aria-label="غلق القائمة">×</button>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {items.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} onClick={() => setMenuOpen(false)}
              className={({ isActive }) => `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold transition-all ${isActive ? 'bg-brand-600 text-white shadow-lg shadow-brand-900/40' : 'text-slate-300 hover:bg-white/10 hover:text-white'}`}>
              <span className="grid h-6 w-6 place-items-center text-lg">{item.icon}</span>
              <span>{item.label}</span>
              {item.label === 'مراجعة الدفعات' && unread > 0 && <span className="mr-auto rounded-full bg-rose-500 px-2 py-0.5 text-[10px] font-black">{unread}</span>}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-white/10 p-3">
          <div className="flex items-center gap-3 rounded-xl bg-white/5 p-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand-600 font-black">{user?.name?.slice(0, 1) ?? '؟'}</div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-black">{user?.name}</p>
              <p className="truncate text-xs text-slate-400" dir="ltr">{user?.phone}</p>
            </div>
            <button className="btn btn-ghost p-1 text-slate-300 hover:text-white" title="خروج" onClick={async () => { await logout(); navigate('/login'); }}>
              <span className="text-lg">⎋</span>
            </button>
          </div>
        </div>
      </aside>

      {menuOpen && <button className="fixed inset-0 z-30 bg-night/40 lg:hidden" onClick={() => setMenuOpen(false)} aria-label="غلق القائمة" />}

      <main className="mr-0 min-h-screen lg:mr-64">
        <div className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200/80 bg-white/80 px-4 py-3 backdrop-blur sm:px-6">
          <div className="flex items-center gap-2">
            <button className="btn btn-ghost px-2 py-1 text-xl lg:hidden" onClick={() => setMenuOpen(true)} aria-label="فتح القائمة">☰</button>
            <button className="btn btn-ghost px-2 py-1" onClick={() => void openNotifications()} aria-label="الإشعارات">🔔</button>
            {unread > 0 && <span className="badge badge-red">{unread} جديد</span>}
          </div>
          <p className="text-left text-xs font-bold text-slate-400">{new Date().toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        </div>
        <div className="mx-auto max-w-7xl p-4 sm:p-6">{children}</div>
      </main>

      {drawerOpen && (
        <div className="fixed inset-0 z-50 bg-night/40 backdrop-blur-sm" onClick={() => setDrawerOpen(false)}>
          <div className="absolute left-0 top-0 h-full w-80 max-w-[90vw] overflow-y-auto bg-white p-4 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-lg font-black text-night">الإشعارات</h3>
              <button className="btn btn-ghost p-1" onClick={() => setDrawerOpen(false)}>✕</button>
            </div>
            {notifs.length === 0 ? <p className="py-8 text-center text-sm text-slate-400">لا توجد إشعارات</p> : (
              <ul className="space-y-2">
                {notifs.map((notification) => (
                  <li key={notification.id} className="rounded-xl bg-slate-50 p-3">
                    <p className="text-sm font-black text-night">{notification.title}</p>
                    <p className="mt-0.5 text-xs text-slate-500">{notification.message}</p>
                    <p className="mt-1 text-[10px] text-slate-400">{fmtDateTime(notification.createdAt)}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
