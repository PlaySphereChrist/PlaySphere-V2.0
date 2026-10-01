const { Pool, types } = require('pg');
const env = require('./env');

// Keep PostgreSQL DATE values as calendar strings. Parsing them as JS Date
// objects makes JSON serialization shift the day in UTC-offset time zones.
types.setTypeParser(1082, value => value);

const poolConfig = env.DATABASE_URL 
  ? { connectionString: env.DATABASE_URL }
  : {
      host: env.DB_HOST,
      port: env.DB_PORT,
      database: env.DB_NAME,
      user: env.DB_USER,
      password: env.DB_PASSWORD,
    };

const pool = new Pool({
  ...poolConfig,
  max: 20, // Max number of clients in the pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err, client) => {
  console.error('Unexpected error on idle PostgreSQL client:', err);
  process.exit(-1);
});

// Helper for single queries
const query = async (text, params) => {
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;
  
  if (env.NODE_ENV === 'development') {
    // Optional: Log long-running queries or query times if needed
    // console.log('Executed query', { text, duration, rows: res.rowCount });
  }
  return res;
};

// Graceful shutdown
const closePool = async () => {
  try {
    console.log('Closing PostgreSQL pool...');
    await pool.end();
    console.log('PostgreSQL pool closed.');
  } catch (err) {
    console.error('Error closing PostgreSQL pool:', err);
  }
};

module.exports = {
  pool,
  query,
  closePool
};
