import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './LoadingStep.css';
import { apiUrl, StoreData } from '../api';

interface LoadingStepProps {
  userData: { fullName: string; storeNo: string };
  onComplete: (storeData?: StoreData) => void;
  onBack?: () => void;
}

const LoadingStep: React.FC<LoadingStepProps> = ({ userData, onComplete }) => {
  const [currentPhase, setCurrentPhase] = useState<'loading' | 'personalized'>('loading');
  const [storeInfo, setStoreInfo] = useState<{ storeName: string; banner: string; number: string } | null>(null);
  const [fullStoreData, setFullStoreData] = useState<StoreData | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get(apiUrl(`/api/store/${userData.storeNo}`));
        const d = response.data;
        setFullStoreData({
          storeNo: d.storeNo || userData.storeNo,
          storeName: d.storeName || `Store ${userData.storeNo}`,
          banner: (d.banner != null && d.banner !== '') ? d.banner : '-',
          overall: d.overall || '',
          automotive: d.automotive || '',
          energyStorage: d.energyStorage || '',
          lighting: d.lighting || '',
          specialOrderHardware: d.specialOrderHardware || '',
          address: d.address || '',
          suburb: d.suburb || '',
          state: d.state || '',
          pcode: d.pcode || '',
          storeId: (d.storeId != null && String(d.storeId).trim() !== '') ? String(d.storeId).trim() : undefined,
          storeRank: d.storeRank ?? null,
          ownerGroup: (d.ownerGroup || '').trim() || undefined,
        });
        setStoreInfo({
          storeName: d.storeName || `Store ${userData.storeNo}`,
          banner: d.banner || '',
          number: d.storeNo || userData.storeNo,
        });
      } catch {
        setStoreInfo({
          storeName: `Store ${userData.storeNo}`,
          banner: '',
          number: userData.storeNo,
        });
      }
    };
    fetchData();
  }, [userData.storeNo]);

  useEffect(() => {
    const t = setTimeout(() => setCurrentPhase('personalized'), 2500);
    return () => clearTimeout(t);
  }, []);

  const handleNext = () => {
    if (fullStoreData) {
      onComplete(fullStoreData);
    } else {
      onComplete();
    }
  };

  return (
    <div className="loading-container">
      <div className="loading-card">
        {currentPhase === 'loading' && (
          <div className="loading-phase">
            <h1 className="loading-title">Loading store {userData.storeNo}</h1>
            <div className="loading-animation">
              <div className="pulse-circle">
                <div className="pulse-ring"></div>
                <div className="pulse-ring"></div>
                <div className="pulse-ring"></div>
              </div>
            </div>
          </div>
        )}
        {currentPhase === 'personalized' && (
          <div className="personalized-phase">
            <div className="personalized-content">
              <div className="energizer-content">
                <h1 className="thank-you-title">Thank you {userData.fullName},</h1>
                <div className="store-info-card">
                  <div className="store-details">
                    <div className="store-name">{storeInfo?.storeName?.toUpperCase() || `STORE ${userData.storeNo}`}</div>
                    <div className="store-location">
                      {storeInfo?.banner && storeInfo.banner !== '-' && (
                        <span className="store-banner">{storeInfo.banner}</span>
                      )}
                      <span className="store-number">Store No. {storeInfo?.number || userData.storeNo}</span>
                    </div>
                  </div>
                </div>
                <p className="energizer-text">You can now enter your sales input for this store.</p>
                <div className="button-container">
                  <button type="button" className="next-button" onClick={handleNext}>
                    Next
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LoadingStep;
