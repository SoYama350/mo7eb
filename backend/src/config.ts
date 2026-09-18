const isProduction = process.env.NODE_ENV === 'production' || Boolean(process.env.VERCEL);

function requiredSecret(name: string): string {
  const value = process.env[name]?.trim();
  if (!value || value.length < 32) {
    throw new Error(`${name} must be configured with at least 32 characters`);
  }
  return value;
}

export function getAppSecret(): string {
  return requiredSecret('APP_SECRET');
}

export function getCredentialEncryptionKey(): string {
  return requiredSecret('CRED_ENCRYPTION_KEY');
}

export function getStorageConfig(): { url: string; key: string; bucket: string } {
  const url = process.env.SUPABASE_URL?.trim().replace(/\/+$/, '');
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) {
    throw new Error('Supabase Storage is not configured');
  }
  return { url, key, bucket: process.env.SUPABASE_STORAGE_BUCKET?.trim() || 'invoice-images' };
}

export function allowedOrigins(): string[] {
  const configured = process.env.CORS_ORIGIN?.split(',').map((value) => value.trim().replace(/\/+$/, '')).filter(Boolean) ?? [];
  if (configured.length > 0) return configured;
  if (isProduction) return [];
  return ['http://localhost:5173', 'http://localhost:4173'];
}

export function getPublicAppUrl(): string {
  const value = process.env.PUBLIC_APP_URL?.trim().replace(/\/+$/, '');
  if (!value && isProduction) throw new Error('PUBLIC_APP_URL must be configured in production');
  return value || 'http://localhost:5173';
}

export function isProductionEnvironment(): boolean {
  return isProduction;
}
