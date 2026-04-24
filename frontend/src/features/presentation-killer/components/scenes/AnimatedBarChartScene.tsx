import React from 'react';
import { motion } from 'framer-motion';
import { SceneConfig, BarData } from '../../types/presentation';
import { fadeUp, staggerContainer } from '../../utils/transitions';

interface Props {
  scene: SceneConfig;
  onCTA?: (action?: string) => void;
}

const expo = [0.16, 1, 0.3, 1] as [number, number, number, number];

const AnimatedBarChartScene: React.FC<Props> = ({ scene }) => {
  const accent = scene.accentColor || '#ff6c08';
  const [gradStart, gradEnd] = scene.backgroundGradient || ['#04060e', '#05080f'];
  const bars: BarData[] = scene.bars || [];

  const maxValue = Math.max(...bars.map((b) => b.value), 1);

  return (
    <div
      className="scene bar-chart-scene"
      style={{ background: `linear-gradient(150deg, ${gradStart} 0%, ${gradEnd} 100%)` }}
    >
      {/* Dot grid */}
      <div className="scene-dot-grid" />

      {/* Ambient glow on the highlighted bar side */}
      <div
        className="scene-blob scene-blob--2"
        style={{ background: accent, opacity: 0.05, bottom: '10%', right: '0%' }}
      />

      <div className="scene-noise" />

      <motion.div
        className="bar-chart-inner"
        variants={staggerContainer(0.08, 0.05)}
        initial="hidden"
        animate="visible"
      >
        {/* Header */}
        <div className="bar-chart-header">
          {scene.eyebrow && (
            <motion.div className="scene-eyebrow" variants={fadeUp} style={{ color: accent }}>
              {scene.eyebrow}
            </motion.div>
          )}
          <motion.h2 className="bar-chart-title" variants={fadeUp}>
            {scene.title}
          </motion.h2>
          {scene.subtitle && (
            <motion.p className="bar-chart-subtitle" variants={fadeUp}>
              {scene.subtitle}
            </motion.p>
          )}
        </div>

        {/* Bars */}
        <div className="bar-chart-rows">
          {bars.map((bar, i) => {
            const widthPct = (bar.value / maxValue) * 100;
            const isHighlight = bar.highlight;

            return (
              <motion.div
                key={i}
                className={`bar-row${isHighlight ? ' bar-row--highlight' : ''}`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.2 + i * 0.14, ease: expo }}
              >
                <div className="bar-row-label">{bar.label}</div>

                <div className="bar-track">
                  <motion.div
                    className={`bar-fill ${isHighlight ? 'bar-fill--highlight' : 'bar-fill--default'}`}
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{
                      duration: 1.1,
                      delay: 0.35 + i * 0.14,
                      ease: expo,
                    }}
                    style={{
                      width: `${widthPct}%`,
                      transformOrigin: 'left',
                    }}
                  >
                    {isHighlight && (
                      <span className="bar-inline-label">Battery Season</span>
                    )}
                  </motion.div>
                </div>

                {bar.displayValue && (
                  <div className="bar-display-value">{bar.displayValue}</div>
                )}
              </motion.div>
            );
          })}
        </div>

        {scene.footnote && (
          <motion.p
            className="bar-chart-footnote"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.9, ease: 'easeOut' }}
          >
            {scene.footnote}
          </motion.p>
        )}
      </motion.div>
    </div>
  );
};

export default AnimatedBarChartScene;
