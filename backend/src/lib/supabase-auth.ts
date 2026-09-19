import { getPublicAppUrl } from '../config';

function config() {
  const url = process.env.SUPABASE_URL?.trim().replace(/\/+$/, '');
  const anonKey = (process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.VITE_PUBLIC_SUPABASE_ANON_KEY ?? process.env.VITE_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_ANON_KEY)?.trim();
  if (!url || !anonKey) throw new Error('SUPABASE_AUTH_NOT_CONFIGURED');
  return { url, anonKey };
}

export async function requestSupabasePasswordRecovery(email: string): Promise<void> {
  const { url, anonKey } = config();
  const redirectTo = getPublicAppUrl() + '/reset-password';
  const response = await fetch(url + '/auth/v1/recover?redirect_to=' + encodeURIComponent(redirectTo), {
    method: 'POST',
    headers: { apikey: anonKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  if (!response.ok) throw new Error('SUPABASE_AUTH_RECOVERY_FAILED_' + response.status);
}

export async function getSupabaseUser(accessToken: string): Promise<{ email?: string | null }> {
  const { url, anonKey } = config();
  const response = await fetch(url + '/auth/v1/user', { headers: { apikey: anonKey, Authorization: 'Bearer ' + accessToken } });
  if (!response.ok) throw new Error('SUPABASE_AUTH_SESSION_INVALID');
  return response.json() as Promise<{ email?: string | null }>;
}
