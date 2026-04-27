/**
 * MIXED + CHOOSE_N (e.g. TORCH_1): pick min–max distinct lines, each line qty 0 or [base, carton max].
 */

export function isMixedChooseNOffer(rules: {
  offerMode?: string;
  selectionRule?: string;
  minSelections?: number;
  maxSelections?: number;
} | undefined): boolean {
  if (!rules) return false;
  const mode = String(rules.offerMode || '').toUpperCase();
  const r = String(rules.selectionRule || '').toUpperCase();
  const min = Math.max(0, Number(rules.minSelections) || 0);
  const max = Math.max(0, Number(rules.maxSelections) || 0);
  return mode === 'MIXED' && r === 'CHOOSE_N' && min > 0 && max >= min;
}

export function countSelectedChooseNLines(lineQuantities: Record<string, number>, itemCount: number): number {
  let n = 0;
  for (let i = 0; i < itemCount; i++) {
    if ((Number(lineQuantities[`line-${i}`]) || 0) > 0) n++;
  }
  return n;
}

/** First `minSel` lines with base > 0 get `base`; others start at 0. */
export function initChooseNLineQuantities(
  items: { baseQty?: number; qty?: string; Qty?: string }[],
  minSel: number,
): Record<string, number> {
  const out: Record<string, number> = {};
  items.forEach((item, idx) => {
    const base = Math.max(0, Number(item.baseQty ?? item.qty ?? item.Qty ?? 0) || 0);
    out[`line-${idx}`] = idx < minSel && base > 0 ? base : 0;
  });
  return out;
}

export function chooseNMaxUnitsForLine(item: {
  baseQty?: number;
  qty?: string;
  Qty?: string;
  cartonQty?: number;
}): number {
  const base = Math.max(0, Number(item.baseQty ?? item.qty ?? item.Qty ?? 0) || 0);
  const cap = Number(item.cartonQty);
  const maxCap = Number.isFinite(cap) && cap > 0 ? cap : 999;
  return Math.max(base, maxCap);
}
