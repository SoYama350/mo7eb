import crypto from 'crypto';
import { getPublicAppUrl } from '../config';

function config() {
  const url = process.env.SUPABASE_URL?.trim().replace(/\/+$/, '');
  const anonKey = (process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_ANON_KEY)?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !anonKey || !serviceRoleKey) throw new Error('SUPABASE_AUTH_NOT_CONFIGURED');
  return { url, anonKey, serviceRoleKey };
}

export async function ensureSupabaseUser(email: string, name: string): Promise<void> {
  const { url, serviceRoleKey } = config();
  const response = await fetch(url + '/auth/v1/admin/users', {
    method: 'POST',
    headers: { apikey: serviceRoleKey, Authorization: 'Bearer ' + serviceRoleKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      password: crypto.randomBytes(32).toString('base64url'),
      email_confirm: true,
      user_metadata: { name },
    }),
  });
  if (!response.ok && response.status !== 400 && response.status !== 422) throw new Error('SUPABASE_AUTH_USER_CREATE_FAILED');
}

export async function requestSupabasePasswordRecovery(email: string): Promise<void> {
  const { url, anonKey } = config();
  const redirectTo = getPublicAppUrl() + '/reset-password';
  const response = await fetch(url + '/auth/v1/recover?redirect_to=' + encodeURIComponent(redirectTo), {
    method: 'POST',
    headers: { apikey: anonKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  if (!response.ok) throw new Error('SUPABASE_AUTH_RECOVERY_FAILED');
}

export async function getSupabaseUser(accessToken: string): Promise<{ email?: string | null }> {
  const { url, anonKey } = config();
  const response = await fetch(url + '/auth/v1/user', { headers: { apikey: anonKey, Authorization: 'Bearer ' + accessToken } });
  if (!response.ok) throw new Error('SUPABASE_AUTH_SESSION_INVALID');
  return response.json() as Promise<{ email?: string | null }>;
}
