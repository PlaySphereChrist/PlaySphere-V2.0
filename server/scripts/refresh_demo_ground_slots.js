'use strict';

const { pool } = require('../src/config/database');

const LOCAL_ADDRESSES = new Set(['::1/128', '::1', '127.0.0.1/32', '127.0.0.1']);
const TIME_ZONE = 'Asia/Kolkata';
const DAYS_TO_GENERATE = 30;

async function refreshDemoGroundSlots() {
  const client = await pool.connect();
  try {
    const target = await client.query(
      'SELECT current_database() AS database, inet_server_addr()::text AS server_address'
    );
    const { database, server_address: serverAddress } = target.rows[0];
    if (database !== 'playsphere' || (serverAddress && !LOCAL_ADDRESSES.has(serverAddress))) {
      throw new Error(`Refusing to refresh slots on non-local database target (${database} at ${serverAddress})`);
    }

    const migrationCheck = await client.query(`
      SELECT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE schemaname = current_schema()
          AND tablename = 'ground_booking_slots'
          AND indexname = 'uq_ground_booking_slots_sport_window'
      ) AS sport_slot_index_exists
    `);
    if (!migrationCheck.rows[0].sport_slot_index_exists) {
      throw new Error('Apply database/migrations/0002_sport_specific_ground_slots.sql before refreshing slots');
    }

    await client.query('BEGIN');

    // Expired pickup games can be removed; preserve games that have match history.
    const removedGames = await client.query(`
      DELETE FROM casual_games game
      WHERE game.scheduled_at
              + make_interval(mins => COALESCE(game.duration_minutes, 0)) <= NOW()
        AND NOT EXISTS (
          SELECT 1 FROM matches match_record WHERE match_record.casual_game_id = game.id
        )
    `);

    // Rebuild the available inventory from current ground/sport availability.
    // Keep every slot referenced by a booking so booking, payment, and refund
    // history continues to point at the exact slot and price originally booked.
    const removedSlots = await client.query(`
      DELETE FROM ground_booking_slots slot
      WHERE NOT EXISTS (
        SELECT 1 FROM ground_bookings booking WHERE booking.slot_id = slot.id
      )
    `);

    const generated = await client.query(`
      WITH local_days AS (
        SELECT day_value::date AS slot_date
        FROM generate_series(
          (NOW() AT TIME ZONE '${TIME_ZONE}')::date::timestamp,
          ((NOW() AT TIME ZONE '${TIME_ZONE}')::date + ($1::int - 1))::timestamp,
          INTERVAL '1 day'
        ) AS day_value
      ), ground_sports AS (
        SELECT gs.ground_id, gs.sport_id, gs.surface_type,
               ground.name AS ground_name, sport.name AS sport_name, sport.slug AS sport_slug
        FROM ground_sports gs
        JOIN grounds ground ON ground.id = gs.ground_id AND ground.is_active = TRUE
        JOIN sports sport ON sport.id = gs.sport_id AND sport.is_active = TRUE
      ), slot_windows AS (
        SELECT ground_sports.*, local_days.slot_date,
               COALESCE(slot_window.start_time, TIME '06:00') AS start_time,
               COALESCE(slot_window.end_time, TIME '22:00') AS end_time,
               COALESCE(slot_window.slot_duration_minutes, 60) AS slot_duration_minutes,
               COALESCE(
                 slot_window.price_per_slot,
                 (SELECT AVG(availability.price_per_slot)
                  FROM ground_availability availability
                  WHERE availability.sport_id = ground_sports.sport_id
                    AND availability.is_active = TRUE),
                 CASE LOWER(ground_sports.sport_slug)
                   WHEN 'football' THEN 1300
                   WHEN 'cricket' THEN 1400
                   WHEN 'basketball' THEN 900
                   WHEN 'volleyball' THEN 700
                   WHEN 'badminton' THEN 450
                   ELSE 1000
                 END
               ) AS base_price
        FROM ground_sports
        CROSS JOIN local_days
        LEFT JOIN LATERAL (
          SELECT availability.start_time, availability.end_time,
                 availability.slot_duration_minutes, availability.price_per_slot
          FROM ground_availability availability
          WHERE availability.ground_id = ground_sports.ground_id
            AND availability.sport_id = ground_sports.sport_id
            AND availability.day_of_week = EXTRACT(DOW FROM local_days.slot_date)::int
            AND availability.is_active = TRUE

          UNION ALL

          SELECT availability.start_time, availability.end_time,
                 availability.slot_duration_minutes, availability.price_per_slot
          FROM ground_availability availability
          WHERE availability.ground_id = ground_sports.ground_id
            AND availability.sport_id IS NULL
            AND availability.day_of_week = EXTRACT(DOW FROM local_days.slot_date)::int
            AND availability.is_active = TRUE
            AND NOT EXISTS (
              SELECT 1 FROM ground_availability specific
              WHERE specific.ground_id = ground_sports.ground_id
                AND specific.sport_id = ground_sports.sport_id
                AND specific.day_of_week = EXTRACT(DOW FROM local_days.slot_date)::int
                AND specific.is_active = TRUE
            )

          UNION ALL

          SELECT TIME '06:00', TIME '22:00', 60, NULL::numeric
          WHERE NOT EXISTS (
            SELECT 1 FROM ground_availability availability
            WHERE availability.ground_id = ground_sports.ground_id
              AND (availability.sport_id = ground_sports.sport_id OR availability.sport_id IS NULL)
              AND availability.day_of_week = EXTRACT(DOW FROM local_days.slot_date)::int
              AND availability.is_active = TRUE
          )
        ) AS slot_window ON TRUE
      ), concrete_slots AS (
        SELECT slot_windows.*,
               generated_time.slot_start::time AS slot_start,
               (generated_time.slot_start + make_interval(mins => slot_windows.slot_duration_minutes))::time AS slot_end
        FROM slot_windows
        CROSS JOIN LATERAL generate_series(
          (slot_windows.slot_date + slot_windows.start_time)::timestamp,
          (slot_windows.slot_date + slot_windows.end_time)::timestamp
            - make_interval(mins => slot_windows.slot_duration_minutes),
          make_interval(mins => slot_windows.slot_duration_minutes)
        ) AS generated_time(slot_start)
      )
      INSERT INTO ground_booking_slots (
        ground_id, sport_id, slot_date, start_time, end_time, price, is_available
      )
      SELECT concrete_slots.ground_id,
             concrete_slots.sport_id,
             concrete_slots.slot_date,
             concrete_slots.slot_start,
             concrete_slots.slot_end,
             ROUND(
               concrete_slots.base_price
               * CASE
                   WHEN LOWER(COALESCE(concrete_slots.surface_type, '')) LIKE '%natural%' THEN 1.12
                   WHEN LOWER(COALESCE(concrete_slots.surface_type, '')) LIKE '%fifa%'
                     OR LOWER(COALESCE(concrete_slots.surface_type, '')) LIKE '%certified%'
                     OR LOWER(COALESCE(concrete_slots.surface_type, '')) LIKE '%international%' THEN 1.10
                   WHEN LOWER(COALESCE(concrete_slots.surface_type, '')) LIKE '%indoor%'
                     OR LOWER(COALESCE(concrete_slots.surface_type, '')) LIKE '%wood%'
                     OR LOWER(COALESCE(concrete_slots.surface_type, '')) LIKE '%maple%' THEN 1.08
                   WHEN LOWER(COALESCE(concrete_slots.surface_type, '')) LIKE '%sand%'
                     OR LOWER(COALESCE(concrete_slots.surface_type, '')) LIKE '%beach%' THEN 0.95
                   ELSE 1.00
                 END
               * CASE
                   WHEN concrete_slots.slot_start < TIME '08:00' THEN 0.80
                   WHEN concrete_slots.slot_start >= TIME '16:00'
                     AND concrete_slots.slot_start < TIME '21:00' THEN 1.30
                   WHEN concrete_slots.slot_start >= TIME '21:00' THEN 0.85
                   ELSE 1.00
                 END
               * CASE
                   WHEN EXTRACT(ISODOW FROM concrete_slots.slot_date) IN (6, 7) THEN 1.10
                   ELSE 1.00
                 END,
               2
             ),
             TRUE
      FROM concrete_slots
      WHERE ((concrete_slots.slot_date + concrete_slots.slot_start) AT TIME ZONE '${TIME_ZONE}') >= NOW()
      ON CONFLICT DO NOTHING
    `, [DAYS_TO_GENERATE]);

    const summary = await client.query(`
      SELECT
        COUNT(*)::int AS total_slots,
        COUNT(DISTINCT ground_id)::int AS grounds_with_slots,
        COUNT(DISTINCT (ground_id, sport_id))::int AS ground_sport_pairs,
        MIN(slot_date) AS first_date,
        MAX(slot_date) AS last_date,
        MIN(price)::numeric(10,2) AS lowest_price,
        MAX(price)::numeric(10,2) AS highest_price
      FROM ground_booking_slots
      WHERE slot_date BETWEEN (NOW() AT TIME ZONE '${TIME_ZONE}')::date
                          AND (NOW() AT TIME ZONE '${TIME_ZONE}')::date + ($1::int - 1)
    `, [DAYS_TO_GENERATE]);

    await client.query('COMMIT');
    console.log(`Removed ${removedSlots.rowCount} unbooked stale inventory slots.`);
    console.log(`Removed ${removedGames.rowCount} expired casual games without match history.`);
    console.log(`Generated ${generated.rowCount} bookable slots for ${DAYS_TO_GENERATE} days in ${TIME_ZONE}.`);
    console.log('Ground slot summary:', summary.rows[0]);
    console.log('Pricing combines each ground/sport base price, playing surface, time of day, and weekend demand.');
    console.log('Booked slots were preserved at their original prices for booking/payment history.');
  } catch (error) {
    try { await client.query('ROLLBACK'); } catch {}
    throw error;
  } finally {
    client.release();
  }
}

refreshDemoGroundSlots()
  .catch(error => {
    console.error('Ground slot refresh failed:', error.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
