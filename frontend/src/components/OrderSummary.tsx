import React, { useState, useEffect } from 'react';
import './OrderSummary.css';
import type { StoreData } from '../api';
import { DEFAULT_DROP_MONTH, DROP_MONTH_OPTIONS, normalizeDropMonth } from '../constants/dropMonths';

interface CartItem {
  offerId: string;
  offerTier?: string;
  quantity: number;
  description: string;
  cost: string;
  dropMonths?: string[];
  minQuantity?: number;
  lockQuantity?: boolean;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface OrderSummaryProps {
  userData: { fullName: string; storeNo: string; position: string };
  storeData: StoreData;
  cartItems: CartItem[];
  onUpdateQuantity: (index: number, quantity: number) => void;
  onUpdateDropMonth: (index: number, unitIndex: number, dropMonth: string) => void;
  onRemoveItem: (index: number) => void;
  onBack: () => void;
  onSubmit: (data: { position: string; purchaseOrder?: string; email: string }) => void;
}

const OrderSummary: React.FC<OrderSummaryProps> = ({
  userData,
  storeData,
  cartItems,
  onUpdateQuantity,
  onUpdateDropMonth,
  onRemoveItem: _onRemoveItem,
  onBack: _onBack,
  onSubmit
}) => {
  const [position, setPosition] = useState(userData.position || '');
  const [orderedAt] = useState(() => new Date());
  const [email, setEmail] = useState('');
  const [purchaseOrder, setPurchaseOrder] = useState('');
  const [includePO, setIncludePO] = useState(false);

  const totalCost = cartItems.reduce((sum, item) => {
    return sum + (parseFloat(item.cost) * item.quantity);
  }, 0);

  const canSubmit =
    position.trim().length > 0 &&
    EMAIL_REGEX.test(email.trim());

  const orderDateTimeLabel = orderedAt.toLocaleString('en-AU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  const formattedStoreAddress = (() => {
    const lines: string[] = [];
    if (storeData.address?.trim()) lines.push(storeData.address.trim());
    const cityLine = [storeData.suburb, storeData.state, storeData.pcode]
      .filter((x) => x && String(x).trim())
      .join(' ');
    if (cityLine) lines.push(cityLine);
    return lines.length ? lines.join('\n') : null;
  })();

  useEffect(() => {
    if (!includePO) {
      setPurchaseOrder('');
    }
  }, [includePO]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    onSubmit({
      position: position.trim(),
      purchaseOrder: includePO ? purchaseOrder.trim() : undefined,
      email: email.trim(),
    });
  };

  if (cartItems.length === 0) {
    return (
      <div className="order-summary-container">
        <div className="empty-cart-message">
          <h2>Your cart is empty</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="order-summary-container">
      <div className="order-header">
        <div className="store-info-container">
          <div className="store-info">
            <h2>{storeData.storeName}</h2>
            {storeData.banner !== '-' && <p>{storeData.banner}</p>}
            {storeData.storeId ? (
              <p className="order-store-id-meta">Store ID: {storeData.storeId}</p>
            ) : null}
            {storeData.ownerGroup ? (
              <p className="order-store-id-meta">Group: {storeData.ownerGroup}</p>
            ) : null}
            {storeData.storeRank != null ? (
              <p className="order-store-id-meta">No. {storeData.storeRank}</p>
            ) : null}
          </div>
        </div>
      </div>

      <div className="order-content">
        <div className="order-document-header">
          <div className="order-document-party">
            <div className="order-party-line order-party-name">{userData.fullName}</div>
            <div className="order-party-line order-party-store-banner">
              <span>{storeData.storeName}</span>
              {storeData.banner && storeData.banner !== '-' ? (
                <>
                  <span className="order-party-store-banner-sep" aria-hidden="true">
                    ·
                  </span>
                  <span>{storeData.banner}</span>
                </>
              ) : null}
            </div>
            <div className="order-party-line order-party-address">
              {formattedStoreAddress ?? '—'}
            </div>
          </div>
          <div className="order-document-datetime" aria-label="Order date and time">
            <time dateTime={orderedAt.toISOString()} className="order-datetime-value">
              {orderDateTimeLabel}
            </time>
          </div>
        </div>

        <h1 className="order-document-title">Order Summary</h1>

        <div className="order-items-section">
          <h2>Items in Your Order</h2>
          {cartItems.map((item, index) => {
            const firstDropMonth = item.dropMonths?.[0] ?? DEFAULT_DROP_MONTH;
            const minQty = Math.max(0, item.minQuantity ?? 1);
            const isLocked = !!item.lockQuantity;
            return (
            <div key={index} className="order-item">
              <div className="item-info">
                <div className="item-description">{item.description}</div>
                {item.offerTier && (
                  <div className="item-tier">Tier: {item.offerTier}</div>
                )}
                <div className="item-cost">${parseFloat(item.cost).toFixed(2)} each</div>
                {item.quantity > 1 && (
                  <div className="drop-months-container">
                    {Array.from({ length: item.quantity }, (_, unitIndex) => {
                      const rawMonths = item.dropMonths || Array(item.quantity).fill(DEFAULT_DROP_MONTH);
                      const dropMonths = rawMonths.map((m) => normalizeDropMonth(m));
                      const currentDropMonth = dropMonths[unitIndex] || DEFAULT_DROP_MONTH;
                      return (
                        <div key={unitIndex} className="drop-month-selector">
                          <label className="drop-month-label">Unit {unitIndex + 1} drop date:</label>
                          <div className="drop-month-radio-group">
                            {DROP_MONTH_OPTIONS.map(({ value, label }) => (
                              <label key={value} className="radio-option">
                                <input
                                  type="radio"
                                  name={`dropMonth-${index}-${unitIndex}`}
                                  value={value}
                                  checked={currentDropMonth === value}
                                  onChange={(e) => onUpdateDropMonth(index, unitIndex, e.target.value)}
                                />
                                <span>{label}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                {item.quantity === 1 && (
                  <div className="drop-month-selector">
                    <label className="drop-month-label">Drop date:</label>
                    <div className="drop-month-radio-group">
                      {DROP_MONTH_OPTIONS.map(({ value, label }) => (
                        <label key={value} className="radio-option">
                          <input
                            type="radio"
                            name={`dropMonth-${index}`}
                            value={value}
                            checked={firstDropMonth === value}
                            onChange={(e) => onUpdateDropMonth(index, 0, e.target.value)}
                          />
                          <span>{label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="item-controls">
                <div className="quantity-controls">
                  <button 
                    onClick={() => onUpdateQuantity(index, item.quantity - 1)}
                    className="qty-btn"
                    disabled={isLocked || item.quantity <= minQty}
                  >-</button>
                  <span className="qty-display">{item.quantity}</span>
                  <button 
                    onClick={() => onUpdateQuantity(index, item.quantity + 1)}
                    className="qty-btn"
                    disabled={isLocked}
                  >+</button>
                </div>
                <div className="item-total">
                  ${(parseFloat(item.cost) * item.quantity).toFixed(2)}
                </div>
                {isLocked && <div className="item-tier">Fixed bundle line</div>}
              </div>
            </div>
            );
          })}
        </div>

        <div className="order-total-section">
          <div className="total-row">
            <span className="total-label">Total Order Value:</span>
            <span className="total-value">${totalCost.toFixed(2)}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="order-form">
          <div className="form-section">
            <label htmlFor="position">{userData.fullName} - Your Position *</label>
            <select
              id="position"
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              className="form-select"
            >
              <option value="">Select your position</option>
              <option value="Store Manager">Store Manager</option>
              <option value="Asst Store Manager">Asst Store Manager</option>
              <option value="Team Member">Team Member</option>
              <option value="Head Office">Head Office</option>
              <option value="Store Support">Store Support</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div className="form-section">
            <label htmlFor="order-email">Email address *</label>
            <input
              id="order-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email address"
              className="form-select"
              autoComplete="email"
            />
          </div>

          <div className="form-section">
            <label>
              <input
                type="checkbox"
                checked={includePO}
                onChange={(e) => setIncludePO(e.target.checked)}
                className="checkbox-input"
              />
              Include Purchase Order Number
            </label>
            {includePO && (
              <input
                type="text"
                value={purchaseOrder}
                onChange={(e) => setPurchaseOrder(e.target.value)}
                placeholder="Enter purchase order number"
                className="form-input purchase-order-input"
              />
            )}
          </div>

          <div className="form-actions">
            <button
              type="submit"
              className="submit-order-btn"
              disabled={!canSubmit}
            >
              Submit order
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default OrderSummary;
