import React, { useEffect, useState } from 'react';
import './LandscapeHint.css';

export interface LandscapeHintProps {
  message?: string;
  className?: string;
  bottomOffsetPx?: number;
  liftPx?: number;
  zIndex?: number;
}

const LandscapeHint: React.FC<LandscapeHintProps> = ({
  message = 'Best viewed in landscape',
  className = '',
  bottomOffsetPx = 0,
  liftPx = 88,
  zIndex,
}) => {
  const [portrait, setPortrait] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(orientation: portrait)');
    const sync = () => setPortrait(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  if (!portrait) return null;

  return (
    <div
      className={`landscape-hint landscape-hint--ww ${className}`.trim()}
      role="status"
      aria-live="polite"
      style={{
        bottom: `calc(${bottomOffsetPx}px + ${liftPx}px + env(safe-area-inset-bottom, 0px))`,
        ...(typeof zIndex === 'number' ? { zIndex } : {}),
      }}
    >
      <div className="landscape-hint-inner">
        <span className="landscape-hint-icon-wrap" aria-hidden="true">
          <svg
            className="landscape-hint-icon"
            viewBox="0 0 48 48"
            width="36"
            height="36"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <rect
              x="14"
              y="8"
              width="20"
              height="32"
              rx="3"
              stroke="currentColor"
              strokeWidth="2.5"
            />
            <line x1="24" y1="36" x2="24" y2="36.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </span>
        <span className="landscape-hint-text">{message}</span>
      </div>
    </div>
  );
};

export default LandscapeHint;
