import { useCallback, useRef, useState } from 'react';
import SpinWheel, { SpinWheelHandle } from './SpinWheel';
import { Prize } from './prizes';
import type { SpinSessionMeta } from './spinWinLog';
import './spintowin.css';

interface SpinToWinPageProps {
  onClaimPrize?: () => void;
  spinSessionMeta?: SpinSessionMeta;
}

export default function SpinToWinPage({ onClaimPrize, spinSessionMeta }: SpinToWinPageProps) {
  const [spinning, setSpinning] = useState(false);
  const wheelRef = useRef<SpinWheelHandle>(null);

  const handleSpin = useCallback(() => {
    wheelRef.current?.spin();
    setSpinning(true);
  }, []);

  const handleWin = useCallback((_prize: Prize, _sku: string, _ts: string) => {
    setSpinning(false);
  }, []);

  return (
    <div className="spin-to-win-page">
      <div className="app-layout">
        <div className="app-left">
          <img src="/products/energizer.png" alt="Energizer" className="app-brand-logo" />
          <div className="app-headline">
            <span className="app-headline-spin">SPIN</span>
            <span className="app-headline-to"> TO </span>
            <span className="app-headline-win">WIN</span>
          </div>
          <button className="sw-spin-btn app-spin-btn" onClick={handleSpin} disabled={spinning}>
            {spinning ? 'Spinning…' : 'SPIN TO WIN'}
          </button>
        </div>
        <div className="app-right">
          <SpinWheel ref={wheelRef} onWin={handleWin} onClaimPrize={onClaimPrize} spinSessionMeta={spinSessionMeta} />
        </div>
      </div>
    </div>
  );
}
