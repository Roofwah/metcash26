import React from 'react';
import PresentationPlayer from './features/presentation-killer/components/PresentationPlayer';
import { killerPresentationDeck } from './features/presentation-killer/data/killerPresentationDeck';

/**
 * Isolated story deck for iteration — lives in features/presentation-killer/
 * Open: http://localhost:3000/?preview=presentation-killer
 */
export default function PresentationPreviewKiller() {
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
