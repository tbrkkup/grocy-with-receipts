# Grocy Rechnungsimport – Projektdokumentation

## Projektübersicht

Ein Browser-basiertes HTML-Widget zum Import von Einkaufsrechnungen (PDF) in eine selbstgehostete [Grocy](https://grocy.offges.de)-Instanz. Claude (KI) analysiert die PDF und ordnet Produkte automatisch Grocy-Stammdaten zu.

---

## Technische Infrastruktur

### Server
- **Grocy-Instanz:** https://grocy.offges.de
- **Grocy-Version:** 4.6.0
- **Installation:** Nativ auf Debian/Ubuntu mit nginx + PHP-FPM
- **Webroot:** `/var/www/grocy/public/`
- **Widget-URL:** `https://grocy.offges.de/grocy-import.html`
- **Deploy-Befehl:** `sudo cp grocy-import-vX.html /var/www/grocy/public/grocy-import.html`

### nginx-Konfiguration
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

### Warum der Proxy?
Anthropic blockiert direkte Browser-Requests (`CORS preflight 400`). Der nginx-Proxy leitet den Request server-seitig weiter – Browser → grocy.offges.de/claude-proxy → api.anthropic.com.

---

## Widget-Architektur

### Technologie
- Reines HTML/JS (keine Frameworks, kein Build-Step)
- **PDF-Parsing:** pdf.js via CDN (`cdnjs.cloudflare.com`)
- **KI-Analyse:** Claude Sonnet 4.6 via Anthropic API (über nginx-Proxy)
- **Datenpersistenz:** `localStorage` für Grocy-URL, API-Keys

### Ablauf
1. **Config:** Anthropic API-Key, Grocy-URL, Grocy API-Key eingeben → Verbindungstest
2. **Upload:** PDF per Drag & Drop oder Dateidialog
3. **Analyse (2 Claude-Calls):**
   - Call 1: Alle Produktdaten + Datum + Geschäft aus PDF extrahieren
   - Call 2: Produkte semantisch mit Grocy-Stammdaten abgleichen
4. **Rechnung anlegen (v16):** Vor dem Review wird automatisch eine Rechnung (`receipt`) in Grocy angelegt – mit erkanntem Datum und Geschäft (leer, falls keins erkannt)
5. **Review:** Produkte prüfen, Mengen/Einheiten editieren, Datum/Geschäft bestätigen. Ein Banner oben zeigt die angelegte Rechnung mit „Rückgängig machen" / „Wiederherstellen"
6. **Import:** Rechnung mit aktuellem Geschäft/Datum aktualisieren (PUT) → PDF als `receipt_file` anhängen → neue Produkte anlegen (mit Dialog) → Lagerbuchung in Grocy, jede Buchung via `receipt_id` mit der Rechnung verknüpft

> **Hinweis:** Ab v16 setzt das Widget das Receipts-Feature dieses Grocy-Forks voraus (`receipts`, `receipt_files`, `receipt_id` in `stock_log`). Gegen ein reines Grocy 4.6.0 ohne diese Erweiterung funktioniert der Rechnungs-Teil nicht mehr.

### Globale JS-Funktionen (wichtig für Scope)
Alle Funktionen müssen **global** definiert sein, nicht innerhalb von Event-Listenern:
- `toBaseUnit(quantity, unit)` – Einheitenkonvertierung
- `renderDone(results)` – Ergebnisseite rendern
- `checkDuplicates(productIds, purchaseDate, shopId)` – Duplikaterkennung
- `undoPurchaseForProduct(productId, purchaseDate, shopId)` – (derzeit deaktiviert)
- `doImport(toImport, purchaseDate, doUpdate, dupIds)` – Import-Logik
- `createNewProduct(suggestedName)` – Neuanlegen-Dialog + API-Call
- `promptNewProduct(suggestedName)` – Modal mit Name/Gruppe/Standort
- `showModal(cfg)` – generisches Modal-System
- `showChangelog()` – Changelog-Modal

---

## Grocy API – bekannte Endpunkte (v4.6.0)

### Funktionierend
| Endpunkt | Methode | Verwendung |
|---|---|---|
| `/api/system/info` | GET | Verbindungstest, Version |
| `/api/objects/products` | GET / POST | Produkte laden / anlegen |
| `/api/objects/shopping_locations` | GET / POST | Geschäfte laden / anlegen |
| `/api/objects/product_groups` | GET / POST | Gruppen laden / anlegen |
| `/api/objects/locations` | GET | Standorte laden |
| `/api/objects/quantity_units` | GET | Mengeneinheiten laden (für kg-ID) |
| `/api/objects/stock_log` | GET | Lagerjournal für Duplikaterkennung |
| `/api/stock/products/{id}/add` | POST | Lagerzugang buchen (akzeptiert optionales `receipt_id`) |
| `/api/objects/receipts` | POST / PUT / DELETE | Rechnung anlegen / aktualisieren / löschen (v16, nur mit Receipts-Fork) |
| `/api/objects/receipt_files` | POST | PDF-Datei mit Rechnung verknüpfen (v16) |
| `/api/files/receipts/{base64name}` | PUT | PDF-Datei hochladen (`application/octet-stream`, v16) |

### Nicht funktionierend in v4.6.0
| Endpunkt | Problem |
|---|---|
| `/api/stock/log` | 405 – existiert nicht |
| `/api/stock/products/{id}/undo/{tx_id}` | 405 – existiert nicht |
| `/api/objects/stock_log/{id}` DELETE | 400 – nicht erlaubt |
| `/api/objects/stock_log/{id}` PUT | 400 – "Entity not exposed" |
| `/api/system/api-details` | 405 – existiert nicht |

### Stock-Log Eintrag (Struktur)
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

### Produkt anlegen (funktionierender Body)
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

### Lagerzugang buchen
```json
{
  "amount": 1.0,
  "price": 34.99,
  "best_before_date": "2999-12-31",
  "purchased_date": "2026-01-13",
  "shopping_location_id": 2
}
```

---

## Einheitenkonvertierung

Claude gibt Mengen in g/ml zurück, Grocy speichert in kg/l:

```javascript
function toBaseUnit(quantity, unit) {
  if (unit === 'g')  return { amount: quantity / 1000, unit: 'kg' };
  if (unit === 'ml') return { amount: quantity / 1000, unit: 'l' };
  return { amount: quantity, unit: unit };
}
```

### Preisberechnung (v15 – korrekt)
```javascript
// Gesamtpreis / konvertierte Menge = Preis pro kg
var priceTotal = item.price_total || (item.price_per_unit * item.quantity);
var convPpu = (priceTotal && convAmount) ? priceTotal / convAmount : 0;
```
**Nicht** `ppu / 1000` – das wäre falsch. Beispiel:
- 1000g Heidelbeeren, 52,99€ → convAmount=1.0kg → convPpu=52.99 €/kg ✓
- 500g Hanfsamen, 14,99€ → convAmount=0.5kg → convPpu=29.98 €/kg ✓

---

## Duplikaterkennung

Vor dem Import wird `/api/objects/stock_log?limit=500` abgefragt. Einträge werden verglichen nach:
- `transaction_type === 'purchase'`
- `undone == 0`
- `purchased_date` (YYYY-MM-DD) entspricht dem Rechnungsdatum
- `shopping_location_id` (nur wenn beide Seiten einen Wert haben)

**Undo-Funktion:** Derzeit deaktiviert – kein kompatibler Endpunkt in Grocy 4.6.0. Im Dialog erscheint ein Hinweis; der Nutzer kann Duplikate manuell im Grocy-Lagerjournal löschen.

---

## Claude-Prompt Strategie

### Analyse-Prompt (Call 1)
Gibt JSON zurück mit:
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

### Matching-Prompt (Call 2)
Semantischer Abgleich: `"Reis rot bio"` → `"Roter Reis"`, mehrzeilige Beschreibungen zusammenfassen.

### Geschäfts-Fallback (clientseitig)
Falls Claude `shop_matched_id` nicht setzt:
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

---

## Neuanlegen-Dialog

Beim Anlegen neuer Produkte öffnet sich ein Modal mit:
- **Produktname** (editierbar, vorausgefüllt)
- **Produktgruppe** (Dropdown + „Neue Gruppe anlegen…")
- **Standort** (Dropdown, Standard: „Keller" falls vorhanden, sonst erster Eintrag)

Standard-Einheit für neue Produkte: **kg** (kg-ID wird beim Connect über `/objects/quantity_units` geladen).

---

## Bekannte Einschränkungen / TODO

- **Undo/Aktualisieren:** Deaktiviert – kein kompatibler API-Endpunkt in Grocy 4.6.0. Könnte funktionieren wenn Grocy aktualisiert wird.
- **Versandkosten:** Werden von Claude als Produkt erkannt – sollte im Matching-Prompt explizit ausgeschlossen werden.
- **Mehrseitige PDFs:** Werden unterstützt, aber sehr lange Rechnungen werden auf 8000 Zeichen gekürzt.
- **Scan-PDFs:** Nicht unterstützt (kein OCR) – nur digitale PDFs.

---

## Beispielrechnungen (getestet)

### Vegaya UG
- Produkte: Pekannüsse 2×1000g, Hanfsamen 2×1000g, Buchweizen 1000g, Buchweizen-Bundle
- Besonderheit: Menge × Einzelpreis-Struktur (Brutto Preis / Brutto Gesamt)

### Naturkost Schulz
- Produkte: Heidelbeeren 1000g, Bananenscheiben 500g, Zedernusskerne 500g, Hanfsamen 500g, Aroniabeeren 500g
- Besonderheit: Menge steht in Folgezeile (`Menge: 1000g`), nicht in der Produktzeile

### Bode Naturkost
- Geschäftsname in gesperrter Schreibweise: `B O D E N A T U R K O S T`
- In Grocy als „bode Naturkost" gespeichert

---

## Versionsverlauf

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
| v16 | Rechnungs-Integration: `receipt` vor Review anlegen (Datum + Geschäft), Banner mit Rückgängig/Wiederherstellen, Käufe via `receipt_id` verknüpft, PDF als `receipt_file` angehängt, Sync per PUT beim Import. Setzt Receipts-Fork voraus |

**Aktuelle Version:** v16
**Aktuelle Datei:** `public/grocy-import.html`

---

## Neue Session starten

```
Ich entwickle ein HTML-Widget für Grocy-Rechnungsimport.
Lies CLAUDE.md für den vollständigen Kontext.
Die aktuelle Version ist v16 (public/grocy-import.html).
Bitte erhöhe die Versionsnummer bei jeder Änderung und pflege den Changelog.
```
