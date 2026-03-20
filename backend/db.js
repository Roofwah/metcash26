const { Pool } = require('pg');

const ssl = process.env.DB_SSL === 'false' ? false : { rejectUnauthorized: false };
const databaseUrl = process.env.DATABASE_URL;

// Support both styles:
// 1) DATABASE_URL (Render/Supabase style)
// 2) PGHOST/PGPORT/PGUSER/PGPASSWORD/PGDATABASE (node-postgres defaults)
const pool = databaseUrl
  ? new Pool({
      connectionString: databaseUrl,
      ssl,
    })
  : new Pool({
      ssl,
    });

pool.on('error', (err) => {
  console.error('Unexpected pg pool error:', err.message);
});

module.exports = { pool };
