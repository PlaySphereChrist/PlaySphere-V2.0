-- =============================================================================
-- PlaySphere — Local Demo Players, Team Rosters, and Tournament Entries
-- Requires schemas 001–007, seed 001, and demo tournaments from seed 003.
-- Idempotent: re-running does not duplicate demo users, teams, or registrations.
-- Development-only accounts; every demo player uses PlayerDev@123.
-- =============================================================================

BEGIN;

CREATE TEMP TABLE demo_team_rosters ON COMMIT DROP AS
SELECT * FROM (VALUES
  (
    'Demo Bengaluru United', 'football', 'Bengaluru Football Cup', 'Bengaluru',
    ARRAY['Aarav Menon', 'Ishaan Rao', 'Kabir Nair', 'Vihaan Iyer', 'Arjun Kulkarni', 'Rohan Desai', 'Aditya Shah']::TEXT[]
  ),
  (
    'Demo Eastside Rovers', 'football', 'Bengaluru Football Cup', 'Bengaluru',
    ARRAY['Dev Patel', 'Reyansh Mehta', 'Ayaan Kapoor', 'Karthik Reddy', 'Siddharth Joshi', 'Neel Verma', 'Manav Shetty']::TEXT[]
  ),
  (
    'Demo Boundary Breakers XI', 'cricket', 'Weekend Cricket Open', 'Bengaluru',
    ARRAY['Sahil Sharma', 'Yash Malhotra', 'Nikhil Bose', 'Pranav Gupta', 'Harsh Venkatesh', 'Omar Khan', 'Dhruv Sinha']::TEXT[]
  ),
  (
    'Demo Weekend Warriors XI', 'cricket', 'Weekend Cricket Open', 'Bengaluru',
    ARRAY['Anaya Rao', 'Riya Nair', 'Meera Joshi', 'Zoya Menon', 'Kavya Kulkarni', 'Tanvi Das', 'Ira Kapoor']::TEXT[]
  ),
  (
    'Demo Baseline Collective Entrants', 'basketball', 'City Hoops Challenge', 'Bengaluru',
    ARRAY['Aarohi Shah', 'Myra Patel', 'Diya Shetty']::TEXT[]
  ),
  (
    'Demo Court Kings', 'basketball', 'City Hoops Challenge', 'Bengaluru',
    ARRAY['Simran Kaur', 'Nisha Bansal', 'Tara Sen']::TEXT[]
  ),
  (
    'Demo Spike City Entrants', 'volleyball', 'Spike City Volleyball Cup', 'Bengaluru',
    ARRAY['Leela Iyer', 'Pooja Menon', 'Anika Verma', 'Sana Ahmed']::TEXT[]
  ),
  (
    'Demo Skyline Setters', 'volleyball', 'Spike City Volleyball Cup', 'Bengaluru',
    ARRAY['Aisha Khan', 'Radhika Bose', 'Isha Reddy', 'Sanya Rao']::TEXT[]
  ),
  (
    'Demo Shuttle Squad Entrants', 'badminton', 'Badminton Doubles Open', 'Bengaluru',
    ARRAY['Arnav Joshi', 'Devika Nair']::TEXT[]
  ),
  (
    'Demo Rally Racquets', 'badminton', 'Badminton Doubles Open', 'Bengaluru',
    ARRAY['Reyansh Kapoor', 'Nandini Shah']::TEXT[]
  )
) AS teams(team_name, sport_slug, tournament_name, city, player_names);

CREATE TEMP TABLE demo_player_seed ON COMMIT DROP AS
SELECT
  'demo.player.' || LPAD(ROW_NUMBER() OVER (ORDER BY team_name, members.ordinality)::TEXT, 2, '0') || '@playsphere.local' AS email,
  members.display_name,
  teams.team_name,
  teams.sport_slug,
  teams.tournament_name,
  teams.city,
  members.ordinality::INT AS roster_order
FROM demo_team_rosters AS teams
CROSS JOIN LATERAL UNNEST(teams.player_names) WITH ORDINALITY AS members(display_name, ordinality);

-- 46 local USER accounts; each team's first roster member manages that team.
INSERT INTO users (email, password_hash, is_active, is_email_verified)
SELECT email, crypt('PlayerDev@123', gen_salt('bf', 12)), TRUE, TRUE
FROM demo_player_seed
ON CONFLICT (email) DO NOTHING;

INSERT INTO user_roles (user_id, role_id, assigned_by)
SELECT player.id, role.id, organizer.id
FROM demo_player_seed AS seed
JOIN users AS player ON player.email = seed.email
JOIN roles AS role ON role.name = 'USER'
JOIN users AS organizer ON organizer.email = 'organizer@playsphere.local'
ON CONFLICT DO NOTHING;

INSERT INTO player_profiles (user_id, display_name, bio, city, state, is_public)
SELECT player.id, seed.display_name,
       'Sample player profile for the PlaySphere local demo.', seed.city, 'Karnataka', TRUE
FROM demo_player_seed AS seed
JOIN users AS player ON player.email = seed.email
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO player_sport_profiles (
  player_profile_id, sport_id, skill_level, years_of_experience, is_primary
)
SELECT profile.id, sport.id, 'intermediate', 2, TRUE
FROM demo_player_seed AS seed
JOIN users AS player ON player.email = seed.email
JOIN player_profiles AS profile ON profile.user_id = player.id
JOIN sports AS sport ON sport.slug = seed.sport_slug
ON CONFLICT (player_profile_id, sport_id) DO NOTHING;

-- The roster captain is also the team's manager, matching normal app ownership.
INSERT INTO teams (name, sport_id, manager_user_id, description, city)
SELECT roster.team_name, sport.id, manager.id,
       'Local demo team with a sample player roster.', roster.city
FROM demo_team_rosters AS roster
JOIN sports AS sport ON sport.slug = roster.sport_slug
JOIN demo_player_seed AS captain
  ON captain.team_name = roster.team_name AND captain.roster_order = 1
JOIN users AS manager ON manager.email = captain.email
WHERE NOT EXISTS (
  SELECT 1 FROM teams AS existing
  WHERE existing.name = roster.team_name AND existing.manager_user_id = manager.id
);

INSERT INTO team_members (team_id, player_profile_id, team_role, jersey_number)
SELECT team.id, profile.id,
       CASE WHEN seed.roster_order = 1 THEN 'captain' ELSE 'player' END,
       seed.roster_order
FROM demo_player_seed AS seed
JOIN users AS player ON player.email = seed.email
JOIN player_profiles AS profile ON profile.user_id = player.id
JOIN demo_player_seed AS captain
  ON captain.team_name = seed.team_name AND captain.roster_order = 1
JOIN users AS manager ON manager.email = captain.email
JOIN teams AS team
  ON team.name = seed.team_name AND team.manager_user_id = manager.id
WHERE NOT EXISTS (
  SELECT 1 FROM team_members AS existing
  WHERE existing.team_id = team.id
    AND existing.player_profile_id = profile.id
    AND existing.is_active = TRUE
)
ON CONFLICT DO NOTHING;

-- Two approved teams per seeded tournament, within each event's capacity.
INSERT INTO tournament_registrations (
  tournament_id, team_id, registered_by_user_id, status, eligibility_status,
  registration_name, notes, registered_at, reviewed_at, reviewed_by_user_id
)
SELECT tournament.id, team.id, team.manager_user_id, 'approved', 'approved',
       team.name, 'Seeded local demo team registration.', NOW() - INTERVAL '1 day',
       NOW() - INTERVAL '1 day', organizer.id
FROM demo_team_rosters AS roster
JOIN tournaments AS tournament ON tournament.name = roster.tournament_name
JOIN teams AS team ON team.name = roster.team_name
JOIN users AS organizer ON organizer.email = 'organizer@playsphere.local'
WHERE NOT EXISTS (
  SELECT 1 FROM tournament_registrations AS existing
  WHERE existing.tournament_id = tournament.id
    AND existing.team_id = team.id
    AND existing.status IN ('pending', 'approved')
);

-- Store the current roster snapshot on each approved tournament entry.
INSERT INTO tournament_registration_players (
  registration_id, player_profile_id, is_captain, jersey_number
)
SELECT registration.id, member.player_profile_id,
       member.team_role = 'captain', member.jersey_number
FROM tournament_registrations AS registration
JOIN teams AS team ON team.id = registration.team_id
JOIN team_members AS member ON member.team_id = team.id AND member.is_active = TRUE
JOIN demo_team_rosters AS roster ON roster.team_name = team.name
WHERE registration.status = 'approved'
ON CONFLICT (registration_id, player_profile_id) DO NOTHING;

COMMIT;

-- =============================================================================
-- END OF LOCAL DEMO SEED
-- =============================================================================
