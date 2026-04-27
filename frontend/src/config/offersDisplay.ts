/**
 * Display order + brand logo fallbacks. Offer images come from the API
 * (`offer-content.json` merged on the backend), not from offer id maps here.
 */

export function brandLogoPathForBrand(brand: string): string {
  if (typeof brand !== 'string' || !brand.trim()) return '';
  const b = brand.toLowerCase();
  if (b.includes('eveready')) return '/products/eready.png';
  if (b.includes('energizer')) return '/products/energizer.png';
  if (b.includes('armor')) return '/products/aall.png';
  if (b.includes('jelly')) return '/products/jelly.png';
  if (b.includes('torch')) return '/products/eready.png';
  return '';
}

export const NON_PALLET_DISPLAY_ORDER = [
  'Energizer 7',
  'Energizer 8',
  'Energizer 9',
  'ArmorAll 4',
  'ArmorAll 5',
] as const;

export const NON_PALLET_DISPLAY_IDS = new Set<string>(NON_PALLET_DISPLAY_ORDER);

export function isNonPalletDisplayOffer(offerId: string): boolean {
  if (typeof offerId !== 'string' || !offerId.trim()) return false;
  return NON_PALLET_DISPLAY_IDS.has(offerId);
}

/**
 * Fixed display sequence: retail carousel + MSO matrix columns.
 * Matches mcash26 / offers.csv `OFFER` ids; trims / collapses whitespace when matching.
 * Unknown offer ids sort after known ids, then by name.
 */
export const OFFER_DISPLAY_ORDER: readonly string[] = [
  'ENERGIZER_1',
  'ENERGIZER_2',
  'ENERGIZER_3',
  'ENERGIZER_4',
  'EVEREADY_1',
  'ARMORALL_1',
  'ARMORALL_2',
  'JELLYBELLY_1',
  'TORCH_1',
  'Energizer Tower Pre-Pack',
  'Eveready Tower Pre-Pack',
  "Energizer Max Plus 10's Penta",
  'Energizer Max 14/16 Loose Stock',
  'Energizer Max 24pk Loose Stock',
  'Energizer Specialty Range Loose',
  'Armor All® Quick Clean Kit',
  'Armor All®  Range Loose',
  'Jelly Belly® Range Loose',
  'Eveready Lighting Tower',
  // Legacy program (after current rows when still present)
  'Energizer 7',
  'Energizer 8',
  'Energizer 9',
  'ArmorAll 4',
  'ArmorAll 5',
  'Energizer 1',
  'Energizer 2',
  'Energizer 3',
  'Energizer 4',
  'Energizer 5',
  'Energizer 6',
  'Eveready 1',
  'Eveready 2',
  'Eveready 3',
  'ArmorAll 1',
  'ArmorAll 2',
  'ArmorAll 3',
];

export function normalizeOfferIdKey(id: string): string {
  return String(id || '')
    .trim()
    .replace(/\s+/g, ' ');
}

const OFFER_DISPLAY_ORDER_INDEX = new Map<string, number>();
for (let i = 0; i < OFFER_DISPLAY_ORDER.length; i++) {
  OFFER_DISPLAY_ORDER_INDEX.set(normalizeOfferIdKey(OFFER_DISPLAY_ORDER[i]), i);
}

export function compareOffersByDisplayOrder(
  a: { offerId: string },
  b: { offerId: string },
): number {
  const ka = normalizeOfferIdKey(a.offerId);
  const kb = normalizeOfferIdKey(b.offerId);
  const ia = OFFER_DISPLAY_ORDER_INDEX.get(ka);
  const ib = OFFER_DISPLAY_ORDER_INDEX.get(kb);
  const fa = ia === undefined ? 100000 : ia;
  const fb = ib === undefined ? 100000 : ib;
  if (fa !== fb) return fa - fb;
  return ka.localeCompare(kb, undefined, { numeric: true, sensitivity: 'base' });
}

export function sortOffersByDisplayOrder<T extends { offerId: string }>(offers: T[]): T[] {
  return [...offers].sort(compareOffersByDisplayOrder);
}

/** New-format CSV uses `Type` → API `offerGroup` (e.g. Batteries Prepack, Batteries Loose). */
export function isBatteryRetailStripOffer(offer: { offerGroup?: string }): boolean {
  const g = (offer.offerGroup || '').toLowerCase();
  return g.includes('battery') || g.includes('prepack') || g.includes('loose');
}

/** Normalise spaces so "Armor All 1" and "ArmorAll 1" both work. */
function compactOfferId(offerId: string): string {
  return offerId.replace(/\s+/g, '');
}

export function isEnergizerPalletOffer(offerId: string): boolean {
  if (typeof offerId !== 'string') return false;
  const s = compactOfferId(offerId.trim());
  return /^Energizer[1-6]$/i.test(s);
}

export function isEvereadyPalletOffer(offerId: string): boolean {
  if (typeof offerId !== 'string') return false;
  const s = compactOfferId(offerId.trim());
  return /^Eveready[123]$/i.test(s);
}

export function isArmorAllPalletOffer(offerId: string): boolean {
  if (typeof offerId !== 'string') return false;
  const s = compactOfferId(offerId.trim());
  return /^ArmorAll[123]$/i.test(s);
}

export const PALLET_GROUP_BRANDS = ['Energizer', 'Eveready', 'Armor All'] as const;
