import React, { useState } from 'react';
import './App.css';
import UserForm from './components/UserForm';
import LoadingStep from './components/LoadingStep';
import StoreConfirm from './components/StoreConfirm';
import OffersListing from './components/OffersListing';
import OfferDetail from './components/OfferDetail';
import OrderSummary from './components/OrderSummary';
import EmptyCartThankYou from './components/EmptyCartThankYou';
import Footer from './components/Footer';
import StartOverButton from './components/StartOverButton';
import axios from 'axios';
import { apiUrl, StoreData } from './api';

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
}

type AppStep =
  | 'form'
  | 'loading'
  | 'store-confirm'
  | 'offers-listing'
  | 'offer-detail'
  | 'order-summary'
  | 'thankyou'
  | 'empty-cart-thankyou';

function App() {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [storeData, setStoreData] = useState<StoreData | null>(null);
  const [currentStep, setCurrentStep] = useState<AppStep>('form');
  const [selectedOfferId, setSelectedOfferId] = useState<string | null>(null);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [printData, setPrintData] = useState<any>(null);

  const handleFormSubmit = (data: UserData, storeDataFromForm?: StoreData) => {
    setUserData(data);
    if (storeDataFromForm) {
      setStoreData(storeDataFromForm);
      setCurrentStep('store-confirm');
    } else {
      setCurrentStep('loading');
    }
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

  const handleStoreConfirmContinue = () => {
    setCurrentStep('offers-listing');
  };

  const handleStoreConfirmBack = () => {
    setCurrentStep('form');
  };

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
      dropMonths: item.dropMonths || Array(item.quantity).fill('March'),
    }));
    setCartItems(prev => [...prev, ...itemsWithDropMonths]);
    setCurrentStep('offers-listing');
    setSelectedOfferId(null);
  };

  const handleGoToCart = () => {
    if (cartItems.length > 0) {
      setCurrentStep('order-summary');
    } else {
      setCurrentStep('empty-cart-thankyou');
    }
  };

  const handleUpdateQuantity = (index: number, quantity: number) => {
    if (quantity <= 0) {
      handleRemoveItem(index);
      return;
    }
    setCartItems(prev => {
      const updated = [...prev];
      const currentItem = updated[index];
      const currentDropMonths = currentItem.dropMonths || Array(currentItem.quantity).fill('March');
      if (quantity > currentItem.quantity) {
        const newDropMonths = [...currentDropMonths];
        for (let i = currentItem.quantity; i < quantity; i++) newDropMonths.push('March');
        updated[index].dropMonths = newDropMonths;
      } else if (quantity < currentItem.quantity) {
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
      const currentDropMonths = currentItem.dropMonths || Array(currentItem.quantity).fill('March');
      if (quantity > currentItem.quantity) {
        const newDropMonths = [...currentDropMonths];
        for (let i = currentItem.quantity; i < quantity; i++) newDropMonths.push('March');
        updated[itemIndex].dropMonths = newDropMonths;
      } else if (quantity < currentItem.quantity) {
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
      const currentDropMonths = currentItem.dropMonths || Array(currentItem.quantity).fill('March');
      const newDropMonths = [...currentDropMonths];
      newDropMonths[unitIndex] = dropMonth;
      updated[index].dropMonths = newDropMonths;
      return updated;
    });
  };

  const handleOrderSubmit = async (data: { position: string; purchaseOrder?: string }) => {
    if (!userData || !storeData) return;
    const orderData = {
      userName: userData.fullName,
      storeNumber: userData.storeNo,
      storeName: storeData.storeName,
      banner: storeData.banner,
      position: data.position,
      purchaseOrder: data.purchaseOrder || '',
      items: cartItems,
      totalValue: cartItems.reduce((sum, item) => sum + parseFloat(item.cost) * item.quantity, 0).toFixed(2),
    };
    try {
      await axios.post(apiUrl('/api/save-order'), orderData);
    } catch (error) {
      console.error('Error saving order:', error);
    }
    setPrintData(orderData);
    setCurrentStep('thankyou');
  };

  const handleThankYouComplete = () => {
    setUserData(null);
    setStoreData(null);
    setCartItems([]);
    setSelectedOfferId(null);
    setPrintData(null);
    setCurrentStep('form');
  };

  const handleBackFromOrderSummary = () => {
    setCurrentStep('offers-listing');
  };

  const handleEmptyCartThank = async () => {
    if (!userData || !storeData) return;
    const orderData = {
      userName: userData.fullName,
      storeNumber: userData.storeNo,
      storeName: storeData.storeName,
      banner: storeData.banner,
      position: '',
      purchaseOrder: '',
      items: [],
      totalValue: '0.00',
    };
    try {
      await axios.post(apiUrl('/api/save-order'), orderData);
    } catch (error) {
      console.error('Error saving order:', error);
    }
    handleThankYouComplete();
  };

  return (
    <div className="App">
      {currentStep === 'form' && <UserForm onSubmit={handleFormSubmit} />}

      {currentStep === 'loading' && userData && (
        <LoadingStep userData={userData} onComplete={handleLoadingComplete} onBack={() => setCurrentStep('form')} />
      )}

      {currentStep === 'store-confirm' && userData && storeData && (
        <StoreConfirm
          userData={userData}
          storeData={storeData}
          onContinue={handleStoreConfirmContinue}
          onBack={handleStoreConfirmBack}
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
          onBack={() => setCurrentStep('offers-listing')}
          onThank={handleEmptyCartThank}
        />
      )}

      {currentStep !== 'form' && currentStep !== 'thankyou' && currentStep !== 'empty-cart-thankyou' && (
        <StartOverButton onStartOver={handleThankYouComplete} />
      )}

      <Footer />
    </div>
  );
}

export default App;
