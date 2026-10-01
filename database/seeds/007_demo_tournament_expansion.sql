-- =============================================================================
-- PlaySphere — Four-team historical tournament examples and sport stat catalog.
-- Requires seeds 001, 003, 005, 006 and the tournament fixture migration.
-- Safe to rerun: rebuilds only the synthetic matches for these three demos.
-- =============================================================================

BEGIN;

-- Expand the catalog so the tournament Sport Stats tab can explain all stats
-- that organizers may record for each supported sport.
INSERT INTO sport_stat_definitions
  (sport_id, stat_key, stat_name, description, data_type, is_cumulative, applies_to)
SELECT sport.id, definitions.stat_key, definitions.stat_name, definitions.description,
       definitions.data_type, definitions.is_cumulative, definitions.applies_to
FROM (VALUES
  ('football', 'goals', 'Goals', 'Goals scored in official matches.', 'integer', TRUE, 'both'),
  ('football', 'assists', 'Assists', 'Goals directly assisted by the player.', 'integer', TRUE, 'player'),
  ('football', 'appearances', 'Appearances', 'Official matches played.', 'integer', TRUE, 'both'),
  ('football', 'shots_on_target', 'Shots on target', 'Attempts that would enter the goal without a save.', 'integer', TRUE, 'player'),
  ('football', 'saves', 'Saves', 'Shots stopped by a goalkeeper.', 'integer', TRUE, 'player'),
  ('football', 'tackles', 'Tackles', 'Successful challenges to win possession.', 'integer', TRUE, 'player'),
  ('football', 'yellow_cards', 'Yellow cards', 'Cautions received.', 'integer', TRUE, 'player'),
  ('football', 'red_cards', 'Red cards', 'Send-offs received.', 'integer', TRUE, 'player'),
  ('football', 'clean_sheets', 'Clean sheets', 'Matches in which the opponent scored no goals.', 'integer', TRUE, 'team'),
  ('cricket', 'runs', 'Runs', 'Runs scored by the batting side or player.', 'integer', TRUE, 'both'),
  ('cricket', 'wickets', 'Wickets', 'Opposing batters dismissed by the bowling side or player.', 'integer', TRUE, 'both'),
  ('cricket', 'appearances', 'Appearances', 'Official matches played.', 'integer', TRUE, 'both'),
  ('cricket', 'catches', 'Catches', 'Batters dismissed by a catch.', 'integer', TRUE, 'player'),
  ('cricket', 'fours', 'Fours', 'Boundaries scored for four runs.', 'integer', TRUE, 'player'),
  ('cricket', 'sixes', 'Sixes', 'Boundaries scored for six runs.', 'integer', TRUE, 'player'),
  ('cricket', 'run_outs', 'Run outs', 'Batters dismissed by a run out.', 'integer', TRUE, 'player'),
  ('cricket', 'overs_bowled', 'Overs bowled', 'Overs delivered by a bowler.', 'decimal', TRUE, 'player'),
  ('cricket', 'economy_rate', 'Economy rate', 'Runs conceded per over.', 'decimal', FALSE, 'player'),
  ('cricket', 'strike_rate', 'Strike rate', 'Runs scored per 100 balls faced.', 'decimal', FALSE, 'player'),
  ('basketball', 'points', 'Points', 'Points scored by a player or team.', 'integer', TRUE, 'both'),
  ('basketball', 'rebounds', 'Rebounds', 'Offensive and defensive rebounds secured.', 'integer', TRUE, 'both'),
  ('basketball', 'assists', 'Assists', 'Scoring plays directly set up by a player.', 'integer', TRUE, 'player'),
  ('basketball', 'steals', 'Steals', 'Possessions taken from the opposing team.', 'integer', TRUE, 'player'),
  ('basketball', 'blocks', 'Blocks', 'Opponent shots blocked.', 'integer', TRUE, 'player'),
  ('basketball', 'turnovers', 'Turnovers', 'Possessions lost before a scoring attempt.', 'integer', TRUE, 'player'),
  ('basketball', 'personal_fouls', 'Personal fouls', 'Personal fouls recorded.', 'integer', TRUE, 'player'),
  ('basketball', 'appearances', 'Appearances', 'Official matches played.', 'integer', TRUE, 'both'),
  ('volleyball', 'points', 'Points', 'Rally points won by a player or team.', 'integer', TRUE, 'both'),
  ('volleyball', 'aces', 'Service aces', 'Serves that directly score a point.', 'integer', TRUE, 'player'),
  ('volleyball', 'blocks', 'Blocks', 'Opponent attacks stopped at the net.', 'integer', TRUE, 'player'),
  ('volleyball', 'digs', 'Digs', 'Attacks successfully defended.', 'integer', TRUE, 'player'),
  ('volleyball', 'assists', 'Assists', 'Sets leading directly to a kill.', 'integer', TRUE, 'player'),
  ('volleyball', 'service_errors', 'Service errors', 'Serves that give a point to the opponent.', 'integer', TRUE, 'player'),
  ('volleyball', 'appearances', 'Appearances', 'Official matches played.', 'integer', TRUE, 'both'),
  ('badminton', 'points_won', 'Points won', 'Points won by a player or pair.', 'integer', TRUE, 'both'),
  ('badminton', 'rallies_won', 'Rallies won', 'Rallies won by a player or pair.', 'integer', TRUE, 'both'),
  ('badminton', 'smashes', 'Smashes', 'Attacking smashes recorded.', 'integer', TRUE, 'player'),
  ('badminton', 'net_winners', 'Net winners', 'Points won with a net shot.', 'integer', TRUE, 'player'),
  ('badminton', 'unforced_errors', 'Unforced errors', 'Unforced errors that concede a point.', 'integer', TRUE, 'player'),
  ('badminton', 'service_aces', 'Service aces', 'Serves that directly win a point.', 'integer', TRUE, 'player'),
  ('badminton', 'appearances', 'Appearances', 'Official matches played.', 'integer', TRUE, 'both')
) AS definitions(sport_slug, stat_key, stat_name, description, data_type, is_cumulative, applies_to)
JOIN sports sport ON sport.slug = definitions.sport_slug
ON CONFLICT (sport_id, stat_key) DO UPDATE SET
  stat_name = EXCLUDED.stat_name,
  description = EXCLUDED.description,
  data_type = EXCLUDED.data_type,
  is_cumulative = EXCLUDED.is_cumulative,
  applies_to = EXCLUDED.applies_to;

-- Add more demo entries to the upcoming events too, including missing
-- volleyball and badminton teams.
WITH added_teams(name, sport_slug) AS (
  VALUES
    ('Demo Midtown Ballers', 'basketball'),
    ('Demo Harbor Spikers', 'volleyball'),
    ('Demo Northside Shuttlers', 'badminton'),
    ('Demo Skyline Racquets', 'badminton')
)
INSERT INTO teams (name, sport_id, manager_user_id, description, city)
SELECT added.name, sport.id, organizer.id,
       'Placeholder team with a sample roster for local tournament demos.', 'Bengaluru'
FROM added_teams added
JOIN sports sport ON sport.slug = added.sport_slug
JOIN users organizer ON organizer.email = 'organizer@playsphere.local'
WHERE NOT EXISTS (
  SELECT 1 FROM teams existing
  WHERE existing.name = added.name AND existing.manager_user_id = organizer.id
);

-- Create distinct placeholder users for the additional entries so a player
-- cannot appear on two sides of the same tournament.
CREATE TEMP TABLE demo_added_rosters ON COMMIT DROP AS
SELECT * FROM (VALUES
  ('Demo Eastside FC', 'football', ARRAY['Kian Rao','Vivaan Nair','Rishit Menon','Aaryan Bose','Rohan Krishnan','Neil Kapoor','Shaurya Das']::TEXT[]),
  ('Demo South City Strikers', 'football', ARRAY['Atharv Iyer','Arnav Shah','Krishiv Reddy','Dhruv Patel','Akash Nair','Manav Rao','Varun Mehta']::TEXT[]),
  ('Demo Boundary Breakers', 'cricket', ARRAY['Ritika Sharma','Devansh Gupta','Parth Sethi','Jai Khanna','Adarsh Nair','Varun Singh','Kabir Das']::TEXT[]),
  ('Demo Weekend XI', 'cricket', ARRAY['Anvi Reddy','Ishita Rao','Aditi Bose','Tara Menon','Rhea Kapoor','Naina Iyer','Misha Shah']::TEXT[]),
  ('Demo Baseline Collective', 'basketball', ARRAY['Kiara Sen','Saanvi Das','Veda Rao']::TEXT[]),
  ('Demo Midtown Ballers', 'basketball', ARRAY['Anshika Roy','Kavya Iyer','Mahi Nair']::TEXT[]),
  ('Demo Spike City', 'volleyball', ARRAY['Aarav Sood','Mihir Rao','Sahil Nair','Kushal Das']::TEXT[]),
  ('Demo Harbor Spikers', 'volleyball', ARRAY['Ritvik Sen','Nakul Mehta','Kabir Bose','Aman Iyer']::TEXT[]),
  ('Demo Northside Shuttlers', 'badminton', ARRAY['Aditi Sethi','Prisha Nair']::TEXT[]),
  ('Demo Skyline Racquets', 'badminton', ARRAY['Rohan Kapur','Aria Menon']::TEXT[])
) AS roster(team_name, sport_slug, player_names);

-- Remove shared-roster rows from the first local expansion draft, if present.
-- The final demo teams each use their own added placeholder player accounts.
DELETE FROM team_members member
USING teams team, player_profiles profile, users player
WHERE member.team_id = team.id
  AND member.player_profile_id = profile.id
  AND profile.user_id = player.id
  AND team.name IN (SELECT team_name FROM demo_added_rosters)
  AND player.email LIKE 'demo.player.%@playsphere.local';

CREATE TEMP TABLE demo_added_players ON COMMIT DROP AS
SELECT 'demo.extra.player.' || LPAD(
         ROW_NUMBER() OVER (
           ORDER BY CASE WHEN team_name IN (
             'Demo Baseline Collective', 'Demo Boundary Breakers', 'Demo Eastside FC',
             'Demo Midtown Ballers', 'Demo South City Strikers', 'Demo Weekend XI'
           ) THEN 0 ELSE 1 END, team_name, member.ordinality
         )::TEXT, 2, '0'
       ) || '@playsphere.local' AS email,
       team_name, sport_slug, member.display_name,
       member.ordinality::INT AS roster_order
FROM demo_added_rosters roster
CROSS JOIN LATERAL UNNEST(roster.player_names) WITH ORDINALITY
  AS member(display_name, ordinality);

INSERT INTO users (email, password_hash, is_active, is_email_verified)
SELECT email, crypt('PlayerDev@123', gen_salt('bf', 12)), TRUE, TRUE
FROM demo_added_players
ON CONFLICT (email) DO NOTHING;

INSERT INTO user_roles (user_id, role_id, assigned_by)
SELECT player.id, role.id, organizer.id
FROM demo_added_players seed
JOIN users player ON player.email = seed.email
JOIN roles role ON role.name = 'USER'
JOIN users organizer ON organizer.email = 'organizer@playsphere.local'
ON CONFLICT DO NOTHING;

INSERT INTO player_profiles (user_id, display_name, bio, city, state, is_public)
SELECT player.id, seed.display_name,
       'Sample player profile for the PlaySphere local demo.', 'Bengaluru', 'Karnataka', TRUE
FROM demo_added_players seed
JOIN users player ON player.email = seed.email
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO player_sport_profiles
  (player_profile_id, sport_id, skill_level, years_of_experience, is_primary)
SELECT profile.id, sport.id, 'intermediate', 2, TRUE
FROM demo_added_players seed
JOIN users player ON player.email = seed.email
JOIN player_profiles profile ON profile.user_id = player.id
JOIN sports sport ON sport.slug = seed.sport_slug
ON CONFLICT (player_profile_id, sport_id) DO NOTHING;

INSERT INTO team_members (team_id, player_profile_id, team_role, jersey_number)
SELECT team.id, profile.id,
       CASE WHEN seed.roster_order = 1 THEN 'captain' ELSE 'player' END,
       seed.roster_order
FROM demo_added_players seed
JOIN users player ON player.email = seed.email
JOIN player_profiles profile ON profile.user_id = player.id
JOIN teams team ON team.name = seed.team_name
WHERE NOT EXISTS (
  SELECT 1 FROM team_members existing
  WHERE existing.team_id = team.id
    AND existing.player_profile_id = profile.id
    AND existing.is_active = TRUE
)
ON CONFLICT DO NOTHING;

-- Refresh snapshots for these synthetic teams so old draft rosters do not
-- remain attached to the same approved entries after the roster is corrected.
DELETE FROM tournament_registration_players snapshot
USING tournament_registrations registration, teams team
WHERE snapshot.registration_id = registration.id
  AND registration.team_id = team.id
  AND team.name IN (SELECT team_name FROM demo_added_rosters);

CREATE TEMP TABLE demo_historical_teams (
  tournament_name TEXT NOT NULL,
  team_name TEXT NOT NULL,
  PRIMARY KEY (tournament_name, team_name)
) ON COMMIT DROP;

INSERT INTO demo_historical_teams VALUES
  ('Bengaluru Football Legends Series', 'Demo Bengaluru United'),
  ('Bengaluru Football Legends Series', 'Demo Eastside Rovers'),
  ('Bengaluru Football Legends Series', 'Demo Eastside FC'),
  ('Bengaluru Football Legends Series', 'Demo South City Strikers'),
  ('Monsoon Cricket Invitational', 'Demo Boundary Breakers XI'),
  ('Monsoon Cricket Invitational', 'Demo Weekend Warriors XI'),
  ('Monsoon Cricket Invitational', 'Demo Boundary Breakers'),
  ('Monsoon Cricket Invitational', 'Demo Weekend XI'),
  ('South Bengaluru Hoops Cup', 'Demo Baseline Collective Entrants'),
  ('South Bengaluru Hoops Cup', 'Demo Court Kings'),
  ('South Bengaluru Hoops Cup', 'Demo Baseline Collective'),
  ('South Bengaluru Hoops Cup', 'Demo Midtown Ballers');

UPDATE tournaments tournament
SET min_teams = 4,
    max_teams = 4,
    description = CASE tournament.name
      WHEN 'Bengaluru Football Legends Series' THEN 'Completed four-team football round robin with final scores, standings, and player performance records.'
      WHEN 'Monsoon Cricket Invitational' THEN 'Completed four-team cricket round robin with innings scorecards, player runs and wickets, and team standings.'
      ELSE 'Completed four-team basketball round robin with quarter scores, player points and assists, and team standings.'
    END,
    rules = 'Four teams played a complete round robin. Each team faced every other team once.'
WHERE tournament.name IN (
  'Bengaluru Football Legends Series', 'Monsoon Cricket Invitational', 'South Bengaluru Hoops Cup'
)
  AND tournament.organizer_user_id = (SELECT id FROM users WHERE email = 'organizer@playsphere.local');

INSERT INTO tournament_registrations (
  tournament_id, team_id, registered_by_user_id, status, eligibility_status,
  registration_name, notes, registered_at, reviewed_at, reviewed_by_user_id
)
SELECT tournament.id, team.id, team.manager_user_id, 'approved', 'approved', team.name,
       'Seeded approved entry for a completed four-team demo tournament.',
       tournament.registration_opens_at + INTERVAL '2 days',
       tournament.registration_closes_at - INTERVAL '1 day', organizer.id
FROM demo_historical_teams entry
JOIN tournaments tournament ON tournament.name = entry.tournament_name
JOIN teams team ON team.name = entry.team_name
JOIN users organizer ON organizer.email = 'organizer@playsphere.local'
WHERE NOT EXISTS (
  SELECT 1 FROM tournament_registrations existing
  WHERE existing.tournament_id = tournament.id
    AND existing.team_id = team.id
    AND existing.status IN ('pending', 'approved')
);

INSERT INTO tournament_registration_players
  (registration_id, player_profile_id, is_captain, jersey_number)
SELECT registration.id, member.player_profile_id,
       member.team_role = 'captain', member.jersey_number
FROM demo_historical_teams entry
JOIN tournaments tournament ON tournament.name = entry.tournament_name
JOIN teams team ON team.name = entry.team_name
JOIN tournament_registrations registration
  ON registration.tournament_id = tournament.id AND registration.team_id = team.id
JOIN team_members member ON member.team_id = team.id AND member.is_active = TRUE
WHERE registration.status = 'approved'
ON CONFLICT (registration_id, player_profile_id) DO NOTHING;

CREATE TEMP TABLE demo_upcoming_teams (
  tournament_name TEXT NOT NULL,
  team_name TEXT NOT NULL,
  PRIMARY KEY (tournament_name, team_name)
) ON COMMIT DROP;

INSERT INTO demo_upcoming_teams VALUES
  ('Bengaluru Football Cup', 'Demo Bengaluru United'),
  ('Bengaluru Football Cup', 'Demo Eastside Rovers'),
  ('Bengaluru Football Cup', 'Demo Eastside FC'),
  ('Bengaluru Football Cup', 'Demo South City Strikers'),
  ('Weekend Cricket Open', 'Demo Boundary Breakers XI'),
  ('Weekend Cricket Open', 'Demo Weekend Warriors XI'),
  ('Weekend Cricket Open', 'Demo Boundary Breakers'),
  ('Weekend Cricket Open', 'Demo Weekend XI'),
  ('City Hoops Challenge', 'Demo Baseline Collective Entrants'),
  ('City Hoops Challenge', 'Demo Court Kings'),
  ('City Hoops Challenge', 'Demo Baseline Collective'),
  ('City Hoops Challenge', 'Demo Midtown Ballers'),
  ('Spike City Volleyball Cup', 'Demo Spike City Entrants'),
  ('Spike City Volleyball Cup', 'Demo Skyline Setters'),
  ('Spike City Volleyball Cup', 'Demo Spike City'),
  ('Spike City Volleyball Cup', 'Demo Harbor Spikers'),
  ('Badminton Doubles Open', 'Demo Shuttle Squad Entrants'),
  ('Badminton Doubles Open', 'Demo Rally Racquets'),
  ('Badminton Doubles Open', 'Demo Northside Shuttlers'),
  ('Badminton Doubles Open', 'Demo Skyline Racquets');

-- The early placeholder seed could register an empty organizer-owned copy of
-- Demo Rally Racquets alongside its rostered team with the same display name.
UPDATE tournament_registrations registration
SET status = 'withdrawn'
FROM tournaments tournament, teams team
WHERE registration.tournament_id = tournament.id
  AND registration.team_id = team.id
  AND tournament.name = 'Badminton Doubles Open'
  AND team.name = 'Demo Rally Racquets'
  AND team.manager_user_id = (SELECT id FROM users WHERE email = 'organizer@playsphere.local')
  AND NOT EXISTS (
    SELECT 1 FROM team_members member
    WHERE member.team_id = team.id AND member.is_active = TRUE
  )
  AND registration.status IN ('pending', 'approved');

INSERT INTO tournament_registrations (
  tournament_id, team_id, registered_by_user_id, status, eligibility_status,
  registration_name, notes, registered_at, reviewed_at, reviewed_by_user_id
)
SELECT tournament.id, team.id, team.manager_user_id, 'approved', 'approved', team.name,
       'Seeded approved entry for the upcoming local demo tournament.',
       NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day', organizer.id
FROM demo_upcoming_teams entry
JOIN tournaments tournament ON tournament.name = entry.tournament_name
JOIN teams team ON team.name = entry.team_name
  AND EXISTS (SELECT 1 FROM team_members member
              WHERE member.team_id = team.id AND member.is_active = TRUE)
JOIN users organizer ON organizer.email = 'organizer@playsphere.local'
WHERE NOT EXISTS (
  SELECT 1 FROM tournament_registrations existing
  WHERE existing.tournament_id = tournament.id
    AND existing.team_id = team.id
    AND existing.status IN ('pending', 'approved')
);

INSERT INTO tournament_registration_players
  (registration_id, player_profile_id, is_captain, jersey_number)
SELECT registration.id, member.player_profile_id,
       member.team_role = 'captain', member.jersey_number
FROM demo_upcoming_teams entry
JOIN tournaments tournament ON tournament.name = entry.tournament_name
JOIN teams team ON team.name = entry.team_name
  AND EXISTS (SELECT 1 FROM team_members active_member
              WHERE active_member.team_id = team.id AND active_member.is_active = TRUE)
JOIN tournament_registrations registration
  ON registration.tournament_id = tournament.id AND registration.team_id = team.id
JOIN team_members member ON member.team_id = team.id AND member.is_active = TRUE
WHERE registration.status = 'approved'
ON CONFLICT (registration_id, player_profile_id) DO NOTHING;

-- Rebuild the synthetic match records so all four entries have a complete,
-- balanced round-robin history. Team entries and roster snapshots are kept.
DELETE FROM player_statistics
WHERE tournament_id IN (
  SELECT id FROM tournaments WHERE name IN (
    'Bengaluru Football Legends Series', 'Monsoon Cricket Invitational', 'South Bengaluru Hoops Cup'
  )
);
DELETE FROM team_statistics
WHERE tournament_id IN (
  SELECT id FROM tournaments WHERE name IN (
    'Bengaluru Football Legends Series', 'Monsoon Cricket Invitational', 'South Bengaluru Hoops Cup'
  )
);
DELETE FROM leaderboards
WHERE tournament_id IN (
  SELECT id FROM tournaments WHERE name IN (
    'Bengaluru Football Legends Series', 'Monsoon Cricket Invitational', 'South Bengaluru Hoops Cup'
  )
);
DELETE FROM performance_events
WHERE match_id IN (
  SELECT id FROM matches WHERE tournament_id IN (
    SELECT id FROM tournaments WHERE name IN (
      'Bengaluru Football Legends Series', 'Monsoon Cricket Invitational', 'South Bengaluru Hoops Cup'
    )
  )
);
DELETE FROM matches
WHERE tournament_id IN (
  SELECT id FROM tournaments WHERE name IN (
    'Bengaluru Football Legends Series', 'Monsoon Cricket Invitational', 'South Bengaluru Hoops Cup'
  )
);
DELETE FROM fixtures
WHERE tournament_id IN (
  SELECT id FROM tournaments WHERE name IN (
    'Bengaluru Football Legends Series', 'Monsoon Cricket Invitational', 'South Bengaluru Hoops Cup'
  )
);

CREATE TEMP TABLE demo_historical_results (
  tournament_name TEXT NOT NULL,
  round_number INT NOT NULL,
  match_number INT NOT NULL,
  home_team_name TEXT NOT NULL,
  away_team_name TEXT NOT NULL,
  scheduled_at TIMESTAMPTZ NOT NULL,
  home_score INT NOT NULL,
  away_score INT NOT NULL,
  home_wickets INT NOT NULL DEFAULT 0,
  away_wickets INT NOT NULL DEFAULT 0,
  result_summary JSONB NOT NULL,
  PRIMARY KEY (tournament_name, round_number, match_number)
) ON COMMIT DROP;

INSERT INTO demo_historical_results VALUES
  ('Bengaluru Football Legends Series', 1, 1, 'Demo Bengaluru United', 'Demo South City Strikers', '2025-05-10 09:00:00+05:30', 2, 0, 0, 0, '{"format":"2 x 45 minutes","home_score":2,"away_score":0,"halftime":{"home":1,"away":0}}'),
  ('Bengaluru Football Legends Series', 1, 2, 'Demo Eastside Rovers', 'Demo Eastside FC', '2025-05-10 15:00:00+05:30', 1, 1, 0, 0, '{"format":"2 x 45 minutes","home_score":1,"away_score":1,"halftime":{"home":1,"away":0}}'),
  ('Bengaluru Football Legends Series', 2, 1, 'Demo Eastside FC', 'Demo Bengaluru United', '2025-05-11 09:00:00+05:30', 1, 3, 0, 0, '{"format":"2 x 45 minutes","home_score":1,"away_score":3,"halftime":{"home":0,"away":2}}'),
  ('Bengaluru Football Legends Series', 2, 2, 'Demo South City Strikers', 'Demo Eastside Rovers', '2025-05-11 15:00:00+05:30', 1, 2, 0, 0, '{"format":"2 x 45 minutes","home_score":1,"away_score":2,"halftime":{"home":1,"away":1}}'),
  ('Bengaluru Football Legends Series', 3, 1, 'Demo Bengaluru United', 'Demo Eastside Rovers', '2025-05-12 09:00:00+05:30', 2, 2, 0, 0, '{"format":"2 x 45 minutes","home_score":2,"away_score":2,"halftime":{"home":1,"away":1}}'),
  ('Bengaluru Football Legends Series', 3, 2, 'Demo Eastside FC', 'Demo South City Strikers', '2025-05-12 15:00:00+05:30', 2, 0, 0, 0, '{"format":"2 x 45 minutes","home_score":2,"away_score":0,"halftime":{"home":1,"away":0}}'),

  ('Monsoon Cricket Invitational', 1, 1, 'Demo Boundary Breakers XI', 'Demo Weekend XI', '2025-06-14 09:00:00+05:30', 148, 139, 8, 9, '{"format":"T20","innings":[{"runs":148,"wickets":8,"overs":"20.0"},{"runs":139,"wickets":9,"overs":"20.0"}]}'),
  ('Monsoon Cricket Invitational', 1, 2, 'Demo Weekend Warriors XI', 'Demo Boundary Breakers', '2025-06-14 14:00:00+05:30', 162, 155, 7, 8, '{"format":"T20","innings":[{"runs":162,"wickets":7,"overs":"20.0"},{"runs":155,"wickets":8,"overs":"20.0"}]}'),
  ('Monsoon Cricket Invitational', 2, 1, 'Demo Boundary Breakers', 'Demo Boundary Breakers XI', '2025-06-15 09:00:00+05:30', 151, 158, 9, 6, '{"format":"T20","innings":[{"runs":151,"wickets":9,"overs":"20.0"},{"runs":158,"wickets":6,"overs":"19.4"}]}'),
  ('Monsoon Cricket Invitational', 2, 2, 'Demo Weekend XI', 'Demo Weekend Warriors XI', '2025-06-15 14:00:00+05:30', 170, 166, 5, 7, '{"format":"T20","innings":[{"runs":170,"wickets":5,"overs":"20.0"},{"runs":166,"wickets":7,"overs":"20.0"}]}'),
  ('Monsoon Cricket Invitational', 3, 1, 'Demo Boundary Breakers XI', 'Demo Weekend Warriors XI', '2025-06-16 09:00:00+05:30', 174, 160, 6, 8, '{"format":"T20","innings":[{"runs":174,"wickets":6,"overs":"20.0"},{"runs":160,"wickets":8,"overs":"20.0"}]}'),
  ('Monsoon Cricket Invitational', 3, 2, 'Demo Boundary Breakers', 'Demo Weekend XI', '2025-06-16 14:00:00+05:30', 142, 146, 9, 7, '{"format":"T20","innings":[{"runs":142,"wickets":9,"overs":"20.0"},{"runs":146,"wickets":7,"overs":"19.2"}]}'),

  ('South Bengaluru Hoops Cup', 1, 1, 'Demo Baseline Collective Entrants', 'Demo Midtown Ballers', '2025-08-02 09:00:00+05:30', 72, 65, 0, 0, '{"format":"4 x 10 minutes","home_score":72,"away_score":65,"home_quarters":[18,17,20,17],"away_quarters":[16,16,17,16]}'),
  ('South Bengaluru Hoops Cup', 1, 2, 'Demo Court Kings', 'Demo Baseline Collective', '2025-08-02 13:00:00+05:30', 68, 74, 0, 0, '{"format":"4 x 10 minutes","home_score":68,"away_score":74,"home_quarters":[17,18,16,17],"away_quarters":[19,18,18,19]}'),
  ('South Bengaluru Hoops Cup', 2, 1, 'Demo Baseline Collective', 'Demo Baseline Collective Entrants', '2025-08-03 09:00:00+05:30', 70, 77, 0, 0, '{"format":"4 x 10 minutes","home_score":70,"away_score":77,"home_quarters":[16,18,17,19],"away_quarters":[20,19,18,20]}'),
  ('South Bengaluru Hoops Cup', 2, 2, 'Demo Midtown Ballers', 'Demo Court Kings', '2025-08-03 13:00:00+05:30', 80, 76, 0, 0, '{"format":"4 x 10 minutes","home_score":80,"away_score":76,"home_quarters":[19,21,18,22],"away_quarters":[18,20,17,21]}'),
  ('South Bengaluru Hoops Cup', 3, 1, 'Demo Baseline Collective Entrants', 'Demo Court Kings', '2025-08-04 09:00:00+05:30', 82, 79, 0, 0, '{"format":"4 x 10 minutes","home_score":82,"away_score":79,"home_quarters":[21,20,19,22],"away_quarters":[20,18,22,19]}'),
  ('South Bengaluru Hoops Cup', 3, 2, 'Demo Baseline Collective', 'Demo Midtown Ballers', '2025-08-04 13:00:00+05:30', 73, 75, 0, 0, '{"format":"4 x 10 minutes","home_score":73,"away_score":75,"home_quarters":[18,17,20,18],"away_quarters":[19,18,17,21]}');

-- Six pairings per tournament, two fixtures each round.
INSERT INTO fixtures (
  tournament_id, round_number, round_name, match_number, scheduled_at,
  scheduled_end_at, status, notes, stage, bracket_position,
  home_registration_id, away_registration_id, winner_registration_id
)
SELECT tournament.id, result.round_number, 'Round ' || result.round_number,
       result.match_number, result.scheduled_at,
       result.scheduled_at + CASE tournament.name
         WHEN 'Monsoon Cricket Invitational' THEN INTERVAL '4 hours'
         WHEN 'South Bengaluru Hoops Cup' THEN INTERVAL '2 hours'
         ELSE INTERVAL '90 minutes'
       END,
       'completed', 'Historical demo round-robin fixture with a final score.',
       'round_robin', result.match_number,
       home_registration.id, away_registration.id,
       CASE WHEN result.home_score > result.away_score THEN home_registration.id
            WHEN result.away_score > result.home_score THEN away_registration.id
            ELSE NULL END
FROM demo_historical_results result
JOIN tournaments tournament ON tournament.name = result.tournament_name
JOIN teams home_team ON home_team.name = result.home_team_name
JOIN tournament_registrations home_registration
  ON home_registration.tournament_id = tournament.id
 AND home_registration.team_id = home_team.id AND home_registration.status = 'approved'
JOIN teams away_team ON away_team.name = result.away_team_name
JOIN tournament_registrations away_registration
  ON away_registration.tournament_id = tournament.id
 AND away_registration.team_id = away_team.id AND away_registration.status = 'approved';

INSERT INTO matches (
  fixture_id, tournament_id, sport_id, scheduled_at, scheduled_end_at,
  started_at, ended_at, status, result_summary, winner_registration_id,
  recorded_by_user_id, notes
)
SELECT fixture.id, tournament.id, tournament.sport_id,
       fixture.scheduled_at, fixture.scheduled_end_at, fixture.scheduled_at,
       fixture.scheduled_end_at, 'completed', result.result_summary,
       fixture.winner_registration_id, organizer.id,
       'Completed demo match; final score and trackable player statistics are recorded.'
FROM demo_historical_results result
JOIN tournaments tournament ON tournament.name = result.tournament_name
JOIN fixtures fixture ON fixture.tournament_id = tournament.id
  AND fixture.round_number = result.round_number
  AND fixture.match_number = result.match_number
JOIN users organizer ON organizer.email = 'organizer@playsphere.local';

INSERT INTO match_participants (match_id, registration_id, team_id, side, score, result)
SELECT game_match.id, registration.id, registration.team_id, participant.side,
       jsonb_build_object('numeric', participant.score),
       CASE WHEN participant.score > participant.opponent_score THEN 'win'
            WHEN participant.score < participant.opponent_score THEN 'loss'
            ELSE 'draw' END
FROM demo_historical_results result
JOIN tournaments tournament ON tournament.name = result.tournament_name
JOIN fixtures fixture ON fixture.tournament_id = tournament.id
  AND fixture.round_number = result.round_number
  AND fixture.match_number = result.match_number
JOIN matches game_match ON game_match.fixture_id = fixture.id
CROSS JOIN LATERAL (VALUES
  (result.home_team_name, 'home'::VARCHAR(10), result.home_score, result.away_score),
  (result.away_team_name, 'away'::VARCHAR(10), result.away_score, result.home_score)
) AS participant(team_name, side, score, opponent_score)
JOIN teams team ON team.name = participant.team_name
JOIN tournament_registrations registration
  ON registration.tournament_id = tournament.id AND registration.team_id = team.id;

-- Associate each registered player with their match side and scoreboard.
CREATE TEMP TABLE demo_match_roster_players ON COMMIT DROP AS
SELECT tournament.name AS tournament_name, sport.slug AS sport_slug,
       result.round_number, result.match_number, game_match.id AS match_id,
       participant.side, team.id AS team_id, profile.id AS player_profile_id,
       member.jersey_number,
       ROW_NUMBER() OVER (
         PARTITION BY game_match.id, team.id
         ORDER BY member.jersey_number NULLS LAST, profile.id
       )::INT AS player_rank,
       participant.score::INT AS team_score,
       participant.wickets_taken::INT AS wickets_taken
FROM demo_historical_results result
JOIN tournaments tournament ON tournament.name = result.tournament_name
JOIN sports sport ON sport.id = tournament.sport_id
JOIN fixtures fixture ON fixture.tournament_id = tournament.id
  AND fixture.round_number = result.round_number
  AND fixture.match_number = result.match_number
JOIN matches game_match ON game_match.fixture_id = fixture.id
CROSS JOIN LATERAL (VALUES
  (result.home_team_name, 'home'::VARCHAR(10), result.home_score, result.away_wickets),
  (result.away_team_name, 'away'::VARCHAR(10), result.away_score, result.home_wickets)
) AS participant(team_name, side, score, wickets_taken)
JOIN teams team ON team.name = participant.team_name
JOIN tournament_registrations registration
  ON registration.tournament_id = tournament.id AND registration.team_id = team.id
JOIN tournament_registration_players member ON member.registration_id = registration.id
JOIN player_profiles profile ON profile.id = member.player_profile_id;

CREATE TEMP TABLE demo_event_rows (
  demo_key TEXT PRIMARY KEY,
  match_id UUID NOT NULL,
  team_id UUID NOT NULL,
  player_profile_id UUID NOT NULL,
  stat_key TEXT NOT NULL,
  value NUMERIC NOT NULL,
  event_time_seconds INT NOT NULL
) ON COMMIT DROP;

INSERT INTO demo_event_rows
SELECT 'appearance:' || match_id || ':' || player_profile_id,
       match_id, team_id, player_profile_id, 'appearances', 1,
       GREATEST(player_rank - 1, 0) * 900
FROM demo_match_roster_players;

-- Score totals are split over a small lineup, with each split adding back to
-- the official result. Wickets are assigned to the opposing innings' bowlers.
INSERT INTO demo_event_rows
SELECT 'recorded:' || match_id || ':' || player_profile_id || ':' || metrics.stat_key,
       match_id, team_id, player_profile_id, metrics.stat_key, metrics.value,
       GREATEST(player_rank - 1, 0) * 900 + CASE metrics.stat_key
         WHEN 'assists' THEN 300 ELSE 0 END
FROM demo_match_roster_players roster
CROSS JOIN LATERAL (VALUES
  (
    CASE roster.sport_slug WHEN 'football' THEN 'goals'
      WHEN 'cricket' THEN 'runs' ELSE 'points' END,
    CASE roster.sport_slug
      WHEN 'football' THEN CASE roster.player_rank
        WHEN 1 THEN CEIL(roster.team_score / 2.0)
        WHEN 2 THEN roster.team_score - CEIL(roster.team_score / 2.0)
        ELSE 0 END
      WHEN 'cricket' THEN CASE roster.player_rank
        WHEN 1 THEN FLOOR(roster.team_score * 0.4)
        WHEN 2 THEN FLOOR(roster.team_score * 0.3)
        WHEN 3 THEN FLOOR(roster.team_score * 0.2)
        WHEN 4 THEN roster.team_score - FLOOR(roster.team_score * 0.9)
        ELSE 0 END
      ELSE CASE roster.player_rank
        WHEN 1 THEN FLOOR(roster.team_score * 0.4)
        WHEN 2 THEN FLOOR(roster.team_score * 0.35)
        WHEN 3 THEN roster.team_score - FLOOR(roster.team_score * 0.75)
        ELSE 0 END
    END::NUMERIC
  ),
  (
    CASE WHEN roster.sport_slug = 'cricket' THEN 'wickets' ELSE 'assists' END,
    CASE
      WHEN roster.sport_slug = 'football' THEN CASE roster.player_rank
        WHEN 1 THEN CEIL(GREATEST(roster.team_score - 1, 0) / 2.0)
        WHEN 2 THEN GREATEST(roster.team_score - 1, 0) - CEIL(GREATEST(roster.team_score - 1, 0) / 2.0)
        ELSE 0 END
      WHEN roster.sport_slug = 'cricket' THEN CASE roster.player_rank
        WHEN 1 THEN CEIL(roster.wickets_taken / 3.0)
        WHEN 2 THEN CEIL((roster.wickets_taken - CEIL(roster.wickets_taken / 3.0)) / 2.0)
        WHEN 3 THEN roster.wickets_taken - CEIL(roster.wickets_taken / 3.0)
                       - CEIL((roster.wickets_taken - CEIL(roster.wickets_taken / 3.0)) / 2.0)
        ELSE 0 END
      ELSE CASE roster.player_rank
        WHEN 1 THEN FLOOR(FLOOR(roster.team_score / 10.0) * 0.5)
        WHEN 2 THEN FLOOR(FLOOR(roster.team_score / 10.0) * 0.3)
        WHEN 3 THEN FLOOR(roster.team_score / 10.0)
                       - FLOOR(FLOOR(roster.team_score / 10.0) * 0.8)
        ELSE 0 END
    END::NUMERIC
  )
) AS metrics(stat_key, value)
WHERE (roster.sport_slug = 'football' AND roster.player_rank <= 2)
   OR (roster.sport_slug = 'cricket' AND roster.player_rank <= 4)
   OR (roster.sport_slug = 'basketball' AND roster.player_rank <= 3);

INSERT INTO performance_events (
  match_id, sport_stat_definition_id, event_time_seconds, event_metadata,
  recorded_by_user_id, recorded_at, created_at
)
SELECT event.match_id, definition.id, event.event_time_seconds,
       jsonb_build_object('demo_seed_key', event.demo_key, 'source', 'local_demo_seed'),
       organizer.id, game_match.scheduled_at + event.event_time_seconds * INTERVAL '1 second',
       game_match.scheduled_at + event.event_time_seconds * INTERVAL '1 second'
FROM demo_event_rows event
JOIN matches game_match ON game_match.id = event.match_id
JOIN tournaments tournament ON tournament.id = game_match.tournament_id
JOIN sport_stat_definitions definition
  ON definition.sport_id = tournament.sport_id AND definition.stat_key = event.stat_key
JOIN users organizer ON organizer.email = 'organizer@playsphere.local';

INSERT INTO performance_event_players (performance_event_id, player_profile_id, team_id, value)
SELECT performance_event.id, event.player_profile_id, event.team_id, event.value
FROM demo_event_rows event
JOIN performance_events performance_event
  ON performance_event.match_id = event.match_id
 AND performance_event.event_metadata->>'demo_seed_key' = event.demo_key;

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
JOIN tournaments tournament ON tournament.name = boards.tournament_name;

COMMIT;
