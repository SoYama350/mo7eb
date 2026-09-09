import { api, qs, User, Provider, Package, PaymentMethod, Subscription, Payment, Merchant, MerchantObligation, AuditLog, AppNotification, MerchantFinancials, AdminCustomer } from '../lib/api';

// Auth
export const authApi = {
  me: () => api.get<{ user: User }>('/auth/me'),
  login: (phone: string, password: string) => api.post<{ user: User }>('/auth/login', { phone, password }),
  register: (payload: { name: string; phone: string; password: string }) => api.post<{ user: User }>('/auth/register', payload),
  updateMe: (payload: { name: string }) => api.patch<{ user: User }>('/auth/me', payload),
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
  createCustomer: (payload: { name: string; phone: string; packageId: string; providerId: string }) => api.post<{ customer: User; subscription: Subscription; newUser: boolean }>('/merchant/customers', payload),
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
  createMerchant: (body: { name: string; phone: string; password?: string }) => api.post<{ merchant: Merchant }>('/admin/merchants', body),
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
