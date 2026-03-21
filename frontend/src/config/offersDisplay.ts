/**
 * Single source for offer **UI** wiring (images + strip grouping). Typed at build time — no
 * extra runtime files to sync. Commercial data stays on the API / backend offers.csv.
 *
 * Unknown `offerId` → no card image (card still renders). Unknown brand → no logo.
 */

export const OFFER_CARD_IMAGE_BY_OFFER_KEY: Record<string, string> = {
  'energizer 7': '/products/maxmod.png',
  'energizer 8': '/products/hl.png',
  'energizer 9': '/products/torch.png',
  'armorall 1': '/products/wash.png',
  'armorall 2': '/products/wash.png',
  'armorall 3': '/products/wash.png',
  'armorall 4': '/products/slr.png',
  'armorall 5': '/products/fragrances.png',
  'energizer 1': '/products/3024.png',
  'energizer 2': '/products/3024.png',
  'energizer 3': '/products/3024.png',
  'energizer 4': '/products/1614.png',
  'energizer 5': '/products/1614.png',
  'energizer 6': '/products/1614.png',
  'eveready 1': '/products/hd50.png',
  'eveready 2': '/products/hd50.png',
  'eveready 3': '/products/hd50.png',
};

export function offerCardImageForOfferId(offerId: string): string | null {
  if (typeof offerId !== 'string') return null;
  const key = offerId.trim().toLowerCase();
  if (!key) return null;
  const path = OFFER_CARD_IMAGE_BY_OFFER_KEY[key];
  return typeof path === 'string' && path.length > 0 ? path : null;
}

export function brandLogoPathForBrand(brand: string): string {
  if (typeof brand !== 'string' || !brand.trim()) return '';
  const b = brand.toLowerCase();
  if (b.includes('eveready')) return '/products/eready.png';
  if (b.includes('energizer')) return '/products/energizer.png';
  if (b.includes('armor')) return '/products/aall.png';
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

/** New-format CSV uses `Type` → API `offerGroup` (e.g. Batteries Prepack, Batteries Loose). */
export function isBatteryRetailStripOffer(offer: { offerGroup?: string }): boolean {
  const g = (offer.offerGroup || '').toLowerCase();
  return g.includes('battery') || g.includes('prepack') || g.includes('loose');
}

export function isEnergizerPalletOffer(offerId: string): boolean {
  if (typeof offerId !== 'string') return false;
  return /^(Energizer [1-6])$/.test(offerId);
}

export function isEvereadyPalletOffer(offerId: string): boolean {
  if (typeof offerId !== 'string') return false;
  return /^Eveready [123]$/.test(offerId);
}

export function isArmorAllPalletOffer(offerId: string): boolean {
  if (typeof offerId !== 'string') return false;
  return /^ArmorAll [123]$/.test(offerId);
}

export const PALLET_GROUP_BRANDS = ['Energizer', 'Eveready', 'Armor All'] as const;
