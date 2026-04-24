# metcash26-app — overview

This document describes the **Metcash 2026 Expo** web application: structure, user flows, and how the pieces connect. It is maintained as a map of the repo; behaviour details live in source and in [`README.md`](../README.md).

---

## 1. Purpose

- **Audience:** Field reps (login) helping retailers place **expo promotional orders**.
- **Outcomes:** Capture **store identity**, **cart lines** (offer, tier, qty, drop months), and **submit orders** to PostgreSQL via a Node/Express API.
- **Two modes:**
  - **Retail** — single store via state → suburb → store picker; optional **presentation** deck before offers.
  - **MSO** — multi-store via group + checkboxes; **matrix** (stores × offers) then checkout; **one `POST /api/save-order` per store** with lines.

---

## 2. Repository layout

| Path | Role |
|------|------|
| `frontend/` | React (Create React App), TypeScript — UI |
| `backend/` | Express, Postgres — REST API, CSV ingest |
| `docs/` | This file, MSO notes, other sketches |
| Root `package.json` | `render-build` / `render-start` for combined deploy |

Default ports: frontend **3000**, backend **5001** (see README).

---

## 3. Frontend

### 3.1 Navigation model

There is **no React Router** for the main journey. [`App.tsx`](../frontend/src/App.tsx) holds **`currentStep`** (`AppStep`) and renders one screen at a time.

**Steps:** `login` → `form` → (`loading` | `store-confirm`) → `offers-listing` | `offer-detail` → `order-summary` → `thankyou` | `empty-cart-thankyou`  
**MSO inserts:** `form` → … → **`mso-matrix`** → `order-summary` → …

**State:** `userData`, `storeData`, `cartItems`, `sessionFlow` (`retail` | `mso`), `msoStores` (MSO only), `sessionEmail`, `selectedOfferId`, presentation overlay flag.

### 3.2 API usage

[`frontend/src/api.ts`](../frontend/src/api.ts): **`apiUrl(path)`** builds URLs from **`REACT_APP_API_URL`** (or same-origin when unset). **`StoreData`** carries store fields including optional **`msoGroup`**, **`storeId`**, etc.

### 3.3 Major UI components

| Component | Responsibility |
|-----------|----------------|
| `LoginScreen` | Email login |
| `UserForm` | Wizard: name; retail (state/suburb/store) or MSO (group, multi-select stores) |
| `StoreConfirm` | Retail store confirmation |
| `PresentationPlayer` | Full-screen deck (`metcashExpoSampleDeck`); not used on MSO path |
| `OffersListing` | Offer browsing, cart, modals |
| `OfferDetail` | Full-page offer |
| `MsoOfferMatrix` | Store × offer grid; modal from column headers; **Continue to checkout** |
| `OrderSummary` | Position, email, PO, **Submit order** |
| `EmptyCartThankYou` | Empty-cart exit |
| `TopNav` | Rep display name, logout, dashboard |
| `Footer` | Back + API status — **not rendered when `currentStep === 'mso-matrix'`** so the matrix action bar stays visible above the bottom chrome |
| `Dashboard` | Reporting (dashboard endpoints) |

### 3.4 Config / assets

- `frontend/src/config/offersDisplay.ts` — strip ordering, brand buckets, imagery helpers.
- `frontend/public/` — static images referenced by offers and branding.

---

## 4. Backend

- **Entry:** [`backend/server.js`](../backend/server.js).
- **DB:** Postgres (`backend/db.js`); tables for stores, offers, orders, order items (see server bootstrap).
- **Offer media copy:** [`backend/offer-content.json`](../backend/offer-content.json) enriches offer groups (logos/heroes/text).
- **CSV sources:** e.g. `mcash26.csv`, `offers.csv` — loaded per server logic (README lists data files).

**Representative routes**

- Store pickers: `GET /api/states`, `/api/suburbs`, `/api/mcash-stores`
- MSO: `GET /api/mcash-groups`, `/api/mcash-stores-by-group`
- Offers: `GET /api/offers`, `/api/offers/:offerId`
- Orders: `POST /api/save-order`
- Health: `GET /healthz`
- Dashboard/reporting: `/api/dashboard`, `/api/orders-stats`, etc.

---

## 5. Order submission

- **Retail / single store:** One `save-order` payload with `storeCode`, `items`, `dropMonths` per line as implemented.
- **MSO:** Cart items include **`msoStoreKey`**; client filters by store and issues **one POST per store** that has lines.

---

## 6. Deployment

- Root scripts build the frontend and start the backend; production may serve the SPA from the same host as the API.
- Environment variables: database URL, CORS, SSL — see [`README.md`](../README.md).

---

## 7. Other docs

| File | Contents |
|------|----------|
| [`README.md`](../README.md) | Setup, env vars, endpoint list, Render |
| [`MSO-flow-sketch.md`](./MSO-flow-sketch.md) | MSO flow notes (verify against code if in doubt) |
