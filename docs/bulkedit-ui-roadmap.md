# Bulk-Edit UI Overhaul – Roadmap

Branch: `bulkedit` (basiert auf `test-deploy-01-branch`), Merge nach Freigabe in `test-deploy-01-branch`.

## Ziel
Zwei UX-Probleme der Bulk-Auswahl beheben. Die Bulk-Auswahl ist ein **geteiltes**
Feature (gleiche Komponente auf /stockentries, /locations, /tasks, /products, …),
daher werden die Fixes an zentraler Stelle gemacht und gelten überall.

## Probleme
1. **Zeilen-Highlight:** Beim Selektieren wird nur die Checkbox markiert, nicht die
   ganze Zeile. Gewünscht: die komplette Zeile leicht **bläulich** getönt, wobei die
   **Zebra-Streifung** (hell/dunkel jeder zweiten Zeile) sichtbar bleibt.
2. **Sticky Toolbar:** Die Bulk-Optionen-Leiste (`#bulk-edit-toolbar`) scrollt mit
   weg. Gewünscht: oben **fixiert** (sticky Overlay) unter der Navbar, bleibt beim
   Scrollen sichtbar.

## Betroffene Dateien (shared)
- `public/viewjs/components/bulkselect.js` – beim (De-)Selektieren eine Klasse
  `bulk-row-selected` auf die `<tr>` togglen (inkl. „Alle auswählen").
- `public/css/grocy.css` – Zeilen-Tönung (transluzent, damit Streifen durchscheinen)
  und Sticky-Positionierung der Toolbar.
- `public/css/grocy_night_mode.css` – Dark-Mode-Variante der Tönung.

## Ansatz

### Problem 1 – Zeilen-Highlight
- **JS** (`bulkselect.js`): bei `change` der Zeilen-Checkbox bzw. „Alle auswählen"
  `row.toggleClass('bulk-row-selected', checked)`. Beim `Reset()` alle entfernen.
- **CSS**: transluzenter Overlay, der die Streifung NICHT überdeckt:
  `tbody tr.bulk-row-selected > td { box-shadow: inset 0 0 0 9999px rgba(0,123,255,0.10); }`
  Das legt einen halbtransparenten Blau-Ton über die jeweilige Zeilenfarbe – die
  hell/dunkel-Streifung (und bestehende Zeilenfarben wie Fälligkeits-Rot/Gelb auf
  /stockentries) bleiben darunter sichtbar.
- **Dark Mode**: passende rgba-Blau-Tönung in `grocy_night_mode.css`.

### Problem 2 – Sticky Toolbar
- **CSS**: `#bulk-edit-toolbar { position: sticky; top: 56px; z-index: 1020; }`
  plus leichter Schatten. `56px` = Höhe der fixierten Navbar
  (`body.fixed-nav { padding-top: 56px }`). Die Toolbar hat bereits einen
  Hintergrund (`alert alert-secondary`), verdeckt also den durchscrollenden Inhalt.
- Randfall „embedded" (Dialog ohne Navbar): tolerierbar; ggf. später verfeinern.

## Iterationsplan (jeweils Zwischenstand zeigen, dann committen)
- **Iteration 1 – Zeilen-Highlight** (JS + CSS + Dark Mode) → im Browser auf
  /stockentries verifizieren: Streifung bleibt, Blau-Touch sichtbar, funktioniert
  zusammen mit Fälligkeits-Farben; Gegencheck /locations; Dark Mode.
- **Iteration 2 – Sticky Toolbar** (CSS) → verifizieren: runterscrollen, Leiste
  bleibt unter der Navbar sichtbar, liegt über der Tabelle (z-index), kein Layout-
  Sprung.

## Test
Lokale Grocy-Instanz (Demo-Modus) + Playwright-Screenshots (vorher/nachher) auf
/stockentries (viele Zeilen, Streifung, Zeilenfarben) und /locations (einfache Liste).

## Nicht im Scope (bewusst)
- Keine Änderung der Bulk-Aktionen selbst (Funktionslogik bleibt).
- Kein Redesign der Toolbar-Inhalte/Buttons.
