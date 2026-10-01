import { api } from '../../lib/api';

export function listGrounds(queryString = '') {
  return api.get(`/grounds${queryString ? `?${queryString}` : ''}`);
}

export function getGround(groundId) {
  return api.get(`/grounds/${groundId}`);
}

export function getAvailableGroundSlots(groundId) {
  return api.get(`/grounds/${groundId}/slots?available_only=true`);
}

export function createGroundBooking(groundId, bookingDetails) {
  return api.post(`/grounds/${groundId}/bookings`, bookingDetails);
}

export function listAdminGrounds() {
  return api.get('/grounds/admin/all');
}

export function createGround(groundDetails) {
  return api.post('/grounds', groundDetails);
}

export function updateGround(groundId, groundDetails) {
  return api.patch(`/grounds/${groundId}`, groundDetails);
}

export function getGroundSlots(groundId) {
  return api.get(`/grounds/${groundId}/slots`);
}

export function addGroundSport(groundId, sportId) {
  return api.post(`/grounds/${groundId}/sports`, { sport_id: sportId });
}

export function removeGroundSport(groundId, sportId) {
  return api.delete(`/grounds/${groundId}/sports/${sportId}`);
}

export function createGroundSlot(groundId, slotDetails) {
  return api.post(`/grounds/${groundId}/slots`, slotDetails);
}

export function deleteGroundSlot(groundId, slotId) {
  return api.delete(`/grounds/${groundId}/slots/${slotId}`);
}

export function deleteGround(groundId) {
  return api.delete(`/grounds/${groundId}`);
}
