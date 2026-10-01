import { api } from '../../lib/api';

export function getTournamentPlayerStatistics(tournamentId) {
  return api.get(`/statistics/tournaments/${tournamentId}/players`);
}

export function getTournamentTeamStatistics(tournamentId) {
  return api.get(`/statistics/tournaments/${tournamentId}/teams`);
}
