const test = require('node:test');
const assert = require('node:assert/strict');
const {
  expectedAmountPaise,
  assertProviderPaymentMatches,
} = require('../../src/modules/payments/payment-validation');

const payment = {
  amount: '125.75',
  currency: 'INR',
};

const providerPayment = {
  id: 'pay_test_123',
  order_id: 'order_test_123',
  amount: 12575,
  currency: 'INR',
};

test('converts the stored amount to paise', () => {
  assert.equal(expectedAmountPaise(payment), 12575);
});

test('rejects zero, negative, and non-numeric amounts', () => {
  for (const amount of [0, -1, 'not-a-number']) {
    assert.throws(
      () => expectedAmountPaise({ amount }),
      (error) => error.statusCode === 400
    );
  }
});

test('accepts a provider payment matching the stored order, amount, and currency', () => {
  assert.doesNotThrow(() =>
    assertProviderPaymentMatches(payment, providerPayment, 'order_test_123', 'pay_test_123')
  );
});

test('rejects a mismatched provider order, payment ID, amount, or currency', () => {
  const mismatches = [
    [{ ...providerPayment, order_id: 'order_other' }, 'order_test_123', 'pay_test_123'],
    [{ ...providerPayment, id: 'pay_other' }, 'order_test_123', 'pay_test_123'],
    [{ ...providerPayment, amount: 1 }, 'order_test_123', 'pay_test_123'],
    [{ ...providerPayment, currency: 'USD' }, 'order_test_123', 'pay_test_123'],
  ];

  for (const [providerResponse, orderId, paymentId] of mismatches) {
    assert.throws(
      () => assertProviderPaymentMatches(payment, providerResponse, orderId, paymentId),
      (error) => error.statusCode === 409
    );
  }
});
