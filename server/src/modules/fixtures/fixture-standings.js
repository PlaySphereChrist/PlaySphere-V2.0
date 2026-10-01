'use strict';

function calculateStandings(rows, registrations = []) {
  const byGroup = new Map();
  const ensureEntry = (groupNumber, registrationId, name) => {
    if (!byGroup.has(groupNumber)) byGroup.set(groupNumber, new Map());
    const entries = byGroup.get(groupNumber);
    if (!entries.has(registrationId)) {
      entries.set(registrationId, {
        registration_id: registrationId,
        name: name || registrationId,
        played: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        points: 0,
        scored: 0,
        conceded: 0,
        score_difference: 0
      });
    }
    return entries.get(registrationId);
  };

  for (const registration of registrations) {
    ensureEntry(registration.group_number, registration.registration_id, registration.name);
  }

  for (const row of rows) {
    const home = ensureEntry(row.group_number, row.home_registration_id, row.home_name);
    const away = ensureEntry(row.group_number, row.away_registration_id, row.away_name);
    const homeScore = Number(row.home_score?.numeric);
    const awayScore = Number(row.away_score?.numeric);
    if (!Number.isFinite(homeScore) || !Number.isFinite(awayScore)) {
      throw new Error('Group fixtures need numeric scores before standings can be calculated');
    }

    home.played += 1;
    away.played += 1;
    home.scored += homeScore;
    home.conceded += awayScore;
    away.scored += awayScore;
    away.conceded += homeScore;
    if (row.home_result === 'win') {
      home.wins += 1;
      home.points += 3;
      away.losses += 1;
    } else if (row.home_result === 'draw') {
      home.draws += 1;
      away.draws += 1;
      home.points += 1;
      away.points += 1;
    } else {
      home.losses += 1;
      away.wins += 1;
      away.points += 3;
    }
  }

  return [...byGroup.entries()]
    .sort((left, right) => left[0] - right[0])
    .map(([group_number, entries]) => {
      const table = [...entries.values()].map(entry => ({
        ...entry,
        score_difference: entry.scored - entry.conceded
      }));
      table.sort((left, right) =>
        right.points - left.points ||
        right.score_difference - left.score_difference ||
        right.scored - left.scored ||
        left.name.localeCompare(right.name)
      );
      return {
        group_number,
        standings: table.map((entry, index) => ({ ...entry, rank: index + 1 }))
      };
    });
}

module.exports = { calculateStandings };
