import React, { useEffect, useState } from 'react';
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
  /** When true (and handler set), show button to open FY25 store sales in a modal */
  showSalesDashboardButton?: boolean;
  onOpenSalesDashboard?: () => void;
}

const StoreConfirm: React.FC<StoreConfirmProps> = ({
  userData,
  storeData,
  onContinue,
  onBack: _onBack,
  showSalesDashboardButton,
  onOpenSalesDashboard,
}) => {
  const [showNext, setShowNext] = useState(false);
  const firstName = (userData.fullName || '').trim().split(/\s+/)[0] || userData.fullName || 'there';

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setShowNext(true);
    }, 1400);
    return () => window.clearTimeout(timer);
  }, []);

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
              {showSalesDashboardButton && onOpenSalesDashboard ? (
                <button
                  type="button"
                  className="store-confirm-sales-snapshot"
                  onClick={onOpenSalesDashboard}
                >
                  View FY25 store sales
                </button>
              ) : null}
              <button type="button" className="store-confirm-next" onClick={onContinue}>
                NEXT
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StoreConfirm;
