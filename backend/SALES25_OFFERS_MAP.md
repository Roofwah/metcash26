# sales25.csv ↔ offers.csv category mapping

`sales25.csv` row **1** defines **10 product categories**. Columns **5–14** are **value** ($) for each category; columns **15–24** are **qty** for the **same 10 categories** in the same order (headers repeat in the CSV).

`offers.csv` groups line items under **`OFFER`** / **`Offer Group`**. The app joins **prior-year qty** on offer cards to **`GET /api/store-sales`** line items by **matching** `Offer Group` / `OFFER` text to each item’s **`name`** (from the sales25 header), using **`canonicalSalesCategoryKey`** in `frontend/src/components/OffersListing.tsx`.

**Encoding / ®:** `sales25.csv` uses real **`®`** (UTF-8). Some **`offers.csv`** exports use a **broken byte sequence** that shows as **`�`** (U+FFFD) in the app — matching only `®`/`¨` in code **missed** Armor All and Jelly Belly. The matcher now **strips all non–letter/number symbols** (Unicode `\p{L}\p{N}` keep set) so `Armor All … Range Loose` and `Jelly Belly … Range Loose` align with sales regardless of trademark bytes.

**Column order:** In `sales25`, **column 5** is **Energizer** Tower and **column 6** is **Eveready** Tower — if you sort two lists **A–Z** independently, those two rows look “swapped”; the files are not crossed.

---

## Column index → sales25 header → offers category

| # | `sales25.csv` value column (header text) | `offers.csv` `OFFER` / `Offer Group` | Notes |
|---|------------------------------------------|--------------------------------------|--------|
| 1 | `Energizer Tower Pre-Pack` | `Energizer Tower Pre-Pack` | Same wording. |
| 2 | `Eveready Tower Pre-Pack ` (trailing space in file) | `Eveready Tower Pre-Pack` | Trimmed when loaded. |
| 3 | `Energizer Max Plus 10's Penta` | `Energizer Max Plus 10's Penta` | Same. |
| 4 | `Energizer Max 14/16 Loose Stock` | `Energizer Max 14/16 Loose Stock` | Same. |
| 5 | `Energizer Max 24pk` | `Energizer Max 24pk Loose Stock` | Sales label is shorter; offers adds **Loose Stock**. |
| 6 | `Energizer Specialty Range Loose` | `Energizer Specialty Range Loose` | Same. |
| 7 | `Armor All®  Range Loose` (® + double space before `Range`) | `Armor All¨  Range Loose` (¨ + double space) | Trademark char differs; matcher strips `®` / `¨` and spaces. |
| 8 | `Armor All® Quick Clean Kit ` (trailing space) | `Armor All¨ Quick Clean Kit ` | Same pattern as row 7. |
| 9 | `Jelly Belly® Range Loose Stock Deal` | `Jelly Belly¨ Range Loose` | Sales adds **Stock Deal**; canonical rules strip **`stock deal`** / **`loose stock`** where appropriate. |
| 10 | `Eveready Lighting Tower` | `Eveready Lighting Tower` | Same. |

---

## Technical layout (server)

- **Store id:** column `c0` (`Storeid`), must align with Metcash **`store_id`** / `sales25` Storeid.
- **Per category:** `c(5+i)` = value, `c(15+i)` = qty for `i = 0 … 9`.
- **API:** `GET /api/store-sales/:storeId` returns `items[]` with `name` (from value headers) and aggregated `value` / `qty`.

---

## New categories

If you add an **11th** column to `sales25` and new rows in `offers.csv`, update **`loadSales25Csv` / store-sales aggregation** (10 → 11) and extend **`findPriorYearSalesQty`** / normalization if needed.
