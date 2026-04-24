import React from 'react';
import { motion } from 'framer-motion';
import { SceneConfig } from '../../types/presentation';
import { fadeUp, scaleIn, staggerContainer } from '../../utils/transitions';
import SpecialtyOrbitVisual from '../SpecialtyOrbitVisual';

interface Props {
  scene: SceneConfig;
  onCTA?: (action?: string) => void;
}

const OfferScene: React.FC<Props> = ({ scene, onCTA }) => {
  const accent = scene.accentColor || '#ff6c08';
  const [gradStart, gradEnd] = scene.backgroundGradient || ['#07101e', '#05090f'];

  return (
    <div
      className="scene offer-scene"
      style={{ background: `linear-gradient(150deg, ${gradStart} 0%, ${gradEnd} 100%)` }}
    >
      <div className="scene-noise" />

      {/* Ambient glow */}
      <div
        className="offer-glow"
        style={{ background: `radial-gradient(circle at 50% 40%, ${accent}12 0%, transparent 60%)` }}
      />

      <motion.div
        className="offer-layout"
        variants={staggerContainer(0.1, 0.06)}
        initial="hidden"
        animate="visible"
      >
        {/* ── Left: content ── */}
        <div className="offer-content-col">
          {scene.badge && (
            <motion.div
              className="offer-badge"
              variants={scaleIn}
              style={{ background: accent }}
            >
              {scene.badge}
            </motion.div>
          )}

          {scene.eyebrow && (
            <motion.div className="scene-eyebrow" variants={fadeUp} style={{ color: accent }}>
              {scene.eyebrow}
            </motion.div>
          )}

          <motion.h2 className="offer-title" variants={fadeUp}>
            {scene.title}
          </motion.h2>

          {scene.subtitle && (
            <motion.p className="offer-subtitle" variants={fadeUp}>
              {scene.subtitle}
            </motion.p>
          )}

          {scene.body && (
            <motion.p className="offer-body" variants={fadeUp}>
              {typeof scene.body === 'string' ? scene.body : scene.body.join(' ')}
            </motion.p>
          )}

          {scene.stats && scene.stats.length > 0 && (
            <motion.div className="offer-stat-row" variants={fadeUp}>
              {scene.stats.map((s, i) => (
                <div
                  key={i}
                  className="offer-stat-chip"
                  style={{ borderColor: `${accent}44` }}
                >
                  <span className="offer-stat-chip-value" style={{ color: accent }}>
                    {s.value}
                  </span>
                  <span className="offer-stat-chip-label">{s.label}</span>
                </div>
              ))}
            </motion.div>
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
        </div>

        {/* ── Right: visual ── */}
        <motion.div className="offer-visual-col" variants={scaleIn}>
          {scene.orbitImageSequence && scene.orbitImageSequence.length > 0 ? (
            <SpecialtyOrbitVisual
              items={scene.orbitImageSequence}
              accentColor={accent}
              centerLabel={(scene.orbitCenterLabel || 'SPECIALTY BATTERIES').trim()}
            />
          ) : scene.image ? (
            <img src={scene.image} alt={scene.title} className="offer-image" />
          ) : (
            /* Placeholder product visual — replace image prop with real asset path */
            <div className="offer-visual-placeholder">
              {/* Outer ring */}
              <div
                className="offer-ring offer-ring--outer"
                style={{ borderColor: `${accent}25` }}
              />
              {/* Middle ring */}
              <div
                className="offer-ring offer-ring--mid"
                style={{ borderColor: `${accent}45` }}
              />
              {/* Inner circle */}
              <div
                className="offer-ring offer-ring--inner"
                style={{ background: `${accent}12`, borderColor: `${accent}70` }}
              >
                {/* Battery icon */}
                <svg
                  width="52"
                  height="52"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke={accent}
                  strokeWidth="1.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="2" y="7" width="16" height="10" rx="2" ry="2" />
                  <line x1="22" y1="11" x2="22" y2="13" />
                  <line x1="7" y1="11" x2="7" y2="13" />
                  <line x1="10" y1="10" x2="10" y2="14" />
                </svg>
              </div>

              {/* Floating badge */}
              {scene.badge && (
                <div
                  className="offer-visual-badge"
                  style={{ background: accent }}
                >
                  {scene.badge}
                </div>
              )}
            </div>
          )}
        </motion.div>
      </motion.div>
    </div>
  );
};

export default OfferScene;
