'use strict';

function nextPowerOfTwo(value) {
  let result = 1;
  while (result < value) result *= 2;
  return result;
}

function seededPositions(size) {
  if (size === 2) return [1, 2];
  const previous = seededPositions(size / 2);
  return previous.flatMap(seed => [seed, size + 1 - seed]);
}

function roundRobinRounds(registrationIds) {
  const slots = [...registrationIds];
  if (slots.length % 2) slots.push(null);
  const rounds = [];

  for (let round = 0; round < slots.length - 1; round += 1) {
    const fixtures = [];
    for (let index = 0; index < slots.length / 2; index += 1) {
      const left = slots[index];
      const right = slots[slots.length - 1 - index];
      if (left && right) {
        const swap = (round + index) % 2 === 1;
        fixtures.push(swap ? [right, left] : [left, right]);
      }
    }
    rounds.push(fixtures);
    slots.splice(1, 0, slots.pop());
  }

  return rounds;
}

function buildRoundRobin(registrationIds, stage, roundOffset = 0, groupNumber = null, namePrefix = '') {
  return roundRobinRounds(registrationIds).flatMap((pairs, roundIndex) => pairs.map((pair, fixtureIndex) => ({
    key: `${stage}-${groupNumber || 'all'}-r${roundIndex + 1}-m${fixtureIndex + 1}`,
    stage,
    round_number: roundOffset + roundIndex + 1,
    round_name: namePrefix ? `${namePrefix} — Round ${roundIndex + 1}` : `Round ${roundIndex + 1}`,
    match_number: fixtureIndex + 1,
    group_number: groupNumber,
    bracket_position: fixtureIndex + 1,
    home_registration_id: pair[0],
    away_registration_id: pair[1],
    status: 'scheduled'
  })));
}

function roundLabel(matchCount) {
  if (matchCount === 1) return 'Final';
  if (matchCount === 2) return 'Semifinal';
  if (matchCount === 4) return 'Quarterfinal';
  return `Round of ${matchCount * 2}`;
}

function buildKnockout(registrationIds, roundOffset = 0) {
  const bracketSize = nextPowerOfTwo(registrationIds.length);
  const rankToRegistration = new Map(registrationIds.map((registrationId, index) => [index + 1, registrationId]));
  const slots = seededPositions(bracketSize).map(seed => rankToRegistration.get(seed) || null);
  const roundCount = Math.log2(bracketSize);
  const rounds = [];
  let previousRound = null;

  for (let roundIndex = 0; roundIndex < roundCount; roundIndex += 1) {
    const matchCount = bracketSize / (2 ** (roundIndex + 1));
    const round = [];

    for (let position = 1; position <= matchCount; position += 1) {
      const home = roundIndex === 0 ? slots[(position - 1) * 2] : null;
      const away = roundIndex === 0 ? slots[(position - 1) * 2 + 1] : null;
      const key = `knockout-r${roundIndex + 1}-m${position}`;
      const fixture = {
        key,
        stage: 'knockout',
        round_number: roundOffset + roundIndex + 1,
        round_name: roundLabel(matchCount),
        match_number: position,
        group_number: null,
        bracket_position: position,
        home_registration_id: home,
        away_registration_id: away,
        status: home && away ? 'scheduled' : 'bye',
        winner_registration_id: home || away || null
      };
      if (previousRound) {
        const previousA = previousRound[(position - 1) * 2];
        const previousB = previousRound[(position - 1) * 2 + 1];
        previousA.winner_next_fixture_key = key;
        previousA.winner_next_side = 'home';
        previousB.winner_next_fixture_key = key;
        previousB.winner_next_side = 'away';
      }

      round.push(fixture);
    }

    rounds.push(round);
    previousRound = round;
  }

  // Resolve any first-round byes now. Deeper byes can only arise when a bye
  // feeds an already-advanced participant, so this loop propagates them too.
  const allFixtures = rounds.flat();
  let changed = true;
  while (changed) {
    changed = false;
    for (const fixture of allFixtures) {
      if (fixture.status !== 'bye' || !fixture.winner_registration_id || !fixture.winner_next_fixture_key) continue;
      const next = allFixtures.find(candidate => candidate.key === fixture.winner_next_fixture_key);
      const side = fixture.winner_next_side;
      if (!next || next[`${side}_registration_id`] === fixture.winner_registration_id) continue;
      next[`${side}_registration_id`] = fixture.winner_registration_id;
      if (!next.home_registration_id || !next.away_registration_id) {
        next.status = 'bye';
        next.winner_registration_id = next.home_registration_id || next.away_registration_id;
      } else {
        next.status = 'scheduled';
        next.winner_registration_id = null;
      }
      changed = true;
    }
  }

  return { fixtures: rounds.flat(), round_count: roundCount };
}

function buildDoubleElimination(registrationIds) {
  const winners = buildKnockout(registrationIds);
  const winnerRounds = Array.from({ length: winners.round_count }, (_, index) =>
    winners.fixtures.filter(fixture => fixture.round_number === index + 1)
  );
  winnerRounds.forEach(round => {
    round.forEach(fixture => {
      fixture.stage = 'double_elimination_winners';
      fixture.round_name = `Winners ${roundLabel(round.length)}`;
    });
  });

  if (winners.round_count < 2) return winners.fixtures;

  const bracketSize = nextPowerOfTwo(registrationIds.length);
  const loserRoundCount = (winners.round_count - 1) * 2;
  const loserRounds = [];
  for (let roundIndex = 1; roundIndex <= loserRoundCount; roundIndex += 1) {
    const pairNumber = Math.floor((roundIndex - 1) / 2) + 1;
    const matchCount = bracketSize / (2 ** (pairNumber + 1));
    const round = Array.from({ length: matchCount }, (_, index) => ({
      key: `losers-r${roundIndex}-m${index + 1}`,
      stage: 'double_elimination_losers',
      round_number: winners.round_count + roundIndex,
      round_name: `Losers Round ${roundIndex}`,
      match_number: index + 1,
      group_number: null,
      bracket_position: index + 1,
      home_registration_id: null,
      away_registration_id: null,
      status: 'scheduled',
      winner_registration_id: null
    }));
    loserRounds.push(round);
  }

  // First losers round pairs opponents from adjacent winners-bracket matches.
  for (let position = 0; position < winnerRounds[0].length; position += 1) {
    const loserFixture = loserRounds[0][Math.floor(position / 2)];
    const winnerFixture = winnerRounds[0][position];
    winnerFixture.loser_next_fixture_key = loserFixture.key;
    winnerFixture.loser_next_side = position % 2 === 0 ? 'home' : 'away';
  }

  // Each later winners-bracket loss drops into an even losers round. The
  // preceding losers round winner takes the other side of that fixture.
  for (let winnerRoundNumber = 2; winnerRoundNumber <= winners.round_count; winnerRoundNumber += 1) {
    const winnerRound = winnerRounds[winnerRoundNumber - 1];
    const mergeRoundIndex = (winnerRoundNumber - 1) * 2 - 1;
    const mergeRound = loserRounds[mergeRoundIndex];
    const priorLosersRound = loserRounds[mergeRoundIndex - 1];

    winnerRound.forEach((fixture, index) => {
      fixture.loser_next_fixture_key = mergeRound[index].key;
      fixture.loser_next_side = 'away';
      const priorFixture = priorLosersRound[index];
      priorFixture.winner_next_fixture_key = mergeRound[index].key;
      priorFixture.winner_next_side = 'home';
    });

    if (winnerRoundNumber < winners.round_count) {
      const reductionRound = loserRounds[mergeRoundIndex + 1];
      mergeRound.forEach((fixture, index) => {
        fixture.winner_next_fixture_key = reductionRound[Math.floor(index / 2)].key;
        fixture.winner_next_side = index % 2 === 0 ? 'home' : 'away';
      });
    }
  }

  // A losers-round fixture with no possible first-round losers is not played.
  // Marking it cancelled lets a later loss advance automatically past it.
  loserRounds[0].forEach((fixture, index) => {
    const firstSourceFixtures = winnerRounds[0].slice(index * 2, index * 2 + 2);
    if (firstSourceFixtures.length === 2 && firstSourceFixtures.every(source => source.status === 'bye')) {
      fixture.status = 'cancelled';
    }
  });

  const finalKey = 'double-elimination-grand-final';
  const resetKey = 'double-elimination-grand-final-reset';
  const winnerFinal = winnerRounds[winnerRounds.length - 1][0];
  const loserFinal = loserRounds[loserRounds.length - 1][0];
  winnerFinal.winner_next_fixture_key = finalKey;
  winnerFinal.winner_next_side = 'home';
  loserFinal.winner_next_fixture_key = finalKey;
  loserFinal.winner_next_side = 'away';
  const grandFinal = {
    key: finalKey,
    stage: 'grand_final',
    round_number: winners.round_count + loserRoundCount + 1,
    round_name: 'Grand Final',
    match_number: 1,
    group_number: null,
    bracket_position: 1,
    home_registration_id: null,
    away_registration_id: null,
    status: 'scheduled',
    winner_registration_id: null
  };
  const resetFinal = {
    key: resetKey,
    stage: 'grand_final_reset',
    round_number: winners.round_count + loserRoundCount + 2,
    round_name: 'Grand Final Reset (if needed)',
    match_number: 1,
    group_number: null,
    bracket_position: 1,
    home_registration_id: null,
    away_registration_id: null,
    status: 'cancelled',
    winner_registration_id: null
  };

  return [...winners.fixtures, ...loserRounds.flat(), grandFinal, resetFinal];
}

function distributeGroups(registrationIds, groupSize = 4) {
  const groupCount = Math.ceil(registrationIds.length / groupSize);
  const groups = Array.from({ length: groupCount }, () => []);
  registrationIds.forEach((registrationId, index) => {
    const row = Math.floor(index / groupCount);
    const column = index % groupCount;
    const groupIndex = row % 2 === 0 ? column : groupCount - column - 1;
    groups[groupIndex].push(registrationId);
  });
  return groups;
}

function generateFixtures({ format, registrations, groupSize = 4 }) {
  const ids = registrations.map(registration => registration.id);
  if (!['league', 'round_robin', 'knockout', 'group_stage_knockout', 'double_elimination'].includes(format)) {
    throw new Error(`Fixture generation for ${format} tournaments is not available yet`);
  }

  if (format === 'knockout') return buildKnockout(ids).fixtures;
  if (format === 'double_elimination') return buildDoubleElimination(ids);
  if (format === 'league' || format === 'round_robin') {
    return buildRoundRobin(ids, format === 'league' ? 'league' : 'round_robin');
  }

  const groups = distributeGroups(ids, groupSize);
  const groupFixtures = groups.flatMap((members, index) =>
    buildRoundRobin(members, 'group', 0, index + 1, `Group ${String.fromCharCode(64 + index + 1)}`)
  );
  const groupRoundCount = Math.max(...groups.map(group => group.length - 1));
  const qualifiedCount = groups.length * 2;
  const placeholders = Array.from({ length: qualifiedCount }, (_, index) => `qualifier-${index + 1}`);
  const knockout = buildKnockout(placeholders, groupRoundCount);

  // Qualifiers are populated from standings once every group match is final.
  // Preserve the stable seed slots for the advancement service.
  knockout.fixtures.forEach(fixture => {
    fixture.home_registration_id = null;
    fixture.away_registration_id = null;
    fixture.winner_registration_id = null;
    fixture.status = 'scheduled';
  });

  return [...groupFixtures, ...knockout.fixtures];
}

module.exports = {
  buildKnockout,
  buildDoubleElimination,
  buildRoundRobin,
  distributeGroups,
  generateFixtures,
  roundRobinRounds,
  seededPositions
};
