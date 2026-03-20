import React from 'react';
import { motion } from 'framer-motion';
import { SceneConfig } from '../../types/presentation';
import { fadeUp, scaleIn, staggerContainer } from '../../utils/transitions';

interface Props {
  scene: SceneConfig;
  onCTA?: (action?: string) => void;
}

const SplitImageTextScene: React.FC<Props> = ({ scene, onCTA }) => {
  const accent = scene.accentColor || '#ff6c08';
  const [gradStart, gradEnd] = scene.backgroundGradient || ['#120a06', '#180e08'];
  const bodyLines = Array.isArray(scene.body)
    ? scene.body
    : scene.body
    ? [scene.body]
    : [];

  const titleLines = scene.title.split('\n');

  return (
    <div
      className="scene split-scene"
      style={{ background: `linear-gradient(150deg, ${gradStart} 0%, ${gradEnd} 100%)` }}
    >
      <div className="scene-noise" />

      <div className="split-layout">
        {/* ── Left: Text ── */}
        <motion.div
          className="split-text-col"
          variants={staggerContainer(0.13, 0.08)}
          initial="hidden"
          animate="visible"
        >
          {scene.eyebrow && (
            <motion.div className="scene-eyebrow" variants={fadeUp} style={{ color: accent }}>
              {scene.eyebrow}
            </motion.div>
          )}

          <motion.h2 className="split-title" variants={fadeUp}>
            {titleLines.map((line, i) => (
              <span key={i}>
                {line}
                {i < titleLines.length - 1 && <br />}
              </span>
            ))}
          </motion.h2>

          {bodyLines.length > 0 && (
            <motion.ul
              className="split-body-list"
              variants={staggerContainer(0.12, 0.25)}
            >
              {bodyLines.map((line, i) => (
                <motion.li key={i} className="split-body-item" variants={fadeUp}>
                  <span className="split-body-bullet" style={{ background: accent }} />
                  {line}
                </motion.li>
              ))}
            </motion.ul>
          )}
        </motion.div>

        {/* ── Right: Visual / Stat ── */}
        <motion.div
          className="split-visual-col"
          initial="hidden"
          animate="visible"
          variants={staggerContainer(0.15, 0.4)}
        >
          {scene.image ? (
            <motion.img
              src={scene.image}
              alt=""
              className="split-image"
              variants={scaleIn}
            />
          ) : scene.stats && scene.stats.length > 0 ? (
            <motion.div className="split-stat-spotlight" variants={scaleIn}>
              {/* Decorative ring */}
              <div
                className="split-stat-ring"
                style={{ borderColor: `${accent}30` }}
              />
              <div
                className="split-stat-value"
                style={{ color: accent }}
              >
                {scene.stats[0].value}
              </div>
              <div className="split-stat-label">{scene.stats[0].label}</div>
            </motion.div>
          ) : (
            // Generic visual placeholder
            <motion.div className="split-visual-placeholder" variants={scaleIn}>
              <div
                className="split-visual-shape"
                style={{ background: `${accent}15`, borderColor: `${accent}30` }}
              />
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default SplitImageTextScene;
