'use strict';

const path = require('path');
const fs = require('fs');
const express = require('express');

const HUB_BASE = '/energizerAU';
const shellPath = path.join(__dirname, 'energizer-shell');

const CHANNELS = [
  {
    id: 'metcash26',
    route: '/metcash26',
    label: 'Metcash / IGA',
    subtitle: 'Expo ordering & MSO',
    status: 'active',
    requiredGrant: 'metcash26',
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
];

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
  }));
}

function registerEnergizerHub(app, opts) {
  const indexPath = path.join(shellPath, 'index.html');
  if (!fs.existsSync(indexPath)) {
    console.error('Energizer hub shell missing at', shellPath, '—', HUB_BASE, 'not mounted');
    return false;
  }

  const cookieName = opts.cookieName;
  const getSessionById = opts.getSessionById;
  const pool = opts.pool;

  const devGrants = String(process.env.PLATFORM_DEV_GRANTS || 'metcash26,ww26,bunnings26')
    .split(',')
    .map((g) => g.trim())
    .filter(Boolean);

  app.get('/api/platform/config', (_req, res) => {
    res.json({ devSkipAuth: false, phase: 2, hubBase: HUB_BASE });
  });

  app.get('/api/channels', async (req, res) => {
    res.set('Cache-Control', 'no-store');
    const sid = String(req.cookies?.[cookieName] || '').trim();
    const session = await getSessionById(sid);
    if (!session) {
      return res.status(401).json({ error: 'Unauthenticated' });
    }
    const email = String(session.email || '').trim().toLowerCase();
    let grants = devGrants;
    if (pool) {
      try {
        const { rows } = await pool.query(
          `SELECT channel_id FROM user_channel_grants WHERE LOWER(email) = $1`,
          [email],
        );
        const fromDb = rows.map((r) => String(r.channel_id).trim()).filter(Boolean);
        if (fromDb.length > 0) grants = fromDb;
      } catch {
        // optional RBAC table
      }
    }
    res.json({
      channels: listChannels({ email, grants }),
      authenticated: true,
      email,
      phase: 2,
    });
  });

  app.use(HUB_BASE, express.static(shellPath, { index: false }));
  app.get(HUB_BASE, (_req, res) => {
    res.sendFile(indexPath);
  });
  app.get(`${HUB_BASE}/`, (_req, res) => {
    res.redirect(302, HUB_BASE);
  });

  console.log(`Energizer AU hub → ${HUB_BASE} (shell: ${shellPath})`);
  return true;
}

module.exports = { registerEnergizerHub, HUB_BASE };
