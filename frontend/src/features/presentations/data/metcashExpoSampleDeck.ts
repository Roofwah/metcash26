import { Deck } from '../types/presentation';

/**
 * Energizer Christmas Category Story
 * Based on Metcash Expo example deck content.
 *
 * To create a new deck:
 * 1. Copy this file, give it a new name and id.
 * 2. Edit the scenes array — each scene maps to a SceneType component.
 * 3. Import and pass your deck to <PresentationPlayer deck={yourDeck} />.
 */
export const metcashExpoSampleDeck: Deck = {
  id: 'energizer-christmas-2025',
  title: 'Energizer Christmas Category Story',
  description: 'Category insights and commercial opportunity for Q4 battery sales.',

  scenes: [
    // ─── Scene 1: Hero ───────────────────────────────────────────────────────
    {
      id: 'scene-hero',
      type: 'hero',
      eyebrow: 'Category Insight — Q4 2025',
      title: 'Christmas is\nBattery Season.',
      subtitle:
        'December battery sales run over 2× any normal trading month. The opportunity is real — and it starts now.',
      backgroundGradient: ['#060810', '#0b1232'],
      accentColor: '#ff6c08',
    },

    // ─── Scene 2: Key Stats ──────────────────────────────────────────────────
    {
      id: 'scene-stats',
      type: 'insight-stat',
      eyebrow: 'The Numbers',
      title: 'Q4 Is Your Biggest Battery Window.',
      subtitle: "Energizer's Christmas data tells a clear story.",
      backgroundGradient: ['#090d1e', '#080d20'],
      accentColor: '#ff6c08',
      stats: [
        {
          value: '1 in 3',
          label: 'battery sales happen October through December',
          highlight: true,
        },
        {
          value: '2×',
          label: 'December revenue vs. a typical trading month',
        },
        {
          value: '>90%',
          label: 'of households will need batteries this Christmas',
        },
      ],
    },

    // ─── Scene 3: Insight / Risk ─────────────────────────────────────────────
    {
      id: 'scene-insight',
      type: 'split-image-text',
      eyebrow: 'The Risk',
      title: 'Invisible batteries\ncost you the sale.',
      body: [
        '78% of shoppers haven\'t planned their battery purchase — they buy on impulse.',
        'Without Front of Store visibility, 69% of forgotten purchases go to a competitor.',
        'A well-placed Energizer display captures impulse buyers before they walk out the door.',
      ],
      backgroundGradient: ['#120a06', '#180e08'],
      accentColor: '#ff6c08',
      stats: [
        {
          value: '69%',
          label: 'of missed sales go straight to a competitor',
          highlight: true,
        },
      ],
    },

    // ─── Scene 4: Offer ──────────────────────────────────────────────────────
    {
      id: 'scene-offer',
      type: 'offer',
      eyebrow: 'Featured Deal',
      title: 'Energizer Specialty Range',
      subtitle: "Australia's No.1 Specialty Battery Range",
      badge: '40% OFF',
      body: 'Purchase at least 1 of each of the top 5 specialty SKUs and receive 40% off. LPED may also be extended into the next cycle. Specialty Counter Units available on request.',
      backgroundGradient: ['#07101e', '#05090f'],
      accentColor: '#ff6c08',
      stats: [
        {
          value: '81%',
          label: 'of specialty sales are just these 5 SKUs',
          highlight: true,
        },
      ],
      // image: '/products/energizer-specialty.png', ← drop real asset here
    },

    // ─── Scene 5: Closing CTA ────────────────────────────────────────────────
    {
      id: 'scene-cta',
      type: 'closing-cta',
      title: 'Ready to maximise\nChristmas?',
      subtitle:
        'View the full Energizer range and lock in your order for Q4.',
      ctaLabel: 'Browse Offers',
      ctaAction: 'offers',
      backgroundGradient: ['#180800', '#0e0400'],
      accentColor: '#ff6c08',
    },
  ],
};
