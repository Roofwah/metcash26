#!/usr/bin/env node
/**
 * Smoke test: orders table has TEMP snapshot columns (run after server initDb).
 * Usage: node backend/scripts/smoke-temp-store-columns.js
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { pool } = require('../db');

const REQUIRED = [
  'entered_store_no',
  'entered_store_name',
  'store_state',
  'store_suburb',
  'store_postcode',
  'is_temp_store',
];

async function main() {
  try {
    const { rows } = await pool.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'orders'
    `);
    const cols = new Set(rows.map((r) => r.column_name));
    const missing = REQUIRED.filter((c) => !cols.has(c));
    if (missing.length) {
      console.error('FAIL: missing columns:', missing.join(', '));
      process.exit(1);
    }
    console.log('OK: all TEMP snapshot columns present on orders');

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const { rows: inserted } = await client.query(
        `INSERT INTO orders (
           store_number, store_name, banner, user_name, total_value,
           entered_store_no, entered_store_name, store_state, store_suburb, store_postcode, is_temp_store
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
         RETURNING id, store_state, entered_store_no, is_temp_store`,
        [
          'TEMP - Smoke Test',
          'TEMP - Smoke Test',
          'TEMP',
          'Smoke Tester',
          1,
          '166',
          'Smoke Test Store',
          'VIC',
          'TEMPLESTOWE',
          '3106',
          true,
        ],
      );
      const row = inserted[0];
      if (row.store_state !== 'VIC' || row.entered_store_no !== '166' || !row.is_temp_store) {
        console.error('FAIL: insert returned unexpected row', row);
        process.exit(1);
      }
      await client.query('ROLLBACK');
      console.log('OK: TEMP snapshot insert + rollback (id would have been', row.id + ')');
    } finally {
      client.release();
    }
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error('FAIL:', err.message || err);
  process.exit(1);
});
