import React, { useCallback, useEffect, useState } from 'react';
import { apiUrl, fetchApi, type ApiError } from '../api';
import { useWwSession } from './WwAuthShell';
import './WwDashboard.css';

interface PentaStoreRow {
  store_id: string;
  store_name: string;
  suburb: string | null;
  state: string;
  group_id: string;
  recommended: number;
  confirmed: number;
  variance: number;
  authority: 'none' | 'store_manager' | 'group_manager';
  last_updated_by: string | null;
  last_updated_at: string | null;
  store_manager_name: string | null;
  store_manager_committed_at: string | null;
  group_manager_name: string | null;
  group_manager_confirmed_at: string | null;
}

interface GroupRow {
  groupId: string;
  storeCount: number;
  confirmed: number;
  recommended: number;
}

interface DashboardPayload {
  summary: {
    storeCount: number;
    groupsConfirmed: number;
    storeManagerCount: number;
    totalConfirmed: number;
    totalRecommended: number;
    totalVariance: number;
  };
  stores: PentaStoreRow[];
  byGroup: GroupRow[];
}

type Props = {
  onClose: () => void;
};

function fmtDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('en-AU', {
      day: '2-digit',
      month: 'short',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export default function WwDashboard({ onClose }: Props) {
  const { email: repEmail } = useWwSession();

  const [view, setView] = useState<'stores' | 'groups'>('stores');
  const [payload, setPayload] = useState<DashboardPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchApi<DashboardPayload>('/api/ww26/dashboard/penta-confirmed');
      setPayload(data);
    } catch (e) {
      const status = (e as ApiError).status;
      if (status === 401) {
        setError('Session expired — sign out and sign in again.');
      } else {
        setError(e instanceof Error ? e.message : 'Could not load dashboard.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const downloadCsv = async () => {
    try {
      const res = await fetch(apiUrl('/api/ww26/dashboard/penta-confirmed/csv'), {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ww26-penta-confirmed-${Date.now()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError('Could not download CSV.');
    }
  };

  const summary = payload?.summary;

  return (
    <div className="ww-dash-overlay" onClick={onClose} role="presentation">
      <div
        className="ww-dash-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ww-dash-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="ww-dash-header">
          <div>
            <h2 id="ww-dash-title" className="ww-dash-title">
              PentaBin 2026 — confirmed
            </h2>
            <p className="ww-dash-subtitle">{repEmail || 'Current allocations (latest SM or GM commit wins)'}</p>
          </div>
          <button type="button" className="ww-dash-close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </header>

        <>
          {summary ? (
            <div className="ww-dash-summary">
              <div>
                <span className="ww-dash-stat-value">{summary.storeCount}</span>
                <span className="ww-dash-stat-label">Stores with allocation</span>
              </div>
              <div>
                <span className="ww-dash-stat-value">{summary.groupsConfirmed ?? 0}</span>
                <span className="ww-dash-stat-label">Groups confirmed</span>
              </div>
              <div>
                <span className="ww-dash-stat-value">{summary.storeManagerCount ?? 0}</span>
                <span className="ww-dash-stat-label">Store managers</span>
              </div>
              <div>
                <span className="ww-dash-stat-value">{summary.totalConfirmed}</span>
                <span className="ww-dash-stat-label">Penta bins 2026</span>
              </div>
              <div>
                <span className="ww-dash-stat-value">
                  {summary.totalVariance > 0 ? '+' : ''}
                  {summary.totalVariance}
                </span>
                <span className="ww-dash-stat-label">Vs recommended</span>
              </div>
              <div className="ww-dash-toggle" role="group" aria-label="Dashboard view">
                <button
                  type="button"
                  className={view === 'stores' ? 'active' : ''}
                  onClick={() => setView('stores')}
                >
                  Stores
                </button>
                <button
                  type="button"
                  className={view === 'groups' ? 'active' : ''}
                  onClick={() => setView('groups')}
                >
                  Groups
                </button>
              </div>
              <button type="button" className="ww-dash-csv" onClick={() => void downloadCsv()}>
                Download CSV
              </button>
            </div>
          ) : null}

          <div className="ww-dash-body">
            {loading ? <p className="ww-dash-loading">Loading…</p> : null}
            {error ? <p className="ww-dash-error">{error}</p> : null}
            {!loading && !error && payload && view === 'stores' && payload.stores.length === 0 ? (
              <p className="ww-dash-empty">No store or group manager commitments yet.</p>
            ) : null}
            {!loading && !error && payload && view === 'stores' && payload.stores.length > 0 ? (
              <table className="ww-dash-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Store</th>
                    <th>Group</th>
                    <th>Rec.</th>
                    <th>Current</th>
                    <th>Var.</th>
                    <th>Last by</th>
                    <th>Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {payload.stores.map((row, i) => (
                    <tr key={row.store_id}>
                      <td className="num">{i + 1}</td>
                      <td className="store">
                        {row.store_name}
                        {row.suburb ? ` · ${row.suburb}` : ''}
                        {row.state ? ` ${row.state}` : ''}
                      </td>
                      <td>{row.group_id}</td>
                      <td className="num">{row.recommended}</td>
                      <td className="num">{row.confirmed}</td>
                      <td className="num">
                        {row.variance > 0 ? '+' : ''}
                        {row.variance}
                      </td>
                      <td>
                        {row.last_updated_by || '—'}
                        {row.authority === 'store_manager'
                          ? ' (SM)'
                          : row.authority === 'group_manager'
                            ? ' (GM)'
                            : ''}
                      </td>
                      <td>{row.last_updated_at ? fmtDate(row.last_updated_at) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : null}
            {!loading && !error && payload && view === 'groups' && payload.byGroup.length === 0 ? (
              <p className="ww-dash-empty">No groups yet.</p>
            ) : null}
            {!loading && !error && payload && view === 'groups' && payload.byGroup.length > 0 ? (
              <table className="ww-dash-table">
                <thead>
                  <tr>
                    <th>Group</th>
                    <th>Stores</th>
                    <th>Recommended</th>
                    <th>Confirmed</th>
                    <th>Variance</th>
                  </tr>
                </thead>
                <tbody>
                  {payload.byGroup.map((g) => (
                    <tr key={g.groupId}>
                      <td className="store">{g.groupId}</td>
                      <td className="num">{g.storeCount}</td>
                      <td className="num">{g.recommended}</td>
                      <td className="num">{g.confirmed}</td>
                      <td className="num">
                        {g.confirmed - g.recommended > 0 ? '+' : ''}
                        {g.confirmed - g.recommended}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : null}
          </div>
        </>
      </div>
    </div>
  );
}
