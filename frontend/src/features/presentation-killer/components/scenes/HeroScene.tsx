import React from 'react';
import { motion } from 'framer-motion';
import { SceneConfig } from '../../types/presentation';
import { fadeUp, staggerContainer } from '../../utils/transitions';

interface Props {
  scene: SceneConfig;
  onCTA?: (action?: string) => void;
}

/** Per-word entrance — skews in slightly for a cinematic feel */
const wordVariants = {
  hidden: { opacity: 0, y: 28, skewY: 2 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    skewY: 0,
    transition: {
      delay: 0.1 + i * 0.09,
      duration: 0.65,
      ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
    },
  }),
};

const HeroScene: React.FC<Props> = ({ scene, onCTA }) => {
  const accent = scene.accentColor || '#ff6c08';
  const [gradStart, gradEnd] = scene.backgroundGradient || ['#04040e', '#060820'];

  // Split title into lines → words; animate each word individually
  const titleLines = scene.title.split('\n');
  let wordIndex = 0;
  const renderedTitle = titleLines.map((line, lineIdx) => {
    const words = line.split(' ').filter(Boolean);
    const lineNodes = words.map((word) => {
      const i = wordIndex++;
      return (
        <motion.span
          key={`${lineIdx}-${i}`}
          className="hero-word"
          custom={i}
          variants={wordVariants}
          initial="hidden"
          animate="visible"
        >
          {word}
        </motion.span>
      );
    });
    return (
      <span key={lineIdx} style={{ display: 'block' }}>
        {lineNodes}
      </span>
    );
  });

  return (
    <div
      className="scene hero-scene"
      style={{ background: `linear-gradient(150deg, ${gradStart} 0%, ${gradEnd} 100%)` }}
    >
      {/* Subtle dot grid for depth */}
      <div className="scene-dot-grid" />

      {/* Drifting ambient blobs */}
      <div
        className="scene-blob scene-blob--1"
        style={{ background: accent, opacity: 0.07, top: '5%', left: '-8%' }}
      />
      <div
        className="scene-blob scene-blob--2"
        style={{ background: accent, opacity: 0.045, bottom: '20%', right: '2%' }}
      />

      <div className="scene-noise" />

      {/* Soft radial glow behind text */}
      <div
        className="hero-glow"
        style={{
          background: `radial-gradient(ellipse at 38% 58%, ${accent}18 0%, transparent 64%)`,
        }}
      />

      <motion.div
        className="hero-content"
        variants={staggerContainer(0.1, 0.06)}
        initial="hidden"
        animate="visible"
      >
        {scene.eyebrow && (
          <motion.div className="scene-eyebrow" variants={fadeUp} style={{ color: accent }}>
            {scene.eyebrow}
          </motion.div>
        )}

        <h1 className="hero-title">{renderedTitle}</h1>

        {scene.subtitle && (
          <motion.p
            className="hero-subtitle"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.62, ease: [0.16, 1, 0.3, 1] }}
          >
            {scene.subtitle}
          </motion.p>
        )}

        {scene.ctaLabel && (
          <motion.button
            className="scene-cta-btn"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.88, ease: [0.16, 1, 0.3, 1] }}
            onClick={() => onCTA?.(scene.ctaAction)}
            style={{ background: accent }}
          >
            {scene.ctaLabel}
          </motion.button>
        )}
      </motion.div>

      {/* Bottom accent bar — sweeps left to right */}
      <motion.div
        className="hero-accent-bar"
        initial={{ scaleX: 0, opacity: 0 }}
        animate={{ scaleX: 1, opacity: 1 }}
        transition={{ duration: 1.6, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
        style={{
          background: `linear-gradient(90deg, ${accent}, ${accent}00)`,
          transformOrigin: 'left',
        }}
      />
    </div>
  );
};

export default HeroScene;
