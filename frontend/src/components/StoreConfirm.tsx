import React, { useEffect, useState } from 'react';
import './StoreConfirm.css';

interface StoreConfirmProps {
  userData: { fullName: string; storeNo: string };
  storeData: { storeName: string; storeNo: string; banner?: string };
  onContinue: () => void;
  onBack: () => void;
}

const StoreConfirm: React.FC<StoreConfirmProps> = ({ userData, storeData, onContinue, onBack: _onBack }) => {
  const [showNext, setShowNext] = useState(false);
  const firstName = (userData.fullName || '').trim().split(/\s+/)[0] || userData.fullName || 'there';

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setShowNext(true);
    }, 1400);
    return () => window.clearTimeout(timer);
  }, []);

  const isNumericStoreNo = /^\d{1,6}$/.test(String(storeData.storeNo || '').trim());
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
          {isNumericStoreNo ? <p className="store-confirm-meta">Store No. {storeData.storeNo}</p> : null}
          <p className="store-confirm-intro">
            We are preparing some insights and the 2026 Metcash Expo Deals, please wait.
          </p>
          {!showNext ? (
            <div className="store-confirm-waiting" aria-live="polite">
              <span className="store-confirm-orb" aria-hidden="true" />
              <span className="store-confirm-waiting-text">Please wait...</span>
            </div>
          ) : (
            <div className="store-confirm-actions">
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
