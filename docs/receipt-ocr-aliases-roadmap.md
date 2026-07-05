# Roadmap: Gescannte Kassenzettel + Lern-Wörterbuch (Receipt-Aliase)

Branch: `receipt-ocr-aliases` (abgeleitet aus `test-deploy-01-branch`).
Ziel: das externe Import-Widget (`public/grocy-import.html`) so erweitern, dass es
auch **gescannte/fotografierte** Supermarkt-Belege verarbeiten kann – assistiert,
nicht vollautomatisch.

## Festgelegte Entscheidungen
- **Extraktion:** OCR (Tesseract.js) → Text → Claude (nicht Claude-Vision direkt).
- **Lern-Wörterbuch von Anfang an:** marktspezifische Kürzel → Produkt, das aus
  Korrekturen lernt.
- **Unsichere Positionen** werden markiert; der Nutzer bestätigt/korrigiert/lässt weg
  (nichts wird still falsch gebucht).
- **Speicher des Wörterbuchs:** eigene Grocy-Tabelle `product_receipt_aliases`
  (nicht `description`, kein Userfield-Blob), marktspezifisch, mit Häufigkeit.

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
Foto/Scan
  -> Vorverarbeitung (Canvas: Graustufen, Kontrast/Schwellwert, ggf. Entzerren)
  -> OCR (Tesseract.js, deu) -> Rohtext
  -> Zeilen-Parser (REWE-Format: Name / "Menge kg x EUR/kg" / Betrag / Steuer A|B)
  -> Wörterbuch-Lookup (product_receipt_aliases, marktspezifisch)
  -> Claude nur für Unbekanntes (Kürzel auflösen + Grocy-Abgleich)
  -> Confidence pro Position
  -> Review-UI: unsichere Zeilen markiert; Nutzer bestätigt/korrigiert
       -> Korrekturen schreiben/aktualisieren product_receipt_aliases (Lernen)
  -> Summen-Check (Positionen ~ "SUMME")
  -> Import + Beleg verknüpfen (bestehender v16-Flow)
```

## Iterationsplan
- [x] **Phase A – Backend (konfliktfrei):** Migration `product_receipt_aliases` +
  `/api/objects`-Freigabe. CRUD verifiziert.
- [ ] **OCR-Spike (Gate):** Tesseract.js auf echten Beleg (REWE Ponzer) – Rohtext-
  Qualität bewerten, Vorverarbeitungsbedarf bestimmen.
- [ ] **Widget – Vorverarbeitung + OCR** (auf aktueller `grocy-import.html`, mit der
  parallelen v17-Session koordiniert).
- [ ] **Widget – REWE-Zeilenparser** → strukturierte Rohpositionen.
- [ ] **Widget – Wörterbuch-Lookup + Claude-Fallback + Confidence.**
- [ ] **Widget – Review-UI** (unsicher markieren) + Korrekturen lernen + Summen-Check.
- [ ] **Import + Beleg-Verknüpfung** (v16-Flow wiederverwenden).

## Offene Punkte / Risiken
- **Risiko #1 – OCR-Qualität** auf geknitterten Thermo-Belegen. Deshalb Spike vor
  dem Widget-Ausbau.
- **Markt-Format-Vielfalt:** erst REWE, Parser später erweiterbar (Aldi/dm/…).
- **Normalisierung der Alias-Schlüssel** (Groß/Klein, Leerzeichen, Sonderzeichen).

## Koordination
`public/grocy-import.html` wird parallel von einer anderen Session bearbeitet
(Branch `claude/half-external-import-feature-gp02gn`, „Widget v17: Rechnungsnummer").
Die Widget-Phasen (OCR-Pipeline) daher erst angehen, wenn deren Änderung im Deploy
ist – sonst Kollisionen an derselben Datei. Das Backend (diese Tabelle) ist davon
unabhängig.
