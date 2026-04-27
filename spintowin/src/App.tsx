import { useCallback, useRef, useState } from 'react';
import SpinWheel, { SpinWheelHandle } from './SpinWheel';
import WinLog from './WinLog';
import { Prize, WinRecord, loadWins } from './prizes';

export default function App() {
  const [wins, setWins] = useState<WinRecord[]>(() => loadWins());
  const [spinning, setSpinning] = useState(false);
  const wheelRef = useRef<SpinWheelHandle>(null);

  const handleSpin = useCallback(() => {
    wheelRef.current?.spin();
    setSpinning(true);
  }, []);

  const handleWin = useCallback((_prize: Prize, _sku: string, _ts: string) => {
    setWins(loadWins());
    setSpinning(false);
  }, []);

  return (
    <div className="app-layout">
      <div className="app-left">
        <img src="/energizer-logo.svg" alt="Energizer" className="app-brand-logo" />
        <div className="app-headline">
          <span className="app-headline-spin">SPIN</span>
          <span className="app-headline-to"> TO </span>
          <span className="app-headline-win">WIN</span>
        </div>
        <button
          className="sw-spin-btn app-spin-btn"
          onClick={handleSpin}
          disabled={spinning}
        >
          {spinning ? 'Spinning…' : 'SPIN TO WIN'}
        </button>
        <WinLog wins={wins} onClear={() => setWins([])} />
      </div>
      <div className="app-right">
        <SpinWheel ref={wheelRef} onWin={handleWin} />
      </div>
    </div>
  );
}
