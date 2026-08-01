# Herkunftsland und Güte je Einkauf

Erfasst Herkunftsland und Güte am einzelnen Bestandseintrag statt am Produkt, sodass
dieselben „Roma-Tomaten" mal aus Deutschland in Bio und mal aus Ungarn in konventioneller
Qualität gekauft werden können, ohne dafür getrennte Produkte anzulegen.

Warum das nötig ist und was bewusst außen vor bleibt, steht in
[`docs/issue-herkunftsland-und-guete.md`](https://github.com/tbrkkup/grocy-with-receipts/blob/feature/product-origin-and-quality/docs/issue-herkunftsland-und-guete.md). Dieser Text
beschreibt nur, was tatsächlich geändert wurde.

Branch `feature/product-origin-and-quality`, vier Commits: Datenmodell + API,
Oberfläche, Dokumentation, Preisverlauf.

---

## Oberfläche

### Stammdaten

Zwei neue Seiten unter „Stammdaten verwalten", aufgebaut wie die vorhandene
Geschäfte-Verwaltung – Suche, „Deaktivierte anzeigen", Benutzerfelder,
Anlegen/Bearbeiten/Löschen. Die Länder werden mit den ISO-3166-1-Einträgen ausgeliefert
(deutsche Namen, Alpha-2-Code); die Güten kommen leer, weil deren Bedeutung vom Haushalt
abhängt.

![Stammdaten: Länder](https://raw.githubusercontent.com/tbrkkup/grocy-with-receipts/refs/heads/feature/product-origin-and-quality/docs/images/product-origin-and-quality/01-countries.png)

![Stammdaten: Güten](https://raw.githubusercontent.com/tbrkkup/grocy-with-receipts/refs/heads/feature/product-origin-and-quality/docs/images/product-origin-and-quality/02-qualities.png)

![Land bearbeiten](https://raw.githubusercontent.com/tbrkkup/grocy-with-receipts/refs/heads/feature/product-origin-and-quality/docs/images/product-origin-and-quality/03-country-form.png)

Das `active`-Flag filtert nur die Auswahlfelder, nicht die Anzeige: ein ausgeblendetes
Land taucht beim nächsten Einkauf nicht mehr auf, an einem drei Monate alten Eintrag
steht sein Name aber weiterhin.

### Einkauf

Zwei zusätzliche optionale Felder, als durchsuchbare Comboboxen wie „Geschäft" und
„Standort". Dieselben Felder gibt es unter „Bestandseintrag bearbeiten"; Leeren setzt sie
dort wieder auf „nicht angegeben" zurück.

![Einkaufsmaske mit Herkunftsland und Güte](https://raw.githubusercontent.com/tbrkkup/grocy-with-receipts/refs/heads/feature/product-origin-and-quality/docs/images/product-origin-and-quality/04-purchase.png)

Tippen filtert, damit die Länderliste nicht im Weg steht:

![Länderauswahl beim Einkauf](https://raw.githubusercontent.com/tbrkkup/grocy-with-receipts/refs/heads/feature/product-origin-and-quality/docs/images/product-origin-and-quality/05-purchase-country-dropdown.png)

### Bestandseinträge und Journal

Je eine Spalte „Herkunftsland" und „Güte", gruppierbar und über die Tabellenoptionen
ein-/ausblendbar. Die Bestandseinträge zeigen den Kern der Änderung: Käufe, die sich nur
in Herkunft oder Güte unterscheiden, bleiben getrennt statt zu einem Eintrag verschmolzen
zu werden.

![Bestandseinträge mit Herkunftsland und Güte](https://raw.githubusercontent.com/tbrkkup/grocy-with-receipts/refs/heads/feature/product-origin-and-quality/docs/images/product-origin-and-quality/06-stockentries.png)

![Bestandsjournal mit Herkunftsland und Güte](https://raw.githubusercontent.com/tbrkkup/grocy-with-receipts/refs/heads/feature/product-origin-and-quality/docs/images/product-origin-and-quality/07-stockjournal.png)

### Preisverlauf

Der Preisverlauf in der Produktübersicht zog bisher eine Linie je Geschäft. Den
Reihenschlüssel bilden jetzt Geschäft, Güte und Herkunft gemeinsam. Aus einer
verrauschten „Aldi"-Linie, die zwischen 1,19 € und 2,69 € hin- und herspringt, werden
dadurch zwei aussagekräftige Linien:

![Preisverlauf getrennt nach Geschäft, Güte und Herkunft](https://raw.githubusercontent.com/tbrkkup/grocy-with-receipts/refs/heads/feature/product-origin-and-quality/docs/images/product-origin-and-quality/08-price-history.png)

Käufe ohne Angabe bleiben eine eigene Reihe (nur Geschäftsname) – „unbekannt" wird nicht
stillschweigend mit „Bio, Deutschland" in einen Topf geworfen.

---

## Technische Umsetzung

### Migrationen

| Datei | Inhalt |
| --- | --- |
| `0256.sql` | Tabellen `countries` / `qualities`, Spalten `origin_country_id` / `quality_id` auf `stock` und `stock_log`, View `stock_splits` erweitert |
| `0257.sql` | Seed der ISO-3166-1-Länder |
| `0258.sql` | `active`-Flag auf `countries` / `qualities`, View `uihelper_stock_journal` erweitert |
| `0259.sql` | View `products_price_history` erweitert |

Der Eingriff in **`stock_splits`** ist der inhaltlich heikelste Teil: diese View
entscheidet, welche Bestandseinträge automatisch zusammengefasst werden dürfen. Ohne die
beiden zusätzlichen Gruppierungsspalten würden zwei Käufe, die sich nur in Herkunft oder
Güte unterscheiden, stillschweigend verschmolzen – also genau die Information verlieren,
um die es hier geht.

`uihelper_stock_journal` und `products_price_history` listen ihre Spalten explizit auf
und mussten deshalb neu angelegt werden; `uihelper_stock_entries` selektiert `*` und kam
ohne Änderung aus.

### Backend

- `StockService::AddProduct()` und `EditStockEntry()` um zwei optionale Parameter am Ende
  erweitert, sodass bestehende Aufrufer unverändert bleiben.
- `POST /stock/products/{productId}/add` und `PUT /stock/entry/{entryId}` nehmen
  `origin_country_id` / `quality_id` optional entgegen.
- `GET /stock/products/{productId}/price-history` liefert je Datenpunkt zusätzlich
  `origin_country` und `quality` (analog zum vorhandenen `shopping_location`).
- `countries` und `qualities` als generische Entitäten über `/objects/{entity}` exponiert,
  damit CRUD, Benutzerfelder und Berechtigungen ohne Sonderweg greifen.
- Neue Routen `/countries`, `/country/{countryId}`, `/qualities`, `/quality/{qualityId}`
  samt Methoden im `StockController`.

### Frontend

- Neue wiederverwendbare Komponenten `components/countrypicker` und
  `components/qualitypicker`.
- Neue Views und `viewjs` für die beiden Stammdatenseiten.
- `productcard.js` bildet den Reihenschlüssel des Preisverlaufs aus Geschäft, Güte und
  Herkunft statt nur aus dem Geschäft.
- Neue Strings in `localization/strings.pot`, deutsche Übersetzungen in
  `localization/de/strings.po`.

### Nebenbefund: verrutschte Tabellenköpfe

Beim Erstellen der Screenshots fiel auf, dass Kopf- und Datenzeilen der breiten Tabellen
auseinanderlaufen, sobald man die Seitenleiste ein- oder ausklappt – im Test bis zu
189 px, kumulativ nach rechts, also am deutlichsten auf den äußersten Spalten. Ursache:
mit aktiviertem `scrollX` rendert DataTables Kopf und Körper als getrennte Tabellen und
rechnet die Spaltenbreiten beim Layoutwechsel nicht neu.

Das betrifft alle Spalten und alle Tabellen und besteht unabhängig von diesem Feature,
fällt durch die zwei neuen Spalten ganz rechts aber deutlicher auf. Der Umschalter in
`grocy_menu_layout.js` ruft jetzt `columns.adjust()` auf allen sichtbaren Tabellen auf;
gemessener Versatz danach: 0 px auf allen Spalten.

## Kompatibilität

Beide Felder sind optional. Bestehende Bestandseinträge bleiben unverändert (beide Werte
`NULL`) und werden weiterhin wie bisher zusammengefasst. Keine geänderten Pflichtfelder,
keine Signaturänderung, die bestehende API-Aufrufe bricht, keine Datenmigration.

Im Preisverlauf ändert sich für bestehende Daten nichts: ohne gepflegte Herkunft und
Güte bleibt es bei einer Reihe je Geschäft wie bisher.

## Test

Gegen eine lokal laufende Instanz mit frischer Datenbank geprüft (alle 252 Migrationsdateien
angewandt, Demo-Daten):

- Migrationen laufen auf einer leeren SQLite-Datenbank vollständig durch, 194 Länder
  werden angelegt.
- Derselbe Artikel dreimal mit unterschiedlicher Herkunft/Güte gekauft → drei getrennte
  Bestandseinträge. Ein vierter, in allen Merkmalen identischer Kauf wird weiterhin
  korrekt zusammengefasst.
- Bestandseintrag bearbeiten: Herkunft ändern und Güte leeren wird gespeichert,
  `quality_id` wird wieder `NULL`.
- Land deaktivieren → verschwindet aus Stammdatenliste und Einkaufs-Dropdown, bleibt an
  historischen Bestandseinträgen sichtbar; „Deaktivierte anzeigen" blendet es wieder ein.
- 14 Käufe über drei Monate in drei Kombinationen → `price-history` liefert Herkunft und
  Güte je Datenpunkt, das Diagramm zeichnet drei getrennte Linien.
- Spaltenausrichtung nach dem Ein-/Ausklappen der Seitenleiste über die tatsächliche
  DOM-Geometrie gemessen (vorher/nachher).
