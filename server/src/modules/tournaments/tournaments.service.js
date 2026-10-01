const { query, pool } = require('../../config/database');
const PUBLIC_TOURNAMENT_STATUSES = [
  'registration_open', 'registration_closed', 'in_progress', 'completed', 'cancelled', 'archived'
];

// ---------------------------------------------------------------------------
// Status transition map — Phase 9A controls only early lifecycle states.
// Later lifecycle states (registration_open, in_progress, etc.) are
// intentionally inaccessible until their corresponding phases are built.
// ---------------------------------------------------------------------------
const ALLOWED_TRANSITIONS = {
  draft:              ['registration_open', 'cancelled'],
  registration_open:  ['registration_closed', 'in_progress', 'cancelled'],
  registration_closed: ['in_progress', 'cancelled'],
  in_progress:        ['completed', 'cancelled'],
  completed:          ['archived'],
  cancelled:          ['archived'],
  archived:           [],
};

// Human-readable phase-9A-appropriate transitions (earlier lifecycle).
// We keep the full map above but document Phase 9A's supported transitions:
// draft → registration_open (publishing workflow simplified for Phase 9A)
// Any attempt to jump to in_progress/completed/archived from draft is rejected.

class TournamentsService {
  _badRequest(msg) {
    const e = new Error(msg);
    e.statusCode = 400;
    return e;
  }

  _notFound(msg) {
    const e = new Error(msg);
    e.statusCode = 404;
    return e;
  }

  _forbidden(msg) {
    const e = new Error(msg);
    e.statusCode = 403;
    return e;
  }

  // -------------------------------------------------------------------------
  // LIST tournaments
  // Visibility:
  //   - ORGANIZER: sees their own tournaments at all statuses
  //   - ADMIN: sees all tournaments
  //   - Everyone else: sees published tournaments; drafts stay private
  // -------------------------------------------------------------------------
  async listTournaments(filters = {}, requestingUser = null) {
    const params = [];
    let whereConditions = ['1=1'];

    const isAdmin = requestingUser?.roles?.includes('ADMIN');
    const isOrganizer = requestingUser?.roles?.includes('ORGANIZER');

    if (isAdmin) {
      // Admin sees everything
    } else if (isOrganizer) {
      // Organizer sees their own drafts + all published tournaments
      params.push(requestingUser.id);
      whereConditions.push(
        `(t.organizer_user_id = $${params.length} OR t.co_organizer_user_id = $${params.length} OR t.status IN ('registration_open', 'registration_closed', 'in_progress', 'completed', 'cancelled', 'archived'))`
      );
    } else if (!requestingUser) {
      // Anonymous visitors can browse every published tournament.
      whereConditions.push(`t.status IN ('registration_open', 'registration_closed', 'in_progress', 'completed', 'cancelled', 'archived')`);
    } else {
      // Regular users can browse every published tournament.
      whereConditions.push(`t.status IN ('registration_open', 'registration_closed', 'in_progress', 'completed', 'cancelled', 'archived')`);
    }

    if (filters.sport_id) {
      params.push(filters.sport_id);
      whereConditions.push(`t.sport_id = $${params.length}`);
    }

    if (filters.search?.trim()) {
      params.push(`%${filters.search.trim()}%`);
      whereConditions.push(`(t.name ILIKE $${params.length} OR COALESCE(t.city, '') ILIKE $${params.length} OR s.name ILIKE $${params.length})`);
    }

    if (filters.exclude_cancelled === 'true' || filters.exclude_cancelled === true) {
      whereConditions.push(`t.status != 'cancelled'`);
    }

    if (filters.status === 'past') {
      // "Past" is a date-based view, not a value in tournament_status_type.
      // Use the end date where available, falling back to the start date for
      // tournaments without an end date.
      whereConditions.push(`COALESCE(t.ends_at, t.starts_at) < NOW()`);
      whereConditions.push(`t.status != 'cancelled'`);
    } else if (filters.status && (isAdmin || isOrganizer || PUBLIC_TOURNAMENT_STATUSES.includes(filters.status))) {
      // Public status filters cannot reveal drafts; admins and organizers can filter their private drafts too.
      params.push(filters.status);
      whereConditions.push(`t.status = $${params.length}`);
    } else if (!filters.status && !filters.organizer_user_id) {
      // When browsing tournaments publicly without an explicit status filter, omit cancelled tournaments
      whereConditions.push(`t.status != 'cancelled'`);
    }

    if (filters.organizer_user_id) {
      params.push(filters.organizer_user_id);
      whereConditions.push(`(t.organizer_user_id = $${params.length} OR t.co_organizer_user_id = $${params.length})`);
    }

    const sql = `
      SELECT
        t.*,
        s.name  AS sport_name,
        COALESCE(pp.display_name, split_part(u.email, '@', 1)) AS organizer_name
      FROM tournaments t
      JOIN sports  s ON t.sport_id          = s.id
      JOIN users   u ON t.organizer_user_id = u.id
      LEFT JOIN player_profiles pp ON u.id  = pp.user_id
      WHERE ${whereConditions.join(' AND ')}
      ORDER BY t.created_at DESC
    `;

    const res = await query(sql, params);
    return res.rows;
  }

  // -------------------------------------------------------------------------
  // GET single tournament
  // -------------------------------------------------------------------------
  async getTournament(tournamentId, requestingUser = null) {
    const res = await query(
      `SELECT
         t.*,
         s.name  AS sport_name,
         COALESCE(pp.display_name, split_part(u.email, '@', 1)) AS organizer_name,
         (SELECT id FROM communities WHERE tournament_id = t.id LIMIT 1) AS community_id
       FROM tournaments t
       JOIN sports  s ON t.sport_id          = s.id
       JOIN users   u ON t.organizer_user_id = u.id
       LEFT JOIN player_profiles pp ON u.id  = pp.user_id
       WHERE t.id = $1`,
      [tournamentId]
    );

    if (!res.rows.length) throw this._notFound('Tournament not found');
    const tournament = res.rows[0];

    // Draft tournaments are private; all published tournaments are publicly readable.
    const isAdmin = requestingUser?.roles?.includes('ADMIN');
    const isOwnOrganizer = requestingUser?.id === tournament.organizer_user_id || requestingUser?.id === tournament.co_organizer_user_id;

    if (!isAdmin && !isOwnOrganizer && !PUBLIC_TOURNAMENT_STATUSES.includes(tournament.status)) {
      throw this._notFound('Tournament not found');
    }

    // Attach status history
    const historyRes = await query(
      `SELECT
         h.id,
         h.from_status,
         h.to_status,
         h.reason,
         h.changed_at,
         COALESCE(pp.display_name, split_part(u.email, '@', 1)) AS changed_by_name
       FROM tournament_status_history h
       LEFT JOIN users u ON h.changed_by_user_id = u.id
       LEFT JOIN player_profiles pp ON u.id = pp.user_id
       WHERE h.tournament_id = $1
       ORDER BY h.changed_at ASC`,
      [tournamentId]
    );
    tournament.status_history = historyRes.rows;

    return tournament;
  }

  // -------------------------------------------------------------------------
  // PUBLIC APPROVED PARTICIPANTS — only public profile fields are returned
  // -------------------------------------------------------------------------
  async listPublicParticipants(tournamentId, requestingUser = null) {
    await this.getTournament(tournamentId, requestingUser);

    const result = await query(`
      SELECT
        r.id AS registration_id,
        CASE WHEN r.team_id IS NOT NULL THEN 'team' ELSE 'individual' END AS participant_type,
        CASE
          WHEN r.team_id IS NOT NULL THEN COALESCE(r.registration_name, t.name)
          WHEN individual.is_public THEN individual.display_name
          ELSE 'Private participant'
        END AS participant_name,
        r.team_id,
        t.logo_url,
        t.city,
        CASE
          WHEN r.team_id IS NOT NULL THEN COALESCE(roster.players, '[]'::json)
          WHEN individual.is_public THEN json_build_array(json_build_object(
            'display_name', individual.display_name,
            'avatar_url', individual.avatar_url,
            'jersey_number', NULL,
            'is_captain', false
          ))
          ELSE '[]'::json
        END AS players
      FROM tournament_registrations r
      LEFT JOIN teams t ON t.id = r.team_id
      LEFT JOIN player_profiles individual ON individual.id = r.individual_player_profile_id
      LEFT JOIN LATERAL (
        SELECT json_agg(json_build_object(
          'display_name', profile.display_name,
          'avatar_url', profile.avatar_url,
          'jersey_number', registration_player.jersey_number,
          'is_captain', registration_player.is_captain
        ) ORDER BY registration_player.is_captain DESC, profile.display_name ASC) AS players
        FROM tournament_registration_players registration_player
        JOIN player_profiles profile
          ON profile.id = registration_player.player_profile_id
         AND profile.is_public = true
        WHERE registration_player.registration_id = r.id
      ) roster ON true
      WHERE r.tournament_id = $1 AND r.status = 'approved'
      ORDER BY participant_name ASC
    `, [tournamentId]);

    return result.rows;
  }

  // -------------------------------------------------------------------------
  // CREATE tournament — ORGANIZER only
  // organizer_user_id always taken from req.user.id
  // -------------------------------------------------------------------------
  async createTournament(organizerUserId, data) {
    const {
      name, sport_id, format, participation_type,
      description, rules, city, venue_details,
      max_teams, min_teams, registration_fee,
      prize_pool, prize_description,
      registration_opens_at, registration_closes_at,
      starts_at, ends_at
    } = data;

    // Required field validation
    if (!name || !name.trim()) throw this._badRequest('Tournament name is required');
    if (!sport_id)             throw this._badRequest('Sport is required');
    if (!format)               throw this._badRequest('Tournament format is required');

    const validFormats = ['league', 'knockout', 'round_robin', 'group_stage_knockout', 'double_elimination'];
    if (!validFormats.includes(format)) {
      throw this._badRequest(`Invalid format. Must be one of: ${validFormats.join(', ')}`);
    }

    const validParticipationTypes = ['team', 'individual'];
    const partType = participation_type || 'team';
    if (!validParticipationTypes.includes(partType)) {
      throw this._badRequest('Invalid participation_type. Must be "team" or "individual"');
    }

    // Sport must exist
    const sportRes = await query('SELECT id FROM sports WHERE id = $1', [sport_id]);
    if (!sportRes.rows.length) throw this._badRequest('Sport not found');

    // Numeric validations
    if (max_teams !== undefined && max_teams !== null && max_teams <= 0) {
      throw this._badRequest('max_teams must be greater than 0');
    }
    if (min_teams !== undefined && min_teams !== null && min_teams <= 1) {
      throw this._badRequest('min_teams must be greater than 1');
    }
    if (min_teams && max_teams && min_teams > max_teams) {
      throw this._badRequest('min_teams cannot exceed max_teams');
    }
    if (registration_fee !== undefined && registration_fee !== null && registration_fee < 0) {
      throw this._badRequest('registration_fee cannot be negative');
    }
    if (prize_pool !== undefined && prize_pool !== null && prize_pool < 0) {
      throw this._badRequest('prize_pool cannot be negative');
    }

    // Date validations
    if (registration_opens_at && registration_closes_at) {
      if (new Date(registration_opens_at) >= new Date(registration_closes_at)) {
        throw this._badRequest('registration_opens_at must be before registration_closes_at');
      }
    }
    if (starts_at && ends_at) {
      if (new Date(starts_at) > new Date(ends_at)) {
        throw this._badRequest('starts_at must be on or before ends_at');
      }
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const insertRes = await client.query(
        `INSERT INTO tournaments (
           name, sport_id, organizer_user_id, format, participation_type,
           description, rules, city, venue_details,
           max_teams, min_teams, registration_fee, prize_pool, prize_description,
           registration_opens_at, registration_closes_at, starts_at, ends_at,
           status
         ) VALUES (
           $1,  $2,  $3,  $4,  $5,
           $6,  $7,  $8,  $9,
           $10, $11, $12, $13, $14,
           $15, $16, $17, $18,
           'draft'
         ) RETURNING id`,
        [
          name.trim(), sport_id, organizerUserId, format, partType,
          description || null, rules || null, city || null, venue_details || null,
          max_teams || null, min_teams || null,
          registration_fee !== undefined ? registration_fee : 0,
          prize_pool || null, prize_description || null,
          registration_opens_at || null, registration_closes_at || null,
          starts_at || null, ends_at || null
        ]
      );

      const tournamentId = insertRes.rows[0].id;

      // Record creation in status history
      await client.query(
        `INSERT INTO tournament_status_history
           (tournament_id, from_status, to_status, changed_by_user_id, reason)
         VALUES ($1, NULL, 'draft', $2, 'Tournament created')`,
        [tournamentId, organizerUserId]
      );

      // Create dedicated community for this tournament
      const commName = (data.community_name && data.community_name.trim())
        ? data.community_name.trim()
        : `${name.trim()} Community`;
      const commBanner = data.community_banner_url || data.banner_url || null;

      const commRes = await client.query(
        `INSERT INTO communities (name, description, sport_id, city, banner_url, created_by_user_id, is_public, is_active, tournament_id)
         VALUES ($1, $2, $3, $4, $5, $6, true, true, $7)
         RETURNING id`,
        [
          commName, 
          data.community_description || `Official community and announcements for ${name.trim()}`,
          sport_id,
          city || null,
          commBanner,
          organizerUserId,
          tournamentId
        ]
      );
      const communityId = commRes.rows[0].id;
      await client.query(
        `INSERT INTO community_members (community_id, user_id, role)
         VALUES ($1, $2, 'admin')
         ON CONFLICT DO NOTHING`,
        [communityId, organizerUserId]
      );

      await client.query('COMMIT');
      return await this.getTournament(tournamentId, { id: organizerUserId, roles: ['ORGANIZER'] });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  // -------------------------------------------------------------------------
  // UPDATE tournament — only the owning organizer or ADMIN
  // -------------------------------------------------------------------------
  async updateTournament(tournamentId, requestingUser, data) {
    const tournament = await this.getTournament(tournamentId, requestingUser);

    const isAdmin = requestingUser.roles?.includes('ADMIN');
    const isOwnOrganizer = requestingUser.id === tournament.organizer_user_id || requestingUser.id === tournament.co_organizer_user_id;

    if (!isAdmin && !isOwnOrganizer) {
      throw this._forbidden('Only the organizer, co-organizer, or an admin can modify this tournament');
    }

    // Guard: terminal statuses are locked for data edits
    const terminalStatuses = ['completed', 'cancelled', 'archived'];
    if (terminalStatuses.includes(tournament.status)) {
      throw this._badRequest(`Cannot modify a tournament with status "${tournament.status}"`);
    }

    if (tournament.status !== 'draft') {
      if (data.format && data.format !== tournament.format) {
        throw this._badRequest('Tournament format cannot be changed after tournament is published');
      }
      if (data.participation_type && data.participation_type !== tournament.participation_type) {
        throw this._badRequest('Participation type cannot be changed after tournament is published');
      }
      if (data.sport_id && data.sport_id !== tournament.sport_id) {
        throw this._badRequest('Sport cannot be changed after tournament is published');
      }
    }

    // Handle status transition separately
    if (data.status !== undefined) {
      return await this.transitionStatus(tournamentId, requestingUser, data.status, data.reason);
    }

    // Build SET clause from whitelisted fields
    const fields = [];
    const values = [];
    let idx = 1;

    const set = (col, val) => {
      fields.push(`${col} = $${idx++}`);
      values.push(val);
    };

    if (data.name !== undefined) {
      if (!data.name.trim()) throw this._badRequest('name cannot be empty');
      set('name', data.name.trim());
    }
    if (data.description !== undefined) set('description', data.description || null);
    if (data.rules       !== undefined) set('rules',       data.rules       || null);
    if (data.city        !== undefined) set('city',        data.city        || null);
    if (data.venue_details !== undefined) set('venue_details', data.venue_details || null);
    if (data.banner_url  !== undefined) set('banner_url',  data.banner_url  || null);
    if (data.prize_description !== undefined) set('prize_description', data.prize_description || null);

    if (data.format !== undefined) {
      const validFormats = ['league', 'knockout', 'round_robin', 'group_stage_knockout', 'double_elimination'];
      if (!validFormats.includes(data.format)) throw this._badRequest('Invalid format');
      set('format', data.format);
    }

    if (data.participation_type !== undefined) {
      if (!['team', 'individual'].includes(data.participation_type)) {
        throw this._badRequest('Invalid participation_type');
      }
      set('participation_type', data.participation_type);
    }

    if (data.max_teams !== undefined) {
      if (data.max_teams !== null && data.max_teams <= 0) throw this._badRequest('max_teams must be > 0');
      set('max_teams', data.max_teams || null);
    }
    if (data.min_teams !== undefined) {
      if (data.min_teams !== null && data.min_teams <= 1) throw this._badRequest('min_teams must be > 1');
      set('min_teams', data.min_teams || null);
    }
    if (data.registration_fee !== undefined) {
      if (data.registration_fee < 0) throw this._badRequest('registration_fee cannot be negative');
      set('registration_fee', data.registration_fee);
    }
    if (data.prize_pool !== undefined) {
      if (data.prize_pool !== null && data.prize_pool < 0) throw this._badRequest('prize_pool cannot be negative');
      set('prize_pool', data.prize_pool || null);
    }

    if (data.registration_opens_at !== undefined) set('registration_opens_at', data.registration_opens_at || null);
    if (data.registration_closes_at !== undefined) set('registration_closes_at', data.registration_closes_at || null);
    if (data.starts_at !== undefined) set('starts_at', data.starts_at || null);
    if (data.ends_at   !== undefined) set('ends_at',   data.ends_at   || null);

    // Cross-field date validations after collecting new values
    const newRegOpen   = data.registration_opens_at  ?? tournament.registration_opens_at;
    const newRegClose  = data.registration_closes_at ?? tournament.registration_closes_at;
    const newStartsAt  = data.starts_at  ?? tournament.starts_at;
    const newEndsAt    = data.ends_at    ?? tournament.ends_at;

    if (newRegOpen && newRegClose && new Date(newRegOpen) >= new Date(newRegClose)) {
      throw this._badRequest('registration_opens_at must be before registration_closes_at');
    }
    if (newStartsAt && newEndsAt && new Date(newStartsAt) > new Date(newEndsAt)) {
      throw this._badRequest('starts_at must be on or before ends_at');
    }

    if (fields.length === 0) return tournament;

    if (fields.length > 0) {
      values.push(tournamentId);
      await query(
        `UPDATE tournaments SET ${fields.join(', ')} WHERE id = $${idx}`,
        values
      );
    }

    if (data.community_name || data.community_banner_url !== undefined) {
      const commUpdates = [];
      const commVals = [];
      let cIdx = 1;
      if (data.community_name && data.community_name.trim()) {
        commUpdates.push(`name = $${cIdx++}`);
        commVals.push(data.community_name.trim());
      }
      if (data.community_banner_url !== undefined) {
        commUpdates.push(`banner_url = $${cIdx++}`);
        commVals.push(data.community_banner_url || null);
      }
      if (commUpdates.length > 0) {
        commVals.push(tournamentId);
        await query(
          `UPDATE communities SET ${commUpdates.join(', ')}, updated_at = NOW() WHERE tournament_id = $${cIdx}`,
          commVals
        );
      }
    }

    return await this.getTournament(tournamentId, requestingUser);
  }

  // -------------------------------------------------------------------------
  // CONFIGURATION VALIDATION
  // -------------------------------------------------------------------------
  async validateConfiguration(tournamentId, requestingUser) {
    const tournament = await this.getTournament(tournamentId, requestingUser);
    return this._checkConfigurationCompleteness(tournament);
  }

  _checkConfigurationCompleteness(tournament) {
    const missing = [];
    const errors = [];

    if (!tournament.registration_opens_at) missing.push('registration_opens_at');
    if (!tournament.registration_closes_at) missing.push('registration_closes_at');
    if (!tournament.starts_at) missing.push('starts_at');
    if (!tournament.ends_at) missing.push('ends_at');
    
    if (!tournament.city && !tournament.venue_details) {
      missing.push('venue_details');
    }
    
    if (tournament.participation_type === 'team') {
      if (!tournament.min_teams) missing.push('min_teams');
      if (!tournament.max_teams) missing.push('max_teams');
      if (tournament.min_teams && tournament.max_teams && tournament.min_teams > tournament.max_teams) {
        errors.push('min_teams cannot exceed max_teams');
      }
    }

    if (tournament.registration_opens_at && tournament.registration_closes_at) {
      if (new Date(tournament.registration_opens_at) >= new Date(tournament.registration_closes_at)) {
        errors.push('registration_opens_at must be before registration_closes_at');
      }
    }

    if (tournament.starts_at && tournament.ends_at) {
      if (new Date(tournament.starts_at) > new Date(tournament.ends_at)) {
        errors.push('starts_at must be on or before ends_at');
      }
    }

    if (tournament.registration_closes_at && tournament.starts_at) {
      if (new Date(tournament.registration_closes_at) > new Date(tournament.starts_at)) {
        errors.push('registration_closes_at must be on or before starts_at');
      }
    }

    const valid = missing.length === 0 && errors.length === 0;

    return {
      valid,
      missing,
      errors
    };
  }

  // -------------------------------------------------------------------------
  // DELETE — draft-only, no dependent records
  // -------------------------------------------------------------------------

  /**
   * Permanently delete a tournament.
   * Only permitted when status = 'draft' and there are no registrations, fixtures, or matches.
   */
  async deleteTournament(tournamentId, requestingUser) {
    const tournament = await this.getTournament(tournamentId, requestingUser);

    const isAdmin = requestingUser.roles?.includes('ADMIN');
    const isOwner = tournament.organizer_user_id === requestingUser.id;

    if (!isAdmin && !isOwner) {
      throw this._forbidden('Only the organizer or an admin can delete a tournament');
    }

    if (tournament.status !== 'draft') {
      const err = new Error(
        `Cannot delete a tournament with status "${tournament.status}". ` +
        'Only draft tournaments with no registrations may be deleted. Use archive/cancel for published tournaments.'
      );
      err.statusCode = 409;
      throw err;
    }

    // Guard: no registrations
    const { rows: regRows } = await query(
      `SELECT id FROM tournament_registrations WHERE tournament_id = $1 LIMIT 1`,
      [tournamentId]
    );
    if (regRows.length > 0) {
      const err = new Error('Cannot delete a tournament that already has registrations. Use cancel/archive instead.');
      err.statusCode = 409;
      throw err;
    }

    // Guard: no fixtures or matches
    const { rows: fixRows } = await query(
      `SELECT id FROM fixtures WHERE tournament_id = $1 LIMIT 1`,
      [tournamentId]
    );
    if (fixRows.length > 0) {
      const err = new Error('Cannot delete a tournament that already has fixtures. Use cancel/archive instead.');
      err.statusCode = 409;
      throw err;
    }

    // Safe to delete
    await query(`DELETE FROM tournament_status_history WHERE tournament_id = $1`, [tournamentId]);
    await query(`DELETE FROM tournament_eligibility_rules WHERE tournament_id = $1`, [tournamentId]);
    await query(`DELETE FROM tournaments WHERE id = $1`, [tournamentId]);
  }

  // -------------------------------------------------------------------------
  // STATUS TRANSITION — validated, transactional, with history
  // -------------------------------------------------------------------------
  async transitionStatus(tournamentId, requestingUser, newStatus, reason = null) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Lock the row and get all fields for validation
      const lockRes = await client.query(
        `SELECT * FROM tournaments WHERE id = $1 FOR UPDATE`,
        [tournamentId]
      );
      if (!lockRes.rows.length) throw this._notFound('Tournament not found');

      const tournament = lockRes.rows[0];
      const isAdmin = requestingUser.roles?.includes('ADMIN');
      const isOwnOrganizer = requestingUser.id === tournament.organizer_user_id || requestingUser.id === tournament.co_organizer_user_id;

      if (!isAdmin && !isOwnOrganizer) {
        throw this._forbidden('Only the organizer, co-organizer, or an admin can change tournament status');
      }

      const currentStatus = tournament.status;
      const allowed = ALLOWED_TRANSITIONS[currentStatus] || [];

      if (!allowed.includes(newStatus)) {
        throw this._badRequest(
          `Cannot transition from "${currentStatus}" to "${newStatus}". ` +
          `Allowed transitions: ${allowed.length ? allowed.join(', ') : 'none'}`
        );
      }

      // Enforce configuration completeness for transitioning out of draft
      if (currentStatus === 'draft' && newStatus === 'registration_open') {
        const configCheck = this._checkConfigurationCompleteness(tournament);
        if (!configCheck.valid) {
          throw this._badRequest('Tournament configuration is incomplete or invalid. Missing: ' + 
                                 configCheck.missing.join(', ') + '. Errors: ' + configCheck.errors.join(', '));
        }
      }

      if (newStatus === 'in_progress') {
        const fixtureCheck = await client.query(
          'SELECT id FROM fixtures WHERE tournament_id = $1 LIMIT 1',
          [tournamentId]
        );
        if (!fixtureCheck.rows.length) {
          throw this._badRequest('Generate or add tournament fixtures before starting the tournament');
        }
      }

      // Update tournament status
      await client.query(
        `UPDATE tournaments SET status = $1 WHERE id = $2`,
        [newStatus, tournamentId]
      );

      // Insert history record
      await client.query(
        `INSERT INTO tournament_status_history
           (tournament_id, from_status, to_status, changed_by_user_id, reason)
         VALUES ($1, $2, $3, $4, $5)`,
        [tournamentId, currentStatus, newStatus, requestingUser.id, reason || null]
      );

      await client.query('COMMIT');
      return await this.getTournament(tournamentId, requestingUser);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  // -------------------------------------------------------------------------
  // CO-ORGANIZER MANAGEMENT
  // -------------------------------------------------------------------------
  async assignCoOrganizer(tournamentId, requestingUser, { email, user_id }) {
    const tournament = await this.getTournament(tournamentId, requestingUser);
    const isAdmin = requestingUser.roles?.includes('ADMIN');
    const isOwner = requestingUser.id === tournament.organizer_user_id;
    if (!isAdmin && !isOwner) {
      throw this._forbidden('Only the primary tournament organizer or an admin can assign a co-organizer');
    }

    let targetUser = null;
    if (user_id) {
      const uRes = await query('SELECT id, email FROM users WHERE id = $1', [user_id]);
      targetUser = uRes.rows[0];
    } else if (email) {
      const uRes = await query('SELECT id, email FROM users WHERE LOWER(email) = LOWER($1)', [email.trim()]);
      targetUser = uRes.rows[0];
    } else {
      throw this._badRequest('Email or user_id is required to assign a co-organizer');
    }

    if (!targetUser) {
      throw this._notFound('User not found. They must have a PlaySphere account first.');
    }

    if (targetUser.id === tournament.organizer_user_id) {
      throw this._badRequest('User is already the primary organizer of this tournament');
    }

    await query(
      'UPDATE tournaments SET co_organizer_user_id = $1, updated_at = NOW() WHERE id = $2',
      [targetUser.id, tournamentId]
    );

    // Also ensure co-organizer is an admin in the tournament community
    const commRes = await query('SELECT id FROM communities WHERE tournament_id = $1', [tournamentId]);
    if (commRes.rows[0]) {
      await query(
        `INSERT INTO community_members (community_id, user_id, role)
         VALUES ($1, $2, 'admin')
         ON CONFLICT (community_id, user_id) DO UPDATE SET role = 'admin'`,
        [commRes.rows[0].id, targetUser.id]
      );
    }

    return await this.getTournament(tournamentId, requestingUser);
  }

  async removeCoOrganizer(tournamentId, requestingUser) {
    const tournament = await this.getTournament(tournamentId, requestingUser);
    const isAdmin = requestingUser.roles?.includes('ADMIN');
    const isOwner = requestingUser.id === tournament.organizer_user_id;
    if (!isAdmin && !isOwner) {
      throw this._forbidden('Only the primary tournament organizer or an admin can remove a co-organizer');
    }

    await query(
      'UPDATE tournaments SET co_organizer_user_id = NULL, updated_at = NOW() WHERE id = $1',
      [tournamentId]
    );

    return await this.getTournament(tournamentId, requestingUser);
  }

  // -------------------------------------------------------------------------
  // COMMUNITY ANNOUNCEMENTS
  // -------------------------------------------------------------------------
  async postTournamentAnnouncement(tournamentId, requestingUser, { title, body }) {
    if (!title || !title.trim()) throw this._badRequest('Title is required');
    if (!body || !body.trim()) throw this._badRequest('Body is required');

    const tournament = await this.getTournament(tournamentId, requestingUser);
    const isAdmin = requestingUser.roles?.includes('ADMIN');
    const canManage = isAdmin || requestingUser.id === tournament.organizer_user_id || requestingUser.id === tournament.co_organizer_user_id;
    if (!canManage) {
      throw this._forbidden('Only tournament organizers, co-organizers, or admins can post official announcements');
    }

    const commRes = await query(
      'SELECT id FROM communities WHERE tournament_id = $1 AND is_active = TRUE LIMIT 1',
      [tournamentId]
    );
    if (!commRes.rows[0]) {
      throw this._notFound('No active community linked to this tournament');
    }
    const communityId = commRes.rows[0].id;

    // Ensure member
    await query(
      `INSERT INTO community_members (community_id, user_id, role)
       VALUES ($1, $2, 'admin')
       ON CONFLICT (community_id, user_id) DO UPDATE SET role = 'admin'`,
      [communityId, requestingUser.id]
    );

    const postRes = await query(
      `INSERT INTO posts (community_id, author_user_id, title, body, category, is_pinned)
       VALUES ($1, $2, $3, $4, 'event_announcement', TRUE)
       RETURNING id, title, body, category, is_pinned, created_at`,
      [communityId, requestingUser.id, title.trim(), body.trim()]
    );

    return postRes.rows[0];
  }
}

module.exports = new TournamentsService();
