import React, { useState, useEffect } from 'react';
import './App.css';
import UserForm from './components/UserForm';
import LoadingStep from './components/LoadingStep';
import StoreConfirm from './components/StoreConfirm';
import StoreSalesDashboard from './components/StoreSalesDashboard';
import OffersListing from './components/OffersListing';
import OfferDetail from './components/OfferDetail';
import OrderSummary from './components/OrderSummary';
import EmptyCartThankYou from './components/EmptyCartThankYou';
import MsoOfferMatrix, { msoStoreKey, type MsoMatrixCartItem } from './components/MsoOfferMatrix';
import TopNav from './components/TopNav';
import Dashboard from './components/Dashboard';
import Footer from './components/Footer';
import LandscapeHint from './components/LandscapeHint';
import LoginScreen from './components/LoginScreen';
import OrderForwardConfirm from './components/OrderForwardConfirm';
import PresentationPlayer from './features/presentation-killer/components/PresentationPlayer';
import InsightsNavigation from './features/presentation-killer/components/InsightsNavigation';
import { killerPresentationDeck } from './features/presentation-killer/data/killerPresentationDeck';
import SpinToWinPage from './features/spintowin/SpinToWinPage';
import axios from 'axios';
import { apiUrl, StoreData } from './api';
import { DEFAULT_DROP_MONTH, normalizeDropMonth } from './constants/dropMonths';
import { storeSales } from './content/modalCopy';
import {
  expandRetailCartItemsForSaveOrder,
  recomputeChooseNPackCount,
  recomputeSplitBundleW,
  type BundleLineDetail,
} from './utils/expandRetailOrderItems';

axios.defaults.withCredentials = true;

interface UserData {
  fullName: string;
  storeNo: string;
  position: string;
}

interface CartItem {
  offerId: string;
  offerTier?: string;
  quantity: number;
  description: string;
  cost: string;
  dropMonths?: string[];
  minQuantity?: number;
  lockQuantity?: boolean;
  /** One row per fixed / no-line-increase bundle; quantity = number of bundles shipped. */
  fixedBundle?: boolean;
  /** SPLIT + line increase: one row; quantity = synced bundle count W. */
  splitBundle?: boolean;
  /** MIXED CHOOSE_N: one row; pack count for drops from `recomputeChooseNPackCount(lineDetails)`. */
  chooseNBundle?: boolean;
  lineDetails?: BundleLineDetail[];
  /** Used when removing torch lines so the cart can enforce min selections. */
  chooseNMinSel?: number;
  /** MSO matrix: group line items per store for split POST */
  msoStoreKey?: string;
}

function padBundleDropMonths(prev: string[] | undefined, w: number): string[] {
  const out = [...(prev || [])];
  while (out.length < w) out.push(DEFAULT_DROP_MONTH);
  return out.slice(0, Math.max(0, w));
}

type AppStep =
  | 'login'
  | 'form'
  | 'loading'
  | 'store-confirm'
  | 'offers-listing'
  | 'offer-detail'
  | 'mso-matrix'
  | 'order-summary'
  | 'thankyou'
  | 'empty-cart-thankyou';

function App() {
  const forwardToken =
    typeof window !== 'undefined'
      ? (new URLSearchParams(window.location.search).get('forward') || '').trim()
      : '';
  const [userData, setUserData] = useState<UserData | null>(null);
  const [storeData, setStoreData] = useState<StoreData | null>(null);
  const [currentStep, setCurrentStep] = useState<AppStep>('login');
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [selectedOfferId, setSelectedOfferId] = useState<string | null>(null);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [printData, setPrintData] = useState<any>(null);
  const [showPresentation, setShowPresentation] = useState(false);
  const [showInsightsNavigation, setShowInsightsNavigation] = useState(false);
  const [showPostSpinThankYou, setShowPostSpinThankYou] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);
  const [showStoreSalesModal, setShowStoreSalesModal] = useState(false);
  const [storeHasSalesData, setStoreHasSalesData] = useState<boolean | null>(null);
  const [formBackHandler, setFormBackHandler] = useState<(() => void) | null>(null);
  /** MSO path: store picker → matrix → split orders (skips store confirm + presentation) */
  const [sessionFlow, setSessionFlow] = useState<'retail' | 'mso'>('retail');
  const [msoStores, setMsoStores] = useState<StoreData[]>([]);
  const [msoMatrixDraftItems, setMsoMatrixDraftItems] = useState<MsoMatrixCartItem[]>([]);

  // Extract rep name from energizer-style email: sarah.cussen@energizer.com → "Sarah Cussen"
  const repName = sessionEmail
    ? sessionEmail.split('@')[0].split(/[._-]/).map(s => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()).join(' ')
    : undefined;
  const repEmail = sessionEmail || undefined;

  useEffect(() => {
    let cancelled = false;
    axios
      .get(apiUrl('/api/auth/me'), { withCredentials: true })
      .then((res) => {
        if (cancelled) return;
        if (res.data?.authenticated && res.data?.email) {
          setSessionEmail(String(res.data.email));
          setCurrentStep((prev) => (prev === 'login' ? 'form' : prev));
        }
      })
      .catch(() => {
        // Intentionally silent: app will remain on login.
      })
      .finally(() => {
        if (!cancelled) setAuthChecked(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!storeData?.storeId?.trim()) {
      setStoreHasSalesData(null);
      return;
    }
    let cancelled = false;
    const sid = storeData.storeId.trim();
    axios
      .get(apiUrl(`/api/store-sales/${encodeURIComponent(sid)}`))
      .then((res) => {
        if (!cancelled) setStoreHasSalesData(!!res.data?.hasData);
      })
      .catch(() => {
        if (!cancelled) setStoreHasSalesData(false);
      });
    return () => {
      cancelled = true;
    };
  }, [storeData?.storeId]);

  const connectedDatasets = [
    'Products API',
    'Orders API',
    ...(sessionFlow === 'mso' && storeData?.msoGroup ? [`MSO · ${storeData.msoGroup}`] : []),
    ...(sessionFlow === 'mso' && msoStores.length > 1 ? [`${msoStores.length} stores`] : []),
    ...(storeData?.storeName ? [`Store: ${storeData.storeName}`] : []),
    ...(storeData?.banner ? [`Banner: ${storeData.banner}`] : []),
  ];

  const handleLoginSuccess = (email: string) => {
    setSessionEmail(email);
    setCurrentStep('form');
  };

  const handleLogout = () => {
    axios.post(apiUrl('/api/auth/logout'), {}, { withCredentials: true }).catch(() => undefined);
    setShowPresentation(false);
    setShowInsightsNavigation(false);
    setFormBackHandler(null);
    setUserData(null);
    setStoreData(null);
    setCartItems([]);
    setSelectedOfferId(null);
    setPrintData(null);
    setSessionEmail(null);
    setSessionFlow('retail');
    setMsoStores([]);
    setMsoMatrixDraftItems([]);
    setCurrentStep('login');
    setShowPostSpinThankYou(false);
  };

  const handleFormSubmit = (data: UserData, storeDataFromForm?: StoreData) => {
    setUserData(data);
    if (storeDataFromForm) {
      setStoreData(storeDataFromForm);
      setSessionFlow('retail');
      setMsoStores([]);
      setCurrentStep('store-confirm');
    } else {
      setCurrentStep('loading');
    }
  };

  const handleMsoStoresSubmit = (
    data: UserData,
    payload: { group: string; stores: StoreData[] }
  ) => {
    setUserData(data);
    setSessionFlow('mso');
    setMsoStores(payload.stores);
    setStoreData(payload.stores[0] ?? null);
    setShowPresentation(false);
    setCartItems([]);
    setMsoMatrixDraftItems([]);
    setSelectedOfferId(null);
    setCurrentStep('mso-matrix');
  };

  const handleLoadingComplete = (storeDataFromLoading?: StoreData) => {
    if (storeDataFromLoading) {
      setStoreData(storeDataFromLoading);
      setCurrentStep('store-confirm');
    } else {
      alert('Could not load store. Please try again.');
      setCurrentStep('form');
    }
  };

  const goToOffersAfterStoreConfirm = () => {
    setCurrentStep('offers-listing');
    setShowInsightsNavigation(true);
    setShowPresentation(false);
  };

  const handleStoreConfirmContinue = () => {
    goToOffersAfterStoreConfirm();
  };
  const handleStoreConfirmBack    = () => setCurrentStep('form');

  const handleSelectOffer = (offerId: string) => {
    setSelectedOfferId(offerId);
    setCurrentStep('offer-detail');
  };

  const handleBackFromOfferDetail = () => {
    setSelectedOfferId(null);
    setCurrentStep('offers-listing');
  };

  const handleAddToCart = (items: CartItem[]) => {
    const itemsWithDropMonths = items.map((item) => {
      const slots =
        item.chooseNBundle
          ? Math.max(1, recomputeChooseNPackCount(item.lineDetails || []))
          : Math.max(1, Number(item.quantity) || 1);
      return {
        ...item,
        dropMonths: item.dropMonths || Array(slots).fill(DEFAULT_DROP_MONTH),
      };
    });
    setCartItems((prev) => {
      const next = [...prev];
      for (const incoming of itemsWithDropMonths) {
        const splitMergeIdx = next.findIndex(
          (x) =>
            incoming.splitBundle &&
            x.splitBundle &&
            x.offerId === incoming.offerId &&
            (x.offerTier || '') === (incoming.offerTier || ''),
        );
        if (splitMergeIdx >= 0 && incoming.lineDetails?.length) {
          const existing = next[splitMergeIdx];
          const ex = existing.lineDetails || [];
          const inc = incoming.lineDetails;
          const merged: BundleLineDetail[] = ex.map((e, i) => ({
            ...e,
            quantity: e.quantity + (inc[i]?.quantity ?? 0),
          }));
          const newW = recomputeSplitBundleW(merged);
          next[splitMergeIdx] = {
            ...existing,
            lineDetails: merged,
            quantity: newW,
            dropMonths: padBundleDropMonths(existing.dropMonths, newW),
          };
          continue;
        }

        const chooseMergeIdx = next.findIndex((x) => incoming.chooseNBundle && x.chooseNBundle && x.offerId === incoming.offerId);
        if (chooseMergeIdx >= 0 && incoming.lineDetails?.length) {
          const existing = next[chooseMergeIdx];
          const merged = [...(existing.lineDetails || [])];
          for (const row of incoming.lineDetails) {
            const mi = merged.findIndex((m) => m.description === row.description);
            if (mi >= 0) merged[mi] = { ...merged[mi], quantity: merged[mi].quantity + row.quantity };
            else merged.push({ ...row });
          }
          const lineSum = merged.reduce((s, l) => s + parseFloat(l.cost || '0') * (l.quantity || 0), 0);
          const newW = Math.max(1, recomputeChooseNPackCount(merged));
          next[chooseMergeIdx] = {
            ...existing,
            lineDetails: merged,
            quantity: 1,
            cost: lineSum.toFixed(2),
            chooseNMinSel: existing.chooseNMinSel ?? incoming.chooseNMinSel,
            dropMonths: padBundleDropMonths(
              [...(existing.dropMonths || []), ...(incoming.dropMonths || [])],
              newW,
            ),
          };
          continue;
        }

        const fixedMergeIdx = next.findIndex(
          (x) =>
            incoming.fixedBundle &&
            x.fixedBundle &&
            x.offerId === incoming.offerId &&
            (x.offerTier || '') === (incoming.offerTier || '') &&
            (x.msoStoreKey || '') === (incoming.msoStoreKey || ''),
        );
        if (fixedMergeIdx >= 0) {
          const existing = next[fixedMergeIdx];
          const nextQty = existing.quantity + incoming.quantity;
          const existingPer = parseFloat(existing.cost || '0') || 0;
          const incomingPer = parseFloat(incoming.cost || '0') || 0;
          const blendedPer =
            nextQty > 0
              ? ((existingPer * existing.quantity + incomingPer * incoming.quantity) / nextQty).toFixed(2)
              : incoming.cost;
          next[fixedMergeIdx] = {
            ...existing,
            quantity: nextQty,
            cost: blendedPer,
            dropMonths: padBundleDropMonths(
              [...(existing.dropMonths || []), ...(incoming.dropMonths || [])],
              nextQty,
            ),
            minQuantity: Math.max(existing.minQuantity ?? 0, incoming.minQuantity ?? 0),
            lockQuantity: !!(existing.lockQuantity || incoming.lockQuantity),
            fixedBundle: true,
          };
          continue;
        }

        const idx = next.findIndex(
          (x) =>
            !x.fixedBundle &&
            !incoming.fixedBundle &&
            x.offerId === incoming.offerId &&
            (x.offerTier || '') === (incoming.offerTier || '') &&
            x.description === incoming.description &&
            x.cost === incoming.cost &&
            !x.splitBundle &&
            !x.chooseNBundle &&
            !incoming.splitBundle &&
            !incoming.chooseNBundle,
        );
        if (idx >= 0) {
          const existing = next[idx];
          next[idx] = {
            ...existing,
            quantity: existing.quantity + incoming.quantity,
            dropMonths: [...(existing.dropMonths || []), ...(incoming.dropMonths || [])],
            minQuantity: Math.max(existing.minQuantity ?? 0, incoming.minQuantity ?? 0),
            lockQuantity: !!(existing.lockQuantity || incoming.lockQuantity),
            fixedBundle: !!(existing.fixedBundle || incoming.fixedBundle),
          };
        } else {
          next.push(incoming);
        }
      }
      return next;
    });
    setCurrentStep('offers-listing');
    setSelectedOfferId(null);
  };

  const handleGoToCart = () => {
    if (sessionFlow === 'mso' && cartItems.length === 0) {
      // MSO should remain on the matrix when nothing is selected.
      setCurrentStep('mso-matrix');
      return;
    }
    setCurrentStep(cartItems.length > 0 ? 'order-summary' : 'empty-cart-thankyou');
  };

  const handleUpdateQuantity = (index: number, quantity: number) => {
    setCartItems((prev) => {
      const updated = [...prev];
      const currentItem = updated[index];
      if (!currentItem) return prev;

      if (currentItem.splitBundle) {
        const minW = Math.max(1, currentItem.minQuantity ?? 1);
        let newW = quantity;
        if (newW < minW) newW = minW;
        if (newW <= 0) {
          return prev.filter((_, i) => i !== index);
        }
        const details = (currentItem.lineDetails || []).map((d) => {
          const b = Math.max(1, Number(d.baseQty) || 1);
          return { ...d, quantity: newW * b };
        });
        const currentDropMonths = currentItem.dropMonths || Array(currentItem.quantity).fill(DEFAULT_DROP_MONTH);
        updated[index] = {
          ...currentItem,
          quantity: newW,
          lineDetails: details,
          dropMonths: padBundleDropMonths(currentDropMonths, newW),
        };
        return updated;
      }

      if (currentItem.chooseNBundle) {
        if (quantity <= 0) {
          return prev.filter((_, i) => i !== index);
        }
        const minW = Math.max(1, currentItem.minQuantity ?? 1);
        const w = Math.max(minW, Math.floor(quantity));
        const details = (currentItem.lineDetails || []).map((d) => {
          const b = Math.max(1, Number(d.baseQty) || 1);
          if ((Number(d.quantity) || 0) <= 0) return d;
          return { ...d, quantity: w * b };
        });
        const lineSum = details.reduce((s, l) => s + parseFloat(l.cost || '0') * (l.quantity || 0), 0);
        const currentDropMonths = currentItem.dropMonths || [];
        updated[index] = {
          ...currentItem,
          quantity: 1,
          lineDetails: details,
          cost: lineSum.toFixed(2),
          dropMonths: padBundleDropMonths(currentDropMonths, w),
        };
        return updated;
      }

      if (currentItem.lockQuantity && !currentItem.fixedBundle) return prev;
      // Standard rows can drop to zero (remove line). Fixed bundles also allow zero from Order
      // Summary so users can remove a pre-pack without clearing the full cart.
      const minQty = Math.max(0, currentItem.fixedBundle ? 0 : (currentItem.minQuantity ?? 0));
      let q = quantity;
      if (q < minQty) q = minQty;
      if (q <= 0) {
        return prev.filter((_, i) => i !== index);
      }
      const currentDropMonths = currentItem.dropMonths || Array(currentItem.quantity).fill(DEFAULT_DROP_MONTH);
      if (q > currentItem.quantity) {
        const newDropMonths = [...currentDropMonths];
        for (let i = currentItem.quantity; i < q; i++) newDropMonths.push(DEFAULT_DROP_MONTH);
        updated[index].dropMonths = newDropMonths;
      } else {
        updated[index].dropMonths = currentDropMonths.slice(0, q);
      }
      updated[index].quantity = q;
      return updated;
    });
  };

  const handleClearOfferCartLines = (offerId: string) => {
    setCartItems((prev) => prev.filter((item) => item.offerId !== offerId));
  };

  /** Retail listing: bump CHOOSE_N pack count in one state update (avoids stale reads from per-line updates). */
  const handleSetChooseNPacks = (offerId: string, targetW: number) => {
    if (targetW <= 0) {
      setCartItems((prev) => prev.filter((item) => !(item.offerId === offerId && item.chooseNBundle)));
      return;
    }
    setCartItems((prev) => {
      const idx = prev.findIndex((item) => item.offerId === offerId && item.chooseNBundle);
      if (idx < 0) return prev;
      const current = prev[idx];
      const minW = Math.max(1, current.minQuantity ?? 1);
      const w = Math.max(minW, Math.floor(targetW));
      const details = (current.lineDetails || []).map((d) => {
        const b = Math.max(1, Number(d.baseQty) || 1);
        if ((Number(d.quantity) || 0) <= 0) return d;
        return { ...d, quantity: w * b };
      });
      const lineSum = details.reduce((s, l) => s + parseFloat(l.cost || '0') * (l.quantity || 0), 0);
      const next = [...prev];
      next[idx] = {
        ...current,
        quantity: 1,
        lineDetails: details,
        cost: lineSum.toFixed(2),
        dropMonths: padBundleDropMonths(current.dropMonths, w),
      };
      return next;
    });
  };

  const handleUpdateCartLineQuantity = (
    offerId: string,
    description: string,
    quantity: number,
    minQuantity = 0
  ) => {
    setCartItems((prev) => {
      const bundleIdx = prev.findIndex(
        (item) =>
          item.offerId === offerId &&
          (item.splitBundle || item.chooseNBundle) &&
          item.lineDetails?.some((d) => d.description === description),
      );
      if (bundleIdx >= 0) {
        const updated = [...prev];
        const current = updated[bundleIdx];
        const details = [...(current.lineDetails || [])];
        const di = details.findIndex((d) => d.description === description);
        if (di < 0) return prev;
        const base = Math.max(1, Number(details[di].baseQty) || 1);
        const W = Math.max(1, Number(current.quantity) || 1);
        const floorSync = W * base;
        // Allow lowering a line below the current synced floor when the caller is reducing bundle count
        // (target qty < W×base). Surplus trims pass target === W×base so the usual floor still applies.
        const minLine = current.splitBundle
          ? quantity < floorSync
            ? quantity
            : floorSync
          : Math.max(base, minQuantity);
        const nextLineQty = Math.max(minLine, quantity);
        if (current.chooseNBundle && nextLineQty <= 0) {
          const rest = details.filter((_, i) => i !== di);
          const minSel = Math.max(0, current.chooseNMinSel ?? 0);
          const active = rest.filter((l) => l.quantity > 0).length;
          if (active < minSel) {
            return prev.filter((_, i) => i !== bundleIdx);
          }
          details.splice(di, 1);
          const lineSum = details.reduce((s, l) => s + parseFloat(l.cost || '0') * (l.quantity || 0), 0);
          const newWAfterSplice = Math.max(1, recomputeChooseNPackCount(details));
          updated[bundleIdx] = {
            ...current,
            lineDetails: details,
            cost: lineSum.toFixed(2),
            dropMonths: padBundleDropMonths(current.dropMonths, newWAfterSplice),
          };
          return updated;
        }
        details[di] = { ...details[di], quantity: nextLineQty };
        if (current.splitBundle) {
          const newW = recomputeSplitBundleW(details);
          if (newW <= 0) {
            return prev.filter((_, i) => i !== bundleIdx);
          }
          updated[bundleIdx] = {
            ...current,
            lineDetails: details,
            quantity: newW,
            dropMonths: padBundleDropMonths(current.dropMonths, newW),
          };
          return updated;
        }
        const lineSum = details.reduce((s, l) => s + parseFloat(l.cost || '0') * (l.quantity || 0), 0);
        const newW = Math.max(1, recomputeChooseNPackCount(details));
        updated[bundleIdx] = {
          ...current,
          lineDetails: details,
          quantity: 1,
          cost: lineSum.toFixed(2),
          dropMonths: padBundleDropMonths(current.dropMonths, newW),
        };
        return updated;
      }

      const idx = prev.findIndex((item) => item.offerId === offerId && item.description === description);
      if (idx < 0) return prev;
      const updated = [...prev];
      const current = updated[idx];
      // Locked rows (fixed bundles) can be reduced by card-level "-" but not increased manually.
      if (current.lockQuantity && !current.fixedBundle && quantity >= current.quantity) return prev;
      const minQty = Math.max(0, minQuantity, current.minQuantity ?? 0);
      const nextQty = Math.max(minQty, quantity);
      if (nextQty <= 0) {
        return prev.filter((_, i) => i !== idx);
      }
      const currentDropMonths = current.dropMonths || Array(current.quantity).fill(DEFAULT_DROP_MONTH);
      if (nextQty > current.quantity) {
        const nextMonths = [...currentDropMonths];
        for (let i = current.quantity; i < nextQty; i++) nextMonths.push(DEFAULT_DROP_MONTH);
        updated[idx] = { ...current, quantity: nextQty, dropMonths: nextMonths };
      } else if (nextQty < current.quantity) {
        updated[idx] = { ...current, quantity: nextQty, dropMonths: currentDropMonths.slice(0, nextQty) };
      }
      return updated;
    });
  };

  const handleRemoveCartLine = (offerId: string, description: string) => {
    setCartItems((prev) => {
      const bidx = prev.findIndex(
        (item) =>
          item.offerId === offerId &&
          (item.chooseNBundle || item.splitBundle) &&
          item.lineDetails?.some((d) => d.description === description),
      );
      if (bidx >= 0) {
        const row = prev[bidx];
        const minSel = Math.max(0, row.chooseNMinSel ?? 0);
        const details = (row.lineDetails || []).filter((d) => d.description !== description);
        const active = details.filter((l) => l.quantity > 0).length;
        if (row.chooseNBundle && active < minSel) {
          return prev.filter((_, i) => i !== bidx);
        }
        if (details.length === 0 || (row.chooseNBundle && active === 0)) {
          return prev.filter((_, i) => i !== bidx);
        }
        const lineSum = details.reduce((s, l) => s + parseFloat(l.cost || '0') * (l.quantity || 0), 0);
        const next = [...prev];
        if (row.splitBundle) {
          const newW = recomputeSplitBundleW(details);
          if (newW <= 0 || !details.length) {
            return prev.filter((_, i) => i !== bidx);
          }
          next[bidx] = {
            ...row,
            lineDetails: details,
            quantity: newW,
            dropMonths: padBundleDropMonths(row.dropMonths, newW),
          };
        } else {
          const newW = Math.max(1, recomputeChooseNPackCount(details));
          next[bidx] = {
            ...row,
            lineDetails: details,
            quantity: 1,
            cost: lineSum.toFixed(2),
            dropMonths: padBundleDropMonths(row.dropMonths, newW),
          };
        }
        return next;
      }
      return prev.filter((item) => !(item.offerId === offerId && item.description === description));
    });
  };

  const handleRemoveItem = (index: number) => {
    setCartItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpdateDropMonth = (index: number, unitIndex: number, dropMonth: string) => {
    setCartItems((prev) => {
      const updated = [...prev];
      const currentItem = updated[index];
      if (!currentItem) return prev;
      const wNeeded = currentItem.chooseNBundle
        ? Math.max(1, recomputeChooseNPackCount(currentItem.lineDetails || []))
        : Math.max(1, Number(currentItem.quantity) || 1);
      const base = padBundleDropMonths(currentItem.dropMonths, wNeeded);
      const newDropMonths = [...base];
      newDropMonths[unitIndex] = dropMonth;
      updated[index] = { ...currentItem, dropMonths: newDropMonths };
      return updated;
    });
  };

  const orderPayloadItem = (it: CartItem) => ({
    offerId: it.offerId,
    offerTier: it.offerTier,
    quantity: it.quantity,
    description: it.description,
    cost: it.cost,
    dropMonths: it.dropMonths?.map((m) => normalizeDropMonth(m)),
  });

  const handleOrderSubmit = async (data: { position: string; purchaseOrder?: string; email: string }) => {
    if (!userData || !storeData) return;

    const postOrder = async (orderData: Record<string, unknown>) => {
      await axios.post(apiUrl('/api/save-order'), orderData);
    };

    try {
      if (sessionFlow === 'mso' && msoStores.length > 0) {
        const offersRes = await axios.get(apiUrl('/api/offers'));
        const offers = Array.isArray(offersRes.data) ? offersRes.data : [];
        let lastPrint: Record<string, unknown> | null = null;
        for (const store of msoStores) {
          const key = msoStoreKey(store);
          const slice = cartItems.filter((i) => i.msoStoreKey === key);
          if (slice.length === 0) continue;
          const exploded = expandRetailCartItemsForSaveOrder(slice, offers);
          const items = exploded.map((it) => ({
            offerId: it.offerId,
            offerTier: it.offerTier,
            quantity: it.quantity,
            description: it.description,
            cost: it.cost,
            dropMonths: it.dropMonths?.map((m) => normalizeDropMonth(m)),
          }));
          const totalValue = exploded
            .reduce((sum, item) => sum + parseFloat(item.cost || '0') * (item.quantity || 0), 0)
            .toFixed(2);
          const orderData = {
            userName: userData.fullName,
            storeNumber: store.storeNo,
            storeName: store.storeName,
            banner: store.banner,
            position: data.position,
            purchaseOrder: data.purchaseOrder || '',
            email: data.email,
            storeCode: (store.storeId || '').trim(),
            repEmail: repEmail || '',
            items,
            totalValue,
          };
          await postOrder(orderData);
          lastPrint = orderData;
        }
        setPrintData(lastPrint);
      } else {
        const offersRes = await axios.get(apiUrl('/api/offers'));
        const offers = Array.isArray(offersRes.data) ? offersRes.data : [];
        const exploded = expandRetailCartItemsForSaveOrder(cartItems, offers);
        const items = exploded.map((it) => ({
          offerId: it.offerId,
          offerTier: it.offerTier,
          quantity: it.quantity,
          description: it.description,
          cost: it.cost,
          dropMonths: it.dropMonths?.map((m) => normalizeDropMonth(m)),
        }));
        const totalValue = exploded
          .reduce((sum, item) => sum + parseFloat(item.cost || '0') * (item.quantity || 0), 0)
          .toFixed(2);
        const orderData = {
          userName: userData.fullName,
          storeNumber: userData.storeNo,
          storeName: storeData.storeName,
          banner: storeData.banner,
          position: data.position,
          purchaseOrder: data.purchaseOrder || '',
          email: data.email,
          storeCode: (storeData.storeId || '').trim(),
          repEmail: repEmail || '',
          items,
          totalValue,
        };
        await postOrder(orderData);
        setPrintData(orderData);
      }
    } catch (error) {
      console.error('Error saving order:', error);
    }
    setCurrentStep('thankyou');
    setShowPostSpinThankYou(false);
  };

  const handleThankYouComplete = () => {
    setUserData(null);
    setStoreData(null);
    setCartItems([]);
    setSelectedOfferId(null);
    setPrintData(null);
    setSessionFlow('retail');
    setMsoStores([]);
    setMsoMatrixDraftItems([]);
    setCurrentStep('form');
    setShowPostSpinThankYou(false);
  };

  useEffect(() => {
    if (!(currentStep === 'thankyou' && showPostSpinThankYou)) return;
    const timeoutId = window.setTimeout(() => {
      handleThankYouComplete();
    }, 2200);
    return () => window.clearTimeout(timeoutId);
  }, [currentStep, showPostSpinThankYou]);

  const handleBackFromOrderSummary = () =>
    setCurrentStep(sessionFlow === 'mso' ? 'mso-matrix' : 'offers-listing');

  const handleBackFromMsoMatrix = () => {
    setCurrentStep('form');
    setMsoStores([]);
    setCartItems([]);
    setMsoMatrixDraftItems([]);
    setSessionFlow('retail');
  };

  const handleMsoMatrixCheckout = (items: MsoMatrixCartItem[]) => {
    if (!items || items.length === 0) {
      // Defensive guard: avoid rendering empty checkout states in MSO flow.
      setCartItems([]);
      setMsoMatrixDraftItems([]);
      setCurrentStep('mso-matrix');
      return;
    }
    const itemsWithDropMonths = items.map((item) => {
      const W =
        item.fixedBundle || item.splitBundle
          ? Math.max(1, Number(item.quantity) || 1)
          : item.chooseNBundle
            ? Math.max(1, recomputeChooseNPackCount(item.lineDetails || []))
            : Math.max(1, Number(item.quantity) || 1);
      const dropMonths = padBundleDropMonths(item.dropMonths, W);
      return { ...item, dropMonths };
    });
    setCartItems(itemsWithDropMonths as CartItem[]);
    setMsoMatrixDraftItems(itemsWithDropMonths);
    setCurrentStep('order-summary');
  };

  const handleOpenInsightsNavigation = () => {
    setShowInsightsNavigation(true);
    setShowPresentation(false);
  };
  const handlePresentationClose = () => setShowPresentation(false);
  const handlePresentationCTA = (action: string) => {
    setShowPresentation(false);
    if (action === 'offers') setCurrentStep('offers-listing');
  };

  // Centralised back handler — drives the footer back button
  const getBackHandler = (): (() => void) | null => {
    switch (currentStep) {
      case 'login':               return null;
      case 'form':                return formBackHandler;
      case 'store-confirm':       return handleStoreConfirmBack;
      case 'loading':             return () => setCurrentStep('form');
      case 'offers-listing':      return () => setCurrentStep('store-confirm');
      case 'mso-matrix':          return handleBackFromMsoMatrix;
      case 'offer-detail':        return handleBackFromOfferDetail;
      case 'order-summary':       return handleBackFromOrderSummary;
      case 'empty-cart-thankyou':
        return () =>
          sessionFlow === 'mso' ? setCurrentStep('mso-matrix') : setCurrentStep('offers-listing');
      default:                    return null;
    }
  };

  const handleEmptyCartThank = async () => {
    if (!userData || !storeData) return;
    try {
      await axios.post(apiUrl('/api/save-order'), {
        userName: userData.fullName,
        storeNumber: userData.storeNo,
        storeName: storeData.storeName,
        banner: storeData.banner,
        position: '',
        purchaseOrder: '',
        email: '',
        storeCode: (storeData.storeId || '').trim(),
        items: [],
        totalValue: '0.00',
      });
    } catch (error) {
      console.error('Error saving order:', error);
    }
    handleThankYouComplete();
  };

  return (
    <div className="App with-nav">
      {forwardToken ? (
        <OrderForwardConfirm token={forwardToken} />
      ) : (
        <>

      {currentStep !== 'login' && (
        <TopNav
          userName={repName}
          userEmail={repEmail}
          connectedDatasets={connectedDatasets}
          onLogout={handleLogout}
          onDashboard={() => setShowDashboard(true)}
        />
      )}

      {showDashboard && (
        <Dashboard repEmail={repEmail} onClose={() => setShowDashboard(false)} />
      )}

      {showStoreSalesModal && userData && storeData && (
        <div
          className="store-sales-modal-overlay"
          role="presentation"
          onClick={() => setShowStoreSalesModal(false)}
        >
          <div
            className="store-sales-modal-panel"
            role="dialog"
            aria-modal="true"
            aria-label={storeSales.overlayAriaLabel}
            onClick={(e) => e.stopPropagation()}
          >
            <StoreSalesDashboard
              variant="modal"
              userData={userData}
              storeData={storeData}
              onBack={() => setShowStoreSalesModal(false)}
              onContinue={() => {
                setShowStoreSalesModal(false);
                goToOffersAfterStoreConfirm();
              }}
            />
          </div>
        </div>
      )}

      {currentStep === 'login' && authChecked && <LoginScreen onSuccess={handleLoginSuccess} />}

      {currentStep === 'form' && (
        <UserForm
          initialFullName={userData?.fullName ?? ''}
          onSubmit={handleFormSubmit}
          onMsoStoresSubmit={handleMsoStoresSubmit}
          onBackChange={(h) => setFormBackHandler(() => h ?? null)}
        />
      )}

      {currentStep === 'loading' && userData && (
        <LoadingStep userData={userData} onComplete={handleLoadingComplete} onBack={() => setCurrentStep('form')} />
      )}

      {currentStep === 'store-confirm' && userData && storeData && (
        <StoreConfirm
          userData={userData}
          storeData={storeData}
          onContinue={handleStoreConfirmContinue}
          onBack={handleStoreConfirmBack}
        />
      )}

      {currentStep === 'offers-listing' && userData && storeData && (
        <OffersListing
          userData={userData}
          storeData={storeData}
          onSelectOffer={handleSelectOffer}
          onBack={() => setCurrentStep('store-confirm')}
          onGoToCart={handleGoToCart}
          cartItemCount={cartItems.length}
          cartItems={cartItems}
          onAddToCart={handleAddToCart}
          onUpdateCartLineQuantity={handleUpdateCartLineQuantity}
          onRemoveCartLine={handleRemoveCartLine}
          onClearOfferCartLines={handleClearOfferCartLines}
          onSetChooseNPacks={handleSetChooseNPacks}
          showSalesDashboardButton={storeHasSalesData === true}
          onOpenSalesDashboard={() => setShowStoreSalesModal(true)}
          onOpenInsightsNavigation={handleOpenInsightsNavigation}
        />
      )}

      {currentStep === 'mso-matrix' && storeData?.msoGroup && msoStores.length > 0 && (
        <MsoOfferMatrix
          msoGroup={storeData.msoGroup}
          stores={msoStores}
          initialItems={
            ((cartItems.filter((item) => !!item.msoStoreKey) as MsoMatrixCartItem[]).length > 0
              ? (cartItems.filter((item) => !!item.msoStoreKey) as MsoMatrixCartItem[])
              : msoMatrixDraftItems)
          }
          onDraftChange={setMsoMatrixDraftItems}
          onProceedToCheckout={handleMsoMatrixCheckout}
        />
      )}

      {currentStep === 'offer-detail' && userData && storeData && selectedOfferId && (
        <OfferDetail
          offerId={selectedOfferId}
          userData={userData}
          storeData={storeData}
          onBack={handleBackFromOfferDetail}
          onAddToCart={handleAddToCart}
        />
      )}

      {currentStep === 'order-summary' && userData && storeData && (
        <OrderSummary
          userData={userData}
          storeData={storeData}
          cartItems={cartItems}
          msoOrder={sessionFlow === 'mso'}
          msoStoreCount={sessionFlow === 'mso' ? msoStores.length : undefined}
          onUpdateQuantity={handleUpdateQuantity}
          onUpdateDropMonth={handleUpdateDropMonth}
          onRemoveItem={handleRemoveItem}
          onBack={handleBackFromOrderSummary}
          onSubmit={handleOrderSubmit}
        />
      )}

      {currentStep === 'thankyou' && userData && (
        showPostSpinThankYou ? (
          <UserForm
            onSubmit={handleThankYouComplete}
            onThankYouComplete={handleThankYouComplete}
            showThankYou={true}
            userData={userData}
            printData={printData}
            thankYouMsoGroup={sessionFlow === 'mso' ? storeData?.msoGroup?.trim() || undefined : undefined}
          />
        ) : (
          <SpinToWinPage
            onClaimPrize={() => setShowPostSpinThankYou(true)}
            spinSessionMeta={{
              sessionKind: sessionFlow === 'mso' ? 'mso' : 'retail',
              repEmail: sessionEmail || undefined,
              userName: userData.fullName,
              storeName: sessionFlow === 'retail' ? storeData?.storeName : undefined,
              msoGroup: sessionFlow === 'mso' ? storeData?.msoGroup?.trim() || undefined : undefined,
              msoStoreCount: sessionFlow === 'mso' ? msoStores.length : undefined,
              storeId: storeData?.storeId,
            }}
          />
        )
      )}

      {currentStep === 'empty-cart-thankyou' && userData && storeData && (
        <EmptyCartThankYou
          userData={userData}
          storeData={storeData}
          onBack={() =>
            sessionFlow === 'mso' ? setCurrentStep('mso-matrix') : setCurrentStep('offers-listing')
          }
          onThank={handleEmptyCartThank}
        />
      )}

      <Footer onBack={getBackHandler()} hideStatusOrb={currentStep === 'login'} />

      {currentStep === 'store-confirm' && <LandscapeHint />}

      {showInsightsNavigation && (
        <InsightsNavigation
          onClose={() => setShowInsightsNavigation(false)}
          onOpenChristmasInsights={() => {
            setShowInsightsNavigation(false);
            setShowPresentation(true);
          }}
          onContinueToSales={() => setShowInsightsNavigation(false)}
        />
      )}

      {/* ── Presentation Player overlay ─────────────────────────── */}
      {showPresentation && (
        <PresentationPlayer
          deck={killerPresentationDeck}
          onClose={handlePresentationClose}
          onCTAAction={handlePresentationCTA}
        />
      )}
        </>
      )}

    </div>
  );
}

export default App;
