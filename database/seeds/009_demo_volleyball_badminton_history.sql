-- =============================================================================
-- PlaySphere — Seed 009: Completed Tournament History for Volleyball & Badminton
-- Mirrors seed 006 so that Volleyball and Badminton have full completed fixtures,
-- matches, performance events, leaderboards, and derived statistics.
-- =============================================================================

BEGIN;

CREATE TEMP TABLE demo_past_vb_bd_tournaments (
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

INSERT INTO demo_past_vb_bd_tournaments VALUES
  (
    'Bengaluru Volleyball Championship', 'volleyball',
    'Completed three-match premier volleyball tournament featuring top local clubs with set scores, spike points, aces, blocks, and digs.',
    '/images/demo/tournament-posters/spike-city-volleyball-cup.svg', 'Bengaluru', 'Kanteerava Indoor Stadium',
    '2025-07-01 09:00:00+05:30', '2025-08-15 20:00:00+05:30',
    '2025-08-18 09:00:00+05:30', '2025-08-20 18:00:00+05:30'
  ),
  (
    'Karnataka Badminton Masters', 'badminton',
    'Completed three-match doubles championship showcasing high-intensity rallies, smashes, net play, and aces.',
    '/images/demo/tournament-posters/badminton-doubles-open.svg', 'Bengaluru', 'Padukone-Dravid Centre for Sports',
    '2025-08-01 09:00:00+05:30', '2025-09-10 20:00:00+05:30',
    '2025-09-12 09:00:00+05:30', '2025-09-14 18:00:00+05:30'
  );

-- Insert completed tournaments
INSERT INTO tournaments (
  name, sport_id, organizer_user_id, format, participation_type,
  description, rules, banner_url, city, venue_details,
  min_teams, max_teams, registration_fee, prize_pool, prize_description,
  registration_opens_at, registration_closes_at, starts_at, ends_at, status,
  created_at, updated_at
)
SELECT demo.name, sport.id, organizer.id, 'round_robin', 'team',
       demo.description,
       'Official completed tournament record with comprehensive performance statistics.',
       demo.banner_url, demo.city, demo.venue_details,
       2, 2, 0, 10000, 'Trophy + Medals',
       demo.registration_opens_at, demo.registration_closes_at,
       demo.starts_at, demo.ends_at, 'completed',
       demo.registration_opens_at - INTERVAL '1 day', demo.ends_at
FROM demo_past_vb_bd_tournaments demo
JOIN sports sport ON sport.slug = demo.sport_slug
JOIN users organizer ON organizer.email = 'organizer@playsphere.local'
WHERE NOT EXISTS (
  SELECT 1 FROM tournaments existing
  WHERE existing.name = demo.name AND existing.organizer_user_id = organizer.id
);

-- Status history
INSERT INTO tournament_status_history
  (tournament_id, from_status, to_status, changed_by_user_id, reason, changed_at)
SELECT tournament.id, transition.from_status, transition.to_status,
       organizer.id, transition.reason, transition.changed_at
FROM demo_past_vb_bd_tournaments demo
JOIN tournaments tournament ON tournament.name = demo.name
JOIN users organizer ON organizer.email = 'organizer@playsphere.local'
CROSS JOIN LATERAL (VALUES
  (NULL::tournament_status_type, 'registration_open'::tournament_status_type, 'Demo registration opened.', demo.registration_opens_at),
  ('registration_open'::tournament_status_type, 'registration_closed'::tournament_status_type, 'Demo registration closed.', demo.registration_closes_at),
  ('registration_closed'::tournament_status_type, 'in_progress'::tournament_status_type, 'Tournament started.', demo.starts_at),
  ('in_progress'::tournament_status_type, 'completed'::tournament_status_type, 'Tournament concluded.', demo.ends_at)
) AS transition(from_status, to_status, reason, changed_at)
WHERE NOT EXISTS (
  SELECT 1 FROM tournament_status_history existing
  WHERE existing.tournament_id = tournament.id
    AND existing.to_status = transition.to_status
);

-- Teams participating in historical events
CREATE TEMP TABLE demo_past_vb_bd_pairs (
  tournament_name TEXT PRIMARY KEY,
  home_team_name TEXT NOT NULL,
  away_team_name TEXT NOT NULL
) ON COMMIT DROP;

INSERT INTO demo_past_vb_bd_pairs VALUES
  ('Bengaluru Volleyball Championship', 'Demo Spike City', 'Demo Skyline Setters'),
  ('Karnataka Badminton Masters', 'Demo Shuttle Squad Entrants', 'Demo Rally Racquets');

-- Register teams (using distinct team to prevent duplicates)
INSERT INTO tournament_registrations (
  tournament_id, team_id, registered_by_user_id, status, eligibility_status,
  registration_name, notes, registered_at, reviewed_at, reviewed_by_user_id
)
SELECT tournament.id, team.id, team.manager_user_id, 'approved', 'approved', team.name,
       'Seeded entry for completed tournament.',
       tournament.registration_opens_at + INTERVAL '2 days',
       tournament.registration_closes_at - INTERVAL '1 day', organizer.id
FROM demo_past_vb_bd_pairs pair
JOIN tournaments tournament ON tournament.name = pair.tournament_name
JOIN sports sport ON sport.id = tournament.sport_id
JOIN users organizer ON organizer.email = 'organizer@playsphere.local'
JOIN LATERAL (
  SELECT DISTINCT ON (name) id, name, manager_user_id
  FROM teams
  WHERE name IN (pair.home_team_name, pair.away_team_name) AND sport_id = sport.id
  ORDER BY name, id
) team ON true
WHERE NOT EXISTS (
  SELECT 1 FROM tournament_registrations existing
  WHERE existing.tournament_id = tournament.id
    AND existing.team_id = team.id
    AND existing.status IN ('pending', 'approved')
);

-- Freeze registration players
INSERT INTO tournament_registration_players
  (registration_id, player_profile_id, is_captain, jersey_number)
SELECT registration.id, member.player_profile_id,
       member.team_role = 'captain', member.jersey_number
FROM demo_past_vb_bd_pairs pair
JOIN tournaments tournament ON tournament.name = pair.tournament_name
JOIN tournament_registrations registration ON registration.tournament_id = tournament.id
JOIN team_members member ON member.team_id = registration.team_id AND member.is_active = TRUE
WHERE registration.status = 'approved'
  AND NOT EXISTS (
    SELECT 1 FROM tournament_registration_players existing
    WHERE existing.registration_id = registration.id
      AND existing.player_profile_id = member.player_profile_id
  );

-- Match Results
CREATE TEMP TABLE demo_past_vb_bd_results (
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

INSERT INTO demo_past_vb_bd_results VALUES
  ('Bengaluru Volleyball Championship', 1, 1, 'Demo Spike City', 'Demo Skyline Setters', '2025-08-18 10:00:00+05:30', 3, 1, 'win', 'loss', '{"sets":[{"home":25,"away":21},{"home":22,"away":25},{"home":25,"away":19},{"home":25,"away":18}]}'),
  ('Bengaluru Volleyball Championship', 2, 2, 'Demo Skyline Setters', 'Demo Spike City', '2025-08-19 10:00:00+05:30', 3, 2, 'win', 'loss', '{"sets":[{"home":25,"away":23},{"home":20,"away":25},{"home":25,"away":22},{"home":18,"away":25},{"home":15,"away":12}]}'),
  ('Bengaluru Volleyball Championship', 3, 3, 'Demo Spike City', 'Demo Skyline Setters', '2025-08-20 10:00:00+05:30', 3, 0, 'win', 'loss', '{"sets":[{"home":25,"away":20},{"home":25,"away":22},{"home":25,"away":17}]}'),
  ('Karnataka Badminton Masters', 1, 1, 'Demo Shuttle Squad Entrants', 'Demo Rally Racquets', '2025-09-12 10:00:00+05:30', 2, 1, 'win', 'loss', '{"sets":[{"home":21,"away":18},{"home":19,"away":21},{"home":21,"away":16}]}'),
  ('Karnataka Badminton Masters', 2, 2, 'Demo Rally Racquets', 'Demo Shuttle Squad Entrants', '2025-09-13 10:00:00+05:30', 2, 0, 'win', 'loss', '{"sets":[{"home":21,"away":17},{"home":21,"away":19}]}'),
  ('Karnataka Badminton Masters', 3, 3, 'Demo Shuttle Squad Entrants', 'Demo Rally Racquets', '2025-09-14 10:00:00+05:30', 2, 1, 'win', 'loss', '{"sets":[{"home":21,"away":19},{"home":18,"away":21},{"home":22,"away":20}]}');

-- Fixtures
INSERT INTO fixtures (
  tournament_id, round_number, round_name, match_number, scheduled_at,
  scheduled_end_at, status, notes, stage, home_registration_id,
  away_registration_id, winner_registration_id
)
SELECT tournament.id, result.round_number, 'Match ' || result.round_number,
       result.match_number, result.scheduled_at,
       result.scheduled_at + INTERVAL '90 minutes',
       'completed', 'Completed tournament fixture with final scores.', 'round_robin',
       home_reg.id, away_reg.id,
       CASE WHEN result.home_result = 'win' THEN home_reg.id ELSE away_reg.id END
FROM demo_past_vb_bd_results result
JOIN tournaments tournament ON tournament.name = result.tournament_name
JOIN tournament_registrations home_reg ON home_reg.tournament_id = tournament.id AND home_reg.registration_name = result.home_team_name
JOIN tournament_registrations away_reg ON away_reg.tournament_id = tournament.id AND away_reg.registration_name = result.away_team_name
WHERE NOT EXISTS (
  SELECT 1 FROM fixtures existing
  WHERE existing.tournament_id = tournament.id
    AND existing.round_number = result.round_number
    AND existing.match_number = result.match_number
);

-- Official Matches
INSERT INTO matches (
  fixture_id, tournament_id, sport_id, scheduled_at, scheduled_end_at,
  started_at, ended_at, status, result_summary, winner_registration_id,
  recorded_by_user_id, notes
)
SELECT fixture.id, tournament.id, tournament.sport_id,
       fixture.scheduled_at, fixture.scheduled_end_at,
       fixture.scheduled_at, fixture.scheduled_end_at, 'completed', result.result_summary,
       fixture.winner_registration_id, organizer.id,
       'Official completed match with full player performance metrics.'
FROM demo_past_vb_bd_results result
JOIN tournaments tournament ON tournament.name = result.tournament_name
JOIN fixtures fixture ON fixture.tournament_id = tournament.id
                      AND fixture.round_number = result.round_number
                      AND fixture.match_number = result.match_number
JOIN users organizer ON organizer.email = 'organizer@playsphere.local'
WHERE NOT EXISTS (SELECT 1 FROM matches existing WHERE existing.fixture_id = fixture.id);

-- Match Participants
INSERT INTO match_participants (match_id, registration_id, team_id, side, score, result)
SELECT game_match.id, registration.id, registration.team_id, participant.side,
       jsonb_build_object('numeric', participant.score), participant.result
FROM demo_past_vb_bd_results result
JOIN tournaments tournament ON tournament.name = result.tournament_name
JOIN fixtures fixture ON fixture.tournament_id = tournament.id
                      AND fixture.round_number = result.round_number
                      AND fixture.match_number = result.match_number
JOIN matches game_match ON game_match.fixture_id = fixture.id
CROSS JOIN LATERAL (VALUES
  (result.home_team_name, 'home'::VARCHAR(10), result.home_score, result.home_result),
  (result.away_team_name, 'away'::VARCHAR(10), result.away_score, result.away_result)
) AS participant(team_name, side, score, result)
JOIN tournament_registrations registration
  ON registration.tournament_id = tournament.id AND registration.registration_name = participant.team_name
WHERE NOT EXISTS (
  SELECT 1 FROM match_participants existing
  WHERE existing.match_id = game_match.id AND existing.side = participant.side
);

-- Performance Events Temp Table
CREATE TEMP TABLE demo_vb_bd_events (
  demo_key TEXT PRIMARY KEY,
  tournament_name TEXT NOT NULL,
  round_number INT NOT NULL,
  stat_key TEXT NOT NULL,
  team_name TEXT NOT NULL,
  player_name TEXT NOT NULL,
  value NUMERIC NOT NULL,
  event_time_seconds INT NOT NULL
) ON COMMIT DROP;

-- Appearances for Volleyball & Badminton
INSERT INTO demo_vb_bd_events (demo_key, tournament_name, round_number, stat_key, team_name, player_name, value, event_time_seconds)
SELECT 'app:' || tournament.name || ':' || fixture.round_number || ':' || member.player_profile_id,
       tournament.name, fixture.round_number, 'appearances', registration.registration_name,
       profile.display_name, 1, 0
FROM demo_past_vb_bd_pairs pair
JOIN tournaments tournament ON tournament.name = pair.tournament_name
JOIN fixtures fixture ON fixture.tournament_id = tournament.id
JOIN tournament_registrations registration ON registration.tournament_id = tournament.id
JOIN tournament_registration_players member ON member.registration_id = registration.id
JOIN player_profiles profile ON profile.id = member.player_profile_id
WHERE registration.status = 'approved';

-- Volleyball Performance Stats: points, aces, blocks, digs, assists
INSERT INTO demo_vb_bd_events VALUES
  -- Match 1
  ('vb:m1:pts:aarav',   'Bengaluru Volleyball Championship', 1, 'points', 'Demo Spike City',      'Aarav Sood',       22, 1800),
  ('vb:m1:pts:mihir',   'Bengaluru Volleyball Championship', 1, 'points', 'Demo Spike City',      'Mihir Rao',        18, 2200),
  ('vb:m1:pts:sahil',   'Bengaluru Volleyball Championship', 1, 'points', 'Demo Spike City',      'Sahil Nair',       14, 2600),
  ('vb:m1:pts:aisha',   'Bengaluru Volleyball Championship', 1, 'points', 'Demo Skyline Setters', 'Aisha Khan',      20, 1900),
  ('vb:m1:pts:radhika', 'Bengaluru Volleyball Championship', 1, 'points', 'Demo Skyline Setters', 'Radhika Bose',    16, 2300),
  ('vb:m1:aces:aarav',  'Bengaluru Volleyball Championship', 1, 'aces',   'Demo Spike City',      'Aarav Sood',        5, 1400),
  ('vb:m1:aces:aisha',  'Bengaluru Volleyball Championship', 1, 'aces',   'Demo Skyline Setters', 'Aisha Khan',       4, 1500),
  ('vb:m1:blk:kushal',  'Bengaluru Volleyball Championship', 1, 'blocks', 'Demo Spike City',      'Kushal Das',        6, 2000),
  ('vb:m1:blk:isha',    'Bengaluru Volleyball Championship', 1, 'blocks', 'Demo Skyline Setters', 'Isha Reddy',       5, 2100),
  ('vb:m1:digs:surekha','Bengaluru Volleyball Championship', 1, 'digs',   'Demo Spike City',      'Surekha Pillai',   12, 2400),
  ('vb:m1:digs:sanya',  'Bengaluru Volleyball Championship', 1, 'digs',   'Demo Skyline Setters', 'Sanya Rao',        10, 2500),
  ('vb:m1:ast:mihir',   'Bengaluru Volleyball Championship', 1, 'assists','Demo Spike City',      'Mihir Rao',        15, 2200),
  ('vb:m1:ast:radhika', 'Bengaluru Volleyball Championship', 1, 'assists','Demo Skyline Setters', 'Radhika Bose',    14, 2300),

  -- Match 2
  ('vb:m2:pts:aisha',   'Bengaluru Volleyball Championship', 2, 'points', 'Demo Skyline Setters', 'Aisha Khan',      24, 1800),
  ('vb:m2:pts:radhika', 'Bengaluru Volleyball Championship', 2, 'points', 'Demo Skyline Setters', 'Radhika Bose',    19, 2200),
  ('vb:m2:pts:aarav',   'Bengaluru Volleyball Championship', 2, 'points', 'Demo Spike City',      'Aarav Sood',       21, 1900),
  ('vb:m2:pts:mihir',   'Bengaluru Volleyball Championship', 2, 'points', 'Demo Spike City',      'Mihir Rao',        17, 2300),
  ('vb:m2:aces:aisha',  'Bengaluru Volleyball Championship', 2, 'aces',   'Demo Skyline Setters', 'Aisha Khan',       6, 1400),
  ('vb:m2:aces:aarav',  'Bengaluru Volleyball Championship', 2, 'aces',   'Demo Spike City',      'Aarav Sood',        4, 1500),
  ('vb:m2:blk:isha',    'Bengaluru Volleyball Championship', 2, 'blocks', 'Demo Skyline Setters', 'Isha Reddy',       7, 2000),
  ('vb:m2:blk:kushal',  'Bengaluru Volleyball Championship', 2, 'blocks', 'Demo Spike City',      'Kushal Das',        5, 2100),
  ('vb:m2:digs:sanya',  'Bengaluru Volleyball Championship', 2, 'digs',   'Demo Skyline Setters', 'Sanya Rao',        14, 2400),
  ('vb:m2:digs:surekha','Bengaluru Volleyball Championship', 2, 'digs',   'Demo Spike City',      'Surekha Pillai',   11, 2500),
  ('vb:m2:ast:radhika', 'Bengaluru Volleyball Championship', 2, 'assists','Demo Skyline Setters', 'Radhika Bose',    16, 2200),
  ('vb:m2:ast:mihir',   'Bengaluru Volleyball Championship', 2, 'assists','Demo Spike City',      'Mihir Rao',        13, 2300),

  -- Match 3
  ('vb:m3:pts:aarav',   'Bengaluru Volleyball Championship', 3, 'points', 'Demo Spike City',      'Aarav Sood',       26, 1800),
  ('vb:m3:pts:mihir',   'Bengaluru Volleyball Championship', 3, 'points', 'Demo Spike City',      'Mihir Rao',        20, 2200),
  ('vb:m3:pts:aisha',   'Bengaluru Volleyball Championship', 3, 'points', 'Demo Skyline Setters', 'Aisha Khan',      18, 1900),
  ('vb:m3:aces:aarav',  'Bengaluru Volleyball Championship', 3, 'aces',   'Demo Spike City',      'Aarav Sood',        5, 1400),
  ('vb:m3:blk:kushal',  'Bengaluru Volleyball Championship', 3, 'blocks', 'Demo Spike City',      'Kushal Das',        6, 2000),
  ('vb:m3:blk:isha',    'Bengaluru Volleyball Championship', 3, 'blocks', 'Demo Skyline Setters', 'Isha Reddy',       4, 2100),
  ('vb:m3:digs:surekha','Bengaluru Volleyball Championship', 3, 'digs',   'Demo Spike City',      'Surekha Pillai',   15, 2400),
  ('vb:m3:digs:sanya',  'Bengaluru Volleyball Championship', 3, 'digs',   'Demo Skyline Setters', 'Sanya Rao',         9, 2500),
  ('vb:m3:ast:mihir',   'Bengaluru Volleyball Championship', 3, 'assists','Demo Spike City',      'Mihir Rao',        18, 2200);

-- Badminton Performance Stats: points_won, rallies_won, smashes, net_winners, service_aces
INSERT INTO demo_vb_bd_events VALUES
  -- Match 1
  ('bd:m1:pts:arnav',   'Karnataka Badminton Masters', 1, 'points_won',   'Demo Shuttle Squad Entrants', 'Arnav Joshi',    34, 1800),
  ('bd:m1:pts:devika',  'Karnataka Badminton Masters', 1, 'points_won',   'Demo Shuttle Squad Entrants', 'Devika Nair',    27, 2100),
  ('bd:m1:pts:reyansh', 'Karnataka Badminton Masters', 1, 'points_won',   'Demo Rally Racquets',         'Reyansh Kapoor', 30, 1900),
  ('bd:m1:pts:nandini', 'Karnataka Badminton Masters', 1, 'points_won',   'Demo Rally Racquets',         'Nandini Shah',   25, 2200),
  ('bd:m1:smash:arnav', 'Karnataka Badminton Masters', 1, 'smashes',      'Demo Shuttle Squad Entrants', 'Arnav Joshi',    14, 1600),
  ('bd:m1:smash:rey',   'Karnataka Badminton Masters', 1, 'smashes',      'Demo Rally Racquets',         'Reyansh Kapoor', 12, 1700),
  ('bd:m1:net:devika',  'Karnataka Badminton Masters', 1, 'net_winners',  'Demo Shuttle Squad Entrants', 'Devika Nair',     8, 1900),
  ('bd:m1:net:nandini', 'Karnataka Badminton Masters', 1, 'net_winners',  'Demo Rally Racquets',         'Nandini Shah',    6, 2000),
  ('bd:m1:aces:arnav',  'Karnataka Badminton Masters', 1, 'service_aces', 'Demo Shuttle Squad Entrants', 'Arnav Joshi',     5, 1400),
  ('bd:m1:aces:rey',    'Karnataka Badminton Masters', 1, 'service_aces', 'Demo Rally Racquets',         'Reyansh Kapoor',  4, 1500),
  ('bd:m1:ral:arnav',   'Karnataka Badminton Masters', 1, 'rallies_won',  'Demo Shuttle Squad Entrants', 'Arnav Joshi',    45, 2400),
  ('bd:m1:ral:rey',     'Karnataka Badminton Masters', 1, 'rallies_won',  'Demo Rally Racquets',         'Reyansh Kapoor', 38, 2500),

  -- Match 2
  ('bd:m2:pts:reyansh', 'Karnataka Badminton Masters', 2, 'points_won',   'Demo Rally Racquets',         'Reyansh Kapoor', 35, 1800),
  ('bd:m2:pts:nandini', 'Karnataka Badminton Masters', 2, 'points_won',   'Demo Rally Racquets',         'Nandini Shah',   28, 2100),
  ('bd:m2:pts:arnav',   'Karnataka Badminton Masters', 2, 'points_won',   'Demo Shuttle Squad Entrants', 'Arnav Joshi',    26, 1900),
  ('bd:m2:pts:devika',  'Karnataka Badminton Masters', 2, 'points_won',   'Demo Shuttle Squad Entrants', 'Devika Nair',    22, 2200),
  ('bd:m2:smash:rey',   'Karnataka Badminton Masters', 2, 'smashes',      'Demo Rally Racquets',         'Reyansh Kapoor', 15, 1600),
  ('bd:m2:smash:arnav', 'Karnataka Badminton Masters', 2, 'smashes',      'Demo Shuttle Squad Entrants', 'Arnav Joshi',    10, 1700),
  ('bd:m2:net:nandini', 'Karnataka Badminton Masters', 2, 'net_winners',  'Demo Rally Racquets',         'Nandini Shah',    9, 1900),
  ('bd:m2:net:devika',  'Karnataka Badminton Masters', 2, 'net_winners',  'Demo Shuttle Squad Entrants', 'Devika Nair',     6, 2000),
  ('bd:m2:aces:rey',    'Karnataka Badminton Masters', 2, 'service_aces', 'Demo Rally Racquets',         'Reyansh Kapoor',  6, 1400),
  ('bd:m2:aces:arnav',  'Karnataka Badminton Masters', 2, 'service_aces', 'Demo Shuttle Squad Entrants', 'Arnav Joshi',     3, 1500),
  ('bd:m2:ral:rey',     'Karnataka Badminton Masters', 2, 'rallies_won',  'Demo Rally Racquets',         'Reyansh Kapoor', 46, 2400),
  ('bd:m2:ral:arnav',   'Karnataka Badminton Masters', 2, 'rallies_won',  'Demo Shuttle Squad Entrants', 'Arnav Joshi',    34, 2500),

  -- Match 3
  ('bd:m3:pts:arnav',   'Karnataka Badminton Masters', 3, 'points_won',   'Demo Shuttle Squad Entrants', 'Arnav Joshi',    38, 1800),
  ('bd:m3:pts:devika',  'Karnataka Badminton Masters', 3, 'points_won',   'Demo Shuttle Squad Entrants', 'Devika Nair',    31, 2100),
  ('bd:m3:pts:reyansh', 'Karnataka Badminton Masters', 3, 'points_won',   'Demo Rally Racquets',         'Reyansh Kapoor', 34, 1900),
  ('bd:m3:pts:nandini', 'Karnataka Badminton Masters', 3, 'points_won',   'Demo Rally Racquets',         'Nandini Shah',   28, 2200),
  ('bd:m3:smash:arnav', 'Karnataka Badminton Masters', 3, 'smashes',      'Demo Shuttle Squad Entrants', 'Arnav Joshi',    17, 1600),
  ('bd:m3:smash:rey',   'Karnataka Badminton Masters', 3, 'smashes',      'Demo Rally Racquets',         'Reyansh Kapoor', 14, 1700),
  ('bd:m3:net:devika',  'Karnataka Badminton Masters', 3, 'net_winners',  'Demo Shuttle Squad Entrants', 'Devika Nair',    10, 1900),
  ('bd:m3:net:nandini', 'Karnataka Badminton Masters', 3, 'net_winners',  'Demo Rally Racquets',         'Nandini Shah',    8, 2000),
  ('bd:m3:aces:arnav',  'Karnataka Badminton Masters', 3, 'service_aces', 'Demo Shuttle Squad Entrants', 'Arnav Joshi',     6, 1400),
  ('bd:m3:ral:arnav',   'Karnataka Badminton Masters', 3, 'rallies_won',  'Demo Shuttle Squad Entrants', 'Arnav Joshi',    48, 2400),
  ('bd:m3:ral:rey',     'Karnataka Badminton Masters', 3, 'rallies_won',  'Demo Rally Racquets',         'Reyansh Kapoor', 42, 2500);

-- Insert into performance_events
INSERT INTO performance_events (
  match_id, sport_stat_definition_id, event_time_seconds, event_metadata,
  recorded_by_user_id, recorded_at, created_at
)
SELECT game_match.id, definition.id, event.event_time_seconds,
       jsonb_build_object('demo_seed_key', event.demo_key, 'source', 'seed_009'),
       organizer.id, game_match.scheduled_at + event.event_time_seconds * INTERVAL '1 second',
       game_match.scheduled_at + event.event_time_seconds * INTERVAL '1 second'
FROM demo_vb_bd_events event
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

-- Insert into performance_event_players
INSERT INTO performance_event_players (performance_event_id, player_profile_id, team_id, value)
SELECT performance_event.id, profile.id, registration.team_id, event.value
FROM demo_vb_bd_events event
JOIN tournaments tournament ON tournament.name = event.tournament_name
JOIN fixtures fixture ON fixture.tournament_id = tournament.id AND fixture.round_number = event.round_number
JOIN matches game_match ON game_match.fixture_id = fixture.id
JOIN performance_events performance_event
  ON performance_event.match_id = game_match.id
 AND performance_event.event_metadata->>'demo_seed_key' = event.demo_key
JOIN tournament_registrations registration ON registration.tournament_id = tournament.id AND registration.registration_name = event.team_name
JOIN player_profiles profile ON profile.display_name = event.player_name
JOIN team_members member ON member.team_id = registration.team_id
                         AND member.player_profile_id = profile.id
                         AND member.is_active = TRUE
ON CONFLICT (performance_event_id, player_profile_id)
DO UPDATE SET team_id = EXCLUDED.team_id, value = EXCLUDED.value;

-- Leaderboards for Volleyball & Badminton
INSERT INTO leaderboards
  (name, sport_id, tournament_id, leaderboard_type, stat_key, is_active, computed_at)
SELECT boards.name, tournament.sport_id, tournament.id, boards.leaderboard_type,
       boards.stat_key, TRUE, tournament.ends_at
FROM (VALUES
  ('Bengaluru Volleyball Championship', 'Top Scorers', 'player', 'points'),
  ('Bengaluru Volleyball Championship', 'Aces Leaders', 'player', 'aces'),
  ('Bengaluru Volleyball Championship', 'Wall of Blocks', 'player', 'blocks'),
  ('Bengaluru Volleyball Championship', 'Team Points', 'team', 'points'),
  ('Karnataka Badminton Masters', 'Most Points Won', 'player', 'points_won'),
  ('Karnataka Badminton Masters', 'Smash Masters', 'player', 'smashes'),
  ('Karnataka Badminton Masters', 'Net Champions', 'player', 'net_winners'),
  ('Karnataka Badminton Masters', 'Team Points', 'team', 'points_won')
) AS boards(tournament_name, name, leaderboard_type, stat_key)
JOIN tournaments tournament ON tournament.name = boards.tournament_name
WHERE NOT EXISTS (
  SELECT 1 FROM leaderboards existing
  WHERE existing.tournament_id = tournament.id AND existing.name = boards.name
);

COMMIT;
