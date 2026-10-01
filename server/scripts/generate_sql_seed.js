const fs = require('fs');
const path = require('path');
const { GROUNDS_DATA } = require('./seed_50_grounds');

let sql = '-- =============================================================================\n';
sql += '-- SEED 002: 50+ Real Grounds Across Major Sports Hubs\n';
sql += '-- =============================================================================\n\n';
sql += 'BEGIN;\n\n';

sql += '-- 1. Ensure Badminton exists\n';
sql += `INSERT INTO sports (name, slug, description, min_players_per_team, max_players_per_team)
VALUES ('Badminton', 'badminton', 'Badminton. Singles (1v1) or doubles (2v2).', 1, 2)
ON CONFLICT (name) DO NOTHING;\n\n`;

sql += '-- 2. Insert Grounds and Sports associations\n';

for (let i = 0; i < GROUNDS_DATA.length; i++) {
  const g = GROUNDS_DATA[i];
  const gName = g.name.replace(/'/g, "''");
  const gDesc = g.description.replace(/'/g, "''");
  const gAddr = g.address.replace(/'/g, "''");
  const gCity = g.city.replace(/'/g, "''");
  const gState = g.state ? g.state.replace(/'/g, "''") : '';
  const gPhone = g.contact_phone || '';
  const gEmail = g.contact_email || '';
  const gAmenities = JSON.stringify(g.amenities).replace(/'/g, "''");

  sql += `
-- Ground ${i + 1}: ${g.name}
WITH inserted_ground AS (
  INSERT INTO grounds (
    name, description, address, city, state,
    latitude, longitude, contact_phone, contact_email,
    amenities, images, is_active, owner_user_id
  ) VALUES (
    '${gName}', '${gDesc}', '${gAddr}', '${gCity}', '${gState}',
    ${g.latitude}, ${g.longitude}, '${gPhone}', '${gEmail}',
    '${gAmenities}'::jsonb, '[]'::jsonb, true,
    (SELECT id FROM users WHERE email = 'admin@playsphere.local' LIMIT 1)
  )
  RETURNING id
)
INSERT INTO ground_sports (ground_id, sport_id, surface_type, capacity)
SELECT inserted_ground.id, s.id, t.surface, t.cap
FROM inserted_ground
CROSS JOIN (VALUES\n`;

  const sportValues = g.sports.map(s => {
    const sName = s.name.replace(/'/g, "''");
    const sSurf = s.surface_type.replace(/'/g, "''");
    return `  ('${sName}', '${sSurf}', ${s.capacity})`;
  }).join(',\n');

  sql += sportValues + '\n) AS t(sport_name, surface, cap)\n';
  sql += 'JOIN sports s ON lower(s.name) = lower(t.sport_name)\n';
  sql += 'ON CONFLICT DO NOTHING;\n';
}

sql += '\nCOMMIT;\n';

const targetPath = path.resolve(__dirname, '../../database/seeds/002_grounds_seed.sql');
fs.writeFileSync(targetPath, sql);
console.log('Successfully generated', targetPath, 'Size:', fs.statSync(targetPath).size, 'bytes');
