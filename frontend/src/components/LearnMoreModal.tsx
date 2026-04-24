import React from 'react';
import { learnMoreInsights, learnMoreModal } from '../content/modalCopy';
import './LearnMoreModal.css';

interface LearnMoreModalProps {
  offerId: string;
  offerGroup: string;
  onClose: () => void;
}

const LearnMoreModal: React.FC<LearnMoreModalProps> = ({ offerId, offerGroup, onClose }) => {
  const insights = learnMoreInsights(offerId, offerGroup);
  const isAutoFragrance = offerId.toLowerCase().includes('armorall 5') || offerGroup.toLowerCase().includes('auto fragrance');

  return (
    <div className="learn-more-modal-overlay" onClick={onClose}>
      <div className="learn-more-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{offerGroup}</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
        
        <div className="modal-body">
          {isAutoFragrance && (
            <div className="modal-image-container">
              <img src="/products/fragrances.png" alt={learnMoreModal.fragranceImageAlt} className="modal-image" />
            </div>
          )}
          <h3>{learnMoreModal.insightsHeading}</h3>
          <ul className="insights-list">
            {insights.map((insight, index) => (
              <li key={index}>{insight}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default LearnMoreModal;

