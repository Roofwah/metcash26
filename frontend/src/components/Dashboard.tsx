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

interface Props { repEmail?: string; onClose: () => void; }

const fmt = (v: number) =>
  v.toLocaleString('en-AU', { style: 'currency', currency: 'AUD', minimumFractionDigits: 2 });

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
  const [view, setView] = useState<'table' | 'charts'>('table');
  const [orders, setOrders] = useState<Order[]>([]);
  const [grandTotal, setGrandTotal] = useState(0);
  const [charts, setCharts] = useState<ChartData | null>(null);
  const [loading, setLoading] = useState(true);
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

  const maxValue = Math.max(...orders.map(o => o.total_value), 1);

  return (
    <div className="dashboard-overlay" onClick={onClose}>
      <div className="dashboard-modal" onClick={e => e.stopPropagation()}>

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

          <div className="dashboard-view-toggle">
            <button
              className={`dash-toggle-btn ${view === 'table' ? 'active' : ''}`}
              onClick={() => setView('table')}
            >Table</button>
            <button
              className={`dash-toggle-btn ${view === 'charts' ? 'active' : ''}`}
              onClick={() => setView('charts')}
            >Charts</button>
          </div>

          <button className="dashboard-csv-btn" onClick={() => window.open(apiUrl('/api/dashboard/csv'), '_blank')}>
            ↓ Download CSV
          </button>
        </div>

        {loading && <div className="dashboard-loading">Loading…</div>}
        {error && <div className="dashboard-error">{error}</div>}

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

      </div>
    </div>
  );
};

export default Dashboard;
