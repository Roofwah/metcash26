const path = require('path');
const fs = require('fs');
const express = require('express');
const { createWw26Application, initWw26, getWw26Status } = require('./appFactory');

/** Mount WW26 API + static UI on an existing Express app (e.g. metcash26 on dble.co). */
async function attachWw26(app, options = {}) {
  if (!process.env.WW26_DB_SCHEMA) {
    process.env.WW26_DB_SCHEMA = 'ww26';
  }

  app.use(
    createWw26Application({
      standaloneHealth: false,
      requireAuth: options.requireAuth || null,
    }),
  );
  const { registerWw26Dashboard } = require('./dashboardRoutes');
  registerWw26Dashboard(app, options.requireAuth);
  await initWw26();

  const buildPath = path.join(__dirname, '..', 'frontend', 'build');
  if (!fs.existsSync(buildPath)) {
    console.warn('WW26 frontend build not found — /ww26 UI unavailable until frontend is built.');
    return { ok: false, api: true, static: false };
  }

  console.log('Serving WW26 React build at /ww26 from:', buildPath);
  app.use('/ww26', express.static(buildPath));
  app.get('/ww26', (_req, res) => res.sendFile(path.join(buildPath, 'index.html')));
  app.get(/^\/ww26\/.*$/, (_req, res) => res.sendFile(path.join(buildPath, 'index.html')));

  return { ok: true, api: true, static: true, ...getWw26Status() };
}

module.exports = { attachWw26 };
