const { Pool } = require('pg');

// pg reads PGHOST, PGPORT, PGUSER, PGPASSWORD, PGDATABASE automatically from
// the environment — no connection string needed, so special characters in the
// password are never URL-encoded/decoded.
const pool = new Pool({
  ssl: process.env.DB_SSL === 'false' ? false : { rejectUnauthorized: false },
});

pool.on('error', (err) => {
  console.error('Unexpected pg pool error:', err.message);
});

module.exports = { pool };
