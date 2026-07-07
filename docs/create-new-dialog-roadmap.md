# Roadmap: „Neu erstellen" direkt aus jedem Auswahlfeld (Dialog über Dialog)

Branch: `create-new-dialog` (abgeleitet aus `test-deploy-01-branch`).

## 1. Ziel / UX

Überall, wo man in Grocy eine verknüpfte Entität **auswählt** (Produktgruppe, Standort,
Mengeneinheit, Geschäft, übergeordnetes Produkt, …), soll man im Auswahlfeld zusätzlich
**„＋ Neu erstellen …"** wählen können. Dann:

1. Öffnet sich der **Anlege-Dialog dieser Entität als Modal ÜBER dem aktuellen Formular/
   Dialog** (gestapelt, ohne das aktuelle Formular zu verlassen/neu zu laden).
2. Nach dem Speichern wird das **neu erstellte Objekt automatisch in das Auswahlfeld
   eingetragen und ausgewählt** – das darunterliegende Formular bleibt unverändert erhalten.

Das spart den heutigen Umweg „Formular verlassen → Stammdaten öffnen → anlegen → zurück →
alles neu ausfüllen".

## 2. Bestehende Grocy-Mechanik (Grundlage, wiederverwendbar)

- **Dialog über Dialog:** `IframeModal(link, type)` (`public/js/grocy.js`) öffnet ein
  `bootbox`-Modal mit einem `<iframe src="link">`. Modale **stapeln** sich. Ausgelöst über
  `.show-as-dialog-link` oder direkt per `postMessage(WindowMessageBag("IframeModal", …))`
  an `Grocy.GetTopmostWindow()`. Alle Modale leben im **obersten** Grocy-Fenster.
- **Nachrichten:** `WindowMessageBag(message, payload)` + `window.on("message")`-Handler in
  `grocy.js` kennt u. a. `IframeModal`, `CloseLastModal`, `Reload`, `ShowSuccessMessage`,
  **`BroadcastMessage`** (verteilt eine Nachricht an ALLE Fenster/iframes – Schlüssel für
  unser fenster-übergreifendes Routing).
- **Anlege-Formulare (embedded):** z. B. `locationform.js`, `productgroupform.js`,
  `quantityunitform.js`, `shoppinglocationform.js`. Bei `create` speichern sie via
  `Grocy.Api.Post('objects/<entity>', …)`, erhalten `result.created_object_id`, und posten
  dann **`WindowMessageBag("Reload")`** an das Elternfenster (→ komplettes Neuladen) bzw.
  navigieren zur Liste. Route-Muster: `GET /<entity>/new?embedded`.
- **Auswahlfelder:** teils reine `<select>`, teils mit **bootstrap-combobox** umhüllt
  (`.combobox`, `data('combobox').refresh()` nach Options-Änderung nötig). Produkt-Auswahl
  über die aufwändige Komponente `views/components/productpicker.blade.php`.

## 3. Kernproblem

Der heutige Save→**`Reload`** lädt das **ganze Elternformular neu** – der bereits
eingegebene Zustand geht verloren. Es fehlt:

1. eine Nachricht **„Objekt der Entität X wurde mit id=Y, name=Z angelegt"** (statt „Reload"),
2. ein **Routing**, das diese Nachricht an genau das Auswahlfeld liefert, das den Dialog
   geöffnet hat – auch über iframe-Grenzen hinweg (das Formular mit dem Select kann selbst
   schon in einem Modal-iframe liegen).

## 4. Lösungsarchitektur

### 4.1 Wiederverwendbarer Picker (Blade-Komponente + JS)
- Neue Komponente `views/components/entitypicker.blade.php` (Name TBD), die ein `<select>`
  (optional combobox) rendert **plus** eine „＋ Neu erstellen"-Option **oder** einen kleinen
  „+"-Button rechts daneben (Entscheidung siehe unten). Parameter: `entity`
  (`product_groups`/`locations`/…), `newFormUrl` (`/productgroup/new` …), `id`, `name`,
  `label`, `value`, `options`.
- Jede Instanz bekommt eine **eindeutige `data-picker-id`** (GUID), damit die Rückmeldung
  eindeutig zugeordnet werden kann.
- Ein zentrales `public/js/grocy_createnewpicker.js`:
  - Klick auf „＋ Neu erstellen" → öffnet `IframeModal("/<entity>/new?embedded&createnewfor=<pickerId>")`
    über dem aktuellen Dialog.
  - Registriert die `pickerId` samt Select-Referenz.

### 4.2 „Return to opener"-Modus der Anlege-Formulare
- Erkennt eine Anlege-Form beim Save den Parameter `createnewfor`, postet sie **statt
  `Reload`** eine neue Nachricht:
  `BroadcastMessage → WindowMessageBag("MasterObjectCreated", {target: pickerId, entity, id, name})`
  und danach `CloseLastModal`.
- Zentraler Helfer `Grocy.PostCreatedObject(entity, id, name)` in `grocy.js`, den alle
  Anlege-Formulare im create-Zweig aufrufen (kleiner, einheitlicher Patch je Form).

### 4.3 Parent-seitiges Eintragen (ohne Reload)
- `grocy.js`-Message-Handler bekommt einen Zweig **`MasterObjectCreated`**: sucht im eigenen
  Dokument das `<select data-picker-id=target>`, fügt `<option value=id>name</option>` ein,
  wählt sie aus, ruft ggf. `combobox.refresh()` und feuert `change`. Läuft in **jedem**
  Fenster (per BroadcastMessage verteilt); nur das Fenster mit passendem Select reagiert.

→ Damit bleibt das Elternformular vollständig erhalten, das neue Objekt ist sofort gewählt.

## 5. Betroffene Auswahlfelder / Formulare (Inventar)

| Entität | Anlege-Route | Vorkommt u. a. in |
|---|---|---|
| `product_groups` | `/productgroup/new` | Produktformular; ggf. Filter |
| `locations` | `/location/new` | Produktformular, Einkauf, Inventur, Umlagerung, Bestandseintrag |
| `quantity_units` | `/quantityunit/new` | Produktformular (qu_id_stock/purchase/consume/price), Einheiten-Umrechnung |
| `shopping_locations` | `/shoppinglocation/new` | Produktformular (Standard-Geschäft), Einkauf, Beleg-Import (Sammeleinkauf) |
| `products` | `/product/new` | Einkauf/Verbrauch/Inventur/Umlagerung, Einkaufsliste, Rezepte (productpicker) |
| `locations` (parent) | `/location/new` | Standortformular (übergeordneter Standort) |
| (optional) `task_categories`, `chores`, `userentities`, `equipment_groups` | jeweils | Aufgaben/Chores/Equipment |

## 6. Phasenplan

- **Phase A – Mechanik:** `grocy_createnewpicker.js` + `MasterObjectCreated`-Handler in
  `grocy.js` + `Grocy.PostCreatedObject`-Helfer. Noch ohne UI-Rollout.
- **Phase B – Proof an EINER Entität:** „＋ Neu" für **Produktgruppe** im Produktformular
  end-to-end (öffnen, anlegen, eintragen, auswählen, ohne Reload). Als Referenz.
- **Phase C – Anlege-Formulare umrüsten:** `locationform`, `productgroupform`,
  `quantityunitform`, `shoppinglocationform` auf `PostCreatedObject` im `createnewfor`-Modus
  (bestehendes Reload-Verhalten bleibt, wenn der Parameter fehlt → abwärtskompatibel).
- **Phase D – Rollout in die Auswahlfelder:** Produktformular (Gruppe/Standort/Einheiten/
  Geschäft), dann Einkauf/Verbrauch/Inventur/Umlagerung/Bestandseintrag, Einkaufsliste.
- **Phase E – Sonderfälle:** `productpicker` (Produkt neu anlegen aus dem Picker – größer,
  eigenes Formular) und combobox-umhüllte Selects (refresh-Handling).
- **Phase F – Feinschliff:** Übersetzungen, Fokus/Escape in gestapelten Modals, Nachtmodus,
  Tests (Playwright: öffnen → anlegen → ausgewählt, ohne Reload; gestapelt in einem bereits
  embedded Formular).

## 7. Risiken / offene Punkte

- **Fenster/iframe-Routing:** über `BroadcastMessage` + eindeutige `pickerId` gelöst; testen,
  wenn der Picker selbst in einem Modal-iframe liegt (Dialog über Dialog über Dialog).
- **bootstrap-combobox:** nach Options-Insert `refresh()` nötig; Auswahl korrekt setzen.
- **Abwärtskompatibilität:** Anlege-Formulare dürfen ohne `createnewfor` **exakt wie bisher**
  funktionieren (Reload/Redirect). Nur additiver Zweig.
- **Userfields/Validierung:** Anlegen muss weiter durch `UserfieldsForm.Save` + Validierung
  laufen, bevor die id zurückgemeldet wird.
- **Produkt anlegen** ist der komplexeste Fall (großes Formular) – zuletzt und separat.

## 8. Entscheidungen (getroffen 2026-07-07)

1. **UI-Variante:** **„+"-Button rechts** neben dem Feld (`.create-new-picker-button`,
   `input-group-append`). Robuster mit combobox.
2. **Umfang zuerst:** **Kern-Stammdaten** (Produktgruppe, Standort, Mengeneinheit, Geschäft);
   Produkt (productpicker) später.
3. **Startpunkt:** **Produktformular** (Proof: Produktgruppe).

## 9. Fortschritt

- **✅ Phase A – Mechanik (2026-07-07):** `grocy.js` – Helfer `Grocy.PostCreatedObject(entity,
  id, name)` (postet `MasterObjectCreated` via `BroadcastMessage` + `CloseLastModal`, wenn
  `?createnewfor=<selectId>` gesetzt), `.create-new-picker-button`-Klickhandler (öffnet
  `/<entity>/new?embedded&createnewfor=<selectId>` als Dialog), Message-Zweig
  `MasterObjectCreated` (trägt Option ein, wählt aus, `combobox.refresh()`, ohne Reload).
- **✅ Phase B – Proof (2026-07-07):** „+"-Button am **Produktgruppen**-Select im
  Produktformular; `productgroupform.js` meldet beim Anlegen id/Name zurück.
  **Playwright-Test bestanden (2026-07-07):** Produktformular öffnen → „+" an Produktgruppe →
  Anlege-Dialog stapelt sich über dem Formular → Namen eingeben → speichern → Dialog schließt,
  neue Gruppe ist im `<select>` eingetragen **und ausgewählt**, der Produktname im
  darunterliegenden Formular bleibt erhalten (**kein Reload**). Screenshots in `scratchpad/`.
- **✅ Phase C – Anlege-Formulare umgerüstet (2026-07-07):** `locationform.js`,
  `quantityunitform.js`, `shoppinglocationform.js` rufen im create-Zweig
  `Grocy.PostCreatedObject(entity, id, name)` auf und short-circuiten (return), sonst
  bisheriges Reload/Redirect (abwärtskompatibel ohne `createnewfor`).
- **✅ Phase D (Produktformular) – „+"-Buttons ergänzt (2026-07-07):**
  - **Standort:** `location_id` + `default_consume_location_id` (beide `data-createnew-entity="locations"`).
  - **Mengeneinheit:** alle vier Felder (`qu_id_stock/purchase/consume/price`,
    `data-createnew-entity="quantity_units"`) → neue Einheit erscheint in **allen vier** Selects.
  - **Geschäft:** `shopping_location_id` über die geteilte Komponente
    `components/shoppinglocationpicker.blade.php` (neuer optionaler Parameter `createNew`,
    default aus → alle anderen Verwendungen unverändert; combobox-Pfad).
  - **Mechanik-Erweiterung** in `grocy.js`: `MasterObjectCreated` trägt die neue Option in
    **alle** Selects mit passendem `data-createnew-entity` ein (nur im auslösenden Feld
    ausgewählt) – nötig, weil mehrere Felder dieselben Stammdaten listen.
  - **Playwright bestanden (`scratchpad/test-createnew-more.js`):** je Feld „+" → Dialog
    gestapelt → anlegen → Option eingetragen + ausgewählt, kein Reload; für Mengeneinheit
    zusätzlich in allen vier Feldern verfügbar; für Geschäft combobox-Textfeld aktualisiert.
    Siehe `docs/qa/create-new-dialog.md`.
- **✅ Phase E – Rollout Geschäft/Standort (2026-07-07):** `components/locationpicker.blade.php`
  um denselben optionalen `createNew`-Parameter erweitert (default aus). „+" aktiviert für
  **Geschäft und Standort** in **Einkauf** (`/purchase`), **Inventur** (`/inventory`) und
  **Bestandseintrag** (`stockentryform`). Beides sind bootstrap-comboboxen → über den
  bestehenden `MasterObjectCreated`-Pfad (`combobox.refresh()`) abgedeckt, keine JS-Änderung
  nötig. **Playwright bestanden** (`scratchpad/test-createnew-forms.js`): Geschäft + Standort
  in Einkauf und Inventur – Dialog gestapelt, Option eingetragen + ausgewählt, combobox-Text
  aktualisiert, URL unverändert (kein Reload/Navigieren), anderes Feld unberührt.
- **✅ Phase E – Sonderfall `productpicker` (entschieden 2026-07-07):** **Kein zusätzlicher
  „+"-Button.** Entscheidung des Nutzers: der Produkt-Picker behält grocys eingebauten
  „Name tippen → TAB/ENTER"-Workflow als einzigen Weg, ein neues Produkt anzulegen. Damit
  gilt „Neu erstellen aus Auswahlfeld" für die **Stammdaten-Felder** (Produktgruppe, Standort,
  Mengeneinheit, Geschäft) als abgeschlossen.
- **⏳ Optional/später:** dieselben „+"-Buttons für Geschäft/Standort auch in
  Verbrauch/Umlagerung/Einkaufsliste, falls gewünscht (Mechanik steht, nur Includes aktivieren).
