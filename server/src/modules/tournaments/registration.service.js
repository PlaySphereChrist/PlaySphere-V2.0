const { query, pool } = require('../../config/database');
const eligibilityService = require('./eligibility.service');
const {
  assertRegistrationOpen,
  buildWaitlistPromotionRegistration,
  isRegistrationOpen,
} = require('./registration-rules');

class RegistrationService {
  _badRequest(msg) { const e = new Error(msg); e.statusCode = 400; return e; }
  _forbidden(msg) { const e = new Error(msg); e.statusCode = 403; return e; }
  _notFound(msg) { const e = new Error(msg); e.statusCode = 404; return e; }
  _conflict(msg) { const e = new Error(msg); e.statusCode = 409; return e; }

  // ---------------------------------------------------------------------------
  // Internal helpers
  // ---------------------------------------------------------------------------

  async _fetchTournament(tournamentId) {
    const res = await query('SELECT * FROM tournaments WHERE id = $1', [tournamentId]);
    if (!res.rows.length) throw this._notFound('Tournament not found');
    return res.rows[0];
  }

  _assertRegistrationOpen(tournament) {
    assertRegistrationOpen(tournament);
  }

  async _countActiveRegistrations(client, tournamentId) {
    const res = await client.query(
      `SELECT COUNT(*) AS cnt FROM tournament_registrations
       WHERE tournament_id = $1 AND status IN ('pending', 'approved')`,
      [tournamentId]
    );
    return parseInt(res.rows[0].cnt, 10);
  }

  async _nextWaitlistPosition(client, tournamentId) {
    const res = await client.query(
      `SELECT COALESCE(MAX(position), 0) + 1 AS next_pos
       FROM tournament_waitlist WHERE tournament_id = $1`,
      [tournamentId]
    );
    return res.rows[0].next_pos;
  }

  // ---------------------------------------------------------------------------
  // REGISTER — individual or team
  // ---------------------------------------------------------------------------
  async register(tournamentId, user, body) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Lock tournament row to prevent concurrent over-registration
      const lockRes = await client.query(
        'SELECT * FROM tournaments WHERE id = $1 FOR UPDATE',
        [tournamentId]
      );
      if (!lockRes.rows.length) throw this._notFound('Tournament not found');
      const lockedTournament = lockRes.rows[0];
      // Check the live state after taking the same lock used by status changes.
      this._assertRegistrationOpen(lockedTournament);

      let result;
      if (lockedTournament.participation_type === 'individual') {
        result = await this._registerIndividual(client, lockedTournament, user, body);
      } else {
        result = await this._registerTeam(client, lockedTournament, user, body);
      }

      await client.query('COMMIT');

      const auditService = require('../audit-logs/audit.service');
      const notificationService = require('../notifications/notification.service');

      if (result.type === 'registered') {
        auditService.log({
          actor_user_id: user.id,
          action: 'tournament_registration_created',
          entity_type: 'tournament_registration',
          entity_id: result.registration.id,
          new_state: result.registration
        });

        const isFree = !result.payment_required;
        const msg = isFree ? 'Registration approved automatically.' : 'Registration pending payment.';

        notificationService.notifyUser({
          userId: user.id,
          type: 'tournament_registration',
          title: `Tournament Registration: ${lockedTournament.name}`,
          body: msg,
          entityType: 'tournament_registration',
          entityId: result.registration.id,
          emailTemplate: isFree ? 'tournament_registration_confirmation' : null,
          emailData: {
            tournament_name: lockedTournament.name,
            status: result.registration.status,
            fee: lockedTournament.registration_fee,
            registration_id: result.registration.id
          }
        });
      }

      return result;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async _registerIndividual(client, tournament, user, body) {
    // Resolve individual_player_profile_id from the requesting user's own profile
    const profileRes = await client.query(
      'SELECT id, user_id FROM player_profiles WHERE user_id = $1',
      [user.id]
    );
    if (!profileRes.rows.length) {
      throw this._badRequest('You must create a Player Profile before registering for a tournament');
    }

    const profileId = profileRes.rows[0].id;

    // Check for existing active registration
    const dupRes = await client.query(
      `SELECT id FROM tournament_registrations
       WHERE tournament_id = $1 AND individual_player_profile_id = $2
         AND status IN ('pending', 'approved')`,
      [tournament.id, profileId]
    );
    if (dupRes.rows.length) {
      throw this._conflict('You already have an active registration for this tournament');
    }

    // Check eligibility (evaluate using Phase 9C internally)
    const eligResult = await this._evaluateInTransaction(client, tournament.id, { player_profile_id: profileId }, user);
    if (!eligResult.effective_eligible) {
      throw this._forbidden('Registration denied: candidate does not satisfy all mandatory eligibility rules');
    }

    // Check capacity and route to waitlist
    const activeCount = await this._countActiveRegistrations(client, tournament.id);
    const capacity = tournament.max_teams; // max_teams field is used for both types

    if (capacity && activeCount >= capacity) {
      // Full — go to waitlist
      return await this._addToWaitlist(client, tournament.id, user.id, null, profileId, eligResult);
    }

    const fee = parseFloat(tournament.registration_fee) || 0;
    const initialStatus = fee > 0 ? 'pending' : 'approved';

    // Create registration
    const regRes = await client.query(
      `INSERT INTO tournament_registrations
         (tournament_id, individual_player_profile_id, registered_by_user_id,
          status, eligibility_status, registration_name, registered_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       RETURNING *`,
      [
        tournament.id,
        profileId,
        user.id,
        initialStatus,
        eligResult.override ? 'overridden' : 'approved',
        user.username || null
      ]
    );

    const registration = regRes.rows[0];
    let payment = null;

    if (fee > 0) {
      const payRes = await client.query(
        `INSERT INTO payments
           (user_id, entity_type, entity_id, amount, currency, status, payment_type, description)
         VALUES ($1, 'tournament_registration', $2, $3, 'INR', 'created', 'full', 'Tournament Registration Fee')
         RETURNING *`,
        [user.id, registration.id, fee]
      );
      payment = payRes.rows[0];
    }

    return { type: 'registered', registration, payment_required: fee > 0, payment };
  }

  async _registerTeam(client, tournament, user, body) {
    const { team_id } = body;
    if (!team_id) throw this._badRequest('team_id is required for team tournaments');

    // Validate team exists and user is manager
    const teamRes = await client.query(
      'SELECT id, sport_id, manager_user_id, name FROM teams WHERE id = $1 AND is_active = true',
      [team_id]
    );
    if (!teamRes.rows.length) throw this._notFound('Team not found');
    const team = teamRes.rows[0];

    if (team.manager_user_id !== user.id) {
      throw this._forbidden('Only the Team Manager can register a team');
    }

    // Validate sport matches
    if (team.sport_id !== tournament.sport_id) {
      throw this._badRequest('Team sport does not match tournament sport');
    }

    // Check for existing active registration
    const dupRes = await client.query(
      `SELECT id FROM tournament_registrations
       WHERE tournament_id = $1 AND team_id = $2 AND status IN ('pending', 'approved')`,
      [tournament.id, team_id]
    );
    if (dupRes.rows.length) {
      throw this._conflict('This team already has an active registration for this tournament');
    }

    // Check eligibility via Phase 9C
    const eligResult = await this._evaluateInTransaction(client, tournament.id, { team_id }, user);
    if (!eligResult.effective_eligible) {
      throw this._forbidden('Registration denied: team does not satisfy all mandatory eligibility rules');
    }

    // Check capacity
    const activeCount = await this._countActiveRegistrations(client, tournament.id);
    const capacity = tournament.max_teams;

    if (capacity && activeCount >= capacity) {
      return await this._addToWaitlist(client, tournament.id, user.id, team_id, null, eligResult);
    }

    const fee = parseFloat(tournament.registration_fee) || 0;
    const initialStatus = fee > 0 ? 'pending' : 'approved';

    // Create registration
    const regRes = await client.query(
      `INSERT INTO tournament_registrations
         (tournament_id, team_id, registered_by_user_id,
          status, eligibility_status, registration_name, registered_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       RETURNING *`,
      [
        tournament.id,
        team_id,
        user.id,
        initialStatus,
        eligResult.override ? 'overridden' : 'approved',
        team.name
      ]
    );

    const registration = regRes.rows[0];

    // Snapshot team roster into tournament_registration_players
    const rosterRes = await client.query(
      `SELECT tm.player_profile_id
       FROM team_members tm
       WHERE tm.team_id = $1 AND tm.is_active = true`,
      [team_id]
    );
    for (const member of rosterRes.rows) {
      await client.query(
        `INSERT INTO tournament_registration_players (registration_id, player_profile_id)
         VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [registration.id, member.player_profile_id]
      );
    }

    let payment = null;
    if (fee > 0) {
      const payRes = await client.query(
        `INSERT INTO payments
           (user_id, entity_type, entity_id, amount, currency, status, payment_type, description)
         VALUES ($1, 'tournament_registration', $2, $3, 'INR', 'created', 'full', 'Tournament Registration Fee')
         RETURNING *`,
        [user.id, registration.id, fee]
      );
      payment = payRes.rows[0];
    }

    return { type: 'registered', registration, payment_required: fee > 0, payment };
  }

  // Run Phase 9C evaluation query using the internal eligibility engine
  async _evaluateInTransaction(client, tournamentId, candidateData, user) {
    return await eligibilityService.evaluateCandidateInternal(client, tournamentId, candidateData);
  }

  async _addToWaitlist(client, tournamentId, userId, teamId, profileId, eligResult) {
    // Prevent duplicate active waitlist entry
    const params = [tournamentId];
    let dupClause = '';
    if (teamId) {
      params.push(teamId);
      dupClause = `AND team_id = $2`;
    } else {
      params.push(profileId);
      dupClause = `AND individual_player_profile_id = $2`;
    }

    const dupWait = await client.query(
      `SELECT id FROM tournament_waitlist
       WHERE tournament_id = $1 ${dupClause} AND status = 'waiting'`,
      params
    );
    if (dupWait.rows.length) {
      throw this._conflict('Already on the waitlist for this tournament');
    }

    const position = await this._nextWaitlistPosition(client, tournamentId);
    const waitRes = await client.query(
      `INSERT INTO tournament_waitlist
         (tournament_id, team_id, individual_player_profile_id, registered_by_user_id, position, status)
       VALUES ($1, $2, $3, $4, $5, 'waiting')
       RETURNING *`,
      [tournamentId, teamId || null, profileId || null, userId, position]
    );

    return { type: 'waitlisted', waitlist_entry: waitRes.rows[0] };
  }

  // ---------------------------------------------------------------------------
  // LIST REGISTRATIONS — Organizer/Admin only
  // ---------------------------------------------------------------------------
  async listRegistrations(tournamentId, user) {
    await this._fetchTournament(tournamentId); // existence check
    await this._assertOrganizerOrAdmin(tournamentId, user);

    const res = await query(
      `SELECT r.*,
              t.name AS team_name,
              pp.display_name AS individual_display_name,
              u.email AS registered_by_email
       FROM tournament_registrations r
       LEFT JOIN teams t ON t.id = r.team_id
       LEFT JOIN player_profiles pp ON pp.id = r.individual_player_profile_id
       JOIN users u ON u.id = r.registered_by_user_id
       WHERE r.tournament_id = $1
       ORDER BY r.registered_at ASC`,
      [tournamentId]
    );
    return res.rows;
  }

  // ---------------------------------------------------------------------------
  // GET MY REGISTRATION
  // ---------------------------------------------------------------------------
  async getMyRegistration(tournamentId, user) {
    await this._fetchTournament(tournamentId);

    // For individual: match via profile
    const profileRes = await query(
      'SELECT id FROM player_profiles WHERE user_id = $1',
      [user.id]
    );
    const profileId = profileRes.rows[0]?.id;

    // For team: match via managed teams
    const teamRes = await query(
      'SELECT id FROM teams WHERE manager_user_id = $1 AND is_active = true',
      [user.id]
    );
    const teamIds = teamRes.rows.map(r => r.id);

    const conditions = [];
    const params = [tournamentId];
    if (profileId) {
      params.push(profileId);
      conditions.push(`individual_player_profile_id = $${params.length}`);
    }
    if (teamIds.length) {
      params.push(teamIds);
      conditions.push(`team_id = ANY($${params.length})`);
    }

    if (!conditions.length) return null;

    const res = await query(
      `SELECT r.*, t.name AS team_name, pp.display_name AS individual_display_name
       FROM tournament_registrations r
       LEFT JOIN teams t ON t.id = r.team_id
       LEFT JOIN player_profiles pp ON pp.id = r.individual_player_profile_id
       WHERE r.tournament_id = $1
         AND r.status IN ('pending', 'approved')
         AND (${conditions.join(' OR ')})
       ORDER BY r.registered_at DESC LIMIT 1`,
      params
    );
    return res.rows[0] || null;
  }

  // ---------------------------------------------------------------------------
  // CANCEL REGISTRATION
  // ---------------------------------------------------------------------------
  async cancelRegistration(tournamentId, registrationId, user) {
    const client = await pool.connect();
    let tournament;
    let reg;
    let promotion = null;
    try {
      await client.query('BEGIN');

      // Take locks in tournament -> registration order everywhere so a
      // withdrawal cannot race a new registration or another promotion.
      const tournamentRes = await client.query(
        'SELECT * FROM tournaments WHERE id = $1 FOR UPDATE',
        [tournamentId]
      );
      if (!tournamentRes.rows.length) throw this._notFound('Tournament not found');
      tournament = tournamentRes.rows[0];

      const regRes = await client.query(
        'SELECT * FROM tournament_registrations WHERE id = $1 AND tournament_id = $2 FOR UPDATE',
        [registrationId, tournamentId]
      );
      if (!regRes.rows.length) throw this._notFound('Registration not found');
      reg = regRes.rows[0];

      if (!['pending', 'approved'].includes(reg.status)) {
        throw this._badRequest(`Cannot cancel a registration with status "${reg.status}"`);
      }

      // Authorization: registered_by_user_id, organizer, or admin
      const isAdmin = user.roles?.includes('ADMIN');
      const isOrganizer = user.id === tournament.organizer_user_id;
      const isOwner = user.id === reg.registered_by_user_id;
      if (!isAdmin && !isOrganizer && !isOwner) {
        throw this._forbidden('You are not authorized to cancel this registration');
      }

      // Block cancellation if tournament is in_progress or later (except for admin)
      if (!isAdmin && ['in_progress', 'completed', 'archived'].includes(tournament.status)) {
        throw this._badRequest('Cannot cancel a registration while the tournament is in progress or completed');
      }

      await client.query(
        `UPDATE tournament_registrations
         SET status = 'withdrawn', updated_at = NOW()
         WHERE id = $1`,
        [registrationId]
      );

      // Attempt to promote waitlist if capacity now available
      promotion = await this._promoteWaitlist(client, tournament);

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    const auditService = require('../audit-logs/audit.service');
    const notificationService = require('../notifications/notification.service');
    auditService.log({
      actor_user_id: user.id,
      action: 'tournament_registration_cancelled',
      entity_type: 'tournament_registration',
      entity_id: registrationId,
      old_state: reg,
      new_state: { ...reg, status: 'withdrawn' },
    });
    notificationService.notifyUser({
      userId: reg.registered_by_user_id,
      type: 'tournament_registration',
      title: `Tournament Registration Cancelled: ${tournament.name}`,
      body: 'Your tournament registration was cancelled.',
      entityType: 'tournament_registration',
      entityId: registrationId,
    });

    if (promotion) {
      auditService.log({
        actor_user_id: user.id,
        action: 'tournament_waitlist_promoted',
        entity_type: 'tournament_registration',
        entity_id: promotion.registration.id,
        new_state: promotion.registration,
      });
      notificationService.notifyUser({
        userId: promotion.entry.registered_by_user_id,
        type: 'tournament_registration',
        title: `A Tournament Spot Opened: ${tournament.name}`,
        body: promotion.payment_required
          ? 'You have been promoted from the waitlist. Complete the registration fee payment to confirm your place.'
          : 'You have been promoted from the waitlist and your registration is confirmed.',
        entityType: 'tournament_registration',
        entityId: promotion.registration.id,
      });
    }

    return {
      cancelled: true,
      registration_id: registrationId,
      promoted_registration_id: promotion?.registration.id || null,
      payment_required: promotion?.payment_required || false,
    };
  }

  // Promote earliest waiting candidate after a slot opens
  async _promoteWaitlist(client, tournament) {
    const capacity = Number(tournament.max_teams);
    if (!capacity || !isRegistrationOpen(tournament)) return null;

    const countRes = await client.query(
      `SELECT COUNT(*) AS cnt FROM tournament_registrations
       WHERE tournament_id = $1 AND status IN ('pending', 'approved')`,
      [tournament.id]
    );
    const activeCount = parseInt(countRes.rows[0].cnt, 10);
    if (activeCount >= capacity) return null;

    const skippedEntryIds = [];
    while (activeCount < capacity) {
      const params = [tournament.id];
      let skipClause = '';
      if (skippedEntryIds.length) {
        params.push(skippedEntryIds);
        skipClause = 'AND id <> ALL($2::uuid[])';
      }

      const waitRes = await client.query(
        `SELECT * FROM tournament_waitlist
         WHERE tournament_id = $1 AND status = 'waiting' ${skipClause}
         ORDER BY position ASC
         LIMIT 1 FOR UPDATE SKIP LOCKED`,
        params
      );
      if (!waitRes.rows.length) return null;

      const entry = waitRes.rows[0];
      const candidateColumn = entry.team_id ? 'team_id' : 'individual_player_profile_id';
      const candidateId = entry.team_id || entry.individual_player_profile_id;

      // A participant may have registered directly after joining the queue.
      // Retire that stale queue entry instead of violating the active-registration index.
      const activeRegistration = await client.query(
        `SELECT id FROM tournament_registrations
         WHERE tournament_id = $1 AND ${candidateColumn} = $2
           AND status IN ('pending', 'approved')
         LIMIT 1`,
        [tournament.id, candidateId]
      );
      if (activeRegistration.rows.length) {
        await client.query(
          `UPDATE tournament_waitlist
           SET status = 'withdrawn', updated_at = NOW()
           WHERE id = $1`,
          [entry.id]
        );
        continue;
      }

      const candidateData = entry.team_id
        ? { team_id: entry.team_id }
        : { player_profile_id: entry.individual_player_profile_id };

      let eligibility;
      try {
        await client.query('SAVEPOINT waitlist_eligibility');
        eligibility = await eligibilityService.evaluateCandidateInternal(
          client,
          tournament.id,
          candidateData
        );
        await client.query('RELEASE SAVEPOINT waitlist_eligibility');
      } catch {
        await client.query('ROLLBACK TO SAVEPOINT waitlist_eligibility');
        await client.query('RELEASE SAVEPOINT waitlist_eligibility');
        // Do not promote anyone if the eligibility check itself failed.
        return null;
      }

      if (!eligibility.effective_eligible) {
        // Keep their place in the queue, but look for the next eligible entry.
        skippedEntryIds.push(entry.id);
        continue;
      }

      let registrationName = null;
      if (entry.team_id) {
        const teamRes = await client.query(
          'SELECT name FROM teams WHERE id = $1',
          [entry.team_id]
        );
        registrationName = teamRes.rows[0]?.name || null;
      }

      const promotion = buildWaitlistPromotionRegistration(
        tournament,
        eligibility,
        registrationName
      );
      const registrationRes = await client.query(
        `INSERT INTO tournament_registrations
           (tournament_id, team_id, individual_player_profile_id, registered_by_user_id,
            status, eligibility_status, registration_name, registered_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
         RETURNING *`,
        [
          tournament.id,
          entry.team_id || null,
          entry.individual_player_profile_id || null,
          entry.registered_by_user_id,
          promotion.status,
          promotion.eligibility_status,
          promotion.registration_name,
        ]
      );
      const registration = registrationRes.rows[0];

      if (entry.team_id) {
        await client.query(
          `INSERT INTO tournament_registration_players (registration_id, player_profile_id)
           SELECT $1, tm.player_profile_id
           FROM team_members tm
           WHERE tm.team_id = $2 AND tm.is_active = true
           ON CONFLICT (registration_id, player_profile_id) DO NOTHING`,
          [registration.id, entry.team_id]
        );
      }

      if (promotion.payment_required) {
        await client.query(
          `INSERT INTO payments
             (user_id, entity_type, entity_id, amount, currency, status, payment_type, description)
           VALUES ($1, 'tournament_registration', $2, $3, 'INR', 'created', 'full', $4)`,
          [
            entry.registered_by_user_id,
            registration.id,
            promotion.fee,
            `Tournament Registration Fee: ${tournament.name}`,
          ]
        );
      }

      await client.query(
        `UPDATE tournament_waitlist SET status = 'promoted', updated_at = NOW() WHERE id = $1`,
        [entry.id]
      );

      return {
        entry,
        registration,
        payment_required: promotion.payment_required,
      };
    }

    return null;
  }

  // ---------------------------------------------------------------------------
  // LIST WAITLIST — Organizer/Admin only
  // ---------------------------------------------------------------------------
  async listWaitlist(tournamentId, user) {
    await this._fetchTournament(tournamentId);
    await this._assertOrganizerOrAdmin(tournamentId, user);

    const res = await query(
      `SELECT w.*,
              t.name AS team_name,
              pp.display_name AS individual_display_name,
              u.email AS registered_by_email
       FROM tournament_waitlist w
       LEFT JOIN teams t ON t.id = w.team_id
       LEFT JOIN player_profiles pp ON pp.id = w.individual_player_profile_id
       JOIN users u ON u.id = w.registered_by_user_id
       WHERE w.tournament_id = $1
       ORDER BY w.position ASC`,
      [tournamentId]
    );
    return res.rows;
  }

  // ---------------------------------------------------------------------------
  // GET MY WAITLIST POSITION
  // ---------------------------------------------------------------------------
  async getMyWaitlistEntry(tournamentId, user) {
    await this._fetchTournament(tournamentId);

    const profileRes = await query('SELECT id FROM player_profiles WHERE user_id = $1', [user.id]);
    const profileId = profileRes.rows[0]?.id;

    const teamRes = await query('SELECT id FROM teams WHERE manager_user_id = $1 AND is_active = true', [user.id]);
    const teamIds = teamRes.rows.map(r => r.id);

    const conditions = [];
    const params = [tournamentId];
    if (profileId) {
      params.push(profileId);
      conditions.push(`individual_player_profile_id = $${params.length}`);
    }
    if (teamIds.length) {
      params.push(teamIds);
      conditions.push(`team_id = ANY($${params.length})`);
    }

    if (!conditions.length) return null;

    const res = await query(
      `SELECT * FROM tournament_waitlist
       WHERE tournament_id = $1 AND (${conditions.join(' OR ')}) AND status = 'waiting'
       ORDER BY position ASC LIMIT 1`,
      params
    );
    return res.rows[0] || null;
  }

  async cancelMyWaitlistEntry(tournamentId, user) {
    const client = await pool.connect();
    let entry;
    try {
      await client.query('BEGIN');

      const tournamentRes = await client.query(
        'SELECT id FROM tournaments WHERE id = $1 FOR UPDATE',
        [tournamentId]
      );
      if (!tournamentRes.rows.length) throw this._notFound('Tournament not found');

      const profileRes = await client.query(
        'SELECT id FROM player_profiles WHERE user_id = $1',
        [user.id]
      );
      const profileId = profileRes.rows[0]?.id;

      const teamRes = await client.query(
        'SELECT id FROM teams WHERE manager_user_id = $1 AND is_active = true',
        [user.id]
      );
      const teamIds = teamRes.rows.map((row) => row.id);

      const conditions = [];
      const params = [tournamentId];
      if (profileId) {
        params.push(profileId);
        conditions.push(`individual_player_profile_id = $${params.length}`);
      }
      if (teamIds.length) {
        params.push(teamIds);
        conditions.push(`team_id = ANY($${params.length})`);
      }
      if (!conditions.length) throw this._notFound('Waitlist entry not found');

      const entryRes = await client.query(
        `SELECT * FROM tournament_waitlist
         WHERE tournament_id = $1 AND status = 'waiting'
           AND (${conditions.join(' OR ')})
         ORDER BY position ASC LIMIT 1 FOR UPDATE`,
        params
      );
      if (!entryRes.rows.length) throw this._notFound('Waitlist entry not found');
      entry = entryRes.rows[0];

      await client.query(
        `UPDATE tournament_waitlist
         SET status = 'withdrawn', updated_at = NOW()
         WHERE id = $1`,
        [entry.id]
      );

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

    const auditService = require('../audit-logs/audit.service');
    auditService.log({
      actor_user_id: user.id,
      action: 'tournament_waitlist_withdrawn',
      entity_type: 'tournament_waitlist',
      entity_id: entry.id,
      old_state: entry,
      new_state: { ...entry, status: 'withdrawn' },
    });

    return { cancelled: true, waitlist_entry_id: entry.id };
  }

  // ---------------------------------------------------------------------------
  // Helper: assert organizer or admin for a tournament
  // ---------------------------------------------------------------------------
  async _assertOrganizerOrAdmin(tournamentId, user) {
    if (user.roles?.includes('ADMIN')) return;
    const res = await query('SELECT organizer_user_id FROM tournaments WHERE id = $1', [tournamentId]);
    if (!res.rows.length) throw this._notFound('Tournament not found');
    if (res.rows[0].organizer_user_id !== user.id) {
      throw this._forbidden('Only the organizer or an admin can view registrations');
    }
  }
}

module.exports = new RegistrationService();
