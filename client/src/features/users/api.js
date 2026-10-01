import { api } from '../../lib/api';

export function getMyUser() {
  return api.get('/users/me');
}

export function searchUsers(query) {
  return api.get(`/users/search?q=${encodeURIComponent(query)}`);
}
