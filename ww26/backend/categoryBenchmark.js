const CATEGORY_MONTH_KEYS = [
  'category_apr',
  'category_may',
  'category_jun',
  'category_jul',
  'category_aug',
];

function parseCategoryNum(value) {
  if (value === null || value === undefined || String(value).trim() === '') return null;
  const n = Number(String(value).replace(/[$,\s]/g, ''));
  return Number.isFinite(n) ? n : null;
}

function categoryValuesFromRow(row) {
  return CATEGORY_MONTH_KEYS.map((key) => parseCategoryNum(row[key]));
}

/** Mean of each category month across store rows. */
function averageCategoryMonths(rows) {
  const buckets = [[], [], [], [], []];
  for (const row of rows) {
    const vals = categoryValuesFromRow(row);
    vals.forEach((v, i) => {
      if (v != null) buckets[i].push(v);
    });
  }
  return buckets.map((b) => (b.length ? b.reduce((a, c) => a + c, 0) / b.length : null));
}

function categoryShiftFromMonthValues(values) {
  const defined = values.filter((v) => v != null);
  if (defined.length < 2 || !defined[0]) return null;
  const first = defined[0];
  const last = defined[defined.length - 1];
  return Math.round(((last - first) / first) * 1000) / 10;
}

let networkCategoryMonthsCache = null;

async function loadNetworkCategoryMonths(pool, storeFilterSql) {
  if (networkCategoryMonthsCache) return networkCategoryMonthsCache;
  const { rows } = await pool.query(
    `SELECT c.category_apr, c.category_may, c.category_jun, c.category_jul, c.category_aug
     FROM ww_category_sales c
     JOIN ww_stores s ON s.store_id = c.store_id
     WHERE ${storeFilterSql}`,
  );
  networkCategoryMonthsCache = averageCategoryMonths(rows);
  return networkCategoryMonthsCache;
}

function buildCategoryBenchmarkSummary(groupStores, networkMonths) {
  const groupMonths = averageCategoryMonths(groupStores);
  const groupCategoryShift = categoryShiftFromMonthValues(groupMonths);
  const networkCategoryShift = categoryShiftFromMonthValues(networkMonths);
  return {
    groupCategoryMonths: groupMonths,
    networkCategoryMonths: networkMonths,
    groupCategoryShift,
    networkCategoryShift,
  };
}

module.exports = {
  averageCategoryMonths,
  categoryShiftFromMonthValues,
  loadNetworkCategoryMonths,
  buildCategoryBenchmarkSummary,
};
