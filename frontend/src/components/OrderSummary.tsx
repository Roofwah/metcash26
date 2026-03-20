import React, { useState, useRef, useEffect } from 'react';
import Keyboard from 'react-simple-keyboard';
import 'react-simple-keyboard/build/css/index.css';
import './OrderSummary.css';

interface CartItem {
  offerId: string;
  offerTier?: string;
  quantity: number;
  description: string;
  cost: string;
  dropMonths?: string[];
}

interface OrderSummaryProps {
  userData: { fullName: string; storeNo: string; position: string };
  storeData: { storeName: string; banner: string };
  cartItems: CartItem[];
  onUpdateQuantity: (index: number, quantity: number) => void;
  onUpdateDropMonth: (index: number, unitIndex: number, dropMonth: string) => void;
  onRemoveItem: (index: number) => void;
  onBack: () => void;
  onSubmit: (data: { position: string; purchaseOrder?: string }) => void;
}

const OrderSummary: React.FC<OrderSummaryProps> = ({
  userData,
  storeData,
  cartItems,
  onUpdateQuantity,
  onUpdateDropMonth,
  onRemoveItem,
  onBack,
  onSubmit
}) => {
  const [position, setPosition] = useState(userData.position || '');
  const [purchaseOrder, setPurchaseOrder] = useState('');
  const [includePO, setIncludePO] = useState(false);
  const [showKeyboard, setShowKeyboard] = useState(false);
  const keyboardRef = useRef<any>(null);
  const keyboardContainerRef = useRef<HTMLDivElement>(null);
  const purchaseOrderInputRef = useRef<HTMLInputElement>(null);

  const totalCost = cartItems.reduce((sum, item) => {
    return sum + (parseFloat(item.cost) * item.quantity);
  }, 0);

  const handleInputFocus = () => {
    if (includePO) {
      setShowKeyboard(true);
    }
  };

  const handleInputBlur = (e: React.FocusEvent) => {
    if (showKeyboard) {
      e.preventDefault();
      return;
    }
  };

  const closeKeyboard = () => {
    setShowKeyboard(false);
  };

  const onKeyPress = (button: string) => {
    if (button === '{clear}') {
      setPurchaseOrder('');
    } else if (button === '{done}') {
      setShowKeyboard(false);
    } else if (button === '{bksp}') {
      setPurchaseOrder(prev => prev.slice(0, -1));
    } else if (button === '{space}') {
      setPurchaseOrder(prev => prev + ' ');
    } else {
      setPurchaseOrder(prev => prev + button);
    }
  };

  useEffect(() => {
    if (!includePO) {
      setShowKeyboard(false);
      setPurchaseOrder('');
    }
  }, [includePO]);

  useEffect(() => {
    if (showKeyboard && purchaseOrderInputRef.current) {
      // Scroll the input field into view when keyboard opens (for portrait orientation)
      setTimeout(() => {
        const input = purchaseOrderInputRef.current;
        if (input) {
          // Estimate keyboard height (approximately 350-400px in portrait)
          const keyboardHeight = 380;
          const viewportHeight = window.innerHeight;
          const availableHeight = viewportHeight - keyboardHeight;
          
          // Get the input's position
          const rect = input.getBoundingClientRect();
          const inputTop = rect.top + window.scrollY;
          const inputHeight = rect.height;
          
          // Calculate desired scroll position to center input in available space above keyboard
          const desiredScrollPosition = inputTop - (availableHeight / 2) + (inputHeight / 2);
          
          window.scrollTo({
            top: Math.max(0, desiredScrollPosition),
            behavior: 'smooth'
          });
        }
      }, 350); // Wait for keyboard animation to complete
    }
  }, [showKeyboard]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!position.trim()) {
      alert('Please select your position');
      return;
    }
    onSubmit({
      position: position.trim(),
      purchaseOrder: includePO ? purchaseOrder.trim() : undefined
    });
  };

  const renderKeyboard = () => {
    if (!showKeyboard || !includePO) return null;

    return (
      <div className="keyboard-overlay">
        <div className="keyboard-container" ref={keyboardContainerRef}>
          <div className="keyboard-header">
            <span>Enter Purchase Order Number</span>
            <button 
              className="keyboard-close"
              onClick={closeKeyboard}
            >
              ✕
            </button>
          </div>
          <div className="keyboard-input-display">
            {purchaseOrder || 'Enter purchase order number...'}
          </div>
          <div className="keyboard-wrapper">
            <Keyboard
              keyboardRef={r => (keyboardRef.current = r)}
              layout={{
                default: [
                  '1 2 3 4 5 6 7 8 9 0',
                  'q w e r t y u i o p',
                  'a s d f g h j k l',
                  'z x c v b n m',
                  '{space} {bksp} {done}'
                ]
              }}
              display={{
                '{done}': 'DONE',
                '{space}': 'SPACE',
                '{bksp}': '⌫'
              }}
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
        <div className="store-info">
          <h2>{storeData.storeName}</h2>
          {storeData.banner !== '-' && <p>{storeData.banner}</p>}
        </div>
      </div>

      <div className="order-content">
        <h1>Order Summary</h1>

        <div className="order-items-section">
          <h2>Items in Your Order</h2>
          {cartItems.map((item, index) => (
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
                      const dropMonths = item.dropMonths || Array(item.quantity).fill('March');
                      const currentDropMonth = dropMonths[unitIndex] || 'March';
                      return (
                        <div key={unitIndex} className="drop-month-selector">
                          <label className="drop-month-label">Unit {unitIndex + 1} Drop Month:</label>
                          <div className="drop-month-radio-group">
                            <label className="radio-option">
                              <input
                                type="radio"
                                name={`dropMonth-${index}-${unitIndex}`}
                                value="March"
                                checked={currentDropMonth === 'March'}
                                onChange={(e) => onUpdateDropMonth(index, unitIndex, e.target.value)}
                              />
                              <span>March</span>
                            </label>
                            <label className="radio-option">
                              <input
                                type="radio"
                                name={`dropMonth-${index}-${unitIndex}`}
                                value="May"
                                checked={currentDropMonth === 'May'}
                                onChange={(e) => onUpdateDropMonth(index, unitIndex, e.target.value)}
                              />
                              <span>May</span>
                            </label>
                            <label className="radio-option">
                              <input
                                type="radio"
                                name={`dropMonth-${index}-${unitIndex}`}
                                value="July"
                                checked={currentDropMonth === 'July'}
                                onChange={(e) => onUpdateDropMonth(index, unitIndex, e.target.value)}
                              />
                              <span>July</span>
                            </label>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                {item.quantity === 1 && (
                  <div className="drop-month-selector">
                    <label className="drop-month-label">Drop Month:</label>
                    <div className="drop-month-radio-group">
                      <label className="radio-option">
                        <input
                          type="radio"
                          name={`dropMonth-${index}`}
                          value="March"
                          checked={(item.dropMonths && item.dropMonths[0] === 'March') || (!item.dropMonths)}
                          onChange={(e) => onUpdateDropMonth(index, 0, e.target.value)}
                        />
                        <span>March</span>
                      </label>
                      <label className="radio-option">
                        <input
                          type="radio"
                          name={`dropMonth-${index}`}
                          value="May"
                          checked={item.dropMonths && item.dropMonths[0] === 'May'}
                          onChange={(e) => onUpdateDropMonth(index, 0, e.target.value)}
                        />
                        <span>May</span>
                      </label>
                      <label className="radio-option">
                        <input
                          type="radio"
                          name={`dropMonth-${index}`}
                          value="July"
                          checked={item.dropMonths && item.dropMonths[0] === 'July'}
                          onChange={(e) => onUpdateDropMonth(index, 0, e.target.value)}
                        />
                        <span>July</span>
                      </label>
                    </div>
                  </div>
                )}
              </div>
              <div className="item-controls">
                <div className="quantity-controls">
                  <button 
                    onClick={() => onUpdateQuantity(index, item.quantity - 1)}
                    className="qty-btn"
                  >-</button>
                  <span className="qty-display">{item.quantity}</span>
                  <button 
                    onClick={() => onUpdateQuantity(index, item.quantity + 1)}
                    className="qty-btn"
                  >+</button>
                </div>
                <div className="item-total">
                  ${(parseFloat(item.cost) * item.quantity).toFixed(2)}
                </div>
              </div>
            </div>
          ))}
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
              required
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
              <>
                <input
                  ref={purchaseOrderInputRef}
                  type="text"
                  value={purchaseOrder}
                  onChange={(e) => setPurchaseOrder(e.target.value)}
                  onFocus={handleInputFocus}
                  onBlur={handleInputBlur}
                  placeholder="Enter purchase order number"
                  className="form-input"
                  readOnly={showKeyboard}
                />
                <div className="input-hint">Tap to open keyboard</div>
              </>
            )}
          </div>

          <div className="form-actions">
            <button type="submit" className="submit-order-btn">
              Submit Order & Print Coupon
            </button>
          </div>
        </form>
      </div>
      {renderKeyboard()}
    </div>
  );
};

export default OrderSummary;

