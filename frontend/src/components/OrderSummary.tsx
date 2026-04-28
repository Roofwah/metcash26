import React, { useState, useEffect } from 'react';
import './OrderSummary.css';
import { type StoreData } from '../api';
import { DEFAULT_DROP_MONTH, DROP_MONTH_OPTIONS, normalizeDropMonth } from '../constants/dropMonths';
import type { BundleLineDetail } from '../utils/expandRetailOrderItems';

interface CartItem {
  offerId: string;
  offerTier?: string;
  quantity: number;
  description: string;
  cost: string;
  dropMonths?: string[];
  minQuantity?: number;
  lockQuantity?: boolean;
  fixedBundle?: boolean;
  splitBundle?: boolean;
  chooseNBundle?: boolean;
  lineDetails?: BundleLineDetail[];
}

function bundleLineDetailsSubtotal(lineDetails: BundleLineDetail[] | undefined): number {
  return (lineDetails || []).reduce((s, l) => s + parseFloat(l.cost || '0') * (l.quantity || 0), 0);
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface OrderSummaryProps {
  userData: { fullName: string; storeNo: string; position: string };
  storeData: StoreData;
  cartItems: CartItem[];
  /** MSO path: treat as one group order (heading / party block), not a single retail store. */
  msoOrder?: boolean;
  msoStoreCount?: number;
  onUpdateQuantity: (index: number, quantity: number) => void;
  onUpdateDropMonth: (index: number, unitIndex: number, dropMonth: string) => void;
  onRemoveItem: (index: number) => void;
  onBack: () => void;
  onSubmit: (data: { position: string; purchaseOrder?: string; email: string }) => Promise<void> | void;
}

const OrderSummary: React.FC<OrderSummaryProps> = ({
  userData,
  storeData,
  cartItems,
  msoOrder = false,
  msoStoreCount,
  onUpdateQuantity,
  onUpdateDropMonth,
  onRemoveItem: _onRemoveItem,
  onBack: _onBack,
  onSubmit
}) => {
  const isMso = msoOrder;
  const msoGroupLabel = (storeData.msoGroup || '').trim();
  const msoMainHeading = msoGroupLabel ? `MSO · ${msoGroupLabel}` : 'MSO · Group order';
  const [position, setPosition] = useState(userData.position || '');
  const [orderedAt] = useState(() => new Date());
  const [email, setEmail] = useState('');
  const [purchaseOrder, setPurchaseOrder] = useState('');
  const [includePO, setIncludePO] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const totalCost = cartItems.reduce((sum, item) => {
    if (item.splitBundle || item.chooseNBundle) {
      return sum + bundleLineDetailsSubtotal(item.lineDetails);
    }
    return sum + parseFloat(item.cost) * item.quantity;
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await Promise.resolve(
        onSubmit({
          position: position.trim(),
          purchaseOrder: includePO ? purchaseOrder.trim() : undefined,
          email: email.trim(),
        }),
      );
    } finally {
      setIsSubmitting(false);
    }
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
      {isSubmitting && (
        <div className="order-submit-overlay" role="status" aria-live="polite" aria-label="Submitting order">
          <div className="order-submit-loader">
            <img
              src="/products/battery-charging.gif"
              alt=""
              className="order-submit-gif"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = 'none';
              }}
            />
            <div className="order-submit-battery" aria-hidden="true">
              <span className="order-submit-battery-fill" />
            </div>
            <p>Submitting your order...</p>
          </div>
        </div>
      )}
      <div className="order-header">
        <div className="store-info-container">
          <div className="store-info">
            <h2>{isMso ? msoMainHeading : storeData.storeName}</h2>
            {isMso ? (
              msoStoreCount != null && msoStoreCount > 0 ? (
                <p className="order-store-id-meta">{msoStoreCount} store{msoStoreCount === 1 ? '' : 's'} in this order</p>
              ) : null
            ) : (
              <>
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
              </>
            )}
          </div>
        </div>
      </div>

      <div className="order-content">
        <div className="order-document-header">
          <div className="order-document-party">
            <div className="order-party-line order-party-name">{userData.fullName}</div>
            <div className="order-party-line order-party-store-banner">
              {isMso ? (
                <span>{msoMainHeading}</span>
              ) : (
                <>
                  <span>{storeData.storeName}</span>
                  {storeData.banner && storeData.banner !== '-' ? (
                    <>
                      <span className="order-party-store-banner-sep" aria-hidden="true">
                        ·
                      </span>
                      <span>{storeData.banner}</span>
                    </>
                  ) : null}
                </>
              )}
            </div>
            <div className="order-party-line order-party-address">
              {isMso ? (
                <span className="order-mso-ship-hint">Ship-to: each line shows the store (see description).</span>
              ) : (
                formattedStoreAddress ?? '—'
              )}
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
              if (item.fixedBundle) {
                const B = Math.max(1, item.quantity);
                const minQty = Math.max(1, item.minQuantity ?? 1);
                const rawBundleMonths =
                  item.dropMonths && item.dropMonths.length >= B
                    ? item.dropMonths
                    : Array.from({ length: B }, () => DEFAULT_DROP_MONTH);
                const bundleMonths = rawBundleMonths.map((m) => normalizeDropMonth(m));
                return (
                  <div key={`fb-${index}`} className="order-item order-item--fixed-bundle">
                    <div className="item-info">
                      <div className="item-description">{item.description}</div>
                      <div className="item-cost item-cost--bundle-total">
                        ${(parseFloat(item.cost) * item.quantity).toFixed(2)}
                      </div>
                      <div className="drop-months-container">
                        {Array.from({ length: B }, (_, unitIndex) => {
                          const currentDropMonth = bundleMonths[unitIndex] || DEFAULT_DROP_MONTH;
                          return (
                            <div key={unitIndex} className="drop-month-selector">
                              <label className="drop-month-label">Bundle {unitIndex + 1} drop date:</label>
                              <div className="drop-month-radio-group">
                                {DROP_MONTH_OPTIONS.map(({ value, label }) => (
                                  <label key={value} className="radio-option">
                                    <input
                                      type="radio"
                                      name={`dropBundle-${index}-${unitIndex}`}
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
                    </div>
                    <div className="item-controls">
                      <div className="quantity-controls">
                        <button
                          type="button"
                          onClick={() => onUpdateQuantity(index, item.quantity - 1)}
                          className="qty-btn"
                          disabled={item.quantity <= minQty}
                        >
                          -
                        </button>
                        <span className="qty-display">{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() => onUpdateQuantity(index, item.quantity + 1)}
                          className="qty-btn"
                        >
                          +
                        </button>
                      </div>
                      <div className="item-total">${(parseFloat(item.cost) * item.quantity).toFixed(2)}</div>
                    </div>
                  </div>
                );
              }

              if (item.splitBundle || item.chooseNBundle) {
                const W = item.splitBundle ? Math.max(1, item.quantity) : 1;
                const minSplitBundles = Math.max(1, item.minQuantity ?? 1);
                const sub = bundleLineDetailsSubtotal(item.lineDetails);
                const title = item.description;
                const rawBundleMonths =
                  item.dropMonths && item.dropMonths.length >= W
                    ? item.dropMonths
                    : Array.from({ length: W }, () => DEFAULT_DROP_MONTH);
                const bundleMonths = rawBundleMonths.map((m) => normalizeDropMonth(m));
                return (
                  <div key={`bd-${index}`} className="order-item order-item--fixed-bundle order-item--inner-bundle">
                    <div className="item-info">
                      <div className="item-description">{title}</div>
                      {item.splitBundle ? (
                        <div className="order-split-bundle-meta order-split-bundle-meta--inline">
                          {W} bundle{W === 1 ? '' : 's'} (shipped together) · ${sub.toFixed(2)}
                        </div>
                      ) : (
                        <div className="order-split-bundle-meta order-split-bundle-meta--inline">
                          Custom bundle (shipped together) · ${sub.toFixed(2)}
                        </div>
                      )}
                      {item.lineDetails && item.lineDetails.length > 0 ? (
                        <table className="order-bundle-lines" aria-label="Bundle line breakdown">
                          <thead>
                            <tr>
                              <th>Line</th>
                              <th className="order-bundle-lines-qty">Qty</th>
                              <th className="order-bundle-lines-sub">Subtotal</th>
                            </tr>
                          </thead>
                          <tbody>
                            {item.lineDetails.map((row, ri) => (
                              <tr key={ri}>
                                <td>{row.description}</td>
                                <td className="order-bundle-lines-qty">{row.quantity}</td>
                                <td className="order-bundle-lines-sub">
                                  ${(parseFloat(row.cost) * row.quantity).toFixed(2)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      ) : null}
                      <div className="drop-months-container">
                        {Array.from({ length: W }, (_, unitIndex) => {
                          const currentDropMonth = bundleMonths[unitIndex] || DEFAULT_DROP_MONTH;
                          return (
                            <div key={unitIndex} className="drop-month-selector">
                              <label className="drop-month-label">Bundle {unitIndex + 1} drop date:</label>
                              <div className="drop-month-radio-group">
                                {DROP_MONTH_OPTIONS.map(({ value, label }) => (
                                  <label key={value} className="radio-option">
                                    <input
                                      type="radio"
                                      name={`dropBundleMix-${index}-${unitIndex}`}
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
                    </div>
                    <div className="item-controls">
                      {item.splitBundle ? (
                        <div className="quantity-controls">
                          <button
                            type="button"
                            onClick={() => onUpdateQuantity(index, W - 1)}
                            className="qty-btn"
                            disabled={W <= minSplitBundles}
                            aria-label="Remove one bundle"
                          >
                            -
                          </button>
                          <span className="qty-display">{W}</span>
                          <button
                            type="button"
                            onClick={() => onUpdateQuantity(index, W + 1)}
                            className="qty-btn"
                            aria-label="Add one bundle"
                          >
                            +
                          </button>
                        </div>
                      ) : (
                        <div className="quantity-controls">
                          <button
                            type="button"
                            onClick={() => onUpdateQuantity(index, 0)}
                            className="qty-btn"
                            aria-label="Remove custom bundle from order"
                          >
                            -
                          </button>
                          <span className="qty-display">1</span>
                          <button type="button" className="qty-btn" disabled aria-hidden="true" tabIndex={-1}>
                            +
                          </button>
                        </div>
                      )}
                      <div className="item-total">${sub.toFixed(2)}</div>
                    </div>
                  </div>
                );
              }

              const firstDropMonth = item.dropMonths?.[0] ?? DEFAULT_DROP_MONTH;
              const minQty = Math.max(0, item.minQuantity ?? 1);
              const isLocked = !!item.lockQuantity && !item.fixedBundle;
              return (
                <div key={index} className="order-item">
                  <div className="item-info">
                    <div className="item-description">{item.description}</div>
                    {item.offerTier ? <div className="item-tier">Tier: {item.offerTier}</div> : null}
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
                        type="button"
                        onClick={() => onUpdateQuantity(index, item.quantity - 1)}
                        className="qty-btn"
                        disabled={isLocked || item.quantity <= minQty}
                      >
                        -
                      </button>
                      <span className="qty-display">{item.quantity}</span>
                      <button
                        type="button"
                        onClick={() => onUpdateQuantity(index, item.quantity + 1)}
                        className="qty-btn"
                        disabled={isLocked}
                      >
                        +
                      </button>
                    </div>
                    <div className="item-total">${(parseFloat(item.cost) * item.quantity).toFixed(2)}</div>
                    {isLocked ? <div className="item-tier">Fixed bundle line</div> : null}
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
              Add Notes or Purchase Order Number
            </label>
            {includePO && (
              <textarea
                value={purchaseOrder}
                onChange={(e) => setPurchaseOrder(e.target.value)}
                placeholder="Enter notes or purchase order number"
                className="form-input purchase-order-input"
                rows={2}
              />
            )}
          </div>

          <div className="form-actions">
            <button
              type="submit"
              className="submit-order-btn"
              disabled={!canSubmit || isSubmitting}
            >
              {isSubmitting ? 'Submitting...' : 'Submit order'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default OrderSummary;
