import React, { useState, useEffect, useMemo, useRef } from 'react';
import axios from 'axios';
import './OffersListing.css';
import OfferDetailModal from './OfferDetailModal';
import { apiUrl, type StoreData } from '../api';
import { brandLogoPathForBrand, sortOffersByDisplayOrder } from '../config/offersDisplay';
import {
  offerCardEditorialHeading,
  offerCardEditorialSubline,
  offerCardLogoUrl,
  offerCardPromoImageUrl,
  offerCardProductImageUrl,
} from '../utils/offerMedia';
import { isMixedChooseNOffer } from '../utils/mixedChooseN';
import {
  formatPriorYearSalesQty,
  shouldShowPriorYearSalesQty,
} from '../utils/priorYearSales';
import { recomputeChooseNPackCount, recomputeSplitBundleW, type BundleLineDetail } from '../utils/expandRetailOrderItems';

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
  /** Merged from offer-content.json + paths under /products/ */
  logoUrl?: string;
  productImageUrl?: string;
  heroUrl?: string;
  promoImageUrl?: string;
  logo?: string | null;
  hero?: string | null;
  productImage?: string | null;
  promoImage?: string | null;
  showPromos?: boolean;
  h1?: string;
  h2?: string;
  body?: string;
  modalTitle?: string;
  callouts?: string[];
  category?: string;
  message?: string;
  other?: string;
  offerType?: string;
  rules?: {
    offerMode?: string;
    minBundleQty?: number;
    allowLineIncrease?: boolean;
    selectionRule?: string;
    minSelections?: number;
    maxSelections?: number;
  };
  items?: {
    sku?: string;
    description?: string;
    baseQty?: number;
    cartonQty?: number;
    expoTotalCost?: number;
  }[];
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
      promoImageUrl: typeof item.promoImageUrl === 'string' ? item.promoImageUrl : '',
      logo: item.logo === null ? null : typeof item.logo === 'string' ? item.logo : undefined,
      hero: item.hero === null ? null : typeof item.hero === 'string' ? item.hero : undefined,
      productImage:
        item.productImage === null ? null : typeof item.productImage === 'string' ? item.productImage : undefined,
      promoImage:
        item.promoImage === null ? null : typeof item.promoImage === 'string' ? item.promoImage : undefined,
      showPromos: !!item.showPromos,
      h1: typeof item.h1 === 'string' ? item.h1 : '',
      h2: typeof item.h2 === 'string' ? item.h2 : '',
      body: typeof item.body === 'string' ? item.body : '',
      modalTitle: typeof item.modalTitle === 'string' ? item.modalTitle : '',
      callouts: Array.isArray(item.callouts) ? item.callouts : [],
      category: typeof item.category === 'string' ? item.category : '',
      message: typeof item.message === 'string' ? item.message : '',
      other: typeof item.other === 'string' ? item.other : '',
      offerType: typeof item.offerType === 'string' ? item.offerType : '',
      rules: item.rules && typeof item.rules === 'object' ? item.rules : undefined,
      items: Array.isArray(item.items) ? item.items : [],
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
  minQuantity?: number;
  lockQuantity?: boolean;
  fixedBundle?: boolean;
  splitBundle?: boolean;
  chooseNBundle?: boolean;
  lineDetails?: BundleLineDetail[];
  chooseNMinSel?: number;
}

type LineCartLookup = (offerId: string, lineDescription: string, sku?: string) => CartItem | undefined;

function isFixedLikeOfferRules(rules?: Offer['rules']): boolean {
  const mode = String(rules?.offerMode || '').toUpperCase();
  const allowLineIncrease = !!rules?.allowLineIncrease;
  return mode === 'FIXED' || (mode === 'SPLIT' && !allowLineIncrease);
}

/**
 * SPLIT + allowLineIncrease: “bundle” count is the min of floor(qty/base) across lines.
 * Per-line extras (e.g. +1 on one SKU) do not increase this until every line reaches the next multiple.
 */
function splitAllowIncreaseSyncedBundles(offer: Offer, getLineCartEntry: LineCartLookup): number {
  const lines = offer.items || [];
  if (lines.length === 0) return 0;
  let minB = Infinity;
  for (const line of lines) {
    const b = Math.max(0, Number(line.baseQty) || 0);
    if (b <= 0) continue;
    const entry = getLineCartEntry(offer.offerId, String(line.description || ''), line.sku);
    if (!entry) return 0;
    minB = Math.min(minB, Math.floor(entry.quantity / b));
  }
  return minB === Infinity ? 0 : minB;
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
  onUpdateCartLineQuantity?: (offerId: string, description: string, quantity: number, minQuantity?: number) => void;
  onRemoveCartLine?: (offerId: string, description: string) => void;
  /** Remove every cart row for an offer (used for MIXED CHOOSE_N main-card minus). */
  onClearOfferCartLines?: (offerId: string) => void;
  /** Set CHOOSE_N pack count (all active lines scaled) in one cart update. */
  onSetChooseNPacks?: (offerId: string, targetW: number) => void;
  showSalesDashboardButton?: boolean;
  onOpenSalesDashboard?: () => void;
  onOpenInsightsNavigation?: () => void;
}

const OffersListing: React.FC<OffersListingProps> = ({
  userData,
  storeData,
  onSelectOffer,
  onBack,
  onGoToCart,
  cartItemCount,
  cartItems,
  onAddToCart,
  onUpdateCartLineQuantity,
  onRemoveCartLine,
  onClearOfferCartLines,
  onSetChooseNPacks,
  showSalesDashboardButton,
  onOpenSalesDashboard,
  onOpenInsightsNavigation,
}) => {
  const [allOffers, setAllOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedOfferForModal, setSelectedOfferForModal] = useState<string | null>(null);
  const [promoViewByOfferId, setPromoViewByOfferId] = useState<Record<string, boolean>>({});
  const [focusedOfferKey, setFocusedOfferKey] = useState<string | null>(null);
  const carouselRef = useRef<HTMLDivElement>(null);
  const [suggestByOfferId, setSuggestByOfferId] = useState<Record<string, { sales: number; suggest: number }>>({});

  const getBrandLogo = (brand: string): string => brandLogoPathForBrand(brand);

  useEffect(() => {
    fetchOffers();
  }, []);

  useEffect(() => {
    let cancelled = false;
    const applySuggestByOffer = (map: Record<string, { sales: number; suggest: number }>) => {
      if (!cancelled) setSuggestByOfferId(map);
    };
    const fetchSuggestForStoreId = (sid: string) => {
      axios
        .get(apiUrl(`/api/store-suggest/${encodeURIComponent(sid)}`))
        .then((res) => {
          if (cancelled) return;
          if (Array.isArray(res.data?.offers)) {
            const next: Record<string, { sales: number; suggest: number }> = {};
            res.data.offers.forEach((it: { offerId?: string; sales?: number; suggest?: number }) => {
              const key = String(it.offerId || '').trim();
              if (!key) return;
              next[key.toUpperCase()] = {
                sales: typeof it.sales === 'number' ? it.sales : parseFloat(String(it.sales)) || 0,
                suggest: typeof it.suggest === 'number' ? it.suggest : parseFloat(String(it.suggest)) || 0,
              };
            });
            applySuggestByOffer(next);
          } else {
            applySuggestByOffer({});
          }
        })
        .catch(() => {
          if (!cancelled) applySuggestByOffer({});
        });
    };

    const sid = (storeData?.storeId || '').trim();
    if (sid) {
      fetchSuggestForStoreId(sid);
      return () => {
        cancelled = true;
      };
    }

    const name = (storeData?.storeName || '').trim();
    if (!name) {
      applySuggestByOffer({});
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
        if (resolved) fetchSuggestForStoreId(resolved);
        else applySuggestByOffer({});
      })
      .catch(() => {
        if (!cancelled) applySuggestByOffer({});
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

  const getLineCartEntry = (offerId: string, lineDescription: string, sku?: string): CartItem | undefined => {
    const skuNeedle = (sku || '').trim();
    const bundle = cartItems.find(
      (item) => item.offerId === offerId && (item.splitBundle || item.chooseNBundle) && item.lineDetails?.length,
    );
    if (bundle?.lineDetails?.length) {
      const ld = bundle.lineDetails.find((l) => {
        const d = String(l.description || '');
        if (!skuNeedle) return d.toLowerCase().includes(lineDescription.toLowerCase());
        return d.includes(`(${skuNeedle})`) || String(l.sku || '').trim() === skuNeedle;
      });
      if (!ld) return undefined;
      return {
        offerId,
        quantity: ld.quantity,
        description: ld.description,
        cost: ld.cost,
        minQuantity: 0,
        lockQuantity: !!bundle.lockQuantity,
      };
    }
    return cartItems.find((item) => {
      if (item.offerId !== offerId) return false;
      const d = String(item.description || '');
      if (!d.toLowerCase().includes(lineDescription.toLowerCase())) return false;
      if (!skuNeedle) return true;
      return d.includes(`(${skuNeedle})`);
    });
  };

  const getOfferOrderUnits = (offer: Offer): number => {
    const lines = offer.items || [];
    if (lines.length === 0) return getOrderedQuantity(offer.offerId);
    if (isMixedChooseNOffer(offer.rules)) {
      const bundle = cartItems.find((c) => c.offerId === offer.offerId && c.chooseNBundle);
      if (!bundle?.lineDetails?.length) return 0;
      return recomputeChooseNPackCount(bundle.lineDetails);
    }
    const mode = String(offer.rules?.offerMode || '').toUpperCase();
    if (mode === 'SPLIT' && offer.rules?.allowLineIncrease) {
      const bundleRow = cartItems.find((c) => c.offerId === offer.offerId && c.splitBundle);
      if (bundleRow?.lineDetails?.length) {
        return Math.max(0, Number(bundleRow.quantity) || recomputeSplitBundleW(bundleRow.lineDetails));
      }
      return splitAllowIncreaseSyncedBundles(offer, getLineCartEntry);
    }
    if (isFixedLikeOfferRules(offer.rules)) {
      const bundleRow = cartItems.find((c) => c.offerId === offer.offerId && c.fixedBundle);
      if (bundleRow) return Math.max(0, Number(bundleRow.quantity) || 0);
      const first = lines[0];
      if (!first) return 0;
      const firstDesc = String(first.description || '');
      const firstEntry = getLineCartEntry(offer.offerId, firstDesc, first.sku);
      if (!firstEntry) return 0;
      const base = Math.max(1, Number(first.baseQty) || 1);
      return Math.floor(firstEntry.quantity / base);
    }
    const first = lines[0];
    const firstDesc = String(first.description || '');
    const firstEntry = getLineCartEntry(offer.offerId, firstDesc, first.sku);
    if (!firstEntry) return 0;
    const base = Math.max(1, Number(first.baseQty) || 1);
    return Math.floor(firstEntry.quantity / base);
  };

  const handleViewDetails = (offerId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedOfferForModal(offerId);
  };

  const handleAddOfferFast = (offer: Offer, e: React.MouseEvent) => {
    e.stopPropagation();
    const mode = String(offer.rules?.offerMode || '').toUpperCase();
    const allowLineIncrease = !!offer.rules?.allowLineIncrease;
    const isFixedLike = mode === 'FIXED' || (mode === 'SPLIT' && !allowLineIncrease);
    const lines = Array.isArray(offer.items) ? offer.items : [];
    if (lines.length > 0 && isMixedChooseNOffer(offer.rules)) {
      const minSel = Math.max(0, Number(offer.rules?.minSelections) || 0);
      const lineDetails: BundleLineDetail[] = [];
      let sum = 0;
      lines.forEach((line, idx) => {
        const baseQty = Math.max(0, Number(line.baseQty) || 0);
        if (idx >= minSel || baseQty <= 0) return;
        const lineExpo = Number(line.expoTotalCost) || 0;
        const lineCost = baseQty > 0 ? lineExpo / baseQty : lineExpo;
        const desc = `${line.description || 'SKU'} (${line.sku || idx + 1})`;
        const c = Number.isFinite(lineCost) ? lineCost : 0;
        sum += c * baseQty;
        lineDetails.push({
          description: desc,
          quantity: baseQty,
          cost: c.toFixed(2),
          baseQty,
          sku: String(line.sku || '').trim() || undefined,
        });
      });
      if (lineDetails.length > 0) {
        onAddToCart([
          {
            offerId: offer.offerId,
            offerTier: offer.offerTier !== 'Range Offer' ? offer.offerTier : undefined,
            quantity: 1,
            description: offerCardEditorialHeading(offer) || offer.offerId,
            cost: sum.toFixed(2),
            minQuantity: 1,
            lockQuantity: true,
            chooseNBundle: true,
            chooseNMinSel: minSel,
            lineDetails,
          },
        ]);
      }
      return;
    }
    if (lines.length > 0 && isFixedLike) {
      const minBundle = Math.max(1, Number(offer.rules?.minBundleQty) || 1);
      const addQty = minBundle;
      let totalExpo = 0;
      for (const line of lines) {
        const b = Math.max(0, Number(line.baseQty) || 0);
        if (b <= 0) continue;
        totalExpo += Number(line.expoTotalCost) || 0;
      }
      const catalogExpo = parseFloat(offer.expoChargeBackCost) || 0;
      if (catalogExpo > totalExpo + 0.05) {
        totalExpo = catalogExpo;
      }
      const perBundleCost = addQty > 0 && totalExpo > 0 ? totalExpo / addQty : 0;
      onAddToCart([
        {
          offerId: offer.offerId,
          offerTier: offer.offerTier !== 'Range Offer' ? offer.offerTier : undefined,
          quantity: addQty,
          description: offerCardEditorialHeading(offer) || offer.offerId,
          cost: Number.isFinite(perBundleCost) ? perBundleCost.toFixed(2) : '0.00',
          minQuantity: 1,
          lockQuantity: true,
          fixedBundle: true,
        },
      ]);
      return;
    }
    if (lines.length > 0 && mode === 'SPLIT') {
      const lineDetails: BundleLineDetail[] = [];
      lines.forEach((line, idx) => {
        const baseQty = Math.max(0, Number(line.baseQty) || 0);
        if (baseQty <= 0) return;
        const lineExpo = Number(line.expoTotalCost) || 0;
        const lineCost = baseQty > 0 ? lineExpo / baseQty : lineExpo;
        const c = Number.isFinite(lineCost) ? lineCost : 0;
        lineDetails.push({
          description: `${line.description || 'SKU'} (${line.sku || idx + 1})`,
          quantity: baseQty,
          cost: c.toFixed(2),
          baseQty,
          sku: String(line.sku || '').trim() || undefined,
        });
      });
      if (lineDetails.length > 0) {
        const W = recomputeSplitBundleW(lineDetails);
        const sum = lineDetails.reduce((s, l) => s + parseFloat(l.cost) * l.quantity, 0);
        const perW = W > 0 ? sum / W : 0;
        onAddToCart([
          {
            offerId: offer.offerId,
            offerTier: offer.offerTier !== 'Range Offer' ? offer.offerTier : undefined,
            quantity: W,
            description: offerCardEditorialHeading(offer) || offer.offerId,
            cost: perW.toFixed(2),
            minQuantity: 1,
            lockQuantity: false,
            splitBundle: true,
            lineDetails,
          },
        ]);
      }
      return;
    }
    const costPerUnit = parseFloat(offer.expoChargeBackCost) || 0;
    onAddToCart([{
      offerId: offer.offerId,
      offerTier: offer.offerTier !== 'Range Offer' ? offer.offerTier : undefined,
      quantity: 1,
      description: offerCardEditorialHeading(offer) || offer.offerId,
      cost: costPerUnit.toFixed(2)
    }]);
  };

  const handleOfferStepChange = (offer: Offer, delta: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (delta === 0) return;
    const mode = String(offer.rules?.offerMode || '').toUpperCase();
    const allowLineIncrease = !!offer.rules?.allowLineIncrease;
    const isFixedLike = mode === 'FIXED' || (mode === 'SPLIT' && !allowLineIncrease);
    const lines = offer.items || [];
    if (lines.length === 0) return;

    if (isMixedChooseNOffer(offer.rules)) {
      const bundle = cartItems.find((c) => c.offerId === offer.offerId && c.chooseNBundle);
      if (delta > 0) {
        if (!bundle?.lineDetails?.length) {
          handleAddOfferFast(offer, e);
          return;
        }
        if (onSetChooseNPacks) {
          const w = recomputeChooseNPackCount(bundle.lineDetails);
          onSetChooseNPacks(offer.offerId, w + 1);
        }
        return;
      }
      if (delta < 0) {
        if (!bundle?.lineDetails?.length) return;
        const w = recomputeChooseNPackCount(bundle.lineDetails);
        if (w <= 1) {
          onClearOfferCartLines?.(offer.offerId);
          return;
        }
        if (onSetChooseNPacks) {
          onSetChooseNPacks(offer.offerId, w - 1);
        }
        return;
      }
    }

    if (delta > 0) {
      handleAddOfferFast(offer, e);
      return;
    }

    if (mode === 'SPLIT' && allowLineIncrease && onUpdateCartLineQuantity) {
      const linesWithBase = lines
        .map((line) => ({
          line,
          desc: String(line.description || ''),
          baseQty: Math.max(0, Number(line.baseQty) || 0),
        }))
        .filter((x) => x.baseQty > 0);

      if (linesWithBase.length > 0) {
        const states = linesWithBase
          .map((x) => ({ ...x, entry: getLineCartEntry(offer.offerId, x.desc, x.line.sku) }))
          .filter((x): x is typeof x & { entry: CartItem } => !!x.entry);

        if (states.length === linesWithBase.length) {
          const W = Math.min(...states.map(({ entry, baseQty }) => Math.floor(entry.quantity / baseQty)));
          const hasSurplus = states.some(({ entry, baseQty }) => entry.quantity > W * baseQty);

          if (hasSurplus) {
            states.forEach(({ entry, baseQty }) => {
              const target = W * baseQty;
              if (entry.quantity !== target) {
                onUpdateCartLineQuantity(offer.offerId, entry.description, target, 0);
              }
            });
            return;
          }

          const wNext = W - 1;
          if (wNext <= 0) {
            if (onClearOfferCartLines) {
              onClearOfferCartLines(offer.offerId);
            } else {
              states.forEach(({ entry }) => onRemoveCartLine?.(offer.offerId, entry.description));
            }
            return;
          }

          states.forEach(({ entry, baseQty }) => {
            const target = wNext * baseQty;
            if (entry.quantity !== target) {
              onUpdateCartLineQuantity(offer.offerId, entry.description, target, 0);
            }
          });
          return;
        }
      }
    }

    if (isFixedLike) {
      const minBundle = Math.max(1, Number(offer.rules?.minBundleQty) || 1);
      const bundleRow = cartItems.find((c) => c.offerId === offer.offerId && c.fixedBundle);
      if (bundleRow && onUpdateCartLineQuantity) {
        const nextQty = bundleRow.quantity - minBundle;
        if (nextQty <= 0) {
          if (onClearOfferCartLines) onClearOfferCartLines(offer.offerId);
          else onRemoveCartLine?.(offer.offerId, bundleRow.description);
        } else {
          onUpdateCartLineQuantity(offer.offerId, bundleRow.description, nextQty, 1);
        }
        return;
      }
    }

    lines.forEach((line, idx) => {
      const desc = String(line.description || '');
      const baseQty = Math.max(0, Number(line.baseQty) || 0);
      const entry = getLineCartEntry(offer.offerId, desc, line.sku);
      if (!entry) return;
      const step = Math.max(1, baseQty);
      const nextQty = entry.quantity - step;
      if (nextQty <= 0) {
        onRemoveCartLine?.(offer.offerId, entry.description);
      } else if (onUpdateCartLineQuantity) {
        const minForLine = isFixedLike ? 0 : 0;
        onUpdateCartLineQuantity(offer.offerId, entry.description, nextQty, minForLine);
      }
    });
  };

  const renderOfferCard = (offer: Offer, logoBrandOverride?: string) => {
    const brandForLogo = logoBrandOverride ?? offer.brand;
    const brandLogo = getBrandLogo(brandForLogo);
    const cardLogoSrc = offerCardLogoUrl(offer, brandLogo);
    const cardImageDefault = offerCardProductImageUrl(offer);
    const cardImagePromo = offerCardPromoImageUrl(offer);
    const canShowPromos = !!offer.showPromos && !!cardImagePromo;
    const showingPromoImage = canShowPromos && !!promoViewByOfferId[offer.offerId];
    const cardImage = showingPromoImage ? cardImagePromo : cardImageDefault;
    const orderedQuantity = getOrderedQuantity(offer.offerId);
    const offerUnits = getOfferOrderUnits(offer);
    const mode = String(offer.rules?.offerMode || '').toUpperCase();
    const fixedLikeCard = isFixedLikeOfferRules(offer.rules);
    const fixedBundleCount = fixedLikeCard ? offerUnits : 0;
    const canSplitInlineAdjust = mode === 'SPLIT' && !!offer.rules?.allowLineIncrease;
    const isChooseN = isMixedChooseNOffer(offer.rules);
    const minSelTorch = Math.max(0, Number(offer.rules?.minSelections) || 0);
    const maxSelTorch = Math.max(0, Number(offer.rules?.maxSelections) || 0);
    const chooseBundle = cartItems.find((c) => c.offerId === offer.offerId && c.chooseNBundle);
    const selectedTorchLines = isChooseN
      ? (chooseBundle?.lineDetails || []).filter((l) => l.quantity > 0).length
      : 0;
    const isArmorBrand = typeof offer.brand === 'string' && offer.brand.toLowerCase().includes('armor');
    const suggestForOffer = suggestByOfferId[String(offer.offerId || '').toUpperCase()];
    const priorYearQty = suggestForOffer?.sales;
    const suggestedSellQty = suggestForOffer?.suggest;
    const orderedExpoChargeBack = (() => {
      const rows = cartItems.filter((item) => item.offerId === offer.offerId);
      // Fixed-like offers must price from fixedBundle rows. Previously any split/chooseN row
      // for the same offerId was preferred via .find(), so a stray or legacy split line could
      // supply a partial lineDetails sum while the card still showed "Ordered" from the fixed row
      // — wrong sub-total (e.g. ~⅔ of true bundle expo when lineDetails covered 4 of 6 SKUs).
      if (fixedLikeCard) {
        const fixedRows = rows.filter((r) => r.fixedBundle);
        if (fixedRows.length > 0) {
          return fixedRows.reduce((s, r) => s + (parseFloat(r.cost || '0') || 0) * (r.quantity || 0), 0);
        }
      }
      const bundle = rows.find((r) => r.splitBundle || r.chooseNBundle);
      if (bundle?.lineDetails?.length) {
        return bundle.lineDetails.reduce((s, l) => s + parseFloat(l.cost || '0') * (l.quantity || 0), 0);
      }
      return rows.reduce((sum, item) => sum + (parseFloat(item.cost || '0') || 0) * (item.quantity || 0), 0);
    })();
    const displayExpoChargeBack =
      orderedQuantity > 0 ? orderedExpoChargeBack.toFixed(2) : offer.expoChargeBackCost;
    const cardMainHeading = offerCardEditorialHeading(offer);
    const cardSublineH2 = offerCardEditorialSubline(offer);
    const cardLabelForAlt = cardMainHeading || offer.offerId;

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
          {cardMainHeading ? <div className="offer-group">{cardMainHeading}</div> : null}
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
          <div className={`offer-product-image-container ${showingPromoImage ? 'offer-product-image-container--promo' : ''}`}>
            <img
              src={cardImage}
              alt={`${cardLabelForAlt} product`}
              className="offer-product-image"
            />
          </div>
        )}
        {(cardSublineH2 || canShowPromos) ? (
          <div className="offer-card-h2-row">
            {cardSublineH2 ? <h2 className="offer-card-h2">{cardSublineH2}</h2> : <span className="offer-card-h2-spacer" />}
            {canShowPromos && (
              <button
                type="button"
                className="offer-promos-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  setPromoViewByOfferId((prev) => ({ ...prev, [offer.offerId]: !prev[offer.offerId] }));
                }}
              >
                Promos
              </button>
            )}
          </div>
        ) : null}
        {offer.items && offer.items.length > 0 ? (
          <table className="offer-descriptions-table">
            <thead>
              <tr>
                <th>Item</th>
                <th>Qty</th>
              </tr>
            </thead>
            <tbody>
              {offer.items.map((line, idx) => {
                const desc = String(line.description || '');
                const baseQty = Math.max(0, Number(line.baseQty) || 0);
                const entry = getLineCartEntry(offer.offerId, desc, line.sku);
                const currentQty = fixedLikeCard
                  ? baseQty * (fixedBundleCount > 0 ? fixedBundleCount : 1)
                  : entry
                    ? entry.quantity
                    : isChooseN
                      ? 0
                      : baseQty;
                const maxPerTorch = Math.max(baseQty, Number(line.cartonQty) || 999);
                const showSplitInline = canSplitInlineAdjust && orderedQuantity > 0 && !!entry;
                const showChooseNInline = isChooseN && orderedQuantity > 0 && !!entry;
                const showChooseNAddLine =
                  isChooseN && orderedQuantity > 0 && !entry && selectedTorchLines < maxSelTorch && baseQty > 0;
                return (
                  <tr key={idx}>
                    <td>{desc}</td>
                    <td>
                      {showSplitInline ? (
                        <span className="line-qty-inline-controls mso-matrix-cell-control mso-matrix-cell-control-active">
                          <button
                            type="button"
                            className="line-qty-inline-btn mso-matrix-qty-step mso-matrix-qty-minus"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!entry || !onUpdateCartLineQuantity) return;
                              onUpdateCartLineQuantity(offer.offerId, entry.description, entry.quantity - 1, 0);
                            }}
                          >
                            -
                          </button>
                          <span className="mso-matrix-qty-value">{currentQty}</span>
                          <button
                            type="button"
                            className="line-qty-inline-btn mso-matrix-qty-step mso-matrix-qty-plus"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!entry || !onUpdateCartLineQuantity) return;
                              onUpdateCartLineQuantity(offer.offerId, entry.description, entry.quantity + 1, 0);
                            }}
                          >
                            +
                          </button>
                        </span>
                      ) : showChooseNInline ? (
                        <span className="line-qty-inline-controls mso-matrix-cell-control mso-matrix-cell-control-active">
                          <button
                            type="button"
                            className="line-qty-inline-btn mso-matrix-qty-step mso-matrix-qty-minus"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!entry) return;
                              const selectedTorchLinesCount = (chooseBundle?.lineDetails || []).filter(
                                (l) => (l.quantity || 0) > 0,
                              ).length;
                              if (entry.quantity <= baseQty) {
                                if (selectedTorchLinesCount <= minSelTorch) return;
                                onRemoveCartLine?.(offer.offerId, entry.description);
                                return;
                              }
                              onUpdateCartLineQuantity?.(offer.offerId, entry.description, entry.quantity - 1, 0);
                            }}
                          >
                            -
                          </button>
                          <span className="mso-matrix-qty-value">{currentQty}</span>
                          <button
                            type="button"
                            className="line-qty-inline-btn mso-matrix-qty-step mso-matrix-qty-plus"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!entry || !onUpdateCartLineQuantity) return;
                              if (entry.quantity >= maxPerTorch) return;
                              onUpdateCartLineQuantity(offer.offerId, entry.description, entry.quantity + 1, 0);
                            }}
                          >
                            +
                          </button>
                        </span>
                      ) : showChooseNAddLine ? (
                        <span className="line-qty-inline-controls mso-matrix-cell-control mso-matrix-cell-control-active">
                          <span className="mso-matrix-qty-value">0</span>
                          <button
                            type="button"
                            className="line-qty-inline-btn mso-matrix-qty-step mso-matrix-qty-plus"
                            onClick={(e) => {
                              e.stopPropagation();
                              const lineExpo = Number(line.expoTotalCost) || 0;
                              const lineCost = baseQty > 0 ? lineExpo / baseQty : lineExpo;
                              onAddToCart([
                                {
                                  offerId: offer.offerId,
                                  offerTier: offer.offerTier !== 'Range Offer' ? offer.offerTier : undefined,
                                  quantity: 1,
                                  description: offerCardEditorialHeading(offer) || offer.offerId,
                                  cost: Number.isFinite(lineCost) ? (lineCost * baseQty).toFixed(2) : '0.00',
                                  minQuantity: 1,
                                  lockQuantity: true,
                                  chooseNBundle: true,
                                  chooseNMinSel: minSelTorch,
                                  lineDetails: [
                                    {
                                      description: `${desc} (${line.sku || idx + 1})`,
                                      quantity: baseQty,
                                      cost: Number.isFinite(lineCost) ? lineCost.toFixed(2) : '0.00',
                                      baseQty,
                                      sku: String(line.sku || '').trim() || undefined,
                                    },
                                  ],
                                },
                              ]);
                            }}
                          >
                            +
                          </button>
                        </span>
                      ) : (
                        <span className="line-qty-value">{currentQty}</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : offer.descriptions && offer.descriptions.length > 0 && (
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
          {displayExpoChargeBack && displayExpoChargeBack !== '-' && (
            <div className="offer-cost">
              <span className="highlight-label">Expo Charge Back:</span>
              <span className="highlight-value">{formatTotalCost(displayExpoChargeBack)}</span>
            </div>
          )}
        </div>
        <div className={`offer-qty-row ${orderedQuantity > 0 ? 'offer-qty-row--ordered' : ''}`}>
          {shouldShowPriorYearSalesQty(priorYearQty) && (
            <div
              className="offer-prior-year-sales offer-prior-year-sales--beside-qty"
              role="status"
              aria-label={`2025 quantity ${formatPriorYearSalesQty(priorYearQty)} from your store sales report for this offer category`}
            >
              <span className="offer-inline-stat offer-inline-stat--lastyear">
                Last Year: 2025 {formatPriorYearSalesQty(priorYearQty)}
              </span>
            </div>
          )}
          <div className={`offer-quantity-controls ${offerUnits > 0 ? 'ordered' : ''}`}>
            {offerUnits > 0 && <span className="ordered-label">Ordered</span>}
            <button
              type="button"
              className="qty-btn qty-minus"
              onClick={(e) => handleOfferStepChange(offer, -1, e)}
              disabled={offerUnits <= 0}
            >
              -
            </button>
            <span className={`qty-display ${offerUnits > 0 ? 'qty-locked' : ''}`}>{offerUnits}</span>
            <button
              type="button"
              className="qty-btn qty-plus"
              onClick={(e) => handleOfferStepChange(offer, +1, e)}
            >
              +
            </button>
          </div>
          {shouldShowPriorYearSalesQty(suggestedSellQty) && (
            <div
              className="offer-suggest-sales offer-suggest-sales--beside-qty"
              role="status"
              aria-label={`Suggested quantity ${formatPriorYearSalesQty(suggestedSellQty)} for this offer category`}
            >
              <span className="offer-inline-stat offer-inline-stat--suggest">
                Suggest: {formatPriorYearSalesQty(suggestedSellQty)}
              </span>
            </div>
          )}
        </div>
        <div className="offer-card-actions">
          <button type="button" className="offer-action-small" onClick={(e) => handleViewDetails(offer.offerId, e)}>
            View Offer
          </button>
        </div>
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
        {showSalesDashboardButton && onOpenSalesDashboard ? (
          <button
            type="button"
            className="offers-fy25-btn"
            onClick={onOpenSalesDashboard}
          >
            View FY25 Store Sales
          </button>
        ) : null}
        {onOpenInsightsNavigation ? (
          <button
            type="button"
            className="offers-insights-btn"
            onClick={onOpenInsightsNavigation}
          >
            Energizer Insights
          </button>
        ) : null}
        <button 
          onClick={onGoToCart} 
          className={`next-button ${cartItemCount > 0 ? 'has-items' : ''}`}
        >
          {cartItemCount > 0 ? `Cart (${cartItemCount})` : '›'}
        </button>
      </div>

      <div className="offers-content">

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
          onAddToCart={onAddToCart}
          onClose={() => setSelectedOfferForModal(null)}
        />
      )}
    </div>
  );
};

export default OffersListing;
