import { createClient } from '@supabase/supabase-js';

const url = ((import.meta.env.VITE_SUPABASE_URL as string | undefined) ?? (import.meta.env.VITE_PUBLIC_SUPABASE_URL as string | undefined))?.trim();
const anonKey = ((import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ?? (import.meta.env.VITE_PUBLIC_SUPABASE_ANON_KEY as string | undefined) ?? (import.meta.env.VITE_PUBLIC_SUPABASE_PUBLISHABLE_KEY as string | undefined))?.trim();

export const supabase = url && anonKey
  ? createClient(url, anonKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } })
  : null;
