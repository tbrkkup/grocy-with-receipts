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
- [ ] Location hierarchy – Phase 1 (management): create/nest locations, cycle protection in the parent picker, and delete protection (location with sub-locations). Branch `claude/location-hierarchy`, migrations `0262`/`0263`. DB parts validated against real SQLite; awaiting user test on the live instance.

## Testing / QA (verified)
- [x] Receipt invoice number (`invoice_number`): verified in the Web UI on 2026-07-05 — entering and editing the number in the receipt form (`/receipt/{id}`) and displaying/sorting the "Invoice number" column in the receipts list (`/receipts`) both work as expected. Backend/frontend on branch `claude/grocy-receipts-feedback-xxvlwv`, migration `0260`.
