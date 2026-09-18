import crypto from 'crypto';
import { getAppSecret, getPublicAppUrl } from '../config';

export type PasswordResetChannel = 'email' | 'sms';

export function createPasswordResetCode(): string {
  return String(crypto.randomInt(100000, 1000000));
}

export function hashPasswordResetCode(code: string): string {
  return crypto.createHmac('sha256', getAppSecret()).update(code).digest('hex');
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character] ?? character);
}

function toE164(phone: string): string {
  return phone.startsWith('01') ? `+20${phone.slice(1)}` : phone;
}

export async function sendPasswordResetCode(input: {
  channel: PasswordResetChannel;
  destination: string;
  name: string;
  code: string;
}): Promise<void> {
  if (input.channel === 'email') {
    const apiKey = process.env.RESEND_API_KEY?.trim();
    const from = process.env.EMAIL_FROM?.trim();
    if (!apiKey || !from) throw new Error('PASSWORD_RESET_EMAIL_NOT_CONFIGURED');
    const resetUrl = `${getPublicAppUrl()}/reset-password`;
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from,
        to: [input.destination],
        subject: 'كود استعادة كلمة مرور محب نت',
        html: `<p>مرحباً ${escapeHtml(input.name)}،</p><p>كود استعادة كلمة المرور هو:</p><p style="font-size:28px;font-weight:bold;letter-spacing:6px">${input.code}</p><p>استخدم الكود خلال 15 دقيقة من صفحة ${escapeHtml(resetUrl)}.</p>`,
      }),
    });
    if (!response.ok) throw new Error('PASSWORD_RESET_EMAIL_FAILED');
    return;
  }

  const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim();
  const authToken = process.env.TWILIO_AUTH_TOKEN?.trim();
  const from = process.env.TWILIO_FROM_NUMBER?.trim();
  if (!accountSid || !authToken || !from) throw new Error('PASSWORD_RESET_SMS_NOT_CONFIGURED');
  const body = new URLSearchParams({
    To: toE164(input.destination),
    From: from,
    Body: `كود استعادة كلمة مرور محب نت: ${input.code}. صالح لمدة 15 دقيقة.`,
  });
  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
    method: 'POST',
    headers: { Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!response.ok) throw new Error('PASSWORD_RESET_SMS_FAILED');
}
