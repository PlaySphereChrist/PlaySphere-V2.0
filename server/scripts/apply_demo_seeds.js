'use strict';

const fs = require('fs');
const path = require('path');
const { pool } = require('../src/config/database');
const statisticsService = require('../src/modules/stats/statistics.service');
const leaderboardsService = require('../src/modules/leaderboards/leaderboards.service');

const seedDirectory = path.join(__dirname, '../../database/seeds');
const seedFiles = [
  '004_demo_artwork_backfill.sql',
  '003_demo_teams_and_tournaments.sql',
  '005_demo_players_teams_registrations.sql',
  '006_demo_completed_tournaments.sql',
  '007_demo_tournament_expansion.sql'
];

async function applyDemoSeeds() {
  const target = await pool.query(
    'SELECT current_database() AS database, inet_server_addr()::text AS server_address'
  );
  const { database, server_address: serverAddress } = target.rows[0];
  const localAddresses = new Set(['::1/128', '::1', '127.0.0.1/32', '127.0.0.1']);

  if (database !== 'playsphere' || (serverAddress && !localAddresses.has(serverAddress))) {
    throw new Error(`Refusing to seed non-local database target (${database} at ${serverAddress})`);
  }

  for (const fileName of seedFiles) {
    const sql = fs.readFileSync(path.join(seedDirectory, fileName), 'utf8');
    await pool.query(sql);
    console.log(`Applied ${fileName}`);
  }

  // Materialize player/team records and fill the seeded leaderboard snapshots
  // through the same services used by the live tournament workflows.
  const organizerResult = await pool.query(
    "SELECT id FROM users WHERE email = 'organizer@playsphere.local'"
  );
  const organizer = { id: organizerResult.rows[0]?.id, roles: ['ORGANIZER'] };
  const pastTournaments = await pool.query(`
    SELECT id, name FROM tournaments
    WHERE organizer_user_id = $1
      AND name IN (
        'Bengaluru Football Legends Series',
        'Monsoon Cricket Invitational',
        'South Bengaluru Hoops Cup'
      )
    ORDER BY starts_at
  `, [organizer.id]);

  for (const tournament of pastTournaments.rows) {
    const statistics = await statisticsService.recalculateTournamentStatistics(tournament.id, organizer);
    const boards = await pool.query(
      'SELECT id FROM leaderboards WHERE tournament_id = $1 AND is_active = TRUE',
      [tournament.id]
    );
    for (const board of boards.rows) {
      await leaderboardsService.generateTournamentLeaderboard(board.id, organizer);
    }
    console.log(
      `Rebuilt ${tournament.name}: ${statistics.player_statistics_upserted} player stats, ` +
      `${statistics.team_statistics_upserted} team stats, ${boards.rowCount} leaderboards.`
    );
  }

  const summary = await pool.query(`
    SELECT
      (SELECT COUNT(*) FROM grounds WHERE images IS NOT NULL AND images <> '[]'::jsonb) AS grounds_with_images,
      (SELECT COUNT(*) FROM teams WHERE name LIKE 'Demo %') AS demo_teams,
      (SELECT COUNT(*) FROM users WHERE email LIKE 'demo.player.%@playsphere.local'
        OR email LIKE 'demo.extra.player.%@playsphere.local') AS demo_players,
      (SELECT COUNT(DISTINCT team.id) FROM teams team
       JOIN users organizer ON organizer.id = team.manager_user_id
       WHERE organizer.email = 'organizer@playsphere.local'
         AND team.name LIKE 'Demo %'
         AND EXISTS (SELECT 1 FROM team_members member
                     WHERE member.team_id = team.id AND member.is_active = TRUE)) AS organizer_rostered_demo_teams,
      (SELECT COUNT(*) FROM tournament_registrations AS registration
       JOIN teams AS team ON team.id = registration.team_id
       JOIN tournaments AS tournament ON tournament.id = registration.tournament_id
       WHERE team.name LIKE 'Demo %'
         AND tournament.name IN (
           'Bengaluru Football Cup', 'Weekend Cricket Open', 'City Hoops Challenge',
           'Spike City Volleyball Cup', 'Badminton Doubles Open',
           'Bengaluru Football Legends Series', 'Monsoon Cricket Invitational',
           'South Bengaluru Hoops Cup'
         )
         AND registration.status = 'approved') AS approved_demo_registrations,
      (SELECT COUNT(*) FROM tournaments WHERE name IN (
        'Bengaluru Football Cup', 'Weekend Cricket Open', 'City Hoops Challenge',
        'Spike City Volleyball Cup', 'Badminton Doubles Open'
      )) +
      (SELECT COUNT(*) FROM tournaments WHERE name IN (
        'Bengaluru Football Legends Series', 'Monsoon Cricket Invitational',
        'South Bengaluru Hoops Cup'
      )) AS demo_tournaments,
      (SELECT COUNT(*) FROM matches game_match
       JOIN tournaments tournament ON tournament.id = game_match.tournament_id
       WHERE tournament.name IN (
         'Bengaluru Football Legends Series', 'Monsoon Cricket Invitational',
         'South Bengaluru Hoops Cup'
       ) AND game_match.status = 'completed') AS completed_demo_matches
  `);
  console.log('Demo data summary:', summary.rows[0]);
}

applyDemoSeeds()
  .catch(error => {
    console.error('Demo seed failed:', error.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
