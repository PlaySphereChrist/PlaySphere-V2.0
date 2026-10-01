'use strict';

const express = require('express');
const router = express.Router();
const asyncHandler = require('../../utils/asyncHandler');
const { authenticateOptional } = require('../../middleware/auth');
const ctrl = require('./performance.controller');

// GET /api/performance-events/:eventId
router.get('/:eventId', authenticateOptional, asyncHandler(ctrl.getPerformanceEvent));

// GET /api/performance-events/:eventId/players
router.get('/:eventId/players', authenticateOptional, asyncHandler(ctrl.getPerformanceEventPlayers));

module.exports = router;
