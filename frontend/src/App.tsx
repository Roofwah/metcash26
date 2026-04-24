import React, { useState, useEffect } from 'react';
import './App.css';
import UserForm from './components/UserForm';
import LoadingStep from './components/LoadingStep';
import StoreConfirm from './components/StoreConfirm';
import StoreSalesDashboard from './components/StoreSalesDashboard';
import OffersListing from './components/OffersListing';
import OfferDetail from './components/OfferDetail';
import OrderSummary from './components/OrderSummary';
import EmptyCartThankYou from './components/EmptyCartThankYou';
import MsoOfferMatrix, { msoStoreKey, type MsoMatrixCartItem } from './components/MsoOfferMatrix';
import TopNav from './components/TopNav';
import Dashboard from './components/Dashboard';
import Footer from './components/Footer';
import LandscapeHint from './components/LandscapeHint';
import LoginScreen from './components/LoginScreen';
import PresentationPlayer from './features/presentation-killer/components/PresentationPlayer';
import { killerPresentationDeck } from './features/presentation-killer/data/killerPresentationDeck';
import axios from 'axios';
import { apiUrl, StoreData } from './api';
import { DEFAULT_DROP_MONTH, normalizeDropMonth } from './constants/dropMonths';
import { storeSales } from './content/modalCopy';

interface UserData {
  fullName: string;
  storeNo: string;
  position: string;
}

interface CartItem {
  offerId: string;
  offerTier?: string;
  quantity: number;
  description: string;
  cost: string;
  dropMonths?: string[];
  minQuantity?: number;
  lockQuantity?: boolean;
  /** MSO matrix: group line items per store for split POST */
  msoStoreKey?: string;
}

type AppStep =
  | 'login'
  | 'form'
  | 'loading'
  | 'store-confirm'
  | 'offers-listing'
  | 'offer-detail'
  | 'mso-matrix'
  | 'order-summary'
  | 'thankyou'
  | 'empty-cart-thankyou';

function App() {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [storeData, setStoreData] = useState<StoreData | null>(null);
  const [currentStep, setCurrentStep] = useState<AppStep>('login');
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);
  const [selectedOfferId, setSelectedOfferId] = useState<string | null>(null);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [printData, setPrintData] = useState<any>(null);
  const [showPresentation, setShowPresentation] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);
  const [showStoreSalesModal, setShowStoreSalesModal] = useState(false);
  const [storeHasSalesData, setStoreHasSalesData] = useState<boolean | null>(null);
  const [formBackHandler, setFormBackHandler] = useState<(() => void) | null>(null);
  /** MSO path: store picker → matrix → split orders (skips store confirm + presentation) */
  const [sessionFlow, setSessionFlow] = useState<'retail' | 'mso'>('retail');
  const [msoStores, setMsoStores] = useState<StoreData[]>([]);

  // Extract rep name from energizer-style email: sarah.cussen@energizer.com → "Sarah Cussen"
  const repName = sessionEmail
    ? sessionEmail.split('@')[0].split(/[._-]/).map(s => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()).join(' ')
    : undefined;
  const repEmail = sessionEmail || undefined;

  useEffect(() => {
    if (currentStep !== 'store-confirm' || !storeData?.storeId?.trim()) {
      setStoreHasSalesData(null);
      return;
    }
    let cancelled = false;
    const sid = storeData.storeId.trim();
    axios
      .get(apiUrl(`/api/store-sales/${encodeURIComponent(sid)}`))
      .then((res) => {
        if (!cancelled) setStoreHasSalesData(!!res.data?.hasData);
      })
      .catch(() => {
        if (!cancelled) setStoreHasSalesData(false);
      });
    return () => {
      cancelled = true;
    };
  }, [currentStep, storeData?.storeId]);

  const connectedDatasets = [
    'Products API',
    'Orders API',
    ...(sessionFlow === 'mso' && storeData?.msoGroup ? [`MSO · ${storeData.msoGroup}`] : []),
    ...(sessionFlow === 'mso' && msoStores.length > 1 ? [`${msoStores.length} stores`] : []),
    ...(storeData?.storeName ? [`Store: ${storeData.storeName}`] : []),
    ...(storeData?.banner ? [`Banner: ${storeData.banner}`] : []),
  ];

  const handleLoginSuccess = (email: string) => {
    setSessionEmail(email);
    setCurrentStep('form');
  };

  const handleLogout = () => {
    setShowPresentation(false);
    setFormBackHandler(null);
    setUserData(null);
    setStoreData(null);
    setCartItems([]);
    setSelectedOfferId(null);
    setPrintData(null);
    setSessionEmail(null);
    setSessionFlow('retail');
    setMsoStores([]);
    setCurrentStep('login');
  };

  const handleFormSubmit = (data: UserData, storeDataFromForm?: StoreData) => {
    setUserData(data);
    if (storeDataFromForm) {
      setStoreData(storeDataFromForm);
      setSessionFlow('retail');
      setMsoStores([]);
      setCurrentStep('store-confirm');
    } else {
      setCurrentStep('loading');
    }
  };

  const handleMsoStoresSubmit = (
    data: UserData,
    payload: { group: string; stores: StoreData[] }
  ) => {
    setUserData(data);
    setSessionFlow('mso');
    setMsoStores(payload.stores);
    setStoreData(payload.stores[0] ?? null);
    setShowPresentation(false);
    setCartItems([]);
    setSelectedOfferId(null);
    setCurrentStep('mso-matrix');
  };

  const handleLoadingComplete = (storeDataFromLoading?: StoreData) => {
    if (storeDataFromLoading) {
      setStoreData(storeDataFromLoading);
      setCurrentStep('store-confirm');
    } else {
      alert('Could not load store. Please try again.');
      setCurrentStep('form');
    }
  };

  const goToOffersAfterStoreConfirm = () => {
    setCurrentStep('offers-listing');
    setShowPresentation(true);
  };

  const handleStoreConfirmContinue = () => {
    goToOffersAfterStoreConfirm();
  };
  const handleStoreConfirmBack    = () => setCurrentStep('form');

  const handleSelectOffer = (offerId: string) => {
    setSelectedOfferId(offerId);
    setCurrentStep('offer-detail');
  };

  const handleBackFromOfferDetail = () => {
    setSelectedOfferId(null);
    setCurrentStep('offers-listing');
  };

  const handleAddToCart = (items: CartItem[]) => {
    const itemsWithDropMonths = items.map(item => ({
      ...item,
      dropMonths: item.dropMonths || Array(item.quantity).fill(DEFAULT_DROP_MONTH),
    }));
    setCartItems(prev => [...prev, ...itemsWithDropMonths]);
    setCurrentStep('offers-listing');
    setSelectedOfferId(null);
  };

  const handleGoToCart = () => {
    setCurrentStep(cartItems.length > 0 ? 'order-summary' : 'empty-cart-thankyou');
  };

  const handleUpdateQuantity = (index: number, quantity: number) => {
    setCartItems(prev => {
      const updated = [...prev];
      const currentItem = updated[index];
      if (!currentItem) return prev;
      if (currentItem.lockQuantity) return prev;
      const minQty = Math.max(0, currentItem.minQuantity ?? 1);
      if (quantity < minQty) quantity = minQty;
      if (quantity <= 0) { return prev.filter((_, i) => i !== index); }
      const currentDropMonths = currentItem.dropMonths || Array(currentItem.quantity).fill(DEFAULT_DROP_MONTH);
      if (quantity > currentItem.quantity) {
        const newDropMonths = [...currentDropMonths];
        for (let i = currentItem.quantity; i < quantity; i++) newDropMonths.push(DEFAULT_DROP_MONTH);
        updated[index].dropMonths = newDropMonths;
      } else {
        updated[index].dropMonths = currentDropMonths.slice(0, quantity);
      }
      updated[index].quantity = quantity;
      return updated;
    });
  };

  const handleUpdateCartQuantityByOfferId = (offerId: string, quantity: number, offerTier?: string) => {
    if (quantity <= 0) {
      setCartItems(prev =>
        prev.filter(item => item.offerId !== offerId || (offerTier !== undefined && item.offerTier !== offerTier))
      );
      return;
    }
    setCartItems(prev => {
      const itemIndex = prev.findIndex(
        item => item.offerId === offerId && (offerTier === undefined || item.offerTier === offerTier)
      );
      if (itemIndex < 0) return prev;
      const updated = [...prev];
      const currentItem = updated[itemIndex];
      const currentDropMonths = currentItem.dropMonths || Array(currentItem.quantity).fill(DEFAULT_DROP_MONTH);
      if (quantity > currentItem.quantity) {
        const newDropMonths = [...currentDropMonths];
        for (let i = currentItem.quantity; i < quantity; i++) newDropMonths.push(DEFAULT_DROP_MONTH);
        updated[itemIndex].dropMonths = newDropMonths;
      } else {
        updated[itemIndex].dropMonths = currentDropMonths.slice(0, quantity);
      }
      updated[itemIndex].quantity = quantity;
      return updated;
    });
  };

  const handleRemoveItem = (index: number) => {
    setCartItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpdateDropMonth = (index: number, unitIndex: number, dropMonth: string) => {
    setCartItems(prev => {
      const updated = [...prev];
      const currentItem = updated[index];
      const currentDropMonths = currentItem.dropMonths || Array(currentItem.quantity).fill(DEFAULT_DROP_MONTH);
      const newDropMonths = [...currentDropMonths];
      newDropMonths[unitIndex] = dropMonth;
      updated[index].dropMonths = newDropMonths;
      return updated;
    });
  };

  const orderPayloadItem = (it: CartItem) => ({
    offerId: it.offerId,
    offerTier: it.offerTier,
    quantity: it.quantity,
    description: it.description,
    cost: it.cost,
    dropMonths: it.dropMonths?.map((m) => normalizeDropMonth(m)),
  });

  const handleOrderSubmit = async (data: { position: string; purchaseOrder?: string; email: string }) => {
    if (!userData || !storeData) return;

    const postOrder = async (orderData: Record<string, unknown>) => {
      await axios.post(apiUrl('/api/save-order'), orderData);
    };

    try {
      if (sessionFlow === 'mso' && msoStores.length > 0) {
        let lastPrint: Record<string, unknown> | null = null;
        for (const store of msoStores) {
          const key = msoStoreKey(store);
          const items = cartItems.filter((i) => i.msoStoreKey === key).map(orderPayloadItem);
          if (items.length === 0) continue;
          const totalValue = cartItems
            .filter((i) => i.msoStoreKey === key)
            .reduce((sum, item) => sum + parseFloat(item.cost) * item.quantity, 0)
            .toFixed(2);
          const orderData = {
            userName: userData.fullName,
            storeNumber: store.storeNo,
            storeName: store.storeName,
            banner: store.banner,
            position: data.position,
            purchaseOrder: data.purchaseOrder || '',
            email: data.email,
            storeCode: (store.storeId || '').trim(),
            repEmail: repEmail || '',
            items,
            totalValue,
          };
          await postOrder(orderData);
          lastPrint = orderData;
        }
        setPrintData(lastPrint);
      } else {
        const orderData = {
          userName: userData.fullName,
          storeNumber: userData.storeNo,
          storeName: storeData.storeName,
          banner: storeData.banner,
          position: data.position,
          purchaseOrder: data.purchaseOrder || '',
          email: data.email,
          storeCode: (storeData.storeId || '').trim(),
          repEmail: repEmail || '',
          items: cartItems.map(orderPayloadItem),
          totalValue: cartItems.reduce((sum, item) => sum + parseFloat(item.cost) * item.quantity, 0).toFixed(2),
        };
        await postOrder(orderData);
        setPrintData(orderData);
      }
    } catch (error) {
      console.error('Error saving order:', error);
    }
    setCurrentStep('thankyou');
  };

  const handleThankYouComplete = () => {
    setUserData(null);
    setStoreData(null);
    setCartItems([]);
    setSelectedOfferId(null);
    setPrintData(null);
    setSessionFlow('retail');
    setMsoStores([]);
    setCurrentStep('form');
  };

  const handleBackFromOrderSummary = () =>
    setCurrentStep(sessionFlow === 'mso' ? 'mso-matrix' : 'offers-listing');

  const handleBackFromMsoMatrix = () => {
    setCurrentStep('form');
    setMsoStores([]);
    setCartItems([]);
    setSessionFlow('retail');
  };

  const handleMsoMatrixCheckout = (items: MsoMatrixCartItem[]) => {
    const itemsWithDropMonths = items.map((item) => ({
      ...item,
      dropMonths: Array(item.quantity).fill(DEFAULT_DROP_MONTH),
    }));
    setCartItems(itemsWithDropMonths);
    setCurrentStep('order-summary');
  };

  const handleViewPresentation = () => setShowPresentation(true);
  const handlePresentationClose = () => setShowPresentation(false);
  const handlePresentationCTA = (action: string) => {
    setShowPresentation(false);
    if (action === 'offers') setCurrentStep('offers-listing');
  };

  // Centralised back handler — drives the footer back button
  const getBackHandler = (): (() => void) | null => {
    switch (currentStep) {
      case 'login':               return null;
      case 'form':                return formBackHandler;
      case 'store-confirm':       return handleStoreConfirmBack;
      case 'loading':             return () => setCurrentStep('form');
      case 'offers-listing':      return () => setCurrentStep('store-confirm');
      case 'mso-matrix':          return handleBackFromMsoMatrix;
      case 'offer-detail':        return handleBackFromOfferDetail;
      case 'order-summary':       return handleBackFromOrderSummary;
      case 'empty-cart-thankyou':
        return () =>
          sessionFlow === 'mso' ? setCurrentStep('mso-matrix') : setCurrentStep('offers-listing');
      default:                    return null;
    }
  };

  const handleEmptyCartThank = async () => {
    if (!userData || !storeData) return;
    try {
      await axios.post(apiUrl('/api/save-order'), {
        userName: userData.fullName,
        storeNumber: userData.storeNo,
        storeName: storeData.storeName,
        banner: storeData.banner,
        position: '',
        purchaseOrder: '',
        email: '',
        storeCode: (storeData.storeId || '').trim(),
        items: [],
        totalValue: '0.00',
      });
    } catch (error) {
      console.error('Error saving order:', error);
    }
    handleThankYouComplete();
  };

  return (
    <div className="App with-nav">

      {currentStep !== 'login' && (
        <TopNav
          userName={repName}
          userEmail={repEmail}
          connectedDatasets={connectedDatasets}
          onLogout={handleLogout}
          onDashboard={() => setShowDashboard(true)}
        />
      )}

      {showDashboard && (
        <Dashboard repEmail={repEmail} onClose={() => setShowDashboard(false)} />
      )}

      {showStoreSalesModal && userData && storeData && (
        <div
          className="store-sales-modal-overlay"
          role="presentation"
          onClick={() => setShowStoreSalesModal(false)}
        >
          <div
            className="store-sales-modal-panel"
            role="dialog"
            aria-modal="true"
            aria-label={storeSales.overlayAriaLabel}
            onClick={(e) => e.stopPropagation()}
          >
            <StoreSalesDashboard
              variant="modal"
              userData={userData}
              storeData={storeData}
              onBack={() => setShowStoreSalesModal(false)}
              onContinue={() => {
                setShowStoreSalesModal(false);
                goToOffersAfterStoreConfirm();
              }}
            />
          </div>
        </div>
      )}

      {currentStep === 'login' && <LoginScreen onSuccess={handleLoginSuccess} />}

      {currentStep === 'form' && (
        <UserForm
          initialFullName={userData?.fullName ?? ''}
          onSubmit={handleFormSubmit}
          onMsoStoresSubmit={handleMsoStoresSubmit}
          onBackChange={(h) => setFormBackHandler(h ? () => h : null)}
        />
      )}

      {currentStep === 'loading' && userData && (
        <LoadingStep userData={userData} onComplete={handleLoadingComplete} onBack={() => setCurrentStep('form')} />
      )}

      {currentStep === 'store-confirm' && userData && storeData && (
        <StoreConfirm
          userData={userData}
          storeData={storeData}
          onContinue={handleStoreConfirmContinue}
          onBack={handleStoreConfirmBack}
          showSalesDashboardButton={storeHasSalesData === true}
          onOpenSalesDashboard={() => setShowStoreSalesModal(true)}
        />
      )}

      {currentStep === 'offers-listing' && userData && storeData && (
        <OffersListing
          userData={userData}
          storeData={storeData}
          onSelectOffer={handleSelectOffer}
          onBack={() => setCurrentStep('store-confirm')}
          onGoToCart={handleGoToCart}
          cartItemCount={cartItems.length}
          cartItems={cartItems}
          onAddToCart={handleAddToCart}
          onUpdateCartQuantity={handleUpdateCartQuantityByOfferId}
        />
      )}

      {currentStep === 'mso-matrix' && storeData?.msoGroup && msoStores.length > 0 && (
        <MsoOfferMatrix
          msoGroup={storeData.msoGroup}
          stores={msoStores}
          onProceedToCheckout={handleMsoMatrixCheckout}
        />
      )}

      {currentStep === 'offer-detail' && userData && storeData && selectedOfferId && (
        <OfferDetail
          offerId={selectedOfferId}
          userData={userData}
          storeData={storeData}
          onBack={handleBackFromOfferDetail}
          onAddToCart={handleAddToCart}
        />
      )}

      {currentStep === 'order-summary' && userData && storeData && (
        <OrderSummary
          userData={userData}
          storeData={storeData}
          cartItems={cartItems}
          onUpdateQuantity={handleUpdateQuantity}
          onUpdateDropMonth={handleUpdateDropMonth}
          onRemoveItem={handleRemoveItem}
          onBack={handleBackFromOrderSummary}
          onSubmit={handleOrderSubmit}
        />
      )}

      {currentStep === 'thankyou' && userData && (
        <UserForm
          onSubmit={handleThankYouComplete}
          onThankYouComplete={handleThankYouComplete}
          showThankYou={true}
          userData={userData}
          printData={printData}
        />
      )}

      {currentStep === 'empty-cart-thankyou' && userData && storeData && (
        <EmptyCartThankYou
          userData={userData}
          storeData={storeData}
          onBack={() =>
            sessionFlow === 'mso' ? setCurrentStep('mso-matrix') : setCurrentStep('offers-listing')
          }
          onThank={handleEmptyCartThank}
        />
      )}

      <Footer onBack={getBackHandler()} hideStatusOrb={currentStep === 'login'} />

      {currentStep === 'store-confirm' && <LandscapeHint />}

      {/* ── Presentation Player overlay ─────────────────────────── */}
      {showPresentation && (
        <PresentationPlayer
          deck={killerPresentationDeck}
          onClose={handlePresentationClose}
          onCTAAction={handlePresentationCTA}
        />
      )}

    </div>
  );
}

export default App;
