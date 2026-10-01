import { api } from '../../lib/api';

export function getSports() {
  return api.get('/sports');
}

export function getSportStatDefinitions(sportId) {
  return api.get(`/sports/${sportId}/stat-definitions`);
}
