import { api } from '../../lib/api';

export function createGroundBookingOrder(bookingId) {
  return api.post(`/ground-bookings/${bookingId}/payment/order`, {});
}

export function verifyGroundBookingPayment(bookingId, paymentResponse) {
  return api.post(`/ground-bookings/${bookingId}/payment/verify`, paymentResponse);
}

export function processGroundBookingRefund(bookingId) {
  return api.post(`/ground-bookings/${bookingId}/payment/refund`, {});
}

export function createTournamentRegistrationOrder(tournamentId, registrationId) {
  return api.post(`/tournaments/${tournamentId}/registrations/${registrationId}/payment/order`, {});
}

export function verifyTournamentRegistrationPayment(tournamentId, registrationId, paymentResponse) {
  return api.post(
    `/tournaments/${tournamentId}/registrations/${registrationId}/payment/verify`,
    paymentResponse
  );
}
