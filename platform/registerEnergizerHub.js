'use strict';

const path = require('path');
const fs = require('fs');
const express = require('express');
const { listChannels } = require('../packages/channel-registry');

const HUB_BASE = '/energizerAU';
const shellPath = path.join(__dirname, 'shell', 'public');

/**
 * Energizer AU entry: one OTP login → channel hub (Metcash, Woolworths, Bunnings, …).
 * @param {import('express').Express} app
 * @param {{ cookieName: string, getSessionById: (sid: string) => Promise<{ email?: string } | null>, pool?: import('pg').Pool }} opts
 */
function registerEnergizerHub(app, opts) {
  if (!fs.existsSync(path.join(shellPath, 'index.html'))) {
    console.warn('Energizer hub shell not found — skip', HUB_BASE);
    return;
  }

  const cookieName = opts.cookieName;
  const getSessionById = opts.getSessionById;
  const pool = opts.pool;

  const devGrants = String(process.env.PLATFORM_DEV_GRANTS || 'metcash26,ww26,bunnings26')
    .split(',')
    .map((g) => g.trim())
    .filter(Boolean);

  app.get('/api/platform/config', (_req, res) => {
    res.json({
      devSkipAuth: false,
      phase: 2,
      hubBase: HUB_BASE,
    });
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
        // Table may not exist yet — use PLATFORM_DEV_GRANTS / defaults.
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
    res.sendFile(path.join(shellPath, 'index.html'));
  });
  app.get(`${HUB_BASE}/`, (_req, res) => {
    res.redirect(302, HUB_BASE);
  });

  console.log(`Energizer AU hub → ${HUB_BASE} (login once, then Metcash / WW / Bunnings)`);
}

module.exports = { registerEnergizerHub, HUB_BASE };
