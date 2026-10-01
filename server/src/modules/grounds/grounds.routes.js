const express = require('express');
const router = express.Router();
const asyncHandler = require('../../utils/asyncHandler');
const { authenticate, authorizeRoles } = require('../../middleware/auth');
const ctrl = require('./grounds.controller');

// ---------------------------------------------------------------------------
// PUBLIC / AUTHENTICATED — Ground discovery
// Ground discovery, availability, and slots are public; personal bookings remain protected.
// ---------------------------------------------------------------------------
router.get('/', asyncHandler(ctrl.listGroundsPublic));
router.get('/:groundId', asyncHandler(ctrl.getGround));
router.get('/:groundId/availability', asyncHandler(ctrl.listAvailability));
router.get('/:groundId/slots', asyncHandler(ctrl.listSlots));

// ---------------------------------------------------------------------------
// USER — Bookings (place and manage own bookings)
// ---------------------------------------------------------------------------
router.post('/:groundId/bookings', authenticate, asyncHandler(ctrl.createBooking));

// ---------------------------------------------------------------------------
// ADMIN — Ground management
// ---------------------------------------------------------------------------
router.post(
  '/',
  authenticate, authorizeRoles('ADMIN'),
  asyncHandler(ctrl.createGround)
);
router.patch(
  '/:groundId',
  authenticate, authorizeRoles('ADMIN'),
  asyncHandler(ctrl.updateGround)
);
router.patch(
  '/:groundId/deactivate',
  authenticate, authorizeRoles('ADMIN'),
  asyncHandler(ctrl.deactivateGround)
);
router.delete(
  '/:groundId',
  authenticate, authorizeRoles('ADMIN'),
  asyncHandler(ctrl.deleteGround)
);

// ADMIN — Admin-only ground listing (includes inactive)
router.get(
  '/admin/all',
  authenticate, authorizeRoles('ADMIN'),
  asyncHandler(ctrl.listGroundsAdmin)
);

// ADMIN — Ground sports
router.post(
  '/:groundId/sports',
  authenticate, authorizeRoles('ADMIN'),
  asyncHandler(ctrl.addGroundSport)
);
router.delete(
  '/:groundId/sports/:sportId',
  authenticate, authorizeRoles('ADMIN'),
  asyncHandler(ctrl.removeGroundSport)
);

// ADMIN — Availability management
router.post(
  '/:groundId/availability',
  authenticate, authorizeRoles('ADMIN'),
  asyncHandler(ctrl.createAvailability)
);
router.patch(
  '/:groundId/availability/:availId',
  authenticate, authorizeRoles('ADMIN'),
  asyncHandler(ctrl.updateAvailability)
);
router.delete(
  '/:groundId/availability/:availId',
  authenticate, authorizeRoles('ADMIN'),
  asyncHandler(ctrl.deleteAvailability)
);

// ADMIN — Booking slots management
router.post(
  '/:groundId/slots',
  authenticate, authorizeRoles('ADMIN'),
  asyncHandler(ctrl.createSlot)
);
router.patch(
  '/:groundId/slots/:slotId',
  authenticate, authorizeRoles('ADMIN'),
  asyncHandler(ctrl.updateSlot)
);
router.delete(
  '/:groundId/slots/:slotId',
  authenticate, authorizeRoles('ADMIN'),
  asyncHandler(ctrl.deleteSlot)
);

module.exports = router;
