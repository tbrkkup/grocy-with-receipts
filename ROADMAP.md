# Roadmap

## Planned Features

### Receipt Management (Web)
- [ ] Customizable receipt dropdown display format in the purchase form (user setting: e.g. `{date} – {store}` vs. `{date} – {description}`)
- [ ] File attachments for receipts (upload/view PDF or image per receipt)
- [ ] Import tool (`grocyimportv15`) automatically creates and links a receipt entry on import
- [ ] Stock journal: display linked receipt in journal rows

### Store hierarchy / branches (Kette → Filiale) — follow-ups
Concept: `docs/shopping-location-branches-concept.md`. First wave (management, form,
picker/dropdowns, migrations `0266`–`0268`) is on branch `claude/location-branches-concept-3bdkzx`.
Deferred by design:
- [ ] **Import widget / bulk-purchase** (`public/grocy-import.html` → future internal "bulk-purchase"): let the concrete **branch** be picked/detected when linking purchases. Alias lookup must normalize to the **chain (root)** via `shopping_locations_descendants` / `root_id`, so chain-wide learned aliases apply across all branches. Do this when the widget is integrated internally.
- [ ] **Chain totals / store overview**: optional `/shoppinglocationoverview` (tree with "receipts/spend here" vs. "incl. branches") via `shopping_locations_descendants`. Pure reporting — the user explicitly did not want this in the first wave.
- [ ] Equipment form receipt label (`views/equipmentform.blade.php`): shows the plain store name; could show the full path.

### Receipt Management (Android)
- See `grocy-with-receipts-android` ROADMAP.md

## Testing / QA (open)
- [ ] Tasks form "Save & add another": verify the background list refresh on the real deploy. Implemented and verified in the dev sandbox (branch `fix-save-and-add-other`, merged into `test-deploy-01-branch`), but not yet confirmed in production.

- [ ] **Store hierarchy (Kette → Filiale) – AWAITING USER TEST on the live instance** (branch `claude/location-branches-concept-3bdkzx`, migrations `0266`–`0268`; DB parts validated against real SQLite, PHP lints clean). Test checklist:
  - Management (`/shoppinglocations` + `/shoppinglocation/{id}`): create/nest stores via the "Parent store" picker; the list shows the tree (indentation + Parent column); editing a store does not offer itself or its descendants as parent (cycle protection); deleting a store that has branches is blocked with a hint, deleting a leaf works; a branch name may repeat under different chains but not twice under the same parent.
  - Dropdowns show the full path ("REWE › Hauptstraße"): receipt form (`/receipt/{id}`), purchase, product form (default store), stock-entry form, inventory, product barcode form.
  - Backward compatibility: existing stores (no parent) still appear as roots; existing receipts / stock log unaffected.

## Testing / QA (verified)
- [x] Stock entries (`/stockentries`): the "Location" column shows the full location path (collapsed to `root › … › leaf` from 3 levels on), the location filter matches again, and the path is kept after in-place refresh (consume/open) — verified on 2026-07-06. The stock-overview "Default location" column uses the same collapsed-path display (no tooltip); its location filter is id-based + hierarchy-aware.
- [x] Location content sheet (`/locationcontentsheet`, reachable via Stock Overview → "Reports" dropdown → "Location Content Sheet"): each location heading now shows the full location path — verified on 2026-07-06.
- [x] Location hierarchy (Phases 1–3): verified on the live instance on 2026-07-06 — nesting via the "Parent location" picker, tree list, cycle + delete protection, path in all location dropdowns, and the `/locationoverview` roll-up all work. Branch `claude/location-hierarchy`, migrations `0262`–`0264` (0264 normalises invalid `parent_location_id` `''`/orphan → NULL). Note: the `data/viewcache` route cache + migrations only refresh when `version.json` changes — bump it on every deploy that adds routes/migrations.
- [x] Receipt invoice number (`invoice_number`): verified in the Web UI on 2026-07-05 — entering and editing the number in the receipt form (`/receipt/{id}`) and displaying/sorting the "Invoice number" column in the receipts list (`/receipts`) both work as expected. Backend/frontend on branch `claude/grocy-receipts-feedback-xxvlwv`, migration `0260`.
