# MSO Rule Matrix (Implementation Reference)

## Matrix Stage Rules

| Stage | Offer Type | User Action | Allowed? | Enforcement Rule | UI Response | Data Impact |
|---|---|---|---|---|---|---|
| Matrix | FIXED | `+` bundle | Yes | `bundleQty += 1` | qty increments | recompute all line qty = `baseQty * bundleQty` |
| Matrix | FIXED | `-` bundle | Yes (to 0) | `bundleQty = max(0, bundleQty-1)` | qty decrements | recompute lines; if 0 clear offer for store |
| Matrix | FIXED | edit line qty directly | No | line direct edit disabled | control disabled | none |
| Matrix | SPLIT | `+` offer | Yes | increment bundle anchor or seed base lines | qty increments | line mins rise by base |
| Matrix | SPLIT | `-` offer | Yes | remove surplus first, then reduce bundle anchor | qty decrements/clamps | line quantities normalized |
| Matrix | SPLIT | increase a line | Yes | `lineQty >= baseMin`, can exceed base | inline update | line-level qty updated |
| Matrix | SPLIT | decrease a line below base-min | No | clamp to current base minimum | value snaps back | no invalid state saved |
| Matrix | TORCH_1 | `+` on empty | Yes | open configurator | modal/drawer opens | draft created |
| Matrix | TORCH_1 | `-` on configured | Yes | clear config (confirm) | confirm dialog | all lines for store-offer cleared |
| Matrix | TORCH_1 | select additional line | Yes if `< maxSelections` | selected count `<= maxSelections` | line becomes active | line set to base qty |
| Matrix | TORCH_1 | deselect line | Yes if `> minSelections` | selected count `>= minSelections` | line set to 0 | line removed from selection |
| Matrix | TORCH_1 | set selected line below base | No | selected line must be `>= baseQty` | validation error | block apply |
| Matrix | TORCH_1 | set selected count outside range | No | `minSelections <= selected <= maxSelections` | error + disable Apply | block save |

## Checkout Rules

| Stage | Offer Type | User Action | Allowed? | Enforcement Rule | UI Response | Submit Gate |
|---|---|---|---|---|---|---|
| Checkout | FIXED | change qty row +/- | No (direct) | fixed lines locked | controls disabled | must remain valid bundle multiples |
| Checkout | FIXED | remove one line only | No | cannot orphan fixed bundle lines | action blocked | fail if incomplete bundle |
| Checkout | SPLIT | edit row directly | No (recommended) | route to "Edit Offer Structure" | open structured editor | validate group before save |
| Checkout | SPLIT | save structured edits | Yes | all line mins/base constraints pass | close editor + update cart | pass |
| Checkout | SPLIT | submit with invalid line structure | No | group validation fails | error banner + highlight offer | block submit |
| Checkout | TORCH_1 | edit torch rows directly | No (recommended) | route to torch configurator | open structured editor | validate CHOOSE_N |
| Checkout | TORCH_1 | save torch config | Yes if valid | selected count + per-line qty valid | close editor + update cart | pass |
| Checkout | TORCH_1 | submit with count < min or > max | No | CHOOSE_N rule fails | show exact rule error | block submit |

## Drop-Month Rules

| Stage | Offer Type | User Action | Allowed? | Enforcement Rule | UI Response | Data Rule |
|---|---|---|---|---|---|---|
| Checkout | FIXED | assign drops per unit | Yes | month assignments count must equal line qty | normal | sum(month units) = line qty |
| Checkout | SPLIT | assign drops per line units | Yes | per-line month allocations must reconcile | normal | per-line month sum = line qty |
| Checkout | SPLIT | split extras into different month | Yes | extras stay under same `offerId` context | normal | no separate "new offer" created |
| Checkout | TORCH_1 | assign drops for selected lines | Yes | only selected lines can have non-zero allocations | normal | unselected lines must be 0 |
| Submit | All | final submit | Only if valid | structure + drop reconciliation all pass | submit or blocked | hard gate |

## MSO-Specific Rules

| Stage | Offer Type | User Action | Allowed? | Enforcement Rule | UI Response | Persistence |
|---|---|---|---|---|---|---|
| MSO | FIXED | quick qty in matrix | Yes | bundle math only | instant | store-offer saved |
| MSO | SPLIT | quick qty only | Partial | requires configurator for line detail | prompt "Configure" | draft until valid |
| MSO | SPLIT | configurator apply | Yes if valid | line mins/base rules pass | success state badge | commit store-offer config |
| MSO | TORCH_1 | matrix only submit | No | must configure CHOOSE_N lines | blocking prompt | no submit |
| MSO | TORCH_1 | configurator apply | Yes if valid | selected lines within min/max, line mins valid | success state badge | commit store-offer config |
| MSO | Any | continue to checkout | Only if all configured offers valid | no invalid store-offer drafts | button enabled/disabled | move valid payload only |

## Validation Priority

1. Line-level bounds (min/max/base/carton)
2. Offer-level structure (FIXED completeness, SPLIT minima, CHOOSE_N count)
3. Drop reconciliation (month allocations == line quantities)
4. Store-offer completeness (MSO: no required configurator pending)
5. Global submit gate (block on any failure)

## Error Message Set (Recommended Exact Text)

- FIXED: "This fixed offer must be ordered as a complete bundle."
- SPLIT: "Line quantity cannot be below the required base quantity."
- SPLIT: "Split offer structure is invalid. Re-open and confirm line quantities."
- TORCH_1: "Select at least 3 and at most 4 torch lines."
- TORCH_1: "Each selected torch line must be at least 1 unit."
- Drops: "Drop allocations must equal ordered quantity for each line."
- MSO: "Complete offer configuration for highlighted stores before checkout."
