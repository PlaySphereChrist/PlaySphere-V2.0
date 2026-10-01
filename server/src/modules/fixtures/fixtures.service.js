'use strict';

const { randomUUID } = require('node:crypto');
const { pool, query } = require('../../config/database');
const { GROUND_TIME_ZONE } = require('../../utils/ground-time');
const tournamentsService = require('../tournaments/tournaments.service');
const { generateFixtures } = require('./fixture-generation');
const { calculateStandings } = require('./fixture-standings');
const sseService = require('../realtime/sse.service');

class FixturesService {
  _badRequest(message) { const error = new Error(message); error.statusCode = 400; return error; }
  _notFound(message) { const error = new Error(message); error.statusCode = 404; return error; }
  _forbidden(message) { const error = new Error(message); error.statusCode = 403; return error; }
  _conflict(message) { const error = new Error(message); error.statusCode = 409; return error; }

  async getTournamentFixtures(tournamentId, requestingUser) {
    await tournamentsService.getTournament(tournamentId, requestingUser);

    const result = await query(`
      SELECT
        f.id,
        f.tournament_id,
        f.stage,
        f.group_number,
        f.round_number,
        f.round_name,
        f.match_number,
        f.bracket_position,
        f.ground_id,
        ground.name AS ground_name,
        f.scheduled_at,
        f.scheduled_end_at,
        f.status,
        f.notes,
        f.home_registration_id,
        f.away_registration_id,
        f.winner_registration_id,
        CASE
          WHEN COALESCE(home.team_id, match_home.team_id) IS NOT NULL
            THEN COALESCE(home.registration_name, home_team.name, match_home.registration_name, match_home_team.name)
          WHEN COALESCE(home.individual_player_profile_id, match_home.individual_player_profile_id, home_match_participant.player_profile_id) IS NOT NULL
            THEN CASE WHEN COALESCE(home_player.is_public, match_home_player.is_public)
              THEN COALESCE(home_player.display_name, match_home_player.display_name)
              ELSE 'Private participant' END
          ELSE COALESCE(home.registration_name, match_home.registration_name)
        END AS home_registration_name,
        CASE
          WHEN COALESCE(away.team_id, match_away.team_id) IS NOT NULL
            THEN COALESCE(away.registration_name, away_team.name, match_away.registration_name, match_away_team.name)
          WHEN COALESCE(away.individual_player_profile_id, match_away.individual_player_profile_id, away_match_participant.player_profile_id) IS NOT NULL
            THEN CASE WHEN COALESCE(away_player.is_public, match_away_player.is_public)
              THEN COALESCE(away_player.display_name, match_away_player.display_name)
              ELSE 'Private participant' END
          ELSE COALESCE(away.registration_name, match_away.registration_name)
        END AS away_registration_name,
        COALESCE(home.team_id, match_home.team_id) AS home_team_id,
        COALESCE(away.team_id, match_away.team_id) AS away_team_id,
        COALESCE(home_team.name, match_home_team.name) AS home_team_name,
        COALESCE(away_team.name, match_away_team.name) AS away_team_name,
        CASE WHEN home_player.is_public THEN home_player.display_name ELSE 'Private participant' END AS home_player_name,
        CASE WHEN away_player.is_public THEN away_player.display_name ELSE 'Private participant' END AS away_player_name,
        m.id AS match_id,
        m.status AS match_status,
        m.winner_registration_id AS match_winner_registration_id,
        home_match_participant.score AS home_score,
        home_match_participant.result AS home_result,
        away_match_participant.score AS away_score,
        away_match_participant.result AS away_result,
        f.created_at,
        f.updated_at
      FROM fixtures f
      LEFT JOIN tournament_registrations home ON home.id = f.home_registration_id
      LEFT JOIN tournament_registrations away ON away.id = f.away_registration_id
      LEFT JOIN teams home_team ON home_team.id = home.team_id
      LEFT JOIN teams away_team ON away_team.id = away.team_id
      LEFT JOIN grounds ground ON ground.id = f.ground_id
      LEFT JOIN player_profiles home_player ON home_player.id = home.individual_player_profile_id
      LEFT JOIN player_profiles away_player ON away_player.id = away.individual_player_profile_id
      LEFT JOIN matches m ON m.fixture_id = f.id
      LEFT JOIN match_participants home_match_participant ON home_match_participant.match_id = m.id AND home_match_participant.side = 'home'
      LEFT JOIN match_participants away_match_participant ON away_match_participant.match_id = m.id AND away_match_participant.side = 'away'
      LEFT JOIN tournament_registrations match_home ON match_home.id = home_match_participant.registration_id
      LEFT JOIN tournament_registrations match_away ON match_away.id = away_match_participant.registration_id
      LEFT JOIN teams match_home_team ON match_home_team.id = COALESCE(match_home.team_id, home_match_participant.team_id)
      LEFT JOIN teams match_away_team ON match_away_team.id = COALESCE(match_away.team_id, away_match_participant.team_id)
      LEFT JOIN player_profiles match_home_player ON match_home_player.id = COALESCE(match_home.individual_player_profile_id, home_match_participant.player_profile_id)
      LEFT JOIN player_profiles match_away_player ON match_away_player.id = COALESCE(match_away.individual_player_profile_id, away_match_participant.player_profile_id)
      WHERE f.tournament_id = $1
      ORDER BY f.round_number ASC, f.stage ASC, f.group_number ASC NULLS FIRST,
               f.match_number ASC, f.bracket_position ASC
    `, [tournamentId]);

    return result.rows;
  }

  async updateFixtureSchedule(tournamentId, fixtureId, schedule = {}, requestingUser) {
    const isAdmin = requestingUser?.roles?.includes('ADMIN');
    if (!requestingUser?.id || (!isAdmin && !requestingUser?.roles?.includes('ORGANIZER'))) {
      throw this._forbidden('Only the organizer or an admin can schedule fixtures');
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const tournamentResult = await client.query(
        'SELECT * FROM tournaments WHERE id = $1 FOR UPDATE',
        [tournamentId]
      );
      if (!tournamentResult.rows.length) throw this._notFound('Tournament not found');
      const tournament = tournamentResult.rows[0];
      const canSchedule = isAdmin || tournament.organizer_user_id === requestingUser.id || tournament.co_organizer_user_id === requestingUser.id;
      if (!canSchedule) {
        throw this._forbidden('Only the tournament organizer, co-organizer, or an admin can schedule fixtures');
      }
      if (!['registration_closed', 'in_progress'].includes(tournament.status)) {
        throw this._badRequest('Close registration before scheduling fixtures');
      }

      const fixtureResult = await client.query(
        'SELECT * FROM fixtures WHERE id = $1 AND tournament_id = $2 FOR UPDATE',
        [fixtureId, tournamentId]
      );
      if (!fixtureResult.rows.length) throw this._notFound('Fixture not found');
      const fixture = fixtureResult.rows[0];
      if (!['scheduled', 'postponed'].includes(fixture.status)) {
        throw this._badRequest('Only a scheduled or postponed fixture can be rescheduled');
      }
      if (!fixture.home_registration_id || !fixture.away_registration_id) {
        throw this._badRequest('Both participants must be known before this fixture can be scheduled');
      }

      const existingMatchResult = await client.query(
        'SELECT id, status FROM matches WHERE fixture_id = $1 LIMIT 1 FOR UPDATE',
        [fixtureId]
      );
      const match = existingMatchResult.rows[0] || null;
      if (match && match.status !== 'scheduled') {
        throw this._badRequest('Only an unstarted match can be rescheduled');
      }

      const startValue = schedule.scheduled_at === undefined ? fixture.scheduled_at : schedule.scheduled_at;
      const endValue = schedule.scheduled_end_at === undefined ? fixture.scheduled_end_at : schedule.scheduled_end_at;
      const startAt = startValue === null || startValue === '' ? null : new Date(startValue);
      const endAt = endValue === null || endValue === '' ? null : new Date(endValue);
      if (startAt && !Number.isFinite(startAt.getTime())) throw this._badRequest('scheduled_at must be a valid date and time');
      if (endAt && !Number.isFinite(endAt.getTime())) throw this._badRequest('scheduled_end_at must be a valid date and time');
      if (startAt && !endAt) throw this._badRequest('Set an end time so schedule overlaps can be checked');
      if (endAt && (!startAt || endAt <= startAt)) {
        throw this._badRequest('scheduled_end_at must be later than scheduled_at');
      }

      const groundId = schedule.ground_id === undefined ? fixture.ground_id : (schedule.ground_id || null);
      if (groundId) {
        const groundResult = await client.query(`
          SELECT ground.id
          FROM grounds ground
          JOIN ground_sports supported ON supported.ground_id = ground.id AND supported.sport_id = $2
          WHERE ground.id = $1 AND ground.is_active = TRUE
          FOR UPDATE OF ground
        `, [groundId, tournament.sport_id]);
        if (!groundResult.rows.length) {
          throw this._badRequest('Choose an active ground that supports this tournament sport');
        }
      }

      if (startAt) {
        const registrations = await client.query(`
          SELECT team_id, individual_player_profile_id
          FROM tournament_registrations
          WHERE id = ANY($1)
        `, [[fixture.home_registration_id, fixture.away_registration_id].filter(Boolean)]);
        const teamIds = [...new Set(registrations.rows.map(row => row.team_id).filter(Boolean))];
        const playerIds = [...new Set(registrations.rows.map(row => row.individual_player_profile_id).filter(Boolean))];
        if (teamIds.length) {
          await client.query('SELECT id FROM teams WHERE id = ANY($1) ORDER BY id FOR UPDATE', [teamIds]);
        }
        if (playerIds.length) {
          await client.query('SELECT id FROM player_profiles WHERE id = ANY($1) ORDER BY id FOR UPDATE', [playerIds]);
        }
        const conflict = await client.query(`
          SELECT f.id, (f.ground_id = $4::uuid) AS same_ground
          FROM fixtures f
          LEFT JOIN tournament_registrations other_home ON other_home.id = f.home_registration_id
          LEFT JOIN tournament_registrations other_away ON other_away.id = f.away_registration_id
          WHERE f.id <> $1
            AND f.status IN ('scheduled', 'in_progress', 'postponed')
            AND f.scheduled_at IS NOT NULL
            AND (
              ($4::uuid IS NOT NULL AND f.ground_id = $4::uuid)
              OR other_home.team_id = ANY($5::uuid[])
              OR other_away.team_id = ANY($5::uuid[])
              OR other_home.individual_player_profile_id = ANY($6::uuid[])
              OR other_away.individual_player_profile_id = ANY($6::uuid[])
            )
            AND (
              ($3::timestamptz IS NOT NULL AND f.scheduled_end_at IS NOT NULL
                AND f.scheduled_at < $3::timestamptz AND f.scheduled_end_at > $2::timestamptz)
              OR (f.scheduled_end_at IS NULL AND f.scheduled_at >= $2::timestamptz
                AND ($3::timestamptz IS NULL OR f.scheduled_at < $3::timestamptz))
              OR ($3::timestamptz IS NULL AND f.scheduled_end_at IS NOT NULL
                AND f.scheduled_at <= $2::timestamptz AND f.scheduled_end_at > $2::timestamptz)
            )
          LIMIT 1
        `, [fixtureId, startAt, endAt, groundId, teamIds, playerIds]);
        if (conflict.rows[0]) {
          throw this._conflict(conflict.rows[0].same_ground
            ? 'This ground is already assigned to an overlapping fixture'
            : 'A participant is already scheduled for an overlapping fixture');
        }

        if (groundId) {
          const bookingConflict = await client.query(`
            SELECT booking.id
            FROM ground_bookings booking
            JOIN ground_booking_slots slot ON slot.id = booking.slot_id
            WHERE booking.ground_id = $1
              AND booking.status IN ('pending', 'confirmed')
              AND (
                ($3::timestamptz IS NOT NULL
                  AND (slot.slot_date + slot.start_time) AT TIME ZONE '${GROUND_TIME_ZONE}' < $3::timestamptz
                  AND (slot.slot_date + slot.end_time) AT TIME ZONE '${GROUND_TIME_ZONE}' > $2::timestamptz)
                OR ($3::timestamptz IS NULL
                  AND (slot.slot_date + slot.start_time) AT TIME ZONE '${GROUND_TIME_ZONE}' <= $2::timestamptz
                  AND (slot.slot_date + slot.end_time) AT TIME ZONE '${GROUND_TIME_ZONE}' > $2::timestamptz)
              )
            LIMIT 1
            FOR UPDATE OF booking
          `, [groundId, startAt, endAt]);
          if (bookingConflict.rows.length) {
            throw this._conflict('This ground already has a confirmed or pending booking during that time');
          }
        }
      }

      const updateResult = await client.query(`
        UPDATE fixtures
        SET ground_id = $2, scheduled_at = $3, scheduled_end_at = $4, updated_at = NOW()
        WHERE id = $1
        RETURNING *
      `, [fixtureId, groundId, startAt, endAt]);
      if (match) {
        await client.query(`
          UPDATE matches
          SET ground_id = $2, scheduled_at = $3, scheduled_end_at = $4, updated_at = NOW()
          WHERE id = $1
        `, [match.id, groundId, startAt, endAt]);
      }
      await client.query(`
        INSERT INTO audit_logs (
          actor_user_id, actor_role, action, entity_type, entity_id,
          previous_state, new_state, metadata
        ) VALUES ($1, $2, 'fixture.schedule_updated', 'fixture', $3, $4::jsonb, $5::jsonb, $6::jsonb)
      `, [
        requestingUser.id,
        requestingUser.roles?.[0] || null,
        fixtureId,
        JSON.stringify({ ground_id: fixture.ground_id, scheduled_at: fixture.scheduled_at, scheduled_end_at: fixture.scheduled_end_at }),
        JSON.stringify({ ground_id: groundId, scheduled_at: startAt, scheduled_end_at: endAt }),
        JSON.stringify({ tournament_id: tournamentId, match_id: match?.id || null })
      ]);

      await client.query('COMMIT');
      return updateResult.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async getTournamentStandings(tournamentId, requestingUser) {
    await tournamentsService.getTournament(tournamentId, requestingUser);
    const registrationResult = await query(`
      SELECT DISTINCT
        f.group_number,
        registration.id AS registration_id,
        COALESCE(registration.registration_name, team.name, player.display_name, registration.id::text) AS name
      FROM fixtures f
      JOIN tournament_registrations registration
        ON registration.id = f.home_registration_id OR registration.id = f.away_registration_id
      LEFT JOIN teams team ON team.id = registration.team_id
      LEFT JOIN player_profiles player ON player.id = registration.individual_player_profile_id
      WHERE f.tournament_id = $1 AND f.stage IN ('group', 'league', 'round_robin')
      ORDER BY f.group_number NULLS FIRST, name ASC
    `, [tournamentId]);
    const results = await query(`
      SELECT
        f.group_number,
        f.home_registration_id,
        f.away_registration_id,
        home_participant.result AS home_result,
        away_participant.result AS away_result,
        home_participant.score AS home_score,
        away_participant.score AS away_score,
        COALESCE(home.registration_name, home_team.name, home_player.display_name) AS home_name,
        COALESCE(away.registration_name, away_team.name, away_player.display_name) AS away_name
      FROM fixtures f
      JOIN matches m ON m.fixture_id = f.id AND m.status = 'completed'
      JOIN match_participants home_participant ON home_participant.match_id = m.id AND home_participant.side = 'home'
      JOIN match_participants away_participant ON away_participant.match_id = m.id AND away_participant.side = 'away'
      JOIN tournament_registrations home ON home.id = f.home_registration_id
      JOIN tournament_registrations away ON away.id = f.away_registration_id
      LEFT JOIN teams home_team ON home_team.id = home.team_id
      LEFT JOIN teams away_team ON away_team.id = away.team_id
      LEFT JOIN player_profiles home_player ON home_player.id = home.individual_player_profile_id
      LEFT JOIN player_profiles away_player ON away_player.id = away.individual_player_profile_id
      WHERE f.tournament_id = $1 AND f.stage IN ('group', 'league', 'round_robin')
      ORDER BY f.group_number NULLS FIRST, f.round_number, f.match_number
    `, [tournamentId]);

    return calculateStandings(results.rows, registrationResult.rows);
  }

  async generateTournamentFixtures(tournamentId, options, requestingUser) {
    const isAdmin = requestingUser?.roles?.includes('ADMIN');
    if (!requestingUser?.id || (!isAdmin && !requestingUser?.roles?.includes('ORGANIZER'))) {
      throw this._forbidden('Only the organizer or an admin can generate fixtures');
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const tournamentResult = await client.query(
        'SELECT * FROM tournaments WHERE id = $1 FOR UPDATE',
        [tournamentId]
      );
      if (!tournamentResult.rows.length) throw this._notFound('Tournament not found');
      const tournament = tournamentResult.rows[0];

      if (!isAdmin && tournament.organizer_user_id !== requestingUser.id) {
        throw this._forbidden('Only the tournament organizer or an admin can generate fixtures');
      }
      if (tournament.status !== 'registration_closed') {
        throw this._badRequest('Close tournament registration before generating fixtures');
      }

      const existing = await client.query(
        'SELECT id FROM fixtures WHERE tournament_id = $1 LIMIT 1',
        [tournamentId]
      );
      if (existing.rows.length) throw this._conflict('Fixtures already exist for this tournament');

      const registrationResult = await client.query(`
        SELECT id, registered_at
        FROM tournament_registrations
        WHERE tournament_id = $1 AND status = 'approved'
        ORDER BY registered_at ASC, id ASC
        FOR SHARE
      `, [tournamentId]);
      let registrations = registrationResult.rows;

      const minimumEntries = Math.max(2, Number(tournament.min_teams || 2));
      if (registrations.length < minimumEntries) {
        throw this._badRequest(`At least ${minimumEntries} approved registrations are required`);
      }
      if (tournament.max_teams && registrations.length > Number(tournament.max_teams)) {
        throw this._badRequest('Approved registrations exceed the tournament capacity');
      }

      if (options.seed_order_registration_ids !== undefined) {
        const seedOrder = options.seed_order_registration_ids;
        if (!Array.isArray(seedOrder) || seedOrder.length !== registrations.length ||
            new Set(seedOrder).size !== seedOrder.length ||
            seedOrder.some(id => !registrations.some(registration => registration.id === id))) {
          throw this._badRequest('seed_order_registration_ids must contain every approved registration exactly once');
        }
        const registrationById = new Map(registrations.map(registration => [registration.id, registration]));
        registrations = seedOrder.map(id => registrationById.get(id));
      }

      const generated = generateFixtures({
        format: tournament.format,
        registrations,
        groupSize: 4
      });
      if (!generated.length) throw this._badRequest('This tournament format does not produce any fixtures');

      const fixtureIdByKey = new Map(generated.map(fixture => [fixture.key, randomUUID()]));
      for (const fixture of generated) {
        await client.query(`
          INSERT INTO fixtures (
            id, tournament_id, stage, group_number, round_number, round_name,
            match_number, bracket_position, ground_id, scheduled_at, status,
            notes, home_registration_id, away_registration_id, winner_registration_id
          ) VALUES (
            $1, $2, $3::tournament_fixture_stage_type, $4, $5, $6,
            $7, $8, NULL, NULL, $9, NULL, $10, $11, $12
          )
        `, [
          fixtureIdByKey.get(fixture.key),
          tournamentId,
          fixture.stage,
          fixture.group_number,
          fixture.round_number,
          fixture.round_name,
          fixture.match_number,
          fixture.bracket_position,
          fixture.status,
          fixture.home_registration_id,
          fixture.away_registration_id,
          fixture.winner_registration_id
        ]);
      }

      for (const fixture of generated) {
        if (!fixture.winner_next_fixture_key && !fixture.loser_next_fixture_key) continue;
        await client.query(`
          UPDATE fixtures
          SET winner_next_fixture_id = $2,
              winner_next_side = $3,
              loser_next_fixture_id = $4,
              loser_next_side = $5,
              updated_at = NOW()
          WHERE id = $1
        `, [
          fixtureIdByKey.get(fixture.key),
          fixture.winner_next_fixture_key ? fixtureIdByKey.get(fixture.winner_next_fixture_key) : null,
          fixture.winner_next_side || null,
          fixture.loser_next_fixture_key ? fixtureIdByKey.get(fixture.loser_next_fixture_key) : null,
          fixture.loser_next_side || null
        ]);
      }

      const matchableFixtures = generated.filter(fixture =>
        fixture.status === 'scheduled' && fixture.home_registration_id && fixture.away_registration_id
      );
      for (const fixture of matchableFixtures) {
        await this._createMatchForFixture(client, tournament, fixtureIdByKey.get(fixture.key), fixture, requestingUser.id);
      }

      const persisted = await client.query(`
        SELECT COUNT(*)::INT AS fixture_count,
               COUNT(*) FILTER (WHERE status = 'bye')::INT AS bye_count
        FROM fixtures
        WHERE tournament_id = $1
      `, [tournamentId]);
      await client.query(`
        INSERT INTO audit_logs (actor_user_id, actor_role, action, entity_type, entity_id, new_state, metadata)
        VALUES ($1, $2, 'tournament.fixtures_generated', 'tournament', $3, $4::jsonb, $5::jsonb)
      `, [
        requestingUser.id,
        requestingUser.roles?.[0] || null,
        tournamentId,
        JSON.stringify({ status: 'registration_closed', format: tournament.format }),
        JSON.stringify({
          fixture_count: persisted.rows[0].fixture_count,
          bye_count: persisted.rows[0].bye_count,
          match_count: matchableFixtures.length
        })
      ]);
      await client.query('COMMIT');
      sseService.broadcastTournament(tournamentId, 'fixtures_generated', {
        tournamentId,
        fixture_count: persisted.rows[0].fixture_count
      });
      return {
        fixture_count: persisted.rows[0].fixture_count,
        bye_count: persisted.rows[0].bye_count,
        match_count: matchableFixtures.length,
        format: tournament.format
      };
    } catch (error) {
      await client.query('ROLLBACK');
      if (error.message?.startsWith('Fixture generation for ')) {
        throw this._badRequest(error.message);
      }
      throw error;
    } finally {
      client.release();
    }
  }

  async _createMatchForFixture(client, tournament, fixtureId, fixture, recordedByUserId) {
    const matchResult = await client.query(`
      INSERT INTO matches (
        fixture_id, tournament_id, sport_id, ground_id, scheduled_at, scheduled_end_at,
        status, recorded_by_user_id
      ) VALUES ($1, $2, $3, $4, $5, $6, 'scheduled', $7)
      RETURNING id
    `, [
      fixtureId,
      tournament.id,
      tournament.sport_id,
      fixture.ground_id || null,
      fixture.scheduled_at || null,
      fixture.scheduled_end_at || null,
      recordedByUserId
    ]);
    const matchId = matchResult.rows[0].id;

    await client.query(`
      INSERT INTO match_participants (match_id, registration_id, team_id, player_profile_id, side)
      SELECT $1, registration.id, registration.team_id,
             registration.individual_player_profile_id, participant.side
      FROM (VALUES ($2::uuid, 'home'::varchar), ($3::uuid, 'away'::varchar)) participant(registration_id, side)
      JOIN tournament_registrations registration ON registration.id = participant.registration_id
    `, [matchId, fixture.home_registration_id, fixture.away_registration_id]);
    return matchId;
  }
}

module.exports = new FixturesService();
