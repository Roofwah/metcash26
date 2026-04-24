import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { apiUrl } from '../api';
import './Dashboard.css';

interface Order {
  id: number;
  created_at: string;
  store_name: string;
  banner: string;
  user_name: string;
  store_email: string;
  rep_email: string;
  total_value: number;
}

interface ChartRow { label: string; value: number; }
interface ChartData {
  offerQty: ChartRow[];
  stateSales: ChartRow[];
  repSales: ChartRow[];
}

interface CompareCategory {
  name: string;
  currentQty: number;
  currentValue: number;
  sales25Qty: number;
  sales25Value: number;
}

interface ComparePayload {
  categories: CompareCategory[];
  unmapped: { qty: number; value: number };
  totals: {
    currentQty: number;
    currentValue: number;
    sales25Qty: number;
    sales25Value: number;
  };
  sales25Loaded?: boolean;
}

interface Props { repEmail?: string; onClose: () => void; }

const fmt = (v: number) => {
  const n = typeof v === 'number' && Number.isFinite(v) ? v : 0;
  return n.toLocaleString('en-AU', { style: 'currency', currency: 'AUD', minimumFractionDigits: 2 });
};

const fmtQty = (v: number) => {
  const n = typeof v === 'number' && Number.isFinite(v) ? v : 0;
  const r = Math.round(n * 1000) / 1000;
  if (Math.abs(r - Math.round(r)) < 1e-9) return String(Math.round(r));
  return r % 1 === 0 ? String(r) : r.toFixed(2);
};

/* ── SVG bar chart ─────────────────────────────────────────────────────────── */
const BAR_H = 28;
const BAR_GAP = 8;
const LABEL_W = 200;
const VAL_W = 80;
const CHART_W = 360;

function BarChart({ data, isCurrency }: { data: ChartRow[]; isCurrency?: boolean }) {
  if (!data.length) return <p className="dash-chart-empty">No data</p>;
  const max = Math.max(...data.map(d => d.value), 1);
  const svgH = data.length * (BAR_H + BAR_GAP);
  const totalW = LABEL_W + CHART_W + VAL_W + 16;

  return (
    <svg
      viewBox={`0 0 ${totalW} ${svgH}`}
      width="100%"
      className="dash-bar-svg"
      aria-label="Bar chart"
    >
      {data.map((row, i) => {
        const y = i * (BAR_H + BAR_GAP);
        const barW = Math.max((row.value / max) * CHART_W, 4);
        const label = row.label.length > 28 ? row.label.slice(0, 26) + '…' : row.label;
        const valLabel = isCurrency ? fmt(row.value) : String(row.value);
        return (
          <g key={row.label}>
            {/* Label */}
            <text
              x={LABEL_W - 8}
              y={y + BAR_H / 2 + 4}
              textAnchor="end"
              fontSize={11}
              fill="#444"
              fontFamily="Arial, sans-serif"
            >{label}</text>
            {/* Track */}
            <rect x={LABEL_W} y={y + 4} width={CHART_W} height={BAR_H - 8} rx={4} fill="#f0f0f4" />
            {/* Fill */}
            <rect x={LABEL_W} y={y + 4} width={barW} height={BAR_H - 8} rx={4} fill="#dc2626" opacity={0.85} />
            {/* Value */}
            <text
              x={LABEL_W + CHART_W + 8}
              y={y + BAR_H / 2 + 4}
              fontSize={11}
              fill="#222"
              fontWeight="bold"
              fontFamily="Arial, sans-serif"
            >{valLabel}</text>
          </g>
        );
      })}
    </svg>
  );
}

/* ── Main component ────────────────────────────────────────────────────────── */
const Dashboard: React.FC<Props> = ({ repEmail, onClose }) => {
  const [view, setView] = useState<'table' | 'charts' | 'compare'>('table');
  const [orders, setOrders] = useState<Order[]>([]);
  const [grandTotal, setGrandTotal] = useState(0);
  const [charts, setCharts] = useState<ChartData | null>(null);
  const [compare, setCompare] = useState<ComparePayload | null>(null);
  const [compareError, setCompareError] = useState('');
  const [loading, setLoading] = useState(true);
  const [compareLoading, setCompareLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      axios.get(apiUrl('/api/dashboard')),
      axios.get(apiUrl('/api/dashboard/charts')),
    ])
      .then(([tableRes, chartRes]) => {
        setOrders(tableRes.data.orders || []);
        setGrandTotal(tableRes.data.grandTotal || 0);
        setCharts(chartRes.data);
      })
      .catch(() => setError('Could not load dashboard data.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (view !== 'compare') return;
    setCompare(null);
    setCompareLoading(true);
    setCompareError('');
    axios
      .get<ComparePayload>(apiUrl('/api/dashboard/sales25-vs-orders'))
      .then((res) => setCompare(res.data))
      .catch(() => setCompareError('Could not load FY25 comparison.'))
      .finally(() => setCompareLoading(false));
  }, [view]);

  const maxValue = Math.max(...orders.map(o => o.total_value), 1);

  return (
    <div className="dashboard-overlay" onClick={onClose}>
      <div
        className={`dashboard-modal${view === 'compare' ? ' dashboard-modal--wide' : ''}`}
        onClick={e => e.stopPropagation()}
      >

        {/* Header */}
        <div className="dashboard-header">
          <div>
            <h2 className="dashboard-title">Sales Dashboard</h2>
            <p className="dashboard-subtitle">{repEmail || 'All orders'}</p>
          </div>
          <button className="dashboard-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        {/* Summary + controls */}
        <div className="dashboard-summary">
          <div className="dashboard-stat">
            <span className="dashboard-stat-value">{orders.length}</span>
            <span className="dashboard-stat-label">Orders</span>
          </div>
          <div className="dashboard-stat">
            <span className="dashboard-stat-value">{fmt(grandTotal)}</span>
            <span className="dashboard-stat-label">Total Value</span>
          </div>

          <div className="dashboard-view-toggle" role="group" aria-label="Dashboard view">
            <button
              type="button"
              className={`dash-toggle-btn ${view === 'table' ? 'active' : ''}`}
              onClick={() => setView('table')}
            >Table</button>
            <button
              type="button"
              className={`dash-toggle-btn ${view === 'charts' ? 'active' : ''}`}
              onClick={() => setView('charts')}
            >Charts</button>
            <button
              type="button"
              className={`dash-toggle-btn ${view === 'compare' ? 'active' : ''}`}
              onClick={() => setView('compare')}
            >FY25 vs orders</button>
          </div>

          <button className="dashboard-csv-btn" onClick={() => window.open(apiUrl('/api/dashboard/csv'), '_blank')}>
            ↓ Download CSV
          </button>
        </div>

        {loading && view !== 'compare' && <div className="dashboard-loading">Loading…</div>}
        {error && view !== 'compare' && <div className="dashboard-error">{error}</div>}

        {/* ── TABLE VIEW ── */}
        {!loading && !error && view === 'table' && (
          orders.length === 0
            ? <div className="dashboard-empty">No orders yet.</div>
            : (
              <div className="dashboard-table-wrap">
                <table className="dashboard-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Store</th>
                      <th>Banner</th>
                      <th>Contact</th>
                      <th>Date</th>
                      <th className="th-right">Value</th>
                      <th>Bar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((o, i) => {
                      const pct = (o.total_value / maxValue) * 100;
                      const date = new Date(o.created_at).toLocaleDateString('en-AU', {
                        day: '2-digit', month: 'short', year: '2-digit',
                      });
                      return (
                        <tr key={o.id} className={i % 2 === 0 ? 'dashboard-row-alt' : ''}>
                          <td className="td-num">{i + 1}</td>
                          <td className="td-store">{o.store_name}</td>
                          <td className="td-banner">{o.banner}</td>
                          <td className="td-contact">{o.user_name}</td>
                          <td className="td-date">{date}</td>
                          <td className="td-value">{fmt(o.total_value)}</td>
                          <td className="td-bar">
                            <div className="bar-track">
                              <div className="bar-fill" style={{ width: `${pct}%` }} />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="dashboard-total-row">
                      <td colSpan={5} className="td-total-label">TOTAL</td>
                      <td className="td-value">{fmt(grandTotal)}</td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            )
        )}

        {/* ── CHARTS VIEW ── */}
        {!loading && !error && view === 'charts' && charts && (
          <div className="dashboard-charts-wrap">
            <div className="dash-chart-block">
              <h3 className="dash-chart-title">Offers — Units Ordered</h3>
              <BarChart data={charts.offerQty} />
            </div>
            <div className="dash-chart-block">
              <h3 className="dash-chart-title">State — Sales Value</h3>
              <BarChart data={charts.stateSales} isCurrency />
            </div>
            <div className="dash-chart-block">
              <h3 className="dash-chart-title">Rep — Sales Value</h3>
              <BarChart data={charts.repSales} isCurrency />
            </div>
          </div>
        )}

        {/* ── FY25 (sales25.csv) vs current expo orders ── */}
        {view === 'compare' && (
          <div className="dashboard-compare">
            {(compareLoading || (!compareError && !compare)) && (
              <div className="dashboard-loading">Loading comparison…</div>
            )}
            {compareError && <div className="dashboard-error">{compareError}</div>}
            {!compareLoading && !compareError && compare && (
              <>
                <p className="dashboard-compare-intro">
                  <strong>Expo orders</strong> (this app) vs <strong>sales25.csv</strong> totals
                  across all stores — same ten categories as store insights.
                </p>
                {!compare.sales25Loaded && (
                  <p className="dashboard-compare-warn">sales25.csv is not loaded on the server.</p>
                )}
                <div className="dashboard-compare-table-wrap">
                  <table className="dashboard-compare-table">
                    <thead>
                      <tr>
                        <th scope="col">Category</th>
                        <th scope="col" className="num">Orders qty</th>
                        <th scope="col" className="num">Orders value</th>
                        <th scope="col" className="num">FY25 qty</th>
                        <th scope="col" className="num">FY25 value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(compare.categories || []).map((c, i) => (
                        <tr key={`${c.name}-${i}`} className={i % 2 === 0 ? 'dashboard-row-alt' : ''}>
                          <td className="dashboard-compare-cat">{c.name}</td>
                          <td className="num">{fmtQty(c.currentQty)}</td>
                          <td className="num">{fmt(c.currentValue)}</td>
                          <td className="num">{fmtQty(c.sales25Qty)}</td>
                          <td className="num">{fmt(c.sales25Value)}</td>
                        </tr>
                      ))}
                      {((compare.unmapped?.qty ?? 0) > 0 || (compare.unmapped?.value ?? 0) > 0) && (
                        <tr className="dashboard-compare-unmapped">
                          <td>Not mapped to FY25 category</td>
                          <td className="num">{fmtQty(compare.unmapped?.qty ?? 0)}</td>
                          <td className="num">{fmt(compare.unmapped?.value ?? 0)}</td>
                          <td className="num">—</td>
                          <td className="num">—</td>
                        </tr>
                      )}
                    </tbody>
                    <tfoot>
                      <tr className="dashboard-total-row">
                        <td className="td-total-label">TOTAL</td>
                        <td className="num">{fmtQty(compare.totals?.currentQty ?? 0)}</td>
                        <td className="num">{fmt(compare.totals?.currentValue ?? 0)}</td>
                        <td className="num">{fmtQty(compare.totals?.sales25Qty ?? 0)}</td>
                        <td className="num">{fmt(compare.totals?.sales25Value ?? 0)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </>
            )}
          </div>
        )}

      </div>
    </div>
  );
};

export default Dashboard;
