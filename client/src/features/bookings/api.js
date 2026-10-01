import { api } from '../../lib/api';

export function getMyBookings() {
  return api.get('/ground-bookings/me');
}

export function getBooking(bookingId) {
  return api.get(`/ground-bookings/${bookingId}`);
}

export function cancelBooking(bookingId, reason) {
  return api.post(`/ground-bookings/${bookingId}/cancel`, { reason });
}
