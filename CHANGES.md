# metcash26-app — Session Changes

## Database: SQLite → PostgreSQL (Neon)

- Installed `pg` in backend (`npm install pg`)
- Replaced SQLite driver with `pg` Pool in `backend/db.js`
- Uses individual env vars (`PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE`) — avoids URL-parsing failures with special characters in passwords
- `DB_SSL=true` → `ssl: { rejectUnauthorized: false }` for Neon TLS
- Hosted DB: Neon (`ep-round-field-ad74opvm.c-2.us-east-1.aws.neon.tech`)

**`backend/.env`**
```
PORT=5001
CORS_ORIGIN=*
PGHOST=ep-round-field-ad74opvm.c-2.us-east-1.aws.neon.tech
PGPORT=5432
PGUSER=neondb_owner
PGPASSWORD=npg_jV67zQDKtlWa
PGDATABASE=neondb
DB_SSL=true
```

---

## CSV Loading: Bulk UNNEST INSERT

One INSERT per row over a US-East Neon connection from AU = effectively never completes.
Rewrote all three CSV loaders in `backend/server.js` to use PostgreSQL `UNNEST` bulk insert — 1 round trip per table instead of ~3000.

```js
await pool.query(
  `INSERT INTO mcash_stores (name, address, suburb, state, pcode, banner)
   SELECT * FROM unnest($1::text[], $2::text[], $3::text[], $4::text[], $5::text[], $6::text[])`,
  [names, addresses, suburbs, states, pcodes, banners]
);
```

Same pattern applied to `stores` (8 cols) and `offers` (22 cols).

---

## On-Screen Keyboard: Removed

Removed from `frontend/src/components/UserForm.tsx`:
- `react-simple-keyboard` import and CSS
- All keyboard state: `showKeyboard`, `activeInput`, `keyboardRef`, `keyboardContainerRef`
- All keyboard handlers: `handleInputFocus`, keyboard `handleInputBlur` logic, `onKeyPress`, `closeKeyboard`, `renderKeyboard`
- Simplified input to standard controlled `<input>` with native `onChange`
- `handleInputBlur` simplified to: format name on blur only

---

## Top Navigation Bar

New component: `frontend/src/components/TopNav.tsx` + `TopNav.css`

- Fixed bar, height 52px mobile / 56px tablet+
- Background `#0a0a0a`, z-index 9000
- Left: "dble" wordmark (white, red underline)
- Right (when logged in): user full name + initial avatar (red gradient circle) + Logout button
- Logout resets all state → back to form (step 1)
- Always rendered on all steps; user info only shown when `userData` exists

`App.tsx` changes:
- Added `import TopNav`
- `<div className="App with-nav">` always present
- `<TopNav userName={userData?.fullName} onLogout={handleThankYouComplete} />`

`App.css` changes:
- `.App.with-nav { padding-top: 52px; padding-bottom: 60px; }`
- `@media (min-width: 768px) { padding-top: 56px; }`

---

## iPad Layout

`frontend/src/ipad.css` — already existed with comprehensive 768px–1280px breakpoints covering:
form card, home screen, store confirm, loading, offers listing, order summary, thank you, empty cart, footer, offer detail.

Imported in `frontend/src/index.css` via `@import './ipad.css'`.

---

## Footer: Restored

`Footer` component (`Footer.tsx` / `Footer.css`) was removed earlier by mistake.

Re-added to `App.tsx`:
- `import Footer from './components/Footer'`
- `<Footer />` rendered just before closing `</div>`

Footer is fixed to bottom, shows:
- "Metcash – Store lookup & sales input"
- API connection status dot (green = connected, red = disconnected, polls every 5s)
