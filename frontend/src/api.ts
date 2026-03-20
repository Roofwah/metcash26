const configuredApiBase = (process.env.REACT_APP_API_URL || '').trim();
const browserDefaultBase =
  typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5001';

export const API_BASE = configuredApiBase || browserDefaultBase;

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
}
