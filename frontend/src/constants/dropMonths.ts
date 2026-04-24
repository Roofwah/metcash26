/** Stored values must parse with Postgres TO_DATE(..., 'Month') on export */
export const DROP_MONTH_OPTIONS = [
  { value: 'September', label: 'SEPT' },
  { value: 'October', label: 'OCT' },
  { value: 'November', label: 'NOV' },
] as const;

export const DEFAULT_DROP_MONTH: (typeof DROP_MONTH_OPTIONS)[number]['value'] = 'September';

const LEGACY_DROP_MONTH: Record<string, string> = {
  March: 'September',
  May: 'October',
  July: 'November',
};

/** Maps old cart values (March/May/July) to Sept/Oct/Nov; unknown → default */
export function normalizeDropMonth(value: string | undefined): string {
  if (!value) return DEFAULT_DROP_MONTH;
  if (LEGACY_DROP_MONTH[value]) return LEGACY_DROP_MONTH[value];
  if (DROP_MONTH_OPTIONS.some((o) => o.value === value)) return value;
  return DEFAULT_DROP_MONTH;
}
