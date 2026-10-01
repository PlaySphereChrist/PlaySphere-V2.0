const express = require('express');
const router = express.Router({ mergeParams: true });
const asyncHandler = require('../../utils/asyncHandler');
const { authenticate, authenticateOptional } = require('../../middleware/auth');
const ctrl = require('./matches.controller');

// GET /api/tournaments/:tournamentId/matches
router.get('/', authenticateOptional, asyncHandler(ctrl.getTournamentMatches));

// POST /api/tournaments/:tournamentId/matches/from-fixture/:fixtureId
// Or just a separate path for creating from fixture
router.post('/from-fixture/:fixtureId', authenticate, asyncHandler(ctrl.createMatchFromFixture));

module.exports = router;
