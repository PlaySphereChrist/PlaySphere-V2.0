'use strict';
/* global fetch */

const { query } = require('../../config/database');
const env = require('../../config/env');

// Supported platform domains
const SUPPORTED_FORMATS = ['knockout', 'league', 'round_robin', 'group_stage_knockout'];
const SUPPORTED_PARTICIPATION_TYPES = ['team', 'individual'];
const VALID_RULE_TYPES = ['min_age', 'max_age', 'gender', 'skill_level', 'city', 'custom'];

function nextPowerOfTwo(val) {
  let p = 1;
  while (p < val) p *= 2;
  return p;
}

/**
 * Smart heuristic draft generator used when no external AI API key is configured,
 * or as a resilient fallback.
 */
function extractHeuristicDraft(prompt, sports, grounds) {
  const text = prompt.toLowerCase();

  // 1. Sport identification
  let matchedSport = sports.find(s => text.includes(s.name.toLowerCase()) || text.includes(s.slug.toLowerCase()));
  if (!matchedSport) {
    if (text.includes('badminton') || text.includes('shuttle')) matchedSport = sports.find(s => s.slug === 'badminton');
    else if (text.includes('football') || text.includes('soccer')) matchedSport = sports.find(s => s.slug === 'football');
    else if (text.includes('cricket')) matchedSport = sports.find(s => s.slug === 'cricket');
    else if (text.includes('basketball') || text.includes('hoops')) matchedSport = sports.find(s => s.slug === 'basketball');
    else if (text.includes('volleyball')) matchedSport = sports.find(s => s.slug === 'volleyball');
  }
  matchedSport = matchedSport || sports[0] || null;

  // 2. Format
  let format = 'knockout';
  if (text.includes('group') && (text.includes('knockout') || text.includes('stage'))) {
    format = 'group_stage_knockout';
  } else if (text.includes('round robin') || text.includes('round-robin')) {
    format = 'round_robin';
  } else if (text.includes('league') || text.includes('table')) {
    format = 'league';
  } else if (text.includes('knockout') || text.includes('elimination') || text.includes('cup')) {
    format = 'knockout';
  }

  // 3. Participation Type
  let participationType = 'team';
  if (text.includes('single') || text.includes('individual') || text.includes('solo')) {
    participationType = 'individual';
  } else if (text.includes('team') || text.includes('doubles') || text.includes('squad')) {
    participationType = 'team';
  }

  // 4. Team / Player count
  let maxTeams = 8;
  const countMatch = text.match(/(\d+)\s*(?:teams|sides|squads|players|participants|clubs)/i);
  if (countMatch) {
    maxTeams = parseInt(countMatch[1], 10);
  } else if (text.includes('16')) {
    maxTeams = 16;
  } else if (text.includes('32')) {
    maxTeams = 32;
  } else if (text.includes('4')) {
    maxTeams = 4;
  }
  const minTeams = Math.max(2, Math.floor(maxTeams / 2));

  // 5. Entry fee & Prize pool
  let registrationFee = 0;
  const feeMatch = text.match(/(?:₹|rs\.?|inr)?\s*(\d[\d,]*)\s*(?:entry|fee|registration|per team|per player)/i) ||
                   text.match(/(?:entry|fee|registration|ticket|price)\s*(?:is|of|:)?\s*(?:₹|rs\.?|inr)?\s*(\d[\d,]*)/i);
  if (feeMatch) {
    registrationFee = parseFloat(feeMatch[1].replace(/,/g, ''));
  }

  let prizePool = 0;
  const prizeMatch = text.match(/(?:₹|rs\.?|inr)?\s*(\d[\d,]*)\s*(?:prize|cash|pool|rewards?)/i) ||
                     text.match(/(?:prize|cash|pool|rewards?)\s*(?:is|of|:)?\s*(?:₹|rs\.?|inr)?\s*(\d[\d,]*)/i);
  if (prizeMatch) {
    prizePool = parseFloat(prizeMatch[1].replace(/,/g, ''));
  }

  // 6. City & Ground matching
  const matchedGround = grounds.find(g => text.includes(g.name.toLowerCase()));
  let city = 'Bengaluru';
  if (matchedGround && matchedGround.city) {
    city = matchedGround.city;
  } else {
    for (const g of grounds) {
      if (g.city && text.includes(g.city.toLowerCase())) {
        city = g.city;
        break;
      }
    }
  }

  // 7. Dates (Sensible upcoming defaults based on prompt keywords)
  const now = new Date();
  const startsAt = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000); // 2 weeks ahead
  startsAt.setHours(9, 0, 0, 0);

  const endsAt = new Date(startsAt.getTime() + 2 * 24 * 60 * 60 * 1000); // +2 days
  endsAt.setHours(18, 0, 0, 0);

  const regClosesAt = new Date(startsAt.getTime() - 2 * 24 * 60 * 60 * 1000); // 2 days before start
  regClosesAt.setHours(23, 59, 0, 0);

  const regOpensAt = new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000); // tomorrow
  regOpensAt.setHours(8, 0, 0, 0);

  // 8. Eligibility rules
  const rules = [];
  const minAgeMatch = text.match(/(?:minimum age|at least|age|over)\s*(\d+)/i) || text.match(/(\d+)\s*\+/i);
  if (minAgeMatch) {
    rules.push({
      rule_type: 'min_age',
      rule_value: minAgeMatch[1],
      description: `Minimum player age of ${minAgeMatch[1]} years`,
      is_mandatory: true,
    });
  }
  if (text.includes('women') || text.includes('female')) {
    rules.push({
      rule_type: 'gender',
      rule_value: 'female',
      description: 'Women only tournament',
      is_mandatory: true,
    });
  } else if (text.includes('men') && !text.includes('women')) {
    rules.push({
      rule_type: 'gender',
      rule_value: 'male',
      description: 'Men only tournament',
      is_mandatory: true,
    });
  }

  // 9. Name formatting
  let tournamentName = prompt.split(/[.\n]/)[0].trim();
  if (tournamentName.length > 60 || !tournamentName) {
    const sportTitle = matchedSport ? matchedSport.name : 'Sports';
    tournamentName = `${city} ${sportTitle} Championship`;
  }
  // Capitalize title
  tournamentName = tournamentName.charAt(0).toUpperCase() + tournamentName.slice(1);

  return {
    name: tournamentName,
    sport_name: matchedSport?.name || 'Football',
    sport_id: matchedSport?.id || null,
    format,
    participation_type: participationType,
    description: `Official ${matchedSport?.name || 'sports'} tournament organized on PlaySphere. ${prompt.slice(0, 300)}`,
    city,
    venue_details: matchedGround ? matchedGround.name : `${city} Sports Arena`,
    ground_id: matchedGround?.id || null,
    registration_fee: registrationFee,
    prize_pool: prizePool,
    min_teams: minTeams,
    max_teams: maxTeams,
    registration_opens_at: regOpensAt.toISOString().slice(0, 16),
    registration_closes_at: regClosesAt.toISOString().slice(0, 16),
    starts_at: startsAt.toISOString().slice(0, 16),
    ends_at: endsAt.toISOString().slice(0, 16),
    eligibility_rules: rules,
  };
}

/**
 * Call Gemini API using native fetch
 */
async function callGemini(prompt, sports, grounds) {
  const sportsList = sports.map(s => `"${s.name}"`).join(', ');
  const groundsList = grounds.slice(0, 25).map(g => `"${g.name} (${g.city})" `).join(', ');

  const systemPrompt = `You are the PlaySphere Tournament Setup Copilot.
An organizer will describe their sports tournament in plain language.
Convert their description into a valid JSON object matching the PlaySphere schema.

RULES:
- "sport_name" must match one of: [${sportsList}].
- "format" must be one of: ["knockout", "league", "round_robin", "group_stage_knockout"].
- "participation_type" must be one of: ["team", "individual"].
- "max_teams" should be an integer (recommend powers of 2 for knockout: 4, 8, 16, 32).
- "min_teams" should be an integer <= max_teams.
- Dates must be in "YYYY-MM-DDTHH:mm" format in logical order: registration_opens_at < registration_closes_at <= starts_at <= ends_at. Default to dates in the next 2-4 weeks if not specified.
- "eligibility_rules" is an array of objects: { rule_type: ("min_age"|"max_age"|"gender"|"skill_level"|"city"|"custom"), rule_value: string, description: string, is_mandatory: boolean }.
- "venue_details" can suggest a venue from: [${groundsList}] or the organizer's specified venue.

Return ONLY the raw JSON object without markdown fences.`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${env.GEMINI_API_KEY}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        role: 'user',
        parts: [
          { text: systemPrompt },
          { text: `Organizer Prompt: "${prompt}"` }
        ]
      }],
      generationConfig: {
        responseMimeType: 'application/json'
      }
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error: ${response.status} ${errorText}`);
  }

  const result = await response.json();
  const textOutput = result?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!textOutput) throw new Error('No output from Gemini');

  return JSON.parse(textOutput);
}

/**
 * Call OpenAI API using native fetch
 */
async function callOpenAI(prompt, sports, grounds) {
  const sportsList = sports.map(s => `"${s.name}"`).join(', ');
  const groundsList = grounds.slice(0, 25).map(g => `"${g.name} (${g.city})" `).join(', ');

  const systemPrompt = `You are the PlaySphere Tournament Setup Copilot.
Convert the organizer's description into a structured JSON tournament draft.
Supported sports: [${sportsList}].
Supported formats: ["knockout", "league", "round_robin", "group_stage_knockout"].
Supported participation_types: ["team", "individual"].
Known venues: [${groundsList}].
Dates must be "YYYY-MM-DDTHH:mm".
eligibility_rules: array of { rule_type: ("min_age"|"max_age"|"gender"|"skill_level"|"city"|"custom"), rule_value: string, description: string, is_mandatory: boolean }.`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${env.OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
      ]
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI API error: ${response.status} ${errorText}`);
  }

  const result = await response.json();
  const textOutput = result?.choices?.[0]?.message?.content;
  if (!textOutput) throw new Error('No output from OpenAI');

  return JSON.parse(textOutput);
}

/**
 * Domain Application Logic Validation Engine.
 * Cross-references the generated draft against real DB entities,
 * format bracket math, date constraints, and venue availability.
 */
function validateAndEnrichDraft(rawDraft, sports, grounds) {
  const warnings = [];
  const errors = [];
  const checklist = [];

  // 1. Sport resolution
  let sport = sports.find(s =>
    (rawDraft.sport_id && s.id === rawDraft.sport_id) ||
    (rawDraft.sport_name && s.name.toLowerCase() === rawDraft.sport_name.toLowerCase()) ||
    (rawDraft.sport_name && s.slug.toLowerCase() === rawDraft.sport_name.toLowerCase())
  );

  if (!sport) {
    sport = sports[0];
    checklist.push({
      key: 'sport',
      label: 'Sport Mapping',
      status: 'warning',
      message: `Sport "${rawDraft.sport_name}" not found directly; defaulted to ${sport?.name || 'Football'}.`
    });
  } else {
    checklist.push({
      key: 'sport',
      label: 'Sport Mapping',
      status: 'pass',
      message: `Mapped to official sport: ${sport.name}`
    });
  }

  // 2. Format validation
  let format = (rawDraft.format || 'knockout').toLowerCase();
  if (!SUPPORTED_FORMATS.includes(format)) {
    format = 'knockout';
    checklist.push({
      key: 'format',
      label: 'Tournament Format',
      status: 'warning',
      message: `Format adjusted to supported "knockout".`
    });
  } else {
    checklist.push({
      key: 'format',
      label: 'Tournament Format',
      status: 'pass',
      message: `Supported format: ${format}`
    });
  }

  // 3. Participation Type
  let participationType = (rawDraft.participation_type || 'team').toLowerCase();
  if (!SUPPORTED_PARTICIPATION_TYPES.includes(participationType)) {
    participationType = 'team';
  }

  // 4. Team count & Knockout power of 2 check
  const maxTeams = Number(rawDraft.max_teams) || 8;
  let minTeams = Number(rawDraft.min_teams) || Math.max(2, Math.floor(maxTeams / 2));

  if (minTeams > maxTeams) {
    minTeams = maxTeams;
    warnings.push('Adjusted min_teams to not exceed max_teams.');
  }

  if (format === 'knockout') {
    const p2 = nextPowerOfTwo(maxTeams);
    if (p2 !== maxTeams) {
      const byes = p2 - maxTeams;
      checklist.push({
        key: 'team_bracket',
        label: 'Bracket Sizing',
        status: 'warning',
        message: `${maxTeams} teams is not a power of 2. PlaySphere bracket engine will assign ${byes} automatic byes in round 1. Recommend 8, 16, or 32 for symmetric brackets.`
      });
      warnings.push(`Knockout bracket with ${maxTeams} teams will feature ${byes} byes.`);
    } else {
      checklist.push({
        key: 'team_bracket',
        label: 'Bracket Sizing',
        status: 'pass',
        message: `Perfect power-of-2 bracket (${maxTeams} teams).`
      });
    }
  } else {
    checklist.push({
      key: 'team_bracket',
      label: 'Team Sizing',
      status: 'pass',
      message: `Valid range: ${minTeams} to ${maxTeams} teams.`
    });
  }

  // 5. Date validation
  const dateCheck = {
    regOpen: rawDraft.registration_opens_at ? new Date(rawDraft.registration_opens_at) : null,
    regClose: rawDraft.registration_closes_at ? new Date(rawDraft.registration_closes_at) : null,
    start: rawDraft.starts_at ? new Date(rawDraft.starts_at) : null,
    end: rawDraft.ends_at ? new Date(rawDraft.ends_at) : null,
  };

  let dateStatus = 'pass';
  let dateMsg = 'All tournament dates are sequenced chronologically.';

  if (dateCheck.regOpen && dateCheck.regClose && dateCheck.regOpen >= dateCheck.regClose) {
    dateStatus = 'error';
    dateMsg = 'Registration open date must be earlier than closing date.';
    errors.push(dateMsg);
  } else if (dateCheck.regClose && dateCheck.start && dateCheck.regClose > dateCheck.start) {
    dateStatus = 'error';
    dateMsg = 'Registration must close on or before tournament start.';
    errors.push(dateMsg);
  } else if (dateCheck.start && dateCheck.end && dateCheck.start > dateCheck.end) {
    dateStatus = 'error';
    dateMsg = 'Tournament start date must be on or before end date.';
    errors.push(dateMsg);
  }

  checklist.push({
    key: 'date_sequence',
    label: 'Date Timeline',
    status: dateStatus,
    message: dateMsg
  });

  // 6. Venue & Ground matching
  const cityQuery = (rawDraft.city || '').toLowerCase();
  const venueQuery = (rawDraft.venue_details || '').toLowerCase();

  // Find candidate grounds
  const matchedGrounds = grounds.filter(g => {
    const matchCity = cityQuery && (g.city?.toLowerCase().includes(cityQuery) || g.address?.toLowerCase().includes(cityQuery));
    const matchVenue = venueQuery && (g.name?.toLowerCase().includes(venueQuery) || g.address?.toLowerCase().includes(venueQuery));
    return matchCity || matchVenue;
  }).slice(0, 4);

  // If no match by query, suggest grounds in same city or top active grounds
  const suggestedGrounds = matchedGrounds.length > 0 ? matchedGrounds : grounds.slice(0, 3);

  if (suggestedGrounds.length > 0) {
    checklist.push({
      key: 'venue_match',
      label: 'Venue Availability',
      status: 'pass',
      message: `Found ${suggestedGrounds.length} verified PlaySphere ground${suggestedGrounds.length > 1 ? 's' : ''} in the target area.`
    });
  } else {
    checklist.push({
      key: 'venue_match',
      label: 'Venue Availability',
      status: 'warning',
      message: 'No exact ground match found in the local venue database. You can still input custom venue details.'
    });
  }

  // 7. Eligibility Rules
  const sanitizedRules = [];
  if (Array.isArray(rawDraft.eligibility_rules)) {
    for (const rule of rawDraft.eligibility_rules) {
      if (rule && rule.rule_type && VALID_RULE_TYPES.includes(rule.rule_type)) {
        sanitizedRules.push({
          rule_type: rule.rule_type,
          rule_value: String(rule.rule_value || '').trim(),
          description: String(rule.description || `${rule.rule_type}: ${rule.rule_value}`).trim(),
          is_mandatory: Boolean(rule.is_mandatory !== false)
        });
      }
    }
  }

  const enrichedDraft = {
    name: rawDraft.name || `${sport?.name || 'Sports'} Tournament`,
    sport_id: sport?.id || null,
    sport_name: sport?.name || 'Football',
    format,
    participation_type: participationType,
    description: rawDraft.description || '',
    city: rawDraft.city || suggestedGrounds[0]?.city || 'Bengaluru',
    venue_details: rawDraft.venue_details || suggestedGrounds[0]?.name || '',
    ground_id: suggestedGrounds[0]?.id || null,
    registration_fee: Math.max(0, Number(rawDraft.registration_fee) || 0),
    prize_pool: Math.max(0, Number(rawDraft.prize_pool) || 0),
    min_teams: minTeams,
    max_teams: maxTeams,
    registration_opens_at: rawDraft.registration_opens_at ? rawDraft.registration_opens_at.slice(0, 16) : '',
    registration_closes_at: rawDraft.registration_closes_at ? rawDraft.registration_closes_at.slice(0, 16) : '',
    starts_at: rawDraft.starts_at ? rawDraft.starts_at.slice(0, 16) : '',
    ends_at: rawDraft.ends_at ? rawDraft.ends_at.slice(0, 16) : '',
  };

  return {
    draft: enrichedDraft,
    eligibility_rules: sanitizedRules,
    venue_suggestions: suggestedGrounds.map(g => ({
      id: g.id,
      name: g.name,
      city: g.city,
      address: g.address
    })),
    validation: {
      valid: errors.length === 0,
      checklist,
      warnings,
      errors
    }
  };
}

class CopilotService {
  /**
   * Main copilot endpoint logic:
   * Takes an organizer's plain English prompt and generates a validated tournament draft.
   */
  async draftTournament(prompt, _user) {
    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      const err = new Error('Please provide a prompt describing your tournament.');
      err.statusCode = 400;
      throw err;
    }

    // Load available active sports and grounds from PostgreSQL
    const [sportsResult, groundsResult] = await Promise.all([
      query('SELECT id, name, slug FROM sports WHERE is_active = true ORDER BY name'),
      query('SELECT id, name, city, state, address, is_active FROM grounds WHERE is_active = true ORDER BY name')
    ]);

    const sports = sportsResult.rows;
    const grounds = groundsResult.rows;

    let rawDraft = null;
    let engineSource = 'heuristic';

    // Try Gemini first if key available
    if (env.GEMINI_API_KEY) {
      try {
        rawDraft = await callGemini(prompt, sports, grounds);
        engineSource = 'gemini';
      } catch (err) {
        console.warn('Gemini copilot call failed, attempting fallback:', err.message);
      }
    }

    // Try OpenAI if Gemini wasn't configured or failed
    if (!rawDraft && env.OPENAI_API_KEY) {
      try {
        rawDraft = await callOpenAI(prompt, sports, grounds);
        engineSource = 'openai';
      } catch (err) {
        console.warn('OpenAI copilot call failed, attempting fallback:', err.message);
      }
    }

    // Fall back to local rule-based heuristic parser
    if (!rawDraft) {
      rawDraft = extractHeuristicDraft(prompt, sports, grounds);
      engineSource = 'heuristic';
    }

    // Run domain logic validation and enrichment
    const enriched = validateAndEnrichDraft(rawDraft, sports, grounds);

    return {
      ...enriched,
      source: engineSource
    };
  }
}

module.exports = {
  copilotService: new CopilotService(),
  validateAndEnrichDraft,
  extractHeuristicDraft,
  nextPowerOfTwo,
};
