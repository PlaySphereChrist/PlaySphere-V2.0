export function listCommunities() {
  return api.request('GET', '/community/all');
}

export function createCommunity(communityDetails) {
  return api.request('POST', '/community/create', communityDetails);
}
import { api } from '../../lib/api';

function communityQuery(communityId) {
  return communityId ? `?community_id=${encodeURIComponent(communityId)}` : '';
}

export function getCommunity(communityId) {
  return api.request('GET', `/community${communityQuery(communityId)}`);
}

export function getCommunityMembers(communityId, page, limit = 100) {
  const params = [`page=${page}`, `limit=${limit}`];
  if (communityId) params.push(`community_id=${encodeURIComponent(communityId)}`);
  return api.request('GET', `/community/members?${params.join('&')}`);
}

export function listCommunityPosts(communityId, equipmentOnly = false) {
  const route = equipmentOnly ? '/community/equipment-requests' : '/community/posts';
  return api.request('GET', `${route}${communityQuery(communityId)}`);
}

export function createCommunityPost(communityId, postDetails, equipmentRequest = false) {
  const route = equipmentRequest ? '/community/equipment-requests' : '/community/posts';
  return api.request('POST', `${route}${communityQuery(communityId)}`, postDetails);
}

export function joinCommunity(communityId) {
  return api.request('POST', `/community/join${communityQuery(communityId)}`);
}

export function leaveCommunity(communityId) {
  return api.request('POST', `/community/leave${communityQuery(communityId)}`);
}

export function createCommunityComment(postId, body) {
  return api.request('POST', `/community/posts/${postId}/comments`, { body });
}

export function listCommunityComments(postId) {
  return api.request('GET', `/community/posts/${postId}/comments`);
}

export function editCommunityComment(commentId, body) {
  return api.request('PATCH', `/community/comments/${commentId}`, { body });
}

export function archiveCommunityComment(commentId) {
  return api.request('POST', `/community/comments/${commentId}/archive`);
}

export function archiveCommunityPost(postId) {
  return api.request('POST', `/community/posts/${postId}/archive`);
}

export function reactToCommunityPost(postId, reaction) {
  return api.request('POST', `/community/posts/${postId}/react`, { reaction });
}

export function editCommunityPost(post, changes) {
  const route = post.category === 'equipment_request'
    ? `/community/equipment-requests/${post.id}`
    : `/community/posts/${post.id}`;
  return api.request('PATCH', route, changes);
}

export function reportCommunityContent(reportDetails) {
  return api.request('POST', '/community/reports', reportDetails);
}

export function moderateCommunityContent(contentId, isPost, reason) {
  const route = isPost
    ? `/community/posts/${contentId}/moderate`
    : `/community/comments/${contentId}/moderate`;
  return api.request('POST', route, { moderate: true, reason });
}

export function listCommunityReports(status = '') {
  const query = status ? `?status=${encodeURIComponent(status)}` : '';
  return api.request('GET', `/community/reports${query}`);
}

export function updateCommunityReport(reportId, changes) {
  return api.request('PATCH', `/community/reports/${reportId}`, changes);
}
