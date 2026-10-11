import React, { useEffect, useState } from 'react';
import { fieldFetch, FieldStoreDashboard } from './fieldApi';
import { storeDisplayName } from '../../storeFormat';
import { formatLabel } from './format';
import CompetitionCard from './CompetitionCard';
import GroupScoreboard from './GroupScoreboard';

interface Props {
  storeId: string;
  onBack: () => void;
}

export default function StoreDashboard({ storeId, onBack }: Props) {
  const [data, setData] = useState<FieldStoreDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const payload = await fieldFetch<FieldStoreDashboard>(
          `/api/ww26/field/stores/${encodeURIComponent(storeId)}`,
        );
        if (!cancelled) setData(payload);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Could not load store');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [storeId]);

  if (loading) {
    return (
      <section className="ww-panel ww-panel-form ww-panel-form--group-detail">
        <p className="ww-store-loading">Loading performance…</p>
      </section>
    );
  }

  if (error || !data) {
    return (
      <section className="ww-panel ww-panel-form ww-panel-form--group-detail">
        <div className="ww-error">{error || 'Store not found'}</div>
        <button type="button" className="ww-btn ww-btn-ghost ww-btn-ghost--form" onClick={onBack}>
          Find another store
        </button>
      </section>
    );
  }

  const { store, areaGroupId, pentabin, competition, scoreboard } = data;
  const format = formatLabel(store.store_format, store.store_name);
  const penta2025 = pentabin.penta2025 ?? store.penta_bins_2025;
  const penta2026 = pentabin.recommended2026 ?? store.recommended_2026;

  return (
    <section className="ww-panel ww-panel-form ww-panel-form--group-detail ww-panel-form--performance">
      <button type="button" className="ww-btn ww-btn-ghost ww-btn-ghost--form fp-back-btn" onClick={onBack}>
        ← Find another store
      </button>

      <h2>{storeDisplayName(store)}</h2>
      <p className="ww-store-location">
        Store {store.store_id} · {format}
      </p>
      <p className="ww-lede ww-lede--performance-title">Area Group {areaGroupId}</p>

      {(penta2025 != null || penta2026 != null) && (
        <div className="ww-summary-cards ww-summary-cards--form fp-pentabin-row">
          <div className="ww-stat ww-stat--form">
            <span>PentaBin 2025</span>
            <strong>{penta2025 ?? '—'}</strong>
          </div>
          <div className="ww-stat ww-stat--form">
            <span>PentaBin 2026</span>
            <strong>{penta2026 ?? '—'}</strong>
          </div>
        </div>
      )}

      <div className="ww-summary-cards ww-summary-cards--form fp-competition-grid">
        <CompetitionCard
          mode="dollar"
          title="Highest $ growth vs YA"
          standing={competition.dollar}
          areaGroupId={areaGroupId}
        />
        <CompetitionCard
          mode="percent"
          title="Highest % growth vs YA"
          standing={competition.percent}
          areaGroupId={areaGroupId}
        />
      </div>

      {!data.metricsSources.dollarGrowthFromCsv && (
        <p className="fp-data-note">
          $ growth vs YA appears when that column is added to salesdata.csv. % growth uses existing WW26 performance data.
        </p>
      )}

      <GroupScoreboard
        areaGroupId={areaGroupId}
        rows={scoreboard.rows}
        groupStoreCount={scoreboard.groupStoreCount}
        eligibleDollar={scoreboard.eligibleDollar}
        eligiblePercent={scoreboard.eligiblePercent}
        selectedStoreId={store.store_id}
      />
    </section>
  );
}
