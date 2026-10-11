import React, { useState } from 'react';
import DbleNav from '../../components/DbleNav';
import { useWwSession } from '../../components/WwAuthShell';
import './fieldPerformance.css';
import StoreSearch from './StoreSearch';
import StoreDashboard from './StoreDashboard';

const PUBLIC = process.env.PUBLIC_URL || '';

export default function FieldPerformance() {
  const { email: repEmail, logout } = useWwSession();
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);

  return (
    <div className="ww-app ww-app-campaign">
      <DbleNav publicUrl={PUBLIC} repEmail={repEmail} onLogout={logout} />

      <div className="ww-campaign-bg" aria-hidden="true">
        <div className="ww-form-bg" style={{ backgroundImage: `url(${PUBLIC}/bg.jpg)` }} />
      </div>
      <img
        src={`${PUBLIC}/2logos.png`}
        alt="Woolworths and Energizer"
        className="ww-partner-logos"
      />

      <div className="ww-app-content">
        <div className="ww-form-screen ww-form-screen--intro ww-form-screen--field">
          <header className="ww-header-form">
            <h1 className="ww-title">Woolworths 2026 · Field Performance</h1>
          </header>
          <div className="ww-form-stage">
            <div
              className={
                selectedStoreId
                  ? 'ww-form-stack ww-form-stack--group-detail'
                  : 'ww-form-stack ww-form-stack--store-picker ww-form-stack--intro'
              }
            >
              {!selectedStoreId ? (
                <StoreSearch onSelect={setSelectedStoreId} />
              ) : (
                <StoreDashboard storeId={selectedStoreId} onBack={() => setSelectedStoreId(null)} />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
