// ⚠️ WICHTIG: API Key wurde entfernt für sichere GitHub-Veröffentlichung
// Siehe SETUP-ANLEITUNG.md für die Einrichtung mit Cloudflare Workers

// 🔥 WICHTIG: API KONFIGURATION 🔥
// Option 1: Verwende deinen eigenen Cloudflare Worker (KOSTENLOS & SICHER)
// 1. Gehe zu https://workers.cloudflare.com und erstelle einen Account (kostenlos)
// 2. Erstelle einen neuen Worker und kopiere den Code aus 'cloudflare-worker.js'
// 3. Füge deinen OpenAI API Key als Environment Variable hinzu: OPENAI_API_KEY = dein-key
// 4. Deploy den Worker und kopiere die URL hierher:
const PROXY_URL = 'https://holy-frost-aa8d.khayatisifeddine.workers.dev'; // z.B. https://dein-worker.username.workers.dev

// Option 2: Verwende den öffentlichen Demo-Proxy (mit Limits)
// const PROXY_URL = 'https://openai-proxy-demo.workers.dev'; // Nur für Tests!

// Option 3: Direkter API Key (NICHT für GitHub!)
const OPENAI_API_KEY = ''; // ⚠️ Leer lassen wenn du den Proxy verwendest!

import Fuse from 'https://cdn.jsdelivr.net/npm/fuse.js@6.6.2/dist/fuse.esm.js';

// Förderprogramme mit Links als Wissensbasis
const programmes = [
  // WEITERE PROGRAMME


{
  title: 'GreenEconomy.IN.NRW – Innovationswettbewerb',
  description: 'EFRE/JTF-Innovationswettbewerb für Projekte zu Klima-, Umwelt- und Ressourcenschutz sowie Circular Economy.',
  url: 'https://www.in.nrw/green-economy?utm_source=chatgpt.com',
  foerderhoehe: 'bis zu 80% der zuwendungsfähigen Ausgaben (abhängig von Unternehmensgröße)',
  zielgruppe: 'Unternehmen, KMU, Forschungseinrichtungen in Kooperation',
  antragsfrist: 'ausschreibungsabhängig (befristete Calls)',
  foerderart: 'Zuschuss',
  ansprechpartner: 'Innovationsförderagentur NRW / MUNV NRW',
  region: 'Nordrhein-Westfalen',
  category: 'Ressourcen Management',
  applicant_type: 'KMU'
},
{
  title: 'Klimaanpassung.Unternehmen.NRW',
  description: 'Zuschüsse für investive Klimaanpassungsmaßnahmen an Gebäuden und Liegenschaften kleiner und mittlerer Unternehmen.',
  url: 'https://www.in.nrw/massnahmen/klimaanpassung-unternehmen-nrw?utm_source=chatgpt.com',
  foerderhoehe: 'bis zu 60% der förderfähigen Ausgaben',
  zielgruppe: 'KMU mit Standorten in NRW',
  antragsfrist: 'voraussichtlich bis 31.03.2026 (bzw. Mittelerschöpfung)',
  foerderart: 'Zuschuss',
  ansprechpartner: 'Innovationsförderagentur NRW / Projektträger Jülich',
  region: 'Nordrhein-Westfalen',
  category: 'Maßnahmen zu Emissionsminderung',
  applicant_type: 'KMU'
},
{
  title: 'Bundesförderung Industrie und Klimaschutz (BIK) – Dekarbonisierung der Industrie',
  description: 'Förderung von Investitionen zur Dekarbonisierung energieintensiver Industrieprozesse (z.B. Elektrifizierung, Wasserstoff, Prozessumstellung).',
  url: 'https://www.ptj.de/foerdermoeglichkeiten/bik?utm_source=chatgpt.com',
  foerderhoehe: 'Zuschuss bis zu rund 60% der förderfähigen Kosten (beihilferechtabhängig)',
  zielgruppe: 'energieintensive Industrieunternehmen',
  antragsfrist: 'Calls/Aufrufe, laufend bis Budgetausschöpfung',
  foerderart: 'Zuschuss',
  ansprechpartner: 'Kompetenzzentrum Klimaschutz in energieintensiven Industrien (KEI) / PtJ',
  region: 'Deutschland',
  category: 'Maßnahmen zu Emissionsminderung',
  applicant_type: 'Industrie'
},
{
  title: 'Bundesförderung Industrie und Klimaschutz (BIK) – CCU/CCS',
  description: 'Förderung von Projekten zur Abscheidung, Nutzung und Speicherung von CO₂ in Industrie und Abfallwirtschaft (CCU/CCS).',
  url: 'https://www.ptj.de/foerdermoeglichkeiten/bik?utm_source=chatgpt.com',
  foerderhoehe: 'Zuschuss bis zu rund 60% der förderfähigen Kosten',
  zielgruppe: 'Industrieunternehmen, Betreiber von Abfallverbrennungsanlagen',
  antragsfrist: 'Calls/Aufrufe, laufend bis Budgetausschöpfung',
  foerderart: 'Zuschuss',
  ansprechpartner: 'KEI / Projektträger Jülich',
  region: 'Deutschland',
  category: 'Klimabilanzierung',
  applicant_type: 'Industrie'
},
{
  title: 'Fin.Connect.NRW – Konvoi Nachhaltigkeitsberichterstattung',
  description: 'Kostenfreie Webinar- und Workshopreihe zur CSRD-konformen Nachhaltigkeitsberichterstattung inkl. Wesentlichkeitsanalyse und Datenerhebung.',
  url: 'https://www.fin-connect-nrw.de/themen/nachhaltigkeitsberichtserstattung?utm_source=chatgpt.com',
  foerderhoehe: 'kostenfreie Teilnahme',
  zielgruppe: 'Unternehmen in NRW, insbesondere KMU',
  antragsfrist: 'laufende Webinarreihen (Termine nach Ausschreibung)',
  foerderart: 'Beratung / Seminare',
  ansprechpartner: 'Fin.Connect.NRW / ZENIT GmbH',
  region: 'Nordrhein-Westfalen',
  category: 'Nachhaltigkeitsberichterstattung',
  applicant_type: 'KMU'
},
{
  title: 'Mittelstand-Digital Netzwerk',
  description: 'Bundesweite Mittelstand-Digital-Zentren mit kostenlosen Workshops, Praxisprojekten und Informationen zu Digitalisierung und Nachhaltigkeit.',
  url: 'https://www.mittelstand-digital.de?utm_source=chatgpt.com',
  foerderhoehe: 'kostenfreie Angebote (Workshops, Beratungen, Online-Kurse)',
  zielgruppe: 'KMU, Handwerk',
  antragsfrist: 'laufend',
  foerderart: 'Beratung / Seminare',
  ansprechpartner: 'Mittelstand-Digital Zentren / BMWK',
  region: 'Bundesweit',
  category: 'Nachhaltige Seminare',
  applicant_type: 'KMU'
},
{
  title: 'WIPANO – Wissens- und Technologietransfer durch Patente und Normen',
  description: 'Zuschüsse für KMU zur Patentierung innovativer Technologien sowie zur Überführung von Forschungsergebnissen in Normen und Standards.',
  url: 'https://www.innovation-beratung-foerderung.de/INNO/Navigation/DE/WIPANO/wipano.html?utm_source=chatgpt.com',
  foerderhoehe: 'bis zu 50% (Patentierung) bzw. bis zu 80–85% im Wissenstransfer, max. 200.000 € je Verbundpartner',
  zielgruppe: 'KMU, Unternehmen, Hochschulen, Forschungseinrichtungen',
  antragsfrist: 'Anträge fortlaufend bis 2026/2027 je Modul',
  foerderart: 'Zuschuss',
  ansprechpartner: 'Projektträger Jülich (PtJ) im Auftrag des BMWK',
  region: 'Bundesweit',
  category: 'Nachhaltige technologische Entwicklung in Produktionsprozess',
  applicant_type: 'KMU'
},
{
  title: 'EU Innovation Fund',
  description: 'Großes EU-Programm zur Finanzierung innovativer CO₂-armen und net-zero Technologien (z.B. erneuerbare Energien, Wasserstoff, CCUS, Speicher).',
  url: 'https://climate.ec.europa.eu/eu-action/eu-funding-climate-action/innovation-fund_en?utm_source=chatgpt.com',
  foerderhoehe: 'bis zu 60% der relevanten Kosten, Gesamtbudget ca. 40 Mrd. € (2020–2030)',
  zielgruppe: 'Unternehmen, Konsortien in EU/EWR',
  antragsfrist: 'regelmäßige Calls und Auktionen',
  foerderart: 'Zuschuss',
  ansprechpartner: 'Europäische Kommission / CINEA',
  region: 'EU-weit',
  category: 'Energieeffizienz & Erneuerbare Energien',
  applicant_type: 'Industrie / KMU'
},


{
  title: 'Digitalisierung und Arbeit 4.0 (Bremen)',
  description: 'Beratungsförderung für kleine und mittlere Unternehmen zur Gestaltung der digitalen Transformation von Arbeitsprozessen, Organisation und Personalentwicklung.',
  url: 'https://www.foerderdatenbank.de/FDB/Content/DE/Foerderprogramm/Land/Bremen/digitalisierung-und-arbeit-4-0.html?utm_source=chatgpt.com',
  foerderhoehe: 'Zuschuss zu Beratungskosten (Anteilfinanzierung, höhere Quote für KMU)',
  zielgruppe: 'KMU mit Sitz in Bremen oder Bremerhaven',
  antragsfrist: 'Laufend, bis Ausschöpfung der Mittel',
  foerderart: 'Zuschuss (Beratung)',
  ansprechpartner: 'Die Senatorin für Wirtschaft, Häfen und Transformation Bremen',
  region: 'Bremen',
  category: 'Digitalisierung',
  applicant_type: 'KMU'
},
{
  title: 'Unternehmen machen Klimaschutz (Baden-Württemberg)',
  description: 'Landesprogramm mit zwei Bausteinen: geförderte Klimaschutzberatung (Treibhausgasbilanz, Transformationspfad, CSRD-Bezug) sowie Investitionsförderung für Klimaschutzmaßnahmen in Unternehmen.',
  url: 'https://www.foerderdatenbank.de/FDB/Content/DE/Foerderprogramm/Land/Baden-Wuerttemberg/unternehmen-machen-klimaschutz.html?utm_source=chatgpt.com',
  foerderhoehe: 'Zuschuss für Beratung und Investitionen, Höhe abhängig von Maßnahme und Unternehmensgröße',
  zielgruppe: 'Unternehmen mit Sitz oder Standort in Baden-Württemberg',
  antragsfrist: 'Mehrere Stichtage pro Jahr, Laufzeit derzeit bis 2027',
  foerderart: 'Zuschuss (Beratung + Investition)',
  ansprechpartner: 'Ministerium für Umwelt, Klima und Energiewirtschaft Baden-Württemberg',
  region: 'Baden-Württemberg',
  category: 'Klimabilanzierung',
  applicant_type: 'KMU'
},
{
  title: 'KMU-innovativ: Energieeffizienz, Klimaschutz und Klimaanpassung',
  description: 'BMBF-Programm zur Förderung risikoreicher Forschungs- und Entwicklungsprojekte von KMU zu Energieeffizienz, Dekarbonisierung und Klimaanpassung.',
  url: 'https://www.kmu-innovativ.de/de/energieeffizienz-klimaschutz-und-klimaanpassung-1663.html?utm_source=chatgpt.com',
  foerderhoehe: 'Zuschuss, Fördersätze je nach Partner (KMU i. d. R. deutlich über 50%)',
  zielgruppe: 'Innovative KMU, ggf. in Verbünden mit Forschungseinrichtungen',
  antragsfrist: 'Mehrere Einreichungsstichtage pro Jahr',
  foerderart: 'Zuschuss (FuE-Projekte)',
  ansprechpartner: 'BMBF / Projektträger (siehe Programmseite)',
  region: 'Bundesweit',
  category: 'Maßnahmen zu Emissionsminderung',
  applicant_type: 'KMU'
},
{
  title: 'Klimaschutzverträge – CO₂-Differenzverträge (FRL KSV)',
  description: 'Förderprogramm des Bundes für energieintensive Industriebranchen zur Errichtung und zum Betrieb klimaneutraler oder -armer Produktionsanlagen über langfristige CO₂-Differenzverträge.',
  url: 'https://www.foerderdatenbank.de/FDB/Content/DE/Foerderprogramm/Bund/BMWi/foerderrichtlinie-klimaschutzvertraege.html?utm_source=chatgpt.com',
  foerderhoehe: 'Ausgleich von Mehrkosten (CAPEX/OPEX) gegenüber fossiler Referenz über Vertragslaufzeit',
  zielgruppe: 'Energieintensive Unternehmen und kommunale Unternehmen mit hohen THG-Emissionen',
  antragsfrist: 'Vorbereitende Verfahren und Gebotsrunden mit festen Fristen',
  foerderart: 'Zuschuss / Differenzvertrag',
  ansprechpartner: 'Projektträger Jülich (PtJ) im Auftrag des BMWK',
  region: 'Bundesweit',
  category: 'Nachhaltige technologische Entwicklung in Produktionsprozess',
  applicant_type: 'KMU'
},
{
  title: 'INQA-Coaching – Beratung für die Arbeitswelt der Zukunft',
  description: 'Bundesweites Coachingprogramm für KMU zu Themen wie Digitalisierung, Personal, Organisation und Arbeitsprozesse.',
  url: 'https://www.inqa.de/DE/angebote/inqa-coaching/informationen-fuer-kmu/uebersicht.html',
  foerderhoehe: 'Bis zu 12 Coaching-Tage à 1.200 € mit 80 % Zuschuss',
  zielgruppe: 'Kleine und mittlere Unternehmen bis 249 Beschäftigte',
  antragsfrist: 'Laufend (Förderzeitraum 2023–2027)',
  foerderart: 'Zuschuss für Coaching',
  ansprechpartner: 'INQA-Beratungsstellen / BMAS',
  region: 'Bundesweit',
  category: 'Digitalisierung',
  applicant_type: 'KMU'
},

{
  title: 'Potentialberatung NRW',
  description: 'Beratungsprogramm für Unternehmen in NRW zur Verbesserung von Organisation, Personalentwicklung und Digitalisierung.',
  url: 'https://www.esf.nrw/potentialberatung',
  foerderhoehe: '40 % Zuschuss, max. 400 € je Tag, bis zu 8 Beratungstage',
  zielgruppe: 'Unternehmen mit mind. 1 Beschäftigten und max. 249 Beschäftigten',
  antragsfrist: 'Laufend',
  foerderart: 'Zuschuss für Organisations- und Personalberatung',
  ansprechpartner: 'Regionalagenturen / MAGS NRW',
  region: 'Nordrhein-Westfalen',
  category: 'Ressourcen Management',
  applicant_type: 'KMU'
},

{
  title: 'MID-Gutschein Digitalisierung (NRW)',
  description: 'Gutscheinprogramm zur Finanzierung externer Dienstleistungen für Digitalisierungsprojekte in KMU.',
  url: 'https://www.mittelstand-innovativ-digital.nrw/',
  foerderhoehe: 'Bis zu 15.000 € Zuschuss, Förderquote bis 50 % der Projektkosten',
  zielgruppe: 'Kleinst-, kleine und mittlere Unternehmen mit Sitz in NRW',
  antragsfrist: 'Laufend, Antrag über monatliches Losverfahren',
  foerderart: 'Zuschuss für Digitalisierungsprojekte',
  ansprechpartner: 'Projektträger Jülich (PtJ)',
  region: 'Nordrhein-Westfalen',
  category: 'Digitalisierung',
  applicant_type: 'KMU'
},
{
  title: 'MID-Assistent/in (NRW)',
  description: 'Lohnzuschuss für die Einstellung eines Hochschulabsolventen zur Umsetzung von Digitalisierungs-, Innovations- oder Nachhaltigkeitsprojekten.',
  url: 'https://www.mittelstand-innovativ-digital.nrw/antrag/mid-assistenz',
  foerderhoehe: 'Bis zu 48.000 € Zuschuss über max. 24 Monate',
  zielgruppe: 'Kleinst- und kleine Unternehmen (< 50 Beschäftigte) in NRW',
  antragsfrist: 'Laufend (Wartesaalverfahren)',
  foerderart: 'Zuschuss für Personalkosten',
  ansprechpartner: 'Projektträger Jülich (PtJ)',
  region: 'Nordrhein-Westfalen',
  category: 'Digitalisierung',
  applicant_type: 'KMU'
},

{
  title: 'QualiScheck Rheinland-Pfalz',
  description: 'Förderung von beruflichen Weiterbildungen für Beschäftigte, z. B. zu Nachhaltigkeit, Energieeffizienz oder Digitalisierung.',
  url: 'https://esf.rlp.de/berufliche-weiterbildung/qualischeck',
  foerderhoehe: 'Bis zu 60 % der Weiterbildungskosten, max. 1.500 € pro Person und Jahr',
  zielgruppe: 'Beschäftigte mit Wohn- oder Arbeitsort in Rheinland-Pfalz',
  antragsfrist: 'Laufend',
  foerderart: 'Zuschuss für Weiterbildung',
  ansprechpartner: 'ESF-Regionalstellen RLP',
  region: 'Rheinland-Pfalz',
  category: 'Nachhaltige Seminare',
  applicant_type: 'KMU'
},
{
  title: 'Mittelstand-Digital Zentrum Klima.Neutral.Digital',
  description: 'Kostenfreie Unterstützung von KMU beim Weg zur Klimaneutralität durch Quick-Checks, Workshops und Digitalisierungsprojekte.',
  url: 'https://klima-neutral-digital.de/',
  foerderhoehe: 'Kostenfreie Informationsangebote, Workshops und Erstberatungen',
  zielgruppe: 'KMU und Handwerksbetriebe bis 500 Beschäftigte',
  antragsfrist: 'Laufend',
  foerderart: 'Kostenfreie Beratung & Seminare',
  ansprechpartner: 'Mittelstand-Digital Zentrum Klima.Neutral.Digital',
  region: 'Bundesweit (Schwerpunkt Baden-Württemberg & Umgebung)',
  category: 'Energieeffizienz & Erneuerbare Energien',
  applicant_type: 'KMU'
},
{
  title: 'Mittelstand-Digital Zentrum Zukunftskultur',
  description: 'Unterstützt KMU beim Aufbau einer zukunftsfähigen, digitalen und nachhaltigen Unternehmenskultur – mit Fokus auf KI, New Work und Change Management.',
  url: 'https://www.digitalzentrum-zukunftskultur.de/',
  foerderhoehe: 'Kostenfreie Workshops, Coachings und Praxisprojekte',
  zielgruppe: 'Kleine und mittlere Unternehmen aller Branchen',
  antragsfrist: 'Laufend (verlängert bis Ende 2026)',
  foerderart: 'Kostenfreie Beratung & Seminare',
  ansprechpartner: 'Mittelstand-Digital Zentrum Zukunftskultur',
  region: 'Bundesweit',
  category: 'Nachhaltige Seminare',
  applicant_type: 'KMU'
},
{
  title: 'Mittelstand-Digital Zentrum Handwerk',
  description: 'Digitalisierungs- und Nachhaltigkeitsberatung speziell für Handwerksbetriebe, inkl. Demonstratoren, Praxisbeispiele und Qualifizierungsangebote.',
  url: 'https://handwerkdigital.de/',
  foerderhoehe: 'Kostenfreie Informations- und Qualifizierungsangebote',
  zielgruppe: 'Handwerksbetriebe und handwerksnahe KMU',
  antragsfrist: 'Laufend',
  foerderart: 'Kostenfreie Beratung & Seminare',
  ansprechpartner: 'Mittelstand-Digital Zentrum Handwerk / ZWH',
  region: 'Bundesweit (Schwerpunkt NRW)',
  category: 'Digitalisierung',
  applicant_type: 'KMU'
},





    {
    title: 'Unternehmen machen Klimaschutz – Beratungsförderung (BW)',
    description: 'Zuschuss für Beratungen zur Erstellung einer Treibhausgasbilanz, eines Transformationspfads und eines Klimaschutzmaßnahmenplans.',
    url: 'https://um.baden-wuerttemberg.de/de/umwelt-natur/umwelt-und-wirtschaft/angebote-fuer-unternehmen/foerderprogramm-unternehmen-machen-klimaschutz',
    foerderhoehe: 'Zuschuss zu mehreren Beratungstagen, Prozentsatz je Modul',
    zielgruppe: 'Unternehmen in Baden-Württemberg',
    antragsfrist: 'laufend (bis 2027)',
    foerderart: 'Zuschuss',
    ansprechpartner: 'Ministerium für Umwelt, Klima und Energiewirtschaft Baden-Württemberg',
    region: 'Baden-Württemberg',
    category: 'Klimabilanzierung',
    applicant_type: 'KMU'
  },
  {
    title: 'Unternehmen machen Klimaschutz – Investitionsförderung (BW)',
    description: 'Förderung von Investitionen, die Treibhausgasemissionen im Unternehmen deutlich reduzieren.',
    url: 'https://www.nachhaltigkeitsstrategie.de/wirtschaft/klimaschutz/foerderprogramm-unternehmen-machen-klimaschutz/investitionsfoerderung',
    foerderhoehe: 'Zuschuss zu Investitionskosten, Obergrenzen projektabhängig',
    zielgruppe: 'Unternehmen in Baden-Württemberg',
    antragsfrist: 'Stichtage laut Richtlinie (i. d. R. 2x jährlich)',
    foerderart: 'Zuschuss',
    ansprechpartner: 'Ministerium für Umwelt, Klima und Energiewirtschaft Baden-Württemberg',
    region: 'Baden-Württemberg',
    category: 'Maßnahmen zu Emissionsminderung',
    applicant_type: 'KMU'
  },
  {
    title: 'Klimaschutz-Plus – CO₂-Minderungsprogramm Baden-Württemberg',
    description: 'Förderung von Maßnahmen zur Energieeinsparung und CO₂-Minderung in Unternehmen und Kommunen.',
    url: 'https://www.kea-bw.de/foerderprogrammsuche/detail/klimaschutz-plus-co2-minderungsprogramm',
    foerderhoehe: 'Zuschuss je eingesparter Tonne CO₂ (Deckelung pro Projekt)',
    zielgruppe: 'Unternehmen, Kommunen, sonstige Einrichtungen in Baden-Württemberg',
    antragsfrist: 'laufend / laut aktueller Ausschreibung',
    foerderart: 'Zuschuss',
    ansprechpartner: 'KEA Klimaschutz- und Energieagentur Baden-Württemberg',
    region: 'Baden-Württemberg',
    category: 'Maßnahmen zu Emissionsminderung',
    applicant_type: 'KMU'
  },
  {
    title: 'Klimaschutz-Plus – Struktur-, Qualifizierungs- und Informationsprogramm',
    description: 'Fördert Qualifizierungs-, Informations- und Netzwerkprojekte zu Klimaschutz, CO₂-Bilanzierung und Klimastrategien.',
    url: 'https://www.kea-bw.de/foerderprogrammsuche/detail/klimaschutz-plus-struktur-qualifizierungs-und-informationsprogramm-teil-2',
    foerderhoehe: 'Projektbezogene Zuschüsse, Höhe abhängig vom Vorhaben',
    zielgruppe: 'Unternehmen, Kommunen, Bildungsträger in Baden-Württemberg',
    antragsfrist: 'laufend / nach Aufrufen',
    foerderart: 'Zuschuss',
    ansprechpartner: 'Ministerium für Umwelt, Klima und Energiewirtschaft Baden-Württemberg',
    region: 'Baden-Württemberg',
    category: 'Nachhaltige Seminare',
    applicant_type: 'Projektträger'
  },

  {
    title: 'Kooperationszusammenschlüsse Circular Economy (EFRE.NRW)',
    description: 'Förderung von Zusammenschlüssen mehrerer KMU zur Entwicklung zirkulärer Geschäftsmodelle entlang einer Wertschöpfungskette.',
    url: 'https://www.efre.nrw/einfach-machen/foerderung-finden/kooperationszusammenschluesse-circular-economy',
    foerderhoehe: 'Zuschuss zu externen Beratungs- und Koordinationsleistungen',
    zielgruppe: 'Konsortien aus mind. fünf KMU in NRW',
    antragsfrist: 'laufend',
    foerderart: 'Zuschuss',
    ansprechpartner: 'EFRE/JTF-Programm NRW / Effizienz-Agentur NRW',
    region: 'Nordrhein-Westfalen',
    category: 'Nachhaltiger Einkauf',
    applicant_type: 'KMU'
  },
  
  
  {
    title: 'BAFA – Energieberatung für Nichtwohngebäude, Anlagen und Systeme (Modul 1 Energieaudit)',
    description: 'Zuschuss zur Durchführung eines Energieaudits nach DIN EN 16247 als Grundlage für Effizienzmaßnahmen und Klimabilanz.',
    url: 'https://www.bafa.de/DE/Energie/Energieberatung/Nichtwohngebaeude_Anlagen_Systeme/nichtwohngebaeude_anlagen_systeme_node.html',
    foerderhoehe: 'Zuschuss zum Beratungshonorar (Fördersatz und Höchstbeträge abhängig von den Energiekosten)',
    zielgruppe: 'Unternehmen, Kommunen und andere Einrichtungen',
    antragsfrist: 'laufend',
    foerderart: 'Zuschuss',
    ansprechpartner: 'BAFA',
    region: 'Deutschland',
    category: 'Klimabilanzierung',
    applicant_type: 'KMU'
  },
  {
    title: 'LIFE Clean Energy Transition',
    description: 'EU-Programm zur Förderung von Projekten zur Energiewende, Energieeffizienz und Nutzung erneuerbarer Energien.',
    url: 'https://cinea.ec.europa.eu/programmes/life/clean-energy-transition_en',
    foerderhoehe: 'EU-Zuschuss, typischerweise bis zu ca. 95% der förderfähigen Projektkosten',
    zielgruppe: 'Unternehmen, öffentliche Einrichtungen, NGOs, Forschungseinrichtungen',
    antragsfrist: 'jährliche EU-Ausschreibungen',
    foerderart: 'Zuschuss',
    ansprechpartner: 'Europäische Kommission / CINEA',
    region: 'EU-weit',
    category: 'Energieeffizienz & Erneuerbare Energien',
    applicant_type: 'Projektträger'
  },
  {
    title: 'LIFE – Circular Economy and Quality of Life',
    description: 'EU-Förderung für Projekte zur Kreislaufwirtschaft, Ressourceneffizienz und Verbesserung der Umweltqualität.',
    url: 'https://cinea.ec.europa.eu/programmes/life/circular-economy-and-quality-life_en',
    foerderhoehe: 'EU-Zuschuss, Co-Funding in der Regel 60–75% der Projektkosten',
    zielgruppe: 'Unternehmen, Kommunen, Forschungseinrichtungen, NGOs',
    antragsfrist: 'jährliche EU-Ausschreibungen',
    foerderart: 'Zuschuss',
    ansprechpartner: 'Europäische Kommission / CINEA',
    region: 'EU-weit',
    category: 'Ressourcen Management',
    applicant_type: 'Projektträger'
  },
  {
    title: 'Nachhaltig wirken – Förderung gemeinwohlorientierter Unternehmen',
    description: 'Bundesprogramm zur Stärkung gemeinwohlorientierter Unternehmen, inkl. Beratung, Qualifizierung und Unterstützung bei nachhaltigen Geschäftsmodellen.',
    url: 'https://www.bmwk.de/Redaktion/DE/Dossier/foerderprogramm-gemeinwohlorientierte-unternehmen.html',
    foerderhoehe: 'Projektbezogene Zuschüsse je nach Modul',
    zielgruppe: 'Gemeinwohlorientierte Unternehmen und Gründungen',
    antragsfrist: 'Ausschreibungsrunden mit festen Stichtagen',
    foerderart: 'Zuschuss',
    ansprechpartner: 'BMWK / Projektträger (z. B. IBYKUS AG)',
    region: 'Deutschland',
    category: 'Nachhaltigkeitsberichterstattung',
    applicant_type: 'KMU'
  },
  {
    title: 'Exportinitiative Umweltschutz (EXI)',
    description: 'Förderprogramm zur internationalen Verbreitung deutscher Umwelt- und Effizienztechnologien und zur Unterstützung nachhaltiger Infrastrukturen im Ausland.',
    url: 'https://www.exportinitiative-umweltschutz.de/',
    foerderhoehe: 'Projektbezogene Zuschüsse für Pilot- und Referenzprojekte',
    zielgruppe: 'GreenTech-Unternehmen, insbesondere KMU',
    antragsfrist: 'Ausschreibungsrunden mit Einreichungsfristen',
    foerderart: 'Zuschuss',
    ansprechpartner: 'Bundesministerium für Umwelt, Naturschutz, nukleare Sicherheit und Verbraucherschutz (BMUV)',
    region: 'Deutschland / international',
    category: 'Maßnahmen zu Emissionsminderung',
    applicant_type: 'KMU'
  },

  {
    title: 'BAFA – Energieberatung für Nichtwohngebäude, Anlagen und Systeme (EBN)',
    description: 'Zuschüsse für Energieberatungen und Sanierungsfahrpläne in Nichtwohngebäuden von Unternehmen und Kommunen.',
    url: 'https://www.bafa.de/DE/Energie/Energieberatung/Nichtwohngebaeude_Anlagen_Systeme/nichtwohngebaeude_anlagen_systeme_node.html',
    foerderhoehe: 'bis zu 80% des Beratungshonorars',
    zielgruppe: 'Unternehmen, Kommunen, gemeinnützige Organisationen',
    antragsfrist: 'laufend',
    foerderart: 'Zuschuss',
    ansprechpartner: 'BAFA',
    region: 'Deutschland',
    category: 'Energieeffizienz & Erneuerbare Energien',
    applicant_type: 'KMU'
  },
  {
    title: 'EEW – Modul 5 Transformationskonzepte (BAFA)',
    description: 'Förderung von Transformationskonzepten mit CO₂-Bilanz, Klimazielen und Maßnahmenplan zur Dekarbonisierung des Unternehmens.',
    url: 'https://energiekonsens.de/foerderung/bafa-energieeffizienz-modul5',
    foerderhoehe: 'bis zu 60% der Kosten (KMU), max. 60.000–90.000 € Zuschuss',
    zielgruppe: 'Unternehmen der gewerblichen Wirtschaft',
    antragsfrist: 'laufend',
    foerderart: 'Zuschuss',
    ansprechpartner: 'BAFA / BMWK',
    region: 'Deutschland',
    category: 'Klimabilanzierung',
    applicant_type: 'KMU'
  },
  {
    title: 'KfW – Klimaschutzoffensive für den Mittelstand (293)',
    description: 'Förderkredit mit Klimazuschuss für Investitionen in klimafreundliche Anlagen, Produktionsverfahren und Energieversorgung.',
    url: 'https://www.kfw.de/293',
    foerderhoehe: 'Kredit bis 25 Mio. € + Klimazuschuss bis ca. 6%',
    zielgruppe: 'Mittelständische Unternehmen, Freiberufler',
    antragsfrist: 'laufend',
    foerderart: 'Kredit mit Zuschuss',
    ansprechpartner: 'KfW Bankengruppe',
    region: 'Deutschland, EU',
    category: 'Maßnahmen zu Emissionsminderung',
    applicant_type: 'KMU'
  },
  {
    title: 'Ressource.NRW – Ressourceneffizienz & Circular Economy',
    description: 'EFRE-Förderprogramm für Investitionen in innovative Anlagen mit Demonstrationscharakter zur Ressourceneffizienz und Circular Economy.',
    url: 'https://www.efre.nrw/einfach-machen/foerderung-finden/ressourcenrw',
    foerderhoehe: 'Zuschuss je nach Projekt, mehrere Mio. € Programmvolumen',
    zielgruppe: 'KMU in Nordrhein-Westfalen',
    antragsfrist: 'Einreichungsrunden bis voraussichtlich 30.06.2026',
    foerderart: 'Zuschuss',
    ansprechpartner: 'LANUV NRW / Effizienz-Agentur NRW',
    region: 'Nordrhein-Westfalen',
    category: 'Ressourcen Management',
    applicant_type: 'KMU'
  },
  {
    title: 'BMUV-Umweltinnovationsprogramm (KfW 230)',
    description: 'Förderung großtechnischer Pilotprojekte zur Vermeidung und Verminderung von Umweltbelastungen, z. B. in Produktion und Abfallwirtschaft.',
    url: 'https://www.kfw.de/inlandsfoerderung/Unternehmen/Energie-und-Umwelt/Förderprodukte/BMU-Umweltinnovationsprogramm-(230)/',
    foerderhoehe: 'Kredit und Zuschussanteile für investive Demonstrationsvorhaben',
    zielgruppe: 'Unternehmen, kommunale Unternehmen',
    antragsfrist: 'laufend',
    foerderart: 'Kredit/Zuschuss',
    ansprechpartner: 'BMUV / KfW',
    region: 'Deutschland',
    category: 'Maßnahmen zu Emissionsminderung',
    applicant_type: 'KMU'
  },
  {
    title: 'KMU-innovativ: Ressourcen- und Kreislaufwirtschaft',
    description: 'BMBF-Förderprogramm für risikoreiche FuE-Vorhaben zu Ressourceneffizienz und Circular Economy in KMU.',
    url: 'https://www.foerderdatenbank.de/FDB/Content/DE/Foerderprogramm/Bund/BMBF/kmu-innovativ-ressourcen-kreislaufwirtschaft.html',
    foerderhoehe: 'bis zu 60% der Projektkosten (KMU)',
    zielgruppe: 'Forschende KMU, Verbundprojekte mit Wissenschaft',
    antragsfrist: 'laufende Bekanntmachungen',
    foerderart: 'Zuschuss',
    ansprechpartner: 'BMBF / Projektträger',
    region: 'Deutschland',
    category: 'Nachhaltige technologische Entwicklung in Produktionsprozess',
    applicant_type: 'KMU'
  },
  {
    title: 'DBU – Projektförderung Umwelttechnik & Ressourcen',
    description: 'Förderung modellhafter Projekte zu Umwelttechnik, Klima- und Ressourcenschutz mit besonderem Fokus auf mittelständische Unternehmen.',
    url: 'https://www.dbu.de/foerderung/projektfoerderung/',
    foerderhoehe: 'individuell, häufig bis ca. 50% der Projektkosten',
    zielgruppe: 'Unternehmen, Forschungseinrichtungen, Vereine',
    antragsfrist: 'laufend',
    foerderart: 'Zuschuss',
    ansprechpartner: 'Deutsche Bundesstiftung Umwelt (DBU)',
    region: 'Deutschland',
    category: 'Ressourcen Management',
    applicant_type: 'KMU'
  },
  {
    title: 'DBU – Förderthema Nachhaltigkeitskommunikation, -bildung und -bewertung',
    description: 'Förderung von Bildungs- und Kommunikationsprojekten zu Nachhaltigkeit, z. B. Trainings, Seminare und Qualifizierungsangebote.',
    url: 'https://www.dbu.de/foerderung/projektfoerderung/foerderthemen/nachhaltigkeitskommunikation-bildung-und-bewertung/',
    foerderhoehe: 'projektabhängig, überwiegend Zuschussförderung',
    zielgruppe: 'Bildungsträger, Unternehmen, Vereine, Kommunen',
    antragsfrist: 'laufend',
    foerderart: 'Zuschuss',
    ansprechpartner: 'Deutsche Bundesstiftung Umwelt (DBU)',
    region: 'Deutschland',
    category: 'Nachhaltige Seminare',
    applicant_type: 'Projektträger'
  },
  {
    title: 'Bundesförderung für effiziente Wärmenetze (BEW)',
    description: 'Zuschüsse für Neubau und Dekarbonisierung effizienter Wärmenetze mit hohem Anteil erneuerbarer Energien.',
    url: 'https://www.bafa.de/DE/Energie/Energieeffizienz/Waermenetze/Effiziente_Waermenetze/effiziente_waermenetze_node.html',
    foerderhoehe: 'bis zu 50% der förderfähigen Kosten, max. 100 Mio. € je Vorhaben',
    zielgruppe: 'Unternehmen, Kommunen, Netzbetreiber, Genossenschaften',
    antragsfrist: 'laufend',
    foerderart: 'Zuschuss',
    ansprechpartner: 'BAFA',
    region: 'Deutschland',
    category: 'Energiebereitstellung',
    applicant_type: 'Projektträger'
  },

  {
    title: 'Digitalbonus.Bayern',
    description: 'Zuschussprogramm des Freistaats Bayern zur Digitalisierung kleiner Unternehmen und zur Verbesserung der IT-Sicherheit.',
    url: 'https://www.stmwi.bayern.de/foerderungen/digitalbonus-bayern/?utm_source=chatgpt.com',
    foerderhoehe: 'bis zu 50 % Zuschuss, max. 10.000 € (Standard) bzw. 50.000 € (Plus)',
    zielgruppe: 'Kleine Unternehmen der gewerblichen Wirtschaft in Bayern',
    antragsfrist: 'laufend, aktuell bis 31.12.2027',
    foerderart: 'Zuschuss',
    ansprechpartner: 'Bayerisches Staatsministerium für Wirtschaft, Landesentwicklung und Energie / Bezirksregierungen',
    region: 'Bayern',
    category: 'Digitalisierung',
    applicant_type: 'KMU'
  },
  {
    title: 'Digitalbonus.Niedersachsen-innovativ',
    description: 'Landesprogramm zur Förderung innovativer Digitalisierungsprojekte und Verbesserung der IT-Sicherheit in niedersächsischen KMU.',
    url: 'https://www.wirtschaftsregion-celle.de/F%C3%B6rderprogramme/Digitalisierung/Digitalbonus-Niedersachsen/?utm_source=chatgpt.com',
    foerderhoehe: 'Zuschuss 20–35 % der Ausgaben, mind. 3.000 € bis max. 50.000 €',
    zielgruppe: 'KMU und freiberuflich Tätige mit Sitz in Niedersachsen',
    antragsfrist: 'laufend, bis Mittel ausgeschöpft',
    foerderart: 'Zuschuss',
    ansprechpartner: 'NBank Niedersachsen',
    region: 'Niedersachsen',
    category: 'Digitalisierung',
    applicant_type: 'KMU'
  },
  {
    title: 'Brandenburgischer Innovationsgutschein (BIG – Digital)',
    description: 'Zuschüsse zur Vorbereitung und Umsetzung von Digitalisierungsmaßnahmen (Beratung, Implementierung, Schulung) in Brandenburger Unternehmen.',
    url: 'https://www.ilb.de/de/wirtschaft/zuschuesse/brandenburgischer-innovationsgutschein-big-digital/?utm_source=chatgpt.com',
    foerderhoehe: 'bis zu 50 % Zuschuss; max. 50.000 € (Beratung/Schulung) bzw. 250.000 € (Implementierung)',
    zielgruppe: 'KMU und Handwerksbetriebe mit Sitz in Brandenburg',
    antragsfrist: 'laufend, abhängig von verfügbaren Mitteln',
    foerderart: 'Zuschuss',
    ansprechpartner: 'Investitionsbank des Landes Brandenburg (ILB)',
    region: 'Brandenburg',
    category: 'Digitalisierung',
    applicant_type: 'KMU'
  },
  {
    title: 'ERP-Förderkredit Digitalisierung (KfW 511/512)',
    description: 'Bundesweites KfW-Darlehen zur Finanzierung von Investitionen und Betriebsmitteln für Digitalisierungsprojekte, inkl. möglichem Förderzuschuss.',
    url: 'https://www.kfw.de/inlandsfoerderung/Unternehmen/Innovation-und-Digitalisierung/F%C3%B6rderprodukte/ERP-F%C3%B6rderkredit-Digitalisierung-%28511-512%29/?utm_source=chatgpt.com',
    foerderhoehe: 'zinsgünstiger Kredit bis zu 25 Mio. € und bis zu 100 % der förderfähigen Kosten; Zuschuss bis max. 200.000 € möglich',
    zielgruppe: 'Freiberufler, KMU und größere Mittelständler (bis 500 Mio. € Jahresumsatz)',
    antragsfrist: 'laufend',
    foerderart: 'Darlehen mit Förderzuschuss',
    ansprechpartner: 'Hausbank / KfW',
    region: 'Bundesweit',
    category: 'Digitalisierung',
    applicant_type: 'KMU'
  },
  {
    title: 'NRW.BANK.Digitalisierungskredit',
    description: 'Darlehensprogramm zur Finanzierung von Digitalisierungsmaßnahmen in Unternehmen in Nordrhein-Westfalen.',
    url: 'https://www.nrwbank.de/de/foerderung/foerderprodukte/15914/produktdetail.html?utm_source=chatgpt.com',
    foerderhoehe: 'zinsgünstiges Darlehen, je nach Vorhaben bis zu mehreren Mio. € möglich',
    zielgruppe: 'Unternehmen der gewerblichen Wirtschaft und Freiberufler mit Investitionsort in NRW',
    antragsfrist: 'laufend',
    foerderart: 'Darlehen',
    ansprechpartner: 'NRW.BANK (Antrag über die Hausbank)',
    region: 'Nordrhein-Westfalen',
    category: 'Digitalisierung',
    applicant_type: 'KMU'
  },
  {
    title: 'ERP-Gründerkredit – StartGeld',
    description: 'Bundesweiter KfW-Kredit für Gründer und junge Unternehmen zur Finanzierung von Investitionen und Betriebsmitteln in der Startphase.',
    url: 'https://www.kfw.de/inlandsfoerderung/Unternehmen/?utm_source=chatgpt.com',
    foerderhoehe: 'zinsgünstiger Kredit bis zu rund 200.000 € (Investitionen und Betriebsmittel, je nach aktueller Kondition)',
    zielgruppe: 'Existenzgründer und kleine Unternehmen bis 5 Jahre nach Gründung',
    antragsfrist: 'laufend',
    foerderart: 'Darlehen',
    ansprechpartner: 'Hausbank / KfW',
    region: 'Bundesweit',
    category: 'Gründung',
    applicant_type: 'KMU'
  },

  {
    title: 'Digital Jetzt – Investitionsförderung für KMU',
    description: 'Förderung für Digitalisierungsvorhaben im Mittelstand.',
    url: 'https://www.bmwk.de/Redaktion/DE/Dossier/digital-jetzt.html?utm_source=chatgpt.com',
    foerderhoehe: 'bis zu 50%',
    zielgruppe: 'KMU, Handwerk',
    antragsfrist: 'laufend',
    foerderart: 'Zuschuss',
    ansprechpartner: 'BMWK',
    region: 'Bundesweit',
    category: 'Digitalisierung'
  },
  {
    title: 'Zentrales Innovationsprogramm Mittelstand (ZIM)',
    description: 'Förderung von Forschungs- und Entwicklungsprojekten im Mittelstand.',
    url: 'https://www.zim.de/?utm_source=chatgpt.com',
    foerderhoehe: 'bis zu 60%',
    zielgruppe: 'KMU',
    antragsfrist: 'laufend',
    foerderart: 'Zuschuss',
    ansprechpartner: 'BMWK',
    region: 'Bundesweit',
    category: 'Innovation'
  },

  {
    title: 'ZIM – Zentrales Innovationsprogramm Mittelstand (englisch)',
    description: 'Funding for innovative SMEs in Germany (English).',
    url: 'https://www.eura-ag.com/en/funding-programmes/zentrales-innovationsprogramm-mittelstand-zim?utm_source=chatgpt.com'
  },
  {
    title: 'KI für KMU',
    description: 'Förderprogramme für Künstliche Intelligenz in kleinen und mittleren Unternehmen.',
    url: 'https://www.softwaresysteme.dlr-pt.de/de/ki-fuer-kmu.php?utm_source=chatgpt.com',
    foerderhoehe: 'individuell',
    zielgruppe: 'KMU',
    antragsfrist: 'laufend',
    foerderart: 'Zuschuss',
    ansprechpartner: 'DLR Projektträger',
    region: 'Bundesweit',
    category: 'KI'
  },

  {
    title: 'Forschungszulage',
    description: 'Steuerliche Förderung von Forschung und Entwicklung.',
    url: 'https://www.bundesfinanzministerium.de/Web/DE/Themen/Steuern/Steuerliche_Themengebiete/Forschungszulage/forschungszulage.html?utm_source=chatgpt.com',
    foerderhoehe: '25% der förderfähigen Aufwendungen',
    zielgruppe: 'Unternehmen aller Größen',
    antragsfrist: 'laufend',
    foerderart: 'Steuerliche Förderung',
    ansprechpartner: 'Finanzamt',
    region: 'Bundesweit',
    category: 'Innovation'
  },
  {
    title: 'Bescheinigung Forschungszulage',
    description: 'Antragsportal für die Bescheinigung der Forschungszulage.',
    url: 'https://www.bescheinigung-forschungszulage.de/?utm_source=chatgpt.com'
  },
  {
    title: 'Effiziente Gebäude (BAFA)',
    description: 'Förderung für effiziente Gebäude und energetische Sanierung.',
    url: 'https://www.bafa.de/DE/Energie/Effiziente_Gebaeude/effiziente_gebaeude_node.html?utm_source=chatgpt.com'
  },
  {
    title: 'Bundesförderung für effiziente Gebäude (KfW)',
    description: 'KfW-Förderung für energieeffiziente Gebäude.',
    url: 'https://www.kfw.de/inlandsfoerderung/Bundesf%C3%B6rderung-f%C3%BCr-effiziente-Geb%C3%A4ude/?utm_source=chatgpt.com'
  },
  {
    title: 'Förderung von KI-Ökosystemen',
    description: 'Förderung von KI-Ökosystemen in Deutschland.',
    url: 'https://www.bmwk.de/Redaktion/DE/Infografiken/Technologie/foerderung-von-ki-oekosystemen.html?utm_source=chatgpt.com'
  },
  {
    title: 'Mittelstand Innovativ & Digital NRW',
    description: 'Förderung für Digitalisierung und Innovation in NRW.',
    url: 'https://www.mittelstand-innovativ-digital.nrw/?utm_source=chatgpt.com'
  },
  {
    title: 'EIC Accelerator (EU)',
    description: 'EU-Förderung für innovative KMU und Startups.',
    url: 'https://eic.ec.europa.eu/eic-funding-opportunities/eic-accelerator_en?utm_source=chatgpt.com',
    foerderhoehe: 'bis zu 2,5 Mio. €',
    zielgruppe: 'KMU, Start-ups',
    antragsfrist: 'mehrmals jährlich',
    foerderart: 'Zuschuss, Beteiligung',
    ansprechpartner: 'EU-Kommission',
    region: 'EU-weit',
    category: 'Innovation'
  },

  {
    title: 'EXIST-Gründungsstipendium',
    description: '12 Monate Lebenshaltungs- und Sachkostenförderung für technologieorientierte Gründungsteams.',
    url: 'https://www.exist.de/EXIST/Navigation/DE/Programm/Exist-Gruendungsstipendium/exist-gruendungsstipendium.html?utm_source=chatgpt.com',
    foerderhoehe: 'bis zu 3.000 €/Monat',
    zielgruppe: 'Gründungsteams, Hochschulabsolventen',
    antragsfrist: 'laufend',
    foerderart: 'Stipendium',
    ansprechpartner: 'BMWK',
    region: 'Bundesweit',
    category: 'Start-up'
  },
  {
    title: 'Bundesförderung Effiziente Gebäude (BEG)',
    description: 'Zuschüsse und Kredite für energieeffiziente Sanierungen und Neubauten.',
    url: 'https://www.kfw.de/inlandsfoerderung/Bundesf%C3%B6rderung-f%C3%BCr-effiziente-Geb%C3%A4ude/?utm_source=chatgpt.com',
    foerderhoehe: 'bis zu 45%',
    zielgruppe: 'Unternehmen, Privatpersonen',
    antragsfrist: 'laufend',
    foerderart: 'Zuschuss, Kredit',
    ansprechpartner: 'KfW, BAFA',
    region: 'Bundesweit',
    category: 'Energie'
  },
  {
    title: 'SME Instrument (Horizon Europe)',
    description: 'EU‑Finanzierung zur Skalierung hochinnovativer KMU (Nachfolger Phase 2).',
    url: 'https://eic.ec.europa.eu/eic-funding-opportunities/eic-accelerator_en?utm_source=chatgpt.com'
  },
  {
    title: 'Horizon Europe Cluster 4 – Digital, Industry & Space',
    description: 'Förderlinien für KI, Robotik und Datenökosysteme im EU-Rahmenprogramm.',
    url: 'https://ec.europa.eu/info/funding-tenders/opportunities/portal/screen/home?utm_source=chatgpt.com'
  },
  
  {
    title: 'EIT Digital Challenge',
    description: 'Preisgelder und Accelerator‑Support für Scale‑ups aus dem Bereich Digital & KI.',
    url: 'https://www.eitdigital.eu/challenge?utm_source=chatgpt.com'
  },
  {
    title: 'High-Tech Gründerfonds (HTGF)',
    description: 'Seed-Finanzierung für High-Tech-Startups bis zu 1 Mio. € in der Startphase.',
    url: 'https://www.htgf.de/?utm_source=chatgpt.com'
  },

  {
    title: 'progres.nrw – Batteriespeicher',
    description: 'Förderung von Batteriespeichern in Verbindung mit einer Photovoltaikanlage zur Speicherung von regenerativ erzeugtem Strom.',
    url: 'https://www.progres.nrw.de/batteriespeicher/',
    foerderhoehe: 'Bis zu 200 Euro pro kWh nutzbare Speicherkapazität',
    zielgruppe: 'Privatpersonen, Unternehmen, Kommunen',
    antragsfrist: 'Laufend bis Mittelerschöpfung',
    foerderart: 'Zuschuss',
    ansprechpartner: 'Bezirksregierung Arnsberg',
    region: 'Nordrhein-Westfalen',
    category: 'Energie',
    applicant_type: 'KMU'
  },
  {
    title: 'EIC Accelerator',
    description: 'EU-Förderprogramm für Startups und KMU mit innovativen, game-changing Produkten. Kombination aus Zuschuss und Eigenkapitalinvestition.',
    url: 'https://eic.ec.europa.eu/eic-funding-opportunities/eic-accelerator_en',
    foerderhoehe: 'Bis zu 2,5 Mio. Euro Zuschuss + bis zu 10 Mio. Euro Eigenkapital',
    zielgruppe: 'Startups, KMU, Small Mid-caps',
    antragsfrist: '12. März 2025, 1. Oktober 2025',
    foerderart: 'Zuschuss + Eigenkapital',
    ansprechpartner: 'European Innovation Council',
    region: 'EU',
    category: 'Innovation',
    applicant_type: 'KMU'
  },
  {
    title: 'Horizon Europe EIC Pathfinder',
    description: 'Förderung von Grundlagenforschung und frühen technologischen Entwicklungen mit hohem Innovationspotenzial.',
    url: 'https://eic.ec.europa.eu/eic-funding-opportunities/eic-pathfinder_en',
    foerderhoehe: 'Bis zu 3 Mio. Euro',
    zielgruppe: 'Forschungseinrichtungen, Startups, KMU',
    antragsfrist: 'Laufende Ausschreibungen',
    foerderart: 'Zuschuss',
    ansprechpartner: 'European Innovation Council',
    region: 'EU',
    category: 'Forschung',
    applicant_type: 'KMU'
  },

  {
    title: 'Heizungsförderung für Unternehmen – Nichtwohngebäude (522)',
    description: 'Zuschuss für den Kauf und Einbau klimafreundlicher Heizungen in Nichtwohngebäuden. Förderung von Wärmepumpen, Biomasseanlagen, Solarthermie.',
    url: 'https://www.kfw.de/inlandsfoerderung/Unternehmen/Energie-und-Umwelt/F%C3%B6rderprodukte/Heizungsf%C3%B6rderung-f%C3%BCr-Unternehmen-%E2%80%93-Nichtwohngeb%C3%A4ude-(522)/',
    foerderhoehe: 'Bis zu 35% der förderfähigen Kosten',
    zielgruppe: 'Unternehmen, Contractoren, andere Investoren',
    antragsfrist: 'Laufend',
    foerderart: 'Zuschuss',
    ansprechpartner: 'KfW Bankengruppe',
    region: 'Deutschland',
    category: 'Energie',
    applicant_type: 'KMU'
  },



  {
    title: 'Bundesförderung für effiziente Gebäude – Einzelmaßnahmen (BEG EM)',
    description: 'Förderung von Einzelmaßnahmen zur energetischen Sanierung von Gebäuden. Dämmung, Fenster, Anlagentechnik und Heizungsoptimierung.',
    url: 'https://www.bafa.de/DE/Energie/Effiziente_Gebaeude/Foerderprogramm_im_Ueberblick/foerderprogramm_im_ueberblick_node.html',
    foerderhoehe: 'Bis zu 30% Förderung + Boni',
    zielgruppe: 'Hauseigentümer, WEG, Unternehmen, Kommunen',
    antragsfrist: 'Laufend',
    foerderart: 'Zuschuss',
    ansprechpartner: 'BAFA',
    region: 'Deutschland',
    category: 'Energie',
    applicant_type: 'KMU'
  },
  {
    title: 'Bundesförderung der Energieberatung für Wohngebäude',
    description: 'Förderung von Energieberatungen durch qualifizierte Experten mit Erstellung eines individuellen Sanierungsfahrplans.',
    url: 'https://www.bafa.de/DE/Energie/Energieberatung/Energieberatung_Wohngebaeude/energieberatung_wohngebaeude_node.html',
    foerderhoehe: '50% des Beratungshonorars, max. 650-850 Euro',
    zielgruppe: 'Eigentümer, WEG, Mieter, Pächter',
    antragsfrist: 'Laufend',
    foerderart: 'Zuschuss',
    ansprechpartner: 'BAFA',
    region: 'Deutschland',
    category: 'Beratung',
    applicant_type: 'KMU'
  },
  {
    title: 'Förderung von Unternehmensberatungen für KMU',
    description: 'Zuschuss für Beratungsleistungen zu wirtschaftlichen, finanziellen, personellen und organisatorischen Fragen der Unternehmensführung.',
    url: 'https://www.bafa.de/DE/Wirtschaft/Beratung_Finanzierung/Unternehmensberatung/unternehmensberatung_node.html',
    foerderhoehe: 'Bis zu 4.000 Euro pro Beratung',
    zielgruppe: 'Kleine und mittlere Unternehmen',
    antragsfrist: 'Laufend, max. 5 Beratungen pro Unternehmen',
    foerderart: 'Zuschuss',
    ansprechpartner: 'BAFA + Leitstellen',
    region: 'Deutschland',
    category: 'Beratung',
    applicant_type: 'KMU'
  },
  {
    title: 'Kälte- und Klimaanlagen mit nicht-halogenierten Kältemitteln',
    description: 'Förderung von energieeffizienten Kälte- und Klimaanlagen mit umweltfreundlichen Kältemitteln in gewerblichen Anwendungen.',
    url: 'https://www.bafa.de/DE/Energie/Energieeffizienz/Klima_Kaeltetechnik/klima_kaeltetechnik_node.html',
    foerderhoehe: 'Abhängig von Anlagentyp und Leistung',
    zielgruppe: 'Unternehmen, Kommunen, gemeinnützige Organisationen',
    antragsfrist: 'Laufend',
    foerderart: 'Zuschuss',
    ansprechpartner: 'BAFA',
    region: 'Deutschland',
    category: 'Klimatechnik',
    applicant_type: 'KMU'
  },
  {
    title: 'Bundesförderung für Energie- und Ressourceneffizienz in der Wirtschaft',
    description: 'Umfassendes Förderprogramm mit 6 Modulen: Querschnittstechnologien, Prozesswärme, MSR/Sensorik, Anlagenoptimierung, Transformationspläne, Elektrifizierung.',
    url: 'https://www.bafa.de/DE/Energie/Energieeffizienz/Energieeffizienz_und_Prozesswaerme/energieeffizienz_und_prozesswaerme_node.html',
    foerderhoehe: 'Bis zu 60% Förderung je nach Modul',
    zielgruppe: 'Unternehmen, gemeinnützige Organisationen',
    antragsfrist: 'Laufend',
    foerderart: 'Zuschuss + Kredit',
    ansprechpartner: 'BAFA + KfW',
    region: 'Deutschland',
    category: 'Energie',
    applicant_type: 'KMU'
  },
  {
    title: 'High-Tech Gründerfonds (HTGF)',
    description: 'Frühphaseninvestor für technologieorientierte Startups. Investitionen in Pre-Seed und Seed-Phase mit starkem Netzwerk und Expertise.',
    url: 'https://www.htgf.de/',
    foerderhoehe: 'Ab 800.000 Euro initial, bis zu 30 Mio. Euro in Wachstumsphase',
    zielgruppe: 'Tech-Startups bis 3 Jahre alt',
    antragsfrist: 'Laufend',
    foerderart: 'Eigenkapital',
    ansprechpartner: 'High-Tech Gründerfonds',
    region: 'Deutschland',
    category: 'Gründung',
    applicant_type: 'KMU'
  },
  {
    title: 'EXIST-Gründerstipendium',
    description: 'Förderung innovativer technologieorientierter oder wissensbasierter Gründungsvorhaben, die an Hochschulen und Forschungseinrichtungen entstehen.',
    url: 'https://www.exist.de/EXIST/Navigation/DE/Gruendungsfoerderung/EXIST-Gruenderstipendium/exist-gruenderstipendium.html',
    foerderhoehe: 'Monatliches Stipendium + Sachkosten + Coachingkosten',
    zielgruppe: 'Studierende, Absolventen, Wissenschaftler',
    antragsfrist: 'Mehrmals jährlich',
    foerderart: 'Stipendium + Zuschuss',
    ansprechpartner: 'Projektträger Jülich',
    region: 'Deutschland',
    category: 'Gründung',
    applicant_type: 'KMU'
  },
  {
    title: 'Digital Hub Initiative',
    description: 'Vernetzung und Förderung digitaler Startups und etablierter Unternehmen in verschiedenen Technologiebereichen.',
    url: 'https://www.de-hub.de/',
    foerderhoehe: 'Verschiedene Fördermöglichkeiten je Hub',
    zielgruppe: 'Startups, Unternehmen, Forschungseinrichtungen',
    antragsfrist: 'Standortabhängig',
    foerderart: 'Förderung + Netzwerk',
    ansprechpartner: 'Regionale Digital Hubs',
    region: 'Deutschland',
    category: 'Digitalisierung',
    applicant_type: 'KMU'
  },


  // MEGA UPDATE: VIELE NEUE PROGRAMME aus verschiedenen Bundesländern

  // Baden-Württemberg Programme (L-Bank)
  {
    title: 'Innovationsfinanzierung 4.0 Digitalisierung - L-Bank',
    description: 'Förderung für innovative Digitalisierungsvorhaben von KMU zur Entwicklung neuer digitaler Systeme der Informations- und Kommunikationstechnik.',
    url: 'https://www.l-bank.de/produkte/wirtschaftsfoerderung/innovationsfinanzierung-4.0.html',
    foerderhoehe: 'Darlehen 10.000 bis 5 Mio. €, Tilgungszuschuss 1,0%',
    zielgruppe: 'KMU, kleine und mittlere Unternehmen',
    antragsfrist: 'Laufend',
    foerderart: 'Darlehen mit Tilgungszuschuss',
    ansprechpartner: 'L-Bank Baden-Württemberg',
    region: 'Baden-Württemberg',
    category: 'Digitalisierung',
    applicant_type: 'KMU'
  },



  // Sachsen Programme (SAB)

  // Thüringen Programme (TAB)

  {
    title: 'Digitalbonus Thüringen',
    description: 'Förderung von Digitalisierungsmaßnahmen und Betriebsmitteln für KMU zur digitalen Transformation.',
    url: 'https://www.aufbaubank.de/Foerderprogramme',
    foerderhoehe: 'Bis zu 50% Zuschuss',
    zielgruppe: 'KMU, Handwerk, Freiberufler',
    antragsfrist: 'Nach Verfügbarkeit',
    foerderart: 'Zuschuss',
    ansprechpartner: 'Thüringer Aufbaubank (TAB)',
    region: 'Thüringen',
    category: 'Digitalisierung',
    applicant_type: 'KMU'
  },
  {
    title: 'Gründungsprämie Thüringen',
    description: 'Sicherung des Lebensunterhalts bei innovativen Gründungen in der Vorgründungsphase zur Existenzgründung.',
    url: 'https://www.thex.de/',
    foerderhoehe: 'Bis zu 2.400 Euro monatlich für 12 Monate',
    zielgruppe: 'Existenzgründer, innovative Gründungen',
    antragsfrist: 'Laufend',
    foerderart: 'Zuschuss',
    ansprechpartner: 'ThEx Thüringen/TAB',
    region: 'Thüringen',
    category: 'Gründung',
    applicant_type: 'KMU'
  },
  {
    title: 'Mikrodarlehen Thüringen',
    description: 'Finanzierung von Gründungsvorhaben und jungen Unternehmen mit günstigen Konditionen für kleine Investitionen.',
    url: 'https://www.aufbaubank.de/Foerderprogramme',
    foerderhoehe: 'Bis zu 50.000 Euro',
    zielgruppe: 'Existenzgründer, junge Unternehmen',
    antragsfrist: 'Laufend',
    foerderart: 'Darlehen',
    ansprechpartner: 'Thüringer Aufbaubank (TAB)',
    region: 'Thüringen',
    category: 'Gründung',
    applicant_type: 'KMU'
  },

  // Hessen Programme (WI-Bank)
  {
    title: 'HessenFonds Innovationskredit',
    description: 'Unterstützung schnell wachsender und innovativer Unternehmen mit günstigen Zinsen, Zinszuschüssen und 70% Haftungsfreistellung.',
    url: 'https://www.wibank.de/innovationskredit',
    foerderhoehe: '100.000 bis 10 Mio. Euro, Zinsvergünstigung bis 2% p.a.',
    zielgruppe: 'KMU, mittelständische Unternehmen unter 500 MA, Gründer',
    antragsfrist: 'Laufend',
    foerderart: 'Darlehen',
    ansprechpartner: 'WI-Bank Hessen',
    region: 'Hessen',
    category: 'Innovation',
    applicant_type: 'KMU'
  },
  {
    title: 'DIGI-Zuschuss Hessen',
    description: 'Zuschuss zu Digitalisierungsmaßnahmen für KMU bei der digitalen Transformation von Produktions- und Arbeitsprozessen.',
    url: 'https://www.wibank.de/digital-zuschuss',
    foerderhoehe: 'Bis zu 50%, max. 10.000 EUR ab 4.000 EUR Investition',
    zielgruppe: 'KMU der gewerblichen Wirtschaft, freie Berufe',
    antragsfrist: 'Nach Zufallsauswahl',
    foerderart: 'Zuschuss',
    ansprechpartner: 'WI-Bank Hessen',
    region: 'Hessen',
    category: 'Digitalisierung',
    applicant_type: 'KMU'
  },
  {
    title: 'Ehrenamt digitalisiert Hessen',
    description: 'Förderung von Digitalisierungsvorhaben in gemeinnützigen Vereinen zur Optimierung interner Prozesse und Mitgliederverwaltung.',
    url: 'https://digitales.hessen.de/foerderprogramme/ehrenamt-digitalisiert',
    foerderhoehe: '5.000 bis 15.000 Euro, bis zu 90% Förderquote',
    zielgruppe: 'Gemeinnützige Vereine, Dachverbände, gemeinnützige Personen',
    antragsfrist: 'Jährliche Aufrufe',
    foerderart: 'Zuschuss',
    ansprechpartner: 'Hessisches Ministerium für Digitalisierung',
    region: 'Hessen',
    category: 'Digitalisierung',
    applicant_type: 'KMU'
  },

  // Weitere EU-Programme
  {
    title: 'EIC Pathfinder 2024',
    description: 'EU-Förderung für radikale Durchbruchsinnovationen und visionäre Forschung zur Entwicklung revolutionärer Technologien.',
    url: 'https://eic.ec.europa.eu/eic-funding-opportunities/eic-pathfinder_en',
    foerderhoehe: 'Bis zu 3 Millionen Euro für Konsortien',
    zielgruppe: 'Forschungseinrichtungen, innovative Unternehmen, Start-ups',
    antragsfrist: 'Mehrere Stichtage jährlich',
    foerderart: 'Zuschuss',
    ansprechpartner: 'Europäische Kommission',
    region: 'EU-weit',
    category: 'Innovation',
    applicant_type: 'KMU'
  },
  {
    title: 'Digital Europe Programme - AI',
    description: 'EU-Programm zur Förderung von KI-Technologien, digitalen Kompetenzen und Cybersicherheit in europäischen Unternehmen.',
    url: 'https://digital-strategy.ec.europa.eu/en/activities/digital-programme',
    foerderhoehe: 'Verschiedene Förderbeträge je Aufruf',
    zielgruppe: 'Unternehmen, Forschungseinrichtungen, öffentliche Einrichtungen',
    antragsfrist: 'Nach Aufrufen',
    foerderart: 'Zuschuss',
    ansprechpartner: 'Europäische Kommission',
    region: 'EU-weit',
    category: 'Digitalisierung',
    applicant_type: 'KMU'
  },
  {
    title: 'COSME Programm für KMU',
    description: 'EU-Programm zur Förderung der Wettbewerbsfähigkeit von KMU durch besseren Zugang zu Finanzierung und Märkten.',
    url: 'https://ec.europa.eu/growth/smes/cosme_en',
    foerderhoehe: 'Bürgschaften und Darlehen bis 150.000 Euro',
    zielgruppe: 'Kleine und mittlere Unternehmen',
    antragsfrist: 'Laufend über Finanzintermediäre',
    foerderart: 'Darlehen, Bürgschaften',
    ansprechpartner: 'Nationale Förderbanken',
    region: 'EU-weit',
    category: 'Unternehmensförderung',
    applicant_type: 'KMU'
  },

  // Branchenspezifische Programme


  {
    title: 'Exportinitiative Energie',
    description: 'BMWi-Programm zur Förderung deutscher Unternehmen beim Export von Energietechnologien und -dienstleistungen.',
    url: 'https://www.german-energy-solutions.de/GES/Navigation/DE/Home/home.html',
    foerderhoehe: 'Bis zu 50% der Messebeteiligungskosten',
    zielgruppe: 'Energieunternehmen, Technologieanbieter',
    antragsfrist: 'Je nach Veranstaltung',
    foerderart: 'Zuschuss',
    ansprechpartner: 'AHK, German Energy Solutions',
    region: 'Deutschland',
    category: 'Export',
    applicant_type: 'KMU'
  },






  // Weitere Startup-Programme

  {
    title: 'GO-Bio Gründungsoffensive Biotechnologie',
    description: 'BMBF-Förderung für Ausgründungen aus der Biotechnologie-Forschung zur Überführung in die Anwendung.',
    url: 'https://www.go-bio.de/',
    foerderhoehe: 'Bis zu 2 Mio. Euro über mehrere Phasen',
    zielgruppe: 'Biotechnologie-Gründungsteams aus der Forschung',
    antragsfrist: 'Jährliche Aufrufe',
    foerderart: 'Zuschuss',
    ansprechpartner: 'BMBF/Projektträger Jülich',
    region: 'Deutschland',
    category: 'Gründung',
    applicant_type: 'KMU'
  },

  // Zusätzliche Landesförderungen
  {
    title: 'High-Tech Gründerfonds',
    description: 'Frühphasenfinanzierung für technologieorientierte Unternehmen durch den größten Seed-Investor Deutschlands.',
    url: 'https://www.htgf.de/',
    foerderhoehe: 'Seed: bis 3 Mio. Euro, Growth: bis 10 Mio. Euro',
    zielgruppe: 'Technologie-Startups, B2B-Geschäftsmodelle',
    antragsfrist: 'Laufend',
    foerderart: 'Beteiligung',
    ansprechpartner: 'High-Tech Gründerfonds',
    region: 'Deutschland',
    category: 'Gründung',
    applicant_type: 'KMU'
  },

  // MEGA UPDATE PART 2: NOCH VIEL MEHR NEUE PROGRAMME aus Hamburg, Schleswig-Holstein, Mecklenburg-Vorpommern, Berlin

  // Hamburg Programme (IFB Hamburg)

  {
    title: 'InnoFounder - IFB Innovationsstarter Hamburg',
    description: 'Personenbezogene Zuschüsse für Gründer und Gründungsteams in der Vor- und Gründungsphase. Förderung neuartiger, digitaler Gründungsvorhaben aus dem Medien- und Content-Bereich.',
    url: 'https://innovationsstarter.com/',
    foerderhoehe: 'Bis zu 75.000 € personenbezogene Zuschüsse',
    zielgruppe: 'Gründer und Gründungsteams, insbesondere digitale Startups',
    antragsfrist: 'Laufend',
    foerderart: 'Zuschuss',
    ansprechpartner: 'IFB Innovationsstarter GmbH',
    region: 'Hamburg',
    category: 'Gründung',
    applicant_type: 'KMU'
  },
  {
    title: 'InnoRampUp - Deep Tech Startups Hamburg',
    description: 'Förderung technologisch hoch innovativer Startups in der Gründungsphase. Unterstützt werden technologische Innovationen aus allen Branchen wie AI, Life Science, EV, 3D-Druck.',
    url: 'https://innovationsstarter.com/',
    foerderhoehe: 'Bis zu 150.000 € Zuschuss',
    zielgruppe: 'Technologisch innovative Startups, Deep Tech',
    antragsfrist: 'Laufend',
    foerderart: 'Zuschuss',
    ansprechpartner: 'IFB Innovationsstarter GmbH',
    region: 'Hamburg',
    category: 'Innovation',
    applicant_type: 'KMU'
  },
  {
    title: 'InnoFinTech - Hamburg FinTech Förderung',
    description: 'Spezielle Förderung für Startups aus dem FinTech, PropTech oder InsurTech Sektor. Stärkung des Finanzplatzes Hamburg durch innovative Finanzdienstleistungen.',
    url: 'https://innovationsstarter.com/',
    foerderhoehe: 'Bis zu 200.000 € Zuschuss',
    zielgruppe: 'FinTech, PropTech, InsurTech Startups',
    antragsfrist: 'Verlängert bis Ende 2025',
    foerderart: 'Zuschuss',
    ansprechpartner: 'IFB Innovationsstarter GmbH',
    region: 'Hamburg',
    category: 'FinTech',
    applicant_type: 'KMU'
  },

  {
    title: 'Hamburg-Kredit Wachstum',
    description: 'Darlehen für das Wachstum innovativer Unternehmen und Startups. Finanzierung von Markteinführung, Expansion und Digitalisierungsvorhaben.',
    url: 'https://www.ifbhh.de/',
    foerderhoehe: 'Zinsgünstiges Darlehen',
    zielgruppe: 'Innovative Unternehmen, Startups',
    antragsfrist: 'Laufend',
    foerderart: 'Darlehen',
    ansprechpartner: 'IFB Hamburg',
    region: 'Hamburg',
    category: 'Wachstum',
    applicant_type: 'KMU'
  },

  // Schleswig-Holstein Programme (IB.SH)
  {
    title: 'Landesprogramm Wirtschaft SH - Gewerbegebiete',
    description: 'Förderung von Industrie- und Gewerbegebieten zur Stärkung der Wettbewerbsfähigkeit. Unterstützt Erschließung, Ausbau und Revitalisierung von Gewerbeflächen.',
    url: 'https://www.ib-sh.de/',
    foerderhoehe: 'Bis zu 60% der förderfähigen Kosten, erhöht bis 90% bei klimaneutralen Projekten',
    zielgruppe: 'Gemeinden und Gemeindeverbände',
    antragsfrist: 'Laufend',
    foerderart: 'Zuschuss',
    ansprechpartner: 'Investitionsbank Schleswig-Holstein (IB.SH)',
    region: 'Schleswig-Holstein',
    category: 'Infrastruktur',
    applicant_type: 'Projektträger'
  },
  {
    title: 'GRW Gewerbliche Wirtschaft - Schleswig-Holstein',
    description: 'Gemeinschaftsaufgabe Verbesserung der regionalen Wirtschaftsstruktur. Zentrales Förderprogramm für Investitionsvorhaben der gewerblichen Wirtschaft.',
    url: 'https://www.ib-sh.de/',
    foerderhoehe: 'Investitionszuschüsse nach GRW-Fördersätzen',
    zielgruppe: 'Unternehmen der gewerblichen Wirtschaft',
    antragsfrist: 'Laufend',
    foerderart: 'Zuschuss',
    ansprechpartner: 'IB.SH',
    region: 'Schleswig-Holstein',
    category: 'Investition',
    applicant_type: 'KMU'
  },
  {
    title: 'IB.SH Unternehmensfinanzierung',
    description: 'Vielfältige Finanzierungsinstrumente für Unternehmen in Schleswig-Holstein. Von Gründung über Wachstum bis hin zu Nachfolge und Innovation.',
    url: 'https://www.ib-sh.de/unser-angebot/fuer-unternehmen/',
    foerderhoehe: 'Darlehen, Zuschüsse, Beteiligungen je nach Programm',
    zielgruppe: 'Unternehmen aller Größen und Branchen',
    antragsfrist: 'Laufend',
    foerderart: 'Darlehen/Zuschuss/Beteiligung',
    ansprechpartner: 'IB.SH Förderlotsen',
    region: 'Schleswig-Holstein',
    category: 'Unternehmensfinanzierung',
    applicant_type: 'KMU'
  },
  {
    title: 'Energie und Umwelt Förderung SH',
    description: 'Förderung von Projekten im Bereich Energie und Umwelt in Schleswig-Holstein. Unterstützt Klimaschutz und nachhaltige Energieeffizienz.',
    url: 'https://www.ib-sh.de/',
    foerderhoehe: 'Verschiedene Fördersätze je nach Maßnahme',
    zielgruppe: 'Unternehmen, Kommunen, Privatpersonen',
    antragsfrist: 'Laufend',
    foerderart: 'Zuschuss/Darlehen',
    ansprechpartner: 'IB.SH',
    region: 'Schleswig-Holstein',
    category: 'Energie',
    applicant_type: 'KMU'
  },
  {
    title: 'Digitalisierung Schleswig-Holstein',
    description: 'Unterstützung bei der Digitalisierung von Unternehmen und Organisationen. Teil des European Digital Innovation Hub Schleswig-Holstein (EDIH-SH).',
    url: 'https://www.ib-sh.de/',
    foerderhoehe: 'Beratung, Förderung und Finanzierung',
    zielgruppe: 'Unternehmen, Organisationen',
    antragsfrist: 'Laufend',
    foerderart: 'Beratung/Zuschuss',
    ansprechpartner: 'IB.SH / EDIH-SH',
    region: 'Schleswig-Holstein',
    category: 'Digitalisierung',
    applicant_type: 'KMU'
  },

  // Mecklenburg-Vorpommern Programme (LFI M-V)
  {
    title: 'GRW Gewerbliche Wirtschaft M-V',
    description: 'Gemeinschaftsaufgabe Verbesserung der regionalen Wirtschaftsstruktur in Mecklenburg-Vorpommern. Zentrales Förderprogramm für Investitionsvorhaben der gewerblichen Wirtschaft.',
    url: 'https://www.lfi-mv.de/',
    foerderhoehe: 'Investitionszuschüsse nach GRW-Koordinierungsrahmen',
    zielgruppe: 'Unternehmen der gewerblichen Wirtschaft',
    antragsfrist: 'Laufend',
    foerderart: 'Zuschuss',
    ansprechpartner: 'Landesförderinstitut M-V',
    region: 'Mecklenburg-Vorpommern',
    category: 'Investition',
    applicant_type: 'KMU'
  },
  {
    title: 'GRW Infrastruktur M-V',
    description: 'Förderung des Ausbaus der wirtschaftsnahen Infrastruktur zur Stärkung der Wettbewerbsfähigkeit von Unternehmen in Mecklenburg-Vorpommern.',
    url: 'https://www.lfi-mv.de/',
    foerderhoehe: 'Zuschüsse für Infrastrukturprojekte',
    zielgruppe: 'Kommunen, öffentliche Einrichtungen',
    antragsfrist: 'Laufend',
    foerderart: 'Zuschuss',
    ansprechpartner: 'LFI M-V',
    region: 'Mecklenburg-Vorpommern',
    category: 'Infrastruktur',
    applicant_type: 'Projektträger'
  },
  {
    title: 'Ersteinstellung von Personal M-V',
    description: 'Zuschüsse zu den Personalausgaben bei der Schaffung von zusätzlichen Arbeitsplätzen in kleinen und mittleren Unternehmen der gewerblichen Wirtschaft.',
    url: 'https://www.lfi-mv.de/',
    foerderhoehe: 'Zuschuss zu Personalkosten',
    zielgruppe: 'KMU der gewerblichen Wirtschaft',
    antragsfrist: 'Laufend',
    foerderart: 'Zuschuss',
    ansprechpartner: 'LFI M-V',
    region: 'Mecklenburg-Vorpommern',
    category: 'Personal',
    applicant_type: 'KMU'
  },
  {
    title: 'Klimaschutz-Projekte Unternehmen M-V',
    description: 'Förderung von Investitionen in den technischen Klimaschutz für eine nachhaltige Verringerung von Treibhausgasemissionen in wirtschaftlich tätigen Organisationen.',
    url: 'https://www.lfi-mv.de/',
    foerderhoehe: 'Zuschuss für Klimaschutzinvestitionen',
    zielgruppe: 'Unternehmen und wirtschaftlich tätige Organisationen',
    antragsfrist: 'Laufend',
    foerderart: 'Zuschuss',
    ansprechpartner: 'LFI M-V',
    region: 'Mecklenburg-Vorpommern',
    category: 'Klimaschutz',
    applicant_type: 'KMU'
  },
  {
    title: 'Messen und Ausstellungen M-V',
    description: 'Förderung der Teilnahme von Kleinstunternehmen, kleinen und mittleren Unternehmen an nationalen sowie internationalen Messen und Ausstellungen.',
    url: 'https://www.lfi-mv.de/',
    foerderhoehe: 'Zuschuss zu Messekosten',
    zielgruppe: 'Kleinstunternehmen, KMU',
    antragsfrist: 'Laufend',
    foerderart: 'Zuschuss',
    ansprechpartner: 'LFI M-V',
    region: 'Mecklenburg-Vorpommern',
    category: 'Marketing',
    applicant_type: 'KMU'
  },
  {
    title: 'Meisterprämie M-V',
    description: 'Zuwendungen für die erstmalige Gründung durch Unternehmensnachfolge, Neugründung oder tätige Beteiligung einer selbständigen Vollexistenz im Handwerk.',
    url: 'https://www.lfi-mv.de/',
    foerderhoehe: 'Prämie für Meistergründung',
    zielgruppe: 'Handwerksmeister, Gründer im Handwerk',
    antragsfrist: 'Laufend',
    foerderart: 'Zuschuss',
    ansprechpartner: 'LFI M-V',
    region: 'Mecklenburg-Vorpommern',
    category: 'Handwerk',
    applicant_type: 'KMU'
  },
  {
    title: 'Wissenschaftliche Geräte M-V',
    description: 'Verbesserung der anwendungsorientierten FuE-Kapazitäten an Hochschulen und Forschungseinrichtungen durch Ausbau der Forschungs- und Innovationskapazitäten.',
    url: 'https://www.lfi-mv.de/',
    foerderhoehe: 'Zuschuss für wissenschaftliche Ausstattung',
    zielgruppe: 'Hochschulen, Forschungseinrichtungen',
    antragsfrist: 'Laufend',
    foerderart: 'Zuschuss',
    ansprechpartner: 'LFI M-V',
    region: 'Mecklenburg-Vorpommern',
    category: 'Forschung',
    applicant_type: 'Projektträger'
  },
  {
    title: 'Mini-Solaranlagen M-V',
    description: 'Förderung für die Anschaffung und Installation von steckerfertigen Photovoltaikanlagen (Mini-Balkonkraftwerke) zur dezentralen Energieerzeugung.',
    url: 'https://www.lfi-mv.de/',
    foerderhoehe: 'Zuschuss für Mini-PV-Anlagen',
    zielgruppe: 'Privatpersonen, Unternehmen',
    antragsfrist: 'Laufend',
    foerderart: 'Zuschuss',
    ansprechpartner: 'LFI M-V',
    region: 'Mecklenburg-Vorpommern',
    category: 'Energie',
    applicant_type: 'KMU'
  },

  // Berlin Programme (IBB, Senat)
  {
    title: 'Berlin Startup Scholarship',
    description: 'Stipendien für innovative, technologieorientierte Gründerinnen und Gründer in Berlin. Coaching, Training und Stipendien für Startups mit Fokus auf ICT, Digitalisierung und Internationalisierung.',
    url: 'https://www.berlin.de/sen/wirtschaft/gruenden-und-foerdern/',
    foerderhoehe: 'Bis zu 2.200 € pro Person und Monat',
    zielgruppe: 'Technologieorientierte Gründungsteams, Startups',
    antragsfrist: 'Verschiedene Ausschreibungsrunden',
    foerderart: 'Stipendium',
    ansprechpartner: 'Senat für Wirtschaft Berlin / IBB',
    region: 'Berlin',
    category: 'Gründung',
    applicant_type: 'KMU'
  },
  {
    title: 'GründungsBONUS Plus Berlin',
    description: 'Zuschüsse für den Unternehmensaufbau innovativer und nachhaltiger Startups in Berlin. Förderung von Kosten für Entwicklung, Implementierung und Marktestablierung.',
    url: 'https://www.ibb-business-team.de/en/gruendungsbonus-plus/',
    foerderhoehe: 'Bis zu 50% der Gesamtkosten, max. 50.000 €',
    zielgruppe: 'Innovative und nachhaltige Startups',
    antragsfrist: 'Laufend',
    foerderart: 'Zuschuss',
    ansprechpartner: 'IBB Business Team GmbH',
    region: 'Berlin',
    category: 'Gründung',
    applicant_type: 'KMU'
  },
  {
    title: 'Transfer BONUS Berlin',
    description: 'Zuschüsse für die Zusammenarbeit von Wirtschaft und Wissenschaft. Förderung von Kooperationsprojekten zwischen Unternehmen und Forschungseinrichtungen.',
    url: 'https://www.ibb-business-team.de/',
    foerderhoehe: 'Zuschuss für Transferprojekte',
    zielgruppe: 'Unternehmen in Kooperation mit Forschungseinrichtungen',
    antragsfrist: 'Laufend',
    foerderart: 'Zuschuss',
    ansprechpartner: 'IBB Business Team GmbH',
    region: 'Berlin',
    category: 'Innovation',
    applicant_type: 'KMU'
  },
  {
    title: 'Berliner InvestitionsBONUS',
    description: 'Zuschüsse für betriebliche Zukunftsinvestitionen in Berlin. Förderung von Investitionen in Digitalisierung, Nachhaltigkeit und Innovation.',
    url: 'https://www.ibb-business-team.de/',
    foerderhoehe: 'Zuschuss für Investitionen',
    zielgruppe: 'Berliner Unternehmen',
    antragsfrist: 'Laufend',
    foerderart: 'Zuschuss',
    ansprechpartner: 'IBB Business Team GmbH',
    region: 'Berlin',
    category: 'Investition',
    applicant_type: 'KMU'
  },
  {
    title: 'WELMO - Wirtschaftsnahe Elektromobilität Berlin',
    description: 'Zuschüsse für den Umstieg auf Elektromobilität in Berliner Unternehmen. Förderung von E-Fahrzeugen und Ladeinfrastruktur für gewerbliche Nutzung.',
    url: 'https://www.ibb-business-team.de/',
    foerderhoehe: 'Zuschuss für E-Mobilität',
    zielgruppe: 'Berliner Unternehmen',
    antragsfrist: 'Laufend',
    foerderart: 'Zuschuss',
    ansprechpartner: 'IBB Business Team GmbH',
    region: 'Berlin',
    category: 'Mobilität',
    applicant_type: 'KMU'
  },
  {
    title: 'SolarPLUS Berlin',
    description: 'Zuschüsse für Photovoltaikprojekte in Berlin. Förderung der dezentralen Solarenergieerzeugung und Beitrag zur Energiewende.',
    url: 'https://www.ibb-business-team.de/',
    foerderhoehe: 'Zuschuss für PV-Anlagen',
    zielgruppe: 'Immobilieneigentümer, Unternehmen',
    antragsfrist: 'Laufend',
    foerderart: 'Zuschuss',
    ansprechpartner: 'IBB Business Team GmbH',
    region: 'Berlin',
    category: 'Energie',
    applicant_type: 'KMU'
  },
  {
    title: 'GründachPLUS Berlin',
    description: 'Zuschüsse für Dach- und Fassadenbegrünung in Berlin. Förderung nachhaltiger Stadtentwicklung und Verbesserung des Stadtklimas.',
    url: 'https://www.ibb-business-team.de/',
    foerderhoehe: 'Zuschuss für Begrünungsmaßnahmen',
    zielgruppe: 'Immobilieneigentümer, Unternehmen',
    antragsfrist: 'Laufend',
    foerderart: 'Zuschuss',
    ansprechpartner: 'IBB Business Team GmbH',
    region: 'Berlin',
    category: 'Nachhaltigkeit',
    applicant_type: 'KMU'
  }
];

// Ensure all programs have a unique customId and prepare for consistent access
programmes.forEach((p, index) => {
  p.customId = 'prog_' + index;
});

const fuse = new Fuse(programmes, {
  keys: [
    { name: 'title', weight: 3 },
    { name: 'description', weight: 2 },
    { name: 'category', weight: 2 },
    { name: 'region', weight: 1.5 },
    { name: 'zielgruppe', weight: 1 },
    { name: 'foerderart', weight: 1 },
  ],
  includeScore: true,
  threshold: 0.3,
  ignoreLocation: true,
  minMatchCharLength: 3,
});

/* ----------  FAVORITES (LocalStorage)  ---------- */
const FAVORITES_KEY = 'mpoolFoerderFavoriten';
const FAVORITES_DATA_KEY = 'mpoolFoerderFavoritenData'; // map id => programme details

function getFavoriteProgramIds() {
  const favorites = localStorage.getItem(FAVORITES_KEY);
  return favorites ? JSON.parse(favorites) : [];
}

function saveFavoriteProgramIds(idsArray) {
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(idsArray));
}

function isFavorite(programId) {
  return getFavoriteProgramIds().includes(programId);
}

function getFavoritesData() {
  const json = localStorage.getItem(FAVORITES_DATA_KEY);
  return json ? JSON.parse(json) : {};
}

function saveFavoritesData(obj) {
  localStorage.setItem(FAVORITES_DATA_KEY, JSON.stringify(obj));
}

// Map of all programmes rendered in current page (base + AI)
const displayedProgrammes = {};
// Helper to register programme object with its id for later access
function registerDisplayedProgramme(id, programmeObj) {
  displayedProgrammes[id] = programmeObj;
}

function setupFavoriteStyles() {
  const style = document.createElement('style');
  style.textContent = `
        .heart-icon svg {
            stroke: #9ca3af; /* gray-400 */
            fill: none;
            transition: fill 0.2s ease-in-out, stroke 0.2s ease-in-out;
        }

        .heart-icon:hover svg {
            stroke: #f87171; /* red-400 */
        }
        
        .heart-icon.favorited svg {
            stroke: #ef4444; /* red-500 */
            fill: #ef4444; /* red-500 */
        }

        .heart-icon.favorited:hover svg {
            stroke: #dc2626; /* red-600 */
            fill: #dc2626; /* red-600 */
        }
    `;
  document.head.appendChild(style);
}

function handleToggleFavorite(programId, heartIconElement) {
  console.log('[handleToggleFavorite] Called with programId:');
  console.log(programId);
  console.log('Element:');
  console.log(heartIconElement);
  let favoriteIds = getFavoriteProgramIds();
  console.log('[handleToggleFavorite] Initial favoriteIds from localStorage:');
  console.log(favoriteIds);
  const program = programmes.find(p => p.customId === programId) || displayedProgrammes[programId];

  if (!program) {
    console.error('[handleToggleFavorite] Program not found for ID: ' + programId);
    return;
  }
  console.log('[handleToggleFavorite] Found program:');
  console.log(program.title);

  const favoritesData = getFavoritesData();
  if (favoriteIds.includes(programId)) {
    console.log('[handleToggleFavorite] Program IS currently a favorite. Removing...');
    favoriteIds = favoriteIds.filter(id => id !== programId);
    heartIconElement.classList.remove('favorited');
    console.log("[handleToggleFavorite] Removed 'favorited' class. Element classList:");
    console.log(heartIconElement.classList);
    addMessage(`"${program.title}" von Favoriten entfernt.`, 'system');
    delete favoritesData[programId];
  } else {
    console.log('[handleToggleFavorite] Program is NOT currently a favorite. Adding...');
    favoriteIds.push(programId);
    heartIconElement.classList.add('favorited');
    console.log("[handleToggleFavorite] Added 'favorited' class. Element classList:");
    console.log(heartIconElement.classList);
    addMessage(`"${program.title}" zu Favoriten hinzugefügt.`, 'system');
    favoritesData[programId] = program;
  }

  console.log('[handleToggleFavorite] favoriteIds to be saved:');
  console.log(favoriteIds);
  saveFavoriteProgramIds(favoriteIds);
  saveFavoritesData(favoritesData);
  console.log('[handleToggleFavorite] Called saveFavoriteProgramIds. Check localStorage for mpoolFoerderFavoriten.');
  // No full re-render here, just updating the icon and local storage.
  // The chat itself is not re-rendered by this action.
}

// Make the function globally accessible for onclick handlers
window.handleToggleFavorite = handleToggleFavorite;

const chatEl = document.getElementById('chat');
const chatForm = document.getElementById('chatForm');
const queryInput = document.getElementById('query');
const modelSelect = document.getElementById('modelSelect');
const resultsEl = document.getElementById('results');
const regionFilterEl = document.getElementById('regionFilter');
const categoryFilterEl = document.getElementById('categoryFilter');

// Custom Dropdown elements for 'Förderart'
const fundingTypeDropdownContainer = document.getElementById('fundingTypeDropdownContainer');
const fundingTypeDropdownButton = document.getElementById('fundingTypeDropdownButton');
const fundingTypeDropdownLabel = document.getElementById('fundingTypeDropdownLabel');
const fundingTypeDropdownPanel = document.getElementById('fundingTypeDropdownPanel');

// Custom Dropdown elements for 'Unternehmensgröße'
const companySizeDropdownContainer = document.getElementById('companySizeDropdownContainer');
const companySizeDropdownButton = document.getElementById('companySizeDropdownButton');
const companySizeDropdownLabel = document.getElementById('companySizeDropdownLabel');
const companySizeDropdownPanel = document.getElementById('companySizeDropdownPanel');

// Custom Dropdown elements für 'Unternehmensbranche'
const industryDropdownContainer = document.getElementById('industryDropdownContainer');
const industryDropdownButton = document.getElementById('industryDropdownButton');
const industryDropdownLabel = document.getElementById('industryDropdownLabel');
const industryDropdownPanel = document.getElementById('industryDropdownPanel');

// Filter Apply Button
const filterApplyButton = document.getElementById('filterApplyButton');

/* ----------  VOICE INPUT (Web Speech API)  ---------- */
const supportsSpeech = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
let recognition = null;
/* ----------  DOCUMENT CONTEXT  ---------- */
let docContext = '';   // wird gefüllt, wenn der Nutzer eine Datei hochlädt
let lastUserQueryForFilter = ''; // Speichert die letzte Benutzeranfrage für automatische Filter-Neuanfragen
let filtersDirty = false; // Wenn true: Filter geändert, aber noch nicht angewendet
let lastContextSummary = ''; // Merkt sich den letzten Kontext für kurze Folgefragen
let suppressChatSave = false; // verhindert das Speichern von System-Meldungen beim Seitenstart
const NOTIFY_WEB_SEEN_KEY = 'mpoolWebSeenProgramIds';
let lastWebResults = [];

function getSelectedModel() {
  if (modelSelect && modelSelect.value) return modelSelect.value;
  return 'gpt-5-mini';
}

function buildFilterOnlyQuery() {
  const parts = [];
  if (regionFilterEl && regionFilterEl.value) parts.push(`Region: ${regionFilterEl.value}`);
  if (categoryFilterEl && categoryFilterEl.value) parts.push(`Förderbereich: ${categoryFilterEl.value}`);

  const getCheckedText = (panel) =>
    panel ? Array.from(panel.querySelectorAll('input:checked')).map(cb => cb.value) : [];

  const funding = getCheckedText(fundingTypeDropdownPanel);
  if (funding.length) parts.push(`Förderart: ${funding.join(', ')}`);

  const sizes = getCheckedText(companySizeDropdownPanel);
  if (sizes.length) parts.push(`Unternehmensgröße: ${sizes.join(', ')}`);

  const industries = getCheckedText(industryDropdownPanel);
  if (industries.length) parts.push(`Unternehmensbranche: ${industries.join(', ')}`);

  if (parts.length === 0) {
    return 'Suche passende Förderprogramme.';
  }
  return `Suche passende Förderprogramme für: ${parts.join('; ')}.`;
}

const NOTIFY_CACHE_KEY = 'mpoolWebNotifyCache';
const NOTIFY_CACHE_TTL = 15 * 60 * 1000;
const NOTIFY_AUTO_INTERVAL = 15 * 60 * 1000;
let notifyRefreshTimer = null;

function getSeenWebIds() {
  const raw = localStorage.getItem(NOTIFY_WEB_SEEN_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

function setSeenWebIds(ids) {
  localStorage.setItem(NOTIFY_WEB_SEEN_KEY, JSON.stringify(ids));
}

function getWebId(item) {
  if (item.url) return item.url;
  if (item.title) return item.title;
  return JSON.stringify(item);
}

function getNotifyCache() {
  try {
    const raw = localStorage.getItem(NOTIFY_CACHE_KEY);
    if (!raw) return null;
    const cache = JSON.parse(raw);
    if (Date.now() - cache.ts < NOTIFY_CACHE_TTL) return cache;
  } catch (e) { /* ignore */ }
  return null;
}

function setNotifyCache(results) {
  try {
    localStorage.setItem(NOTIFY_CACHE_KEY, JSON.stringify({ ts: Date.now(), results }));
  } catch (e) { /* ignore */ }
}

async function fetchWebNotifications() {
  const year = new Date().getFullYear();

  const queries = [
    `Ressourcen Management Förderprogramm neu ${year} Deutschland Unternehmen`,
    `Nachhaltigkeitsberichterstattung CSRD Förderung ${year} Deutschland`,
    `Klimabilanzierung Förderprogramm ${year} Deutschland Unternehmen`,
    `Digitalisierung Förderprogramm neu ${year} Deutschland KMU`,
  ];

  const maxQueries = Math.min(queries.length, 4);
  const selectedQueries = queries.slice(0, maxQueries);

  const allResults = [];
  const seenUrls = new Set();

  const searchPromises = selectedQueries.map(async (q) => {
    try {
      const searchUrl = `https://www.googleapis.com/customsearch/v1?key=${GOOGLE_API_KEY}&cx=${GOOGLE_CX}&q=${encodeURIComponent(q)}&num=5&sort=date`;
      const res = await fetch(searchUrl);
      if (!res.ok) return [];
      const data = await res.json();
      return (data.items || []).map(item => ({
        title: item.title,
        description: item.snippet || '',
        url: item.link,
        source: extractDomain(item.link),
        searchQuery: q,
      }));
    } catch (e) {
      return [];
    }
  });

  const batchResults = await Promise.all(searchPromises);
  for (const batch of batchResults) {
    for (const item of batch) {
      const url = (item.url || '').toLowerCase();
      if (seenUrls.has(url)) continue;
      if (/youtube|facebook|twitter|instagram|tiktok/.test(url)) continue;
      const text = (item.title + ' ' + item.description).toLowerCase();
      if (/österreich|schweiz|\.at\/|\.ch\/|switzerland|austria/i.test(url + ' ' + text)
        && !/deutschland|deutsch|bundesweit|bund\.de|bmwk|bafa|kfw/i.test(text)) continue;
      seenUrls.add(url);
      allResults.push(item);
    }
  }

  allResults.sort((a, b) => {
    const aYear = extractYearFromText(a.title + ' ' + a.description);
    const bYear = extractYearFromText(b.title + ' ' + b.description);
    return bYear - aYear;
  });

  return allResults.slice(0, 15);
}

function extractDomain(url) {
  try {
    return new URL(url).hostname.replace('www.', '');
  } catch (e) {
    return '';
  }
}

function extractYearFromText(text) {
  const matches = text.match(/20[2-3]\d/g);
  if (!matches) return 2000;
  return Math.max(...matches.map(Number));
}

function renderWebNotifications(results) {
  const badgeEl = document.getElementById('notificationsBadge');
  const listEl = document.getElementById('notificationsList');
  const statusEl = document.getElementById('notificationsStatus');
  const markBtn = document.getElementById('notificationsMarkSeen');
  const tsEl = document.getElementById('notificationsTimestamp');
  if (!badgeEl || !listEl || !statusEl) return;

  const seen = new Set(getSeenWebIds());
  const unseen = results.filter(r => !seen.has(getWebId(r)));
  const seenResults = results.filter(r => seen.has(getWebId(r)));

  badgeEl.textContent = unseen.length ? (unseen.length > 9 ? '9+' : String(unseen.length)) : '';

  if (results.length === 0) {
    statusEl.textContent = 'Keine neuen Programme gefunden.';
    listEl.innerHTML = '';
    if (markBtn) markBtn.disabled = true;
    return;
  }

  const unseenCount = unseen.length;
  statusEl.textContent = unseenCount > 0
    ? `${unseenCount} neue${unseenCount === 1 ? 's' : ''} Programm${unseenCount === 1 ? '' : 'e'} gefunden:`
    : 'Alle Programme gelesen. Letzte Ergebnisse:';

  const renderItem = (p, isNew) => `
    <div class="notification-item ${isNew ? 'notification-item--new' : ''}">
      <div class="notification-item__header">
        <div class="notification-item__title">${p.title || 'Neues Förderprogramm'}</div>
        ${isNew ? '<span class="notification-new-tag">NEU</span>' : ''}
      </div>
      ${p.description ? `<div class="notification-item__desc">${p.description}</div>` : ''}
      <div class="notification-item__footer">
        ${p.source ? `<span class="notification-item__source">${p.source}</span>` : ''}
        ${p.url ? `<a class="notification-item__link" href="${p.url}" target="_blank" rel="noopener">Zum Programm &rarr;</a>` : ''}
      </div>
    </div>`;

  const html = [
    ...unseen.map(p => renderItem(p, true)),
    ...seenResults.slice(0, 5).map(p => renderItem(p, false)),
  ].join('');

  listEl.innerHTML = html;
  if (markBtn) markBtn.disabled = unseenCount === 0;
}

function updateNotifyTimestamp() {
  const tsEl = document.getElementById('notificationsTimestamp');
  if (!tsEl) return;
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  tsEl.textContent = `Zuletzt geprüft: ${hh}:${mm} Uhr`;
}

async function updateWebNotifications(forceRefresh = false) {
  const statusEl = document.getElementById('notificationsStatus');
  const refreshBtn = document.getElementById('notificationsRefresh');

  if (!forceRefresh) {
    const cache = getNotifyCache();
    if (cache && cache.results) {
      lastWebResults = cache.results;
      renderWebNotifications(lastWebResults);
      updateNotifyTimestamp();
      return;
    }
  }

  if (statusEl) statusEl.textContent = 'Suche nach neuen Förderprogrammen...';
  if (refreshBtn) refreshBtn.disabled = true;

  try {
    lastWebResults = await fetchWebNotifications();
    setNotifyCache(lastWebResults);
    renderWebNotifications(lastWebResults);
    updateNotifyTimestamp();
  } catch (e) {
    console.warn('[Notifications] Fehler:', e);
    if (statusEl) statusEl.textContent = 'Websuche nicht verfügbar.';
  } finally {
    if (refreshBtn) refreshBtn.disabled = false;
  }
}

function initWebNotificationsUI() {
  const btn = document.getElementById('notificationsButton');
  const panel = document.getElementById('notificationsPanel');
  const refreshBtn = document.getElementById('notificationsRefresh');
  const markBtn = document.getElementById('notificationsMarkSeen');
  if (!btn || !panel) return;

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    const wasHidden = panel.classList.contains('hidden');
    panel.classList.toggle('hidden');
    panel.setAttribute('aria-hidden', panel.classList.contains('hidden') ? 'true' : 'false');
    if (wasHidden && lastWebResults.length === 0) {
      updateWebNotifications(true);
    }
  });

  document.addEventListener('click', (e) => {
    if (!panel.contains(e.target) && !btn.contains(e.target)) {
      panel.classList.add('hidden');
      panel.setAttribute('aria-hidden', 'true');
    }
  });

  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => updateWebNotifications(true));
  }

  if (markBtn) {
    markBtn.addEventListener('click', () => {
      const ids = new Set(getSeenWebIds());
      lastWebResults.forEach(r => ids.add(getWebId(r)));
      setSeenWebIds(Array.from(ids));
      renderWebNotifications(lastWebResults);
    });
  }

  if (notifyRefreshTimer) clearInterval(notifyRefreshTimer);
  notifyRefreshTimer = setInterval(() => updateWebNotifications(true), NOTIFY_AUTO_INTERVAL);
}

function isShortFollowUp(text) {
  if (!text) return false;
  const t = text.trim().toLowerCase();
  if (t.startsWith('nur ') || t.startsWith('jetzt ') || t.startsWith('jetzt') || t.startsWith('nur')) return true;
  return t.split(/\s+/).length <= 4;
}

function buildContextualQuery(userMsg) {
  if (!lastContextSummary) return userMsg;
  if (!isShortFollowUp(userMsg)) return userMsg;
  return `${lastContextSummary} | Update: ${userMsg}`;
}

function updateContextSummary(userMsg) {
  const filterSummary = buildFilterOnlyQuery();
  lastContextSummary = `${filterSummary} Vorherige Anfrage: ${userMsg}`;
}

function setupVoiceInput() {
  const micBtn = document.getElementById('micBtn');
  if (!micBtn) return;

  if (!supportsSpeech) {
    micBtn.style.display = 'none';
    return;
  }

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  recognition = new SpeechRecognition();
  recognition.lang = 'de-DE';
  recognition.interimResults = true;
  recognition.continuous = false;
  recognition.maxAlternatives = 1;

  let listening = false;
  let savedPlaceholder = '';

  micBtn.addEventListener('click', () => {
    if (listening) {
      recognition.stop();
      return;
    }
    try {
      recognition.start();
    } catch (e) {
      console.warn('[Voice] Konnte nicht starten:', e.message);
    }
  });

  recognition.addEventListener('start', () => {
    listening = true;
    savedPlaceholder = queryInput.placeholder;
    queryInput.placeholder = 'Sprechen Sie jetzt...';
    micBtn.classList.add('recording');
    queryInput.value = '';
  });

  recognition.addEventListener('end', () => {
    listening = false;
    queryInput.placeholder = savedPlaceholder;
    micBtn.classList.remove('recording');
    const finalText = queryInput.value.trim();
    if (finalText) {
      chatForm.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    }
  });

  recognition.addEventListener('result', (event) => {
    let interimTranscript = '';
    let finalTranscript = '';
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const t = event.results[i][0].transcript;
      if (event.results[i].isFinal) {
        finalTranscript += t;
      } else {
        interimTranscript += t;
      }
    }
    if (finalTranscript) {
      queryInput.value = finalTranscript.trim();
    } else {
      queryInput.value = interimTranscript;
    }
  });

  recognition.addEventListener('error', (event) => {
    listening = false;
    queryInput.placeholder = savedPlaceholder;
    micBtn.classList.remove('recording');
    if (event.error !== 'no-speech' && event.error !== 'aborted') {
      console.warn('[Voice] Fehler:', event.error);
    }
  });
}

/* ----------  FILE UPLOAD (PDF/TXT)  ---------- */
function setupFileUpload() {
  const uploadBtn = document.getElementById('uploadBtn');
  const fileInput = document.getElementById('docFile');
  const chipBar = document.getElementById('fileChipBar');
  if (!uploadBtn || !fileInput) return;

  uploadBtn.addEventListener('click', () => fileInput.click());

  function showFileChip(name) {
    if (!chipBar) return;
    chipBar.innerHTML = '';
    const chip = document.createElement('div');
    chip.className = 'file-chip';
    chip.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
      <span class="file-chip-name">${name}</span>
      <button type="button" class="file-chip-remove" title="Datei entfernen">&times;</button>`;
    chipBar.appendChild(chip);
    chipBar.classList.remove('hidden');
    chip.querySelector('.file-chip-remove').addEventListener('click', () => {
      docContext = '';
      fileInput.value = '';
      chipBar.classList.add('hidden');
      chipBar.innerHTML = '';
    });
    queryInput.focus();
  }

  fileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    showFileChip(file.name);

    try {
      let text = '';
      if (file.type === 'text/plain') {
        text = await file.text();
      } else if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
        if (!window.pdfjsLib) {
          addMessage('<span class="text-red-600">PDF-Parser konnte nicht geladen werden.</span>', 'ai');
          return;
        }
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
        const uint8 = new Uint8Array(await file.arrayBuffer());
        const pdf = await window.pdfjsLib.getDocument({ data: uint8 }).promise;
        const maxPages = Math.min(pdf.numPages, 5);
        for (let i = 1; i <= maxPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          text += content.items.map(it => it.str).join(' ') + '\n';
        }
      } else {
        addMessage('<span class="text-orange-600">Dateityp nicht unterstützt. Bitte PDF oder TXT.</span>', 'ai');
        chipBar.classList.add('hidden');
        chipBar.innerHTML = '';
        return;
      }
      docContext = text.slice(0, 8000);
    } catch (err) {
      console.error('Datei-Analyse-Fehler', err);
      addMessage('<span class="text-red-600">Datei konnte nicht verarbeitet werden.</span>', 'ai');
      chipBar.classList.add('hidden');
      chipBar.innerHTML = '';
    }
  });
}

function populateRegionFilter() {
  if (!regionFilterEl) return;
  const staticRegions = [
    'Bundesweit',
    'Baden-Württemberg',
    'Bayern',
    'Berlin',
    'Brandenburg',
    'Bremen',
    'Niedersachsen',
    'Sachsen-Anhalt',
    'Hamburg',
    'Hessen',
    'Mecklenburg-Vorpommern',
    'Nordrhein-Westfalen',
    'Rheinland-Pfalz',
    'Saarland',
    'Sachsen',
    'Schleswig-Holstein',
    'Thüringen'
  ];

  const regionsSet = new Set(staticRegions);
  programmes.forEach(p => { if (p.region) regionsSet.add(p.region); });
  const favData = getFavoritesData();
  Object.values(favData).forEach(p => { if (p && p.region) regionsSet.add(p.region); });

  regionFilterEl.innerHTML = '<option value="">Alle Regionen</option>' +
    Array.from(regionsSet).sort().map(r => `<option>${r}</option>`).join('');
}

function setupFundingTypeDropdown() {
  if (!fundingTypeDropdownContainer) return;

  const fundingTypeSet = new Set();
  const fromImage = ['Darlehen', 'Zuschuss'];
  fromImage.forEach(item => fundingTypeSet.add(item));

  fundingTypeDropdownPanel.innerHTML = ''; // Clear existing
  Array.from(fundingTypeSet).sort().forEach(item => {
    if (!item) return;
    const wrapper = document.createElement('div');
    // CSS handles styling via .dropdown-panel div

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = `ft-check-${item.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
    checkbox.value = item;
    checkbox.className = 'form-checkbox'; // Custom CSS class

    const label = document.createElement('label');
    label.htmlFor = checkbox.id;
    label.className = 'ml-3 block text-sm cursor-pointer flex-grow'; // Removed text-gray-700
    label.textContent = item;

    wrapper.appendChild(checkbox);
    wrapper.appendChild(label);

    // Make whole row clickable
    wrapper.addEventListener('click', (e) => {
      if (e.target !== checkbox && e.target !== label) {
        checkbox.checked = !checkbox.checked;
        checkbox.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });

    fundingTypeDropdownPanel.appendChild(wrapper);
  });

  // Toggle Panel
  fundingTypeDropdownButton.addEventListener('click', (e) => {
    e.stopPropagation();
    fundingTypeDropdownPanel.classList.toggle('hidden');
    // Close others
    eligibleDropdownPanel.classList.add('hidden');
    companySizeDropdownPanel.classList.add('hidden');
    if (industryDropdownPanel) industryDropdownPanel.classList.add('hidden');
  });

  // Close when clicking outside
  document.addEventListener('click', (e) => {
    if (!fundingTypeDropdownContainer.contains(e.target)) {
      fundingTypeDropdownPanel.classList.add('hidden');
    }
  });

  fundingTypeDropdownPanel.addEventListener('change', () => {
    const selected = Array.from(fundingTypeDropdownPanel.querySelectorAll('input:checked')).map(cb => cb.value);
    if (selected.length === 0) {
      fundingTypeDropdownLabel.textContent = 'Alle auswählen';
      fundingTypeDropdownLabel.classList.remove('font-semibold');
    } else if (selected.length === 1) {
      fundingTypeDropdownLabel.textContent = selected[0];
      fundingTypeDropdownLabel.classList.add('font-semibold');
    } else {
      fundingTypeDropdownLabel.textContent = `${selected.length} ausgewählt`;
      fundingTypeDropdownLabel.classList.add('font-semibold');
    }
    filtersDirty = true;
  });
}

function setupCompanySizeDropdown() {
  if (!companySizeDropdownContainer) return;

  const companySizeOptions = ['Großes Unternehmen', 'Mittleres Unternehmen', 'Kleines Unternehmen', 'Kleinstunternehmen'];

  companySizeDropdownPanel.innerHTML = ''; // Clear existing
  companySizeOptions.forEach(item => {
    const wrapper = document.createElement('div');
    // CSS handles styling via .dropdown-panel div

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = `cs-check-${item.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
    checkbox.value = item;
    checkbox.className = 'form-checkbox'; // Custom CSS class

    const label = document.createElement('label');
    label.htmlFor = checkbox.id;
    label.className = 'ml-3 block text-sm cursor-pointer flex-grow'; // Removed text-gray-700
    label.textContent = item;

    wrapper.appendChild(checkbox);
    wrapper.appendChild(label);

    // Make whole row clickable
    wrapper.addEventListener('click', (e) => {
      if (e.target !== checkbox && e.target !== label) {
        checkbox.checked = !checkbox.checked;
        checkbox.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });

    companySizeDropdownPanel.appendChild(wrapper);
  });

  // Toggle Panel
  companySizeDropdownButton.addEventListener('click', (e) => {
    e.stopPropagation();
    companySizeDropdownPanel.classList.toggle('hidden');
    // Close others
    eligibleDropdownPanel.classList.add('hidden');
    fundingTypeDropdownPanel.classList.add('hidden');
    if (industryDropdownPanel) industryDropdownPanel.classList.add('hidden');
  });

  // Close when clicking outside
  document.addEventListener('click', (e) => {
    if (!companySizeDropdownContainer.contains(e.target)) {
      companySizeDropdownPanel.classList.add('hidden');
    }
  });

  companySizeDropdownPanel.addEventListener('change', () => {
    const selected = Array.from(companySizeDropdownPanel.querySelectorAll('input:checked')).map(cb => cb.value);
    if (selected.length === 0) {
      companySizeDropdownLabel.textContent = 'Alle auswählen';
      companySizeDropdownLabel.classList.remove('font-semibold');
    } else if (selected.length === 1) {
      companySizeDropdownLabel.textContent = selected[0];
      companySizeDropdownLabel.classList.add('font-semibold');
    } else {
      companySizeDropdownLabel.textContent = `${selected.length} ausgewählt`;
      companySizeDropdownLabel.classList.add('font-semibold');
    }
    filtersDirty = true;
  });
}

function setupIndustryDropdown() {
  if (!industryDropdownContainer) return;

  const industries = [
    '(CPA A 01) Landwirtschaft und Jagd',
    '(CPA A 02) Forstwirtschaft und Holzeinschlag',
    '(CPA A 03) Fischerei und Aquakultur',
    '(CPA B 07-09) Erzbergbau, Gewinnung von Steinen und Erden, sonstiger Bergbau',
    '(CPA B 05) Kohlenbergbau',
    '(CPA B 06) Gewinnung von Erdöl und Erdgas',
    '(CPA C 10-12) H.v. Nahrungsmitteln und Getränken; Tabakverarb.',
    '(CPA C 13-15) H.v. Textilien, Bekleidung, Leder und Lederwaren, Schuhen',
    '(CPA C 16) H.v. Holz-, Flecht-, Korb- und Korkwaren (ohne Möbel)',
    '(CPA C 17) H.v. Papier, Pappe und Waren daraus',
    '(CPA C 18) H.v. Druckereierzeugnissen, Vervielf. Von Ton-, Bild-, Datenträgern',
    '(CPA C 19) Kokerei und Mineralölverarbeitung',
    '(CPA C 20) H.v. chemischen Erzeugnissen',
    '(CPA C 21) H.v. pharmazeutischen Erzeugnissen',
    '(CPA C 22) H.v. Gummi- und Kunststoffwaren',
    '(CPA C 23.1) H.v. Glas und Glaswaren',
    '(CPA C 23.2-9) H.v. Keramik, Verarb. Von Steinen und Erden',
    '(CPA C 25) H.v. Metallerzeugnissen',
    '(CPA C 26) H.v. DV-Geräten, elektronischen und optischen Erzeugnissen',
    '(CPA C 27) H.v. elektrischen Ausrüstungen',
    '(CPA C 28) Maschinenbau',
    '(CPA C 29) H.v. Kraftwagen und Kraftwagenteilen',
    '(CPA C 30) Sonstiger Fahrzeugbau',
    '(CPA C 31-32) H.v. Möbeln und sonstigen Waren',
    '(CPA C 33) Reparatur und Installation von Maschinen und Ausrüstungen',
    '(CPA D 35.2) Elektrizitätsversorgung, Wärme- und Kälteversorgung',
    '(CPA D 35.2) Gasversorgung',
    '(CPA E 36) Wasserversorgung',
    '(CPA E 37-39) Abwasser-, Abfallentsorgung, Rückgewinnung',
    '(CPA F 43) Vorb. Baustellenarbeiten, Bauinstallation, sonstiger',
    '(CPA G 45) Kfz-Handel; Instandhaltung und Reparatur von Kfz',
    '(CPA G 46) Großhandel (ohne Handel mit Kfz)',
    '(CPA G 47) Einzelhandel (ohne Handel mit Kfz)',
    '(CPA H 50) Schifffahrt',
    '(CPA H 51) Luftfahrt',
    '(CPA H 52) Lagerei und sonstige Dienstleistungen für den Verkehr',
    '(CPA H 53) Post-, Kurier- und Expressdienste',
    '(CPA I) Gastgewerbe',
    '(CPA J) Information und Kommunikation',
    '(CPA K) Finanz- und Versicherungsdienstleistungen',
    '(CPA L) Grundstücks- und Wohnungswesen',
    '(CPA M 69-72) Freiberufliche, wissenschaftliche und technische Dienstleistungen',
    '(CPA M 73-75, N) Sonstige wirtschaftliche Dienstleistungen',
    '(CPA O) Öffentliche Verwaltung, Verteidigung; Sozialversicherung',
    '(CPA P) Erziehung und Unterricht',
    '(CPA Q) Gesundheits- und Sozialwesen',
    '(CPA R-T) Sonstige Dienstleistungen'
  ];

  industryDropdownPanel.innerHTML = '';
  industries.forEach(item => {
    const wrapper = document.createElement('div');

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = `ind-check-${item.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
    checkbox.value = item;
    checkbox.className = 'form-checkbox';

    const label = document.createElement('label');
    label.htmlFor = checkbox.id;
    label.className = 'ml-3 block text-sm cursor-pointer flex-grow';
    label.textContent = item;

    wrapper.appendChild(checkbox);
    wrapper.appendChild(label);

    wrapper.addEventListener('click', (e) => {
      if (e.target !== checkbox && e.target !== label) {
        checkbox.checked = !checkbox.checked;
        checkbox.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });

    industryDropdownPanel.appendChild(wrapper);
  });

  industryDropdownButton.addEventListener('click', (e) => {
    e.stopPropagation();
    industryDropdownPanel.classList.toggle('hidden');
    eligibleDropdownPanel.classList.add('hidden');
    fundingTypeDropdownPanel.classList.add('hidden');
    companySizeDropdownPanel.classList.add('hidden');
  });

  document.addEventListener('click', (e) => {
    if (!industryDropdownContainer.contains(e.target)) {
      industryDropdownPanel.classList.add('hidden');
    }
  });

  industryDropdownPanel.addEventListener('change', () => {
    const selected = Array.from(industryDropdownPanel.querySelectorAll('input:checked')).map(cb => cb.value);
    if (selected.length === 0) {
      industryDropdownLabel.textContent = 'Alle auswählen';
      industryDropdownLabel.classList.remove('font-semibold');
    } else if (selected.length === 1) {
      industryDropdownLabel.textContent = selected[0];
      industryDropdownLabel.classList.add('font-semibold');
    } else {
      industryDropdownLabel.textContent = `${selected.length} ausgewählt`;
      industryDropdownLabel.classList.add('font-semibold');
    }
    filtersDirty = true;
  });
}

document.addEventListener('DOMContentLoaded', () => {
  setupVoiceInput();
  setupFileUpload();
  setupFavoriteStyles();
  setupFundingTypeDropdown();
  setupCompanySizeDropdown();
  setupIndustryDropdown();
  initWebNotificationsUI();
  updateWebNotifications();

  const existingChats = pruneEmptyChats();
  if (existingChats.length > 0) {
    currentChatId = existingChats[0].id;
    loadChat(currentChatId, true);
  } else {
    // Begrüßung anzeigen, aber keinen leeren Chat anlegen
    suppressChatSave = true;
    addMessage('<span class="text-blue-300 text-sm">Guten Tag, Andreas. Ich suche passende Förderprogramme für dich.</span>', 'system');
  }

  if (filterApplyButton) {
    filterApplyButton.addEventListener('click', () => {
      const typedQuery = queryInput && queryInput.value.trim();
      if (typedQuery) {
        lastUserQueryForFilter = typedQuery;
      } else {
        // Immer neu aus Filtern bauen, damit Änderungen sofort wirken
        lastUserQueryForFilter = buildFilterOnlyQuery();
        addMessage('<span class="text-blue-400">Suche wird mit den ausgewählten Filtern gestartet.</span>', 'system');
      }
      filtersDirty = false;
      // Zeige den Prompt immer im Chat ganz unten
      addMessage(lastUserQueryForFilter, 'user');
      scrollChatToBottom();
      askOpenAIChat(lastUserQueryForFilter, { skipUserMessage: true });
    });
  }

  // Event Listener für Filteränderungen hinzufügen
  if (regionFilterEl) {
    regionFilterEl.addEventListener('change', handleFilterChange);
  }
  if (categoryFilterEl) {
    categoryFilterEl.addEventListener('change', handleFilterChange);
  }

  const themeHeaderBtn = document.getElementById('themeToggle');
  if (themeHeaderBtn) {
    themeHeaderBtn.addEventListener('click', () => {
      const newTheme = document.documentElement.classList.contains('dark') ? 'light' : 'dark';
      applyTheme(newTheme);
      localStorage.setItem(THEME_KEY, newTheme);
    });
  }

  const filterToggle = document.getElementById('filterToggle');
  const filterSection = document.querySelector('.filter-section');
  const filterContent = document.getElementById('filterContent');

  const updateAriaExpanded = (isExpanded) => {
    if (!filterToggle) return;
    filterToggle.setAttribute('aria-expanded', isExpanded ? 'true' : 'false');
  };

  if (filterToggle && filterSection && filterContent) {
    const expandFilters = () => {
      filterSection.classList.remove('collapsed');
      filterContent.style.overflow = 'hidden';
      filterContent.style.opacity = '1';
      filterContent.style.maxHeight = filterContent.scrollHeight + 'px';

      const handleTransitionEnd = (event) => {
        if (event.target !== filterContent || event.propertyName !== 'max-height') return;
        filterContent.style.maxHeight = 'none';
        filterContent.style.overflow = 'visible';
        filterContent.removeEventListener('transitionend', handleTransitionEnd);
      };

      filterContent.addEventListener('transitionend', handleTransitionEnd);
      setTimeout(() => {
        filterContent.style.maxHeight = 'none';
        filterContent.style.overflow = 'visible';
      }, 500);
      updateAriaExpanded(true);
    };

    const collapseFilters = () => {
      filterContent.style.overflow = 'hidden';
      filterContent.style.maxHeight = filterContent.scrollHeight + 'px';
      requestAnimationFrame(() => {
        filterSection.classList.add('collapsed');
        filterContent.style.opacity = '0';
        filterContent.style.maxHeight = '0px';
      });
      updateAriaExpanded(false);
    };

    const toggleFilters = () => {
      if (filterSection.classList.contains('collapsed')) {
        expandFilters();
      } else {
        collapseFilters();
      }
    };

    filterToggle.setAttribute('role', 'button');
    filterToggle.setAttribute('tabindex', '0');

    const startsCollapsed = filterSection.classList.contains('collapsed');
    if (startsCollapsed) {
      updateAriaExpanded(false);
      filterContent.style.maxHeight = '0px';
      filterContent.style.overflow = 'hidden';
      filterContent.style.opacity = '0';
    } else {
      updateAriaExpanded(true);
      filterContent.style.maxHeight = 'none';
      filterContent.style.overflow = 'visible';
    }

    filterToggle.addEventListener('click', toggleFilters);
    filterToggle.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        toggleFilters();
      }
    });
  }
});

function addMessage(content, sender = 'user') {
  const msg = document.createElement('div');
  msg.className = `mb-2 max-w-2xl ${sender === 'user' ? 'self-end chat-bubble-user' : sender === 'system' ? 'self-center system-message' : 'self-start chat-bubble-ai'}`;
  msg.innerHTML = content;
  chatEl.appendChild(msg);
  chatEl.scrollTop = chatEl.scrollHeight;
}

function scrollChatToBottom() {
  if (!chatEl) return;
  const lastMsg = chatEl.lastElementChild;
  if (lastMsg && typeof lastMsg.scrollIntoView === 'function') {
    lastMsg.scrollIntoView({ behavior: 'smooth', block: 'end' });
  } else if (typeof chatEl.scrollIntoView === 'function') {
    chatEl.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }
}

// Helper to create stable slug from title
function slugify(text) {
  return text.toString().toLowerCase()
    .replace(/\s+/g, '-')           // Replace spaces with -
    .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
    .replace(/\-\-+/g, '-')         // Replace multiple - with single -
    .replace(/^-+/, '')               // Trim - from start of text
    .replace(/-+$/, '');              // Trim - from end of text
}

function ensureCustomId(prog) {
  if (prog.customId) return prog.customId;
  // Try match by title in base programmes array
  const match = programmes.find(base => base.title === prog.title);
  if (match && match.customId) {
    prog.customId = match.customId;
    return prog.customId;
  }
  // Fallback: slugify title
  prog.customId = 'ai_' + slugify(prog.title || ('prog-' + Date.now()));
  return prog.customId;
}

function renderProgrammeList(list) {
  const favoriteProgramIds = getFavoriteProgramIds();
  return list.map(p => {
    const id = ensureCustomId(p);
    // register for later lookup
    registerDisplayedProgramme(id, { ...p, customId: id });
    const isProgFavorite = favoriteProgramIds.includes(id);
    const heartIconPath = `<path stroke-linecap="round" stroke-linejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />`;

    // Status Badge Logic
    let statusBadge = '';
    if (p.isWebResult) {
      statusBadge = `<span class="status-badge status-badge--web">
        <span class="status-badge__dot" aria-hidden="true"></span>
        Neu (Web 12/2025)
      </span>`;
    } else if (isActiveProgram(p)) {
      statusBadge = `<span class="status-badge status-badge--active">
        <span class="status-badge__dot" aria-hidden="true"></span>
        Aktiv
      </span>`;
    } else {
      statusBadge = `<span class="status-badge status-badge--inactive">
        <span class="status-badge__dot" aria-hidden="true"></span>
        Beendet
      </span>`;
    }

    return `
    <article class="programme-card relative" data-antragsfrist="${p.antragsfrist || ''}">
      <div class="flex justify-between items-start mb-2">
        ${statusBadge}
        <button 
          title="Zu Favoriten hinzufügen/entfernen"
          class="heart-icon p-2 rounded-full hover:bg-white/10 focus:outline-none text-gray-500 ${isProgFavorite ? 'text-red-500' : ''}"
          data-program-id="${id}">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${isProgFavorite ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="1.5" class="w-6 h-6">
            ${heartIconPath}
          </svg>
        </button>
      </div>
      
      <h3>${p.title}</h3>
      <p>${p.description || ''}</p>
      
      <div class="meta">
        ${p.foerderhoehe ? `<div><strong>Förderhöhe:</strong> ${p.foerderhoehe}</div>` : ''}
        ${p.zielgruppe ? `<div><strong>Zielgruppe:</strong> ${p.zielgruppe}</div>` : ''}
        ${p.region ? `<div><strong>Region:</strong> ${p.region}</div>` : ''}
        ${p.antragsfrist ? `<div><strong>Frist:</strong> ${p.antragsfrist}</div>` : ''}
      </div>
      
      ${p.why ? `<div class="mt-3 p-3 bg-blue-50 text-blue-900 text-sm rounded border border-blue-100"><strong>💡 Warum passend:</strong> ${p.why}</div>` : ''}
      
      <div class="text-right mt-4">
        <a class="inline-flex items-center text-blue-600 font-semibold hover:text-blue-800 transition-colors" href="${p.url}" target="_blank" rel="noopener">
          Zum Programm
          <svg class="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>
        </a>
      </div>
    </article>
  `;
  }).join('');
}

/* ---------- HELPER FUNCTIONS FOR URL PROCESSING ---------- */
function extractUrls(text) {
  if (!text) return [];
  const urlRegex = /(https?:\/\/[^\s/$.?#].[^\s]*)/gi;
  const urls = text.match(urlRegex);
  return urls ? urls : [];
}

function htmlToText(html) {
  try {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    // Entferne Skript- und Style-Elemente, um deren Inhalt zu vermeiden und die Lesbarkeit zu verbessern
    tempDiv.querySelectorAll('script, style, link, head, meta, noscript, iframe, nav, footer, aside').forEach(el => el.remove());
    // Ersetze einige Block-Elemente durch Zeilenumbrüche für bessere Lesbarkeit
    tempDiv.querySelectorAll('p, br, div, h1, h2, h3, h4, h5, h6, li, article, section').forEach(el => {
      const span = document.createElement('span');
      span.textContent = '\n';
      el.parentNode.insertBefore(span, el.nextSibling);
    });
    let text = tempDiv.textContent || tempDiv.innerText || "";
    // Entferne überflüssige Leerzeilen und Leerzeichen
    text = text.replace(/\n\s*\n/g, '\n').replace(/\s\s+/g, ' ').trim();
    return text;
  } catch (e) {
    console.error("Fehler beim Konvertieren von HTML zu Text:", e);
    return ""; // Fallback auf leeren String
  }
}

// Smart URL validation function with timeout
async function validateProgramUrl(url, timeoutMs = 3000) {
  if (!url || typeof url !== 'string') return false;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
      mode: 'no-cors' // Avoid CORS issues, we just want to know if it exists
    });

    clearTimeout(timeoutId);
    // In no-cors mode, we get an opaque response, which means the request succeeded
    return true;
  } catch (error) {
    // If it's a CORS error or timeout, we'll consider it potentially valid (benefit of doubt)
    // Only reject on clear network errors
    if (error.name === 'AbortError') {
      console.warn(`[URL Validation] Timeout for ${url}`);
      return true; // Benefit of doubt for slow servers
    }
    console.warn(`[URL Validation] Failed for ${url}:`, error.message);
    return false;
  }
}

///
async function askOpenAIChat(userMsg, options = {}) {
  const { skipUserMessage = false } = options;
  const effectiveUserMsg = buildContextualQuery(userMsg);
  updateContextSummary(userMsg);
  if (!skipUserMessage) {
    addMessage(userMsg, 'user');
  }

  const urls = extractUrls(userMsg);
  if (urls.length > 0) {
    const firstUrl = urls[0];
    addMessage(`Versuche, Inhalte von <a href="${firstUrl}" target="_blank" rel="noopener noreferrer" class="text-blue-600 underline">${firstUrl}</a> zu laden...`, 'ai');
    try {
      let htmlContent = '';
      try {
        const response = await fetch(firstUrl);
        if (!response.ok) {
          addMessage(`Direkter Abruf von ${firstUrl} fehlgeschlagen (Status: ${response.status}). Versuche es über einen Proxy...`, 'ai');
          throw new Error('Direct fetch failed');
        }
        htmlContent = await response.text();
        addMessage(`Inhalte von ${firstUrl} direkt erfolgreich geladen. Verarbeite Text...`, 'ai');
      } catch (directFetchError) {
        const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(firstUrl)}`;
        const proxyResponse = await fetch(proxyUrl);
        if (!proxyResponse.ok) {
          throw new Error(`HTTP-Fehler! Direkt: ${directFetchError.message}, Proxy-Status: ${proxyResponse.status}`);
        }
        htmlContent = await proxyResponse.text();
        addMessage(`Inhalte von ${firstUrl} (via Proxy) erfolgreich geladen. Verarbeite Text...`, 'ai');
      }

      const plainText = htmlToText(htmlContent);
      if (plainText && plainText.length > 50) {
        docContext = plainText.slice(0, 10000);
        addMessage(`Text von ${firstUrl} erfolgreich extrahiert und als Kontext für diese Anfrage verwendet. Länge: ${docContext.length} Zeichen.`, 'ai');
      } else {
        addMessage(`Konnte keinen sinnvollen Textinhalt von ${firstUrl} extrahieren. Der bisherige Datei-Kontext (falls vorhanden) wird verwendet.`, 'ai');
      }
    } catch (error) {
      console.error('Fehler beim Laden/Verarbeiten der URL:', error);
      addMessage(`Konnte Inhalte von ${firstUrl} nicht automatisch laden (Fehler: ${error.message}). Bitte nutze die Datei-Upload-Funktion oder kopiere relevanten Text manuell. Der bisherige Datei-Kontext (falls vorhanden) wird weiterhin verwendet.`, 'ai');
    }
  }

  const loadingEl = document.createElement('div');
  loadingEl.className = 'mb-2 max-w-2xl self-start chat-bubble-ai chat-loading-indicator';
  loadingEl.innerHTML = '<span class="flex items-center gap-2 text-blue-700"><svg class="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path></svg>KI sucht passende Förderprogramme…</span>';
  chatEl.appendChild(loadingEl);
  chatEl.scrollTop = chatEl.scrollHeight;

  const removeLoading = () => {
    document.querySelectorAll('.chat-loading-indicator').forEach(el => {
      el.classList.add('removing');
      setTimeout(() => el.remove(), 250);
    });
  };

  try {
    const selectedRegion = regionFilterEl.value;
    const selectedCategory = categoryFilterEl.value;
    const selectedFundingTypes = fundingTypeDropdownPanel ?
      Array.from(fundingTypeDropdownPanel.querySelectorAll('input:checked')).map(cb => cb.value) :
      [];
    const selectedCompanySizes = companySizeDropdownPanel ?
      Array.from(companySizeDropdownPanel.querySelectorAll('input:checked')).map(cb => cb.value) :
      [];
    const selectedIndustries = industryDropdownPanel ?
      Array.from(industryDropdownPanel.querySelectorAll('input:checked')).map(cb => cb.value) :
      [];

    let filterContext = '';
    const filters = [];
    if (selectedRegion) filters.push(`Region: ${selectedRegion}`);
    if (selectedCategory) filters.push(`Förderbereich: ${selectedCategory}`);
    if (selectedFundingTypes.length > 0) filters.push(`Förderart: ${selectedFundingTypes.join(', ')}`);
    if (selectedCompanySizes.length > 0) filters.push(`Unternehmensgröße: ${selectedCompanySizes.join(', ')}`);
    if (selectedIndustries.length > 0) filters.push(`Unternehmensbranche: ${selectedIndustries.join(', ')}`);

    if (filters.length > 0) {
      filterContext = `PFLICHTFILTER (Programme MÜSSEN diese Kriterien erfüllen):\n${filters.join('\n')}\n\nProgramme die diese Filter NICHT erfüllen, DÜRFEN NICHT empfohlen werden.\n\n`;
    }

    const filteredByUserFilters = applyFilters(programmes);
    const activeProgrammes = filteredByUserFilters.length > 0 ? filteredByUserFilters : programmes.filter(p => isActiveProgram(p));

    const localProgrammesContext = activeProgrammes.map(p =>
      `- ${p.title} | ${p.category || '-'} | ${p.region || '-'} | ${p.foerderart || '-'} | Zielgruppe: ${p.zielgruppe || '-'} | Frist: ${p.antragsfrist || '-'}`
    ).join('\n');

    // 1. WEB SEARCH (Google Custom Search)
    let webContext = '';
    try {
      // Parallelize: Start web search but don't block everything immediately if we can do other things
      // However, we need the results for the prompt.
      // Optimization: Fetch only 3 results for maximum speed.
      
      // Note: searchWeb implementation needs to support limit or we just slice here.
      // We'll slice the result.
      const webResults = await searchWeb(userMsg);
      
      if (webResults && webResults.length > 0) {
        const topResults = webResults.slice(0, 5);
        webContext = `\n\nAKTUELLE WEB-ERGEBNISSE (${new Date().getFullYear()}, Google Search):\n${topResults.map(r => 
          `- [WEB] ${r.title} (${r.url}): ${r.description}`
        ).join('\n')}\n\nBEVORZUGE aktuelle Web-Ergebnisse wenn sie besser zur Anfrage passen als ältere DB-Einträge.`;
      } 
    } catch (webErr) {
      console.warn('Web search error inside chat:', webErr);
    }

    const systemPrompt = `Du bist ein Experte für Förderprogramme in Deutschland und der EU. Deine Aufgabe ist es, EXAKT passende Programme zu finden.

STRIKTE REGELN:
1. Empfehle NUR Programme, die DIREKT und KONKRET zur Suchanfrage passen.
2. Wenn Filter gesetzt sind (Region, Kategorie, Förderart, Größe), müssen Programme diese EXAKT erfüllen.
3. PRIORISIERE NEUERE/AKTUELLE Programme (2025/2026) vor älteren.
4. Wenn Web-Ergebnisse aktuellere oder besser passende Programme liefern, bevorzuge diese.
5. Erfinde KEINE Programme. Nutze NUR Programme aus der Datenbank oder den Web-Ergebnissen.
6. Wenn ein Programm aus der Datenbank kommt, nutze EXAKT dessen Titel.
7. Empfehle 3-8 Programme, sortiert nach Relevanz (bestes zuerst).
8. Jedes Programm braucht eine spezifische "why"-Begründung, die erklärt warum es zur Anfrage passt.

QUALITÄTSKONTROLLE:
- Ein Programm für "Digitalisierung" ist NICHT relevant für "Energieeffizienz" und umgekehrt.
- Ein Programm für "Nordrhein-Westfalen" ist NICHT relevant wenn der User "Bayern" filtert.
- Bundesweite/EU-weite Programme passen IMMER zu jeder Region.
- Abgelaufene Programme NICHT empfehlen.

Antworte NUR mit einem validen JSON-Objekt: {"begruendung": "...", "programme": [...]}
Kein Text vor oder nach dem JSON.`;

    const userQueryPrompt = `${filterContext}INTERNE DATENBANK:
${localProgrammesContext}
${webContext}
${docContext ? `\nFIRMENBESCHREIBUNG/KONTEXT:\n${docContext}\n` : ''}
NUTZERANFRAGE: "${effectiveUserMsg}"

ANWEISUNGEN:
1. Finde die BESTEN 3-8 Programme für diese Anfrage.
2. Sortiere STRENG nach Relevanz - das relevanteste Programm zuerst.
3. BEVORZUGE neuere Programme (2025/2026) und aktuelle Web-Ergebnisse.
4. Für jedes Programm liefere: title, description, url, foerderhoehe, zielgruppe, antragsfrist, foerderart, ansprechpartner, region, category, why, isWebResult (true wenn aus Web).
5. "why" muss SPEZIFISCH erklären, warum dieses Programm zur Anfrage passt.
6. Fehlende Infos bei Web-Ergebnissen: "Siehe Website".
7. Antworte NUR mit dem JSON-Objekt.`;

    // Verwende Proxy wenn konfiguriert, sonst direkt API Key
    const apiUrl = PROXY_URL || 'https://api.openai.com/v1/chat/completions';
    const headers = PROXY_URL
      ? { 'Content-Type': 'application/json' }  // Proxy braucht keinen Auth Header
      : {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      };

    // Force fastest model for Standard option
    let modelToUse = getSelectedModel();
    if (modelToUse === 'gpt-5-mini') {
      modelToUse = 'gpt-4o-mini';
    }

    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({
        model: modelToUse,
        messages: [
          { role: 'user', content: systemPrompt + '\n\n' + userQueryPrompt }
        ],
        max_tokens: 2000
      })
    });
    const data = await res.json();
    let content = data.choices?.[0]?.message?.content || '';
    content = content.replace(/```json|```/g, '').trim();
    let obj = null;
    try {
      removeLoading();
      obj = JSON.parse(content.match(/\{[\s\S]*\}/)?.[0] || content);
      if (obj.begruendung) addMessage(`<span class='italic text-gray-700'>${obj.begruendung}</span>`, 'ai');

      if (Array.isArray(obj.programme)) {
        // ULTRA-STRICT VALIDATION: Only accept programs from local database OR explicitly marked web results
        const localDbTitles = new Set(programmes.map(p => p.title));

        const validPrograms = [];
        const rejectedPrograms = [];

        obj.programme.forEach(p => {
          if (localDbTitles.has(p.title)) {
            // Program exists in our verified database
            const dbProgram = programmes.find(db => db.title === p.title);
            // Use DB data but keep AI's "why" explanation
            validPrograms.push({
              ...dbProgram,
              why: p.why || 'Empfohlen basierend auf Ihrer Anfrage.'
            });
          } else if (p.isWebResult || (p.url && !p.url.includes('example.com'))) {
             // Accept Web Results if they look valid (have a URL)
             validPrograms.push({
               ...p,
               isWebResult: true, // Ensure flag is set
               why: p.why || 'Gefunden über Websuche.'
             });
          } else {
            // AI tried to invent/hallucinate a program without source - reject it
            rejectedPrograms.push(p.title);
          }
        });

        if (rejectedPrograms.length > 0) {
          console.warn('[STRICT VALIDATION] Rejected non-DB programs:', rejectedPrograms);
        }

        const dbCount = validPrograms.filter(p => !p.isWebResult).length;
        const webCount = validPrograms.filter(p => p.isWebResult).length;
        let statusParts = [];
        if (dbCount > 0) statusParts.push(`${dbCount} aus Datenbank`);
        if (webCount > 0) statusParts.push(`${webCount} aus Websuche`);
        if (statusParts.length > 0) {
          addMessage(`<span class='text-green-600'>&#10003; ${validPrograms.length} passende Programme gefunden (${statusParts.join(', ')}).</span>`, 'system');
        }

        // FALLBACK REMOVED: We only show what the AI explicitly selected as "best matches"
        // to avoid "jungle of programs" and ensure high relevance.

        if (validPrograms.length > 0) {
          addMessage(renderProgrammeList(validPrograms), 'ai');
        } else {
          addMessage('<span class="text-red-600">Keine passenden Programme gefunden. Versuche die Anfrage anders zu formulieren.</span>', 'ai');
        }
      } else {
        throw new Error('Programme nicht gefunden oder Format falsch.');
      }
    } catch (e) {
      removeLoading();
      console.warn('[askOpenAIChat] Parse-Fehler:', e.message, '| RAW (gekürzt):', (content || '').slice(0, 300));
      addMessage('<span class="text-orange-600">Die KI-Antwort konnte leider nicht verarbeitet werden. Zeige stattdessen lokale Ergebnisse:</span>', 'ai');
      const filteredFallback = applyFilters(programmes);
      const fallbackQuery = lastUserQueryForFilter || queryInput.value;
      const fallbackMatches = fallbackQuery
        ? fuse.search(fallbackQuery, { limit: 10 }).map(r => r.item).filter(p => filteredFallback.includes(p))
        : filteredFallback.slice(0, 10);
      if (fallbackMatches.length > 0) {
        addMessage(renderProgrammeList(fallbackMatches.length > 0 ? fallbackMatches : filteredFallback.slice(0, 10)), 'ai');
      } else if (filteredFallback.length > 0) {
        addMessage(renderProgrammeList(filteredFallback.slice(0, 10)), 'ai');
      } else {
        addMessage('Keine passenden Programme gefunden. Versuchen Sie es mit anderen Suchbegriffen.', 'ai');
      }
    }
  } catch (err) {
    removeLoading();
    console.warn('[askOpenAIChat] Netzwerk/API-Fehler:', err.message);
    addMessage(`<span class="text-orange-600">KI nicht verfügbar (${err.message}). Zeige lokale Ergebnisse:</span>`, 'ai');
    const filteredLocalProgrammes = applyFilters(programmes);
    const lastUserQuery = lastUserQueryForFilter || queryInput.value;
    const matches = lastUserQuery ? fuse.search(lastUserQuery, { limit: 10 }).map(r => r.item) : filteredLocalProgrammes.slice(0, 10);
    if (matches.length > 0) {
      addMessage(renderProgrammeList(matches), 'ai');
    } else {
      addMessage('Keine passenden lokalen Programme gefunden.', 'ai');
    }
  }
}

chatForm.addEventListener('submit', e => {
  e.preventDefault();
  const userMsg = queryInput.value.trim();
  if (!userMsg) return;
  lastUserQueryForFilter = userMsg; // Speichere die aktuelle Anfrage
  queryInput.value = '';
  askOpenAIChat(userMsg);
});

function renderResults(list, source = 'local') {
  resultsEl.innerHTML = '';
  if (list.length === 0) {
    resultsEl.innerHTML = '<p class="text-red-600">Kein passendes Förderprogramm gefunden.</p>';
    return;
  }
  // Use the shared renderProgrammeList function to generate HTML
  // But since renderProgrammeList returns a string, we need to set innerHTML
  resultsEl.innerHTML = renderProgrammeList(list);
}

function setLoading(isLoading) {
  if (isLoading) {
    resultsEl.innerHTML = '<div class="flex items-center gap-2 text-blue-700"><svg class="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path></svg>Lade KI-Ergebnisse…</div>';
  }
}

/* ---------- HELPER: Check if program is active ---------- */
function isActiveProgram(p) {
  if (!p.antragsfrist) return true; // No deadline = assume active (or unknown)

  const lowerFrist = p.antragsfrist.toLowerCase();

  // Explicit negative keywords
  if (lowerFrist.includes('abgelaufen') ||
    lowerFrist.includes('beendet') ||
    lowerFrist.includes('archiv') ||
    lowerFrist.includes('nicht mehr')) {
    return false;
  }

  // Date parsing (DD.MM.YYYY)
  const dateMatch = p.antragsfrist.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/);
  if (dateMatch) {
    const day = parseInt(dateMatch[1]);
    const month = parseInt(dateMatch[2]) - 1;
    const year = parseInt(dateMatch[3]);
    const deadline = new Date(year, month, day);
    const now = new Date();

    // Set deadline to end of day to be generous
    deadline.setHours(23, 59, 59, 999);

    // If deadline was yesterday or earlier -> inactive
    if (deadline < now) {
      return false;
    }
  }

  return true;
}

function applyFilters(list) {
  const region = regionFilterEl.value;
  const category = categoryFilterEl.value;
  const selectedFundingTypes = fundingTypeDropdownPanel ?
    Array.from(fundingTypeDropdownPanel.querySelectorAll('input:checked')).map(cb => cb.value) :
    [];
  const selectedCompanySizes = companySizeDropdownPanel ?
    Array.from(companySizeDropdownPanel.querySelectorAll('input:checked')).map(cb => cb.value) :
    [];
  const selectedIndustries = industryDropdownPanel ?
    Array.from(industryDropdownPanel.querySelectorAll('input:checked')).map(cb => cb.value) :
    [];

  return list.filter(p => {
    const pRegion = (p.region || '').toLowerCase().trim();
    const filterRegion = region.toLowerCase().trim();
    const matchesRegion = !region
      || pRegion === filterRegion
      || pRegion === 'bundesweit'
      || pRegion === 'deutschland'
      || pRegion === 'eu-weit';

    const matchesCategory = !category
      || (p.category && p.category.toLowerCase() === category.toLowerCase());

    const matchesFundingType = selectedFundingTypes.length === 0
      || (p.foerderart && selectedFundingTypes.some(type =>
        p.foerderart.toLowerCase().includes(type.toLowerCase())
      ));

    const sizeKeywords = {
      'Großes Unternehmen': ['großunternehmen', 'große unternehmen', 'groß', 'alle unternehmensgrößen', 'unternehmen'],
      'Mittleres Unternehmen': ['kmu', 'mittel', 'mittlere', 'kleine und mittlere', 'alle unternehmensgrößen'],
      'Kleines Unternehmen': ['kmu', 'klein', 'kleine', 'kleine und mittlere', 'alle unternehmensgrößen'],
      'Kleinstunternehmen': ['kmu', 'kleinst', 'mikro', 'kleine und mittlere', 'alle unternehmensgrößen'],
    };
    const matchesCompanySize = selectedCompanySizes.length === 0
      || (p.zielgruppe && selectedCompanySizes.some(size => {
        const zg = p.zielgruppe.toLowerCase();
        const keywords = sizeKeywords[size] || [size.toLowerCase()];
        return keywords.some(kw => zg.includes(kw));
      }));

    const matchesIndustry = selectedIndustries.length === 0
      || (p.branche && selectedIndustries.some(ind => p.branche.toLowerCase().includes(ind.toLowerCase())))
      || (p.zielgruppe && selectedIndustries.some(ind => p.zielgruppe.toLowerCase().includes(ind.toLowerCase())))
      || (p.description && selectedIndustries.some(ind => p.description.toLowerCase().includes(ind.toLowerCase())));

    const isActive = isActiveProgram(p);

    return matchesRegion && matchesCategory && matchesFundingType && matchesCompanySize && matchesIndustry && isActive;
  });
}

// ⚠️ WICHTIG: Diese Keys sind jetzt direkt im Code, damit es sofort funktioniert.
// Für eine echte Produktion sollten sie sicher im Backend (Cloudflare) liegen.
const GOOGLE_API_KEY = 'AIzaSyCvEMzR-p2xKTUtUe1wtQmvWMnVGjlnpNk';
const GOOGLE_CX = 'd780077053afc4147';

function buildWebSearchQuery(userQuery) {
  const parts = [userQuery];
  const region = regionFilterEl?.value;
  const category = categoryFilterEl?.value;

  if (!/förder|zuschuss|programm|beihilfe/i.test(userQuery)) {
    parts.push('Förderprogramm');
  }
  if (region && !/bundesweit/i.test(region)) parts.push(region);
  if (category) parts.push(category);

  const currentYear = new Date().getFullYear();
  if (!new RegExp(String(currentYear)).test(userQuery)) {
    parts.push(String(currentYear));
  }

  return parts.join(' ');
}

async function searchWeb(query) {
  try {
    const optimizedQuery = buildWebSearchQuery(query);
    const searchUrl = `https://www.googleapis.com/customsearch/v1?key=${GOOGLE_API_KEY}&cx=${GOOGLE_CX}&q=${encodeURIComponent(optimizedQuery)}&num=7`;
    const res = await fetch(searchUrl);

    if (!res.ok) throw new Error(`Search failed with status ${res.status}`);

    const data = await res.json();
    if (data.items) {
      return data.items
        .filter(item => {
          const url = (item.link || '').toLowerCase();
          return !url.includes('youtube.com') && !url.includes('facebook.com') && !url.includes('twitter.com');
        })
        .map(item => ({
          title: item.title,
          description: item.snippet,
          url: item.link,
          foerderhoehe: 'Siehe Website',
          zielgruppe: 'Siehe Website',
          antragsfrist: 'Siehe Website',
          foerderart: 'Siehe Website',
          ansprechpartner: 'Siehe Website',
          region: 'Siehe Website',
          category: 'Web Search',
          isWebResult: true
        }));
    }
    return [];
  } catch (e) {
    console.warn('Web search failed:', e);
    return [];
  }
}

async function search() {
  const q = queryInput.value.trim();
  // apply filters to dataset before any search
  const filteredList = applyFilters(programmes);
  if (!q && filteredList.length === 0) {
    resultsEl.innerHTML = '<p class="text-gray-600">Bitte Suchbegriff oder Filter wählen.</p>';
    return;
  }
  setLoading(true);
  try {
    // 1. Web Search (ALWAYS)
    let webResults = [];
    if (q) {
      addMessage('Suche live im Web nach aktuellen Programmen...', 'system');
      webResults = await searchWeb(q);
    } else {
      resultsEl.innerHTML = '<p class="text-gray-600">Bitte Suchbegriff eingeben für Live-Suche.</p>';
      setLoading(false);
      return;
    }

    // 2. Use ONLY Web Results
    const combinedResults = [...webResults];

    if (combinedResults.length === 0) {
      addMessage('Keine aktuellen Ergebnisse im Web gefunden.', 'system');
      setLoading(false);
      return;
    }

    // Deduplicate by URL
    const uniqueResults = [];
    const seenUrls = new Set();
    for (const item of combinedResults) {
      if (!seenUrls.has(item.url)) {
        seenUrls.add(item.url);
        uniqueResults.push(item);
      }
    }

    // Limit context for AI to avoid token limits (e.g. top 10 instead of 20)
    const contextResults = uniqueResults.slice(0, 10);

    const prompt = `${docContext ? 'Firmenbeschreibung:\n' + docContext + '\n\n' : ''}Der Nutzer sucht: "${q}".

Hier sind die gefundenen Förderprogramme (Kombination aus Datenbank und Websuche):
${JSON.stringify(contextResults)}

Bitte antworte dem Nutzer. Empfiehl die besten Programme für sein Anliegen.
WICHTIG: Wenn ein Programm aus der "Web Search" kommt (isWebResult: true), erwähne das und weise darauf hin, dass die Details auf der Website geprüft werden sollten.
Gib die Antwort im JSON-Format zurück (Array von Objekten mit title, description, url, why).`;

    // Verwende Proxy wenn konfiguriert, sonst direkt API Key
    const apiUrl = PROXY_URL || 'https://api.openai.com/v1/chat/completions';
    const headers = PROXY_URL
      ? { 'Content-Type': 'application/json' }  // Proxy braucht keinen Auth Header
      : {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      };

    // Use a faster model if the user selected "gpt-5-mini"
    let modelToUse = getSelectedModel();
    if (modelToUse === 'gpt-5-mini') {
      modelToUse = 'gpt-4o-mini'; // Explicitly force the fastest model
    }

    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({
        model: modelToUse,
        messages: [
          { role: 'system', content: 'Du bist ein Förderprogramm-Experte. Antworte immer im JSON-Format (Array von Programmen).' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.2,
        max_tokens: 1000 // Reduced further for speed
      })
    });

    if (res.status === 429) {
      throw new Error('Zu viele Anfragen (429). Bitte überprüfe dein OpenAI-Guthaben oder warte kurz.');
    }

    const data = await res.json();
    let content = data.choices?.[0]?.message?.content || '';
    content = content.replace(/```json|```/g, '').trim();
    let arr = null;
    try {
      // Versuche JSON zu parsen - könnte ein Array oder ein Objekt mit 'programme' Array sein
      try {
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed)) {
          arr = parsed;
        } else if (parsed && Array.isArray(parsed.programme)) {
          arr = parsed.programme;
        }
      } catch (e) {
        // Fallback: Versuche JSON aus dem Text zu extrahieren
        const match = content.match(/\[[\s\S]*\]/);
        if (match) {
          arr = JSON.parse(match[0]);
        }
      }
      // Fallback: falls KI kein "why" liefert, kurze Begründung generieren
      if (arr) {
        arr = arr.map(o => ({
          ...o,
          why: o.why && o.why.trim()
            ? o.why.trim()
            : 'Empfohlen, weil es gut zu Ihrer Anfrage passt (Auto‑Begründung).'
        }));
      }
      if (!arr) {
        console.warn('Parsing‑Fehler search → RAW:', content);
        throw new Error('Keine gültige JSON‑Antwort');
      }

      // FINAL FILTER on AI results (just in case)
      const finalResults = arr.filter(p => isActiveProgram(p));

      renderResults(finalResults, 'ai');
    } catch (e) {
      console.warn('[filterSearch] Parse-Fehler:', e.message, '| RAW (gekürzt):', (content || '').slice(0, 300));
      addMessage('<span class="text-orange-600">Die KI-Antwort konnte leider nicht verarbeitet werden. Zeige stattdessen lokale Ergebnisse:</span>', 'ai');
      const localFallback = q ? fuse.search(q).map(r => r.item) : filteredList;
      const activeFallback = localFallback.filter(p => isActiveProgram(p)).slice(0, 10);
      if (activeFallback.length > 0) {
        renderResults(activeFallback, 'local');
      } else {
        renderResults(filteredList.slice(0, 10), 'local');
      }
    }
  } catch (err) {
    let errorMsg = err.message;
    if (errorMsg.includes('429')) {
      errorMsg = '⚠️ OpenAI-Limit erreicht (429). Bitte Guthaben prüfen.';
    }
    addMessage(`<span class="text-orange-600">KI nicht verfügbar (${errorMsg}). Zeige lokale Ergebnisse:</span>`, 'ai');
    const matches = q ? fuse.search(q).map(r => r.item) : filteredList;
    const activeMatches = matches.filter(p => isActiveProgram(p));
    const limited = activeMatches.slice(0, 10);
    renderResults(limited, 'local');
  }
}

// Funktion, die bei Filteränderung aufgerufen wird
function handleFilterChange() {
  filtersDirty = true;
  // Falls nur Filter genutzt werden, alte Filter-Anfrage verwerfen
  if (queryInput && !queryInput.value.trim()) {
    lastUserQueryForFilter = '';
  }
}

// EVENT DELEGATION for heart-icon clicks
if (typeof window !== 'undefined') {
  window.addEventListener('click', function (e) {
    const heartBtn = e.target.closest('.heart-icon');
    if (!heartBtn) return;
    const progId = heartBtn.getAttribute('data-program-id');
    if (!progId) return;
    handleToggleFavorite(progId, heartBtn);
  });
}

const THEME_KEY = 'mpoolTheme';

function applyTheme(theme) {
  document.documentElement.classList.toggle('dark', theme === 'dark');
  const icon = document.getElementById('themeToggleIcon');
  if (icon) {
    if (theme === 'dark') {
      icon.setAttribute('fill', 'currentColor');
    } else {
      icon.setAttribute('fill', 'none');
    }
  }
}

function initTheme() {
  let stored = localStorage.getItem(THEME_KEY);
  if (!stored) {
    stored = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  applyTheme(stored);
}

// call early
initTheme();

/* ----------  CHAT HISTORY STORAGE ---------- */
const CHATS_KEY = 'mpoolFoerderChats';
let currentChatId = null; // active chat id

function getChats() {
  const json = localStorage.getItem(CHATS_KEY);
  if (!json) return [];
  try {
    const chats = JSON.parse(json);
    // Absicherung: nur Array akzeptieren
    return Array.isArray(chats) ? chats : [];
  } catch (err) {
    console.error('[getChats] Fehler beim Parsen von CHATS aus localStorage', err);
    // Bei korrupten Daten – Schlüssel entfernen, um zukünftige Probleme zu vermeiden
    localStorage.removeItem(CHATS_KEY);
    return [];
  }
}
function saveChats(arr) {
  try {
    localStorage.setItem(CHATS_KEY, JSON.stringify(arr));
  } catch (e) {
    if (e && e.name === 'QuotaExceededError') {
      console.warn('[saveChats] QuotaExceeded – entferne ältere Chats');
      // Entferne solange die ältesten Chats, bis der Speicher ausreicht
      while (arr.length > 0) {
        arr.pop();
        try {
          localStorage.setItem(CHATS_KEY, JSON.stringify(arr));
          break;
        } catch (err) {
          if (err.name !== 'QuotaExceededError') throw err;
        }
      }
    } else {
      throw e;
    }
  }
}
function pruneEmptyChats() {
  const chats = getChats();
  const filtered = chats.filter(c => Array.isArray(c.messages) && c.messages.length > 0);
  if (filtered.length !== chats.length) {
    saveChats(filtered);
  }
  return filtered;
}
function createChat(title = 'New chat') {
  const chats = pruneEmptyChats();
  const id = 'chat_' + Date.now();
  chats.unshift({ id, title, messages: [] });
  if (chats.length > MAX_CHAT_COUNT) {
    chats.splice(MAX_CHAT_COUNT); // Überschüssige entfernen
  }
  saveChats(chats);
  return id;
}
function addMessageToCurrentChat(content, sender) {
  // Ensure a chat is active; use a sanitized snippet for the initial title only
  if (!currentChatId) {
    currentChatId = createChat(sanitizeForStorage(content).slice(0, 30));
  }

  const chats = getChats();
  const chat = chats.find(c => c.id === currentChatId);
  if (chat) {
    // 1. Speichere den ORIGINALEN HTML-Inhalt, damit Struktur (Karten, Links usw.) erhalten bleibt
    chat.messages.push({ sender, content, ts: Date.now() });

    // 2. Ältere Nachrichten ggf. kürzen, um Speicher zu schonen
    if (chat.messages.length > MAX_MESSAGES_PER_CHAT) {
      chat.messages.splice(0, chat.messages.length - MAX_MESSAGES_PER_CHAT);
    }

    // 3. Falls es die erste User-Nachricht ist, generiere Titel auf Basis eines bereinigten Snippets
    if (chat.messages.length === 1 && sender === 'user') {
      chat.title = sanitizeForStorage(content).slice(0, 30);
    }

    saveChats(chats);
  }
}
function loadChat(id) {
  const args = Array.from(arguments);
  const skipRender = args.length > 1 ? !!args[1] : false; // optional second param

  const chats = getChats();
  const chat = chats.find(c => c.id === id);
  if (!chat) return;
  currentChatId = id;
  chatEl.innerHTML = '';
  // Beim Laden nur anzeigen, nicht erneut speichern,
  // sonst würden Nachrichten bei jedem Öffnen dupliziert
  chat.messages.forEach(m => origAddMessage(m.content, m.sender));
  if (!skipRender) {
    renderChatList();
  } else {
    // Update active highlight manually when skipping full re-render
    document.querySelectorAll('[data-chat-id] .chat-item, [data-chat-id].chat-item, [data-chat-id]')?.forEach(el => {
      if (el.getAttribute('data-chat-id') === id) {
        el.classList.add('active');
      } else {
        el.classList.remove('active');
      }
    });
  }
}
function renderChatList() {
  const listEl = document.getElementById('chatList');
  if (!listEl) return;
  const chats = pruneEmptyChats();
  // Jedes <li> bekommt nun ebenfalls die ID, damit Klicks auf den Rand (nicht direkt auf den Link) erkannt werden
  listEl.innerHTML = chats.map(c => `
    <li data-chat-id="${c.id}" class="${c.id === currentChatId ? 'active' : ''}">
      <a href="#" class="chat-item ${c.id === currentChatId ? 'active' : ''}" data-chat-id="${c.id}">${c.title || 'Untitled'}</a>
      <span class="chat-actions">
        <button type="button" data-action="load" data-chat-id="${c.id}" title="Öffnen">↩</button>
        <button type="button" data-action="delete" data-chat-id="${c.id}" title="Löschen">✕</button>
      </span>
    </li>`).join('');
}
// delegate click on chat items
if (typeof window !== 'undefined') {
  // Gemeinsame Handler-Funktion, um Element mit data-chat-id zu ermitteln
  const getChatElement = (evt) => evt.target.closest('[data-chat-id]');

  // Einzel-Klick: Chat laden oder löschen
  window.addEventListener('click', e => {
    const elem = getChatElement(e);
    const actionBtn = e.target.closest('[data-action][data-chat-id]');

    if (actionBtn) {
      const chatId = actionBtn.getAttribute('data-chat-id');
      const action = actionBtn.getAttribute('data-action');
      e.preventDefault();
      if (action === 'delete') {
        deleteChat(chatId);
        // Wenn der aktive Chat gelöscht wurde, UI leeren
        if (currentChatId === chatId) {
          currentChatId = null;
          chatEl.innerHTML = '';
        }
        renderChatList();
      } else if (action === 'load') {
        loadChat(chatId, true);
      }
      return;
    }

    if (elem) {
      e.preventDefault();
      loadChat(elem.getAttribute('data-chat-id'), true);
      return;
    }
    if (e.target.id === 'newChatBtn') {
      currentChatId = null;
      chatEl.innerHTML = '';
      renderChatList();
    }
  });

  // Doppel-Klick: Chat umbenennen
  window.addEventListener('dblclick', e => {
    const elem = getChatElement(e);
    if (elem) {
      e.preventDefault();
      const id = elem.getAttribute('data-chat-id');
      const currentName = elem.textContent.trim();
      const newName = prompt('Neuer Chatname:', currentName);
      if (newName && newName.trim() && newName.trim() !== currentName) {
        renameChat(id, newName.trim());
      }
    }
  });
}

// Monkey-patch addMessage to also persist
const origAddMessage = addMessage;
addMessage = function (content, sender = 'user') {
  origAddMessage(content, sender);
  if (suppressChatSave) {
    suppressChatSave = false;
    return;
  }
  addMessageToCurrentChat(content, sender);
};

// render chat list on load + UI enhancements
document.addEventListener('DOMContentLoaded', () => {
  renderChatList();

  const welcomeEl = document.getElementById('welcomeState');
  function updateWelcomeVisibility() {
    if (!welcomeEl) return;
    welcomeEl.style.display = chatEl && chatEl.children.length > 0 ? 'none' : '';
  }
  if (chatEl) {
    new MutationObserver(updateWelcomeVisibility).observe(chatEl, { childList: true });
  }
  updateWelcomeVisibility();

  document.querySelectorAll('.suggestion-card').forEach(btn => {
    btn.addEventListener('click', () => {
      const q = btn.getAttribute('data-query');
      if (q && queryInput) {
        queryInput.value = q;
        chatForm?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      }
    });
  });

  const sidebarToggle = document.getElementById('sidebarToggle');
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  if (sidebarToggle && sidebar) {
    const toggleSidebar = () => {
      sidebar.classList.toggle('open');
      overlay?.classList.toggle('active');
    };
    sidebarToggle.addEventListener('click', toggleSidebar);
    overlay?.addEventListener('click', toggleSidebar);
  }
});

function renameChat(id, title) {
  const chats = getChats();
  const chat = chats.find(c => c.id === id);
  if (!chat) return;
  chat.title = title;
  saveChats(chats);
  renderChatList();
}

function deleteChat(id) {
  const chats = getChats();
  const idx = chats.findIndex(c => c.id === id);
  if (idx === -1) return;
  chats.splice(idx, 1);
  saveChats(chats);
  // falls kein aktiver Chat mehr: leeren
  if (currentChatId === id) {
    currentChatId = null;
  }
}

// +++ NEU: Limits & Hilfsfunktionen +++
const MAX_MESSAGES_PER_CHAT = 100;   // maximale Nachrichten je Chat
const MAX_CHAT_COUNT = 30;           // maximale Anzahl gespeicherter Chats
function sanitizeForStorage(html) {
  // HTML-Tags entfernen und Länge beschränken
  const txt = html.replace(/<[^>]*>/g, '').trim();
  return txt.length > 2000 ? txt.slice(0, 2000) + '…' : txt;
}

/* ----------  URL VALIDATION (Avoid dead links)  ---------- */
async function checkUrlReachable(url) {
  if (!url) return false;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000); // Erhöht auf 8 Sekunden für langsame Server

  // Public CORS-Proxy (HEAD oft geblockt, daher GET)
  const proxy = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
  try {
    const res = await fetch(proxy, { method: 'GET', signal: controller.signal });
    if (!res.ok) {
      console.warn(`[checkUrlReachable] URL abgelehnt (Proxy-Fehler, Status: ${res.status}): ${url}`);
      return false;
    }

    const html = await res.text();
    clearTimeout(timeout);

    // --- zusätzliche Qualitätsprüfung (stark entschärft für mehr false-positives) ---
    const snippet = html.slice(0, 2000).toLowerCase();
    const badPatterns = [
      '404 not found',
      'seite nicht gefunden',
      'page not found'
      // Entfernt: viele weitere Patterns, um weniger auszufiltern
    ];
    const hasBadPattern = badPatterns.some(p => snippet.includes(p));

    if (hasBadPattern) {
      console.warn(`[checkUrlReachable] URL abgelehnt (Pattern gefunden: "${badPatterns.find(p => snippet.includes(p))}"): ${url}`);
      return false;
    }

    // Mindest-Länge STARK reduziert (von 500 auf 200), um auch kurze aber valide Seiten zu akzeptieren
    const minLengthOk = html.length > 200;

    if (!minLengthOk) {
      console.warn(`[checkUrlReachable] URL abgelehnt (zu kurzer Inhalt: ${html.length} bytes): ${url}`);
      return false;
    }

    return true; // Gilt als erreichbar

  } catch (err) {
    // Auch bei Timeout-Fehler eher großzügig sein und als "valide" werten
    if (err.name === 'AbortError') {
      console.warn('[checkUrlReachable] Timeout für', url, '- wird dennoch als valide gewertet');
      return true; // Bei Timeout trotzdem akzeptieren
    }
    console.warn('[checkUrlReachable] Fehler für', url, err.message || err);
    return false;
  }
}

async function filterProgrammesWithValidLinks(arr) {
  if (!Array.isArray(arr) || arr.length === 0) return { valid: [], invalidCount: 0 };
  const results = await Promise.all(arr.map(async p => ({ prog: p, ok: await checkUrlReachable(p.url) })));
  const valid = results.filter(r => r.ok).map(r => r.prog);
  const invalidCount = results.length - valid.length;
  return { valid, invalidCount };
}

/* ==================== VOICE CALL ==================== */
(function initVoiceCall() {
  const hasSpeech = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
  const hasTTS = 'speechSynthesis' in window;
  if (!hasSpeech || !hasTTS) {
    const fab = document.getElementById('voiceCallBtn');
    if (fab) fab.style.display = 'none';
    return;
  }

  const fab = document.getElementById('voiceCallBtn');
  const overlay = document.getElementById('voiceCallOverlay');
  const statusEl = document.getElementById('voiceCallStatus');
  const transcriptEl = document.getElementById('voiceCallTranscript');
  const endBtn = document.getElementById('voiceCallEnd');
  if (!fab || !overlay || !endBtn) return;

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  let callRecognition = null;
  let callActive = false;
  let isSpeaking = false;

  function setCallState(state) {
    overlay.className = 'voice-call-overlay state-' + state;
    if (statusEl) {
      const labels = {
        listening: 'Ich höre zu...',
        processing: 'Suche passende Programme...',
        speaking: 'Antwort wird vorgelesen...',
        idle: 'Bereit',
      };
      statusEl.textContent = labels[state] || '';
      statusEl.className = 'voice-call-status ' + state;
    }
  }

  let currentAudio = null;

  function speak(text) {
    return new Promise(async (resolve) => {
      if (!text) { resolve(); return; }
      isSpeaking = true;
      setCallState('speaking');

      try {
        const ttsUrl = PROXY_URL
          ? PROXY_URL.replace(/\/?$/, '/tts')
          : 'https://api.openai.com/v1/audio/speech';
        const ttsHeaders = PROXY_URL
          ? { 'Content-Type': 'application/json' }
          : { 'Content-Type': 'application/json', 'Authorization': `Bearer ${OPENAI_API_KEY}` };

        const res = await fetch(ttsUrl, {
          method: 'POST',
          headers: ttsHeaders,
          body: JSON.stringify({
            model: 'tts-1',
            voice: 'nova',
            input: text,
            speed: 1.12,
            response_format: 'mp3'
          })
        });

        if (!res.ok) throw new Error('TTS API error ' + res.status);

        const blob = await res.blob();
        const audioUrl = URL.createObjectURL(blob);
        currentAudio = new Audio(audioUrl);
        currentAudio.playbackRate = 1.08;

        currentAudio.onended = () => {
          isSpeaking = false;
          URL.revokeObjectURL(audioUrl);
          currentAudio = null;
          resolve();
        };
        currentAudio.onerror = () => {
          isSpeaking = false;
          URL.revokeObjectURL(audioUrl);
          currentAudio = null;
          resolve();
        };

        await currentAudio.play();
      } catch (err) {
        console.warn('[VoiceCall] OpenAI TTS fehlgeschlagen, nutze Browser-Stimme:', err.message);
        if (hasTTS) {
          window.speechSynthesis.cancel();
          const utter = new SpeechSynthesisUtterance(text);
          utter.lang = 'de-DE';
          utter.rate = 1.0;
          const voices = window.speechSynthesis.getVoices();
          const deVoice = voices.find(v => v.lang.startsWith('de') && v.name.includes('Google'))
                       || voices.find(v => v.lang.startsWith('de'));
          if (deVoice) utter.voice = deVoice;
          utter.onend = () => { isSpeaking = false; resolve(); };
          utter.onerror = () => { isSpeaking = false; resolve(); };
          window.speechSynthesis.speak(utter);
        } else {
          isSpeaking = false;
          resolve();
        }
      }
    });
  }

  function extractSpokenText(html) {
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    tmp.querySelectorAll('.programme-card .meta, .status-badge, button, svg, .heart-icon').forEach(el => el.remove());
    let text = (tmp.textContent || '').replace(/\s+/g, ' ').trim();
    if (text.length > 600) text = text.slice(0, 600) + '. Weitere Details finden Sie im Chat.';
    return text;
  }

  const BUNDESLAENDER = [
    'Baden-Württemberg','Bayern','Berlin','Brandenburg','Bremen','Hamburg',
    'Hessen','Mecklenburg-Vorpommern','Niedersachsen','Nordrhein-Westfalen',
    'Rheinland-Pfalz','Saarland','Sachsen','Sachsen-Anhalt',
    'Schleswig-Holstein','Thüringen'
  ];

  function detectRegionFromText(text) {
    const lower = text.toLowerCase();
    for (const bl of BUNDESLAENDER) {
      if (lower.includes(bl.toLowerCase())) return bl;
    }
    if (/\bbundesweit\b/i.test(text)) return 'Bundesweit';
    return null;
  }

  async function askAndSpeak(userText) {
    setCallState('processing');
    if (transcriptEl) transcriptEl.textContent = `"${userText}"`;

    addMessage(userText, 'user');

    try {
      const apiUrl = PROXY_URL || 'https://api.openai.com/v1/chat/completions';
      const headers = PROXY_URL
        ? { 'Content-Type': 'application/json' }
        : { 'Content-Type': 'application/json', 'Authorization': `Bearer ${OPENAI_API_KEY}` };

      const spokenRegion = detectRegionFromText(userText);

      let relevantProgrammes = programmes.filter(p => isActiveProgram(p));
      if (spokenRegion && spokenRegion !== 'Bundesweit') {
        relevantProgrammes = relevantProgrammes.filter(p => {
          const r = (p.region || '').toLowerCase();
          return r === spokenRegion.toLowerCase()
              || r === 'bundesweit'
              || r === 'deutschland'
              || r === 'eu-weit';
        });
      }

      const dbContext = relevantProgrammes.slice(0, 20).map(p =>
        `${p.title} | ${p.region || '-'} | ${p.category || '-'} | Frist: ${p.antragsfrist || 'laufend'}`
      ).join('\n');

      const regionHint = spokenRegion
        ? `\nDer Nutzer sucht für: ${spokenRegion}. Empfehle NUR Programme für ${spokenRegion} oder bundesweite Programme. NIEMALS Programme aus anderen Bundesländern!`
        : '';

      const res = await fetch(apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: `Du bist ein Förderprogramm-Berater am Telefon. Antworte KURZ: 2-3 Sätze. Nenne 1-2 passende Programme und sage warum sie passen. Natürliche Sprache, kein JSON.

WICHTIGE REGELN:
- Empfehle NUR aktive, gültige Programme (nicht abgelaufen).
- Wenn eine Region genannt wird, NUR Programme aus dieser Region oder bundesweite.
- NIEMALS Programme aus anderen Bundesländern empfehlen.
- Bevorzuge neuere Programme (2025/2026).${regionHint}

Programme:\n${dbContext}` },
            { role: 'user', content: userText }
          ],
          max_tokens: 180,
          temperature: 0.5
        })
      });
      const data = await res.json();
      const answer = data.choices?.[0]?.message?.content || 'Entschuldigung, ich konnte leider keine Antwort finden.';

      addMessage(answer, 'ai');
      await speak(answer);
    } catch (err) {
      const fallback = 'Entschuldigung, bei der Suche ist ein Fehler aufgetreten. Versuchen Sie es nochmal.';
      addMessage(fallback, 'ai');
      await speak(fallback);
    }
  }

  function startListening() {
    if (!callActive) return;
    if (isSpeaking) { setTimeout(startListening, 300); return; }

    setCallState('listening');
    if (transcriptEl) transcriptEl.textContent = '';

    callRecognition = new SpeechRecognition();
    callRecognition.lang = 'de-DE';
    callRecognition.interimResults = true;
    callRecognition.continuous = false;
    callRecognition.maxAlternatives = 1;

    let finalText = '';

    callRecognition.onresult = (event) => {
      let interim = '';
      finalText = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalText += t;
        } else {
          interim += t;
        }
      }
      if (transcriptEl) transcriptEl.textContent = finalText || interim;
    };

    callRecognition.onend = async () => {
      if (!callActive) return;
      const text = finalText.trim();
      if (text.length > 1) {
        await askAndSpeak(text);
        startListening();
      } else {
        startListening();
      }
    };

    callRecognition.onerror = (event) => {
      if (!callActive) return;
      if (event.error === 'no-speech' || event.error === 'aborted') {
        startListening();
        return;
      }
      console.warn('[VoiceCall] Fehler:', event.error);
      setTimeout(startListening, 1000);
    };

    try {
      callRecognition.start();
    } catch (e) {
      setTimeout(startListening, 500);
    }
  }

  function startCall() {
    callActive = true;
    overlay.classList.remove('hidden');
    setCallState('idle');

    speak('Hallo! Wie kann ich Ihnen helfen?').then(() => {
      startListening();
    });
  }

  function endCall() {
    callActive = false;
    isSpeaking = false;
    window.speechSynthesis.cancel();
    if (currentAudio) {
      currentAudio.pause();
      currentAudio = null;
    }
    if (callRecognition) {
      try { callRecognition.abort(); } catch (e) { /* ignore */ }
    }
    overlay.classList.add('hidden');
    overlay.className = 'voice-call-overlay hidden';
    if (transcriptEl) transcriptEl.textContent = '';
  }

  fab.addEventListener('click', startCall);
  endBtn.addEventListener('click', endCall);

  if (window.speechSynthesis.onvoiceschanged !== undefined) {
    window.speechSynthesis.onvoiceschanged = () => {};
  }
  window.speechSynthesis.getVoices();
})();