# Test-Dokumentation: Equipment-Standorte & Equipmentgruppen

Diese Datei dokumentiert die Tests und Testergebnisse für zwei Erweiterungen der
Equipment-Verwaltung:

1. **Equipment-Standorte** – Equipment referenziert einen (ggf. verschachtelten)
   Standort aus der bestehenden Standort-Hierarchie; Standort und Substandort
   ergeben sich aus dem Pfad (z. B. `Küche › Schrank`). Migration `0265`.
2. **Equipmentgruppen** – eigenständige Entität `equipment_groups` (unabhängig von
   `product_groups`); `equipment.product_group_id` wurde durch
   `equipment_group_id` ersetzt. Migration `0269`.

---

## Automatisierte Playwright-E2E-Tests

**Skript:** [`tests/e2e/equipment-groups.e2e.js`](../tests/e2e/equipment-groups.e2e.js)
**Ausgeführt:** 2026-07-07 gegen eine lokale Dev-Instanz (`MODE=dev`, Demo-Daten,
Migrationsstand `0269`, SQLite).
**Ergebnis:** **16 / 16 Checks bestanden.**

| # | Check | Ergebnis |
|---|-------|----------|
| T0 | Login (Session per Formular-POST) | PASS |
| T1 | `/equipmentgroups`-Seite lädt (`#equipmentgroups-table`) | PASS |
| T1 | Menüeintrag „Equipment groups" unter Stammdaten vorhanden | PASS |
| T2 | Equipmentgruppe über das Formular anlegen → API-POST `200` | PASS |
| T2 | Gruppe via `GET /api/objects/equipment_groups` persistiert | PASS |
| T2 | Default `active = 1` | PASS |
| T3 | Equipment-Formular hat Dropdown „Equipment group" | PASS |
| T3 | Equipment-Formular hat Dropdown „Location" | PASS |
| T3 | **kein** Alt-Feld `#product_group_id` mehr vorhanden | PASS |
| T3 | `equipment.location_id` nach Speichern gesetzt (API-PUT) | PASS |
| T3 | `equipment.equipment_group_id` nach Speichern gesetzt | PASS |
| T3 | Spalte `product_group_id` existiert nicht mehr am Objekt | PASS |
| T4 | Übersicht hat Spalte „Equipment group" | PASS |
| T4 | Übersichtszeile zeigt die zugewiesene Gruppe | PASS |
| T5 | Gruppe erscheint in der Equipmentgruppen-Liste | PASS |
| T5 | „Equipment count" der Gruppe = 1 | PASS |

Die Tests prüfen bewusst **beide Wege** (Web-UI *und* REST-API) sowie den
Migrations-Effekt (neue Spalte vorhanden, Alt-Spalte entfernt).

### Lokale Testumgebung (Reproduktion)

```bash
composer install --ignore-platform-req=php   # PHP-Abhängigkeiten
yarn install                                 # Frontend-Pakete -> public/packages
cp config-dist.php data/config.php           # MODE=dev: Demo-Daten + Admin-User
GROCY_DATAPATH="$PWD/data" php -S 127.0.0.1:8095 -t public router.php &
npm i playwright
GROCY_BASE_URL=http://127.0.0.1:8095 \
PW_CHROMIUM=/opt/pw-browsers/chromium-1194/chrome-linux/chrome \
node tests/e2e/equipment-groups.e2e.js
```

> **Hinweis zur Testumgebung:** Der Fork verlangt PHP `8.5.*`
> (`helpers/PrerequisiteChecker.php`), die Testumgebung hatte PHP `8.4.19`. Für
> den lokalen Testlauf wurde die Versionsprüfung **temporär und uncommitted**
> herabgesetzt; die Prüfung im Repo bleibt bei `8.5.0`. Dies betrifft nur den
> lokalen Boot, nicht die getestete Fachlogik.

---

## Manuelles Testergebnis (Nutzer)

- **Equipment-Standorte:** vom Nutzer auf der test-deploy-Instanz getestet und für
  gut befunden („Der Test sieht gut aus für die Equipment locations").
- **Equipmentgruppen:** vom Nutzer getestet und **als zufriedenstellend bestätigt**
  („Ich habe es getestet und bin zufrieden.").

Damit sind beide Erweiterungen sowohl automatisiert (Playwright, 16/16) als auch
manuell durch den Nutzer verifiziert.
