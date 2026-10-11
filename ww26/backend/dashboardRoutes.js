const { pool } = require('./db');

const CONFIRMED_STORES_SQL = `
  SELECT
    s.store_id,
    s.store_name,
    s.suburb,
    s.state,
    s.group_id,
    COALESCE(a.recommended_quantity, pb.recommended_2026, 0)::int AS recommended,
    a.group_manager_quantity::int AS confirmed,
    (a.group_manager_quantity - COALESCE(a.recommended_quantity, pb.recommended_2026, 0))::int AS variance,
    a.group_manager_name,
    a.group_manager_confirmed_at
  FROM ww_store_allocations a
  INNER JOIN ww_stores s ON s.store_id = a.store_id
  LEFT JOIN ww_pentabin pb ON pb.store_id = s.store_id
  WHERE a.group_manager_confirmed_at IS NOT NULL
    AND a.group_manager_quantity IS NOT NULL
  ORDER BY a.group_manager_confirmed_at DESC, s.group_id, s.store_name, s.store_id
`;

function escapeCsv(value) {
  const s = value == null ? '' : String(value);
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
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
      const { rows: stores } = await pool.query(CONFIRMED_STORES_SQL);

      let totalConfirmed = 0;
      let totalRecommended = 0;
      const groupMap = new Map();

      for (const row of stores) {
        const confirmed = Number(row.confirmed) || 0;
        const recommended = Number(row.recommended) || 0;
        totalConfirmed += confirmed;
        totalRecommended += recommended;

        const gid = String(row.group_id || '');
        const g = groupMap.get(gid) || {
          groupId: gid,
          storeCount: 0,
          confirmed: 0,
          recommended: 0,
        };
        g.storeCount += 1;
        g.confirmed += confirmed;
        g.recommended += recommended;
        groupMap.set(gid, g);
      }

      const byGroup = [...groupMap.values()].sort((a, b) =>
        String(a.groupId).localeCompare(String(b.groupId), undefined, { numeric: true }),
      );

      res.json({
        summary: {
          storeCount: stores.length,
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
      const { rows } = await pool.query(CONFIRMED_STORES_SQL);
      const headers = [
        'Store ID',
        'Store Name',
        'Suburb',
        'State',
        'Group',
        'Recommended 2026',
        'Confirmed 2026',
        'Variance',
        'Group Manager',
        'Confirmed At',
      ];
      const lines = [
        headers.join(','),
        ...rows.map((r) =>
          [
            r.store_id,
            r.store_name,
            r.suburb,
            r.state,
            r.group_id,
            r.recommended,
            r.confirmed,
            r.variance,
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
