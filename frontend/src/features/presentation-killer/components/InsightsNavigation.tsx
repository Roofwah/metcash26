import React, { useState } from 'react';
import '../styles/insights-navigation.css';

interface InsightsNavigationProps {
  onClose: () => void;
  onOpenChristmasInsights: () => void;
  onContinueToSales: () => void;
}

type InsightCard = {
  id: string;
  title: string;
  kind: 'insights' | 'image' | 'slideshow' | 'video';
  imageSrc?: string;
  videoSrc?: string;
  slides?: string[];
};

const cards: InsightCard[] = [
  { id: 'optimize-xmas', title: 'Optimise Christmas Sales', kind: 'insights' },
  { id: 'front-of-store', title: 'Front of Store Opportunity', kind: 'image', imageSrc: '/products/fos_insight1.jpg' },
  { id: 'portfolio', title: 'Energizer Portfolio', kind: 'image', imageSrc: '/products/pf_insight1.jpg' },
  {
    id: 'child-shield',
    title: 'Energizer Ultimate Child Shield™',
    kind: 'slideshow',
    slides: ['/products/ucs_insight1.jpg', '/products/ucs_insight2.jpg', '/products/ucs_insight3.jpg'],
  },
  { id: 'harry-kane', title: 'Welcome Harry Kane', kind: 'video', videoSrc: '/products/harry.mp4' },
  { id: 'excels-auto', title: 'Energizer Excels Auto Care', kind: 'image', imageSrc: '/products/auto_insight1.jpg' },
];

const InsightsNavigation: React.FC<InsightsNavigationProps> = ({
  onClose,
  onOpenChristmasInsights,
  onContinueToSales,
}) => {
  const [selectedPage, setSelectedPage] = useState<InsightCard | null>(null);
  const [slideIdx, setSlideIdx] = useState(0);

  const handleCardClick = (card: InsightCard) => {
    if (card.kind === 'insights') {
      onOpenChristmasInsights();
      return;
    }
    setSlideIdx(0);
    setSelectedPage(card);
  };

  return (
    <div className="insights-nav-overlay" role="dialog" aria-modal="true" aria-label="Energizer Insights navigation">
      <div className="insights-nav-shell">
        <div className="insights-nav-topbar">
          <h2>Energizer Insights</h2>
          <button type="button" className="insights-nav-close" onClick={onClose} aria-label="Close insights navigation">
            ×
          </button>
        </div>

        {selectedPage ? (
          <div className="insights-page-panel">
            <h3>{selectedPage.title}</h3>
            {selectedPage.kind === 'image' && selectedPage.imageSrc ? (
              <div className="insights-media-wrap">
                <img src={selectedPage.imageSrc} alt={selectedPage.title} className="insights-media-image" />
              </div>
            ) : null}
            {selectedPage.kind === 'video' && selectedPage.videoSrc ? (
              <div className="insights-media-wrap">
                <video className="insights-media-video" controls playsInline preload="metadata">
                  <source src={selectedPage.videoSrc} type="video/mp4" />
                  Your browser does not support video playback.
                </video>
              </div>
            ) : null}
            {selectedPage.kind === 'slideshow' && selectedPage.slides && selectedPage.slides.length > 0 ? (
              <div className="insights-media-wrap">
                <img
                  src={selectedPage.slides[slideIdx]}
                  alt={`${selectedPage.title} ${slideIdx + 1}`}
                  className="insights-media-image"
                />
                <div className="insights-slideshow-controls">
                  <button
                    type="button"
                    className="insights-slide-btn"
                    onClick={() => setSlideIdx((i) => Math.max(0, i - 1))}
                    disabled={slideIdx <= 0}
                  >
                    Previous
                  </button>
                  <span className="insights-slide-count">{slideIdx + 1} / {selectedPage.slides.length}</span>
                  <button
                    type="button"
                    className="insights-slide-btn"
                    onClick={() => setSlideIdx((i) => Math.min(selectedPage.slides!.length - 1, i + 1))}
                    disabled={slideIdx >= selectedPage.slides.length - 1}
                  >
                    Next
                  </button>
                </div>
              </div>
            ) : null}
            <div className="insights-page-actions">
              <button type="button" className="insights-back-btn" onClick={() => setSelectedPage(null)}>
                Back to Insights
              </button>
              <button type="button" className="insights-continue-btn" onClick={onContinueToSales}>
                Continue to Sales
              </button>
            </div>
          </div>
        ) : (
          <div className="insights-card-grid">
            {cards.map((card, idx) => (
              <button
                key={card.id}
                type="button"
                className={`insights-card insights-card--${card.kind}`}
                onClick={() => handleCardClick(card)}
                style={{ '--insight-card-bg': `url(/products/pos${idx + 1}.jpg)` } as React.CSSProperties}
              >
                <span className="insights-card-index">Position {idx + 1}</span>
                <span className="insights-card-title">{card.title}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default InsightsNavigation;
