export function fmtDollarGrowth(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return '—';
  const sign = value >= 0 ? '+' : '−';
  return `${sign}$${Math.abs(Math.round(value)).toLocaleString('en-AU')}`;
}

export function fmtPctGrowth(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return '—';
  const sign = value >= 0 ? '+' : '−';
  return `${sign}${Math.abs(value).toFixed(1)}%`;
}

export function fmtGapDollars(gap: number | null | undefined): string {
  if (gap == null || !Number.isFinite(gap)) return '—';
  if (gap <= 0) return 'CURRENT LEADER';
  return `$${Math.round(gap).toLocaleString('en-AU')}\nBEHIND THE LEADER`;
}

export function fmtGapPoints(gap: number | null | undefined): string {
  if (gap == null || !Number.isFinite(gap)) return '—';
  if (gap <= 0) return 'CURRENT LEADER';
  return `${gap.toFixed(1)} PTS\nBEHIND THE LEADER`;
}

export function fmtGapShortDollars(gap: number | null | undefined): string {
  if (gap == null || !Number.isFinite(gap)) return '—';
  if (gap <= 0) return 'Leader';
  return `$${Math.round(gap).toLocaleString('en-AU')} behind`;
}

export function fmtGapShortPoints(gap: number | null | undefined): string {
  if (gap == null || !Number.isFinite(gap)) return '—';
  if (gap <= 0) return 'Leader';
  return `${gap.toFixed(1)} pts behind`;
}

export function formatLabel(storeFormat?: string, storeName?: string): 'WW' | 'WW Metro' {
  if (storeFormat === 'metro') return 'WW Metro';
  if (storeName && /metro/i.test(storeName)) return 'WW Metro';
  return 'WW';
}
