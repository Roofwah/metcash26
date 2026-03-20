import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Deck } from '../types/presentation';
import SceneRenderer from './SceneRenderer';
import '../styles/presentation.css';

interface Props {
  deck: Deck;
  onClose: () => void;
  onCTAAction?: (action: string) => void;
}

const PresentationPlayer: React.FC<Props> = ({ deck, onClose, onCTAAction }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const touchStartX = useRef<number | null>(null);

  const scenes = deck.scenes;
  const isLast = currentIndex === scenes.length - 1;
  const progress = (currentIndex + 1) / scenes.length;

  const goNext = useCallback(() => {
    if (currentIndex < scenes.length - 1) {
      setDirection(1);
      setCurrentIndex(i => i + 1);
    }
  }, [currentIndex, scenes.length]);

  const goPrev = useCallback(() => {
    if (currentIndex > 0) {
      setDirection(-1);
      setCurrentIndex(i => i - 1);
    }
  }, [currentIndex]);

  const goTo = useCallback((i: number) => {
    setDirection(i > currentIndex ? 1 : -1);
    setCurrentIndex(i);
  }, [currentIndex]);

  // Keyboard navigation
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); goNext(); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); goPrev(); }
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [goNext, goPrev, onClose]);

  // Touch swipe
  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const dx = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(dx) > 50) {
      dx > 0 ? goNext() : goPrev();
    }
    touchStartX.current = null;
  };

  const handleCTA = (action?: string) => {
    if (!action) return;
    if (action === 'next') { goNext(); return; }
    if (action === 'close') { onClose(); return; }
    onCTAAction?.(action);
  };

  // Scene transition variants — direction-aware slide
  const slideVariants = {
    enter: (dir: number) => ({
      opacity: 0,
      x: dir > 0 ? 80 : -80,
      scale: 0.97,
    }),
    center: {
      opacity: 1,
      x: 0,
      scale: 1,
      transition: { duration: 0.52, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
    },
    exit: (dir: number) => ({
      opacity: 0,
      x: dir > 0 ? -80 : 80,
      scale: 0.97,
      transition: { duration: 0.32, ease: [0.55, 0, 1, 0.45] as [number, number, number, number] },
    }),
  };

  return (
    <div
      className="pres-overlay"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* ── Progress bar ── */}
      <div className="pres-progress-track">
        <motion.div
          className="pres-progress-fill"
          animate={{ scaleX: progress }}
          initial={{ scaleX: 1 / scenes.length }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        />
      </div>

      {/* ── Top chrome ── */}
      <div className="pres-top-bar">
        <div className="pres-counter">
          <span className="pres-counter-current">
            {String(currentIndex + 1).padStart(2, '0')}
          </span>
          <span className="pres-counter-sep"> / </span>
          <span className="pres-counter-total">
            {String(scenes.length).padStart(2, '0')}
          </span>
        </div>

        <div className="pres-deck-title">{deck.title}</div>

        <button className="pres-close-btn" onClick={onClose} aria-label="Close">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* ── Scene area ── */}
      <div className="pres-scene-wrap">
        {/* Tap zones for left/right navigation on iPad */}
        <button
          className="pres-tap-zone pres-tap-zone--left"
          onClick={goPrev}
          disabled={currentIndex === 0}
          aria-label="Previous scene"
          tabIndex={-1}
        />
        <button
          className="pres-tap-zone pres-tap-zone--right"
          onClick={isLast ? onClose : goNext}
          aria-label={isLast ? 'Close' : 'Next scene'}
          tabIndex={-1}
        />

        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={scenes[currentIndex].id}
            className="pres-scene-frame"
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
          >
            <SceneRenderer
              scene={scenes[currentIndex]}
              onCTA={handleCTA}
            />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── Bottom controls ── */}
      <div className="pres-controls">
        <button
          className="pres-nav-btn pres-nav-btn--prev"
          onClick={goPrev}
          disabled={currentIndex === 0}
          aria-label="Previous"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          <span>Prev</span>
        </button>

        {/* Dot indicators */}
        <div className="pres-dots" role="tablist">
          {scenes.map((_, i) => (
            <button
              key={i}
              role="tab"
              aria-selected={i === currentIndex}
              className={`pres-dot${i === currentIndex ? ' pres-dot--active' : ''}`}
              onClick={() => goTo(i)}
              aria-label={`Scene ${i + 1}`}
            />
          ))}
        </div>

        <button
          className="pres-nav-btn pres-nav-btn--next"
          onClick={isLast ? onClose : goNext}
          aria-label={isLast ? 'Finish' : 'Next'}
        >
          <span>{isLast ? 'Finish' : 'Next'}</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default PresentationPlayer;
