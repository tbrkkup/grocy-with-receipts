# Herkunftsland und Güte je Einkauf

Fügt zwei neue **optionale** Attribute am einzelnen Bestandseintrag hinzu:
**Herkunftsland** und **Güte**. Damit lässt sich festhalten, dass dieselben
„Roma-Tomaten" mal aus Deutschland und mal aus Spanien kommen, oder mal in Bio- und mal
in konventioneller Qualität gekauft wurden – ohne für jede Kombination ein eigenes
Produkt anlegen zu müssen.

Ausführliche Begründung und Abgrenzung: [`docs/issue-herkunftsland-und-guete.md`](docs/issue-herkunftsland-und-guete.md)

Branch: `feature/product-origin-and-quality` · Commits: `c2079f6` (Datenmodell + API),
`97af0cc` (Oberfläche)

---

## Was sich ändert

### Stammdaten

Zwei neue Seiten unter „Stammdaten verwalten", aufgebaut wie die bestehende
Geschäfte-Verwaltung – inklusive Suche, „Deaktivierte anzeigen", Benutzerfeldern und
Löschbestätigung.

Die Ländertabelle ist mit den ISO-3166-1-Ländern vorbefüllt (deutsche Namen +
Alpha-2-Code). Da kaum ein Haushalt alle ~200 braucht, lassen sich nicht benötigte
Länder deaktivieren: sie verschwinden aus der Auswahl beim Einkauf, bleiben an
historischen Bestandseinträgen aber weiterhin lesbar.

![Stammdaten: Länder](https://raw.githubusercontent.com/tbrkkup/grocy-with-receipts/refs/heads/feature/product-origin-and-quality/docs/images/product-origin-and-quality/01-countries.png)

Die Güten kommen bewusst **leer** ausgeliefert – was eine „Güte" ist, entscheidet der
Anwender (hier als Beispiel gepflegt):

![Stammdaten: Güten](https://raw.githubusercontent.com/tbrkkup/grocy-with-receipts/refs/heads/feature/product-origin-and-quality/docs/images/product-origin-and-quality/02-qualities.png)

Das Bearbeitungsformular für ein Land:

![Land bearbeiten](https://raw.githubusercontent.com/tbrkkup/grocy-with-receipts/refs/heads/feature/product-origin-and-quality/docs/images/product-origin-and-quality/03-country-form.png)

### Einkauf

Die Einkaufsmaske bekommt zwei zusätzliche, optionale Felder. Beides sind durchsuchbare
Comboboxen wie „Geschäft" und „Standort", beide dürfen leer bleiben:

![Einkaufsmaske mit Herkunftsland und Güte](https://raw.githubusercontent.com/tbrkkup/grocy-with-receipts/refs/heads/feature/product-origin-and-quality/docs/images/product-origin-and-quality/04-purchase.png)

Tippen filtert die Liste, damit die 200 Länder nicht im Weg stehen:

![Länderauswahl beim Einkauf](https://raw.githubusercontent.com/tbrkkup/grocy-with-receipts/refs/heads/feature/product-origin-and-quality/docs/images/product-origin-and-quality/05-purchase-country-dropdown.png)

Dieselben zwei Felder gibt es unter „Bestandseintrag bearbeiten"; Leeren setzt sie
wieder auf „nicht angegeben" zurück.

### Anzeige

Bestandseinträge und Bestandsjournal bekommen je eine Spalte „Herkunftsland" und „Güte"
(gruppierbar, über die Tabellenoptionen ein-/ausblendbar).

Das Beispiel zeigt den eigentlichen Punkt der Änderung: die drei obersten
Tomaten-Einträge unterscheiden sich **nur** in Herkunft bzw. Güte und bleiben deshalb
getrennt, statt zu einem Eintrag verschmolzen zu werden:

![Bestandseinträge mit Herkunftsland und Güte](https://raw.githubusercontent.com/tbrkkup/grocy-with-receipts/refs/heads/feature/product-origin-and-quality/docs/images/product-origin-and-quality/06-stockentries.png)

Auch das Journal führt beide Werte je Buchung mit:

![Bestandsjournal mit Herkunftsland und Güte](https://raw.githubusercontent.com/tbrkkup/grocy-with-receipts/refs/heads/feature/product-origin-and-quality/docs/images/product-origin-and-quality/07-stockjournal.png)

---

## Technische Umsetzung

**Migrationen**

| Datei | Inhalt |
| --- | --- |
| `0256.sql` | Tabellen `countries` / `qualities`, Spalten `origin_country_id` / `quality_id` auf `stock` und `stock_log`, View `stock_splits` erweitert |
| `0257.sql` | Seed der ISO-3166-1-Länder (deutsche Namen + Alpha-2-Code) |
| `0258.sql` | `active`-Flag auf `countries` / `qualities`, View `uihelper_stock_journal` um Herkunft/Güte erweitert |

Der Eingriff in **`stock_splits`** ist der inhaltlich wichtigste Teil: diese View
entscheidet, welche Bestandseinträge automatisch zusammengefasst werden dürfen. Ohne die
zusätzlichen Gruppierungsspalten würden zwei Käufe, die sich nur in Herkunft oder Güte
unterscheiden, stillschweigend verschmolzen – also genau die Information verlieren, um
die es hier geht. Käufe, die in allen Merkmalen übereinstimmen, werden weiterhin
kompaktiert.

**Backend**

- `StockService::AddProduct()` und `EditStockEntry()` um zwei optionale
  Parameter am Ende erweitert – bestehende Aufrufer bleiben unverändert.
- `POST /stock/products/{productId}/add` und `PUT /stock/entry/{entryId}` nehmen
  `origin_country_id` / `quality_id` optional entgegen.
- `countries` und `qualities` als generische Entitäten über `/objects/{entity}`
  exponiert (damit auch Benutzerfelder, CRUD und Berechtigungen ohne Sonderweg greifen).
- Neue Routen `/countries`, `/country/{countryId}`, `/qualities`, `/quality/{qualityId}`
  mit den zugehörigen Methoden im `StockController`.

**Frontend**

- Neue wiederverwendbare Komponenten `components/countrypicker` und
  `components/qualitypicker`.
- Neue Views und `viewjs` für die beiden Stammdatenseiten.
- Neue Strings in `localization/strings.pot`, deutsche Übersetzungen in
  `localization/de/strings.po`.

## Kompatibilität

Beide Felder sind optional. Wer sie nicht nutzt, merkt von der Änderung nichts:
bestehende Bestandseinträge bleiben unverändert (beide Werte `NULL`) und werden
weiterhin wie bisher kompaktiert. Es gibt keine geänderten Pflichtfelder und keine
Signaturänderung, die bestehende API-Aufrufe bricht.

Bewusst **nicht** enthalten: Verbrauch nach Herkunft/Güte (bleibt FIFO bzw. nach
Fälligkeitsdatum), Aufschlüsselung in der Bestandsübersicht (aggregiert weiterhin über
alle Einkäufe eines Produkts) und eine Vorbelegung aus dem letzten Einkauf (die Herkunft
wechselt ja gerade häufig).

## Test

Gegen eine lokal laufende Instanz mit frischer Datenbank (alle 252 Migrationen
angewandt) geprüft:

- Alle Migrationen laufen auf einer leeren SQLite-Datenbank durch; 194 Länder werden
  angelegt.
- Derselbe Artikel dreimal mit unterschiedlicher Herkunft/Güte gekauft → drei getrennte
  Bestandseinträge. Ein vierter, in allen Merkmalen identischer Kauf wird weiterhin
  korrekt kompaktiert.
- Bestandseintrag bearbeiten: Herkunft ändern und Güte leeren wird korrekt gespeichert
  (`quality_id` wird wieder `NULL`).
- Land deaktivieren → verschwindet aus Stammdatenliste und Einkaufs-Dropdown, bleibt an
  historischen Bestandseinträgen sichtbar; „Deaktivierte anzeigen" blendet es wieder ein.
- Stammdatenseiten, Einkauf, Bestandseinträge und Bestandsjournal rendern fehlerfrei
  (siehe Screenshots).
