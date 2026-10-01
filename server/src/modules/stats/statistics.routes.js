'use strict';

const express = require('express');
const router = express.Router();
const asyncHandler = require('../../utils/asyncHandler');
const { authenticate } = require('../../middleware/auth');
const ctrl = require('./statistics.controller');

// ---------------------------------------------------------------------------
// Tournament-scoped player statistics
// ---------------------------------------------------------------------------

// GET /api/statistics/tournaments/:tournamentId/players
// Returns all player stats materialized for this tournament.
// Public tournament pages may read these aggregates; tournament visibility is
// enforced by the statistics service before data is returned.
router.get(
  '/tournaments/:tournamentId/players',
  asyncHandler(ctrl.getTournamentPlayerStatistics)
);

// GET /api/statistics/tournaments/:tournamentId/players/:playerProfileId
// Returns stats for a single player within the tournament.
router.get(
  '/tournaments/:tournamentId/players/:playerProfileId',
  asyncHandler(ctrl.getTournamentPlayerStatisticsById)
);

// GET /api/statistics/tournaments/:tournamentId/teams
// Returns team stats materialized for this tournament.
router.get(
  '/tournaments/:tournamentId/teams',
  asyncHandler(ctrl.getTournamentTeamStatistics)
);

// ---------------------------------------------------------------------------
// Cross-tournament player view
// ---------------------------------------------------------------------------

// GET /api/statistics/players/:playerProfileId
// Returns all tournament stats for a player (across visible tournaments).
router.get(
  '/players/:playerProfileId',
  asyncHandler(ctrl.getPlayerStatistics)
);

// ---------------------------------------------------------------------------
// Match-level live stats
// ---------------------------------------------------------------------------

// GET /api/statistics/matches/:matchId
// Returns live performance-event stats for a single match.
// Reads directly from performance_events, not the materialized tables.
router.get(
  '/matches/:matchId',
  asyncHandler(ctrl.getMatchStatistics)
);

// ---------------------------------------------------------------------------
// Recalculation — Organizer (own tournament) or Admin only
// ---------------------------------------------------------------------------

// POST /api/statistics/tournaments/:tournamentId/recalculate
// Rebuilds player_statistics and team_statistics from performance events.
router.post(
  '/tournaments/:tournamentId/recalculate',
  authenticate,
  asyncHandler(ctrl.recalculateTournamentStatistics)
);

module.exports = router;
