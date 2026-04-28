import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './UserForm.css';
import { apiUrl, StoreData } from '../api';

interface McashStore {
  id: number;
  name: string;
  storeId?: string;
  address: string;
  suburb: string;
  state: string;
  pcode: string;
  banner: string;
  storeRank?: number | null;
  ownerGroup?: string;
}

interface UserFormProps {
  onSubmit: (
    data: { fullName: string; storeNo: string; position: string },
    storeData?: StoreData
  ) => void;
  /** MSO path: after group + store selection, parent opens the offer matrix */
  onMsoStoresSubmit?: (
    data: { fullName: string; storeNo: string; position: string },
    payload: { group: string; stores: StoreData[] }
  ) => void;
  initialFullName?: string;
  onThankYouComplete?: () => void;
  showThankYou?: boolean;
  userData?: { fullName: string; storeNo: string; position: string };
  printData?: any;
  /** MSO: show group on thank-you subtitle instead of a single store name. */
  thankYouMsoGroup?: string;
  onBackChange?: (handler: (() => void) | null) => void;
}

const STEP_HOME = 0;
const STEP_NAME = 1;
const STEP_STATE = 2;
const STEP_SUBURB = 3;
const STEP_BANNER = 4;
const STEP_MSO_GROUPS = 5;
const STEP_MSO_STORES = 6;
const AU_STATES = ['ACT', 'NSW', 'NT', 'QLD', 'SA', 'TAS', 'VIC', 'WA'] as const;

const UserForm: React.FC<UserFormProps> = ({
  onSubmit,
  onMsoStoresSubmit,
  initialFullName = '',
  onThankYouComplete,
  showThankYou: externalShowThankYou,
  userData: externalUserData,
  thankYouMsoGroup,
  onBackChange,
}) => {
  const [currentStep, setCurrentStep] = useState(STEP_HOME);
  const [fullName, setFullName] = useState(initialFullName);
  const [states, setStates] = useState<string[]>([]);
  const [suburbs, setSuburbs] = useState<string[]>([]);
  const [storesInSuburb, setStoresInSuburb] = useState<McashStore[]>([]);
  const [selectedState, setSelectedState] = useState('');
  const [selectedSuburb, setSelectedSuburb] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [storeInfo, setStoreInfo] = useState<{ storeName: string } | null>(null);
  const [msoGroups, setMsoGroups] = useState<string[]>([]);
  const [selectedMsoGroup, setSelectedMsoGroup] = useState('');
  const [storesInMsoGroup, setStoresInMsoGroup] = useState<McashStore[]>([]);
  const [selectedMsoStoreIds, setSelectedMsoStoreIds] = useState<Set<number>>(new Set());
  const [showAddMissingStoreModal, setShowAddMissingStoreModal] = useState(false);
  const [showAddTempStoreForm, setShowAddTempStoreForm] = useState(false);
  const [missingStoreQuery, setMissingStoreQuery] = useState('');
  const [missingStoreResults, setMissingStoreResults] = useState<McashStore[]>([]);
  const [missingStoreSearchTried, setMissingStoreSearchTried] = useState(false);
  const [missingStoreModalError, setMissingStoreModalError] = useState('');
  const [missingStoreName, setMissingStoreName] = useState('');
  const [missingStoreNumber, setMissingStoreNumber] = useState('');
  const [missingStoreState, setMissingStoreState] = useState('');
  const [missingStoreSuburb, setMissingStoreSuburb] = useState('');
  const [missingStorePcode, setMissingStorePcode] = useState('');

  useEffect(() => {
    if (initialFullName) setFullName(initialFullName);
  }, [initialFullName]);

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
      onBackChange(handleBack);
    }
  }, [currentStep]); // eslint-disable-line

  const submitWithStore = (store: McashStore) => {
    const storeData: StoreData = {
      storeNo: store.name,
      storeName: store.name,
      storeId: (store.storeId || '').trim(),
      storeRank: store.storeRank ?? null,
      ownerGroup: (store.ownerGroup || '').trim(),
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

  const handleAddMissingStore = () => {
    const name = missingStoreName.trim();
    const storeNo = missingStoreNumber.trim();
    const state = missingStoreState.trim().toUpperCase();
    const suburb = missingStoreSuburb.trim();
    const pcode = missingStorePcode.trim();
    if (!name || !storeNo || !state || !suburb || !pcode) {
      setMissingStoreModalError('Enter store name, store number, state, suburb and postcode.');
      return;
    }
    if (!AU_STATES.includes(state as (typeof AU_STATES)[number])) {
      setMissingStoreModalError('Select a valid Australian state.');
      return;
    }
    if (!/^\d{4}$/.test(pcode)) {
      setMissingStoreModalError('Postcode must be exactly 4 digits.');
      return;
    }
    const tempId = `TEMP-${Date.now()}`;
    const tempName = `TEMP - ${name}`;
    const storeData: StoreData = {
      storeNo: storeNo,
      storeName: tempName,
      storeId: tempId,
      storeRank: null,
      ownerGroup: 'TEMP',
      banner: 'TEMP',
      overall: '',
      automotive: '',
      energyStorage: '',
      lighting: '',
      specialOrderHardware: '',
      address: '',
      suburb,
      state,
      pcode,
    };
    setError('');
    setMissingStoreModalError('');
    setShowAddMissingStoreModal(false);
    onSubmit(
      { fullName: formatName(fullName.trim()), storeNo: tempName, position: '' },
      storeData
    );
  };

  const handleOpenTempStoreForm = () => {
    setShowAddTempStoreForm(true);
    setMissingStoreResults([]);
    setMissingStoreSearchTried(false);
    setMissingStoreModalError('');
  };

  const handleSearchMissingStore = async () => {
    const q = missingStoreQuery.trim();
    if (!q) {
      setMissingStoreModalError('Enter store name or store id to search.');
      return;
    }
    setMissingStoreModalError('');
    setLoading(true);
    try {
      const res = await axios.get(apiUrl('/api/mcash-store-search'), { params: { q } });
      const list = Array.isArray(res.data) ? (res.data as McashStore[]) : [];
      setMissingStoreResults(list);
      setMissingStoreSearchTried(true);
      if (list.length === 0) {
        setShowAddTempStoreForm(false);
      }
    } catch {
      setMissingStoreResults([]);
      setMissingStoreSearchTried(true);
      setMissingStoreModalError('Store search failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const mcashStoreToStoreData = (store: McashStore, groupName: string): StoreData => ({
    storeNo: store.name,
    storeName: store.name,
    storeId: (store.storeId || '').trim(),
    storeRank: store.storeRank ?? null,
    ownerGroup: (store.ownerGroup || '').trim() || groupName,
    msoGroup: groupName,
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
  });

  useEffect(() => {
    if (currentStep !== STEP_MSO_GROUPS) return;
    setLoading(true);
    setMsoGroups([]);
    axios
      .get(apiUrl('/api/mcash-groups'))
      .then((res) => setMsoGroups(Array.isArray(res.data) ? res.data : []))
      .catch(() => setMsoGroups([]))
      .finally(() => setLoading(false));
  }, [currentStep]);

  useEffect(() => {
    if (currentStep !== STEP_MSO_STORES || !selectedMsoGroup) return;
    setLoading(true);
    setStoresInMsoGroup([]);
    axios
      .get(apiUrl('/api/mcash-stores-by-group'), { params: { group: selectedMsoGroup } })
      .then((res) => {
        const list = Array.isArray(res.data) ? res.data : [];
        setStoresInMsoGroup(list);
        setSelectedMsoStoreIds(new Set(list.map((s: McashStore) => s.id)));
      })
      .catch(() => setStoresInMsoGroup([]))
      .finally(() => setLoading(false));
  }, [currentStep, selectedMsoGroup]);

  const handleStart = () => {
    setCurrentStep(STEP_NAME);
    setError('');
  };

  const handleBack = () => {
    if (currentStep === STEP_NAME) setCurrentStep(STEP_HOME);
    else if (currentStep === STEP_STATE) setCurrentStep(STEP_NAME);
    else if (currentStep === STEP_SUBURB) setCurrentStep(STEP_STATE);
    else if (currentStep === STEP_BANNER) setCurrentStep(STEP_SUBURB);
    else if (currentStep === STEP_MSO_STORES) {
      setCurrentStep(STEP_MSO_GROUPS);
      setStoresInMsoGroup([]);
    } else if (currentStep === STEP_MSO_GROUPS) {
      setCurrentStep(STEP_STATE);
      setSelectedMsoGroup('');
      setMsoGroups([]);
    }
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

  const handleMsoEntry = () => {
    setSelectedMsoGroup('');
    setStoresInMsoGroup([]);
    setSelectedMsoStoreIds(new Set());
    setCurrentStep(STEP_MSO_GROUPS);
  };

  const handleMsoGroupSelect = (group: string) => {
    setSelectedMsoGroup(group);
    setCurrentStep(STEP_MSO_STORES);
  };

  const toggleMsoStore = (id: number) => {
    setSelectedMsoStoreIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleMsoStoresContinue = () => {
    if (!selectedMsoGroup || !onMsoStoresSubmit) return;
    const selected = storesInMsoGroup.filter((s) => selectedMsoStoreIds.has(s.id));
    if (selected.length === 0) {
      setError('Select at least one store.');
      return;
    }
    setError('');
    const stores = selected.map((s) => mcashStoreToStoreData(s, selectedMsoGroup));
    onMsoStoresSubmit(
      { fullName: formatName(fullName.trim()), storeNo: stores[0].storeName, position: '' },
      { group: selectedMsoGroup, stores }
    );
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
              <>
                <div className="choice-buttons">
                  {states.map(s => (
                    <button key={s} type="button" className="choice-btn" onClick={() => handleStateSelect(s)}>{s}</button>
                  ))}
                  <button type="button" className="choice-btn" onClick={handleMsoEntry}>
                    MSO
                  </button>
                  <button
                    type="button"
                    className="choice-btn add-missing-store-btn"
                    onClick={() => {
                      setMissingStoreQuery('');
                      setMissingStoreResults([]);
                      setMissingStoreSearchTried(false);
                      setShowAddTempStoreForm(false);
                      setMissingStoreName('');
                      setMissingStoreNumber('');
                      setMissingStoreState('');
                      setMissingStoreSuburb('');
                      setMissingStorePcode('');
                      setMissingStoreModalError('');
                      setShowAddMissingStoreModal(true);
                      setError('');
                    }}
                    aria-label="Add missing store"
                  >
                    +
                  </button>
                </div>
              </>
            )}
          </div>
        );
      case STEP_MSO_GROUPS:
        return (
          <div className="step-content">
            <div className="logo-container">
              <img src="/energizer.png" alt="Energizer Logo" className="logo" />
            </div>
            <p className="typing-text">MSO</p>
            <h3>Select your group</h3>
            {loading ? (
              <div className="loading-message">Loading groups...</div>
            ) : msoGroups.length === 0 ? (
              <div className="error-message">No groups found. Use state / suburb instead.</div>
            ) : (
              <div className="choice-buttons suburbs-list mso-group-list">
                {msoGroups.map((g) => (
                  <button key={g} type="button" className="choice-btn" onClick={() => handleMsoGroupSelect(g)}>
                    {g}
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      case STEP_MSO_STORES:
        return (
          <div className="step-content">
            <div className="logo-container">
              <img src="/energizer.png" alt="Energizer Logo" className="logo" />
            </div>
            <p className="typing-text">MSO</p>
            <h3>Select stores ({selectedMsoGroup})</h3>
            {loading ? (
              <div className="loading-message">Loading stores...</div>
            ) : storesInMsoGroup.length > 0 ? (
              <>
                <div className="mso-store-checklist" role="group" aria-label="Stores in group">
                  {storesInMsoGroup.map((store) => (
                    <label key={store.id} className="mso-store-check-row">
                      <input
                        type="checkbox"
                        checked={selectedMsoStoreIds.has(store.id)}
                        onChange={() => toggleMsoStore(store.id)}
                      />
                      <span className="mso-store-check-name">{store.name}</span>
                    </label>
                  ))}
                </div>
                <div className="form-navigation step-1-nav">
                  <button
                    type="button"
                    onClick={handleMsoStoresContinue}
                    className="nav-btn next-btn"
                    disabled={!onMsoStoresSubmit}
                  >
                    Continue
                  </button>
                </div>
              </>
            ) : (
              <div className="error-message">No stores for this group.</div>
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
                    {(store.pcode || store.ownerGroup) ? (
                      <span className="store-btn-meta">
                        {[store.pcode, store.ownerGroup].filter(Boolean).join(' · ')}
                      </span>
                    ) : null}
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
    const msoHead = thankYouMsoGroup?.trim();
    const displayStore = msoHead
      ? `MSO · ${msoHead}`
      : storeInfo?.storeName || externalUserData?.storeNo || '';
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
      {showAddMissingStoreModal ? (
        <div className="missing-store-modal-overlay" role="presentation" onClick={() => setShowAddMissingStoreModal(false)}>
          <div className="missing-store-modal" role="dialog" aria-modal="true" aria-label="Add missing store" onClick={(e) => e.stopPropagation()}>
            <div className="missing-store-modal-header">
              <h3>Store Lookup</h3>
              <button type="button" className="missing-store-modal-close" onClick={() => setShowAddMissingStoreModal(false)} aria-label="Close add missing store">
                ×
              </button>
            </div>
            <div className="missing-store-modal-body">
              {!showAddTempStoreForm ? (
                <>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Search store name or store id"
                    value={missingStoreQuery}
                    onChange={(e) => setMissingStoreQuery(e.target.value)}
                  />
                  <div className="missing-store-search-actions">
                    <button type="button" className="nav-btn next-btn" onClick={handleSearchMissingStore} disabled={loading}>
                      {loading ? 'Searching...' : 'Search'}
                    </button>
                  </div>
                  <div className="missing-store-search-actions missing-store-search-actions--secondary">
                    <button type="button" className="choice-btn add-missing-store-btn" onClick={handleOpenTempStoreForm}>
                      + Add TEMP Store
                    </button>
                  </div>
                  {missingStoreModalError ? <div className="error-message">{missingStoreModalError}</div> : null}
                  {missingStoreResults.length > 0 ? (
                    <div className="missing-store-results">
                      {missingStoreResults.map((store) => (
                        <div key={`${store.id}-${store.storeId || store.name}`} className="missing-store-result-card">
                          <strong>{store.name}</strong>
                          <span>{store.banner || '-'}</span>
                          <span>{store.suburb}, {store.state} {store.pcode}</span>
                          <span>Store ID: {store.storeId || '-'}</span>
                        </div>
                      ))}
                    </div>
                  ) : null}
                  {missingStoreSearchTried && missingStoreResults.length === 0 ? (
                    <div className="missing-store-no-results">
                      <p>No matching store found in mcash26.</p>
                    </div>
                  ) : null}
                </>
              ) : null}
              {showAddTempStoreForm ? (
                <div className="missing-store-temp-form">
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Store name *"
                    value={missingStoreName}
                    onChange={(e) => setMissingStoreName(e.target.value)}
                  />
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Store number *"
                    value={missingStoreNumber}
                    onChange={(e) => setMissingStoreNumber(e.target.value)}
                  />
                  <select
                    className="form-select"
                    value={missingStoreState}
                    onChange={(e) => setMissingStoreState(e.target.value)}
                  >
                    <option value="">Select state *</option>
                    {AU_STATES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Suburb *"
                    value={missingStoreSuburb}
                    onChange={(e) => setMissingStoreSuburb(e.target.value)}
                  />
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Postcode *"
                    value={missingStorePcode}
                    maxLength={4}
                    inputMode="numeric"
                    pattern="[0-9]{4}"
                    onChange={(e) => setMissingStorePcode(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  />
                </div>
              ) : null}
            </div>
            <div className="missing-store-modal-actions">
              <button type="button" className="nav-btn prev-btn missing-store-cancel-btn" onClick={() => setShowAddMissingStoreModal(false)}>Cancel</button>
              {showAddTempStoreForm ? (
                <button type="button" className="nav-btn next-btn" onClick={handleAddMissingStore}>Continue</button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default UserForm;
