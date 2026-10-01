'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  assertRegistrationOpen,
  buildWaitlistPromotionRegistration,
  isRegistrationOpen,
} = require('../../src/modules/tournaments/registration-rules');

const now = new Date('2026-09-26T12:00:00.000Z');

test('registration is open inside the status and time window', () => {
  const tournament = {
    status: 'registration_open',
    registration_opens_at: '2026-09-26T11:00:00.000Z',
    registration_closes_at: '2026-09-26T13:00:00.000Z',
  };

  assert.equal(isRegistrationOpen(tournament, now), true);
  assert.doesNotThrow(() => assertRegistrationOpen(tournament, now));
});

test('registration is closed at the exact closing timestamp', () => {
  const tournament = {
    status: 'registration_open',
    registration_closes_at: now.toISOString(),
  };

  assert.equal(isRegistrationOpen(tournament, now), false);
  assert.throws(() => assertRegistrationOpen(tournament, now), /window has closed/);
});

test('registration status must be registration_open', () => {
  const tournament = { status: 'in_progress' };

  assert.equal(isRegistrationOpen(tournament, now), false);
  assert.throws(() => assertRegistrationOpen(tournament, now), /status is "in_progress"/);
});

test('free waitlist promotion approves registration without payment', () => {
  const result = buildWaitlistPromotionRegistration(
    { registration_fee: '0.00' },
    { override: false },
    'Team Alpha'
  );

  assert.deepEqual(result, {
    status: 'approved',
    eligibility_status: 'approved',
    registration_name: 'Team Alpha',
    payment_required: false,
    fee: 0,
  });
});

test('paid waitlist promotion remains pending until the fee is captured', () => {
  const result = buildWaitlistPromotionRegistration(
    { registration_fee: '1250.00' },
    { override: true }
  );

  assert.deepEqual(result, {
    status: 'pending',
    eligibility_status: 'overridden',
    registration_name: null,
    payment_required: true,
    fee: 1250,
  });
});
