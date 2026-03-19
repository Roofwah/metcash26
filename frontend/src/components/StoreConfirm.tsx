import React from 'react';
import './StoreConfirm.css';

interface StoreConfirmProps {
  userData: { fullName: string; storeNo: string };
  storeData: { storeName: string; storeNo: string; banner?: string };
  onContinue: () => void;
  onBack: () => void;
}

const StoreConfirm: React.FC<StoreConfirmProps> = ({ userData, storeData, onContinue, onBack }) => {
  const isNumericStoreNo = /^\d{1,6}$/.test(String(storeData.storeNo || '').trim());
  return (
    <div className="store-confirm">
      <div className="store-confirm-card">
        <h1 className="store-confirm-title">Store confirmed</h1>
        <p className="store-confirm-name">{storeData.storeName}</p>
        {isNumericStoreNo ? (
          <p className="store-confirm-meta">Store No. {storeData.storeNo}</p>
        ) : null}
        {storeData.banner && storeData.banner !== '-' && (
          <p className="store-confirm-banner">{storeData.banner}</p>
        )}
        <p className="store-confirm-intro">Hi {userData.fullName}, you can now enter your sales input for this store.</p>
        <div className="store-confirm-actions">
          <button type="button" className="store-confirm-back" onClick={onBack}>
            ← Change store
          </button>
          <button type="button" className="store-confirm-continue" onClick={onContinue}>
            Continue to offers
          </button>
        </div>
      </div>
    </div>
  );
};

export default StoreConfirm;
