/**
 * Align offers.csv Offer Group / OFFER with sales25 headers (GET /api/store-sales items).
 */

export function normalizeSalesCategoryKey(s: string): string {
  return String(s || '')
    .normalize('NFKC')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\u00A0\u2007\u202F]/g, ' ')
    .replace(/[^\p{L}\p{N}\s'/\-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .replace(/pre[-\s]?pack/gi, 'prepack')
    .trim();
}

export function canonicalSalesCategoryKey(s: string): string {
  let x = normalizeSalesCategoryKey(s);
  const suffixes = [/\s+stock\s+deal$/i, /\s+loose\s+stock$/i, /\s+loose\s+stock\s+deal$/i];
  let prev = '';
  while (prev !== x) {
    prev = x;
    for (const re of suffixes) {
      x = x.replace(re, '').trim();
    }
  }
  return x;
}

export function formatPriorYearSalesQty(q: number): string {
  const r = Math.round(q * 1000) / 1000;
  if (Math.abs(r - Math.round(r)) < 1e-9) return String(Math.round(r));
  return r % 1 === 0 ? String(r) : r.toFixed(2);
}

export function shouldShowPriorYearSalesQty(q: number | undefined): q is number {
  if (q === undefined || !Number.isFinite(q)) return false;
  const r = Math.round(q * 1000) / 1000;
  return r > 0;
}

export interface StoreSalesLineItem {
  name: string;
  qty: number;
}

const OFFER_ID_CATEGORY_MAP: Record<string, string[]> = {
  ENERGIZER1: ['Energizer Tower Pre-Pack'],
  ENERGIZER2: ["Energizer Max Plus 10's Penta"],
  ENERGIZER3: ['Energizer Max 14/16 Loose Stock', 'Energizer Max 24pk Loose Stock'],
  ENERGIZER4: ['Energizer Specialty Range Loose'],
  EVEREADY1: ['Eveready Tower Pre-Pack'],
  ARMORALL1: ['Armor All Quick Clean Kit'],
  ARMORALL2: ['Armor All Range Loose'],
  JELLYBELLY1: ['Jelly Belly Range Loose Stock Deal'],
  TORCH1: ['Eveready Lighting Tower'],
};

function canonicalOfferId(s: string): string {
  return String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

/** Map offer row → qty from GET /api/store-sales (items[].name = sales25 header). */
export function findPriorYearSalesQty(
  offer: { offerGroup?: string; offerId?: string },
  items: StoreSalesLineItem[],
): number | undefined {
  if (!items.length) return undefined;

  // Prefer explicit OFFER-id mapping to avoid broad/ambiguous group-name matching (e.g. "Energizer").
  const idKey = canonicalOfferId(String(offer.offerId || ''));
  const mappedCategories = OFFER_ID_CATEGORY_MAP[idKey];
  if (mappedCategories && mappedCategories.length > 0) {
    const qtyByCategory = new Map<string, number>();
    for (const it of items) {
      qtyByCategory.set(canonicalSalesCategoryKey(it.name), it.qty);
    }
    let sum = 0;
    let found = false;
    for (const c of mappedCategories) {
      const q = qtyByCategory.get(canonicalSalesCategoryKey(c));
      if (q !== undefined && Number.isFinite(q)) {
        sum += q;
        found = true;
      }
    }
    if (found) return Math.round(sum * 1000) / 1000;
  }

  const rawCandidates = [offer.offerGroup, offer.offerId].filter((s) => String(s || '').trim().length > 0);
  const candidates = rawCandidates.filter((s, i) => rawCandidates.indexOf(s) === i);

  for (const raw of candidates) {
    const g = canonicalSalesCategoryKey(String(raw));
    const hit = items.find((i) => canonicalSalesCategoryKey(i.name) === g);
    if (hit) return hit.qty;
  }
  for (const raw of candidates) {
    const g = canonicalSalesCategoryKey(String(raw));
    const subs = items.filter((i) => {
      const n = canonicalSalesCategoryKey(i.name);
      if (n === g) return true;
      return n.includes(g) || g.includes(n);
    });
    if (subs.length === 1) return subs[0].qty;
    if (subs.length > 1) {
      subs.sort(
        (a, b) => canonicalSalesCategoryKey(b.name).length - canonicalSalesCategoryKey(a.name).length,
      );
      return subs[0].qty;
    }
  }
  return undefined;
}
