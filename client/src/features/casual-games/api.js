import { api } from '../../lib/api';

export function listCasualGames(queryString = '') {
  return api.get(`/casual-games${queryString ? `?${queryString}` : ''}`);
}

export function getCasualGame(gameId) {
  return api.get(`/casual-games/${gameId}`);
}

export function createCasualGame(gameDetails) {
  return api.post('/casual-games', gameDetails);
}

export function updateCasualGame(gameId, gameDetails) {
  return api.patch(`/casual-games/${gameId}`, gameDetails);
}

export function joinCasualGame(gameId) {
  return api.post(`/casual-games/${gameId}/join`);
}

export function leaveCasualGame(gameId) {
  return api.post(`/casual-games/${gameId}/leave`);
}

export function cancelCasualGame(gameId) {
  return api.post(`/casual-games/${gameId}/cancel`);
}
