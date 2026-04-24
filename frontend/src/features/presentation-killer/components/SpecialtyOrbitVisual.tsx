import React from 'react';
import { motion } from 'framer-motion';
import type { ImageSequenceItem } from '../types/presentation';

/** Clock positions ~11, 1, 4, 6, 8 o'clock — order matches 2032 → A76 */
const ORBIT_ANGLES_DEG = [-30, 30, 120, 180, 240];

const orbitItemVariants = (index: number) => ({
  hidden: { opacity: 0, scale: 0.85, y: 12 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      delay: index * 0.22,
      duration: 0.5,
      ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
    },
  },
});

interface Props {
  items: ImageSequenceItem[];
  accentColor: string;
  centerLabel: string;
}

/**
 * RHS specialty layout: concentric rings, center title, products on a ring with orange labels.
 */
const SpecialtyOrbitVisual: React.FC<Props> = ({ items, accentColor, centerLabel }) => {
  const rPct = 38;

  return (
    <div className="specialty-orbit">
      <div className="specialty-orbit-rings" aria-hidden="true">
        <div className="specialty-orbit-ring specialty-orbit-ring--1" style={{ borderColor: `${accentColor}22` }} />
        <div className="specialty-orbit-ring specialty-orbit-ring--2" style={{ borderColor: `${accentColor}33` }} />
        <div className="specialty-orbit-ring specialty-orbit-ring--3" style={{ borderColor: `${accentColor}44` }} />
      </div>

      <div className="specialty-orbit-hub" style={{ borderColor: accentColor }}>
        <span className="specialty-orbit-hub-text" style={{ color: accentColor }}>
          {centerLabel}
        </span>
      </div>

      {items.slice(0, 5).map((item, index) => {
        const deg = ORBIT_ANGLES_DEG[index] ?? 0;
        const rad = (deg * Math.PI) / 180;
        const x = Math.sin(rad) * rPct;
        const y = -Math.cos(rad) * rPct;

        return (
          <div
            key={`${item.src}-${index}`}
            className="specialty-orbit-node-anchor"
            style={{
              left: `calc(50% + ${x}%)`,
              top: `calc(50% + ${y}%)`,
            }}
          >
            <motion.div
              className="specialty-orbit-node"
              initial="hidden"
              animate="visible"
              variants={orbitItemVariants(index)}
            >
              <div className="specialty-orbit-pack" style={{ borderColor: `${accentColor}30` }}>
                <img src={item.src} alt="" className="specialty-orbit-img" />
              </div>
              <span
                className="specialty-orbit-sku-label"
                style={{ background: accentColor, color: '#0f0f0f' }}
              >
                {item.label}
              </span>
            </motion.div>
          </div>
        );
      })}
    </div>
  );
};

export default SpecialtyOrbitVisual;
