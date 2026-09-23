# Architektur

Ergänzung zur [README](../README.md): warum die Dinge so liegen, wie sie liegen.

## Schichten

```
app/          Routing, Layout, dünne HTTP-Handler
  ↓
components/   Darstellung          hooks/   Client-Zustand
  ↓                                  ↓
server/       Orchestrierung (nur Server): search/, catalog/, alerts/, cron/
  ↓
lib/          Reine Logik: search/, catalog/, alerts/, ai/, export/, utils/
  ↓
config/  types/  data/
```

Regeln:

1. **Pfeile zeigen nur nach unten.** `lib/` importiert nichts aus `server/`,
   `components/` oder `app/`.
2. **`lib/` ist framework-frei.** Kein React, kein `next/*`. Dadurch ist die
   Suchlogik isoliert testbar und unabhängig vom Framework.
3. **`server/` bleibt serverseitig.** Es liest `process.env` und spricht mit
   externen APIs. Kein Client-Modul darf daraus importieren, sonst landen
   Secrets im Bundle.
4. **`config/` enthält Werte, keine Logik.** Wer eine Domain freischalten oder
   ein Limit ändern will, editiert genau eine Datei.

## Warum die API-Routen dünn sind

`app/api/*/route.ts` validiert die Anfrage, ruft einen Service und formt die
Antwort — mehr nicht. Die Suchlogik in `server/search/service.ts` ist dadurch
ohne HTTP aufrufbar (Skript, Test, Job) und die Route bleibt überschaubar.

## Die Suchpipeline im Detail

### 1. Prompt (`server/search/prompt.ts`)

Zwei Bausteine sind entscheidend:

- **Heutiges Datum** im Prompt, damit das Modell ausgelaufene Programme selbst
  aussortiert. Es wird pro Request neu berechnet (`getTodayIso()`), nie beim
  Modul-Laden — sonst altert ein laufender Server.
- **Ausschlussliste** der bereits gezeigten Programme. Ohne sie liefert eine
  Folgesuche dieselben acht Karten. Erkennt `isUserDissatisfied()` Unzufriedenheit,
  steigt zusätzlich die Temperatur und das Modell wird explizit auf andere
  Quellen gelenkt.

### 2. Provider (`lib/ai/`, `server/search/providers.ts`)

**Perplexity (primär)** liefert in einem Call strukturiertes JSON _und_
`search_results` mit `sourceIndices` pro Programm. Diese Zuordnung ist der Grund
für die Provider-Wahl: jede Karte trägt ihre _eigenen_ Belege statt einer global
geteilten Zitatliste.

**Gemini (Fallback)** kann Grounding und Structured Output nicht zuverlässig
kombinieren, deshalb zwei Durchläufe: gegroundete Suche als Fließtext, danach
eine schema-erzwungene Extraktion. Die Quellen sind
`vertexaisearch`-Weiterleitungen und werden aufgelöst
(`link-resolver.ts`), sonst hätte jede Karte weder Link noch Quelle.

### 3. Links (`server/search/link-resolver.ts`)

Reihenfolge der Präferenz:

1. Ein spezifischer Link des Modells auf offizieller Domain.
2. Eine Quelle auf der Domain des Fördergebers (`QUELLE_DOMAIN_MAP`).
3. Eine Quelle, deren URL Tokens des Programmnamens enthält.

Qualifiziert sich nichts, wird **kein** Link gesetzt. Ein falscher offizieller
Link ist schlimmer als gar keiner.

### 4. Abgleich (`lib/search/reconcile.ts`)

Die kuratierte DB in `data/foerderprogramme.ts` ist kein Suchindex, sondern die
Vertrauensinstanz: sie kennt beendete Programme ("Digital Jetzt", "go-digital")
und verifizierte offizielle Links. Ein Treffer dort kann ein Webergebnis
hart deaktivieren oder dessen Frist überschreiben.

Der Namensabgleich läuft bewusst nur in eine Richtung — der Webname muss den
markanten Kurznamen des DB-Eintrags _enthalten_. Die Gegenrichtung fing
unbeteiligte Programme mit generischen Namen mit ein.

### 5. Harte Kriterien (`lib/facts/*`, `lib/facts/check.ts`)

Region, Antragsstatus, Antragsberechtigung, Unternehmensgröße und Förderart
werden auf feste Codes normalisiert (`types/facts.ts`) — Wortgrenzen statt
Teilstrings, damit "Leuna" nicht EU und "Niedersachsen" nicht Sachsen ist.
`checkHardCriteria` prüft sie deterministisch und liefert je Kriterium GÜLTIG,
UNGEPRÜFT (Quelle sagt nichts) oder AUSGESCHLOSSEN. Das Gesamturteil ist das
schlechteste Einzelergebnis: `UNBEKANNT` führt nie zu GÜLTIG. Dieselbe Funktion
entscheidet im Ingest, ob ein Programm gemeldet werden darf.

Katalogfakten schlagen Web-Freitext: Ein Web-Treffer, der einem
Katalogprogramm entspricht, übernimmt dessen Fakten
(`lib/search/catalog-match.ts`). Der Antragsstatus des Katalogs kommt aus dem
Sperrvermerk `gsb:header`; `gsb:dateOfExpiration` wird bewusst nicht gelesen.

### 6. Relevanz (`lib/search/scoring.ts`)

Nur noch Relevanz: Suchwörter der Anfrage (ohne Region-, Größen- und
Förderart-Wörter) und der gewählte Förderbereich (`assessTopic`, dieselbe
Definition wie für die Alerts). Treffer im Namen und im ersten Satz zählen voll,
Nebenerwähnungen halb. Harte Kriterien geben keine Punkte — sie haben über die
Zulassung schon entschieden. Sortiert wird: GÜLTIG vor UNGEPRÜFT, dann nach
Relevanz. Angezeigt wird keine Prozentzahl; `relevance` (hoch/mittel/niedrig)
steht für eine spätere Anzeige bereit.

### 7. Antworttext (`lib/search/reply.ts`)

Bewusst selbst formuliert statt vom Modell übernommen: dessen Prosa begann mit
einem Disclaimer ("Hinweis zur Auswahl"), der wie eine Ausrede statt wie ein
Ergebnis wirkte.

## Zustand im Client

- **Sitzungen** (`useChatSessions`) leben nur im Speicher. Eine Suche bildet die
  heutige Förderlandschaft ab; ein später erneut geöffnetes Transkript würde
  möglicherweise überholte Ergebnisse zeigen.
- **Merkliste** (`useFavorites`) liegt in `localStorage` und speichert den
  **vollständigen** Programmdatensatz, nicht nur eine Id — ein Webergebnis lässt
  sich später nicht erneut nachschlagen. Gespeicherte Einträge werden beim Lesen
  feldweise validiert, da sie älteren Versionen entstammen können.

## Kontrolliertes Vokabular

`data/taxonomie.ts` ist die einzige Quelle sowohl für die Filter-Dropdowns als
auch für die Kanonisierung in `lib/search/normalize.ts`. Dadurch können
Oberfläche und Matching nicht auseinanderlaufen. Der jeweils erste Eintrag jeder
Liste ist die neutrale Option und muss zu `defaultFilters` in
`types/filters.ts` passen.

## Der Katalog

Bis Version 1.1 war die Websuche die einzige Quelle und
`data/foerderprogramme.ts` mit einem Dutzend Einträgen die Vertrauensinstanz.
Das trug die Suche, aber es konnte zwei Fragen prinzipiell nicht beantworten:
_Ist dieser Link wirklich die Programmseite?_ und _Ist das hier neu?_

Beides beantwortet jetzt ein eigener Katalog — eine tägliche Kopie des
Förderdatenbank-Exports (rund 2.500 Programme) und der offenen EU-Calls.

1. **Links kommen aus der Quelle.** Der Export verweist je Programm auf ein
   `ExternerLink`-Dokument mit der redaktionell gepflegten URL des Fördergebers.
   Bei 94 % der Programme gibt es die; bei allen übrigen bleibt der ebenfalls
   offizielle Eintrag in der Förderdatenbank. Geraten wird nichts mehr.
2. **„Neu" ist ein Diff, keine Behauptung.** Zwei Momentaufnahmen, verglichen
   über eine stabile ID. Deshalb kann der Förderradar überhaupt existieren, und
   deshalb erkennt er auch, dass ein Programm _verschwunden_ ist — was vorher
   handgepflegt werden musste.

Wichtig ist, was **nicht** passiert ist: Der Katalog hat keine eigene
Rangfolge bekommen. Er wird in `server/search/service.ts` als zweite
Kandidatenquelle eingespeist und läuft durch dieselben harten Filter und
dieselbe Bewertung wie ein Webergebnis. Bei einer Dublette gewinnt der
Katalogeintrag — nicht wegen eines Bonus, sondern weil er den besseren Link und
die amtlichen Metadaten mitbringt.

`lib/catalog/` bleibt dabei frei von I/O: Parsen, Diffen und die Abbildung auf
die Programmkarte sind reine Funktionen, `server/catalog/` macht Netz und
Postgres. Dadurch ließ sich das Parsen gegen den echten Export von 2.539
Dokumenten durchmessen, ohne eine Datenbank zu brauchen — und genau dabei fielen
die Dinge auf, die man einem Beispiel-Dokument nicht ansieht: leere Fristfelder,
Fragezeichen statt Gedankenstrichen, Verweise auf Dokumente, die der Export gar
nicht mitliefert.

## Bewusst nicht umgesetzt

- **Live-Scan der Programmseiten** auf Einstellungshinweise: kostete spürbar
  Latenz und erzeugte False Positives (ein Hinweis kann sich auf ein
  Vorgängerprogramm auf einer sonst aktiven Seite beziehen), ohne je etwas
  verlässlich auszublenden.
- **Globale Quellenliste pro Antwort**: führte dazu, dass jede Karte dieselben
  Belege trug. Quellen sind bewusst pro Programm modelliert.
- **Unternehmensprofil / Onboarding**: entfernt. Die Suche startet direkt im
  Chat; Filter und freier Text genügen.
- **Fristen als Datum parsen**: Der Export nennt Fristen nur im Fließtext. Ein
  geparstes Datum wäre in einer Alarm-Mail eine Zusage, die die Quelle nicht
  hergibt — deshalb wird der Satz zitiert oder nichts gezeigt.
- **Embeddings für das Themen-Matching**: Die Zuordnung zu den mpool-Themen ist
  bewusst regelbasiert und damit erklärbar. Ein Vektormodell würde die Trefferzahl
  vermutlich verbessern, aber „warum steht das in meiner Mail?" wäre dann nicht
  mehr beantwortbar. Die Schnittstelle in `lib/alerts/topic-match.ts` ist so
  geschnitten, dass ein Embedding-Schritt später danebentreten kann.
