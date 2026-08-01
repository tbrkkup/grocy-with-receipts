# Roadmap: Herkunftsland & Güte je Einkauf

> Branch: `herkunftsland-und-guete-des-produktes` (abgeleitet von `test-deploy-01-branch`)
> Status: **Konzept / Diskussionsgrundlage** — noch keine Implementierung.

## 1. Ziel & Motivation

Beim Einkauf soll erfassbar sein,

- **woher** ein Produkt stammt (Herkunftsland, z. B. Deutschland vs. Italien), und
- welche **Güte / Qualität** es hat (z. B. Bio vs. konventionell, ggf. Handelsklasse).

**Heutiges Vorgehen:** Für jede Kombination wird ein **eigenes Produkt** angelegt:

- „Roma-Tomaten, Deutschland" / „Roma-Tomaten, Italien"
- „Bio-Tomaten" statt „Tomaten" mit Güte = Bio

**Gewünschte Alternative:** Ein **Produkt** („Roma-Tomaten") und Herkunft + Güte werden **bei jedem Einkauf mitausgewählt**. Herkunft und Güte sind derselbe Attribut-Typ (frei kombinierbare Einkaufs-Merkmale) und werden in dieser Roadmap gemeinsam behandelt.

---

## 2. Für & Wider der beiden Vorgehensweisen

### 2a. Bisher: separate Produkte je Herkunft/Güte

**Dafür (Pro)**

- **Funktioniert heute**, null Code-Aufwand.
- Jede Variante hat **eigene Stammdaten**: Mindestbestand, Standard-Standort, Standard-Einheit, Preisverlauf, eigene **Barcodes**.
- **Bestandsübersicht trennt automatisch**: „3× DE, 2× IT" ist auf einen Blick sichtbar, ohne Drill-down.
- **Konsum/Verbrauch pro Variante trivial** — es ist ja ein eigenes Produkt (kein Spezial-Handling nötig).
- **Mindestbestand & Einkaufsliste je Variante** möglich („immer 2 Bio-Tomaten vorrätig").
- **Rezepte** können gezielt eine Variante referenzieren.

**Dagegen (Contra)**

- **Produktliste explodiert**: Produkt × Land × Güte → Kombinatorik. Wartung wird unübersichtlich.
- **Stammdaten-Duplikate**: dasselbe Produkt mehrfach pflegen (Gruppe, Einheit, Bild, Ablauf-Vorgabe …).
- **Keine Gesamtsicht** „wie viele Tomaten habe ich insgesamt" — Bestand ist über mehrere Produkte zersplittert.
- **Barcode-Konflikte**: dieselbe EAN kann nicht mehreren Herkunfts-Produkten zugeordnet werden.
- **Rezepte/Einkaufsliste fragmentiert**: „nimm irgendwelche Roma-Tomaten" lässt sich nicht ausdrücken — man muss eine konkrete Variante wählen.
- **Auswertungen** über „alle Bio-Käufe" oder „Anteil DE vs. IT" sind kaum möglich, weil das Merkmal nur im Produktnamen als Text steckt.

### 2b. Neu: Herkunft & Güte als Merkmal je Einkauf

**Dafür (Pro)**

- **Ein sauberes Produkt** „Roma-Tomaten" — Stammdaten nur einmal pflegen.
- **Gesamtbestand** über alle Herkünfte/Güten aggregierbar.
- Merkmal sitzt **dort, wo es entsteht** — an der einzelnen Charge/am Einkauf; derselbe Artikel darf je Einkauf aus einem anderen Land / anderer Güte kommen.
- **Rezepte & Einkaufsliste** referenzieren ein Produkt.
- **Provenienz im Journal**: Herkunft/Güte pro Buchung nachvollziehbar.
- **Strukturierte Auswertung** möglich („Bio-Anteil", „DE vs. IT über die Zeit").
- **`grocy-import.html`** könnte Herkunft/Güte **automatisch aus der Rechnung** erkennen und vorbelegen (Claude-Prompt).

**Dagegen (Contra)**

- **Implementierungsaufwand**: Schema + API + mehrere UI-Stellen (Einkaufs-/Bestands-/Journal-Maske, Filter).
- **Konsum nach Merkmal wird komplexer**: Grocy verbraucht standardmäßig **FIFO/nach Ablauf**. „Verbrauche gezielt die italienischen" geht nur über **Stock-Entry-basiertes Konsumieren** (existiert in Grocy, ist aber ein Extra-Schritt).
- **Bestandsübersicht aggregiert**: die Standard-Übersicht zeigt „5 Roma-Tomaten"; die Aufteilung DE/IT/Bio ist erst im **Drill-down auf die Stock-Entries** sichtbar (Gegenteil von 2a).
- **Mindestbestand/Einkaufsliste nicht je Variante**: Min-Bestand ist pro Produkt. „Immer 2 DE **und** 2 IT" lässt sich nicht ausdrücken.
- **Migration**: bestehende Split-Produkte („…, Deutschland") müssten optional zusammengeführt werden, wenn man wirklich konsolidieren will.
- **Pflichtfeld-Frage**: bei jedem Einkauf ein zusätzliches Feld — kann als Reibung empfunden werden (→ optional halten).

### 2c. Kernabwägung in einem Satz

> **2a** optimiert **getrennte Bestände/Mindestbestände je Variante** (Preis: Produkt-Wildwuchs).
> **2b** optimiert **saubere Stammdaten + Gesamtsicht + Auswertbarkeit** (Preis: variantengenauer Konsum & Min-Bestand entfallen bzw. werden aufwändiger).

**Nuance Herkunft vs. Güte:**

- **Herkunftsland** variiert echt **je Einkauf** (gleicher Artikel, mal DE, mal IT) → passt sehr gut zum Einkaufs-Attribut.
- **Güte** (Bio ja/nein) ist oft **produkt-stabil** (ein Artikel ist meist immer bio). Für Güte wäre auch ein **Produkt-Attribut** vertretbar. Da der Nutzer aber explizit weg vom „Bio-Tomaten"-Produkt will und beide Merkmale gleich behandeln möchte, wird Güte hier ebenfalls als Einkaufs-Attribut modelliert (mit der Option, es zusätzlich als Produkt-Default zu hinterlegen).

---

## 3. Technische Design-Optionen

Alle Varianten drehen sich darum, Herkunft & Güte an die **Charge** (`stock`) und die **Buchung** (`stock_log`) zu hängen — das ist die „je Einkauf"-Ebene (siehe `migrations/0049.sql` / `0157.sql`).

### Option A — Freitext-Spalten auf `stock` / `stock_log`
`origin_country TEXT`, `quality TEXT` direkt an Charge & Journal.
- **Pro:** minimaler Aufwand, keine neue Stammdaten-Verwaltung.
- **Contra:** keine Normalisierung → Tippfehler („Deutschand"), keine saubere Dropdown-/Filter-Konsistenz, schlechte Auswertbarkeit.

### Option B — Eigene Stammdaten-Entitäten + FK-Spalten *(empfohlen)*
Zwei kleine Stammdaten-Tabellen analog zu `shopping_locations` / `product_groups`:
- `countries` (id, name, ggf. ISO-Code) und `qualities` (id, name).
- Spalten `origin_country_id`, `quality_id` auf **`stock`** und **`stock_log`**.
- Optional Defaults am Produkt: `default_origin_country_id`, `default_quality_id` (Vorbelegung im Einkauf).
- **Pro:** konsistente Dropdowns, saubere Filter/Auswertung, wiederverwendbar, passt zu Grocys Mustern (generisches `/api/objects/{entity}`, Stammdaten-Pflegeseiten).
- **Contra:** etwas mehr Aufwand als A (zwei Entitäten, zwei Pflegeseiten).

### Option C — Userfields (schnellste MVP-Variante)
Grocy-Userfields an `products` (oder – falls exponiert – an Stock-Entries) für „Herkunft"/„Güte".
- **Pro:** **kein** DB-/Backend-Code, sofort nutzbar; gut, um das Konzept auszuprobieren.
- **Contra:** Userfields an der **Produkt**-Ebene lösen das „je Einkauf"-Ziel **nicht** (ein Wert pro Produkt, nicht pro Charge); Userfields an Stock-Entries sind in der **Einkaufs-Maske** nur eingeschränkt eingebunden; Auswertung/Filter bleiben schwächer. → Als **Proof of Concept** brauchbar, nicht als Zielbild.

### Option D — Vollwertiges Produktvarianten-System
Generische „Variante = Produkt + Attribut-Satz".
- **Contra:** deutlich überdimensioniert für zwei Merkmale; großer Eingriff in Bestand/Rezepte/Einkaufsliste. **Nicht empfohlen.**

### Empfehlung
**Option B** als Zielbild. Optional vorab **Option C** als schneller Test, ob die „je Einkauf"-Auswahl im Alltag wirklich gewünscht ist, bevor Schema-Aufwand investiert wird.

---

## 4. Offene Designentscheidungen (vor Umsetzung klären)

1. **Pflicht oder optional?** Herkunft/Güte je Einkauf freilassen dürfen (Empfehlung: optional).
2. **Konsum nach Merkmal wichtig?** Muss „verbrauche gezielt die italienischen" unterstützt werden, oder reicht FIFO + reine Anzeige der Herkunft?
3. **Bestandsübersicht:** reicht Aggregat pro Produkt (Aufteilung im Drill-down), oder wird eine **Aufschlüsselung nach Herkunft/Güte** in der Übersicht gewünscht?
4. **Mindestbestand je Variante** wirklich nötig? Falls ja → spricht das eher für das Beibehalten von 2a bei genau diesen Produkten (Hybrid ist erlaubt: manche Produkte splitten, andere per Attribut).
5. **Güte: Produkt-Default zusätzlich?** `default_quality_id`/`default_origin_country_id` am Produkt zur Vorbelegung?
6. **Migration bestehender Split-Produkte:** automatischer Zusammenführungs-Assistent gewünscht, oder bleiben Altprodukte unangetastet und nur Neues nutzt das Attribut?
7. **Stammdaten-Umfang Länder:** feste ISO-Liste vorbefüllen oder frei anlegbar wie Geschäfte?

---

## 5. Umsetzungsphasen (bei Wahl von Option B)

> Jede Phase, die Routen/Migrationen hinzufügt, **muss `version.json` bumpen** (sonst bleibt der `data/viewcache`-Route-Cache stale — bekannter Fallstrick in diesem Projekt).

**Phase 1 – Datenmodell**
- Migration: Tabellen `countries`, `qualities` (Rebuild-Idiom nicht nötig, reine `CREATE TABLE`).
- Migration: `origin_country_id`, `quality_id` auf `stock` **und** `stock_log`; optionale Produkt-Defaults.
- Views/Resolver für Anzeige-Namen (Join), analog zu bestehenden `*_resolved`-Views.

**Phase 2 – API**
- `countries` / `qualities` als **exposed entities** in `grocy.openapi.json` (generisches CRUD `/api/objects/{entity}`).
- Buchungs-Endpunkte (`/stock/products/{id}/add`, Purchase) akzeptieren optional `origin_country_id` / `quality_id` und schreiben sie an Charge + Journal.

**Phase 3 – UI Stammdaten**
- Pflegeseiten `/countries`, `/qualities` (Liste + Formular), im Master-Data-Menü.

**Phase 4 – UI Einkauf & Anzeige**
- **Einkaufs-Maske** (`/purchase`): zwei optionale Dropdowns Herkunft/Güte (mit Produkt-Default vorbelegt).
- **Bestands-Einträge** (`/stockentries`): Spalten Herkunft/Güte + Filter.
- **Journal**: Merkmale je Buchung anzeigen.
- Optional **Bestandsübersicht**: Aufschlüsselung/Filter nach Herkunft/Güte.

**Phase 5 – Konsum nach Merkmal (optional, nur falls Entscheidung 2 = ja)**
- Stock-Entry-basierter Konsum-Flow so aufbereiten, dass gezielt nach Herkunft/Güte verbraucht werden kann.

**Phase 6 – `grocy-import.html`**
- Claude-Analyse-Prompt um Herkunftsland/Güte-Erkennung aus der Rechnung erweitern; beim Anlegen der Buchung automatisch vorbelegen.

---

## 6. Risiken & Edge Cases

- **Aggregation vs. Trennung** ist die zentrale UX-Umkehr gegenüber heute (siehe 2c) — vor dem Bau abklären.
- **FIFO-Konsum** „vermischt" Herkünfte, wenn Konsum nach Merkmal nicht gebaut wird → Bestand pro Merkmal kann rechnerisch driften.
- **Mindestbestand/Einkaufsliste** bleiben produktweit — Erwartung managen.
- **Migration/Datenqualität**: Alt-Chargen haben kein Merkmal (NULL) — Anzeige/Filter müssen NULL sauber behandeln.
- **Hybrid ist ausdrücklich erlaubt:** Produkte, bei denen Min-Bestand je Variante zählt, dürfen weiter gesplittet bleiben; das Attribut ist additiv, kein Zwang.

---

## 7. Empfehlung in Kürze

1. **Kurzfristig:** Option **C** (Userfield) als 1-Tag-Test, ob die „je Einkauf"-Auswahl im Alltag getragen wird.
2. **Zielbild:** Option **B** (Entitäten `countries`/`qualities` + FK auf `stock`/`stock_log`, optionale Produkt-Defaults), Phasen 1–4; Phase 5/6 nach Bedarf.
3. **Hybrid akzeptieren:** Attribut als optionale Ergänzung — Produkte mit variantengenauem Mindestbestand dürfen weiter separat bleiben.
