const base = (process.env.REACT_APP_API_URL || '').trim()
  || (process.env.NODE_ENV === 'development' ? 'http://localhost:5003' : window.location.origin);

function fieldUrl(path: string): string {
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${base.replace(/\/$/, '')}${p}`;
}

export async function fieldFetch<T>(path: string): Promise<T> {
  const res = await fetch(fieldUrl(path));
  const text = await res.text();
  let data: unknown;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(text.slice(0, 160) || 'Invalid server response');
  }
  if (!res.ok) {
    throw new Error((data as { error?: string }).error || `Request failed (${res.status})`);
  }
  return data as T;
}

export interface FieldStoreListItem {
  store_id: string;
  store_name: string;
  store_format?: string;
  group_id: string;
}

export interface CompetitionStanding {
  hasData: boolean;
  rank: number | null;
  totalEligible: number;
  value: number | null;
  gapToLeader: number | null;
  isLeader: boolean;
}

export interface LeaderboardEntry {
  storeId: string;
  storeName: string;
  storeFormat?: string;
  value: number;
  rank: number;
}

export interface ScoreboardRow {
  storeId: string;
  storeName: string;
  storeFormat?: string;
  dollar: CompetitionStanding;
  percent: CompetitionStanding;
}

export interface FieldStoreDashboard {
  store: FieldStoreListItem & {
    sales_ytd?: number | string | null;
    growth_pct?: number | string | null;
    penta_bins_2025?: number | null;
    recommended_2026?: number | null;
  };
  areaGroupId: string;
  metricsSources: {
    dollarGrowthFromCsv: boolean;
    pctGrowthFromCsv: boolean;
    pctGrowthFromPerformance: boolean;
  };
  pentabin: {
    penta2025: number | null;
    recommended2026: number | null;
  };
  competition: {
    dollar: CompetitionStanding;
    percent: CompetitionStanding;
  };
  scoreboard: {
    groupStoreCount: number;
    eligibleDollar: number;
    eligiblePercent: number;
    rows: ScoreboardRow[];
  };
  leaderboard: {
    dollar: LeaderboardEntry[];
    percent: LeaderboardEntry[];
  };
}
