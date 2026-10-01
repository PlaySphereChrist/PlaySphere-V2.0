const casualGamesService = require('./casual-games.service');

class CasualGamesController {
  async listGames(req, res) {
    const filters = {
      sport_id: req.query.sport_id,
      status: req.user ? req.query.status : 'open',
      skill_level: req.query.skill_level,
      date: req.query.date,
      upcomingOnly: !req.user || req.query.upcoming_only === 'true',
      publicOnly: !req.user,
    };
    let games = await casualGamesService.listGames(filters);
    if (!req.user) {
      games = games.map(({ organized_by_user_id, ground_booking_id, creator_id, creator_profile_public, ...game }) => ({
        ...game,
        creator_name: creator_profile_public ? game.creator_name : 'Community organizer',
      }));
    }
    res.json({ success: true, data: { games } });
  }

  async getGame(req, res) {
    const gameId = req.params.gameId;
    let game = await casualGamesService.getGame(gameId);
    if (!req.user) {
      if (game.is_private) {
        const error = new Error('Casual game not found');
        error.statusCode = 404;
        throw error;
      }
      const { organized_by_user_id, ground_booking_id, creator_id, creator_profile_public, participants, ...publicGame } = game;
      game = {
        ...publicGame,
        creator_name: creator_profile_public ? game.creator_name : 'Community organizer',
        participants: participants.map(({ user_id, ...participant }) => participant),
      };
    }
    res.json({ success: true, data: { game } });
  }

  async createGame(req, res) {
    const userId = req.user.id;
    const game = await casualGamesService.createGame(userId, req.body);
    res.status(201).json({ success: true, data: { game } });
  }

  async updateGame(req, res) {
    const gameId = req.params.gameId;
    const userId = req.user.id;
    const game = await casualGamesService.updateGame(gameId, userId, req.body);
    res.json({ success: true, data: { game } });
  }

  async cancelGame(req, res) {
    const gameId = req.params.gameId;
    const userId = req.user.id;
    const result = await casualGamesService.cancelGame(gameId, userId);
    res.json(result);
  }

  async joinGame(req, res) {
    const gameId = req.params.gameId;
    const userId = req.user.id;
    const result = await casualGamesService.joinGame(gameId, userId);
    res.json(result);
  }

  async leaveGame(req, res) {
    const gameId = req.params.gameId;
    const userId = req.user.id;
    const result = await casualGamesService.leaveGame(gameId, userId);
    res.json(result);
  }
}

module.exports = new CasualGamesController();
