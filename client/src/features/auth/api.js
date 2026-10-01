import { api } from '../../lib/api';

export function registerUser(credentials) {
  return api.post('/auth/register', credentials);
}

export function getCurrentUser() {
  return api.get('/auth/me');
}

export function loginUser(credentials) {
  return api.post('/auth/login', credentials);
}

export function logoutUser(refreshToken) {
  return api.post('/auth/logout', { refreshToken });
}
