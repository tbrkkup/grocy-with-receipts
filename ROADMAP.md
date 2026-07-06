# Roadmap

## Planned Features

### Receipt Management (Web)
- [ ] Customizable receipt dropdown display format in the purchase form (user setting: e.g. `{date} – {store}` vs. `{date} – {description}`)
- [ ] File attachments for receipts (upload/view PDF or image per receipt)
- [ ] Import tool (`grocyimportv15`) automatically creates and links a receipt entry on import
- [ ] Stock journal: display linked receipt in journal rows

### Location hierarchy (follow-ups)
- [ ] Stock overview location filter (`views/stockoverview.blade.php`): currently keyed on the location *name* (value = name) and the table column shows the plain name. To fully support the hierarchy (nested locations, possibly duplicate names on different branches), rework it to an id-based filter and show the path.
- [ ] Location content sheet (`views/locationcontentsheet.blade.php`): consider showing the full path instead of the plain name.

### Receipt Management (Android)
- See `grocy-with-receipts-android` ROADMAP.md

## Testing / QA (open)
- [ ] Tasks form "Save & add another": verify the background list refresh on the real deploy. Implemented and verified in the dev sandbox (branch `fix-save-and-add-other`, merged into `test-deploy-01-branch`), but not yet confirmed in production.
- [ ] **Location hierarchy – AWAITING USER TEST on the live instance** (branch `claude/location-hierarchy`, migrations `0262`/`0263`; DB/helper parts validated against real SQLite/PHP). Test checklist:
  - Phase 1 (management, `/locations` + `/location/{id}`): create/nest locations via the "Parent location" picker; the list shows the tree (indentation + Parent column); editing a location does not offer itself or its descendants as parent (cycle protection); deleting a location that has sub-locations is blocked with a hint, deleting a leaf works.
  - Phase 2 (dropdowns): purchase, consume, transfer (from/to), inventory, stock-entry, product form (default + default-consume location) and the stock-entries/journal/settings location selects all show the full path; combobox prefill still selects the right location.
  - Phase 3 (`/locationoverview`): the new menu entry shows the location tree with "Products (directly here)" vs "Products (incl. sub-locations)" and the roll-up counts look right.
  - Known follow-ups (not blockers): stock-overview location filter is still name-based; location content sheet still shows plain names.

## Testing / QA (verified)
- [x] Receipt invoice number (`invoice_number`): verified in the Web UI on 2026-07-05 — entering and editing the number in the receipt form (`/receipt/{id}`) and displaying/sorting the "Invoice number" column in the receipts list (`/receipts`) both work as expected. Backend/frontend on branch `claude/grocy-receipts-feedback-xxvlwv`, migration `0260`.
