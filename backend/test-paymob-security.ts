import crypto from 'crypto';
import { verifyPaymobWebhookHmac } from './src/lib/paymob';

function runTests() {
  console.log('🧪 Running Paymob Integration & Security Unit Tests...\n');

  // Test 1: HMAC Verification Algorithm
  process.env.PAYMOB_SECRET_KEY = 'sec_test_mock_123';
  process.env.PAYMOB_PUBLIC_KEY = 'pub_test_mock_123';
  process.env.PAYMOB_HMAC_SECRET = 'super_secret_hmac_key_for_testing_12345';
  process.env.PAYMOB_INTEGRATION_IDS = '12345,67890';

  const mockTransactionObj = {
    amount_cents: 25000,
    created_at: '2026-09-20T02:00:00.000000',
    currency: 'EGP',
    error_occured: false,
    has_parent_transaction: false,
    id: 99887766,
    integration_id: 12345,
    is_3d_secure: true,
    is_auth: false,
    is_capture: false,
    is_refunded: false,
    is_standalone_payment: true,
    is_voided: false,
    order: { id: 55443322 },
    owner: 1001,
    pending: false,
    source_data: { pan: '2346', sub_type: 'MasterCard', type: 'card' },
    success: true,
  };

  const concatenated = [
    mockTransactionObj.amount_cents,
    mockTransactionObj.created_at,
    mockTransactionObj.currency,
    mockTransactionObj.error_occured,
    mockTransactionObj.has_parent_transaction,
    mockTransactionObj.id,
    mockTransactionObj.integration_id,
    mockTransactionObj.is_3d_secure,
    mockTransactionObj.is_auth,
    mockTransactionObj.is_capture,
    mockTransactionObj.is_refunded,
    mockTransactionObj.is_standalone_payment,
    mockTransactionObj.is_voided,
    mockTransactionObj.order.id,
    mockTransactionObj.owner,
    mockTransactionObj.pending,
    mockTransactionObj.source_data.pan,
    mockTransactionObj.source_data.sub_type,
    mockTransactionObj.source_data.type,
    mockTransactionObj.success,
  ].map(String).join('');

  const validHmac = crypto
    .createHmac('sha512', process.env.PAYMOB_HMAC_SECRET!)
    .update(concatenated)
    .digest('hex');

  // Assert 1: Valid HMAC returns true
  const test1 = verifyPaymobWebhookHmac(mockTransactionObj, validHmac);
  if (!test1) {
    throw new Error('Test 1 Failed: Valid HMAC was rejected');
  }
  console.log('✅ Test 1 Passed: Valid Paymob SHA-512 HMAC successfully verified.');

  // Assert 2: Tampered HMAC is rejected
  const tamperedHmac = validHmac.slice(0, -2) + 'ff';
  const test2 = verifyPaymobWebhookHmac(mockTransactionObj, tamperedHmac);
  if (test2) {
    throw new Error('Test 2 Failed: Tampered HMAC was accepted');
  }
  console.log('✅ Test 2 Passed: Tampered HMAC correctly rejected.');

  // Assert 3: Tampered Amount (e.g. attacker changing amount_cents) is rejected
  const tamperedObj = { ...mockTransactionObj, amount_cents: 100 }; // 1 EGP instead of 250 EGP
  const test3 = verifyPaymobWebhookHmac(tamperedObj, validHmac);
  if (test3) {
    throw new Error('Test 3 Failed: Tampered transaction object was accepted with original HMAC');
  }
  console.log('✅ Test 3 Passed: Tampered transaction payload is detected and rejected.');

  // Assert 4: Empty / Missing HMAC is rejected
  const test4 = verifyPaymobWebhookHmac(mockTransactionObj, '');
  if (test4) {
    throw new Error('Test 4 Failed: Empty HMAC was accepted');
  }
  console.log('✅ Test 4 Passed: Empty/Missing HMAC correctly rejected.');

  console.log('\n🎉 All Paymob Integration & Security Unit Tests Passed Successfully!\n');
}

runTests();
