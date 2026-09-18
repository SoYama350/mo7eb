import { createPrivateObjectUrl } from './storage';

export async function paymentForClient(payment: any): Promise<any> {
  const screenshotUrl = payment.screenshotPath ? await createPrivateObjectUrl(payment.screenshotPath) : null;
  const { screenshotPath: _screenshotPath, screenshotUrl: _legacyUrl, ...publicPayment } = payment;
  return { ...publicPayment, screenshotUrl };
}

export function paymentsForClient(payments: any[]): Promise<any[]> {
  return Promise.all(payments.map(paymentForClient));
}
