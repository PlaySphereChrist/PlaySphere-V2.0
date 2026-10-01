const express = require('express');
const router  = express.Router();
const asyncHandler  = require('../../utils/asyncHandler');
const { authenticate, authenticateOptional, authorizeRoles } = require('../../middleware/auth');
const ctrl = require('./community.controller');

// ─── Community (unified) ──────────────────────────────────────────────────────
router.get('/all', authenticateOptional, asyncHandler(ctrl.listCommunities));
router.post('/create', authenticate, authorizeRoles('ORGANIZER', 'ADMIN'), asyncHandler(ctrl.createCommunity));
router.get('/',       authenticateOptional, asyncHandler(ctrl.getCommunity));
router.post('/',      authenticate, authorizeRoles('ORGANIZER', 'ADMIN'), asyncHandler(ctrl.updateCommunity));
router.patch('/',     authenticate, authorizeRoles('ORGANIZER', 'ADMIN'), asyncHandler(ctrl.updateCommunity));

// ─── Membership ───────────────────────────────────────────────────────────────
router.get('/members',   authenticateOptional, asyncHandler(ctrl.getMembers));
router.post('/join',     authenticate, asyncHandler(ctrl.joinCommunity));
router.post('/leave',    authenticate, asyncHandler(ctrl.leaveCommunity));

// ─── Equipment Requests (before /:postId to avoid ambiguity) ─────────────────
router.get('/equipment-requests',            authenticateOptional, asyncHandler(ctrl.listEquipmentRequests));
router.post('/equipment-requests',           authenticate, asyncHandler(ctrl.createEquipmentRequest));
router.get('/equipment-requests/:requestId', authenticateOptional, asyncHandler(ctrl.getEquipmentRequest));
router.patch('/equipment-requests/:requestId', authenticate, asyncHandler(ctrl.updateEquipmentRequest));

// ─── Reports ─────────────────────────────────────────────────────────────────
router.post('/reports',             authenticate, asyncHandler(ctrl.createReport));
router.get('/reports',              authenticate, authorizeRoles('ADMIN'), asyncHandler(ctrl.listReports));
router.patch('/reports/:reportId',  authenticate, authorizeRoles('ADMIN'), asyncHandler(ctrl.updateReport));

// ─── Posts ────────────────────────────────────────────────────────────────────
router.get('/posts',              authenticateOptional, asyncHandler(ctrl.listPosts));
router.post('/posts',             authenticate, asyncHandler(ctrl.createPost));
router.get('/posts/:postId',      authenticateOptional, asyncHandler(ctrl.getPost));
router.patch('/posts/:postId',    authenticate, asyncHandler(ctrl.updatePost));
router.post('/posts/:postId/react', authenticate, asyncHandler(ctrl.reactToPost));
router.post('/posts/:postId/archive', authenticate, asyncHandler(ctrl.archivePost));
router.post('/posts/:postId/moderate', authenticate, authorizeRoles('ADMIN'), asyncHandler(ctrl.moderatePost));

// ─── Comments ─────────────────────────────────────────────────────────────────
router.get('/posts/:postId/comments',   authenticateOptional, asyncHandler(ctrl.listComments));
router.post('/posts/:postId/comments',  authenticate, asyncHandler(ctrl.createComment));
router.patch('/comments/:commentId',    authenticate, asyncHandler(ctrl.updateComment));
router.post('/comments/:commentId/archive', authenticate, asyncHandler(ctrl.archiveComment));
router.post('/comments/:commentId/moderate', authenticate, authorizeRoles('ADMIN'), asyncHandler(ctrl.moderateComment));

module.exports = router;
