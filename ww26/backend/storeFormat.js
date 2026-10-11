const METRO_PREFIX = 'Woolworths Metro ';
const METRO_GROUP_ID = '888';

function isMetroFormat(format) {
  const f = String(format || '').trim().toLowerCase();
  return f === 'metro' || f === 'woolworths metro' || f === 'ww metro';
}

function toTitleCase(value) {
  return String(value)
    .toLowerCase()
    .replace(/(?:^|[\s\-/()])(\w)/g, (match) => match.toUpperCase());
}

function metroLocationFromName(rawName) {
  let name = String(rawName || '').trim();
  if (/^woolworths metro/i.test(name)) {
    return name.replace(/^woolworths metro\s*/i, '').trim();
  }
  if (/^woolworths\s+/i.test(name)) {
    name = name.replace(/^woolworths\s+/i, '').trim();
  }
  return name.replace(/\s+metro\s*$/i, '').trim();
}

/** Build display name for Woolworths (WW) vs Woolworths Metro (WW Metro) stores. */
function formatStoreName(rawName, format) {
  const name = String(rawName || '').trim();
  if (!name) return name;

  if (!isMetroFormat(format)) {
    return name;
  }

  if (/^woolworths metro/i.test(name)) {
    return `${METRO_PREFIX}${toTitleCase(metroLocationFromName(name))}`;
  }

  const location = metroLocationFromName(name);
  return `${METRO_PREFIX}${toTitleCase(location)}`;
}

function storeFormatValue(format) {
  return isMetroFormat(format) ? 'metro' : 'standard';
}

module.exports = {
  METRO_PREFIX,
  METRO_GROUP_ID,
  isMetroFormat,
  formatStoreName,
  storeFormatValue,
  toTitleCase,
  metroLocationFromName,
};
