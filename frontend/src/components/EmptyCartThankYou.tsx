import React from 'react';
import './EmptyCartThankYou.css';

interface EmptyCartThankYouProps {
  userData: { fullName: string; storeNo: string; position: string };
  storeData: { storeName: string; banner: string };
  onBack: () => void;
  onThank: () => void;
}

const EmptyCartThankYou: React.FC<EmptyCartThankYouProps> = ({ userData, storeData, onBack, onThank }) => {
  return (
    <div className="empty-cart-thankyou-container">
      <div className="empty-cart-thankyou-content">
        <h1 className="empty-cart-title">
          Thank you : {storeData.storeName}
        </h1>
        <p className="empty-cart-message">
          you have not chosen to purchase any deals today?
        </p>
        <p className="empty-cart-encouragement">
          It's not too late
        </p>
        <div className="empty-cart-actions">
          <button onClick={onBack} className="empty-cart-back-btn">
            Back
          </button>
          <button onClick={onThank} className="empty-cart-thank-btn">
            Thank
          </button>
        </div>
      </div>
    </div>
  );
};

export default EmptyCartThankYou;



