import { DEFAULT_DROP_MONTH } from '../constants/dropMonths';
import { offerCardEditorialHeading } from './offerMedia';
import { chooseNMaxUnitsForLine, isMixedChooseNOffer } from './mixedChooseN';
import { recomputeChooseNPackCount, recomputeSplitBundleW, type BundleLineDetail } from './expandRetailOrderItems';

export type MsoMatrixOfferRules = {
  offerMode?: string;
  minBundleQty?: number;
  allowLineIncrease?: boolean;
  selectionRule?: string;
  minSelections?: number;
  maxSelections?: number;
};

export type MsoMatrixOfferLine = {
  sku?: string;
  description?: string;
  baseQty?: number;
  expoTotalCost?: number;
  cartonQty?: number;
};

/** Offer shape needed to build MSO matrix cart rows (subset of GET /api/offers). */
export type MsoMatrixOffer = {
  offerId: string;
  offerTier: string;
  totalCost: string;
  expoChargeBackCost: string;
  descriptions: { description?: string }[];
  modalTitle?: string;
  h1?: string;
  rules?: MsoMatrixOfferRules;
  items?: MsoMatrixOfferLine[];
};

export type MsoMatrixCartItem = {
  offerId: string;
  offerTier?: string;
  quantity: number;
  description: string;
  cost: string;
  dropMonths?: string[];
  msoStoreKey: string;
  minQuantity?: number;
  lockQuantity?: boolean;
  fixedBundle?: boolean;
  splitBundle?: boolean;
  chooseNBundle?: boolean;
  lineDetails?: BundleLineDetail[];
  chooseNMinSel?: number;
};

/** SPLIT + allow line increase with SKU rows (matrix / modal). */
export function isMsoSplitLineIncreaseOffer(offer: MsoMatrixOffer): boolean {
  const mode = String(offer.rules?.offerMode || '').toUpperCase();
  return mode === 'SPLIT' && !!offer.rules?.allowLineIncrease && (offer.items?.length ?? 0) > 0;
}

/** Apply one line qty change; syncs W and drop months (same rules as retail App). */
export function updateSplitBundleLineQuantity(
  row: MsoMatrixCartItem,
  description: string,
  quantity: number,
): MsoMatrixCartItem {
  const details = [...(row.lineDetails || [])];
  const di = details.findIndex((d) => d.description === description);
  if (di < 0) return row;
  const base = Math.max(1, Number(details[di].baseQty) || 1);
  const W = Math.max(1, Number(row.quantity) || 1);
  const floorSync = W * base;
  const minLine = quantity < floorSync ? quantity : floorSync;
  const nextLineQty = Math.max(minLine, quantity);
  details[di] = { ...details[di], quantity: nextLineQty };
  const newW = recomputeSplitBundleW(details);
  if (newW <= 0) {
    return { ...row, lineDetails: details, quantity: 0, cost: '0.00', dropMonths: [] };
  }
  const sum = details.reduce((s, l) => s + parseFloat(l.cost) * l.quantity, 0);
  const perW = newW > 0 ? sum / newW : 0;
  return {
    ...row,
    lineDetails: details,
    quantity: newW,
    cost: (Number.isFinite(perW) ? perW : 0).toFixed(2),
    dropMonths: Array.from({ length: Math.max(1, newW) }, () => DEFAULT_DROP_MONTH),
  };
}

/** Stable line key matching {@link buildMsoMatrixCartItemFromCell} / modal CHOOSE_N rows. */
export function chooseNMatrixLineDescription(line: MsoMatrixOfferLine, idx: number): string {
  return `${line.description || 'SKU'} (${line.sku || idx + 1})`;
}

function repriceChooseNMatrixRow(row: MsoMatrixCartItem): MsoMatrixCartItem {
  const details = row.lineDetails || [];
  const lineSum = details.reduce((s, l) => s + parseFloat(String(l.cost || '0')) * (l.quantity || 0), 0);
  const newW = Math.max(1, recomputeChooseNPackCount(details));
  const prev = row.dropMonths || [];
  const pad = [...prev];
  while (pad.length < newW) pad.push(DEFAULT_DROP_MONTH);
  const dropMonths = pad.slice(0, newW);
  return {
    ...row,
    quantity: 1,
    chooseNBundle: true,
    cost: lineSum.toFixed(2),
    dropMonths,
  };
}

function findOfferLineIndexByDescription(offer: MsoMatrixOffer, description: string): number {
  const items = offer.items || [];
  for (let i = 0; i < items.length; i++) {
    if (chooseNMatrixLineDescription(items[i], i) === description) return i;
  }
  return -1;
}

/**
 * Effective CHOOSE_N row for a matrix cell (custom bundle or built from grid `q`).
 */
export function getEffectiveChooseNMatrixRow(
  offer: MsoMatrixOffer,
  store: { storeName: string },
  q: number,
  storeKey: string,
  custom: MsoMatrixCartItem | null | undefined,
): MsoMatrixCartItem | null {
  if (!isMixedChooseNOffer(offer.rules) || q <= 0) return null;
  if (custom && custom.quantity > 0 && custom.chooseNBundle) return { ...custom };
  return buildMsoMatrixCartItemFromCell(offer, store, q, storeKey);
}

/** Add an offer line that is not yet in `lineDetails` (retail card “+” on empty torch row). */
export function chooseNMatrixAddNewLine(
  row: MsoMatrixCartItem,
  offer: MsoMatrixOffer,
  lineIdx: number,
): MsoMatrixCartItem | null {
  const rules = offer.rules;
  if (!isMixedChooseNOffer(rules)) return null;
  const maxSel = Math.max(0, Number(rules?.maxSelections) || 0);
  const minSel = Math.max(0, Number(rules?.minSelections) || 0);
  const items = offer.items || [];
  const line = items[lineIdx];
  if (!line) return null;
  const base = Math.max(0, Number(line.baseQty) || 0);
  if (base <= 0) return null;
  const desc = chooseNMatrixLineDescription(line, lineIdx);
  const details = [...(row.lineDetails || [])];
  if (details.some((d) => d.description === desc)) return null;
  const active = details.filter((l) => (l.quantity || 0) > 0).length;
  if (active >= maxSel) return null;
  const expo = Number(line.expoTotalCost) || 0;
  const unit = base > 0 ? expo / base : expo;
  const c = Number.isFinite(unit) ? unit : 0;
  details.push({
    description: desc,
    quantity: base,
    cost: c.toFixed(2),
    baseQty: base,
    sku: String(line.sku || '').trim() || undefined,
  });
  return repriceChooseNMatrixRow({
    ...row,
    lineDetails: details,
    chooseNMinSel: minSel,
  });
}

/** +/- one unit on an existing CHOOSE_N line (min/max selections and carton cap). */
export function chooseNMatrixBumpExistingLine(
  row: MsoMatrixCartItem,
  offer: MsoMatrixOffer,
  description: string,
  delta: 1 | -1,
): MsoMatrixCartItem | null {
  const rules = offer.rules;
  if (!isMixedChooseNOffer(rules)) return null;
  const minSel = Math.max(0, Number(rules?.minSelections) || 0);
  const details = [...(row.lineDetails || [])];
  const di = details.findIndex((d) => d.description === description);
  if (di < 0) return null;
  const d = details[di];
  const cur = Math.max(0, Number(d.quantity) || 0);
  const base = Math.max(1, Number(d.baseQty) || 1);
  const itemIdx = findOfferLineIndexByDescription(offer, description);
  const items = offer.items || [];
  const item = itemIdx >= 0 ? items[itemIdx] : undefined;
  const maxPer = item ? chooseNMaxUnitsForLine(item) : 999;

  if (delta === -1 && cur === 0) return null;

  if (delta === 1) {
    if (cur >= maxPer) return null;
    if (cur < base) {
      details[di] = { ...d, quantity: base };
      return repriceChooseNMatrixRow({ ...row, lineDetails: details });
    }
    details[di] = { ...d, quantity: cur + 1 };
    return repriceChooseNMatrixRow({ ...row, lineDetails: details });
  }

  if (cur > base) {
    details[di] = { ...d, quantity: cur - 1 };
    return repriceChooseNMatrixRow({ ...row, lineDetails: details });
  }

  const rest = details.filter((_, i) => i !== di);
  const activeAfter = rest.filter((l) => (l.quantity || 0) > 0).length;
  if (activeAfter < minSel) return null;
  return repriceChooseNMatrixRow({ ...row, lineDetails: rest });
}

function parseMoney(value?: string): number {
  if (!value) return 0;
  const n = parseFloat(String(value).replace(/[^0-9.-]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

function isFixedLikeOfferRules(rules?: MsoMatrixOfferRules): boolean {
  const mode = String(rules?.offerMode || '').toUpperCase();
  const allow = !!rules?.allowLineIncrease;
  return mode === 'FIXED' || (mode === 'SPLIT' && !allow);
}

/**
 * Expo $ committed for one matrix cell (must match {@link buildMsoMatrixCartItemFromCell}).
 */
export function msoMatrixCellCommittedExpo(offer: MsoMatrixOffer, q: number): number {
  if (q <= 0) return 0;
  const lines = offer.items || [];
  const rules = offer.rules;

  if (lines.length > 0 && isMixedChooseNOffer(rules)) {
    const minSel = Math.max(0, Number(rules?.minSelections) || 0);
    let oneBundle = 0;
    lines.forEach((line, idx) => {
      const baseQty = Math.max(0, Number(line.baseQty) || 0);
      if (idx >= minSel || baseQty <= 0) return;
      const expo = Number(line.expoTotalCost) || 0;
      const unit = baseQty > 0 ? expo / baseQty : expo;
      oneBundle += unit * baseQty;
    });
    return oneBundle * q;
  }

  if (lines.length > 0 && isFixedLikeOfferRules(rules)) {
    const minB = Math.max(1, Number(rules?.minBundleQty) || 1);
    let totalExpo = 0;
    for (const line of lines) {
      const b = Math.max(0, Number(line.baseQty) || 0);
      if (b > 0) totalExpo += Number(line.expoTotalCost) || 0;
    }
    const perChunk = minB > 0 && totalExpo > 0 ? totalExpo / minB : 0;
    return perChunk * q * minB;
  }

  if (lines.length > 0 && String(rules?.offerMode || '').toUpperCase() === 'SPLIT' && rules?.allowLineIncrease) {
    const lineDetails: BundleLineDetail[] = [];
    lines.forEach((line, idx) => {
      const baseQty = Math.max(0, Number(line.baseQty) || 0);
      if (baseQty <= 0) return;
      const expo = Number(line.expoTotalCost) || 0;
      const unit = baseQty > 0 ? expo / baseQty : expo;
      lineDetails.push({
        description: `${line.description || 'SKU'} (${line.sku || idx + 1})`,
        quantity: baseQty * q,
        cost: (Number.isFinite(unit) ? unit : 0).toFixed(2),
        baseQty,
        sku: String(line.sku || '').trim() || undefined,
      });
    });
    return lineDetails.reduce((s, l) => s + parseFloat(l.cost) * l.quantity, 0);
  }

  return parseMoney(offer.totalCost) * q;
}

/**
 * One cart row for a store × offer matrix cell (retail-aligned bundle shapes for save expansion).
 */
export function buildMsoMatrixCartItemFromCell(
  offer: MsoMatrixOffer,
  store: { storeName: string },
  q: number,
  storeKey: string,
): MsoMatrixCartItem | null {
  if (q <= 0) return null;
  const lines = offer.items || [];
  const rules = offer.rules;
  const tier = (offer.offerTier || '').trim() || offer.descriptions[0]?.description?.trim() || undefined;
  const title = offerCardEditorialHeading(offer) || offer.offerId;
  const descSuffix = ` — ${store.storeName}`;

  if (lines.length > 0 && isMixedChooseNOffer(rules)) {
    const minSel = Math.max(0, Number(rules?.minSelections) || 0);
    const lineDetails: BundleLineDetail[] = [];
    let sum = 0;
    lines.forEach((line, idx) => {
      const baseQty = Math.max(0, Number(line.baseQty) || 0);
      if (idx >= minSel || baseQty <= 0) return;
      const expo = Number(line.expoTotalCost) || 0;
      const unit = baseQty > 0 ? expo / baseQty : expo;
      const c = Number.isFinite(unit) ? unit : 0;
      const lineQty = baseQty * q;
      sum += c * lineQty;
      lineDetails.push({
        description: `${line.description || 'SKU'} (${line.sku || idx + 1})`,
        quantity: lineQty,
        cost: c.toFixed(2),
        baseQty,
        sku: String(line.sku || '').trim() || undefined,
      });
    });
    if (lineDetails.length === 0) return null;
    const wPack = Math.max(1, recomputeChooseNPackCount(lineDetails));
    return {
      offerId: offer.offerId,
      offerTier: tier,
      quantity: 1,
      description: `${title}${descSuffix}`,
      cost: sum.toFixed(2),
      dropMonths: Array.from({ length: wPack }, () => DEFAULT_DROP_MONTH),
      msoStoreKey: storeKey,
      minQuantity: 1,
      lockQuantity: true,
      chooseNBundle: true,
      chooseNMinSel: minSel,
      lineDetails,
    };
  }

  if (lines.length > 0 && isFixedLikeOfferRules(rules)) {
    const minB = Math.max(1, Number(rules?.minBundleQty) || 1);
    let totalExpo = 0;
    for (const line of lines) {
      const b = Math.max(0, Number(line.baseQty) || 0);
      if (b > 0) totalExpo += Number(line.expoTotalCost) || 0;
    }
    const quantity = q * minB;
    const perChunk = minB > 0 && totalExpo > 0 ? totalExpo / minB : 0;
    return {
      offerId: offer.offerId,
      offerTier: tier,
      quantity,
      description: `${title}${descSuffix}`,
      cost: Number.isFinite(perChunk) ? perChunk.toFixed(2) : '0.00',
      dropMonths: Array.from({ length: Math.max(1, quantity) }, () => DEFAULT_DROP_MONTH),
      msoStoreKey: storeKey,
      minQuantity: minB,
      lockQuantity: true,
      fixedBundle: true,
    };
  }

  if (lines.length > 0 && String(rules?.offerMode || '').toUpperCase() === 'SPLIT' && rules?.allowLineIncrease) {
    const lineDetails: BundleLineDetail[] = [];
    lines.forEach((line, idx) => {
      const baseQty = Math.max(0, Number(line.baseQty) || 0);
      if (baseQty <= 0) return;
      const expo = Number(line.expoTotalCost) || 0;
      const unit = baseQty > 0 ? expo / baseQty : expo;
      const c = Number.isFinite(unit) ? unit : 0;
      lineDetails.push({
        description: `${line.description || 'SKU'} (${line.sku || idx + 1})`,
        quantity: baseQty * q,
        cost: c.toFixed(2),
        baseQty,
        sku: String(line.sku || '').trim() || undefined,
      });
    });
    if (lineDetails.length === 0) return null;
    const W = recomputeSplitBundleW(lineDetails);
    const sum = lineDetails.reduce((s, l) => s + parseFloat(l.cost) * l.quantity, 0);
    const perW = W > 0 ? sum / W : 0;
    return {
      offerId: offer.offerId,
      offerTier: tier,
      quantity: W,
      description: `${title}${descSuffix}`,
      cost: (Number.isFinite(perW) ? perW : 0).toFixed(2),
      dropMonths: Array.from({ length: Math.max(1, W) }, () => DEFAULT_DROP_MONTH),
      msoStoreKey: storeKey,
      minQuantity: 1,
      lockQuantity: false,
      splitBundle: true,
      lineDetails,
    };
  }

  const unit =
    parseMoney(offer.expoChargeBackCost) > 0 ? parseMoney(offer.expoChargeBackCost) : parseMoney(offer.totalCost);
  return {
    offerId: offer.offerId,
    offerTier: tier,
    quantity: q,
    description: `${title}${descSuffix}`,
    cost: (Number.isFinite(unit) ? unit : 0).toFixed(2),
    dropMonths: Array.from({ length: q }, () => DEFAULT_DROP_MONTH),
    msoStoreKey: storeKey,
  };
}
