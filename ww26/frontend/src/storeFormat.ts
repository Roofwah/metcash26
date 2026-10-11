import { WwStore } from './api';

const METRO_PREFIX = 'Woolworths Metro ';

function toTitleCase(value: string) {
  return value
    .toLowerCase()
    .replace(/(?:^|[\s\-/()])(\w)/g, (match) => match.toUpperCase());
}

function metroLocationFromName(rawName: string) {
  let name = rawName.trim();
  if (/^woolworths metro/i.test(name)) {
    return name.replace(/^woolworths metro\s*/i, '').trim();
  }
  if (/^woolworths\s+/i.test(name)) {
    name = name.replace(/^woolworths\s+/i, '').trim();
  }
  return name.replace(/\s+metro\s*$/i, '').trim();
}

export function isMetroStore(store: Pick<WwStore, 'store_format' | 'store_name'>) {
  if (store.store_format === 'metro') return true;
  return /^woolworths metro/i.test(store.store_name.trim());
}

export function storeDisplayName(store: Pick<WwStore, 'store_format' | 'store_name'>) {
  const name = store.store_name.trim();
  if (!name) return name;
  if (isMetroStore(store) && !/^woolworths metro/i.test(name)) {
    const location = metroLocationFromName(name);
    return `${METRO_PREFIX}${toTitleCase(location)}`;
  }
  if (isMetroStore(store)) {
    return `${METRO_PREFIX}${toTitleCase(metroLocationFromName(name))}`;
  }
  return name;
}
