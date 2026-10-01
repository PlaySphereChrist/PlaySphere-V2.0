'use strict';

const express = require('express');
const router = express.Router();
const leaderboardsController = require('./leaderboards.controller');
const { authenticate, authenticateOptional, authorizeRoles } = require('../../middleware/auth');

// Tournament-scoped listing (must be before /:id to prevent Express ambiguity)
router.get('/tournaments/:tournamentId', authenticateOptional, leaderboardsController.getTournamentLeaderboards);

// Direct leaderboard CRUD
router.post('/', authenticate, authorizeRoles('ORGANIZER', 'ADMIN'), leaderboardsController.createLeaderboard);
router.post('/:id/generate', authenticate, authorizeRoles('ORGANIZER', 'ADMIN'), leaderboardsController.generateLeaderboard);
router.get('/:id', authenticateOptional, leaderboardsController.getLeaderboard);
router.get('/:id/entries', authenticateOptional, leaderboardsController.getLeaderboardEntries);

module.exports = router;
