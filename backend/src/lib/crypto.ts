import crypto from 'crypto';
import { getCredentialEncryptionKey } from '../config';

const ALGORITHM = 'aes-256-gcm';

function key(): Buffer {
  return crypto.createHash('sha256').update(getCredentialEncryptionKey()).digest();
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
