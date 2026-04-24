export type SceneType =
  | 'hero'
  | 'insight-stat'
  | 'split-image-text'
  | 'offer'
  | 'closing-cta'
  | 'staggered-images'
  | 'quote-callout'
  | 'animated-bar-chart';

export type TextAlignment = 'left' | 'center' | 'right';

export interface StatCallout {
  value: string;
  label: string;
  highlight?: boolean;
  /** When set, the value is replaced by an animated counter from 0 → countTo */
  countTo?: number;
  countPrefix?: string;
  countSuffix?: string;
}

export interface ImageSequenceItem {
  src: string;
  label: string;
}

export interface BarData {
  label: string;
  /** Absolute value; bars scale relative to the max in the set */
  value: number;
  /** Optional formatted string shown beside the bar (e.g. "34%") */
  displayValue?: string;
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
  /** For type `quote-callout`: the pull quote text */
  quote?: string;
  /** For type `quote-callout`: attribution / source line below the quote */
  attribution?: string;
  /** For type `animated-bar-chart`: the bars dataset */
  bars?: BarData[];
  /** Small footnote shown below charts or stat blocks */
  footnote?: string;
}

export interface Deck {
  id: string;
  title: string;
  description?: string;
  scenes: SceneConfig[];
}
