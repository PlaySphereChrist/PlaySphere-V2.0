'use strict';

const fs = require('fs');
const path = require('path');
const { pool } = require('../src/config/database');

const migrationsDir = path.resolve(__dirname, '../../database/migrations');

async function runMigrations() {
  console.log('🔄 Checking database migrations...');
  
  // Create schema_migrations tracking table if not exists
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version VARCHAR(150) PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  const appliedRes = await pool.query('SELECT version FROM schema_migrations');
  const applied = new Set(appliedRes.rows.map(r => r.version));

  // Also check if 0001 was already applied before schema_migrations was introduced
  if (!applied.has('0001_tournament_fixture_engine.sql')) {
    const colCheck = await pool.query(`
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'fixtures' AND column_name = 'home_registration_id'
    `);
    if (colCheck.rows.length > 0) {
      console.log('ℹ️  0001_tournament_fixture_engine.sql already applied in DB, recording in schema_migrations');
      await pool.query('INSERT INTO schema_migrations (version) VALUES ($1) ON CONFLICT DO NOTHING', [
        '0001_tournament_fixture_engine.sql'
      ]);
      applied.add('0001_tournament_fixture_engine.sql');
    }
  }

  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    if (applied.has(file)) {
      continue;
    }

    console.log(`⏳ Applying migration: ${file}...`);
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('INSERT INTO schema_migrations (version) VALUES ($1)', [file]);
      await client.query('COMMIT');
      console.log(`✅ Applied migration: ${file}`);
    } catch (err) {
      await client.query('ROLLBACK');
      console.error(`❌ Migration failed for ${file}:`, err.message);
      throw err;
    } finally {
      client.release();
    }
  }

  console.log('🎉 Database migrations up to date.');
}

if (require.main === module) {
  runMigrations()
    .then(() => process.exit(0))
    .catch(() => process.exit(1))
    .finally(() => pool.end());
} else {
  module.exports = { runMigrations };
}
