import React, { useCallback, useEffect, useId, useMemo, useState } from 'react';
import './CategoryTrendSparkline.css';

const MONTH_LABELS = ['Apr', 'May', 'Jun', 'Jul', 'Aug'] as const;
const MONTH_KEYS = [
  'category_apr',
  'category_may',
  'category_jun',
  'category_jul',
  'category_aug',
] as const;

export type CategoryMonthKey = (typeof MONTH_KEYS)[number];

export type CategoryStoreFields = Partial<Record<CategoryMonthKey, number | string | null>>;

function parseMonthValue(value: number | string | null | undefined): number | null {
  if (value === undefined || value === null || String(value).trim() === '') return null;
  const n = Number(String(value).replace(/[$,\s]/g, ''));
  return Number.isFinite(n) ? n : null;
}

export function categoryMonthValues(store: CategoryStoreFields): (number | null)[] {
  return MONTH_KEYS.map((key) => parseMonthValue(store[key]));
}

export function hasAnyCategoryMonth(store: CategoryStoreFields): boolean {
  return categoryMonthValues(store).some((v) => v !== null);
}

export function categoryShiftFromMonthValues(values: (number | null)[]): number | null {
  const defined = values.filter((v): v is number => v !== null);
  if (defined.length < 2) return null;
  const first = defined[0];
  const last = defined[defined.length - 1];
  if (!first) return null;
  return Math.round(((last - first) / first) * 1000) / 10;
}

function formatShiftPct(pct: number): string {
  const rounded = Math.round(pct * 10) / 10;
  if (rounded > 0) return `+${rounded.toFixed(1)}%`;
  if (rounded < 0) return `${rounded.toFixed(1)}%`;
  return '0.0%';
}

type SparkPoint = { x: number; y: number };

function sparkGeometry(values: (number | null)[], width: number, height: number) {
  const padY = 4;
  const innerH = height - padY * 2;
  const baseY = height - padY;

  const defined = values
    .map((v, i) => (v === null ? null : { v, i }))
    .filter((x): x is { v: number; i: number } => x !== null);
  if (defined.length < 2) return { linePath: '', areaPath: '', points: [] as SparkPoint[] };

  const nums = defined.map((d) => d.v);
  const min = Math.min(...nums);
  const max = Math.max(...nums);
  const range = max - min || 1;
  const xAt = (index: number) => (index / (values.length - 1)) * width;
  const yAt = (val: number) => padY + innerH - ((val - min) / range) * innerH;

  const pts: SparkPoint[] = defined.map((d) => ({
    x: xAt(d.i),
    y: yAt(d.v),
  }));

  let linePath = `M ${pts[0].x.toFixed(2)} ${pts[0].y.toFixed(2)}`;
  for (let i = 1; i < pts.length; i += 1) {
    const prev = pts[i - 1];
    const curr = pts[i];
    const cx = (prev.x + curr.x) / 2;
    linePath += ` C ${cx.toFixed(2)} ${prev.y.toFixed(2)}, ${cx.toFixed(2)} ${curr.y.toFixed(2)}, ${curr.x.toFixed(2)} ${curr.y.toFixed(2)}`;
  }

  const areaPath = `${linePath} L ${pts[pts.length - 1].x.toFixed(2)} ${baseY} L ${pts[0].x.toFixed(2)} ${baseY} Z`;

  return { linePath, areaPath, points: pts };
}

function smoothLineThroughPoints(pts: SparkPoint[]) {
  if (!pts.length) return '';
  if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`;
  let linePath = `M ${pts[0].x.toFixed(2)} ${pts[0].y.toFixed(2)}`;
  for (let i = 1; i < pts.length; i += 1) {
    const prev = pts[i - 1];
    const curr = pts[i];
    const cx = (prev.x + curr.x) / 2;
    linePath += ` C ${cx.toFixed(2)} ${prev.y.toFixed(2)}, ${cx.toFixed(2)} ${curr.y.toFixed(2)}, ${curr.x.toFixed(2)} ${curr.y.toFixed(2)}`;
  }
  return linePath;
}

function fmtMoney(n: number) {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    maximumFractionDigits: 0,
  }).format(n);
}

export type CategoryTrendDirection = 'up' | 'down' | 'flat';

export function directionFromCategoryShift(pct: number | null | undefined): CategoryTrendDirection {
  if (pct == null || !Number.isFinite(pct)) return 'flat';
  if (pct > 0.5) return 'up';
  if (pct < -0.5) return 'down';
  return 'flat';
}

type Props = {
  store?: CategoryStoreFields;
  monthValues?: (number | null)[] | null;
  compact?: boolean;
  showModal?: boolean;
  trendDirection?: CategoryTrendDirection;
  hideLabel?: boolean;
  shiftPct?: number | null;
};

export default function CategoryTrendSparkline({
  store,
  monthValues = null,
  compact = false,
  showModal = true,
  trendDirection = 'up',
  hideLabel = false,
  shiftPct = null,
}: Props) {
  const fillGradientId = useId().replace(/:/g, '');
  const values = useMemo(() => {
    if (monthValues && monthValues.length > 0) return monthValues;
    return categoryMonthValues(store ?? {});
  }, [store, monthValues]);
  const hasData = values.some((v) => v !== null);
  const resolvedShift = useMemo(() => {
    const fromCategory = categoryShiftFromMonthValues(values);
    if (fromCategory != null) return fromCategory;
    if (shiftPct != null && Number.isFinite(Number(shiftPct))) return Number(shiftPct);
    return null;
  }, [shiftPct, values]);
  const effectiveDirection = useMemo(
    () => directionFromCategoryShift(resolvedShift) ?? trendDirection,
    [resolvedShift, trendDirection],
  );
  const shiftLabel = resolvedShift != null ? formatShiftPct(resolvedShift) : null;
  const sparkW = compact ? 240 : 320;
  const sparkH = compact ? 44 : 72;
  const pathToneClass = `ww-category-sparkline-path--${effectiveDirection}`;
  const areaToneClass = `ww-category-sparkline-area--${effectiveDirection}`;
  const spark = useMemo(() => sparkGeometry(values, sparkW, sparkH), [values]);
  const [open, setOpen] = useState(false);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const close = useCallback(() => {
    setOpen(false);
    setHoverIndex(null);
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, close]);

  const chart = useMemo(() => {
    const defined = values
      .map((v, i) => (v === null ? null : { v, i }))
      .filter((x): x is { v: number; i: number } => x !== null);
    if (!defined.length) return null;

    const w = 320;
    const h = 180;
    const pad = { t: 16, r: 12, b: 28, l: 52 };
    const innerW = w - pad.l - pad.r;
    const innerH = h - pad.t - pad.b;
    const nums = defined.map((d) => d.v);
    const min = Math.min(...nums);
    const max = Math.max(...nums);
    const range = max - min || 1;

    const xAt = (i: number) => pad.l + (i / (values.length - 1)) * innerW;
    const yAt = (val: number) => pad.t + innerH - ((val - min) / range) * innerH;

    const yTicks = [min, min + range / 2, max];
    const linePts: SparkPoint[] = defined.map((d) => ({ x: xAt(d.i), y: yAt(d.v) }));
    const linePath = smoothLineThroughPoints(linePts);
    const baseY = pad.t + innerH;
    const areaPath =
      linePath && linePts.length
        ? `${linePath} L ${linePts[linePts.length - 1].x} ${baseY} L ${linePts[0].x} ${baseY} Z`
        : '';

    const points = values.map((v, i) =>
      v === null ? null : { x: xAt(i), y: yAt(v), v, i },
    );

    return { w, h, pad, innerW, innerH, min, max, range, yTicks, linePath, areaPath, points };
  }, [values]);

  const shiftBadge = shiftLabel ? (
    <span className={`ww-category-shift ww-category-shift--${effectiveDirection}`}>{shiftLabel}</span>
  ) : null;

  if (!hasData) {
    return (
      <div
        className={`ww-category-trend ww-category-trend--empty${compact ? ' ww-category-trend--compact' : ''}`}
      >
        {!hideLabel ? <span className="ww-category-trend-label">Category Trend</span> : null}
        <div className={`ww-category-trend-row${compact ? ' ww-category-trend-row--compact' : ''}`}>
          <span className="ww-category-trend-dash">—</span>
          {shiftBadge}
        </div>
      </div>
    );
  }

  const sparklineSvg = (
    <svg
      className={`ww-category-sparkline ww-category-sparkline--${effectiveDirection}`}
      viewBox={`0 0 ${sparkW} ${sparkH}`}
      width="100%"
      height={sparkH}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={fillGradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.28" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0.04" />
        </linearGradient>
      </defs>
      {spark.areaPath ? (
        <path
          d={spark.areaPath}
          className={`ww-category-sparkline-area ${areaToneClass}`}
          fill={`url(#${fillGradientId})`}
        />
      ) : null}
      {spark.linePath ? (
        <path d={spark.linePath} className={`ww-category-sparkline-path ${pathToneClass}`} />
      ) : null}
    </svg>
  );

  return (
    <>
      <div className={`ww-category-trend${compact ? ' ww-category-trend--compact' : ''}`}>
        {!hideLabel ? <span className="ww-category-trend-label">Category Trend</span> : null}
        <div className={`ww-category-trend-row${compact ? ' ww-category-trend-row--compact' : ''}`}>
          {showModal ? (
            <button
              type="button"
              className="ww-category-sparkline-btn"
              aria-label="Open battery category sales trend chart"
              onClick={() => setOpen(true)}
            >
              {sparklineSvg}
            </button>
          ) : (
            <div className="ww-category-sparkline-static" aria-hidden="true">
              {sparklineSvg}
            </div>
          )}
          {shiftBadge}
        </div>
      </div>

      {showModal && open && chart && (
        <div
          className="ww-modal-backdrop"
          role="presentation"
          onClick={close}
        >
          <div
            className="ww-modal ww-category-chart-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ww-category-chart-title"
            onClick={(e) => e.stopPropagation()}
          >
            <button type="button" className="ww-category-modal-close" aria-label="Close" onClick={close}>
              ×
            </button>
            <h3 id="ww-category-chart-title">Battery Category Sales Trend</h3>
            <svg
              className="ww-category-chart"
              viewBox={`0 0 ${chart.w} ${chart.h}`}
              width="100%"
              height={chart.h}
              role="img"
              aria-label="Battery category sales from April through August"
            >
              {chart.yTicks.map((tick) => {
                const y = chart.pad.t + chart.innerH - ((tick - chart.min) / chart.range) * chart.innerH;
                return (
                  <g key={tick}>
                    <text x={chart.pad.l - 6} y={y + 4} className="ww-category-chart-axis" textAnchor="end">
                      {fmtMoney(tick)}
                    </text>
                  </g>
                );
              })}
              {MONTH_LABELS.map((label, i) => {
                const x = chart.pad.l + (i / (values.length - 1)) * (chart.w - chart.pad.l - chart.pad.r);
                return (
                  <text
                    key={label}
                    x={x}
                    y={chart.h - 6}
                    className="ww-category-chart-axis"
                    textAnchor="middle"
                  >
                    {label}
                  </text>
                );
              })}
              <defs>
                <linearGradient id={`${fillGradientId}-modal`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#125221" stopOpacity="0.28" />
                  <stop offset="100%" stopColor="#125221" stopOpacity="0.03" />
                </linearGradient>
              </defs>
              {chart.areaPath ? (
                <path d={chart.areaPath} fill={`url(#${fillGradientId}-modal)`} stroke="none" />
              ) : null}
              {chart.linePath ? (
                <path d={chart.linePath} className="ww-category-chart-line" fill="none" />
              ) : null}
              {chart.points.map((pt) =>
                pt ? (
                  <g key={pt.i}>
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r={hoverIndex === pt.i ? 6 : 4}
                      className="ww-category-chart-point"
                      onMouseEnter={() => setHoverIndex(pt.i)}
                      onMouseLeave={() => setHoverIndex(null)}
                      onFocus={() => setHoverIndex(pt.i)}
                      onBlur={() => setHoverIndex(null)}
                      tabIndex={0}
                    />
                  </g>
                ) : null,
              )}
            </svg>
            {hoverIndex !== null && values[hoverIndex] !== null && (
              <p className="ww-category-chart-tooltip">
                {MONTH_LABELS[hoverIndex]}: <strong>{fmtMoney(values[hoverIndex] as number)}</strong>
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
