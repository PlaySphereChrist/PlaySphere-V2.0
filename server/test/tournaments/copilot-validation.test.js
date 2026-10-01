'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  validateAndEnrichDraft,
  extractHeuristicDraft,
  nextPowerOfTwo
} = require('../../src/modules/tournaments/copilot.service');

const mockSports = [
  { id: '11111111-1111-1111-1111-111111111111', name: 'Badminton', slug: 'badminton' },
  { id: '22222222-2222-2222-2222-222222222222', name: 'Football', slug: 'football' },
  { id: '33333333-3333-3333-3333-333333333333', name: 'Cricket', slug: 'cricket' }
];

const mockGrounds = [
  { id: 'g1', name: 'Netaji Subhash Turf', city: 'Bengaluru', address: 'Indiranagar' },
  { id: 'g2', name: 'Koramangala Indoor Court', city: 'Bengaluru', address: 'Koramangala' }
];

test('nextPowerOfTwo calculates correct power of 2', () => {
  assert.equal(nextPowerOfTwo(2), 2);
  assert.equal(nextPowerOfTwo(3), 4);
  assert.equal(nextPowerOfTwo(8), 8);
  assert.equal(nextPowerOfTwo(12), 16);
  assert.equal(nextPowerOfTwo(16), 16);
});

test('extractHeuristicDraft extracts sport, teams, prize, and eligibility from prompt', () => {
  const prompt = 'Indiranagar Monsoon Football Cup on Oct 10. 16 teams, knockout format, 2500 entry fee and 25000 prize pool. Players must be at least 16 years old.';
  const draft = extractHeuristicDraft(prompt, mockSports, mockGrounds);

  assert.equal(draft.sport_name, 'Football');
  assert.equal(draft.format, 'knockout');
  assert.equal(draft.max_teams, 16);
  assert.equal(draft.registration_fee, 2500);
  assert.equal(draft.prize_pool, 25000);
  assert.ok(draft.eligibility_rules.length > 0);
  assert.equal(draft.eligibility_rules[0].rule_type, 'min_age');
  assert.equal(draft.eligibility_rules[0].rule_value, '16');
});

test('validateAndEnrichDraft passes clean power-of-2 knockout bracket', () => {
  const rawDraft = {
    name: 'Bengaluru Open',
    sport_name: 'Football',
    format: 'knockout',
    max_teams: 16,
    min_teams: 8,
    registration_opens_at: '2026-10-01T09:00',
    registration_closes_at: '2026-10-08T18:00',
    starts_at: '2026-10-10T09:00',
    ends_at: '2026-10-12T18:00',
    city: 'Bengaluru'
  };

  const result = validateAndEnrichDraft(rawDraft, mockSports, mockGrounds);

  assert.equal(result.validation.valid, true);
  assert.equal(result.validation.errors.length, 0);

  const bracketCheck = result.validation.checklist.find(c => c.key === 'team_bracket');
  assert.equal(bracketCheck.status, 'pass');
});

test('validateAndEnrichDraft warns on non-power-of-2 knockout brackets', () => {
  const rawDraft = {
    name: 'Monsoon Knockout',
    sport_name: 'Football',
    format: 'knockout',
    max_teams: 12,
    registration_opens_at: '2026-10-01T09:00',
    registration_closes_at: '2026-10-08T18:00',
    starts_at: '2026-10-10T09:00',
    ends_at: '2026-10-12T18:00'
  };

  const result = validateAndEnrichDraft(rawDraft, mockSports, mockGrounds);

  const bracketCheck = result.validation.checklist.find(c => c.key === 'team_bracket');
  assert.equal(bracketCheck.status, 'warning');
  assert.match(bracketCheck.message, /4 automatic byes/);
});

test('validateAndEnrichDraft flags chronological date sequence violations', () => {
  const rawDraft = {
    name: 'Time Warp Cup',
    sport_name: 'Cricket',
    format: 'league',
    max_teams: 8,
    registration_opens_at: '2026-10-15T09:00',
    registration_closes_at: '2026-10-10T18:00', // Closes before it opens!
    starts_at: '2026-10-12T09:00',
    ends_at: '2026-10-14T18:00'
  };

  const result = validateAndEnrichDraft(rawDraft, mockSports, mockGrounds);

  assert.equal(result.validation.valid, false);
  assert.ok(result.validation.errors.length > 0);
  const dateCheck = result.validation.checklist.find(c => c.key === 'date_sequence');
  assert.equal(dateCheck.status, 'error');
});
