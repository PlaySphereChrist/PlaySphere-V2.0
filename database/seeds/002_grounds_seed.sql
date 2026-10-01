-- =============================================================================
-- SEED 002: 50+ Real Grounds Across Major Sports Hubs
-- =============================================================================

BEGIN;

-- 1. Ensure Badminton exists
INSERT INTO sports (name, slug, description, min_players_per_team, max_players_per_team)
VALUES ('Badminton', 'badminton', 'Badminton. Singles (1v1) or doubles (2v2).', 1, 2)
ON CONFLICT (name) DO NOTHING;

-- 2. Insert Grounds and Sports associations

-- Ground 1: Play Arena Sports Complex
WITH inserted_ground AS (
  INSERT INTO grounds (
    name, description, address, city, state,
    latitude, longitude, contact_phone, contact_email,
    amenities, images, is_active, owner_user_id
  ) VALUES (
    'Play Arena Sports Complex', 'Premier multi-sports venue featuring artificial turf football pitches, professional badminton courts, and floodlit basketball courts with spectator viewing decks.', 'Silverwood Regency Apartments, Sarjapur Main Rd, Kasavanahalli', 'Bangalore', 'Karnataka',
    12.9081, 77.6744, '+91 9845012345', 'sarjapur@playarena.in',
    '["Floodlights","Changing Rooms","Parking","Cafeteria","First Aid","Locker Room","Pro Shop","Wi-Fi"]'::jsonb, '[]'::jsonb, true,
    (SELECT id FROM users WHERE email = 'admin@playsphere.local' LIMIT 1)
  )
  RETURNING id
)
INSERT INTO ground_sports (ground_id, sport_id, surface_type, capacity)
SELECT inserted_ground.id, s.id, t.surface, t.cap
FROM inserted_ground
CROSS JOIN (VALUES
  ('Football', 'Artificial Turf', 100),
  ('Badminton', 'Synthetic Mat', 40),
  ('Basketball', 'Hard Court', 60)
) AS t(sport_name, surface, cap)
JOIN sports s ON lower(s.name) = lower(t.sport_name)
ON CONFLICT DO NOTHING;

-- Ground 2: Kanteerava Multi-Sport Arena
WITH inserted_ground AS (
  INSERT INTO grounds (
    name, description, address, city, state,
    latitude, longitude, contact_phone, contact_email,
    amenities, images, is_active, owner_user_id
  ) VALUES (
    'Kanteerava Multi-Sport Arena', 'Historic city-center sports arena with well-maintained natural grass grounds and indoor wooden basketball pavilions. Ideal for competitive matches and training.', 'Kasturba Rd, Sampangi Rama Nagar', 'Bangalore', 'Karnataka',
    12.9698, 77.5926, '+91 9845023456', 'kanteerava@playsphere.local',
    '["Floodlights","Seating Gallery","Locker Room","Washrooms","Parking","First Aid"]'::jsonb, '[]'::jsonb, true,
    (SELECT id FROM users WHERE email = 'admin@playsphere.local' LIMIT 1)
  )
  RETURNING id
)
INSERT INTO ground_sports (ground_id, sport_id, surface_type, capacity)
SELECT inserted_ground.id, s.id, t.surface, t.cap
FROM inserted_ground
CROSS JOIN (VALUES
  ('Football', 'Natural Grass', 500),
  ('Basketball', 'Maple Wood Court', 200),
  ('Volleyball', 'Hard Court', 100)
) AS t(sport_name, surface, cap)
JOIN sports s ON lower(s.name) = lower(t.sport_name)
ON CONFLICT DO NOTHING;

-- Ground 3: FSV Arena Hennur
WITH inserted_ground AS (
  INSERT INTO grounds (
    name, description, address, city, state,
    latitude, longitude, contact_phone, contact_email,
    amenities, images, is_active, owner_user_id
  ) VALUES (
    'FSV Arena Hennur', 'FIFA-standard artificial football turf arena with high-density monofilament fibers and low-glare LED illumination, popular for corporate leagues.', 'Hennur Bagalur Main Rd, Chikkagubbi', 'Bangalore', 'Karnataka',
    13.0682, 77.6534, '+91 9845034567', 'hennur@fsvarena.com',
    '["Floodlights","Parking","Changing Rooms","Cafeteria","Shower Facility"]'::jsonb, '[]'::jsonb, true,
    (SELECT id FROM users WHERE email = 'admin@playsphere.local' LIMIT 1)
  )
  RETURNING id
)
INSERT INTO ground_sports (ground_id, sport_id, surface_type, capacity)
SELECT inserted_ground.id, s.id, t.surface, t.cap
FROM inserted_ground
CROSS JOIN (VALUES
  ('Football', 'FIFA-certified Artificial Turf', 150)
) AS t(sport_name, surface, cap)
JOIN sports s ON lower(s.name) = lower(t.sport_name)
ON CONFLICT DO NOTHING;

-- Ground 4: Active Arena Marathahalli
WITH inserted_ground AS (
  INSERT INTO grounds (
    name, description, address, city, state,
    latitude, longitude, contact_phone, contact_email,
    amenities, images, is_active, owner_user_id
  ) VALUES (
    'Active Arena Marathahalli', 'Extensive sports destination equipped for both 7-a-side football, enclosed box cricket turf pitches, and indoor badminton courts with ample parking.', 'Opposite Prestige Tech Park, Outer Ring Rd, Kadubeesanahalli', 'Bangalore', 'Karnataka',
    12.9366, 77.6961, '+91 9845045678', 'marathahalli@activearena.in',
    '["Floodlights","Parking","Water Cooler","Washrooms","Equipment Rental","First Aid"]'::jsonb, '[]'::jsonb, true,
    (SELECT id FROM users WHERE email = 'admin@playsphere.local' LIMIT 1)
  )
  RETURNING id
)
INSERT INTO ground_sports (ground_id, sport_id, surface_type, capacity)
SELECT inserted_ground.id, s.id, t.surface, t.cap
FROM inserted_ground
CROSS JOIN (VALUES
  ('Football', 'Artificial Turf', 80),
  ('Cricket', 'Box Cricket Turf', 60),
  ('Badminton', 'Synthetic Mats', 40)
) AS t(sport_name, surface, cap)
JOIN sports s ON lower(s.name) = lower(t.sport_name)
ON CONFLICT DO NOTHING;

-- Ground 5: Decathlon Anubhava Sports Hub
WITH inserted_ground AS (
  INSERT INTO grounds (
    name, description, address, city, state,
    latitude, longitude, contact_phone, contact_email,
    amenities, images, is_active, owner_user_id
  ) VALUES (
    'Decathlon Anubhava Sports Hub', 'Comprehensive sports facility offering outdoor football, multi-court basketball, and dedicated volleyball courts with Decathlon certified sports equipment.', 'Survey No 78/10, Bellary Rd, Chikkajala', 'Bangalore', 'Karnataka',
    13.1752, 77.6341, '+91 9845056789', 'anubhava@decathlon.in',
    '["Parking","Washrooms","Changing Rooms","Pro Shop","First Aid","Water Cooler"]'::jsonb, '[]'::jsonb, true,
    (SELECT id FROM users WHERE email = 'admin@playsphere.local' LIMIT 1)
  )
  RETURNING id
)
INSERT INTO ground_sports (ground_id, sport_id, surface_type, capacity)
SELECT inserted_ground.id, s.id, t.surface, t.cap
FROM inserted_ground
CROSS JOIN (VALUES
  ('Football', 'Artificial Turf', 90),
  ('Basketball', 'Outdoor Acrylic', 50),
  ('Volleyball', 'Sand Court', 40)
) AS t(sport_name, surface, cap)
JOIN sports s ON lower(s.name) = lower(t.sport_name)
ON CONFLICT DO NOTHING;

-- Ground 6: Tiento Sports Arena Richmond Town
WITH inserted_ground AS (
  INSERT INTO grounds (
    name, description, address, city, state,
    latitude, longitude, contact_phone, contact_email,
    amenities, images, is_active, owner_user_id
  ) VALUES (
    'Tiento Sports Arena Richmond Town', 'Centrally located rooftop turf tailored for fast-paced 5-a-side football and basketball under modern perimeter floodlights.', '64/2, Mission Rd, Shanthala Nagar, Richmond Town', 'Bangalore', 'Karnataka',
    12.9592, 77.5974, '+91 9845067890', 'richmond@tientosports.com',
    '["Floodlights","Washrooms","Parking","Water Cooler","Locker Room"]'::jsonb, '[]'::jsonb, true,
    (SELECT id FROM users WHERE email = 'admin@playsphere.local' LIMIT 1)
  )
  RETURNING id
)
INSERT INTO ground_sports (ground_id, sport_id, surface_type, capacity)
SELECT inserted_ground.id, s.id, t.surface, t.cap
FROM inserted_ground
CROSS JOIN (VALUES
  ('Football', 'Artificial Turf', 70),
  ('Basketball', 'Hard Court', 50)
) AS t(sport_name, surface, cap)
JOIN sports s ON lower(s.name) = lower(t.sport_name)
ON CONFLICT DO NOTHING;

-- Ground 7: Dribble Arena Whitefield
WITH inserted_ground AS (
  INSERT INTO grounds (
    name, description, address, city, state,
    latitude, longitude, contact_phone, contact_email,
    amenities, images, is_active, owner_user_id
  ) VALUES (
    'Dribble Arena Whitefield', 'Spacious suburban sports turf suited for corporate cricket leagues, weekend soccer tournaments, and coaching camps.', 'ECC Rd, Prasanth Extension, Whitefield', 'Bangalore', 'Karnataka',
    12.9734, 77.7492, '+91 9845078901', 'whitefield@dribblearena.in',
    '["Floodlights","Washrooms","Parking","Changing Rooms","Cafeteria"]'::jsonb, '[]'::jsonb, true,
    (SELECT id FROM users WHERE email = 'admin@playsphere.local' LIMIT 1)
  )
  RETURNING id
)
INSERT INTO ground_sports (ground_id, sport_id, surface_type, capacity)
SELECT inserted_ground.id, s.id, t.surface, t.cap
FROM inserted_ground
CROSS JOIN (VALUES
  ('Football', 'Artificial Turf', 100),
  ('Cricket', 'Box Cricket Turf', 80)
) AS t(sport_name, surface, cap)
JOIN sports s ON lower(s.name) = lower(t.sport_name)
ON CONFLICT DO NOTHING;

-- Ground 8: Powerplay Sports Center Hoodi
WITH inserted_ground AS (
  INSERT INTO grounds (
    name, description, address, city, state,
    latitude, longitude, contact_phone, contact_email,
    amenities, images, is_active, owner_user_id
  ) VALUES (
    'Powerplay Sports Center Hoodi', 'High-ceiling indoor complex featuring wooden badminton courts and outdoor astro-turf fields for box cricket and 5v5 soccer.', 'Seetharampalya, Hoodi, Whitefield', 'Bangalore', 'Karnataka',
    12.9881, 77.7123, '+91 9845089012', 'hoodi@powerplaysports.com',
    '["Floodlights","First Aid","Parking","Washrooms","Locker Room"]'::jsonb, '[]'::jsonb, true,
    (SELECT id FROM users WHERE email = 'admin@playsphere.local' LIMIT 1)
  )
  RETURNING id
)
INSERT INTO ground_sports (ground_id, sport_id, surface_type, capacity)
SELECT inserted_ground.id, s.id, t.surface, t.cap
FROM inserted_ground
CROSS JOIN (VALUES
  ('Cricket', 'Box Turf Pitch', 60),
  ('Badminton', 'Wooden Court', 40),
  ('Football', '5-a-side Turf', 50)
) AS t(sport_name, surface, cap)
JOIN sports s ON lower(s.name) = lower(t.sport_name)
ON CONFLICT DO NOTHING;

-- Ground 9: Kicks on Grass Bellandur
WITH inserted_ground AS (
  INSERT INTO grounds (
    name, description, address, city, state,
    latitude, longitude, contact_phone, contact_email,
    amenities, images, is_active, owner_user_id
  ) VALUES (
    'Kicks on Grass Bellandur', 'State-of-the-art dual football arena right behind Tech Parks. Fitted with imported shock-pad turf and full HD match recording cameras.', 'RMZ Ecospace Access Rd, Bellandur', 'Bangalore', 'Karnataka',
    12.9261, 77.6834, '+91 9845090123', 'bellandur@kicksongrass.com',
    '["Floodlights","Changing Rooms","Cafeteria","Parking","Shower Facility","Wi-Fi"]'::jsonb, '[]'::jsonb, true,
    (SELECT id FROM users WHERE email = 'admin@playsphere.local' LIMIT 1)
  )
  RETURNING id
)
INSERT INTO ground_sports (ground_id, sport_id, surface_type, capacity)
SELECT inserted_ground.id, s.id, t.surface, t.cap
FROM inserted_ground
CROSS JOIN (VALUES
  ('Football', 'FIFA 2-Star Turf', 120)
) AS t(sport_name, surface, cap)
JOIN sports s ON lower(s.name) = lower(t.sport_name)
ON CONFLICT DO NOTHING;

-- Ground 10: Gamepoint HSR Arena
WITH inserted_ground AS (
  INSERT INTO grounds (
    name, description, address, city, state,
    latitude, longitude, contact_phone, contact_email,
    amenities, images, is_active, owner_user_id
  ) VALUES (
    'Gamepoint HSR Arena', 'Premier indoor hub in HSR Layout offering BWF standard badminton courts, indoor basketball, and cushioned volleyball surfaces.', '19th Main Rd, Sector 1, HSR Layout', 'Bangalore', 'Karnataka',
    12.9118, 77.6521, '+91 9845101234', 'hsr@gamepointindia.com',
    '["Locker Room","Shower Facility","Water Cooler","Parking","Air Conditioning"]'::jsonb, '[]'::jsonb, true,
    (SELECT id FROM users WHERE email = 'admin@playsphere.local' LIMIT 1)
  )
  RETURNING id
)
INSERT INTO ground_sports (ground_id, sport_id, surface_type, capacity)
SELECT inserted_ground.id, s.id, t.surface, t.cap
FROM inserted_ground
CROSS JOIN (VALUES
  ('Badminton', 'Synthetic Court', 50),
  ('Basketball', 'Indoor Court', 60),
  ('Volleyball', 'Synthetic', 40)
) AS t(sport_name, surface, cap)
JOIN sports s ON lower(s.name) = lower(t.sport_name)
ON CONFLICT DO NOTHING;

-- Ground 11: Kick Off Turf Bandra
WITH inserted_ground AS (
  INSERT INTO grounds (
    name, description, address, city, state,
    latitude, longitude, contact_phone, contact_email,
    amenities, images, is_active, owner_user_id
  ) VALUES (
    'Kick Off Turf Bandra', 'Iconic Bandra sports venue overlooking the sea breeze, featuring high-spec monofilament astro turf for 6v6 football and night cricket.', 'St. Dominic Rd, Bandra West', 'Mumbai', 'Maharashtra',
    19.0553, 72.8295, '+91 9820011223', 'bandra@kickoffturf.com',
    '["Floodlights","Changing Rooms","Washrooms","First Aid","Cafeteria"]'::jsonb, '[]'::jsonb, true,
    (SELECT id FROM users WHERE email = 'admin@playsphere.local' LIMIT 1)
  )
  RETURNING id
)
INSERT INTO ground_sports (ground_id, sport_id, surface_type, capacity)
SELECT inserted_ground.id, s.id, t.surface, t.cap
FROM inserted_ground
CROSS JOIN (VALUES
  ('Football', 'Artificial Turf', 90),
  ('Cricket', 'Box Cricket', 60)
) AS t(sport_name, surface, cap)
JOIN sports s ON lower(s.name) = lower(t.sport_name)
ON CONFLICT DO NOTHING;

-- Ground 12: Urban Sports Park Worli
WITH inserted_ground AS (
  INSERT INTO grounds (
    name, description, address, city, state,
    latitude, longitude, contact_phone, contact_email,
    amenities, images, is_active, owner_user_id
  ) VALUES (
    'Urban Sports Park Worli', 'Rooftop sports destination offering panoramic sea link views, pristine turf conditions, and an all-weather acrylic basketball court.', 'Dr. Annie Besant Rd, Worli', 'Mumbai', 'Maharashtra',
    19.0162, 72.8184, '+91 9820022334', 'worli@urbansports.in',
    '["Floodlights","Parking","Locker Room","Cafeteria","Water Cooler"]'::jsonb, '[]'::jsonb, true,
    (SELECT id FROM users WHERE email = 'admin@playsphere.local' LIMIT 1)
  )
  RETURNING id
)
INSERT INTO ground_sports (ground_id, sport_id, surface_type, capacity)
SELECT inserted_ground.id, s.id, t.surface, t.cap
FROM inserted_ground
CROSS JOIN (VALUES
  ('Football', 'Artificial Turf', 100),
  ('Basketball', 'Hard Court', 50)
) AS t(sport_name, surface, cap)
JOIN sports s ON lower(s.name) = lower(t.sport_name)
ON CONFLICT DO NOTHING;

-- Ground 13: The Base Malad
WITH inserted_ground AS (
  INSERT INTO grounds (
    name, description, address, city, state,
    latitude, longitude, contact_phone, contact_email,
    amenities, images, is_active, owner_user_id
  ) VALUES (
    'The Base Malad', 'Popular North Mumbai football and cricket destination with extra clearance netting and seamless online booking support.', 'Malad Link Rd, Near Inorbit Mall, Malad West', 'Mumbai', 'Maharashtra',
    19.1764, 72.8361, '+91 9820033445', 'malad@thebase.in',
    '["Floodlights","Washrooms","Changing Rooms","Parking"]'::jsonb, '[]'::jsonb, true,
    (SELECT id FROM users WHERE email = 'admin@playsphere.local' LIMIT 1)
  )
  RETURNING id
)
INSERT INTO ground_sports (ground_id, sport_id, surface_type, capacity)
SELECT inserted_ground.id, s.id, t.surface, t.cap
FROM inserted_ground
CROSS JOIN (VALUES
  ('Football', 'Artificial Turf', 80),
  ('Cricket', 'Box Cricket', 60)
) AS t(sport_name, surface, cap)
JOIN sports s ON lower(s.name) = lower(t.sport_name)
ON CONFLICT DO NOTHING;

-- Ground 14: Astro Park Juhu
WITH inserted_ground AS (
  INSERT INTO grounds (
    name, description, address, city, state,
    latitude, longitude, contact_phone, contact_email,
    amenities, images, is_active, owner_user_id
  ) VALUES (
    'Astro Park Juhu', 'Lush seaside turf ground ideal for weekend recreational leagues, youth training academies, and beach volleyball sessions.', 'Vithalrao Vandekar Marg, Juhu Tara Rd, Juhu', 'Mumbai', 'Maharashtra',
    19.0988, 72.8267, '+91 9820044556', 'juhu@astropark.co.in',
    '["Floodlights","Parking","Water Cooler","First Aid","Washrooms"]'::jsonb, '[]'::jsonb, true,
    (SELECT id FROM users WHERE email = 'admin@playsphere.local' LIMIT 1)
  )
  RETURNING id
)
INSERT INTO ground_sports (ground_id, sport_id, surface_type, capacity)
SELECT inserted_ground.id, s.id, t.surface, t.cap
FROM inserted_ground
CROSS JOIN (VALUES
  ('Football', 'FIFA Turf', 100),
  ('Volleyball', 'Sand Court', 40)
) AS t(sport_name, surface, cap)
JOIN sports s ON lower(s.name) = lower(t.sport_name)
ON CONFLICT DO NOTHING;

-- Ground 15: Champions Sports Turf Powai
WITH inserted_ground AS (
  INSERT INTO grounds (
    name, description, address, city, state,
    latitude, longitude, contact_phone, contact_email,
    amenities, images, is_active, owner_user_id
  ) VALUES (
    'Champions Sports Turf Powai', 'Modern sports arena nestled in the hills of Powai, fully equipped with high-beam LED stadium lights and cushioned turf backing.', 'Hiranandani Gardens, Powai', 'Mumbai', 'Maharashtra',
    19.1197, 72.9056, '+91 9820055667', 'powai@championsturf.com',
    '["Floodlights","Changing Rooms","Washrooms","Parking","Cafeteria"]'::jsonb, '[]'::jsonb, true,
    (SELECT id FROM users WHERE email = 'admin@playsphere.local' LIMIT 1)
  )
  RETURNING id
)
INSERT INTO ground_sports (ground_id, sport_id, surface_type, capacity)
SELECT inserted_ground.id, s.id, t.surface, t.cap
FROM inserted_ground
CROSS JOIN (VALUES
  ('Football', 'Artificial Turf', 80),
  ('Cricket', 'Box Cricket', 60)
) AS t(sport_name, surface, cap)
JOIN sports s ON lower(s.name) = lower(t.sport_name)
ON CONFLICT DO NOTHING;

-- Ground 16: Dribble Turf Andheri
WITH inserted_ground AS (
  INSERT INTO grounds (
    name, description, address, city, state,
    latitude, longitude, contact_phone, contact_email,
    amenities, images, is_active, owner_user_id
  ) VALUES (
    'Dribble Turf Andheri', 'Centrally situated sports complex with double-netted enclosures, professional turf pitches, and indoor badminton courts.', 'Veera Desai Industrial Estate, Andheri West', 'Mumbai', 'Maharashtra',
    19.1352, 72.8318, '+91 9820066778', 'andheri@dribbleturf.com',
    '["Floodlights","Washrooms","Parking","Water Cooler","First Aid"]'::jsonb, '[]'::jsonb, true,
    (SELECT id FROM users WHERE email = 'admin@playsphere.local' LIMIT 1)
  )
  RETURNING id
)
INSERT INTO ground_sports (ground_id, sport_id, surface_type, capacity)
SELECT inserted_ground.id, s.id, t.surface, t.cap
FROM inserted_ground
CROSS JOIN (VALUES
  ('Football', 'Artificial Turf', 70),
  ('Badminton', 'Synthetic Mats', 40)
) AS t(sport_name, surface, cap)
JOIN sports s ON lower(s.name) = lower(t.sport_name)
ON CONFLICT DO NOTHING;

-- Ground 17: Nerul Gymkhana Sports Ground
WITH inserted_ground AS (
  INSERT INTO grounds (
    name, description, address, city, state,
    latitude, longitude, contact_phone, contact_email,
    amenities, images, is_active, owner_user_id
  ) VALUES (
    'Nerul Gymkhana Sports Ground', 'Expansive multi-acre sports facility in Navi Mumbai hosting standard size cricket matches, football friendlies, and club tournaments.', 'Sector 28, Nerul West', 'Navi Mumbai', 'Maharashtra',
    19.033, 73.0182, '+91 9820077889', 'nerul@gymkhana.in',
    '["Seating Gallery","Pavilion","Parking","Washrooms","Cafeteria","Locker Room"]'::jsonb, '[]'::jsonb, true,
    (SELECT id FROM users WHERE email = 'admin@playsphere.local' LIMIT 1)
  )
  RETURNING id
)
INSERT INTO ground_sports (ground_id, sport_id, surface_type, capacity)
SELECT inserted_ground.id, s.id, t.surface, t.cap
FROM inserted_ground
CROSS JOIN (VALUES
  ('Cricket', 'Natural Turf Ground', 800),
  ('Football', 'Natural Grass Field', 400)
) AS t(sport_name, surface, cap)
JOIN sports s ON lower(s.name) = lower(t.sport_name)
ON CONFLICT DO NOTHING;

-- Ground 18: SMAAASH Sports Arena Lower Parel
WITH inserted_ground AS (
  INSERT INTO grounds (
    name, description, address, city, state,
    latitude, longitude, contact_phone, contact_email,
    amenities, images, is_active, owner_user_id
  ) VALUES (
    'SMAAASH Sports Arena Lower Parel', 'High-energy sports arena in central Mumbai providing enclosed indoor soccer arenas and automated cricket bowling nets.', 'Gate 4, Kamala Mills Compound, Lower Parel', 'Mumbai', 'Maharashtra',
    18.9953, 72.8272, '+91 9820088990', 'lowerparel@smaaash.in',
    '["Air Conditioning","Cafeteria","Parking","First Aid","Pro Shop","Wi-Fi"]'::jsonb, '[]'::jsonb, true,
    (SELECT id FROM users WHERE email = 'admin@playsphere.local' LIMIT 1)
  )
  RETURNING id
)
INSERT INTO ground_sports (ground_id, sport_id, surface_type, capacity)
SELECT inserted_ground.id, s.id, t.surface, t.cap
FROM inserted_ground
CROSS JOIN (VALUES
  ('Cricket', 'Indoor Turf Pitch', 60),
  ('Football', 'Indoor Turf Arena', 60)
) AS t(sport_name, surface, cap)
JOIN sports s ON lower(s.name) = lower(t.sport_name)
ON CONFLICT DO NOTHING;

-- Ground 19: Siri Fort Sports Complex
WITH inserted_ground AS (
  INSERT INTO grounds (
    name, description, address, city, state,
    latitude, longitude, contact_phone, contact_email,
    amenities, images, is_active, owner_user_id
  ) VALUES (
    'Siri Fort Sports Complex', 'Premier governmental sports enclave with top-tier badminton courts, Olympic-grade basketball courts, and lush grass soccer fields.', 'August Kranti Marg, Siri Fort', 'New Delhi', 'Delhi',
    28.5521, 77.2184, '+91 9811012345', 'sirifort@dda.gov.in',
    '["Floodlights","Seating Gallery","Locker Room","Cafeteria","Parking","Shower Facility"]'::jsonb, '[]'::jsonb, true,
    (SELECT id FROM users WHERE email = 'admin@playsphere.local' LIMIT 1)
  )
  RETURNING id
)
INSERT INTO ground_sports (ground_id, sport_id, surface_type, capacity)
SELECT inserted_ground.id, s.id, t.surface, t.cap
FROM inserted_ground
CROSS JOIN (VALUES
  ('Badminton', 'Wooden Court', 200),
  ('Basketball', 'Synthetic Court', 150),
  ('Football', 'Natural Grass', 400)
) AS t(sport_name, surface, cap)
JOIN sports s ON lower(s.name) = lower(t.sport_name)
ON CONFLICT DO NOTHING;

-- Ground 20: The Base Plaza Vasant Kunj
WITH inserted_ground AS (
  INSERT INTO grounds (
    name, description, address, city, state,
    latitude, longitude, contact_phone, contact_email,
    amenities, images, is_active, owner_user_id
  ) VALUES (
    'The Base Plaza Vasant Kunj', 'Premium sports facility located in South Delhi offering 5v5 and 7v7 turf football alongside high-grade basketball courts.', 'Nelson Mandela Marg, Vasant Kunj', 'New Delhi', 'Delhi',
    28.5398, 77.1567, '+91 9811023456', 'vasantkunj@thebase.in',
    '["Floodlights","Parking","Changing Rooms","First Aid","Water Cooler"]'::jsonb, '[]'::jsonb, true,
    (SELECT id FROM users WHERE email = 'admin@playsphere.local' LIMIT 1)
  )
  RETURNING id
)
INSERT INTO ground_sports (ground_id, sport_id, surface_type, capacity)
SELECT inserted_ground.id, s.id, t.surface, t.cap
FROM inserted_ground
CROSS JOIN (VALUES
  ('Football', 'Artificial Turf', 100),
  ('Basketball', 'Hard Court', 60)
) AS t(sport_name, surface, cap)
JOIN sports s ON lower(s.name) = lower(t.sport_name)
ON CONFLICT DO NOTHING;

-- Ground 21: Thyagaraj Sports Stadium Arena
WITH inserted_ground AS (
  INSERT INTO grounds (
    name, description, address, city, state,
    latitude, longitude, contact_phone, contact_email,
    amenities, images, is_active, owner_user_id
  ) VALUES (
    'Thyagaraj Sports Stadium Arena', 'Historic Commonwealth Games facility featuring world-class indoor volleyball arenas and full-dimension football grounds.', 'INA Colony, Thyagaraj Stadium Rd', 'New Delhi', 'Delhi',
    28.5772, 77.2141, '+91 9811034567', 'thyagaraj@delhigov.in',
    '["Floodlights","Changing Rooms","Shower Facility","Parking","Seating Gallery"]'::jsonb, '[]'::jsonb, true,
    (SELECT id FROM users WHERE email = 'admin@playsphere.local' LIMIT 1)
  )
  RETURNING id
)
INSERT INTO ground_sports (ground_id, sport_id, surface_type, capacity)
SELECT inserted_ground.id, s.id, t.surface, t.cap
FROM inserted_ground
CROSS JOIN (VALUES
  ('Football', 'Natural Grass', 600),
  ('Volleyball', 'Indoor Court', 200)
) AS t(sport_name, surface, cap)
JOIN sports s ON lower(s.name) = lower(t.sport_name)
ON CONFLICT DO NOTHING;

-- Ground 22: Gallant Sports Arena Gurgaon
WITH inserted_ground AS (
  INSERT INTO grounds (
    name, description, address, city, state,
    latitude, longitude, contact_phone, contact_email,
    amenities, images, is_active, owner_user_id
  ) VALUES (
    'Gallant Sports Arena Gurgaon', 'Sprawling athletic facility on Golf Course Extension Road with multiple FIFA certified turf grounds and full cricket pitches.', 'Golf Course Extension Rd, Sector 56', 'Gurgaon', 'Haryana',
    28.4231, 77.0984, '+91 9811045678', 'gurgaon@gallantsports.in',
    '["Floodlights","Cafeteria","Parking","Washrooms","First Aid","Wi-Fi"]'::jsonb, '[]'::jsonb, true,
    (SELECT id FROM users WHERE email = 'admin@playsphere.local' LIMIT 1)
  )
  RETURNING id
)
INSERT INTO ground_sports (ground_id, sport_id, surface_type, capacity)
SELECT inserted_ground.id, s.id, t.surface, t.cap
FROM inserted_ground
CROSS JOIN (VALUES
  ('Football', 'FIFA Artificial Turf', 150),
  ('Cricket', 'Turf Pitch', 100)
) AS t(sport_name, surface, cap)
JOIN sports s ON lower(s.name) = lower(t.sport_name)
ON CONFLICT DO NOTHING;

-- Ground 23: Hudle Turf CyberHub
WITH inserted_ground AS (
  INSERT INTO grounds (
    name, description, address, city, state,
    latitude, longitude, contact_phone, contact_email,
    amenities, images, is_active, owner_user_id
  ) VALUES (
    'Hudle Turf CyberHub', 'Ultra-accessible rooftop sports turf situated next to DLF Cyber City, perfect for corporate tournaments and after-work matches.', 'DLF Phase 2, Sector 24', 'Gurgaon', 'Haryana',
    28.4952, 77.0891, '+91 9811056789', 'cybercity@hudle.in',
    '["Floodlights","Parking","Locker Room","Water Cooler","Changing Rooms"]'::jsonb, '[]'::jsonb, true,
    (SELECT id FROM users WHERE email = 'admin@playsphere.local' LIMIT 1)
  )
  RETURNING id
)
INSERT INTO ground_sports (ground_id, sport_id, surface_type, capacity)
SELECT inserted_ground.id, s.id, t.surface, t.cap
FROM inserted_ground
CROSS JOIN (VALUES
  ('Football', 'Artificial Turf', 80),
  ('Badminton', 'Synthetic Mats', 40)
) AS t(sport_name, surface, cap)
JOIN sports s ON lower(s.name) = lower(t.sport_name)
ON CONFLICT DO NOTHING;

-- Ground 24: Noida Indoor Stadium & Sports Hub
WITH inserted_ground AS (
  INSERT INTO grounds (
    name, description, address, city, state,
    latitude, longitude, contact_phone, contact_email,
    amenities, images, is_active, owner_user_id
  ) VALUES (
    'Noida Indoor Stadium & Sports Hub', 'Centrally air-conditioned multi-sport complex offering BWF certified badminton courts, wooden basketball courts, and outdoor cricket pitches.', 'Sector 21A', 'Noida', 'Uttar Pradesh',
    28.5912, 77.3375, '+91 9811067890', 'noidastadium@noidaauthority.in',
    '["Air Conditioning","Seating Gallery","Parking","Shower Facility","First Aid"]'::jsonb, '[]'::jsonb, true,
    (SELECT id FROM users WHERE email = 'admin@playsphere.local' LIMIT 1)
  )
  RETURNING id
)
INSERT INTO ground_sports (ground_id, sport_id, surface_type, capacity)
SELECT inserted_ground.id, s.id, t.surface, t.cap
FROM inserted_ground
CROSS JOIN (VALUES
  ('Basketball', 'Wooden Court', 180),
  ('Badminton', 'BWF Mat', 80),
  ('Cricket', 'Turf Ground', 500)
) AS t(sport_name, surface, cap)
JOIN sports s ON lower(s.name) = lower(t.sport_name)
ON CONFLICT DO NOTHING;

-- Ground 25: Spartan Sports Complex Dwarka
WITH inserted_ground AS (
  INSERT INTO grounds (
    name, description, address, city, state,
    latitude, longitude, contact_phone, contact_email,
    amenities, images, is_active, owner_user_id
  ) VALUES (
    'Spartan Sports Complex Dwarka', 'Enclosed multi-sport venue in Dwarka with top-rated shock-absorbing turf, box cricket nets, and dedicated warming areas.', 'Sector 11, Dwarka', 'New Delhi', 'Delhi',
    28.5834, 77.0512, '+91 9811078901', 'dwarka@spartansports.in',
    '["Floodlights","Washrooms","Parking","First Aid","Water Cooler"]'::jsonb, '[]'::jsonb, true,
    (SELECT id FROM users WHERE email = 'admin@playsphere.local' LIMIT 1)
  )
  RETURNING id
)
INSERT INTO ground_sports (ground_id, sport_id, surface_type, capacity)
SELECT inserted_ground.id, s.id, t.surface, t.cap
FROM inserted_ground
CROSS JOIN (VALUES
  ('Cricket', 'Box Turf Pitch', 70),
  ('Football', '7-a-side Turf', 90)
) AS t(sport_name, surface, cap)
JOIN sports s ON lower(s.name) = lower(t.sport_name)
ON CONFLICT DO NOTHING;

-- Ground 26: Kicksal Futsal Arena Greater Noida
WITH inserted_ground AS (
  INSERT INTO grounds (
    name, description, address, city, state,
    latitude, longitude, contact_phone, contact_email,
    amenities, images, is_active, owner_user_id
  ) VALUES (
    'Kicksal Futsal Arena Greater Noida', 'Modern futsal hub providing high-speed play on non-abrasive turf and regulation outdoor volleyball facilities.', 'Knowledge Park III', 'Greater Noida', 'Uttar Pradesh',
    28.4715, 77.4981, '+91 9811089012', 'kicksal@greaternoida.in',
    '["Floodlights","Parking","Water Cooler","Changing Rooms"]'::jsonb, '[]'::jsonb, true,
    (SELECT id FROM users WHERE email = 'admin@playsphere.local' LIMIT 1)
  )
  RETURNING id
)
INSERT INTO ground_sports (ground_id, sport_id, surface_type, capacity)
SELECT inserted_ground.id, s.id, t.surface, t.cap
FROM inserted_ground
CROSS JOIN (VALUES
  ('Football', 'Futsal Turf', 60),
  ('Volleyball', 'Hard Court', 40)
) AS t(sport_name, surface, cap)
JOIN sports s ON lower(s.name) = lower(t.sport_name)
ON CONFLICT DO NOTHING;

-- Ground 27: Gamepoint Jubilee Hills
WITH inserted_ground AS (
  INSERT INTO grounds (
    name, description, address, city, state,
    latitude, longitude, contact_phone, contact_email,
    amenities, images, is_active, owner_user_id
  ) VALUES (
    'Gamepoint Jubilee Hills', 'High-end indoor athletic facility housing synthetic badminton courts, timber basketball courts, and outdoor rooftop 5-a-side turf.', 'Road No 36, Jubilee Hills', 'Hyderabad', 'Telangana',
    17.4312, 78.4071, '+91 9849011223', 'jubileehills@gamepoint.in',
    '["Floodlights","Air Conditioning","Locker Room","Cafeteria","Parking","Shower Facility"]'::jsonb, '[]'::jsonb, true,
    (SELECT id FROM users WHERE email = 'admin@playsphere.local' LIMIT 1)
  )
  RETURNING id
)
INSERT INTO ground_sports (ground_id, sport_id, surface_type, capacity)
SELECT inserted_ground.id, s.id, t.surface, t.cap
FROM inserted_ground
CROSS JOIN (VALUES
  ('Badminton', 'Synthetic Court', 60),
  ('Basketball', 'Indoor Timber', 80),
  ('Football', 'Rooftop Turf', 60)
) AS t(sport_name, surface, cap)
JOIN sports s ON lower(s.name) = lower(t.sport_name)
ON CONFLICT DO NOTHING;

-- Ground 28: HotFut Gachibowli Arena
WITH inserted_ground AS (
  INSERT INTO grounds (
    name, description, address, city, state,
    latitude, longitude, contact_phone, contact_email,
    amenities, images, is_active, owner_user_id
  ) VALUES (
    'HotFut Gachibowli Arena', 'Heart of Hyderabad IT corridor sports venue with dual artificial football pitches and enclosed box cricket arenas.', 'Whitefields, Kondapur, Near Gachibowli', 'Hyderabad', 'Telangana',
    17.4589, 78.3642, '+91 9849022334', 'gachibowli@hotfut.in',
    '["Floodlights","Changing Rooms","Washrooms","Parking","Cafeteria"]'::jsonb, '[]'::jsonb, true,
    (SELECT id FROM users WHERE email = 'admin@playsphere.local' LIMIT 1)
  )
  RETURNING id
)
INSERT INTO ground_sports (ground_id, sport_id, surface_type, capacity)
SELECT inserted_ground.id, s.id, t.surface, t.cap
FROM inserted_ground
CROSS JOIN (VALUES
  ('Football', 'FIFA Artificial Turf', 100),
  ('Cricket', 'Box Cricket', 70)
) AS t(sport_name, surface, cap)
JOIN sports s ON lower(s.name) = lower(t.sport_name)
ON CONFLICT DO NOTHING;

-- Ground 29: Gopichand Badminton & Sports Arena
WITH inserted_ground AS (
  INSERT INTO grounds (
    name, description, address, city, state,
    latitude, longitude, contact_phone, contact_email,
    amenities, images, is_active, owner_user_id
  ) VALUES (
    'Gopichand Badminton & Sports Arena', 'World-renowned training center offering pristine BWF tournament courts, fitness suites, and dedicated basketball courts.', 'ISB Rd, Gachibowli', 'Hyderabad', 'Telangana',
    17.4411, 78.3498, '+91 9849033445', 'gopichand@academy.in',
    '["Locker Room","Seating Gallery","Cafeteria","Pro Shop","Parking","Shower Facility"]'::jsonb, '[]'::jsonb, true,
    (SELECT id FROM users WHERE email = 'admin@playsphere.local' LIMIT 1)
  )
  RETURNING id
)
INSERT INTO ground_sports (ground_id, sport_id, surface_type, capacity)
SELECT inserted_ground.id, s.id, t.surface, t.cap
FROM inserted_ground
CROSS JOIN (VALUES
  ('Badminton', 'International Vinyl Mat', 300),
  ('Basketball', 'Hard Court', 100)
) AS t(sport_name, surface, cap)
JOIN sports s ON lower(s.name) = lower(t.sport_name)
ON CONFLICT DO NOTHING;

-- Ground 30: Astro Turf Madhapur
WITH inserted_ground AS (
  INSERT INTO grounds (
    name, description, address, city, state,
    latitude, longitude, contact_phone, contact_email,
    amenities, images, is_active, owner_user_id
  ) VALUES (
    'Astro Turf Madhapur', 'Top-tier turf ground minutes away from Cyber Towers, favored for midnight matches and corporate tournaments.', 'Ayyappa Society Main Rd, Madhapur', 'Hyderabad', 'Telangana',
    17.4491, 78.3912, '+91 9849044556', 'madhapur@astroturf.in',
    '["Floodlights","Parking","Water Cooler","First Aid","Washrooms"]'::jsonb, '[]'::jsonb, true,
    (SELECT id FROM users WHERE email = 'admin@playsphere.local' LIMIT 1)
  )
  RETURNING id
)
INSERT INTO ground_sports (ground_id, sport_id, surface_type, capacity)
SELECT inserted_ground.id, s.id, t.surface, t.cap
FROM inserted_ground
CROSS JOIN (VALUES
  ('Football', 'Artificial Turf', 80),
  ('Cricket', 'Box Turf Pitch', 60)
) AS t(sport_name, surface, cap)
JOIN sports s ON lower(s.name) = lower(t.sport_name)
ON CONFLICT DO NOTHING;

-- Ground 31: LB Stadium Sports Enclave
WITH inserted_ground AS (
  INSERT INTO grounds (
    name, description, address, city, state,
    latitude, longitude, contact_phone, contact_email,
    amenities, images, is_active, owner_user_id
  ) VALUES (
    'LB Stadium Sports Enclave', 'Historic city-center stadium ground boasting tournament-ready turf wickets, floodlit volleyball fields, and spectator stands.', 'Fateh Maidan, Basheer Bagh', 'Hyderabad', 'Telangana',
    17.3994, 78.4735, '+91 9849055667', 'lbstadium@telanganasports.gov.in',
    '["Pavilion","Floodlights","Seating Gallery","Parking","Washrooms"]'::jsonb, '[]'::jsonb, true,
    (SELECT id FROM users WHERE email = 'admin@playsphere.local' LIMIT 1)
  )
  RETURNING id
)
INSERT INTO ground_sports (ground_id, sport_id, surface_type, capacity)
SELECT inserted_ground.id, s.id, t.surface, t.cap
FROM inserted_ground
CROSS JOIN (VALUES
  ('Cricket', 'Clay Turf Pitch', 1000),
  ('Volleyball', 'Outdoor Hard Court', 200)
) AS t(sport_name, surface, cap)
JOIN sports s ON lower(s.name) = lower(t.sport_name)
ON CONFLICT DO NOTHING;

-- Ground 32: Dugout Sports Complex Financial District
WITH inserted_ground AS (
  INSERT INTO grounds (
    name, description, address, city, state,
    latitude, longitude, contact_phone, contact_email,
    amenities, images, is_active, owner_user_id
  ) VALUES (
    'Dugout Sports Complex Financial District', 'Modern turf arena surrounded by Fortune 500 offices, equipped with heavy-duty floodlights and live-streaming camera setups.', 'Financial District, Nanakramguda', 'Hyderabad', 'Telangana',
    17.4182, 78.3411, '+91 9849066778', 'nanakramguda@dugout.in',
    '["Floodlights","Cafeteria","Changing Rooms","Parking","Shower Facility"]'::jsonb, '[]'::jsonb, true,
    (SELECT id FROM users WHERE email = 'admin@playsphere.local' LIMIT 1)
  )
  RETURNING id
)
INSERT INTO ground_sports (ground_id, sport_id, surface_type, capacity)
SELECT inserted_ground.id, s.id, t.surface, t.cap
FROM inserted_ground
CROSS JOIN (VALUES
  ('Football', 'Artificial Turf', 100),
  ('Cricket', 'Turf Pitch', 70)
) AS t(sport_name, surface, cap)
JOIN sports s ON lower(s.name) = lower(t.sport_name)
ON CONFLICT DO NOTHING;

-- Ground 33: Tiki Taka Kilpauk
WITH inserted_ground AS (
  INSERT INTO grounds (
    name, description, address, city, state,
    latitude, longitude, contact_phone, contact_email,
    amenities, images, is_active, owner_user_id
  ) VALUES (
    'Tiki Taka Kilpauk', 'Pioneering rooftop football turf in Chennai providing cushioned monofilament artificial grass and premium night floodlights.', 'New Avadi Rd, Kilpauk', 'Chennai', 'Tamil Nadu',
    13.0841, 80.2392, '+91 9840011223', 'kilpauk@tikitaka.in',
    '["Floodlights","Changing Rooms","Parking","Water Cooler","Washrooms"]'::jsonb, '[]'::jsonb, true,
    (SELECT id FROM users WHERE email = 'admin@playsphere.local' LIMIT 1)
  )
  RETURNING id
)
INSERT INTO ground_sports (ground_id, sport_id, surface_type, capacity)
SELECT inserted_ground.id, s.id, t.surface, t.cap
FROM inserted_ground
CROSS JOIN (VALUES
  ('Football', 'FIFA Certified Turf', 90)
) AS t(sport_name, surface, cap)
JOIN sports s ON lower(s.name) = lower(t.sport_name)
ON CONFLICT DO NOTHING;

-- Ground 34: Game On Turf T. Nagar
WITH inserted_ground AS (
  INSERT INTO grounds (
    name, description, address, city, state,
    latitude, longitude, contact_phone, contact_email,
    amenities, images, is_active, owner_user_id
  ) VALUES (
    'Game On Turf T. Nagar', 'Central Chennai sports hub accommodating high-tempo 5v5 soccer matches and box cricket leagues in a fully netted arena.', 'Bazullah Rd, T. Nagar', 'Chennai', 'Tamil Nadu',
    13.0412, 80.2335, '+91 9840022334', 'tnagar@gameonturf.com',
    '["Floodlights","Washrooms","Parking","First Aid"]'::jsonb, '[]'::jsonb, true,
    (SELECT id FROM users WHERE email = 'admin@playsphere.local' LIMIT 1)
  )
  RETURNING id
)
INSERT INTO ground_sports (ground_id, sport_id, surface_type, capacity)
SELECT inserted_ground.id, s.id, t.surface, t.cap
FROM inserted_ground
CROSS JOIN (VALUES
  ('Football', 'Artificial Turf', 70),
  ('Cricket', 'Box Cricket', 60)
) AS t(sport_name, surface, cap)
JOIN sports s ON lower(s.name) = lower(t.sport_name)
ON CONFLICT DO NOTHING;

-- Ground 35: SDAT Multi-Sport Complex Nungambakkam
WITH inserted_ground AS (
  INSERT INTO grounds (
    name, description, address, city, state,
    latitude, longitude, contact_phone, contact_email,
    amenities, images, is_active, owner_user_id
  ) VALUES (
    'SDAT Multi-Sport Complex Nungambakkam', 'Government sports venue featuring international synthetic basketball courts, volleyball courts, and full locker room facilities.', 'Lake Area, Nungambakkam', 'Chennai', 'Tamil Nadu',
    13.0618, 80.2405, '+91 9840033445', 'sdat@tn.gov.in',
    '["Seating Gallery","Floodlights","Locker Room","Parking","Shower Facility"]'::jsonb, '[]'::jsonb, true,
    (SELECT id FROM users WHERE email = 'admin@playsphere.local' LIMIT 1)
  )
  RETURNING id
)
INSERT INTO ground_sports (ground_id, sport_id, surface_type, capacity)
SELECT inserted_ground.id, s.id, t.surface, t.cap
FROM inserted_ground
CROSS JOIN (VALUES
  ('Basketball', 'Hard Court', 250),
  ('Volleyball', 'Synthetic', 120)
) AS t(sport_name, surface, cap)
JOIN sports s ON lower(s.name) = lower(t.sport_name)
ON CONFLICT DO NOTHING;

-- Ground 36: Whistle Urban Sports Hub OMR
WITH inserted_ground AS (
  INSERT INTO grounds (
    name, description, address, city, state,
    latitude, longitude, contact_phone, contact_email,
    amenities, images, is_active, owner_user_id
  ) VALUES (
    'Whistle Urban Sports Hub OMR', 'Tech corridor multi-sports paradise offering football turfs, box cricket, and indoor wooden badminton courts.', 'Rajiv Gandhi Salai, Thoraipakkam', 'Chennai', 'Tamil Nadu',
    12.9341, 80.2312, '+91 9840044556', 'omr@whistlesports.com',
    '["Floodlights","Cafeteria","Parking","Shower Facility","Wi-Fi"]'::jsonb, '[]'::jsonb, true,
    (SELECT id FROM users WHERE email = 'admin@playsphere.local' LIMIT 1)
  )
  RETURNING id
)
INSERT INTO ground_sports (ground_id, sport_id, surface_type, capacity)
SELECT inserted_ground.id, s.id, t.surface, t.cap
FROM inserted_ground
CROSS JOIN (VALUES
  ('Football', 'Artificial Turf', 90),
  ('Cricket', 'Box Cricket', 70),
  ('Badminton', 'Wooden Court', 40)
) AS t(sport_name, surface, cap)
JOIN sports s ON lower(s.name) = lower(t.sport_name)
ON CONFLICT DO NOTHING;

-- Ground 37: Playce Arena Velachery
WITH inserted_ground AS (
  INSERT INTO grounds (
    name, description, address, city, state,
    latitude, longitude, contact_phone, contact_email,
    amenities, images, is_active, owner_user_id
  ) VALUES (
    'Playce Arena Velachery', 'Premier suburban sports arena with weather-resistant turf pitches and acrylic basketball courts.', '100 Feet Bypass Rd, Velachery', 'Chennai', 'Tamil Nadu',
    12.9815, 80.2184, '+91 9840055667', 'velachery@playcearena.in',
    '["Floodlights","Changing Rooms","Washrooms","Parking"]'::jsonb, '[]'::jsonb, true,
    (SELECT id FROM users WHERE email = 'admin@playsphere.local' LIMIT 1)
  )
  RETURNING id
)
INSERT INTO ground_sports (ground_id, sport_id, surface_type, capacity)
SELECT inserted_ground.id, s.id, t.surface, t.cap
FROM inserted_ground
CROSS JOIN (VALUES
  ('Football', 'Artificial Turf', 80),
  ('Basketball', 'Outdoor Acrylic', 50)
) AS t(sport_name, surface, cap)
JOIN sports s ON lower(s.name) = lower(t.sport_name)
ON CONFLICT DO NOTHING;

-- Ground 38: Marina Sports Arena Mylapore
WITH inserted_ground AS (
  INSERT INTO grounds (
    name, description, address, city, state,
    latitude, longitude, contact_phone, contact_email,
    amenities, images, is_active, owner_user_id
  ) VALUES (
    'Marina Sports Arena Mylapore', 'Beachside sports ground hosting natural sand volleyball matches and fast-paced 5v5 football right by the coast.', 'Santhome High Rd, Mylapore', 'Chennai', 'Tamil Nadu',
    13.0335, 80.2784, '+91 9840066778', 'marina@playsphere.local',
    '["Parking","Water Cooler","First Aid","Washrooms","Beach Showers"]'::jsonb, '[]'::jsonb, true,
    (SELECT id FROM users WHERE email = 'admin@playsphere.local' LIMIT 1)
  )
  RETURNING id
)
INSERT INTO ground_sports (ground_id, sport_id, surface_type, capacity)
SELECT inserted_ground.id, s.id, t.surface, t.cap
FROM inserted_ground
CROSS JOIN (VALUES
  ('Volleyball', 'Beach Sand Court', 100),
  ('Football', 'Artificial Turf', 70)
) AS t(sport_name, surface, cap)
JOIN sports s ON lower(s.name) = lower(t.sport_name)
ON CONFLICT DO NOTHING;

-- Ground 39: HotFut SP Infocity
WITH inserted_ground AS (
  INSERT INTO grounds (
    name, description, address, city, state,
    latitude, longitude, contact_phone, contact_email,
    amenities, images, is_active, owner_user_id
  ) VALUES (
    'HotFut SP Infocity', 'Expansive football turf and cricket pitch set inside the SP Infocity tech park, boasting professional drainage systems.', 'SP Infocity, Fursungi', 'Pune', 'Maharashtra',
    18.4812, 73.9634, '+91 9822011223', 'infocity@hotfut.in',
    '["Floodlights","Changing Rooms","Cafeteria","Parking","First Aid"]'::jsonb, '[]'::jsonb, true,
    (SELECT id FROM users WHERE email = 'admin@playsphere.local' LIMIT 1)
  )
  RETURNING id
)
INSERT INTO ground_sports (ground_id, sport_id, surface_type, capacity)
SELECT inserted_ground.id, s.id, t.surface, t.cap
FROM inserted_ground
CROSS JOIN (VALUES
  ('Football', 'FIFA Artificial Turf', 110),
  ('Cricket', 'Turf Pitch', 70)
) AS t(sport_name, surface, cap)
JOIN sports s ON lower(s.name) = lower(t.sport_name)
ON CONFLICT DO NOTHING;

-- Ground 40: Viman Nagar Sports Club
WITH inserted_ground AS (
  INSERT INTO grounds (
    name, description, address, city, state,
    latitude, longitude, contact_phone, contact_email,
    amenities, images, is_active, owner_user_id
  ) VALUES (
    'Viman Nagar Sports Club', 'Vibrant neighborhood sports center with dual artificial football turfs and indoor synthetic badminton courts.', 'Sakore Nagar, Viman Nagar', 'Pune', 'Maharashtra',
    18.5672, 73.9142, '+91 9822022334', 'vimannagar@sportsclub.in',
    '["Floodlights","Washrooms","Parking","Water Cooler"]'::jsonb, '[]'::jsonb, true,
    (SELECT id FROM users WHERE email = 'admin@playsphere.local' LIMIT 1)
  )
  RETURNING id
)
INSERT INTO ground_sports (ground_id, sport_id, surface_type, capacity)
SELECT inserted_ground.id, s.id, t.surface, t.cap
FROM inserted_ground
CROSS JOIN (VALUES
  ('Football', 'Artificial Turf', 80),
  ('Badminton', 'Synthetic Mats', 40)
) AS t(sport_name, surface, cap)
JOIN sports s ON lower(s.name) = lower(t.sport_name)
ON CONFLICT DO NOTHING;

-- Ground 41: Balewadi Shiv Chhatrapati Sports Complex
WITH inserted_ground AS (
  INSERT INTO grounds (
    name, description, address, city, state,
    latitude, longitude, contact_phone, contact_email,
    amenities, images, is_active, owner_user_id
  ) VALUES (
    'Balewadi Shiv Chhatrapati Sports Complex', 'National championship stadium offering international wooden basketball courts, Olympic badminton arenas, and volleyball facilities.', 'National Sports Complex, Mahalunge, Balewadi', 'Pune', 'Maharashtra',
    18.5794, 73.7661, '+91 9822033445', 'balewadi@maharashtrasports.gov.in',
    '["International Seating","Changing Rooms","Parking","Shower Facility","First Aid","Cafeteria"]'::jsonb, '[]'::jsonb, true,
    (SELECT id FROM users WHERE email = 'admin@playsphere.local' LIMIT 1)
  )
  RETURNING id
)
INSERT INTO ground_sports (ground_id, sport_id, surface_type, capacity)
SELECT inserted_ground.id, s.id, t.surface, t.cap
FROM inserted_ground
CROSS JOIN (VALUES
  ('Basketball', 'Maple Wood Floor', 600),
  ('Volleyball', 'Indoor Synthetic', 300),
  ('Badminton', 'International BWF Mat', 400)
) AS t(sport_name, surface, cap)
JOIN sports s ON lower(s.name) = lower(t.sport_name)
ON CONFLICT DO NOTHING;

-- Ground 42: Kothrud Turf Arena
WITH inserted_ground AS (
  INSERT INTO grounds (
    name, description, address, city, state,
    latitude, longitude, contact_phone, contact_email,
    amenities, images, is_active, owner_user_id
  ) VALUES (
    'Kothrud Turf Arena', 'Enclosed sports turf in West Pune catering to competitive cricket leagues and local football clubs.', 'Paud Rd, Rambaug Colony, Kothrud', 'Pune', 'Maharashtra',
    18.5085, 73.8124, '+91 9822044556', 'kothrud@turfarena.in',
    '["Floodlights","Washrooms","Parking","Water Cooler"]'::jsonb, '[]'::jsonb, true,
    (SELECT id FROM users WHERE email = 'admin@playsphere.local' LIMIT 1)
  )
  RETURNING id
)
INSERT INTO ground_sports (ground_id, sport_id, surface_type, capacity)
SELECT inserted_ground.id, s.id, t.surface, t.cap
FROM inserted_ground
CROSS JOIN (VALUES
  ('Football', 'Artificial Turf', 70),
  ('Cricket', 'Box Cricket', 60)
) AS t(sport_name, surface, cap)
JOIN sports s ON lower(s.name) = lower(t.sport_name)
ON CONFLICT DO NOTHING;

-- Ground 43: Life Sports Academy Baner
WITH inserted_ground AS (
  INSERT INTO grounds (
    name, description, address, city, state,
    latitude, longitude, contact_phone, contact_email,
    amenities, images, is_active, owner_user_id
  ) VALUES (
    'Life Sports Academy Baner', 'Dedicated badminton and futsal academy featuring certified coaches, shock-resistant wooden flooring, and pro gear rental.', 'Near Pancard Club Rd, Baner', 'Pune', 'Maharashtra',
    18.5581, 73.7845, '+91 9822055667', 'baner@lifesports.in',
    '["Locker Room","Shower Facility","Parking","First Aid","Pro Shop"]'::jsonb, '[]'::jsonb, true,
    (SELECT id FROM users WHERE email = 'admin@playsphere.local' LIMIT 1)
  )
  RETURNING id
)
INSERT INTO ground_sports (ground_id, sport_id, surface_type, capacity)
SELECT inserted_ground.id, s.id, t.surface, t.cap
FROM inserted_ground
CROSS JOIN (VALUES
  ('Badminton', 'Wooden Court', 50),
  ('Football', '5-a-side Turf', 50)
) AS t(sport_name, surface, cap)
JOIN sports s ON lower(s.name) = lower(t.sport_name)
ON CONFLICT DO NOTHING;

-- Ground 44: Salt Lake Sports Hub
WITH inserted_ground AS (
  INSERT INTO grounds (
    name, description, address, city, state,
    latitude, longitude, contact_phone, contact_email,
    amenities, images, is_active, owner_user_id
  ) VALUES (
    'Salt Lake Sports Hub', 'Historic sports enclave with championship grass soccer fields and turf cricket pitches, well connected by Kolkata metro.', 'Sector III, Bidhannagar, Salt Lake', 'Kolkata', 'West Bengal',
    22.5714, 88.4125, '+91 9830011223', 'saltlake@kolkatasports.in',
    '["Floodlights","Seating Pavilion","Changing Rooms","Parking","Cafeteria"]'::jsonb, '[]'::jsonb, true,
    (SELECT id FROM users WHERE email = 'admin@playsphere.local' LIMIT 1)
  )
  RETURNING id
)
INSERT INTO ground_sports (ground_id, sport_id, surface_type, capacity)
SELECT inserted_ground.id, s.id, t.surface, t.cap
FROM inserted_ground
CROSS JOIN (VALUES
  ('Football', 'Natural Grass', 800),
  ('Cricket', 'Turf Pitch', 500)
) AS t(sport_name, surface, cap)
JOIN sports s ON lower(s.name) = lower(t.sport_name)
ON CONFLICT DO NOTHING;

-- Ground 45: KickOff Arena New Town
WITH inserted_ground AS (
  INSERT INTO grounds (
    name, description, address, city, state,
    latitude, longitude, contact_phone, contact_email,
    amenities, images, is_active, owner_user_id
  ) VALUES (
    'KickOff Arena New Town', 'Modern sports facility in Rajarhat offering dual-turf setups with top-flight shock absorption and live match broadcasts.', 'Major Arterial Rd, Action Area II, New Town', 'Kolkata', 'West Bengal',
    22.6128, 88.4682, '+91 9830022334', 'newtown@kickoffarena.in',
    '["Floodlights","Cafeteria","Parking","Water Cooler","Washrooms"]'::jsonb, '[]'::jsonb, true,
    (SELECT id FROM users WHERE email = 'admin@playsphere.local' LIMIT 1)
  )
  RETURNING id
)
INSERT INTO ground_sports (ground_id, sport_id, surface_type, capacity)
SELECT inserted_ground.id, s.id, t.surface, t.cap
FROM inserted_ground
CROSS JOIN (VALUES
  ('Football', 'Artificial Turf', 100),
  ('Cricket', 'Box Cricket', 70)
) AS t(sport_name, surface, cap)
JOIN sports s ON lower(s.name) = lower(t.sport_name)
ON CONFLICT DO NOTHING;

-- Ground 46: Eden Sports Pavilion & Turf
WITH inserted_ground AS (
  INSERT INTO grounds (
    name, description, address, city, state,
    latitude, longitude, contact_phone, contact_email,
    amenities, images, is_active, owner_user_id
  ) VALUES (
    'Eden Sports Pavilion & Turf', 'Heritage cricket ground and multi-sport court situated in the heart of Maidan, celebrated for pristine pitch maintenance.', 'B.B.D. Bagh, Strand Rd', 'Kolkata', 'West Bengal',
    22.5647, 88.3431, '+91 9830033445', 'maidan@edensports.in',
    '["Pavilion","Historic Grandstand","Parking","Washrooms","First Aid"]'::jsonb, '[]'::jsonb, true,
    (SELECT id FROM users WHERE email = 'admin@playsphere.local' LIMIT 1)
  )
  RETURNING id
)
INSERT INTO ground_sports (ground_id, sport_id, surface_type, capacity)
SELECT inserted_ground.id, s.id, t.surface, t.cap
FROM inserted_ground
CROSS JOIN (VALUES
  ('Cricket', 'Clay Turf Pitch', 600),
  ('Volleyball', 'Outdoor Court', 100)
) AS t(sport_name, surface, cap)
JOIN sports s ON lower(s.name) = lower(t.sport_name)
ON CONFLICT DO NOTHING;

-- Ground 47: South City Futsal & Badminton Turf
WITH inserted_ground AS (
  INSERT INTO grounds (
    name, description, address, city, state,
    latitude, longitude, contact_phone, contact_email,
    amenities, images, is_active, owner_user_id
  ) VALUES (
    'South City Futsal & Badminton Turf', 'Rooftop sports complex with an unforgettable Kolkata skyline view, specialized for evening futsal and badminton games.', 'Prince Anwar Shah Rd, Jadavpur', 'Kolkata', 'West Bengal',
    22.5012, 88.3624, '+91 9830044556', 'southcity@futsalkolkata.in',
    '["Floodlights","Rooftop Seating","Parking","Washrooms","Locker Room"]'::jsonb, '[]'::jsonb, true,
    (SELECT id FROM users WHERE email = 'admin@playsphere.local' LIMIT 1)
  )
  RETURNING id
)
INSERT INTO ground_sports (ground_id, sport_id, surface_type, capacity)
SELECT inserted_ground.id, s.id, t.surface, t.cap
FROM inserted_ground
CROSS JOIN (VALUES
  ('Football', 'Rooftop Turf', 80),
  ('Badminton', 'Synthetic', 40)
) AS t(sport_name, surface, cap)
JOIN sports s ON lower(s.name) = lower(t.sport_name)
ON CONFLICT DO NOTHING;

-- Ground 48: Jawaharlal Nehru Stadium Turf Ground
WITH inserted_ground AS (
  INSERT INTO grounds (
    name, description, address, city, state,
    latitude, longitude, contact_phone, contact_email,
    amenities, images, is_active, owner_user_id
  ) VALUES (
    'Jawaharlal Nehru Stadium Turf Ground', 'The epicenter of Kerala football, providing first-class natural grass turf, international LED floodlights, and player dugouts.', 'Stadium Rd, Kaloor', 'Kochi', 'Kerala',
    9.9984, 76.3005, '+91 9846011223', 'kaloor@keralasports.org',
    '["International Floodlights","Seating Gallery","Locker Room","Parking","Shower Facility"]'::jsonb, '[]'::jsonb, true,
    (SELECT id FROM users WHERE email = 'admin@playsphere.local' LIMIT 1)
  )
  RETURNING id
)
INSERT INTO ground_sports (ground_id, sport_id, surface_type, capacity)
SELECT inserted_ground.id, s.id, t.surface, t.cap
FROM inserted_ground
CROSS JOIN (VALUES
  ('Football', 'Natural Grass', 1000),
  ('Cricket', 'Turf Pitch', 600)
) AS t(sport_name, surface, cap)
JOIN sports s ON lower(s.name) = lower(t.sport_name)
ON CONFLICT DO NOTHING;

-- Ground 49: United Sports Centre Kakkanad
WITH inserted_ground AS (
  INSERT INTO grounds (
    name, description, address, city, state,
    latitude, longitude, contact_phone, contact_email,
    amenities, images, is_active, owner_user_id
  ) VALUES (
    'United Sports Centre Kakkanad', 'Premier sports destination right by Infopark Kochi featuring FIFA quality football turf and indoor wooden badminton courts.', 'Seaport - Airport Rd, Kakkanad', 'Kochi', 'Kerala',
    10.0152, 76.3418, '+91 9846022334', 'kakkanad@unitedsports.in',
    '["Floodlights","Changing Rooms","Cafeteria","Parking","Wi-Fi"]'::jsonb, '[]'::jsonb, true,
    (SELECT id FROM users WHERE email = 'admin@playsphere.local' LIMIT 1)
  )
  RETURNING id
)
INSERT INTO ground_sports (ground_id, sport_id, surface_type, capacity)
SELECT inserted_ground.id, s.id, t.surface, t.cap
FROM inserted_ground
CROSS JOIN (VALUES
  ('Football', 'FIFA Artificial Turf', 90),
  ('Badminton', 'Wooden Floor', 40)
) AS t(sport_name, surface, cap)
JOIN sports s ON lower(s.name) = lower(t.sport_name)
ON CONFLICT DO NOTHING;

-- Ground 50: Decathlon Kalamassery Sports Arena
WITH inserted_ground AS (
  INSERT INTO grounds (
    name, description, address, city, state,
    latitude, longitude, contact_phone, contact_email,
    amenities, images, is_active, owner_user_id
  ) VALUES (
    'Decathlon Kalamassery Sports Arena', 'Sprawling outdoor activity zone featuring basketball courts, volleyball sand courts, and full artificial football pitches.', 'NH 47, Kalamassery', 'Kochi', 'Kerala',
    10.0521, 76.3195, '+91 9846033445', 'kalamassery@decathlon.in',
    '["Parking","Washrooms","Pro Shop","First Aid","Water Cooler"]'::jsonb, '[]'::jsonb, true,
    (SELECT id FROM users WHERE email = 'admin@playsphere.local' LIMIT 1)
  )
  RETURNING id
)
INSERT INTO ground_sports (ground_id, sport_id, surface_type, capacity)
SELECT inserted_ground.id, s.id, t.surface, t.cap
FROM inserted_ground
CROSS JOIN (VALUES
  ('Football', 'Artificial Turf', 80),
  ('Basketball', 'Acrylic Court', 50),
  ('Volleyball', 'Synthetic', 40)
) AS t(sport_name, surface, cap)
JOIN sports s ON lower(s.name) = lower(t.sport_name)
ON CONFLICT DO NOTHING;

-- Ground 51: Champions Turf Panampilly Nagar
WITH inserted_ground AS (
  INSERT INTO grounds (
    name, description, address, city, state,
    latitude, longitude, contact_phone, contact_email,
    amenities, images, is_active, owner_user_id
  ) VALUES (
    'Champions Turf Panampilly Nagar', 'Centrally situated enclosed turf arena in upscale Panampilly Nagar, ideal for fast 5-a-side matches and corporate matches.', 'Main Ave, Panampilly Nagar', 'Kochi', 'Kerala',
    9.9612, 76.2941, '+91 9846044556', 'panampilly@championsturf.com',
    '["Floodlights","Changing Rooms","Parking","Water Cooler"]'::jsonb, '[]'::jsonb, true,
    (SELECT id FROM users WHERE email = 'admin@playsphere.local' LIMIT 1)
  )
  RETURNING id
)
INSERT INTO ground_sports (ground_id, sport_id, surface_type, capacity)
SELECT inserted_ground.id, s.id, t.surface, t.cap
FROM inserted_ground
CROSS JOIN (VALUES
  ('Football', 'Artificial Turf', 70),
  ('Cricket', 'Box Cricket', 50)
) AS t(sport_name, surface, cap)
JOIN sports s ON lower(s.name) = lower(t.sport_name)
ON CONFLICT DO NOTHING;

-- Ground 52: Sardar Patel Sports Complex
WITH inserted_ground AS (
  INSERT INTO grounds (
    name, description, address, city, state,
    latitude, longitude, contact_phone, contact_email,
    amenities, images, is_active, owner_user_id
  ) VALUES (
    'Sardar Patel Sports Complex', 'Comprehensive sporting complex offering championship clay cricket pitches, outdoor basketball courts, and indoor badminton mats.', 'Stadium Rd, Navrangpura', 'Ahmedabad', 'Gujarat',
    23.0418, 72.5621, '+91 9825011223', 'navrangpura@gujaratsports.in',
    '["Floodlights","Seating Gallery","Parking","Shower Facility","Cafeteria"]'::jsonb, '[]'::jsonb, true,
    (SELECT id FROM users WHERE email = 'admin@playsphere.local' LIMIT 1)
  )
  RETURNING id
)
INSERT INTO ground_sports (ground_id, sport_id, surface_type, capacity)
SELECT inserted_ground.id, s.id, t.surface, t.cap
FROM inserted_ground
CROSS JOIN (VALUES
  ('Cricket', 'Clay Turf Pitch', 600),
  ('Basketball', 'Hard Court', 100),
  ('Badminton', 'BWF Mat', 60)
) AS t(sport_name, surface, cap)
JOIN sports s ON lower(s.name) = lower(t.sport_name)
ON CONFLICT DO NOTHING;

-- Ground 53: The Arena by TransStadia
WITH inserted_ground AS (
  INSERT INTO grounds (
    name, description, address, city, state,
    latitude, longitude, contact_phone, contact_email,
    amenities, images, is_active, owner_user_id
  ) VALUES (
    'The Arena by TransStadia', 'World-class convertible stadium arena in Kankaria Lake precinct hosting football fixtures and indoor volleyball championships.', 'Kankaria Lake, Maninagar', 'Ahmedabad', 'Gujarat',
    22.9981, 72.6025, '+91 9825022334', 'kankaria@transstadia.com',
    '["Air Conditioning","Locker Room","Cafeteria","Multi-tier Parking","Seating Gallery"]'::jsonb, '[]'::jsonb, true,
    (SELECT id FROM users WHERE email = 'admin@playsphere.local' LIMIT 1)
  )
  RETURNING id
)
INSERT INTO ground_sports (ground_id, sport_id, surface_type, capacity)
SELECT inserted_ground.id, s.id, t.surface, t.cap
FROM inserted_ground
CROSS JOIN (VALUES
  ('Football', 'FIFA Artificial Turf', 500),
  ('Volleyball', 'Indoor Synthetic', 200)
) AS t(sport_name, surface, cap)
JOIN sports s ON lower(s.name) = lower(t.sport_name)
ON CONFLICT DO NOTHING;

-- Ground 54: Ahmedabad Football Turf Bopal
WITH inserted_ground AS (
  INSERT INTO grounds (
    name, description, address, city, state,
    latitude, longitude, contact_phone, contact_email,
    amenities, images, is_active, owner_user_id
  ) VALUES (
    'Ahmedabad Football Turf Bopal', 'Well-maintained multi-court turf facility in West Ahmedabad with premium LED lighting and spectator lounge.', 'South Bopal Main Rd, Bopal', 'Ahmedabad', 'Gujarat',
    23.0234, 72.4691, '+91 9825033445', 'bopal@ahmedabadturf.in',
    '["Floodlights","Parking","Changing Rooms","Water Cooler"]'::jsonb, '[]'::jsonb, true,
    (SELECT id FROM users WHERE email = 'admin@playsphere.local' LIMIT 1)
  )
  RETURNING id
)
INSERT INTO ground_sports (ground_id, sport_id, surface_type, capacity)
SELECT inserted_ground.id, s.id, t.surface, t.cap
FROM inserted_ground
CROSS JOIN (VALUES
  ('Football', 'Artificial Turf', 80),
  ('Cricket', 'Box Cricket', 60)
) AS t(sport_name, surface, cap)
JOIN sports s ON lower(s.name) = lower(t.sport_name)
ON CONFLICT DO NOTHING;

-- Ground 55: Chandigarh Sports Club Arena
WITH inserted_ground AS (
  INSERT INTO grounds (
    name, description, address, city, state,
    latitude, longitude, contact_phone, contact_email,
    amenities, images, is_active, owner_user_id
  ) VALUES (
    'Chandigarh Sports Club Arena', 'Green lush athletic club with top-tier badminton courts, football pitches, and cricket training nets.', 'Sector 42, Attawa', 'Chandigarh', 'Punjab',
    30.7241, 76.7482, '+91 9814011223', 'sector42@chandigarhsports.in',
    '["Floodlights","Changing Rooms","Water Cooler","Parking","Cafeteria"]'::jsonb, '[]'::jsonb, true,
    (SELECT id FROM users WHERE email = 'admin@playsphere.local' LIMIT 1)
  )
  RETURNING id
)
INSERT INTO ground_sports (ground_id, sport_id, surface_type, capacity)
SELECT inserted_ground.id, s.id, t.surface, t.cap
FROM inserted_ground
CROSS JOIN (VALUES
  ('Football', 'Natural Grass', 300),
  ('Badminton', 'Wooden Court', 60),
  ('Cricket', 'Turf Pitch', 200)
) AS t(sport_name, surface, cap)
JOIN sports s ON lower(s.name) = lower(t.sport_name)
ON CONFLICT DO NOTHING;

-- Ground 56: Panchkula Golf & Sports Turf
WITH inserted_ground AS (
  INSERT INTO grounds (
    name, description, address, city, state,
    latitude, longitude, contact_phone, contact_email,
    amenities, images, is_active, owner_user_id
  ) VALUES (
    'Panchkula Golf & Sports Turf', 'Serene sports arena nestled near the Shivalik foothills offering turf football and competitive box cricket.', 'Sector 3, Panchkula', 'Panchkula', 'Haryana',
    30.6941, 76.8612, '+91 9814022334', 'panchkula@sportsturf.in',
    '["Floodlights","Parking","Cafeteria","Washrooms"]'::jsonb, '[]'::jsonb, true,
    (SELECT id FROM users WHERE email = 'admin@playsphere.local' LIMIT 1)
  )
  RETURNING id
)
INSERT INTO ground_sports (ground_id, sport_id, surface_type, capacity)
SELECT inserted_ground.id, s.id, t.surface, t.cap
FROM inserted_ground
CROSS JOIN (VALUES
  ('Football', 'Artificial Turf', 70),
  ('Cricket', 'Box Cricket', 50)
) AS t(sport_name, surface, cap)
JOIN sports s ON lower(s.name) = lower(t.sport_name)
ON CONFLICT DO NOTHING;

-- Ground 57: Goa United Sports Arena Margao
WITH inserted_ground AS (
  INSERT INTO grounds (
    name, description, address, city, state,
    latitude, longitude, contact_phone, contact_email,
    amenities, images, is_active, owner_user_id
  ) VALUES (
    'Goa United Sports Arena Margao', 'Iconic coastal sporting facility in South Goa featuring tournament-ready football turf and natural sand volleyball courts.', 'Fatorda, Margao', 'Margao', 'Goa',
    15.2891, 73.9682, '+91 9823011223', 'fatorda@goaunited.in',
    '["Floodlights","Parking","Beach Showers","Cafeteria","First Aid"]'::jsonb, '[]'::jsonb, true,
    (SELECT id FROM users WHERE email = 'admin@playsphere.local' LIMIT 1)
  )
  RETURNING id
)
INSERT INTO ground_sports (ground_id, sport_id, surface_type, capacity)
SELECT inserted_ground.id, s.id, t.surface, t.cap
FROM inserted_ground
CROSS JOIN (VALUES
  ('Football', 'FIFA Artificial Turf', 200),
  ('Volleyball', 'Beach Sand Court', 60)
) AS t(sport_name, surface, cap)
JOIN sports s ON lower(s.name) = lower(t.sport_name)
ON CONFLICT DO NOTHING;

-- Ground 58: Panaji Miramar Sports Turf
WITH inserted_ground AS (
  INSERT INTO grounds (
    name, description, address, city, state,
    latitude, longitude, contact_phone, contact_email,
    amenities, images, is_active, owner_user_id
  ) VALUES (
    'Panaji Miramar Sports Turf', 'Picturesque beachside turf in North Goa, loved by local football clubs and weekend sports travelers.', 'Miramar Beach Rd, Panaji', 'Panaji', 'Goa',
    15.4812, 73.8123, '+91 9823022334', 'miramar@goaturf.in',
    '["Floodlights","Parking","Water Cooler","Washrooms"]'::jsonb, '[]'::jsonb, true,
    (SELECT id FROM users WHERE email = 'admin@playsphere.local' LIMIT 1)
  )
  RETURNING id
)
INSERT INTO ground_sports (ground_id, sport_id, surface_type, capacity)
SELECT inserted_ground.id, s.id, t.surface, t.cap
FROM inserted_ground
CROSS JOIN (VALUES
  ('Football', 'Artificial Turf', 80),
  ('Volleyball', 'Sand Court', 50)
) AS t(sport_name, surface, cap)
JOIN sports s ON lower(s.name) = lower(t.sport_name)
ON CONFLICT DO NOTHING;

-- Ground 59: Jaipur Sports Arena Mansarovar
WITH inserted_ground AS (
  INSERT INTO grounds (
    name, description, address, city, state,
    latitude, longitude, contact_phone, contact_email,
    amenities, images, is_active, owner_user_id
  ) VALUES (
    'Jaipur Sports Arena Mansarovar', 'Rajasthan capital’s top recreational hub with floodlit turf pitches, cricket nets, and indoor badminton courts.', 'Madhyam Marg, Mansarovar', 'Jaipur', 'Rajasthan',
    26.8521, 75.7682, '+91 9829011223', 'mansarovar@jaipursports.in',
    '["Floodlights","Parking","Locker Room","Water Cooler","Cafeteria"]'::jsonb, '[]'::jsonb, true,
    (SELECT id FROM users WHERE email = 'admin@playsphere.local' LIMIT 1)
  )
  RETURNING id
)
INSERT INTO ground_sports (ground_id, sport_id, surface_type, capacity)
SELECT inserted_ground.id, s.id, t.surface, t.cap
FROM inserted_ground
CROSS JOIN (VALUES
  ('Cricket', 'Turf Pitch', 200),
  ('Football', 'Artificial Turf', 80),
  ('Badminton', 'Synthetic Mat', 40)
) AS t(sport_name, surface, cap)
JOIN sports s ON lower(s.name) = lower(t.sport_name)
ON CONFLICT DO NOTHING;

-- Ground 60: Lucknow Ekana Sports Hub
WITH inserted_ground AS (
  INSERT INTO grounds (
    name, description, address, city, state,
    latitude, longitude, contact_phone, contact_email,
    amenities, images, is_active, owner_user_id
  ) VALUES (
    'Lucknow Ekana Sports Hub', 'Modern sports facility adjacent to the international stadium with all-weather football turf and indoor basketball arena.', 'Amar Shaheed Path, Gomti Nagar Extension', 'Lucknow', 'Uttar Pradesh',
    26.7931, 81.0142, '+91 9839011223', 'ekana@lucknowsports.in',
    '["Floodlights","Seating Gallery","Parking","Cafeteria","Shower Facility"]'::jsonb, '[]'::jsonb, true,
    (SELECT id FROM users WHERE email = 'admin@playsphere.local' LIMIT 1)
  )
  RETURNING id
)
INSERT INTO ground_sports (ground_id, sport_id, surface_type, capacity)
SELECT inserted_ground.id, s.id, t.surface, t.cap
FROM inserted_ground
CROSS JOIN (VALUES
  ('Football', 'Artificial Turf', 150),
  ('Basketball', 'Hard Court', 80)
) AS t(sport_name, surface, cap)
JOIN sports s ON lower(s.name) = lower(t.sport_name)
ON CONFLICT DO NOTHING;

-- Ground 61: Indore Velocity Sports Complex
WITH inserted_ground AS (
  INSERT INTO grounds (
    name, description, address, city, state,
    latitude, longitude, contact_phone, contact_email,
    amenities, images, is_active, owner_user_id
  ) VALUES (
    'Indore Velocity Sports Complex', 'High-energy sports arena in Indore featuring floodlit cricket turf and tournament-grade indoor badminton courts.', 'Ring Rd, Scheme No 54, Vijay Nagar', 'Indore', 'Madhya Pradesh',
    22.7534, 75.8941, '+91 9826011223', 'vijaynagar@velocitysports.in',
    '["Floodlights","Changing Rooms","Washrooms","Parking","First Aid"]'::jsonb, '[]'::jsonb, true,
    (SELECT id FROM users WHERE email = 'admin@playsphere.local' LIMIT 1)
  )
  RETURNING id
)
INSERT INTO ground_sports (ground_id, sport_id, surface_type, capacity)
SELECT inserted_ground.id, s.id, t.surface, t.cap
FROM inserted_ground
CROSS JOIN (VALUES
  ('Cricket', 'Box Cricket Turf', 80),
  ('Badminton', 'Wooden Court', 40),
  ('Football', '5-a-side Turf', 60)
) AS t(sport_name, surface, cap)
JOIN sports s ON lower(s.name) = lower(t.sport_name)
ON CONFLICT DO NOTHING;

-- Ground 62: Bhubaneswar Kalinga Sports Enclave
WITH inserted_ground AS (
  INSERT INTO grounds (
    name, description, address, city, state,
    latitude, longitude, contact_phone, contact_email,
    amenities, images, is_active, owner_user_id
  ) VALUES (
    'Bhubaneswar Kalinga Sports Enclave', 'Renowned sports capital venue with world-class hockey, football turf, and cushioned volleyball courts.', 'Bidyut Marg, Nayapalli', 'Bhubaneswar', 'Odisha',
    20.3012, 85.8214, '+91 9861011223', 'kalinga@odishasports.gov.in',
    '["International Floodlights","Locker Room","Parking","Cafeteria","First Aid"]'::jsonb, '[]'::jsonb, true,
    (SELECT id FROM users WHERE email = 'admin@playsphere.local' LIMIT 1)
  )
  RETURNING id
)
INSERT INTO ground_sports (ground_id, sport_id, surface_type, capacity)
SELECT inserted_ground.id, s.id, t.surface, t.cap
FROM inserted_ground
CROSS JOIN (VALUES
  ('Football', 'Natural Grass', 500),
  ('Volleyball', 'Synthetic', 150)
) AS t(sport_name, surface, cap)
JOIN sports s ON lower(s.name) = lower(t.sport_name)
ON CONFLICT DO NOTHING;

-- Ground 63: Vizag Sea View Sports Turf
WITH inserted_ground AS (
  INSERT INTO grounds (
    name, description, address, city, state,
    latitude, longitude, contact_phone, contact_email,
    amenities, images, is_active, owner_user_id
  ) VALUES (
    'Vizag Sea View Sports Turf', 'Scenic hilltop sports arena overlooking the Bay of Bengal, providing 7-a-side football turf and box cricket.', 'Beach Rd, Rushikonda', 'Visakhapatnam', 'Andhra Pradesh',
    17.7812, 83.3821, '+91 9848011223', 'rushikonda@vizagturf.in',
    '["Floodlights","Sea View Deck","Parking","Washrooms","Cafeteria"]'::jsonb, '[]'::jsonb, true,
    (SELECT id FROM users WHERE email = 'admin@playsphere.local' LIMIT 1)
  )
  RETURNING id
)
INSERT INTO ground_sports (ground_id, sport_id, surface_type, capacity)
SELECT inserted_ground.id, s.id, t.surface, t.cap
FROM inserted_ground
CROSS JOIN (VALUES
  ('Football', 'Artificial Turf', 90),
  ('Cricket', 'Box Cricket', 60)
) AS t(sport_name, surface, cap)
JOIN sports s ON lower(s.name) = lower(t.sport_name)
ON CONFLICT DO NOTHING;

-- Fill empty ground image galleries with local sport-themed demo artwork.
-- Existing venue photos are kept intact when this seed is re-run.
UPDATE grounds AS ground
SET images = COALESCE(
  (
    SELECT jsonb_agg(sport_images.image_url)
    FROM (
      SELECT DISTINCT CASE sport.slug
        WHEN 'football' THEN '/images/demo/grounds/realistic/ground-football.jpg'
        WHEN 'cricket' THEN '/images/demo/grounds/realistic/ground-cricket.jpg'
        WHEN 'basketball' THEN '/images/demo/grounds/realistic/ground-basketball.jpg'
        WHEN 'volleyball' THEN '/images/demo/grounds/realistic/ground-volleyball.jpg'
        WHEN 'badminton' THEN '/images/demo/grounds/realistic/ground-badminton.jpg'
        ELSE '/images/demo/grounds/realistic/ground-multisport.jpg'
      END AS image_url
      FROM ground_sports AS ground_sport
      JOIN sports AS sport ON sport.id = ground_sport.sport_id
      WHERE ground_sport.ground_id = ground.id
      ORDER BY image_url
    ) AS sport_images
  ),
  '["/images/demo/grounds/realistic/ground-multisport.jpg"]'::jsonb
)
WHERE ground.images IS NULL OR ground.images = '[]'::jsonb;

COMMIT;
