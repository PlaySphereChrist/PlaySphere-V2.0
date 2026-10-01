-- Migration: 0003_organizer_co_organizer.sql
-- Add co_organizer_user_id column to tournaments table

ALTER TABLE tournaments
  ADD COLUMN IF NOT EXISTS co_organizer_user_id UUID REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_tournaments_co_organizer
  ON tournaments(co_organizer_user_id);
