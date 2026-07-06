# Roadmap: `grocy-import.html` → native Grocy-Integration

Ziel: das standalone Import-Widget schrittweise in das normale Grocy-UI überführen –
ohne dass die bestehende Lösung in der Übergangszeit kaputtgeht. Dieses Dokument ist
die Diskussionsgrundlage; die mit **[ENTSCHEIDUNG]** markierten Punkte klären wir vorab.

---

## 1. Ausgangslage

`public/grocy-import.html` ist eine eigenständige HTML/JS-Seite (kein Grocy-View), die:
- mit der **Grocy-REST-API** spricht (Produkte, Geschäfte, Lagerzugang, Rechnungen, Aliase),
- **Claude** über den nginx-`/claude-proxy` ruft (Anthropic-Key liegt **im Browser**/localStorage),
- fremde Produktseiten/Bilder über **`public/url-proxy.php`** holt,
- **pdf.js** per **CDN** lädt (nicht Teil von Grocy),
- Funktionen bündelt: PDF/Foto-Upload, Vision-/Text-Extraktion, Produkt-Matching,
  Rechnung anlegen, Review/Korrektur, Import mit `receipt_id`, Lern-Wörterbuch
  (`product_receipt_aliases`), „Produkt aus Link".

Serverseitig ist die Basis bereits vorhanden (dieser Fork):
`receipts`, `receipt_files`, `receipt_id` in `stock_log`, `invoice_number`,
`product_receipt_aliases`, `StockService::AddProduct($…, $receiptId)`, `ReceiptsController`,
Ansichtsseiten `/receipts`, `/receiptaliases`.

## 2. Zielbild

Ein nativer Grocy-Flow, erreichbar aus dem Menü:
**Upload → Analyse → Review/Korrektur → Import**, umgesetzt als Grocy-Controller +
Blade-Views + `viewjs`, mit **server-seitigen** Endpunkten für Claude und URL-Abruf.
Der Anthropic-Key liegt dann in der Grocy-Config (nicht mehr im Browser).

## 3. Architektur-Bausteine – was wandert wohin

| Heute (Widget) | Nativ (Ziel) |
|---|---|
| `/claude-proxy` (nginx), Key im Browser | **`POST /api/receipts/analyze`** – Grocy-Controller ruft Anthropic via **Guzzle**; Key aus `GROCY_ANTHROPIC_API_KEY` (config.php/Env). Kein Key mehr im Browser. |
| `url-proxy.php` (standalone) | **`GET /api/receipts/fetch-url`** – Controller mit denselben SSRF-Schutzmaßnahmen (IP-Pinning, Redirect-Prüfung), Auth über Grocy-Session/API-Key (statt eigener DB-Abfrage). |
| Datei-Upload per `/api/files/receipts/...` | unverändert (Grocy-Files-API + `receipt_files`). |
| Lagerzugang je Position via `/api/stock/products/{id}/add` | wahlweise so belassen **oder** dedizierter transaktionaler **`POST /api/receipts/{id}/import`** (Rechnung+Buchungen+Dateien+Alias-Lernen atomar). |
| Aliase lesen/schreiben via `/api/objects/...` | unverändert (Tabelle existiert). |
| pdf.js/Canvas **im Browser** | **[ENTSCHEIDUNG]** client-seitig beibehalten (pdf.js bundeln statt CDN) **oder** server-seitig rendern (Ghostscript/Imagick). |
| Claude Sonnet Modell hart im JS | Modell als Grocy-Setting (`GROCY_ANTHROPIC_MODEL`). |

## 4. Phasenplan (inkrementell – Widget bleibt bis Phase 6 nutzbar)

### Phase 0 – Server-Fundament (unsichtbar, kein UI)
- Settings: `Setting('ANTHROPIC_API_KEY', '')`, `Setting('ANTHROPIC_MODEL', 'claude-sonnet-4-6')`,
  Feature-Flag `Setting('FEATURE_FLAG_RECEIPT_IMPORT', true)`.
- Controller `ReceiptImportApiController`:
  - `POST /api/receipts/analyze` (Body: Text **oder** Bild(er) base64 + Kontext) → ruft Anthropic
    server-seitig, gibt das bekannte Analyse-JSON zurück.
  - `GET /api/receipts/fetch-url?url=` (SSRF-hardened, aus `url-proxy.php` portiert).
- **Sofort-Nutzen:** das bestehende Widget kann optional schon auf diese Endpunkte
  umgestellt werden → **Anthropic-Key raus aus dem Browser**, `/claude-proxy` und
  `url-proxy.php` werden perspektivisch überflüssig.

### Phase 1 – Menü-Umbau & Einstiegspunkt (entschieden)
- Bestehendes Einkauf-Menülabel → **„Einzeleinkauf"** (nur Anzeige; Route/Controller
  bleiben `purchase`). Übersetzungen `Single purchase`/„Einzeleinkauf".
- Neuer Menüpunkt **„Sammeleinkauf" („Bulk purchase")** direkt darunter → zeigt auf die
  neue native Seite (`GET /bulkpurchase`). Kein Interim-Embed.

### Phase 2 – Native Upload-/Analyse-Seite („Sammeleinkauf")
- `GET /bulkpurchase` → Blade-View + `viewjs/bulkpurchase.js`.
- Zwei Felder wie im Widget (digital = PDF/Text, Scan/Foto = Vision), Grocy-Fortschrittsanzeige.
- pdf.js **clientseitig** (gebundelt), ruft `POST /api/receipts/analyze`.

### Phase 3 – Native Review-/Korrektur-Seite
- Editierbare Positionen (Menge/Einheit/Produkt-Match), Geschäft-/Datum-Auswahl, Rechnungs-Banner.
- Wörterbuch-Vorbelegung (Lookup vor Claude), unsichere Positionen markiert.
- Wiederverwendung von Grocy-Produkt-Picker + Neuanlegen (idealerweise Grocys Produktformular
  im Dialog statt eigenem Mini-Dialog).

### Phase 4 – Import & Verknüpfung
- Transaktionaler Import-Endpoint (Rechnung anlegen/aktualisieren, Buchungen mit `receipt_id`,
  Datei anhängen, Aliase lernen), Duplikaterkennung wie gehabt.

### Phase 5 – „Produkt aus Link" nativ
- Im **Grocy-Produktformular** (`productform`) ein Feld „aus Link importieren", das
  `GET /api/receipts/fetch-url` + Analyse nutzt (Name/Gewicht/Bild).

### Phase 6 – Standalone-Widget ablösen
- Wenn nativ vollständig: Widget als Legacy markieren/entfernen; `/claude-proxy` und
  `url-proxy.php` (und die CDN-pdf.js-Abhängigkeit) entfallen.

## 5. Entscheidungen (getroffen am 2026-07-06)
1. **Anthropic-Key & Claude-Aufruf: SERVERSEITIG.** Der Key wird server-seitig gespeichert
   und **im UI über das Einstellungsmenü** gepflegt (nicht nur config.php). Server ruft
   Anthropic per Guzzle. → Umsetzung: UI-editierbare Einstellung (siehe „Offen" unten),
   Fallback auf `GROCY_ANTHROPIC_API_KEY` (config.php/Env).
2. **Benennung & Menü-Platzierung (WICHTIG):**
   - Das Import-Feature (heute `grocy-import.html`) heißt künftig **„Bulk purchase"**
     (deutsche UI: **„Sammeleinkauf"**).
   - In der Seitenleiste **unter „Einkauf"**. Der bestehende Einkauf wird **UI-seitig zu
     „Einzeleinkauf"** umbenannt.
   - **Backend bleibt `purchase`** (Route/Controller/Endpunkte) für maximale
     Abwärtskompatibilität – nur die **Anzeige-Labels** ändern sich.
3. **Kein Interim-Embed – gleich nativ** (Blade + viewjs von Anfang an).
4. **PDF/Bild-Verarbeitung CLIENTSEITIG** (wie heute, pdf.js/Canvas im Browser; pdf.js
   künftig bundeln statt CDN).

### Noch offen (kleiner Klärungspunkt bei Umsetzung)
- **Wo genau lebt die Key-Einstellung im UI?** Grocy kennt UI-editierbar v.a. *User-Settings*
  (`/usersettings`, pro Nutzer, DB). Für eine Einzelnutzer-Instanz gut geeignet. Alternativ
  eine eigene kleine Einstellungsseite „Beleg-Import". Vorschlag: als Setting auf einer
  Einstellungsseite des Features (instanzweit), da der Key die ganze Instanz betrifft.

## 6. Risiken / Rahmen
- **Multi-User/Key-Verwaltung:** ein globaler Instanz-Key (config) vs. pro Nutzer.
- **Fork-Pflege:** native Änderungen sind größer/tiefer als das isolierte Widget → mehr
  Merge-Fläche gegenüber Grocy-Upstream. Klein schneiden, viel über bestehende APIs lösen.
- **Server-Last:** Bild-/PDF-Verarbeitung server-seitig kostet CPU/RAM; client-seitig hält
  das beim Browser (aktueller Ansatz).
- **Kosten/Rate-Limits Anthropic** serverseitig zentral steuerbar (Vorteil server-seitig).

## 7. Empfohlene Reihenfolge (Vorschlag)
Phase 0 (Fundament, entkoppelt) → Widget auf neue Endpunkte umstellen (Key raus aus Browser)
→ Phase 1 Einstiegspunkt (ggf. Interim-Embed) → Phase 2/3 native Seiten → Phase 4 Import
→ Phase 5 Produkt-aus-Link → Phase 6 Ablösung.
