const express = require('express');
const router = express.Router();
const asyncHandler = require('../../utils/asyncHandler');
const { authenticate, authenticateOptional } = require('../../middleware/auth');
const ctrl = require('./casual-games.controller');

// Public discovery shows only upcoming open games. Joining and management stay protected.
router.get('/', authenticateOptional, asyncHandler(ctrl.listGames));

router.post('/', authenticate, asyncHandler(ctrl.createGame));
router.get('/:gameId', authenticateOptional, asyncHandler(ctrl.getGame));
router.patch('/:gameId', authenticate, asyncHandler(ctrl.updateGame));
router.post('/:gameId/cancel', authenticate, asyncHandler(ctrl.cancelGame));
router.post('/:gameId/join', authenticate, asyncHandler(ctrl.joinGame));
router.post('/:gameId/leave', authenticate, asyncHandler(ctrl.leaveGame));

module.exports = router;
