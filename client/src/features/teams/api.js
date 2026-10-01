import { api } from '../../lib/api';

export function getTeams() {
  return api.get('/teams');
}

export function getPublicTeams() {
  return api.get('/teams/public');
}

export function createTeam(teamDetails) {
  return api.post('/teams', teamDetails);
}

export function getTeam(teamId) {
  return api.get(`/teams/${teamId}`);
}

export function getTeamMembers(teamId) {
  return api.get(`/teams/${teamId}/members`);
}

export function updateTeam(teamId, teamDetails) {
  return api.patch(`/teams/${teamId}`, teamDetails);
}

export function removeTeamMember(teamId, memberId) {
  return api.delete(`/teams/${teamId}/members/${memberId}`);
}

export function inviteUserToTeam(teamId, invitationDetails) {
  return api.post(`/teams/${teamId}/invitations`, invitationDetails);
}

export function getTeamInvitations() {
  return api.get('/team-invitations');
}

export function respondToTeamInvitation(invitationId, action) {
  return api.post(`/team-invitations/${invitationId}/respond`, { action });
}
