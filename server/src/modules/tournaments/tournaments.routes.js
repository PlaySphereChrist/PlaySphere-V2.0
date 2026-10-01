const express = require('express');
const router = express.Router();
const asyncHandler = require('../../utils/asyncHandler');
const { authenticate, authenticateOptional, authorizeRoles } = require('../../middleware/auth');
const ctrl = require('./tournaments.controller');
const sseService = require('../realtime/sse.service');

// GET /api/tournaments/:tournamentId/live — Server-Sent Events stream for live scores and bracket updates
router.get('/:tournamentId/live', (req, res) => {
  const { tournamentId } = req.params;
  sseService.subscribe(`tournaments:${tournamentId}`, req, res);
});

// GET /api/tournaments — public discovery excludes unpublished drafts.
router.get('/', authenticateOptional, asyncHandler(ctrl.listTournaments));

// Public, privacy-filtered list of approved participants and team rosters.
router.get('/:tournamentId/participants', authenticateOptional, asyncHandler(ctrl.listPublicParticipants));

// Public published tournament details; drafts remain visible only to their owners/admins.
router.get('/:tournamentId', authenticateOptional, asyncHandler(ctrl.getTournament));

// POST /api/tournaments — ORGANIZER only
router.post(
  '/',
  authenticate,
  authorizeRoles('ORGANIZER', 'ADMIN'),
  asyncHandler(ctrl.createTournament)
);

// POST /api/tournaments/copilot/draft — ORGANIZER / ADMIN AI Setup Copilot
router.post(
  '/copilot/draft',
  authenticate,
  authorizeRoles('ORGANIZER', 'ADMIN'),
  asyncHandler(ctrl.draftTournamentWithCopilot)
);

// GET /api/tournaments/:tournamentId/configuration/validation — check configuration completeness
router.get('/:tournamentId/configuration/validation', authenticate, asyncHandler(ctrl.validateConfiguration));

// Eligibility Engine
router.use('/:tournamentId/eligibility', require('./eligibility.routes'));

// Registrations
router.use('/:tournamentId/registrations', require('./registration.routes'));

// Matches
router.use('/:tournamentId/matches', require('../matches/tournament-matches.routes'));

// Fixtures
router.use('/:tournamentId/fixtures', require('../fixtures/tournament-fixtures.routes'));

// Waitlist
router.use('/:tournamentId/waitlist', require('./waitlist.routes'));


// POST /api/tournaments/:tournamentId/co-organizer — Assign co-organizer
router.post('/:tournamentId/co-organizer', authenticate, asyncHandler(ctrl.assignCoOrganizer));

// DELETE /api/tournaments/:tournamentId/co-organizer — Remove co-organizer
router.delete('/:tournamentId/co-organizer', authenticate, asyncHandler(ctrl.removeCoOrganizer));

// POST /api/tournaments/:tournamentId/announcements — Post official announcement to tournament community
router.post('/:tournamentId/announcements', authenticate, asyncHandler(ctrl.postTournamentAnnouncement));

// PATCH /api/tournaments/:tournamentId — authenticated; ownership checked in service
router.patch('/:tournamentId', authenticate, asyncHandler(ctrl.updateTournament));

// DELETE /api/tournaments/:tournamentId — ORGANIZER/ADMIN only; draft + no dependents only
router.delete(
  '/:tournamentId',
  authenticate,
  authorizeRoles('ORGANIZER', 'ADMIN'),
  asyncHandler(ctrl.deleteTournament)
);

module.exports = router;
