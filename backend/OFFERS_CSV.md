# How to update offers (`offers.csv`)

## What file to edit

| File | Purpose |
|------|--------|
| **`backend/offers.csv`** | **This is the only file the running server loads** into Postgres on startup (and when you reload). Edit this. |
| `backend/offers.template.csv` | **Retail** column layout (optional alternative — see below). |
| `backend/offers.legacy.template.csv` | Copy of the **legacy** header + one example row — safe reference for column names. |
| `backend/offers.unified.template.csv` | **Unified** layout: `OFFER` plus **Logo**, **Product Image**, **Hero** and one row per line item — see Format C. |

Always save as **UTF-8**. Keep the **first row = headers** exactly as documented for your chosen format.

---

## End-to-end workflow (every time you change data)

1. **Edit** `backend/offers.csv` (or replace it with your new file **using the same header row** as below if you use legacy).
2. **Apply** the change to the database using **one** of:
   - **Restart the API:** stop the Node process, then from `backend/` run `npm start`, **or**
   - **Hot reload (server already running):**  
     `curl -X POST http://localhost:5001/api/reload-offers`  
     (or open that URL in a tool that can send POST).
3. **Refresh** the browser. If you only use the static build served by the API, a normal refresh is enough.

If something looks wrong, check the server log for `Loaded N offer rows` — `N` should match your expectations.

---

## Format A — **Legacy** (current production export)

**Detection:** the header row includes a column named **`OFFER`** (and does **not** rely on `Name` / `Item` alone).

### Header row (must match exactly — copy from `offers.csv` line 1 in the repo)

```text
OFFER,Offer Group,Offer Tier,Drop Months,Order Deadline,Min Order Value (ex GST),Brand,Range,Energizer Order Code,HTH Code,Code,Description,Reg Charge Back Cost,Expo Charge Back Cost,Save,SRP / Promo RRP,$ GM,% GM,Qty Type,Qty,Reg Total Cost,Expo Total Cost
```

### Rules

- Every **data** row must have a non-empty **`OFFER`** (e.g. `Energizer 7`, `Eveready 1`). That value is the **offer id** in the app.
- Multiple rows can share the same **`OFFER`** (tiers / SKUs / line items).
- Do **not** switch to different column names or reorder into a “simpler” sheet without changing the importer — the server maps **these** names only.

### Reference copy

See **`offers.legacy.template.csv`** (header + example rows).

---

## Format B — **Retail** (optional spreadsheet layout)

**Detection:** header includes **`Item`** and does **not** include **`OFFER`**.

Use **`offers.template.csv`** and the column table in the next section of the older retail notes — or see **`OFFERS_CSV.md`** history in git for the full retail table.

---

## Format C — **Unified** (images + copy in one sheet)

**Detection:** the header includes **`OFFER`** and at least one of **`Logo`**, **`Hero`**, **`Product Image`**, or **`ProductImage`**.

Put files under **`frontend/public/`** so paths resolve in the browser — e.g. `images/hero1.png` becomes URL `/images/hero1.png` (same pattern as `public/images/hero1.png`).

### Columns (reference)

| Column | Role |
|--------|------|
| **OFFER** | Offer id (required on each row), e.g. `Energizer 7`. |
| **Logo** | Card / header logo — e.g. `images/logo1.png`. |
| **Product Image** | Thumbnail on the offer card. |
| **Hero** | Large image in the offer detail modal. |
| **Offer Group**, **Brand** | Forward-filled from the last non-empty row (repeat on first row of each offer block). |
| **Item**, **Description** | Line text; importer uses **Item** or **Description** for the row description. |
| **Tier** or **Offer Tier** | Tier name. |
| **Type** | Stored as offer **Type** (e.g. retail vs pallet grouping hints). |
| **Category**, **Message**, **Other** | Free text; **Message** can surface in the modal when using CSV media. |
| **Value** | Maps to min order value if `Min Order Value (ex GST)` is empty. |
| **Reg Charge** / **Reg Charge Back Cost**, **Expo Charge** / **Expo Charge Back Cost**, **Discount** / **Save** | Commercial fields (aliases accepted). |
| **Drop Months**, **Order Deadline** | As in legacy. |

Blank cells or **`-`** are treated as empty and **do not** break the database or API.

Copy **`offers.unified.template.csv`** as a starting point (replace **`offers.csv`** or merge columns carefully).

---

## If the app shows “Failed to load offers”

Usually means the CSV was parsed but **`OFFER`** (legacy) or **`Name`/`Item`** (retail) didn’t produce valid groups — e.g. wrong headers, UTF-8 BOM issues, or empty ids. Fix the file, reload/restart, and check `GET http://localhost:5001/api/offers` in a browser or `curl` — each object should have a non-empty **`offerId`**.
