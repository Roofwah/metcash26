export type SceneType =
  | 'hero'
  | 'insight-stat'
  | 'split-image-text'
  | 'offer'
  | 'closing-cta'
  | 'staggered-images';

export type TextAlignment = 'left' | 'center' | 'right';

export interface StatCallout {
  value: string;
  label: string;
  highlight?: boolean;
}

export interface ImageSequenceItem {
  src: string;
  label: string;
}

export interface SceneConfig {
  id: string;
  type: SceneType;
  alignment?: TextAlignment;
  eyebrow?: string;
  title: string;
  subtitle?: string;
  body?: string | string[];
  image?: string;
  /** For type `staggered-images`: images animate in order with labels below */
  imageSequence?: ImageSequenceItem[];
  /** For type `offer`: RHS circular layout (slide 5 style) — animates in sequence */
  orbitImageSequence?: ImageSequenceItem[];
  orbitCenterLabel?: string;
  backgroundGradient?: [string, string];
  accentColor?: string;
  stats?: StatCallout[];
  badge?: string;
  ctaLabel?: string;
  ctaAction?: 'next' | 'offers' | 'close';
}

export interface Deck {
  id: string;
  title: string;
  description?: string;
  scenes: SceneConfig[];
}
