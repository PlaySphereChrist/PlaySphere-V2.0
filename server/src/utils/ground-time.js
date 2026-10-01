'use strict';

// Ground slots store the venue's local date and wall-clock time separately.
// The current ground catalog is India-based, so convert them explicitly to IST
// instead of inheriting the API server's timezone.
const GROUND_UTC_OFFSET = '+05:30';
const GROUND_TIME_ZONE = 'Asia/Kolkata';

function normalizeSlotDate(slotDate) {
  return slotDate instanceof Date
    ? slotDate.toISOString().slice(0, 10)
    : String(slotDate).split('T')[0];
}

function toGroundInstant(slotDate, slotTime) {
  const date = normalizeSlotDate(slotDate);
  const time = String(slotTime).slice(0, 8);
  const instant = new Date(`${date}T${time}${GROUND_UTC_OFFSET}`);
  return Number.isNaN(instant.getTime()) ? null : instant;
}

module.exports = { GROUND_TIME_ZONE, toGroundInstant };
