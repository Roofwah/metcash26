const crypto = require('crypto');
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { pool } = require('./db');
const { initWwSchema } = require('./initSchema');
const { seedSampleData } = require('./seedSampleData');
const { METRO_GROUP_ID } = require('./storeFormat');
const {
  ALLOCATION_SELECT,
  ALLOCATION_JOIN,
  attachAllocation,
  getAllocationForStore,
  upsertStoreManagerCommitment,
  confirmGroupManagerAllocations,
} = require('./storeAllocations');
const {
  loadNetworkCategoryMonths,
  buildCategoryBenchmarkSummary,
} = require('./categoryBenchmark');

const GM_STORE_FILTER = `s.store_format <> 'metro'`;
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';

let dbReady = false;
let seedInfo = null;

function healthPayload() {
  return { ok: true, service: 'ww26', dbReady, seed: seedInfo };
}

function getWw26Status() {
  return { dbReady, seed: seedInfo };
}

function createWw26Application({ standaloneHealth = true, requireAuth = null } = {}) {
  const app = express();
  app.use(cors({ origin: CORS_ORIGIN === '*' ? true : CORS_ORIGIN, credentials: true }));
  app.use(express.json());
  app.use(cookieParser());

  if (requireAuth) {
    app.use('/api/ww26', (req, res, next) => {
      if (req.path === '/healthz') return next();
      return requireAuth(req, res, next);
    });
  }

  app.use('/api/ww26/field', require('./fieldPerformance/routes'));

  const healthHandler = (_req, res) => {
    res.json(healthPayload());
  };
  app.get('/api/ww26/healthz', healthHandler);
  if (standaloneHealth) {
    app.get('/healthz', healthHandler);
  }

  app.get('/api/ww26/groups', async (_req, res) => {
    try {
      const { rows } = await pool.query(
        `SELECT g.group_id, g.group_manager_id, g.group_manager_name, g.region,
                COUNT(s.store_id)::int AS store_count
         FROM ww_groups g
         INNER JOIN ww_stores s ON s.group_id = g.group_id AND ${GM_STORE_FILTER}
         GROUP BY g.group_id, g.group_manager_id, g.group_manager_name, g.region
         HAVING COUNT(s.store_id) > 0
         ORDER BY g.group_id`,
      );
      rows.sort((a, b) => {
        const na = Number.parseInt(String(a.group_id).replace(/\D/g, ''), 10);
        const nb = Number.parseInt(String(b.group_id).replace(/\D/g, ''), 10);
        if (Number.isFinite(na) && Number.isFinite(nb) && na !== nb) return na - nb;
        return String(a.group_id).localeCompare(String(b.group_id), undefined, { numeric: true });
      });
      res.json({ groups: rows });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/ww26/groups/by-manager/:managerId', async (req, res) => {
    try {
      const managerId = String(req.params.managerId || '').trim().toUpperCase();
      const { rows: groups } = await pool.query(
        `SELECT * FROM ww_groups WHERE UPPER(group_manager_id) = $1 LIMIT 1`,
        [managerId],
      );
      if (!groups[0]) return res.status(404).json({ error: 'Group Manager not found.' });
      const group = groups[0];
      const { rows: stores } = await pool.query(
        `SELECT s.*, p.sales_ytd, p.sales_2024, p.units_2024, p.units_2025, p.growth_pct, p.trend_label,
                pb.penta_bins_2024, pb.penta_bins_2025, pb.current_soh, pb.recommended_2026,
                c.category_apr, c.category_may, c.category_jun, c.category_jul, c.category_aug,
                ${ALLOCATION_SELECT}
         FROM ww_stores s
         LEFT JOIN ww_performance p ON p.store_id = s.store_id
         ${ALLOCATION_JOIN}
         LEFT JOIN ww_category_sales c ON c.store_id = s.store_id
         WHERE s.group_id = $1 AND ${GM_STORE_FILTER}
         ORDER BY s.store_name, s.store_id`,
        [group.group_id],
      );
      res.json({ group, stores: stores.map(attachAllocation) });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/ww26/stores/search', async (req, res) => {
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
        `SELECT s.*, g.group_manager_id, g.group_manager_name, g.region AS group_region
         FROM ww_stores s
         JOIN ww_groups g ON g.group_id = s.group_id
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

  app.get('/api/ww26/groups/:groupId', async (req, res) => {
    try {
      const groupId = String(req.params.groupId || '').trim();
      const { rows: groups } = await pool.query(`SELECT * FROM ww_groups WHERE group_id = $1`, [groupId]);
      if (!groups[0]) return res.status(404).json({ error: 'Group not found.' });
      const storeFilter = groupId === METRO_GROUP_ID ? 'TRUE' : GM_STORE_FILTER;
      const { rows: stores } = await pool.query(
        `SELECT s.*, p.sales_ytd, p.sales_2024, p.units_2024, p.units_2025, p.growth_pct, p.trend_label,
                pb.penta_bins_2024, pb.penta_bins_2025, pb.current_soh, pb.recommended_2026,
                c.category_apr, c.category_may, c.category_jun, c.category_jul, c.category_aug,
                ${ALLOCATION_SELECT}
         FROM ww_stores s
         LEFT JOIN ww_performance p ON p.store_id = s.store_id
         ${ALLOCATION_JOIN}
         LEFT JOIN ww_category_sales c ON c.store_id = s.store_id
         WHERE s.group_id = $1 AND ${storeFilter}
         ORDER BY s.store_name, s.store_id`,
        [groupId],
      );
      const withMetrics = stores.filter(
        (s) => s.sales_ytd != null || s.growth_pct != null || s.trend_label || s.recommended_2026 != null,
      );
      const salesTotal = stores.reduce((sum, s) => sum + (Number(s.sales_ytd) || 0), 0);
      const networkMonths = await loadNetworkCategoryMonths(pool, GM_STORE_FILTER);
      const categoryBenchmark = buildCategoryBenchmarkSummary(stores, networkMonths);
      res.json({
        group: groups[0],
        stores: stores.map(attachAllocation),
        summary: {
          storeCount: stores.length,
          storesWithMetrics: withMetrics.length,
          salesYtd: Math.round(salesTotal),
          recommendedPentabins: withMetrics.reduce((s, r) => s + Number(r.recommended_2026 || 0), 0),
          ...categoryBenchmark,
        },
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/ww26/sessions', async (req, res) => {
    try {
      const participantName = String(req.body?.participantName || '').trim();
      const participantRole = String(req.body?.participantRole || '').trim();
      const groupId = String(req.body?.groupId || '').trim();
      const participantStoreId = String(req.body?.participantStoreId || '').trim() || null;

      if (!participantName || !participantRole || !groupId) {
        return res.status(400).json({ error: 'participantName, participantRole and groupId are required.' });
      }

      const sessionId = `WW26-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
      await pool.query(
        `INSERT INTO ww_sessions (session_id, participant_name, participant_role, group_id, participant_store_id)
         VALUES ($1, $2, $3, $4, $5)`,
        [sessionId, participantName, participantRole, groupId, participantStoreId],
      );
      res.json({ sessionId, participantName, participantRole, groupId, participantStoreId });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/ww26/sessions/:sessionId/store-commitment', async (req, res) => {
    try {
      const sessionId = String(req.params.sessionId || '').trim();
      const role = String(req.body?.participantRole || '').trim();
      const storeId = String(req.body?.storeId || '').trim();
      const recommended = Number(req.body?.recommended) || 0;
      const finalQty = Number(req.body?.finalQuantity) || 0;

      if (role !== 'Store Manager') {
        return res.status(403).json({ error: 'Only Store Managers can commit allocations for their store.' });
      }

      const { rows: sessions } = await pool.query(`SELECT * FROM ww_sessions WHERE session_id = $1`, [sessionId]);
      const session = sessions[0];
      if (!session) return res.status(404).json({ error: 'Session not found.' });
      if (session.participant_store_id && storeId !== session.participant_store_id) {
        return res.status(403).json({ error: 'Can only record data for your selected store.' });
      }

      const result = await upsertStoreManagerCommitment(pool, {
        storeId,
        recommended,
        quantity: finalQty,
        participantName: session.participant_name,
      });
      if (!result.ok) {
        return res.status(result.status).json({
          error: result.error,
          code: result.code,
          allocation: result.allocation,
        });
      }

      await pool.query(
        `INSERT INTO ww_commitments (session_id, store_id, recommended_quantity, final_quantity, variance, overridden, confirmed_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())
         ON CONFLICT (session_id, store_id) DO UPDATE SET
           recommended_quantity = EXCLUDED.recommended_quantity,
           final_quantity = EXCLUDED.final_quantity,
           variance = EXCLUDED.variance,
           overridden = EXCLUDED.overridden,
           confirmed_at = NOW()`,
        [sessionId, storeId, recommended, finalQty, finalQty - recommended, finalQty !== recommended],
      );

      res.json({ ok: true, sessionId, allocation: result.allocation });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/ww26/sessions/:sessionId/complete', async (req, res) => {
    try {
      const sessionId = String(req.params.sessionId || '').trim();
      const role = String(req.body?.participantRole || '').trim();

      if (role === 'Group Manager') {
        return res.status(403).json({ error: 'Group Managers should confirm the plan from the summary screen.' });
      }

      const { rows: sessions } = await pool.query(`SELECT * FROM ww_sessions WHERE session_id = $1`, [sessionId]);
      if (!sessions[0]) return res.status(404).json({ error: 'Session not found.' });

      await pool.query(
        `UPDATE ww_sessions SET status = 'completed', completed_at = NOW() WHERE session_id = $1`,
        [sessionId],
      );

      res.json({ ok: true, sessionId });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/ww26/stores/:storeId/allocation', async (req, res) => {
    try {
      const storeId = String(req.params.storeId || '').trim();
      const allocation = await getAllocationForStore(pool, storeId);
      if (!allocation) return res.status(404).json({ error: 'Store not found.' });
      res.json({ allocation });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/ww26/sessions/:sessionId/commitments', async (req, res) => {
    try {
      const sessionId = String(req.params.sessionId || '').trim();
      const items = Array.isArray(req.body?.items) ? req.body.items : [];
      const role = String(req.body?.participantRole || '').trim();

      if (role !== 'Group Manager') {
        return res.status(403).json({ error: 'Only Group Managers can confirm PentaBin allocations.' });
      }

      const { rows: sessions } = await pool.query(`SELECT * FROM ww_sessions WHERE session_id = $1`, [sessionId]);
      const session = sessions[0];
      if (!session) return res.status(404).json({ error: 'Session not found.' });

      const gmResult = await confirmGroupManagerAllocations(pool, {
        groupId: session.group_id,
        participantName: session.participant_name,
        items,
      });
      if (!gmResult.ok) {
        return res.status(gmResult.status).json({ error: gmResult.error });
      }

      for (const item of items) {
        const storeId = String(item.storeId || '').trim();
        const recommended = Number(item.recommended) || 0;
        const finalQty = Number(item.finalQuantity) || 0;
        const overridden = finalQty !== recommended;
        await pool.query(
          `INSERT INTO ww_commitments (session_id, store_id, recommended_quantity, final_quantity, variance, overridden, confirmed_at)
           VALUES ($1, $2, $3, $4, $5, $6, NOW())
           ON CONFLICT (session_id, store_id) DO UPDATE SET
             recommended_quantity = EXCLUDED.recommended_quantity,
             final_quantity = EXCLUDED.final_quantity,
             variance = EXCLUDED.variance,
             overridden = EXCLUDED.overridden,
             confirmed_at = NOW()`,
          [sessionId, storeId, recommended, finalQty, finalQty - recommended, overridden],
        );
      }

      await pool.query(
        `UPDATE ww_sessions SET status = 'completed', completed_at = NOW() WHERE session_id = $1`,
        [sessionId],
      );

      res.json({ ok: true, sessionId, itemCount: items.length });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/ww26/sessions/:sessionId/feedback', async (req, res) => {
    try {
      const sessionId = String(req.params.sessionId || '').trim();
      const role = String(req.body?.participantRole || '').trim();
      const raw = req.body?.feedback;
      const feedback =
        raw === undefined || raw === null ? null : String(raw).trim().slice(0, 4000) || null;

      const canSubmitFeedback = role === 'Group Manager' || role === 'Store Manager';
      if (!canSubmitFeedback) {
        return res.status(403).json({ error: 'Feedback is available for Group and Store Managers only.' });
      }

      const { rows: sessions } = await pool.query(`SELECT session_id FROM ww_sessions WHERE session_id = $1`, [
        sessionId,
      ]);
      if (!sessions[0]) return res.status(404).json({ error: 'Session not found.' });

      await pool.query(`UPDATE ww_sessions SET feedback = $2 WHERE session_id = $1`, [sessionId, feedback]);

      res.json({ ok: true, sessionId });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return app;
}

async function initWw26() {
  try {
    await initWwSchema();
    seedInfo = await seedSampleData(pool);
    dbReady = true;
    console.log('WW26 database ready.');
  } catch (err) {
    dbReady = false;
    console.error('WW26 DB init failed:', err.message);
    throw err;
  }
}

module.exports = {
  createWw26Application,
  initWw26,
  getWw26Status,
};
