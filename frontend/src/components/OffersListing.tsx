import React, { useState, useEffect, useMemo, useRef } from 'react';
import axios from 'axios';
import './OffersListing.css';
import OfferDetailModal from './OfferDetailModal';
import { apiUrl } from '../api';
import {
  brandLogoPathForBrand,
  isArmorAllPalletOffer,
  isBatteryRetailStripOffer,
  isEnergizerPalletOffer,
  isEvereadyPalletOffer,
  isNonPalletDisplayOffer,
  NON_PALLET_DISPLAY_ORDER,
  offerCardImageForOfferId,
  PALLET_GROUP_BRANDS,
} from '../config/offersDisplay';

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

type OfferStripItem =
  | { kind: 'category'; key: string; anchorId?: string; label: string }
  | { kind: 'offer'; key: string; offer: Offer; logoBrandOverride?: string };

/**
 * Pallet sections first so all ~12 pallet cards are not hidden past the first five strip offers.
 * Then Pre Pack / Lighting / Car / Fragrances, then any offers that did not match hardcoded buckets.
 */
function buildOfferStrip(
  brandGroups: BrandGroup[],
  batteryDisplayOffers: Offer[],
  lightingOffers: Offer[],
  carCareOffers: Offer[],
  fragrancesOffers: Offer[],
  orphanOffers: Offer[],
): OfferStripItem[] {
  const out: OfferStripItem[] = [];

  brandGroups.forEach((g, i) => {
    const anchorId = i === 0 ? 'section-energizer' : undefined;
    const slug = g.brand.toLowerCase().replace(/\s+/g, '-');
    out.push({
      kind: 'category',
      key: `cat-pallet-${slug}`,
      anchorId,
      label: `Pallet · ${g.brand}`,
    });
    for (const offer of g.offers) {
      out.push({ kind: 'offer', key: `offer-${offer.offerId}`, offer, logoBrandOverride: g.brand });
    }
  });

  if (batteryDisplayOffers.length > 0) {
    out.push({ kind: 'category', key: 'cat-battery-display', anchorId: 'section-battery-display', label: 'Pre Pack' });
    for (const offer of batteryDisplayOffers) {
      out.push({ kind: 'offer', key: `offer-${offer.offerId}`, offer });
    }
  }
  if (lightingOffers.length > 0) {
    out.push({ kind: 'category', key: 'cat-lighting', anchorId: 'section-lighting', label: 'Lighting' });
    for (const offer of lightingOffers) {
      out.push({ kind: 'offer', key: `offer-${offer.offerId}`, offer });
    }
  }
  if (carCareOffers.length > 0) {
    out.push({ kind: 'category', key: 'cat-car-care', anchorId: 'section-car-care', label: 'Car care' });
    for (const offer of carCareOffers) {
      out.push({ kind: 'offer', key: `offer-${offer.offerId}`, offer });
    }
  }
  if (fragrancesOffers.length > 0) {
    out.push({ kind: 'category', key: 'cat-fragrances', anchorId: 'section-fragrances', label: 'Fragrances' });
    for (const offer of fragrancesOffers) {
      out.push({ kind: 'offer', key: `offer-${offer.offerId}`, offer });
    }
  }
  if (orphanOffers.length > 0) {
    out.push({
      kind: 'category',
      key: 'cat-more-offers',
      anchorId: 'section-more-offers',
      label: 'More offers',
    });
    for (const offer of orphanOffers) {
      out.push({ kind: 'offer', key: `offer-${offer.offerId}`, offer });
    }
  }

  return out;
}

function sortNonPalletOffers(offers: Offer[]): Offer[] {
  const order = [...NON_PALLET_DISPLAY_ORDER];
  return [...offers].sort((a, b) => {
    const idA = String(a.offerId || '');
    const idB = String(b.offerId || '');
    const ia = order.indexOf(idA as (typeof NON_PALLET_DISPLAY_ORDER)[number]);
    const ib = order.indexOf(idB as (typeof NON_PALLET_DISPLAY_ORDER)[number]);
    return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
  });
}

function sortPalletOffersByIdNumber(offers: Offer[]): Offer[] {
  return [...offers].sort((a, b) => {
    const numA = parseInt(String(a.offerId || '').match(/\d+/)?.[0] || '0', 10);
    const numB = parseInt(String(b.offerId || '').match(/\d+/)?.[0] || '0', 10);
    return numA - numB;
  });
}

const PALLET_MATCHER: Record<(typeof PALLET_GROUP_BRANDS)[number], (id: string) => boolean> = {
  Energizer: isEnergizerPalletOffer,
  Eveready: isEvereadyPalletOffer,
  'Armor All': isArmorAllPalletOffer,
};

function buildPalletBrandGroups(allOffers: Offer[]): BrandGroup[] {
  const groups: BrandGroup[] = [];
  for (const brand of PALLET_GROUP_BRANDS) {
    const offers = sortPalletOffersByIdNumber(
      allOffers.filter((o) => PALLET_MATCHER[brand](o.offerId)),
    );
    if (offers.length > 0) {
      groups.push({ brand, offers, isPallet: true });
    }
  }
  return groups;
}

function isPalletRowOffer(o: Offer): boolean {
  return (
    isEnergizerPalletOffer(o.offerId) ||
    isEvereadyPalletOffer(o.offerId) ||
    isArmorAllPalletOffer(o.offerId)
  );
}

function partitionOffersFromApi(allOffers: Offer[]): {
  brandGroups: BrandGroup[];
  batteryDisplayOffers: Offer[];
  lightingOffers: Offer[];
  carCareOffers: Offer[];
  fragrancesOffers: Offer[];
  orphanOffers: Offer[];
} {
  const rows = Array.isArray(allOffers) ? allOffers : [];
  const stripCandidates = rows.filter(
    (o) =>
      !isPalletRowOffer(o) &&
      (isNonPalletDisplayOffer(o.offerId) || isBatteryRetailStripOffer(o)),
  );
  const sortedStrip = sortNonPalletOffers(stripCandidates);

  const brandGroups = buildPalletBrandGroups(rows);
  const batteryDisplayOffers = sortedStrip.filter(
    (o) =>
      (o.offerId === 'Energizer 7' || isBatteryRetailStripOffer(o)) &&
      o.offerId !== 'Energizer 8' &&
      o.offerId !== 'Energizer 9',
  );
  const lightingOffers = sortedStrip.filter((o) => o.offerId === 'Energizer 8' || o.offerId === 'Energizer 9');
  const carCareOffers = sortedStrip.filter((o) => o.offerId === 'ArmorAll 4');
  const fragrancesOffers = sortedStrip.filter((o) => o.offerId === 'ArmorAll 5');

  const placed = new Set<string>();
  for (const o of batteryDisplayOffers) placed.add(o.offerId);
  for (const o of lightingOffers) placed.add(o.offerId);
  for (const o of carCareOffers) placed.add(o.offerId);
  for (const o of fragrancesOffers) placed.add(o.offerId);
  for (const g of brandGroups) {
    for (const o of g.offers) placed.add(o.offerId);
  }
  const orphanOffers = rows
    .filter((o) => !placed.has(o.offerId))
    .sort((a, b) => a.offerId.localeCompare(b.offerId, undefined, { numeric: true }));

  return {
    brandGroups,
    batteryDisplayOffers,
    lightingOffers,
    carCareOffers,
    fragrancesOffers,
    orphanOffers,
  };
}

/** First cards in the carousel, in this exact order (then everything else). */
const LEAD_OFFER_ORDER = [
  'Energizer 7',
  'Eveready 1',
  'Energizer 1',
  'Energizer 2',
  'Energizer 3',
] as const;

function excludeOfferIds(offers: Offer[], omit: Set<string>): Offer[] {
  return offers.filter((o) => !omit.has(o.offerId));
}

function excludeFromBrandGroups(groups: BrandGroup[], omit: Set<string>): BrandGroup[] {
  return groups
    .map((g) => ({ ...g, offers: excludeOfferIds(g.offers, omit) }))
    .filter((g) => g.offers.length > 0);
}

/** Lead row + remainder with no duplicate offer ids. */
function buildStripWithLeadOrder(allOffers: Offer[]): OfferStripItem[] {
  const omit = new Set<string>([...LEAD_OFFER_ORDER]);
  const p = partitionOffersFromApi(allOffers);
  const filtered = {
    brandGroups: excludeFromBrandGroups(p.brandGroups, omit),
    batteryDisplayOffers: excludeOfferIds(p.batteryDisplayOffers, omit),
    lightingOffers: excludeOfferIds(p.lightingOffers, omit),
    carCareOffers: excludeOfferIds(p.carCareOffers, omit),
    fragrancesOffers: excludeOfferIds(p.fragrancesOffers, omit),
    orphanOffers: excludeOfferIds(p.orphanOffers, omit),
  };
  const rest = buildOfferStrip(
    filtered.brandGroups,
    filtered.batteryDisplayOffers,
    filtered.lightingOffers,
    filtered.carCareOffers,
    filtered.fragrancesOffers,
    filtered.orphanOffers,
  );
  const lead: OfferStripItem[] = [];
  for (const id of LEAD_OFFER_ORDER) {
    const offer = allOffers.find((o) => o.offerId === id);
    if (!offer) continue;
    const logoBrandOverride =
      id === 'Eveready 1'
        ? 'Eveready'
        : id === 'Energizer 1' || id === 'Energizer 2' || id === 'Energizer 3'
          ? 'Energizer'
          : undefined;
    lead.push({
      kind: 'offer',
      key: `offer-lead-${id.replace(/\s+/g, '-')}`,
      offer,
      logoBrandOverride,
    });
  }
  return [...lead, ...rest];
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
  const [orphanOffers, setOrphanOffers] = useState<Offer[]>([]);
  const [allOffers, setAllOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [quantities, setQuantities] = useState<{ [offerId: string]: number }>({});
  const [selectedOfferForModal, setSelectedOfferForModal] = useState<string | null>(null);
  const [focusedOfferKey, setFocusedOfferKey] = useState<string | null>(null);
  const carouselRef = useRef<HTMLDivElement>(null);

  const getBrandLogo = (brand: string): string => brandLogoPathForBrand(brand);

  const getOfferCardImage = (offerId: string): string | null => offerCardImageForOfferId(offerId);

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

      const {
        brandGroups: groups,
        batteryDisplayOffers: energizer7,
        lightingOffers: lighting,
        carCareOffers: armorAll4,
        fragrancesOffers: armorAll5,
        orphanOffers: orphans,
      } = partitionOffersFromApi(allOffers);

      setBrandGroups(groups);
      setBatteryDisplayOffers(energizer7);
      setLightingOffers(lighting);
      setCarCareOffers(armorAll4);
      setFragrancesOffers(armorAll5);
      setOrphanOffers(orphans);
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

        const p = partitionOffersFromApi(allOffers);
        setBrandGroups(p.brandGroups);
        setBatteryDisplayOffers(p.batteryDisplayOffers);
        setLightingOffers(p.lightingOffers);
        setCarCareOffers(p.carCareOffers);
        setFragrancesOffers(p.fragrancesOffers);
        setOrphanOffers(p.orphanOffers);
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

  const scrollToSection = (sectionName: string) => {
    const elementId =
      sectionName === 'Pallet Offers'
        ? 'section-energizer'
        : sectionName === 'More offers'
          ? 'section-more-offers'
          : `section-${sectionName.toLowerCase().replace(/\s+/g, '-')}`;

    document.getElementById(elementId)?.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
      inline: 'start',
    });
  };

  const renderOfferCard = (offer: Offer, logoBrandOverride?: string) => {
    const brandForLogo = logoBrandOverride ?? offer.brand;
    const brandLogo = getBrandLogo(brandForLogo);
    const cardLogoSrc = offer.logoUrl?.trim() || brandLogo;
    const cardImage =
      (offer.productImageUrl && offer.productImageUrl.trim()) ||
      getOfferCardImage(offer.offerId);
    const orderedQuantity = getOrderedQuantity(offer.offerId);
    const isArmorBrand = typeof offer.brand === 'string' && offer.brand.toLowerCase().includes('armor');

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
        <button type="button" className="offer-action-small" onClick={e => handleViewDetails(offer.offerId, e)}>
          View Offer
        </button>
      </div>
    );
  };

  const stripItems = useMemo(
    () => (allOffers.length === 0 ? [] : buildStripWithLeadOrder(allOffers)),
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
          <div className="offers-navigation">
          {brandGroups.length > 0 && (
            <button type="button" onClick={() => scrollToSection('Pallet Offers')} className="nav-button">Pallet offers</button>
          )}
          {batteryDisplayOffers.length > 0 && (
            <button type="button" onClick={() => scrollToSection('Battery Display')} className="nav-button">Pre Pack</button>
          )}
          {lightingOffers.length > 0 && (
            <button type="button" onClick={() => scrollToSection('Lighting')} className="nav-button">Lighting</button>
          )}
          {carCareOffers.length > 0 && (
            <button type="button" onClick={() => scrollToSection('Car Care')} className="nav-button">Car Care</button>
          )}
          {fragrancesOffers.length > 0 && (
            <button type="button" onClick={() => scrollToSection('Fragrances')} className="nav-button">Fragrances</button>
          )}
          {orphanOffers.length > 0 && (
            <button type="button" onClick={() => scrollToSection('More offers')} className="nav-button">More offers</button>
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
