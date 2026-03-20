import React from 'react';
import { motion } from 'framer-motion';
import { SceneConfig } from '../../types/presentation';
import { fadeUp, scaleIn, staggerContainer } from '../../utils/transitions';

interface Props {
  scene: SceneConfig;
  onCTA?: (action?: string) => void;
}

const InsightStatScene: React.FC<Props> = ({ scene, onCTA }) => {
  const accent = scene.accentColor || '#ff6c08';
  const [gradStart, gradEnd] = scene.backgroundGradient || ['#090d1e', '#080d20'];

  return (
    <div
      className="scene insight-scene"
      style={{ background: `linear-gradient(150deg, ${gradStart} 0%, ${gradEnd} 100%)` }}
    >
      <div className="scene-noise" />

      <motion.div
        className="insight-inner"
        variants={staggerContainer(0.1, 0.05)}
        initial="hidden"
        animate="visible"
      >
        {/* Header block */}
        <div className="insight-header">
          {scene.eyebrow && (
            <motion.div className="scene-eyebrow" variants={fadeUp} style={{ color: accent }}>
              {scene.eyebrow}
            </motion.div>
          )}
          <motion.h2 className="insight-title" variants={fadeUp}>
            {scene.title}
          </motion.h2>
          {scene.subtitle && (
            <motion.p className="insight-subtitle" variants={fadeUp}>
              {scene.subtitle}
            </motion.p>
          )}
        </div>

        {/* Divider */}
        <motion.div
          className="insight-divider"
          variants={fadeUp}
          style={{ background: `${accent}33` }}
        />

        {/* Stats row */}
        {scene.stats && scene.stats.length > 0 && (
          <motion.div
            className="insight-stats"
            variants={staggerContainer(0.18, 0.35)}
          >
            {scene.stats.map((stat, i) => (
              <motion.div
                key={i}
                className={`stat-card${stat.highlight ? ' stat-card--highlight' : ''}`}
                variants={scaleIn}
                style={stat.highlight ? { borderTopColor: accent } : {}}
              >
                <div
                  className="stat-value"
                  style={{ color: stat.highlight ? accent : 'rgba(255,255,255,0.95)' }}
                >
                  {stat.value}
                </div>
                <div className="stat-label">{stat.label}</div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </motion.div>
    </div>
  );
};

export default InsightStatScene;
