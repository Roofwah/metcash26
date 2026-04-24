import React from 'react';
import PresentationPlayer from './features/presentation-killer/components/PresentationPlayer';
import { killerPresentationDeck } from './features/presentation-killer/data/killerPresentationDeck';

/**
 * Standalone story deck — no login or store flow (uses presentation-killer).
 * Open: http://localhost:3000/?preview=presentation (dev)
 *       http://localhost:5001/?preview=presentation (built app)
 */
export default function PresentationPreview() {
  const exitToApp = () => {
    const { pathname, hash } = window.location;
    window.location.href = `${pathname}${hash}`;
  };

  return (
    <PresentationPlayer
      deck={killerPresentationDeck}
      onClose={exitToApp}
      onCTAAction={(action) => {
        if (action === 'offers') exitToApp();
      }}
    />
  );
}
