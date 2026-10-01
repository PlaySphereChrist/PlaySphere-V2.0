import { api } from '../../lib/api';

export function getTournamentLeaderboard(tournamentId) {
  return api.get(`/leaderboards/tournaments/${tournamentId}`);
}

export function getLeaderboardEntries(leaderboardId) {
  return api.get(`/leaderboards/${leaderboardId}/entries`);
}

export function generateLeaderboard(leaderboardId) {
  return api.post(`/leaderboards/${leaderboardId}/generate`, {});
}

export function createLeaderboard(leaderboardDetails) {
  return api.post('/leaderboards', leaderboardDetails);
}
