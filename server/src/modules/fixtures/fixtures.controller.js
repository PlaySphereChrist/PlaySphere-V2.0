const fixturesService = require('./fixtures.service');

exports.getTournamentFixtures = async (req, res) => {
  const fixtures = await fixturesService.getTournamentFixtures(req.params.tournamentId, req.user);
  res.status(200).json({ success: true, data: { fixtures } });
};

exports.generateTournamentFixtures = async (req, res) => {
  const result = await fixturesService.generateTournamentFixtures(
    req.params.tournamentId,
    req.body || {},
    req.user
  );
  res.status(201).json({ success: true, data: result });
};

exports.getTournamentStandings = async (req, res) => {
  const standings = await fixturesService.getTournamentStandings(req.params.tournamentId, req.user);
  res.status(200).json({ success: true, data: { standings } });
};

exports.updateFixtureSchedule = async (req, res) => {
  const fixture = await fixturesService.updateFixtureSchedule(
    req.params.tournamentId,
    req.params.fixtureId,
    req.body || {},
    req.user
  );
  res.status(200).json({ success: true, data: { fixture } });
};
