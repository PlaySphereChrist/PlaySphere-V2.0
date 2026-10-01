-- Migration 0002: Match Score Reports & Captain Confirmation Workflow
CREATE TABLE IF NOT EXISTS match_score_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  submitted_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  submitting_team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  home_score INT NOT NULL CHECK (home_score >= 0),
  away_score INT NOT NULL CHECK (away_score >= 0),
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'disputed', 'cancelled')),
  notes TEXT,
  dispute_reason TEXT,
  reviewed_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_match_score_reports_match ON match_score_reports(match_id);
CREATE INDEX IF NOT EXISTS idx_match_score_reports_tournament ON match_score_reports(tournament_id);
