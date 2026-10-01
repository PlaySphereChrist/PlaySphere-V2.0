-- =============================================================================
-- PlaySphere — Demo Expanded Rosters + Performance Data
-- Requires seeds 001–007. Idempotent: re-running is safe.
-- Brings every team up to sport-correct player counts and adds 4 more teams
-- per active tournament (targeting 8 teams per event) for richer brackets.
-- Also seeds realistic performance_events so the Stats panel is populated.
-- Football: 11 players/team · Cricket: 11 · Basketball: 5 · Volleyball: 6
-- Badminton: 2 (doubles) — already correct, just adding more teams.
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- STEP 1: Top-up existing teams to sport-correct sizes
-- ---------------------------------------------------------------------------

-- ★ Football teams — was 7, need 11 (+4 each)
-- Demo Bengaluru United (existing: Aarav Menon, Ishaan Rao, Kabir Nair,
--   Vihaan Iyer, Arjun Kulkarni, Rohan Desai, Aditya Shah)
INSERT INTO users (email, password_hash, is_active, is_email_verified)
VALUES
  ('demo.fb.bu.08@playsphere.local', (SELECT password_hash FROM users WHERE email = 'organizer@playsphere.local' LIMIT 1), TRUE, TRUE),
  ('demo.fb.bu.09@playsphere.local', (SELECT password_hash FROM users WHERE email = 'organizer@playsphere.local' LIMIT 1), TRUE, TRUE),
  ('demo.fb.bu.10@playsphere.local', (SELECT password_hash FROM users WHERE email = 'organizer@playsphere.local' LIMIT 1), TRUE, TRUE),
  ('demo.fb.bu.11@playsphere.local', (SELECT password_hash FROM users WHERE email = 'organizer@playsphere.local' LIMIT 1), TRUE, TRUE)
ON CONFLICT (email) DO NOTHING;

INSERT INTO user_roles (user_id, role_id, assigned_by)
SELECT u.id, r.id, o.id
FROM (VALUES
  ('demo.fb.bu.08@playsphere.local'),
  ('demo.fb.bu.09@playsphere.local'),
  ('demo.fb.bu.10@playsphere.local'),
  ('demo.fb.bu.11@playsphere.local')
) AS emails(email)
JOIN users u ON u.email = emails.email
JOIN roles r ON r.name = 'USER'
JOIN users o ON o.email = 'organizer@playsphere.local'
ON CONFLICT DO NOTHING;

INSERT INTO player_profiles (user_id, display_name, bio, city, state, is_public)
SELECT u.id, names.display_name, 'Demo player for Bengaluru United.', 'Bengaluru', 'Karnataka', TRUE
FROM (VALUES
  ('demo.fb.bu.08@playsphere.local', 'Shaan Pillai'),
  ('demo.fb.bu.09@playsphere.local', 'Rishi Bhat'),
  ('demo.fb.bu.10@playsphere.local', 'Kiran Murthy'),
  ('demo.fb.bu.11@playsphere.local', 'Tarun Hegde')
) AS names(email, display_name)
JOIN users u ON u.email = names.email
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO player_sport_profiles (player_profile_id, sport_id, skill_level, years_of_experience, is_primary)
SELECT pp.id, s.id, 'intermediate', 2, TRUE
FROM (VALUES
  ('demo.fb.bu.08@playsphere.local'),
  ('demo.fb.bu.09@playsphere.local'),
  ('demo.fb.bu.10@playsphere.local'),
  ('demo.fb.bu.11@playsphere.local')
) AS emails(email)
JOIN users u ON u.email = emails.email
JOIN player_profiles pp ON pp.user_id = u.id
JOIN sports s ON s.slug = 'football'
ON CONFLICT (player_profile_id, sport_id) DO NOTHING;

INSERT INTO team_members (team_id, player_profile_id, team_role, jersey_number)
SELECT t.id, pp.id, 'player', nums.jersey_number
FROM (VALUES
  ('demo.fb.bu.08@playsphere.local', 8),
  ('demo.fb.bu.09@playsphere.local', 9),
  ('demo.fb.bu.10@playsphere.local', 10),
  ('demo.fb.bu.11@playsphere.local', 11)
) AS nums(email, jersey_number)
JOIN users u ON u.email = nums.email
JOIN player_profiles pp ON pp.user_id = u.id
JOIN teams t ON t.name = 'Demo Bengaluru United'
WHERE NOT EXISTS (
  SELECT 1 FROM team_members tm WHERE tm.team_id = t.id AND tm.player_profile_id = pp.id AND tm.is_active = TRUE
)
ON CONFLICT DO NOTHING;

-- Demo Eastside Rovers (existing: Dev Patel, Reyansh Mehta, Ayaan Kapoor,
--   Karthik Reddy, Siddharth Joshi, Neel Verma, Manav Shetty)
INSERT INTO users (email, password_hash, is_active, is_email_verified)
VALUES
  ('demo.fb.er.08@playsphere.local', (SELECT password_hash FROM users WHERE email = 'organizer@playsphere.local' LIMIT 1), TRUE, TRUE),
  ('demo.fb.er.09@playsphere.local', (SELECT password_hash FROM users WHERE email = 'organizer@playsphere.local' LIMIT 1), TRUE, TRUE),
  ('demo.fb.er.10@playsphere.local', (SELECT password_hash FROM users WHERE email = 'organizer@playsphere.local' LIMIT 1), TRUE, TRUE),
  ('demo.fb.er.11@playsphere.local', (SELECT password_hash FROM users WHERE email = 'organizer@playsphere.local' LIMIT 1), TRUE, TRUE)
ON CONFLICT (email) DO NOTHING;

INSERT INTO user_roles (user_id, role_id, assigned_by)
SELECT u.id, r.id, o.id
FROM (VALUES
  ('demo.fb.er.08@playsphere.local'),
  ('demo.fb.er.09@playsphere.local'),
  ('demo.fb.er.10@playsphere.local'),
  ('demo.fb.er.11@playsphere.local')
) AS emails(email)
JOIN users u ON u.email = emails.email
JOIN roles r ON r.name = 'USER'
JOIN users o ON o.email = 'organizer@playsphere.local'
ON CONFLICT DO NOTHING;

INSERT INTO player_profiles (user_id, display_name, bio, city, state, is_public)
SELECT u.id, names.display_name, 'Demo player for Eastside Rovers.', 'Bengaluru', 'Karnataka', TRUE
FROM (VALUES
  ('demo.fb.er.08@playsphere.local', 'Harsh Bose'),
  ('demo.fb.er.09@playsphere.local', 'Lakshay Gupta'),
  ('demo.fb.er.10@playsphere.local', 'Pratham Jain'),
  ('demo.fb.er.11@playsphere.local', 'Suraj Anand')
) AS names(email, display_name)
JOIN users u ON u.email = names.email
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO player_sport_profiles (player_profile_id, sport_id, skill_level, years_of_experience, is_primary)
SELECT pp.id, s.id, 'intermediate', 2, TRUE
FROM (VALUES
  ('demo.fb.er.08@playsphere.local'),
  ('demo.fb.er.09@playsphere.local'),
  ('demo.fb.er.10@playsphere.local'),
  ('demo.fb.er.11@playsphere.local')
) AS emails(email)
JOIN users u ON u.email = emails.email
JOIN player_profiles pp ON pp.user_id = u.id
JOIN sports s ON s.slug = 'football'
ON CONFLICT (player_profile_id, sport_id) DO NOTHING;

INSERT INTO team_members (team_id, player_profile_id, team_role, jersey_number)
SELECT t.id, pp.id, 'player', nums.jersey_number
FROM (VALUES
  ('demo.fb.er.08@playsphere.local', 8),
  ('demo.fb.er.09@playsphere.local', 9),
  ('demo.fb.er.10@playsphere.local', 10),
  ('demo.fb.er.11@playsphere.local', 11)
) AS nums(email, jersey_number)
JOIN users u ON u.email = nums.email
JOIN player_profiles pp ON pp.user_id = u.id
JOIN teams t ON t.name = 'Demo Eastside Rovers'
WHERE NOT EXISTS (
  SELECT 1 FROM team_members tm WHERE tm.team_id = t.id AND tm.player_profile_id = pp.id AND tm.is_active = TRUE
)
ON CONFLICT DO NOTHING;

-- Demo Eastside FC (from seed 007, also 7 players)
INSERT INTO users (email, password_hash, is_active, is_email_verified)
VALUES
  ('demo.fb.efc.08@playsphere.local', (SELECT password_hash FROM users WHERE email = 'organizer@playsphere.local' LIMIT 1), TRUE, TRUE),
  ('demo.fb.efc.09@playsphere.local', (SELECT password_hash FROM users WHERE email = 'organizer@playsphere.local' LIMIT 1), TRUE, TRUE),
  ('demo.fb.efc.10@playsphere.local', (SELECT password_hash FROM users WHERE email = 'organizer@playsphere.local' LIMIT 1), TRUE, TRUE),
  ('demo.fb.efc.11@playsphere.local', (SELECT password_hash FROM users WHERE email = 'organizer@playsphere.local' LIMIT 1), TRUE, TRUE)
ON CONFLICT (email) DO NOTHING;

INSERT INTO user_roles (user_id, role_id, assigned_by)
SELECT u.id, r.id, o.id
FROM (VALUES
  ('demo.fb.efc.08@playsphere.local'),
  ('demo.fb.efc.09@playsphere.local'),
  ('demo.fb.efc.10@playsphere.local'),
  ('demo.fb.efc.11@playsphere.local')
) AS emails(email)
JOIN users u ON u.email = emails.email
JOIN roles r ON r.name = 'USER'
JOIN users o ON o.email = 'organizer@playsphere.local'
ON CONFLICT DO NOTHING;

INSERT INTO player_profiles (user_id, display_name, bio, city, state, is_public)
SELECT u.id, names.display_name, 'Demo player for Eastside FC.', 'Bengaluru', 'Karnataka', TRUE
FROM (VALUES
  ('demo.fb.efc.08@playsphere.local', 'Aman Trivedi'),
  ('demo.fb.efc.09@playsphere.local', 'Rahul Choudhury'),
  ('demo.fb.efc.10@playsphere.local', 'Nitin Saxena'),
  ('demo.fb.efc.11@playsphere.local', 'Gautam Suri')
) AS names(email, display_name)
JOIN users u ON u.email = names.email
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO player_sport_profiles (player_profile_id, sport_id, skill_level, years_of_experience, is_primary)
SELECT pp.id, s.id, 'intermediate', 2, TRUE
FROM (VALUES
  ('demo.fb.efc.08@playsphere.local'),
  ('demo.fb.efc.09@playsphere.local'),
  ('demo.fb.efc.10@playsphere.local'),
  ('demo.fb.efc.11@playsphere.local')
) AS emails(email)
JOIN users u ON u.email = emails.email
JOIN player_profiles pp ON pp.user_id = u.id
JOIN sports s ON s.slug = 'football'
ON CONFLICT (player_profile_id, sport_id) DO NOTHING;

INSERT INTO team_members (team_id, player_profile_id, team_role, jersey_number)
SELECT t.id, pp.id, 'player', nums.jersey_number
FROM (VALUES
  ('demo.fb.efc.08@playsphere.local', 8),
  ('demo.fb.efc.09@playsphere.local', 9),
  ('demo.fb.efc.10@playsphere.local', 10),
  ('demo.fb.efc.11@playsphere.local', 11)
) AS nums(email, jersey_number)
JOIN users u ON u.email = nums.email
JOIN player_profiles pp ON pp.user_id = u.id
JOIN teams t ON t.name = 'Demo Eastside FC'
WHERE NOT EXISTS (
  SELECT 1 FROM team_members tm WHERE tm.team_id = t.id AND tm.player_profile_id = pp.id AND tm.is_active = TRUE
)
ON CONFLICT DO NOTHING;

-- Demo South City Strikers (from seed 007, also 7 players)
INSERT INTO users (email, password_hash, is_active, is_email_verified)
VALUES
  ('demo.fb.scs.08@playsphere.local', (SELECT password_hash FROM users WHERE email = 'organizer@playsphere.local' LIMIT 1), TRUE, TRUE),
  ('demo.fb.scs.09@playsphere.local', (SELECT password_hash FROM users WHERE email = 'organizer@playsphere.local' LIMIT 1), TRUE, TRUE),
  ('demo.fb.scs.10@playsphere.local', (SELECT password_hash FROM users WHERE email = 'organizer@playsphere.local' LIMIT 1), TRUE, TRUE),
  ('demo.fb.scs.11@playsphere.local', (SELECT password_hash FROM users WHERE email = 'organizer@playsphere.local' LIMIT 1), TRUE, TRUE)
ON CONFLICT (email) DO NOTHING;

INSERT INTO user_roles (user_id, role_id, assigned_by)
SELECT u.id, r.id, o.id
FROM (VALUES
  ('demo.fb.scs.08@playsphere.local'),
  ('demo.fb.scs.09@playsphere.local'),
  ('demo.fb.scs.10@playsphere.local'),
  ('demo.fb.scs.11@playsphere.local')
) AS emails(email)
JOIN users u ON u.email = emails.email
JOIN roles r ON r.name = 'USER'
JOIN users o ON o.email = 'organizer@playsphere.local'
ON CONFLICT DO NOTHING;

INSERT INTO player_profiles (user_id, display_name, bio, city, state, is_public)
SELECT u.id, names.display_name, 'Demo player for South City Strikers.', 'Bengaluru', 'Karnataka', TRUE
FROM (VALUES
  ('demo.fb.scs.08@playsphere.local', 'Prateek Varma'),
  ('demo.fb.scs.09@playsphere.local', 'Vivek Chandra'),
  ('demo.fb.scs.10@playsphere.local', 'Deepak Pillai'),
  ('demo.fb.scs.11@playsphere.local', 'Vishal Kumar')
) AS names(email, display_name)
JOIN users u ON u.email = names.email
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO player_sport_profiles (player_profile_id, sport_id, skill_level, years_of_experience, is_primary)
SELECT pp.id, s.id, 'intermediate', 2, TRUE
FROM (VALUES
  ('demo.fb.scs.08@playsphere.local'),
  ('demo.fb.scs.09@playsphere.local'),
  ('demo.fb.scs.10@playsphere.local'),
  ('demo.fb.scs.11@playsphere.local')
) AS emails(email)
JOIN users u ON u.email = emails.email
JOIN player_profiles pp ON pp.user_id = u.id
JOIN sports s ON s.slug = 'football'
ON CONFLICT (player_profile_id, sport_id) DO NOTHING;

INSERT INTO team_members (team_id, player_profile_id, team_role, jersey_number)
SELECT t.id, pp.id, 'player', nums.jersey_number
FROM (VALUES
  ('demo.fb.scs.08@playsphere.local', 8),
  ('demo.fb.scs.09@playsphere.local', 9),
  ('demo.fb.scs.10@playsphere.local', 10),
  ('demo.fb.scs.11@playsphere.local', 11)
) AS nums(email, jersey_number)
JOIN users u ON u.email = nums.email
JOIN player_profiles pp ON pp.user_id = u.id
JOIN teams t ON t.name = 'Demo South City Strikers'
WHERE NOT EXISTS (
  SELECT 1 FROM team_members tm WHERE tm.team_id = t.id AND tm.player_profile_id = pp.id AND tm.is_active = TRUE
)
ON CONFLICT DO NOTHING;

-- ★ Cricket teams — was 7, need 11 (+4 each)
-- Demo Boundary Breakers XI (existing 7 players from seed 005)
INSERT INTO users (email, password_hash, is_active, is_email_verified)
VALUES
  ('demo.cr.bb.08@playsphere.local', (SELECT password_hash FROM users WHERE email = 'organizer@playsphere.local' LIMIT 1), TRUE, TRUE),
  ('demo.cr.bb.09@playsphere.local', (SELECT password_hash FROM users WHERE email = 'organizer@playsphere.local' LIMIT 1), TRUE, TRUE),
  ('demo.cr.bb.10@playsphere.local', (SELECT password_hash FROM users WHERE email = 'organizer@playsphere.local' LIMIT 1), TRUE, TRUE),
  ('demo.cr.bb.11@playsphere.local', (SELECT password_hash FROM users WHERE email = 'organizer@playsphere.local' LIMIT 1), TRUE, TRUE)
ON CONFLICT (email) DO NOTHING;

INSERT INTO user_roles (user_id, role_id, assigned_by)
SELECT u.id, r.id, o.id
FROM (VALUES
  ('demo.cr.bb.08@playsphere.local'), ('demo.cr.bb.09@playsphere.local'),
  ('demo.cr.bb.10@playsphere.local'), ('demo.cr.bb.11@playsphere.local')
) AS emails(email)
JOIN users u ON u.email = emails.email
JOIN roles r ON r.name = 'USER'
JOIN users o ON o.email = 'organizer@playsphere.local'
ON CONFLICT DO NOTHING;

INSERT INTO player_profiles (user_id, display_name, bio, city, state, is_public)
SELECT u.id, names.display_name, 'Demo cricketer for Boundary Breakers XI.', 'Bengaluru', 'Karnataka', TRUE
FROM (VALUES
  ('demo.cr.bb.08@playsphere.local', 'Vikram Naik'),
  ('demo.cr.bb.09@playsphere.local', 'Sachin Dubey'),
  ('demo.cr.bb.10@playsphere.local', 'Ajay Mishra'),
  ('demo.cr.bb.11@playsphere.local', 'Punit Rana')
) AS names(email, display_name)
JOIN users u ON u.email = names.email
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO player_sport_profiles (player_profile_id, sport_id, skill_level, years_of_experience, is_primary)
SELECT pp.id, s.id, 'intermediate', 3, TRUE
FROM (VALUES
  ('demo.cr.bb.08@playsphere.local'), ('demo.cr.bb.09@playsphere.local'),
  ('demo.cr.bb.10@playsphere.local'), ('demo.cr.bb.11@playsphere.local')
) AS emails(email)
JOIN users u ON u.email = emails.email
JOIN player_profiles pp ON pp.user_id = u.id
JOIN sports s ON s.slug = 'cricket'
ON CONFLICT (player_profile_id, sport_id) DO NOTHING;

INSERT INTO team_members (team_id, player_profile_id, team_role, jersey_number)
SELECT t.id, pp.id, 'player', nums.jersey_number
FROM (VALUES
  ('demo.cr.bb.08@playsphere.local', 8), ('demo.cr.bb.09@playsphere.local', 9),
  ('demo.cr.bb.10@playsphere.local', 10), ('demo.cr.bb.11@playsphere.local', 11)
) AS nums(email, jersey_number)
JOIN users u ON u.email = nums.email
JOIN player_profiles pp ON pp.user_id = u.id
JOIN teams t ON t.name = 'Demo Boundary Breakers XI'
WHERE NOT EXISTS (
  SELECT 1 FROM team_members tm WHERE tm.team_id = t.id AND tm.player_profile_id = pp.id AND tm.is_active = TRUE
)
ON CONFLICT DO NOTHING;

-- Demo Weekend Warriors XI (existing 7 players from seed 005)
INSERT INTO users (email, password_hash, is_active, is_email_verified)
VALUES
  ('demo.cr.ww.08@playsphere.local', (SELECT password_hash FROM users WHERE email = 'organizer@playsphere.local' LIMIT 1), TRUE, TRUE),
  ('demo.cr.ww.09@playsphere.local', (SELECT password_hash FROM users WHERE email = 'organizer@playsphere.local' LIMIT 1), TRUE, TRUE),
  ('demo.cr.ww.10@playsphere.local', (SELECT password_hash FROM users WHERE email = 'organizer@playsphere.local' LIMIT 1), TRUE, TRUE),
  ('demo.cr.ww.11@playsphere.local', (SELECT password_hash FROM users WHERE email = 'organizer@playsphere.local' LIMIT 1), TRUE, TRUE)
ON CONFLICT (email) DO NOTHING;

INSERT INTO user_roles (user_id, role_id, assigned_by)
SELECT u.id, r.id, o.id
FROM (VALUES
  ('demo.cr.ww.08@playsphere.local'), ('demo.cr.ww.09@playsphere.local'),
  ('demo.cr.ww.10@playsphere.local'), ('demo.cr.ww.11@playsphere.local')
) AS emails(email)
JOIN users u ON u.email = emails.email
JOIN roles r ON r.name = 'USER'
JOIN users o ON o.email = 'organizer@playsphere.local'
ON CONFLICT DO NOTHING;

INSERT INTO player_profiles (user_id, display_name, bio, city, state, is_public)
SELECT u.id, names.display_name, 'Demo cricketer for Weekend Warriors XI.', 'Bengaluru', 'Karnataka', TRUE
FROM (VALUES
  ('demo.cr.ww.08@playsphere.local', 'Pooja Trivedi'),
  ('demo.cr.ww.09@playsphere.local', 'Swati Desai'),
  ('demo.cr.ww.10@playsphere.local', 'Rupali Shetty'),
  ('demo.cr.ww.11@playsphere.local', 'Arun Verma')
) AS names(email, display_name)
JOIN users u ON u.email = names.email
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO player_sport_profiles (player_profile_id, sport_id, skill_level, years_of_experience, is_primary)
SELECT pp.id, s.id, 'intermediate', 3, TRUE
FROM (VALUES
  ('demo.cr.ww.08@playsphere.local'), ('demo.cr.ww.09@playsphere.local'),
  ('demo.cr.ww.10@playsphere.local'), ('demo.cr.ww.11@playsphere.local')
) AS emails(email)
JOIN users u ON u.email = emails.email
JOIN player_profiles pp ON pp.user_id = u.id
JOIN sports s ON s.slug = 'cricket'
ON CONFLICT (player_profile_id, sport_id) DO NOTHING;

INSERT INTO team_members (team_id, player_profile_id, team_role, jersey_number)
SELECT t.id, pp.id, 'player', nums.jersey_number
FROM (VALUES
  ('demo.cr.ww.08@playsphere.local', 8), ('demo.cr.ww.09@playsphere.local', 9),
  ('demo.cr.ww.10@playsphere.local', 10), ('demo.cr.ww.11@playsphere.local', 11)
) AS nums(email, jersey_number)
JOIN users u ON u.email = nums.email
JOIN player_profiles pp ON pp.user_id = u.id
JOIN teams t ON t.name = 'Demo Weekend Warriors XI'
WHERE NOT EXISTS (
  SELECT 1 FROM team_members tm WHERE tm.team_id = t.id AND tm.player_profile_id = pp.id AND tm.is_active = TRUE
)
ON CONFLICT DO NOTHING;

-- Demo Boundary Breakers (seed 007)
INSERT INTO users (email, password_hash, is_active, is_email_verified)
VALUES
  ('demo.cr.bb2.08@playsphere.local', (SELECT password_hash FROM users WHERE email = 'organizer@playsphere.local' LIMIT 1), TRUE, TRUE),
  ('demo.cr.bb2.09@playsphere.local', (SELECT password_hash FROM users WHERE email = 'organizer@playsphere.local' LIMIT 1), TRUE, TRUE),
  ('demo.cr.bb2.10@playsphere.local', (SELECT password_hash FROM users WHERE email = 'organizer@playsphere.local' LIMIT 1), TRUE, TRUE),
  ('demo.cr.bb2.11@playsphere.local', (SELECT password_hash FROM users WHERE email = 'organizer@playsphere.local' LIMIT 1), TRUE, TRUE)
ON CONFLICT (email) DO NOTHING;

INSERT INTO user_roles (user_id, role_id, assigned_by)
SELECT u.id, r.id, o.id
FROM (VALUES
  ('demo.cr.bb2.08@playsphere.local'), ('demo.cr.bb2.09@playsphere.local'),
  ('demo.cr.bb2.10@playsphere.local'), ('demo.cr.bb2.11@playsphere.local')
) AS emails(email)
JOIN users u ON u.email = emails.email
JOIN roles r ON r.name = 'USER'
JOIN users o ON o.email = 'organizer@playsphere.local'
ON CONFLICT DO NOTHING;

INSERT INTO player_profiles (user_id, display_name, bio, city, state, is_public)
SELECT u.id, names.display_name, 'Demo cricketer for Boundary Breakers.', 'Bengaluru', 'Karnataka', TRUE
FROM (VALUES
  ('demo.cr.bb2.08@playsphere.local', 'Rohan Srinivas'),
  ('demo.cr.bb2.09@playsphere.local', 'Sanjay Iyer'),
  ('demo.cr.bb2.10@playsphere.local', 'Akash Dey'),
  ('demo.cr.bb2.11@playsphere.local', 'Varun Nair')
) AS names(email, display_name)
JOIN users u ON u.email = names.email
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO player_sport_profiles (player_profile_id, sport_id, skill_level, years_of_experience, is_primary)
SELECT pp.id, s.id, 'intermediate', 3, TRUE
FROM (VALUES
  ('demo.cr.bb2.08@playsphere.local'), ('demo.cr.bb2.09@playsphere.local'),
  ('demo.cr.bb2.10@playsphere.local'), ('demo.cr.bb2.11@playsphere.local')
) AS emails(email)
JOIN users u ON u.email = emails.email
JOIN player_profiles pp ON pp.user_id = u.id
JOIN sports s ON s.slug = 'cricket'
ON CONFLICT (player_profile_id, sport_id) DO NOTHING;

INSERT INTO team_members (team_id, player_profile_id, team_role, jersey_number)
SELECT t.id, pp.id, 'player', nums.jersey_number
FROM (VALUES
  ('demo.cr.bb2.08@playsphere.local', 8), ('demo.cr.bb2.09@playsphere.local', 9),
  ('demo.cr.bb2.10@playsphere.local', 10), ('demo.cr.bb2.11@playsphere.local', 11)
) AS nums(email, jersey_number)
JOIN users u ON u.email = nums.email
JOIN player_profiles pp ON pp.user_id = u.id
JOIN teams t ON t.name = 'Demo Boundary Breakers'
WHERE NOT EXISTS (
  SELECT 1 FROM team_members tm WHERE tm.team_id = t.id AND tm.player_profile_id = pp.id AND tm.is_active = TRUE
)
ON CONFLICT DO NOTHING;

-- Demo Weekend XI (seed 007)
INSERT INTO users (email, password_hash, is_active, is_email_verified)
VALUES
  ('demo.cr.wx.08@playsphere.local', (SELECT password_hash FROM users WHERE email = 'organizer@playsphere.local' LIMIT 1), TRUE, TRUE),
  ('demo.cr.wx.09@playsphere.local', (SELECT password_hash FROM users WHERE email = 'organizer@playsphere.local' LIMIT 1), TRUE, TRUE),
  ('demo.cr.wx.10@playsphere.local', (SELECT password_hash FROM users WHERE email = 'organizer@playsphere.local' LIMIT 1), TRUE, TRUE),
  ('demo.cr.wx.11@playsphere.local', (SELECT password_hash FROM users WHERE email = 'organizer@playsphere.local' LIMIT 1), TRUE, TRUE)
ON CONFLICT (email) DO NOTHING;

INSERT INTO user_roles (user_id, role_id, assigned_by)
SELECT u.id, r.id, o.id
FROM (VALUES
  ('demo.cr.wx.08@playsphere.local'), ('demo.cr.wx.09@playsphere.local'),
  ('demo.cr.wx.10@playsphere.local'), ('demo.cr.wx.11@playsphere.local')
) AS emails(email)
JOIN users u ON u.email = emails.email
JOIN roles r ON r.name = 'USER'
JOIN users o ON o.email = 'organizer@playsphere.local'
ON CONFLICT DO NOTHING;

INSERT INTO player_profiles (user_id, display_name, bio, city, state, is_public)
SELECT u.id, names.display_name, 'Demo cricketer for Weekend XI.', 'Bengaluru', 'Karnataka', TRUE
FROM (VALUES
  ('demo.cr.wx.08@playsphere.local', 'Priya Menon'),
  ('demo.cr.wx.09@playsphere.local', 'Divya Rao'),
  ('demo.cr.wx.10@playsphere.local', 'Kriti Saha'),
  ('demo.cr.wx.11@playsphere.local', 'Nidhi Kapoor')
) AS names(email, display_name)
JOIN users u ON u.email = names.email
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO player_sport_profiles (player_profile_id, sport_id, skill_level, years_of_experience, is_primary)
SELECT pp.id, s.id, 'intermediate', 2, TRUE
FROM (VALUES
  ('demo.cr.wx.08@playsphere.local'), ('demo.cr.wx.09@playsphere.local'),
  ('demo.cr.wx.10@playsphere.local'), ('demo.cr.wx.11@playsphere.local')
) AS emails(email)
JOIN users u ON u.email = emails.email
JOIN player_profiles pp ON pp.user_id = u.id
JOIN sports s ON s.slug = 'cricket'
ON CONFLICT (player_profile_id, sport_id) DO NOTHING;

INSERT INTO team_members (team_id, player_profile_id, team_role, jersey_number)
SELECT t.id, pp.id, 'player', nums.jersey_number
FROM (VALUES
  ('demo.cr.wx.08@playsphere.local', 8), ('demo.cr.wx.09@playsphere.local', 9),
  ('demo.cr.wx.10@playsphere.local', 10), ('demo.cr.wx.11@playsphere.local', 11)
) AS nums(email, jersey_number)
JOIN users u ON u.email = nums.email
JOIN player_profiles pp ON pp.user_id = u.id
JOIN teams t ON t.name = 'Demo Weekend XI'
WHERE NOT EXISTS (
  SELECT 1 FROM team_members tm WHERE tm.team_id = t.id AND tm.player_profile_id = pp.id AND tm.is_active = TRUE
)
ON CONFLICT DO NOTHING;

-- ★ Basketball teams — was 3, need 5 (+2 each)
-- Demo Baseline Collective Entrants
INSERT INTO users (email, password_hash, is_active, is_email_verified)
VALUES
  ('demo.bk.bce.04@playsphere.local', (SELECT password_hash FROM users WHERE email = 'organizer@playsphere.local' LIMIT 1), TRUE, TRUE),
  ('demo.bk.bce.05@playsphere.local', (SELECT password_hash FROM users WHERE email = 'organizer@playsphere.local' LIMIT 1), TRUE, TRUE)
ON CONFLICT (email) DO NOTHING;

INSERT INTO user_roles (user_id, role_id, assigned_by)
SELECT u.id, r.id, o.id
FROM (VALUES ('demo.bk.bce.04@playsphere.local'), ('demo.bk.bce.05@playsphere.local')) AS emails(email)
JOIN users u ON u.email = emails.email
JOIN roles r ON r.name = 'USER'
JOIN users o ON o.email = 'organizer@playsphere.local'
ON CONFLICT DO NOTHING;

INSERT INTO player_profiles (user_id, display_name, bio, city, state, is_public)
SELECT u.id, names.display_name, 'Demo basketball player.', 'Bengaluru', 'Karnataka', TRUE
FROM (VALUES
  ('demo.bk.bce.04@playsphere.local', 'Sanika Patel'),
  ('demo.bk.bce.05@playsphere.local', 'Ritu Nair')
) AS names(email, display_name)
JOIN users u ON u.email = names.email
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO player_sport_profiles (player_profile_id, sport_id, skill_level, years_of_experience, is_primary)
SELECT pp.id, s.id, 'intermediate', 2, TRUE
FROM (VALUES ('demo.bk.bce.04@playsphere.local'), ('demo.bk.bce.05@playsphere.local')) AS emails(email)
JOIN users u ON u.email = emails.email
JOIN player_profiles pp ON pp.user_id = u.id
JOIN sports s ON s.slug = 'basketball'
ON CONFLICT (player_profile_id, sport_id) DO NOTHING;

INSERT INTO team_members (team_id, player_profile_id, team_role, jersey_number)
SELECT t.id, pp.id, 'player', nums.jersey_number
FROM (VALUES ('demo.bk.bce.04@playsphere.local', 4), ('demo.bk.bce.05@playsphere.local', 5)) AS nums(email, jersey_number)
JOIN users u ON u.email = nums.email
JOIN player_profiles pp ON pp.user_id = u.id
JOIN teams t ON t.name = 'Demo Baseline Collective Entrants'
WHERE NOT EXISTS (
  SELECT 1 FROM team_members tm WHERE tm.team_id = t.id AND tm.player_profile_id = pp.id AND tm.is_active = TRUE
)
ON CONFLICT DO NOTHING;

-- Demo Baseline Collective (seed 007)
INSERT INTO users (email, password_hash, is_active, is_email_verified)
VALUES
  ('demo.bk.bc.04@playsphere.local', (SELECT password_hash FROM users WHERE email = 'organizer@playsphere.local' LIMIT 1), TRUE, TRUE),
  ('demo.bk.bc.05@playsphere.local', (SELECT password_hash FROM users WHERE email = 'organizer@playsphere.local' LIMIT 1), TRUE, TRUE)
ON CONFLICT (email) DO NOTHING;

INSERT INTO user_roles (user_id, role_id, assigned_by)
SELECT u.id, r.id, o.id
FROM (VALUES ('demo.bk.bc.04@playsphere.local'), ('demo.bk.bc.05@playsphere.local')) AS emails(email)
JOIN users u ON u.email = emails.email
JOIN roles r ON r.name = 'USER'
JOIN users o ON o.email = 'organizer@playsphere.local'
ON CONFLICT DO NOTHING;

INSERT INTO player_profiles (user_id, display_name, bio, city, state, is_public)
SELECT u.id, names.display_name, 'Demo basketball player for Baseline Collective.', 'Bengaluru', 'Karnataka', TRUE
FROM (VALUES
  ('demo.bk.bc.04@playsphere.local', 'Heena Sharma'),
  ('demo.bk.bc.05@playsphere.local', 'Sonal Bose')
) AS names(email, display_name)
JOIN users u ON u.email = names.email
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO player_sport_profiles (player_profile_id, sport_id, skill_level, years_of_experience, is_primary)
SELECT pp.id, s.id, 'intermediate', 2, TRUE
FROM (VALUES ('demo.bk.bc.04@playsphere.local'), ('demo.bk.bc.05@playsphere.local')) AS emails(email)
JOIN users u ON u.email = emails.email
JOIN player_profiles pp ON pp.user_id = u.id
JOIN sports s ON s.slug = 'basketball'
ON CONFLICT (player_profile_id, sport_id) DO NOTHING;

INSERT INTO team_members (team_id, player_profile_id, team_role, jersey_number)
SELECT t.id, pp.id, 'player', nums.jersey_number
FROM (VALUES ('demo.bk.bc.04@playsphere.local', 4), ('demo.bk.bc.05@playsphere.local', 5)) AS nums(email, jersey_number)
JOIN users u ON u.email = nums.email
JOIN player_profiles pp ON pp.user_id = u.id
JOIN teams t ON t.name = 'Demo Baseline Collective'
WHERE NOT EXISTS (
  SELECT 1 FROM team_members tm WHERE tm.team_id = t.id AND tm.player_profile_id = pp.id AND tm.is_active = TRUE
)
ON CONFLICT DO NOTHING;

-- Demo Court Kings (seed 005)
INSERT INTO users (email, password_hash, is_active, is_email_verified)
VALUES
  ('demo.bk.ck.04@playsphere.local', (SELECT password_hash FROM users WHERE email = 'organizer@playsphere.local' LIMIT 1), TRUE, TRUE),
  ('demo.bk.ck.05@playsphere.local', (SELECT password_hash FROM users WHERE email = 'organizer@playsphere.local' LIMIT 1), TRUE, TRUE)
ON CONFLICT (email) DO NOTHING;

INSERT INTO user_roles (user_id, role_id, assigned_by)
SELECT u.id, r.id, o.id
FROM (VALUES ('demo.bk.ck.04@playsphere.local'), ('demo.bk.ck.05@playsphere.local')) AS emails(email)
JOIN users u ON u.email = emails.email
JOIN roles r ON r.name = 'USER'
JOIN users o ON o.email = 'organizer@playsphere.local'
ON CONFLICT DO NOTHING;

INSERT INTO player_profiles (user_id, display_name, bio, city, state, is_public)
SELECT u.id, names.display_name, 'Demo basketball player for Court Kings.', 'Bengaluru', 'Karnataka', TRUE
FROM (VALUES
  ('demo.bk.ck.04@playsphere.local', 'Preethi Gupta'),
  ('demo.bk.ck.05@playsphere.local', 'Anjali Rao')
) AS names(email, display_name)
JOIN users u ON u.email = names.email
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO player_sport_profiles (player_profile_id, sport_id, skill_level, years_of_experience, is_primary)
SELECT pp.id, s.id, 'intermediate', 2, TRUE
FROM (VALUES ('demo.bk.ck.04@playsphere.local'), ('demo.bk.ck.05@playsphere.local')) AS emails(email)
JOIN users u ON u.email = emails.email
JOIN player_profiles pp ON pp.user_id = u.id
JOIN sports s ON s.slug = 'basketball'
ON CONFLICT (player_profile_id, sport_id) DO NOTHING;

INSERT INTO team_members (team_id, player_profile_id, team_role, jersey_number)
SELECT t.id, pp.id, 'player', nums.jersey_number
FROM (VALUES ('demo.bk.ck.04@playsphere.local', 4), ('demo.bk.ck.05@playsphere.local', 5)) AS nums(email, jersey_number)
JOIN users u ON u.email = nums.email
JOIN player_profiles pp ON pp.user_id = u.id
JOIN teams t ON t.name = 'Demo Court Kings'
WHERE NOT EXISTS (
  SELECT 1 FROM team_members tm WHERE tm.team_id = t.id AND tm.player_profile_id = pp.id AND tm.is_active = TRUE
)
ON CONFLICT DO NOTHING;

-- Demo Midtown Ballers (seed 007)
INSERT INTO users (email, password_hash, is_active, is_email_verified)
VALUES
  ('demo.bk.mb.04@playsphere.local', (SELECT password_hash FROM users WHERE email = 'organizer@playsphere.local' LIMIT 1), TRUE, TRUE),
  ('demo.bk.mb.05@playsphere.local', (SELECT password_hash FROM users WHERE email = 'organizer@playsphere.local' LIMIT 1), TRUE, TRUE)
ON CONFLICT (email) DO NOTHING;

INSERT INTO user_roles (user_id, role_id, assigned_by)
SELECT u.id, r.id, o.id
FROM (VALUES ('demo.bk.mb.04@playsphere.local'), ('demo.bk.mb.05@playsphere.local')) AS emails(email)
JOIN users u ON u.email = emails.email
JOIN roles r ON r.name = 'USER'
JOIN users o ON o.email = 'organizer@playsphere.local'
ON CONFLICT DO NOTHING;

INSERT INTO player_profiles (user_id, display_name, bio, city, state, is_public)
SELECT u.id, names.display_name, 'Demo basketball player for Midtown Ballers.', 'Bengaluru', 'Karnataka', TRUE
FROM (VALUES
  ('demo.bk.mb.04@playsphere.local', 'Kavitha Menon'),
  ('demo.bk.mb.05@playsphere.local', 'Sridevi Nair')
) AS names(email, display_name)
JOIN users u ON u.email = names.email
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO player_sport_profiles (player_profile_id, sport_id, skill_level, years_of_experience, is_primary)
SELECT pp.id, s.id, 'intermediate', 2, TRUE
FROM (VALUES ('demo.bk.mb.04@playsphere.local'), ('demo.bk.mb.05@playsphere.local')) AS emails(email)
JOIN users u ON u.email = emails.email
JOIN player_profiles pp ON pp.user_id = u.id
JOIN sports s ON s.slug = 'basketball'
ON CONFLICT (player_profile_id, sport_id) DO NOTHING;

INSERT INTO team_members (team_id, player_profile_id, team_role, jersey_number)
SELECT t.id, pp.id, 'player', nums.jersey_number
FROM (VALUES ('demo.bk.mb.04@playsphere.local', 4), ('demo.bk.mb.05@playsphere.local', 5)) AS nums(email, jersey_number)
JOIN users u ON u.email = nums.email
JOIN player_profiles pp ON pp.user_id = u.id
JOIN teams t ON t.name = 'Demo Midtown Ballers'
WHERE NOT EXISTS (
  SELECT 1 FROM team_members tm WHERE tm.team_id = t.id AND tm.player_profile_id = pp.id AND tm.is_active = TRUE
)
ON CONFLICT DO NOTHING;

-- ★ Volleyball teams — was 4, need 6 (+2 each)
-- Demo Spike City Entrants
INSERT INTO users (email, password_hash, is_active, is_email_verified)
VALUES
  ('demo.vb.sce.05@playsphere.local', (SELECT password_hash FROM users WHERE email = 'organizer@playsphere.local' LIMIT 1), TRUE, TRUE),
  ('demo.vb.sce.06@playsphere.local', (SELECT password_hash FROM users WHERE email = 'organizer@playsphere.local' LIMIT 1), TRUE, TRUE)
ON CONFLICT (email) DO NOTHING;

INSERT INTO user_roles (user_id, role_id, assigned_by)
SELECT u.id, r.id, o.id
FROM (VALUES ('demo.vb.sce.05@playsphere.local'), ('demo.vb.sce.06@playsphere.local')) AS emails(email)
JOIN users u ON u.email = emails.email
JOIN roles r ON r.name = 'USER'
JOIN users o ON o.email = 'organizer@playsphere.local'
ON CONFLICT DO NOTHING;

INSERT INTO player_profiles (user_id, display_name, bio, city, state, is_public)
SELECT u.id, names.display_name, 'Demo volleyball player for Spike City.', 'Bengaluru', 'Karnataka', TRUE
FROM (VALUES
  ('demo.vb.sce.05@playsphere.local', 'Deepika Bose'),
  ('demo.vb.sce.06@playsphere.local', 'Chitra Sharma')
) AS names(email, display_name)
JOIN users u ON u.email = names.email
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO player_sport_profiles (player_profile_id, sport_id, skill_level, years_of_experience, is_primary)
SELECT pp.id, s.id, 'intermediate', 2, TRUE
FROM (VALUES ('demo.vb.sce.05@playsphere.local'), ('demo.vb.sce.06@playsphere.local')) AS emails(email)
JOIN users u ON u.email = emails.email
JOIN player_profiles pp ON pp.user_id = u.id
JOIN sports s ON s.slug = 'volleyball'
ON CONFLICT (player_profile_id, sport_id) DO NOTHING;

INSERT INTO team_members (team_id, player_profile_id, team_role, jersey_number)
SELECT t.id, pp.id, 'player', nums.jersey_number
FROM (VALUES ('demo.vb.sce.05@playsphere.local', 5), ('demo.vb.sce.06@playsphere.local', 6)) AS nums(email, jersey_number)
JOIN users u ON u.email = nums.email
JOIN player_profiles pp ON pp.user_id = u.id
JOIN teams t ON t.name = 'Demo Spike City Entrants'
WHERE NOT EXISTS (
  SELECT 1 FROM team_members tm WHERE tm.team_id = t.id AND tm.player_profile_id = pp.id AND tm.is_active = TRUE
)
ON CONFLICT DO NOTHING;

-- Demo Skyline Setters
INSERT INTO users (email, password_hash, is_active, is_email_verified)
VALUES
  ('demo.vb.ss.05@playsphere.local', (SELECT password_hash FROM users WHERE email = 'organizer@playsphere.local' LIMIT 1), TRUE, TRUE),
  ('demo.vb.ss.06@playsphere.local', (SELECT password_hash FROM users WHERE email = 'organizer@playsphere.local' LIMIT 1), TRUE, TRUE)
ON CONFLICT (email) DO NOTHING;

INSERT INTO user_roles (user_id, role_id, assigned_by)
SELECT u.id, r.id, o.id
FROM (VALUES ('demo.vb.ss.05@playsphere.local'), ('demo.vb.ss.06@playsphere.local')) AS emails(email)
JOIN users u ON u.email = emails.email
JOIN roles r ON r.name = 'USER'
JOIN users o ON o.email = 'organizer@playsphere.local'
ON CONFLICT DO NOTHING;

INSERT INTO player_profiles (user_id, display_name, bio, city, state, is_public)
SELECT u.id, names.display_name, 'Demo volleyball player for Skyline Setters.', 'Bengaluru', 'Karnataka', TRUE
FROM (VALUES
  ('demo.vb.ss.05@playsphere.local', 'Lalitha Krishnan'),
  ('demo.vb.ss.06@playsphere.local', 'Preethi Varma')
) AS names(email, display_name)
JOIN users u ON u.email = names.email
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO player_sport_profiles (player_profile_id, sport_id, skill_level, years_of_experience, is_primary)
SELECT pp.id, s.id, 'intermediate', 2, TRUE
FROM (VALUES ('demo.vb.ss.05@playsphere.local'), ('demo.vb.ss.06@playsphere.local')) AS emails(email)
JOIN users u ON u.email = emails.email
JOIN player_profiles pp ON pp.user_id = u.id
JOIN sports s ON s.slug = 'volleyball'
ON CONFLICT (player_profile_id, sport_id) DO NOTHING;

INSERT INTO team_members (team_id, player_profile_id, team_role, jersey_number)
SELECT t.id, pp.id, 'player', nums.jersey_number
FROM (VALUES ('demo.vb.ss.05@playsphere.local', 5), ('demo.vb.ss.06@playsphere.local', 6)) AS nums(email, jersey_number)
JOIN users u ON u.email = nums.email
JOIN player_profiles pp ON pp.user_id = u.id
JOIN teams t ON t.name = 'Demo Skyline Setters'
WHERE NOT EXISTS (
  SELECT 1 FROM team_members tm WHERE tm.team_id = t.id AND tm.player_profile_id = pp.id AND tm.is_active = TRUE
)
ON CONFLICT DO NOTHING;

-- Demo Spike City (seed 007)
INSERT INTO users (email, password_hash, is_active, is_email_verified)
VALUES
  ('demo.vb.sc.05@playsphere.local', (SELECT password_hash FROM users WHERE email = 'organizer@playsphere.local' LIMIT 1), TRUE, TRUE),
  ('demo.vb.sc.06@playsphere.local', (SELECT password_hash FROM users WHERE email = 'organizer@playsphere.local' LIMIT 1), TRUE, TRUE)
ON CONFLICT (email) DO NOTHING;

INSERT INTO user_roles (user_id, role_id, assigned_by)
SELECT u.id, r.id, o.id
FROM (VALUES ('demo.vb.sc.05@playsphere.local'), ('demo.vb.sc.06@playsphere.local')) AS emails(email)
JOIN users u ON u.email = emails.email
JOIN roles r ON r.name = 'USER'
JOIN users o ON o.email = 'organizer@playsphere.local'
ON CONFLICT DO NOTHING;

INSERT INTO player_profiles (user_id, display_name, bio, city, state, is_public)
SELECT u.id, names.display_name, 'Demo volleyball player for Spike City.', 'Bengaluru', 'Karnataka', TRUE
FROM (VALUES
  ('demo.vb.sc.05@playsphere.local', 'Surekha Pillai'),
  ('demo.vb.sc.06@playsphere.local', 'Vasantha Rao')
) AS names(email, display_name)
JOIN users u ON u.email = names.email
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO player_sport_profiles (player_profile_id, sport_id, skill_level, years_of_experience, is_primary)
SELECT pp.id, s.id, 'intermediate', 2, TRUE
FROM (VALUES ('demo.vb.sc.05@playsphere.local'), ('demo.vb.sc.06@playsphere.local')) AS emails(email)
JOIN users u ON u.email = emails.email
JOIN player_profiles pp ON pp.user_id = u.id
JOIN sports s ON s.slug = 'volleyball'
ON CONFLICT (player_profile_id, sport_id) DO NOTHING;

INSERT INTO team_members (team_id, player_profile_id, team_role, jersey_number)
SELECT t.id, pp.id, 'player', nums.jersey_number
FROM (VALUES ('demo.vb.sc.05@playsphere.local', 5), ('demo.vb.sc.06@playsphere.local', 6)) AS nums(email, jersey_number)
JOIN users u ON u.email = nums.email
JOIN player_profiles pp ON pp.user_id = u.id
JOIN teams t ON t.name = 'Demo Spike City'
WHERE NOT EXISTS (
  SELECT 1 FROM team_members tm WHERE tm.team_id = t.id AND tm.player_profile_id = pp.id AND tm.is_active = TRUE
)
ON CONFLICT DO NOTHING;

-- Demo Harbor Spikers (seed 007)
INSERT INTO users (email, password_hash, is_active, is_email_verified)
VALUES
  ('demo.vb.hs.05@playsphere.local', (SELECT password_hash FROM users WHERE email = 'organizer@playsphere.local' LIMIT 1), TRUE, TRUE),
  ('demo.vb.hs.06@playsphere.local', (SELECT password_hash FROM users WHERE email = 'organizer@playsphere.local' LIMIT 1), TRUE, TRUE)
ON CONFLICT (email) DO NOTHING;

INSERT INTO user_roles (user_id, role_id, assigned_by)
SELECT u.id, r.id, o.id
FROM (VALUES ('demo.vb.hs.05@playsphere.local'), ('demo.vb.hs.06@playsphere.local')) AS emails(email)
JOIN users u ON u.email = emails.email
JOIN roles r ON r.name = 'USER'
JOIN users o ON o.email = 'organizer@playsphere.local'
ON CONFLICT DO NOTHING;

INSERT INTO player_profiles (user_id, display_name, bio, city, state, is_public)
SELECT u.id, names.display_name, 'Demo volleyball player for Harbor Spikers.', 'Bengaluru', 'Karnataka', TRUE
FROM (VALUES
  ('demo.vb.hs.05@playsphere.local', 'Meghna Srinivas'),
  ('demo.vb.hs.06@playsphere.local', 'Yamini Bhat')
) AS names(email, display_name)
JOIN users u ON u.email = names.email
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO player_sport_profiles (player_profile_id, sport_id, skill_level, years_of_experience, is_primary)
SELECT pp.id, s.id, 'intermediate', 2, TRUE
FROM (VALUES ('demo.vb.hs.05@playsphere.local'), ('demo.vb.hs.06@playsphere.local')) AS emails(email)
JOIN users u ON u.email = emails.email
JOIN player_profiles pp ON pp.user_id = u.id
JOIN sports s ON s.slug = 'volleyball'
ON CONFLICT (player_profile_id, sport_id) DO NOTHING;

INSERT INTO team_members (team_id, player_profile_id, team_role, jersey_number)
SELECT t.id, pp.id, 'player', nums.jersey_number
FROM (VALUES ('demo.vb.hs.05@playsphere.local', 5), ('demo.vb.hs.06@playsphere.local', 6)) AS nums(email, jersey_number)
JOIN users u ON u.email = nums.email
JOIN player_profiles pp ON pp.user_id = u.id
JOIN teams t ON t.name = 'Demo Harbor Spikers'
WHERE NOT EXISTS (
  SELECT 1 FROM team_members tm WHERE tm.team_id = t.id AND tm.player_profile_id = pp.id AND tm.is_active = TRUE
)
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- STEP 2: Add 4 new teams per active tournament (to reach 8 teams each)
-- ---------------------------------------------------------------------------

-- ★ 4 new Football teams
CREATE TEMP TABLE new_football_teams ON COMMIT DROP AS
SELECT * FROM (VALUES
  ('Demo Whitefield Warriors',    ARRAY['Karan Mehta', 'Rahul Joshi', 'Sumit Pal', 'Vikas Tiwari', 'Anand Singh', 'Deepak Yadav', 'Rohit Rao', 'Saurabh Mishra', 'Mahesh Patil', 'Tarun Pillai', 'Vikram Das']::TEXT[]),
  ('Demo Indiranagar XI',         ARRAY['Priya Sharma', 'Nisha Gupta', 'Rekha Bose', 'Sunita Verma', 'Kavitha Iyer', 'Asha Rao', 'Meena Reddy', 'Divya Nair', 'Lakshmi Pillai', 'Sona Menon', 'Amrita Shetty']::TEXT[]),
  ('Demo Koramangala Kickers',    ARRAY['Abhishek Roy', 'Naveen Kumar', 'Srikant Rao', 'Madhav Sharma', 'Pavan Sinha', 'Karthikeyan V', 'Rajan Bhat', 'Sudhir Gupta', 'Amol Desai', 'Pratap Singh', 'Mohan Varma']::TEXT[]),
  ('Demo HSR Layout FC',          ARRAY['Swati Dixit', 'Anjana Menon', 'Rupal Chandra', 'Shalini Bose', 'Geeta Rao', 'Nandita Jain', 'Padma Iyer', 'Shweta Singh', 'Yashoda Kumar', 'Kamala Venkat', 'Sudha Reddy']::TEXT[])
) AS t(team_name, player_names);

-- Create users for all new football players
INSERT INTO users (email, password_hash, is_active, is_email_verified)
SELECT
  'demo.fb.new.' || LPAD(ROW_NUMBER() OVER (ORDER BY t.team_name, idx)::TEXT, 3, '0') || '@playsphere.local',
  (SELECT password_hash FROM users WHERE email = 'organizer@playsphere.local' LIMIT 1), TRUE, TRUE
FROM new_football_teams t
CROSS JOIN LATERAL UNNEST(t.player_names) WITH ORDINALITY AS p(name, idx)
ON CONFLICT (email) DO NOTHING;

-- player_profiles for new football players
INSERT INTO player_profiles (user_id, display_name, bio, city, state, is_public)
SELECT u.id, players.name, 'Demo football player.', 'Bengaluru', 'Karnataka', TRUE
FROM (
  SELECT
    'demo.fb.new.' || LPAD(ROW_NUMBER() OVER (ORDER BY t.team_name, idx)::TEXT, 3, '0') || '@playsphere.local' AS email,
    p.name, t.team_name
  FROM new_football_teams t
  CROSS JOIN LATERAL UNNEST(t.player_names) WITH ORDINALITY AS p(name, idx)
) AS players
JOIN users u ON u.email = players.email
ON CONFLICT (user_id) DO NOTHING;

-- user_roles
INSERT INTO user_roles (user_id, role_id, assigned_by)
SELECT u.id, r.id, o.id
FROM (
  SELECT 'demo.fb.new.' || LPAD(ROW_NUMBER() OVER (ORDER BY t.team_name, idx)::TEXT, 3, '0') || '@playsphere.local' AS email
  FROM new_football_teams t
  CROSS JOIN LATERAL UNNEST(t.player_names) WITH ORDINALITY AS p(name, idx)
) AS emails
JOIN users u ON u.email = emails.email
JOIN roles r ON r.name = 'USER'
JOIN users o ON o.email = 'organizer@playsphere.local'
ON CONFLICT DO NOTHING;

-- sport profiles
INSERT INTO player_sport_profiles (player_profile_id, sport_id, skill_level, years_of_experience, is_primary)
SELECT pp.id, s.id, 'intermediate', 2, TRUE
FROM (
  SELECT 'demo.fb.new.' || LPAD(ROW_NUMBER() OVER (ORDER BY t.team_name, idx)::TEXT, 3, '0') || '@playsphere.local' AS email
  FROM new_football_teams t
  CROSS JOIN LATERAL UNNEST(t.player_names) WITH ORDINALITY AS p(name, idx)
) AS emails
JOIN users u ON u.email = emails.email
JOIN player_profiles pp ON pp.user_id = u.id
JOIN sports s ON s.slug = 'football'
ON CONFLICT (player_profile_id, sport_id) DO NOTHING;

-- Create the teams
INSERT INTO teams (name, sport_id, manager_user_id, description, city)
SELECT t.team_name, s.id, mgr.id, 'New demo football team — expanded roster seed.', 'Bengaluru'
FROM new_football_teams t
JOIN sports s ON s.slug = 'football'
JOIN (
  SELECT team_name,
    'demo.fb.new.' || LPAD(ROW_NUMBER() OVER (ORDER BY team_name, idx)::TEXT, 3, '0') || '@playsphere.local' AS email
  FROM new_football_teams
  CROSS JOIN LATERAL UNNEST(player_names) WITH ORDINALITY AS p(name, idx)
  WHERE idx = 1
) AS first_player ON first_player.team_name = t.team_name
JOIN users mgr ON mgr.email = first_player.email
WHERE NOT EXISTS (SELECT 1 FROM teams ex WHERE ex.name = t.team_name)
ON CONFLICT DO NOTHING;

-- team_members
INSERT INTO team_members (team_id, player_profile_id, team_role, jersey_number)
SELECT tm.id, pp.id,
  CASE WHEN p.idx = 1 THEN 'captain' ELSE 'player' END,
  p.idx::INT
FROM (
  SELECT t.team_name,
    p.name, p.idx,
    'demo.fb.new.' || LPAD(ROW_NUMBER() OVER (ORDER BY t.team_name, p.idx)::TEXT, 3, '0') || '@playsphere.local' AS email
  FROM new_football_teams t
  CROSS JOIN LATERAL UNNEST(t.player_names) WITH ORDINALITY AS p(name, idx)
) AS p
JOIN users u ON u.email = p.email
JOIN player_profiles pp ON pp.user_id = u.id
JOIN teams tm ON tm.name = p.team_name
WHERE NOT EXISTS (
  SELECT 1 FROM team_members ex WHERE ex.team_id = tm.id AND ex.player_profile_id = pp.id AND ex.is_active = TRUE
)
ON CONFLICT DO NOTHING;

-- Register new football teams in Bengaluru Football Cup
INSERT INTO tournament_registrations (
  tournament_id, team_id, registered_by_user_id, status, eligibility_status,
  registration_name, notes, registered_at, reviewed_at, reviewed_by_user_id
)
SELECT tn.id, t.id, t.manager_user_id, 'approved', 'approved',
  t.name, 'Seeded via 008_demo_expanded_rosters.',
  NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days', o.id
FROM new_football_teams nft
JOIN teams t ON t.name = nft.team_name
JOIN tournaments tn ON tn.name = 'Bengaluru Football Cup'
JOIN users o ON o.email = 'organizer@playsphere.local'
WHERE NOT EXISTS (
  SELECT 1 FROM tournament_registrations ex
  WHERE ex.tournament_id = tn.id AND ex.team_id = t.id AND ex.status IN ('pending','approved')
)
ON CONFLICT DO NOTHING;

-- snapshot players into tournament_registration_players for new football teams
INSERT INTO tournament_registration_players (registration_id, player_profile_id, is_captain, jersey_number)
SELECT reg.id, tm.player_profile_id, tm.team_role = 'captain', tm.jersey_number
FROM tournament_registrations reg
JOIN teams t ON t.id = reg.team_id
JOIN team_members tm ON tm.team_id = t.id AND tm.is_active = TRUE
JOIN new_football_teams nft ON nft.team_name = t.name
WHERE reg.status = 'approved'
ON CONFLICT (registration_id, player_profile_id) DO NOTHING;


-- ★ 4 new Cricket teams
CREATE TEMP TABLE new_cricket_teams ON COMMIT DROP AS
SELECT * FROM (VALUES
  ('Demo Thunder Bolts XI', ARRAY['Rajesh Kumar', 'Suresh Rao', 'Mahesh Singh', 'Naresh Pillai', 'Ganesh Iyer', 'Ramesh Bhat', 'Kamlesh Das', 'Viresh Joshi', 'Paresh Nair', 'Naresh Menon', 'Dinesh Shetty']::TEXT[]),
  ('Demo Spin Masters XI', ARRAY['Pooja Rajan', 'Anitha Menon', 'Sudha Naik', 'Latha Bose', 'Saritha Patel', 'Bhavana Rao', 'Sowmya Sharma', 'Komala Iyer', 'Shobha Das', 'Vanitha Pillai', 'Rekha Nair']::TEXT[]),
  ('Demo Power Hitters XI', ARRAY['Aryan Shah', 'Rahul Choudhary', 'Gaurav Tiwari', 'Tarun Yadav', 'Vaibhav Singh', 'Kiran Mishra', 'Rohan Gupta', 'Sanjay Patil', 'Vinay Kumar', 'Abhay Verma', 'Sunil Pandey']::TEXT[]),
  ('Demo Net Warriors XI', ARRAY['Sarika Rao', 'Deepa Krishnan', 'Nalini Sharma', 'Ramya Nair', 'Indira Pillai', 'Jyothi Menon', 'Sushma Iyer', 'Padma Bose', 'Vimala Das', 'Geetha Shetty', 'Hema Reddy']::TEXT[])
) AS t(team_name, player_names);

INSERT INTO users (email, password_hash, is_active, is_email_verified)
SELECT
  'demo.cr.new.' || LPAD(ROW_NUMBER() OVER (ORDER BY t.team_name, idx)::TEXT, 3, '0') || '@playsphere.local',
  (SELECT password_hash FROM users WHERE email = 'organizer@playsphere.local' LIMIT 1), TRUE, TRUE
FROM new_cricket_teams t
CROSS JOIN LATERAL UNNEST(t.player_names) WITH ORDINALITY AS p(name, idx)
ON CONFLICT (email) DO NOTHING;

INSERT INTO player_profiles (user_id, display_name, bio, city, state, is_public)
SELECT u.id, players.name, 'Demo cricket player.', 'Bengaluru', 'Karnataka', TRUE
FROM (
  SELECT 'demo.cr.new.' || LPAD(ROW_NUMBER() OVER (ORDER BY t.team_name, idx)::TEXT, 3, '0') || '@playsphere.local' AS email, p.name, t.team_name
  FROM new_cricket_teams t
  CROSS JOIN LATERAL UNNEST(t.player_names) WITH ORDINALITY AS p(name, idx)
) AS players
JOIN users u ON u.email = players.email
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO user_roles (user_id, role_id, assigned_by)
SELECT u.id, r.id, o.id
FROM (
  SELECT 'demo.cr.new.' || LPAD(ROW_NUMBER() OVER (ORDER BY t.team_name, idx)::TEXT, 3, '0') || '@playsphere.local' AS email
  FROM new_cricket_teams t CROSS JOIN LATERAL UNNEST(t.player_names) WITH ORDINALITY AS p(name, idx)
) AS emails
JOIN users u ON u.email = emails.email
JOIN roles r ON r.name = 'USER'
JOIN users o ON o.email = 'organizer@playsphere.local'
ON CONFLICT DO NOTHING;

INSERT INTO player_sport_profiles (player_profile_id, sport_id, skill_level, years_of_experience, is_primary)
SELECT pp.id, s.id, 'intermediate', 3, TRUE
FROM (
  SELECT 'demo.cr.new.' || LPAD(ROW_NUMBER() OVER (ORDER BY t.team_name, idx)::TEXT, 3, '0') || '@playsphere.local' AS email
  FROM new_cricket_teams t CROSS JOIN LATERAL UNNEST(t.player_names) WITH ORDINALITY AS p(name, idx)
) AS emails
JOIN users u ON u.email = emails.email
JOIN player_profiles pp ON pp.user_id = u.id
JOIN sports s ON s.slug = 'cricket'
ON CONFLICT (player_profile_id, sport_id) DO NOTHING;

INSERT INTO teams (name, sport_id, manager_user_id, description, city)
SELECT t.team_name, s.id, mgr.id, 'New demo cricket team — expanded roster seed.', 'Bengaluru'
FROM new_cricket_teams t
JOIN sports s ON s.slug = 'cricket'
JOIN (
  SELECT team_name, 'demo.cr.new.' || LPAD(ROW_NUMBER() OVER (ORDER BY team_name, idx)::TEXT, 3, '0') || '@playsphere.local' AS email
  FROM new_cricket_teams CROSS JOIN LATERAL UNNEST(player_names) WITH ORDINALITY AS p(name, idx) WHERE idx = 1
) AS first_player ON first_player.team_name = t.team_name
JOIN users mgr ON mgr.email = first_player.email
WHERE NOT EXISTS (SELECT 1 FROM teams ex WHERE ex.name = t.team_name)
ON CONFLICT DO NOTHING;

INSERT INTO team_members (team_id, player_profile_id, team_role, jersey_number)
SELECT tm.id, pp.id, CASE WHEN p.idx = 1 THEN 'captain' ELSE 'player' END, p.idx::INT
FROM (
  SELECT t.team_name, p.name, p.idx,
    'demo.cr.new.' || LPAD(ROW_NUMBER() OVER (ORDER BY t.team_name, p.idx)::TEXT, 3, '0') || '@playsphere.local' AS email
  FROM new_cricket_teams t CROSS JOIN LATERAL UNNEST(t.player_names) WITH ORDINALITY AS p(name, idx)
) AS p
JOIN users u ON u.email = p.email
JOIN player_profiles pp ON pp.user_id = u.id
JOIN teams tm ON tm.name = p.team_name
WHERE NOT EXISTS (SELECT 1 FROM team_members ex WHERE ex.team_id = tm.id AND ex.player_profile_id = pp.id AND ex.is_active = TRUE)
ON CONFLICT DO NOTHING;

INSERT INTO tournament_registrations (
  tournament_id, team_id, registered_by_user_id, status, eligibility_status,
  registration_name, notes, registered_at, reviewed_at, reviewed_by_user_id
)
SELECT tn.id, t.id, t.manager_user_id, 'approved', 'approved', t.name,
  'Seeded via 008_demo_expanded_rosters.', NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days', o.id
FROM new_cricket_teams nct
JOIN teams t ON t.name = nct.team_name
JOIN tournaments tn ON tn.name = 'Weekend Cricket Open'
JOIN users o ON o.email = 'organizer@playsphere.local'
WHERE NOT EXISTS (
  SELECT 1 FROM tournament_registrations ex
  WHERE ex.tournament_id = tn.id AND ex.team_id = t.id AND ex.status IN ('pending','approved')
)
ON CONFLICT DO NOTHING;

INSERT INTO tournament_registration_players (registration_id, player_profile_id, is_captain, jersey_number)
SELECT reg.id, tm.player_profile_id, tm.team_role = 'captain', tm.jersey_number
FROM tournament_registrations reg
JOIN teams t ON t.id = reg.team_id
JOIN team_members tm ON tm.team_id = t.id AND tm.is_active = TRUE
JOIN new_cricket_teams nct ON nct.team_name = t.name
WHERE reg.status = 'approved'
ON CONFLICT (registration_id, player_profile_id) DO NOTHING;


-- ★ 4 new Basketball teams (5 players each)
CREATE TEMP TABLE new_basketball_teams ON COMMIT DROP AS
SELECT * FROM (VALUES
  ('Demo Rim Rockers',    ARRAY['Aditya Nair', 'Shiva Rao', 'Bala Krishnan', 'Venkat Srinivas', 'Prasad Pillai']::TEXT[]),
  ('Demo Dunk Queens',    ARRAY['Shalini Kapoor', 'Rani Bose', 'Usha Rao', 'Vani Menon', 'Kamla Singh']::TEXT[]),
  ('Demo Fast Breakers',  ARRAY['Suresh Pandey', 'Ajit Tiwari', 'Santosh Yadav', 'Dilip Mishra', 'Chetan Verma']::TEXT[]),
  ('Demo Net Busters',    ARRAY['Poornima Shetty', 'Malathi Iyer', 'Shanta Gupta', 'Radha Sharma', 'Savita Das']::TEXT[])
) AS t(team_name, player_names);

INSERT INTO users (email, password_hash, is_active, is_email_verified)
SELECT 'demo.bk.new.' || LPAD(ROW_NUMBER() OVER (ORDER BY t.team_name, idx)::TEXT, 3, '0') || '@playsphere.local',
  (SELECT password_hash FROM users WHERE email = 'organizer@playsphere.local' LIMIT 1), TRUE, TRUE
FROM new_basketball_teams t CROSS JOIN LATERAL UNNEST(t.player_names) WITH ORDINALITY AS p(name, idx)
ON CONFLICT (email) DO NOTHING;

INSERT INTO player_profiles (user_id, display_name, bio, city, state, is_public)
SELECT u.id, players.name, 'Demo basketball player.', 'Bengaluru', 'Karnataka', TRUE
FROM (
  SELECT 'demo.bk.new.' || LPAD(ROW_NUMBER() OVER (ORDER BY t.team_name, idx)::TEXT, 3, '0') || '@playsphere.local' AS email, p.name
  FROM new_basketball_teams t CROSS JOIN LATERAL UNNEST(t.player_names) WITH ORDINALITY AS p(name, idx)
) AS players
JOIN users u ON u.email = players.email
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO user_roles (user_id, role_id, assigned_by)
SELECT u.id, r.id, o.id
FROM (SELECT 'demo.bk.new.' || LPAD(ROW_NUMBER() OVER (ORDER BY t.team_name, idx)::TEXT, 3, '0') || '@playsphere.local' AS email
  FROM new_basketball_teams t CROSS JOIN LATERAL UNNEST(t.player_names) WITH ORDINALITY AS p(name, idx)) AS emails
JOIN users u ON u.email = emails.email
JOIN roles r ON r.name = 'USER'
JOIN users o ON o.email = 'organizer@playsphere.local'
ON CONFLICT DO NOTHING;

INSERT INTO player_sport_profiles (player_profile_id, sport_id, skill_level, years_of_experience, is_primary)
SELECT pp.id, s.id, 'intermediate', 2, TRUE
FROM (SELECT 'demo.bk.new.' || LPAD(ROW_NUMBER() OVER (ORDER BY t.team_name, idx)::TEXT, 3, '0') || '@playsphere.local' AS email
  FROM new_basketball_teams t CROSS JOIN LATERAL UNNEST(t.player_names) WITH ORDINALITY AS p(name, idx)) AS emails
JOIN users u ON u.email = emails.email
JOIN player_profiles pp ON pp.user_id = u.id
JOIN sports s ON s.slug = 'basketball'
ON CONFLICT (player_profile_id, sport_id) DO NOTHING;

INSERT INTO teams (name, sport_id, manager_user_id, description, city)
SELECT t.team_name, s.id, mgr.id, 'New demo basketball team.', 'Bengaluru'
FROM new_basketball_teams t
JOIN sports s ON s.slug = 'basketball'
JOIN (
  SELECT team_name, 'demo.bk.new.' || LPAD(ROW_NUMBER() OVER (ORDER BY team_name, idx)::TEXT, 3, '0') || '@playsphere.local' AS email
  FROM new_basketball_teams CROSS JOIN LATERAL UNNEST(player_names) WITH ORDINALITY AS p(name, idx) WHERE idx = 1
) AS first_player ON first_player.team_name = t.team_name
JOIN users mgr ON mgr.email = first_player.email
WHERE NOT EXISTS (SELECT 1 FROM teams ex WHERE ex.name = t.team_name)
ON CONFLICT DO NOTHING;

INSERT INTO team_members (team_id, player_profile_id, team_role, jersey_number)
SELECT tm.id, pp.id, CASE WHEN p.idx = 1 THEN 'captain' ELSE 'player' END, p.idx::INT
FROM (
  SELECT t.team_name, p.name, p.idx,
    'demo.bk.new.' || LPAD(ROW_NUMBER() OVER (ORDER BY t.team_name, p.idx)::TEXT, 3, '0') || '@playsphere.local' AS email
  FROM new_basketball_teams t CROSS JOIN LATERAL UNNEST(t.player_names) WITH ORDINALITY AS p(name, idx)
) AS p
JOIN users u ON u.email = p.email
JOIN player_profiles pp ON pp.user_id = u.id
JOIN teams tm ON tm.name = p.team_name
WHERE NOT EXISTS (SELECT 1 FROM team_members ex WHERE ex.team_id = tm.id AND ex.player_profile_id = pp.id AND ex.is_active = TRUE)
ON CONFLICT DO NOTHING;

INSERT INTO tournament_registrations (
  tournament_id, team_id, registered_by_user_id, status, eligibility_status,
  registration_name, notes, registered_at, reviewed_at, reviewed_by_user_id
)
SELECT tn.id, t.id, t.manager_user_id, 'approved', 'approved', t.name,
  'Seeded via 008_demo_expanded_rosters.', NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days', o.id
FROM new_basketball_teams nbt
JOIN teams t ON t.name = nbt.team_name
JOIN tournaments tn ON tn.name = 'City Hoops Challenge'
JOIN users o ON o.email = 'organizer@playsphere.local'
WHERE NOT EXISTS (
  SELECT 1 FROM tournament_registrations ex
  WHERE ex.tournament_id = tn.id AND ex.team_id = t.id AND ex.status IN ('pending','approved')
)
ON CONFLICT DO NOTHING;

INSERT INTO tournament_registration_players (registration_id, player_profile_id, is_captain, jersey_number)
SELECT reg.id, tm.player_profile_id, tm.team_role = 'captain', tm.jersey_number
FROM tournament_registrations reg
JOIN teams t ON t.id = reg.team_id
JOIN team_members tm ON tm.team_id = t.id AND tm.is_active = TRUE
JOIN new_basketball_teams nbt ON nbt.team_name = t.name
WHERE reg.status = 'approved'
ON CONFLICT (registration_id, player_profile_id) DO NOTHING;


-- ★ 4 new Volleyball teams (6 players each)
CREATE TEMP TABLE new_volleyball_teams ON COMMIT DROP AS
SELECT * FROM (VALUES
  ('Demo Block Party',     ARRAY['Sneha Rao', 'Jaya Pillai', 'Kala Menon', 'Veda Srinivas', 'Mala Nair', 'Tara Krishnan']::TEXT[]),
  ('Demo Ace Smashers',    ARRAY['Rahul Shetty', 'Arun Naik', 'Srinath Bose', 'Gopal Iyer', 'Rajan Das', 'Arjun Sharma']::TEXT[]),
  ('Demo Net Ninjas',      ARRAY['Priya Kumar', 'Manju Reddy', 'Usha Pillai', 'Swapna Menon', 'Rekha Gupta', 'Kalpana Singh']::TEXT[]),
  ('Demo Service Aces',    ARRAY['Navin Verma', 'Prakash Rao', 'Vinod Sharma', 'Ashok Pillai', 'Ramesh Nair', 'Kishore Bhat']::TEXT[])
) AS t(team_name, player_names);

INSERT INTO users (email, password_hash, is_active, is_email_verified)
SELECT 'demo.vb.new.' || LPAD(ROW_NUMBER() OVER (ORDER BY t.team_name, idx)::TEXT, 3, '0') || '@playsphere.local',
  (SELECT password_hash FROM users WHERE email = 'organizer@playsphere.local' LIMIT 1), TRUE, TRUE
FROM new_volleyball_teams t CROSS JOIN LATERAL UNNEST(t.player_names) WITH ORDINALITY AS p(name, idx)
ON CONFLICT (email) DO NOTHING;

INSERT INTO player_profiles (user_id, display_name, bio, city, state, is_public)
SELECT u.id, players.name, 'Demo volleyball player.', 'Bengaluru', 'Karnataka', TRUE
FROM (
  SELECT 'demo.vb.new.' || LPAD(ROW_NUMBER() OVER (ORDER BY t.team_name, idx)::TEXT, 3, '0') || '@playsphere.local' AS email, p.name
  FROM new_volleyball_teams t CROSS JOIN LATERAL UNNEST(t.player_names) WITH ORDINALITY AS p(name, idx)
) AS players
JOIN users u ON u.email = players.email
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO user_roles (user_id, role_id, assigned_by)
SELECT u.id, r.id, o.id
FROM (SELECT 'demo.vb.new.' || LPAD(ROW_NUMBER() OVER (ORDER BY t.team_name, idx)::TEXT, 3, '0') || '@playsphere.local' AS email
  FROM new_volleyball_teams t CROSS JOIN LATERAL UNNEST(t.player_names) WITH ORDINALITY AS p(name, idx)) AS emails
JOIN users u ON u.email = emails.email
JOIN roles r ON r.name = 'USER'
JOIN users o ON o.email = 'organizer@playsphere.local'
ON CONFLICT DO NOTHING;

INSERT INTO player_sport_profiles (player_profile_id, sport_id, skill_level, years_of_experience, is_primary)
SELECT pp.id, s.id, 'intermediate', 2, TRUE
FROM (SELECT 'demo.vb.new.' || LPAD(ROW_NUMBER() OVER (ORDER BY t.team_name, idx)::TEXT, 3, '0') || '@playsphere.local' AS email
  FROM new_volleyball_teams t CROSS JOIN LATERAL UNNEST(t.player_names) WITH ORDINALITY AS p(name, idx)) AS emails
JOIN users u ON u.email = emails.email
JOIN player_profiles pp ON pp.user_id = u.id
JOIN sports s ON s.slug = 'volleyball'
ON CONFLICT (player_profile_id, sport_id) DO NOTHING;

INSERT INTO teams (name, sport_id, manager_user_id, description, city)
SELECT t.team_name, s.id, mgr.id, 'New demo volleyball team.', 'Bengaluru'
FROM new_volleyball_teams t
JOIN sports s ON s.slug = 'volleyball'
JOIN (
  SELECT team_name, 'demo.vb.new.' || LPAD(ROW_NUMBER() OVER (ORDER BY team_name, idx)::TEXT, 3, '0') || '@playsphere.local' AS email
  FROM new_volleyball_teams CROSS JOIN LATERAL UNNEST(player_names) WITH ORDINALITY AS p(name, idx) WHERE idx = 1
) AS first_player ON first_player.team_name = t.team_name
JOIN users mgr ON mgr.email = first_player.email
WHERE NOT EXISTS (SELECT 1 FROM teams ex WHERE ex.name = t.team_name)
ON CONFLICT DO NOTHING;

INSERT INTO team_members (team_id, player_profile_id, team_role, jersey_number)
SELECT tm.id, pp.id, CASE WHEN p.idx = 1 THEN 'captain' ELSE 'player' END, p.idx::INT
FROM (
  SELECT t.team_name, p.name, p.idx,
    'demo.vb.new.' || LPAD(ROW_NUMBER() OVER (ORDER BY t.team_name, p.idx)::TEXT, 3, '0') || '@playsphere.local' AS email
  FROM new_volleyball_teams t CROSS JOIN LATERAL UNNEST(t.player_names) WITH ORDINALITY AS p(name, idx)
) AS p
JOIN users u ON u.email = p.email
JOIN player_profiles pp ON pp.user_id = u.id
JOIN teams tm ON tm.name = p.team_name
WHERE NOT EXISTS (SELECT 1 FROM team_members ex WHERE ex.team_id = tm.id AND ex.player_profile_id = pp.id AND ex.is_active = TRUE)
ON CONFLICT DO NOTHING;

INSERT INTO tournament_registrations (
  tournament_id, team_id, registered_by_user_id, status, eligibility_status,
  registration_name, notes, registered_at, reviewed_at, reviewed_by_user_id
)
SELECT tn.id, t.id, t.manager_user_id, 'approved', 'approved', t.name,
  'Seeded via 008_demo_expanded_rosters.', NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days', o.id
FROM new_volleyball_teams nvt
JOIN teams t ON t.name = nvt.team_name
JOIN tournaments tn ON tn.name = 'Spike City Volleyball Cup'
JOIN users o ON o.email = 'organizer@playsphere.local'
WHERE NOT EXISTS (
  SELECT 1 FROM tournament_registrations ex
  WHERE ex.tournament_id = tn.id AND ex.team_id = t.id AND ex.status IN ('pending','approved')
)
ON CONFLICT DO NOTHING;

INSERT INTO tournament_registration_players (registration_id, player_profile_id, is_captain, jersey_number)
SELECT reg.id, tm.player_profile_id, tm.team_role = 'captain', tm.jersey_number
FROM tournament_registrations reg
JOIN teams t ON t.id = reg.team_id
JOIN team_members tm ON tm.team_id = t.id AND tm.is_active = TRUE
JOIN new_volleyball_teams nvt ON nvt.team_name = t.name
WHERE reg.status = 'approved'
ON CONFLICT (registration_id, player_profile_id) DO NOTHING;


-- ★ 4 new Badminton pairs
CREATE TEMP TABLE new_badminton_teams ON COMMIT DROP AS
SELECT * FROM (VALUES
  ('Demo Smash Force',   ARRAY['Kiran Reddy', 'Leena Shah']::TEXT[]),
  ('Demo Drop Shots',    ARRAY['Arun Iyer', 'Mala Bose']::TEXT[]),
  ('Demo Feather Kings', ARRAY['Vinay Pillai', 'Geeta Nair']::TEXT[]),
  ('Demo Court Aces',    ARRAY['Rahul Menon', 'Swati Shetty']::TEXT[])
) AS t(team_name, player_names);

INSERT INTO users (email, password_hash, is_active, is_email_verified)
SELECT 'demo.bd.new.' || LPAD(ROW_NUMBER() OVER (ORDER BY t.team_name, idx)::TEXT, 3, '0') || '@playsphere.local',
  (SELECT password_hash FROM users WHERE email = 'organizer@playsphere.local' LIMIT 1), TRUE, TRUE
FROM new_badminton_teams t CROSS JOIN LATERAL UNNEST(t.player_names) WITH ORDINALITY AS p(name, idx)
ON CONFLICT (email) DO NOTHING;

INSERT INTO player_profiles (user_id, display_name, bio, city, state, is_public)
SELECT u.id, players.name, 'Demo badminton player.', 'Bengaluru', 'Karnataka', TRUE
FROM (
  SELECT 'demo.bd.new.' || LPAD(ROW_NUMBER() OVER (ORDER BY t.team_name, idx)::TEXT, 3, '0') || '@playsphere.local' AS email, p.name
  FROM new_badminton_teams t CROSS JOIN LATERAL UNNEST(t.player_names) WITH ORDINALITY AS p(name, idx)
) AS players
JOIN users u ON u.email = players.email
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO user_roles (user_id, role_id, assigned_by)
SELECT u.id, r.id, o.id
FROM (SELECT 'demo.bd.new.' || LPAD(ROW_NUMBER() OVER (ORDER BY t.team_name, idx)::TEXT, 3, '0') || '@playsphere.local' AS email
  FROM new_badminton_teams t CROSS JOIN LATERAL UNNEST(t.player_names) WITH ORDINALITY AS p(name, idx)) AS emails
JOIN users u ON u.email = emails.email
JOIN roles r ON r.name = 'USER'
JOIN users o ON o.email = 'organizer@playsphere.local'
ON CONFLICT DO NOTHING;

INSERT INTO player_sport_profiles (player_profile_id, sport_id, skill_level, years_of_experience, is_primary)
SELECT pp.id, s.id, 'intermediate', 2, TRUE
FROM (SELECT 'demo.bd.new.' || LPAD(ROW_NUMBER() OVER (ORDER BY t.team_name, idx)::TEXT, 3, '0') || '@playsphere.local' AS email
  FROM new_badminton_teams t CROSS JOIN LATERAL UNNEST(t.player_names) WITH ORDINALITY AS p(name, idx)) AS emails
JOIN users u ON u.email = emails.email
JOIN player_profiles pp ON pp.user_id = u.id
JOIN sports s ON s.slug = 'badminton'
ON CONFLICT (player_profile_id, sport_id) DO NOTHING;

INSERT INTO teams (name, sport_id, manager_user_id, description, city)
SELECT t.team_name, s.id, mgr.id, 'New demo badminton pair.', 'Bengaluru'
FROM new_badminton_teams t
JOIN sports s ON s.slug = 'badminton'
JOIN (
  SELECT team_name, 'demo.bd.new.' || LPAD(ROW_NUMBER() OVER (ORDER BY team_name, idx)::TEXT, 3, '0') || '@playsphere.local' AS email
  FROM new_badminton_teams CROSS JOIN LATERAL UNNEST(player_names) WITH ORDINALITY AS p(name, idx) WHERE idx = 1
) AS first_player ON first_player.team_name = t.team_name
JOIN users mgr ON mgr.email = first_player.email
WHERE NOT EXISTS (SELECT 1 FROM teams ex WHERE ex.name = t.team_name)
ON CONFLICT DO NOTHING;

INSERT INTO team_members (team_id, player_profile_id, team_role, jersey_number)
SELECT tm.id, pp.id, CASE WHEN p.idx = 1 THEN 'captain' ELSE 'player' END, p.idx::INT
FROM (
  SELECT t.team_name, p.name, p.idx,
    'demo.bd.new.' || LPAD(ROW_NUMBER() OVER (ORDER BY t.team_name, p.idx)::TEXT, 3, '0') || '@playsphere.local' AS email
  FROM new_badminton_teams t CROSS JOIN LATERAL UNNEST(t.player_names) WITH ORDINALITY AS p(name, idx)
) AS p
JOIN users u ON u.email = p.email
JOIN player_profiles pp ON pp.user_id = u.id
JOIN teams tm ON tm.name = p.team_name
WHERE NOT EXISTS (SELECT 1 FROM team_members ex WHERE ex.team_id = tm.id AND ex.player_profile_id = pp.id AND ex.is_active = TRUE)
ON CONFLICT DO NOTHING;

INSERT INTO tournament_registrations (
  tournament_id, team_id, registered_by_user_id, status, eligibility_status,
  registration_name, notes, registered_at, reviewed_at, reviewed_by_user_id
)
SELECT tn.id, t.id, t.manager_user_id, 'approved', 'approved', t.name,
  'Seeded via 008_demo_expanded_rosters.', NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days', o.id
FROM new_badminton_teams nbt
JOIN teams t ON t.name = nbt.team_name
JOIN tournaments tn ON tn.name = 'Badminton Doubles Open'
JOIN users o ON o.email = 'organizer@playsphere.local'
WHERE NOT EXISTS (
  SELECT 1 FROM tournament_registrations ex
  WHERE ex.tournament_id = tn.id AND ex.team_id = t.id AND ex.status IN ('pending','approved')
)
ON CONFLICT DO NOTHING;

INSERT INTO tournament_registration_players (registration_id, player_profile_id, is_captain, jersey_number)
SELECT reg.id, tm.player_profile_id, tm.team_role = 'captain', tm.jersey_number
FROM tournament_registrations reg
JOIN teams t ON t.id = reg.team_id
JOIN team_members tm ON tm.team_id = t.id AND tm.is_active = TRUE
JOIN new_badminton_teams nbt ON nbt.team_name = t.name
WHERE reg.status = 'approved'
ON CONFLICT (registration_id, player_profile_id) DO NOTHING;


-- ---------------------------------------------------------------------------
-- STEP 3: Seed performance_events for active (in_progress) tournaments
-- so the Stats panel shows real data. We attach stats to completed fixtures.
-- ---------------------------------------------------------------------------

CREATE TEMP TABLE demo_active_events (
  demo_key TEXT PRIMARY KEY,
  tournament_name TEXT NOT NULL,
  round_number INT NOT NULL,
  stat_key TEXT NOT NULL,
  team_name TEXT NOT NULL,
  player_name TEXT NOT NULL,
  value NUMERIC NOT NULL,
  event_time_seconds INT NOT NULL
) ON COMMIT DROP;

-- ── Football: goals, assists, shots_on_target, tackles, saves, yellow_cards
INSERT INTO demo_active_events VALUES
  -- Bengaluru United vs Eastside Rovers (Round 1 goal scorers)
  ('fb_r1_goals_aarav',    'Bengaluru Football Cup', 1, 'goals',           'Demo Bengaluru United',  'Aarav Menon',     2, 1800),
  ('fb_r1_goals_ishaan',   'Bengaluru Football Cup', 1, 'goals',           'Demo Bengaluru United',  'Ishaan Rao',      1, 3100),
  ('fb_r1_goals_dev',      'Bengaluru Football Cup', 1, 'goals',           'Demo Eastside Rovers',   'Dev Patel',       1, 4000),
  ('fb_r1_assists_rohan',  'Bengaluru Football Cup', 1, 'assists',         'Demo Bengaluru United',  'Rohan Desai',     1, 1800),
  ('fb_r1_assists_arjun',  'Bengaluru Football Cup', 1, 'assists',         'Demo Bengaluru United',  'Arjun Kulkarni',  1, 3100),
  ('fb_r1_assists_rey',    'Bengaluru Football Cup', 1, 'assists',         'Demo Eastside Rovers',   'Reyansh Mehta',   1, 4000),
  ('fb_r1_sot_aarav',      'Bengaluru Football Cup', 1, 'shots_on_target', 'Demo Bengaluru United',  'Aarav Menon',     4, 1200),
  ('fb_r1_sot_kabir',      'Bengaluru Football Cup', 1, 'shots_on_target', 'Demo Bengaluru United',  'Kabir Nair',      3, 2200),
  ('fb_r1_sot_dev',        'Bengaluru Football Cup', 1, 'shots_on_target', 'Demo Eastside Rovers',   'Dev Patel',       3, 3000),
  ('fb_r1_sot_ayaan',      'Bengaluru Football Cup', 1, 'shots_on_target', 'Demo Eastside Rovers',   'Ayaan Kapoor',    2, 3500),
  ('fb_r1_tackles_vihaan', 'Bengaluru Football Cup', 1, 'tackles',         'Demo Bengaluru United',  'Vihaan Iyer',     5, 2000),
  ('fb_r1_tackles_arjun',  'Bengaluru Football Cup', 1, 'tackles',         'Demo Bengaluru United',  'Arjun Kulkarni',  4, 3200),
  ('fb_r1_tackles_sidd',   'Bengaluru Football Cup', 1, 'tackles',         'Demo Eastside Rovers',   'Siddharth Joshi', 6, 2500),
  ('fb_r1_tackles_neel',   'Bengaluru Football Cup', 1, 'tackles',         'Demo Eastside Rovers',   'Neel Verma',      4, 4000),
  ('fb_r1_saves_aditya',   'Bengaluru Football Cup', 1, 'saves',           'Demo Bengaluru United',  'Aditya Shah',     3, 5000),
  ('fb_r1_saves_manav',    'Bengaluru Football Cup', 1, 'saves',           'Demo Eastside Rovers',   'Manav Shetty',    2, 4500),
  ('fb_r1_yc_karthik',     'Bengaluru Football Cup', 1, 'yellow_cards',    'Demo Eastside Rovers',   'Karthik Reddy',   1, 3800),
  ('fb_r1_app_bu_aarav',   'Bengaluru Football Cup', 1, 'appearances',     'Demo Bengaluru United',  'Aarav Menon',     1, 0),
  ('fb_r1_app_bu_ishaan',  'Bengaluru Football Cup', 1, 'appearances',     'Demo Bengaluru United',  'Ishaan Rao',      1, 0),
  ('fb_r1_app_bu_kabir',   'Bengaluru Football Cup', 1, 'appearances',     'Demo Bengaluru United',  'Kabir Nair',      1, 0),
  ('fb_r1_app_bu_vihaan',  'Bengaluru Football Cup', 1, 'appearances',     'Demo Bengaluru United',  'Vihaan Iyer',     1, 0),
  ('fb_r1_app_bu_arjun',   'Bengaluru Football Cup', 1, 'appearances',     'Demo Bengaluru United',  'Arjun Kulkarni',  1, 0),
  ('fb_r1_app_bu_rohan',   'Bengaluru Football Cup', 1, 'appearances',     'Demo Bengaluru United',  'Rohan Desai',     1, 0),
  ('fb_r1_app_bu_aditya',  'Bengaluru Football Cup', 1, 'appearances',     'Demo Bengaluru United',  'Aditya Shah',     1, 0),
  ('fb_r1_app_er_dev',     'Bengaluru Football Cup', 1, 'appearances',     'Demo Eastside Rovers',   'Dev Patel',       1, 0),
  ('fb_r1_app_er_rey',     'Bengaluru Football Cup', 1, 'appearances',     'Demo Eastside Rovers',   'Reyansh Mehta',   1, 0),
  ('fb_r1_app_er_ayaan',   'Bengaluru Football Cup', 1, 'appearances',     'Demo Eastside Rovers',   'Ayaan Kapoor',    1, 0),
  ('fb_r1_app_er_karthik', 'Bengaluru Football Cup', 1, 'appearances',     'Demo Eastside Rovers',   'Karthik Reddy',   1, 0),
  ('fb_r1_app_er_sidd',    'Bengaluru Football Cup', 1, 'appearances',     'Demo Eastside Rovers',   'Siddharth Joshi', 1, 0),
  ('fb_r1_app_er_neel',    'Bengaluru Football Cup', 1, 'appearances',     'Demo Eastside Rovers',   'Neel Verma',      1, 0),
  ('fb_r1_app_er_manav',   'Bengaluru Football Cup', 1, 'appearances',     'Demo Eastside Rovers',   'Manav Shetty',    1, 0);

-- ── Cricket: runs, wickets, fours, sixes, catches, appearances
INSERT INTO demo_active_events VALUES
  ('cr_r1_runs_sahil',    'Weekend Cricket Open', 1, 'runs',       'Demo Boundary Breakers XI', 'Sahil Sharma',   72, 4200),
  ('cr_r1_runs_yash',     'Weekend Cricket Open', 1, 'runs',       'Demo Boundary Breakers XI', 'Yash Malhotra',  58, 3600),
  ('cr_r1_runs_nikhil',   'Weekend Cricket Open', 1, 'runs',       'Demo Boundary Breakers XI', 'Nikhil Bose',    41, 2900),
  ('cr_r1_runs_pranav',   'Weekend Cricket Open', 1, 'runs',       'Demo Boundary Breakers XI', 'Pranav Gupta',   35, 2200),
  ('cr_r1_runs_anaya',    'Weekend Cricket Open', 1, 'runs',       'Demo Weekend Warriors XI',  'Anaya Rao',      66, 4100),
  ('cr_r1_runs_riya',     'Weekend Cricket Open', 1, 'runs',       'Demo Weekend Warriors XI',  'Riya Nair',      54, 3400),
  ('cr_r1_runs_meera',    'Weekend Cricket Open', 1, 'runs',       'Demo Weekend Warriors XI',  'Meera Joshi',    38, 2600),
  ('cr_r1_wkts_sahil',    'Weekend Cricket Open', 1, 'wickets',    'Demo Boundary Breakers XI', 'Sahil Sharma',    3, 5100),
  ('cr_r1_wkts_harsh',    'Weekend Cricket Open', 1, 'wickets',    'Demo Boundary Breakers XI', 'Harsh Venkatesh', 3, 5400),
  ('cr_r1_wkts_omar',     'Weekend Cricket Open', 1, 'wickets',    'Demo Boundary Breakers XI', 'Omar Khan',       1, 5800),
  ('cr_r1_wkts_anaya',    'Weekend Cricket Open', 1, 'wickets',    'Demo Weekend Warriors XI',  'Anaya Rao',       3, 4900),
  ('cr_r1_wkts_kavya',    'Weekend Cricket Open', 1, 'wickets',    'Demo Weekend Warriors XI',  'Kavya Kulkarni',  2, 5300),
  ('cr_r1_wkts_ira',      'Weekend Cricket Open', 1, 'wickets',    'Demo Weekend Warriors XI',  'Ira Kapoor',      2, 5700),
  ('cr_r1_fours_sahil',   'Weekend Cricket Open', 1, 'fours',      'Demo Boundary Breakers XI', 'Sahil Sharma',    8, 3800),
  ('cr_r1_fours_yash',    'Weekend Cricket Open', 1, 'fours',      'Demo Boundary Breakers XI', 'Yash Malhotra',   6, 3200),
  ('cr_r1_fours_anaya',   'Weekend Cricket Open', 1, 'fours',      'Demo Weekend Warriors XI',  'Anaya Rao',       7, 3700),
  ('cr_r1_fours_riya',    'Weekend Cricket Open', 1, 'fours',      'Demo Weekend Warriors XI',  'Riya Nair',       5, 3100),
  ('cr_r1_sixes_sahil',   'Weekend Cricket Open', 1, 'sixes',      'Demo Boundary Breakers XI', 'Sahil Sharma',    4, 3900),
  ('cr_r1_sixes_anaya',   'Weekend Cricket Open', 1, 'sixes',      'Demo Weekend Warriors XI',  'Anaya Rao',       3, 3750),
  ('cr_r1_catches_pranav','Weekend Cricket Open', 1, 'catches',    'Demo Boundary Breakers XI', 'Pranav Gupta',    2, 5200),
  ('cr_r1_catches_dhruv', 'Weekend Cricket Open', 1, 'catches',    'Demo Boundary Breakers XI', 'Dhruv Sinha',     1, 5500),
  ('cr_r1_catches_zoya',  'Weekend Cricket Open', 1, 'catches',    'Demo Weekend Warriors XI',  'Zoya Menon',      2, 5000),
  ('cr_r1_catches_tanvi', 'Weekend Cricket Open', 1, 'catches',    'Demo Weekend Warriors XI',  'Tanvi Das',       1, 5400),
  ('cr_r1_app_bb_sahil',  'Weekend Cricket Open', 1, 'appearances','Demo Boundary Breakers XI', 'Sahil Sharma',    1, 0),
  ('cr_r1_app_bb_yash',   'Weekend Cricket Open', 1, 'appearances','Demo Boundary Breakers XI', 'Yash Malhotra',   1, 0),
  ('cr_r1_app_bb_nikhil', 'Weekend Cricket Open', 1, 'appearances','Demo Boundary Breakers XI', 'Nikhil Bose',     1, 0),
  ('cr_r1_app_bb_pranav', 'Weekend Cricket Open', 1, 'appearances','Demo Boundary Breakers XI', 'Pranav Gupta',    1, 0),
  ('cr_r1_app_bb_harsh',  'Weekend Cricket Open', 1, 'appearances','Demo Boundary Breakers XI', 'Harsh Venkatesh', 1, 0),
  ('cr_r1_app_bb_omar',   'Weekend Cricket Open', 1, 'appearances','Demo Boundary Breakers XI', 'Omar Khan',       1, 0),
  ('cr_r1_app_bb_dhruv',  'Weekend Cricket Open', 1, 'appearances','Demo Boundary Breakers XI', 'Dhruv Sinha',     1, 0),
  ('cr_r1_app_ww_anaya',  'Weekend Cricket Open', 1, 'appearances','Demo Weekend Warriors XI',  'Anaya Rao',       1, 0),
  ('cr_r1_app_ww_riya',   'Weekend Cricket Open', 1, 'appearances','Demo Weekend Warriors XI',  'Riya Nair',       1, 0),
  ('cr_r1_app_ww_meera',  'Weekend Cricket Open', 1, 'appearances','Demo Weekend Warriors XI',  'Meera Joshi',     1, 0),
  ('cr_r1_app_ww_zoya',   'Weekend Cricket Open', 1, 'appearances','Demo Weekend Warriors XI',  'Zoya Menon',      1, 0),
  ('cr_r1_app_ww_kavya',  'Weekend Cricket Open', 1, 'appearances','Demo Weekend Warriors XI',  'Kavya Kulkarni',  1, 0),
  ('cr_r1_app_ww_tanvi',  'Weekend Cricket Open', 1, 'appearances','Demo Weekend Warriors XI',  'Tanvi Das',       1, 0),
  ('cr_r1_app_ww_ira',    'Weekend Cricket Open', 1, 'appearances','Demo Weekend Warriors XI',  'Ira Kapoor',      1, 0);

-- ── Basketball: points, rebounds, assists, steals, blocks, appearances
INSERT INTO demo_active_events VALUES
  ('bk_r1_pts_aarohi',   'City Hoops Challenge', 1, 'points',     'Demo Baseline Collective Entrants', 'Aarohi Shah',  28, 1800),
  ('bk_r1_pts_myra',     'City Hoops Challenge', 1, 'points',     'Demo Baseline Collective Entrants', 'Myra Patel',   22, 2200),
  ('bk_r1_pts_diya',     'City Hoops Challenge', 1, 'points',     'Demo Baseline Collective Entrants', 'Diya Shetty',  18, 2600),
  ('bk_r1_pts_simran',   'City Hoops Challenge', 1, 'points',     'Demo Court Kings',                  'Simran Kaur',  24, 1900),
  ('bk_r1_pts_nisha',    'City Hoops Challenge', 1, 'points',     'Demo Court Kings',                  'Nisha Bansal', 20, 2300),
  ('bk_r1_pts_tara',     'City Hoops Challenge', 1, 'points',     'Demo Court Kings',                  'Tara Sen',     16, 2700),
  ('bk_r1_reb_aarohi',   'City Hoops Challenge', 1, 'rebounds',   'Demo Baseline Collective Entrants', 'Aarohi Shah',  10, 1800),
  ('bk_r1_reb_myra',     'City Hoops Challenge', 1, 'rebounds',   'Demo Baseline Collective Entrants', 'Myra Patel',    8, 2100),
  ('bk_r1_reb_diya',     'City Hoops Challenge', 1, 'rebounds',   'Demo Baseline Collective Entrants', 'Diya Shetty',   7, 2500),
  ('bk_r1_reb_simran',   'City Hoops Challenge', 1, 'rebounds',   'Demo Court Kings',                  'Simran Kaur',   9, 2000),
  ('bk_r1_reb_nisha',    'City Hoops Challenge', 1, 'rebounds',   'Demo Court Kings',                  'Nisha Bansal',  7, 2400),
  ('bk_r1_reb_tara',     'City Hoops Challenge', 1, 'rebounds',   'Demo Court Kings',                  'Tara Sen',      6, 2800),
  ('bk_r1_ast_aarohi',   'City Hoops Challenge', 1, 'assists',    'Demo Baseline Collective Entrants', 'Aarohi Shah',   7, 1800),
  ('bk_r1_ast_myra',     'City Hoops Challenge', 1, 'assists',    'Demo Baseline Collective Entrants', 'Myra Patel',    5, 2200),
  ('bk_r1_ast_simran',   'City Hoops Challenge', 1, 'assists',    'Demo Court Kings',                  'Simran Kaur',   6, 1900),
  ('bk_r1_ast_nisha',    'City Hoops Challenge', 1, 'assists',    'Demo Court Kings',                  'Nisha Bansal',  4, 2400),
  ('bk_r1_stl_diya',     'City Hoops Challenge', 1, 'steals',     'Demo Baseline Collective Entrants', 'Diya Shetty',   3, 2200),
  ('bk_r1_stl_tara',     'City Hoops Challenge', 1, 'steals',     'Demo Court Kings',                  'Tara Sen',      3, 2400),
  ('bk_r1_blk_aarohi',   'City Hoops Challenge', 1, 'blocks',     'Demo Baseline Collective Entrants', 'Aarohi Shah',   2, 1900),
  ('bk_r1_blk_simran',   'City Hoops Challenge', 1, 'blocks',     'Demo Court Kings',                  'Simran Kaur',   2, 2100),
  ('bk_r1_app_bce_aao',  'City Hoops Challenge', 1, 'appearances','Demo Baseline Collective Entrants', 'Aarohi Shah',   1, 0),
  ('bk_r1_app_bce_myra', 'City Hoops Challenge', 1, 'appearances','Demo Baseline Collective Entrants', 'Myra Patel',    1, 0),
  ('bk_r1_app_bce_diya', 'City Hoops Challenge', 1, 'appearances','Demo Baseline Collective Entrants', 'Diya Shetty',   1, 0),
  ('bk_r1_app_ck_sim',   'City Hoops Challenge', 1, 'appearances','Demo Court Kings',                  'Simran Kaur',   1, 0),
  ('bk_r1_app_ck_nisha', 'City Hoops Challenge', 1, 'appearances','Demo Court Kings',                  'Nisha Bansal',  1, 0),
  ('bk_r1_app_ck_tara',  'City Hoops Challenge', 1, 'appearances','Demo Court Kings',                  'Tara Sen',      1, 0);

-- ── Volleyball: points, aces, blocks, digs, assists, appearances
INSERT INTO demo_active_events VALUES
  ('vb_r1_pts_leela',    'Spike City Volleyball Cup', 1, 'points',     'Demo Spike City Entrants', 'Leela Iyer',    18, 1800),
  ('vb_r1_pts_pooja',    'Spike City Volleyball Cup', 1, 'points',     'Demo Spike City Entrants', 'Pooja Menon',   14, 2200),
  ('vb_r1_pts_anika',    'Spike City Volleyball Cup', 1, 'points',     'Demo Spike City Entrants', 'Anika Verma',   12, 2600),
  ('vb_r1_pts_aisha',    'Spike City Volleyball Cup', 1, 'points',     'Demo Skyline Setters',     'Aisha Khan',    16, 1900),
  ('vb_r1_pts_radhika',  'Spike City Volleyball Cup', 1, 'points',     'Demo Skyline Setters',     'Radhika Bose',  13, 2300),
  ('vb_r1_pts_isha',     'Spike City Volleyball Cup', 1, 'points',     'Demo Skyline Setters',     'Isha Reddy',    11, 2700),
  ('vb_r1_aces_leela',   'Spike City Volleyball Cup', 1, 'aces',       'Demo Spike City Entrants', 'Leela Iyer',     4, 1600),
  ('vb_r1_aces_aisha',   'Spike City Volleyball Cup', 1, 'aces',       'Demo Skyline Setters',     'Aisha Khan',     3, 1700),
  ('vb_r1_blk_pooja',    'Spike City Volleyball Cup', 1, 'blocks',     'Demo Spike City Entrants', 'Pooja Menon',    5, 2000),
  ('vb_r1_blk_radhika',  'Spike City Volleyball Cup', 1, 'blocks',     'Demo Skyline Setters',     'Radhika Bose',   4, 2100),
  ('vb_r1_digs_anika',   'Spike City Volleyball Cup', 1, 'digs',       'Demo Spike City Entrants', 'Anika Verma',    9, 2400),
  ('vb_r1_digs_isha',    'Spike City Volleyball Cup', 1, 'digs',       'Demo Skyline Setters',     'Isha Reddy',     8, 2500),
  ('vb_r1_digs_sana',    'Spike City Volleyball Cup', 1, 'digs',       'Demo Spike City Entrants', 'Sana Ahmed',     7, 2700),
  ('vb_r1_digs_sanya',   'Spike City Volleyball Cup', 1, 'digs',       'Demo Skyline Setters',     'Sanya Rao',      6, 2800),
  ('vb_r1_ast_pooja',    'Spike City Volleyball Cup', 1, 'assists',    'Demo Spike City Entrants', 'Pooja Menon',    8, 2100),
  ('vb_r1_ast_radhika',  'Spike City Volleyball Cup', 1, 'assists',    'Demo Skyline Setters',     'Radhika Bose',   7, 2200),
  ('vb_r1_app_sce_lee',  'Spike City Volleyball Cup', 1, 'appearances','Demo Spike City Entrants', 'Leela Iyer',     1, 0),
  ('vb_r1_app_sce_poo',  'Spike City Volleyball Cup', 1, 'appearances','Demo Spike City Entrants', 'Pooja Menon',    1, 0),
  ('vb_r1_app_sce_ani',  'Spike City Volleyball Cup', 1, 'appearances','Demo Spike City Entrants', 'Anika Verma',    1, 0),
  ('vb_r1_app_sce_san',  'Spike City Volleyball Cup', 1, 'appearances','Demo Spike City Entrants', 'Sana Ahmed',     1, 0),
  ('vb_r1_app_ss_aisha', 'Spike City Volleyball Cup', 1, 'appearances','Demo Skyline Setters',     'Aisha Khan',     1, 0),
  ('vb_r1_app_ss_rad',   'Spike City Volleyball Cup', 1, 'appearances','Demo Skyline Setters',     'Radhika Bose',   1, 0),
  ('vb_r1_app_ss_isha',  'Spike City Volleyball Cup', 1, 'appearances','Demo Skyline Setters',     'Isha Reddy',     1, 0),
  ('vb_r1_app_ss_san',   'Spike City Volleyball Cup', 1, 'appearances','Demo Skyline Setters',     'Sanya Rao',      1, 0);

-- ── Badminton: points_won, smashes, net_winners, service_aces, rallies_won
INSERT INTO demo_active_events VALUES
  ('bd_r1_pts_arnav',   'Badminton Doubles Open', 1, 'points_won',   'Demo Shuttle Squad Entrants', 'Arnav Joshi',     32, 1800),
  ('bd_r1_pts_devika',  'Badminton Doubles Open', 1, 'points_won',   'Demo Shuttle Squad Entrants', 'Devika Nair',     29, 2000),
  ('bd_r1_pts_rey',     'Badminton Doubles Open', 1, 'points_won',   'Demo Rally Racquets',         'Reyansh Kapoor',  27, 1900),
  ('bd_r1_pts_nandini', 'Badminton Doubles Open', 1, 'points_won',   'Demo Rally Racquets',         'Nandini Shah',    25, 2100),
  ('bd_r1_smash_arnav', 'Badminton Doubles Open', 1, 'smashes',      'Demo Shuttle Squad Entrants', 'Arnav Joshi',     12, 1600),
  ('bd_r1_smash_rey',   'Badminton Doubles Open', 1, 'smashes',      'Demo Rally Racquets',         'Reyansh Kapoor',  10, 1700),
  ('bd_r1_net_devika',  'Badminton Doubles Open', 1, 'net_winners',  'Demo Shuttle Squad Entrants', 'Devika Nair',      6, 1900),
  ('bd_r1_net_nan',     'Badminton Doubles Open', 1, 'net_winners',  'Demo Rally Racquets',         'Nandini Shah',     5, 2000),
  ('bd_r1_sace_arnav',  'Badminton Doubles Open', 1, 'service_aces', 'Demo Shuttle Squad Entrants', 'Arnav Joshi',      4, 1400),
  ('bd_r1_sace_rey',    'Badminton Doubles Open', 1, 'service_aces', 'Demo Rally Racquets',         'Reyansh Kapoor',   3, 1500),
  ('bd_r1_rally_arnav', 'Badminton Doubles Open', 1, 'rallies_won',  'Demo Shuttle Squad Entrants', 'Arnav Joshi',     42, 2200),
  ('bd_r1_rally_devika','Badminton Doubles Open', 1, 'rallies_won',  'Demo Shuttle Squad Entrants', 'Devika Nair',     38, 2300),
  ('bd_r1_rally_rey',   'Badminton Doubles Open', 1, 'rallies_won',  'Demo Rally Racquets',         'Reyansh Kapoor',  35, 2100),
  ('bd_r1_rally_nan',   'Badminton Doubles Open', 1, 'rallies_won',  'Demo Rally Racquets',         'Nandini Shah',    32, 2400),
  ('bd_r1_app_sse_ar',  'Badminton Doubles Open', 1, 'appearances',  'Demo Shuttle Squad Entrants', 'Arnav Joshi',      1, 0),
  ('bd_r1_app_sse_de',  'Badminton Doubles Open', 1, 'appearances',  'Demo Shuttle Squad Entrants', 'Devika Nair',      1, 0),
  ('bd_r1_app_rr_re',   'Badminton Doubles Open', 1, 'appearances',  'Demo Rally Racquets',         'Reyansh Kapoor',   1, 0),
  ('bd_r1_app_rr_na',   'Badminton Doubles Open', 1, 'appearances',  'Demo Rally Racquets',         'Nandini Shah',     1, 0);


-- Now insert performance_events for each event row, linked to a completed fixture in the corresponding tournament
INSERT INTO performance_events (
  match_id, sport_stat_definition_id, event_time_seconds, event_metadata,
  recorded_by_user_id, recorded_at, created_at
)
SELECT gm.id, ssd.id, ev.event_time_seconds,
  jsonb_build_object('demo_seed_key', ev.demo_key, 'source', 'local_demo_seed_008'),
  o.id,
  f.scheduled_at + ev.event_time_seconds * INTERVAL '1 second',
  f.scheduled_at + ev.event_time_seconds * INTERVAL '1 second'
FROM demo_active_events ev
JOIN tournaments tn ON tn.name = ev.tournament_name
JOIN sports sp ON sp.id = tn.sport_id
JOIN sport_stat_definitions ssd ON ssd.sport_id = sp.id AND ssd.stat_key = ev.stat_key
-- Find ANY completed fixture (round 1 or first available) for this tournament
JOIN fixtures f ON f.tournament_id = tn.id
  AND f.round_number = ev.round_number
  AND f.status = 'completed'
JOIN matches gm ON gm.fixture_id = f.id
JOIN users o ON o.email = 'organizer@playsphere.local'
WHERE NOT EXISTS (
  SELECT 1 FROM performance_events ex
  WHERE ex.match_id = gm.id
    AND ex.event_metadata->>'demo_seed_key' = ev.demo_key
);

-- Attach player+team to each seeded performance event
INSERT INTO performance_event_players (performance_event_id, player_profile_id, team_id, value)
SELECT pe.id, pp.id, t.id, ev.value
FROM demo_active_events ev
JOIN tournaments tn ON tn.name = ev.tournament_name
JOIN sports sp ON sp.id = tn.sport_id
JOIN sport_stat_definitions ssd ON ssd.sport_id = sp.id AND ssd.stat_key = ev.stat_key
JOIN fixtures f ON f.tournament_id = tn.id
  AND f.round_number = ev.round_number
  AND f.status = 'completed'
JOIN matches gm ON gm.fixture_id = f.id
JOIN performance_events pe ON pe.match_id = gm.id
  AND pe.event_metadata->>'demo_seed_key' = ev.demo_key
JOIN teams t ON t.name = ev.team_name
JOIN player_profiles pp ON pp.display_name = ev.player_name
JOIN team_members tm ON tm.team_id = t.id AND tm.player_profile_id = pp.id AND tm.is_active = TRUE
ON CONFLICT (performance_event_id, player_profile_id)
DO UPDATE SET team_id = EXCLUDED.team_id, value = EXCLUDED.value;

COMMIT;
-- =============================================================================
-- END: 008_demo_expanded_rosters
-- =============================================================================
