# Herkunftsland und Güte je Einkauf erfassen

## Problem

In Grocy sind alle beschreibenden Eigenschaften am **Produkt** hinterlegt, nicht am
einzelnen Einkauf. Für Eigenschaften, die sich von Einkauf zu Einkauf ändern, passt das
nicht: dieselben „Roma-Tomaten" kommen mal aus Deutschland, mal aus Spanien, mal aus
Italien, und mal in Bio-, mal in konventioneller Qualität.

Wer das heute festhalten will, hat nur drei Möglichkeiten – alle drei unbefriedigend:

1. **Ein Produkt je Kombination** anlegen („Roma-Tomaten (DE, Bio)",
   „Roma-Tomaten (ES)", …). Das bläht die Produktliste auf, zersplittert Bestand,
   Mindestbestand, Preishistorie und Verbrauchsstatistik, und beim Einkauf muss man
   jedes Mal die richtige Variante finden.
2. **Freitext im Notizfeld**. Nicht auswertbar, nicht filterbar, keine einheitliche
   Schreibweise.
3. **Benutzerfelder auf `stock`**. Kommt am nächsten heran, aber Benutzerfelder sind
   Freitext bzw. eine manuell gepflegte Werteliste ohne eigene Stammdatenpflege, und
   Einträge mit Benutzerfeldwerten werden von Grocy grundsätzlich nie kompaktiert –
   auch dann nicht, wenn sie identisch sind.

## Vorschlag

Zwei neue, **optionale** Attribute am einzelnen Bestandseintrag (Einkauf):

- **Herkunftsland** (`origin_country_id`) – woher das Produkt kommt.
- **Güte** (`quality_id`) – Qualitäts- bzw. Handelsklasse, z. B. „Bio", „Demeter",
  „Handelsklasse I", „Konventionell".

Beide sind reine Kaufeigenschaften: dasselbe Produkt bleibt *ein* Produkt, mit einem
Bestand, einer Preishistorie und einer Verbrauchsstatistik – aber jeder Einkauf weiß,
woher er kam und welche Güte er hatte.

### Datenmodell

- Neue Stammdatentabelle `countries` (`name`, `iso_code`, `description`, `active`),
  vorbefüllt mit den ISO-3166-1-Ländern (deutsche Namen + Alpha-2-Code).
- Neue Stammdatentabelle `qualities` (`name`, `description`, `active`), bewusst **leer**
  ausgeliefert – was eine „Güte" ist, entscheidet der Anwender.
- `stock.origin_country_id` und `stock.quality_id`, analog auf `stock_log`, damit auch
  das Bestandsjournal die Werte je Buchung kennt.
- Die Hilfsview `stock_splits`, die entscheidet welche Bestandseinträge automatisch
  zusammengefasst werden dürfen, muss um beide Spalten erweitert werden. Sonst würden
  zwei Käufe, die sich *nur* in Herkunft oder Güte unterscheiden, stillschweigend zu
  einem Eintrag verschmolzen – genau das, was das Feature verhindern soll.

### Stammdatenpflege

Zwei neue Seiten `/countries` und `/qualities` im Abschnitt „Stammdaten verwalten",
aufgebaut wie die bestehenden Geschäfte-Stammdaten: Liste mit Suche, „Deaktivierte
anzeigen", Benutzerfelder, Anlegen/Bearbeiten/Löschen.

Das `active`-Flag ist hier besonders wichtig: die Länderliste hat rund 200 Einträge, von
denen die meisten Haushalte eine Handvoll brauchen. Nicht benötigte Länder lassen sich
deaktivieren – sie verschwinden aus der Auswahl beim Einkauf, bleiben aber an
historischen Bestandseinträgen weiterhin lesbar.

### Bedienung

- Einkaufsmaske und „Bestandseintrag bearbeiten" bekommen je ein optionales
  Auswahlfeld (durchsuchbare Combobox, wie Geschäft und Standort).
- Bestandseinträge und Bestandsjournal bekommen je eine Spalte „Herkunftsland" und
  „Güte" (gruppierbar, über die Tabellenoptionen ein-/ausblendbar).
- Die API (`POST /stock/products/{productId}/add`, `PUT /stock/entry/{entryId}`) nimmt
  beide Felder optional entgegen; `countries` und `qualities` werden als generische
  Entitäten über `/objects/{entity}` exponiert.

## Bewusst nicht Teil des Vorschlags

- **Kein Verbrauch nach Herkunft/Güte.** Verbrauchen bleibt FIFO bzw. nach
  Fälligkeitsdatum. Wer gezielt den Bio-Eintrag verbrauchen will, wählt ihn wie bisher
  über „Bestandseinträge" aus.
- **Keine Aufschlüsselung in der Bestandsübersicht.** Die Übersicht aggregiert weiter
  über alle Einkäufe eines Produkts – das ist der Sinn der Sache.
- **Keine Pflichtfelder.** Wer die Attribute nicht nutzt, merkt von der Änderung nichts;
  bestehende Bestandseinträge bleiben unverändert und werden weiterhin kompaktiert.
- **Keine Vorbelegung aus dem letzten Einkauf.** Anders als beim Geschäft wäre das hier
  eher irreführend – die Herkunft wechselt ja gerade häufig.
