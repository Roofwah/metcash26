import React from 'react';
import { motion } from 'framer-motion';
import { SceneConfig } from '../../types/presentation';
import { fadeUp, staggerContainer } from '../../utils/transitions';

interface Props {
  scene: SceneConfig;
  onCTA?: (action?: string) => void;
}

const ClosingCTAScene: React.FC<Props> = ({ scene, onCTA }) => {
  const accent = scene.accentColor || '#ff6c08';
  const [gradStart, gradEnd] = scene.backgroundGradient || ['#180800', '#0e0400'];
  const titleLines = scene.title.split('\n');

  return (
    <div
      className="scene cta-scene"
      style={{ background: `linear-gradient(150deg, ${gradStart} 0%, ${gradEnd} 100%)` }}
    >
      <div className="scene-noise" />

      {/* Large ambient glow */}
      <motion.div
        className="cta-glow"
        initial={{ opacity: 0, scale: 0.7 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
        style={{
          background: `radial-gradient(ellipse at 50% 55%, ${accent}28 0%, transparent 65%)`,
        }}
      />

      <motion.div
        className="cta-content"
        variants={staggerContainer(0.16, 0.1)}
        initial="hidden"
        animate="visible"
      >
        {scene.eyebrow && (
          <motion.div className="scene-eyebrow" variants={fadeUp} style={{ color: accent }}>
            {scene.eyebrow}
          </motion.div>
        )}

        <motion.h1 className="cta-title" variants={fadeUp}>
          {titleLines.map((line, i) => (
            <span key={i}>
              {line}
              {i < titleLines.length - 1 && <br />}
            </span>
          ))}
        </motion.h1>

        {scene.subtitle && (
          <motion.p className="cta-subtitle" variants={fadeUp}>
            {scene.subtitle}
          </motion.p>
        )}

        {scene.ctaLabel && (
          <motion.div variants={fadeUp}>
            <motion.button
              className="cta-primary-btn"
              onClick={() => onCTA?.(scene.ctaAction)}
              style={{ background: accent }}
              whileHover={{ scale: 1.04, boxShadow: `0 0 48px ${accent}66` }}
              whileTap={{ scale: 0.97 }}
              animate={{
                boxShadow: [
                  `0 0 0px ${accent}00`,
                  `0 0 40px ${accent}50`,
                  `0 0 0px ${accent}00`,
                ],
              }}
              transition={{
                boxShadow: {
                  duration: 2.8,
                  repeat: Infinity,
                  ease: 'easeInOut',
                  delay: 0.8,
                },
              }}
            >
              {scene.ctaLabel}
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </motion.button>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
};

export default ClosingCTAScene;
