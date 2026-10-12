const { pool } = require('./db');
const { ALLOCATION_SELECT, allocationFromRow } = require('./storeAllocations');

const STORES_WITH_ALLOCATIONS_SQL = `
  SELECT
    s.store_id,
    s.store_name,
    s.suburb,
    s.state,
    s.group_id,
    pb.recommended_2026,
    ${ALLOCATION_SELECT}
  FROM ww_store_allocations a
  INNER JOIN ww_stores s ON s.store_id = a.store_id
  LEFT JOIN ww_pentabin pb ON pb.store_id = s.store_id
  WHERE (a.store_manager_committed_at IS NOT NULL AND a.store_manager_quantity IS NOT NULL)
     OR (a.group_manager_confirmed_at IS NOT NULL AND a.group_manager_quantity IS NOT NULL)
`;

const PARTICIPATION_COUNTS_SQL = `
  SELECT
    (
      SELECT COUNT(DISTINCT s.group_id)::int
      FROM ww_store_allocations a
      INNER JOIN ww_stores s ON s.store_id = a.store_id
      WHERE a.group_manager_confirmed_at IS NOT NULL
        AND a.group_manager_quantity IS NOT NULL
    ) AS groups_confirmed,
    (
      SELECT COUNT(*)::int
      FROM ww_store_allocations
      WHERE store_manager_committed_at IS NOT NULL
        AND store_manager_quantity IS NOT NULL
    ) AS store_manager_count
`;

function parseTs(value) {
  if (!value) return 0;
  const t = new Date(value).getTime();
  return Number.isNaN(t) ? 0 : t;
}

function dashboardStoreFromRow(row) {
  const alloc = allocationFromRow(row);
  const recommended = alloc.recommendedQuantity;
  const confirmed = alloc.effectiveQuantity;
  const authority = alloc.finalStatus;
  const lastUpdatedAt =
    authority === 'store_manager'
      ? alloc.storeManagerCommittedAt
      : authority === 'group_manager'
        ? alloc.groupManagerConfirmedAt
        : null;
  const lastUpdatedBy =
    authority === 'store_manager'
      ? alloc.storeManagerName
      : authority === 'group_manager'
        ? alloc.groupManagerName
        : null;

  return {
    store_id: row.store_id,
    store_name: row.store_name,
    suburb: row.suburb,
    state: row.state,
    group_id: row.group_id,
    recommended,
    confirmed,
    variance: confirmed - recommended,
    authority,
    last_updated_by: lastUpdatedBy,
    last_updated_at: lastUpdatedAt,
    store_manager_name: alloc.storeManagerName,
    store_manager_committed_at: alloc.storeManagerCommittedAt,
    group_manager_name: alloc.groupManagerName,
    group_manager_confirmed_at: alloc.groupManagerConfirmedAt,
  };
}

function escapeCsv(value) {
  const s = value == null ? '' : String(value);
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function authorityLabel(authority) {
  if (authority === 'store_manager') return 'Store Manager';
  if (authority === 'group_manager') return 'Group Manager';
  return '';
}

async function loadDashboardStores() {
  const { rows } = await pool.query(STORES_WITH_ALLOCATIONS_SQL);
  return rows
    .map(dashboardStoreFromRow)
    .sort((a, b) => parseTs(b.last_updated_at) - parseTs(a.last_updated_at));
}

function registerWw26Dashboard(app, requireAuth) {
  const guard =
    requireAuth ||
    ((_req, res) => {
      res.status(401).json({
        error: 'Sign in required. Use the same rep email OTP as Metcash (dble.co).',
      });
    });

  app.get('/api/ww26/dashboard/penta-confirmed', guard, async (_req, res) => {
    try {
      const [stores, { rows: participationRows }] = await Promise.all([
        loadDashboardStores(),
        pool.query(PARTICIPATION_COUNTS_SQL),
      ]);
      const participation = participationRows[0] || {};
      const groupsConfirmed = Number(participation.groups_confirmed) || 0;
      const storeManagerCount = Number(participation.store_manager_count) || 0;

      let totalConfirmed = 0;
      let totalRecommended = 0;
      const groupMap = new Map();

      for (const row of stores) {
        totalConfirmed += row.confirmed;
        totalRecommended += row.recommended;

        const gid = String(row.group_id || '');
        const g = groupMap.get(gid) || {
          groupId: gid,
          storeCount: 0,
          confirmed: 0,
          recommended: 0,
        };
        g.storeCount += 1;
        g.confirmed += row.confirmed;
        g.recommended += row.recommended;
        groupMap.set(gid, g);
      }

      const byGroup = [...groupMap.values()].sort((a, b) =>
        String(a.groupId).localeCompare(String(b.groupId), undefined, { numeric: true }),
      );

      res.json({
        summary: {
          storeCount: stores.length,
          groupsConfirmed,
          storeManagerCount,
          totalConfirmed,
          totalRecommended,
          totalVariance: totalConfirmed - totalRecommended,
        },
        stores,
        byGroup,
      });
    } catch (err) {
      console.error('GET /api/ww26/dashboard/penta-confirmed:', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/ww26/dashboard/penta-confirmed/csv', guard, async (_req, res) => {
    try {
      const stores = await loadDashboardStores();
      const headers = [
        'Store ID',
        'Store Name',
        'Suburb',
        'State',
        'Group',
        'Recommended 2026',
        'Current 2026',
        'Variance',
        'Last updated by',
        'Role',
        'Updated at',
        'Store Manager',
        'Store Manager at',
        'Group Manager',
        'Group Manager at',
      ];
      const lines = [
        headers.join(','),
        ...stores.map((r) =>
          [
            r.store_id,
            r.store_name,
            r.suburb,
            r.state,
            r.group_id,
            r.recommended,
            r.confirmed,
            r.variance,
            r.last_updated_by,
            authorityLabel(r.authority),
            r.last_updated_at,
            r.store_manager_name,
            r.store_manager_committed_at,
            r.group_manager_name,
            r.group_manager_confirmed_at,
          ]
            .map(escapeCsv)
            .join(','),
        ),
      ].join('\r\n');

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="ww26-penta-confirmed-${Date.now()}.csv"`,
      );
      res.send(lines);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
}

module.exports = { registerWw26Dashboard };
