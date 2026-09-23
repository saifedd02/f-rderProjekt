# Förderprogramm-Finder

Ein KI-gestützter Finder für deutsche Förderprogramme (Bund, Länder, EU) von
**mpool Consulting**. Nutzer beschreiben ihr Vorhaben im Chat oder setzen Filter;
die App durchsucht einen täglich aktualisierten Katalog der amtlichen Quellen,
ergänzt ihn um eine Live-Websuche und zeigt bewertete, nachvollziehbare
Programmvorschläge.

Zusätzlich läuft der **Förderradar**: ein täglicher Abgleich, der neue,
geänderte und entfallene Programme erkennt. Neue Programme, die stark zu den
mpool-Leistungen passen, gehen direkt nach dem Abgleich als **Prioritätsalarm**
per E-Mail raus; alles Übrige kommt montags im Wochen-Digest. Details:
[`docs/MONITORING.md`](docs/MONITORING.md).

## Kernprinzip

**Das Sprachmodell schlägt vor — der Server entscheidet.**

Ein LLM liefert Kandidaten aus einer Websuche. Alles, was der Nutzer am Ende
sieht, wird deterministisch serverseitig bestimmt:

| Entscheidung              | Wo                                                                           |
| ------------------------- | ---------------------------------------------------------------------------- |
| Ist ein Programm neu?     | `server/catalog/ingest.ts` (Diff zweier Momentaufnahmen)                     |
| Ist ein Link echt?        | Katalog: der Fördergeber selbst · Websuche: `server/search/link-resolver.ts` |
| Harte Fakten (feste Werte)| `lib/facts/*` (Katalog: `catalog.ts`, Web-Extraktion: `web.ts`)              |
| Ist ein Programm zulässig?| `lib/facts/check.ts` — eine Prüfung für Suche und Alerts                     |
| Wie relevant ist es?      | `lib/search/scoring.ts` (nur Relevanz, keine harten Kriterien)               |
| Was steht in der Antwort? | `lib/search/reply.ts`                                                        |

Harte Kriterien (Region, Antragsstatus, Antragsberechtigung, Größe, Förderart)
werden auf feste Codes normalisiert und deterministisch geprüft; `UNBEKANNT`
führt nie zu „gültig“. Ein halluziniertes "noch aktiv" oder ein erfundener Link
erreicht die Oberfläche nicht.

## Schnellstart

```bash
nvm use                 # Node 20+
npm install
cp .env.example .env.local   # Keys eintragen
npm run dev             # http://localhost:3000
```

Mindestens ein Such-Key wird benötigt (`PERPLEXITY_API_KEY` oder
`GEMINI_API_KEY`). Für den Chat zu einem einzelnen Programm ist zusätzlich
`GEMINI_API_KEY` erforderlich. Für Katalog und Förderradar kommen `DATABASE_URL`,
`CRON_SECRET`, die Resend-Variablen und optional `PRIORITY_ALERT_*` dazu. Alle
Variablen sind in [`.env.example`](.env.example) dokumentiert.

Ohne `DATABASE_URL` läuft die App unverändert weiter — dann eben nur mit
Websuche, ohne Katalog und ohne Alerts.

## Skripte

| Befehl                             | Zweck                                                          |
| ---------------------------------- | -------------------------------------------------------------- |
| `npm run dev`                      | Entwicklungsserver                                             |
| `npm run build`                    | Produktions-Build                                              |
| `npm start`                        | Produktions-Server                                             |
| `npm run typecheck`                | TypeScript ohne Emit                                           |
| `npm run lint`                     | ESLint (next/core-web-vitals)                                  |
| `npm run format`                   | Prettier über das ganze Repo                                   |
| `npm test`                         | Automatisierte Tests (PGlite, gefälschter Mailer)              |
| `npm run verify`                   | typecheck + lint + build (vor jedem Push)                      |
| `npm run catalog:ingest`           | Katalog laden, mit dem Vortag abgleichen, Prioritätsalarm      |
| `npm run catalog:preview`          | Digest als `digest.html` schreiben, ohne Versand               |
| `npm run catalog:digest`           | Digest tatsächlich verschicken                                 |
| `npm run catalog:priority-preview` | Nächste Prioritätsmail als `priority-alert.html`, ohne Versand |
| `npm run catalog:priority`         | Offene Prioritätsmails tatsächlich verschicken                 |

## Projektstruktur

```
src/
├── app/            Next.js App Router — nur Routing, Layout und dünne API-Handler
│   └── api/        /api/chat (Programmsuche) · /api/program-chat (Rückfragen)
│                   /api/cron/* (Katalog-Lauf, Prioritätsalarm, Digest) · /api/alerts/preview
├── components/     React-Komponenten, nach Domäne gruppiert
│   ├── chat/       Eingabe, Transkript, Tipp-Indikator, Programm-Modal
│   ├── layout/     Header, Sitzungs-Sidebar
│   ├── programs/   Programmkarte, Filter, Merkliste
│   └── workspace/  App-Shell und Willkommensbildschirm
├── config/         Konstanten: App-Verhalten, vertrauenswürdige Domains
├── data/           taxonomie.ts (kontrolliertes Vokabular) · foerderprogramme.ts (kuratierte DB)
├── hooks/          useChatSessions (Sitzungen + Suche) · useFavorites (Merkliste)
├── lib/            Framework-unabhängige Logik
│   ├── ai/         Provider-Clients: Perplexity (primär), Gemini (Fallback)
│   ├── alerts/     Themen-Matching, Digest- und Prioritätsmail, Alarm-Konfiguration
│   ├── catalog/    XML/HTML-Parsing, Diff, Abbildung auf die Programmkarte
│   ├── export/     Excel-Export der Merkliste
│   ├── search/     Die Suchpipeline (siehe unten)
│   └── utils/      Text-, Datums-, Id- und Logging-Helfer
├── server/         Serverseitige Orchestrierung (nie im Browser gebündelt)
│   ├── alerts/     Digest-Lauf, Prioritätsalarm und Mailversand (Resend)
│   ├── catalog/    Quellen, Postgres, Ingest, Katalogsuche
│   ├── cron/       Absicherung der geplanten Endpunkte
│   ├── program-chat/ Prompt für Rückfragen zu einem Programm
│   └── search/     Prompt, Schema, Link-Auflösung, Provider, Service
└── types/          Domänentypen: program · filters · chat · database
tests/              node:test-Suites für den Förderradar
```

Details und Designentscheidungen: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## Suchpipeline

```
Nutzeranfrage + Filter
   │
   ├─ server/catalog/search.ts    Volltextsuche im eigenen Katalog (Postgres, deutsch)
   │                              → Programme mit dem Link des Fördergebers
   │
   └─ server/search/prompt.ts     Prompt (heutiges Datum, bereits gezeigte Programme)
      → lib/ai/perplexity.ts      Websuche mit Quellen pro Programm  (Fallback: lib/ai/gemini.ts)
      → server/search/link-resolver  Offiziellen Link + Quellen bestimmen
      → lib/search/reconcile.ts   Gegen kuratierte DB abgleichen (beendete Programme fliegen raus)
   │
   ▼  beide Quellen, dieselben Regeln
   → lib/search/catalog-match.ts  Web-Treffer übernehmen Katalogfakten
   → lib/facts/check.ts           Harte Kriterien (GÜLTIG / UNGEPRÜFT / AUSGESCHLOSSEN)
   → lib/search/scoring.ts        Relevanz (nur Thema), gültige vor ungeprüften
   → server/search/service.ts     Zusammenführen (Katalog gewinnt bei Dubletten)
   → lib/search/reply.ts          Antworttext
```

Und einmal täglich, unabhängig davon:

```
server/catalog/ingest.ts
   → Förderdatenbank-Export + offene EU-Calls laden
   → gegen die Momentaufnahme des Vortags diffen  (neu / geändert / entfallen)
   → lib/alerts/topic-match.ts    Gegen die mpool-Themen bewerten
   → server/alerts/priority.ts    Neue Treffer ab Grenzwert sofort: lib/alerts/priority-email.ts → Resend
   → montags: lib/alerts/digest-email.ts → Resend
```

## Konventionen

- **Import-Alias:** `@/*` zeigt auf `src/*`. Keine tiefen relativen Pfade.
- **Schichtregel:** `app/` → `components/`, `hooks/`, `server/` → `lib/` → `config/`, `types/`.
  `lib/` kennt weder React noch Next.js.
- **Grenze Server/Client:** Alles unter `server/` und `lib/ai/` läuft ausschließlich
  serverseitig — API-Keys dürfen niemals im Client-Bundle landen.
- **Sprache:** Code, Bezeichner und Kommentare auf Englisch; alle nutzersichtbaren
  Texte auf Deutsch.
