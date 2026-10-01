-- Allow one booking slot per sport for the same ground and time window.
-- A NULL sport remains supported for legacy / sport-agnostic slots.
BEGIN;

ALTER TABLE ground_booking_slots
  DROP CONSTRAINT IF EXISTS ground_booking_slots_ground_id_slot_date_start_time_end_tim_key;

CREATE UNIQUE INDEX IF NOT EXISTS uq_ground_booking_slots_sport_window
  ON ground_booking_slots (
    ground_id,
    slot_date,
    start_time,
    end_time,
    COALESCE(sport_id, '00000000-0000-0000-0000-000000000000'::UUID)
  );

COMMIT;
