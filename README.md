# metcash26-app

Standalone extraction of the `metcash26` flow, split into:

- `frontend` (React + TypeScript)
- `backend` (Node.js + Express + Postgres)

## Quick start

### 1) Backend

```bash
cd backend
cp .env.example .env
npm install
npm start
```

Backend runs on `http://localhost:5001` by default.

### 2) Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm start
```

Frontend runs on `http://localhost:3000` by default and loads the metcash26 flow directly.

## Environment variables

### backend/.env

- `PORT` (default `5001`)
- `CORS_ORIGIN` (default `*`)
- `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE` (Postgres connection)
- `DB_SSL` (`false` for Render internal Postgres, otherwise SSL with cert verification off)

### frontend/.env

- `REACT_APP_API_URL` (blank for same-origin / Render single-service setup)
- `SKIP_PREFLIGHT_CHECK` (set `true` for nested-workspace preflight conflicts)
- `DISABLE_ESLINT_PLUGIN` (set `true` for nested-workspace CRA eslint conflicts)

## Included backend endpoints

- `GET /api/store/:storeNumber`
- `GET /api/store-data/:storeNumber`
- `GET /api/states`
- `GET /api/suburbs?state=...`
- `GET /api/mcash-stores?state=...&suburb=...`
- `GET /api/offers`
- `GET /api/offers/:offerId`
- `POST /api/save-order`
- `GET /api/orders-stats`

## Data files

Backend CSV ingest files:

- `backend/ihg26stores.csv`
- `backend/mcash26.csv`
- `backend/offers.csv`

## Render deployment (single service)

This repo includes `render.yaml` and a root `package.json` so Render can build and run from repo root.

- Build command: `npm run render-build`
- Start command: `npm run render-start`

Required env vars on Render:

- `DATABASE_URL` (recommended; Supabase/Render URI format)
- or `PGHOST` + `PGPORT` + `PGUSER` + `PGPASSWORD` + `PGDATABASE`
- `DB_SSL=false` (recommended when using Render private Postgres network)
