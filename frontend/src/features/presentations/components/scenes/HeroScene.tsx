import React from 'react';
import { motion } from 'framer-motion';
import { SceneConfig } from '../../types/presentation';
import { fadeUp, staggerContainer } from '../../utils/transitions';

interface Props {
  scene: SceneConfig;
  onCTA?: (action?: string) => void;
}

const HeroScene: React.FC<Props> = ({ scene, onCTA }) => {
  const accent = scene.accentColor || '#ff6c08';
  const [gradStart, gradEnd] = scene.backgroundGradient || ['#060810', '#0b1232'];

  // Handle newlines in title
  const titleLines = scene.title.split('\n');

  return (
    <div
      className="scene hero-scene"
      style={{ background: `linear-gradient(150deg, ${gradStart} 0%, ${gradEnd} 100%)` }}
    >
      <div className="scene-noise" />

      {/* Ambient radial glow behind the text */}
      <div
        className="hero-glow"
        style={{ background: `radial-gradient(ellipse at 50% 60%, ${accent}18 0%, transparent 65%)` }}
      />

      <motion.div
        className="hero-content"
        variants={staggerContainer(0.16, 0.08)}
        initial="hidden"
        animate="visible"
      >
        {scene.eyebrow && (
          <motion.div className="scene-eyebrow" variants={fadeUp} style={{ color: accent }}>
            {scene.eyebrow}
          </motion.div>
        )}

        <motion.h1 className="hero-title" variants={fadeUp}>
          {titleLines.map((line, i) => (
            <span key={i}>
              {line}
              {i < titleLines.length - 1 && <br />}
            </span>
          ))}
        </motion.h1>

        {scene.subtitle && (
          <motion.p className="hero-subtitle" variants={fadeUp}>
            {scene.subtitle}
          </motion.p>
        )}

        {scene.ctaLabel && (
          <motion.button
            className="scene-cta-btn"
            variants={fadeUp}
            onClick={() => onCTA?.(scene.ctaAction)}
            style={{ background: accent }}
          >
            {scene.ctaLabel}
          </motion.button>
        )}
      </motion.div>

      {/* Bottom accent bar — reveals left to right */}
      <motion.div
        className="hero-accent-bar"
        initial={{ scaleX: 0, opacity: 0 }}
        animate={{ scaleX: 1, opacity: 1 }}
        transition={{ duration: 1.5, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
        style={{ background: `linear-gradient(90deg, ${accent}, ${accent}00)`, transformOrigin: 'left' }}
      />
    </div>
  );
};

export default HeroScene;
