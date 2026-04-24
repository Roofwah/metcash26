import { Deck } from '../types/presentation';

/**
 * Energizer Christmas Category Story
 * Based on Metcash Expo example deck content.
 *
 * The app uses `features/presentation-killer/` + `killerPresentationDeck` for the in-flow story.
 * This file remains as a stable reference copy.
 * Preview: /?preview=presentation (killer deck) or /?preview=presentation-killer (same deck)
 * (dev: port 3000, production: same origin e.g. :5001)
 *
 * To create a new deck:
 * 1. Copy this file, give it a new name and id.
 * 2. Edit the scenes array — each scene maps to a SceneType component.
 * 3. Import and pass your deck to <PresentationPlayer deck={yourDeck} /> and PresentationPreview.tsx.
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

    // ─── Specialty sizes — stagger in (2032 → A76) ───────────────────────────
    {
      id: 'scene-stagger-specialty',
      type: 'staggered-images',
      eyebrow: 'Specialty range',
      title: 'Core cell formats',
      subtitle: 'Key sizes for displays and counter units — in order of opportunity.',
      backgroundGradient: ['#070f1c', '#0a1628'],
      accentColor: '#ff6c08',
      imageSequence: [
        { src: '/products/2032.png', label: '2032' },
        { src: '/products/2025.png', label: '2025' },
        { src: '/products/2016.png', label: '2016' },
        { src: '/products/a23.png', label: 'A23' },
        { src: '/products/a76.png', label: 'A76' },
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
