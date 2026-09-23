# Förderradar — Katalog und Alerts

Der Finder beantwortet Fragen. Der Förderradar beantwortet die Frage, die niemand
stellt: **„Ist heute etwas Neues dazugekommen, das zu mpool passt?"**

Er besteht aus drei geplanten Läufen:

| Lauf                          | Wann (UTC)                                                 | Was er tut                                                                                           |
| ----------------------------- | ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| **Ingest + Prioritätsalarm**  | täglich 05:15                                              | Quellen laden, gegen den Vortag vergleichen, Treffer vormerken, **sofort** Prioritätsmail            |
| **Prioritätsalarm (Nachhol)** | täglich 06:15                                              | Sicherheitsnetz: fehlgeschlagene oder abgebrochene Prioritätsmails nachholen                         |
| **Digest**                    | täglich 05:45, versendet nur am Wochentag `DIGEST_WEEKDAY` | Alle übrigen vorgemerkten Treffer (geändert, entfallen, neue unterhalb des Grenzwerts) als eine Mail |

## Ablauf

```
05:15  /api/cron/ingest
         │
         ├─ server/catalog/ingest.ts        Lauf-Lock nehmen, Quellen laden, diffen
         │    → catalog_changes             neu / geändert / entfallen, mit Themen-Score
         │
         └─ server/alerts/priority.ts       nur wenn der Ingest erfolgreich war
              → nicht beim Erstlauf
              → Kandidaten: kind = new, Score ≥ PRIORITY_ALERT_THRESHOLD, ≤ 72 h alt
              → Claim (DB) → Versand (Resend) → als gesendet markieren (DB)

06:15  /api/cron/priority-alert             dieselbe Funktion, holt Liegengebliebenes nach

05:45  /api/cron/digest                     am Versandtag: alles, was dem Prioritätsalarm
                                            nicht gehört, als Wochen-Digest
```

## Warum ein eigener Katalog

Eine Websuche kann nicht sagen, ob ein Programm _neu_ ist — sie kennt kein
Gestern. Zwei aufeinanderfolgende Momentaufnahmen einer amtlichen Quelle können
es sehr wohl:

- Eine ID, die gestern nicht da war → **neu**
- Eine ID, deren Inhalt sich geändert hat → **geändert** (mit Feld-Diff)
- Eine ID, die verschwunden ist → **entfallen**

Das ist der ganze Trick, und er ersetzt die handgepflegte Liste beendeter
Programme in [`src/data/foerderprogramme.ts`](../src/data/foerderprogramme.ts).

## Quellen

**Förderdatenbank des Bundes** — `https://www.foerderdatenbank.de/FDB/WS/export`
ZIP mit einem XML je Programm, täglich neu erzeugt, **CC BY 4.0** (Namensnennung
ist Pflicht und steht in jeder Alert-Mail). Gemessen am Export vom 08.09.2026:

| Kennzahl                                        | Wert                                                      |
| ----------------------------------------------- | --------------------------------------------------------- |
| Programme                                       | 2.536 geparst (Bund 661 · Land 1.831 · EU 45 · Kommune 1) |
| mit Link auf die Seite des Fördergebers         | 2.387 (94 %)                                              |
| mit Eintrag in der Förderdatenbank (immer)      | 2.536 (100 %)                                             |
| für Unternehmen bzw. Gründung antragsberechtigt | 1.581                                                     |
| davon mit mindestens einem mpool-Thema          | 402                                                       |

> **Die Website nicht crawlen.** `foerderdatenbank.de` liegt hinter einem
> Bot-Schutz (Radware); HTML-Aufrufe landen auf einer Prüfseite. Der Export-
> Endpunkt ist davon ausgenommen und die einzige vorgesehene Schnittstelle.

**EU Funding & Tenders Portal** — die anonyme Suche des Portals liefert die
offenen und angekündigten Calls (aktuell 1.213 Ergebnisse, davon 2 Dubletten im
Portal selbst, also 1.211 Programme). Zwei Eigenheiten, die je einen halben Tag
kosten können, beide in [`eu-source.ts`](../src/server/catalog/eu-source.ts):

1. Die Teile `query` und `languages` **müssen** als `application/json` gesendet
   werden, sonst antwortet die API nur mit `An internal error occurred`.
2. Es **muss** explizit sortiert werden. In der Standard-Relevanzordnung
   verschiebt das Portal Einträge zwischen den Seiten, während man blättert —
   gemessen: 1.211 und 1.204 Treffer in zwei aufeinanderfolgenden Läufen bei
   unverändertem Bestand. Der Diff hätte die Differenz als „entfallen" gemeldet.
   Mit `identifier ASC` kommen alle 1.213 Ergebnisse vollständig an.

## Was der Export kann und was nicht

- **Fristen sind nicht strukturiert.** Das Feld `Foerdertermin` ist in allen
  2.536 Dokumenten leer; Fristen stehen nur im Fließtext. Wir **zitieren** den
  Satz aus der Quelle, statt ein Datum daraus zu raten — bei rund 310 Programmen
  gelingt das, beim Rest steht bewusst nichts. Ein falsches Datum in einer
  Alarm-Mail wäre schlimmer als gar keins.
- **Kaputte Zeichen.** Die Quelle enthält Fragezeichen, wo Gedankenstriche und
  Anführungszeichen stehen müssten („Weiterbilden für die Zukunft ? Qualifizierung").
  [`repairTitle`](../src/lib/catalog/html.ts) repariert nur die eindeutigen Fälle
  (ein Fragezeichen zwischen Leerzeichen oder zwischen Ziffern, ein Paar um eine
  kurze Phrase) — eine echte Frage bleibt unangetastet.
- **Keine Kategorien für EU-Calls.** Das Portal kennt die deutsche
  Förderbereich-Taxonomie nicht, und seine Texte sind englisch. Deshalb tragen
  die Themenprofile zusätzlich englische Begriffe.

## Themen-Matching

[`src/config/topics.ts`](../src/config/topics.ts) übersetzt jede mpool-Leistung
aus `data/taxonomie.ts` in ein Suchprofil. Die Bewertung in
[`topic-match.ts`](../src/lib/alerts/topic-match.ts) ist deterministisch —
genau wie die Suchbewertung, und aus demselben Grund: jede Zahl in der Mail muss
erklärbar sein. Das gilt auch für den Prioritätsalarm: **kein Sprachmodell
entscheidet, was verschickt wird.**

| Signal                                        | Punkte      |
| --------------------------------------------- | ----------- |
| Eigener Begriff im Kern (Name, Teaser, Zweck) | 30, max. 60 |
| Derselbe Begriff nur tief im Volltext         | 12, max. 36 |
| Förderbereich der Quelle passt                | 20          |
| Umfeldbegriff (nur zusätzlich)                | 8, max. 24  |
| Thema steht im Programmnamen                  | 15          |

Zwei Regeln machen den Unterschied, beide am vollen Bestand gemessen:

1. **Ohne eigenen Begriff kein Treffer.** Ein grober Förderbereich plus
   Allerweltsvokabular ist kein Beleg. Vorher galten 1.172 Programme als
   relevant, darunter ein Ausbildungskostenzuschuss als
   „Nachhaltigkeitsberichterstattung".
2. **Wo ein Begriff steht, zählt.** In 16 KB Fließtext kommt „Energie" fast
   immer vor. Im Programmnamen bedeutet er etwas.

`requireAny` erzwingt zusätzlich einen Kontext, wo ein Begriff für sich zu
allgemein ist: „Weiterbildung" beschreibt hunderte Programme, „Weiterbildung zu
Klimaschutz" nicht.

### Nachjustieren

Läuft ein Thema zu heiß oder zu kalt, gibt es vier Stellschrauben — die ersten
drei in `config/topics.ts` bzw. `config/catalog.ts`, die vierte per Env:

- `threshold` pro Thema (Standard 45) — ab wann ein Programm überhaupt vorgemerkt wird
- Begriffe zwischen `primary` und `secondary` verschieben
- `requireAny` ergänzen
- `PRIORITY_ALERT_THRESHOLD` (Standard 70) — ab wann ein neues Programm sofort gemeldet wird

Danach `npm run catalog:preview` bzw. `npm run catalog:priority-preview` — beide
schreiben die Mail als HTML-Datei, ohne etwas zu verschicken.

## Prioritätsalarm

### Was hineinkommt

Ein Eintrag der Tabelle `catalog_changes` wird genau dann gemeldet, wenn **alle**
Bedingungen erfüllt sind:

| Regel                                                                                        | Wo                                     |
| -------------------------------------------------------------------------------------------- | -------------------------------------- |
| Der Ingest war erfolgreich und **kein Erstlauf** (der Erstlauf erzeugt gar keine Änderungen) | `ingest.ts`, `alertAfterIngest`        |
| `kind = 'new'` — geänderte und entfallene Programme bleiben dem Wochen-Digest                | `repository.ts`, `PRIORITY_CANDIDATES` |
| Programm ist für Unternehmen oder Gründungen offen und passt zu mindestens einem mpool-Thema | `ingest.ts`, `relevantMatches`         |
| Bester Themen-Score (`top_score`) ≥ `PRIORITY_ALERT_THRESHOLD`                               | SQL                                    |
| Erkannt vor höchstens **72 Stunden** (`PRIORITY_ALERT_WINDOW_HOURS`)                         | SQL                                    |
| Das Programm wurde **noch nie** als neu gemeldet — weder per Prioritätsalarm noch im Digest  | SQL, `NOT EXISTS` über `program_id`    |

Sortiert wird nach `top_score` absteigend, bei Gleichstand das jüngere zuerst.
Die besten `PRIORITY_ALERT_MAX_ENTRIES` kommen in die Mail; weitere Treffer über
dem Grenzwert werden als `deferred` markiert, in der Mail als Anzahl genannt und
erscheinen im nächsten Wochen-Digest. Gibt es keinen Treffer, geht **keine** Mail
raus.

Das 72-Stunden-Fenster hat zwei Aufgaben: Ein Programm, das drei Tage lang nicht
zugestellt werden konnte, ist kein Sofortalarm mehr — und beim erstmaligen
Einschalten des Features wird kein alter Rückstand als „neu" verschickt.

### Inhalt der Mail

[`lib/alerts/priority-email.ts`](../src/lib/alerts/priority-email.ts) — Tabellen-
Layout mit Inline-Styles (Outlook, Gmail), einspaltig und umbrechend für das
Smartphone, bester Treffer oben. Je Programm:

- **Priorität**: `SEHR HOHE PRIORITÄT` ab Score 90 (`PRIORITY_TOP_SCORE`), sonst
  `HOHE PRIORITÄT` — farbig markiert; der Betreff beginnt mit `[Hohe Priorität]`
- Rang, Score, Programmname (verlinkt), Kurzbeschreibung
- passende mpool-Themen mit Einzel-Score und die **konkreten Match-Gründe**
  aus `topic-match.ts` („Thema im Kern des Programms: csrd, esrs")
- Fördergeber, Förderart, Förderhöhe (falls die Quelle einen Abschnitt dazu hat),
  Zielgruppe, Region
- **Frist** in eindeutiger Form: strukturiertes Datum mit Resttagen
  („06.10.2026 – noch 21 Tage"), sonst das wörtliche Zitat der Quelle
  („Laut Quelle: „…""), sonst ausdrücklich „Keine Frist in der Quelle genannt"
- offizieller Link, Quelle (mit Link zum Eintrag in der Förderdatenbank bzw. im
  EU-Portal), Erkennungsdatum

### Versandstrategie: direkt nach dem Ingest plus Nachhol-Cron

Der Alarm läuft **im selben Aufruf direkt nach dem erfolgreichen Ingest**
(`/api/cron/ingest`). Früher lässt sich „neu" nicht wissen, und ein eigener Cron
mit festem Abstand wäre entweder zu früh (Ingest noch nicht fertig) oder
unnötig spät.

Allein wäre das aber zerbrechlich: Der Ingest nutzt den Großteil seiner
`maxDuration = 300`, ein Resend-Ausfall träfe genau diesen einen Versuch. Deshalb
gibt es zusätzlich den geschützten Endpunkt **`/api/cron/priority-alert`**,
täglich um 06:15 UTC. Er führt dieselbe Funktion aus, holt fehlgeschlagene und
abgebrochene Zustellungen nach und lässt sich jederzeit manuell auslösen. Weil
jeder Aufruf idempotent ist, ist es egal, ob beide Wege laufen, ob Vercel einen
Cron doppelt zustellt oder ob der Nachhol-Cron zufällig vor dem Ingest startet.

### Dublettenschutz und Exakt-einmal-Verhalten

Echte Exakt-einmal-Zustellung gibt es mit einem externen Mailanbieter nicht.
Soweit praktisch erreichbar, sorgen fünf Mechanismen dafür:

1. **Eine offene Zustellung zur Zeit.** Ein partieller Unique-Index
   (`alert_deliveries_open_idx`) erlaubt pro Art höchstens eine Zustellung im
   Status `sending` oder `failed`. Ein paralleler zweiter Aufruf scheitert schon
   beim Anlegen und meldet „Versand läuft bereits".
2. **Atomarer Claim.** Die Kandidaten werden in **einem** `UPDATE … WHERE
priority_status IS NULL` der Zustellung zugeordnet. Kein Eintrag kann in zwei
   Zustellungen landen, und der Inhalt einer Zustellung ist ab dann eingefroren.
3. **Erst senden, dann markieren — mit Lease.** Jede Zustellung trägt ein
   `lease_token` und `lease_until` (15 Minuten, länger als jede Funktion laufen
   darf). Als `sent` markiert wird nur nach Annahme durch Resend und nur von dem
   Lauf, der das Lease noch hält — Zustellung und Einträge in einer Anweisung.
4. **Idempotenzschlüssel bei Resend.** Eine wiederholte Zustellung wird mit
   identischem Inhalt (Datum = Anlagezeitpunkt der Zustellung) und demselben
   Schlüssel `foerderradar-priority-<id>-<hash>` gesendet. Resend verwirft ein
   Duplikat innerhalb von 24 Stunden. Das deckt den einzigen Spalt ab, den die
   Datenbank nicht schließen kann: Absturz nach dem Versand, vor dem Markieren.
5. **Keine Überschneidung mit dem Digest.** Solange der Prioritätsalarm aktiv
   ist, gehört ein neues Programm über dem Grenzwert innerhalb des Fensters
   ausschließlich ihm. Der Digest nimmt es erst, wenn es zurückgestellt
   (`deferred`) oder aufgegeben (`expired`) wurde oder älter als 72 Stunden ist
   — und nie, wenn das Programm schon per Prioritätsalarm gemeldet wurde.

Zusätzlich hält der Ingest eine Sperre in `catalog_locks` (10 Minuten, läuft von
selbst aus): Zwei gleichzeitige Ingests würden sonst beide dieselben Programme
als neu eintragen. Der zweite Aufruf antwortet mit **409**. Bewusst keine
Postgres-Advisory-Locks über Sitzungen hinweg — die funktionieren hinter einem
Transaktions-Pooler (Neon, Vercel Postgres) nicht zuverlässig.

### Zustände

| Tabelle / Spalte                       | Werte                                                                                                        |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `catalog_changes.priority_status`      | `NULL` unbearbeitet · `claimed` in Zustellung · `sent` gemeldet · `deferred` an Digest · `expired` an Digest |
| `catalog_changes.priority_notified_at` | Zeitpunkt der erfolgreichen Prioritätsmail                                                                   |
| `alert_deliveries.status`              | `sending` · `failed` (wartet auf Wiederholung) · `sent` · `abandoned` (älter als 72 h)                       |

Alle Spalten und Tabellen werden von `ensureSchema()` additiv angelegt
(`ADD COLUMN IF NOT EXISTS`, `CREATE TABLE IF NOT EXISTS`). Bestehende Daten und
der bisherige Digest bleiben unverändert nutzbar; `ensureSchema` läuft unter einer
transaktionsgebundenen Advisory-Sperre, damit gleichzeitige Erstaufrufe nicht an
`CREATE TABLE` kollidieren.

### Fehlerverhalten

| Situation                                         | Verhalten                                                                                                               |
| ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Resend lehnt ab oder ist nicht erreichbar         | Zustellung `failed`, Einträge bleiben `claimed`. Frühestens nach 5 Minuten wiederholt der nächste Aufruf dieselbe Mail. |
| Funktion bricht zwischen Claim und Versand ab     | Lease läuft nach 15 Minuten ab, der nächste Aufruf übernimmt die eingefrorene Zustellung.                               |
| Abbruch zwischen Versand und Markierung           | Wiederholung mit demselben Idempotenzschlüssel; Resend nimmt sie nicht als zweite Mail an (24 h).                       |
| Zustellung auch nach 72 Stunden nicht erfolgreich | `abandoned`; Einträge `expired` und damit im nächsten Wochen-Digest — nichts wird verschluckt.                          |
| Mailversand nicht konfiguriert                    | Nichts wird geclaimt; die Treffer bleiben offen, bis Resend eingerichtet ist.                                           |
| `PRIORITY_ALERT_ENABLED=false` oder ungültig      | Nichts wird geclaimt; der Digest übernimmt neue Programme wie vor dem Feature.                                          |
| Ungültiger Grenzwert oder Höchstzahl              | Standardwert (70 bzw. 10), Warnung im Log und in der Vorschau.                                                          |
| Ingest schlägt fehl                               | Kein Alarm (500).                                                                                                       |
| Prioritätsalarm wirft nach erfolgreichem Ingest   | Ingest-Antwort bleibt 200, mit `priorityAlert.error`; der Nachhol-Cron versucht es erneut.                              |
| Nachhol-Cron: Versand fehlgeschlagen              | 502 mit Fehlertext (im Vercel-Cron-Log sichtbar), Treffer bleiben vorgemerkt.                                           |
| Zweiter Ingest während eines laufenden            | 409, nichts wird doppelt eingetragen.                                                                                   |

## Konfiguration

Alle Variablen stehen mit Kommentar in [`.env.example`](../.env.example).

| Variable                     | Pflicht | Standard | Bedeutung                                                                          |
| ---------------------------- | ------- | -------- | ---------------------------------------------------------------------------------- |
| `DATABASE_URL`               | ja      | —        | Postgres; `POSTGRES_URL` wird ebenfalls akzeptiert                                 |
| `CRON_SECRET`                | ja      | —        | Schützt `/api/cron/*` und `/api/alerts/preview`; ohne Secret antworten sie mit 401 |
| `RESEND_API_KEY`             | ja      | —        | Mailversand                                                                        |
| `ALERT_FROM`                 | ja      | —        | Absender, Domain bei Resend verifiziert                                            |
| `ALERT_RECIPIENTS`           | ja      | —        | Komma-getrennt; gilt für Digest **und** Prioritätsalarm                            |
| `DIGEST_WEEKDAY`             | nein    | `1`      | Versandtag des Digests (0 = Sonntag)                                               |
| `PRIORITY_ALERT_ENABLED`     | nein    | `true`   | `true`/`false` (auch `1`/`0`, `on`/`off`, `ja`/`nein`). **Ungültig → aus.**        |
| `PRIORITY_ALERT_THRESHOLD`   | nein    | `70`     | Ganze Zahl 0–100. Ungültig → 70.                                                   |
| `PRIORITY_ALERT_MAX_ENTRIES` | nein    | `10`     | Ganze Zahl 1–50. Ungültig → 10.                                                    |
| `NEXT_PUBLIC_BASE_URL`       | nein    | —        | Link „Im Förderprogramm-Finder weitersuchen" in den Mails                          |

Feste Werte (keine Env, bewusst in [`config/catalog.ts`](../src/config/catalog.ts)):
Zeitfenster 72 h, Lease 15 min, Wiederholpause 5 min, Ingest-Sperre 10 min,
„Sehr hohe Priorität" ab Score 90.

Secrets gehören ausschließlich in die Vercel-Umgebungsvariablen bzw. die
git-ignorierte `.env.local`.

## Cron

[`vercel.json`](../vercel.json):

| Pfad                       | Zeitplan     | Zweck                                            |
| -------------------------- | ------------ | ------------------------------------------------ |
| `/api/cron/ingest`         | `15 5 * * *` | Katalog-Lauf, danach sofort der Prioritätsalarm  |
| `/api/cron/digest`         | `45 5 * * *` | Wochen-Digest, versendet nur am `DIGEST_WEEKDAY` |
| `/api/cron/priority-alert` | `15 6 * * *` | Nachholen fehlgeschlagener Prioritätsmails       |

Vercel Cron sendet `Authorization: Bearer $CRON_SECRET`. Auf Plänen, die Crons
nicht minutengenau auslösen, kann sich die Reihenfolge verschieben — das ist
unkritisch, weil jeder Aufruf idempotent ist und der Ingest den Alarm ohnehin
selbst anstößt.

## Vorschau und lokaler Test

### Vorschau im Browser (sendet und markiert nichts)

```
/api/alerts/preview?type=priority&secret=…              nächste Prioritätsmail als HTML
/api/alerts/preview?type=priority&format=json&secret=…  Betreff, Anzahl, Konfiguration, Warnungen
/api/alerts/preview?secret=…                            Wochen-Digest (wie bisher)
```

Die Vorschau zeigt die offene Zustellung, sonst die aktuellen Kandidaten. Gibt es
keine, zeigt sie zuletzt erkannte neue Programme über dem Grenzwert als
gekennzeichnete Beispielansicht. Ein gelber Hinweis oben nennt ungültige
Env-Werte und dass nichts versendet wird.

### Lokaler Dry-Run (keine echte E-Mail)

```bash
npm run catalog:priority-preview                 # DB lesen → priority-alert.html
npm run catalog:priority -- --dry-run            # dasselbe
npm run catalog:demo                             # ohne DB: Live-Daten → digest.html + priority-alert.html
npm run catalog:ingest -- --no-alert             # Ingest ohne Prioritätsalarm
```

`npm run catalog:priority` (ohne `--dry-run`) verschickt tatsächlich — lokal nur
mit Test-Empfängern verwenden oder `RESEND_API_KEY` leer lassen (dann bleibt
alles offen und die Antwort sagt „Mailversand nicht konfiguriert").

### Automatisierte Tests

```bash
npm test
```

Die Tests laufen gegen ein In-Process-Postgres (PGlite) und einen **gefälschten
Mailer** — kein Netzwerk, keine echte Mail. Abgedeckt: nur neue Änderungen,
Score-Sortierung, Grenzwert, Höchstzahl mit Zurückstellen, keine Wiederholung
(auch nicht nach Wiederauftauchen), leerer Bestand, Mailfehler mit identischer
Wiederholung, Absturz nach dem Claim, erster Import, paralleler Ingest,
parallele Aufrufe, Zeitfenster, Aufteilung mit dem Digest, ungültige Env-Werte,
Mail-Inhalt und Fristdarstellung.

PGlite führt Anweisungen nacheinander aus. Echte Nebenläufigkeit über mehrere
Verbindungen prüft ein zusätzlicher Test gegen einen Postgres-Server — in einem
Wegwerf-Schema, das danach gelöscht wird:

```bash
TEST_DATABASE_URL=postgres://<benutzer>@localhost:5432/foerderradar \
  npx tsx --test tests/priority-alert.postgres.test.ts
```

### Den Diff von Hand auslösen

Nach dem Erstlauf ein paar Zeilen entfernen und erneut ingesten — die
betroffenen Programme tauchen dann als „neu" auf und durchlaufen den
Prioritätsalarm (mit `--no-alert` bzw. ohne `RESEND_API_KEY` ohne Versand):

```sql
DELETE FROM catalog_programs WHERE id IN (
  SELECT id FROM catalog_programs ORDER BY random() LIMIT 5
);
```

`npm run catalog:demo` lädt beide Quellen live, bewertet alles gegen die
mpool-Themen und **speichert nichts** — das Richtige beim Justieren der
Themenprofile:

```bash
npm run catalog:demo                       # lädt den Export frisch (~28 MB)
npm run catalog:demo -- --file export.zip  # nutzt einen bereits geladenen Export
npm run catalog:demo -- --no-eu            # nur die deutsche Förderdatenbank
```

## Lokale Datenbank zum Entwickeln

Für die Entwicklung reicht ein Postgres auf dem eigenen Rechner, ohne Konto bei
irgendeinem Anbieter:

```bash
brew install postgresql@17
LC_ALL=en_US.UTF-8 /opt/homebrew/opt/postgresql@17/bin/pg_ctl \
  -D /opt/homebrew/var/postgresql@17 -l /tmp/pg17.log start
/opt/homebrew/opt/postgresql@17/bin/createdb foerderradar
```

Das `LC_ALL` ist unter macOS nicht optional — ohne gesetzte Locale bricht der
Server mit `postmaster became multithreaded during startup` ab. Danach in
`.env.local`:

```
DATABASE_URL=postgres://<benutzername>@localhost:5432/foerderradar
```

Stoppen mit demselben Befehl und `stop` statt `start`. Der Server startet nicht
von allein beim Anmelden — dafür wäre `brew services start postgresql@17` nötig.

## Einrichtung

1. **Postgres anlegen** (Vercel Postgres oder Neon) und `DATABASE_URL` setzen.
   Das Schema legt der erste Lauf selbst an — auch die Tabellen des
   Prioritätsalarms bei einer bestehenden Datenbank.
2. **`CRON_SECRET` erzeugen:** `openssl rand -hex 32`. Vercel Cron sendet es als
   `Authorization: Bearer …`; manuell geht `?secret=…`. Ohne gesetztes Secret
   antworten die Endpunkte mit 401 — ein offener Ingest-Endpunkt wäre eine
   Einladung, uns 28 MB im Dauerlauf ziehen zu lassen.
3. **Resend einrichten:** Absenderdomain verifizieren, dann `RESEND_API_KEY`,
   `ALERT_FROM` und `ALERT_RECIPIENTS` setzen.
4. **Prioritätsalarm prüfen:** `PRIORITY_ALERT_*` setzen oder die Standards
   übernehmen; `/api/alerts/preview?type=priority&format=json` zeigt die
   wirksame Konfiguration und etwaige Warnungen.
5. **Erstlauf:** `npm run catalog:ingest`. Der erste Lauf **meldet nichts** — er
   baut nur den Bestand auf. Sonst stünden 402 Programme als „neu" in der ersten
   Mail. Ab dem zweiten Lauf sind Meldungen echte Veränderungen.

Lokal einen bereits geladenen Export verwenden:

```bash
npm run catalog:ingest -- --file /pfad/zu/export.zip
```

## Endpunkte

| Route                      | Zweck                                                                                 |
| -------------------------- | ------------------------------------------------------------------------------------- |
| `/api/cron/ingest`         | täglicher Lauf; Laufbericht plus `priorityAlert` als JSON; 409 bei parallelem Lauf    |
| `/api/cron/priority-alert` | offene Prioritätsmails senden bzw. nachholen; 502 bei Versandfehler                   |
| `/api/cron/digest`         | Versand; `?force=1` ignoriert den Versandtag                                          |
| `/api/alerts/preview`      | Digest (`?type=digest`) oder Prioritätsmail (`?type=priority`) als HTML, ohne Versand |

Alle vier verlangen `CRON_SECRET`.

## Betrieb

- **Ein Lauf dauert** im Wesentlichen so lange wie der 28-MB-Download. Die Route
  ist auf `maxDuration = 300` gesetzt; auf Plänen mit kürzerem Limit muss der
  Ingest außerhalb laufen (`npm run catalog:ingest` auf einem eigenen Rechner —
  der Prioritätsalarm läuft dort ebenfalls direkt danach).
- **Ausgefallene Quelle:** Antwortet eine Quelle nicht, gilt sie als
  fehlgeschlagen und **ihre** Programme werden nicht als entfallen gemeldet. Ein
  Ausfall des EU-Portals darf nicht tausend Fehlalarme auslösen.
- **Karenzzeit vor „entfallen":** Ein Programm muss 36 Stunden lang fehlen, bevor
  es gemeldet wird — bei täglichem Lauf also in zwei Läufen hintereinander. Quellen
  sind zwischen zwei Abrufen nicht perfekt stabil; die Verzögerung kostet nichts,
  ein Fehlalarm kostet Vertrauen.
- **Reihenfolge beim Versand:** erst senden, dann als versendet markieren. Ein
  Absturz dazwischen wiederholt eine Mail — beim Prioritätsalarm fängt der
  Idempotenzschlüssel das ab, beim Digest ist es heilbar; ein still verschluckter
  Alarm wäre es nicht.
- **Leere Läufe:** Es geht keine Mail raus, weder beim Prioritätsalarm noch beim
  Digest. Ein „nichts Neues" erzieht Leser dazu, den Absender zu filtern.
- **Nachsehen, was lief:**

  ```sql
  SELECT started_at, status, report FROM catalog_runs ORDER BY id DESC LIMIT 10;

  SELECT id, status, attempts, entries, created_at, sent_at, lease_until, last_error
    FROM alert_deliveries ORDER BY id DESC LIMIT 10;

  SELECT program_id, top_score, priority_status, priority_notified_at, notified_at
    FROM catalog_changes WHERE kind = 'new' ORDER BY detected_at DESC LIMIT 20;
  ```

- **Hängende Zustellung von Hand freigeben** (nur wenn klar ist, dass nichts
  verschickt wurde): `UPDATE alert_deliveries SET lease_until = NOW() WHERE
status IN ('sending','failed');` — der nächste Aufruf übernimmt sie.

## Datenformat-Migration (CATALOG_SCHEMA_VERSION)

Ändert sich das gespeicherte Datenformat des Katalogs (`CATALOG_SCHEMA_VERSION`
in `config/catalog.ts`), ist der erste Ingest danach ein **Migrationslauf**: der
Bestand wird neu geschrieben, es entstehen keine `catalog_changes` und keine
Mails (`report.seeded = true`, `report.migration = true`). Erst der Lauf danach
meldet wieder Neues. Bis zum Migrationslauf haben Katalogeinträge keinen
gelesenen Sperrvermerk und gelten in der Suche als Antragsstatus UNBEKANNT —
nach einem Deploy daher `/api/cron/ingest` einmal manuell auslösen.
