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
