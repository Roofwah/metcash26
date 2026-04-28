import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { apiUrl } from '../api';
import { DEFAULT_DROP_MONTH } from '../constants/dropMonths';
import { recomputeSplitBundleW, type BundleLineDetail } from '../utils/expandRetailOrderItems';
import { offerCardEditorialHeading } from '../utils/offerMedia';
import { offerDetailModal } from '../content/modalCopy';
import {
  chooseNMaxUnitsForLine,
  countSelectedChooseNLines,
  initChooseNLineQuantities,
  isMixedChooseNOffer,
} from '../utils/mixedChooseN';
import './OfferDetailModal.css';

/** Row shape from GET /api/offers/:id (CSV columns + enrichRow extras) */
interface OfferLineFields {
  Description?: string;
  Qty?: string;
  Save?: string;
  'Expo Total Cost'?: string;
  'Expo Charge Back Cost'?: string;
  'Offer Tier'?: string;
  discount?: string;
  expoPrice?: string;
  sku?: string;
  baseQty?: number;
  cartonQty?: number;
  lineUnitExpoCost?: number;
  [key: string]: unknown;
}

interface OfferDetailData {
  offerId: string;
  offerGroup: string;
  brand: string;
  range: string;
  hasTiers: boolean;
  tiers?: { [key: string]: OfferLineFields[] };
  items?: OfferLineFields[];
  logoUrl?: string;
  productImageUrl?: string;
  heroUrl?: string;
  promoImageUrl?: string;
  logo?: string | null;
  hero?: string | null;
  productImage?: string | null;
  promoImage?: string | null;
  showPromos?: boolean;
  category?: string;
  /** From offer-content.json → API */
  modalTitle?: string;
  h1?: string;
  h2?: string;
  body?: string;
  message?: string;
  other?: string;
  callouts?: string[];
  offerType?: string;
  /** Sum of expo line values from API (legacy name) */
  expoChargeBackCost?: string;
  /** POS supporting copy from backend/pos.csv */
  pos?: { description?: string; callouts?: string[] };
  rules?: {
    offerMode?: string;
    minBundleQty?: number;
    allowLineIncrease?: boolean;
    selectionRule?: string;
    minSelections?: number;
    maxSelections?: number;
  };
}

interface OfferDetailModalProps {
  offerId: string;
  /** MSO: tag each row so the matrix can route the order to a store. */
  msoStoreKey?: string;
  /** When false (e.g. column browse with no store), hide “Add to order”. */
  allowAddToOrder?: boolean;
  /** MSO re-open path: previous configured row for this store/offer. */
  initialMsoSelection?: {
    quantity?: number;
    fixedBundle?: boolean;
    splitBundle?: boolean;
    chooseNBundle?: boolean;
    lineDetails?: BundleLineDetail[];
  } | null;
  onAddToCart: (
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
      lineDetails?: BundleLineDetail[];
      chooseNMinSel?: number;
      dropMonths?: string[];
      msoStoreKey?: string;
    }[],
  ) => void;
  onClose: () => void;
}

function fmt2(n: number): string {
  if (!Number.isFinite(n)) return '—';
  return n.toFixed(2);
}

function parseNum(v: unknown): number {
  const x = parseFloat(String(v ?? '').replace(/,/g, ''));
  return Number.isFinite(x) ? x : 0;
}

/**
 * Remove duplicate brand labelling from CSV copy (Message / Other).
 * Handles "Brand: Energizer", a line that is only "Brand", "Brand\\nEnergizer", etc.
 */
function stripBrandMarketingCopy(text: string, brandFromApi?: string): string {
  if (!text?.trim()) return '';
  let t = text
    .replace(/\r\n/g, '\n')
    .replace(/\bbrand\s*:\s*[^\n]*/gi, '')
    .replace(/(?:^|\n)\s*brand\s*(?::\s*[^\n]*)?(?=\n|$)/gi, '\n');
  const brandTrim = (brandFromApi || '').trim();
  const lines = t.split('\n').filter((line) => {
    const s = line.trim();
    if (!s) return true;
    if (/^brand$/i.test(s)) return false;
    if (/^brand\s*:/i.test(s)) return false;
    if (brandTrim && s.toLowerCase() === brandTrim.toLowerCase()) return false;
    return true;
  });
  t = lines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
  return t;
}

function OfferLineCard({ item }: { item: OfferLineFields }) {
  const expoCb = parseNum(item['Expo Charge Back Cost']);
  const expoTotal = parseNum(item['Expo Total Cost'] ?? item.expoPrice);
  const qty = String(item.Qty ?? '').trim() || '—';
  const discount =
    typeof item.discount === 'string' && item.discount.trim()
      ? item.discount.trim()
      : String(item.Save ?? '').trim() || '—';
  const m = offerDetailModal.lineMetrics;

  return (
    <article className="offer-line-card">
      <h4 className="offer-line-card-title">{item.Description || '—'}</h4>
      <dl className="offer-line-card-metrics">
        <div className="offer-line-metric">
          <dt>{m.qty}</dt>
          <dd>{qty}</dd>
        </div>
        <div className="offer-line-metric offer-line-metric--highlight">
          <dt>{m.expoChargeBack}</dt>
          <dd>{fmt2(expoCb)}</dd>
        </div>
        <div className="offer-line-metric offer-line-metric--accent">
          <dt>{m.discount}</dt>
          <dd>{discount}</dd>
        </div>
        <div className="offer-line-metric">
          <dt>{m.expoTotalLine}</dt>
          <dd>{fmt2(expoTotal)}</dd>
        </div>
      </dl>
    </article>
  );
}

const OfferDetailModal: React.FC<OfferDetailModalProps> = ({
  offerId,
  msoStoreKey,
  allowAddToOrder = true,
  initialMsoSelection,
  onAddToCart,
  onClose,
}) => {
  const [offerData, setOfferData] = useState<OfferDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [bundleQuantity, setBundleQuantity] = useState(1);
  const [lineQuantities, setLineQuantities] = useState<Record<string, number>>({});
  const [chooseNError, setChooseNError] = useState('');

  const lineSkuFromDescription = (description: string): string => {
    const m = String(description || '').match(/\(([^)]+)\)\s*$/);
    return m?.[1]?.trim() || '';
  };

  const findExistingLineQty = (
    existingLines: BundleLineDetail[] | undefined,
    item: OfferLineFields,
    idx: number,
  ): number | undefined => {
    if (!existingLines?.length) return undefined;
    const itemSku = String(item.sku || '').trim();
    if (itemSku) {
      const bySku = existingLines.find((ld) => {
        const ldSku = String(ld.sku || '').trim();
        if (ldSku && ldSku === itemSku) return true;
        return lineSkuFromDescription(String(ld.description || '')) === itemSku;
      });
      if (bySku) return Number(bySku.quantity) || 0;
    }
    const label = `${item.Description || 'SKU'} (${item.sku || idx + 1})`;
    const byDesc = existingLines.find((ld) => String(ld.description || '').trim() === label);
    if (byDesc) return Number(byDesc.quantity) || 0;
    return undefined;
  };

  useEffect(() => {
    fetchOfferDetails();
  }, [offerId, initialMsoSelection]);

  const fetchOfferDetails = async () => {
    try {
      setLoading(true);
      const response = await axios.get(apiUrl(`/api/offers/${encodeURIComponent(offerId)}`));
      setOfferData(response.data);
      setChooseNError('');
      const minBundle = Math.max(1, Number(response.data?.rules?.minBundleQty) || 1);
      const existingQty = Math.max(0, Number(initialMsoSelection?.quantity) || 0);
      setBundleQuantity(existingQty > 0 ? Math.max(minBundle, existingQty) : minBundle);
      const items = (response.data?.items || []) as OfferLineFields[];
      const rules = response.data?.rules;
      const nextLineQuantities: Record<string, number> = {};
      if (isMixedChooseNOffer(rules)) {
        const minSel = Math.max(0, Number(rules?.minSelections) || 0);
        Object.assign(nextLineQuantities, initChooseNLineQuantities(items, minSel));
        if (initialMsoSelection?.chooseNBundle && initialMsoSelection.lineDetails?.length) {
          items.forEach((item, idx) => {
            const key = `line-${idx}`;
            const existing = findExistingLineQty(initialMsoSelection.lineDetails, item, idx);
            if (existing !== undefined) {
              nextLineQuantities[key] = Math.max(0, existing);
            }
          });
        }
      } else {
        const isSplit = String(rules?.offerMode || '').toUpperCase() === 'SPLIT' && !!rules?.allowLineIncrease;
        items.forEach((item, idx) => {
          const base = Math.max(0, Number(item.baseQty ?? item.Qty ?? 0) || 0);
          const key = `line-${idx}`;
          const existing = findExistingLineQty(initialMsoSelection?.lineDetails, item, idx);
          if (isSplit && initialMsoSelection?.splitBundle && existing !== undefined) {
            nextLineQuantities[key] = Math.max(base, existing);
          } else {
            nextLineQuantities[key] = base;
          }
        });
      }
      setLineQuantities(nextLineQuantities);
      setError('');
    } catch (err) {
      console.error('Error fetching offer details:', err);
      setError(offerDetailModal.fetchError);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="offer-detail-modal-overlay" onClick={onClose}>
        <div className="offer-detail-modal-content" onClick={(e) => e.stopPropagation()}>
          <div className="modal-loading">{offerDetailModal.loading}</div>
        </div>
      </div>
    );
  }

  if (error || !offerData) {
    return (
      <div className="offer-detail-modal-overlay" onClick={onClose}>
        <div className="offer-detail-modal-content" onClick={(e) => e.stopPropagation()}>
          <div className="modal-error">{error || offerDetailModal.notFound}</div>
          <button type="button" className="modal-close-btn" onClick={onClose}>
            {offerDetailModal.closeButton}
          </button>
        </div>
      </div>
    );
  }

  const csvMedia =
    !!(
      offerData.heroUrl?.trim() ||
      offerData.logoUrl?.trim() ||
      offerData.productImageUrl?.trim() ||
      (offerData.showPromos && offerData.promoImageUrl?.trim())
    );

  const rawMessage = offerData.message ?? '';
  const rawOther = offerData.other ?? '';
  const displayMessage = stripBrandMarketingCopy(rawMessage, offerData.brand);
  const displayOther = stripBrandMarketingCopy(rawOther, offerData.brand);
  const hasEditorialHead = !!(offerData.h1?.trim() || offerData.h2?.trim());
  const hasCallouts = !!(offerData.callouts && offerData.callouts.length);
  const showCopyInMainColumn =
    !csvMedia && !!(displayMessage || displayOther || hasEditorialHead || hasCallouts);

  const modalTitle =
    (offerData.modalTitle || '').trim() ||
    (offerData.h1 || '').trim() ||
    offerData.offerId;

  const editorialCallouts =
    offerData.callouts?.filter((c) => typeof c === 'string' && c.trim()).map((c) => c.trim()) ?? [];

  const posDescription = offerData.pos?.description?.trim() ?? '';
  const posCallouts =
    offerData.pos?.callouts?.filter((c) => typeof c === 'string' && c.trim()).map((c) => c.trim()) ?? [];
  const hasPos = !!(posDescription || posCallouts.length);
  const showPosInMainColumn = !csvMedia && hasPos;

  const renderEditorialProse = (messageClass: string, otherClass: string) => (
    <>
      {offerData.h1?.trim() ? <p className="modal-editorial-h1">{offerData.h1.trim()}</p> : null}
      {offerData.h2?.trim() ? <p className="modal-editorial-h2">{offerData.h2.trim()}</p> : null}
      {displayMessage ? <p className={messageClass}>{displayMessage}</p> : null}
      {displayOther ? <p className={otherClass}>{displayOther}</p> : null}
      {editorialCallouts.length > 0 ? (
        <ul className="modal-editorial-callouts">
          {editorialCallouts.map((c, i) => (
            <li key={i}>{c}</li>
          ))}
        </ul>
      ) : null}
    </>
  );

  const renderPosSection = (variant: 'split' | 'main') => (
    <section
      className={`modal-pos${variant === 'main' ? ' modal-pos--main' : ''}`}
      aria-labelledby="modal-pos-heading"
    >
      <h3 id="modal-pos-heading" className="modal-pos__heading">
        {offerDetailModal.posSectionTitle}
      </h3>
      {posDescription ? (
        <p className={variant === 'main' ? 'modal-pos__text' : 'modal-pos__text modal-pos__text--split'}>
          {posDescription}
        </p>
      ) : null}
      {posCallouts.length > 0 ? (
        <ul className="modal-pos__list">
          {posCallouts.map((c, i) => (
            <li key={i}>{c}</li>
          ))}
        </ul>
      ) : null}
    </section>
  );

  const renderLineItems = () => {
    if (offerData.hasTiers && offerData.tiers) {
      return (
        <div className="offer-tiers offer-tiers--cards">
          {Object.keys(offerData.tiers).map((tier) => (
            <section key={tier} className="tier-section">
              <h3 className="tier-section-title">{tier}</h3>
              <div className="offer-line-card-list">
                {offerData.tiers?.[tier]?.map((item, idx) => (
                  <OfferLineCard key={`${tier}-${idx}`} item={item} />
                ))}
              </div>
            </section>
          ))}
        </div>
      );
    }
    if (offerData.items?.length) {
      const mode = String(offerData.rules?.offerMode || '').toUpperCase();
      const allowLineIncrease = !!offerData.rules?.allowLineIncrease;
      const isFixedLike = mode === 'FIXED' || (mode === 'SPLIT' && !allowLineIncrease);
      const isSplit = mode === 'SPLIT' && allowLineIncrease;
      const isChooseN = isMixedChooseNOffer(offerData.rules);
      const minSel = Math.max(0, Number(offerData.rules?.minSelections) || 0);
      const maxSel = Math.max(0, Number(offerData.rules?.maxSelections) || 0);
      const itemCount = offerData.items.length;

      return (
        <div className="offer-line-card-list">
          {offerData.items.map((item, idx) => {
            const base = Math.max(0, Number(item.baseQty ?? item.Qty ?? 0) || 0);
            const key = `line-${idx}`;
            const maxUnits = chooseNMaxUnitsForLine(item);
            const qty = isFixedLike
              ? base * bundleQuantity
              : isSplit
                ? Math.max(base, Number(lineQuantities[key] ?? base))
                : isChooseN
                  ? Math.max(0, Number(lineQuantities[key] ?? 0))
                  : Math.max(1, Number(item.Qty ?? 1) || 1);

            return (
              <div key={idx} className="modal-line-wrap">
                <OfferLineCard item={{ ...item, Qty: String(qty) }} />
                {isSplit && (
                  <div className="modal-line-qty-row">
                    <span className="modal-line-qty-label">Line qty</span>
                    <div className="quantity-controls">
                      <button
                        type="button"
                        className="qty-btn"
                        onClick={() => setLineQuantities((prev) => ({ ...prev, [key]: Math.max(base, (Number(prev[key] ?? base) - 1)) }))}
                      >
                        -
                      </button>
                      <input
                        type="number"
                        className="qty-input"
                        min={base}
                        value={Number(lineQuantities[key] ?? base)}
                        onChange={(e) =>
                          setLineQuantities((prev) => ({ ...prev, [key]: Math.max(base, parseInt(e.target.value) || base) }))
                        }
                      />
                      <button
                        type="button"
                        className="qty-btn"
                        onClick={() => setLineQuantities((prev) => ({ ...prev, [key]: Number(prev[key] ?? base) + 1 }))}
                      >
                        +
                      </button>
                    </div>
                  </div>
                )}
                {isChooseN && (
                  <div className="modal-line-qty-row">
                    <span className="modal-line-qty-label">Line qty</span>
                    <div className="quantity-controls">
                      <button
                        type="button"
                        className="qty-btn"
                        onClick={() => {
                          setChooseNError('');
                          setLineQuantities((prev) => {
                            const cur = Number(prev[key] ?? 0);
                            if (cur <= 0) return prev;
                            const nextVal = cur - 1;
                            const newVal = nextVal < base ? 0 : nextVal;
                            if (newVal === 0) {
                              const test = { ...prev, [key]: 0 };
                              if (countSelectedChooseNLines(test, itemCount) < minSel) return prev;
                            }
                            return { ...prev, [key]: newVal };
                          });
                        }}
                      >
                        -
                      </button>
                      <input
                        type="number"
                        className="qty-input"
                        min={0}
                        max={maxUnits}
                        value={Number(lineQuantities[key] ?? 0)}
                        onChange={(e) => {
                          setChooseNError('');
                          const raw = parseInt(e.target.value, 10);
                          const v = Number.isFinite(raw) ? raw : 0;
                          setLineQuantities((prev) => {
                            let next = Math.min(maxUnits, Math.max(0, v));
                            if (next > 0 && next < base) next = base;
                            if (next === 0) {
                              const test = { ...prev, [key]: 0 };
                              if (countSelectedChooseNLines(test, itemCount) < minSel) return prev;
                            }
                            if (next > 0) {
                              const test = { ...prev, [key]: next };
                              const prevSel = countSelectedChooseNLines(prev, itemCount);
                              const wasOff = (Number(prev[key]) || 0) === 0;
                              if (wasOff && prevSel >= maxSel) return prev;
                              if (countSelectedChooseNLines(test, itemCount) > maxSel) return prev;
                            }
                            return { ...prev, [key]: next };
                          });
                        }}
                      />
                      <button
                        type="button"
                        className="qty-btn"
                        onClick={() => {
                          setChooseNError('');
                          setLineQuantities((prev) => {
                            const cur = Number(prev[key] ?? 0);
                            if (cur >= maxUnits) return prev;
                            if (cur === 0) {
                              if (countSelectedChooseNLines(prev, itemCount) >= maxSel) return prev;
                              return { ...prev, [key]: base };
                            }
                            return { ...prev, [key]: cur + 1 };
                          });
                        }}
                      >
                        +
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      );
    }
    return null;
  };

  return (
    <>
      <div className="offer-detail-modal-overlay" onClick={onClose}>
        <div
          className={`offer-detail-modal-content${csvMedia ? ' offer-detail-modal-content--split' : ''}`}
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="offer-modal-title"
        >
          <div className="modal-header">
            <h2 id="offer-modal-title">{modalTitle}</h2>
            <button
              type="button"
              className="close-button"
              onClick={onClose}
              aria-label={offerDetailModal.closeAria}
            >
              ×
            </button>
          </div>

          <div className={`modal-body${csvMedia ? ' modal-body--split' : ''}`}>
            {csvMedia && (
              <div className="modal-csv-column">
                <div className="modal-csv-media">
                  {offerData.logoUrl?.trim() && (
                    <img src={offerData.logoUrl} alt="" className="modal-csv-logo" />
                  )}
                  {offerData.heroUrl?.trim() && (
                    <img src={offerData.heroUrl} alt="" className="modal-csv-hero" />
                  )}
                  {!offerData.heroUrl?.trim() && offerData.productImageUrl?.trim() && (
                    <img src={offerData.productImageUrl} alt="" className="modal-csv-product" />
                  )}
                  {offerData.showPromos && offerData.promoImageUrl?.trim() && (
                    <img src={offerData.promoImageUrl} alt="" className="modal-csv-promo" />
                  )}
                  {renderEditorialProse('modal-csv-message', 'modal-csv-other')}
                  {csvMedia && hasPos ? renderPosSection('split') : null}
                </div>
              </div>
            )}

            <div className="modal-main-column">
              {(() => {
                const mode = String(offerData.rules?.offerMode || '').toUpperCase();
                const allowLineIncrease = !!offerData.rules?.allowLineIncrease;
                const isFixedLike = mode === 'FIXED' || (mode === 'SPLIT' && !allowLineIncrease);
                const isSplit = mode === 'SPLIT' && allowLineIncrease;
                const isChooseN = isMixedChooseNOffer(offerData.rules);
                const minSel = Math.max(0, Number(offerData.rules?.minSelections) || 0);
                const maxSel = Math.max(0, Number(offerData.rules?.maxSelections) || 0);
                const minBundleQty = Math.max(1, Number(offerData.rules?.minBundleQty) || 1);
                if (!offerData.items?.length) return null;
                return (
                  <div className="modal-order-controls">
                    {isFixedLike && (
                      <>
                        <p className="modal-order-helper-title">Bundle quantity</p>
                        <p className="modal-order-helper">This offer is sold as a fixed bundle.</p>
                        <div className="quantity-controls">
                          <button type="button" className="qty-btn" onClick={() => setBundleQuantity((q) => Math.max(minBundleQty, q - 1))}>-</button>
                          <input
                            type="number"
                            className="qty-input"
                            min={minBundleQty}
                            value={bundleQuantity}
                            onChange={(e) => setBundleQuantity(Math.max(minBundleQty, parseInt(e.target.value) || minBundleQty))}
                          />
                          <button type="button" className="qty-btn" onClick={() => setBundleQuantity((q) => q + 1)}>+</button>
                        </div>
                      </>
                    )}
                    {isSplit && (
                      <>
                        <p className="modal-order-helper-title">Adjust carton quantities</p>
                        <p className="modal-order-helper">Minimum quantities are pre-loaded. You can increase individual lines.</p>
                      </>
                    )}
                    {isChooseN && (
                      <>
                        <p className="modal-order-helper-title">Mix-and-match torches</p>
                        <p className="modal-order-helper">
                          Select at least {minSel} and at most {maxSel} torch lines. Each selected line must be at least 1 unit (up to the carton max per line).
                        </p>
                      </>
                    )}
                    {chooseNError ? <p className="modal-order-error" role="alert">{chooseNError}</p> : null}
                    {!allowAddToOrder ? (
                      <p className="modal-order-helper modal-order-helper--mso-browse">
                        Use <strong>Configure</strong> on a store row in the MSO matrix to add this offer for that store.
                      </p>
                    ) : null}
                    {allowAddToOrder ? (
                    <button
                      type="button"
                      className="offer-action-primary"
                      onClick={() => {
                        const items = offerData.items || [];
                        let cartRows: {
                          offerId: string;
                          quantity: number;
                          description: string;
                          cost: string;
                          minQuantity?: number;
                          lockQuantity?: boolean;
                          fixedBundle?: boolean;
                          splitBundle?: boolean;
                          chooseNBundle?: boolean;
                          lineDetails?: BundleLineDetail[];
                          chooseNMinSel?: number;
                          dropMonths?: string[];
                        }[];

                        if (isFixedLike) {
                          const safeQty = Math.max(minBundleQty, bundleQuantity);
                          let totalExpo = 0;
                          for (const item of items) {
                            const base = Math.max(0, Number(item.baseQty ?? item.Qty ?? 0) || 0);
                            if (base <= 0) continue;
                            totalExpo += parseNum(item['Expo Total Cost']);
                          }
                          const perBundle =
                            safeQty > 0 && totalExpo > 0
                              ? totalExpo / safeQty
                              : parseNum(offerData.expoChargeBackCost);
                          const label =
                            offerCardEditorialHeading({
                              modalTitle: offerData.modalTitle,
                              h1: offerData.h1,
                            }) || offerData.offerGroup;
                          cartRows = [
                            {
                              offerId: offerData.offerId,
                              quantity: safeQty,
                              description: label,
                              cost: perBundle.toFixed(2),
                              minQuantity: minBundleQty,
                              lockQuantity: true,
                              fixedBundle: true,
                            },
                          ];
                        } else if (isSplit) {
                          const lineDetails: BundleLineDetail[] = [];
                          items.forEach((item, idx) => {
                            const base = Math.max(0, Number(item.baseQty ?? item.Qty ?? 0) || 0);
                            const quantity = Math.max(base, Number(lineQuantities[`line-${idx}`] ?? base));
                            if (quantity <= 0) return;
                            const unitCostFromApi = Number(item.lineUnitExpoCost ?? 0);
                            const expoTotal = parseNum(item['Expo Total Cost']);
                            const unitCost =
                              unitCostFromApi > 0 ? unitCostFromApi : base > 0 ? expoTotal / base : expoTotal;
                            lineDetails.push({
                              description: `${item.Description || 'SKU'} (${item.sku || idx + 1})`,
                              quantity,
                              cost: unitCost.toFixed(2),
                              baseQty: base,
                              sku: String(item.sku || '').trim() || undefined,
                            });
                          });
                          const W = recomputeSplitBundleW(lineDetails);
                          const sum = lineDetails.reduce((s, l) => s + parseFloat(l.cost) * l.quantity, 0);
                          const perW = W > 0 ? sum / W : 0;
                          const label =
                            offerCardEditorialHeading({
                              modalTitle: offerData.modalTitle,
                              h1: offerData.h1,
                            }) || offerData.offerGroup;
                          cartRows =
                            lineDetails.length > 0
                              ? [
                                  {
                                    offerId: offerData.offerId,
                                    quantity: W,
                                    description: label,
                                    cost: perW.toFixed(2),
                                    minQuantity: 1,
                                    lockQuantity: false,
                                    splitBundle: true,
                                    lineDetails,
                                    dropMonths: Array.from({ length: W }, () => DEFAULT_DROP_MONTH),
                                  },
                                ]
                              : [];
                        } else if (isChooseN) {
                          const lineDetails: BundleLineDetail[] = [];
                          let sum = 0;
                          items.forEach((item, idx) => {
                            const base = Math.max(0, Number(item.baseQty ?? item.Qty ?? 0) || 0);
                            const quantity = Math.max(0, Number(lineQuantities[`line-${idx}`] ?? 0));
                            if (quantity <= 0) return;
                            const unitCostFromApi = Number(item.lineUnitExpoCost ?? 0);
                            const expoTotal = parseNum(item['Expo Total Cost']);
                            const unitCost =
                              unitCostFromApi > 0 ? unitCostFromApi : base > 0 ? expoTotal / base : expoTotal;
                            sum += unitCost * quantity;
                            lineDetails.push({
                              description: `${item.Description || 'SKU'} (${item.sku || idx + 1})`,
                              quantity,
                              cost: unitCost.toFixed(2),
                              baseQty: base,
                              sku: String(item.sku || '').trim() || undefined,
                            });
                          });
                          const label =
                            offerCardEditorialHeading({
                              modalTitle: offerData.modalTitle,
                              h1: offerData.h1,
                            }) || offerData.offerGroup;
                          cartRows =
                            lineDetails.length > 0
                              ? [
                                  {
                                    offerId: offerData.offerId,
                                    quantity: 1,
                                    description: label,
                                    cost: sum.toFixed(2),
                                    minQuantity: 1,
                                    lockQuantity: true,
                                    chooseNBundle: true,
                                    chooseNMinSel: minSel,
                                    lineDetails,
                                    dropMonths: [DEFAULT_DROP_MONTH],
                                  },
                                ]
                              : [];
                        } else {
                          cartRows = items
                            .map((item, idx) => {
                              const base = Math.max(0, Number(item.baseQty ?? item.Qty ?? 0) || 0);
                              const quantity = Math.max(1, Number(item.Qty ?? 1) || 1);
                              const unitCostFromApi = Number(item.lineUnitExpoCost ?? 0);
                              const expoTotal = parseNum(item['Expo Total Cost']);
                              const unitCost =
                                unitCostFromApi > 0 ? unitCostFromApi : base > 0 ? expoTotal / base : expoTotal;
                              return {
                                offerId: offerData.offerId,
                                quantity,
                                description: `${item.Description || 'SKU'} (${item.sku || idx + 1})`,
                                cost: unitCost.toFixed(2),
                                minQuantity: 0,
                                lockQuantity: false,
                              };
                            })
                            .filter((x) => x.quantity > 0);
                        }
                        if (cartRows.length === 0) return;
                        if (isChooseN) {
                          if (!cartRows[0]?.lineDetails || cartRows[0].lineDetails.length < minSel || cartRows[0].lineDetails.length > maxSel) {
                            setChooseNError(`Select between ${minSel} and ${maxSel} torch lines (each with at least 1 unit).`);
                            return;
                          }
                          for (let i = 0; i < items.length; i++) {
                            const base = Math.max(0, Number(items[i].baseQty ?? items[i].Qty ?? 0) || 0);
                            const q = Math.max(0, Number(lineQuantities[`line-${i}`] ?? 0));
                            if (q > 0 && q < base) {
                              setChooseNError('Each selected torch line must be at least 1 unit.');
                              return;
                            }
                          }
                        }
                        setChooseNError('');
                        const rows = msoStoreKey ? cartRows.map((r) => ({ ...r, msoStoreKey })) : cartRows;
                        onAddToCart(rows);
                        onClose();
                      }}
                    >
                      ADD TO ORDER
                    </button>
                    ) : null}
                  </div>
                );
              })()}
              {showCopyInMainColumn && (
                <div className="modal-offer-copy">
                  {renderEditorialProse('modal-offer-copy__message', 'modal-offer-copy__other')}
                </div>
              )}
              {showPosInMainColumn ? renderPosSection('main') : null}

              {offerData.expoChargeBackCost != null && String(offerData.expoChargeBackCost).trim() !== '' && (
                <p className="offer-modal-footnote">
                  {offerDetailModal.footnoteLead}{' '}
                  <strong>{fmt2(parseNum(offerData.expoChargeBackCost))}</strong>
                </p>
              )}

              {renderLineItems()}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default OfferDetailModal;
