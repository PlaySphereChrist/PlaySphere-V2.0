-- =============================================================================
-- PlaySphere — Local Demo Teams and Tournaments
-- Requires schemas 001–007 and seed 001.
-- Idempotent: rows are matched by demo names and organizer ownership.
-- =============================================================================

BEGIN;

-- Sample teams appear in the organizer account's team list.
WITH demo_teams(name, sport_slug, description, city) AS (
  VALUES
    ('Demo Eastside FC', 'football', 'Placeholder football team for local demos.', 'Bengaluru'),
    ('Demo South City Strikers', 'football', 'Placeholder football team for local demos.', 'Bengaluru'),
    ('Demo Boundary Breakers', 'cricket', 'Placeholder cricket team for local demos.', 'Bengaluru'),
    ('Demo Weekend XI', 'cricket', 'Placeholder cricket team for local demos.', 'Bengaluru'),
    ('Demo Baseline Collective', 'basketball', 'Placeholder basketball team for local demos.', 'Bengaluru'),
    ('Demo Spike City', 'volleyball', 'Placeholder volleyball team for local demos.', 'Bengaluru'),
    ('Demo Shuttle Squad', 'badminton', 'Placeholder badminton team for local demos.', 'Bengaluru'),
    ('Demo Rally Racquets', 'badminton', 'Placeholder badminton team for local demos.', 'Bengaluru')
)
INSERT INTO teams (name, sport_id, manager_user_id, description, city)
SELECT demo.name, sport.id, organizer.id, demo.description, demo.city
FROM demo_teams AS demo
JOIN sports AS sport ON sport.slug = demo.sport_slug
JOIN users AS organizer ON organizer.email = 'organizer@playsphere.local'
WHERE NOT EXISTS (
  SELECT 1 FROM teams AS existing
  WHERE existing.name = demo.name AND existing.manager_user_id = organizer.id
);

-- Published examples are visible in the public tournament list. Dates are
-- relative to seed time so they remain upcoming whenever the seed is applied.
WITH demo_tournaments(
  name, sport_slug, format, description, rules, banner_url, city, venue_details,
  min_teams, max_teams, prize_pool, prize_description
) AS (
  VALUES
    (
      'Bengaluru Football Cup', 'football', 'group_stage_knockout'::tournament_format_type,
      'A sample group-stage football tournament for exploring PlaySphere.',
      'Demo event. Groups are generated automatically; the top two teams advance.',
      '/images/demo/grounds/realistic/ground-football.jpg', 'Bengaluru', 'Central Sports Arena',
      6, 16, 25000.00, 'Sample prize pool'
    ),
    (
      'Weekend Cricket Open', 'cricket', 'knockout'::tournament_format_type,
      'A sample knockout cricket tournament for local demos.',
      'Demo event. Match schedules and results are managed by the organizer.',
      '/images/demo/grounds/realistic/ground-cricket.jpg', 'Bengaluru', 'Greenfield Cricket Ground',
      4, 16, 20000.00, 'Sample prize pool'
    ),
    (
      'City Hoops Challenge', 'basketball', 'league'::tournament_format_type,
      'A sample basketball league with a full round of team fixtures.',
      'Demo event. Teams earn 3 points for a win and 1 for a draw.',
      '/images/demo/grounds/realistic/ground-basketball.jpg', 'Bengaluru', 'Baseline Indoor Arena',
      4, 8, 12000.00, 'Sample prize pool'
    ),
    (
      'Spike City Volleyball Cup', 'volleyball', 'double_elimination'::tournament_format_type,
      'A sample double-elimination volleyball competition.',
      'Demo event. Teams remain in contention until their second loss.',
      '/images/demo/grounds/realistic/ground-volleyball.jpg', 'Bengaluru', 'Spike City Sports Hall',
      4, 8, 10000.00, 'Sample prize pool'
    ),
    (
      'Badminton Doubles Open', 'badminton', 'round_robin'::tournament_format_type,
      'A sample doubles event for exploring registration and standings.',
      'Demo event. Each pair plays every other registered pair.',
      '/images/demo/grounds/realistic/ground-badminton.jpg', 'Bengaluru', 'Shuttle Sports Centre',
      4, 16, 8000.00, 'Sample prize pool'
    )
), inserted_tournaments AS (
  INSERT INTO tournaments (
    name, sport_id, organizer_user_id, format, participation_type,
    description, rules, banner_url, city, venue_details,
    min_teams, max_teams, registration_fee, prize_pool, prize_description,
    registration_opens_at, registration_closes_at, starts_at, ends_at, status
  )
  SELECT
    demo.name, sport.id, organizer.id, demo.format, 'team',
    demo.description, demo.rules, demo.banner_url, demo.city, demo.venue_details,
    demo.min_teams, demo.max_teams, 0, demo.prize_pool, demo.prize_description,
    NOW() - INTERVAL '1 day', NOW() + INTERVAL '14 days',
    NOW() + INTERVAL '21 days', NOW() + INTERVAL '23 days', 'registration_open'
  FROM demo_tournaments AS demo
  JOIN sports AS sport ON sport.slug = demo.sport_slug
  JOIN users AS organizer ON organizer.email = 'organizer@playsphere.local'
  WHERE NOT EXISTS (
    SELECT 1 FROM tournaments AS existing
    WHERE existing.name = demo.name AND existing.organizer_user_id = organizer.id
  )
  RETURNING id, name, sport_id, city, organizer_user_id, banner_url
)
INSERT INTO tournament_status_history
  (tournament_id, from_status, to_status, changed_by_user_id, reason)
SELECT id, NULL, 'registration_open', organizer_user_id,
       'Seeded local demo tournament; registration is open.'
FROM inserted_tournaments;

-- Re-seeding keeps sample tournament dates in the future, even when their
-- records were created during an earlier local demo session.
UPDATE tournaments
SET registration_opens_at = NOW() - INTERVAL '1 day',
    registration_closes_at = NOW() + INTERVAL '14 days',
    starts_at = NOW() + INTERVAL '21 days',
    ends_at = NOW() + INTERVAL '23 days'
WHERE name IN (
  'Bengaluru Football Cup', 'Weekend Cricket Open', 'City Hoops Challenge',
  'Spike City Volleyball Cup', 'Badminton Doubles Open'
)
AND organizer_user_id = (SELECT id FROM users WHERE email = 'organizer@playsphere.local');

-- Give each demo tournament its own public community, mirroring the app's
-- tournament creation flow.
INSERT INTO communities (
  name, description, sport_id, city, banner_url, created_by_user_id,
  is_public, is_active, tournament_id
)
SELECT
  tournament.name || ' Community',
  'Sample community for the ' || tournament.name || ' demo tournament.',
  tournament.sport_id, tournament.city, tournament.banner_url,
  tournament.organizer_user_id, TRUE, TRUE, tournament.id
FROM tournaments AS tournament
WHERE tournament.name IN (
  'Bengaluru Football Cup', 'Weekend Cricket Open', 'City Hoops Challenge',
  'Spike City Volleyball Cup', 'Badminton Doubles Open'
)
AND NOT EXISTS (
  SELECT 1 FROM communities AS existing
  WHERE existing.tournament_id = tournament.id
);

INSERT INTO community_members (community_id, user_id, role)
SELECT community.id, community.created_by_user_id, 'admin'
FROM communities AS community
JOIN tournaments AS tournament ON tournament.id = community.tournament_id
WHERE tournament.name IN (
  'Bengaluru Football Cup', 'Weekend Cricket Open', 'City Hoops Challenge',
  'Spike City Volleyball Cup', 'Badminton Doubles Open'
)
ON CONFLICT (community_id, user_id) DO NOTHING;

COMMIT;
