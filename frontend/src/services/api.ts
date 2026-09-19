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
