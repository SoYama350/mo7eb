import { getStorageConfig } from '../config';

function objectPath(path: string): string {
  return path.split('/').map(encodeURIComponent).join('/');
}

function headers(key: string, contentType?: string): Record<string, string> {
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    ...(contentType ? { 'Content-Type': contentType } : {}),
  };
}

export async function uploadPrivateObject(path: string, data: Buffer, contentType: string): Promise<void> {
  const { url, key, bucket } = getStorageConfig();
  const response = await fetch(`${url}/storage/v1/object/${bucket}/${objectPath(path)}`, {
    method: 'POST',
    headers: { ...headers(key, contentType), 'x-upsert': 'false' },
    body: data as any,
  });
  if (!response.ok) throw new Error('تعذر حفظ ملف الدفع بأمان');
}

export async function createPrivateObjectUrl(path: string, expiresIn = 300): Promise<string> {
  const { url, key, bucket } = getStorageConfig();
  const response = await fetch(`${url}/storage/v1/object/sign/${bucket}/${objectPath(path)}`, {
    method: 'POST',
    headers: { ...headers(key), 'Content-Type': 'application/json' },
    body: JSON.stringify({ expiresIn }),
  });
  if (!response.ok) throw new Error('تعذر إنشاء رابط الملف');
  const payload = await response.json() as { signedURL?: string };
  if (!payload.signedURL) throw new Error('تعذر إنشاء رابط الملف');
  return payload.signedURL.startsWith('http') ? payload.signedURL : `${url}/storage/v1${payload.signedURL}`;
}

export async function deletePrivateObject(path: string): Promise<void> {
  const { url, key, bucket } = getStorageConfig();
  await fetch(`${url}/storage/v1/object/remove/${bucket}`, {
    method: 'POST',
    headers: { ...headers(key), 'Content-Type': 'application/json' },
    body: JSON.stringify({ prefixes: [path] }),
  });
}
