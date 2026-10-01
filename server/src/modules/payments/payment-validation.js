function expectedAmountPaise(payment) {
  const amount = Number(payment.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    const error = new Error('Invalid payment amount');
    error.statusCode = 400;
    throw error;
  }
  return Math.round(amount * 100);
}

function assertProviderPaymentMatches(payment, providerPayment, orderId, paymentId) {
  const expectedCurrency = (payment.currency || 'INR').toUpperCase();
  const matches = providerPayment &&
    providerPayment.id === paymentId &&
    providerPayment.order_id === orderId &&
    Number(providerPayment.amount) === expectedAmountPaise(payment) &&
    String(providerPayment.currency || '').toUpperCase() === expectedCurrency;

  if (!matches) {
    const error = new Error('Razorpay payment details do not match this payment record');
    error.statusCode = 409;
    throw error;
  }
}

module.exports = {
  expectedAmountPaise,
  assertProviderPaymentMatches,
};
