/**
 * Playwright-Test: „Neu erstellen"-„+" in weiteren Formularen (Phase E-Rollout).
 * Prüft Geschäft (combobox #shopping_location_id) und Standort (combobox #location_id)
 * in Einkauf (/purchase) und Inventur (/inventory): „+" öffnet Dialog gestapelt, nach
 * Speichern Option eingetragen + ausgewählt, combobox-Textfeld zeigt Namen, kein
 * Navigieren/Reload (URL bleibt), anderes Feld unberührt.
 *
 * Devserver 127.0.0.1:8199 (Demo). Ausführen: node scratchpad/test-createnew-forms.js
 */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const SHOT = require('path').join(__dirname);
const BASE = 'http://127.0.0.1:8199';

const forms = [
  { url: '/purchase', name: 'Einkauf' },
  { url: '/inventory', name: 'Inventur' },
];
const fields = [
  { target: 'shopping_location_id', dlgUrl: '/shoppinglocation/new', save: '#save-shopping-location-button', entity: 'sho' },
  { target: 'location_id', dlgUrl: '/location/new', save: '#save-location-button', entity: 'loc' },
];

let allOk = true;
function check(n, c) { if (!c) allOk = false; console.log((c ? '  PASS ' : '  FAIL ') + n); return c; }

(async () => {
  const browser = await chromium.launch({
    executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox']
  });

  for (const form of forms) {
    for (const f of fields) {
      console.log('\n### ' + form.name + ' · #' + f.target);
      const page = await browser.newPage();
      page.on('pageerror', e => { /* pre-existing product_presets errors ignored */ });
      await page.goto(BASE + form.url, { waitUntil: 'networkidle' });
      await page.waitForTimeout(500);

      const btn = await page.$('.create-new-picker-button[data-target-select="' + f.target + '"]');
      if (!check('„+"-Button vorhanden', !!btn)) { await page.close(); continue; }

      const otherText = await page.inputValue('#' + (f.target === 'location_id' ? 'shopping_location_id' : 'location_id') + '_text_input').catch(() => null);
      const before = await page.$$eval('#' + f.target + ' option', els => els.length);

      await btn.click();
      await page.waitForTimeout(1100);
      const dlg = page.frames().find(fr => fr.url().includes(f.dlgUrl));
      if (!check('Dialog gestapelt geöffnet', !!dlg)) { await page.close(); continue; }

      const newName = f.entity + '_' + Date.now();
      await dlg.fill('#name', newName);
      await dlg.click(f.save);
      await page.waitForTimeout(1500);

      check('URL unverändert (kein Navigieren)', page.url().endsWith(form.url));
      check('Dialog geschlossen', page.frames().find(fr => fr.url().includes(f.dlgUrl)) === undefined);

      const after = await page.$$eval('#' + f.target + ' option', els => els.map(e => ({ v: e.value, t: e.textContent })));
      const added = after.find(o => o.t === newName);
      check('Neue Option eingetragen (' + before + ' -> ' + after.length + ')', !!added);
      const selVal = await page.$eval('#' + f.target, el => el.value);
      check('Neue Option ausgewählt', !!added && selVal === added.v);
      const txt = await page.inputValue('#' + f.target + '_text_input').catch(() => '');
      check('Combobox-Textfeld zeigt neuen Namen', txt === newName);

      const otherAfter = await page.inputValue('#' + (f.target === 'location_id' ? 'shopping_location_id' : 'location_id') + '_text_input').catch(() => null);
      check('Anderes Feld unberührt', otherAfter === otherText);

      await page.screenshot({ path: SHOT + '/forms-' + form.name + '-' + f.target + '.png' });
      await page.close();
    }
  }

  console.log('\n=== RESULT: ' + (allOk ? 'PASS' : 'FAIL') + ' ===');
  await browser.close();
  process.exit(allOk ? 0 : 1);
})();
