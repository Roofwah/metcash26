import React from 'react';
import { SceneConfig } from '../types/presentation';
import HeroScene from './scenes/HeroScene';
import InsightStatScene from './scenes/InsightStatScene';
import SplitImageTextScene from './scenes/SplitImageTextScene';
import OfferScene from './scenes/OfferScene';
import ClosingCTAScene from './scenes/ClosingCTAScene';

interface Props {
  scene: SceneConfig;
  onCTA?: (action?: string) => void;
}

/**
 * Routes a SceneConfig to its matching scene component.
 * To add a new scene type: add the type to SceneType, build the component, add a case here.
 */
const SceneRenderer: React.FC<Props> = ({ scene, onCTA }) => {
  switch (scene.type) {
    case 'hero':
      return <HeroScene scene={scene} onCTA={onCTA} />;
    case 'insight-stat':
      return <InsightStatScene scene={scene} onCTA={onCTA} />;
    case 'split-image-text':
      return <SplitImageTextScene scene={scene} onCTA={onCTA} />;
    case 'offer':
      return <OfferScene scene={scene} onCTA={onCTA} />;
    case 'closing-cta':
      return <ClosingCTAScene scene={scene} onCTA={onCTA} />;
    default:
      return null;
  }
};

export default SceneRenderer;
