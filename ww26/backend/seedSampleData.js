const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');
const { formatStoreName, storeFormatValue } = require('./storeFormat');

const CHUNK_SIZE = 200;

function readCsv(fileName) {
  const filePath = path.join(__dirname, 'data', fileName);
  const raw = fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '');
  return parse(raw, { columns: true, skip_empty_lines: true, trim: true });
}

function pickRowValue(row, keys) {
  for (const key of keys) {
    const value = row[key];
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      return String(value).trim();
    }
  }
  return '';
}

function normalizeStoreRow(row) {
  const groupId = pickRowValue(row, ['Group', 'group', 'group_id']);
  const storeId = pickRowValue(row, ['Store Number', 'store_number', 'store_id']);
  const storeNameRaw = pickRowValue(row, ['Store Name', 'store_name']);
  const formatRaw = pickRowValue(row, ['Format', 'format', 'Store Format', 'store_format']);
  if (!groupId || !storeId || !storeNameRaw) return null;

  const paddedStoreId = storeId.replace(/\D/g, '').padStart(4, '0');
  const store_format = storeFormatValue(formatRaw);

  return {
    group_id: groupId,
    store_id: paddedStoreId,
    store_name: formatStoreName(storeNameRaw, formatRaw),
    store_format,
    state: String(row.state ?? '').trim(),
    suburb: String(row.suburb ?? '').trim(),
    postcode: String(row.postcode ?? '').trim(),
    sales_ytd: row.sales_ytd,
    growth_pct: row.growth_pct,
    trend_label: row.trend_label,
    penta_bins_2025: row.penta_bins_2025,
    current_soh: row.current_soh,
    recommended_2026: row.recommended_2026,
  };
}

function parseOptionalNumber(value) {
  if (value === undefined || value === null || String(value).trim() === '') return null;
  const n = Number(String(value).replace(/[$,\s%]/g, ''));
  return Number.isFinite(n) ? n : null;
}

function parseOptionalInt(value) {
  const n = parseOptionalNumber(value);
  return n === null ? null : Math.round(n);
}

function trendFromGrowth(growthPct) {
  return growthPct >= 2 ? 'up' : growthPct <= -1 ? 'down' : 'flat';
}

function normalizeStoreId(value) {
  const digits = String(value ?? '').replace(/\D/g, '');
  if (!digits) return '';
  return digits.padStart(4, '0');
}

/** Rank-based display growth when salesdata.csv has no explicit growth column (lower rank = stronger). */
function growthFromSalesRank(rankRaw) {
  const label = String(rankRaw ?? '').trim();
  if (!label) return { growthPct: null, trend: null };
  if (label.toUpperCase() === 'NEW') {
    return { growthPct: 5, trend: 'up' };
  }
  const rankNum = Number.parseInt(label.replace(/\D/g, ''), 10);
  if (!Number.isFinite(rankNum) || rankNum <= 0) {
    return { growthPct: null, trend: null };
  }
  const growthPct = Math.round(((1000 - Math.min(rankNum, 999)) / 100 - 5) * 10) / 10;
  const clamped = Math.max(-10, Math.min(15, growthPct));
  return { growthPct: clamped, trend: trendFromGrowth(clamped) };
}

const CATEGORY_CSV_KEYS = [
  ['category_apr', 'Category_Apr'],
  ['category_may', 'Category_May'],
  ['category_jun', 'Category_Jun'],
  ['category_jul', 'Category_Jul'],
  ['category_aug', 'Category_Aug'],
];

function categoryMonthsFromSalesRow(row) {
  const category = {};
  for (const [field, csvKey] of CATEGORY_CSV_KEYS) {
    category[field] = parseOptionalNumber(row[csvKey]);
  }
  return category;
}

function hasAnyCategoryMonth(category) {
  return CATEGORY_CSV_KEYS.some(([field]) => category[field] != null);
}

function metricsFromSalesDataRow(row) {
  const category = categoryMonthsFromSalesRow(row);

  const aaDollars = parseOptionalNumber(row['MAX AA 16pk $']);
  const aaaDollars = parseOptionalNumber(row['MAX AAA 16pk $']);
  const hasLegacyDollars = aaDollars !== null || aaaDollars !== null;
  if (hasLegacyDollars) {
    const salesYtd = (aaDollars ?? 0) + (aaaDollars ?? 0);
    const penta2025 = parseOptionalInt(row['25 Penta']);
    const recommended = parseOptionalInt(row['26 Penta']);
    const { growthPct, trend } = growthFromSalesRank(row.Rank ?? row.rank);
    return {
      salesYtd,
      sales2024: null,
      units2024: null,
      units2025: null,
      growthPct,
      trend,
      penta2024: null,
      penta2025,
      recommended,
      category,
    };
  }

  const sales2025 = parseOptionalNumber(row['Sales 2025']);
  const sales2024 = parseOptionalNumber(row['Sales 2024']);
  const units2025 = parseOptionalInt(row['Units 2025']);
  const units2024 = parseOptionalInt(row['Units 2024']);
  const salesYtd = sales2025;
  const penta2024 = parseOptionalInt(row['Bins 2024']);
  const penta2025 = parseOptionalInt(row['Bins 2025']);
  const recommended = parseOptionalInt(row['Bins 2026']);

  let growthPct = null;
  let trend = null;
  if (sales2025 !== null && sales2024 !== null && sales2024 !== 0) {
    growthPct = Math.round(((sales2025 - sales2024) / sales2024) * 1000) / 10;
    trend = trendFromGrowth(growthPct);
  } else {
    const rankDerived = growthFromSalesRank(row.Rank ?? row.rank);
    growthPct = rankDerived.growthPct;
    trend = rankDerived.trend;
  }

  const hasPromo =
    salesYtd !== null || penta2025 !== null || recommended !== null || growthPct !== null;

  return {
    salesYtd: hasPromo ? salesYtd : null,
    sales2024,
    units2024,
    units2025,
    growthPct: hasPromo ? growthPct : null,
    trend: hasPromo ? trend : null,
    penta2024,
    penta2025,
    recommended,
    category,
  };
}

function loadSalesMetricsByStoreId() {
  const dataDir = path.join(__dirname, 'data');
  const metricsFile = fs.existsSync(path.join(dataDir, 'storeMetrics.csv'))
    ? 'storeMetrics.csv'
    : fs.existsSync(path.join(dataDir, 'salesdata.csv'))
      ? 'salesdata.csv'
      : null;
  if (!metricsFile) return new Map();

  const rows = readCsv(metricsFile);
  const map = new Map();
  for (const row of rows) {
    const storeId = normalizeStoreId(pickRowValue(row, ['Site', 'site', 'store_id', 'Store Number']));
    if (!storeId) continue;
    map.set(storeId, metricsFromSalesDataRow(row));
  }
  return map;
}

function hasRealMetrics(store, salesByStoreId) {
  if (salesByStoreId.has(store.store_id)) return true;
  const m = metricsFromStoreRow(store);
  return (
    m.salesYtd !== null
    || m.growthPct !== null
    || m.penta2025 !== null
    || m.recommended !== null
  );
}

function mergeStoreMetrics(store, salesByStoreId) {
  const fromStoreCsv = metricsFromStoreRow(store);
  const fromSales = salesByStoreId.get(store.store_id);
  if (!fromSales) return fromStoreCsv;

  const pick = (salesVal, csvVal) =>
    salesVal !== null && salesVal !== undefined ? salesVal : csvVal ?? null;

  return {
    salesYtd: pick(fromSales.salesYtd, fromStoreCsv.salesYtd),
    sales2024: pick(fromSales.sales2024, fromStoreCsv.sales2024),
    units2024: pick(fromSales.units2024, fromStoreCsv.units2024),
    units2025: pick(fromSales.units2025, fromStoreCsv.units2025),
    growthPct: pick(fromSales.growthPct, fromStoreCsv.growthPct),
    trend: fromSales.trend ?? fromStoreCsv.trend ?? null,
    penta2024: pick(fromSales.penta2024, fromStoreCsv.penta2024),
    penta2025: pick(fromSales.penta2025, fromStoreCsv.penta2025),
    recommended: pick(fromSales.recommended, fromStoreCsv.recommended),
  };
}

/** Optional CSV columns on store rows only — no invented values */
function metricsFromStoreRow(store) {
  const salesYtd = parseOptionalNumber(store.sales_ytd);
  const growthPct = parseOptionalNumber(store.growth_pct);
  const trendRaw = String(store.trend_label || '').trim().toLowerCase();
  let trend = ['up', 'down', 'flat'].includes(trendRaw) ? trendRaw : null;
  if (!trend && growthPct !== null) trend = trendFromGrowth(growthPct);
  const penta2025 = parseOptionalInt(store.penta_bins_2025);
  const recommended = parseOptionalInt(store.recommended_2026);
  return {
    salesYtd,
    sales2024: parseOptionalNumber(store.sales_2024),
    units2024: parseOptionalInt(store.units_2024),
    units2025: parseOptionalInt(store.units_2025),
    growthPct,
    trend,
    penta2024: parseOptionalInt(store.penta_bins_2024),
    penta2025,
    recommended,
  };
}

function dbNumber(value) {
  return value === null || value === undefined ? 0 : value;
}

function dbNullable(value) {
  return value === null || value === undefined ? null : value;
}

async function clearStoreMetrics(pool, storeIds) {
  if (!storeIds.length) return;
  await pool.query(`DELETE FROM ww_performance WHERE store_id = ANY($1::text[])`, [storeIds]);
  await pool.query(`DELETE FROM ww_pentabin WHERE store_id = ANY($1::text[])`, [storeIds]);
  await pool.query(`DELETE FROM ww_category_sales WHERE store_id = ANY($1::text[])`, [storeIds]);
}

async function bulkInsert(pool, sqlPrefix, sqlSuffix, rows, rowToParams) {
  for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
    const chunk = rows.slice(i, i + CHUNK_SIZE);
    const values = [];
    const params = [];
    chunk.forEach((row, rowIndex) => {
      const rowParams = rowToParams(row);
      const placeholders = rowParams.map((_, colIndex) => `$${rowIndex * rowParams.length + colIndex + 1}`);
      values.push(`(${placeholders.join(', ')})`);
      params.push(...rowParams);
    });
    await pool.query(`${sqlPrefix} ${values.join(', ')} ${sqlSuffix}`, params);
  }
}

async function ensureGroups(pool, groupIds) {
  if (!groupIds.length) return;
  await bulkInsert(
    pool,
    `INSERT INTO ww_groups (group_id, group_manager_id, group_manager_name, region) VALUES`,
    `ON CONFLICT (group_id) DO UPDATE SET
       group_manager_id = EXCLUDED.group_manager_id,
       group_manager_name = EXCLUDED.group_manager_name`,
    groupIds,
    (groupId) => [groupId, `G${groupId}`, `Group ${groupId}`, null],
  );
}

async function pruneStaleData(pool, storeIds, groupIds) {
  if (storeIds.length && groupIds.length) {
    await pool.query(
      `DELETE FROM ww_commitments
       WHERE session_id IN (
         SELECT session_id FROM ww_sessions
         WHERE group_id <> ALL($1::text[])
            OR (participant_store_id IS NOT NULL AND participant_store_id <> ALL($2::text[]))
       )`,
      [groupIds, storeIds],
    );
    await pool.query(
      `DELETE FROM ww_sessions
       WHERE group_id <> ALL($1::text[])
          OR (participant_store_id IS NOT NULL AND participant_store_id <> ALL($2::text[]))`,
      [groupIds, storeIds],
    );
  }
  if (storeIds.length) {
    await pool.query(`DELETE FROM ww_commitments WHERE store_id <> ALL($1::text[])`, [storeIds]);
    await pool.query(`DELETE FROM ww_performance WHERE store_id <> ALL($1::text[])`, [storeIds]);
    await pool.query(`DELETE FROM ww_pentabin WHERE store_id <> ALL($1::text[])`, [storeIds]);
    await pool.query(`DELETE FROM ww_category_sales WHERE store_id <> ALL($1::text[])`, [storeIds]);
    await pool.query(`DELETE FROM ww_stores WHERE store_id <> ALL($1::text[])`, [storeIds]);
  }
  if (groupIds.length) {
    await pool.query(`DELETE FROM ww_groups WHERE group_id <> ALL($1::text[])`, [groupIds]);
  }
}

async function seedSampleData(pool) {
  const rawStores = readCsv('stores.csv');
  const stores = rawStores.map(normalizeStoreRow).filter(Boolean);
  const groupIds = [...new Set(stores.map((s) => s.group_id))];
  const storeIds = stores.map((s) => s.store_id);
  const salesByStoreId = loadSalesMetricsByStoreId();

  await ensureGroups(pool, groupIds);

  await bulkInsert(
    pool,
    `INSERT INTO ww_stores (store_id, store_name, state, suburb, postcode, group_id, store_format) VALUES`,
    `ON CONFLICT (store_id) DO UPDATE SET
       store_name = EXCLUDED.store_name,
       state = EXCLUDED.state,
       suburb = EXCLUDED.suburb,
       postcode = EXCLUDED.postcode,
       group_id = EXCLUDED.group_id,
       store_format = EXCLUDED.store_format`,
    stores,
    (s) => [s.store_id, s.store_name, s.state || '', s.suburb || null, s.postcode || null, s.group_id, s.store_format || 'standard'],
  );

  await clearStoreMetrics(pool, storeIds);

  const withMetrics = stores
    .filter((s) => hasRealMetrics(s, salesByStoreId))
    .map((s) => ({
      store: s,
      metrics: mergeStoreMetrics(s, salesByStoreId),
    }));

  await bulkInsert(
    pool,
    `INSERT INTO ww_performance (store_id, sales_ytd, sales_2024, units_2024, units_2025, growth_pct, trend_label) VALUES`,
    `ON CONFLICT (store_id) DO UPDATE SET
       sales_ytd = EXCLUDED.sales_ytd,
       sales_2024 = EXCLUDED.sales_2024,
       units_2024 = EXCLUDED.units_2024,
       units_2025 = EXCLUDED.units_2025,
       growth_pct = EXCLUDED.growth_pct,
       trend_label = EXCLUDED.trend_label`,
    withMetrics,
    ({ store, metrics }) => [
      store.store_id,
      dbNumber(metrics.salesYtd),
      dbNullable(metrics.sales2024),
      dbNullable(metrics.units2024),
      dbNullable(metrics.units2025),
      dbNumber(metrics.growthPct),
      metrics.trend,
    ],
  );

  await bulkInsert(
    pool,
    `INSERT INTO ww_pentabin (store_id, penta_bins_2024, penta_bins_2025, current_soh, recommended_2026) VALUES`,
    `ON CONFLICT (store_id) DO UPDATE SET
       penta_bins_2024 = EXCLUDED.penta_bins_2024,
       penta_bins_2025 = EXCLUDED.penta_bins_2025,
       current_soh = EXCLUDED.current_soh,
       recommended_2026 = EXCLUDED.recommended_2026`,
    withMetrics,
    ({ store, metrics }) => [
      store.store_id,
      dbNullable(metrics.penta2024),
      dbNumber(metrics.penta2025),
      0,
      dbNumber(metrics.recommended),
    ],
  );

  const withCategory = stores
    .map((s) => {
      const fromSales = salesByStoreId.get(s.store_id);
      const category = fromSales?.category;
      if (!category || !hasAnyCategoryMonth(category)) return null;
      return { store_id: s.store_id, category };
    })
    .filter(Boolean);

  await bulkInsert(
    pool,
    `INSERT INTO ww_category_sales (store_id, category_apr, category_may, category_jun, category_jul, category_aug) VALUES`,
    `ON CONFLICT (store_id) DO UPDATE SET
       category_apr = EXCLUDED.category_apr,
       category_may = EXCLUDED.category_may,
       category_jun = EXCLUDED.category_jun,
       category_jul = EXCLUDED.category_jul,
       category_aug = EXCLUDED.category_aug`,
    withCategory,
    ({ store_id, category }) => [
      store_id,
      category.category_apr,
      category.category_may,
      category.category_jun,
      category.category_jul,
      category.category_aug,
    ],
  );

  await pruneStaleData(pool, storeIds, groupIds);

  const salesMatched = stores.filter((s) => salesByStoreId.has(s.store_id)).length;
  console.log(
    `WW26 data: ${groupIds.length} groups, ${stores.length} stores (${salesMatched} with store metrics CSV — no mock metrics).`,
  );
  return {
    seededAt: new Date().toISOString(),
    groupCount: groupIds.length,
    storeCount: stores.length,
    salesdataMatched: salesMatched,
  };
}

module.exports = {
  seedSampleData,
  metricsFromStoreRow,
  metricsFromSalesDataRow,
  mergeStoreMetrics,
  loadSalesMetricsByStoreId,
  growthFromSalesRank,
  normalizeStoreRow,
  formatStoreName,
  storeFormatValue,
};
