# FörderprogrammFinder

Webanwendung zur Recherche deutscher und europäischer Förderprogramme. Unternehmen beschreiben ihr Vorhaben oder setzen Filter. Die Anwendung führt Katalogdaten und Ergebnisse einer Websuche zusammen und zeigt passende Programme mit Quellenlinks.

Das Projekt entstand bei mpool consulting im Rahmen von Öko.HUB. Dieses Repository enthält die weiterentwickelte Fassung mit Programmkatalog und Förderradar.

## Funktionen

- Förderprogramme nach Region, Förderart und weiteren Kriterien suchen.
- Ergebnisse mit amtlichen Katalogdaten abgleichen und unbekannte Angaben kennzeichnen.
- Programme merken, als Excel-Datei exportieren und Rückfragen zu einem Programm stellen.
- Änderungen am Katalog erkennen und über konfigurierte E-Mail-Benachrichtigungen melden.

## Technischer Aufbau

Next.js 14, React und TypeScript bilden Oberfläche und API. PostgreSQL speichert den Katalog. Perplexity und Gemini werden für die Websuche eingesetzt; feste Förderkriterien prüft der Server anhand gemeinsamer Regeln. Resend übernimmt den optionalen E-Mail-Versand.

Die Suche liefert Recherchehinweise. Maßgeblich bleiben die aktuellen Bedingungen des jeweiligen Fördergebers; unvollständige Quelldaten können nicht durch eine Modellantwort ersetzt werden.

## Lokal starten

Voraussetzung: Node.js gemäß `.nvmrc` bzw. `engines` in `package.json` sowie npm.

```bash
npm ci
cp .env.example .env.local
npm run dev
```

Vor dem Start die benötigten Werte in `.env.local` eintragen. Die Oberfläche ist anschließend unter `http://localhost:3000` erreichbar.

- Für die Websuche: `PERPLEXITY_API_KEY` oder `GEMINI_API_KEY`.
- Für Rückfragen zu einzelnen Programmen: `GEMINI_API_KEY`.
- Für Katalog und Förderradar: `DATABASE_URL`; für geplante Aufrufe zusätzlich `CRON_SECRET`.
- Für Benachrichtigungen: die Resend- und Empfängereinstellungen aus [`.env.example`](.env.example).

Ohne Datenbankverbindung steht die Websuche zur Verfügung; Katalog und Förderradar benötigen PostgreSQL. Zugangsdaten gehören ausschließlich in die lokale oder serverseitige Konfiguration.

## Prüfen und bauen

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

Die Tests prüfen unter anderem Förderkriterien, Zusammenführung von Suchergebnissen, Anbieter-Fallbacks und den Versandstatus von Benachrichtigungen. Datenbanktests verwenden PGlite. Der zusätzliche Test mit einem PostgreSQL-Server benötigt eine separate `TEST_DATABASE_URL`.

`npm run verify` führt TypeScript-Prüfung, Linter und Build aus. Die Tests werden separat mit `npm test` gestartet.

## Orientierung im Code

| Verzeichnis | Inhalt |
| --- | --- |
| `src/app` | Seiten und API-Endpunkte |
| `src/components`, `src/hooks` | Oberfläche und clientseitiger Zustand |
| `src/lib/facts`, `src/lib/search` | Förderkriterien, Bewertung und Zusammenführung |
| `src/server/catalog` | Datenimport, PostgreSQL und Katalogsuche |
| `src/server/alerts` | E-Mail-Benachrichtigungen |
| `tests` | Automatisierte Tests |

[Architektur](docs/ARCHITECTURE.md) und [Förderradar](docs/MONITORING.md) beschreiben die Abläufe ausführlicher. Die `catalog:*`-Skripte in `package.json` dienen der Administration. Befehle für Digest und Prioritätsmeldungen können E-Mails versenden und sollten nur mit bewusst gewählter Konfiguration ausgeführt werden.
