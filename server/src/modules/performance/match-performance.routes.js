'use strict';

const express = require('express');
const router = express.Router({ mergeParams: true });
const asyncHandler = require('../../utils/asyncHandler');
const { authenticate, authenticateOptional } = require('../../middleware/auth');
const ctrl = require('./performance.controller');

// GET /api/matches/:matchId/performance-events
router.get('/', authenticateOptional, asyncHandler(ctrl.getMatchPerformanceEvents));

// POST /api/matches/:matchId/performance-events
router.post('/', authenticate, asyncHandler(ctrl.createPerformanceEvent));

module.exports = router;
