# CLAUDE.md – Projektkontext für grocy-with-receipts

Diese Datei dokumentiert alle Designentscheidungen, den aktuellen Implementierungsstand und offene Aufgaben für das `grocy-with-receipts`-Projekt. Sie ist dafür gedacht, in einer neuen Claude-Session den vollständigen Kontext wiederherzustellen.

---

## Projektübersicht

`grocy-with-receipts` ist ein Fork der [grocy](https://grocy.info)-Hauptcodebase (1:1-Fork, kein eigener Code beim Start). Das Ziel ist, grocy um eine **Rechnungs-Funktion** zu erweitern: Einkäufe sollen mit einem Rechnungsobjekt (PDF, JPG etc.) verknüpft werden können – sowohl über die Grocy-REST-API als auch über das Web-UI.

**Entwicklungsbranch:** `claude/friendly-planck-kj8nev`
**Remote:** `tbrkkup/grocy-with-receipts`

---

## Alle Repositories im Ökosystem

Es gibt vier Forks, die alle die receipts-Funktion erhalten sollen. Jeder Client hat sein eigenes natives UI – Web-UI-Änderungen übertragen sich **nicht automatisch**, sondern müssen pro Repo separat implementiert werden. API-Änderungen (serverseitig) gelten für alle Clients gleichzeitig.

| Repo | Technologie | Priorität |
|------|-------------|-----------|
| `tbrkkup/grocy-with-receipts` | PHP, Blade, SQLite (Web-App + REST-API) | **Fokus aktuell** |
| `tbrkkup/grocy-with-receipts-android` | Java, MVVM, native Android-UI | **Fokus aktuell** |
| `tbrkkup/Grocy-with-receipts-SwiftUI-iOS` | Swift, SwiftUI, native iOS-UI | später |
| `tbrkkup/grocy-with-receipts-win-desktop` | Electron (vermutlich) | später |

### Web-App (`grocy-with-receipts`)
- Enthält sowohl die REST-API als auch das Web-UI
- Alle API-Änderungen hier betreffen alle Clients

### Android-App (`grocy-with-receipts-android`)
- Vollständig native Android-App (kein WebView), spricht direkt mit der Grocy-REST-API
- Java, MVVM-Architektur: Fragments → ViewModels → Repositories → Room-Cache
- `GrocyApi.java` konstruiert alle API-URLs; `PurchaseViewModel.purchaseProduct()` baut den JSON-Body
- **Was fehlt:** `receipt_id` ist dem Android-Einkauf-Flow noch nicht bekannt
- Noch keine eigenen Änderungen gegenüber dem Upstream-Fork

### iOS-App (`Grocy-with-receipts-SwiftUI-iOS`)
- SwiftUI-basiert, native iOS-UI
- Noch keine eigenen Änderungen, Implementierung für später geplant

### Desktop (`grocy-with-receipts-win-desktop`)
- Wahrscheinlich Electron-basiert
- Noch keine eigenen Änderungen, Implementierung für später geplant

### Externes Import-Tool
- Datei: `grocyimportv15.html` (standalone HTML-Seite, kein Teil des Repos)
- Funktion: PDF-Kassenbon hochladen → Claude-API extrahiert Produkte, Datum, Geschäft → Import in Grocy via `/api/stock/products/{id}/add`
- Jedes Produkt bekommt eine eigene `transaction_id` (Grocy-Standard)
- Das Tool soll langfristig in Grocy integriert werden, aber **nicht im aktuellen Scope**
- Das Tool arbeitet auch jetzt schon problemlos, da `receipt_id` optional ist

---

## Grocy-Architektur (Kurzreferenz)

- **Sprache:** PHP, SQLite, Blade-Templates (Laravel-Syntax)
- **ORM:** LessQL (`$this->DB->table()->where()->fetch()`)
- **Migrations:** Nummerierte SQL-Dateien in `/migrations/` (z.B. `0256.sql`); `DatabaseMigrationService` führt neue automatisch aus
- **API-Doppelarchitektur:**
  - `/api/objects/{entity}` = generisches CRUD ohne Business-Logik (direkte DB-Zugriffe)
  - `/api/stock/products/{id}/add` etc. = dedizierte Endpunkte mit Business-Logik (mehrere Tabellen, Webhooks, Validierung)
- **Entity-Whitelist:** Neue Entitäten müssen in `grocy.openapi.json` unter `ExposedEntity.enum` eingetragen werden, damit sie über `/api/objects/` erreichbar sind
- **Datei-Uploads:** `PUT /api/files/{group}/{fileName}` – `fileName` ist base64-encodiert; Dateien landen in `GROCY_DATAPATH/storage/{group}/`
- **Views:** Blade-Templates in `/views/`, view-spezifisches JS in `/public/viewjs/`

---

## Designentscheidungen (alle begründet)

### 1. Entitätsname: `receipts` (nicht `bills`, nicht `orders`)
- "Receipt" ist der konsistente englische Begriff im Grocy-Kontext (Kassenbon/Quittung)
- `bills` wäre mehrdeutig (Rechnung = invoice im B2B-Kontext)
- `orders` wurde diskutiert und verworfen (see unten)

### 2. Kein `order_id`-Konzept
- Der Nutzer fragte ob `order_id` (Gruppierung) und `receipt_id` (Dokument) sinnvoll getrennt wären
- Entscheidung dagegen: Ein Kassenbon IS bereits die Aufzeichnung eines Einkaufsvorgangs. Zwei parallele Konzepte wären unnötige Komplexität.
- Stattdessen: `receipt_id` in `stock_log` als Fremdschlüssel → eine Rechnung kann mehrere Purchases gruppieren; jede Purchase behält ihre eigene `transaction_id` (Grocy-Kompatibilität)

### 3. Geschäft: Fremdschlüssel auf `shopping_locations`
- Grocy hat bereits eine `shopping_locations`-Tabelle für Läden
- `receipts.shopping_location_id` verweist darauf → Konsistenz, kein freies Textfeld

### 4. Mehrere Dateien pro Rechnung: eigene Tabelle `receipt_files`
- Statt einem einzelnen `file_name`-Feld in `receipts` gibt es eine separate Tabelle
- Ermöglicht mehrere Fotos/Seiten pro Rechnung (z.B. langer Kassenbon = 3 Fotos)
- Dateinamen werden in `receipt_files.file_name` gespeichert, Dateien physisch unter `/api/files/receipts/`

### 5. Status-Feld mit Default `paid`
- Felder: `paid`, `open`, `refunded`
- Default ist `paid` (Normalfall beim Supermarkteinkauf)
- Kein Pflichtfeld-Workflow, rein dokumentarisch

### 6. Kein Gesamtbetrag-Feld
- Der Gesamtbetrag ist aus den Produktpreisen in `stock_log` errechenbar
- Explizit entschieden: nicht speichern, kein Redundanz-Problem

### 7. API: generisches CRUD für Receipts
- `receipts` und `receipt_files` laufen über `/api/objects/receipts` (kein eigener Controller)
- Kein dedizierter `/api/receipts/...`-Controller für einfaches CRUD
- Wenn später komplexe Aktionen nötig sind (z.B. "alle Purchases einer Rechnung rückgängig"), kann ein dedizierter Controller ergänzt werden

### 8. Abwärtskompatibilität
- `receipt_id` in `stock_log` ist `NULL`-bar → bestehende Einträge unberührt
- `StockService::AddProduct()` hat `$receiptId = null` als letzten optionalen Parameter
- Das externe Import-Tool und alle bestehenden API-Clients funktionieren ohne Änderung

### 9. Migrations = Upgrade-Pfad
- Grocy's `DatabaseMigrationService` führt neue Migrations automatisch beim Start aus
- Kein manuelles `UPGRADING.md` nötig – der Wechsel auf diesen Fork ist selbsterklärend

### 10. Commit-Qualität
- Diffs müssen menschenlesbar sein – keine Whitespace-Artefakte (Tabs vs. Spaces)
- `grocy.openapi.json` nutzt Tabs; bei direkter Python-`json.dump()`-Bearbeitung entsteht ein hässlicher Diff
- Lösung: immer chirurgische String-Ersetzungen, nie komplette Neuformatierung

---

## Datenbankschema (neu)

```sql
-- Migration 0256.sql
CREATE TABLE receipts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    shopping_location_id INTEGER,   -- FK auf shopping_locations (optional)
    date DATE,
    status TEXT NOT NULL DEFAULT 'paid',  -- 'paid', 'open', 'refunded'
    description TEXT,               -- optionale Notiz
    row_created_timestamp DATETIME DEFAULT (datetime('now'))
);

CREATE TABLE receipt_files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    receipt_id INTEGER NOT NULL,    -- FK auf receipts
    file_name TEXT NOT NULL,        -- Dateiname unter /api/files/receipts/
    row_created_timestamp DATETIME DEFAULT (datetime('now'))
);

-- Migration 0257.sql
ALTER TABLE stock_log
ADD receipt_id INTEGER;             -- optional, FK auf receipts
```

---

## Geänderter Code (Iteration 1)

### `migrations/0256.sql` ✅
Neue Tabellen `receipts` und `receipt_files`.

### `migrations/0257.sql` ✅
`receipt_id`-Spalte in `stock_log`.

### `grocy.openapi.json` ✅
`receipts` und `receipt_files` zu `ExposedEntity.enum` hinzugefügt → CRUD via `/api/objects/receipts` und `/api/objects/receipt_files` sofort verfügbar.

### `services/StockService.php` ✅
`AddProduct()`-Signatur um `$receiptId = null` erweitert (letzter Parameter).
`receipt_id` wird in beide `stock_log`-Inserts geschrieben (Label-per-unit-Zweig und Single-entry-Zweig).

### `controllers/Api/StockApiController.php` ✅
`AddProduct()` liest optionalen `receipt_id`-Parameter aus dem Request-Body und gibt ihn an `StockService::AddProduct()` weiter.
`AddProductByBarcode()` delegiert an `AddProduct()` → kein weiterer Änderungsbedarf.

---

## Noch nicht implementiert (nächste Iterationen)

### Iteration 2: Web-UI – Rechnungsliste
- Neue Route `GET /receipts` → `ReceiptsController::Overview()`
- Neue View `/views/receipts.blade.php` (DataTable mit allen Rechnungen)
- Menüeintrag in der Navigation

### Iteration 3: Web-UI – Rechnungsformular
- Route `GET /receipt/{receiptId}` → `ReceiptsController::EditForm()`
- View `/views/receiptform.blade.php`
- Felder: Geschäft (Dropdown auf `shopping_locations`), Datum, Status, Beschreibung
- Datei-Upload-Widget (mehrere Dateien, Upload via `/api/files/receipts/`)
- Anzeige verknüpfter Purchases (aus `stock_log WHERE receipt_id = ?`)

### Iteration 4: Purchase-Formular erweitern
- `/views/purchase.blade.php` bekommt ein optionales `receipt_id`-Dropdown
- `/public/viewjs/purchase.js` schickt `receipt_id` mit dem POST-Body
- Soll abwärtskompatibel bleiben (kein Pflichtfeld)

### Iteration 5: Android-App (`grocy-with-receipts-android`)
- `GrocyApi.java`: Endpunkte für `receipts` und `receipt_files` hinzufügen
- `PurchaseViewModel.java`: `receipt_id` in JSON-Body aufnehmen
- Ggf. neuer Screen für Rechnungsverwaltung (Fragment + ViewModel)
- **Voraussetzung:** Session muss auf `tbrkkup/grocy-with-receipts-android` Zugriff haben

### Iteration 6+: iOS und Desktop (niedrige Priorität)
- `Grocy-with-receipts-SwiftUI-iOS`: SwiftUI-Views für Rechnungsverwaltung, API-Calls ergänzen
- `grocy-with-receipts-win-desktop`: je nach Technologie (Electron = Web-ähnlich, evtl. einfacher)
- Beide erst angehen wenn Web-App und Android fertig sind

---

## Nutzer-Präferenzen

- Iterativer Prozess bevorzugt: lieber Rückfragen als blindes Implementieren
- Keine verschwendeten Ressourcen auf Features die nicht gefallen
- Commits müssen sauber und menschenlesbar sein (keine Whitespace-Artefakte in Diffs)
- Abwärtskompatibilität hat hohe Priorität

---

## Externes Import-Widget – Detaildokumentation (`public/grocy-import.html`)

Ergänzende Dokumentation des standalone HTML-Widgets zum PDF-Rechnungsimport (siehe Abschnitt „Externes Import-Tool" oben). Das Widget liegt als `public/grocy-import.html` im Repo, wird aber eigenständig deployed und ist noch nicht in Grocy integriert.

### Technische Infrastruktur

**Server**
- **Grocy-Instanz:** https://grocy.offges.de
- **Grocy-Version:** 4.6.0
- **Installation:** Nativ auf Debian/Ubuntu mit nginx + PHP-FPM
- **Webroot:** `/var/www/grocy/public/`
- **Widget-URL:** `https://grocy.offges.de/grocy-import.html`
- **Deploy-Befehl:** `sudo cp grocy-import-vX.html /var/www/grocy/public/grocy-import.html`

**nginx-Konfiguration**
- **Config:** `/etc/nginx/sites-enabled/grocy.offges.de`
- **CORS:** Aktiviert in `/var/www/grocy/data/config.php` via `Setting('CORS_ALLOW_ORIGIN', '*');`
- **Claude-Proxy:** nginx leitet `/claude-proxy` an `api.anthropic.com/v1/messages` weiter:

```nginx
location /claude-proxy {
    proxy_pass https://api.anthropic.com/v1/messages;
    proxy_ssl_server_name on;
    proxy_set_header Host api.anthropic.com;
    proxy_set_header Content-Type application/json;
    proxy_set_header x-api-key $http_x_api_key;
    proxy_set_header anthropic-version $http_anthropic_version;
    proxy_set_header anthropic-dangerous-direct-browser-access $http_anthropic_dangerous_direct_browser_access;
    proxy_pass_request_headers on;
}
```

**Warum der Proxy?** Anthropic blockiert direkte Browser-Requests (`CORS preflight 400`). Der nginx-Proxy leitet den Request server-seitig weiter – Browser → grocy.offges.de/claude-proxy → api.anthropic.com.

### Widget-Architektur

**Technologie**
- Reines HTML/JS (keine Frameworks, kein Build-Step)
- **PDF-Parsing:** pdf.js via CDN (`cdnjs.cloudflare.com`)
- **KI-Analyse:** Claude Sonnet 4.6 via Anthropic API (über nginx-Proxy)
- **Datenpersistenz:** `localStorage` für Grocy-URL, API-Keys

**Ablauf**
1. **Config:** Anthropic API-Key, Grocy-URL, Grocy API-Key eingeben → Verbindungstest
2. **Upload:** PDF per Drag & Drop oder Dateidialog
3. **Analyse (2 Claude-Calls):**
   - Call 1: Alle Produktdaten + Datum + Geschäft aus PDF extrahieren
   - Call 2: Produkte semantisch mit Grocy-Stammdaten abgleichen
4. **Review:** Produkte prüfen, Mengen/Einheiten editieren, Datum/Geschäft bestätigen
5. **Import:** Neue Produkte anlegen (mit Dialog) → Lagerbuchung in Grocy

**Globale JS-Funktionen (wichtig für Scope)** – müssen global sein, nicht in Event-Listenern:
- `toBaseUnit(quantity, unit)` – Einheitenkonvertierung
- `renderDone(results)` – Ergebnisseite rendern
- `checkDuplicates(productIds, purchaseDate, shopId)` – Duplikaterkennung
- `undoPurchaseForProduct(productId, purchaseDate, shopId)` – (derzeit deaktiviert)
- `doImport(toImport, purchaseDate, doUpdate, dupIds)` – Import-Logik
- `createNewProduct(suggestedName)` – Neuanlegen-Dialog + API-Call
- `promptNewProduct(suggestedName)` – Modal mit Name/Gruppe/Standort
- `showModal(cfg)` – generisches Modal-System
- `showChangelog()` – Changelog-Modal

### Grocy API – bekannte Endpunkte (v4.6.0)

**Funktionierend**

| Endpunkt | Methode | Verwendung |
|---|---|---|
| `/api/system/info` | GET | Verbindungstest, Version |
| `/api/objects/products` | GET / POST | Produkte laden / anlegen |
| `/api/objects/shopping_locations` | GET / POST | Geschäfte laden / anlegen |
| `/api/objects/product_groups` | GET / POST | Gruppen laden / anlegen |
| `/api/objects/locations` | GET | Standorte laden |
| `/api/objects/quantity_units` | GET | Mengeneinheiten laden (für kg-ID) |
| `/api/objects/stock_log` | GET | Lagerjournal für Duplikaterkennung |
| `/api/stock/products/{id}/add` | POST | Lagerzugang buchen |

**Nicht funktionierend in v4.6.0**

| Endpunkt | Problem |
|---|---|
| `/api/stock/log` | 405 – existiert nicht |
| `/api/stock/products/{id}/undo/{tx_id}` | 405 – existiert nicht |
| `/api/objects/stock_log/{id}` DELETE | 400 – nicht erlaubt |
| `/api/objects/stock_log/{id}` PUT | 400 – "Entity not exposed" |
| `/api/system/api-details` | 405 – existiert nicht |

**Stock-Log Eintrag (Struktur)**
```json
{
  "id": 53,
  "product_id": 25,
  "amount": 1.0,
  "purchased_date": "2026-06-15",
  "transaction_type": "purchase",
  "transaction_id": "6a4156d1d029f",
  "shopping_location_id": null,
  "undone": 0,
  "row_created_timestamp": "2026-06-15 18:07:16"
}
```
**Wichtig:** Für Duplikaterkennung `purchased_date` verwenden, nicht `row_created_timestamp`.

**Produkt anlegen (funktionierender Body)**
```json
{
  "name": "Produktname",
  "description": "",
  "location_id": 5,
  "qu_id_stock": 3,
  "qu_id_purchase": 3
}
```
**Wichtig:** `qu_factor_purchase_to_stock` **nicht** mitsenden – Spalte existiert in v4.6.0 nicht → SQL-Fehler 400.

**Lagerzugang buchen**
```json
{
  "amount": 1.0,
  "price": 34.99,
  "best_before_date": "2999-12-31",
  "purchased_date": "2026-01-13",
  "shopping_location_id": 2
}
```

### Einheitenkonvertierung

Claude gibt Mengen in g/ml zurück, Grocy speichert in kg/l:

```javascript
function toBaseUnit(quantity, unit) {
  if (unit === 'g')  return { amount: quantity / 1000, unit: 'kg' };
  if (unit === 'ml') return { amount: quantity / 1000, unit: 'l' };
  return { amount: quantity, unit: unit };
}
```

**Preisberechnung (v15 – korrekt)**
```javascript
// Gesamtpreis / konvertierte Menge = Preis pro kg
var priceTotal = item.price_total || (item.price_per_unit * item.quantity);
var convPpu = (priceTotal && convAmount) ? priceTotal / convAmount : 0;
```
**Nicht** `ppu / 1000` – das wäre falsch. Beispiel:
- 1000g Heidelbeeren, 52,99€ → convAmount=1.0kg → convPpu=52.99 €/kg ✓
- 500g Hanfsamen, 14,99€ → convAmount=0.5kg → convPpu=29.98 €/kg ✓

### Duplikaterkennung

Vor dem Import wird `/api/objects/stock_log?limit=500` abgefragt. Einträge werden verglichen nach:
- `transaction_type === 'purchase'`
- `undone == 0`
- `purchased_date` (YYYY-MM-DD) entspricht dem Rechnungsdatum
- `shopping_location_id` (nur wenn beide Seiten einen Wert haben)

**Undo-Funktion:** Derzeit deaktiviert – kein kompatibler Endpunkt in Grocy 4.6.0. Im Dialog erscheint ein Hinweis; der Nutzer kann Duplikate manuell im Grocy-Lagerjournal löschen.

### Claude-Prompt Strategie

**Analyse-Prompt (Call 1)** – gibt JSON zurück mit:
```json
{
  "shop_detected_name": "Naturkost Schulz",
  "shop_matched_id": 3,
  "date_iso": "2025-12-08",
  "products": [
    {"name": "Heidelbeeren getrocknet bio", "quantity": 1000, "unit": "g", "price_total": 52.99, "price_per_unit": 52.99}
  ]
}
```
Wichtige Prompt-Hinweise:
- Gesperrte Schreibweise: `"B O D E N A T U R K O S T"` = `"Bodenaturkost"`
- Datum: `DD.MM.YY` und `DD.MM.YYYY`, zweistellig 00-30 = 2000-2030
- Mengen: Gewichts-/Volumenangaben **immer** als quantity+unit, nie als `1 Stueck`
- Komma als Dezimaltrennzeichen: `"2,5"` = 2.5

**Matching-Prompt (Call 2):** Semantischer Abgleich: `"Reis rot bio"` → `"Roter Reis"`, mehrzeilige Beschreibungen zusammenfassen.

**Geschäfts-Fallback (clientseitig)** – falls Claude `shop_matched_id` nicht setzt:
```javascript
function normalizeShopName(name) {
  // Gesperrte Schreibweise zusammenführen: "B O D E" → "BODE"
  var c = name.replace(/([A-Za-zÄÖÜäöüß])\s(?=[A-Za-zÄÖÜäöüß])/g, '$1');
  // Firmenzusätze entfernen
  c = c.replace(/\b(GmbH|KG|AG|e\.K\.|eG|OHG|UG|Co\.?|&)\b/gi, '');
  return c.replace(/\s+/g, ' ').trim().toLowerCase();
}
```
Wortweise Übereinstimmung mit Score > 0.5 → Match.

### Neuanlegen-Dialog

Beim Anlegen neuer Produkte öffnet sich ein Modal mit:
- **Produktname** (editierbar, vorausgefüllt)
- **Produktgruppe** (Dropdown + „Neue Gruppe anlegen…")
- **Standort** (Dropdown, Standard: „Keller" falls vorhanden, sonst erster Eintrag)

Standard-Einheit für neue Produkte: **kg** (kg-ID wird beim Connect über `/objects/quantity_units` geladen).

### Bekannte Einschränkungen / TODO (Widget)

- **Undo/Aktualisieren:** Deaktiviert – kein kompatibler API-Endpunkt in Grocy 4.6.0. Könnte funktionieren wenn Grocy aktualisiert wird.
- **Versandkosten:** Werden von Claude als Produkt erkannt – sollte im Matching-Prompt explizit ausgeschlossen werden.
- **Mehrseitige PDFs:** Werden unterstützt, aber sehr lange Rechnungen werden auf 8000 Zeichen gekürzt.
- **Scan-PDFs:** Nicht unterstützt (kein OCR) – nur digitale PDFs.

### Beispielrechnungen (getestet)

- **Vegaya UG** – Pekannüsse 2×1000g, Hanfsamen 2×1000g, Buchweizen 1000g, Buchweizen-Bundle. Besonderheit: Menge × Einzelpreis-Struktur (Brutto Preis / Brutto Gesamt)
- **Naturkost Schulz** – Heidelbeeren 1000g, Bananenscheiben 500g, Zedernusskerne 500g, Hanfsamen 500g, Aroniabeeren 500g. Besonderheit: Menge steht in Folgezeile (`Menge: 1000g`)
- **Bode Naturkost** – Geschäftsname in gesperrter Schreibweise: `B O D E N A T U R K O S T`, in Grocy als „bode Naturkost" gespeichert

### Versionsverlauf (Widget)

| Version | Wichtigste Änderung |
|---|---|
| v1 | Erster Prototyp: PDF-Extraktion, Claude-Analyse, Bigram-Matching |
| v2 | CSS-Spinner-Bug behoben (Claude Windows App) |
| v3 | Claude-basiertes semantisches Produktmatching |
| v4 | Geschäftserkennung aus PDF |
| v5 | Einkaufsdatum aus PDF, kombinierter Claude-Call |
| v6 | Verbesserte Datums- und Geschäftserkennung (gesperrte Schreibweise, DD.MM.YY) |
| v7 | Editierbare Menge/Einheit in Produktkarten |
| v8 | kg als Standardeinheit für neue Produkte; Changelog im UI |
| v9 | Neuanlegen-Dialog mit Name/Gruppe; Fix qu_factor_purchase_to_stock |
| v10 | Einheitenkonvertierung g→kg, ml→l vor Grocy-Import |
| v11 | Duplikaterkennung + doImport/checkDuplicates im globalen Scope |
| v12 | Korrekter Endpunkt `/objects/stock_log`, purchased_date, Geschäftsfilter-Fix |
| v13 | Undo-Endpunkt korrigiert (POST /undo/tx_id); alle Funktionen global |
| v14 | Standort im Neuanlegen-Dialog (Standard: Keller); Undo deaktiviert mit Hinweis |
| v15 | Preisberechnung korrigiert: Gesamtpreis/konvertierte Menge statt ppu/1000 |

**Aktuelle Widget-Version:** v15 (`public/grocy-import.html`)
