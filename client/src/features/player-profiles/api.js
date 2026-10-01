import { api } from '../../lib/api';

export function getMyPlayerProfile() {
  return api.get('/player-profiles/me');
}

export function createPlayerProfile(profileDetails) {
  return api.post('/player-profiles/me', profileDetails);
}

export function updatePlayerProfile(profileDetails) {
  return api.patch('/player-profiles/me', profileDetails);
}

export function getMyPlayerSportProfiles() {
  return api.get('/player-profiles/me/sports');
}

export function createPlayerSportProfile(profileDetails) {
  return api.post('/player-profiles/me/sports', profileDetails);
}

export function updatePlayerSportProfile(profileId, profileDetails) {
  return api.patch(`/player-profiles/me/sports/${profileId}`, profileDetails);
}

export function deletePlayerSportProfile(profileId) {
  return api.delete(`/player-profiles/me/sports/${profileId}`);
}
