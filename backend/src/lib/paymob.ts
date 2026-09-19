import crypto from 'crypto';
import { getPublicAppUrl } from '../config';

export interface PaymobConfig {
  secretKey: string;
  publicKey: string;
  hmacSecret: string;
  integrationIds: number[];
  environment: 'sandbox' | 'live';
}

export function getPaymobConfig(): PaymobConfig | null {
  const secretKey = process.env.PAYMOB_SECRET_KEY?.trim();
  const publicKey = process.env.PAYMOB_PUBLIC_KEY?.trim();
  const hmacSecret = process.env.PAYMOB_HMAC_SECRET?.trim();
  const rawIntegrations = process.env.PAYMOB_INTEGRATION_IDS?.trim();

  if (!secretKey || !publicKey || !hmacSecret) {
    return null;
  }

  const integrationIds = rawIntegrations
    ? rawIntegrations.split(',').map((s) => Number(s.trim())).filter((n) => !isNaN(n) && n > 0)
    : [];

  const environment = (process.env.PAYMOB_ENVIRONMENT?.toLowerCase() === 'live') ? 'live' : 'sandbox';

  return {
    secretKey,
    publicKey,
    hmacSecret,
    integrationIds,
    environment,
  };
}

export interface CreateIntentionParams {
  amountEgp: number;
  packageId: string;
  packageName: string;
  customerName: string;
  customerEmail?: string | null;
  customerPhone: string;
  paymentId: string;
}

export interface IntentionResult {
  intentionId: string;
  clientSecret: string;
  checkoutUrl: string;
  orderId?: string | number;
}

export async function createPaymobIntention(params: CreateIntentionParams): Promise<IntentionResult> {
  const config = getPaymobConfig();
  if (!config) {
    throw new Error('PAYMOB_NOT_CONFIGURED');
  }

  const amountCents = Math.round(params.amountEgp * 100);
  const nameParts = params.customerName.trim().split(/\s+/);
  const firstName = nameParts[0] || 'عميل';
  const lastName = nameParts.slice(1).join(' ') || 'محب';
  const email = params.customerEmail || `${params.customerPhone}@mo7eb.net`;
  const phone = params.customerPhone.startsWith('+') ? params.customerPhone : `+2${params.customerPhone}`;

  const publicUrl = getPublicAppUrl();
  const notificationUrl = `${publicUrl}/api/v1/payments/paymob/webhook`;
  const redirectionUrl = `${publicUrl}/payments?status=processing&ref=${params.paymentId}`;

  const body: Record<string, any> = {
    amount: amountCents,
    currency: 'EGP',
    payment_methods: config.integrationIds.length > 0 ? config.integrationIds : undefined,
    items: [
      {
        name: params.packageName,
        amount: amountCents,
        description: `اشتراك في باقة ${params.packageName}`,
        quantity: 1,
      },
    ],
    billing_data: {
      first_name: firstName,
      last_name: lastName,
      phone_number: phone,
      email,
    },
    customer: {
      first_name: firstName,
      last_name: lastName,
      email,
    },
    special_reference: params.paymentId,
    notification_url: notificationUrl,
    redirection_url: redirectionUrl,
  };

  const response = await fetch('https://accept.paymob.com/v1/intention/', {
    method: 'POST',
    headers: {
      'Authorization': `Token ${config.secretKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    console.error('[Paymob Intention Error]', response.status, errText);
    throw new Error('فشل إنشاء عملية الدفع الإلكتروني عبر Paymob');
  }

  const data = await response.json() as {
    id: string;
    client_secret: string;
    order_id?: string | number;
  };

  if (!data.client_secret) {
    throw new Error('بيانات الدفع من Paymob غير مكتملة');
  }

  const checkoutUrl = `https://accept.paymob.com/unifiedcheckout/?publicKey=${encodeURIComponent(config.publicKey)}&clientSecret=${encodeURIComponent(data.client_secret)}`;

  return {
    intentionId: data.id,
    clientSecret: data.client_secret,
    checkoutUrl,
    orderId: data.order_id,
  };
}

/**
 * Calculates and verifies HMAC SHA-512 for a Paymob Transaction Webhook object.
 *
 * Paymob algorithm sorts and concatenates the following keys from transaction obj:
 * amount_cents, created_at, currency, error_occured, has_parent_transaction, id,
 * integration_id, is_3d_secure, is_auth, is_capture, is_refunded, is_standalone_payment,
 * is_voided, order.id, owner, pending, source_data.pan, source_data.sub_type, source_data.type, success
 */
export function verifyPaymobWebhookHmac(obj: Record<string, any>, receivedHmac: string): boolean {
  const config = getPaymobConfig();
  if (!config || !config.hmacSecret || !receivedHmac) {
    return false;
  }

  try {
    const concatenated = [
      obj.amount_cents ?? '',
      obj.created_at ?? '',
      obj.currency ?? '',
      obj.error_occured ?? '',
      obj.has_parent_transaction ?? '',
      obj.id ?? '',
      obj.integration_id ?? '',
      obj.is_3d_secure ?? '',
      obj.is_auth ?? '',
      obj.is_capture ?? '',
      obj.is_refunded ?? '',
      obj.is_standalone_payment ?? '',
      obj.is_voided ?? '',
      obj.order?.id ?? obj.order ?? '',
      obj.owner ?? '',
      obj.pending ?? '',
      obj.source_data?.pan ?? '',
      obj.source_data?.sub_type ?? '',
      obj.source_data?.type ?? '',
      obj.success ?? '',
    ].map(String).join('');

    const calculatedHmac = crypto
      .createHmac('sha512', config.hmacSecret)
      .update(concatenated)
      .digest('hex');

    const expectedBuffer = Buffer.from(calculatedHmac.toLowerCase(), 'utf8');
    const receivedBuffer = Buffer.from(receivedHmac.toLowerCase(), 'utf8');

    if (expectedBuffer.length !== receivedBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
  } catch (error) {
    console.error('[Paymob HMAC Verification Error]', error);
    return false;
  }
}
