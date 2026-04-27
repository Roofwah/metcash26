import { DEFAULT_DROP_MONTH, normalizeDropMonth } from '../constants/dropMonths';

/** Per-SKU line inside a retail “one shipment” bundle row (split / choose-N). */
export type BundleLineDetail = {
  description: string;
  quantity: number;
  cost: string;
  baseQty: number;
  sku?: string;
};

/** Cart row as stored in App state */
export type RetailCartItem = {
  offerId: string;
  offerTier?: string;
  quantity: number;
  description: string;
  cost: string;
  dropMonths?: string[];
  minQuantity?: number;
  lockQuantity?: boolean;
  fixedBundle?: boolean;
  /** SPLIT + allow line increase: one row; `quantity` = synced bundle count W; `lineDetails` = SKU qtys (≥ W×base). */
  splitBundle?: boolean;
  /** MIXED CHOOSE_N: one custom bundle row; `quantity` = 1; `lineDetails` = selected torch lines. */
  chooseNBundle?: boolean;
  lineDetails?: BundleLineDetail[];
  /** MSO: set on rows from matrix; still expanded when bundle flags are set. */
  msoStoreKey?: string;
};

/** Payload line for POST /api/save-order (exploded SKU rows) */
export type SaveOrderItem = {
  offerId: string;
  offerTier?: string;
  quantity: number;
  description: string;
  cost: string;
  dropMonths?: string[];
};

type ApiOfferLine = {
  sku?: string;
  description?: string;
  baseQty?: number;
  expoTotalCost?: number;
  lineUnitExpoCost?: number;
};

type ApiOffer = {
  offerId: string;
  items?: ApiOfferLine[];
  rules?: { offerMode?: string; allowLineIncrease?: boolean };
};

function isFixedLikeRules(rules?: ApiOffer['rules']): boolean {
  const mode = String(rules?.offerMode || '').toUpperCase();
  const allow = !!rules?.allowLineIncrease;
  return mode === 'FIXED' || (mode === 'SPLIT' && !allow);
}

/** Synced “full bundle” count from current line quantities. */
export function recomputeSplitBundleW(lineDetails: BundleLineDetail[]): number {
  if (!lineDetails.length) return 0;
  let minB = Infinity;
  for (const d of lineDetails) {
    const b = Math.max(1, Number(d.baseQty) || 1);
    minB = Math.min(minB, Math.floor(d.quantity / b));
  }
  return minB === Infinity ? 0 : minB;
}

function dropMonthsForSkuUnits(
  qty: number,
  base: number,
  bundleCount: number,
  bundleDrops: string[],
): string[] {
  const out: string[] = [];
  const W = Math.max(1, bundleCount);
  const b = Math.max(1, base);
  for (let u = 0; u < qty; u++) {
    const bi = Math.min(Math.floor(u / b), W - 1);
    out.push(normalizeDropMonth(bundleDrops[bi] ?? DEFAULT_DROP_MONTH));
  }
  return out;
}

function expandFixedBundleRow(it: RetailCartItem, offer: ApiOffer | undefined, byId: Map<string, ApiOffer>): SaveOrderItem[] {
  const out: SaveOrderItem[] = [];
  const bundleCount = Math.max(1, Number(it.quantity) || 1);
  const bundleDrops =
    it.dropMonths && it.dropMonths.length >= bundleCount
      ? it.dropMonths
      : Array.from({ length: bundleCount }, () => DEFAULT_DROP_MONTH);

  if (!offer?.items?.length || !isFixedLikeRules(offer.rules)) {
    return [
      {
        offerId: it.offerId,
        offerTier: it.offerTier,
        quantity: it.quantity,
        description: it.description,
        cost: it.cost,
        dropMonths: it.dropMonths?.map((m) => normalizeDropMonth(m)),
      },
    ];
  }

  for (const line of offer.items) {
    const base = Math.max(0, Number(line.baseQty) || 0);
    if (base <= 0) continue;
    const qty = base * bundleCount;
    const unitApi = Number(line.lineUnitExpoCost) || 0;
    const expoTotal = Number(line.expoTotalCost) || 0;
    const unitCost = unitApi > 0 ? unitApi : base > 0 ? expoTotal / base : expoTotal;
    const drops = dropMonthsForSkuUnits(qty, base, bundleCount, bundleDrops);
    const sku = String(line.sku || '').trim();
    const desc = String(line.description || 'SKU').trim();
    out.push({
      offerId: it.offerId,
      offerTier: it.offerTier,
      quantity: qty,
      description: sku ? `${desc} (${sku})` : desc,
      cost: (Number.isFinite(unitCost) ? unitCost : 0).toFixed(2),
      dropMonths: drops,
    });
  }
  return out;
}

function expandLineDetailsRow(
  it: RetailCartItem,
  bundleCount: number,
  bundleDrops: string[],
): SaveOrderItem[] {
  const details = it.lineDetails || [];
  const out: SaveOrderItem[] = [];
  const W = Math.max(1, bundleCount);
  for (const ld of details) {
    if (ld.quantity <= 0) continue;
    const base = Math.max(1, Number(ld.baseQty) || 1);
    const drops = dropMonthsForSkuUnits(ld.quantity, base, W, bundleDrops);
    out.push({
      offerId: it.offerId,
      offerTier: it.offerTier,
      quantity: ld.quantity,
      description: ld.description,
      cost: ld.cost,
      dropMonths: drops,
    });
  }
  return out;
}

/**
 * Retail checkout: keep DB payload exploded per SKU line.
 * - `fixedBundle`: expand from offer definition × bundle count (drops per bundle replica).
 * - `splitBundle` / `chooseNBundle`: expand from `lineDetails` (drops map units into bundle replicas).
 */
export function expandRetailCartItemsForSaveOrder(cart: RetailCartItem[], offers: ApiOffer[]): SaveOrderItem[] {
  const byId = new Map(offers.map((o) => [String(o.offerId || '').trim(), o]));
  const out: SaveOrderItem[] = [];

  for (const it of cart) {
    if (it.splitBundle || it.chooseNBundle) {
      const W = it.splitBundle ? Math.max(1, Number(it.quantity) || 1) : 1;
      const bundleDrops =
        it.dropMonths && it.dropMonths.length >= W
          ? it.dropMonths
          : Array.from({ length: W }, () => DEFAULT_DROP_MONTH);
      out.push(...expandLineDetailsRow(it, W, bundleDrops));
      continue;
    }

    if (it.fixedBundle) {
      const offer = byId.get(String(it.offerId || '').trim());
      out.push(...expandFixedBundleRow(it, offer, byId));
      continue;
    }

    if (it.msoStoreKey) {
      out.push({
        offerId: it.offerId,
        offerTier: it.offerTier,
        quantity: it.quantity,
        description: it.description,
        cost: it.cost,
        dropMonths: it.dropMonths?.map((m) => normalizeDropMonth(m)),
      });
      continue;
    }

    out.push({
      offerId: it.offerId,
      offerTier: it.offerTier,
      quantity: it.quantity,
      description: it.description,
      cost: it.cost,
      dropMonths: it.dropMonths?.map((m) => normalizeDropMonth(m)),
    });
  }

  return out;
}
