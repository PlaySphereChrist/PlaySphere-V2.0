import { api } from '../../lib/api';

export function getMatch(matchId) {
  return api.get(`/matches/${matchId}`);
}

export function getMatchParticipants(matchId) {
  return api.get(`/matches/${matchId}/participants`);
}

export function getMatchPerformanceEvents(matchId) {
  return api.get(`/matches/${matchId}/performance-events`);
}

export function getPerformanceEventPlayers(eventId) {
  return api.get(`/performance-events/${eventId}/players`);
}

export function startMatch(matchId) {
  return api.post(`/matches/${matchId}/start`);
}

export function cancelMatch(matchId, reason) {
  return api.post(`/matches/${matchId}/cancel`, { reason });
}

export function completeMatch(matchId, result) {
  return api.post(`/matches/${matchId}/complete`, result);
}

export function recordMatchScore(matchId, scoreData) {
  return api.post(`/matches/${matchId}/score`, scoreData);
}

export function createMatchPerformanceEvent(matchId, event) {
  return api.post(`/matches/${matchId}/performance-events`, event);
}

// Captain Score Reports & Confirmation
export function getMatchScoreReports(matchId) {
  return api.get(`/matches/${matchId}/score-reports`);
}

export function submitMatchScoreReport(matchId, payload) {
  return api.post(`/matches/${matchId}/score-reports`, payload);
}

export function confirmMatchScoreReport(matchId, reportId) {
  return api.post(`/matches/${matchId}/score-reports/${reportId}/confirm`);
}

export function rejectMatchScoreReport(matchId, reportId, reason) {
  return api.post(`/matches/${matchId}/score-reports/${reportId}/reject`, { reason });
}
