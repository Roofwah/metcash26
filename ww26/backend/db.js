const { Pool } = require('pg');

const ssl = process.env.DB_SSL === 'false' ? false : { rejectUnauthorized: false };
const databaseUrl = process.env.DATABASE_URL;

function sanitizeSchemaName(name) {
  const s = String(name || 'ww26').trim();
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(s)) return 'ww26';
  return s;
}

const DB_SCHEMA = sanitizeSchemaName(
  process.env.WW26_DB_SCHEMA || process.env.DB_SCHEMA || 'ww26',
);

function withSearchPath(url) {
  if (!url) return url;
  const opt = `options=-c search_path=${DB_SCHEMA},public`;
  return url.includes('?') ? `${url}&${opt}` : `${url}?${opt}`;
}

const pool = databaseUrl
  ? new Pool({ connectionString: withSearchPath(databaseUrl), ssl })
  : new Pool({ ssl });

pool.on('error', (err) => {
  console.error('Unexpected pg pool error:', err.message);
});

async function ensureDbSchema() {
  await pool.query(`CREATE SCHEMA IF NOT EXISTS ${DB_SCHEMA}`);
  await pool.query(`SET search_path TO ${DB_SCHEMA}, public`);
}

/** Run fn with search_path set for ww26 schema */
async function withSchema(fn) {
  const client = await pool.connect();
  try {
    await client.query(`SET search_path TO ${DB_SCHEMA}, public`);
    return await fn(client);
  } finally {
    client.release();
  }
}

module.exports = { pool, DB_SCHEMA, ensureDbSchema, withSchema };
