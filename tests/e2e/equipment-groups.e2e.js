/*
 * End-to-end tests (Playwright) for the equipment location + equipment-groups feature.
 *
 * Covers:
 *   - migration 0269 (equipment_groups table, equipment.equipment_group_id,
 *     removal of the legacy equipment.product_group_id)
 *   - the /equipmentgroups master-data page + menu entry
 *   - creating an equipment group through the form (API POST)
 *   - assigning a location (hierarchical) and an equipment group to an equipment
 *     item and persisting it (API PUT)
 *   - the equipment overview columns and the equipment-group count
 *
 * How to run (against a local dev instance):
 *   composer install --ignore-platform-req=php     # PHP deps
 *   yarn install                                   # frontend packages -> public/packages
 *   cp config-dist.php data/config.php             # set MODE=dev (auto demo data + admin user)
 *   GROCY_DATAPATH="$PWD/data" php -S 127.0.0.1:8095 -t public router.php &
 *   # router.php: serve existing files, otherwise require public/index.php
 *   npm i playwright
 *   GROCY_BASE_URL=http://127.0.0.1:8095 \
 *   PW_CHROMIUM=/opt/pw-browsers/chromium-1194/chrome-linux/chrome \
 *   node tests/e2e/equipment-groups.e2e.js
 *
 * Notes:
 *   - In MODE=dev grocy renames user #1 to "Demo User" but keeps the default
 *     password "admin"; login below uses those credentials.
 *   - Exit code 0 = all checks passed.
 */
const { chromium } = require('playwright');

const BASE = process.env.GROCY_BASE_URL || 'http://127.0.0.1:8095';
const USER = process.env.GROCY_USER || 'Demo User';
const PASS = process.env.GROCY_PASS || 'admin';
const CHROMIUM = process.env.PW_CHROMIUM || undefined;
const GROUP_NAME = 'Power tools E2E';

const results = [];
function check(name, cond, detail = '') {
	results.push({ name, ok: !!cond, detail });
	console.log((cond ? 'PASS' : 'FAIL') + ' - ' + name + (detail ? '  [' + detail + ']' : ''));
}

(async () => {
	const browser = await chromium.launch(CHROMIUM ? { executablePath: CHROMIUM } : {});
	const ctx = await browser.newContext({ baseURL: BASE });
	const page = await ctx.newPage();

	const api = (path) => page.evaluate(async (p) => {
		const r = await fetch(p, { headers: { Accept: 'application/json' } });
		return { status: r.status, body: await r.text() };
	}, BASE + '/api' + path);

	// T0 - login (form POST inside the browser context so the session cookie sticks)
	await page.goto('/login', { waitUntil: 'domcontentloaded' });
	await page.evaluate(async ([u, p]) => {
		const body = new URLSearchParams();
		body.set('username', u);
		body.set('password_base64', btoa(p));
		await fetch('/login', { method: 'POST', body, headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
	}, [USER, PASS]);
	await page.goto('/equipment', { waitUntil: 'networkidle' });
	check('T0 login', !/\/login/.test(page.url()), page.url());

	// T1 - equipment groups master-data page + menu entry
	await page.goto('/equipmentgroups', { waitUntil: 'networkidle' });
	check('T1 /equipmentgroups loads', await page.locator('#equipmentgroups-table').count() === 1);
	check('T1 menu entry present', await page.locator('a[href$="/equipmentgroups"]').count() >= 1);

	// T2 - create equipment group via the form, verify via API
	await page.goto('/equipmentgroup/new', { waitUntil: 'networkidle' });
	await page.fill('#name', GROUP_NAME);
	await page.fill('#description', 'created by playwright');
	const postResp = page.waitForResponse(r => r.url().includes('/api/objects/equipment_groups') && r.request().method() === 'POST');
	await page.click('#save-equipment-group-button');
	check('T2 create group POST ok', (await postResp).status() === 200);
	const groups = JSON.parse((await api('/objects/equipment_groups')).body);
	const created = groups.find(g => g.name === GROUP_NAME);
	check('T2 group persisted via API', !!created, created ? 'id=' + created.id : 'not found');
	check('T2 active=1 default', created && String(created.active) === '1');

	// T3 - assign location + equipment group to equipment #1, verify via API
	const locId = JSON.parse((await api('/objects/locations')).body)[0].id;
	await page.goto('/equipment/1', { waitUntil: 'networkidle' });
	check('T3 has equipment group dropdown', await page.locator('#equipment_group_id').count() === 1);
	check('T3 has location dropdown', await page.locator('#location_id').count() === 1);
	check('T3 no legacy product_group field', await page.locator('#product_group_id').count() === 0);
	await page.selectOption('#location_id', String(locId));
	await page.selectOption('#equipment_group_id', String(created.id));
	const putResp = page.waitForResponse(r => /\/api\/objects\/equipment\/1$/.test(r.url()) && r.request().method() === 'PUT');
	await page.click('#save-equipment-button');
	await putResp;
	await page.waitForURL('**/equipment', { timeout: 15000 }).catch(() => {});
	await page.waitForLoadState('networkidle').catch(() => {});
	const eq1 = JSON.parse((await api('/objects/equipment/1')).body);
	check('T3 location_id saved', String(eq1.location_id) === String(locId), 'loc=' + eq1.location_id);
	check('T3 equipment_group_id saved', String(eq1.equipment_group_id) === String(created.id), 'grp=' + eq1.equipment_group_id);
	check('T3 no product_group_id column', !('product_group_id' in eq1));

	// T4 - overview shows the equipment group column + value
	await page.goto('/equipment', { waitUntil: 'networkidle' });
	const headers = await page.locator('#equipment-table thead th').allInnerTexts();
	check('T4 overview has Equipment group column', headers.some(h => /Equipment group/i.test(h)));
	check('T4 overview row shows the group', await page.locator('#equipment-table tbody tr', { hasText: GROUP_NAME }).count() >= 1);

	// T5 - equipment-group list shows the group and its count
	await page.goto('/equipmentgroups', { waitUntil: 'networkidle' });
	const grpRow = page.locator('#equipmentgroups-table tbody tr', { hasText: GROUP_NAME });
	check('T5 group row present', await grpRow.count() >= 1);
	check('T5 equipment count = 1', /\b1\b/.test(await grpRow.first().innerText()));

	const passed = results.filter(r => r.ok).length;
	console.log(`\n==== ${passed}/${results.length} checks passed ====`);
	await browser.close();
	process.exit(passed === results.length ? 0 : 1);
})().catch(e => { console.error('FATAL', e); process.exit(2); });
