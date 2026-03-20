export type SceneType =
  | 'hero'
  | 'insight-stat'
  | 'split-image-text'
  | 'offer'
  | 'closing-cta';

export type TextAlignment = 'left' | 'center' | 'right';

export interface StatCallout {
  value: string;
  label: string;
  highlight?: boolean;
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
