const express = require('express');
const router = express.Router({ mergeParams: true });
const asyncHandler = require('../../utils/asyncHandler');
const { authenticate, authenticateOptional } = require('../../middleware/auth');
const ctrl = require('./fixtures.controller');

// POST /api/tournaments/:tournamentId/fixtures/generate
router.post('/generate', authenticate, asyncHandler(ctrl.generateTournamentFixtures));

// GET /api/tournaments/:tournamentId/fixtures/standings
router.get('/standings', authenticateOptional, asyncHandler(ctrl.getTournamentStandings));

// PATCH /api/tournaments/:tournamentId/fixtures/:fixtureId/schedule
router.patch('/:fixtureId/schedule', authenticate, asyncHandler(ctrl.updateFixtureSchedule));

// GET /api/tournaments/:tournamentId/fixtures
router.get('/', authenticateOptional, asyncHandler(ctrl.getTournamentFixtures));

module.exports = router;
