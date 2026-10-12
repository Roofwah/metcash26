/** Per-store PentaBin: recommended default; SM and GM may each commit — most recent commit wins. */

function parseTs(value) {
  if (!value) return null;
  const t = new Date(value).getTime();
  return Number.isNaN(t) ? null : t;
}

function resolveAllocationAuthority({ smQty, gmQty, smAt, gmAt }) {
  const smActive = smAt != null && smQty != null;
  const gmActive = gmAt != null && gmQty != null;
  if (!smActive && !gmActive) {
    return { finalStatus: 'none', effectiveQuantity: null };
  }
  if (smActive && !gmActive) {
    return { finalStatus: 'store_manager', effectiveQuantity: smQty };
  }
  if (gmActive && !smActive) {
    return { finalStatus: 'group_manager', effectiveQuantity: gmQty };
  }
  const smTs = parseTs(smAt);
  const gmTs = parseTs(gmAt);
  if (smTs != null && gmTs != null) {
    if (smTs > gmTs) return { finalStatus: 'store_manager', effectiveQuantity: smQty };
    return { finalStatus: 'group_manager', effectiveQuantity: gmQty };
  }
  if (smTs != null) return { finalStatus: 'store_manager', effectiveQuantity: smQty };
  return { finalStatus: 'group_manager', effectiveQuantity: gmQty };
}

function allocationFromRow(row) {
  if (!row) return null;
  const hasAllocation = row.allocation_store_id != null || row.store_manager_committed_at || row.group_manager_confirmed_at;
  const recommended = Number(row.recommended_quantity ?? row.recommended_2026) || 0;
  const smQty = row.store_manager_quantity != null ? Number(row.store_manager_quantity) : null;
  const gmQty = row.group_manager_quantity != null ? Number(row.group_manager_quantity) : null;
  const gmAt = row.group_manager_confirmed_at;
  const smAt = row.store_manager_committed_at;

  const { finalStatus, effectiveQuantity: authorityQty } = resolveAllocationAuthority({
    smQty,
    gmQty,
    smAt,
    gmAt,
  });
  const effectiveQuantity = authorityQty != null ? authorityQty : recommended;

  if (!hasAllocation && finalStatus === 'none') {
    return {
      recommendedQuantity: recommended,
      storeManagerQuantity: null,
      storeManagerName: null,
      storeManagerCommittedAt: null,
      groupManagerQuantity: null,
      groupManagerName: null,
      groupManagerConfirmedAt: null,
      finalStatus: 'none',
      effectiveQuantity: recommended,
    };
  }

  return {
    recommendedQuantity: recommended,
    storeManagerQuantity: smQty,
    storeManagerName: row.store_manager_name || null,
    storeManagerCommittedAt: smAt || null,
    groupManagerQuantity: gmQty,
    groupManagerName: row.group_manager_name || null,
    groupManagerConfirmedAt: gmAt || null,
    finalStatus,
    effectiveQuantity,
  };
}

const ALLOCATION_SELECT = `
  a.store_id AS allocation_store_id,
  COALESCE(a.recommended_quantity, pb.recommended_2026, 0)::int AS recommended_quantity,
  a.store_manager_quantity,
  a.store_manager_name,
  a.store_manager_committed_at,
  a.group_manager_quantity,
  a.group_manager_name,
  a.group_manager_confirmed_at
`;

const ALLOCATION_JOIN = `
  LEFT JOIN ww_pentabin pb ON pb.store_id = s.store_id
  LEFT JOIN ww_store_allocations a ON a.store_id = s.store_id
`;

function attachAllocation(storeRow) {
  const allocation = allocationFromRow(storeRow);
  return { ...storeRow, allocation };
}

async function getAllocationForStore(pool, storeId) {
  const { rows } = await pool.query(
    `SELECT s.store_id, pb.recommended_2026,
            ${ALLOCATION_SELECT}
     FROM ww_stores s
     ${ALLOCATION_JOIN}
     WHERE s.store_id = $1`,
    [storeId],
  );
  return allocationFromRow(rows[0]);
}

async function upsertStoreManagerCommitment(pool, { storeId, recommended, quantity, participantName }) {
  const rec = Math.max(0, Number(recommended) || 0);
  const qty = Math.max(0, Number(quantity) || 0);

  await pool.query(`SELECT store_id FROM ww_store_allocations WHERE store_id = $1 FOR UPDATE`, [storeId]);

  await pool.query(
    `INSERT INTO ww_store_allocations (
       store_id, recommended_quantity,
       store_manager_quantity, store_manager_name, store_manager_committed_at,
       updated_at
     ) VALUES ($1, $2, $3, $4, NOW(), NOW())
     ON CONFLICT (store_id) DO UPDATE SET
       recommended_quantity = EXCLUDED.recommended_quantity,
       store_manager_quantity = EXCLUDED.store_manager_quantity,
       store_manager_name = EXCLUDED.store_manager_name,
       store_manager_committed_at = EXCLUDED.store_manager_committed_at,
       updated_at = NOW()`,
    [storeId, rec, qty, participantName],
  );

  return { ok: true, allocation: await getAllocationForStore(pool, storeId) };
}

async function confirmGroupManagerAllocations(pool, { groupId, participantName, items }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const item of items) {
      const storeId = String(item.storeId || '').trim();
      const recommended = Number(item.recommended) || 0;
      const finalQty = Math.max(0, Number(item.finalQuantity) || 0);

      const { rows: storeRows } = await client.query(
        `SELECT s.store_id FROM ww_stores s WHERE s.store_id = $1 AND s.group_id = $2`,
        [storeId, groupId],
      );
      if (!storeRows[0]) {
        await client.query('ROLLBACK');
        return { ok: false, status: 400, error: `Store ${storeId} is not in this group.` };
      }

      await client.query(
        `SELECT store_id FROM ww_store_allocations WHERE store_id = $1 FOR UPDATE`,
        [storeId],
      );

      await client.query(
        `INSERT INTO ww_store_allocations (
           store_id, recommended_quantity,
           group_manager_quantity, group_manager_name, group_manager_confirmed_at,
           updated_at
         ) VALUES ($1, $2, $3, $4, NOW(), NOW())
         ON CONFLICT (store_id) DO UPDATE SET
           recommended_quantity = EXCLUDED.recommended_quantity,
           group_manager_quantity = EXCLUDED.group_manager_quantity,
           group_manager_name = EXCLUDED.group_manager_name,
           group_manager_confirmed_at = NOW(),
           updated_at = NOW()`,
        [storeId, recommended, finalQty, participantName],
      );
    }
    await client.query('COMMIT');
    return { ok: true };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = {
  ALLOCATION_SELECT,
  ALLOCATION_JOIN,
  allocationFromRow,
  resolveAllocationAuthority,
  attachAllocation,
  getAllocationForStore,
  upsertStoreManagerCommitment,
  confirmGroupManagerAllocations,
};
