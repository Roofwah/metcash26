import React, { useMemo, useState } from 'react';
import { ScoreboardRow } from './fieldApi';
import { storeDisplayName } from '../../storeFormat';
import {
  fmtDollarGrowth,
  fmtGapShortDollars,
  fmtGapShortPoints,
  fmtPctGrowth,
} from './format';

type Mode = 'dollar' | 'percent';

interface Props {
  areaGroupId: string;
  rows: ScoreboardRow[];
  eligibleDollar: number;
  eligiblePercent: number;
  groupStoreCount: number;
  selectedStoreId: string;
}

function standingForMode(row: ScoreboardRow, mode: Mode) {
  return mode === 'dollar' ? row.dollar : row.percent;
}

function sortScoreboardRows(rows: ScoreboardRow[], mode: Mode) {
  return [...rows].sort((a, b) => {
    const sa = standingForMode(a, mode);
    const sb = standingForMode(b, mode);
    if (sa.hasData && sb.hasData && sa.rank != null && sb.rank != null) {
      return sa.rank - sb.rank;
    }
    if (sa.hasData && !sb.hasData) return -1;
    if (!sa.hasData && sb.hasData) return 1;
    return a.storeName.localeCompare(b.storeName, undefined, { sensitivity: 'base' });
  });
}

function fmtVsLeader(mode: Mode, row: ScoreboardRow) {
  const s = standingForMode(row, mode);
  if (!s.hasData) return '—';
  return mode === 'dollar'
    ? fmtGapShortDollars(s.gapToLeader)
    : fmtGapShortPoints(s.gapToLeader);
}

export default function GroupScoreboard({
  areaGroupId,
  rows,
  eligibleDollar,
  eligiblePercent,
  groupStoreCount,
  selectedStoreId,
}: Props) {
  const [mode, setMode] = useState<Mode>('percent');
  const eligible = mode === 'dollar' ? eligibleDollar : eligiblePercent;
  const sorted = useMemo(() => sortScoreboardRows(rows, mode), [rows, mode]);

  return (
    <div className="fp-scoreboard">
      <h3 className="fp-leaderboard-title">
        Area Group {areaGroupId} · Scoreboard
      </h3>
      <p className="fp-scoreboard-sub">
        {groupStoreCount} stores in group · {eligible} ranked on {mode === 'dollar' ? '$' : '%'} growth
      </p>

      <div className="ww-tile-group ww-tile-group--grid fp-leaderboard-toggle" role="tablist" aria-label="Scoreboard metric">
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'dollar'}
          className={`ww-tile${mode === 'dollar' ? ' is-selected' : ''}`}
          onClick={() => setMode('dollar')}
        >
          <span>$ growth rank</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'percent'}
          className={`ww-tile${mode === 'percent' ? ' is-selected' : ''}`}
          onClick={() => setMode('percent')}
        >
          <span>% growth rank</span>
        </button>
      </div>

      {eligible === 0 ? (
        <p className="ww-lede fp-leaderboard-empty">
          {mode === 'dollar'
            ? 'No $ growth vs YA data in this area group yet.'
            : 'No % growth data in this area group yet.'}
        </p>
      ) : (
        <div className="fp-scoreboard-scroll">
          <div className="fp-scoreboard-head" aria-hidden="true">
            <span>Rank</span>
            <span>Store</span>
            <span>{mode === 'dollar' ? '$ growth' : '% growth'}</span>
            <span>vs leader</span>
          </div>
          <ul className="fp-scoreboard-list">
            {sorted.map((row) => {
              const s = standingForMode(row, mode);
              const isSelected = row.storeId === selectedStoreId;
              const value = mode === 'dollar' ? fmtDollarGrowth(s.value) : fmtPctGrowth(s.value);
              const rankLabel = s.hasData && s.rank != null ? s.rank : '—';
              return (
                <li
                  key={row.storeId}
                  className={`fp-scoreboard-row${isSelected ? ' is-selected' : ''}${!s.hasData ? ' is-no-data' : ''}`}
                >
                  <span className="fp-sb-rank">{rankLabel}</span>
                  <span className="fp-sb-store">
                    <strong>
                      {storeDisplayName({ store_name: row.storeName, store_format: row.storeFormat })}
                    </strong>
                    <small>{row.storeId}</small>
                  </span>
                  <span className="fp-sb-value">{value}</span>
                  <span className="fp-sb-gap">{fmtVsLeader(mode, row)}</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
