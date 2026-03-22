import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { apiUrl } from '../api';
import './OfferDetailModal.css';
import LearnMoreModal from './LearnMoreModal';

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
  logoUrl?: string;
  productImageUrl?: string;
  heroUrl?: string;
  category?: string;
  message?: string;
  other?: string;
  offerType?: string;
}

interface OfferDetailModalProps {
  offerId: string;
  onClose: () => void;
}

const OfferDetailModal: React.FC<OfferDetailModalProps> = ({ offerId, onClose }) => {
  const [offerData, setOfferData] = useState<OfferDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showLearnMore, setShowLearnMore] = useState(false);

  useEffect(() => {
    fetchOfferDetails();
  }, [offerId]);

  const fetchOfferDetails = async () => {
    try {
      setLoading(true);
      const response = await axios.get(apiUrl(`/api/offers/${offerId}`));
      setOfferData(response.data);
      setError('');
    } catch (err) {
      console.error('Error fetching offer details:', err);
      setError('Failed to load offer details. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="offer-detail-modal-overlay" onClick={onClose}>
        <div className="offer-detail-modal-content" onClick={(e) => e.stopPropagation()}>
          <div className="modal-loading">Loading...</div>
        </div>
      </div>
    );
  }

  if (error || !offerData) {
    return (
      <div className="offer-detail-modal-overlay" onClick={onClose}>
        <div className="offer-detail-modal-content" onClick={(e) => e.stopPropagation()}>
          <div className="modal-error">{error || 'Offer not found'}</div>
          <button className="modal-close-btn" onClick={onClose}>Close</button>
        </div>
      </div>
    );
  }

  const csvMedia =
    !!(offerData.heroUrl?.trim() || offerData.logoUrl?.trim() || offerData.productImageUrl?.trim());

  return (
    <>
      <div className="offer-detail-modal-overlay" onClick={onClose}>
        <div className="offer-detail-modal-content" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h2>{offerData.offerGroup}</h2>
            <button className="close-button" onClick={onClose}>×</button>
          </div>
          
          <div className="modal-body">
            {csvMedia && (
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
                {offerData.message?.trim() && (
                  <p className="modal-csv-message">{offerData.message}</p>
                )}
                {offerData.other?.trim() && (
                  <p className="modal-csv-other">{offerData.other}</p>
                )}
              </div>
            )}

            {/* Eveready Brand Card */}
            {!csvMedia && (offerId.toLowerCase().includes('eveready 1') || offerId.toLowerCase().includes('eveready 2') || offerId.toLowerCase().includes('eveready 3')) && (
              <div className="eveready-brand-card">
                <div className="eveready-brand-content">
                  <img src="/products/eready.png" alt="Eveready Logo" className="eveready-logo" />
                  <div className="eveready-brand-text">
                    <h3 className="eveready-brand-headline">Always Trusted, Always Ready…EVEREADY</h3>
                    <p className="eveready-brand-description">Families with children seeking affordable, quality solutions in step with their ever-changing needs.</p>
                  </div>
                </div>
                <div className="eveready-brand-images">
                  <img src="/products/hd50.png" alt="Eveready Product" className="eveready-product-image" />
                </div>
              </div>
            )}

            {/* Energizer Brand Card */}
            {!csvMedia && (offerId.toLowerCase().includes('energizer 1') || offerId.toLowerCase().includes('energizer 2') || offerId.toLowerCase().includes('energizer 3') || offerId.toLowerCase().includes('energizer 4') || offerId.toLowerCase().includes('energizer 5') || offerId.toLowerCase().includes('energizer 6')) && (
              <div className="energizer-brand-card">
                <div className="energizer-brand-content">
                  <img src="/products/energizer.png" alt="Energizer Logo" className="energizer-logo" />
                  <div className="energizer-brand-text">
                    <ul className="energizer-brand-bullets">
                      <li>Top Selling Skus</li>
                      <li>With Powerseal Technology</li>
                      <li>Hold power for up to 10 years</li>
                    </ul>
                    <p className="energizer-brand-description">Batteries value and volume growth is outpacing total store, based on shoppers buying into bigger pack sizes and looking for greater value via product quality, promotions and a wide selection.</p>
                  </div>
                </div>
                <div className="energizer-brand-images">
                  {offerId.toLowerCase().includes('energizer 1') ? (
                    <img src="/products/penta.png" alt="Energizer Product" className="energizer-product-image" />
                  ) : offerId.toLowerCase().includes('energizer 2') || offerId.toLowerCase().includes('energizer 3') ? (
                    <img src="/products/3024.png" alt="Energizer Product" className="energizer-product-image" />
                  ) : (
                    <img src="/products/1614.png" alt="Energizer Product" className="energizer-product-image" />
                  )}
                </div>
              </div>
            )}

            {/* ArmorAll Brand Card */}
            {!csvMedia && (offerId.toLowerCase().includes('armorall 1') || offerId.toLowerCase().includes('armorall 2') || offerId.toLowerCase().includes('armorall 3')) && (
              <div className="armorall-brand-card">
                <div className="armorall-brand-content">
                  <img src="/products/aall.png" alt="ArmorAll Logo" className="armorall-logo" />
                  <div className="armorall-brand-text">
                    <ul className="armorall-brand-bullets">
                      <li>Delivers Incredible Shine</li>
                      <li>Gently lifts away dirt that can cause scratches and swirls</li>
                      <li>Helps water beading on your paint</li>
                      <li>Delivers mirror-like shine as you wash</li>
                      <li>Reveals your paint's deep, radiant colour</li>
                    </ul>
                  </div>
                </div>
                <div className="armorall-brand-images">
                  <img src="/products/wash.png" alt="ArmorAll Product" className="armorall-product-image" />
                </div>
              </div>
            )}

            {/* Product Images for offers without brand cards */}
            {!csvMedia &&
              (() => {
                const offerKey = offerId.toLowerCase();
                let productImage: string | null = null;

                if (offerKey === 'energizer 7') {
                  productImage = '/products/maxmod.png';
                } else if (offerKey === 'energizer 8') {
                  productImage = '/products/hl.png';
                } else if (offerKey === 'energizer 9') {
                  productImage = '/products/torch.png';
                } else if (offerKey === 'armorall 4') {
                  productImage = '/products/slr.png';
                } else if (offerKey === 'armorall 5') {
                  productImage = '/products/fragrances.png';
                }

                if (productImage) {
                  return (
                    <div className="modal-product-image-section">
                      <img src={productImage} alt="Product" className="modal-product-image" />
                    </div>
                  );
                }
                return null;
              })()}

            <div className="offer-info">
              <p><strong>Brand:</strong> {offerData.brand}</p>
              {offerData.range && <p><strong>Range:</strong> {offerData.range}</p>}
            </div>

            {offerData.hasTiers && offerData.tiers ? (
              <div className="offer-tiers">
                {Object.keys(offerData.tiers).map(tier => (
                  <div key={tier} className="tier-section">
                    <h3>{tier}</h3>
                    <table className="offer-items-table">
                      <thead>
                        <tr>
                          <th>Description</th>
                          <th>Qty</th>
                          <th>Save</th>
                          <th>Expo Total Cost</th>
                        </tr>
                      </thead>
                      <tbody>
                        {offerData.tiers?.[tier]?.map((item, idx) => (
                          <tr key={idx}>
                            <td>{item.Description}</td>
                            <td>{item.Qty}</td>
                            <td>{item.Save}</td>
                            <td>${parseFloat(item['Expo Total Cost'] || '0').toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}
              </div>
            ) : offerData.items ? (
              <div className="offer-items">
                <table className="offer-items-table">
                  <thead>
                    <tr>
                      <th>Description</th>
                      <th>Qty</th>
                      <th>Save</th>
                      <th>Expo Total Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {offerData.items.map((item, idx) => (
                      <tr key={idx}>
                        <td>{item.Description}</td>
                        <td>{item.Qty}</td>
                        <td>{item.Save}</td>
                        <td>${parseFloat(item['Expo Total Cost'] || '0').toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </div>
        </div>
      </div>
      {showLearnMore && offerData && (
        <LearnMoreModal
          offerId={offerData.offerId}
          offerGroup={offerData.offerGroup}
          brand={offerData.brand}
          onClose={() => setShowLearnMore(false)}
        />
      )}
    </>
  );
};

export default OfferDetailModal;

