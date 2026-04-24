import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { apiUrl, StoreData } from '../api';
import { storeSales } from '../content/modalCopy';
import './StoreSalesDashboard.css';

interface SalesItem {
  name: string;
  value: number;
  qty: number;
}

interface StoreSalesPayload {
  hasData: boolean;
  storeName?: string;
  storeId?: string;
  totalSales?: number;
  items?: SalesItem[];
}

interface Props {
  userData: { fullName: string; storeNo: string };
  storeData: StoreData;
  onContinue: () => void;
  onBack: () => void;
  /** Full page (default) or embedded in App modal overlay */
  variant?: 'page' | 'modal';
}

const fmtAud = (n: number) =>
  n.toLocaleString('en-AU', { style: 'currency', currency: 'AUD', minimumFractionDigits: 2 });

const fmtQty = (n: number) =>
  n.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const StoreSalesDashboard: React.FC<Props> = ({
  userData,
  storeData,
  onContinue,
  onBack,
  variant = 'page',
}) => {
  const pageClass =
    variant === 'modal' ? 'store-sales-page store-sales-page--modal' : 'store-sales-page';
  const [data, setData] = useState<StoreSalesPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const sid = (storeData.storeId || '').trim();
    if (!sid) {
      setData({ hasData: false });
      setLoading(false);
      return;
    }
    axios
      .get(apiUrl(`/api/store-sales/${encodeURIComponent(sid)}`))
      .then((res) => setData(res.data))
      .catch(() => setError(storeSales.dashboard.fetchError))
      .finally(() => setLoading(false));
  }, [storeData.storeId]);

  if (loading) {
    return (
      <div className={pageClass}>
        <div className="store-sales-card">
          <p className="store-sales-loading">{storeSales.dashboard.loading}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={pageClass}>
        <div className="store-sales-card">
          <p className="store-sales-error">{error}</p>
          <div className="store-sales-actions">
            <button type="button" className="store-sales-btn secondary" onClick={onBack}>
              {storeSales.dashboard.back}
            </button>
            <button type="button" className="store-sales-btn primary" onClick={onContinue}>
              {storeSales.dashboard.continue}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!data?.hasData || !data.items?.length) {
    return (
      <div className={pageClass}>
        <div className="store-sales-card">
          <p className="store-sales-muted">{storeSales.dashboard.noData}</p>
          <div className="store-sales-actions">
            <button type="button" className="store-sales-btn primary" onClick={onContinue}>
              {storeSales.dashboard.continue}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const firstName =
    (userData.fullName || '').trim().split(/\s+/)[0] || storeSales.dashboard.fallbackFirstName;

  return (
    <div className={pageClass}>
      <div className="store-sales-card">
        <p className="store-sales-kicker">{storeSales.dashboard.kicker}</p>
        <h1 className="store-sales-title">
          {storeSales.dashboard.hiWord} {firstName}
        </h1>
        <p className="store-sales-store-name">{data.storeName}</p>
        {data.storeId ? (
          <p className="store-sales-meta">
            {storeSales.dashboard.storeIdPrefix}
            {data.storeId}
          </p>
        ) : null}

        <div className="store-sales-total-block">
          <p className="store-sales-total-label">{storeSales.dashboard.totalLabel}</p>
          <p className="store-sales-total-value">{fmtAud(data.totalSales ?? 0)}</p>
        </div>

        <h2 className="store-sales-table-title">{storeSales.dashboard.top10Title}</h2>
        <div className="store-sales-table-wrap">
          <table className="store-sales-table">
            <thead>
              <tr>
                <th scope="col">{storeSales.dashboard.tableColumns.item}</th>
                <th scope="col" className="num">
                  {storeSales.dashboard.tableColumns.qty}
                </th>
                <th scope="col" className="num">
                  {storeSales.dashboard.tableColumns.value}
                </th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((row) => (
                <tr key={row.name}>
                  <td className="store-sales-item-name">{row.name}</td>
                  <td className="num qty">{fmtQty(row.qty)}</td>
                  <td className="num">{fmtAud(row.value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="store-sales-actions">
          <button type="button" className="store-sales-btn secondary" onClick={onBack}>
            {storeSales.dashboard.back}
          </button>
          <button type="button" className="store-sales-btn primary" onClick={onContinue}>
            {storeSales.dashboard.continueToDeals}
          </button>
        </div>
      </div>
    </div>
  );
};

export default StoreSalesDashboard;
