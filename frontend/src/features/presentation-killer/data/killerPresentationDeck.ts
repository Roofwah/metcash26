import { Deck } from '../types/presentation';

/**
 * Killer-edit deck — sandbox for heavy iteration.
 * Preview (no login): /?preview=presentation-killer
 *
 * Scene order:
 *  1. Hero          — "Christmas is Battery Season."
 *  2. Bar Chart     — Q4 seasonal spike (animated bars)
 *  3. Insight Stats — 3 key numbers (animated counters)
 *  4. Specialty     — Staggered product range
 *  5. Quote         — The impulse-purchase insight
 *  6. Risk          — Split: visibility = sales
 *  7. Offer         — 40% OFF specialty range
 *  8. Closing CTA   — "Ready to Own Christmas?"
 */
export const killerPresentationDeck: Deck = {
  id: 'energizer-christmas-2025-killer',
  title: 'Energizer Christmas Category Story',
  description: 'Q4 battery category story for Energizer AU — killer edit.',

  scenes: [
    // ── 1. Hero ───────────────────────────────────────────────
    {
      id: 'scene-hero',
      type: 'hero',
      eyebrow: 'Category Insight — Q4 2025',
      title: 'Christmas is\nBattery Season.',
      subtitle:
        'Q4 accounts for 1 in 3 battery sales. December alone outperforms any other trading month by 2×. The window is real — and it\'s almost here.',
      backgroundGradient: ['#04040e', '#060820'],
      accentColor: '#ff6c08',
    },

    // ── 2. Q4 Seasonal Bar Chart ──────────────────────────────
    {
      id: 'scene-bar-chart',
      type: 'animated-bar-chart',
      eyebrow: 'The Seasonal Spike',
      title: 'Q4 Is Your Biggest Battery Window.',
      subtitle: 'Annual battery category sales by quarter — Australia.',
      backgroundGradient: ['#04060e', '#05080f'],
      accentColor: '#ff6c08',
      bars: [
        { label: 'Q1', value: 22, displayValue: '22%' },
        { label: 'Q2', value: 24, displayValue: '24%' },
        { label: 'Q3', value: 20, displayValue: '20%' },
        { label: 'Q4', value: 34, displayValue: '34%', highlight: true },
      ],
      footnote: 'Source: Energizer AU category data, FY2024.',
    },

    // ── 3. Key Stats (animated counters) ─────────────────────
    {
      id: 'scene-stats',
      type: 'insight-stat',
      eyebrow: 'Why Q4 Matters',
      title: 'The Christmas Numbers\nAre Impossible to Ignore.',
      subtitle: 'Energizer AU category research, FY2024.',
      backgroundGradient: ['#090d1e', '#080d20'],
      accentColor: '#ff6c08',
      stats: [
        {
          value: '1 in 3',
          label: 'Australian battery sales happen in Q4 — October through December',
          highlight: true,
        },
        {
          value: '2×',
          label: 'December revenue vs. any other trading month',
          countTo: 2,
          countSuffix: '×',
        },
        {
          value: '>90%',
          label: 'of households will need batteries this Christmas',
          countTo: 90,
          countPrefix: '>',
          countSuffix: '%',
        },
      ],
    },

    // ── 4. Specialty range stagger ────────────────────────────
    {
      id: 'scene-stagger-specialty',
      type: 'staggered-images',
      eyebrow: 'The Energizer Specialty Range',
      title: 'Five SKUs. 81% of Specialty Sales.',
      subtitle:
        'The formats driving growth — in order of opportunity. Every one of these should be on your shelf this Christmas.',
      backgroundGradient: ['#060f1c', '#091424'],
      accentColor: '#ff6c08',
      imageSequence: [
        { src: '/products/2032.png', label: '2032' },
        { src: '/products/2025.png', label: '2025' },
        { src: '/products/2016.png', label: '2016' },
        { src: '/products/a23.png',  label: 'A23'  },
        { src: '/products/a76.png',  label: 'A76'  },
      ],
    },

    // ── 5. Quote Callout — impulse insight ────────────────────
    {
      id: 'scene-quote',
      type: 'quote-callout',
      eyebrow: 'The Consumer Truth',
      title: 'The impulse insight',
      quote:
        '78% of battery shoppers make their decision in-store. Not at home. Not online. In your aisle.',
      attribution: 'Energizer Consumer Behaviour Research, 2024',
      backgroundGradient: ['#06080e', '#080610'],
      accentColor: '#ff6c08',
    },

    // ── 6. Risk — split text + stat ───────────────────────────
    {
      id: 'scene-risk',
      type: 'split-image-text',
      eyebrow: 'The Risk',
      title: 'If They Don\'t See It,\nThey Don\'t Buy It.',
      body: [
        'Without front-of-store placement, 69% of impulse battery purchases go straight to a competitor.',
        'Christmas is the one time every household actively needs batteries. Visibility is everything.',
        'A well-positioned Energizer display captures the moment customers are most ready to buy.',
      ],
      backgroundGradient: ['#120a06', '#180e08'],
      accentColor: '#ff6c08',
      stats: [
        {
          value: '69%',
          label: 'of impulse sales go to a competitor when you\'re not front-of-store',
          highlight: true,
        },
      ],
    },



    // ── 8. Closing CTA ────────────────────────────────────────
    {
      id: 'scene-cta',
      type: 'closing-cta',
      title: 'Ready to Own\nChristmas?',
      subtitle:
        'Lock in your Energizer Specialty Range order now and capture Q4\'s biggest battery opportunity.',
      ctaLabel: 'Browse Offers',
      ctaAction: 'offers',
      backgroundGradient: ['#180800', '#0e0400'],
      accentColor: '#ff6c08',
    },
  ],
};
