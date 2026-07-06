# Roadmap

## Planned Features

### Receipt Management (Web)
- [ ] Customizable receipt dropdown display format in the purchase form (user setting: e.g. `{date} – {store}` vs. `{date} – {description}`)
- [ ] File attachments for receipts (upload/view PDF or image per receipt)
- [ ] Import tool (`grocyimportv15`) automatically creates and links a receipt entry on import
- [ ] Stock journal: display linked receipt in journal rows

### Receipt Management (Android)
- See `grocy-with-receipts-android` ROADMAP.md

## Testing / QA (open)
- [ ] Tasks form "Save & add another": verify the background list refresh on the real deploy. Implemented and verified in the dev sandbox (branch `fix-save-and-add-other`, merged into `test-deploy-01-branch`), but not yet confirmed in production.
- [ ] Stock overview: the "Default location" column now shows the collapsed location path (`root › … › leaf`, middle levels folded from 3 levels on) with the full path as a hover tooltip, and the location filter is id-based + hierarchy-aware (filtering a parent includes products in its sub-locations). Awaiting user test on the live instance.

## Testing / QA (verified)
- [x] Location content sheet (`/locationcontentsheet`, reachable via Stock Overview → "Reports" dropdown → "Location Content Sheet"): each location heading now shows the full location path — verified on 2026-07-06.
- [x] Location hierarchy (Phases 1–3): verified on the live instance on 2026-07-06 — nesting via the "Parent location" picker, tree list, cycle + delete protection, path in all location dropdowns, and the `/locationoverview` roll-up all work. Branch `claude/location-hierarchy`, migrations `0262`–`0264` (0264 normalises invalid `parent_location_id` `''`/orphan → NULL). Note: the `data/viewcache` route cache + migrations only refresh when `version.json` changes — bump it on every deploy that adds routes/migrations.
- [x] Receipt invoice number (`invoice_number`): verified in the Web UI on 2026-07-05 — entering and editing the number in the receipt form (`/receipt/{id}`) and displaying/sorting the "Invoice number" column in the receipts list (`/receipts`) both work as expected. Backend/frontend on branch `claude/grocy-receipts-feedback-xxvlwv`, migration `0260`.
