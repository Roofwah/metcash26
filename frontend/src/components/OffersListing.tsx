import React, { useState, useEffect, useMemo, useRef } from 'react';
import axios from 'axios';
import './OffersListing.css';
import OfferDetailModal from './OfferDetailModal';
import { apiUrl, type StoreData } from '../api';
import {
  brandLogoPathForBrand,
  offerCardImageForOfferId,
  sortOffersByDisplayOrder,
} from '../config/offersDisplay';
import {
  findPriorYearSalesQty,
  formatPriorYearSalesQty,
  shouldShowPriorYearSalesQty,
} from '../utils/priorYearSales';

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
  /** From offers.csv — paths like `/images/...` when set */
  logoUrl?: string;
  productImageUrl?: string;
  heroUrl?: string;
  category?: string;
  message?: string;
  other?: string;
  offerType?: string;
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
      logoUrl: typeof item.logoUrl === 'string' ? item.logoUrl : '',
      productImageUrl: typeof item.productImageUrl === 'string' ? item.productImageUrl : '',
      heroUrl: typeof item.heroUrl === 'string' ? item.heroUrl : '',
      category: typeof item.category === 'string' ? item.category : '',
      message: typeof item.message === 'string' ? item.message : '',
      other: typeof item.other === 'string' ? item.other : '',
      offerType: typeof item.offerType === 'string' ? item.offerType : '',
    }))
    .filter((offer: Offer) => offer.offerId.length > 0);
};

interface CartItem {
  offerId: string;
  offerTier?: string;
  quantity: number;
  description: string;
  cost: string;
  dropMonth?: string;
}

type OfferStripItem =
  | { kind: 'category'; key: string; anchorId?: string; label: string }
  | { kind: 'offer'; key: string; offer: Offer; logoBrandOverride?: string };

/** Single horizontal strip: same order as `OFFER_DISPLAY_ORDER` (sales hierarchy). */
function buildDisplayOrderStrip(allOffers: Offer[]): OfferStripItem[] {
  return sortOffersByDisplayOrder(allOffers).map((offer) => ({
    kind: 'offer' as const,
    key: `offer-${offer.offerId}`,
    offer,
  }));
}

interface OffersListingProps {
  userData: { fullName: string; storeNo: string; position: string };
  storeData: Pick<StoreData, 'storeName' | 'banner' | 'storeId' | 'storeNo'>;
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
  const [allOffers, setAllOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [quantities, setQuantities] = useState<{ [offerId: string]: number }>({});
  const [selectedOfferForModal, setSelectedOfferForModal] = useState<string | null>(null);
  const [focusedOfferKey, setFocusedOfferKey] = useState<string | null>(null);
  const carouselRef = useRef<HTMLDivElement>(null);
  /** Per-category qty from sales25.csv for current store (same keys as store sales dashboard). */
  const [storeSalesLineItems, setStoreSalesLineItems] = useState<{ name: string; qty: number }[] | null>(null);

  const getBrandLogo = (brand: string): string => brandLogoPathForBrand(brand);

  const getOfferCardImage = (offerId: string): string | null => offerCardImageForOfferId(offerId);

  useEffect(() => {
    fetchOffers();
  }, []);

  useEffect(() => {
    let cancelled = false;
    const applyItems = (items: { name: string; qty: number }[] | null) => {
      if (!cancelled) setStoreSalesLineItems(items);
    };
    const fetchSalesForStoreId = (sid: string) => {
      axios
        .get(apiUrl(`/api/store-sales/${encodeURIComponent(sid)}`))
        .then((res) => {
          if (cancelled) return;
          if (res.data?.hasData && Array.isArray(res.data.items)) {
            applyItems(
              res.data.items.map((it: { name?: string; qty?: number }) => ({
                name: String(it.name || ''),
                qty: typeof it.qty === 'number' ? it.qty : parseFloat(String(it.qty)) || 0,
              })),
            );
          } else {
            applyItems(null);
          }
        })
        .catch(() => {
          if (!cancelled) applyItems(null);
        });
    };

    const sid = (storeData?.storeId || '').trim();
    if (sid) {
      fetchSalesForStoreId(sid);
      return () => {
        cancelled = true;
      };
    }

    const name = (storeData?.storeName || '').trim();
    if (!name) {
      applyItems(null);
      return () => {
        cancelled = true;
      };
    }

    axios
      .get(apiUrl('/api/mcash-store-id'), {
        params: { name, storeNo: (storeData?.storeNo || '').trim() },
      })
      .then((res) => {
        if (cancelled) return;
        const resolved = (res.data?.storeId || '').trim();
        if (resolved) fetchSalesForStoreId(resolved);
        else applyItems(null);
      })
      .catch(() => {
        if (!cancelled) applyItems(null);
      });

    return () => {
      cancelled = true;
    };
  }, [storeData?.storeId, storeData?.storeName, storeData?.storeNo]);

  const fetchOffers = async () => {
    try {
      setLoading(true);
      const response = await axios.get(apiUrl('/api/offers'));
      const allOffers: Offer[] = normalizeOffers(response.data);
      if (allOffers.length === 0) {
        throw new Error('Offers payload empty or invalid');
      }

      setAllOffers(allOffers);
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

        setAllOffers(allOffers);
        setError('');
      } catch (retryErr) {
        console.error('Error fetching offers:', err, retryErr);
        setError('Failed to load offers. Please try again.');
        setAllOffers([]);
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

  const renderOfferCard = (offer: Offer, logoBrandOverride?: string) => {
    const brandForLogo = logoBrandOverride ?? offer.brand;
    const brandLogo = getBrandLogo(brandForLogo);
    const cardLogoSrc = offer.logoUrl?.trim() || brandLogo;
    const cardHeroSrc = offer.heroUrl?.trim() || null;
    const cardImage =
      (offer.productImageUrl && offer.productImageUrl.trim()) ||
      getOfferCardImage(offer.offerId);
    const orderedQuantity = getOrderedQuantity(offer.offerId);
    const isArmorBrand = typeof offer.brand === 'string' && offer.brand.toLowerCase().includes('armor');
    const priorYearQty =
      storeSalesLineItems !== null
        ? findPriorYearSalesQty(offer, storeSalesLineItems)
        : undefined;

    return (
      <div className="offer-card">
        <div className="offer-card-top">
          {cardLogoSrc && (
            <img
              src={cardLogoSrc}
              alt={`${offer.brand} Logo`}
              className={`offer-brand-logo ${isArmorBrand ? 'armor-logo' : ''}`}
            />
          )}
          <div className="offer-group">{offer.offerGroup}</div>
        </div>
        {cardHeroSrc && (
          <div className="offer-card-hero">
            <img src={cardHeroSrc} alt={offer.offerGroup} className="offer-card-hero-img" />
          </div>
        )}
        {offer.offerId === 'Energizer 7' ? (
          <div className="offer-tier-badge tier-display-component">Display Pre-Pack</div>
        ) : (
          offer.offerTier &&
          offer.offerTier !== 'Range Offer' && (
            <div
              className={`offer-tier-badge tier-${offer.offerTier.toLowerCase().replace(/\s+/g, '-').replace(/\//g, '-')}`}
            >
              {offer.offerTier}
            </div>
          )
        )}
        {cardImage && (
          <div className="offer-product-image-container">
            <img
              src={cardImage}
              alt={`${offer.offerGroup} Product`}
              className="offer-product-image"
            />
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
        {offer.save && <div className="offer-save">Save: {offer.save}</div>}
        <div className="offer-highlights">
          {offer.expoChargeBackCost && offer.expoChargeBackCost !== '-' && (
            <div className="offer-cost">
              <span className="highlight-label">Expo Charge Back:</span>
              <span className="highlight-value">{formatTotalCost(offer.expoChargeBackCost)}</span>
            </div>
          )}
        </div>
        <div
          className={`offer-qty-row ${orderedQuantity > 0 ? 'offer-qty-row--ordered' : ''}`}
        >
          {shouldShowPriorYearSalesQty(priorYearQty) && (
            <div
              className="offer-prior-year-sales offer-prior-year-sales--beside-qty"
              role="status"
              aria-label={`2025 quantity ${formatPriorYearSalesQty(priorYearQty)} from your store sales report for this offer category`}
            >
              <div className="offer-prior-year-badge">
                <span className="offer-prior-year-badge-year">2025</span>
                <span className="offer-prior-year-badge-value">{formatPriorYearSalesQty(priorYearQty)}</span>
              </div>
            </div>
          )}
          <div className={`offer-quantity-controls ${orderedQuantity > 0 ? 'ordered' : ''}`}>
            {orderedQuantity > 0 && <span className="ordered-label">Ordered</span>}
            <button
              type="button"
              className="qty-btn qty-minus"
              onClick={e => {
                e.stopPropagation();
                handleQuantityChange(offer.offerId, -1, offer);
              }}
            >
              -
            </button>
            <span className={`qty-display ${orderedQuantity > 0 ? 'qty-locked' : ''}`}>{orderedQuantity}</span>
            <button
              type="button"
              className="qty-btn qty-plus"
              onClick={e => {
                e.stopPropagation();
                handleQuantityChange(offer.offerId, 1, offer);
              }}
            >
              +
            </button>
          </div>
        </div>
        <button type="button" className="offer-action-small" onClick={e => handleViewDetails(offer.offerId, e)}>
          View Offer
        </button>
      </div>
    );
  };

  const stripItems = useMemo(
    () => (allOffers.length === 0 ? [] : buildDisplayOrderStrip(allOffers)),
    [allOffers],
  );

  const offerKeys = useMemo(
    () =>
      stripItems
        .filter((i): i is Extract<typeof i, { kind: 'offer' }> => i.kind === 'offer')
        .map((i) => i.key),
    [stripItems],
  );

  useEffect(() => {
    const el = carouselRef.current;
    if (!el || offerKeys.length === 0) return;

    const updateFocused = () => {
      const rect = el.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const offerSlides = el.querySelectorAll<HTMLElement>('.offers-carousel-slide--offer');
      let nearestKey: string | null = null;
      let nearestDist = Infinity;
      offerSlides.forEach((slide) => {
        const slideRect = slide.getBoundingClientRect();
        const slideCenterX = slideRect.left + slideRect.width / 2;
        const dist = Math.abs(centerX - slideCenterX);
        if (dist < nearestDist) {
          nearestDist = dist;
          nearestKey = slide.dataset.offerKey ?? null;
        }
      });
      setFocusedOfferKey(nearestKey);
    };

    updateFocused();
    el.addEventListener('scroll', updateFocused, { passive: true });
    window.addEventListener('resize', updateFocused);
    return () => {
      el.removeEventListener('scroll', updateFocused);
      window.removeEventListener('resize', updateFocused);
    };
  }, [stripItems, offerKeys.length]);

  const focusedIdx = focusedOfferKey ? offerKeys.indexOf(focusedOfferKey) : -1;
  const leftKey = focusedIdx > 0 ? offerKeys[focusedIdx - 1] : null;
  const rightKey = focusedIdx >= 0 && focusedIdx < offerKeys.length - 1 ? offerKeys[focusedIdx + 1] : null;

  const getOfferSlideClass = (key: string) => {
    if (key === focusedOfferKey) return 'is-focused';
    if (key === leftKey) return 'is-adjacent-left';
    if (key === rightKey) return 'is-adjacent-right';
    return '';
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
        <div className="store-info-container">
          <div className="store-info">
            <h2>{storeData.storeName}</h2>
            {storeData.banner !== '-' && <p>{storeData.banner}</p>}
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

        {stripItems.length > 0 && (
          <div className="offers-strip-host">
            <div
              ref={carouselRef}
              className="offers-carousel offers-carousel--single"
              id="offers-main-strip"
              role="region"
              aria-label="All offers in one row — swipe sideways"
            >
              {stripItems.map(item =>
                item.kind === 'category' ? (
                  <div
                    key={item.key}
                    id={item.anchorId}
                    className="offers-carousel-slide offers-carousel-slide--category"
                    role="separator"
                    aria-label={item.label}
                  >
                    <span className="offers-carousel-category-label">{item.label}</span>
                  </div>
                ) : (
                  <div
                    key={item.key}
                    className={`offers-carousel-slide offers-carousel-slide--offer ${getOfferSlideClass(item.key)}`}
                    data-offer-key={item.key}
                  >
                    {renderOfferCard(item.offer, item.logoBrandOverride)}
                  </div>
                ),
              )}
            </div>
          </div>
        )}
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
