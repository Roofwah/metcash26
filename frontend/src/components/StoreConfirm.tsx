import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { apiUrl } from '../api';
import './StoreConfirm.css';

interface StoreConfirmProps {
  userData: { fullName: string; storeNo: string };
  storeData: {
    storeName: string;
    storeNo: string;
    banner?: string;
    storeId?: string;
    pcode?: string;
    suburb?: string;
    state?: string;
    storeRank?: number | null;
    ownerGroup?: string;
  };
  onContinue: () => void;
  onBack: () => void;
}

const StoreConfirm: React.FC<StoreConfirmProps> = ({
  userData,
  storeData,
  onContinue,
  onBack: _onBack,
}) => {
  const [showNext, setShowNext] = useState(false);
  const [showRecentOrdersModal, setShowRecentOrdersModal] = useState(false);
  const [loadingRecentOrders, setLoadingRecentOrders] = useState(false);
  const [recentOrdersError, setRecentOrdersError] = useState('');
  const [storeOrdersSummary, setStoreOrdersSummary] = useState<{
    hasOrders: boolean;
    orderCount: number;
    totalValue: number;
    lastOrderAt: string | null;
    lineSummary?: {
      description: string;
      totalQuantity: number;
      drops: { dropMonth: string; quantity: number }[];
    }[];
    recent: {
      id: number;
      total_value: number;
      created_at: string;
      user_name?: string;
      items?: { description: string; dropMonth: string; quantity: number }[];
    }[];
  } | null>(null);
  const firstName = (userData.fullName || '').trim().split(/\s+/)[0] || userData.fullName || 'there';

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setShowNext(true);
    }, 1400);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const storeId = String(storeData.storeId || '').trim();
    const storeName = String(storeData.storeName || '').trim();
    if (!storeId && !storeName) return;
    let cancelled = false;
    setLoadingRecentOrders(true);
    setRecentOrdersError('');
    axios
      .get(apiUrl('/api/orders-by-store-summary'), {
        params: storeId ? { storeId } : { storeName },
      })
      .then((res) => {
        if (cancelled) return;
        setStoreOrdersSummary(res.data);
      })
      .catch(() => {
        if (cancelled) return;
        setStoreOrdersSummary(null);
        setRecentOrdersError('Could not load recent orders.');
      })
      .finally(() => {
        if (!cancelled) setLoadingRecentOrders(false);
      });
    return () => {
      cancelled = true;
    };
  }, [storeData.storeId, storeData.storeName]);

  const isNumericStoreNo = /^\d{1,6}$/.test(String(storeData.storeNo || '').trim());
  const storeIdLine = (storeData.storeId || '').trim();
  return (
    <div className="store-confirm">
      <div className="store-confirm-card">
        <img src="/products/mascot.png" alt="" className="store-confirm-mascot" aria-hidden="true" />
        <div className="store-confirm-content">
          <h1 className="store-confirm-title">Thank you {firstName}</h1>
          <p className="store-confirm-name">
            {storeData.storeName}
            {storeData.banner && storeData.banner !== '-' ? ` / ${storeData.banner}` : ''}
          </p>
          {storeIdLine ? <p className="store-confirm-meta">Store ID {storeIdLine}</p> : null}
          {!storeIdLine && isNumericStoreNo ? (
            <p className="store-confirm-meta">Store No. {storeData.storeNo}</p>
          ) : null}
          {(storeData.suburb || storeData.state || storeData.pcode) ? (
            <p className="store-confirm-meta store-confirm-location">
              {[storeData.suburb, storeData.state, storeData.pcode].filter(Boolean).join(' ')}
            </p>
          ) : null}
          {storeData.storeRank != null ? (
            <p className="store-confirm-meta">No. {storeData.storeRank}</p>
          ) : null}
          {(storeData.ownerGroup || '').trim() ? (
            <p className="store-confirm-meta">Group: {storeData.ownerGroup}</p>
          ) : null}
          <p className="store-confirm-intro">
            We are preparing some insights and the 2026 Metcash Expo Deals, please wait.
          </p>
          {!showNext ? (
            <div className="store-confirm-waiting" aria-live="polite">
              <span className="store-confirm-orb" aria-hidden="true" />
              <span className="store-confirm-waiting-text">Please wait...</span>
            </div>
          ) : (
            <div className="store-confirm-actions store-confirm-actions--stack">
              {storeOrdersSummary?.hasOrders ? (
                <button
                  type="button"
                  className="store-confirm-sales-snapshot"
                  onClick={() => setShowRecentOrdersModal(true)}
                >
                  View Recent Orders
                </button>
              ) : null}
              <button type="button" className="store-confirm-next" onClick={onContinue}>
                NEXT
              </button>
            </div>
          )}
          {!loadingRecentOrders && recentOrdersError ? (
            <p className="store-confirm-meta">{recentOrdersError}</p>
          ) : null}
        </div>
      </div>
      {showRecentOrdersModal ? (
        <div className="store-confirm-modal-overlay" role="presentation" onClick={() => setShowRecentOrdersModal(false)}>
          <div
            className="store-confirm-modal-panel"
            role="dialog"
            aria-modal="true"
            aria-label="Recent store orders"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="store-confirm-modal-header">
              <h3>Recent Orders · {storeData.storeName}</h3>
              <button
                type="button"
                className="store-confirm-modal-close"
                onClick={() => setShowRecentOrdersModal(false)}
                aria-label="Close recent orders"
              >
                ×
              </button>
            </div>
            <div className="store-confirm-modal-summary">
              <span>Orders: {storeOrdersSummary?.orderCount || 0}</span>
              <span>
                Total: $
                {(storeOrdersSummary?.totalValue || 0).toLocaleString('en-AU', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
              <span>
                Last:{' '}
                {storeOrdersSummary?.lastOrderAt
                  ? new Date(storeOrdersSummary.lastOrderAt).toLocaleString('en-AU')
                  : '—'}
              </span>
            </div>
            <div className="store-confirm-modal-list">
              {(storeOrdersSummary?.lineSummary || []).length > 0 ? (
                (storeOrdersSummary?.lineSummary || []).map((line, idx) => (
                  <div key={`${line.description}-${idx}`} className="store-confirm-modal-row">
                    <div className="store-confirm-modal-item-row store-confirm-modal-item-row--grouped">
                      <span className="store-confirm-modal-item-name">{line.description || 'Item'}</span>
                      <span className="store-confirm-modal-item-total">Total: {line.totalQuantity || 0}</span>
                    </div>
                    <div className="store-confirm-modal-item-drops">
                      {(line.drops || []).map((d, dIdx) => (
                        <div key={`${idx}-${dIdx}`} className="store-confirm-modal-item-drop-line">
                          <span className="store-confirm-modal-item-drop-label">Drop</span>
                          <span className="store-confirm-modal-item-drop-value">{d.dropMonth || '—'}</span>
                          <span className="store-confirm-modal-item-drop-label">Qty</span>
                          <span className="store-confirm-modal-item-drop-value">{d.quantity || 0}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <div className="store-confirm-modal-items-empty">No item details available.</div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default StoreConfirm;
