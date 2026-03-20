import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './OffersListing.css';
import OfferDetailModal from './OfferDetailModal';
import { apiUrl } from '../api';

interface DescriptionItem {
  description: string;
  qty: string;
}

interface Offer {
  offerId: string;
  offerGroup: string;
  brand: string;
  range: string;
  minOrderValue: string;
  save: string;
  totalCost: string;
  offerTier: string;
  descriptions: DescriptionItem[];
  expoChargeBackCost: string;
}

const normalizeOffers = (data: any): Offer[] => {
  if (!Array.isArray(data)) return [];
  return data
    .filter((item: any) => item && typeof item === 'object')
    .map((item: any) => ({
      offerId: String(item.offerId || ''),
      offerGroup: String(item.offerGroup || ''),
      brand: String(item.brand || ''),
      range: String(item.range || ''),
      minOrderValue: String(item.minOrderValue || ''),
      save: String(item.save || ''),
      totalCost: String(item.totalCost || ''),
      offerTier: String(item.offerTier || ''),
      descriptions: Array.isArray(item.descriptions) ? item.descriptions : [],
      expoChargeBackCost: String(item.expoChargeBackCost || ''),
    }))
    .filter((offer: Offer) => offer.offerId.length > 0);
};

interface BrandGroup {
  brand: string;
  offers: Offer[];
  isPallet: boolean;
}

interface CartItem {
  offerId: string;
  offerTier?: string;
  quantity: number;
  description: string;
  cost: string;
  dropMonth?: string;
}

interface OffersListingProps {
  userData: { fullName: string; storeNo: string; position: string };
  storeData: { storeName: string; banner: string };
  onSelectOffer: (offerId: string) => void;
  onBack: () => void;
  onGoToCart: () => void;
  cartItemCount: number;
  cartItems: CartItem[];
  onAddToCart: (items: CartItem[]) => void;
  onUpdateCartQuantity?: (offerId: string, quantity: number, offerTier?: string) => void;
  onViewPresentation?: () => void;
}

const OffersListing: React.FC<OffersListingProps> = ({ userData, storeData, onSelectOffer, onBack, onGoToCart, cartItemCount, cartItems, onAddToCart, onUpdateCartQuantity, onViewPresentation }) => {
  const [brandGroups, setBrandGroups] = useState<BrandGroup[]>([]);
  const [batteryDisplayOffers, setBatteryDisplayOffers] = useState<Offer[]>([]);
  const [lightingOffers, setLightingOffers] = useState<Offer[]>([]);
  const [carCareOffers, setCarCareOffers] = useState<Offer[]>([]);
  const [fragrancesOffers, setFragrancesOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [quantities, setQuantities] = useState<{ [offerId: string]: number }>({});
  const [selectedOfferForModal, setSelectedOfferForModal] = useState<string | null>(null);

  const getBrandLogo = (brand: string): string => {
    const brandLower = brand.toLowerCase();
    if (brandLower.includes('eveready')) {
      return '/products/eready.png';
    } else if (brandLower.includes('energizer')) {
      return '/products/energizer.png';
    } else if (brandLower.includes('armor')) {
      return '/products/aall.png';
    }
    return '';
  };

  const getOfferCardImage = (offerId: string): string | null => {
    const offerKey = offerId.toLowerCase();
    // Map offer IDs to their card images
    if (offerKey === 'energizer 7') {
      return '/products/maxmod.png';
    } else if (offerKey === 'energizer 8') {
      return '/products/hl.png';
    } else if (offerKey === 'energizer 9') {
      return '/products/torch.png';
    } else if (offerKey === 'armorall 1' || offerKey === 'armorall 2' || offerKey === 'armorall 3') {
      return '/products/wash.png';
    } else if (offerKey === 'armorall 4') {
      return '/products/slr.png';
    } else if (offerKey === 'armorall 5') {
      return '/products/fragrances.png';
    } else if (offerKey === 'energizer 1' || offerKey === 'energizer 2' || offerKey === 'energizer 3') {
      return '/products/3024.png';
    } else if (offerKey === 'energizer 4' || offerKey === 'energizer 5' || offerKey === 'energizer 6') {
      return '/products/1614.png';
    } else if (offerKey === 'eveready 1' || offerKey === 'eveready 2' || offerKey === 'eveready 3') {
      return '/products/hd50.png';
    }
    // Add more mappings here as needed
    return null;
  };

  useEffect(() => {
    fetchOffers();
  }, []);

  const fetchOffers = async () => {
    try {
      setLoading(true);
      const response = await axios.get(apiUrl('/api/offers'));
      const allOffers: Offer[] = normalizeOffers(response.data);
      if (allOffers.length === 0) {
        throw new Error('Offers payload empty or invalid');
      }

      // Non-pallet offers (display first): Energizer 7, 8, 9, ArmorAll 4, 5
      const nonPalletOffers = allOffers.filter(o => 
        o.offerId === 'Energizer 7' || 
        o.offerId === 'Energizer 8' || 
        o.offerId === 'Energizer 9' ||
        o.offerId === 'ArmorAll 4' ||
        o.offerId === 'ArmorAll 5'
      );

      // Pallet offers: Energizer 1-6, Eveready 1-3, ArmorAll 1-3
      const energizerPallet = allOffers.filter(o => /^(Energizer [1-6])$/.test(o.offerId));
      const evereadyPallet = allOffers.filter(o => /^Eveready [123]$/.test(o.offerId));
      const armorAllPallet = allOffers.filter(o => /^ArmorAll [123]$/.test(o.offerId));

      // Sort non-pallet offers: Energizer 7, 8, 9, ArmorAll 4, 5
      const sortedNonPallet = nonPalletOffers.sort((a, b) => {
        const order = ['Energizer 7', 'Energizer 8', 'Energizer 9', 'ArmorAll 4', 'ArmorAll 5'];
        return order.indexOf(a.offerId) - order.indexOf(b.offerId);
      });

      // Group non-pallet offers for display
      const energizer7 = sortedNonPallet.filter(o => o.offerId === 'Energizer 7');
      const energizer8 = sortedNonPallet.filter(o => o.offerId === 'Energizer 8');
      const energizer9 = sortedNonPallet.filter(o => o.offerId === 'Energizer 9');
      const armorAll4 = sortedNonPallet.filter(o => o.offerId === 'ArmorAll 4');
      const armorAll5 = sortedNonPallet.filter(o => o.offerId === 'ArmorAll 5');

      // Sort pallet offers: Energizer 1-5, Eveready 1-3, ArmorAll 1-3
      const sortedEnergizerPallet = energizerPallet.sort((a, b) => {
        const numA = parseInt(a.offerId.match(/\d+/)?.[0] || '0');
        const numB = parseInt(b.offerId.match(/\d+/)?.[0] || '0');
        return numA - numB;
      });
      const sortedEvereadyPallet = evereadyPallet.sort((a, b) => {
        const numA = parseInt(a.offerId.match(/\d+/)?.[0] || '0');
        const numB = parseInt(b.offerId.match(/\d+/)?.[0] || '0');
        return numA - numB;
      });
      const sortedArmorAllPallet = armorAllPallet.sort((a, b) => {
        const numA = parseInt(a.offerId.match(/\d+/)?.[0] || '0');
        const numB = parseInt(b.offerId.match(/\d+/)?.[0] || '0');
        return numA - numB;
      });

      const groups: BrandGroup[] = [];
      
      // Add pallet groups in order: Energizer, Eveready, ArmorAll
      if (sortedEnergizerPallet.length > 0) {
        groups.push({ 
          brand: 'Energizer', 
          offers: sortedEnergizerPallet, 
          isPallet: true 
        });
      }
      if (sortedEvereadyPallet.length > 0) {
        groups.push({ 
          brand: 'Eveready', 
          offers: sortedEvereadyPallet, 
          isPallet: true 
        });
      }
      if (sortedArmorAllPallet.length > 0) {
        groups.push({ 
          brand: 'Armor All', 
          offers: sortedArmorAllPallet, 
          isPallet: true 
        });
      }

      setBrandGroups(groups);
      
      // Set non-pallet offers for display
      setBatteryDisplayOffers(energizer7);
      setLightingOffers([...energizer8, ...energizer9]);
      setCarCareOffers(armorAll4);
      setFragrancesOffers(armorAll5);
      setError('');
    } catch (err) {
      // Retry once against same-origin in case a stale build/env still points elsewhere.
      try {
        const fallbackBase =
          typeof window !== 'undefined' ? window.location.origin.replace(/\/$/, '') : '';
        const fallbackUrl = `${fallbackBase}/api/offers`;
        const response = await axios.get(fallbackUrl);
        const allOffers: Offer[] = normalizeOffers(response.data);
        if (allOffers.length === 0) throw new Error('Fallback offers payload empty');

        const nonPalletOffers = allOffers.filter(o =>
          o.offerId === 'Energizer 7' ||
          o.offerId === 'Energizer 8' ||
          o.offerId === 'Energizer 9' ||
          o.offerId === 'ArmorAll 4' ||
          o.offerId === 'ArmorAll 5'
        );
        const energizerPallet = allOffers.filter(o => /^(Energizer [1-6])$/.test(o.offerId));
        const evereadyPallet = allOffers.filter(o => /^Eveready [123]$/.test(o.offerId));
        const armorAllPallet = allOffers.filter(o => /^ArmorAll [123]$/.test(o.offerId));

        const sortedNonPallet = nonPalletOffers.sort((a, b) => {
          const order = ['Energizer 7', 'Energizer 8', 'Energizer 9', 'ArmorAll 4', 'ArmorAll 5'];
          return order.indexOf(a.offerId) - order.indexOf(b.offerId);
        });
        const sortedEnergizerPallet = energizerPallet.sort((a, b) => parseInt(a.offerId.match(/\d+/)?.[0] || '0') - parseInt(b.offerId.match(/\d+/)?.[0] || '0'));
        const sortedEvereadyPallet = evereadyPallet.sort((a, b) => parseInt(a.offerId.match(/\d+/)?.[0] || '0') - parseInt(b.offerId.match(/\d+/)?.[0] || '0'));
        const sortedArmorAllPallet = armorAllPallet.sort((a, b) => parseInt(a.offerId.match(/\d+/)?.[0] || '0') - parseInt(b.offerId.match(/\d+/)?.[0] || '0'));

        const groups: BrandGroup[] = [];
        if (sortedEnergizerPallet.length > 0) groups.push({ brand: 'Energizer', offers: sortedEnergizerPallet, isPallet: true });
        if (sortedEvereadyPallet.length > 0) groups.push({ brand: 'Eveready', offers: sortedEvereadyPallet, isPallet: true });
        if (sortedArmorAllPallet.length > 0) groups.push({ brand: 'Armor All', offers: sortedArmorAllPallet, isPallet: true });

        setBrandGroups(groups);
        setBatteryDisplayOffers(sortedNonPallet.filter(o => o.offerId === 'Energizer 7'));
        setLightingOffers(sortedNonPallet.filter(o => o.offerId === 'Energizer 8' || o.offerId === 'Energizer 9'));
        setCarCareOffers(sortedNonPallet.filter(o => o.offerId === 'ArmorAll 4'));
        setFragrancesOffers(sortedNonPallet.filter(o => o.offerId === 'ArmorAll 5'));
        setError('');
      } catch (retryErr) {
        console.error('Error fetching offers:', err, retryErr);
        setError('Failed to load offers. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const formatTotalCost = (cost: string): string => {
    if (!cost || cost === '-' || cost.trim() === '') return 'N/A';
    const num = parseFloat(cost);
    return isNaN(num) ? cost : `$${num.toFixed(2)}`;
  };

  const getOrderedQuantity = (offerId: string): number => {
    return cartItems
      .filter(item => item.offerId === offerId)
      .reduce((sum, item) => sum + item.quantity, 0);
  };

  const handleQuantityChange = (offerId: string, delta: number, offer: Offer) => {
    const orderedQuantity = getOrderedQuantity(offerId);
    const newQuantity = Math.max(0, orderedQuantity + delta);
    
    if (newQuantity === 0 && onUpdateCartQuantity) {
      // Remove from cart
      onUpdateCartQuantity(offerId, 0, offer.offerTier !== 'Range Offer' ? offer.offerTier : undefined);
    } else if (onUpdateCartQuantity && orderedQuantity > 0) {
      // Item is already in cart, update cart directly
      onUpdateCartQuantity(offerId, newQuantity, offer.offerTier !== 'Range Offer' ? offer.offerTier : undefined);
    } else if (newQuantity > 0) {
      // Item not in cart, add to cart
      const costPerUnit = parseFloat(offer.expoChargeBackCost) || 0;
      onAddToCart([{
        offerId: offerId,
        offerTier: offer.offerTier !== 'Range Offer' ? offer.offerTier : undefined,
        quantity: newQuantity,
        description: offer.offerGroup,
        cost: costPerUnit.toFixed(2)
      }]);
    }
  };

  const handleAddToCart = (offer: Offer) => {
    const quantity = quantities[offer.offerId] || 0;
    if (quantity <= 0) return;

    const costPerUnit = parseFloat(offer.expoChargeBackCost) || 0;

    onAddToCart([{
      offerId: offer.offerId,
      offerTier: offer.offerTier !== 'Range Offer' ? offer.offerTier : undefined,
      quantity: quantity,
      description: offer.offerGroup,
      cost: costPerUnit.toFixed(2)
    }]);

    // Reset quantity after adding
    setQuantities(prev => ({ ...prev, [offer.offerId]: 0 }));
  };

  const handleViewDetails = (offerId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedOfferForModal(offerId);
  };

  const scrollToSection = (sectionName: string) => {
    let elementId = '';

    if (sectionName === 'Pallet Offers') {
      elementId = 'section-energizer';
    } else {
      elementId = `section-${sectionName.toLowerCase().replace(/\s+/g, '-')}`;
    }

    const element = document.getElementById(elementId);
    if (!element) return;

    element.scrollIntoView({ behavior: 'smooth', block: 'start' });

    // After vertical scroll, align horizontal carousel to the first card (tablet swipe rows)
    window.setTimeout(() => {
      const row = element.querySelector<HTMLElement>('.offers-grid');
      const firstCard = row?.firstElementChild as HTMLElement | undefined;
      if (row && firstCard) {
        firstCard.scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' });
      }
    }, 380);
  };

  if (loading) {
    return (
      <div className="offers-listing-container">
        <div className="loading-message">Loading offers...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="offers-listing-container">
        <div className="error-message">{error}</div>
        <button type="button" onClick={() => { setError(''); fetchOffers(); }} className="nav-btn next-btn" style={{ marginTop: '1rem' }}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="offers-listing-container">
      <div className="offers-header">
        <button onClick={onBack} className="back-button">‹</button>
        <div className="store-info-container">
          <div className="store-info">
            <h2>{storeData.storeName}</h2>
            {storeData.banner !== '-' && <p>{storeData.banner}</p>}
          </div>
          <div className="offers-navigation">
          {batteryDisplayOffers.length > 0 && (
            <button onClick={() => scrollToSection('Battery Display')} className="nav-button">Pre Pack</button>
          )}
          {lightingOffers.length > 0 && (
            <button onClick={() => scrollToSection('Lighting')} className="nav-button">Lighting</button>
          )}
          {carCareOffers.length > 0 && (
            <button onClick={() => scrollToSection('Car Care')} className="nav-button">Car Care</button>
          )}
          {fragrancesOffers.length > 0 && (
            <button onClick={() => scrollToSection('Fragrances')} className="nav-button">Fragrances</button>
          )}
          {brandGroups.length > 0 && (
            <button onClick={() => scrollToSection('Pallet Offers')} className="nav-button">Pallet Offers</button>
          )}
          </div>
        </div>
        <button 
          onClick={onGoToCart} 
          className={`next-button ${cartItemCount > 0 ? 'has-items' : ''}`}
        >
          {cartItemCount > 0 ? `Cart (${cartItemCount})` : '›'}
        </button>
      </div>

      <div className="offers-content">

        {/* ── Story Presentation entry point ─────────────────────────── */}
        {onViewPresentation && (
          <div className="story-entry-banner" onClick={onViewPresentation}>
            <div className="story-entry-left">
              <div className="story-entry-icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
              </div>
              <div className="story-entry-text">
                <span className="story-entry-label">CATEGORY INSIGHT</span>
                <span className="story-entry-title">View Story Presentation</span>
                <span className="story-entry-sub">Energizer Christmas opportunity — 5 scenes</span>
              </div>
            </div>
            <div className="story-entry-arrow">›</div>
          </div>
        )}

        {/* Battery Display Offers (Energizer 7) */}
        {batteryDisplayOffers.length > 0 && (
          <div id="section-battery-display" className="individual-offers-section">
            <h2 className="brand-group-title">Battery Display</h2>
            <div className="offers-grid">
              {batteryDisplayOffers.map((offer) => {
                const brandLogo = getBrandLogo(offer.brand);
                const quantity = quantities[offer.offerId] || 0;
                const orderedQuantity = getOrderedQuantity(offer.offerId);
                return (
                  <div
                    key={offer.offerId}
                    className="offer-card"
                  >
                    <div className="offer-card-top">
                      {brandLogo && (
                        <img src={brandLogo} alt={`${offer.brand} Logo`} className={`offer-brand-logo ${offer.brand.toLowerCase().includes('armor') ? 'armor-logo' : ''}`} />
                      )}
                      <div className="offer-group">{offer.offerGroup}</div>
                    </div>
                    {offer.offerId === 'Energizer 7' ? (
                      <div className="offer-tier-badge tier-display-component">Display Pre-Pack</div>
                    ) : (
                      offer.offerTier && offer.offerTier !== 'Range Offer' && (
                        <div className={`offer-tier-badge tier-${offer.offerTier.toLowerCase().replace(/\s+/g, '-').replace(/\//g, '-')}`}>{offer.offerTier}</div>
                      )
                    )}
                    {getOfferCardImage(offer.offerId) && (
                      <div className="offer-product-image-container">
                        <img src={getOfferCardImage(offer.offerId)!} alt={`${offer.offerGroup} Product`} className="offer-product-image" />
                      </div>
                    )}
                    {offer.descriptions && offer.descriptions.length > 0 && (
                      <table className="offer-descriptions-table">
                        <tbody>
                          {offer.descriptions.map((item, idx) => (
                            <tr key={idx}>
                              <td>{typeof item === 'string' ? item : item.description}</td>
                              <td>Qty: {typeof item === 'string' ? '' : item.qty}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                    {offer.save && (
                      <div className="offer-save">Save: {offer.save}</div>
                    )}
                    <div className="offer-highlights">
                      {offer.expoChargeBackCost && offer.expoChargeBackCost !== '-' && (
                        <div className="offer-cost">
                          <span className="highlight-label">Expo Charge Back:</span>
                          <span className="highlight-value">{formatTotalCost(offer.expoChargeBackCost)}</span>
                        </div>
                      )}
                    </div>
                    <div className={`offer-quantity-controls ${orderedQuantity > 0 ? 'ordered' : ''}`}>
                      {orderedQuantity > 0 && (
                        <span className="ordered-label">Ordered</span>
                      )}
                      <button 
                        className="qty-btn qty-minus"
                        onClick={(e) => { e.stopPropagation(); handleQuantityChange(offer.offerId, -1, offer); }}
                      >-</button>
                      <span className={`qty-display ${orderedQuantity > 0 ? 'qty-locked' : ''}`}>{orderedQuantity}</span>
                      <button 
                        className="qty-btn qty-plus"
                        onClick={(e) => { e.stopPropagation(); handleQuantityChange(offer.offerId, 1, offer); }}
                      >+</button>
                    </div>
                    <button 
                      className="offer-action-small"
                      onClick={(e) => handleViewDetails(offer.offerId, e)}
                    >View Offer</button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Lighting Offers */}
        {lightingOffers.length > 0 && (
          <div id="section-lighting" className="individual-offers-section">
            <h2 className="brand-group-title">Lighting</h2>
            <div className="offers-grid">
              {lightingOffers.map((offer) => {
                const brandLogo = getBrandLogo(offer.brand);
                const quantity = quantities[offer.offerId] || 0;
                const orderedQuantity = getOrderedQuantity(offer.offerId);
                return (
                  <div
                    key={offer.offerId}
                    className="offer-card"
                  >
                    <div className="offer-card-top">
                      {brandLogo && (
                        <img src={brandLogo} alt={`${offer.brand} Logo`} className={`offer-brand-logo ${offer.brand.toLowerCase().includes('armor') ? 'armor-logo' : ''}`} />
                      )}
                      <div className="offer-group">{offer.offerGroup}</div>
                    </div>
                    {offer.offerTier && offer.offerTier !== 'Range Offer' && (
                      <div className={`offer-tier-badge tier-${offer.offerTier.toLowerCase().replace(/\s+/g, '-').replace(/\//g, '-')}`}>{offer.offerTier}</div>
                    )}
                    {getOfferCardImage(offer.offerId) && (
                      <div className="offer-product-image-container">
                        <img src={getOfferCardImage(offer.offerId)!} alt={`${offer.offerGroup} Product`} className="offer-product-image" />
                      </div>
                    )}
                    {offer.descriptions && offer.descriptions.length > 0 && (
                      <table className="offer-descriptions-table">
                        <tbody>
                          {offer.descriptions.map((item, idx) => (
                            <tr key={idx}>
                              <td>{typeof item === 'string' ? item : item.description}</td>
                              <td>Qty: {typeof item === 'string' ? '' : item.qty}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                    {offer.save && (
                      <div className="offer-save">Save: {offer.save}</div>
                    )}
                    <div className="offer-highlights">
                      {offer.expoChargeBackCost && offer.expoChargeBackCost !== '-' && (
                        <div className="offer-cost">
                          <span className="highlight-label">Expo Charge Back:</span>
                          <span className="highlight-value">{formatTotalCost(offer.expoChargeBackCost)}</span>
                        </div>
                      )}
                    </div>
                    <div className={`offer-quantity-controls ${orderedQuantity > 0 ? 'ordered' : ''}`}>
                      {orderedQuantity > 0 && (
                        <span className="ordered-label">Ordered</span>
                      )}
                      <button 
                        className="qty-btn qty-minus"
                        onClick={(e) => { e.stopPropagation(); handleQuantityChange(offer.offerId, -1, offer); }}
                      >-</button>
                      <span className={`qty-display ${orderedQuantity > 0 ? 'qty-locked' : ''}`}>{orderedQuantity}</span>
                      <button 
                        className="qty-btn qty-plus"
                        onClick={(e) => { e.stopPropagation(); handleQuantityChange(offer.offerId, 1, offer); }}
                      >+</button>
                    </div>
                    <button 
                      className="offer-action-small"
                      onClick={(e) => handleViewDetails(offer.offerId, e)}
                    >View Offer</button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Car Care Offers (ArmorAll 4) */}
        {carCareOffers.length > 0 && (
          <div id="section-car-care" className="individual-offers-section">
            <h2 className="brand-group-title">Car Care</h2>
            <div className="offers-grid">
              {carCareOffers.map((offer) => {
                const brandLogo = getBrandLogo(offer.brand);
                const quantity = quantities[offer.offerId] || 0;
                const orderedQuantity = getOrderedQuantity(offer.offerId);
                return (
                  <div
                    key={offer.offerId}
                    className="offer-card"
                  >
                    <div className="offer-card-top">
                      {brandLogo && (
                        <img src={brandLogo} alt={`${offer.brand} Logo`} className={`offer-brand-logo ${offer.brand.toLowerCase().includes('armor') ? 'armor-logo' : ''}`} />
                      )}
                      <div className="offer-group">{offer.offerGroup}</div>
                    </div>
                    {offer.offerTier && offer.offerTier !== 'Range Offer' && (
                      <div className={`offer-tier-badge tier-${offer.offerTier.toLowerCase().replace(/\s+/g, '-').replace(/\//g, '-')}`}>{offer.offerTier}</div>
                    )}
                    {getOfferCardImage(offer.offerId) && (
                      <div className="offer-product-image-container">
                        <img src={getOfferCardImage(offer.offerId)!} alt={`${offer.offerGroup} Product`} className="offer-product-image" />
                      </div>
                    )}
                    {offer.descriptions && offer.descriptions.length > 0 && (
                      <table className="offer-descriptions-table">
                        <tbody>
                          {offer.descriptions.map((item, idx) => (
                            <tr key={idx}>
                              <td>{typeof item === 'string' ? item : item.description}</td>
                              <td>Qty: {typeof item === 'string' ? '' : item.qty}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                    {offer.save && (
                      <div className="offer-save">Save: {offer.save}</div>
                    )}
                    <div className="offer-highlights">
                      {offer.expoChargeBackCost && offer.expoChargeBackCost !== '-' && (
                        <div className="offer-cost">
                          <span className="highlight-label">Expo Charge Back:</span>
                          <span className="highlight-value">{formatTotalCost(offer.expoChargeBackCost)}</span>
                        </div>
                      )}
                    </div>
                    <div className={`offer-quantity-controls ${orderedQuantity > 0 ? 'ordered' : ''}`}>
                      {orderedQuantity > 0 && (
                        <span className="ordered-label">Ordered</span>
                      )}
                      <button 
                        className="qty-btn qty-minus"
                        onClick={(e) => { e.stopPropagation(); handleQuantityChange(offer.offerId, -1, offer); }}
                      >-</button>
                      <span className={`qty-display ${orderedQuantity > 0 ? 'qty-locked' : ''}`}>{orderedQuantity}</span>
                      <button 
                        className="qty-btn qty-plus"
                        onClick={(e) => { e.stopPropagation(); handleQuantityChange(offer.offerId, 1, offer); }}
                      >+</button>
                    </div>
                    <button 
                      className="offer-action-small"
                      onClick={(e) => handleViewDetails(offer.offerId, e)}
                    >View Offer</button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Fragrances Offers (ArmorAll 5) */}
        {fragrancesOffers.length > 0 && (
          <div id="section-fragrances" className="individual-offers-section">
            <h2 className="brand-group-title">Fragrances</h2>
            <div className="offers-grid">
              {fragrancesOffers.map((offer) => {
                const brandLogo = getBrandLogo(offer.brand);
                const quantity = quantities[offer.offerId] || 0;
                const orderedQuantity = getOrderedQuantity(offer.offerId);
                return (
                  <div
                    key={offer.offerId}
                    className="offer-card"
                  >
                    <div className="offer-card-top">
                      {brandLogo && (
                        <img src={brandLogo} alt={`${offer.brand} Logo`} className={`offer-brand-logo ${offer.brand.toLowerCase().includes('armor') ? 'armor-logo' : ''}`} />
                      )}
                      <div className="offer-group">{offer.offerGroup}</div>
                    </div>
                    {offer.offerTier && offer.offerTier !== 'Range Offer' && (
                      <div className={`offer-tier-badge tier-${offer.offerTier.toLowerCase().replace(/\s+/g, '-').replace(/\//g, '-')}`}>{offer.offerTier}</div>
                    )}
                    {getOfferCardImage(offer.offerId) && (
                      <div className="offer-product-image-container">
                        <img src={getOfferCardImage(offer.offerId)!} alt={`${offer.offerGroup} Product`} className="offer-product-image" />
                      </div>
                    )}
                    {offer.descriptions && offer.descriptions.length > 0 && (
                      <table className="offer-descriptions-table">
                        <tbody>
                          {offer.descriptions.map((item, idx) => (
                            <tr key={idx}>
                              <td>{typeof item === 'string' ? item : item.description}</td>
                              <td>Qty: {typeof item === 'string' ? '' : item.qty}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                    {offer.save && (
                      <div className="offer-save">Save: {offer.save}</div>
                    )}
                    <div className="offer-highlights">
                      {offer.expoChargeBackCost && offer.expoChargeBackCost !== '-' && (
                        <div className="offer-cost">
                          <span className="highlight-label">Expo Charge Back:</span>
                          <span className="highlight-value">{formatTotalCost(offer.expoChargeBackCost)}</span>
                        </div>
                      )}
                    </div>
                    <div className={`offer-quantity-controls ${orderedQuantity > 0 ? 'ordered' : ''}`}>
                      {orderedQuantity > 0 && (
                        <span className="ordered-label">Ordered</span>
                      )}
                      <button 
                        className="qty-btn qty-minus"
                        onClick={(e) => { e.stopPropagation(); handleQuantityChange(offer.offerId, -1, offer); }}
                      >-</button>
                      <span className={`qty-display ${orderedQuantity > 0 ? 'qty-locked' : ''}`}>{orderedQuantity}</span>
                      <button 
                        className="qty-btn qty-plus"
                        onClick={(e) => { e.stopPropagation(); handleQuantityChange(offer.offerId, 1, offer); }}
                      >+</button>
                    </div>
                    <button 
                      className="offer-action-small"
                      onClick={(e) => handleViewDetails(offer.offerId, e)}
                    >View Offer</button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Brand Groups (Pallet Offers) - At the bottom */}
        {brandGroups.map((group, groupIndex) => (
          <div key={group.brand} id={`section-${group.brand.toLowerCase().replace(/\s+/g, '-')}`} className="brand-group-section">
            <h2 className="brand-group-title">Pallet Offers</h2>
            <div className="offers-grid">
              {group.offers.map((offer) => {
                const brandLogo = getBrandLogo(group.brand);
                const quantity = quantities[offer.offerId] || 0;
                const orderedQuantity = getOrderedQuantity(offer.offerId);
                return (
                  <div
                    key={offer.offerId}
                    className="offer-card"
                  >
                    <div className="offer-card-top">
                      {brandLogo && (
                        <img src={brandLogo} alt={`${group.brand} Logo`} className={`offer-brand-logo ${group.brand.toLowerCase().includes('armor') ? 'armor-logo' : ''}`} />
                      )}
                      <div className="offer-group">{offer.offerGroup}</div>
                    </div>
                    {offer.offerTier && offer.offerTier !== 'Range Offer' && (
                      <div className={`offer-tier-badge tier-${offer.offerTier.toLowerCase().replace(/\s+/g, '-').replace(/\//g, '-')}`}>{offer.offerTier}</div>
                    )}
                    {getOfferCardImage(offer.offerId) && (
                      <div className="offer-product-image-container">
                        <img src={getOfferCardImage(offer.offerId)!} alt={`${offer.offerGroup} Product`} className="offer-product-image" />
                      </div>
                    )}
                    {offer.descriptions && offer.descriptions.length > 0 && (
                      <table className="offer-descriptions-table">
                        <tbody>
                          {offer.descriptions.map((item, idx) => (
                            <tr key={idx}>
                              <td>{typeof item === 'string' ? item : item.description}</td>
                              <td>Qty: {typeof item === 'string' ? '' : item.qty}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                    {offer.save && (
                      <div className="offer-save">Save: {offer.save}</div>
                    )}
                    <div className="offer-highlights">
                      {offer.expoChargeBackCost && offer.expoChargeBackCost !== '-' && (
                        <div className="offer-cost">
                          <span className="highlight-label">Expo Charge Back:</span>
                          <span className="highlight-value">{formatTotalCost(offer.expoChargeBackCost)}</span>
                        </div>
                      )}
                    </div>
                    <div className={`offer-quantity-controls ${orderedQuantity > 0 ? 'ordered' : ''}`}>
                      {orderedQuantity > 0 && (
                        <span className="ordered-label">Ordered</span>
                      )}
                      <button 
                        className="qty-btn qty-minus"
                        onClick={(e) => { e.stopPropagation(); handleQuantityChange(offer.offerId, -1, offer); }}
                      >-</button>
                      <span className={`qty-display ${orderedQuantity > 0 ? 'qty-locked' : ''}`}>{orderedQuantity}</span>
                      <button 
                        className="qty-btn qty-plus"
                        onClick={(e) => { e.stopPropagation(); handleQuantityChange(offer.offerId, 1, offer); }}
                      >+</button>
                    </div>
                    <button 
                      className="offer-action-small"
                      onClick={(e) => handleViewDetails(offer.offerId, e)}
                    >View Offer</button>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      {selectedOfferForModal && (
        <OfferDetailModal
          offerId={selectedOfferForModal}
          onClose={() => setSelectedOfferForModal(null)}
        />
      )}
    </div>
  );
};

export default OffersListing;
