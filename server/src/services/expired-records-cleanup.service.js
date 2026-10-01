'use strict';

const { pool } = require('../config/database');
const { GROUND_TIME_ZONE } = require('../utils/ground-time');

// Timers target the next known expiry exactly. This interval only reconciles
// direct database changes that bypass the API's wake() hooks.
const RESCAN_INTERVAL_MS = 5 * 60_000;
const MIN_TIMER_DELAY_MS = 250;
const LOCK_NAMESPACE = 18473;
const LOCK_ID = 1;

let timer = null;
let running = false;
let stopped = true;
let wakeRequested = false;

async function cleanupExpiredRecords() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Prevent duplicate cleanup work when multiple API instances are running.
    const lock = await client.query(
      'SELECT pg_try_advisory_xact_lock($1, $2) AS acquired',
      [LOCK_NAMESPACE, LOCK_ID]
    );
    if (!lock.rows[0].acquired) {
      await client.query('COMMIT');
      return { skipped: true, slotsRemoved: 0, gamesRemoved: 0, nextExpiry: null };
    }

    const games = await client.query(`
      DELETE FROM casual_games game
      WHERE game.scheduled_at
              + make_interval(mins => COALESCE(game.duration_minutes, 0)) <= NOW()
        AND NOT EXISTS (
          SELECT 1 FROM matches match_record
          WHERE match_record.casual_game_id = game.id
        )
    `);

    const slots = await client.query(`
      DELETE FROM ground_booking_slots slot
      WHERE ((slot.slot_date + slot.end_time) AT TIME ZONE '${GROUND_TIME_ZONE}') <= NOW()
        AND NOT EXISTS (
          SELECT 1 FROM ground_bookings booking
          WHERE booking.slot_id = slot.id
        )
    `);

    const nextExpiry = await client.query(`
      SELECT MIN(expiry_at) AS next_expiry
      FROM (
        SELECT (slot.slot_date + slot.end_time) AT TIME ZONE '${GROUND_TIME_ZONE}' AS expiry_at
        FROM ground_booking_slots slot
        WHERE NOT EXISTS (
          SELECT 1 FROM ground_bookings booking WHERE booking.slot_id = slot.id
        )
        UNION ALL
        SELECT game.scheduled_at
                 + make_interval(mins => COALESCE(game.duration_minutes, 0)) AS expiry_at
        FROM casual_games game
        WHERE NOT EXISTS (
          SELECT 1 FROM matches match_record
          WHERE match_record.casual_game_id = game.id
        )
      ) expirations
      WHERE expiry_at > NOW()
    `);

    await client.query('COMMIT');
    return {
      skipped: false,
      slotsRemoved: slots.rowCount,
      gamesRemoved: games.rowCount,
      nextExpiry: nextExpiry.rows[0].next_expiry,
    };
  } catch (error) {
    try { await client.query('ROLLBACK'); } catch {}
    throw error;
  } finally {
    client.release();
  }
}

function schedule(delayMs) {
  if (stopped) return;
  if (timer) clearTimeout(timer);
  timer = setTimeout(runCycle, Math.max(MIN_TIMER_DELAY_MS, delayMs));
  timer.unref?.();
}

function nextDelay(expiry) {
  if (!expiry) return RESCAN_INTERVAL_MS;
  const timeUntilExpiry = new Date(expiry).getTime() - Date.now();
  return Math.min(RESCAN_INTERVAL_MS, Math.max(MIN_TIMER_DELAY_MS, timeUntilExpiry));
}

async function runCycle() {
  timer = null;
  if (stopped) return;
  if (running) {
    wakeRequested = true;
    return;
  }

  running = true;
  wakeRequested = false;
  let delay = RESCAN_INTERVAL_MS;
  try {
    const result = await cleanupExpiredRecords();
    delay = result.skipped ? RESCAN_INTERVAL_MS : nextDelay(result.nextExpiry);
    if (result.slotsRemoved || result.gamesRemoved) {
      console.log(
        `Expired inventory cleanup removed ${result.slotsRemoved} slots and ${result.gamesRemoved} casual games.`
      );
    }
  } catch (error) {
    console.error('Expired inventory cleanup failed:', error.message);
  } finally {
    running = false;
    if (!stopped) schedule(wakeRequested ? MIN_TIMER_DELAY_MS : delay);
  }
}

function start() {
  if (!stopped) return;
  stopped = false;
  void runCycle();
}

function wake() {
  if (stopped) return;
  if (running) {
    wakeRequested = true;
    return;
  }
  schedule(MIN_TIMER_DELAY_MS);
}

function stop() {
  stopped = true;
  wakeRequested = false;
  if (timer) clearTimeout(timer);
  timer = null;
}

module.exports = { cleanupExpiredRecords, start, stop, wake };
