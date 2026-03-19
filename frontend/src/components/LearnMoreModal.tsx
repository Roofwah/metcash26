import React from 'react';
import './LearnMoreModal.css';

interface LearnMoreModalProps {
  offerId: string;
  offerGroup: string;
  brand: string;
  onClose: () => void;
}

// Placeholder insights - these will be customized per offer later
const getBuyerInsights = (offerId: string, offerGroup: string): string[] => {
  // This is a placeholder - actual insights will be provided later
  // Different offers will have different insights
  return [
    `${offerGroup} offers significant cost savings for high-volume retailers.`,
    'This promotion provides excellent margins to drive profitability.',
    'Ideal for stores with strong customer demand in this category.',
    'Take advantage of limited-time pricing during this expo period.'
  ];
};

const LearnMoreModal: React.FC<LearnMoreModalProps> = ({ offerId, offerGroup, brand, onClose }) => {
  const insights = getBuyerInsights(offerId, offerGroup);
  const isAutoFragrance = offerId.toLowerCase().includes('armorall 5') || offerGroup.toLowerCase().includes('auto fragrance');

  return (
    <div className="learn-more-modal-overlay" onClick={onClose}>
      <div className="learn-more-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{brand} - {offerGroup}</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
        
        <div className="modal-body">
          {isAutoFragrance && (
            <div className="modal-image-container">
              <img src="/products/fragrances.png" alt="Fragrances" className="modal-image" />
            </div>
          )}
          <h3>Key Buyer Insights</h3>
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

