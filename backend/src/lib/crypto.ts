import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';

function key(): Buffer {
  const raw = process.env.CRED_ENCRYPTION_KEY;
  if (!raw && process.env.NODE_ENV === 'production') throw new Error('CRED_ENCRYPTION_KEY is required in production');
  return crypto.createHash('sha256').update(raw || 'dev-only-key-32-bytes!!').digest();
}

export function encryptCredential(plaintext: string): { encrypted: string; iv: string; authTag: string } {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, key(), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  return {
    encrypted: encrypted.toString('base64'),
    iv: iv.toString('base64'),
    authTag: (cipher.getAuthTag()).toString('base64'),
  };
}

export function decryptCredential(data: { encrypted: string; iv: string; authTag: string }): string {
  try {
    const decipher = crypto.createDecipheriv(ALGORITHM, key(), Buffer.from(data.iv, 'base64'));
    decipher.setAuthTag(Buffer.from(data.authTag, 'base64'));
    return Buffer.concat([decipher.update(Buffer.from(data.encrypted, 'base64')), decipher.final()]).toString('utf8');
  } catch {
    return '(تعذر فك التشفير)';
  }
}
