import React from 'react';
import { CompetitionStanding } from './fieldApi';
import { fmtDollarGrowth, fmtGapDollars, fmtGapPoints, fmtPctGrowth } from './format';

type Mode = 'dollar' | 'percent';

interface Props {
  mode: Mode;
  title: string;
  standing: CompetitionStanding;
  areaGroupId: string;
}

export default function CompetitionCard({ mode, title, standing, areaGroupId }: Props) {
  const valueLabel = mode === 'dollar' ? fmtDollarGrowth(standing.value) : fmtPctGrowth(standing.value);
  const gapText = standing.isLeader
    ? 'CURRENT LEADER'
    : mode === 'dollar'
      ? fmtGapDollars(standing.gapToLeader).replace('\n', ' · ')
      : fmtGapPoints(standing.gapToLeader).replace('\n', ' · ');

  return (
    <div className="ww-stat ww-stat--form fp-competition-card">
      <span>{title}</span>
      {!standing.hasData ? (
        <strong className="fp-competition-value">—</strong>
      ) : (
        <>
          <strong className="fp-competition-value">{valueLabel}</strong>
          <p className="fp-competition-rank">
            #{standing.rank} of {standing.totalEligible} · Area Group {areaGroupId}
          </p>
          <p className={`fp-competition-gap${standing.isLeader ? ' fp-competition-gap--leader' : ''}`}>
            {gapText}
          </p>
        </>
      )}
    </div>
  );
}
