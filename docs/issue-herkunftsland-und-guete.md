# Herkunftsland und Güte je Einkauf erfassen

## Problem

In Grocy sind alle beschreibenden Eigenschaften am **Produkt** hinterlegt, nicht am
einzelnen Einkauf. Für Eigenschaften, die sich von Einkauf zu Einkauf ändern, passt das
nicht: dieselben „Roma-Tomaten" kommen mal aus Deutschland, mal aus Spanien, mal aus
Italien, und mal in Bio-, mal in konventioneller Qualität.

Das ist keine Kosmetik. Wer 4 Bio-Tomaten aus Deutschland für 2,69 € und 6 konventionelle
aus Ungarn für 1,49 € kauft, hat nicht „zweimal Tomaten zu unterschiedlichen Preisen"
gekauft, sondern zwei verschiedene Dinge. Solange Grocy das nicht auseinanderhalten kann,
sind Bestand und Preisvergleich für solche Produkte irreführend.

## Warum die bestehenden Möglichkeiten nicht reichen

**Ein Produkt je Kombination** („Roma-Tomaten (DE, Bio)", „Roma-Tomaten (ES)", …) bläht
die Produktliste auf und zersplittert genau das, was zusammengehört: Bestand,
Mindestbestand, Preishistorie und Verbrauchsstatistik verteilen sich auf beliebig viele
Varianten, und beim Einkauf muss man jedes Mal die richtige heraussuchen.

**Freitext im Notizfeld** ist nicht auswertbar, nicht filterbar und hat keine
einheitliche Schreibweise („bio" / „Bio" / „BIO").

**Benutzerfelder auf `stock`** kommen am nächsten heran, sind aber Freitext bzw. eine
manuell gepflegte Werteliste ohne eigene Stammdatenpflege. Zusätzlich schließt Grocy
Einträge mit Benutzerfeldwerten grundsätzlich vom Zusammenfassen aus – auch dann, wenn
sie identisch sind.

## Vorschlag

Zwei neue, **optionale** Attribute am einzelnen Bestandseintrag:

- **Herkunftsland** – woher das Produkt kommt.
- **Güte** – Qualitäts- bzw. Handelsklasse, z. B. „Bio", „Demeter", „Handelsklasse I",
  „Konventionell".

Beide sind reine Kaufeigenschaften. Dasselbe Produkt bleibt *ein* Produkt mit einem
Bestand und einer Verbrauchsstatistik – aber jeder einzelne Einkauf weiß, woher er kam
und welche Güte er hatte.

Beide bekommen eine eigene Stammdatenverwaltung, damit die Werte auswählbar statt
eintippbar sind. Die Länder sollten dabei vorbefüllt ausgeliefert werden (ISO 3166-1) –
Länder tippt niemand freiwillig selbst ein. Da kaum ein Haushalt alle ~200 braucht, muss
sich die Liste ausdünnen lassen, ohne bereits erfasste Einkäufe zu beschädigen.

## Erwartetes Verhalten

1. Beim Einkauf lassen sich Herkunftsland und Güte optional angeben; beide dürfen leer
   bleiben.
2. Zwei Käufe, die sich **nur** in Herkunft oder Güte unterscheiden, bleiben getrennte
   Bestandseinträge. Käufe, die in allen Merkmalen übereinstimmen, werden weiterhin
   zusammengefasst.
3. Bestandseinträge und Bestandsjournal zeigen beide Werte an.
4. Der Preisverlauf eines Produkts vergleicht nur Gleiches mit Gleichem. Er trennt heute
   schon nach Geschäft; Herkunft und Güte verändern den Preis eines ansonsten identischen
   Produkts mindestens genauso stark und gehören deshalb ebenfalls in die Aufteilung –
   „Aldi, Bio, Deutschland" ist eine andere Reihe als „Aldi, Konventionell, Ungarn".
5. Nicht benötigte Länder und Güten lassen sich deaktivieren: sie verschwinden aus der
   Auswahl beim Einkauf, bleiben an bereits erfassten Einkäufen aber lesbar.
6. Wer die Attribute nicht nutzt, merkt von der Änderung nichts.

## Bewusst nicht Teil des Vorschlags

- **Kein Verbrauch nach Herkunft/Güte.** Verbrauchen bleibt FIFO bzw. nach
  Fälligkeitsdatum. Wer gezielt den Bio-Eintrag verbrauchen will, wählt ihn wie bisher
  über „Bestandseinträge" aus.
- **Keine Aufschlüsselung in der Bestandsübersicht.** Die Übersicht aggregiert weiter
  über alle Einkäufe eines Produkts – genau das ist ja der Zweck.
- **Keine Pflichtfelder und keine Migration bestehender Daten.**
- **Keine Vorbelegung aus dem letzten Einkauf.** Anders als beim Geschäft wäre das hier
  eher irreführend – die Herkunft wechselt ja gerade häufig.
