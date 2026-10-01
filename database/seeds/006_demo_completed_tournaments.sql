-- =============================================================================
-- PlaySphere — Local completed tournament history with scorecards and stats.
-- Requires seeds 001, 003, and 005 plus the fixture-engine migration.
-- Idempotent: demo rows are matched by stable names/keys.
-- =============================================================================

BEGIN;

CREATE TEMP TABLE demo_past_tournament_data (
  name TEXT PRIMARY KEY,
  sport_slug TEXT NOT NULL,
  description TEXT NOT NULL,
  banner_url TEXT NOT NULL,
  city TEXT NOT NULL,
  venue_details TEXT NOT NULL,
  registration_opens_at TIMESTAMPTZ NOT NULL,
  registration_closes_at TIMESTAMPTZ NOT NULL,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL
) ON COMMIT DROP;

INSERT INTO demo_past_tournament_data VALUES
  (
    'Bengaluru Football Legends Series', 'football',
    'Completed three-match football series with final scores, team standings, and player performance records.',
    '/images/demo/tournament-posters/bengaluru-football-cup.svg', 'Bengaluru', 'Central Sports Arena',
    '2025-04-01 09:00:00+05:30', '2025-05-08 20:00:00+05:30',
    '2025-05-10 09:00:00+05:30', '2025-05-12 18:00:00+05:30'
  ),
  (
    'Monsoon Cricket Invitational', 'cricket',
    'Completed three-match cricket series with innings scorecards, player runs and wickets, and team standings.',
    '/images/demo/tournament-posters/weekend-cricket-open.svg', 'Bengaluru', 'Greenfield Cricket Ground',
    '2025-05-01 09:00:00+05:30', '2025-06-12 20:00:00+05:30',
    '2025-06-14 09:00:00+05:30', '2025-06-16 18:00:00+05:30'
  ),
  (
    'South Bengaluru Hoops Cup', 'basketball',
    'Completed three-match basketball series with quarter scores, player points and assists, and team standings.',
    '/images/demo/tournament-posters/city-hoops-challenge.svg', 'Bengaluru', 'Baseline Indoor Arena',
    '2025-06-01 09:00:00+05:30', '2025-07-31 20:00:00+05:30',
    '2025-08-02 09:00:00+05:30', '2025-08-04 18:00:00+05:30'
  );

-- Tournament-specific statistics used by the seeded official performance events.
INSERT INTO sport_stat_definitions
  (sport_id, stat_key, stat_name, description, data_type, is_cumulative, applies_to)
SELECT sport.id, definitions.stat_key, definitions.stat_name, definitions.description,
       definitions.data_type, TRUE, definitions.applies_to
FROM (VALUES
  ('football', 'goals', 'Goals', 'Goals scored in official tournament matches.', 'integer', 'both'),
  ('football', 'assists', 'Assists', 'Assists recorded in official tournament matches.', 'integer', 'player'),
  ('football', 'appearances', 'Appearances', 'Matches played in this tournament.', 'integer', 'both'),
  ('cricket', 'runs', 'Runs', 'Runs scored in official tournament innings.', 'integer', 'both'),
  ('cricket', 'wickets', 'Wickets', 'Wickets taken in official tournament innings.', 'integer', 'both'),
  ('cricket', 'appearances', 'Appearances', 'Matches played in this tournament.', 'integer', 'both'),
  ('basketball', 'points', 'Points', 'Points scored in official tournament matches.', 'integer', 'both'),
  ('basketball', 'assists', 'Assists', 'Assists recorded in official tournament matches.', 'integer', 'player'),
  ('basketball', 'appearances', 'Appearances', 'Matches played in this tournament.', 'integer', 'both')
) AS definitions(sport_slug, stat_key, stat_name, description, data_type, applies_to)
JOIN sports sport ON sport.slug = definitions.sport_slug
ON CONFLICT (sport_id, stat_key) DO UPDATE SET
  stat_name = EXCLUDED.stat_name,
  description = EXCLUDED.description,
  data_type = EXCLUDED.data_type,
  is_cumulative = EXCLUDED.is_cumulative,
  applies_to = EXCLUDED.applies_to;

-- Create/update the three closed historical tournaments.
INSERT INTO tournaments (
  name, sport_id, organizer_user_id, format, participation_type,
  description, rules, banner_url, city, venue_details,
  min_teams, max_teams, registration_fee, prize_pool, prize_description,
  registration_opens_at, registration_closes_at, starts_at, ends_at, status,
  created_at, updated_at
)
SELECT demo.name, sport.id, organizer.id, 'round_robin', 'team',
       demo.description,
       'Historical demo record. Every listed match has a final score and player performance events.',
       demo.banner_url, demo.city, demo.venue_details,
       2, 2, 0, 0, 'Historical demo tournament',
       demo.registration_opens_at, demo.registration_closes_at,
       demo.starts_at, demo.ends_at, 'completed',
       demo.registration_opens_at - INTERVAL '1 day', demo.ends_at
FROM demo_past_tournament_data demo
JOIN sports sport ON sport.slug = demo.sport_slug
JOIN users organizer ON organizer.email = 'organizer@playsphere.local'
WHERE NOT EXISTS (
  SELECT 1 FROM tournaments existing
  WHERE existing.name = demo.name AND existing.organizer_user_id = organizer.id
);

UPDATE tournaments tournament
SET sport_id = sport.id,
    format = 'round_robin',
    participation_type = 'team',
    description = demo.description,
    rules = 'Historical demo record. Every listed match has a final score and player performance events.',
    banner_url = demo.banner_url,
    city = demo.city,
    venue_details = demo.venue_details,
    min_teams = 2,
    max_teams = 2,
    registration_fee = 0,
    prize_pool = 0,
    prize_description = 'Historical demo tournament',
    registration_opens_at = demo.registration_opens_at,
    registration_closes_at = demo.registration_closes_at,
    starts_at = demo.starts_at,
    ends_at = demo.ends_at,
    status = 'completed',
    created_at = demo.registration_opens_at - INTERVAL '1 day',
    updated_at = demo.ends_at
FROM demo_past_tournament_data demo
JOIN sports sport ON sport.slug = demo.sport_slug
JOIN users organizer ON organizer.email = 'organizer@playsphere.local'
WHERE tournament.name = demo.name
  AND tournament.organizer_user_id = organizer.id;

-- Preserve the complete lifecycle for each historical tournament.
INSERT INTO tournament_status_history
  (tournament_id, from_status, to_status, changed_by_user_id, reason, changed_at)
SELECT tournament.id, transition.from_status, transition.to_status,
       organizer.id, transition.reason, transition.changed_at
FROM demo_past_tournament_data demo
JOIN tournaments tournament ON tournament.name = demo.name
JOIN users organizer ON organizer.email = 'organizer@playsphere.local'
CROSS JOIN LATERAL (VALUES
  (NULL::tournament_status_type, 'registration_open'::tournament_status_type,
   'Historical demo registration opened.', demo.registration_opens_at),
  ('registration_open'::tournament_status_type, 'registration_closed'::tournament_status_type,
   'Historical demo registration closed.', demo.registration_closes_at),
  ('registration_closed'::tournament_status_type, 'in_progress'::tournament_status_type,
   'Historical demo tournament started.', demo.starts_at),
  ('in_progress'::tournament_status_type, 'completed'::tournament_status_type,
   'All historical demo fixtures were completed.', demo.ends_at)
) AS transition(from_status, to_status, reason, changed_at)
WHERE NOT EXISTS (
  SELECT 1 FROM tournament_status_history existing
  WHERE existing.tournament_id = tournament.id
    AND existing.to_status = transition.to_status
);

CREATE TEMP TABLE demo_past_team_pairs (
  tournament_name TEXT PRIMARY KEY,
  home_team_name TEXT NOT NULL,
  away_team_name TEXT NOT NULL
) ON COMMIT DROP;

INSERT INTO demo_past_team_pairs VALUES
  ('Bengaluru Football Legends Series', 'Demo Bengaluru United', 'Demo Eastside Rovers'),
  ('Monsoon Cricket Invitational', 'Demo Boundary Breakers XI', 'Demo Weekend Warriors XI'),
  ('South Bengaluru Hoops Cup', 'Demo Baseline Collective Entrants', 'Demo Court Kings');

INSERT INTO tournament_registrations (
  tournament_id, team_id, registered_by_user_id, status, eligibility_status,
  registration_name, notes, registered_at, reviewed_at, reviewed_by_user_id
)
SELECT tournament.id, team.id, team.manager_user_id, 'approved', 'approved', team.name,
       'Seeded approved entry for a completed demo tournament.',
       tournament.registration_opens_at + INTERVAL '2 days',
       tournament.registration_closes_at - INTERVAL '1 day', organizer.id
FROM demo_past_team_pairs pair
JOIN tournaments tournament ON tournament.name = pair.tournament_name
JOIN sports sport ON sport.id = tournament.sport_id
JOIN users organizer ON organizer.email = 'organizer@playsphere.local'
JOIN teams team ON team.name IN (pair.home_team_name, pair.away_team_name)
               AND team.sport_id = sport.id
WHERE NOT EXISTS (
  SELECT 1 FROM tournament_registrations existing
  WHERE existing.tournament_id = tournament.id
    AND existing.team_id = team.id
    AND existing.status IN ('pending', 'approved')
);

-- Freeze each approved team roster as it stood for the historical event.
INSERT INTO tournament_registration_players
  (registration_id, player_profile_id, is_captain, jersey_number)
SELECT registration.id, member.player_profile_id,
       member.team_role = 'captain', member.jersey_number
FROM demo_past_team_pairs pair
JOIN tournaments tournament ON tournament.name = pair.tournament_name
JOIN tournament_registrations registration ON registration.tournament_id = tournament.id
JOIN team_members member ON member.team_id = registration.team_id AND member.is_active = TRUE
WHERE registration.status = 'approved'
  AND NOT EXISTS (
    SELECT 1 FROM tournament_registration_players existing
    WHERE existing.registration_id = registration.id
      AND existing.player_profile_id = member.player_profile_id
  );

CREATE TEMP TABLE demo_past_results (
  tournament_name TEXT NOT NULL,
  round_number INT NOT NULL,
  match_number INT NOT NULL,
  home_team_name TEXT NOT NULL,
  away_team_name TEXT NOT NULL,
  scheduled_at TIMESTAMPTZ NOT NULL,
  home_score INT NOT NULL,
  away_score INT NOT NULL,
  home_result TEXT NOT NULL,
  away_result TEXT NOT NULL,
  result_summary JSONB NOT NULL,
  PRIMARY KEY (tournament_name, round_number, match_number)
) ON COMMIT DROP;

INSERT INTO demo_past_results VALUES
  ('Bengaluru Football Legends Series', 1, 1, 'Demo Bengaluru United', 'Demo Eastside Rovers', '2025-05-10 09:00:00+05:30', 3, 1, 'win', 'loss', '{"format":"2 x 45 minutes","halftime":{"home":2,"away":0}}'),
  ('Bengaluru Football Legends Series', 2, 2, 'Demo Eastside Rovers', 'Demo Bengaluru United', '2025-05-11 09:00:00+05:30', 2, 2, 'draw', 'draw', '{"format":"2 x 45 minutes","halftime":{"home":1,"away":1}}'),
  ('Bengaluru Football Legends Series', 3, 3, 'Demo Bengaluru United', 'Demo Eastside Rovers', '2025-05-12 09:00:00+05:30', 1, 0, 'win', 'loss', '{"format":"2 x 45 minutes","halftime":{"home":1,"away":0}}'),
  ('Monsoon Cricket Invitational', 1, 1, 'Demo Boundary Breakers XI', 'Demo Weekend Warriors XI', '2025-06-14 09:00:00+05:30', 162, 150, 'win', 'loss', '{"format":"T20","innings":[{"runs":162,"wickets":7,"overs":"20.0"},{"runs":150,"wickets":9,"overs":"20.0"}]}'),
  ('Monsoon Cricket Invitational', 2, 2, 'Demo Weekend Warriors XI', 'Demo Boundary Breakers XI', '2025-06-15 09:00:00+05:30', 174, 168, 'win', 'loss', '{"format":"T20","innings":[{"runs":174,"wickets":6,"overs":"20.0"},{"runs":168,"wickets":8,"overs":"20.0"}]}'),
  ('Monsoon Cricket Invitational', 3, 3, 'Demo Boundary Breakers XI', 'Demo Weekend Warriors XI', '2025-06-16 09:00:00+05:30', 155, 149, 'win', 'loss', '{"format":"T20","innings":[{"runs":155,"wickets":8,"overs":"20.0"},{"runs":149,"wickets":9,"overs":"20.0"}]}'),
  ('South Bengaluru Hoops Cup', 1, 1, 'Demo Baseline Collective Entrants', 'Demo Court Kings', '2025-08-02 09:00:00+05:30', 78, 70, 'win', 'loss', '{"format":"4 x 10 minutes","home_quarters":[20,18,21,19],"away_quarters":[17,17,18,18]}'),
  ('South Bengaluru Hoops Cup', 2, 2, 'Demo Court Kings', 'Demo Baseline Collective Entrants', '2025-08-03 09:00:00+05:30', 76, 72, 'win', 'loss', '{"format":"4 x 10 minutes","home_quarters":[18,20,19,19],"away_quarters":[18,17,20,17]}'),
  ('South Bengaluru Hoops Cup', 3, 3, 'Demo Baseline Collective Entrants', 'Demo Court Kings', '2025-08-04 09:00:00+05:30', 81, 76, 'win', 'loss', '{"format":"4 x 10 minutes","home_quarters":[22,20,19,20],"away_quarters":[18,19,20,19]}');

-- Seed the three complete round-robin schedules.
INSERT INTO fixtures (
  tournament_id, round_number, round_name, match_number, scheduled_at,
  scheduled_end_at, status, notes, stage, home_registration_id,
  away_registration_id, winner_registration_id
)
SELECT tournament.id, result.round_number, 'Round ' || result.round_number,
       result.match_number, result.scheduled_at,
       result.scheduled_at + CASE tournament.name
         WHEN 'Monsoon Cricket Invitational' THEN INTERVAL '4 hours'
         WHEN 'South Bengaluru Hoops Cup' THEN INTERVAL '2 hours'
         ELSE INTERVAL '90 minutes'
       END,
       'completed', 'Historical demo fixture with an official final score.', 'round_robin',
       home_registration.id, away_registration.id,
       CASE WHEN result.home_result = 'win' THEN home_registration.id
            WHEN result.away_result = 'win' THEN away_registration.id
            ELSE NULL END
FROM demo_past_results result
JOIN tournaments tournament ON tournament.name = result.tournament_name
JOIN teams home_team ON home_team.name = result.home_team_name
JOIN tournament_registrations home_registration
  ON home_registration.tournament_id = tournament.id AND home_registration.team_id = home_team.id
JOIN teams away_team ON away_team.name = result.away_team_name
JOIN tournament_registrations away_registration
  ON away_registration.tournament_id = tournament.id AND away_registration.team_id = away_team.id
WHERE NOT EXISTS (
  SELECT 1 FROM fixtures existing
  WHERE existing.tournament_id = tournament.id
    AND existing.round_number = result.round_number
    AND existing.match_number = result.match_number
);

UPDATE fixtures fixture
SET round_name = 'Round ' || result.round_number,
    scheduled_at = result.scheduled_at,
    scheduled_end_at = result.scheduled_at + CASE tournament.name
      WHEN 'Monsoon Cricket Invitational' THEN INTERVAL '4 hours'
      WHEN 'South Bengaluru Hoops Cup' THEN INTERVAL '2 hours'
      ELSE INTERVAL '90 minutes'
    END,
    status = 'completed',
    winner_registration_id = CASE
      WHEN result.home_result = 'win' THEN fixture.home_registration_id
      WHEN result.away_result = 'win' THEN fixture.away_registration_id
      ELSE NULL
    END
FROM demo_past_results result
JOIN tournaments tournament ON tournament.name = result.tournament_name
WHERE fixture.tournament_id = tournament.id
  AND fixture.round_number = result.round_number
  AND fixture.match_number = result.match_number;

-- Create completed official match records linked to those fixtures.
INSERT INTO matches (
  fixture_id, tournament_id, sport_id, scheduled_at, scheduled_end_at,
  started_at, ended_at, status, result_summary, winner_registration_id,
  recorded_by_user_id, notes
)
SELECT fixture.id, tournament.id, tournament.sport_id,
       fixture.scheduled_at, fixture.scheduled_end_at,
       fixture.scheduled_at, fixture.scheduled_end_at, 'completed', result.result_summary,
       fixture.winner_registration_id, organizer.id,
       'Completed seeded demo match; scores and event statistics are available.'
FROM demo_past_results result
JOIN tournaments tournament ON tournament.name = result.tournament_name
JOIN fixtures fixture ON fixture.tournament_id = tournament.id
                      AND fixture.round_number = result.round_number
                      AND fixture.match_number = result.match_number
JOIN users organizer ON organizer.email = 'organizer@playsphere.local'
WHERE NOT EXISTS (SELECT 1 FROM matches existing WHERE existing.fixture_id = fixture.id);

UPDATE matches game_match
SET scheduled_at = fixture.scheduled_at,
    scheduled_end_at = fixture.scheduled_end_at,
    started_at = fixture.scheduled_at,
    ended_at = fixture.scheduled_end_at,
    status = 'completed',
    result_summary = result.result_summary,
    winner_registration_id = fixture.winner_registration_id,
    notes = 'Completed seeded demo match; scores and event statistics are available.'
FROM fixtures fixture
JOIN tournaments tournament ON tournament.id = fixture.tournament_id
JOIN demo_past_results result ON result.tournament_name = tournament.name
                              AND result.round_number = fixture.round_number
                              AND result.match_number = fixture.match_number
WHERE game_match.fixture_id = fixture.id;

-- Save both final scores and results on the home and away match participants.
INSERT INTO match_participants (match_id, registration_id, team_id, side, score, result)
SELECT game_match.id, registration.id, registration.team_id, participant.side,
       jsonb_build_object('numeric', participant.score), participant.result
FROM demo_past_results result
JOIN tournaments tournament ON tournament.name = result.tournament_name
JOIN fixtures fixture ON fixture.tournament_id = tournament.id
                      AND fixture.round_number = result.round_number
                      AND fixture.match_number = result.match_number
JOIN matches game_match ON game_match.fixture_id = fixture.id
CROSS JOIN LATERAL (VALUES
  (result.home_team_name, 'home'::VARCHAR(10), result.home_score, result.home_result),
  (result.away_team_name, 'away'::VARCHAR(10), result.away_score, result.away_result)
) AS participant(team_name, side, score, result)
JOIN teams team ON team.name = participant.team_name
JOIN tournament_registrations registration
  ON registration.tournament_id = tournament.id AND registration.team_id = team.id
WHERE NOT EXISTS (
  SELECT 1 FROM match_participants existing
  WHERE existing.match_id = game_match.id AND existing.side = participant.side
);

-- Performance-event input. Entries are aggregated per player/stat/match so the
-- event timeline stays legible while the tournament statistics remain complete.
CREATE TEMP TABLE demo_event_rows (
  demo_key TEXT PRIMARY KEY,
  tournament_name TEXT NOT NULL,
  round_number INT NOT NULL,
  stat_key TEXT NOT NULL,
  team_name TEXT NOT NULL,
  player_name TEXT NOT NULL,
  value NUMERIC NOT NULL,
  event_time_seconds INT NOT NULL
) ON COMMIT DROP;

-- Every registered player receives an appearance record for each match.
INSERT INTO demo_event_rows
  (demo_key, tournament_name, round_number, stat_key, team_name, player_name, value, event_time_seconds)
SELECT 'appearance:' || tournament.name || ':' || fixture.round_number || ':' || fixture.match_number || ':' || member.player_profile_id,
       tournament.name, fixture.round_number, 'appearances', team.name,
       profile.display_name, 1, 0
FROM demo_past_team_pairs pair
JOIN tournaments tournament ON tournament.name = pair.tournament_name
JOIN fixtures fixture ON fixture.tournament_id = tournament.id
JOIN matches game_match ON game_match.fixture_id = fixture.id
JOIN tournament_registrations registration ON registration.tournament_id = tournament.id
JOIN teams team ON team.id = registration.team_id
JOIN tournament_registration_players member ON member.registration_id = registration.id
JOIN player_profiles profile ON profile.id = member.player_profile_id
WHERE registration.status = 'approved';

-- Football: individual goals and assists; goal totals match the three scorelines.
INSERT INTO demo_event_rows VALUES
  ('football:1:goals:Aarav', 'Bengaluru Football Legends Series', 1, 'goals', 'Demo Bengaluru United', 'Aarav Menon', 2, 1800),
  ('football:1:goals:Ishaan', 'Bengaluru Football Legends Series', 1, 'goals', 'Demo Bengaluru United', 'Ishaan Rao', 1, 3100),
  ('football:1:goals:Dev', 'Bengaluru Football Legends Series', 1, 'goals', 'Demo Eastside Rovers', 'Dev Patel', 1, 4100),
  ('football:2:goals:Ayaan', 'Bengaluru Football Legends Series', 2, 'goals', 'Demo Eastside Rovers', 'Ayaan Kapoor', 1, 1400),
  ('football:2:goals:Karthik', 'Bengaluru Football Legends Series', 2, 'goals', 'Demo Eastside Rovers', 'Karthik Reddy', 1, 3500),
  ('football:2:goals:Kabir', 'Bengaluru Football Legends Series', 2, 'goals', 'Demo Bengaluru United', 'Kabir Nair', 1, 2100),
  ('football:2:goals:Vihaan', 'Bengaluru Football Legends Series', 2, 'goals', 'Demo Bengaluru United', 'Vihaan Iyer', 1, 4400),
  ('football:3:goals:Arjun', 'Bengaluru Football Legends Series', 3, 'goals', 'Demo Bengaluru United', 'Arjun Kulkarni', 1, 2700),
  ('football:1:assists:Aarav', 'Bengaluru Football Legends Series', 1, 'assists', 'Demo Bengaluru United', 'Rohan Desai', 1, 1800),
  ('football:1:assists:Ishaan', 'Bengaluru Football Legends Series', 1, 'assists', 'Demo Bengaluru United', 'Aditya Shah', 1, 3100),
  ('football:1:assists:Dev', 'Bengaluru Football Legends Series', 1, 'assists', 'Demo Eastside Rovers', 'Reyansh Mehta', 1, 4100),
  ('football:2:assists:Ayaan', 'Bengaluru Football Legends Series', 2, 'assists', 'Demo Eastside Rovers', 'Neel Verma', 1, 1400),
  ('football:2:assists:Kabir', 'Bengaluru Football Legends Series', 2, 'assists', 'Demo Bengaluru United', 'Ishaan Rao', 1, 2100),
  ('football:3:assists:Arjun', 'Bengaluru Football Legends Series', 3, 'assists', 'Demo Bengaluru United', 'Kabir Nair', 1, 2700);

-- Cricket: runs add exactly to each innings total; bowlers receive the recorded wickets.
INSERT INTO demo_event_rows VALUES
  ('cricket:1:runs:Sahil', 'Monsoon Cricket Invitational', 1, 'runs', 'Demo Boundary Breakers XI', 'Sahil Sharma', 68, 4100),
  ('cricket:1:runs:Yash', 'Monsoon Cricket Invitational', 1, 'runs', 'Demo Boundary Breakers XI', 'Yash Malhotra', 50, 3600),
  ('cricket:1:runs:Nikhil', 'Monsoon Cricket Invitational', 1, 'runs', 'Demo Boundary Breakers XI', 'Nikhil Bose', 44, 2800),
  ('cricket:1:runs:Anaya', 'Monsoon Cricket Invitational', 1, 'runs', 'Demo Weekend Warriors XI', 'Anaya Rao', 55, 4200),
  ('cricket:1:runs:Riya', 'Monsoon Cricket Invitational', 1, 'runs', 'Demo Weekend Warriors XI', 'Riya Nair', 51, 3400),
  ('cricket:1:runs:Meera', 'Monsoon Cricket Invitational', 1, 'runs', 'Demo Weekend Warriors XI', 'Meera Joshi', 44, 2500),
  ('cricket:2:runs:Zoya', 'Monsoon Cricket Invitational', 2, 'runs', 'Demo Weekend Warriors XI', 'Zoya Menon', 72, 4300),
  ('cricket:2:runs:Kavya', 'Monsoon Cricket Invitational', 2, 'runs', 'Demo Weekend Warriors XI', 'Kavya Kulkarni', 61, 3700),
  ('cricket:2:runs:Tanvi', 'Monsoon Cricket Invitational', 2, 'runs', 'Demo Weekend Warriors XI', 'Tanvi Das', 41, 2700),
  ('cricket:2:runs:Pranav', 'Monsoon Cricket Invitational', 2, 'runs', 'Demo Boundary Breakers XI', 'Pranav Gupta', 66, 4200),
  ('cricket:2:runs:Harsh', 'Monsoon Cricket Invitational', 2, 'runs', 'Demo Boundary Breakers XI', 'Harsh Venkatesh', 55, 3500),
  ('cricket:2:runs:Omar', 'Monsoon Cricket Invitational', 2, 'runs', 'Demo Boundary Breakers XI', 'Omar Khan', 47, 2800),
  ('cricket:3:runs:Dhruv', 'Monsoon Cricket Invitational', 3, 'runs', 'Demo Boundary Breakers XI', 'Dhruv Sinha', 62, 4200),
  ('cricket:3:runs:Sahil', 'Monsoon Cricket Invitational', 3, 'runs', 'Demo Boundary Breakers XI', 'Sahil Sharma', 51, 3500),
  ('cricket:3:runs:Yash', 'Monsoon Cricket Invitational', 3, 'runs', 'Demo Boundary Breakers XI', 'Yash Malhotra', 42, 2600),
  ('cricket:3:runs:Ira', 'Monsoon Cricket Invitational', 3, 'runs', 'Demo Weekend Warriors XI', 'Ira Kapoor', 59, 4100),
  ('cricket:3:runs:Anaya', 'Monsoon Cricket Invitational', 3, 'runs', 'Demo Weekend Warriors XI', 'Anaya Rao', 48, 3300),
  ('cricket:3:runs:Riya', 'Monsoon Cricket Invitational', 3, 'runs', 'Demo Weekend Warriors XI', 'Riya Nair', 42, 2500),
  ('cricket:1:wickets:Sahil', 'Monsoon Cricket Invitational', 1, 'wickets', 'Demo Boundary Breakers XI', 'Sahil Sharma', 3, 4900),
  ('cricket:1:wickets:Pranav', 'Monsoon Cricket Invitational', 1, 'wickets', 'Demo Boundary Breakers XI', 'Pranav Gupta', 3, 5200),
  ('cricket:1:wickets:Harsh', 'Monsoon Cricket Invitational', 1, 'wickets', 'Demo Boundary Breakers XI', 'Harsh Venkatesh', 3, 5600),
  ('cricket:1:wickets:Anaya', 'Monsoon Cricket Invitational', 1, 'wickets', 'Demo Weekend Warriors XI', 'Anaya Rao', 3, 4800),
  ('cricket:1:wickets:Kavya', 'Monsoon Cricket Invitational', 1, 'wickets', 'Demo Weekend Warriors XI', 'Kavya Kulkarni', 2, 5300),
  ('cricket:1:wickets:Ira', 'Monsoon Cricket Invitational', 1, 'wickets', 'Demo Weekend Warriors XI', 'Ira Kapoor', 2, 5700),
  ('cricket:2:wickets:Zoya', 'Monsoon Cricket Invitational', 2, 'wickets', 'Demo Weekend Warriors XI', 'Zoya Menon', 3, 4800),
  ('cricket:2:wickets:Meera', 'Monsoon Cricket Invitational', 2, 'wickets', 'Demo Weekend Warriors XI', 'Meera Joshi', 3, 5200),
  ('cricket:2:wickets:Tanvi', 'Monsoon Cricket Invitational', 2, 'wickets', 'Demo Weekend Warriors XI', 'Tanvi Das', 2, 5700),
  ('cricket:2:wickets:Yash', 'Monsoon Cricket Invitational', 2, 'wickets', 'Demo Boundary Breakers XI', 'Yash Malhotra', 2, 4900),
  ('cricket:2:wickets:Nikhil', 'Monsoon Cricket Invitational', 2, 'wickets', 'Demo Boundary Breakers XI', 'Nikhil Bose', 2, 5300),
  ('cricket:2:wickets:Omar', 'Monsoon Cricket Invitational', 2, 'wickets', 'Demo Boundary Breakers XI', 'Omar Khan', 2, 5800),
  ('cricket:3:wickets:Pranav', 'Monsoon Cricket Invitational', 3, 'wickets', 'Demo Boundary Breakers XI', 'Pranav Gupta', 3, 4900),
  ('cricket:3:wickets:Harsh', 'Monsoon Cricket Invitational', 3, 'wickets', 'Demo Boundary Breakers XI', 'Harsh Venkatesh', 3, 5300),
  ('cricket:3:wickets:Dhruv', 'Monsoon Cricket Invitational', 3, 'wickets', 'Demo Boundary Breakers XI', 'Dhruv Sinha', 3, 5800),
  ('cricket:3:wickets:Riya', 'Monsoon Cricket Invitational', 3, 'wickets', 'Demo Weekend Warriors XI', 'Riya Nair', 3, 4900),
  ('cricket:3:wickets:Kavya', 'Monsoon Cricket Invitational', 3, 'wickets', 'Demo Weekend Warriors XI', 'Kavya Kulkarni', 3, 5300),
  ('cricket:3:wickets:Ira', 'Monsoon Cricket Invitational', 3, 'wickets', 'Demo Weekend Warriors XI', 'Ira Kapoor', 2, 5800),
  ('basketball:1:points:Aarohi', 'South Bengaluru Hoops Cup', 1, 'points', 'Demo Baseline Collective Entrants', 'Aarohi Shah', 28, 1800),
  ('basketball:1:points:Myra', 'South Bengaluru Hoops Cup', 1, 'points', 'Demo Baseline Collective Entrants', 'Myra Patel', 26, 2100),
  ('basketball:1:points:Diya', 'South Bengaluru Hoops Cup', 1, 'points', 'Demo Baseline Collective Entrants', 'Diya Shetty', 24, 2400),
  ('basketball:1:points:Simran', 'South Bengaluru Hoops Cup', 1, 'points', 'Demo Court Kings', 'Simran Kaur', 26, 1900),
  ('basketball:1:points:Nisha', 'South Bengaluru Hoops Cup', 1, 'points', 'Demo Court Kings', 'Nisha Bansal', 23, 2200),
  ('basketball:1:points:Tara', 'South Bengaluru Hoops Cup', 1, 'points', 'Demo Court Kings', 'Tara Sen', 21, 2500),
  ('basketball:2:points:Simran', 'South Bengaluru Hoops Cup', 2, 'points', 'Demo Court Kings', 'Simran Kaur', 29, 1800),
  ('basketball:2:points:Nisha', 'South Bengaluru Hoops Cup', 2, 'points', 'Demo Court Kings', 'Nisha Bansal', 25, 2100),
  ('basketball:2:points:Tara', 'South Bengaluru Hoops Cup', 2, 'points', 'Demo Court Kings', 'Tara Sen', 22, 2400),
  ('basketball:2:points:Aarohi', 'South Bengaluru Hoops Cup', 2, 'points', 'Demo Baseline Collective Entrants', 'Aarohi Shah', 26, 1900),
  ('basketball:2:points:Myra', 'South Bengaluru Hoops Cup', 2, 'points', 'Demo Baseline Collective Entrants', 'Myra Patel', 24, 2200),
  ('basketball:2:points:Diya', 'South Bengaluru Hoops Cup', 2, 'points', 'Demo Baseline Collective Entrants', 'Diya Shetty', 22, 2500),
  ('basketball:3:points:Aarohi', 'South Bengaluru Hoops Cup', 3, 'points', 'Demo Baseline Collective Entrants', 'Aarohi Shah', 31, 1800),
  ('basketball:3:points:Myra', 'South Bengaluru Hoops Cup', 3, 'points', 'Demo Baseline Collective Entrants', 'Myra Patel', 27, 2100),
  ('basketball:3:points:Diya', 'South Bengaluru Hoops Cup', 3, 'points', 'Demo Baseline Collective Entrants', 'Diya Shetty', 23, 2400),
  ('basketball:3:points:Simran', 'South Bengaluru Hoops Cup', 3, 'points', 'Demo Court Kings', 'Simran Kaur', 30, 1900),
  ('basketball:3:points:Nisha', 'South Bengaluru Hoops Cup', 3, 'points', 'Demo Court Kings', 'Nisha Bansal', 25, 2200),
  ('basketball:3:points:Tara', 'South Bengaluru Hoops Cup', 3, 'points', 'Demo Court Kings', 'Tara Sen', 21, 2500),
  ('basketball:1:assists:Aarohi', 'South Bengaluru Hoops Cup', 1, 'assists', 'Demo Baseline Collective Entrants', 'Aarohi Shah', 6, 1800),
  ('basketball:1:assists:Myra', 'South Bengaluru Hoops Cup', 1, 'assists', 'Demo Baseline Collective Entrants', 'Myra Patel', 5, 2100),
  ('basketball:1:assists:Diya', 'South Bengaluru Hoops Cup', 1, 'assists', 'Demo Baseline Collective Entrants', 'Diya Shetty', 4, 2400),
  ('basketball:1:assists:Simran', 'South Bengaluru Hoops Cup', 1, 'assists', 'Demo Court Kings', 'Simran Kaur', 5, 1900),
  ('basketball:1:assists:Nisha', 'South Bengaluru Hoops Cup', 1, 'assists', 'Demo Court Kings', 'Nisha Bansal', 4, 2200),
  ('basketball:1:assists:Tara', 'South Bengaluru Hoops Cup', 1, 'assists', 'Demo Court Kings', 'Tara Sen', 3, 2500),
  ('basketball:2:assists:Simran', 'South Bengaluru Hoops Cup', 2, 'assists', 'Demo Court Kings', 'Simran Kaur', 7, 1800),
  ('basketball:2:assists:Nisha', 'South Bengaluru Hoops Cup', 2, 'assists', 'Demo Court Kings', 'Nisha Bansal', 5, 2100),
  ('basketball:2:assists:Tara', 'South Bengaluru Hoops Cup', 2, 'assists', 'Demo Court Kings', 'Tara Sen', 4, 2400),
  ('basketball:2:assists:Aarohi', 'South Bengaluru Hoops Cup', 2, 'assists', 'Demo Baseline Collective Entrants', 'Aarohi Shah', 6, 1900),
  ('basketball:2:assists:Myra', 'South Bengaluru Hoops Cup', 2, 'assists', 'Demo Baseline Collective Entrants', 'Myra Patel', 4, 2200),
  ('basketball:2:assists:Diya', 'South Bengaluru Hoops Cup', 2, 'assists', 'Demo Baseline Collective Entrants', 'Diya Shetty', 4, 2500),
  ('basketball:3:assists:Aarohi', 'South Bengaluru Hoops Cup', 3, 'assists', 'Demo Baseline Collective Entrants', 'Aarohi Shah', 8, 1800),
  ('basketball:3:assists:Myra', 'South Bengaluru Hoops Cup', 3, 'assists', 'Demo Baseline Collective Entrants', 'Myra Patel', 5, 2100),
  ('basketball:3:assists:Diya', 'South Bengaluru Hoops Cup', 3, 'assists', 'Demo Baseline Collective Entrants', 'Diya Shetty', 5, 2400),
  ('basketball:3:assists:Simran', 'South Bengaluru Hoops Cup', 3, 'assists', 'Demo Court Kings', 'Simran Kaur', 7, 1900),
  ('basketball:3:assists:Nisha', 'South Bengaluru Hoops Cup', 3, 'assists', 'Demo Court Kings', 'Nisha Bansal', 5, 2200),
  ('basketball:3:assists:Tara', 'South Bengaluru Hoops Cup', 3, 'assists', 'Demo Court Kings', 'Tara Sen', 4, 2500);

-- Insert one official performance event per player/stat/match and attach the
-- corresponding demo player/team. Stable metadata keys make reruns harmless.
INSERT INTO performance_events (
  match_id, sport_stat_definition_id, event_time_seconds, event_metadata,
  recorded_by_user_id, recorded_at, created_at
)
SELECT game_match.id, definition.id, event.event_time_seconds,
       jsonb_build_object('demo_seed_key', event.demo_key, 'source', 'local_demo_seed'),
       organizer.id, game_match.scheduled_at + event.event_time_seconds * INTERVAL '1 second',
       game_match.scheduled_at + event.event_time_seconds * INTERVAL '1 second'
FROM demo_event_rows event
JOIN tournaments tournament ON tournament.name = event.tournament_name
JOIN fixtures fixture ON fixture.tournament_id = tournament.id AND fixture.round_number = event.round_number
JOIN matches game_match ON game_match.fixture_id = fixture.id
JOIN sports sport ON sport.id = tournament.sport_id
JOIN sport_stat_definitions definition ON definition.sport_id = sport.id AND definition.stat_key = event.stat_key
JOIN users organizer ON organizer.email = 'organizer@playsphere.local'
WHERE NOT EXISTS (
  SELECT 1 FROM performance_events existing
  WHERE existing.match_id = game_match.id
    AND existing.event_metadata->>'demo_seed_key' = event.demo_key
);

INSERT INTO performance_event_players (performance_event_id, player_profile_id, team_id, value)
SELECT performance_event.id, profile.id, team.id, event.value
FROM demo_event_rows event
JOIN tournaments tournament ON tournament.name = event.tournament_name
JOIN fixtures fixture ON fixture.tournament_id = tournament.id AND fixture.round_number = event.round_number
JOIN matches game_match ON game_match.fixture_id = fixture.id
JOIN performance_events performance_event
  ON performance_event.match_id = game_match.id
 AND performance_event.event_metadata->>'demo_seed_key' = event.demo_key
JOIN teams team ON team.name = event.team_name
JOIN player_profiles profile ON profile.display_name = event.player_name
JOIN team_members member ON member.team_id = team.id
                         AND member.player_profile_id = profile.id
                         AND member.is_active = TRUE
ON CONFLICT (performance_event_id, player_profile_id)
DO UPDATE SET team_id = EXCLUDED.team_id, value = EXCLUDED.value;

-- Leaderboards render the seeded individual and team tournament statistics.
INSERT INTO leaderboards
  (name, sport_id, tournament_id, leaderboard_type, stat_key, is_active, computed_at)
SELECT boards.name, tournament.sport_id, tournament.id, boards.leaderboard_type,
       boards.stat_key, TRUE, tournament.ends_at
FROM (VALUES
  ('Bengaluru Football Legends Series', 'Golden Boot', 'player', 'goals'),
  ('Bengaluru Football Legends Series', 'Playmakers', 'player', 'assists'),
  ('Bengaluru Football Legends Series', 'Team Goals', 'team', 'goals'),
  ('Monsoon Cricket Invitational', 'Most Runs', 'player', 'runs'),
  ('Monsoon Cricket Invitational', 'Most Wickets', 'player', 'wickets'),
  ('Monsoon Cricket Invitational', 'Team Runs', 'team', 'runs'),
  ('South Bengaluru Hoops Cup', 'Top Scorers', 'player', 'points'),
  ('South Bengaluru Hoops Cup', 'Assists Leaders', 'player', 'assists'),
  ('South Bengaluru Hoops Cup', 'Team Points', 'team', 'points')
) AS boards(tournament_name, name, leaderboard_type, stat_key)
JOIN tournaments tournament ON tournament.name = boards.tournament_name
WHERE NOT EXISTS (
  SELECT 1 FROM leaderboards existing
  WHERE existing.tournament_id = tournament.id AND existing.name = boards.name
);

COMMIT;
