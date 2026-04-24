import React, { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { apiUrl, StoreData } from '../api';
import OfferDetailModal from './OfferDetailModal';
import { sortOffersByDisplayOrder } from '../config/offersDisplay';
import {
  findPriorYearSalesQty,
  formatPriorYearSalesQty,
  shouldShowPriorYearSalesQty,
  type StoreSalesLineItem,
} from '../utils/priorYearSales';
import './MsoOfferMatrix.css';

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
  logoUrl?: string;
  heroUrl?: string;
  productImageUrl?: string;
}

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
    }))
    .filter((offer: Offer) => offer.offerId.length > 0);
};

/** Stable key for MSO cart / grouping — matches App msoStoreKey */
export function msoStoreKey(s: StoreData): string {
  return `${(s.storeId || '').trim()}|${s.storeName}`;
}

export interface MsoMatrixCartItem {
  offerId: string;
  offerTier?: string;
  quantity: number;
  description: string;
  cost: string;
  dropMonths?: string[];
  msoStoreKey: string;
}

interface MsoOfferMatrixProps {
  msoGroup: string;
  stores: StoreData[];
  onProceedToCheckout: (items: MsoMatrixCartItem[]) => void;
}

const MAX_QTY = 99;

const MsoOfferMatrix: React.FC<MsoOfferMatrixProps> = ({ msoGroup, stores, onProceedToCheckout }) => {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  /** storeKey -> offerId -> qty */
  const [qty, setQty] = useState<Record<string, Record<string, number>>>({});
  /** storeKey -> sales25 line items (qty per category) from GET /api/store-sales */
  const [storeSalesItemsByKey, setStoreSalesItemsByKey] = useState<Record<string, StoreSalesLineItem[] | null>>({});
  const [modalOfferId, setModalOfferId] = useState<string | null>(null);

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

  /** Load 2025 sales25 category qty per store (GET /api/store-sales items[]) */
  useEffect(() => {
    if (stores.length === 0) {
      setStoreSalesItemsByKey({});
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
            const res = await axios.get(apiUrl(`/api/store-sales/${encodeURIComponent(sid)}`));
            if (!res.data?.hasData || !Array.isArray(res.data.items)) return [sk, null] as const;
            const items: StoreSalesLineItem[] = res.data.items.map(
              (it: { name?: string; qty?: number }) => ({
                name: String(it.name || ''),
                qty: typeof it.qty === 'number' ? it.qty : parseFloat(String(it.qty)) || 0,
              })
            );
            return [sk, items] as const;
          } catch {
            return [sk, null] as const;
          }
        })
      );
      if (cancelled) return;
      setStoreSalesItemsByKey(Object.fromEntries(pairs) as Record<string, StoreSalesLineItem[] | null>);
    })();

    return () => {
      cancelled = true;
    };
  }, [stores]);

  const bumpCell = useCallback(
    (storeKey: string, offerId: string, delta: number) => {
      setQty((prev) => {
        const row = { ...(prev[storeKey] || {}) };
        const cur = row[offerId] ?? 0;
        const next = Math.min(MAX_QTY, Math.max(0, cur + delta));
        row[offerId] = next;
        return { ...prev, [storeKey]: row };
      });
    },
    []
  );

  const buildCartItems = useCallback((): MsoMatrixCartItem[] => {
    const out: MsoMatrixCartItem[] = [];
    const offerById = new Map(offers.map((o) => [o.offerId, o]));
    for (const store of stores) {
      const sk = msoStoreKey(store);
      const row = qty[sk] || {};
      for (const offer of offers) {
        const q = row[offer.offerId] ?? 0;
        if (q <= 0) continue;
        const o = offerById.get(offer.offerId);
        if (!o) continue;
        const tier = (o.offerTier || '').trim() || o.descriptions[0]?.description?.trim() || undefined;
        out.push({
          offerId: o.offerId,
          offerTier: tier,
          quantity: q,
          description: `${o.offerGroup} — ${store.storeName}`,
          cost: o.totalCost || '0',
          msoStoreKey: sk,
        });
      }
    }
    return out;
  }, [stores, offers, qty]);

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
            Use <strong>−</strong> and <strong>+</strong> beside each amount to change quantity.
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
                  <th key={o.offerId} className="mso-matrix-col-head" scope="col" title={o.offerId}>
                    <button
                      type="button"
                      className="mso-matrix-col-head-btn"
                      onClick={() => setModalOfferId(o.offerId)}
                      aria-label={`View offer details: ${o.offerGroup || o.offerId}`}
                    >
                      {(o.logoUrl || o.heroUrl || o.productImageUrl) && (
                        <span className="mso-matrix-col-media" aria-hidden>
                          {o.logoUrl ? (
                            <img
                              src={o.logoUrl}
                              alt=""
                              className="mso-matrix-col-logo"
                              loading="lazy"
                              decoding="async"
                            />
                          ) : null}
                          {o.heroUrl || o.productImageUrl ? (
                            <img
                              src={o.heroUrl || o.productImageUrl}
                              alt=""
                              className="mso-matrix-col-hero"
                              loading="lazy"
                              decoding="async"
                            />
                          ) : null}
                        </span>
                      )}
                      <span className="mso-matrix-col-name">{o.offerGroup || o.offerId}</span>
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
                    </th>
                    {offers.map((o) => {
                      const q = row[o.offerId] ?? 0;
                      const labelBase = `${store.storeName} — ${o.offerGroup}`;
                      const lineItems = storeSalesItemsByKey[sk];
                      const prior2025Qty =
                        lineItems && lineItems.length > 0 ? findPriorYearSalesQty(o, lineItems) : undefined;
                      return (
                        <td key={o.offerId} className="mso-matrix-cell">
                          <div className="mso-matrix-cell-stack">
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
                            {shouldShowPriorYearSalesQty(prior2025Qty) && (
                              <div
                                className="mso-matrix-prior-qty"
                                role="status"
                                title="2025 quantity (sales25) for this category"
                              >
                                <span className="mso-matrix-prior-qty-label">2025</span>
                                <span className="mso-matrix-prior-qty-value">
                                  {formatPriorYearSalesQty(prior2025Qty)}
                                </span>
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
          </table>
        </div>
      )}

      {!loading && !error && offers.length === 0 && (
        <div className="mso-matrix-error">No offers available.</div>
      )}

      <div className="mso-matrix-actions" role="toolbar" aria-label="Checkout">
        <button type="button" className="mso-matrix-checkout" onClick={handleCheckout}>
          Continue to checkout
        </button>
      </div>
    </div>
    {modalOfferId ? (
      <OfferDetailModal offerId={modalOfferId} onClose={() => setModalOfferId(null)} />
    ) : null}
    </>
  );
};

export default MsoOfferMatrix;
