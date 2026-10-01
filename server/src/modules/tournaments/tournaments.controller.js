const tournamentsService = require('./tournaments.service');
const { copilotService } = require('./copilot.service');

class TournamentsController {
  /**
   * GET /api/tournaments
   * Public: all published tournaments
   * ORGANIZER: own drafts + all published tournaments
   * ADMIN: all
   */
  async listTournaments(req, res) {
    const filters = {
      sport_id:          req.query.sport_id,
      status:            req.query.status,
      search:            req.query.search,
      organizer_user_id: req.query.organizer_user_id,
    };
    const tournaments = await tournamentsService.listTournaments(filters, req.user);
    res.json({ success: true, data: { tournaments } });
  }

  /**
   * GET /api/tournaments/:tournamentId
   */
  async getTournament(req, res) {
    const tournament = await tournamentsService.getTournament(
      req.params.tournamentId,
      req.user
    );
    res.json({ success: true, data: { tournament } });
  }

  async listPublicParticipants(req, res) {
    const participants = await tournamentsService.listPublicParticipants(
      req.params.tournamentId,
      req.user
    );
    res.json({ success: true, data: { participants } });
  }

  /**
   * POST /api/tournaments
   * ORGANIZER only — organizer_user_id always from req.user.id
   */
  async createTournament(req, res) {
    // Strip organizer_user_id from body — must NEVER trust client-supplied value
    const { organizer_user_id: _ignored, ...data } = req.body;
    const tournament = await tournamentsService.createTournament(req.user.id, data);
    res.status(201).json({ success: true, data: { tournament } });
  }

  /**
   * PATCH /api/tournaments/:tournamentId
   * Updates fields, or transitions status when `status` is present in body.
   */
  async updateTournament(req, res) {
    const tournament = await tournamentsService.updateTournament(
      req.params.tournamentId,
      req.user,
      req.body
    );
    res.json({ success: true, data: { tournament } });
  }

  /**
   * GET /api/tournaments/:tournamentId/configuration/validation
   * Checks if tournament is ready to be published
   */
  async validateConfiguration(req, res) {
    const validation = await tournamentsService.validateConfiguration(
      req.params.tournamentId,
      req.user
    );
    res.json({ success: true, data: validation });
  }
  /**
   * DELETE /api/tournaments/:tournamentId
   * Only permitted for draft tournaments with no dependent records.
   */
  async deleteTournament(req, res) {
    await tournamentsService.deleteTournament(req.params.tournamentId, req.user);
    res.json({ success: true, message: 'Tournament deleted successfully' });
  }

  /**
   * POST /api/tournaments/copilot/draft
   * Generates a validated tournament draft from a plain-text prompt
   */
  async draftTournamentWithCopilot(req, res) {
    const { prompt } = req.body;
    const result = await copilotService.draftTournament(prompt, req.user);
    res.json({ success: true, data: result });
  }

  async assignCoOrganizer(req, res) {
    const tournament = await tournamentsService.assignCoOrganizer(
      req.params.tournamentId,
      req.user,
      req.body
    );
    res.json({ success: true, data: { tournament } });
  }

  async removeCoOrganizer(req, res) {
    const tournament = await tournamentsService.removeCoOrganizer(
      req.params.tournamentId,
      req.user
    );
    res.json({ success: true, data: { tournament } });
  }

  async postTournamentAnnouncement(req, res) {
    const post = await tournamentsService.postTournamentAnnouncement(
      req.params.tournamentId,
      req.user,
      req.body
    );
    res.status(201).json({ success: true, data: { post } });
  }
}

module.exports = new TournamentsController();
