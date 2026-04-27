import React, { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { apiUrl, StoreData } from '../api';
import OfferDetailModal from './OfferDetailModal';
import { sortOffersByDisplayOrder } from '../config/offersDisplay';
import {
  formatPriorYearSalesQty,
  shouldShowPriorYearSalesQty,
} from '../utils/priorYearSales';
import { offerCardEditorialHeading, offerMatrixColumnMedia } from '../utils/offerMedia';
import { chooseNMaxUnitsForLine, isMixedChooseNOffer } from '../utils/mixedChooseN';
import {
  buildMsoMatrixCartItemFromCell,
  chooseNMatrixAddNewLine,
  chooseNMatrixBumpExistingLine,
  chooseNMatrixLineDescription,
  getEffectiveChooseNMatrixRow,
  isMsoSplitLineIncreaseOffer,
  msoMatrixCellCommittedExpo,
  updateSplitBundleLineQuantity,
  type MsoMatrixCartItem,
  type MsoMatrixOffer,
} from '../utils/msoMatrixCartFromCell';
import './MsoOfferMatrix.css';

export type { MsoMatrixCartItem };

type CellBundleMap = Record<string, Record<string, MsoMatrixCartItem | null>>;

function msoCommittedExpoForCell(
  offer: MsoMatrixOffer,
  q: number,
  sk: string,
  bundles: CellBundleMap,
): number {
  const cell = bundles[sk]?.[offer.offerId];
  if (cell && cell.quantity > 0) {
    if (cell.splitBundle || cell.chooseNBundle) {
      return (cell.lineDetails || []).reduce((s, l) => s + parseFloat(l.cost) * (l.quantity || 0), 0);
    }
    return parseFloat(cell.cost || '0') * (cell.quantity || 0);
  }
  return msoMatrixCellCommittedExpo(offer, q);
}

type MsoModalCtx = { offerId: string; storeKey?: string; storeName?: string };

interface DescriptionItem {
  description: string;
  qty: string;
}

type Offer = MsoMatrixOffer & {
  offerGroup: string;
  brand: string;
  range: string;
  minOrderValue: string;
  save: string;
  descriptions: DescriptionItem[];
  logoUrl?: string;
  heroUrl?: string;
  productImageUrl?: string;
  logo?: string | null;
  hero?: string | null;
  productImage?: string | null;
};

const normalizeOffers = (data: unknown): Offer[] => {
  if (!Array.isArray(data)) return [];
  return data
    .filter((item: unknown) => item && typeof item === 'object')
    .map((item: Record<string, unknown>) => ({
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
      logoUrl: typeof item.logoUrl === 'string' ? item.logoUrl.trim() : '',
      heroUrl: typeof item.heroUrl === 'string' ? item.heroUrl.trim() : '',
      productImageUrl: typeof item.productImageUrl === 'string' ? item.productImageUrl.trim() : '',
      logo: item.logo === null ? null : typeof item.logo === 'string' ? item.logo : undefined,
      hero: item.hero === null ? null : typeof item.hero === 'string' ? item.hero : undefined,
      productImage:
        item.productImage === null ? null : typeof item.productImage === 'string' ? item.productImage : undefined,
      modalTitle: typeof item.modalTitle === 'string' ? item.modalTitle.trim() : '',
      h1: typeof item.h1 === 'string' ? item.h1.trim() : '',
      rules: item.rules && typeof item.rules === 'object' ? (item.rules as Offer['rules']) : undefined,
      items: Array.isArray(item.items) ? (item.items as Offer['items']) : [],
    }))
    .filter((offer: Offer) => offer.offerId.length > 0);
};

/** Stable key for MSO cart / grouping — matches App msoStoreKey */
export function msoStoreKey(s: StoreData): string {
  return `${(s.storeId || '').trim()}|${s.storeName}`;
}

interface MsoOfferMatrixProps {
  msoGroup: string;
  stores: StoreData[];
  onProceedToCheckout: (items: MsoMatrixCartItem[]) => void;
}

interface StoreSuggestOffer {
  offerId: string;
  sales: number;
  suggest: number;
}

const MAX_QTY = 99;

const MsoOfferMatrix: React.FC<MsoOfferMatrixProps> = ({ msoGroup, stores, onProceedToCheckout }) => {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  /** storeKey -> offerId -> qty */
  const [qty, setQty] = useState<Record<string, Record<string, number>>>({});
  /** storeKey -> offerId -> {sales,suggest} from GET /api/store-suggest */
  const [storeSuggestByKey, setStoreSuggestByKey] = useState<
    Record<string, Record<string, StoreSuggestOffer> | null>
  >({});
  /** Per-cell cart row when modal or inline split edits override proportional matrix qty. */
  const [cellBundles, setCellBundles] = useState<CellBundleMap>({});
  const [modalCtx, setModalCtx] = useState<MsoModalCtx | null>(null);

  useEffect(() => {
    setLoading(true);
    setError('');
    axios
      .get(apiUrl('/api/offers'))
      .then((res) => {
        const raw = normalizeOffers(res.data);
        const byId = new Map<string, Offer>();
        for (const o of raw) {
          if (!byId.has(o.offerId)) byId.set(o.offerId, o);
        }
        const cols = sortOffersByDisplayOrder(Array.from(byId.values()));
        setOffers(cols);
      })
      .catch(() => {
        setOffers([]);
        setError('Could not load offers.');
      })
      .finally(() => setLoading(false));
  }, []);

  /** Load suggest.csv mapped values per store (GET /api/store-suggest/:storeId). */
  useEffect(() => {
    if (stores.length === 0) {
      setStoreSuggestByKey({});
      return;
    }
    let cancelled = false;

    const resolveStoreId = async (store: StoreData): Promise<string> => {
      let sid = (store.storeId || '').trim();
      if (sid) return sid;
      try {
        const r = await axios.get(apiUrl('/api/mcash-store-id'), {
          params: { name: (store.storeName || '').trim(), storeNo: (store.storeNo || '').trim() },
        });
        sid = String(r.data?.storeId || '').trim();
      } catch {
        sid = '';
      }
      return sid;
    };

    (async () => {
      const pairs = await Promise.all(
        stores.map(async (store) => {
          const sk = msoStoreKey(store);
          const sid = await resolveStoreId(store);
          if (!sid) return [sk, null] as const;
          try {
            const res = await axios.get(apiUrl(`/api/store-suggest/${encodeURIComponent(sid)}`));
            if (!res.data?.hasData || !Array.isArray(res.data.offers)) return [sk, null] as const;
            const mapped: Record<string, StoreSuggestOffer> = {};
            res.data.offers.forEach((it: { offerId?: string; sales?: number; suggest?: number }) => {
              const oid = String(it.offerId || '').toUpperCase();
              if (!oid) return;
              mapped[oid] = {
                offerId: oid,
                sales: typeof it.sales === 'number' ? it.sales : parseFloat(String(it.sales)) || 0,
                suggest: typeof it.suggest === 'number' ? it.suggest : parseFloat(String(it.suggest)) || 0,
              };
            });
            return [sk, mapped] as const;
          } catch {
            return [sk, null] as const;
          }
        })
      );
      if (cancelled) return;
      setStoreSuggestByKey(Object.fromEntries(pairs) as Record<string, Record<string, StoreSuggestOffer> | null>);
    })();

    return () => {
      cancelled = true;
    };
  }, [stores]);

  const fmtAud = useCallback((value: number) => `$${value.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, []);

  const storeCommittedValueByKey = useMemo(() => {
    return stores.reduce<Record<string, number>>((acc, store) => {
      const sk = msoStoreKey(store);
      const row = qty[sk] || {};
      const total = offers.reduce(
        (sum, offer) => sum + msoCommittedExpoForCell(offer, row[offer.offerId] ?? 0, sk, cellBundles),
        0,
      );
      acc[sk] = total;
      return acc;
    }, {});
  }, [stores, offers, qty, cellBundles]);

  const offerCommittedValueById = useMemo(() => {
    return offers.reduce<Record<string, number>>((acc, offer) => {
      const total = stores.reduce((sum, store) => {
        const sk = msoStoreKey(store);
        const row = qty[sk] || {};
        return sum + msoCommittedExpoForCell(offer, row[offer.offerId] ?? 0, sk, cellBundles);
      }, 0);
      acc[offer.offerId] = total;
      return acc;
    }, {});
  }, [stores, offers, qty, cellBundles]);

  const overallCommittedValue = Object.values(storeCommittedValueByKey).reduce((sum, n) => sum + n, 0);

  const bumpCell = useCallback((storeKey: string, offerId: string, delta: number) => {
    setQty((prev) => {
      const row = { ...(prev[storeKey] || {}) };
      const cur = row[offerId] ?? 0;
      const next = Math.min(MAX_QTY, Math.max(0, cur + delta));
      row[offerId] = next;
      return { ...prev, [storeKey]: row };
    });
    setCellBundles((prev) => {
      const offer = offers.find((o) => o.offerId === offerId);
      if (!offer) return prev;
      if (isMsoSplitLineIncreaseOffer(offer) || isMixedChooseNOffer(offer.rules)) {
        return {
          ...prev,
          [storeKey]: { ...(prev[storeKey] || {}), [offerId]: null },
        };
      }
      return prev;
    });
  }, [offers]);

  const handleSplitLineDelta = useCallback(
    (sk: string, offer: Offer, store: StoreData, q: number, description: string, delta: number) => {
      const built = buildMsoMatrixCartItemFromCell(offer, store, q, sk);
      if (!built?.splitBundle || !built.lineDetails?.length) return;
      const existing = cellBundles[sk]?.[offer.offerId];
      const cur =
        existing && existing.quantity > 0 && existing.splitBundle ? existing : built;
      const ld = cur.lineDetails?.find((l) => l.description === description);
      if (!ld) return;
      const next = Math.max(0, (ld.quantity || 0) + delta);
      const updated = updateSplitBundleLineQuantity(cur, description, next);
      if (!updated.quantity) {
        setCellBundles((prev) => ({
          ...prev,
          [sk]: { ...(prev[sk] || {}), [offer.offerId]: null },
        }));
        setQty((prev) => ({
          ...prev,
          [sk]: { ...(prev[sk] || {}), [offer.offerId]: 0 },
        }));
        return;
      }
      setCellBundles((prev) => ({
        ...prev,
        [sk]: { ...(prev[sk] || {}), [offer.offerId]: updated },
      }));
      setQty((prev) => ({
        ...prev,
        [sk]: { ...(prev[sk] || {}), [offer.offerId]: updated.quantity },
      }));
    },
    [cellBundles],
  );

  const handleChooseNCellPlus = useCallback(
    (sk: string, offer: Offer, store: StoreData, q: number, lineIdx: number) => {
      const cur = getEffectiveChooseNMatrixRow(offer, store, q, sk, cellBundles[sk]?.[offer.offerId]);
      if (!cur?.chooseNBundle) return;
      const line = offer.items?.[lineIdx];
      if (!line) return;
      const desc = chooseNMatrixLineDescription(line, lineIdx);
      const exists = cur.lineDetails?.some((d) => d.description === desc);
      const next = exists
        ? chooseNMatrixBumpExistingLine(cur, offer, desc, 1)
        : chooseNMatrixAddNewLine(cur, offer, lineIdx);
      if (!next) return;
      setCellBundles((prev) => ({
        ...prev,
        [sk]: { ...(prev[sk] || {}), [offer.offerId]: next },
      }));
      setQty((prev) => ({
        ...prev,
        [sk]: { ...(prev[sk] || {}), [offer.offerId]: 1 },
      }));
    },
    [cellBundles],
  );

  const handleChooseNCellMinus = useCallback(
    (sk: string, offer: Offer, store: StoreData, q: number, lineIdx: number) => {
      const cur = getEffectiveChooseNMatrixRow(offer, store, q, sk, cellBundles[sk]?.[offer.offerId]);
      if (!cur?.chooseNBundle) return;
      const line = offer.items?.[lineIdx];
      if (!line) return;
      const desc = chooseNMatrixLineDescription(line, lineIdx);
      const next = chooseNMatrixBumpExistingLine(cur, offer, desc, -1);
      if (!next) return;
      setCellBundles((prev) => ({
        ...prev,
        [sk]: { ...(prev[sk] || {}), [offer.offerId]: next },
      }));
      setQty((prev) => ({
        ...prev,
        [sk]: { ...(prev[sk] || {}), [offer.offerId]: 1 },
      }));
    },
    [cellBundles],
  );

  const handleMsoModalAdd = useCallback(
    (
      items: {
        offerId: string;
        quantity: number;
        description: string;
        cost: string;
        minQuantity?: number;
        lockQuantity?: boolean;
        fixedBundle?: boolean;
        splitBundle?: boolean;
        chooseNBundle?: boolean;
        lineDetails?: import('../utils/expandRetailOrderItems').BundleLineDetail[];
        chooseNMinSel?: number;
        dropMonths?: string[];
        msoStoreKey?: string;
      }[],
      ctx: MsoModalCtx,
    ) => {
      if (!ctx.storeKey) return;
      const sk = ctx.storeKey;
      const oid = ctx.offerId;
      const storeName = (ctx.storeName || '').trim();
      const first = items[0];
      if (!first) return;
      const desc = first.description.includes('—') ? first.description : `${first.description} — ${storeName}`.trim();
      const row: MsoMatrixCartItem = {
        ...(first as MsoMatrixCartItem),
        msoStoreKey: sk,
        description: desc,
      };
      setCellBundles((prev) => ({
        ...prev,
        [sk]: { ...(prev[sk] || {}), [oid]: row },
      }));
      const minB = Math.max(1, Number(offers.find((o) => o.offerId === oid)?.rules?.minBundleQty) || 1);
      let displayQ = first.quantity;
      if (first.chooseNBundle) displayQ = 1;
      else if (first.fixedBundle) displayQ = Math.max(1, Math.ceil(first.quantity / minB) || first.quantity);
      else if (first.splitBundle) displayQ = first.quantity;
      setQty((prev) => ({
        ...prev,
        [sk]: { ...(prev[sk] || {}), [oid]: displayQ },
      }));
    },
    [offers],
  );

  const buildCartItems = useCallback((): MsoMatrixCartItem[] => {
    const out: MsoMatrixCartItem[] = [];
    for (const store of stores) {
      const sk = msoStoreKey(store);
      const row = qty[sk] || {};
      for (const offer of offers) {
        const q = row[offer.offerId] ?? 0;
        const custom = cellBundles[sk]?.[offer.offerId];
        if (custom && custom.quantity > 0) {
          out.push(custom);
          continue;
        }
        const item = buildMsoMatrixCartItemFromCell(offer, store, q, sk);
        if (item) out.push(item);
      }
    }
    return out;
  }, [stores, offers, qty, cellBundles]);

  const handleCheckout = () => {
    const items = buildCartItems();
    if (items.length === 0) {
      setError('Select at least one quantity in the grid.');
      return;
    }
    setError('');
    onProceedToCheckout(items);
  };

  return (
    <>
    <div className="mso-matrix-page">
      <div className="mso-matrix-header">
        <div className="mso-matrix-titles">
          <h1 className="mso-matrix-title">MSO · {msoGroup}</h1>
          <p className="mso-matrix-hint">
            Use <strong>−</strong> and <strong>+</strong> for quantity. For configurable offers, use{' '}
            <strong>Configure</strong> (or open the column header to preview).
          </p>
        </div>
      </div>

      {loading && <div className="mso-matrix-loading">Loading offers…</div>}
      {error && <div className="mso-matrix-error">{error}</div>}

      {!loading && !error && offers.length > 0 && (
        <div className="mso-matrix-scroll">
          <table className="mso-matrix-table">
            <thead>
              <tr>
                <th className="mso-matrix-corner" scope="col">
                  Store
                </th>
                {offers.map((o) => (
                  <th
                    key={o.offerId}
                    className="mso-matrix-col-head"
                    scope="col"
                    title={offerCardEditorialHeading(o) || o.offerId}
                  >
                    <button
                      type="button"
                      className="mso-matrix-col-head-btn"
                      onClick={() => setModalCtx({ offerId: o.offerId })}
                      aria-label={`View offer details: ${offerCardEditorialHeading(o) || o.offerId}`}
                    >
                      {(() => {
                        const { logo, thumb } = offerMatrixColumnMedia(o);
                        const hasMedia = !!(logo || thumb);
                        if (!hasMedia) return null;
                        return (
                        <span className="mso-matrix-col-media" aria-hidden>
                          {logo ? (
                            <img
                              src={logo}
                              alt=""
                              className="mso-matrix-col-logo"
                              loading="lazy"
                              decoding="async"
                            />
                          ) : null}
                          {thumb ? (
                            <img
                              src={thumb}
                              alt=""
                              className="mso-matrix-col-hero"
                              loading="lazy"
                              decoding="async"
                            />
                          ) : null}
                        </span>
                        );
                      })()}
                      <span className="mso-matrix-col-name">{offerCardEditorialHeading(o) || o.offerId}</span>
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {stores.map((store) => {
                const sk = msoStoreKey(store);
                const row = qty[sk] || {};
                return (
                  <tr key={sk}>
                    <th className="mso-matrix-row-head" scope="row">
                      <span className="mso-matrix-store-name">{store.storeName}</span>
                      <span className="mso-matrix-store-value">{fmtAud(storeCommittedValueByKey[sk] ?? 0)}</span>
                    </th>
                    {offers.map((o) => {
                      const q = row[o.offerId] ?? 0;
                      const labelBase = `${store.storeName} — ${offerCardEditorialHeading(o) || o.offerId}`;
                      const suggestMap = storeSuggestByKey[sk];
                      const suggestItem = suggestMap?.[String(o.offerId || '').toUpperCase()];
                      const priorYearQty = suggestItem?.sales;
                      const suggestQty = suggestItem?.suggest;
                      const needsConfigure =
                        isMsoSplitLineIncreaseOffer(o) || isMixedChooseNOffer(o.rules);
                      const splitBuilt =
                        q > 0 && isMsoSplitLineIncreaseOffer(o)
                          ? buildMsoMatrixCartItemFromCell(o, store, q, sk)
                          : null;
                      const customCell = cellBundles[sk]?.[o.offerId];
                      const splitRow =
                        customCell && customCell.quantity > 0 && customCell.splitBundle
                          ? customCell
                          : splitBuilt;
                      return (
                        <td key={o.offerId} className="mso-matrix-cell">
                          <div className="mso-matrix-cell-stack">
                            {needsConfigure ? (
                              <button
                                type="button"
                                className="mso-matrix-cell-configure"
                                onClick={() =>
                                  setModalCtx({
                                    offerId: o.offerId,
                                    storeKey: sk,
                                    storeName: store.storeName || '',
                                  })
                                }
                              >
                                Configure
                              </button>
                            ) : null}
                            <div
                              className={`mso-matrix-cell-control ${q > 0 ? 'mso-matrix-cell-control-active' : ''}`}
                              role="group"
                              aria-label={`${labelBase}: quantity ${q}`}
                            >
                              <button
                                type="button"
                                className="mso-matrix-qty-step mso-matrix-qty-minus"
                                onClick={() => bumpCell(sk, o.offerId, -1)}
                                disabled={q <= 0}
                                aria-label={`Decrease ${labelBase}`}
                              >
                                −
                              </button>
                              <span className="mso-matrix-qty-value">{q}</span>
                              <button
                                type="button"
                                className="mso-matrix-qty-step mso-matrix-qty-plus"
                                onClick={() => bumpCell(sk, o.offerId, 1)}
                                disabled={q >= MAX_QTY}
                                aria-label={`Increase ${labelBase}`}
                              >
                                +
                              </button>
                            </div>
                            {splitRow?.lineDetails?.length ? (
                              <div className="mso-matrix-split-lines" aria-label={`${labelBase}: line quantities`}>
                                {splitRow.lineDetails.map((ld) => (
                                  <div key={ld.description} className="mso-matrix-split-line">
                                    <span className="mso-matrix-split-line-label" title={ld.description}>
                                      {ld.description.length > 28
                                        ? `${ld.description.slice(0, 26)}…`
                                        : ld.description}
                                    </span>
                                    <span className="mso-matrix-split-line-qty">
                                      <button
                                        type="button"
                                        className="mso-matrix-split-step"
                                        onClick={() =>
                                          handleSplitLineDelta(sk, o, store, q, ld.description, -1)
                                        }
                                        aria-label={`Decrease ${ld.description}`}
                                      >
                                        −
                                      </button>
                                      <span className="mso-matrix-split-line-num">{ld.quantity}</span>
                                      <button
                                        type="button"
                                        className="mso-matrix-split-step"
                                        onClick={() =>
                                          handleSplitLineDelta(sk, o, store, q, ld.description, 1)
                                        }
                                        aria-label={`Increase ${ld.description}`}
                                      >
                                        +
                                      </button>
                                    </span>
                                  </div>
                                ))}
                              </div>
                            ) : null}
                            {isMixedChooseNOffer(o.rules) && q > 0 ? (
                              <div
                                className="mso-matrix-split-lines mso-matrix-choose-n-lines"
                                aria-label={`${labelBase}: mix-and-match lines`}
                              >
                                {(o.items || []).map((line, idx) => {
                                  const desc = chooseNMatrixLineDescription(line, idx);
                                  const cnRow = getEffectiveChooseNMatrixRow(o, store, q, sk, customCell);
                                  if (!cnRow) return null;
                                  const ld = cnRow.lineDetails?.find((d) => d.description === desc);
                                  const curQty = ld?.quantity ?? 0;
                                  const baseQty = Math.max(0, Number(line.baseQty) || 0);
                                  const minSelTorch = Math.max(0, Number(o.rules?.minSelections) || 0);
                                  const maxSelTorch = Math.max(0, Number(o.rules?.maxSelections) || 0);
                                  const activeSel = (cnRow.lineDetails || []).filter((d) => (d.quantity || 0) > 0)
                                    .length;
                                  const showInline = curQty > 0;
                                  const showAddSlot =
                                    !showInline && baseQty > 0 && activeSel < maxSelTorch;
                                  const maxPer = chooseNMaxUnitsForLine(line);
                                  const canPlusMore = showInline && curQty < maxPer;
                                  const disableMinusAtBase =
                                    showInline && curQty <= baseQty && activeSel <= minSelTorch;
                                  const lineTitle = String(line.description || desc).trim() || desc;
                                  const shortLabel =
                                    lineTitle.length > 26 ? `${lineTitle.slice(0, 24)}…` : lineTitle;
                                  return (
                                    <div key={desc} className="mso-matrix-split-line mso-matrix-choose-n-line">
                                      <span className="mso-matrix-split-line-label" title={lineTitle}>
                                        {shortLabel}
                                      </span>
                                      <span className="mso-matrix-split-line-qty">
                                        {showInline ? (
                                          <>
                                            <button
                                              type="button"
                                              className="mso-matrix-split-step"
                                              onClick={() => handleChooseNCellMinus(sk, o, store, q, idx)}
                                              disabled={disableMinusAtBase}
                                              aria-label={`Decrease ${lineTitle}`}
                                            >
                                              −
                                            </button>
                                            <span className="mso-matrix-split-line-num">{curQty}</span>
                                            <button
                                              type="button"
                                              className="mso-matrix-split-step"
                                              onClick={() => handleChooseNCellPlus(sk, o, store, q, idx)}
                                              disabled={!canPlusMore}
                                              aria-label={`Increase ${lineTitle}`}
                                            >
                                              +
                                            </button>
                                          </>
                                        ) : showAddSlot ? (
                                          <>
                                            <span className="mso-matrix-split-line-num mso-matrix-choose-n-dash">
                                              0
                                            </span>
                                            <button
                                              type="button"
                                              className="mso-matrix-split-step"
                                              onClick={() => handleChooseNCellPlus(sk, o, store, q, idx)}
                                              aria-label={`Add ${lineTitle} at base quantity`}
                                            >
                                              +
                                            </button>
                                          </>
                                        ) : (
                                          <span className="mso-matrix-split-line-num mso-matrix-choose-n-dash">—</span>
                                        )}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : null}
                            {(shouldShowPriorYearSalesQty(priorYearQty) || shouldShowPriorYearSalesQty(suggestQty)) && (
                              <div className="mso-matrix-stats" role="status" title="Last year and suggest values for this offer">
                                {shouldShowPriorYearSalesQty(priorYearQty) && (
                                  <span className="mso-matrix-stat mso-matrix-stat--lastyear">
                                    Last year: {formatPriorYearSalesQty(priorYearQty)}
                                  </span>
                                )}
                                {shouldShowPriorYearSalesQty(suggestQty) && (
                                  <span className="mso-matrix-stat mso-matrix-stat--suggest">
                                    Suggest: {formatPriorYearSalesQty(suggestQty)}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <th className="mso-matrix-footer-head" scope="row">
                  Offer totals
                </th>
                {offers.map((o) => (
                  <td key={o.offerId} className="mso-matrix-footer-cell">
                    {fmtAud(offerCommittedValueById[o.offerId] ?? 0)}
                  </td>
                ))}
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {!loading && !error && offers.length === 0 && (
        <div className="mso-matrix-error">No offers available.</div>
      )}

      <div className="mso-matrix-actions" role="toolbar" aria-label="Checkout">
        <div className="mso-matrix-overall-total" aria-live="polite">
          Overall spend: <strong>{fmtAud(overallCommittedValue)}</strong>
        </div>
        <button type="button" className="mso-matrix-checkout" onClick={handleCheckout}>
          Continue to checkout
        </button>
      </div>
    </div>
    {modalCtx ? (
      <OfferDetailModal
        offerId={modalCtx.offerId}
        msoStoreKey={modalCtx.storeKey}
        allowAddToOrder={!!modalCtx.storeKey}
        onAddToCart={(items) => handleMsoModalAdd(items, modalCtx)}
        onClose={() => setModalCtx(null)}
      />
    ) : null}
    </>
  );
};

export default MsoOfferMatrix;
