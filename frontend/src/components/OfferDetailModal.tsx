import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { apiUrl } from '../api';
import { offerDetailModal } from '../content/modalCopy';
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
  category?: string;
  /** From offer-content.json → API */
  modalTitle?: string;
  h1?: string;
  h2?: string;
  message?: string;
  other?: string;
  callouts?: string[];
  offerType?: string;
  /** Sum of expo line values from API (legacy name) */
  expoChargeBackCost?: string;
  /** POS supporting copy from backend/pos.csv */
  pos?: { description?: string; callouts?: string[] };
}

interface OfferDetailModalProps {
  offerId: string;
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

const OfferDetailModal: React.FC<OfferDetailModalProps> = ({ offerId, onClose }) => {
  const [offerData, setOfferData] = useState<OfferDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    fetchOfferDetails();
  }, [offerId]);

  const fetchOfferDetails = async () => {
    try {
      setLoading(true);
      const response = await axios.get(apiUrl(`/api/offers/${encodeURIComponent(offerId)}`));
      setOfferData(response.data);
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
    !!(offerData.heroUrl?.trim() || offerData.logoUrl?.trim() || offerData.productImageUrl?.trim());

  const rawMessage = offerData.message ?? '';
  const rawOther = offerData.other ?? '';
  const displayMessage = stripBrandMarketingCopy(rawMessage, offerData.brand);
  const displayOther = stripBrandMarketingCopy(rawOther, offerData.brand);
  const hasEditorialHead = !!(offerData.h1?.trim() || offerData.h2?.trim());
  const hasCallouts = !!(offerData.callouts && offerData.callouts.length);
  const showCopyInMainColumn =
    !csvMedia && !!(displayMessage || displayOther || hasEditorialHead || hasCallouts);

  const modalTitle = (offerData.modalTitle ?? offerData.offerGroup).trim() || offerData.offerGroup;

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

  const renderBrandBlocks = () => (
    <>
      {!csvMedia &&
        (offerId.toLowerCase().includes('eveready 1') ||
          offerId.toLowerCase().includes('eveready 2') ||
          offerId.toLowerCase().includes('eveready 3')) && (
          <div className="eveready-brand-card">
            <div className="eveready-brand-content eveready-brand-content--logo-only">
              <img src="/products/eready.png" alt="" className="eveready-logo" />
            </div>
            <div className="eveready-brand-images">
              <img src="/products/hd50.png" alt="" className="eveready-product-image" />
            </div>
          </div>
        )}

      {!csvMedia &&
        (offerId.toLowerCase().includes('energizer 1') ||
          offerId.toLowerCase().includes('energizer 2') ||
          offerId.toLowerCase().includes('energizer 3') ||
          offerId.toLowerCase().includes('energizer 4') ||
          offerId.toLowerCase().includes('energizer 5') ||
          offerId.toLowerCase().includes('energizer 6')) && (
          <div className="energizer-brand-card">
            <div className="energizer-brand-content energizer-brand-content--logo-only">
              <img src="/products/energizer.png" alt="" className="energizer-logo" />
            </div>
            <div className="energizer-brand-images">
              {offerId.toLowerCase().includes('energizer 1') ? (
                <img src="/products/penta.png" alt="" className="energizer-product-image" />
              ) : offerId.toLowerCase().includes('energizer 2') || offerId.toLowerCase().includes('energizer 3') ? (
                <img src="/products/3024.png" alt="" className="energizer-product-image" />
              ) : (
                <img src="/products/1614.png" alt="" className="energizer-product-image" />
              )}
            </div>
          </div>
        )}

      {!csvMedia &&
        (offerId.toLowerCase().includes('armorall 1') ||
          offerId.toLowerCase().includes('armorall 2') ||
          offerId.toLowerCase().includes('armorall 3')) && (
          <div className="armorall-brand-card">
            <div className="armorall-brand-content armorall-brand-content--logo-only">
              <img src="/products/aall.png" alt="" className="armorall-logo" />
            </div>
            <div className="armorall-brand-images">
              <img src="/products/wash.png" alt="" className="armorall-product-image" />
            </div>
          </div>
        )}

      {!csvMedia &&
        (() => {
          const offerKey = offerId.toLowerCase();
          let productImage: string | null = null;
          if (offerKey === 'energizer 7') productImage = '/products/maxmod.png';
          else if (offerKey === 'energizer 8') productImage = '/products/hl.png';
          else if (offerKey === 'energizer 9') productImage = '/products/torch.png';
          else if (offerKey === 'armorall 4') productImage = '/products/slr.png';
          else if (offerKey === 'armorall 5') productImage = '/products/fragrances.png';
          if (!productImage) return null;
          return (
            <div className="modal-product-image-section">
              <img src={productImage} alt="" className="modal-product-image" />
            </div>
          );
        })()}
    </>
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
      return (
        <div className="offer-line-card-list">
          {offerData.items.map((item, idx) => (
            <OfferLineCard key={idx} item={item} />
          ))}
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
                  {renderEditorialProse('modal-csv-message', 'modal-csv-other')}
                  {csvMedia && hasPos ? renderPosSection('split') : null}
                </div>
              </div>
            )}

            <div className="modal-main-column">
              {showCopyInMainColumn && (
                <div className="modal-offer-copy">
                  {renderEditorialProse('modal-offer-copy__message', 'modal-offer-copy__other')}
                </div>
              )}
              {showPosInMainColumn ? renderPosSection('main') : null}
              {!csvMedia && renderBrandBlocks()}

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
