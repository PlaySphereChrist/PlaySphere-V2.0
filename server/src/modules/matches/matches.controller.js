const matchesService = require('./matches.service');

exports.getTournamentMatches = async (req, res) => {
  const matches = await matchesService.getTournamentMatches(req.params.tournamentId, req.user);
  res.status(200).json({ success: true, data: { matches } });
};

exports.getMatch = async (req, res) => {
  const match = await matchesService.getMatch(req.params.matchId, req.user);
  res.status(200).json({ success: true, data: { match } });
};

exports.getMatchParticipants = async (req, res) => {
  const participants = await matchesService.getMatchParticipants(req.params.matchId, req.user);
  res.status(200).json({ success: true, data: { participants } });
};

exports.createMatchFromFixture = async (req, res) => {
  const match = await matchesService.createMatchFromFixture(
    req.params.tournamentId,
    req.params.fixtureId,
    req.body,
    req.user
  );
  res.status(201).json({ success: true, data: { match } });
};

exports.startMatch = async (req, res) => {
  const match = await matchesService.startMatch(req.params.matchId, req.user);
  res.status(200).json({ success: true, data: { match } });
};

exports.completeMatch = async (req, res) => {
  const match = await matchesService.completeMatch(req.params.matchId, req.body, req.user);
  res.status(200).json({ success: true, data: { match } });
};

exports.cancelMatch = async (req, res) => {
  const match = await matchesService.cancelMatch(req.params.matchId, req.body, req.user);
  res.status(200).json({ success: true, data: { match } });
};

// Captain Score Reports
exports.getMatchScoreReports = async (req, res) => {
  const reports = await matchesService.getMatchScoreReports(req.params.matchId, req.user);
  res.status(200).json({ success: true, data: { reports } });
};

exports.submitMatchScoreReport = async (req, res) => {
  const report = await matchesService.submitMatchScoreReport(req.params.matchId, req.body, req.user);
  res.status(201).json({ success: true, data: { report } });
};

exports.confirmMatchScoreReport = async (req, res) => {
  const result = await matchesService.confirmMatchScoreReport(req.params.matchId, req.params.reportId, req.user);
  res.status(200).json({ success: true, data: result });
};

exports.rejectMatchScoreReport = async (req, res) => {
  const report = await matchesService.rejectMatchScoreReport(req.params.matchId, req.params.reportId, req.body?.reason, req.user);
  res.status(200).json({ success: true, data: { report } });
};

exports.recordMatchScore = async (req, res) => {
  const match = await matchesService.recordMatchScore(req.params.matchId, req.body, req.user);
  res.status(200).json({ success: true, data: { match } });
};
