import React, { useEffect, useMemo, useState } from 'react';
import { fieldFetch, FieldStoreListItem } from './fieldApi';
import { storeDisplayName } from '../../storeFormat';

interface Props {
  onSelect: (storeId: string) => void;
}

function sortStores(stores: FieldStoreListItem[]) {
  return [...stores].sort((a, b) =>
    a.store_name.localeCompare(b.store_name, undefined, { sensitivity: 'base' }),
  );
}

function filterStores(stores: FieldStoreListItem[], query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return stores;
  const digits = q.replace(/\D/g, '');
  return stores.filter((s) => {
    if (digits && s.store_id.startsWith(digits)) return true;
    if (storeDisplayName(s).toLowerCase().includes(q)) return true;
    if (q.includes('metro') && s.store_format === 'metro') return true;
    return false;
  });
}

function storePickerLabel(store: FieldStoreListItem) {
  return `${store.store_id} ${storeDisplayName(store)}`;
}

export default function StoreSearch({ onSelect }: Props) {
  const [query, setQuery] = useState('');
  const [stores, setStores] = useState<FieldStoreListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const data = await fieldFetch<{ stores: FieldStoreListItem[] }>('/api/ww26/field/stores/search');
        if (!cancelled) setStores(data.stores || []);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Could not load stores');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => sortStores(filterStores(stores, query)), [stores, query]);

  return (
    <section className="ww-panel ww-panel-form ww-panel-form--intro ww-panel-form--store">
      <h2>Woolworths 2026</h2>
      <p className="ww-lede">Field Performance — find a store by name or 4-digit store number.</p>
      <label className="ww-field">
        <span>Store name or number</span>
        <input
          type="search"
          inputMode="search"
          autoComplete="off"
          placeholder="e.g. Dennington or 3072"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </label>
      {loading && <p className="ww-store-loading">Loading stores…</p>}
      {error && <div className="ww-error">{error}</div>}
      {!loading && !error && filtered.length > 0 && (
        <>
          <p className="ww-store-count">
            {query.trim()
              ? `${filtered.length.toLocaleString()} match${filtered.length === 1 ? '' : 'es'}`
              : `${filtered.length.toLocaleString()} stores`}
          </p>
          <div
            className="ww-store-grid-picker ww-store-grid-picker--compact"
            role="listbox"
            aria-label="Stores"
            style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}
          >
            {filtered.slice(0, 120).map((s) => (
              <button
                key={s.store_id}
                type="button"
                className="ww-store-pick"
                role="option"
                onClick={() => onSelect(s.store_id)}
              >
                {storePickerLabel(s)}
              </button>
            ))}
          </div>
        </>
      )}
      {!loading && !error && filtered.length === 0 && (
        <p className="ww-lede">No stores matched. Try a different name or store number.</p>
      )}
    </section>
  );
}
