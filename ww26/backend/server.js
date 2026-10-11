require('dotenv').config();

const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { pool } = require('./db');
const { createWw26Application, initWw26 } = require('./appFactory');
const { registerWw26Dashboard } = require('./dashboardRoutes');

const PORT = Number(process.env.PORT || 5003);
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';
const skipAuth =
  String(process.env.WW26_DASHBOARD_DEV_SKIP_AUTH || '').toLowerCase() === 'true';

const dbleAuthPath = path.join(__dirname, '..', '..', 'metcash26', 'backend', 'dbleAuth.js');
const hasDbleAuth = fs.existsSync(dbleAuthPath);

const app = express();
app.use(
  cors({
    origin: CORS_ORIGIN === '*' ? true : CORS_ORIGIN,
    credentials: true,
  }),
);
app.use(express.json());
app.use(cookieParser());

let requireAuth = null;
if (skipAuth) {
  app.get('/api/auth/me', (_req, res) =>
    res.json({ authenticated: true, email: 'dev-local@dble.co' }),
  );
  app.post('/api/auth/logout', (_req, res) => res.json({ ok: true }));
} else if (hasDbleAuth) {
  const { registerDbleAuthRoutes, createRequireAuth } = require(dbleAuthPath);
  registerDbleAuthRoutes(app, {
    pool,
    productLabel: 'the Woolworths WW26 Expo kiosk',
    emailSubject: 'Your Woolworths WW26 sign-in code',
  });
  requireAuth = createRequireAuth(pool);
} else {
  console.warn(
    'WW26 auth: metcash26/backend/dbleAuth.js not found — set WW26_DASHBOARD_DEV_SKIP_AUTH=true or deploy bundled on dble.co.',
  );
}

app.use(
  createWw26Application({
    standaloneHealth: true,
    requireAuth: skipAuth ? null : requireAuth,
  }),
);
registerWw26Dashboard(
  app,
  skipAuth ? (_req, _res, next) => next() : requireAuth,
);

const buildPath = path.join(__dirname, '..', 'frontend', 'build');
if (fs.existsSync(buildPath)) {
  app.use('/ww26', express.static(buildPath));
  app.get('/ww26', (_req, res) => res.sendFile(path.join(buildPath, 'index.html')));
  app.get(/^\/ww26\/.*$/, (_req, res) => res.sendFile(path.join(buildPath, 'index.html')));
  app.get('/', (_req, res) => res.redirect(302, '/ww26'));
}

async function boot() {
  try {
    if (!skipAuth && hasDbleAuth) {
      const { ensureAuthSchema } = require(dbleAuthPath);
      await ensureAuthSchema(pool);
    }
    await initWw26();
  } catch {
    // logged in initWw26
  }

  app.listen(PORT, () => {
    console.log(`WW26 Woolworths Expo → http://localhost:${PORT}/ww26`);
    if (skipAuth) console.warn('WW26_DASHBOARD_DEV_SKIP_AUTH=true — API open without sign-in (dev only).');
  });
}

boot();
