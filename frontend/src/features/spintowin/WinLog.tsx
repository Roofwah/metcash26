import { useState } from 'react';
import { WinRecord, clearWins } from './prizes';

interface Props {
  wins: WinRecord[];
  onClear: () => void;
}

export default function WinLog({ wins, onClear }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div className="wl-container">
      <button className="wl-toggle" onClick={() => setOpen((o) => !o)}>
        {open ? '▲' : '▼'} Win Log ({wins.length})
      </button>

      {open && (
        <div className="wl-panel">
          <div className="wl-header">
            <span className="wl-heading">Recorded Wins</span>
            {wins.length > 0 && (
              <button
                className="wl-clear"
                onClick={() => {
                  clearWins();
                  onClear();
                }}
              >
                Clear All
              </button>
            )}
          </div>
          {wins.length === 0 ? (
            <div className="wl-empty">No wins recorded yet.</div>
          ) : (
            <div className="wl-list">
              {wins.map((w, i) => (
                <div key={w.id} className="wl-row">
                  <span className="wl-num">#{wins.length - i}</span>
                  <span className="wl-brand">{w.prizeBrand}</span>
                  <span className="wl-name">{w.prizeName}</span>
                  <span className="wl-sku">SKU {w.sku}</span>
                  <span className="wl-time">
                    {new Date(w.timestamp).toLocaleTimeString('en-AU', {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
