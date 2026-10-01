import { api } from '../../lib/api';

export function getUnreadNotificationCount() {
  return api.get('/notifications/unread-count');
}

export function listRecentNotifications() {
  return api.get('/notifications?limit=10');
}

export function markNotificationRead(notificationId) {
  return api.patch(`/notifications/${notificationId}/read`);
}

export function markAllNotificationsRead() {
  return api.patch('/notifications/read-all');
}
