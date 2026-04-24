const configuredApiBaseRaw = (process.env.REACT_APP_API_URL || '').trim();
const browserDefaultBase =
  typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5001';

function resolveApiBase(raw: string): string {
  if (!raw) return browserDefaultBase;
  const looksAbsolute = /^https?:\/\//i.test(raw);
  const looksRelative = raw.startsWith('/');
  if (!looksAbsolute && !looksRelative) {
    // Ignore malformed values (e.g. tokens/hashes accidentally pasted as URL)
    return browserDefaultBase;
  }
  try {
    return new URL(raw, browserDefaultBase).origin + new URL(raw, browserDefaultBase).pathname.replace(/\/$/, '');
  } catch {
    return browserDefaultBase;
  }
}

export const API_BASE = resolveApiBase(configuredApiBaseRaw);

export function apiUrl(path: string): string {
  const base = API_BASE.replace(/\/$/, '');
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${base}${p}`;
}

export interface StoreData {
  storeNo: string;
  storeName: string;
  banner: string;
  overall: string;
  automotive: string;
  energyStorage: string;
  lighting: string;
  specialOrderHardware: string;
  /** When known (mcash picker or store API + mcash match) */
  address?: string;
  suburb?: string;
  state?: string;
  pcode?: string;
  /** Metcash store id from mcash26.csv (Storeid column) — sent as order store_code */
  storeId?: string;
  /** RANK from mcash26.csv (sort / reporting) */
  storeRank?: number | null;
  /** Group from mcash26.csv — owner / group name */
  ownerGroup?: string;
  /** MSO path: which group was selected in the wizard (for labels / nav) */
  msoGroup?: string;
}
