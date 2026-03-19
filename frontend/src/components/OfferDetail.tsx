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
}

interface OfferDetailData {
  offerId: string;
  offerGroup: string;
  brand: string;
  range: string;
  hasTiers: boolean;
  tiers?: { [key: string]: OfferItem[] };
  items?: OfferItem[];
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
  
  // Energizer 30/24 packs - use card image
  if (offerKey.includes('energizer 1') || offerKey.includes('energizer 2') || offerKey.includes('energizer 3') || groupKey.includes('30/24 packs')) {
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
        setQuantities({ single: 0 });
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

    const items: { offerId: string; offerTier?: string; quantity: number; description: string; cost: string }[] = [];

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
      if (quantities.single > 0) {
        const totalCost = offerData.items.reduce((sum, item) => {
          return sum + (parseFloat(item['Expo Total Cost'] || '0') * quantities.single);
        }, 0);
        
        items.push({
          offerId: offerData.offerId,
          quantity: quantities.single,
          description: offerData.offerGroup,
          cost: totalCost.toFixed(2)
        });
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
        <button onClick={onBack} className="back-button">← Back to Offers</button>
      </div>
    );
  }

  const hasItemsInCart = Object.values(quantities).some(qty => qty > 0);

  return (
    <div className="offer-detail-container">
      <div className="offer-header">
        <button onClick={onBack} className="back-button">← Back</button>
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
              <div className="offer-items">
                {offerData.items.map((item, idx) => (
                  <div key={idx} className="item-row">
                    <span className="item-description">{item.Description}</span>
                    {item.Qty && <span className="item-qty">Qty: {item.Qty}</span>}
                  </div>
                ))}
              </div>

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
          brand={offerData.brand}
          onClose={() => setShowLearnMore(false)}
        />
      )}
    </div>
  );
};

export default OfferDetail;

