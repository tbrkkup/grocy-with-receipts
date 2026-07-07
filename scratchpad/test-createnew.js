/**
 * Playwright-Test: „Neu erstellen" direkt aus einem Auswahlfeld (create-new-dialog).
 *
 * Prüft den Proof (Phase B) end-to-end im Produktformular am Produktgruppen-Select:
 *   1. „+"-Button neben dem Feld ist vorhanden.
 *   2. Klick öffnet den Produktgruppen-Anlege-Dialog als GESTAPELTES Modal-iframe
 *      über dem Produktformular (das Formular bleibt geladen).
 *   3. Nach dem Speichern ist die neue Gruppe im <select> eingetragen UND ausgewählt.
 *   4. Kein Reload: der vorher eingegebene Produktname bleibt erhalten.
 *   5. Der Dialog ist geschlossen.
 *
 * Voraussetzung: lokaler Grocy-Devserver auf 127.0.0.1:8199 (Demo-Modus, keine Auth).
 * Ausführen:  node scratchpad/test-createnew.js
 */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const SHOT = require('path').join(__dirname);
const BASE = 'http://127.0.0.1:8199';

function check(name, cond) {
  console.log((cond ? '  PASS ' : '  FAIL ') + name);
  return cond;
}

(async () => {
  const browser = await chromium.launch({
    executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    args: ['--no-sandbox']
  });
  const page = await browser.newPage();
  page.on('pageerror', e => console.log('  [pageerror]', e.message));

  let ok = true;

  await page.goto(BASE + '/product/new', { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);

  // Produktname setzen -> Nachweis, dass der Formularzustand den Dialog überlebt
  const uniqueProduct = 'ProofProduct_' + Date.now();
  await page.fill('#name', uniqueProduct);

  // 1. „+"-Button vorhanden
  const plusBtn = await page.$('.create-new-picker-button[data-target-select="product_group_id"]');
  ok &= check('„+"-Button neben dem Produktgruppen-Feld vorhanden', !!plusBtn);

  const before = await page.$$eval('#product_group_id option', els => els.length);

  // 2. Klick -> gestapelter Dialog
  await plusBtn.click();
  await page.waitForTimeout(1200);
  await page.screenshot({ path: SHOT + '/cn2-dialog-open.png' });
  const dlgFrame = page.frames().find(f => f.url().includes('/productgroup/new'));
  ok &= check('Anlege-Dialog öffnet sich gestapelt (iframe /productgroup/new)', !!dlgFrame);
  const productFormStillLoaded = await page.$('#product_group_id') !== null;
  ok &= check('Produktformular bleibt im Hintergrund geladen', productFormStillLoaded);
  if (!dlgFrame) { console.log('\n=== RESULT: FAIL (kein Dialog) ==='); await browser.close(); process.exit(1); }

  // Neue Gruppe anlegen
  const newGroup = 'ProofGroup_' + Date.now();
  await dlgFrame.fill('#name', newGroup);
  await page.screenshot({ path: SHOT + '/cn2b-dialog-filled.png' });
  await dlgFrame.click('#save-product-group-button');
  await page.waitForTimeout(1800);
  await page.screenshot({ path: SHOT + '/cn3-after-save.png' });

  // 5. Dialog geschlossen
  const dialogGone = page.frames().find(f => f.url().includes('/productgroup/new')) === undefined;
  ok &= check('Dialog nach dem Speichern geschlossen', dialogGone);

  // 4. Kein Reload: Produktname erhalten
  const nameStillThere = await page.inputValue('#name');
  ok &= check('Kein Reload – Produktname erhalten (' + (nameStillThere === uniqueProduct) + ')', nameStillThere === uniqueProduct);

  // 3. Neue Gruppe eingetragen + ausgewählt
  const after = await page.$$eval('#product_group_id option', els => els.map(e => ({ v: e.value, t: e.textContent })));
  const added = after.find(o => o.t === newGroup);
  ok &= check('Neue Gruppe als Option eingetragen (Anzahl ' + before + ' -> ' + after.length + ')', !!added);
  const selectedVal = await page.$eval('#product_group_id', el => el.value);
  ok &= check('Neue Gruppe ist ausgewählt', !!added && selectedVal === added.v);

  console.log('\n=== RESULT: ' + (ok ? 'PASS' : 'FAIL') + ' ===');
  await browser.close();
  process.exit(ok ? 0 : 1);
})();
