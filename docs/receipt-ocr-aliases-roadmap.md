# Roadmap: Gescannte Kassenzettel + Lern-Wörterbuch (Receipt-Aliase)

Branch: `receipt-ocr-aliases` (abgeleitet aus `test-deploy-01-branch`).
Ziel: das externe Import-Widget (`public/grocy-import.html`) so erweitern, dass es
auch **gescannte/fotografierte** Supermarkt-Belege verarbeiten kann – assistiert,
nicht vollautomatisch.

## Festgelegte Entscheidungen
- **Extraktion:** Claude **Vision** – Foto/Scan direkt an Claude, das die Positionen
  strukturiert zurückgibt (**nur** für die Bon-Erkennung). Entschieden nach OCR-Spike
  (2026-07-05): Tesseract.js liest zwar Zahlen/Struktur, aber Produktnamen
  unzuverlässig und pro Scan unterschiedlich verstümmelt (`ZUCCHINI`→`ScHINT`,
  `EXC FUS 85SELPP`→`B5SELPP`) → instabiler Alias-Schlüssel. Vision liefert saubere,
  stabile Namen. **Kein Tesseract im Produktivpfad.**
- **Nur für Scans/Fotos:** Der bestehende Digital-PDF-Pfad (pdf.js-Text → Claude-Text)
  bleibt unverändert; Vision ist der neue Eingabepfad für Bilder/gescannte PDFs und
  liefert **dasselbe JSON-Schema** wie die bisherige Text-Analyse (`shop_detected_name`,
  `date_iso`, `invoice_number`, `products[]`) → gemeinsamer Downstream (Matching,
  Wörterbuch, Review, Import).
- **Lern-Wörterbuch von Anfang an:** marktspezifische Kürzel → Produkt, das aus
  Korrekturen lernt. Bleibt wertvoll: bildet die nutzerspezifische Zuordnung
  „Kassentext Y (bei Markt X) = mein Grocy-Produkt Z" ab, die kein Modell raten kann.
- **Unsichere Positionen** werden markiert; der Nutzer bestätigt/korrigiert/lässt weg
  (nichts wird still falsch gebucht). Gilt auch bei Vision (Halluzinations-Risiko →
  Pflicht-Review + Summen-Check bleiben).
- **Speicher des Wörterbuchs:** eigene Grocy-Tabelle `product_receipt_aliases`
  (nicht `description`, kein Userfield-Blob), marktspezifisch, mit Häufigkeit.

### OCR-Spike-Ergebnis (Gate, 2026-07-05) – archiviert
Tesseract.js `deu` auf echtem REWE-Ponzer-Thermobon, RAW vs. Otsu-Threshold+Single-Block:
Preise/`EUR/kg`/kg-Mengen/Steuerklasse A|B/SUMME größtenteils rekonstruierbar (nur mit
Otsu-Binarisierung), Confidence ~44–49; **Produktnamen unbrauchbar und lauf-instabil.**
→ Route „reines lokales OCR" verworfen. Spike-Skripte: `scratchpad/ocr-spike*.js`.

## Warum eine eigene Tabelle
Die Zuordnung ist eine **Relation** („bei Markt X bedeutet Kassentext Y das Produkt
Z"), kein Produkt-Feld: 1 Produkt → viele Aliase, marktspezifisch, mit Lern-Häufigkeit.
Grocy modelliert Vergleichbares selbst über `product_barcodes` (mehrere
store-spezifische Kennungen pro Produkt) – daran ist die Tabelle angelehnt.

## Datenmodell (Migration `0261.sql`)
```sql
CREATE TABLE product_receipt_aliases (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,          -- FK -> products
    shopping_location_id INTEGER,         -- FK -> shopping_locations (Markt), optional
    alias TEXT NOT NULL,                  -- normalisierter Kassentext, z.B. "EXC FUS 85SELPP"
    times_confirmed INTEGER NOT NULL DEFAULT 1,  -- Häufigkeit / Lernsignal
    last_used_timestamp DATETIME,
    row_created_timestamp DATETIME DEFAULT (datetime('now'))
);
```
- Freigegeben über `/api/objects/product_receipt_aliases` (Whitelist in
  `grocy.openapi.json`) → das Widget kann direkt lesen/schreiben, keine Extra-API.
- `alias` wird **normalisiert** gespeichert (Großschreibung, Leerzeichen zusammengefasst),
  damit die Zuordnung gegen kleine OCR-Schwankungen robust ist.
- Match-**Confidence** wird zur Laufzeit aus `times_confirmed` + Exaktheit berechnet
  (nicht als eigene Spalte gespeichert).

## Pipeline (Zielbild)
```
Foto/Scan (JPG/PNG oder gescanntes Bild-PDF)
  -> (clientseitig) auf Base64 + ggf. Downscale/Re-Encode (JPEG) für die API
  -> Claude Vision (ein Call): Bild -> strukturiertes JSON
        (shop_detected_name, date_iso, invoice_number,
         products[]: {receipt_text, name, quantity, unit, price_total, price_per_unit,
                      tax_class, confidence})
  -> Wörterbuch-Lookup (product_receipt_aliases, marktspezifisch):
        receipt_text -> bekanntes Grocy-Produkt? -> Vorbelegung + Confidence-Bonus
  -> semantisches Matching (bestehender Call 2) für den Rest
  -> Review-UI: unsichere Zeilen markiert; Nutzer bestätigt/korrigiert
       -> Korrekturen schreiben/aktualisieren product_receipt_aliases (Lernen)
  -> Summen-Check (Positionen ~ "SUMME")
  -> Import + Beleg verknüpfen (bestehender v16-Flow, Bild als receipt_file)
```
Der Digital-PDF-Pfad bleibt: pdf.js-Text → Claude-Text (Call 1) → identisches JSON.
Vision und Text-Analyse münden in denselben Downstream.

## Iterationsplan
- [x] **Phase A – Backend (konfliktfrei):** Migration `product_receipt_aliases` +
  `/api/objects`-Freigabe. CRUD verifiziert.
- [x] **OCR-Spike (Gate):** Tesseract.js auf REWE Ponzer – Ergebnis: reine lokale OCR
  trägt die Namen nicht (siehe oben). Entscheidung: Claude Vision.
- [x] **Widget – Bild-Eingabepfad (v18):** Bild-Upload (JPG/PNG/…) zusätzlich zu PDF,
  Downscale auf ~1600px + JPEG-Re-Encode, Claude-Vision-Call → identisches Analyse-JSON,
  gemeinsamer Downstream; Foto wird als `receipt_file` angehängt. **Verdrahtung
  headless getestet** (`scratchpad/test-vision.js`: Image-Block gesendet, JSON fließt in
  Review, Rechnung angelegt). Offen: End-to-End-Test gegen echte Vision-API/Live-Grocy
  durch den Nutzer. Gescanntes **Bild-PDF** (pdf.js → Canvas → Vision) noch offen.
- [ ] **Widget – Wörterbuch-Lookup + Lernen:** `product_receipt_aliases` beim Matching
  vorbelegen; Korrekturen zurückschreiben. **NOCH NICHT IMPLEMENTIERT** – das Widget
  schreibt derzeit nichts in die Tabelle; sie bleibt nach einem Import leer. (Vom Nutzer
  am 2026-07-05 bemerkt: v18-Import funktioniert oberflächlich, alle Produkte eingetragen,
  aber keine Alias-Assoziation gespeichert.)
- [ ] **Widget – Review-Feinschliff:** unsichere Positionen markieren + Summen-Check.
- [ ] **Import + Beleg-Verknüpfung:** v16-Flow wiederverwenden, Bild als `receipt_file`.

## Offene Punkte / Risiken
- **Vision-Halluzination:** plausibel erfundene Namen → Pflicht-Review + Summen-Check.
- **Bildgröße/Token-Kosten:** Fotos vor dem Senden herunterskalieren (lange Kante ~1600 px).
- **Markt-Format-Vielfalt:** erst REWE; der Vision-Prompt ist generischer als ein Parser.
- **Normalisierung der Alias-Schlüssel** (Groß/Klein, Leerzeichen, Sonderzeichen).

## Koordination
`public/grocy-import.html`: die parallele v17-Arbeit
(`claude/half-external-import-feature-gp02gn`, „Rechnungsnummer") ist **bereits im
Deploy** und in diesem Branch enthalten (Titel v17). Kollisionsrisiko damit aufgelöst –
der Vision-Eingabepfad kann auf v17 aufsetzen. Backend (Tabelle) ist ohnehin unabhängig.
