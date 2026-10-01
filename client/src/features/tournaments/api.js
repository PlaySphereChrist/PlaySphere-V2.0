import { api } from '../../lib/api';

export function listTournaments(queryString = '') {
  return api.get(`/tournaments${queryString ? `?${queryString}` : ''}`);
}

export function getTournament(tournamentId) {
  return api.get(`/tournaments/${tournamentId}`);
}

export function getTournamentPublicParticipants(tournamentId) {
  return api.get(`/tournaments/${tournamentId}/participants`);
}

export function getTournamentMatches(tournamentId) {
  return api.get(`/tournaments/${tournamentId}/matches`);
}

export function getTournamentFixtures(tournamentId) {
  return api.get(`/tournaments/${tournamentId}/fixtures`);
}

export function getTournamentStandings(tournamentId) {
  return api.get(`/tournaments/${tournamentId}/fixtures/standings`);
}

export function generateTournamentFixtures(tournamentId, options = {}) {
  return api.post(`/tournaments/${tournamentId}/fixtures/generate`, options);
}

export function updateTournamentFixtureSchedule(tournamentId, fixtureId, schedule) {
  return api.patch(`/tournaments/${tournamentId}/fixtures/${fixtureId}/schedule`, schedule);
}

export function registerForTournament(tournamentId, registrationDetails) {
  return api.post(`/tournaments/${tournamentId}/registrations`, registrationDetails);
}

export function getMyTournamentRegistration(tournamentId) {
  return api.get(`/tournaments/${tournamentId}/registrations/my`);
}

export function getMyTournamentWaitlistEntry(tournamentId) {
  return api.get(`/tournaments/${tournamentId}/waitlist/my`);
}

export function cancelMyTournamentWaitlistEntry(tournamentId) {
  return api.delete(`/tournaments/${tournamentId}/waitlist/my`);
}

export function cancelTournamentRegistration(tournamentId, registrationId) {
  return api.delete(`/tournaments/${tournamentId}/registrations/${registrationId}`);
}

export function getMyRegistrations() {
  return api.get('/registrations');
}

export function getTournamentConfigurationValidation(tournamentId) {
  return api.get(`/tournaments/${tournamentId}/configuration/validation`);
}

export function getTournamentRegistrations(tournamentId) {
  return api.get(`/tournaments/${tournamentId}/registrations`);
}

export function getTournamentWaitlist(tournamentId) {
  return api.get(`/tournaments/${tournamentId}/waitlist`);
}

export function createTournament(tournamentDetails) {
  return api.post('/tournaments', tournamentDetails);
}

export function updateTournament(tournamentId, tournamentDetails) {
  return api.patch(`/tournaments/${tournamentId}`, tournamentDetails);
}

export function deleteTournament(tournamentId) {
  return api.delete(`/tournaments/${tournamentId}`);
}

export function generateTournamentDraft(prompt) {
  return api.post('/tournaments/copilot/draft', { prompt });
}

export function createTournamentEligibilityRule(tournamentId, rule) {
  return api.post(`/tournaments/${tournamentId}/eligibility/rules`, rule);
}

export function assignTournamentCoOrganizer(tournamentId, payload) {
  return api.post(`/tournaments/${tournamentId}/co-organizer`, payload);
}

export function removeTournamentCoOrganizer(tournamentId) {
  return api.delete(`/tournaments/${tournamentId}/co-organizer`);
}

export function postTournamentAnnouncement(tournamentId, payload) {
  return api.post(`/tournaments/${tournamentId}/announcements`, payload);
}
