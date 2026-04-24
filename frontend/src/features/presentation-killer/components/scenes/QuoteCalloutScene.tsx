import React from 'react';
import { motion } from 'framer-motion';
import { SceneConfig } from '../../types/presentation';

interface Props {
  scene: SceneConfig;
  onCTA?: (action?: string) => void;
}

const QuoteCalloutScene: React.FC<Props> = ({ scene, onCTA }) => {
  const accent = scene.accentColor || '#ff6c08';
  const [gradStart, gradEnd] = scene.backgroundGradient || ['#06080e', '#080610'];

  const expo = [0.16, 1, 0.3, 1] as [number, number, number, number];

  return (
    <div
      className="scene quote-scene"
      style={{ background: `linear-gradient(150deg, ${gradStart} 0%, ${gradEnd} 100%)` }}
    >
      {/* Dot grid */}
      <div className="scene-dot-grid" />

      {/* Ambient blobs — behind text */}
      <div
        className="scene-blob scene-blob--1"
        style={{ background: accent, opacity: 0.06, top: '20%', left: '10%' }}
      />
      <div
        className="scene-blob scene-blob--3"
        style={{ background: accent, opacity: 0.04, bottom: '10%', right: '15%' }}
      />

      <div className="scene-noise" />

      {/* Large radial behind the quote */}
      <div
        className="quote-glow"
        style={{
          background: `radial-gradient(ellipse at 50% 50%, ${accent}14 0%, transparent 60%)`,
        }}
      />

      <div className="quote-content">
        {scene.eyebrow && (
          <motion.div
            className="scene-eyebrow"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1, ease: expo }}
            style={{ color: accent }}
          >
            {scene.eyebrow}
          </motion.div>
        )}

        {/* Accent line */}
        <motion.div
          className="quote-accent-line"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.8, delay: 0.2, ease: expo }}
          style={{ background: accent, transformOrigin: 'center' }}
        />

        {/* Typographic quote mark */}
        <motion.div
          className="quote-mark"
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 0.14, scale: 1 }}
          transition={{ duration: 1.0, delay: 0.15, ease: expo }}
          style={{ color: accent }}
          aria-hidden
        >
          &ldquo;
        </motion.div>

        {/* The quote */}
        {(scene.quote || scene.title) && (
          <motion.p
            className="quote-text"
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.85, delay: 0.3, ease: expo }}
          >
            {scene.quote || scene.title}
          </motion.p>
        )}

        {/* Attribution */}
        {scene.attribution && (
          <motion.p
            className="quote-attribution"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.7, delay: 0.65, ease: 'easeOut' }}
          >
            — {scene.attribution}
          </motion.p>
        )}

        {scene.ctaLabel && (
          <motion.button
            className="scene-cta-btn"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.85, ease: expo }}
            onClick={() => onCTA?.(scene.ctaAction)}
            style={{ background: accent, marginTop: 32 }}
          >
            {scene.ctaLabel}
          </motion.button>
        )}
      </div>
    </div>
  );
};

export default QuoteCalloutScene;
