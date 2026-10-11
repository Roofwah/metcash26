const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');

const DOLLAR_GROWTH_HEADERS = [
  '$ growth vs ya',
  '$ growth vs ya.',
  'dollar growth vs ya',
  'growth $ vs ya',
  'max growth $ ya',
];

const PCT_GROWTH_HEADERS = [
  '% growth vs ya',
  'pct growth vs ya',
  'percent growth vs ya',
  'growth % vs ya',
];

function normalizeStoreId(value) {
  const digits = String(value ?? '').replace(/\D/g, '');
  if (!digits) return '';
  return digits.padStart(4, '0');
}

function parseOptionalNumber(value) {
  if (value === undefined || value === null || String(value).trim() === '') return null;
  const n = Number(String(value).replace(/[$,\s%]/g, ''));
  return Number.isFinite(n) ? n : null;
}

function findColumnKey(columns, candidates) {
  const normalized = columns.map((c) => String(c).replace(/^\uFEFF/, '').trim().toLowerCase());
  for (const candidate of candidates) {
    const idx = normalized.indexOf(candidate);
    if (idx >= 0) return columns[idx];
  }
  return null;
}

/** Read-only optional YA growth columns from salesdata.csv (does not modify seed). */
function loadSalesGrowthExtras() {
  const filePath = path.join(__dirname, '..', 'data', 'salesdata.csv');
  if (!fs.existsSync(filePath)) {
    return { byStoreId: new Map(), hasDollarColumn: false, hasPctColumn: false };
  }

  const raw = fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '');
  const rows = parse(raw, { columns: true, skip_empty_lines: true, trim: true });
  if (!rows.length) {
    return { byStoreId: new Map(), hasDollarColumn: false, hasPctColumn: false };
  }

  const columns = Object.keys(rows[0]);
  const dollarKey = findColumnKey(columns, DOLLAR_GROWTH_HEADERS);
  const pctKey = findColumnKey(columns, PCT_GROWTH_HEADERS);
  const siteKey = columns.find((c) => /^site$/i.test(c.replace(/^\uFEFF/, '').trim())) || 'Site';

  const byStoreId = new Map();
  for (const row of rows) {
    const storeId = normalizeStoreId(row[siteKey]);
    if (!storeId) continue;
    byStoreId.set(storeId, {
      dollarGrowthYa: dollarKey ? parseOptionalNumber(row[dollarKey]) : null,
      pctGrowthYa: pctKey ? parseOptionalNumber(row[pctKey]) : null,
    });
  }

  return { byStoreId, hasDollarColumn: Boolean(dollarKey), hasPctColumn: Boolean(pctKey) };
}

module.exports = { loadSalesGrowthExtras, normalizeStoreId };
