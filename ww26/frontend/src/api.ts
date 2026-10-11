const base = (process.env.REACT_APP_API_URL || '').trim()
  || (process.env.NODE_ENV === 'development' ? 'http://localhost:5003' : window.location.origin);

export function apiUrl(path: string): string {
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${base.replace(/\/$/, '')}${p}`;
}

export type ApiError = Error & { status?: number };

function parseJsonResponse(text: string, res: Response): unknown {
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    if (text.includes('Proxy error')) {
      throw new Error('Backend not running — start the ww26 server on port 5003.');
    }
    if (text.includes('Cannot GET /api/ww26/dashboard')) {
      throw new Error(
        'Dashboard API not found — restart the ww26 backend (latest code registers /api/ww26/dashboard/*).',
      );
    }
    if (text.trimStart().startsWith('<!')) {
      throw new Error(
        `Expected JSON from API but got HTML (${res.status}). Check REACT_APP_API_URL and that the backend is running.`,
      );
    }
    throw new Error(text.slice(0, 160) || 'Invalid server response');
  }
}

export async function fetchApi<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(apiUrl(path), { credentials: 'include', ...init });
  const text = await res.text();
  const data = parseJsonResponse(text, res);
  if (!res.ok) {
    const e = new Error(
      (data as { error?: string }).error || `Request failed (${res.status})`,
    ) as ApiError;
    e.status = res.status;
    throw e;
  }
  return data as T;
}

export type ParticipantRole = 'Group Manager' | 'Store Manager' | 'Other';

export type AllocationFinalStatus = 'none' | 'store_manager' | 'group_manager';

export interface StoreAllocation {
  recommendedQuantity: number;
  storeManagerQuantity: number | null;
  storeManagerName: string | null;
  storeManagerCommittedAt: string | null;
  groupManagerQuantity: number | null;
  groupManagerName: string | null;
  groupManagerConfirmedAt: string | null;
  finalStatus: AllocationFinalStatus;
  effectiveQuantity: number;
}

export interface WwStore {
  store_id: string;
  store_name: string;
  store_format?: 'standard' | 'metro' | string;
  state: string;
  suburb: string;
  postcode: string;
  group_id: string;
  sales_ytd?: number;
  sales_2024?: number | null;
  units_2024?: number | null;
  units_2025?: number | null;
  growth_pct?: number;
  trend_label?: string;
  penta_bins_2024?: number | null;
  penta_bins_2025?: number;
  current_soh?: number;
  recommended_2026?: number;
  category_apr?: number | string | null;
  category_may?: number | string | null;
  category_jun?: number | string | null;
  category_jul?: number | string | null;
  category_aug?: number | string | null;
  group_manager_id?: string;
  group_manager_name?: string;
  allocation?: StoreAllocation;
}

export interface WwGroup {
  group_id: string;
  group_manager_id: string;
  group_manager_name: string;
  region: string | null;
  store_count?: number;
}

export interface GroupPayload {
  group: WwGroup;
  stores: WwStore[];
  summary: {
    storeCount: number;
    salesYtd: number;
    recommendedPentabins: number;
    groupCategoryMonths?: (number | null)[];
    networkCategoryMonths?: (number | null)[];
    groupCategoryShift?: number | null;
    networkCategoryShift?: number | null;
  };
}

export interface SessionState {
  sessionId: string;
  participantName: string;
  participantRole: ParticipantRole;
  groupId: string;
  participantStoreId?: string | null;
}

export interface PentaBinLine {
  storeId: string;
  storeName: string;
  recommended: number;
  finalQuantity: number;
  allocation?: StoreAllocation;
}
