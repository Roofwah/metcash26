import React, { useCallback, useEffect, useMemo, useState } from 'react';
import DbleNav from './components/DbleNav';
import LandscapeHint from './components/LandscapeHint';
import { useWwSession } from './components/WwAuthShell';
import WwDashboard from './components/WwDashboard';
import LandingSlideshow from './components/LandingSlideshow';
import StoreDetailSummary, { EnergizerPackProductFigures } from './components/StoreDetailSummary';
import {
  fetchApi,
  apiUrl,
  GroupPayload,
  ParticipantRole,
  PentaBinLine,
  SessionState,
  WwGroup,
  WwStore,
} from './api';
import { isMetroStore, storeDisplayName } from './storeFormat';

type Step = 'landing' | 'participant' | 'role' | 'identify' | 'store' | 'group' | 'performance' | 'pentabin' | 'thanks' | 'done';

const PUBLIC = process.env.PUBLIC_URL || '';

const ROLES: ParticipantRole[] = ['Group Manager', 'Store Manager', 'Other'];

const CAMPAIGN_BG_STEPS: Step[] = ['landing', 'participant', 'role', 'identify'];
const FORM_BG_STEPS: Step[] = ['participant', 'role', 'identify'];
const GROUP_MANAGER_FLOW_STEPS: Step[] = ['group', 'performance', 'pentabin'];
const STORE_FLOW_STEPS: Step[] = ['store', 'performance', 'pentabin'];

function fmtMoney(n: number) {
  return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 }).format(n);
}

function fmtPentaCount(value?: number | null) {
  if (value === undefined || value === null || Number.isNaN(Number(value))) return '—';
  return Number(value).toLocaleString('en-AU');
}

function pentabinLineFromStore(store: WwStore): PentaBinLine {
  const recommended = Number(store.recommended_2026) || 0;
  const allocation = store.allocation;
  const effective = allocation?.effectiveQuantity ?? recommended;
  return {
    storeId: store.store_id,
    storeName: storeDisplayName(store),
    recommended,
    finalQuantity: effective,
    allocation,
  };
}

function fmtMoneyOptional(value?: number | null) {
  if (value === undefined || value === null || Number.isNaN(Number(value))) return '—';
  return fmtMoney(Number(value));
}

function fmtCountOptional(value?: number | null) {
  if (value === undefined || value === null || Number.isNaN(Number(value))) return '—';
  return Number(value).toLocaleString('en-AU');
}

function sumStoreMetric(stores: WwStore[], pick: (store: WwStore) => number | null | undefined) {
  return stores.reduce((sum, store) => sum + (Number(pick(store)) || 0), 0);
}

type YoYDirection = 'up' | 'down' | 'flat';

function computeYoY(previous?: number | null, current?: number | null): { direction: YoYDirection; pctLabel: string } | null {
  if (previous == null || current == null) return null;
  const prev = Number(previous);
  const curr = Number(current);
  if (Number.isNaN(prev) || Number.isNaN(curr)) return null;
  if (prev === 0 && curr === 0) return { direction: 'flat', pctLabel: '0%' };
  if (prev === 0) return null;
  const pct = Math.round(((curr - prev) / prev) * 1000) / 10;
  let direction: YoYDirection = 'flat';
  if (pct > 0.5) direction = 'up';
  else if (pct < -0.5) direction = 'down';
  const sign = pct > 0 ? '+' : '';
  return { direction, pctLabel: `${sign}${pct}%` };
}

function YearOverYearBadge({
  previous,
  current,
  compact = false,
  featured = false,
}: {
  previous?: number | null;
  current?: number | null;
  compact?: boolean;
  featured?: boolean;
}) {
  const yoy = computeYoY(previous, current);
  if (!yoy) return null;
  const arrow = yoy.direction === 'up' ? '↑' : yoy.direction === 'down' ? '↓' : '—';
  return (
    <span
      className={`ww-store-yoy-badge${compact ? ' ww-store-yoy-badge--compact' : ''}${featured ? ' ww-store-yoy-badge--featured' : ''} ww-store-yoy-badge--${yoy.direction}`}
      aria-label={`Year on year change ${yoy.pctLabel}`}
    >
      <span className={`ww-trend-icon ww-trend-icon--${yoy.direction}`}>{arrow}</span>
      <span className="ww-store-yoy-pct">{yoy.pctLabel}</span>
    </span>
  );
}

function firstNameOnly(name: string) {
  return name.trim().split(/\s+/)[0] || '';
}

function storeLabel(store: WwStore) {
  return storeDisplayName(store);
}

function storePickerLabel(store: WwStore) {
  return `${store.store_id} ${storeLabel(store)}`;
}

function PentaBinProductFigure() {
  return (
    <div className="ww-store-detail-product ww-store-detail-product--single" aria-label="PentaBin">
      <figure className="ww-store-detail-product-sku">
        <div className="ww-store-detail-product-figure">
          <img src={`${PUBLIC}/penta-top.png`} alt="PentaBin" />
        </div>
        <figcaption className="ww-store-detail-product-caption ww-store-detail-product-caption--empty" aria-hidden="true" />
      </figure>
    </div>
  );
}

function GroupManagerOverviewHeader({
  groupData,
  storeNamesInline,
  subtitleLine,
  productImage = 'energizer',
  showProductImages = true,
  plan2026Total,
  plan2026Variance,
}: {
  groupData: GroupPayload;
  storeNamesInline: string;
  subtitleLine?: string;
  productImage?: 'energizer' | 'pentabin';
  showProductImages?: boolean;
  plan2026Total?: number;
  plan2026Variance?: number;
}) {
  const resolvedSubtitle = subtitleLine
    ?? (productImage === 'pentabin' ? '' : 'Energizer Max · AA & AAA 16pk');

  return (
    <div className="ww-store-detail-top ww-group-detail-top">
      <div className="ww-store-detail-intro">
        <header className="ww-store-detail-hero">
          <p className="ww-group-detail-heading">
            Group {groupData.group.group_id} · {groupData.summary.storeCount} stores
          </p>
          <p className="ww-group-store-names-inline">{storeNamesInline}</p>
        </header>
        {plan2026Total != null ? (
          <p className="ww-penta-header-stat">
            <span className="ww-penta-header-stat-label">Penta Bin 2026 plan:</span>
            <strong className="ww-penta-header-stat-value">{plan2026Total}</strong>
            {plan2026Variance != null && plan2026Variance !== 0 ? (
              <span className="ww-penta-header-stat-variance">
                ({plan2026Variance > 0 ? '+' : ''}{plan2026Variance} vs recommended)
              </span>
            ) : null}
          </p>
        ) : resolvedSubtitle ? (
          <p className="ww-store-detail-product-line">{resolvedSubtitle}</p>
        ) : null}
      </div>
      {showProductImages ? (
        productImage === 'pentabin' ? <PentaBinProductFigure /> : <EnergizerPackProductFigures />
      ) : null}
    </div>
  );
}

function GroupManagerPairSummary({
  leftLabel,
  leftValue,
  rightLabel,
  rightValue,
  previousAmount,
  currentAmount,
}: {
  leftLabel: string;
  leftValue: string;
  rightLabel: string;
  rightValue: string;
  previousAmount?: number | null;
  currentAmount?: number | null;
}) {
  const yoy = computeYoY(previousAmount, currentAmount);

  return (
    <div className={`ww-group-summary-row${yoy ? ' ww-group-summary-row--with-yoy' : ''}`}>
      <article className="ww-store-card ww-store-card--form ww-store-card--performance ww-group-year-card">
        <div className="ww-store-card-metric">
          <strong>{leftValue}</strong>
          <span>{leftLabel}</span>
        </div>
      </article>
      <article className="ww-store-card ww-store-card--form ww-store-card--performance ww-group-year-card">
        <div className="ww-store-card-metric">
          <strong>{rightValue}</strong>
          <span>{rightLabel}</span>
        </div>
      </article>
      {yoy ? (
        <article className="ww-store-card ww-store-card--form ww-group-yoy-card" aria-label={`Group year on year ${yoy.pctLabel}`}>
          <YearOverYearBadge previous={previousAmount} current={currentAmount} featured />
        </article>
      ) : null}
    </div>
  );
}

function GroupManagerStorePentaCard({
  store,
  line,
  onAdjust,
}: {
  store: WwStore;
  line: PentaBinLine;
  onAdjust: (storeId: string, delta: number) => void;
}) {
  const smCommit =
    line.allocation?.storeManagerQuantity != null ? line.allocation.storeManagerQuantity : null;
  const smNote =
    smCommit != null
      ? line.allocation?.finalStatus === 'store_manager'
        ? `Store Manager: ${smCommit}`
        : `Store Manager last: ${smCommit}`
      : null;

  return (
    <article className="ww-store-card ww-store-card--form ww-store-card--performance ww-store-card--penta">
      <h3>{storeLabel(store)}</h3>
      {store.suburb?.trim() ? <p>{store.suburb.trim()}</p> : null}
      {smNote ? <p className="ww-store-penta-sm-note">{smNote}</p> : null}
      <div className="ww-store-card-metrics ww-store-card-metrics--penta-stack">
        <div className="ww-store-card-metric ww-store-card-metric--plan">
          <span className="ww-penta-year-label">
            2026{line.recommended !== line.finalQuantity ? ` (rec. ${line.recommended})` : ''}
          </span>
          <div className="ww-penta-qty-inline ww-penta-qty-inline--featured">
            <button
              type="button"
              onClick={() => onAdjust(line.storeId, -1)}
              aria-label={`Decrease 2026 plan for ${storeLabel(store)}`}
            >
              −
            </button>
            <strong aria-live="polite">{line.finalQuantity}</strong>
            <button
              type="button"
              onClick={() => onAdjust(line.storeId, 1)}
              aria-label={`Increase 2026 plan for ${storeLabel(store)}`}
            >
              +
            </button>
          </div>
        </div>
        <div className="ww-penta-prior-years">
          <div className="ww-store-card-metric">
            <strong>{fmtPentaCount(store.penta_bins_2024)}</strong>
            <span>2024</span>
          </div>
          <div className="ww-store-card-metric">
            <strong>{fmtPentaCount(store.penta_bins_2025)}</strong>
            <span>2025</span>
          </div>
        </div>
      </div>
    </article>
  );
}

function GroupManagerStoreYearMetrics({
  store,
  mode,
}: {
  store: WwStore;
  mode: 'sales' | 'units';
}) {
  const previousAmount = mode === 'sales' ? store.sales_2024 : store.units_2024;
  const currentAmount = mode === 'sales' ? store.sales_ytd : store.units_2025;
  const leftValue = mode === 'sales'
    ? fmtMoneyOptional(previousAmount)
    : fmtCountOptional(previousAmount);
  const rightValue = mode === 'sales'
    ? fmtMoneyOptional(currentAmount)
    : fmtCountOptional(currentAmount);
  const leftCaption = mode === 'sales' ? '2024 sales' : '2024 units';
  const rightCaption = mode === 'sales' ? '2025 sales' : '2025 units';

  const yoy = computeYoY(previousAmount, currentAmount);

  return (
    <>
      {yoy ? (
        <div className="ww-store-yoy-corner">
          <YearOverYearBadge previous={previousAmount} current={currentAmount} compact />
        </div>
      ) : null}
      <div className="ww-store-year-row">
        <div className="ww-store-card-metric ww-store-year-metric ww-store-year-metric--leading">
          <strong>{leftValue}</strong>
          <span>{leftCaption}</span>
        </div>
        <div className="ww-store-card-metric ww-store-year-metric ww-store-year-metric--trailing">
          <strong>{rightValue}</strong>
          <span>{rightCaption}</span>
        </div>
      </div>
    </>
  );
}

function filterStores(stores: WwStore[], query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return stores;
  const digits = q.replace(/\D/g, '');
  return stores.filter((store) => {
    if (digits && store.store_id.startsWith(digits)) return true;
    if (storeLabel(store).toLowerCase().includes(q)) return true;
    if (q.includes('metro') && store.store_format === 'metro') return true;
    return false;
  });
}

function sortStores(stores: WwStore[]) {
  return [...stores].sort((a, b) =>
    storeLabel(a).localeCompare(storeLabel(b), 'en-AU', { sensitivity: 'base' }),
  );
}

function sortGroupsNumerically<T extends { group_id: string }>(groups: T[]) {
  return [...groups].sort((a, b) => {
    const na = Number.parseInt(String(a.group_id).replace(/\D/g, ''), 10);
    const nb = Number.parseInt(String(b.group_id).replace(/\D/g, ''), 10);
    if (Number.isFinite(na) && Number.isFinite(nb) && na !== nb) return na - nb;
    return String(a.group_id).localeCompare(String(b.group_id), undefined, { numeric: true });
  });
}

const STORE_PICKER_CARD_MAX_WIDTH = 840;
const STORE_PICKER_GRID_MAX_HEIGHT = 420;

/** Grid columns only — card size stays fixed so the panel does not jump when filtering. */
function storePickerLayout(count: number) {
  const cols = count <= 6 ? 2 : count <= 24 ? 3 : 4;
  const compact = count > 48;
  return {
    cols,
    cardMaxWidth: STORE_PICKER_CARD_MAX_WIDTH,
    gridMaxHeight: STORE_PICKER_GRID_MAX_HEIGHT,
    compact,
  };
}

export default function App() {
  const { email: repEmail, logout } = useWwSession();
  const [step, setStep] = useState<Step>('landing');
  const [participantName, setParticipantName] = useState('');
  const [participantRole, setParticipantRole] = useState<ParticipantRole>('Group Manager');
  const [allGroups, setAllGroups] = useState<WwGroup[]>([]);
  const [groupsLoaded, setGroupsLoaded] = useState(false);
  const [storeQuery, setStoreQuery] = useState('');
  const [allStores, setAllStores] = useState<WwStore[]>([]);
  const [storesLoaded, setStoresLoaded] = useState(false);
  const [groupData, setGroupData] = useState<GroupPayload | null>(null);
  const [session, setSession] = useState<SessionState | null>(null);
  const [pentabinLines, setPentabinLines] = useState<PentaBinLine[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [confirmingPlan, setConfirmingPlan] = useState(false);
  const [sessionFeedback, setSessionFeedback] = useState('');
  const [showDashboard, setShowDashboard] = useState(false);
  const [reviewIndex, setReviewIndex] = useState(0);
  const [showStoreSearchModal, setShowStoreSearchModal] = useState(false);

  const isGroupManager = participantRole === 'Group Manager';
  const isStoreManagerRole = participantRole === 'Store Manager';
  const highlightStoreId = session?.participantStoreId || null;

  const resetSession = useCallback(() => {
    setStep('landing');
    setParticipantName('');
    setParticipantRole('Group Manager');
    setAllGroups([]);
    setGroupsLoaded(false);
    setStoreQuery('');
    setAllStores([]);
    setStoresLoaded(false);
    setGroupData(null);
    setSession(null);
    setPentabinLines([]);
    setError('');
    setReviewIndex(0);
    setShowStoreSearchModal(false);
    setConfirmingPlan(false);
    setSessionFeedback('');
    setShowDashboard(false);
    setLoading(false);
  }, []);

  const clearGroupSession = useCallback(() => {
    setGroupData(null);
    setSession(null);
    setPentabinLines([]);
    setReviewIndex(0);
  }, []);

  const goBack = useCallback(() => {
    setError('');
    setShowStoreSearchModal(false);

    switch (step) {
      case 'participant':
        setStep('landing');
        break;
      case 'role':
        setStep('participant');
        break;
      case 'identify':
        setStep('role');
        break;
      case 'store':
        clearGroupSession();
        setStep('identify');
        break;
      case 'group':
        clearGroupSession();
        setStep('identify');
        break;
      case 'performance':
        setStep(!isGroupManager && highlightStoreId ? 'store' : 'group');
        break;
      case 'pentabin':
        setStep('performance');
        break;
      case 'done':
        setStep('pentabin');
        break;
      case 'thanks':
        setStep(isGroupManager ? 'done' : 'pentabin');
        break;
      default:
        break;
    }
  }, [
    step,
    isGroupManager,
    highlightStoreId,
    clearGroupSession,
  ]);

  const showBackButton = step !== 'landing';

  const loadGroup = async (groupId: string, participantStoreId?: string | null) => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchApi<GroupPayload>(`/api/ww26/groups/${groupId}`);
      setGroupData(data);
      const isStoreParticipant = participantRole !== 'Group Manager' && !!participantStoreId;
      const lineStores = isStoreParticipant
        ? data.stores.filter((s) => s.store_id === participantStoreId)
        : data.stores;
      setPentabinLines(lineStores.map(pentabinLineFromStore));

      const sessData = await fetchApi<SessionState>('/api/ww26/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participantName,
          participantRole,
          groupId,
          participantStoreId: participantStoreId || null,
        }),
      });
      setSession(sessData);
      setReviewIndex(0);
      setStep(isStoreParticipant ? 'store' : 'group');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const loadAllGroups = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchApi<{ groups: WwGroup[] }>('/api/ww26/groups');
      setAllGroups(sortGroupsNumerically(data.groups || []));
      setGroupsLoaded(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load groups');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (step === 'identify' && isGroupManager) {
      void loadAllGroups();
    }
  }, [step, isGroupManager, loadAllGroups]);

  const selectGroup = (groupId: string) => {
    if (loading) return;
    setError('');
    void loadGroup(groupId, null);
  };

  const loadAllStores = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchApi<{ stores: WwStore[] }>('/api/ww26/stores/search');
      setAllStores(data.stores || []);
      setStoresLoaded(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load stores');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (step === 'identify' && !isGroupManager) {
      void loadAllStores();
    }
  }, [step, isGroupManager, loadAllStores]);


  const selectStore = (store: WwStore) => {
    setShowStoreSearchModal(false);
    loadGroup(store.group_id, store.store_id);
  };

  const openStoreSearchModal = () => {
    setError('');
    setShowStoreSearchModal(true);
    if (!storesLoaded) void loadAllStores();
  };

  const adjustQty = (storeId: string, delta: number) => {
    const canEditAsGm = isGroupManager;
    const canEditAsSm =
      isStoreManagerRole && isStoreParticipant && storeId === highlightStoreId;
    if (!canEditAsGm && !canEditAsSm) return;
    setPentabinLines((lines) =>
      lines.map((l) =>
        l.storeId === storeId
          ? { ...l, finalQuantity: Math.max(0, l.finalQuantity + delta) }
          : l,
      ),
    );
  };

  const confirmPlan = async () => {
    if (!session || !isGroupManager || confirmingPlan) return;
    setConfirmingPlan(true);
    setLoading(true);
    setError('');
    try {
      const res = await fetch(apiUrl(`/api/ww26/sessions/${session.sessionId}/commitments`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participantRole,
          items: pentabinLines.map((l) => ({
            storeId: l.storeId,
            recommended: l.recommended,
            finalQuantity: l.finalQuantity,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not confirm plan');
      setStep('done');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Confirm failed');
    } finally {
      setConfirmingPlan(false);
      setLoading(false);
    }
  };

  const applyAllocationToLines = useCallback((storeId: string, allocation: WwStore['allocation']) => {
    if (!allocation) return;
    setPentabinLines((lines) =>
      lines.map((l) =>
        l.storeId === storeId
          ? {
              ...l,
              allocation,
              finalQuantity: allocation.effectiveQuantity,
              recommended: allocation.recommendedQuantity,
            }
          : l,
      ),
    );
    setGroupData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        stores: prev.stores.map((s) =>
          s.store_id === storeId ? { ...s, allocation } : s,
        ),
      };
    });
  }, []);

  const submitStoreManagerCommitment = async (line: PentaBinLine) => {
    if (!session || !isStoreManagerRole) {
      setStep('thanks');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch(apiUrl(`/api/ww26/sessions/${session.sessionId}/store-commitment`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participantRole,
          storeId: line.storeId,
          recommended: line.recommended,
          finalQuantity: line.finalQuantity,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.allocation) applyAllocationToLines(line.storeId, data.allocation);
        throw new Error(data.error || 'Could not save your commitment');
      }
      if (data.allocation) applyAllocationToLines(line.storeId, data.allocation);
      setStep('thanks');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save your commitment');
    } finally {
      setLoading(false);
    }
  };

  const saveSessionFeedback = async () => {
    if (!session || !isGroupManager) return true;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(apiUrl(`/api/ww26/sessions/${session.sessionId}/feedback`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participantRole,
          feedback: sessionFeedback,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not save feedback');
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save feedback');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const finishFromDone = async () => {
    setError('');
    const saved = await saveSessionFeedback();
    if (saved) setStep('thanks');
  };

  const finishSession = async () => {
    if (!session) {
      resetSession();
      return;
    }
    if (isGroupManager) {
      resetSession();
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch(apiUrl(`/api/ww26/sessions/${session.sessionId}/complete`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participantRole }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not save session');
      resetSession();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save session');
    } finally {
      setLoading(false);
    }
  };

  const totals = useMemo(() => {
    const recommended = pentabinLines.reduce((s, l) => s + l.recommended, 0);
    const confirmed = pentabinLines.reduce((s, l) => s + l.finalQuantity, 0);
    return { recommended, confirmed, variance: confirmed - recommended };
  }, [pentabinLines]);

  const reviewedCount = reviewIndex + 1;
  const currentReview = pentabinLines[reviewIndex];
  const currentReviewStore = useMemo(() => {
    if (!currentReview || !groupData) return null;
    return groupData.stores.find((s) => s.store_id === currentReview.storeId) ?? null;
  }, [currentReview, groupData]);
  const filteredStores = useMemo(
    () => sortStores(filterStores(allStores, storeQuery)),
    [allStores, storeQuery],
  );
  const storePickerSizing = useMemo(
    () => storePickerLayout(filteredStores.length || allStores.length),
    [filteredStores.length, allStores.length],
  );

  const isStoreParticipant = !isGroupManager && !!highlightStoreId;
  const isStoreFlowStep =
    isStoreParticipant && STORE_FLOW_STEPS.includes(step);
  const isGroupManagerFlowStep =
    isGroupManager && GROUP_MANAGER_FLOW_STEPS.includes(step);

  const myStore = useMemo(() => {
    if (!groupData || !highlightStoreId) return null;
    return groupData.stores.find((s) => s.store_id === highlightStoreId) ?? null;
  }, [groupData, highlightStoreId]);

  const groupStoresSorted = useMemo(
    () => (groupData ? sortStores(groupData.stores) : []),
    [groupData],
  );

  const groupStoreNamesInline = useMemo(
    () => groupStoresSorted.map((s) => storeLabel(s)).join(', '),
    [groupStoresSorted],
  );

  const groupSalesTotals = useMemo(() => {
    if (!groupData) {
      return {
        sales2024: 0,
        sales2025: 0,
        units2024: 0,
        units2025: 0,
        penta2024: 0,
        penta2025: 0,
        recommended2026: 0,
      };
    }
    const { stores } = groupData;
    return {
      sales2024: sumStoreMetric(stores, (s) => s.sales_2024),
      sales2025: groupData.summary.salesYtd || sumStoreMetric(stores, (s) => s.sales_ytd),
      units2024: sumStoreMetric(stores, (s) => s.units_2024),
      units2025: sumStoreMetric(stores, (s) => s.units_2025),
      penta2024: sumStoreMetric(stores, (s) => s.penta_bins_2024),
      penta2025: sumStoreMetric(stores, (s) => s.penta_bins_2025),
      recommended2026: groupData.summary.recommendedPentabins
        || sumStoreMetric(stores, (s) => s.recommended_2026),
    };
  }, [groupData]);

  const pentabinLineByStoreId = useMemo(() => {
    const map = new Map<string, PentaBinLine>();
    for (const line of pentabinLines) map.set(line.storeId, line);
    return map;
  }, [pentabinLines]);

  const groupManagerDisplayName = useMemo(() => {
    const groupId = groupData?.group?.group_id || myStore?.group_id || '';
    const rawName = (
      groupData?.group?.group_manager_name
      || myStore?.group_manager_name
      || ''
    ).trim();
    if (rawName && !/^Group\s+\d+$/i.test(rawName)) {
      const first = firstNameOnly(rawName);
      return first ? `Group Manager ${first}` : rawName;
    }
    if (groupId) return `Group Manager ${groupId}`;
    return 'Your Group Manager';
  }, [groupData, myStore]);

  const isFormLayoutStep =
    step === 'participant' ||
    step === 'role' ||
    step === 'identify' ||
    step === 'done' ||
    isStoreFlowStep ||
    isGroupManagerFlowStep;
  const showCampaignBg =
    CAMPAIGN_BG_STEPS.includes(step) ||
    isStoreFlowStep ||
    isGroupManagerFlowStep ||
    step === 'thanks' ||
    step === 'done';
  const showLandingBg = step === 'landing';
  const showFormBg =
    FORM_BG_STEPS.includes(step) ||
    isStoreFlowStep ||
    isGroupManagerFlowStep ||
    step === 'done';
  const showThanksBg = step === 'thanks';

  const showLandscapeHint =
    (step === 'identify' && isGroupManager) ||
    step === 'store' ||
    step === 'group' ||
    step === 'performance' ||
    step === 'pentabin';

  return (
    <div
      className={[
        'ww-app',
        showCampaignBg ? 'ww-app-campaign' : '',
        step === 'landing' ? 'ww-app-landing' : '',
        step === 'thanks' ? 'ww-app-thanks' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <DbleNav
        publicUrl={PUBLIC}
        repEmail={repEmail}
        onLogout={logout}
        onDashboard={() => setShowDashboard(true)}
      />

      {showDashboard ? <WwDashboard onClose={() => setShowDashboard(false)} /> : null}

      {showLandscapeHint ? (
        <LandscapeHint message="Best viewed in landscape on iPad" />
      ) : null}

      {showCampaignBg && (
        <>
          <div className="ww-campaign-bg" aria-hidden="true">
            {showLandingBg && <LandingSlideshow publicUrl={PUBLIC} />}
            {showFormBg && (
              <div
                className="ww-form-bg"
                style={{ backgroundImage: `url(${PUBLIC}/bg.jpg)` }}
              />
            )}
            {showThanksBg && (
              <div
                className="ww-thanks-bg"
                style={{ backgroundImage: `url(${PUBLIC}/thanks.jpg)` }}
              />
            )}
          </div>
          <img
            src={`${PUBLIC}/2logos.png`}
            alt="Woolworths and Energizer"
            className="ww-partner-logos"
          />
        </>
      )}

      <div className="ww-app-content">
      {error && step !== 'landing' && !isFormLayoutStep && step !== 'thanks' && <div className="ww-error">{error}</div>}

      {step === 'landing' && (
        <section className="ww-landing">
          <div className="ww-landing-inner">
            <button
              type="button"
              className="ww-btn ww-landing-start"
              onClick={() => {
                setError('');
                setStep('participant');
              }}
            >
              Start
            </button>
          </div>
        </section>
      )}

      {isFormLayoutStep && (
        <div
          className={`ww-form-screen ww-form-screen--intro${step === 'identify' && isGroupManager ? ' ww-form-screen--group-picker' : ''}${step === 'store' || (step === 'performance' && isStoreParticipant) ? ' ww-form-screen--store-detail' : ''}`}
        >
          <div className="ww-kiosk-container">
          <div className="ww-form-stage">
            <div
              className={`ww-form-stack${step === 'participant' || step === 'role' ? ' ww-form-stack--intro' : ''}${step === 'identify' && isGroupManager ? ' ww-form-stack--wide ww-form-stack--group-picker' : ''}${step === 'identify' && !isGroupManager ? ' ww-form-stack--store-picker' : ''}${step === 'group' || (step === 'performance' && isGroupManager) || (step === 'pentabin' && isGroupManager) ? ' ww-form-stack--wide ww-form-stack--group-detail' : ''}${step === 'store' || (step === 'performance' && isStoreParticipant) ? ' ww-form-stack--wide ww-form-stack--store-detail' : ''}${step === 'pentabin' && isStoreParticipant ? ' ww-form-stack--plan' : ''}${step === 'done' ? ' ww-form-stack--plan' : ''}`}
            >
              {error && !showStoreSearchModal && <div className="ww-error">{error}</div>}

              {step === 'participant' && (
                <section className="ww-panel-form ww-panel-form--intro">
                  <h2>Welcome</h2>
                  <p className="ww-lede">Enter your details to begin.</p>
                  <label className="ww-field">
                    <span>Full name</span>
                    <input value={participantName} onChange={(e) => setParticipantName(e.target.value)} placeholder="Your full name" />
                  </label>
                  <button
                    type="button"
                    className="ww-btn ww-btn-primary"
                    disabled={!participantName.trim()}
                    onClick={() => {
                      setError('');
                      setStep('role');
                    }}
                  >
                    Continue
                  </button>
                </section>
              )}

              {step === 'role' && (
                <section className="ww-panel-form ww-panel-form--intro">
                  <h2>{firstNameOnly(participantName)}</h2>
                  <p className="ww-lede">Select your role.</p>
                  <div className="ww-field">
                    <div className="ww-tile-group" role="radiogroup" aria-label="Select your role">
                      {ROLES.map((r) => (
                        <label
                          key={r}
                          className={`ww-tile${participantRole === r ? ' is-selected' : ''}`}
                        >
                          <input
                            type="radio"
                            name="participantRole"
                            value={r}
                            checked={participantRole === r}
                            onChange={() => setParticipantRole(r)}
                          />
                          <span>{r}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="ww-btn ww-btn-primary"
                    onClick={() => {
                      setError('');
                      setStep('identify');
                    }}
                  >
                    Continue
                  </button>
                </section>
              )}

              {step === 'identify' && isGroupManager && (
                <section className="ww-panel-form ww-panel-form--groups">
                  <h2>{firstNameOnly(participantName)}</h2>
                  <p className="ww-lede">Select your group.</p>
                  {loading && !groupsLoaded && (
                    <p className="ww-store-loading">Loading Groups</p>
                  )}
                  {loading && groupsLoaded && (
                    <p className="ww-store-loading">Loading Group</p>
                  )}
                  {allGroups.length > 0 && (
                    <div className="ww-field">
                      <div className="ww-group-grid-picker" role="radiogroup" aria-label="Select your group">
                        {allGroups.map((g) => (
                          <button
                            key={g.group_id}
                            type="button"
                            role="radio"
                            className="ww-group-pick"
                            disabled={loading}
                            onClick={() => selectGroup(g.group_id)}
                          >
                            <span className="ww-group-pick-label">Group</span>
                            <span className="ww-group-pick-num">{g.group_id}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </section>
              )}

              {step === 'identify' && !isGroupManager && (
                <section className="ww-panel-form ww-panel-form--store">
                  <div className="ww-panel-form-head">
                    <h2>{firstNameOnly(participantName)}</h2>
                    <button
                      type="button"
                      className="ww-search-icon-btn ww-search-icon-btn--compact"
                      onClick={openStoreSearchModal}
                      aria-label="Search by store name or number"
                    >
                      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                        <path d="M10.5 3a7.5 7.5 0 1 1 0 15 7.5 7.5 0 0 1 0-15Zm0 2a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11Zm8.18 13.82-3.9-3.9 1.42-1.42 3.9 3.9-1.42 1.42Z" />
                      </svg>
                    </button>
                  </div>
                  <p className="ww-lede">Find your store by name or 4-digit store number.</p>
                  <label className="ww-field">
                    <span>Store name or number</span>
                    <input
                      value={storeQuery}
                      onChange={(e) => setStoreQuery(e.target.value)}
                      placeholder="e.g. Dennington or 3072"
                      inputMode="search"
                    />
                  </label>
                  {loading && (
                    <p className="ww-store-loading">Loading stores…</p>
                  )}
                  {filteredStores.length > 0 && (
                    <>
                      <p className="ww-store-count">
                        {storeQuery.trim()
                          ? `${filteredStores.length.toLocaleString()} match${filteredStores.length === 1 ? '' : 'es'}`
                          : `${filteredStores.length.toLocaleString()} stores`}
                      </p>
                      <div
                        className={`ww-store-grid-picker${storePickerSizing.compact ? ' ww-store-grid-picker--compact' : ''}`}
                        role="listbox"
                        aria-label="Stores"
                        style={{
                          gridTemplateColumns: `repeat(${storePickerSizing.cols}, minmax(0, 1fr))`,
                          maxHeight: `min(${storePickerSizing.gridMaxHeight}px, 62vh)`,
                        }}
                      >
                        {filteredStores.map((s) => (
                          <button
                            key={s.store_id}
                            type="button"
                            className="ww-store-pick"
                            role="option"
                            onClick={() => selectStore(s)}
                          >
                            {storePickerLabel(s)}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                  {!loading && storesLoaded && filteredStores.length === 0 && (
                    <p className="ww-lede">No stores matched. Try a different name or store number.</p>
                  )}
                </section>
              )}

              {step === 'store' && myStore && (
                <section className="ww-panel ww-panel-form ww-panel-form--store-detail">
                  <StoreDetailSummary store={myStore} showCategoryTrend={false} />
                  <button type="button" className="ww-btn ww-btn-primary" onClick={() => setStep('performance')}>
                    Continue
                  </button>
                </section>
              )}

              {step === 'performance' && isStoreParticipant && myStore && (
                <section className="ww-panel ww-panel-form ww-panel-form--store-detail">
                  <StoreDetailSummary
                    store={myStore}
                    showPromoGrid={false}
                    showCategoryTrend={false}
                    showPentaBins
                  />
                  <p className="ww-lede ww-incentive-blurb">
                    Stores performing strongly this year are positioned for the Social Club Christmas celebration reward ($500 per store opportunity).
                  </p>
                  <button type="button" className="ww-btn ww-btn-primary" onClick={() => setStep('pentabin')}>
                    Review 2026 PentaBins
                  </button>
                </section>
              )}

              {step === 'performance' && groupData && isGroupManager && (
                <section className="ww-panel ww-panel-form ww-panel-form--group-detail">
                  <GroupManagerOverviewHeader
                    groupData={groupData}
                    storeNamesInline={groupStoreNamesInline}
                  />
                  <GroupManagerPairSummary
                    leftLabel="Group units 2024"
                    leftValue={fmtCountOptional(groupSalesTotals.units2024)}
                    rightLabel="Group units 2025"
                    rightValue={fmtCountOptional(groupSalesTotals.units2025)}
                    previousAmount={groupSalesTotals.units2024}
                    currentAmount={groupSalesTotals.units2025}
                  />
                  <div className="ww-store-grid ww-store-grid--form">
                    {groupData.stores.map((s) => (
                      <article
                        key={s.store_id}
                        className="ww-store-card ww-store-card--form ww-store-card--performance"
                      >
                        <h3>{storeLabel(s)}</h3>
                        {s.suburb?.trim() ? <p>{s.suburb.trim()}</p> : null}
                        <GroupManagerStoreYearMetrics store={s} mode="units" />
                      </article>
                    ))}
                  </div>
                  <button type="button" className="ww-btn ww-btn-primary" onClick={() => setStep('pentabin')}>
                    Review 2026 PentaBins
                  </button>
                </section>
              )}

              {step === 'pentabin' && isStoreParticipant && currentReview && myStore && (
                <section className="ww-panel ww-panel-form ww-panel-form--plan">
                  <header className="ww-plan-store-hero">
                    <h2 className="ww-plan-store-name">{storeLabel(myStore)}</h2>
                    <p className="ww-plan-store-brand">
                      {isMetroStore(myStore) ? 'Woolworths Metro' : 'Woolworths'}
                    </p>
                    <p className="ww-plan-participant-name">{firstNameOnly(participantName)}</p>
                  </header>
                  <p className="ww-plan-line ww-plan-line--recommended">
                    <span className="ww-plan-line-label">Recommended 2026</span>
                    <span className="ww-plan-value-circle" aria-label={`Recommended quantity ${currentReview.recommended}`}>
                      {currentReview.recommended}
                    </span>
                  </p>
                  {isStoreManagerRole ? (
                    <>
                      {currentReview.allocation &&
                      (currentReview.allocation.storeManagerCommittedAt ||
                        currentReview.allocation.groupManagerConfirmedAt) ? (
                        <p className="ww-plan-line">
                          Current allocation:{' '}
                          <strong>{currentReview.allocation.effectiveQuantity}</strong> PentaBins
                          {currentReview.allocation.finalStatus === 'group_manager' ? (
                            <>
                              {' '}
                              (last updated by{' '}
                              {currentReview.allocation.groupManagerName || groupManagerDisplayName})
                            </>
                          ) : currentReview.allocation.finalStatus === 'store_manager' ? (
                            <> (your last commitment)</>
                          ) : null}
                        </p>
                      ) : null}
                      <div className="ww-qty-control ww-qty-control--form">
                        <button type="button" onClick={() => adjustQty(currentReview.storeId, -1)} aria-label="Decrease">−</button>
                        <span>{currentReview.finalQuantity}</span>
                        <button type="button" onClick={() => adjustQty(currentReview.storeId, 1)} aria-label="Increase">+</button>
                      </div>
                      <p className="ww-lede ww-lede--plan-footer">
                        You can update this anytime; {groupManagerDisplayName} may also adjust the group plan.
                      </p>
                    </>
                  ) : (
                    <p className="ww-plan-line ww-plan-line--allocation">
                      Proposed allocation: <strong>{currentReview.recommended} PentaBins</strong> (view only)
                    </p>
                  )}
                  <button
                    type="button"
                    className="ww-btn ww-btn-primary"
                    disabled={loading}
                    onClick={() => {
                      const line = pentabinLines[0];
                      if (line && isStoreManagerRole) {
                        void submitStoreManagerCommitment(line);
                      } else {
                        setStep('thanks');
                      }
                    }}
                  >
                    {loading ? 'Saving…' : isStoreManagerRole ? 'Confirm commitment' : 'Continue'}
                  </button>
                </section>
              )}

              {step === 'pentabin' && groupData && isGroupManager && (
                <section className="ww-panel ww-panel-form ww-panel-form--group-detail">
                  <GroupManagerOverviewHeader
                    groupData={groupData}
                    storeNamesInline={groupStoreNamesInline}
                    productImage="pentabin"
                    plan2026Total={totals.confirmed}
                    plan2026Variance={totals.variance}
                  />
                  <div className="ww-store-grid ww-store-grid--form">
                    {groupStoresSorted.map((s) => {
                      const line = pentabinLineByStoreId.get(s.store_id);
                      if (!line) return null;
                      return (
                        <GroupManagerStorePentaCard
                          key={s.store_id}
                          store={s}
                          line={line}
                          onAdjust={adjustQty}
                        />
                      );
                    })}
                  </div>
                  <button
                    type="button"
                    className="ww-btn ww-btn-primary"
                    onClick={() => void confirmPlan()}
                    disabled={loading || confirmingPlan}
                  >
                    Confirm 2026 plan
                  </button>
                </section>
              )}

              {step === 'group' && groupData && (
                <section className="ww-panel ww-panel-form ww-panel-form--group-detail">
                  <GroupManagerOverviewHeader
                    groupData={groupData}
                    storeNamesInline={groupStoreNamesInline}
                  />
                  <GroupManagerPairSummary
                    leftLabel="Group sales 2024"
                    leftValue={fmtMoney(groupSalesTotals.sales2024)}
                    rightLabel="Group sales 2025"
                    rightValue={fmtMoney(groupSalesTotals.sales2025)}
                    previousAmount={groupSalesTotals.sales2024}
                    currentAmount={groupSalesTotals.sales2025}
                  />
                  <div className="ww-store-grid ww-store-grid--form">
                    {groupData.stores.map((s) => (
                      <article
                        key={s.store_id}
                        className={`ww-store-card ww-store-card--form ww-store-card--performance${s.store_id === highlightStoreId ? ' is-mine' : ''}`}
                      >
                        <h3>{storeLabel(s)}</h3>
                        {s.suburb?.trim() ? <p>{s.suburb.trim()}</p> : null}
                        {s.store_id === highlightStoreId && <span className="ww-badge">Your store</span>}
                        <GroupManagerStoreYearMetrics store={s} mode="sales" />
                      </article>
                    ))}
                  </div>
                  <button type="button" className="ww-btn ww-btn-primary" onClick={() => setStep('performance')}>
                    View sales volumes
                  </button>
                </section>
              )}

              {step === 'done' && session && (
                <section className="ww-panel ww-panel-form ww-panel-form--done">
                  <h2>Confirmation complete</h2>
                  <p className="ww-lede">{session.participantName} · Group {groupData?.group.group_id}</p>
                  <p className="ww-ref ww-ref--form">Reference: {session.sessionId}</p>
                  <p className="ww-lede">
                    {totals.confirmed} PentaBins confirmed across {pentabinLines.length} stores.
                  </p>
                  <label className="ww-field ww-field--feedback">
                    <span>Feedback (optional)</span>
                    <textarea
                      value={sessionFeedback}
                      onChange={(e) => setSessionFeedback(e.target.value)}
                      placeholder="Share any comments about your 2026 Penta plan…"
                      rows={4}
                      maxLength={4000}
                      disabled={loading}
                    />
                  </label>
                  <button
                    type="button"
                    className="ww-btn ww-btn-primary"
                    disabled={loading}
                    onClick={() => void finishFromDone()}
                  >
                    {loading ? 'Saving…' : 'Finish'}
                  </button>
                </section>
              )}
            </div>
          </div>
          </div>
        </div>
      )}

      {step === 'thanks' && (
        <>
          <section className="ww-thanks">
            <h2 className="ww-thanks-heading">
              Thank you {firstNameOnly(participantName)}
              {myStore
                ? `, ${storeLabel(myStore)}`
                : groupData
                  ? `, Group ${groupData.group.group_id}`
                  : ''}
              .
            </h2>
            <p className="ww-thanks-message">
              We appreciate you stopping by, remember…
            </p>
          </section>
          {error && <div className="ww-error ww-thanks-error">{error}</div>}
          <div className="ww-thanks-actions">
            <button
              type="button"
              className="ww-btn ww-thanks-finish"
              onClick={finishSession}
              disabled={loading}
            >
              {loading ? 'Saving…' : 'Finish'}
            </button>
          </div>
        </>
      )}

      {confirmingPlan && (
        <div className="ww-modal-backdrop ww-modal-backdrop--blocking" role="presentation">
          <div
            className="ww-modal ww-modal--processing"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ww-plan-processing-title"
            aria-busy="true"
          >
            <div className="ww-processing-spinner" aria-hidden="true" />
            <h3 id="ww-plan-processing-title">Processing</h3>
            <p className="ww-modal-lede ww-modal-lede--processing">Please wait…</p>
          </div>
        </div>
      )}

      {showStoreSearchModal && (
        <div
          className="ww-modal-backdrop"
          onClick={() => setShowStoreSearchModal(false)}
          role="presentation"
        >
          <div
            className="ww-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ww-store-search-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="ww-store-search-title">Search store</h3>
            <p className="ww-modal-lede">Store name or 4-digit store number</p>
            {error && <div className="ww-error ww-modal-error">{error}</div>}
            <label className="ww-field">
              <span>Store name or number</span>
              <input
                value={storeQuery}
                onChange={(e) => setStoreQuery(e.target.value)}
                placeholder="e.g. Dennington or 3072"
                autoFocus
                inputMode="search"
              />
            </label>
            {filteredStores.length > 0 && (
              <div
                className={`ww-store-grid-picker ww-store-grid-picker--modal${storePickerSizing.compact ? ' ww-store-grid-picker--compact' : ''}`}
                role="listbox"
                aria-label="Stores"
                style={{
                  gridTemplateColumns: `repeat(${Math.min(storePickerSizing.cols, 4)}, minmax(0, 1fr))`,
                  maxHeight: Math.min(storePickerSizing.gridMaxHeight, 360),
                }}
              >
                {filteredStores.map((s) => (
                  <button
                    key={s.store_id}
                    type="button"
                    className="ww-store-pick"
                    role="option"
                    onClick={() => selectStore(s)}
                  >
                    {storePickerLabel(s)}
                  </button>
                ))}
              </div>
            )}
            <button
              type="button"
              className="ww-btn ww-btn-ghost ww-modal-close"
              onClick={() => setShowStoreSearchModal(false)}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {showBackButton && (
        <button type="button" className="ww-back-btn" onClick={goBack}>
          Back
        </button>
      )}

      {step !== 'landing' && (
        <button
          type="button"
          className="ww-restart-btn"
          onClick={resetSession}
          aria-label="Start new session"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M12 4a8 8 0 1 1-7.75 6h2.02A6 6 0 1 0 12 6V3l4 4-4 4V8.01A7.99 7.99 0 0 1 12 4Z" />
          </svg>
        </button>
      )}
      </div>
    </div>
  );
}
