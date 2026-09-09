export type Role = 'CUSTOMER' | 'MERCHANT' | 'ADMIN';

export interface User { id: string; phone: string; name: string; role: Role; isActive: boolean; source: string; merchantId: string | null; }
export interface Provider { id: string; slug: string; name: string; logo: string; primaryColor: string; secondaryColor: string; isActive: boolean; order: number; packages?: Package[]; createdAt?: string; updatedAt?: string; }
export interface Package { id: string; providerId: string; name: string; internetGB?: number | null; minutes?: number | null; price: number; durationDays: number; reminderDays?: number | null; isActive?: boolean; logo?: string | null; primaryColor?: string | null; secondaryColor?: string | null; provider?: Provider; createdAt?: string; }
export interface PaymentMethod { id: string; name: string; accountIdentifier?: string | null; instructions?: string | null; isActive: boolean; sortOrder: number; createdAt?: string; }
export interface Subscription { id: string; userId: string; providerId: string; packageId: string; phoneNumber: string; status: string; startDate?: string | null; renewalDate?: string | null; reminderSent: boolean; createdAt: string; user?: { id: string; name: string; phone: string }; provider?: Provider; package?: Package; payments?: Payment[]; cycles?: SubscriptionCycle[]; }
export interface SubscriptionCycle { id: string; packageId: string; status: string; startDate?: string | null; endDate?: string | null; package?: Package; createdAt?: string; }
export interface Payment { id: string; userId: string; subscriptionId: string; amount: number; paymentMethodId: string; paidFromPhone?: string | null; screenshotUrl?: string | null; status: string; reviewedBy?: string | null; reviewedAt?: string | null; reviewNote?: string | null; createdAt: string; user?: { id: string; name: string; phone: string }; subscription?: Subscription; paymentMethod?: PaymentMethod; }
export interface Merchant { id: string; userId: string; name: string; user?: { id: string; name: string; phone: string; isActive?: boolean }; obligations?: MerchantObligation[]; createdAt?: string; }
export interface MerchantObligation { id: string; merchantId: string; amount: number; dueDate: string; status: string; paidAt?: string | null; note?: string | null; createdAt: string; merchant?: Merchant; }
export interface AuditLog { id: string; actorId?: string | null; actorRole?: string | null; action: string; entityType: string; entityId?: string | null; details?: string | null; ip?: string | null; createdAt: string; actor?: { id: string; name: string; phone: string }; }
export interface AppNotification { id: string; userId?: string | null; role?: string | null; type: string; title: string; message: string; readAt?: string | null; createdAt?: string; }
export interface MerchantFinancials {
  merchant: Merchant;
  customerCount: number;
  currentDue: { amount: number; dueDate: string | null; status: string | null };
  totalDueAmount: number;
}
export interface AdminCustomer { id: string; name: string; phone: string; source: string; merchant?: { id: string; name: string } | null; subscription?: Subscription | null; subscriptionStatus?: string | null; subscriptionStatusLabel?: string; }

   const BASE = `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/v1`;

export class ApiError extends Error { constructor(public status: number, message: string) { super(message); } }

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(BASE + path, { ...init, credentials: 'include', headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) } });
  if (!res.ok) {
    let msg = 'حصل خطأ غير متوقع';
    try { const data = await res.json(); msg = (data as any)?.message || msg; } catch { /* ignore */ }
    throw new ApiError(res.status, msg);
  }
  return res.json() as Promise<T>;
}

export function qs(params: Record<string, string | number | boolean | undefined | null>): string {
  const s = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') s.set(k, String(v));
  });
  const t = s.toString();
  return t ? '?' + t : '';
}

export const api = {
  get: <T,>(path: string) => request<T>(path),
  post: <T,>(path: string, body?: unknown) => request<T>(path, { method: 'POST', body: JSON.stringify(body ?? {}) }),
  patch: <T,>(path: string, body?: unknown) => request<T>(path, { method: 'PATCH', body: JSON.stringify(body ?? {}) }),
  put: <T,>(path: string, body?: unknown) => request<T>(path, { method: 'PUT', body: JSON.stringify(body ?? {}) }),
  del: <T,>(path: string) => request<T>(path, { method: 'DELETE' }),
  upload: <T,>(path: string, form: FormData) => fetch(BASE + path, { method: 'POST', body: form, credentials: 'include' }).then(async (res) => {
    if (!res.ok) { let msg = 'حصل خطأ غير متوقع'; try { const d = await res.json(); msg = (d as any)?.message || msg; } catch { /* */ } throw new ApiError(res.status, msg); }
    return res.json() as Promise<T>;
  }),
};
