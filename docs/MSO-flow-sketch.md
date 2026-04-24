# MSO flow — design sketch (research)

**MSO** = bulk ordering path for users tied to **`owner_group`** in `mcash26.csv` (column **Group**). They place orders for **one or many stores** in that group, **without** the store-confirm + presentation (“insights”) steps.

This doc is a blueprint only; implementation can follow in phases.

---

## 1. Goals

| Goal | Notes |
|------|--------|
| Entry from **Choose State** | Add **MSO** alongside state buttons. |
| Pick a **Group** | List distinct non-empty `owner_group` values from `mcash_stores` (and CSV fallback). |
| Pick **store(s)** | All stores where `owner_group` matches; user can multi-select. |
| Skip insights | No `store-confirm`, no `PresentationPlayer` for this path. |
| Order entry | Land on **offers listing** (or a thin MSO shell) with a clear “which store am I ordering for?” rule. |
| Batching | Optional: same cart lines submitted for **subset A+C**, then **B+D**, then **E** — same UX pattern as “submit for selected stores” in sequence. |

---

## 2. User journey (wireframe)

```
[Step: State]  ──►  tap "MSO"
                        │
                        ▼
[Step: MSO — Groups]     list: DISTINCT owner_group (sorted), exclude blank / "-"
                        │
                        ▼
[Step: MSO — Stores]     checklist + filter (state / suburb optional)
                        selected: {S1, S2, ...}
                        │
                        ▼
[Continue]  ──►  set session: flow=mso, group=X, selectedStores=[...]
                        │
                        ▼
[Offers listing]       (skip store-confirm + deck)
                        │
        ┌───────────────┴───────────────┐
        │                               │
  Rule A: single “active”         Rule B: cart template
  store at a time                 + “Apply to: checked stores”
        │                               │
        ▼                               ▼
[Cart / order summary]          [Submit] → N × POST /api/save-order
        │                               (one order per store, same lines)
        ▼
```

**Simplest v1:** **Rule A** — user picks **one** active store from a dropdown (or from their multi-select as “current”), shops, submits; repeat for next store. **Less code**, clear semantics.

**Richer v2:** **Rule B** — build cart once, **duplicate** `order_items` into **one `orders` row per selected store** (loop client-side or server endpoint `POST /api/save-order-bulk`). Matches “A & C same order, then B & D”.

---

## 3. Backend (API)

| Endpoint | Purpose |
|----------|---------|
| `GET /api/mcash-groups` | `SELECT DISTINCT owner_group FROM mcash_stores WHERE TRIM(owner_group) NOT IN ('','-') ORDER BY 1`. Fallback: scan `loadFallbackMcashStores()` same filter. |
| `GET /api/mcash-stores-by-group?group=<name>` | `SELECT * FROM mcash_stores WHERE owner_group = $1 ORDER BY state, suburb, name` (exact match or `TRIM` + case-insensitive). Fallback: filter CSV rows. |

**Existing:** `GET /api/mcash-stores?state=&suburb=` — keep for retail path; MSO uses **group** instead.

**Orders:** Reuse **`POST /api/save-order`** as today (one store per request). **Bulk:** either multiple client calls or one transactional **`POST /api/save-order-mso`** body: `{ orders: [ { storeNumber, storeName, storeCode, banner, ... }, ... ], items: [...] }` inserting N orders in one DB transaction.

---

## 4. Frontend (`App.tsx` + `UserForm`)

### 4.1 State machine

- Add `flow: 'retail' | 'mso'` (or `sessionKind`) in `App` or derive from URL/query.
- **Retail:** unchanged — `form` → `store-confirm` → `offers-listing` + optional deck.
- **MSO:** `form` with MSO steps → **`offers-listing`** directly (no `store-confirm`, `setShowPresentation(false)`).

### 4.2 `UserForm` steps (minimal)

| Step | UI |
|------|-----|
| `STEP_STATE` | States + **MSO** button (same row or below). |
| `STEP_MSO_GROUPS` | Back returns to state; list groups; tap → `STEP_MSO_STORES`. |
| `STEP_MSO_STORES` | Checkbox list; “Continue” requires ≥1 store; pass `onSubmit(..., storeData)` **or** new callback `onMsoSubmit({ group, stores: StoreData[] })`. |

**`StoreData`** already has `store_id`, `ownerGroup`, etc. Build one object per selected mcash row.

### 4.3 Parent handling

- If **single store** for MSO v1: same as today — `setStoreData(store)`, `setCurrentStep('offers-listing')`.
- If **multiple:** `setMsoStores([...])`, `setActiveStoreIndex(0)` or `setActiveStoreId`; `storeData` = `msoStores[active]`.
- **TopNav / footer:** show “MSO · {group} · Store: {name}” + switcher if multi-store.

### 4.4 Offers / cart

- `OffersListing` / cart already use **`storeData`** — only need **active store** when `flow === 'mso'`.
- **Submit:** map `cartItems` → same payload for each target store if bulk submit.

---

## 5. Data & ordering semantics

| Scenario | Behaviour |
|----------|-----------|
| Same lines for stores A & C | **Two** `orders` rows (recommended v1); same `items` JSON twice with different `store_number` / `store_name` / `store_code`. |
| Then B & D, then E | User changes **active store** or **batch selection** and submits again — **three** submission waves. |
| Insight screen | **Skipped** for MSO (`currentStep` never `store-confirm`; deck not opened). |

---

## 6. Phased delivery

| Phase | Scope |
|-------|--------|
| **P0** | `GET groups` + `GET stores-by-group`; MSO button → group list → store list → **single** store continue → offers (same as retail after pick). |
| **P1** | Multi-select + active-store switcher + submit once per store from same cart. |
| **P2** | `save-order-mso` bulk transaction + optional “copy cart to all selected”. |

---

## 7. Open questions

1. **Group matching:** exact string match vs `ILIKE` vs normalized (typos in CSV).
2. **Empty / `-` group:** excluded from MSO list (already implied).
3. **Pricing:** assume same Expo offers for all stores in group; if not, per-store validation later.
4. **Auth:** same login as retail; no separate MSO role in this sketch.

---

## 8. File touch list (when implementing)

| Area | Files |
|------|--------|
| API | `backend/server.js` — new routes + reuse `parseMcashRowFromClean` / fallback. |
| App | `frontend/src/App.tsx` — flow, skip confirm/deck, `msoStores` state. |
| Form | `frontend/src/components/UserForm.tsx` — steps + MSO button. |
| Optional CSS | `UserForm.css` — compact list + checkboxes. |

---

## 9. Implementation status (v1)

- **`GET /api/mcash-groups`** and **`GET /api/mcash-stores-by-group?group=`** in `backend/server.js`.
- **UserForm:** State step includes **MSO — order for your group** → group list → store list (single pick) → `onSubmit(..., true)`.
- **App:** `sessionFlow: 'mso' | 'retail'`; MSO goes straight to **offers-listing** (no store-confirm, no deck). Footer back from offers → **form**. Nav shows **MSO · {group}** in connected datasets.
- **`StoreData.msoGroup`** set for MSO sessions.

*Multi-store selection / bulk submit: future phase.*

*Last updated: v1 wired in app.*
