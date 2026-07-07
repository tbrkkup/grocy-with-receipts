# QA: „Neu erstellen" direkt aus einem Auswahlfeld (create-new-dialog)

Testprotokoll für den Proof (Phase B): „+"-Button am **Produktgruppen**-Select im
Produktformular. Zugehöriger Testtreiber: [`scratchpad/test-createnew.js`](../../scratchpad/test-createnew.js).

## Testaufbau

- **Ziel-Grocy:** lokaler Devserver im **Demo-Modus** (keine Authentifizierung),
  `php -S 127.0.0.1:8199 -t public devrouter.php`.
- **Vorbereitung (nur lokal, nicht committen):**
  - PHP-Gate in `helpers/PrerequisiteChecker.php` von `8.5.0` → `8.4.0` gesenkt
    (lokal steht PHP 8.4), nach dem Test zurückgesetzt.
  - `data/viewcache/*` geleert (Route-/View-Cache) und Routen per `curl` vorgewärmt.
  - `devrouter.php` als Static-File-Fallback + Fallthrough auf `public/index.php`.
- **Browser:** Chromium (Playwright), headless, `--no-sandbox`.
- **Ausführen:** `node scratchpad/test-createnew.js`

## Testschritte

1. `/product/new` öffnen, Produktname `ProofProduct_<ts>` eintragen (Zustands-Marker).
2. Prüfen, dass der **„+"-Button** neben dem Produktgruppen-Feld existiert
   (`.create-new-picker-button[data-target-select="product_group_id"]`).
3. „+" klicken → der **Produktgruppen-Anlege-Dialog** öffnet sich als **gestapeltes
   Modal-iframe** (`/productgroup/new?embedded&createnewfor=product_group_id`) über dem
   weiterhin geladenen Produktformular.
4. Im Dialog Gruppenname `ProofGroup_<ts>` eintragen und **Speichern**.
5. Prüfen: Dialog geschlossen, **kein Reload** (Produktname noch da), neue Gruppe als
   Option im `<select>` **eingetragen und ausgewählt**.

## Ergebnis — 2026-07-07: **PASS** (7/7)

```
PASS „+"-Button neben dem Produktgruppen-Feld vorhanden
PASS Anlege-Dialog öffnet sich gestapelt (iframe /productgroup/new)
PASS Produktformular bleibt im Hintergrund geladen
PASS Dialog nach dem Speichern geschlossen
PASS Kein Reload – Produktname erhalten (true)
PASS Neue Gruppe als Option eingetragen (Anzahl 9 -> 10)
PASS Neue Gruppe ist ausgewählt
=== RESULT: PASS ===
```

Screenshots (im Session-Scratchpad erzeugt, nicht im Repo): `cn2-dialog-open.png`
(gestapelter Dialog über dem Formular), `cn2b-dialog-filled.png`, `cn3-after-save.png`
(Dialog zu, neue Gruppe ausgewählt).

## Phase C/D — weitere Felder im Produktformular

Testtreiber: [`scratchpad/test-createnew-more.js`](../../scratchpad/test-createnew-more.js).
Gleicher Aufbau wie oben (Devserver 8199, Demo). Je Feld: `/product/new`, Produktname als
Marker, „+" klicken, im gestapelten Dialog anlegen, prüfen: Option eingetragen + ausgewählt,
kein Reload. Zusatzchecks je Entität (siehe unten).

### Ergebnis — 2026-07-07: **PASS**

```
### Standort (Default location) (#location_id)          PASS (+ Dialog, kein Reload, Option gewählt)
### Verbrauchsstandort (#default_consume_location_id)    PASS
### Mengeneinheit Bestand (#qu_id_stock)                 PASS
    + neue Einheit auch in #qu_id_purchase / _consume / _price verfügbar
### Geschäft (Default store) (#shopping_location_id)     PASS
    + combobox-Textfeld zeigt den neuen Namen
=== RESULT: PASS ===
```

- **Standort/Verbrauchsstandort:** einfache `<select>`; neue Location erscheint in beiden
  (gemeinsame `data-createnew-entity="locations"`).
- **Mengeneinheit:** vier Felder teilen dieselbe Liste – die neue Einheit wird in **alle
  vier** eingetragen (Test bestätigt), ausgewählt nur im auslösenden Feld; die bestehende
  qu-Preset-Logik (`qu_id_stock`-change) bleibt unbeeinträchtigt.
- **Geschäft:** bootstrap-**combobox** (`.shopping-location-combobox`); nach dem Anlegen
  aktualisiert `data('combobox').refresh()` das sichtbare Textfeld
  (`#shopping_location_id_text_input`) korrekt auf den neuen Namen.

Nebenbefund (nicht durch diese Änderung verursacht): auf `/product/new` loggt das
bestehende `productform.js` einen `toString`-Fehler auf `Grocy.UserSettings.product_presets_*`,
weil diese Presets im Demo-Datensatz nicht gesetzt sind. Ohne Auswirkung auf das Feature.

## Abgedeckt / noch offen

- **Abgedeckt:** Öffnen des gestapelten Dialogs, Anlegen, Rückmeldung ins/in die Ziel-`<select>`(s),
  Auswahl der neuen Option, kein Reload (Formularzustand erhalten), Dialog schließt – für
  **einfache Selects** (Produktgruppe, Standort), **Mehrfach-Selects derselben Entität**
  (Mengeneinheiten) und **combobox** (Geschäft).
- **Noch offen (Phase E / weiterer Rollout):** dieselben „+"-Buttons in weiteren Formularen
  (Einkauf, Verbrauch, Inventur, Umlagerung, Bestandseintrag, Einkaufsliste), Sonderfall
  `productpicker` (Produkt neu anlegen), Dialog-über-Dialog-über-Dialog (Picker liegt selbst
  bereits in einem Modal-iframe).
