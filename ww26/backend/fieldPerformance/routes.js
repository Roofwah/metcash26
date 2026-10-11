const express = require('express');
const { pool } = require('../db');
const { loadSalesGrowthExtras } = require('./salesExtras');
const { buildGroupScoreboard } = require('./competition');

const router = express.Router();

let growthExtrasCache = null;

function getGrowthExtras() {
  if (!growthExtrasCache) {
    growthExtrasCache = loadSalesGrowthExtras();
  }
  return growthExtrasCache;
}

/** Field Performance — store search (WW + Metro, read-only). */
router.get('/stores/search', async (req, res) => {
  try {
    const q = String(req.query.q || '').trim();
    const params = [];
    let whereClause = 'TRUE';

    if (q) {
      const digits = q.replace(/\D/g, '');
      if (digits) {
        params.push(`${digits}%`);
        params.push(`%${q}%`);
        whereClause = `(s.store_id LIKE $1 OR s.store_name ILIKE $2)`;
      } else {
        params.push(`%${q}%`);
        whereClause = `s.store_name ILIKE $1`;
      }
    }

    const limit = q ? 200 : 5000;
    params.push(limit);

    const { rows } = await pool.query(
      `SELECT s.store_id, s.store_name, s.store_format, s.group_id,
              p.sales_ytd, p.growth_pct
       FROM ww_stores s
       LEFT JOIN ww_performance p ON p.store_id = s.store_id
       WHERE ${whereClause}
       ORDER BY s.store_name, s.store_id
       LIMIT $${params.length}`,
      params,
    );
    res.json({ stores: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** Field Performance — store dashboard + area group competition (read-only). */
router.get('/stores/:storeId', async (req, res) => {
  try {
    const storeId = String(req.params.storeId || '').replace(/\D/g, '').padStart(4, '0');
    const { rows: storeRows } = await pool.query(
      `SELECT s.store_id, s.store_name, s.store_format, s.group_id, s.state, s.suburb,
              p.sales_ytd, p.growth_pct, p.trend_label,
              pb.penta_bins_2025, pb.recommended_2026
       FROM ww_stores s
       LEFT JOIN ww_performance p ON p.store_id = s.store_id
       LEFT JOIN ww_pentabin pb ON pb.store_id = s.store_id
       WHERE s.store_id = $1`,
      [storeId],
    );
    const store = storeRows[0];
    if (!store) return res.status(404).json({ error: 'Store not found.' });

    const groupId = store.group_id;
    const { rows: groupStores } = await pool.query(
      `SELECT s.store_id, s.store_name, s.store_format, s.group_id,
              p.sales_ytd, p.growth_pct, p.trend_label,
              pb.penta_bins_2025, pb.recommended_2026
       FROM ww_stores s
       LEFT JOIN ww_performance p ON p.store_id = s.store_id
       LEFT JOIN ww_pentabin pb ON pb.store_id = s.store_id
       WHERE s.group_id = $1
       ORDER BY s.store_name, s.store_id`,
      [groupId],
    );

    const { byStoreId, hasDollarColumn, hasPctColumn } = getGrowthExtras();
    const scoreboard = buildGroupScoreboard(groupStores, byStoreId);
    const selectedRow = scoreboard.rows.find((r) => r.storeId === storeId);

    res.json({
      store,
      areaGroupId: groupId,
      metricsSources: {
        dollarGrowthFromCsv: hasDollarColumn,
        pctGrowthFromCsv: hasPctColumn,
        pctGrowthFromPerformance: !hasPctColumn,
      },
      pentabin: {
        penta2025: store.penta_bins_2025,
        recommended2026: store.recommended_2026,
      },
      competition: {
        dollar: selectedRow?.dollar ?? { hasData: false, rank: null, totalEligible: 0, value: null, gapToLeader: null, isLeader: false },
        percent: selectedRow?.percent ?? { hasData: false, rank: null, totalEligible: 0, value: null, gapToLeader: null, isLeader: false },
      },
      scoreboard: {
        groupStoreCount: scoreboard.groupStoreCount,
        eligibleDollar: scoreboard.eligibleDollar,
        eligiblePercent: scoreboard.eligiblePercent,
        rows: scoreboard.rows,
      },
      leaderboard: scoreboard.leaderboard,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
