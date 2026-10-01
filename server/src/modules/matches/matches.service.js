'use strict';

const { pool, query } = require('../../config/database');
const tournamentsService = require('../tournaments/tournaments.service');
const { seededPositions } = require('../fixtures/fixture-generation');
const { calculateStandings } = require('../fixtures/fixture-standings');
const sseService = require('../realtime/sse.service');

class MatchesService {

  _notFound(msg)   { const e = new Error(msg); e.statusCode = 404; return e; }
  _badRequest(msg) { const e = new Error(msg); e.statusCode = 400; return e; }
  _forbidden(msg)  { const e = new Error(msg); e.statusCode = 403; return e; }
  _conflict(msg)   { const e = new Error(msg); e.statusCode = 409; return e; }

  async _lockMatchAggregate(client, matchId) {
    const initialResult = await client.query('SELECT * FROM matches WHERE id = $1', [matchId]);
    if (!initialResult.rows.length) throw this._notFound('Match not found');
    const initialMatch = initialResult.rows[0];

    if (initialMatch.tournament_id) {
      await client.query('SELECT id FROM tournaments WHERE id = $1 FOR UPDATE', [initialMatch.tournament_id]);
      if (initialMatch.fixture_id) {
        await client.query('SELECT id FROM fixtures WHERE id = $1 FOR UPDATE', [initialMatch.fixture_id]);
      }
    }

    const matchResult = await client.query('SELECT * FROM matches WHERE id = $1 FOR UPDATE', [matchId]);
    if (!matchResult.rows.length) throw this._notFound('Match not found');
    return matchResult.rows[0];
  }

  async _createMatchForFixture(client, tournamentId, fixture) {
    const tournamentResult = await client.query(
      'SELECT sport_id, organizer_user_id FROM tournaments WHERE id = $1',
      [tournamentId]
    );
    if (!tournamentResult.rows.length) throw this._notFound('Tournament not found');
    const tournament = tournamentResult.rows[0];
    const matchResult = await client.query(`
      INSERT INTO matches (
        fixture_id, tournament_id, sport_id, ground_id, scheduled_at, scheduled_end_at,
        status, recorded_by_user_id
      ) VALUES ($1, $2, $3, $4, $5, $6, 'scheduled', $7)
      ON CONFLICT DO NOTHING
      RETURNING id
    `, [
      fixture.id,
      tournamentId,
      tournament.sport_id,
      fixture.ground_id || null,
      fixture.scheduled_at || null,
      fixture.scheduled_end_at || null,
      tournament.organizer_user_id
    ]);
    if (!matchResult.rows[0]) return null;

    await client.query(`
      INSERT INTO match_participants (match_id, registration_id, team_id, player_profile_id, side)
      SELECT $1, registration.id, registration.team_id,
             registration.individual_player_profile_id, participant.side
      FROM (VALUES ($2::uuid, 'home'::varchar), ($3::uuid, 'away'::varchar)) participant(registration_id, side)
      JOIN tournament_registrations registration ON registration.id = participant.registration_id
    `, [matchResult.rows[0].id, fixture.home_registration_id, fixture.away_registration_id]);
    return matchResult.rows[0].id;
  }

  async _advanceWinner(client, fixture, winnerRegistrationId) {
    if (!fixture.winner_next_fixture_id || !fixture.winner_next_side) return;
    await this._advanceFixtureSlot(
      client,
      fixture.winner_next_fixture_id,
      fixture.winner_next_side,
      winnerRegistrationId
    );
  }

  async _advanceLoser(client, fixture, loserRegistrationId) {
    if (!fixture.loser_next_fixture_id || !fixture.loser_next_side) return;
    await this._advanceFixtureSlot(
      client,
      fixture.loser_next_fixture_id,
      fixture.loser_next_side,
      loserRegistrationId
    );
  }

  async _advanceFixtureSlot(client, nextFixtureId, nextSide, registrationId) {
    const targetResult = await client.query(
      'SELECT * FROM fixtures WHERE id = $1 FOR UPDATE',
      [nextFixtureId]
    );
    if (!targetResult.rows.length) throw this._conflict('The next bracket fixture no longer exists');
    let target = targetResult.rows[0];
    const column = nextSide === 'home' ? 'home_registration_id' : 'away_registration_id';
    const currentRegistration = target[column];
    if (currentRegistration && currentRegistration !== registrationId) {
      throw this._conflict('The next bracket slot is already assigned to another registration');
    }

    await client.query(`UPDATE fixtures SET ${column} = $2, updated_at = NOW() WHERE id = $1`, [
      target.id,
      registrationId
    ]);
    target = { ...target, [column]: registrationId };
    const homeId = target.home_registration_id;
    const awayId = target.away_registration_id;

    if (homeId && awayId) {
      await client.query(
        "UPDATE fixtures SET status = 'scheduled', winner_registration_id = NULL, updated_at = NOW() WHERE id = $1 AND status = 'bye'",
        [target.id]
      );
      const existingMatch = await client.query(
        'SELECT id FROM matches WHERE fixture_id = $1 LIMIT 1 FOR UPDATE',
        [target.id]
      );
      if (!existingMatch.rows.length) {
        await this._createMatchForFixture(client, target.tournament_id, target);
      }
      return;
    }

    const oppositeSide = nextSide === 'home' ? 'away' : 'home';
    const pendingFeeder = await client.query(`
      SELECT id FROM fixtures
      WHERE ((winner_next_fixture_id = $1 AND winner_next_side = $2)
          OR (loser_next_fixture_id = $1 AND loser_next_side = $2))
        AND status NOT IN ('completed', 'bye', 'cancelled')
      LIMIT 1
    `, [target.id, oppositeSide]);

    if (!pendingFeeder.rows.length) {
      const automaticWinner = homeId || awayId;
      await client.query(`
        UPDATE fixtures
        SET status = 'bye', winner_registration_id = $2, updated_at = NOW()
        WHERE id = $1
      `, [target.id, automaticWinner]);
      await this._advanceWinner(client, target, automaticWinner);
    }
  }

  async _advanceCompletedGroupStage(client, tournamentId) {
    const pending = await client.query(`
      SELECT id FROM fixtures
      WHERE tournament_id = $1 AND stage = 'group' AND status <> 'completed'
      LIMIT 1
    `, [tournamentId]);
    if (pending.rows.length) return false;

    const groupResults = await client.query(`
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
      WHERE f.tournament_id = $1 AND f.stage = 'group'
      ORDER BY f.group_number, f.round_number, f.match_number
    `, [tournamentId]);

    const rankedGroups = calculateStandings(groupResults.rows);
    const runnerUpOrder = rankedGroups.length % 2 === 1
      ? [...rankedGroups].reverse()
      : rankedGroups;
    const qualifiers = [
      ...rankedGroups.map(group => group.standings[0]).filter(Boolean),
      ...runnerUpOrder.map(group => group.standings[1]).filter(Boolean)
    ];

    const firstKnockoutRound = await client.query(`
      SELECT f.*
      FROM fixtures f
      WHERE f.tournament_id = $1 AND f.stage = 'knockout'
        AND f.round_number = (
          SELECT MIN(first.round_number) FROM fixtures first
          WHERE first.tournament_id = $1 AND first.stage = 'knockout'
        )
      ORDER BY f.bracket_position ASC
      FOR UPDATE
    `, [tournamentId]);
    if (!firstKnockoutRound.rows.length) throw this._conflict('Knockout fixtures are missing after group stage');

    const bracketSize = firstKnockoutRound.rows.length * 2;
    const seedSlots = seededPositions(bracketSize);
    const qualifierBySeed = new Map(qualifiers.map((qualifier, index) => [index + 1, qualifier.registration_id]));
    for (const fixture of firstKnockoutRound.rows) {
      const homeSeed = seedSlots[(fixture.bracket_position - 1) * 2];
      const awaySeed = seedSlots[(fixture.bracket_position - 1) * 2 + 1];
      const homeId = qualifierBySeed.get(homeSeed) || null;
      const awayId = qualifierBySeed.get(awaySeed) || null;
      const winnerId = homeId && !awayId ? homeId : (!homeId && awayId ? awayId : null);
      const status = winnerId ? 'bye' : 'scheduled';
      await client.query(`
        UPDATE fixtures
        SET home_registration_id = $2,
            away_registration_id = $3,
            status = $4,
            winner_registration_id = $5,
            updated_at = NOW()
        WHERE id = $1
      `, [fixture.id, homeId, awayId, status, winnerId]);

      if (homeId && awayId) {
        await this._createMatchForFixture(client, tournamentId, {
          ...fixture,
          home_registration_id: homeId,
          away_registration_id: awayId
        });
      } else if (winnerId) {
        await this._advanceWinner(client, fixture, winnerId);
      }
    }
    return true;
  }

  async _refreshTournamentStatistics(tournamentId, requestingUser) {
    try {
      const statisticsService = require('../stats/statistics.service');
      const leaderboardsService = require('../leaderboards/leaderboards.service');
      await statisticsService.recalculateTournamentStatistics(tournamentId, requestingUser);
      const boards = await query('SELECT id FROM leaderboards WHERE tournament_id = $1 AND is_active = TRUE', [tournamentId]);
      await Promise.all(boards.rows.map(board =>
        leaderboardsService.generateTournamentLeaderboard(board.id, requestingUser)
      ));
    } catch (error) {
      console.error('[MatchesService] Derived tournament data refresh failed:', error.message);
    }
  }

  // ---------------------------------------------------------------------------
  // HELPER: Post a community event_announcement about a match lifecycle event
  // Fire-and-forget — a failure here must not block the match operation.
  // ---------------------------------------------------------------------------
  async _postMatchAnnouncement(match, eventType, requestingUserId, extra = {}) {
    try {
      const commRes = await query(
        `SELECT id FROM communities WHERE tournament_id = $1 AND is_active = TRUE LIMIT 1`,
        [match.tournament_id]
      );
      if (!commRes.rows[0]) return; // No community — skip silently

      const communityId = commRes.rows[0].id;

      // Check if requester is a community member, auto-join organizer if needed
      const memberCheck = await query(
        'SELECT id FROM community_members WHERE community_id = $1 AND user_id = $2',
        [communityId, requestingUserId]
      );
      if (!memberCheck.rows[0]) {
        await query(
          `INSERT INTO community_members (community_id, user_id, role) VALUES ($1, $2, 'member') ON CONFLICT DO NOTHING`,
          [communityId, requestingUserId]
        );
      }

      // Build announcement body
      let title, body;
      if (eventType === 'scheduled') {
        const roundInfo = extra.round_name ? `${extra.round_name} ` : '';
        const when = match.scheduled_at ? ` on ${new Date(match.scheduled_at).toLocaleString()}` : '';
        title = `Match Scheduled — ${roundInfo}#${extra.match_number || ''}`;
        body = `A match has been scheduled${when}.${extra.notes ? `\n\nNotes: ${extra.notes}` : ''}`;
      } else if (eventType === 'started') {
        title = `Match Started! 🏆`;
        body = `The match has kicked off!${extra.round_name ? ` (${extra.round_name})` : ''}`;
      } else if (eventType === 'completed') {
        title = `Match Result — ${extra.round_name || 'Result Posted'}`;
        const summary = extra.result_summary ? JSON.stringify(extra.result_summary) : 'See match details for the full result.';
        body = `The match has concluded.\n\nResult: ${summary}`;
      } else if (eventType === 'cancelled') {
        title = `Match Cancelled`;
        body = `A match has been cancelled.${extra.notes ? `\n\nReason: ${extra.notes}` : ''}`;
      } else {
        return;
      }

      await query(
        `INSERT INTO posts (community_id, author_user_id, title, body, category)
         VALUES ($1, $2, $3, $4, 'event_announcement'::post_category_type)`,
        [communityId, requestingUserId, title, body]
      );
    } catch (err) {
      // Non-fatal: log but don't bubble up
      console.error('[MatchesService] Community announcement failed:', err.message);
    }
  }

  // ---------------------------------------------------------------------------
  // GET /api/tournaments/:tournamentId/matches
  // Requires visibility access (delegates to tournamentsService.getTournament)
  // ---------------------------------------------------------------------------
  async getTournamentMatches(tournamentId, requestingUser) {
    await tournamentsService.getTournament(tournamentId, requestingUser);

    const res = await query(`
      SELECT
        m.id,
        m.fixture_id,
        m.tournament_id,
        m.sport_id,
        m.ground_id,
        m.scheduled_at,
        m.started_at,
        m.ended_at,
        m.status,
        m.result_summary,
        m.winner_registration_id,
        m.notes,
        m.created_at,
        m.updated_at,
        f.round_number,
        f.round_name,
        f.match_number
      FROM matches m
      LEFT JOIN fixtures f ON m.fixture_id = f.id
      WHERE m.tournament_id = $1
      ORDER BY f.round_number ASC NULLS LAST, f.match_number ASC NULLS LAST, m.scheduled_at ASC NULLS LAST
    `, [tournamentId]);

    return res.rows;
  }

  // ---------------------------------------------------------------------------
  // GET /api/matches/:matchId
  // Delegates visibility to tournamentsService for tournament matches
  // ---------------------------------------------------------------------------
  async getMatch(matchId, requestingUser) {
    const res = await query(`
      SELECT
        m.*,
        f.round_number,
        f.round_name,
        f.match_number
      FROM matches m
      LEFT JOIN fixtures f ON m.fixture_id = f.id
      WHERE m.id = $1
    `, [matchId]);

    if (!res.rows.length) {
      throw this._notFound('Match not found');
    }

    const match = res.rows[0];

    // Enforce tournament visibility rules for tournament matches
    if (match.tournament_id) {
      await tournamentsService.getTournament(match.tournament_id, requestingUser);
    } else if (!requestingUser) {
      // Casual game match details remain available only to authenticated users.
      throw this._notFound('Match not found');
    }

    return match;
  }

  // ---------------------------------------------------------------------------
  // GET /api/matches/:matchId/participants
  // ---------------------------------------------------------------------------
  async getMatchParticipants(matchId, requestingUser) {
    await this.getMatch(matchId, requestingUser);

    const res = await query(`
      SELECT
        mp.id,
        mp.match_id,
        mp.registration_id,
        mp.team_id,
        CASE WHEN pp.is_public THEN mp.player_profile_id ELSE NULL END AS player_profile_id,
        mp.side,
        mp.score,
        mp.result,
        mp.created_at,
        t.name   AS team_name,
        CASE WHEN pp.is_public THEN pp.display_name ELSE 'Private participant' END AS display_name,
        CASE
          WHEN tr.team_id IS NOT NULL THEN tr.registration_name
          WHEN pp.is_public THEN pp.display_name
          ELSE 'Private participant'
        END AS registration_name,
        CASE
          WHEN tr.team_id IS NOT NULL THEN COALESCE(roster.players, '[]'::json)
          ELSE '[]'::json
        END AS players
      FROM match_participants mp
      LEFT JOIN teams t                    ON mp.team_id          = t.id
      LEFT JOIN player_profiles pp         ON mp.player_profile_id = pp.id
      LEFT JOIN tournament_registrations tr ON mp.registration_id  = tr.id
      LEFT JOIN LATERAL (
        SELECT json_agg(json_build_object(
          'player_profile_id', profile.id,
          'display_name', profile.display_name,
          'jersey_number', registration_player.jersey_number,
          'is_captain', registration_player.is_captain
        ) ORDER BY registration_player.is_captain DESC, profile.display_name ASC) AS players
        FROM tournament_registration_players registration_player
        JOIN player_profiles profile
          ON profile.id = registration_player.player_profile_id
         AND profile.is_public = true
        WHERE registration_player.registration_id = mp.registration_id
      ) roster ON tr.team_id IS NOT NULL
      WHERE mp.match_id = $1
      ORDER BY mp.side ASC
    `, [matchId]);

    return res.rows;
  }

  // ---------------------------------------------------------------------------
  // POST /api/tournaments/:tournamentId/matches/from-fixture/:fixtureId
  // Organizer (own tournament) or Admin only.
  // Validates: tournament owned, fixture belongs to tournament, no duplicate
  // match, participants are approved registrations from the same tournament.
  // Uses a single DB transaction.
  // ---------------------------------------------------------------------------
  async createMatchFromFixture(tournamentId, fixtureId, data = {}, requestingUser) {
    // 1. Tournament visibility + ownership check
    const tournament = await tournamentsService.getTournament(tournamentId, requestingUser);

    const isAdmin       = requestingUser?.roles?.includes('ADMIN');
    const isOwnOrganizer = requestingUser?.id === tournament.organizer_user_id || requestingUser?.id === tournament.co_organizer_user_id;

    if (!isAdmin && !isOwnOrganizer) {
      throw this._forbidden('Only the organizer, co-organizer, or an admin can create official matches');
    }

    if (data.participants !== undefined && !Array.isArray(data.participants)) {
      throw this._badRequest('participants must be an array');
    }

    // 3. Transactional write
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 3a. Verify fixture exists, belongs to this tournament, acquire row lock
      const fixRes = await client.query(
        'SELECT * FROM fixtures WHERE id = $1 FOR UPDATE',
        [fixtureId]
      );
      if (!fixRes.rows.length) {
        throw this._notFound('Fixture not found');
      }
      const fixture = fixRes.rows[0];
      if (fixture.tournament_id !== tournamentId) {
        throw this._badRequest('Fixture does not belong to the specified tournament');
      }
      if (fixture.status !== 'scheduled') {
        throw this._badRequest('Only a scheduled fixture can receive a match');
      }

      const participants = data.participants || [
        { registration_id: fixture.home_registration_id, side: 'home' },
        { registration_id: fixture.away_registration_id, side: 'away' }
      ];
      if (participants.length !== 2 || participants.some(participant => !participant.registration_id)) {
        throw this._badRequest('A fixture match needs exactly two assigned participants');
      }
      const regIds = participants.map(participant => participant.registration_id);
      if (new Set(regIds).size !== 2) throw this._badRequest('Duplicate registrations provided for participants');
      const sides = participants.map(participant => participant.side);
      if (new Set(sides).size !== 2 || !sides.includes('home') || !sides.includes('away')) {
        throw this._badRequest('One participant must be home and the other away');
      }

      // 3b. Prevent duplicate match for the same fixture
      const dupCheck = await client.query(
        'SELECT id FROM matches WHERE fixture_id = $1',
        [fixtureId]
      );
      if (dupCheck.rows.length > 0) {
        throw this._conflict('A match already exists for this fixture');
      }

      // 3c. Validate registrations — must all belong to this tournament, be approved
      const regRes = await client.query(`
        SELECT id, tournament_id, status, team_id, individual_player_profile_id
        FROM tournament_registrations
        WHERE id = ANY($1)
        FOR SHARE
      `, [regIds]);

      if (regRes.rows.length !== regIds.length) {
        throw this._badRequest('One or more registration_ids are invalid');
      }

      const registrationsMap = {};
      for (const reg of regRes.rows) {
        if (reg.tournament_id !== tournamentId) {
          throw this._badRequest(
            'Participant registration does not belong to this tournament'
          );
        }
        if (reg.status !== 'approved') {
          throw this._badRequest(
            `Registration ${reg.id} has status "${reg.status}"; only approved registrations may participate`
          );
        }
        registrationsMap[reg.id] = reg;
      }

      // 3d. Insert match record
      const matchRes = await client.query(`
        INSERT INTO matches (
          fixture_id,
          tournament_id,
          sport_id,
          ground_id,
          scheduled_at,
          scheduled_end_at,
          status,
          recorded_by_user_id
        ) VALUES ($1, $2, $3, $4, $5, $6, 'scheduled', $7)
        RETURNING *
      `, [
        fixtureId,
        tournamentId,
        tournament.sport_id,
        fixture.ground_id   || null,
        fixture.scheduled_at || null,
        fixture.scheduled_end_at || null,
        requestingUser.id
      ]);

      const match = matchRes.rows[0];

      // 3e. Insert match_participants
      for (const p of participants) {
        const reg = registrationsMap[p.registration_id];
        await client.query(`
          INSERT INTO match_participants (
            match_id,
            registration_id,
            team_id,
            player_profile_id,
            side
          ) VALUES ($1, $2, $3, $4, $5)
        `, [
          match.id,
          reg.id,
          reg.team_id                      || null,
          reg.individual_player_profile_id || null,
          p.side
        ]);
      }

      await client.query(`
        UPDATE fixtures
        SET home_registration_id = $2,
            away_registration_id = $3,
            updated_at = NOW()
        WHERE id = $1
      `, [
        fixtureId,
        participants.find(participant => participant.side === 'home').registration_id,
        participants.find(participant => participant.side === 'away').registration_id
      ]);

      await client.query('COMMIT');
      // Fire-and-forget community announcement
      const fixtureInfo = fixRes.rows[0];
      this._postMatchAnnouncement(match, 'scheduled', requestingUser.id, {
        round_name: fixtureInfo.round_name,
        match_number: fixtureInfo.match_number,
        notes: match.notes
      });
      return match;

    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  // ---------------------------------------------------------------------------
  // HELPER: Verify match authorization
  // ---------------------------------------------------------------------------
  async _verifyMatchAuthorization(match, requestingUser) {
    if (!match.tournament_id) {
      // For now, only tournament matches are supported. Casual games would be checked here.
      throw this._badRequest('Only tournament matches are currently supported for lifecycle events');
    }

    const tournament = await tournamentsService.getTournament(match.tournament_id, requestingUser);

    const isAdmin = requestingUser?.roles?.includes('ADMIN');
    const isOwnOrganizer = requestingUser?.id === tournament.organizer_user_id || requestingUser?.id === tournament.co_organizer_user_id;

    if (!isAdmin && !isOwnOrganizer) {
      throw this._forbidden('Only the organizer, co-organizer, or an admin can modify this match');
    }
    return tournament;
  }

  // ---------------------------------------------------------------------------
  // POST /api/matches/:matchId/start
  // SCHEDULED -> in_progress
  // ---------------------------------------------------------------------------
  async startMatch(matchId, requestingUser) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const match = await this._lockMatchAggregate(client, matchId);

      const tournament = await this._verifyMatchAuthorization(match, requestingUser);

      if (tournament.status !== 'in_progress') {
        throw this._badRequest('Start the tournament before starting its matches');
      }

      if (match.status !== 'scheduled') {
        throw this._badRequest(`Cannot start match from status "${match.status}"`);
      }

      if (match.fixture_id) {
        const fixtureResult = await client.query('SELECT * FROM fixtures WHERE id = $1', [match.fixture_id]);
        const fixture = fixtureResult.rows[0];
        if (!fixture || fixture.status !== 'scheduled') {
          throw this._badRequest('Only a scheduled fixture can be started');
        }
        if (!fixture.home_registration_id || !fixture.away_registration_id) {
          throw this._badRequest('Both fixture participants must be assigned before starting');
        }
        const participants = await client.query('SELECT id FROM match_participants WHERE match_id = $1', [matchId]);
        if (participants.rows.length !== 2) {
          throw this._badRequest('A tournament match must have exactly two participants');
        }
      }

      const updateRes = await client.query(`
        UPDATE matches
        SET status = 'in_progress', started_at = NOW(), updated_at = NOW()
        WHERE id = $1
        RETURNING *
      `, [matchId]);

      if (match.fixture_id) {
        await client.query(
          "UPDATE fixtures SET status = 'in_progress', updated_at = NOW() WHERE id = $1",
          [match.fixture_id]
        );
      }

      await client.query('COMMIT');
      const startedMatch = updateRes.rows[0];
      this._postMatchAnnouncement(startedMatch, 'started', requestingUser.id, {});
      sseService.broadcastTournament(startedMatch.tournament_id, 'match_started', {
        matchId,
        tournamentId: startedMatch.tournament_id,
        fixtureId: match.fixture_id,
        status: 'in_progress'
      });
      sseService.broadcastMatch(matchId, 'match_started', {
        matchId,
        tournamentId: startedMatch.tournament_id,
        status: 'in_progress'
      });
      return startedMatch;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  // ---------------------------------------------------------------------------
  // POST /api/matches/:matchId/complete
  // in_progress -> completed
  // ---------------------------------------------------------------------------
  async completeMatch(matchId, data = {}, requestingUser) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const match = await this._lockMatchAggregate(client, matchId);

      const tournament = await this._verifyMatchAuthorization(match, requestingUser);

      if (tournament.status !== 'in_progress') {
        throw this._badRequest('Only an in-progress tournament can have a match result recorded');
      }

      if (match.status !== 'in_progress') {
        throw this._badRequest(`Cannot complete match from status "${match.status}"`);
      }

      if (!match.fixture_id) throw this._badRequest('Only fixture-linked tournament matches can be completed');
      const fixtureResult = await client.query('SELECT * FROM fixtures WHERE id = $1', [match.fixture_id]);
      const fixture = fixtureResult.rows[0];
      if (!fixture || fixture.status !== 'in_progress') {
        throw this._badRequest('The linked fixture is not in progress');
      }

      const participantResult = await client.query(`
        SELECT id, registration_id, side, score, result
        FROM match_participants
        WHERE match_id = $1
        ORDER BY side
        FOR UPDATE
      `, [matchId]);
      const participants = participantResult.rows;
      if (participants.length !== 2 || participants.some(participant => !participant.registration_id)) {
        throw this._badRequest('A tournament match must have exactly two registered participants');
      }

      if (!Array.isArray(data.participants) || data.participants.length !== 2) {
        throw this._badRequest('Submit a result and score for both match participants');
      }
      const submittedByRegistration = new Map();
      for (const submission of data.participants) {
        if (!submission.registration_id || submittedByRegistration.has(submission.registration_id)) {
          throw this._badRequest('Each match participant must be submitted exactly once');
        }
        if (!['win', 'loss', 'draw'].includes(submission.result)) {
          throw this._badRequest('Each participant result must be win, loss, or draw');
        }
        if (submission.score !== undefined && submission.score !== null) {
          const score = Number(submission.score.numeric);
          if (!Number.isFinite(score) || score < 0) throw this._badRequest('Scores must be non-negative numbers');
        }
        submittedByRegistration.set(submission.registration_id, submission);
      }
      if (participants.some(participant => !submittedByRegistration.has(participant.registration_id))) {
        throw this._badRequest('Submitted results must match both match participants');
      }

      for (const participant of participants) {
        const submission = submittedByRegistration.get(participant.registration_id);
        await client.query(`
          UPDATE match_participants
          SET score = $1, result = $2, updated_at = NOW()
          WHERE id = $3
        `, [
          submission.score === undefined || submission.score === null ? null : JSON.stringify(submission.score),
          submission.result,
          participant.id
        ]);
      }

      const results = participants.map(participant => ({
        registration_id: participant.registration_id,
        side: participant.side,
        ...submittedByRegistration.get(participant.registration_id)
      }));
      const wins = results.filter(participant => participant.result === 'win');
      const draws = results.filter(participant => participant.result === 'draw');
      const resultScores = results.map(participant => Number(participant.score?.numeric));
      const isTableStage = ['group', 'league', 'round_robin'].includes(fixture.stage);
      if (resultScores.some(score => !Number.isFinite(score) || score < 0)) {
        throw this._badRequest('Each official result needs a non-negative numeric score');
      }
      if (draws.length === 2) {
        if (!isTableStage || wins.length !== 0 || results[0].result !== 'draw' || results[1].result !== 'draw') {
          throw this._badRequest('Draws are only allowed in group and league fixtures');
        }
        if (isTableStage && resultScores[0] !== resultScores[1]) {
          throw this._badRequest('A drawn result requires equal scores');
        }
      } else if (wins.length !== 1 || results.filter(participant => participant.result === 'loss').length !== 1) {
        throw this._badRequest('A completed match needs one winner and one loser, or a valid draw');
      } else if (isTableStage && Number(results.find(participant => participant.result === 'win').score?.numeric) <=
                 Number(results.find(participant => participant.result === 'loss').score?.numeric)) {
        throw this._badRequest('The winner must have a higher score than the loser');
      }

      const winnerRegistrationId = wins.length ? wins[0].registration_id : null;
      if (data.winner_registration_id && data.winner_registration_id !== winnerRegistrationId) {
        throw this._badRequest('winner_registration_id must match the participant marked as the winner');
      }

      const updateMatchRes = await client.query(`
        UPDATE matches
        SET status = 'completed',
            ended_at = NOW(),
            result_summary = COALESCE($2, result_summary),
            winner_registration_id = $3,
            updated_at = NOW()
        WHERE id = $1
        RETURNING *
      `, [
        matchId,
        data.result_summary ? JSON.stringify(data.result_summary) : null,
        winnerRegistrationId
      ]);

      await client.query(`
        UPDATE fixtures
        SET status = 'completed', winner_registration_id = $2, updated_at = NOW()
        WHERE id = $1
      `, [fixture.id, winnerRegistrationId]);

      if (winnerRegistrationId) {
        if (fixture.stage === 'grand_final' && fixture.away_registration_id === winnerRegistrationId) {
          const resetResult = await client.query(`
            SELECT * FROM fixtures
            WHERE tournament_id = $1 AND stage = 'grand_final_reset'
            LIMIT 1
            FOR UPDATE
          `, [match.tournament_id]);
          if (!resetResult.rows.length) throw this._conflict('The required Grand Final reset fixture is missing');
          const resetFixture = resetResult.rows[0];
          await client.query(`
            UPDATE fixtures
            SET home_registration_id = $2,
                away_registration_id = $3,
                status = 'scheduled',
                winner_registration_id = NULL,
                updated_at = NOW()
            WHERE id = $1
          `, [resetFixture.id, fixture.away_registration_id, fixture.home_registration_id]);
          await this._createMatchForFixture(client, match.tournament_id, {
            ...resetFixture,
            home_registration_id: fixture.away_registration_id,
            away_registration_id: fixture.home_registration_id,
            status: 'scheduled'
          });
        } else if (fixture.stage !== 'grand_final') {
          await this._advanceWinner(client, fixture, winnerRegistrationId);
        }
      }
      if (fixture.stage === 'double_elimination_winners') {
        const loserRegistrationId = results.find(participant => participant.result === 'loss')?.registration_id;
        if (loserRegistrationId) await this._advanceLoser(client, fixture, loserRegistrationId);
      }
      if (fixture.stage === 'group') await this._advanceCompletedGroupStage(client, match.tournament_id);

      const remainingFixtures = await client.query(`
        SELECT id FROM fixtures
        WHERE tournament_id = $1 AND status NOT IN ('completed', 'bye', 'cancelled')
        LIMIT 1
      `, [match.tournament_id]);
      if (!remainingFixtures.rows.length) {
        const tournamentResult = await client.query(
          'SELECT status FROM tournaments WHERE id = $1 FOR UPDATE',
          [match.tournament_id]
        );
        if (tournamentResult.rows[0]?.status === 'in_progress') {
          await client.query(
            "UPDATE tournaments SET status = 'completed', updated_at = NOW() WHERE id = $1",
            [match.tournament_id]
          );
          await client.query(`
            INSERT INTO tournament_status_history (tournament_id, from_status, to_status, changed_by_user_id, reason)
            VALUES ($1, 'in_progress', 'completed', $2, 'All generated fixtures are complete')
          `, [match.tournament_id, requestingUser.id]);
        }
      }

      await client.query(`
        INSERT INTO audit_logs (
          actor_user_id, actor_role, action, entity_type, entity_id,
          previous_state, new_state, metadata
        ) VALUES ($1, $2, 'match.result_recorded', 'match', $3, $4::jsonb, $5::jsonb, $6::jsonb)
      `, [
        requestingUser.id,
        requestingUser.roles?.[0] || null,
        matchId,
        JSON.stringify({ status: match.status, result_summary: match.result_summary }),
        JSON.stringify({
          status: 'completed',
          winner_registration_id: winnerRegistrationId,
          participants: results.map(participant => ({
            registration_id: participant.registration_id,
            result: participant.result,
            score: participant.score
          }))
        }),
        JSON.stringify({ tournament_id: match.tournament_id, fixture_id: fixture.id, stage: fixture.stage })
      ]);

      await client.query('COMMIT');
      const completedMatch = updateMatchRes.rows[0];
      this._refreshTournamentStatistics(match.tournament_id, requestingUser);
      this._postMatchAnnouncement(completedMatch, 'completed', requestingUser.id, {
        result_summary: data.result_summary
      });
      sseService.broadcastTournament(match.tournament_id, 'match_completed', {
        matchId,
        tournamentId: match.tournament_id,
        fixtureId: fixture.id,
        winnerRegistrationId,
        status: 'completed'
      });
      sseService.broadcastMatch(matchId, 'match_completed', {
        matchId,
        tournamentId: match.tournament_id,
        winnerRegistrationId,
        status: 'completed'
      });
      return completedMatch;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  // ---------------------------------------------------------------------------
  // POST /api/matches/:matchId/cancel
  // scheduled -> cancelled
  // ---------------------------------------------------------------------------
  async cancelMatch(matchId, data = {}, requestingUser) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const match = await this._lockMatchAggregate(client, matchId);

      await this._verifyMatchAuthorization(match, requestingUser);

      if (match.status !== 'scheduled') {
        throw this._badRequest(`Cannot cancel match from status "${match.status}"`);
      }

      // Append cancellation reason to notes or just replace if null
      let newNotes = match.notes;
      if (data.reason) {
        newNotes = newNotes ? `${newNotes}\nCancellation reason: ${data.reason}` : `Cancellation reason: ${data.reason}`;
      }

      const updateRes = await client.query(`
        UPDATE matches
        SET status = 'cancelled', notes = $2, updated_at = NOW()
        WHERE id = $1
        RETURNING *
      `, [matchId, newNotes || null]);

      if (match.fixture_id) {
        await client.query(
          "UPDATE fixtures SET status = 'cancelled', notes = COALESCE($2, notes), updated_at = NOW() WHERE id = $1",
          [match.fixture_id, data.reason ? `Cancellation reason: ${data.reason}` : null]
        );
      }

      await client.query('COMMIT');
      const cancelledMatch = updateRes.rows[0];
      this._postMatchAnnouncement(cancelledMatch, 'cancelled', requestingUser.id, {
        notes: data.reason
      });
      sseService.broadcastTournament(match.tournament_id, 'match_cancelled', {
        matchId,
        tournamentId: match.tournament_id,
        fixtureId: match.fixture_id,
        reason: data.reason,
        status: 'cancelled'
      });
      sseService.broadcastMatch(matchId, 'match_cancelled', {
        matchId,
        tournamentId: match.tournament_id,
        reason: data.reason,
        status: 'cancelled'
      });
      return cancelledMatch;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  // ---------------------------------------------------------------------------
  // CAPTAIN SCORE REPORTING & CONFIRMATION WORKFLOW
  // ---------------------------------------------------------------------------
  async getMatchScoreReports(matchId, requestingUser) {
    await this.getMatch(matchId, requestingUser);
    const res = await query(`
      SELECT r.*,
             u.display_name AS submitted_by_name,
             t.name AS team_name,
             ru.display_name AS reviewed_by_name
      FROM match_score_reports r
      JOIN users u ON u.id = r.submitted_by_user_id
      LEFT JOIN teams t ON t.id = r.submitting_team_id
      LEFT JOIN users ru ON ru.id = r.reviewed_by_user_id
      WHERE r.match_id = $1
      ORDER BY r.created_at DESC
    `, [matchId]);
    return res.rows;
  }

  async _verifyCaptainOrOrganizer(matchId, requestingUser) {
    const match = await this.getMatch(matchId, requestingUser);
    const tournament = await tournamentsService.getTournament(match.tournament_id, requestingUser);
    const isOrganizerOrAdmin = requestingUser?.roles?.includes('ADMIN') || requestingUser?.id === tournament.organizer_user_id;

    const participants = await this.getMatchParticipants(matchId, requestingUser);
    const authorizedTeamIds = [];

    for (const p of participants) {
      if (p.team_id) {
        const isManager = await query('SELECT 1 FROM teams WHERE id = $1 AND manager_user_id = $2', [p.team_id, requestingUser.id]);
        if (isManager.rows.length) {
          authorizedTeamIds.push(p.team_id);
          continue;
        }
        const isCaptain = await query(`
          SELECT 1 FROM team_members tm
          JOIN player_profiles pp ON pp.id = tm.player_profile_id
          WHERE tm.team_id = $1 AND pp.user_id = $2 AND tm.role IN ('captain', 'vice_captain')
        `, [p.team_id, requestingUser.id]);
        if (isCaptain.rows.length) {
          authorizedTeamIds.push(p.team_id);
        }
      } else if (p.player_profile_id) {
        const isPlayer = await query('SELECT 1 FROM player_profiles WHERE id = $1 AND user_id = $2', [p.player_profile_id, requestingUser.id]);
        if (isPlayer.rows.length) {
          authorizedTeamIds.push(p.registration_id);
        }
      }
    }

    if (!isOrganizerOrAdmin && authorizedTeamIds.length === 0) {
      throw this._forbidden('You must be a team captain, participant, or the tournament organizer to perform this action');
    }

    return { match, tournament, isOrganizerOrAdmin, authorizedTeamIds, participants };
  }

  async submitMatchScoreReport(matchId, data, requestingUser) {
    const { match, isOrganizerOrAdmin, authorizedTeamIds } = await this._verifyCaptainOrOrganizer(matchId, requestingUser);

    if (match.status === 'completed') {
      throw this._badRequest('This match is already completed');
    }
    if (match.status === 'cancelled') {
      throw this._badRequest('Cannot report scores for a cancelled match');
    }

    const homeScore = Number(data.home_score);
    const awayScore = Number(data.away_score);
    if (isNaN(homeScore) || homeScore < 0 || isNaN(awayScore) || awayScore < 0) {
      throw this._badRequest('Valid non-negative home and away scores are required');
    }

    // Auto-start match if scheduled
    if (match.status === 'scheduled') {
      await query("UPDATE matches SET status = 'in_progress', started_at = NOW(), updated_at = NOW() WHERE id = $1", [matchId]);
      if (match.fixture_id) {
        await query("UPDATE fixtures SET status = 'in_progress', updated_at = NOW() WHERE id = $1", [match.fixture_id]);
      }
      sseService.broadcastTournament(match.tournament_id, 'match_started', { matchId, tournamentId: match.tournament_id });
      sseService.broadcastMatch(matchId, 'match_started', { matchId, tournamentId: match.tournament_id });
    }

    const teamId = authorizedTeamIds[0] || null;
    const res = await query(`
      INSERT INTO match_score_reports (
        match_id, tournament_id, submitted_by_user_id, submitting_team_id,
        home_score, away_score, status, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7)
      RETURNING *
    `, [
      matchId,
      match.tournament_id,
      requestingUser.id,
      teamId,
      homeScore,
      awayScore,
      data.notes || null
    ]);

    const report = res.rows[0];
    sseService.broadcastMatch(matchId, 'score_report_submitted', { matchId, report });
    sseService.broadcastTournament(match.tournament_id, 'score_report_submitted', { matchId, report });

    if (isOrganizerOrAdmin) {
      return await this.confirmMatchScoreReport(matchId, report.id, requestingUser);
    }

    return report;
  }

  async confirmMatchScoreReport(matchId, reportId, requestingUser) {
    const { match, isOrganizerOrAdmin, participants } = await this._verifyCaptainOrOrganizer(matchId, requestingUser);

    const reportRes = await query('SELECT * FROM match_score_reports WHERE id = $1 AND match_id = $2 FOR UPDATE', [reportId, matchId]);
    if (!reportRes.rows.length) throw this._notFound('Score report not found');
    const report = reportRes.rows[0];

    if (report.status !== 'pending') {
      throw this._badRequest(`Score report is already ${report.status}`);
    }

    if (!isOrganizerOrAdmin) {
      if (report.submitted_by_user_id === requestingUser.id) {
        throw this._forbidden('A score report must be confirmed by the opposing team captain or the tournament organizer');
      }
    }

    await query(`
      UPDATE match_score_reports
      SET status = 'confirmed', reviewed_by_user_id = $2, updated_at = NOW()
      WHERE id = $1
    `, [reportId, requestingUser.id]);

    const homePart = participants.find(p => p.side === 'home');
    const awayPart = participants.find(p => p.side === 'away');

    let homeResult = 'draw';
    let awayResult = 'draw';
    let winnerRegId = null;

    if (report.home_score > report.away_score) {
      homeResult = 'win';
      awayResult = 'loss';
      winnerRegId = homePart?.registration_id;
    } else if (report.away_score > report.home_score) {
      homeResult = 'loss';
      awayResult = 'win';
      winnerRegId = awayPart?.registration_id;
    }

    const payload = {
      participants: [
        { registration_id: homePart?.registration_id, score: { numeric: report.home_score }, result: homeResult },
        { registration_id: awayPart?.registration_id, score: { numeric: report.away_score }, result: awayResult }
      ],
      winner_registration_id: winnerRegId,
      result_summary: `${report.home_score} – ${report.away_score}`
    };

    const completedMatch = await this.completeMatch(matchId, payload, requestingUser);

    sseService.broadcastMatch(matchId, 'score_report_confirmed', { matchId, reportId, completedMatch });
    sseService.broadcastTournament(match.tournament_id, 'score_report_confirmed', { matchId, reportId, completedMatch });

    return { report: { ...report, status: 'confirmed' }, match: completedMatch };
  }

  async rejectMatchScoreReport(matchId, reportId, disputeReason, requestingUser) {
    const { match, isOrganizerOrAdmin } = await this._verifyCaptainOrOrganizer(matchId, requestingUser);

    const reportRes = await query('SELECT * FROM match_score_reports WHERE id = $1 AND match_id = $2', [reportId, matchId]);
    if (!reportRes.rows.length) throw this._notFound('Score report not found');
    const report = reportRes.rows[0];

    if (report.status !== 'pending') {
      throw this._badRequest(`Score report is already ${report.status}`);
    }

    if (!isOrganizerOrAdmin && report.submitted_by_user_id === requestingUser.id) {
      await query("UPDATE match_score_reports SET status = 'cancelled', updated_at = NOW() WHERE id = $1", [reportId]);
      return { ...report, status: 'cancelled' };
    }

    await query(`
      UPDATE match_score_reports
      SET status = 'disputed', dispute_reason = $2, reviewed_by_user_id = $3, updated_at = NOW()
      WHERE id = $1
    `, [reportId, disputeReason || 'Score contested by opponent', requestingUser.id]);

    const updated = { ...report, status: 'disputed', dispute_reason: disputeReason };
    sseService.broadcastMatch(matchId, 'score_report_disputed', { matchId, reportId, disputeReason });
    sseService.broadcastTournament(match.tournament_id, 'score_report_disputed', { matchId, reportId, disputeReason });
    return updated;
  }

  // ---------------------------------------------------------------------------
  // POST /api/matches/:matchId/score
  // Organizer / Co-organizer direct score recording & updating
  // ---------------------------------------------------------------------------
  async recordMatchScore(matchId, data = {}, requestingUser) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const match = await this._lockMatchAggregate(client, matchId);
      const tournament = await this._verifyMatchAuthorization(match, requestingUser);

      if (tournament.status !== 'in_progress') {
        throw this._badRequest('Tournament must be in progress to record match scores');
      }

      if (!match.fixture_id) {
        throw this._badRequest('Only fixture-linked tournament matches can record scores');
      }

      // If match is still 'scheduled', automatically transition to in_progress first
      if (match.status === 'scheduled') {
        await client.query(`
          UPDATE matches SET status = 'in_progress', started_at = NOW(), updated_at = NOW() WHERE id = $1
        `, [matchId]);
        await client.query(`
          UPDATE fixtures SET status = 'in_progress', updated_at = NOW() WHERE id = $1
        `, [match.fixture_id]);
      }

      const participantResult = await client.query(`
        SELECT id, registration_id, side, score, result
        FROM match_participants
        WHERE match_id = $1
        ORDER BY side
        FOR UPDATE
      `, [matchId]);
      const participants = participantResult.rows;
      if (participants.length !== 2) {
        throw this._badRequest('Match must have two participants');
      }

      const home = participants.find(p => p.side === 'home');
      const away = participants.find(p => p.side === 'away');
      if (!home?.registration_id || !away?.registration_id) {
        throw this._badRequest('Both match participants must be assigned');
      }

      const homeScore = Number(data.home_score);
      const awayScore = Number(data.away_score);
      if (!Number.isFinite(homeScore) || homeScore < 0 || !Number.isFinite(awayScore) || awayScore < 0) {
        throw this._badRequest('Both home and away scores must be non-negative numbers');
      }

      const fixtureResult = await client.query('SELECT * FROM fixtures WHERE id = $1', [match.fixture_id]);
      const fixture = fixtureResult.rows[0];
      const isTableStage = ['group', 'league', 'round_robin'].includes(fixture?.stage);

      let homeResult, awayResult, winnerRegId;
      if (homeScore > awayScore) {
        homeResult = 'win';
        awayResult = 'loss';
        winnerRegId = home.registration_id;
      } else if (awayScore > homeScore) {
        homeResult = 'loss';
        awayResult = 'win';
        winnerRegId = away.registration_id;
      } else {
        if (!isTableStage) {
          throw this._badRequest('Ties are not allowed in knockout bracket rounds. A winner must be decided.');
        }
        homeResult = 'draw';
        awayResult = 'draw';
        winnerRegId = null;
      }

      // Update match participants
      await client.query(`
        UPDATE match_participants
        SET score = $1, result = $2, updated_at = NOW()
        WHERE id = $3
      `, [JSON.stringify({ numeric: homeScore }), homeResult, home.id]);

      await client.query(`
        UPDATE match_participants
        SET score = $1, result = $2, updated_at = NOW()
        WHERE id = $3
      `, [JSON.stringify({ numeric: awayScore }), awayResult, away.id]);

      const resultSummary = {
        home_score: homeScore,
        away_score: awayScore,
        winner: winnerRegId ? (winnerRegId === home.registration_id ? 'home' : 'away') : 'draw',
        notes: data.notes || null
      };

      // Update match
      const updateMatchRes = await client.query(`
        UPDATE matches
        SET status = 'completed',
            ended_at = NOW(),
            result_summary = $2,
            winner_registration_id = $3,
            updated_at = NOW()
        WHERE id = $1
        RETURNING *
      `, [matchId, JSON.stringify(resultSummary), winnerRegId]);

      // Update fixture
      await client.query(`
        UPDATE fixtures
        SET status = 'completed', winner_registration_id = $2, updated_at = NOW()
        WHERE id = $1
      `, [fixture.id, winnerRegId]);

      // Handle winner advancement if single elimination or grand final
      if (winnerRegId) {
        if (fixture.stage === 'grand_final' && fixture.away_registration_id === winnerRegId) {
          const resetResult = await client.query(`
            SELECT * FROM fixtures
            WHERE tournament_id = $1 AND stage = 'grand_final_reset'
            LIMIT 1 FOR UPDATE
          `, [match.tournament_id]);
          if (resetResult.rows.length) {
            const resetFixture = resetResult.rows[0];
            await client.query(`
              UPDATE fixtures
              SET home_registration_id = $2, away_registration_id = $3, status = 'scheduled', winner_registration_id = NULL, updated_at = NOW()
              WHERE id = $1
            `, [resetFixture.id, fixture.away_registration_id, fixture.home_registration_id]);
            await this._createMatchForFixture(client, match.tournament_id, {
              ...resetFixture,
              home_registration_id: fixture.away_registration_id,
              away_registration_id: fixture.home_registration_id,
              status: 'scheduled'
            });
          }
        } else if (fixture.stage !== 'grand_final') {
          await this._advanceWinner(client, fixture, winnerRegId);
        }
      }

      if (fixture.stage === 'double_elimination_winners') {
        const loserRegId = homeResult === 'loss' ? home.registration_id : away.registration_id;
        if (loserRegId) await this._advanceLoser(client, fixture, loserRegId);
      }
      if (fixture.stage === 'group') await this._advanceCompletedGroupStage(client, match.tournament_id);

      // Check if all fixtures are completed to auto-complete tournament
      const remainingFixtures = await client.query(`
        SELECT id FROM fixtures
        WHERE tournament_id = $1 AND status NOT IN ('completed', 'bye', 'cancelled')
        LIMIT 1
      `, [match.tournament_id]);
      if (!remainingFixtures.rows.length) {
        const tournamentResult = await client.query(
          'SELECT status FROM tournaments WHERE id = $1 FOR UPDATE',
          [match.tournament_id]
        );
        if (tournamentResult.rows[0]?.status === 'in_progress') {
          await client.query(
            "UPDATE tournaments SET status = 'completed', updated_at = NOW() WHERE id = $1",
            [match.tournament_id]
          );
          await client.query(`
            INSERT INTO tournament_status_history (tournament_id, from_status, to_status, changed_by_user_id, reason)
            VALUES ($1, 'in_progress', 'completed', $2, 'All generated fixtures are complete')
          `, [match.tournament_id, requestingUser.id]);
        }
      }

      await client.query('COMMIT');
      const completedMatch = updateMatchRes.rows[0];
      this._refreshTournamentStatistics(match.tournament_id, requestingUser);
      this._postMatchAnnouncement(completedMatch, 'completed', requestingUser.id, {
        result_summary: resultSummary
      });
      sseService.broadcastTournament(match.tournament_id, 'match_completed', {
        matchId,
        tournamentId: match.tournament_id,
        fixtureId: fixture.id,
        winnerRegistrationId: winnerRegId,
        homeScore,
        awayScore,
        status: 'completed'
      });
      sseService.broadcastMatch(matchId, 'match_completed', {
        matchId,
        tournamentId: match.tournament_id,
        winnerRegistrationId: winnerRegId,
        homeScore,
        awayScore,
        status: 'completed'
      });
      return completedMatch;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
}

module.exports = new MatchesService();
