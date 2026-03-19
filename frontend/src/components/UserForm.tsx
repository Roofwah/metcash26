import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import Keyboard from 'react-simple-keyboard';
import 'react-simple-keyboard/build/css/index.css';
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
}

const STEP_HOME = 0;
const STEP_NAME = 1;
const STEP_STATE = 2;
const STEP_SUBURB = 3;
const STEP_BANNER = 4;

const UserForm: React.FC<UserFormProps> = ({ onSubmit, onThankYouComplete, showThankYou: externalShowThankYou, userData: externalUserData }) => {
  const [currentStep, setCurrentStep] = useState(STEP_HOME);
  const [fullName, setFullName] = useState('');
  const [states, setStates] = useState<string[]>([]);
  const [suburbs, setSuburbs] = useState<string[]>([]);
  const [storesInSuburb, setStoresInSuburb] = useState<McashStore[]>([]);
  const [selectedState, setSelectedState] = useState('');
  const [selectedSuburb, setSelectedSuburb] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showKeyboard, setShowKeyboard] = useState(false);
  const [activeInput, setActiveInput] = useState<string | null>(null);
  const keyboardRef = useRef<any>(null);
  const keyboardContainerRef = useRef<HTMLDivElement>(null);
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

  const handleInputFocus = (inputType: string) => {
    if (inputType === 'fullName') {
      setShowKeyboard(true);
      setActiveInput('fullName');
    }
  };

  const handleInputBlur = (e: React.FocusEvent) => {
    if (showKeyboard) {
      e.preventDefault();
      return;
    }
    if (activeInput === 'fullName' && fullName.trim()) setFullName(formatName(fullName.trim()));
    setTimeout(() => {
      setShowKeyboard(false);
      setActiveInput(null);
    }, 100);
  };

  const onKeyPress = (button: string) => {
    if (activeInput === 'fullName') {
      if (button === '{space}') setFullName(prev => prev + ' ');
      else if (button === '{clear}') setFullName('');
      else if (button === '{done}') {
        setFullName(prev => formatName(prev));
        setShowKeyboard(false);
        setActiveInput(null);
      } else {
        setFullName(prev => prev + button);
      }
    }
  };

  const closeKeyboard = () => {
    setShowKeyboard(false);
    setActiveInput(null);
  };

  const renderKeyboard = () => {
    if (!showKeyboard || activeInput !== 'fullName') return null;
    return (
      <div className="keyboard-overlay">
        <div className="keyboard-container" ref={keyboardContainerRef}>
          <div className="keyboard-header">
            <span>Enter your full name</span>
            <button type="button" className="keyboard-close" onClick={closeKeyboard}>✕</button>
          </div>
          <div className="keyboard-input-display">{fullName || 'Type your full name here...'}</div>
          <div className="keyboard-wrapper">
            <Keyboard
              keyboardRef={r => (keyboardRef.current = r)}
              layout={{
                default: ['q w e r t y u i o p', 'a s d f g h j k l', 'z x c v b n m', '{space} {clear} {done}'],
              }}
              display={{ '{clear}': 'CLEAR', '{done}': 'DONE', '{space}': 'SPACE' }}
              onKeyPress={onKeyPress}
              physicalKeyboardHighlight={true}
              physicalKeyboardHighlightBgColor="#fff"
              preventMouseDownDefault={true}
              preventMouseUpDefault={true}
            />
          </div>
        </div>
      </div>
    );
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case STEP_HOME:
        return (
          <div className="step-content home-screen">
            <div className="home-content">
              <div className="logo-container">
                <img src="/ihg.png" alt="IHG Logo" className="logo rounded-logo" />
              </div>
              <div className="logo-container" style={{ marginTop: '30px' }}>
                <img src="/energizer.png" alt="Energizer Logo" className="logo home-armorall-logo" />
              </div>
              <h1 className="home-title">Metcash – Store lookup &amp; sales input</h1>
              <p>Select your state and suburb to find your store</p>
              <button type="button" onClick={handleStart} className="start-btn">Start</button>
            </div>
          </div>
        );
      case STEP_NAME:
        return (
          <div className="step-content">
            <button type="button" onClick={() => setCurrentStep(STEP_HOME)} className="back-btn-step">← Back</button>
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
                onFocus={() => handleInputFocus('fullName')}
                onBlur={showKeyboard ? undefined : handleInputBlur}
                placeholder="Enter your full name"
                className="form-input"
                readOnly={showKeyboard}
                autoComplete="off"
              />
              <div className="input-hint">Tap to open keyboard</div>
            </div>
            <div className="form-navigation step-1-nav">
              <button type="button" onClick={() => fullName.trim() && setCurrentStep(STEP_STATE)} className="nav-btn next-btn" disabled={!fullName.trim()}>Next →</button>
            </div>
          </div>
        );
      case STEP_STATE:
        return (
          <div className="step-content">
            <button type="button" onClick={handleBack} className="back-btn-step">← Back</button>
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
            <button type="button" onClick={handleBack} className="back-btn-step">← Back</button>
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
            <button type="button" onClick={handleBack} className="back-btn-step">← Back</button>
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
      {renderKeyboard()}
    </div>
  );
};

export default UserForm;
