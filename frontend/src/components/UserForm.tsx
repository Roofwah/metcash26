import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './UserForm.css';
import { apiUrl, StoreData } from '../api';

interface McashStore {
  id: number;
  name: string;
  address: string;
  suburb: string;
  state: string;
  pcode: string;
  banner: string;
}

interface UserFormProps {
  onSubmit: (data: { fullName: string; storeNo: string; position: string }, storeData?: StoreData) => void;
  onThankYouComplete?: () => void;
  showThankYou?: boolean;
  userData?: { fullName: string; storeNo: string; position: string };
  printData?: any;
  onBackChange?: (handler: (() => void) | null) => void;
}

const STEP_HOME = 0;
const STEP_NAME = 1;
const STEP_STATE = 2;
const STEP_SUBURB = 3;
const STEP_BANNER = 4;

const UserForm: React.FC<UserFormProps> = ({ onSubmit, onThankYouComplete, showThankYou: externalShowThankYou, userData: externalUserData, onBackChange }) => {
  const [currentStep, setCurrentStep] = useState(STEP_HOME);
  const [fullName, setFullName] = useState('');
  const [states, setStates] = useState<string[]>([]);
  const [suburbs, setSuburbs] = useState<string[]>([]);
  const [storesInSuburb, setStoresInSuburb] = useState<McashStore[]>([]);
  const [selectedState, setSelectedState] = useState('');
  const [selectedSuburb, setSelectedSuburb] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [storeInfo, setStoreInfo] = useState<{ storeName: string } | null>(null);

  useEffect(() => {
    if (externalShowThankYou && externalUserData?.storeNo) {
      setStoreInfo({ storeName: externalUserData.storeNo });
    }
  }, [externalShowThankYou, externalUserData?.storeNo]);

  useEffect(() => {
    if (currentStep === STEP_STATE && states.length === 0) {
      setLoading(true);
      axios.get(apiUrl('/api/states'))
        .then(res => setStates(Array.isArray(res.data) ? res.data : []))
        .catch(() => setStates([]))
        .finally(() => setLoading(false));
    }
  }, [currentStep, states.length]);

  useEffect(() => {
    if (currentStep === STEP_SUBURB && selectedState) {
      setLoading(true);
      setSuburbs([]);
      axios.get(apiUrl('/api/suburbs'), { params: { state: selectedState } })
        .then(res => setSuburbs(Array.isArray(res.data) ? res.data : []))
        .catch(() => setSuburbs([]))
        .finally(() => setLoading(false));
    }
  }, [currentStep, selectedState]);

  useEffect(() => {
    if (currentStep !== STEP_BANNER || !selectedState || !selectedSuburb) return;
    setLoading(true);
    setStoresInSuburb([]);
    axios.get(apiUrl('/api/mcash-stores'), { params: { state: selectedState, suburb: selectedSuburb } })
      .then(res => {
        const list = Array.isArray(res.data) ? res.data : [];
        setStoresInSuburb(list);
        if (list.length === 1) {
          submitWithStore(list[0]);
        }
      })
      .catch(() => setStoresInSuburb([]))
      .finally(() => setLoading(false));
  }, [currentStep, selectedState, selectedSuburb]);

  // Tell parent what the back handler is whenever step changes
  useEffect(() => {
    if (!onBackChange) return;
    if (currentStep === STEP_HOME) {
      onBackChange(null);
    } else {
      onBackChange(() => handleBack);
    }
  }, [currentStep]); // eslint-disable-line

  const submitWithStore = (store: McashStore) => {
    const storeData: StoreData = {
      storeNo: store.name,
      storeName: store.name,
      banner: store.banner || '-',
      overall: '',
      automotive: '',
      energyStorage: '',
      lighting: '',
      specialOrderHardware: '',
      address: store.address || '',
      suburb: store.suburb || '',
      state: store.state || '',
      pcode: store.pcode || '',
    };
    onSubmit(
      { fullName: formatName(fullName.trim()), storeNo: store.name, position: '' },
      storeData
    );
  };

  const handleStart = () => {
    setCurrentStep(STEP_NAME);
    setError('');
  };

  const handleBack = () => {
    if (currentStep === STEP_NAME) setCurrentStep(STEP_HOME);
    else if (currentStep === STEP_STATE) setCurrentStep(STEP_NAME);
    else if (currentStep === STEP_SUBURB) setCurrentStep(STEP_STATE);
    else if (currentStep === STEP_BANNER) setCurrentStep(STEP_SUBURB);
    setError('');
  };

  const handleStateSelect = (state: string) => {
    setSelectedState(state);
    setSelectedSuburb('');
    setStoresInSuburb([]);
    setCurrentStep(STEP_SUBURB);
  };

  const handleSuburbSelect = (suburb: string) => {
    setSelectedSuburb(suburb);
    setCurrentStep(STEP_BANNER);
  };

  const handleStoreSelect = (store: McashStore) => {
    submitWithStore(store);
  };

  const formatName = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  const handleInputBlur = () => {
    if (fullName.trim()) setFullName(formatName(fullName.trim()));
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case STEP_HOME:
        return (
          <div className="step-content home-screen">
            <div className="home-content">
              <div className="logo-container">
                <img src="/metexpo.png" alt="Metexpo Logo" className="logo rounded-logo" />
              </div>
              <div className="logo-divider" aria-hidden="true" />
              <div className="logo-container">
                <img src="/energizer.png" alt="Energizer Logo" className="logo home-armorall-logo" />
              </div>
              <h1 className="home-title">Metcash 2026 Expo Deals &amp; Insights</h1>
              <button type="button" onClick={handleStart} className="start-btn">Start</button>
            </div>
          </div>
        );
      case STEP_NAME:
        return (
          <div className="step-content">
            <div className="logo-container">
              <img src="/energizer.png" alt="Energizer Logo" className="logo" />
            </div>
            <p className="typing-text">Step 1.</p>
            <h3>Your Full Name</h3>
            <div className="form-group">
              <input
                type="text"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                onBlur={handleInputBlur}
                placeholder="Enter your full name"
                className="form-input"
                autoComplete="off"
              />
            </div>
            <div className="form-navigation step-1-nav">
              <button type="button" onClick={() => fullName.trim() && setCurrentStep(STEP_STATE)} className="nav-btn next-btn" disabled={!fullName.trim()}>NEXT</button>
            </div>
          </div>
        );
      case STEP_STATE:
        return (
          <div className="step-content">
            <div className="logo-container">
              <img src="/energizer.png" alt="Energizer Logo" className="logo" />
            </div>
            <p className="typing-text">Step 2.</p>
            <h3>Select your state</h3>
            {loading ? (
              <div className="loading-message">Loading states...</div>
            ) : (
              <div className="choice-buttons">
                {states.map(s => (
                  <button key={s} type="button" className="choice-btn" onClick={() => handleStateSelect(s)}>{s}</button>
                ))}
              </div>
            )}
          </div>
        );
      case STEP_SUBURB:
        return (
          <div className="step-content">
            <div className="logo-container">
              <img src="/energizer.png" alt="Energizer Logo" className="logo" />
            </div>
            <p className="typing-text">Step 3.</p>
            <h3>Select your suburb ({selectedState})</h3>
            {loading ? (
              <div className="loading-message">Loading suburbs...</div>
            ) : (
              <div className="choice-buttons suburbs-list">
                {suburbs.map(s => (
                  <button key={s} type="button" className="choice-btn" onClick={() => handleSuburbSelect(s)}>{s}</button>
                ))}
              </div>
            )}
          </div>
        );
      case STEP_BANNER:
        return (
          <div className="step-content">
            <div className="logo-container">
              <img src="/energizer.png" alt="Energizer Logo" className="logo" />
            </div>
            <p className="typing-text">Step 4.</p>
            <h3>Select your store ({selectedSuburb})</h3>
            {loading ? (
              <div className="loading-message">Loading stores...</div>
            ) : storesInSuburb.length > 1 ? (
              <div className="choice-buttons store-list">
                {storesInSuburb.map(store => (
                  <button key={store.id} type="button" className="choice-btn store-btn" onClick={() => handleStoreSelect(store)}>
                    <span className="store-btn-banner">{store.banner}</span>
                    <span className="store-btn-name">{store.name}</span>
                  </button>
                ))}
              </div>
            ) : storesInSuburb.length === 0 ? (
              <div className="error-message">No stores found for this suburb.</div>
            ) : null}
          </div>
        );
      default:
        return null;
    }
  };

  const renderThankYouStep = () => {
    if (!externalShowThankYou) return null;
    const displayFullName = externalUserData?.fullName || 'there';
    const displayStore = storeInfo?.storeName || externalUserData?.storeNo || '';
    return (
      <div className="thank-you-screen">
        <div className="logo-container">
          <img src="/energizer.png" alt="Energizer Logo" className="logo" />
        </div>
        <div className="thank-you-content">
          <h1 className="thank-you-title">Thank you {displayFullName}!</h1>
          <h2 className="thank-you-subtitle">{displayStore}</h2>
          <p className="thank-you-message">Your order has been submitted.</p>
          <button
            type="button"
            onClick={() => onThankYouComplete && onThankYouComplete()}
            className="thank-you-btn"
            style={{ background: 'linear-gradient(135deg, #dc2626, #ef4444)', boxShadow: '0 4px 15px rgba(220, 38, 38, 0.4)' }}
          >
            Done
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="user-form-container">
      <div className="image-background">
        <div className="animated-bg"></div>
      </div>
      {externalShowThankYou ? (
        <div className="form-card">{renderThankYouStep()}</div>
      ) : (
        <div className="form-card">
          <form className="user-form" onSubmit={e => e.preventDefault()}>
            {renderStepContent()}
            {error && <div className="error-message">{error}</div>}
          </form>
        </div>
      )}
    </div>
  );
};

export default UserForm;
