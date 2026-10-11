function storeHasMetrics(row) {
  return (
    row.sales_ytd != null
    || row.growth_pct != null
    || row.trend_label
    || row.recommended_2026 != null
    || row.penta_bins_2025 != null
  );
}

function metricValue(row, mode, extrasByStoreId) {
  const extras = extrasByStoreId.get(row.store_id) || {};
  if (mode === 'dollar') {
    if (extras.dollarGrowthYa != null) return Number(extras.dollarGrowthYa);
    return null;
  }
  if (extras.pctGrowthYa != null) return Number(extras.pctGrowthYa);
  if (row.growth_pct != null && row.growth_pct !== '') return Number(row.growth_pct);
  return null;
}

function rankGroup(stores, mode, extrasByStoreId) {
  const eligible = stores
    .map((s) => ({
      storeId: s.store_id,
      storeName: s.store_name,
      storeFormat: s.store_format,
      value: metricValue(s, mode, extrasByStoreId),
    }))
    .filter((s) => s.value != null && Number.isFinite(s.value));

  eligible.sort((a, b) => b.value - a.value);
  const ranked = eligible.map((entry, index) => ({
    ...entry,
    rank: index + 1,
  }));

  const leader = ranked[0] || null;
  return { ranked, leader, totalEligible: ranked.length };
}

function standingForStore(storeId, rankResult) {
  const entry = rankResult.ranked.find((r) => r.storeId === storeId);
  if (!entry) {
    return {
      hasData: false,
      rank: null,
      totalEligible: rankResult.totalEligible,
      value: null,
      gapToLeader: null,
      isLeader: false,
    };
  }

  const leaderValue = rankResult.leader ? rankResult.leader.value : entry.value;
  const isLeader = rankResult.leader?.storeId === storeId;
  const gapToLeader = isLeader ? 0 : leaderValue - entry.value;

  return {
    hasData: true,
    rank: entry.rank,
    totalEligible: rankResult.totalEligible,
    value: entry.value,
    gapToLeader,
    isLeader,
  };
}

function metricStandingForStore(storeId, rankResult) {
  return standingForStore(storeId, rankResult);
}

/** Full area-group scoreboard: every store, both competitions, rank + gap vs leader. */
function buildGroupScoreboard(allGroupStores, extrasByStoreId) {
  const withMetrics = allGroupStores.filter(storeHasMetrics);
  const dollarRanks = rankGroup(withMetrics, 'dollar', extrasByStoreId);
  const pctRanks = rankGroup(withMetrics, 'percent', extrasByStoreId);

  const rows = allGroupStores.map((s) => ({
    storeId: s.store_id,
    storeName: s.store_name,
    storeFormat: s.store_format,
    dollar: metricStandingForStore(s.store_id, dollarRanks),
    percent: metricStandingForStore(s.store_id, pctRanks),
  }));

  return {
    groupStoreCount: allGroupStores.length,
    eligibleDollar: dollarRanks.totalEligible,
    eligiblePercent: pctRanks.totalEligible,
    rows,
    leaderboard: {
      dollar: dollarRanks.ranked,
      percent: pctRanks.ranked,
    },
  };
}

module.exports = {
  storeHasMetrics,
  metricValue,
  rankGroup,
  standingForStore,
  buildGroupScoreboard,
};
