'use strict';

function isRegistrationOpen(tournament, now = new Date()) {
  if (!tournament || tournament.status !== 'registration_open') return false;

  const opensAt = tournament.registration_opens_at
    ? new Date(tournament.registration_opens_at)
    : null;
  const closesAt = tournament.registration_closes_at
    ? new Date(tournament.registration_closes_at)
    : null;

  if (opensAt && now < opensAt) return false;
  if (closesAt && now >= closesAt) return false;
  return true;
}

function assertRegistrationOpen(tournament, now = new Date()) {
  if (tournament.status !== 'registration_open') {
    const error = new Error(
      `Registration is not open. Tournament status is "${tournament.status}"`
    );
    error.statusCode = 400;
    throw error;
  }

  if (tournament.registration_opens_at && now < new Date(tournament.registration_opens_at)) {
    const error = new Error('Registration window has not yet opened');
    error.statusCode = 400;
    throw error;
  }

  if (tournament.registration_closes_at && now >= new Date(tournament.registration_closes_at)) {
    const error = new Error('Registration window has closed');
    error.statusCode = 400;
    throw error;
  }
}

function buildWaitlistPromotionRegistration(tournament, eligibility, registrationName = null) {
  const fee = Number(tournament.registration_fee) || 0;
  const paymentRequired = fee > 0;

  return {
    status: paymentRequired ? 'pending' : 'approved',
    eligibility_status: eligibility.override ? 'overridden' : 'approved',
    registration_name: registrationName,
    payment_required: paymentRequired,
    fee,
  };
}

module.exports = {
  assertRegistrationOpen,
  buildWaitlistPromotionRegistration,
  isRegistrationOpen,
};
