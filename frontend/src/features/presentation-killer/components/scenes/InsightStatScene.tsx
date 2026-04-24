import React, { useEffect, useRef } from 'react';
import { motion, animate } from 'framer-motion';
import { SceneConfig, StatCallout } from '../../types/presentation';
import { fadeUp, scaleIn, staggerContainer } from '../../utils/transitions';

interface Props {
  scene: SceneConfig;
  onCTA?: (action?: string) => void;
}

/** Animates a number from 0 → to, with optional prefix/suffix */
const AnimatedCounter: React.FC<{
  to: number;
  prefix?: string;
  suffix?: string;
  delay?: number;
}> = ({ to, prefix = '', suffix = '', delay = 0.4 }) => {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      const controls = animate(0, to, {
        duration: 1.8,
        ease: [0.16, 1, 0.3, 1],
        onUpdate: (v) => {
          if (ref.current) {
            ref.current.textContent = `${prefix}${Math.round(v)}${suffix}`;
          }
        },
      });
      return () => controls.stop();
    }, delay * 1000);
    return () => clearTimeout(timer);
  }, [to, prefix, suffix, delay]);

  return (
    <span ref={ref}>
      {prefix}0{suffix}
    </span>
  );
};

/** Renders a single stat value — counter-animated if countTo is supplied, plain text otherwise */
const StatValue: React.FC<{ stat: StatCallout; accent: string; index: number }> = ({
  stat,
  accent,
  index,
}) => {
  const isHighlight = stat.highlight;
  const color = isHighlight ? accent : 'rgba(255,255,255,0.95)';
  const glowClass = isHighlight ? 'stat-value--glow' : '';

  if (stat.countTo != null) {
    return (
      <div
        className={`stat-value ${glowClass}`}
        style={{ color }}
      >
        <AnimatedCounter
          to={stat.countTo}
          prefix={stat.countPrefix}
          suffix={stat.countSuffix}
          delay={0.35 + index * 0.18}
        />
      </div>
    );
  }

  return (
    <div className={`stat-value ${glowClass}`} style={{ color }}>
      {stat.value}
    </div>
  );
};

const InsightStatScene: React.FC<Props> = ({ scene }) => {
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
          style={{ background: `${accent}30` }}
        />

        {/* Stats row */}
        {scene.stats && scene.stats.length > 0 && (
          <motion.div
            className="insight-stats"
            variants={staggerContainer(0.18, 0.32)}
          >
            {scene.stats.map((stat, i) => (
              <motion.div
                key={i}
                className={`stat-card${stat.highlight ? ' stat-card--highlight' : ''}`}
                variants={scaleIn}
                style={stat.highlight ? { borderTopColor: accent } : {}}
              >
                <StatValue stat={stat} accent={accent} index={i} />
                <div className="stat-label">{stat.label}</div>
              </motion.div>
            ))}
          </motion.div>
        )}

        {scene.footnote && (
          <p className="insight-footnote">{scene.footnote}</p>
        )}
      </motion.div>
    </div>
  );
};

export default InsightStatScene;
