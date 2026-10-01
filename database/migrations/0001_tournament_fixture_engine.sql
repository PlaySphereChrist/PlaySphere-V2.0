CREATE TYPE tournament_fixture_stage_type AS ENUM (
  'league',
  'round_robin',
  'group',
  'knockout',
  'double_elimination_winners',
  'double_elimination_losers',
  'grand_final',
  'grand_final_reset'
);

ALTER TABLE fixtures
  ADD COLUMN stage tournament_fixture_stage_type NOT NULL DEFAULT 'knockout',
  ADD COLUMN group_number INT CHECK (group_number > 0),
  ADD COLUMN bracket_position INT CHECK (bracket_position > 0),
  ADD COLUMN scheduled_end_at TIMESTAMPTZ,
  ADD COLUMN home_registration_id UUID REFERENCES tournament_registrations(id) ON DELETE RESTRICT,
  ADD COLUMN away_registration_id UUID REFERENCES tournament_registrations(id) ON DELETE RESTRICT,
  ADD COLUMN winner_registration_id UUID REFERENCES tournament_registrations(id) ON DELETE RESTRICT,
  ADD COLUMN winner_next_fixture_id UUID REFERENCES fixtures(id) ON DELETE SET NULL,
  ADD COLUMN winner_next_side VARCHAR(10) CHECK (winner_next_side IN ('home', 'away')),
  ADD COLUMN loser_next_fixture_id UUID REFERENCES fixtures(id) ON DELETE SET NULL,
  ADD COLUMN loser_next_side VARCHAR(10) CHECK (loser_next_side IN ('home', 'away')),
  ADD CONSTRAINT chk_fixture_advancement_targets CHECK (
    winner_next_fixture_id IS NULL OR winner_next_side IS NOT NULL
  ),
  ADD CONSTRAINT chk_fixture_loser_target CHECK (
    loser_next_fixture_id IS NULL OR loser_next_side IS NOT NULL
  ),
  ADD CONSTRAINT chk_fixture_participants_distinct CHECK (
    home_registration_id IS NULL OR away_registration_id IS NULL
    OR home_registration_id <> away_registration_id
  ),
  ADD CONSTRAINT chk_fixture_schedule_window CHECK (
    scheduled_end_at IS NULL OR (scheduled_at IS NOT NULL AND scheduled_end_at > scheduled_at)
  );

ALTER TABLE matches
  ADD COLUMN scheduled_end_at TIMESTAMPTZ,
  ADD CONSTRAINT chk_match_schedule_window CHECK (
    scheduled_end_at IS NULL OR (scheduled_at IS NOT NULL AND scheduled_end_at > scheduled_at)
  );

ALTER TABLE fixtures DROP CONSTRAINT IF EXISTS fixtures_status_check;
ALTER TABLE fixtures ADD CONSTRAINT fixtures_status_check
  CHECK (status IN ('scheduled', 'in_progress', 'completed', 'postponed', 'cancelled', 'bye'));

CREATE UNIQUE INDEX uq_fixtures_generated_position
  ON fixtures (
    tournament_id,
    stage,
    round_number,
    COALESCE(group_number, 0),
    bracket_position
  )
  WHERE bracket_position IS NOT NULL;

CREATE INDEX idx_fixtures_winner_next ON fixtures (winner_next_fixture_id);
CREATE INDEX idx_fixtures_loser_next ON fixtures (loser_next_fixture_id);
CREATE INDEX idx_fixtures_home_registration ON fixtures (home_registration_id);
CREATE INDEX idx_fixtures_away_registration ON fixtures (away_registration_id);
CREATE INDEX idx_fixtures_winner_registration ON fixtures (winner_registration_id);
CREATE INDEX idx_fixtures_stage_round ON fixtures (tournament_id, stage, round_number);
