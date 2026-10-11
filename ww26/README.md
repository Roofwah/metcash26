# WW26 — Woolworths Expo kiosk

Touch-friendly web app for **Group Managers** and **Store Managers** to review Energizer / PentaBin performance and confirm 2026 allocation plans at the expo.

## URLs (local)

| Mode | URL |
|------|-----|
| **Energizer AU hub (prod)** | https://dble.co/energizerAU — one login, then pick channel |
| Dev UI | http://localhost:3003/ww26 |
| Field Performance (demo) | http://localhost:3003/ww26/field |
| API + production UI | http://localhost:5003/ww26 |
| Health / seed info | http://localhost:5003/healthz |

Dev UI talks to the API on **5003**. Port **5003** serves the built React app from `frontend/build` (rebuild after UI changes).

## Run

From repo root:

```bash
npm run channels:ww:dev
```

Or from `channels/ww26`:

```bash
npm run install-all
npm run dev          # backend + frontend (if concurrently works)
```

If `dev` fails, start separately:

```bash
npm --prefix backend start    # port 5003
npm --prefix frontend run dev # port 3003
```

Production-style (single port):

```bash
npm run restart   # build frontend + restart backend
```

### Deploy on dble.co (bundled with Metcash26)

WW26 ships on the **same Render service** as Metcash (`channels/metcash26`):

- **URL:** `https://dble.co/ww26`
- **API:** `https://dble.co/api/ww26/...`
- **Build:** `npm run render-build` in `channels/metcash26` (builds both frontends)
- **Env:** set `WW26_DB_SCHEMA=ww26` on the web service (Metcash tables stay in `public`)

Standalone WW26 (`channels/ww26` only) is still supported for local dev on port 5003.

### Reporting dashboard

- **Sign-in:** Rep email + 6-digit OTP (same as Metcash) before the kiosk or field UI loads
- Open the **DBLE** menu (top left) → **Dashboard** (requires the same session)
- Production: `https://dble.co/ww26` uses Metcash `/api/auth/*` and protects all `/api/ww26/*` routes
- Data: GM-confirmed Penta 2026 from `ww_store_allocations` (stores + group rollup, CSV export)
- Local dev without Metcash auth: set `WW26_DASHBOARD_DEV_SKIP_AUTH=true` in `backend/.env` (dev only)

## Stack

- **Frontend:** React 18, TypeScript, CRA (`homepage: /ww26`)
- **Backend:** Express, PostgreSQL (Neon), `csv-parse`
- **Data schema:** Postgres schema `ww26` (see `backend/initSchema.js`)

## Data files

| File | Purpose |
|------|---------|
| `backend/data/stores.csv` | Group, store number, store name, format (`WW` / `WW Metro`) |
| `backend/data/salesdata.csv` | Sales, rank/growth, 25/26 Penta columns (key: `Site` = 4-digit store id) |
| `backend/data/groups.csv` | Optional reference; groups are created from `stores.csv` on seed |

**Metrics rule:** Only stores with a row in `salesdata.csv` (or optional metric columns on `stores.csv`) get sales/growth/Penta data. No mock or generated numbers. Missing data shows as **—** in the UI.

On every backend start, `seedSampleData.js` loads CSVs into Postgres and upserts stores; it clears and rewrites performance rows only for stores with real data.

## User flows

### Group Manager

1. Landing slideshow → name → role → **pick group** (numeric tiles from `stores.csv`)
2. Group summary → performance grid (trend / growth per store)
3. Review **2026 PentaBins** per store (adjust quantities)
4. Confirm plan → session stored in DB

Metro stores are excluded from GM group lists except group **888** (Metro bucket).

### Store Manager / Other

1. Name → role → **find store** (A–Z list + filter by name or 4-digit number)
2. Store sales → performance → PentaBin recommendation (view-only for store role)
3. Complete session

## Key API routes

- `GET /api/ww26/groups` — groups with store counts
- `GET /api/ww26/groups/:groupId` — group + stores + metrics + summary
- `GET /api/ww26/stores/search?q=` — store lookup (identity only; no metrics)
- `POST /api/ww26/sessions` — start participant session
- `POST /api/ww26/sessions/:id/commitments` — GM confirm plan
- `POST /api/ww26/sessions/:id/complete` — store/other finish

## Config

`backend/.env` (see `.env.example`):

- `PORT=5003`
- `DATABASE_URL` — Postgres connection
- `DB_SCHEMA=ww26`
- `CORS_ORIGIN=*`

## Field Performance (removable module)

Read-only rep tool at **`/ww26/field`** — search store → competition dashboard. Does not touch Expo flow.

Remove: see `frontend/src/features/fieldPerformance/REMOVAL.md`.

## Project layout

```
channels/ww26/
├── backend/          # Express API, seed, CSV data
├── backend/fieldPerformance/  # Removable read-only API
├── frontend/         # React app (src/App.tsx = Expo flow)
├── frontend/src/features/fieldPerformance/
└── README.md
```

## Slideshow assets

Landing images in `frontend/public/` (`home.jpg`, `slide1v2.jpg`, …). Bump cache on build:

```bash
REACT_APP_SLIDE_CACHE=$(date +%s) npm --prefix frontend run build
```
