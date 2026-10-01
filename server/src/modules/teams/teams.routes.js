const express = require('express');
const router = express.Router();
const asyncHandler = require('../../utils/asyncHandler');
const { authenticate, authenticateOptional } = require('../../middleware/auth');
const teamsController = require('./teams.controller');

// Public discovery; / is kept as the signed-in user's own teams for registration.
router.get('/public', authenticateOptional, asyncHandler(teamsController.getPublicTeams));
router.get('/', authenticate, asyncHandler(teamsController.getMyTeams));
router.post('/', authenticate, asyncHandler(teamsController.createTeam));
router.get('/:teamId', authenticateOptional, asyncHandler(teamsController.getTeamById));
router.patch('/:teamId', authenticate, asyncHandler(teamsController.updateTeam));

// --- MEMBERS ---
router.get('/:teamId/members', authenticateOptional, asyncHandler(teamsController.getTeamMembers));
router.delete('/:teamId/members/:memberId', authenticate, asyncHandler(teamsController.removeTeamMember));

// --- INVITATIONS (Team Manager issuing) ---
router.post('/:teamId/invitations', authenticate, asyncHandler(teamsController.inviteUser));

module.exports = router;
