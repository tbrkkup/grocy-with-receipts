# Konzept: Filialen für Geschäfte (Kette → Filiale)

Status: **abgestimmt, in Umsetzung** · Branch: `claude/location-branches-concept-3bdkzx`
(basiert auf `test-deploy-01-branch`)

## Ziel

Die heute **flache** Geschäfte-Liste (`shopping_locations`: „Aldi", „REWE") wird zu
einem **Baum**: Eine Kette bekommt mehrere Filialen.

```
REWE                    ← Kette (parent)
 ├─ REWE Hauptstraße    ← Filiale (child)
 └─ REWE Bahnhof        ← Filiale (child)
Naturkost Schulz        ← weiterhin flach, ohne Filialen
```

Auf **Rechnung** und **Einkauf** wird künftig die konkrete Filiale wählbar; die
Auswahl der Kette bleibt erlaubt und bedeutet „Filiale unbekannt". Ein Geschäft
ohne Filialen funktioniert unverändert weiter (abwärtskompatibel).

Technisch bleibt es **eine Tabelle** `shopping_locations`. Eine „Filiale" ist
einfach ein Geschäft mit gesetztem `parent_shopping_location_id` – exakt das
Muster der bereits existierenden Lagerort-Hierarchie (`locations`, Migrationen
0262–0264). Der Mechanismus erlaubt **beliebige Tiefe**; die UI-Sprache bleibt
„Kette → Filiale".

## Abgestimmte Entscheidungen

| # | Frage | Entscheidung |
|---|-------|--------------|
| a | Worauf zeigt Rechnung/Kauf? | **Filiale oder Kette erlaubt** (`shopping_location_id` unverändert, kein Schema-Zwang). Filiale bevorzugt. |
| b | Alias-Lernen (`product_receipt_aliases`) | Lookup/Lernen auf **Wurzel-(Ketten-)Ebene** normalisiert (über `root_id`). |
| c | Import-Widget (`grocy-import.html`) | **Später** – Widget wird gerade in Richtung „bulk-purchase" intern integriert. Jetzt nicht anfassen. |
| d | Kettensummen / Auswertungen | **Später** – zusammen mit einer optionalen Übersichtsseite. Kein `/shoppinglocationoverview` im ersten Wurf. |
| 4 | Tiefe | **Beliebige Tiefe** technisch offen (wie bei Lagerorten). |

## Datenstruktur (Migrationen 0266–0268)

Spiegelbild der Lagerort-Migrationen 0262–0264.

**`0266.sql` – Spalte + Eindeutigkeit + Views**
- `shopping_locations` bekommt `parent_shopping_location_id INTEGER`.
- Die Basistabelle hat `name TEXT NOT NULL UNIQUE` (global eindeutig). Für gleiche
  Filialnamen unter verschiedenen Ketten muss die Eindeutigkeit **pro Ebene**
  gelten → Table-Rebuild (SQLite-Idiom mit `PRAGMA legacy_alter_table = ON`,
  identisch zu 0262), danach Ausdrucks-Index mit Sentinel `-1`:
  ```sql
  CREATE UNIQUE INDEX uk_shopping_locations_parent_name
      ON shopping_locations (IFNULL(parent_shopping_location_id, -1), name);
  ```
- Zwei rekursive Views:
  - `shopping_locations_resolved` → `id, name, parent_shopping_location_id, root_id, level, path`
    (Pfad „REWE › Hauptstraße", für Baum-Anzeige/Sortierung)
  - `shopping_locations_descendants` → `ancestor_id, location_id`
    (Baustein für Ketten-Rollups und Alias-Wurzel-Normalisierung, Punkt b/d)

**`0267.sql` – Löschschutz** (analog 0263): Trigger
`shopping_location_prevent_delete_with_children` – eine Kette mit Filialen kann
nicht gelöscht werden (deckt Einzel-/Bulk-/API-Löschung ab).

**`0268.sql` – Härtung** (analog 0264): verwaiste/leere
`parent_shopping_location_id` auf `NULL` normalisieren; `shopping_locations_resolved`
gegen `''`-Wurzeln absichern.

> Beim Rebuild verhindert `legacy_alter_table = ON`, dass das `RENAME` abhängige
> Views (z. B. `products_view`-Kette, die `shopping_locations` per JOIN nutzt)
> umzuschreiben versucht. Da die Tabelle unter gleichem Namen neu entsteht,
> bleiben diese Views funktionsfähig.

## Backend

- `grocy.openapi.json`: `shopping_locations` ist bereits in der
  `ExposedEntity`-Whitelist → CRUD inkl. neuem Feld läuft sofort über
  `/api/objects/shopping_locations`. Ergänzt wird nur `parent_shopping_location_id`
  im `ShoppingLocation`-Schema (analog `Location`).
- `controllers/StockController.php`:
  - `ShoppingLocationsList` → Baum-Reihenfolge (Pfad) + Meta (Level, Parent-Name,
    has_children), inkl. Sicherheitsnetz für verwaiste Parents.
  - `ShoppingLocationEditForm` → `parentOptions` (Baum) + `excludedParentIds`
    (Zyklenschutz: sich selbst + alle Nachfahren).
  - Code praktisch kopierbar von `LocationsList` / `LocationEditForm`.

## User Interface

| Bereich | Änderung |
|---------|----------|
| Verwaltung `/shoppinglocations` | Baum-Anzeige (Einrückung) + Spalte „Übergeordnetes Geschäft"; Delete-Guard bei Filialen. |
| Formular `/shoppinglocation/{id}` | Dropdown **„Übergeordnetes Geschäft (Kette)"** mit Baum-Einrückung + Zyklenschutz; JS sendet leeres Parent als `null`. |
| Picker-Komponente `shoppinglocationpicker` | rendert Pfad statt Name via `SortLocationsAsTree($shoppinglocations, 'parent_shopping_location_id')`. Deckt automatisch Einkauf, Produktformular, Inventur, Lager-Eintrag ab. |
| Manuelle Dropdowns | `receiptform.blade.php`, `productbarcodeform.blade.php` auf Pfad-Anzeige. |

Der Helper `SortLocationsAsTree()` (in `helpers/extensions.php`) ist bereits
generisch (`$parentProperty`) – kein neuer Helper nötig.

## Abwärtskompatibilität

- Bestehende Geschäfte: `parent_shopping_location_id = NULL` → Wurzeln, alles wie bisher.
- Bestehende Rechnungen / `stock_log`-Einträge unberührt.
- Native Clients (Android/iOS/Desktop) und das externe Widget funktionieren ohne
  Änderung, da das neue Feld optional ist.

## Ausdrücklich vorgemerkt (nicht in diesem Wurf)

- **(c) Import-Widget / bulk-purchase:** Beim Verknüpfen von Käufen soll die
  konkrete **Filiale** wählbar/erkennbar werden. Alias-Lookup muss dabei auf die
  **Kette (Wurzel)** normalisieren (Punkt b), damit ketten­weit Gelerntes über alle
  Filialen greift. Umsetzen, wenn das Widget intern integriert wird.
- **(d) Kettensummen / Übersichtsseite:** Optionale `/shoppinglocationoverview`
  (Baum mit „Rechnungen/Ausgaben hier" vs. „inkl. Filialen") über
  `shopping_locations_descendants`. Reines Reporting.
