/**
 * Playwright-Test: „Neu erstellen" aus Auswahlfeld – Phase C/D (weitere Felder).
 *
 * Prüft je Feld im Produktformular: „+" öffnet den passenden Anlege-Dialog gestapelt,
 * nach dem Speichern ist das neue Objekt im <select> eingetragen UND ausgewählt, kein
 * Reload (Produktname bleibt). Für Mengeneinheit zusätzlich: neue Einheit taucht in ALLEN
 * vier qu-Feldern auf. Für Geschäft zusätzlich: combobox-Textfeld zeigt den neuen Namen.
 *
 * Voraussetzung: lokaler Grocy-Devserver auf 127.0.0.1:8199 (Demo, keine Auth).
 * Ausführen:  node scratchpad/test-createnew-more.js
 */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const SHOT = require('path').join(__dirname);
const BASE = 'http://127.0.0.1:8199';

const cases = [
  { name: 'Standort (Default location)', target: 'location_id', newform: '/location/new',
    dlgUrl: '/location/new', save: '#save-location-button', entity: 'locations' },
  { name: 'Verbrauchsstandort', target: 'default_consume_location_id', newform: '/location/new',
    dlgUrl: '/location/new', save: '#save-location-button', entity: 'locations' },
  { name: 'Mengeneinheit Bestand', target: 'qu_id_stock', newform: '/quantityunit/new',
    dlgUrl: '/quantityunit/new', save: '.save-quantityunit-button.btn-success', entity: 'quantity_units',
    siblings: ['qu_id_purchase', 'qu_id_consume', 'qu_id_price'] },
  { name: 'Geschäft (Default store)', target: 'shopping_location_id', newform: '/shoppinglocation/new',
    dlgUrl: '/shoppinglocation/new', save: '#save-shopping-location-button', entity: 'shopping_locations',
    combobox: true },
];

let allOk = true;
function check(name, cond) { if (!cond) allOk = false; console.log((cond ? '  PASS ' : '  FAIL ') + name); return cond; }

(async () => {
  const browser = await chromium.launch({
    executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    args: ['--no-sandbox']
  });

  for (const c of cases) {
    console.log('\n### ' + c.name + ' (#' + c.target + ')');
    const page = await browser.newPage();
    page.on('pageerror', e => console.log('  [pageerror]', e.message));
    await page.goto(BASE + '/product/new', { waitUntil: 'networkidle' });
    await page.waitForTimeout(400);

    const marker = 'Keep_' + Date.now();
    await page.fill('#name', marker);

    const btn = await page.$('.create-new-picker-button[data-target-select="' + c.target + '"]');
    if (!check('„+"-Button vorhanden', !!btn)) { await page.close(); continue; }

    const before = await page.$$eval('#' + c.target + ' option', els => els.length);
    await btn.click();
    await page.waitForTimeout(1100);

    const dlg = page.frames().find(f => f.url().includes(c.dlgUrl));
    if (!check('Anlege-Dialog gestapelt geöffnet', !!dlg)) { await page.close(); continue; }

    const newName = c.entity.slice(0, 3) + '_' + Date.now();
    await dlg.fill('#name', newName);
    await dlg.click(c.save);
    await page.waitForTimeout(1600);

    const dialogGone = page.frames().find(f => f.url().includes(c.dlgUrl)) === undefined;
    check('Dialog nach Speichern geschlossen', dialogGone);

    const nameKept = await page.inputValue('#name');
    check('Kein Reload – Produktname erhalten', nameKept === marker);

    const after = await page.$$eval('#' + c.target + ' option', els => els.map(e => ({ v: e.value, t: e.textContent })));
    const added = after.find(o => o.t === newName);
    check('Neue Option eingetragen (' + before + ' -> ' + after.length + ')', !!added);
    const selVal = await page.$eval('#' + c.target, el => el.value);
    check('Neue Option ausgewählt', !!added && selVal === added.v);

    if (c.siblings) {
      for (const s of c.siblings) {
        const inSib = await page.$$eval('#' + s + ' option', els => els.map(e => e.textContent));
        check('Neue Einheit auch in #' + s + ' verfügbar', inSib.includes(newName));
      }
    }
    if (c.combobox) {
      const txt = await page.inputValue('#shopping_location_id_text_input').catch(() => '');
      check('Combobox-Textfeld zeigt neuen Namen', txt === newName);
    }

    await page.screenshot({ path: SHOT + '/more-' + c.target + '.png' });
    await page.close();
  }

  console.log('\n=== RESULT: ' + (allOk ? 'PASS' : 'FAIL') + ' ===');
  await browser.close();
  process.exit(allOk ? 0 : 1);
})();
