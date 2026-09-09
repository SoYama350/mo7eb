import { useEffect, useState } from 'react';
import { adminApi } from '../../services/api';
import { AppNotification, AuditLog } from '../../lib/api';
import { Empty, Spinner } from '../../components/ui';
import { ACTION_LABELS, fmtDateTime } from '../../lib/format';

export function AdminNotifications() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { adminApi.adminNotifications().then((data) => setNotifications(data.notifications)).catch(() => undefined).finally(() => setLoading(false)); }, []);
  if (loading) return <Spinner />;
  return <div className="space-y-6"><div><h1 className="section-title mb-1">الإشعارات</h1><p className="text-sm text-slate-500">كل رسائل النظام المحفوظة للعملاء والإدارة.</p></div><div className="card overflow-hidden">{notifications.length === 0 ? <Empty title="لا توجد إشعارات" /> : <div className="divide-y divide-slate-100">{notifications.map((notification) => <div className="flex items-start justify-between gap-4 p-4" key={notification.id}><div><p className="font-black text-night">{notification.title}</p><p className="mt-1 text-sm text-slate-500">{notification.message}</p></div><time className="shrink-0 text-xs text-slate-400">{fmtDateTime(notification.createdAt)}</time></div>)}</div>}</div></div>;
}

export function AdminAuditLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { adminApi.auditLogs().then((data) => setLogs(data.logs)).catch(() => undefined).finally(() => setLoading(false)); }, []);
  if (loading) return <Spinner />;
  return <div className="space-y-6"><div><h1 className="section-title mb-1">سجل التدقيق</h1><p className="text-sm text-slate-500">سجل الإجراءات الحساسة مثل اعتماد الدفع وفك تشفير بيانات العميل.</p></div><div className="card overflow-x-auto">{logs.length === 0 ? <Empty title="لا توجد سجلات" /> : <table className="w-full min-w-[800px]"><thead><tr className="border-b border-slate-100 bg-slate-50"><th className="th">التاريخ</th><th className="th">الفاعل</th><th className="th">الإجراء</th><th className="th">الكيان</th><th className="th">التفاصيل</th></tr></thead><tbody>{logs.map((log) => <tr className="border-b border-slate-100 last:border-0" key={log.id}><td className="td">{fmtDateTime(log.createdAt)}</td><td className="td">{log.actor?.name ?? 'النظام'}</td><td className="td font-bold text-night">{ACTION_LABELS[log.action] ?? log.action}</td><td className="td">{log.entityType} <span className="text-xs text-slate-400">{log.entityId ?? ''}</span></td><td className="td max-w-sm truncate text-xs text-slate-500">{log.details ?? '—'}</td></tr>)}</tbody></table>}</div></div>;
}
