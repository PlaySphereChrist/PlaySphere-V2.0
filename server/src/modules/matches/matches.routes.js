const express = require('express');
const router = express.Router();
const asyncHandler = require('../../utils/asyncHandler');
const { authenticate, authenticateOptional } = require('../../middleware/auth');
const ctrl = require('./matches.controller');
const sseService = require('../realtime/sse.service');

// GET /api/matches/:matchId/live — Server-Sent Events stream for match score & status updates
router.get('/:matchId/live', (req, res) => {
  const { matchId } = req.params;
  sseService.subscribe(`matches:${matchId}`, req, res);
});

// GET /api/matches/:matchId
router.get('/:matchId', authenticateOptional, asyncHandler(ctrl.getMatch));

// GET /api/matches/:matchId/participants
router.get('/:matchId/participants', authenticateOptional, asyncHandler(ctrl.getMatchParticipants));

// POST /api/matches/:matchId/start
router.post('/:matchId/start', authenticate, asyncHandler(ctrl.startMatch));

// POST /api/matches/:matchId/complete
router.post('/:matchId/complete', authenticate, asyncHandler(ctrl.completeMatch));

// POST /api/matches/:matchId/score — Direct score entry & update (Organizer / Co-organizer)
router.post('/:matchId/score', authenticate, asyncHandler(ctrl.recordMatchScore));

// POST /api/matches/:matchId/cancel
router.post('/:matchId/cancel', authenticate, asyncHandler(ctrl.cancelMatch));

// Captain Score Reports & Confirmation Workflow
router.get('/:matchId/score-reports', authenticateOptional, asyncHandler(ctrl.getMatchScoreReports));
router.post('/:matchId/score-reports', authenticate, asyncHandler(ctrl.submitMatchScoreReport));
router.post('/:matchId/score-reports/:reportId/confirm', authenticate, asyncHandler(ctrl.confirmMatchScoreReport));
router.post('/:matchId/score-reports/:reportId/reject', authenticate, asyncHandler(ctrl.rejectMatchScoreReport));

// Performance events nested under match
router.use('/:matchId/performance-events', require('../performance/match-performance.routes'));

module.exports = router;
