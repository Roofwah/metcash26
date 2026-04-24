import React from 'react';
import { motion } from 'framer-motion';
import { SceneConfig } from '../../types/presentation';
import { fadeUp } from '../../utils/transitions';

interface Props {
  scene: SceneConfig;
  onCTA?: (action?: string) => void;
}

const staggerItem = (index: number) => ({
  hidden: { opacity: 0, y: 28, scale: 0.96 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      delay: index * 0.22,
      duration: 0.55,
      ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
    },
  },
});

const StaggeredImagesScene: React.FC<Props> = ({ scene }) => {
  const accent = scene.accentColor || '#ff6c08';
  const [gradStart, gradEnd] = scene.backgroundGradient || ['#080d18', '#0a1028'];
  const items = scene.imageSequence || [];

  return (
    <div
      className="scene stagger-images-scene"
      style={{ background: `linear-gradient(150deg, ${gradStart} 0%, ${gradEnd} 100%)` }}
    >
      <div className="scene-noise" />
      <div
        className="stagger-images-glow"
        style={{
          background: `radial-gradient(ellipse at 50% 35%, ${accent}14 0%, transparent 58%)`,
        }}
      />

      <div className="stagger-images-inner">
        {scene.eyebrow && (
          <motion.div
            className="scene-eyebrow stagger-images-eyebrow"
            style={{ color: accent }}
            variants={fadeUp}
            initial="hidden"
            animate="visible"
          >
            {scene.eyebrow}
          </motion.div>
        )}

        <motion.h2
          className="stagger-images-title"
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          transition={{ delay: 0.06 }}
        >
          {scene.title}
        </motion.h2>

        {scene.subtitle && (
          <motion.p
            className="stagger-images-subtitle"
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            transition={{ delay: 0.12 }}
          >
            {scene.subtitle}
          </motion.p>
        )}

        <div className="stagger-images-grid" role="list">
          {items.map((item, index) => (
            <motion.div
              key={`${item.src}-${index}`}
              className="stagger-images-cell"
              role="listitem"
              initial="hidden"
              animate="visible"
              variants={staggerItem(index)}
            >
              <div className="stagger-images-frame" style={{ borderColor: `${accent}35` }}>
                <img src={item.src} alt="" className="stagger-images-img" />
              </div>
              <span className="stagger-images-label" style={{ color: accent }}>
                {item.label}
              </span>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default StaggeredImagesScene;
