// Framer Motion animation variants — bezier cast to any to satisfy TS ease typing
// eslint-disable-next-line
const expo: any = [0.16, 1, 0.3, 1]; // cubic-bezier expo-out

export const fadeUp = {
  hidden: { opacity: 0, y: 36 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: expo } },
};

export const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.8, ease: 'easeOut' } },
};

export const slideInLeft = {
  hidden: { opacity: 0, x: -56 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.7, ease: expo } },
};

export const slideInRight = {
  hidden: { opacity: 0, x: 56 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.7, ease: expo } },
};

export const scaleIn = {
  hidden: { opacity: 0, scale: 0.88 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.6, ease: expo } },
};

export const staggerContainer = (stagger = 0.12, delay = 0.1) => ({
  hidden: {},
  visible: {
    transition: {
      staggerChildren: stagger,
      delayChildren: delay,
    },
  },
});
