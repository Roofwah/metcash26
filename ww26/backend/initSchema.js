const { pool, ensureDbSchema } = require('./db');

async function initWwSchema() {
  await ensureDbSchema();

  const statements = [
    `CREATE TABLE IF NOT EXISTS ww_groups (
      group_id            TEXT PRIMARY KEY,
      group_manager_id    TEXT NOT NULL UNIQUE,
      group_manager_name  TEXT NOT NULL,
      region              TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS ww_stores (
      store_id    TEXT PRIMARY KEY,
      store_name  TEXT NOT NULL,
      state       TEXT NOT NULL,
      suburb      TEXT,
      postcode    TEXT,
      group_id    TEXT NOT NULL REFERENCES ww_groups(group_id)
    )`,
    `CREATE TABLE IF NOT EXISTS ww_performance (
      store_id     TEXT PRIMARY KEY REFERENCES ww_stores(store_id),
      sales_ytd    NUMERIC NOT NULL DEFAULT 0,
      growth_pct   NUMERIC NOT NULL DEFAULT 0,
      trend_label  TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS ww_pentabin (
      store_id           TEXT PRIMARY KEY REFERENCES ww_stores(store_id),
      penta_bins_2025    INTEGER NOT NULL DEFAULT 0,
      current_soh        INTEGER NOT NULL DEFAULT 0,
      recommended_2026   INTEGER NOT NULL DEFAULT 0
    )`,
    `CREATE TABLE IF NOT EXISTS ww_sessions (
      session_id            TEXT PRIMARY KEY,
      participant_name      TEXT NOT NULL,
      participant_role      TEXT NOT NULL,
      group_id              TEXT REFERENCES ww_groups(group_id),
      participant_store_id  TEXT REFERENCES ww_stores(store_id),
      status                TEXT NOT NULL DEFAULT 'in_progress',
      started_at            TIMESTAMPTZ DEFAULT NOW(),
      completed_at          TIMESTAMPTZ
    )`,
    `CREATE TABLE IF NOT EXISTS ww_commitments (
      id                    SERIAL PRIMARY KEY,
      session_id            TEXT NOT NULL REFERENCES ww_sessions(session_id),
      store_id              TEXT NOT NULL REFERENCES ww_stores(store_id),
      recommended_quantity  INTEGER NOT NULL,
      final_quantity        INTEGER,
      variance              INTEGER,
      overridden            BOOLEAN NOT NULL DEFAULT false,
      confirmed_at          TIMESTAMPTZ,
      UNIQUE (session_id, store_id)
    )`,
    `CREATE INDEX IF NOT EXISTS idx_ww_stores_group ON ww_stores(group_id)`,
    `CREATE INDEX IF NOT EXISTS idx_ww_stores_name ON ww_stores(store_name)`,
    `CREATE TABLE IF NOT EXISTS ww_store_allocations (
      store_id                    TEXT PRIMARY KEY REFERENCES ww_stores(store_id),
      recommended_quantity        INTEGER NOT NULL DEFAULT 0,
      store_manager_quantity      INTEGER,
      store_manager_name          TEXT,
      store_manager_committed_at  TIMESTAMPTZ,
      group_manager_quantity      INTEGER,
      group_manager_name          TEXT,
      group_manager_confirmed_at  TIMESTAMPTZ,
      updated_at                  TIMESTAMPTZ DEFAULT NOW()
    )`,
  ];

  for (const sql of statements) {
    await pool.query(sql);
  }

  await pool.query(
    `ALTER TABLE ww_stores ADD COLUMN IF NOT EXISTS store_format TEXT NOT NULL DEFAULT 'standard'`,
  );

  await pool.query(`ALTER TABLE ww_performance ADD COLUMN IF NOT EXISTS sales_2024 NUMERIC`);
  await pool.query(`ALTER TABLE ww_performance ADD COLUMN IF NOT EXISTS units_2024 INTEGER`);
  await pool.query(`ALTER TABLE ww_performance ADD COLUMN IF NOT EXISTS units_2025 INTEGER`);
  await pool.query(`ALTER TABLE ww_pentabin ADD COLUMN IF NOT EXISTS penta_bins_2024 INTEGER`);

  await pool.query(
    `CREATE TABLE IF NOT EXISTS ww_category_sales (
      store_id      TEXT PRIMARY KEY REFERENCES ww_stores(store_id),
      category_apr  NUMERIC,
      category_may  NUMERIC,
      category_jun  NUMERIC,
      category_jul  NUMERIC,
      category_aug  NUMERIC
    )`,
  );

  await pool.query(`ALTER TABLE ww_sessions ADD COLUMN IF NOT EXISTS feedback TEXT`);
}

module.exports = { initWwSchema };
