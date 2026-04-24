import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './OfferDetail.css';
import LearnMoreModal from './LearnMoreModal';
import { apiUrl } from '../api';

interface OfferItem {
  OFFER: string;
  'Offer Group': string;
  'Offer Tier': string;
  Description: string;
  Save: string;
  '$ GM': string;
  '% GM': string;
  Qty: string;
  'Expo Total Cost': string;
  Brand: string;
  // enriched fields from groupOffersRows
  metcashCode?: string;
  qty?: string;
  rrp?: string;
  expoPrice?: string;
  normalCost?: string;
  discount?: string;
  margin?: string;
  offerCode?: string;
  offerName?: string;
  sku?: string;
  baseQty?: number;
  cartonQty?: number;
  totalUnitCost?: number;
  expoTotalCostValue?: number;
  lineUnitExpoCost?: number;
  offerMode?: string;
  minBundleQty?: number;
  allowLineIncrease?: boolean;
  selectionRule?: string;
  minSelections?: number;
  maxSelections?: number;
  sortOrder?: number;
}

interface OfferRules {
  offerMode?: string;
  minBundleQty?: number;
  allowLineIncrease?: boolean;
  selectionRule?: string;
  minSelections?: number;
  maxSelections?: number;
}

interface OfferDetailData {
  offerId: string;
  offerGroup: string;
  brand: string;
  range: string;
  hasTiers: boolean;
  tiers?: { [key: string]: OfferItem[] };
  items?: OfferItem[];
  rules?: OfferRules;
}

interface OfferDetailProps {
  offerId: string;
  userData: { fullName: string; storeNo: string; position: string };
  storeData: { storeName: string; banner: string };
  onBack: () => void;
  onAddToCart: (items: { offerId: string; offerTier?: string; quantity: number; description: string; cost: string }[]) => void;
}

// Helper function to get product images for each offer - matching card images
const getOfferImages = (offerId: string, offerGroup: string): string[] => {
  const offerKey = offerId.toLowerCase();
  const groupKey = offerGroup.toLowerCase();
  
  // Eveready Offer (Heavy Duty 50) - use card image
  if (offerKey.includes('eveready 1') || offerKey.includes('eveready 2') || offerKey.includes('eveready 3') || groupKey.includes('eveready heavy duty')) {
    return ['/products/hd50.png'];
  }
  
  // Energizer 16/14 packs - use card image
  if (offerKey.includes('energizer 4') || offerKey.includes('energizer 5') || offerKey.includes('energizer 6') || groupKey.includes('16/14 packs')) {
    return ['/products/1614.png'];
  }
  
  // Energizer 30/24 packs - use card image (Energizer 1 = penta)
  if (offerKey.includes('energizer 1')) {
    return ['/products/penta.png'];
  }
  if (offerKey.includes('energizer 2') || offerKey.includes('energizer 3') || groupKey.includes('30/24 packs')) {
    return ['/products/3024.png'];
  }
  
  // ArmorAll Wash - use card image
  if (offerKey.includes('armorall 1') || offerKey.includes('armorall 2') || offerKey.includes('armorall 3') || groupKey.includes('armor all wash')) {
    return ['/products/wash.png'];
  }
  
  // Energizer Display Prepack (MAX MOD) - use card image
  if (offerKey.includes('energizer 7') || groupKey.includes('max mod bin display')) {
    return ['/products/maxmod.png'];
  }
  
  // Energizer Headlight Range - use card image
  if (offerKey.includes('energizer 8') || groupKey.includes('headlight range')) {
    return ['/products/hl.png'];
  }
  
  // ArmorAll SLR Range - use card image
  if (offerKey.includes('armorall 4') || groupKey.includes('slr range')) {
    return ['/products/slr.png'];
  }
  
  // Auto Fragrance Deal - use card image
  if (offerKey.includes('armorall 5') || groupKey.includes('auto fragrance')) {
    return ['/products/fragrances.png'];
  }
  
  // Energizer Lights Range (Dolphin) - use card image
  if (offerKey.includes('energizer 9') || groupKey.includes('lights range')) {
    return ['/products/torch.png'];
  }
  
  return [];
};

const OfferDetail: React.FC<OfferDetailProps> = ({ offerId, userData, storeData, onBack, onAddToCart }) => {
  const [offerData, setOfferData] = useState<OfferDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showLearnMore, setShowLearnMore] = useState(false);
  const [quantities, setQuantities] = useState<{ [key: string]: number }>({});
  const [bundleQuantity, setBundleQuantity] = useState(1);
  const [lineQuantities, setLineQuantities] = useState<{ [key: string]: number }>({});

  useEffect(() => {
    fetchOfferDetails();
  }, [offerId]);

  const fetchOfferDetails = async () => {
    try {
      setLoading(true);
      const response = await axios.get(apiUrl(`/api/offers/${offerId}`));
      setOfferData(response.data);
      setError('');
      
      // Initialize quantities
      if (response.data.hasTiers && response.data.tiers) {
        const initialQuantities: { [key: string]: number } = {};
        Object.keys(response.data.tiers).forEach(tier => {
          initialQuantities[tier] = 0;
        });
        setQuantities(initialQuantities);
      } else if (response.data.items) {
        setQuantities({ single: 1 });
        const mode = String(response.data?.rules?.offerMode || '').toUpperCase();
        const minBundle = Math.max(1, Number(response.data?.rules?.minBundleQty) || 1);
        setBundleQuantity(minBundle);
        const initialLineQuantities: { [key: string]: number } = {};
        response.data.items.forEach((item: OfferItem, idx: number) => {
          const base = Math.max(0, Number(item.baseQty ?? item.qty ?? item.Qty ?? 0) || 0);
          initialLineQuantities[`line-${idx}`] = base;
        });
        if (mode === 'SPLIT') setLineQuantities(initialLineQuantities);
        else setLineQuantities({});
      }
    } catch (err) {
      console.error('Error fetching offer details:', err);
      setError('Failed to load offer details. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuantityChange = (key: string, value: number) => {
    setQuantities(prev => ({
      ...prev,
      [key]: Math.max(0, value)
    }));
  };

  const handleAddToCart = () => {
    if (!offerData) return;

    const items: {
      offerId: string;
      offerTier?: string;
      quantity: number;
      description: string;
      cost: string;
      minQuantity?: number;
      lockQuantity?: boolean;
    }[] = [];

    if (offerData.hasTiers && offerData.tiers) {
      Object.keys(quantities).forEach(tier => {
        if (quantities[tier] > 0 && offerData.tiers![tier]) {
          const tierItems = offerData.tiers![tier];
          const totalCost = tierItems.reduce((sum, item) => {
            return sum + (parseFloat(item['Expo Total Cost'] || '0') * quantities[tier]);
          }, 0);
          
          items.push({
            offerId: offerData.offerId,
            offerTier: tier,
            quantity: quantities[tier],
            description: `${offerData.offerGroup} - ${tier}`,
            cost: totalCost.toFixed(2)
          });
        }
      });
    } else if (offerData.items) {
      const mode = String(offerData.rules?.offerMode || '').toUpperCase();
      const minBundle = Math.max(1, Number(offerData.rules?.minBundleQty) || 1);
      const allowLineIncrease = !!offerData.rules?.allowLineIncrease;

      if (mode === 'FIXED' || (mode === 'SPLIT' && !allowLineIncrease)) {
        const safeBundleQty = Math.max(minBundle, bundleQuantity);
        offerData.items.forEach((item, idx) => {
          const baseQty = Math.max(0, Number(item.baseQty ?? item.qty ?? item.Qty ?? 0) || 0);
          const quantity = baseQty * safeBundleQty;
          if (quantity <= 0) return;
          const unitCostFromCsv = Number(item.lineUnitExpoCost ?? 0);
          const fallbackExpoTotal = parseFloat(String(item['Expo Total Cost'] || '0')) || 0;
          const unitCost = unitCostFromCsv > 0 ? unitCostFromCsv : (baseQty > 0 ? fallbackExpoTotal / baseQty : fallbackExpoTotal);
          items.push({
            offerId: offerData.offerId,
            quantity,
            description: `${item.Description || 'SKU'} (${item.sku || item.metcashCode || idx + 1})`,
            cost: unitCost.toFixed(2),
            minQuantity: quantity,
            lockQuantity: true,
          });
        });
      } else if (mode === 'SPLIT') {
        offerData.items.forEach((item, idx) => {
          const key = `line-${idx}`;
          const baseQty = Math.max(0, Number(item.baseQty ?? item.qty ?? item.Qty ?? 0) || 0);
          const quantity = Math.max(baseQty, Number(lineQuantities[key] ?? baseQty));
          if (quantity <= 0) return;
          const unitCostFromCsv = Number(item.lineUnitExpoCost ?? 0);
          const fallbackExpoTotal = parseFloat(String(item['Expo Total Cost'] || '0')) || 0;
          const unitCost = unitCostFromCsv > 0 ? unitCostFromCsv : (baseQty > 0 ? fallbackExpoTotal / baseQty : fallbackExpoTotal);
          items.push({
            offerId: offerData.offerId,
            quantity,
            description: `${item.Description || 'SKU'} (${item.sku || item.metcashCode || idx + 1})`,
            cost: unitCost.toFixed(2),
            minQuantity: baseQty,
            lockQuantity: false,
          });
        });
      } else {
        if (quantities.single > 0) {
          const totalCost = offerData.items.reduce((sum, item) => {
            return sum + (parseFloat(String(item['Expo Total Cost'] || '0')) * quantities.single);
          }, 0);
          items.push({
            offerId: offerData.offerId,
            quantity: quantities.single,
            description: offerData.offerGroup,
            cost: totalCost.toFixed(2)
          });
        }
      }
    }

    if (items.length > 0) {
      onAddToCart(items);
    }
  };

  if (loading) {
    return (
      <div className="offer-detail-container">
        <div className="loading-message">Loading offer details...</div>
      </div>
    );
  }

  if (error || !offerData) {
    return (
      <div className="offer-detail-container">
        <div className="error-message">{error || 'Offer not found'}</div>
      </div>
    );
  }

  const mode = String(offerData.rules?.offerMode || '').toUpperCase();
  const minBundleQty = Math.max(1, Number(offerData.rules?.minBundleQty) || 1);
  const allowLineIncrease = !!offerData.rules?.allowLineIncrease;
  const isFixedMode = mode === 'FIXED' || (mode === 'SPLIT' && !allowLineIncrease);
  const isSplitMode = mode === 'SPLIT' && allowLineIncrease;

  const hasItemsInCart = offerData.items
    ? isFixedMode
      ? bundleQuantity >= minBundleQty
      : isSplitMode
        ? offerData.items.some((item, idx) => {
            const base = Math.max(0, Number(item.baseQty ?? item.qty ?? item.Qty ?? 0) || 0);
            return Math.max(base, Number(lineQuantities[`line-${idx}`] ?? base)) > 0;
          })
        : Object.values(quantities).some(qty => qty > 0)
    : Object.values(quantities).some(qty => qty > 0);

  return (
    <div className="offer-detail-container">
      <div className="offer-header">
        <div className="store-info">
          <h2>{storeData.storeName}</h2>
          {storeData.banner !== '-' && <p>{storeData.banner}</p>}
        </div>
      </div>

      <div className="offer-detail-content">
        <div className="offer-title-section">
          <div className="offer-brand">{offerData.brand}</div>
          <h1>{offerData.offerGroup}</h1>
          <button 
            onClick={() => setShowLearnMore(true)}
            className="learn-more-btn"
          >
            Learn More
          </button>
        </div>

        {/* Product Images */}
        {(() => {
          const images = getOfferImages(offerData.offerId, offerData.offerGroup);
          if (images.length > 0) {
            return (
              <div className="offer-images-section">
                {images.map((imagePath, idx) => (
                  <img 
                    key={idx} 
                    src={imagePath} 
                    alt={`Product ${idx + 1}`}
                    className="offer-product-image"
                  />
                ))}
              </div>
            );
          }
          return null;
        })()}

        {offerData.hasTiers && offerData.tiers ? (
          <div className="tiers-container">
            {Object.keys(offerData.tiers).map(tier => {
              const tierItems = offerData.tiers![tier];
              const firstItem = tierItems[0];
              const saveValue = firstItem?.Save || '';
              const gmPercent = firstItem?.['% GM'] || '';
              
              return (
                <div key={tier} className="tier-card">
                  <div className="tier-header">
                    <h2>{tier}</h2>
                    {saveValue && (
                      <div className="tier-benefits">
                        <div className="benefit-item">
                          <span className="benefit-label">Save:</span>
                          <span className="benefit-value">{saveValue}</span>
                        </div>
                        {gmPercent && (
                          <div className="benefit-item">
                            <span className="benefit-label">GM Boost:</span>
                            <span className="benefit-value">{gmPercent}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <div className="tier-items">
                    {tierItems.map((item, idx) => (
                      <div key={idx} className="item-row">
                        <span className="item-description">{item.Description}</span>
                        <span className="item-qty">Qty: {item.Qty}</span>
                      </div>
                    ))}
                  </div>

                  <div className="tier-quantity">
                    <label>Quantity:</label>
                    <div className="quantity-controls">
                      <button 
                        onClick={() => handleQuantityChange(tier, quantities[tier] - 1)}
                        className="qty-btn"
                      >-</button>
                      <input
                        type="number"
                        value={quantities[tier] || 0}
                        onChange={(e) => handleQuantityChange(tier, parseInt(e.target.value) || 0)}
                        min="0"
                        className="qty-input"
                      />
                      <button 
                        onClick={() => handleQuantityChange(tier, quantities[tier] + 1)}
                        className="qty-btn"
                      >+</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : offerData.items ? (
          <div className="single-offer-container">
            <div className="offer-card">
              {isFixedMode ? (
                <div className="offer-mode-banner">
                  <h3>Bundle quantity</h3>
                  <p>This offer is sold as a fixed bundle.</p>
                  <div className="quantity-controls">
                    <button
                      onClick={() => setBundleQuantity((q) => Math.max(minBundleQty, q - 1))}
                      className="qty-btn"
                    >-</button>
                    <input
                      type="number"
                      value={bundleQuantity}
                      onChange={(e) => setBundleQuantity(Math.max(minBundleQty, parseInt(e.target.value) || minBundleQty))}
                      min={minBundleQty}
                      className="qty-input"
                    />
                    <button
                      onClick={() => setBundleQuantity((q) => q + 1)}
                      className="qty-btn"
                    >+</button>
                  </div>
                </div>
              ) : isSplitMode ? (
                <div className="offer-mode-banner">
                  <h3>Adjust carton quantities</h3>
                  <p>Minimum quantities are pre-loaded. You can increase individual lines.</p>
                </div>
              ) : null}
              <div className="offer-items">
                {offerData.items.map((item, idx) => (
                  <div key={idx} className="item-row">
                    <div className="item-row-main">
                      <span className="item-description">{item.Description}</span>
                      {item.metcashCode && <span className="item-code">#{item.metcashCode}</span>}
                    </div>
                    <div className="item-row-meta">
                      {isFixedMode ? (
                        <span className="item-meta-pill">Qty: <strong>{Math.max(0, Number(item.baseQty ?? item.qty ?? item.Qty ?? 0) || 0) * bundleQuantity}</strong></span>
                      ) : (
                        item.qty && <span className="item-meta-pill">Prepack: <strong>{item.qty}</strong></span>
                      )}
                      {item.rrp      && <span className="item-meta-pill">RRP: <strong>${item.rrp}</strong></span>}
                      {item.expoPrice && <span className="item-meta-pill deal">Expo: <strong>${item.expoPrice}</strong></span>}
                      {item.discount && <span className="item-meta-pill discount">Save: <strong>{item.discount}</strong></span>}
                      {item.margin   && <span className="item-meta-pill margin">Margin: <strong>{item.margin}</strong></span>}
                    </div>
                    {isSplitMode && (
                      <div className="line-quantity-controls">
                        <span className="line-qty-label">Line qty</span>
                        <div className="quantity-controls">
                          <button
                            onClick={() =>
                              setLineQuantities((prev) => {
                                const key = `line-${idx}`;
                                const base = Math.max(0, Number(item.baseQty ?? item.qty ?? item.Qty ?? 0) || 0);
                                const current = Number(prev[key] ?? base);
                                return { ...prev, [key]: Math.max(base, current - 1) };
                              })
                            }
                            className="qty-btn"
                          >-</button>
                          <input
                            type="number"
                            className="qty-input"
                            min={Math.max(0, Number(item.baseQty ?? item.qty ?? item.Qty ?? 0) || 0)}
                            value={Number(lineQuantities[`line-${idx}`] ?? Math.max(0, Number(item.baseQty ?? item.qty ?? item.Qty ?? 0) || 0))}
                            onChange={(e) =>
                              setLineQuantities((prev) => {
                                const key = `line-${idx}`;
                                const base = Math.max(0, Number(item.baseQty ?? item.qty ?? item.Qty ?? 0) || 0);
                                return { ...prev, [key]: Math.max(base, parseInt(e.target.value) || base) };
                              })
                            }
                          />
                          <button
                            onClick={() =>
                              setLineQuantities((prev) => {
                                const key = `line-${idx}`;
                                const base = Math.max(0, Number(item.baseQty ?? item.qty ?? item.Qty ?? 0) || 0);
                                const current = Number(prev[key] ?? base);
                                return { ...prev, [key]: current + 1 };
                              })
                            }
                            className="qty-btn"
                          >+</button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {!isFixedMode && !isSplitMode && (
              <div className="offer-quantity">
                <label>Quantity:</label>
                <div className="quantity-controls">
                  <button 
                    onClick={() => handleQuantityChange('single', quantities.single - 1)}
                    className="qty-btn"
                  >-</button>
                  <input
                    type="number"
                    value={quantities.single || 0}
                    onChange={(e) => handleQuantityChange('single', parseInt(e.target.value) || 0)}
                    min="0"
                    className="qty-input"
                  />
                  <button 
                    onClick={() => handleQuantityChange('single', quantities.single + 1)}
                    className="qty-btn"
                  >+</button>
                </div>
              </div>
              )}
            </div>
          </div>
        ) : null}

        <div className="offer-actions">
          <button 
            onClick={handleAddToCart}
            className={`add-to-cart-btn ${hasItemsInCart ? 'has-items' : ''}`}
            disabled={!hasItemsInCart}
          >
            Add to Cart
          </button>
        </div>
      </div>

      {showLearnMore && (
        <LearnMoreModal
          offerId={offerId}
          offerGroup={offerData.offerGroup}
          onClose={() => setShowLearnMore(false)}
        />
      )}
    </div>
  );
};

export default OfferDetail;

