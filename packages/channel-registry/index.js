/** @typedef {'active'|'coming_soon'|'hidden'|'disabled'} ChannelStatus */

/**
 * @typedef {Object} ChannelDefinition
 * @property {string} id
 * @property {string} route
 * @property {string} label
 * @property {string} [subtitle]
 * @property {ChannelStatus} status
 * @property {string} [requiredGrant]
 * @property {boolean} [deepLinkSkipHub]
 */

/** @type {ChannelDefinition[]} */
const CHANNELS = [
  {
    id: 'metcash26',
    route: '/metcash26',
    label: 'Metcash / IGA',
    subtitle: 'Expo ordering & MSO',
    status: 'active',
    requiredGrant: 'metcash26',
    deepLinkSkipHub: true,
  },
  {
    id: 'ww26',
    route: '/ww26',
    label: 'Woolworths',
    subtitle: 'Expo 2026',
    status: 'active',
    requiredGrant: 'ww26',
  },
  {
    id: 'bunnings26',
    route: '/bunnings26',
    label: 'Bunnings',
    subtitle: 'In-aisle DBLE sessions',
    status: 'coming_soon',
    requiredGrant: 'bunnings26',
  },
  {
    id: 'mitre10',
    route: '/mitre10',
    label: 'TTHG / Mitre 10',
    subtitle: 'Future execution',
    status: 'coming_soon',
    requiredGrant: 'mitre10',
  },
];

/**
 * Future: filter by dble.user_channel_grants. Phase 0 — show all non-hidden channels.
 * @param {{ email?: string, grants?: string[] }} [opts]
 */
function listChannels(opts = {}) {
  const grants = new Set((opts.grants || []).map((g) => String(g).trim()));
  const hasGrantFilter = grants.size > 0;

  return CHANNELS.filter((ch) => {
    if (ch.status === 'hidden') return false;
    if (!hasGrantFilter) return true;
    if (!ch.requiredGrant) return true;
    return grants.has(ch.requiredGrant);
  }).map((ch) => ({
    id: ch.id,
    route: ch.route,
    label: ch.label,
    subtitle: ch.subtitle || '',
    status: ch.status,
    deepLinkSkipHub: Boolean(ch.deepLinkSkipHub),
  }));
}

function getChannelById(id) {
  return CHANNELS.find((ch) => ch.id === id) || null;
}

module.exports = { CHANNELS, listChannels, getChannelById };
