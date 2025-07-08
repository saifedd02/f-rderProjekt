//Ich muss das noch verstecken !!!!
const OPENAI_API_KEY = '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';
////!!!!!



import Fuse from 'https://cdn.jsdelivr.net/npm/fuse.js@6.6.2/dist/fuse.esm.js';

// Förderprogramme mit Links als Wissensbasis
const programmes = [
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
    title: 'go-digital',
    description: 'Beratung und Umsetzung für die Digitalisierung von Geschäftsprozessen.',
    url: 'https://www.innovation-beratung-foerderung.de/INNO/Navigation/DE/go-digital/go-digital.html?utm_source=chatgpt.com',
    foerderhoehe: 'bis zu 50%',
    zielgruppe: 'KMU, Handwerk',
    antragsfrist: 'laufend',
    foerderart: 'Zuschuss',
    ansprechpartner: 'BMWK',
    region: 'Bundesweit',
    category: 'Digitalisierung'
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
    title: 'Technologieprogramme Künstliche Intelligenz',
    description: 'Aktuelle Technologieprogramme im Bereich KI.',
    url: 'https://www.digitale-technologien.de/DT/Navigation/DE/ProgrammeProjekte/AktuelleTechnologieprogramme/Kuenstliche_Intelligenz/ki.html?utm_source=chatgpt.com'
  },
  {
    title: 'Mittelstand-Digital',
    description: 'Zentren des Netzwerks Mittelstand-Digital unterstützen KMU und Handwerk bei der Digitalisierung.',
    url: 'https://www.mittelstand-digital.de/MD/Redaktion/DE/Artikel/Themenbuehne/neuausrichtung-mittelstand-digital.html?utm_source=chatgpt.com'
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
    title: 'Mittelstand Innovation & Digital GUT NRW',
    description: 'Förderung für Digitalisierung und Innovation in NRW (GUT).',
    url: 'https://www.foerderdatenbank.de/FDB/Content/DE/Foerderprogramm/Land/NRW/mittelstand-innovation-digital-gut-nrw.html?utm_source=chatgpt.com'
  },
  {
    title: 'progres.nrw – Programmbereich Klimaschutztechnik',
    description: 'Förderung für Klimaschutztechnik in NRW.',
    url: 'https://www.foerderdatenbank.de/FDB/Content/DE/Foerderprogramm/Land/NRW/progres-nrw-programmbereich-klimaschutztechnik.html?utm_source=chatgpt.com',
    foerderhoehe: 'bis zu 60%',
    zielgruppe: 'Unternehmen, Kommunen',
    antragsfrist: 'laufend',
    foerderart: 'Zuschuss',
    ansprechpartner: 'NRW.BANK',
    region: 'Nordrhein-Westfalen',
    category: 'Umwelt'
  },
  {
    title: 'progres.nrw – Wärme- und Kältenetzsysteme',
    description: 'Förderung für Wärme- und Kältenetzsysteme in NRW.',
    url: 'https://www.nrwbank.de/de/foerderung/foerderprodukte/15734/progresnrw---programmbereich-waerme--und-kaeltenetzsysteme.html?utm_source=chatgpt.com'
  },
  {
    title: 'Innovationsgutscheine Baden-Württemberg',
    description: 'Innovationsgutscheine für Unternehmen in Baden-Württemberg.',
    url: 'https://wm.baden-wuerttemberg.de/de/innovation/innovationsgutscheine?utm_source=chatgpt.com'
  },
  {
    title: 'Innovationsgutschein L-Bank',
    description: 'Innovationsgutscheine der L-Bank Baden-Württemberg.',
    url: 'https://www.l-bank.de/produkte/finanzhilfen/innovationsgutschein.html?utm_source=chatgpt.com'
  },
  {
    title: 'Innovationsgutschein Bayern',
    description: 'Innovationsgutscheine für Unternehmen in Bayern.',
    url: 'https://www.bayern-innovativ.de/leistungen/projekttraeger/projekttraeger-bayern/innovationsgutschein-bayern/?utm_source=chatgpt.com',
    foerderhoehe: 'bis zu 80%',
    zielgruppe: 'KMU, Handwerk',
    antragsfrist: 'laufend',
    foerderart: 'Zuschuss',
    ansprechpartner: 'Bayern Innovativ',
    region: 'Bayern',
    category: 'Innovation'
  },
  {
    title: 'Innovationsgutscheine Bayern (StMWi)',
    description: 'Innovationsgutscheine des Bayerischen Wirtschaftsministeriums.',
    url: 'https://www.stmwi.bayern.de/foerderungen/innovationsgutscheine/?utm_source=chatgpt.com'
  },
  {
    title: 'Pro FIT Projektfinanzierung (IBB)',
    description: 'Förderung für innovative Projekte in Berlin.',
    url: 'https://www.ibb.de/de/foerderprogramme/pro-fit-projektfinanzierung.html?utm_source=chatgpt.com'
  },
  {
    title: 'Pro FIT Frühphasenfinanzierung (IBB)',
    description: 'Frühphasenfinanzierung für innovative Unternehmen in Berlin.',
    url: 'https://www.ibb.de/de/foerderprogramme/pro-fit-fruehphasenfinanzierung.html?utm_source=chatgpt.com'
  },
  {
    title: 'Solarförderung NRW',
    description: 'Förderung für Solaranlagen in Nordrhein-Westfalen.',
    url: 'https://www.solarplatz.de/foerderung/nordrhein-westfalen?utm_source=chatgpt.com'
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
    title: 'KMU-innovativ: IKT / KI',
    description: 'Förderung risikoreicher KI-F&E-Projekte für kleine und mittlere Unternehmen.',
    url: 'https://www.kmu-innovativ.de/foerderlinie/ikt?utm_source=chatgpt.com'
  },
  {
    title: 'KI-Innovationswettbewerb',
    description: 'Wettbewerblicher Aufruf zur Entwicklung innovativer KI-Plattformen und -Ökosysteme.',
    url: 'https://www.digitale-technologien.de/DT/Navigation/DE/ProgrammeProjekte/AktuelleTechnologieprogramme/Kuenstliche_Intelligenz/ki_innovationswettbewerb.html?utm_source=chatgpt.com'
  },
  {
    title: 'Mittelstand-Digital Zentren',
    description: 'Kostenfreie Schulungen und KI-Trainer für Digitalisierungsvorhaben im Mittelstand.',
    url: 'https://www.mittelstand-digital.de/MD/Redaktion/DE/Artikel/Themenbuehne/neuausrichtung-mittelstand-digital.html?utm_source=chatgpt.com'
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
    title: 'MID‑Digitale Sicherheit NRW',
    description: 'Fördermodul für Cyber‑Security‑Projekte in kleinen und mittleren Unternehmen in NRW.',
    url: 'https://www.mittelstand-innovativ-digital.nrw/foerderlinien/mid-digitale-sicherheit?utm_source=chatgpt.com'
  },
  {
    title: 'Progress Solar Invest NRW',
    description: 'Zuschüsse für Photovoltaik-Anlagen und Speicherlösungen in Nordrhein‑Westfalen.',
    url: 'https://www.progress.nrw/solar?utm_source=chatgpt.com'
  },
  {
    title: 'EEN‑Hessen Innovationsberatung',
    description: 'Kostenfreier EU‑Förderscouting‑ und Innovationsservice für hessische KMU.',
    url: 'https://www.een-hessen.de/?utm_source=chatgpt.com'
  },
  {
    title: 'Innovationsgutschein Handwerk Bayern',
    description: 'Gutschein für Kleinstunternehmen und Handwerksbetriebe zur Finanzierung externer F&E-Leistungen.',
    url: 'https://www.stmwi.bayern.de/foerderungen/innovationsgutscheine/?utm_source=chatgpt.com'
  },
  {
    title: 'progres.nrw – Batteriespeicher',
    description: '100 €/kWh Zuschuss für Stromspeicher im unternehmerischen Umfeld in NRW.',
    url: 'https://www.nrwbank.de/de/foerderung/foerderprodukte/15734?utm_source=chatgpt.com'
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
    title: 'AI Innovation Fund (EU‑Pilot)',
    description: 'Pilotförderung zur Entwicklung vertrauenswürdiger KI-Lösungen in Europa.',
    url: 'https://digital-strategy.ec.europa.eu/en/funding/ai-innovation?utm_source=chatgpt.com'
  },
  {
    title: 'EIT Digital Challenge',
    description: 'Preisgelder und Accelerator‑Support für Scale‑ups aus dem Bereich Digital & KI.',
    url: 'https://www.eitdigital.eu/challenge?utm_source=chatgpt.com'
  },
  {
    title: 'Copernicus Masters / ESA‑BIC',
    description: 'Wettbewerb und Inkubation für KI-Anwendungen auf Basis von Erdbeobachtungsdaten.',
    url: 'https://www.copernicus-masters.com/?utm_source=chatgpt.com'
  },
  {
    title: 'Umweltinnovationsprogramm (BMUV)',
    description: 'Zuschüsse für erstmalige großtechnische Umwelt- und Klimaschutzinnovationen in Deutschland.',
    url: 'https://www.bmuv.de/themen/wirtschaft-produkte-ressourcen-tourismus/foerderprogramme/umweltinnovationsprogramm?utm_source=chatgpt.com'
  },
  {
    title: 'ERP-Digitalisierungs- und Innovationskredit (KfW 380/390)',
    description: 'Zinsgünstige Darlehen für Digitalisierungs- und Innovationsprojekte von KMU.',
    url: 'https://www.kfw.de/inlandsfoerderung/Unternehmen/Erschließen-Innovationen-und-Digitalisierung/ERP-Digitalisierungs-und-Innovationskredit/?utm_source=chatgpt.com'
  },
  {
    title: 'INVEST – Zuschuss für Wagniskapital',
    description: 'BAFA-Zuschuss für private Investitionen in junge, innovative Start-ups.',
    url: 'https://www.bafa.de/DE/Wirtschaft_Mittelstand/INVEST/invest_node.html?utm_source=chatgpt.com'
  },
  {
    title: 'High-Tech Gründerfonds (HTGF)',
    description: 'Seed-Finanzierung für High-Tech-Startups bis zu 1 Mio. € in der Startphase.',
    url: 'https://www.htgf.de/?utm_source=chatgpt.com'
  },
  {
    title: 'LIFE Programme (EU)',
    description: 'EU-Förderung für Umwelt-, Naturschutz- und Klimaprojekte, auch für Unternehmen.',
    url: 'https://cinea.ec.europa.eu/life_en?utm_source=chatgpt.com'
  },
  {
    title: 'Innovation Fund (EU)',
    description: 'Finanzierung großskaliger Demonstrationsprojekte für CO₂-arme Technologien.',
    url: 'https://cinea.ec.europa.eu/innovation-fund_en?utm_source=chatgpt.com'
  },
  {
    title: 'CEF Digital – Connecting Europe Facility',
    description: 'Förderung für europaweite digitale Infrastruktur und 5G-Korridore.',
    url: 'https://digital-strategy.ec.europa.eu/en/funding/cef-digital?utm_source=chatgpt.com'
  },
  {
    title: 'Klimaschutzoffensive für den Mittelstand (KfW 292)',
    description: 'Kreditprogramm für Investitionen in Energieeffizienz und erneuerbare Energien.',
    url: 'https://www.kfw.de/inlandsfoerderung/Unternehmen/Energie-Umwelt/KfW-Klimaschutzoffensive-für-den-Mittelstand-(292)/?utm_source=chatgpt.com'
  },
  {
    title: 'Digitalbonus Bayern',
    description: 'Zuschuss bis zu 50 % für Digitalisierungsmaßnahmen bei KMU in Bayern.',
    url: 'https://www.digitalbonus.bayern/?utm_source=chatgpt.com'
  },
  {
    title: 'InnoRampUp Hamburg',
    description: 'Zuschüsse bis 150 k€ für innovative Start-ups in Hamburg.',
    url: 'https://www.ifbhh.de/foerderprogramm/innorampup?utm_source=chatgpt.com'
  },
  {
    title: 'GRW Digital Sachsen',
    description: 'Investitionszuschüsse für digitale Produktions- und Geschäftsprozesse im Freistaat Sachsen.',
    url: 'https://www.sab.sachsen.de/wirtschaft/gueltige-programme/grw-digital.jsp?utm_source=chatgpt.com'
  },
  {
    title: 'BIG Digital Brandenburg',
    description: 'Brandenburg-Innovation-Gutschein für Digitalisierungsprojekte in KMU.',
    url: 'https://www.ilb.de/de/gruendung-unternehmen/big-digital?utm_source=chatgpt.com'
  },
  {
    title: 'Start-up Transfer.NRW',
    description: 'Förderung für Ausgründungen aus Hochschulen und Forschungseinrichtungen in NRW.',
    url: 'https://www.ptj.de/projektfoerderung/start-up-transfer-nrw?utm_source=chatgpt.com'
  },
  {
    title: 'PROFI Brandenburg',
    description: '„Programm zur Förderung von Forschung, Innovationen und Technologien" für Brandenburger Unternehmen.',
    url: 'https://www.ilb.de/de/gruendung-unternehmen/profi?utm_source=chatgpt.com'
  },
  {
    title: 'Zukunft Bau – Forschungsförderung',
    description: 'BMWSB‑Programm zur Förderung von Forschung im Bauwesen und klimafreundlichen Baustoffen.',
    url: 'https://www.bbsr.bund.de/BBSR/DE/forschung/zukunftbau/zukunftbau_node.html?utm_source=chatgpt.com'
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
    title: 'Klimaschutzoffensive für Unternehmen (293)',
    description: 'Förderung klimafreundlicher Aktivitäten und strategischer Transformationstechnologien. Unterstützt Unternehmen beim ökologisch nachhaltigen Wirtschaften.',
    url: 'https://www.kfw.de/inlandsfoerderung/Unternehmen/Energie-Umwelt/F%C3%B6rderprodukte/Klimaschutzoffensive-f%C3%BCr-Unternehmen-(293)/',
    foerderhoehe: 'Bis zu 25 Mio. Euro pro Vorhaben, bis zu 100% der Kosten',
    zielgruppe: 'Unternehmen der gewerblichen Wirtschaft, Freiberufler, kommunale Unternehmen',
    antragsfrist: 'Laufend',
    foerderart: 'Kredit',
    ansprechpartner: 'KfW Bankengruppe',
    region: 'Deutschland',
    category: 'Klimaschutz',
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
    title: 'Erneuerbare Energien – Standard (270)',
    description: 'Förderkredit für Anlagen zur Erzeugung von Strom und Wärme aus erneuerbaren Energien sowie für Netze und Speicher.',
    url: 'https://www.kfw.de/inlandsfoerderung/Unternehmen/Energie-und-Umwelt/F%C3%B6rderprodukte/Erneuerbare-Energien-Standard-(270)/',
    foerderhoehe: 'Bis zu 50 Mio. Euro pro Vorhaben',
    zielgruppe: 'Unternehmen, Freiberufler, Privatpersonen',
    antragsfrist: 'Laufend',
    foerderart: 'Kredit',
    ansprechpartner: 'KfW Bankengruppe',
    region: 'Deutschland',
    category: 'Energie',
    applicant_type: 'KMU'
  },
  {
    title: 'Klimafreundlicher Neubau – Nichtwohngebäude (299)',
    description: 'Förderung für energieeffiziente und nachhaltige Neubauten von Nichtwohngebäuden mit langer Zinsbindung.',
    url: 'https://www.kfw.de/inlandsfoerderung/Unternehmen/Energie-und-Umwelt/F%C3%B6rderprodukte/Klimafreundlicher-Neubau-Nichtwohngeb%C3%A4ude-(299)/',
    foerderhoehe: 'Bis zu 30 Jahre Laufzeit, bis zu 10 Jahre Zinsbindung',
    zielgruppe: 'Unternehmen, öffentliche Einrichtungen, Investoren',
    antragsfrist: 'Laufend',
    foerderart: 'Kredit',
    ansprechpartner: 'KfW Bankengruppe',
    region: 'Deutschland',
    category: 'Bauen',
    applicant_type: 'KMU'
  },
  {
    title: 'Energieeffizienz in der Produktion (292)',
    description: 'Förderung von Maßnahmen zur Steigerung der Energieeffizienz in Produktionsprozessen zur Senkung der Energiekosten.',
    url: 'https://www.kfw.de/inlandsfoerderung/Unternehmen/Energie-und-Umwelt/F%C3%B6rderprodukte/Energieeffizienz-in-der-Produktion-(292)/',
    foerderhoehe: 'Finanzierung für Neuinvestitionen und Modernisierungen',
    zielgruppe: 'Unternehmen, freiberuflich Tätige',
    antragsfrist: 'Laufend',
    foerderart: 'Kredit',
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
  {
    title: 'go-digital',
    description: 'Förderung der Digitalisierung von kleinen und mittleren Unternehmen durch autorisierte Beratungsunternehmen.',
    url: 'https://www.innovation-beratung-foerderung.de/INNO/Navigation/DE/go-digital/go-digital.html',
    foerderhoehe: 'Bis zu 16.500 Euro (50% Förderung)',
    zielgruppe: 'KMU mit weniger als 100 Mitarbeitern',
    antragsfrist: 'Laufend',
    foerderart: 'Zuschuss',
    ansprechpartner: 'BMWi/VDI/VDE Innovation + Technik GmbH',
    region: 'Deutschland',
    category: 'Digitalisierung',
    applicant_type: 'KMU'
  },
  {
    title: 'KMU-innovativ',
    description: 'Förderung von Forschungs- und Entwicklungsvorhaben in verschiedenen Technologiefeldern für kleine und mittlere Unternehmen.',
    url: 'https://www.bmbf.de/bmbf/de/forschung/innovativer-mittelstand/kmu-innovativ/kmu-innovativ.html',
    foerderhoehe: 'Bis zu 500.000 Euro pro Vorhaben',
    zielgruppe: 'KMU, Startups, Hochschulen',
    antragsfrist: 'Mehrmals jährlich je Technologiefeld',
    foerderart: 'Zuschuss',
    ansprechpartner: 'Verschiedene Projektträger',
    region: 'Deutschland',
    category: 'Innovation',
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
  {
    title: 'Digitalisierungsprämie Plus Darlehensvariante - L-Bank',
    description: 'Förderung von Digitalisierungsprojekten sowie Maßnahmen zur Verbesserung der IT-Sicherheit in KMU mit Tilgungszuschuss 4%.',
    url: 'https://www.wirtschaft-digital-bw.de/foerderprogramme/digitalisierungspraemie-plus',
    foerderhoehe: 'Darlehen 15.000-100.000 €, Tilgungszuschuss 4%',
    zielgruppe: 'Unternehmen bis 500 Mitarbeiter, Freiberufler',
    antragsfrist: 'Laufend',
    foerderart: 'Darlehen mit Tilgungszuschuss',
    ansprechpartner: 'L-Bank Baden-Württemberg',
    region: 'Baden-Württemberg',
    category: 'Digitalisierung',
    applicant_type: 'KMU'
  },
  {
    title: 'Digitalisierungsprämie Plus Zuschussvariante - L-Bank',
    description: 'Direkter Zuschuss für kleinere Digitalisierungsprojekte und IT-Sicherheitsmaßnahmen in KMU.',
    url: 'https://www.wirtschaft-digital-bw.de/foerderprogramme/digitalisierungspraemie-plus',
    foerderhoehe: '30%, max. 3.000 Euro',
    zielgruppe: 'Unternehmen bis 500 Mitarbeiter, Freiberufler',
    antragsfrist: 'Laufend',
    foerderart: 'Zuschuss',
    ansprechpartner: 'L-Bank Baden-Württemberg',
    region: 'Baden-Württemberg',
    category: 'Digitalisierung',
    applicant_type: 'KMU'
  },
  
  // Sachsen Programme (SAB)
  {
    title: 'Digitalisierung Zuschuss EFRE - Transformationsprojekte SAB',
    description: 'Förderung umfassender Digitalisierungsvorhaben in sächsischen Unternehmen zur digitalen Transformation.',
    url: 'https://www.foerderdatenbank.de/FDB/Content/DE/Kontakt/_Uebergeordnet/S/sab-sachsen.html',
    foerderhoehe: 'Bis zu 50% Förderquote',
    zielgruppe: 'Unternehmen in Sachsen',
    antragsfrist: 'Nach Aufrufen',
    foerderart: 'Zuschuss',
    ansprechpartner: 'Sächsische Aufbaubank (SAB)',
    region: 'Sachsen',
    category: 'Digitalisierung',
    applicant_type: 'KMU'
  },
  {
    title: 'EFRE/JTF-Technologieförderung 2021-2027 SAB',
    description: 'FuE-Projektförderung für innovative Forschungs- und Entwicklungsprojekte in Sachsen im Rahmen der EU-Förderperiode.',
    url: 'https://www.foerderdatenbank.de/FDB/Content/DE/Kontakt/_Uebergeordnet/S/sab-sachsen.html',
    foerderhoehe: 'Bis zu 80% der förderfähigen Kosten',
    zielgruppe: 'Forschungseinrichtungen, Unternehmen',
    antragsfrist: 'Nach Aufrufen',
    foerderart: 'Zuschuss',
    ansprechpartner: 'Sächsische Aufbaubank (SAB)',
    region: 'Sachsen',
    category: 'Innovation',
    applicant_type: 'KMU'
  },
  {
    title: 'Darlehen für den Mittelstand (FRL DFM) - Digitalisierungsdarlehen SAB',
    description: 'Günstige Darlehen für Digitalisierungsvorhaben von Existenzgründern und Unternehmen in Sachsen.',
    url: 'https://www.foerderdatenbank.de/FDB/Content/DE/Kontakt/_Uebergeordnet/S/sab-sachsen.html',
    foerderhoehe: 'Günstige Zinssätze je nach Laufzeit',
    zielgruppe: 'Existenzgründer, Unternehmen',
    antragsfrist: 'Laufend',
    foerderart: 'Darlehen',
    ansprechpartner: 'Sächsische Aufbaubank (SAB)',
    region: 'Sachsen',
    category: 'Digitalisierung',
    applicant_type: 'KMU'
  },
  
  // Thüringen Programme (TAB)
  {
    title: 'FTI-Thüringen TECHNOLOGIE',
    description: 'Förderung von Technologievorhaben und innovativen Projekten in Thüringen entsprechend der Regionalen Innovationsstrategie.',
    url: 'https://www.aufbaubank.de/Unternehmen/Innovationen-voranbringen',
    foerderhoehe: 'Bis zu 80% Förderquote je nach Vorhaben',
    zielgruppe: 'Verarbeitendes Gewerbe, Handwerk, Forschungseinrichtungen',
    antragsfrist: 'Laufend',
    foerderart: 'Zuschuss',
    ansprechpartner: 'Thüringer Aufbaubank (TAB)',
    region: 'Thüringen',
    category: 'Innovation',
    applicant_type: 'KMU'
  },
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
    title: 'Bundesförderung für Energieberatung im Mittelstand',
    description: 'BAFA-Förderung für qualifizierte Energieberatung in KMU zur Identifizierung von Energieeinsparpotentialen.',
    url: 'https://www.bafa.de/DE/Energie/Energieberatung/Energieberatung_Mittelstand/energieberatung_mittelstand_node.html',
    foerderhoehe: 'Bis zu 80% der Beratungskosten, max. 6.000 Euro',
    zielgruppe: 'KMU mit jährlichen Energiekosten ab 10.000 Euro',
    antragsfrist: 'Laufend',
    foerderart: 'Zuschuss',
    ansprechpartner: 'BAFA',
    region: 'Deutschland',
    category: 'Energie',
    applicant_type: 'KMU'
  },
  {
    title: 'Förderung von Maßnahmen zur Steigerung der Materialeffizienz',
    description: 'VDI ZRE Förderung für Unternehmen zur Steigerung der Materialeffizienz und Ressourcenschonung in der Produktion.',
    url: 'https://www.ressource-deutschland.de/foerderung/',
    foerderhoehe: 'Bis zu 200.000 Euro, 50% Förderquote',
    zielgruppe: 'Produzierendes Gewerbe, Handwerk',
    antragsfrist: 'Nach Verfügbarkeit',
    foerderart: 'Zuschuss',
    ansprechpartner: 'VDI Zentrum Ressourceneffizienz',
    region: 'Deutschland',
    category: 'Umwelt',
    applicant_type: 'KMU'
  },
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
  
  // Weitere KfW-Programme
  {
    title: 'KfW-Umweltprogramm',
    description: 'Förderung von Umwelt- und Klimaschutzmaßnahmen zur Verringerung von Umweltbelastungen in Unternehmen.',
    url: 'https://www.kfw.de/inlandsfoerderung/Unternehmen/Umwelt-Klima/',
    foerderhoehe: 'Bis zu 25 Mio. Euro pro Vorhaben',
    zielgruppe: 'Unternehmen jeder Größe, Freiberufler',
    antragsfrist: 'Laufend',
    foerderart: 'Darlehen',
    ansprechpartner: 'KfW Bankengruppe',
    region: 'Deutschland',
    category: 'Umwelt',
    applicant_type: 'KMU'
  },
  {
    title: 'KfW-Effizienzhaus/Energieeffizienz in der Wirtschaft',
    description: 'Förderung von Investitionen in hocheffiziente Technologien zur Steigerung der Energieeffizienz in Unternehmen.',
    url: 'https://www.kfw.de/inlandsfoerderung/Unternehmen/Energie-Umwelt/F%C3%B6rderprodukte/Energieeffizienz-und-Prozessw%C3%A4rme-(295)/',
    foerderhoehe: 'Bis zu 25 Mio. Euro plus Tilgungszuschuss bis 55%',
    zielgruppe: 'Unternehmen, Contractoren, Kommunen',
    antragsfrist: 'Laufend',
    foerderart: 'Darlehen mit Tilgungszuschuss',
    ansprechpartner: 'KfW Bankengruppe',
    region: 'Deutschland',
    category: 'Energie',
    applicant_type: 'KMU'
  },
  {
    title: 'KfW-Wachstumsfinanzierung',
    description: 'Langfristige Finanzierung für wachstumsstarke mittelständische Unternehmen zur Expansion und Investition.',
    url: 'https://www.kfw.de/inlandsfoerderung/Unternehmen/Wachsen-Nachfolge/',
    foerderhoehe: 'Bis zu 25 Mio. Euro',
    zielgruppe: 'Etablierte mittelständische Unternehmen',
    antragsfrist: 'Laufend',
    foerderart: 'Darlehen',
    ansprechpartner: 'KfW Bankengruppe',
    region: 'Deutschland',
    category: 'Wachstum',
    applicant_type: 'KMU'
  },
  
  // Weitere Startup-Programme
  {
    title: 'INVEST - Zuschuss für Wagniskapital',
    description: 'Förderung für Business Angels und Investoren, die in junge innovative Unternehmen investieren.',
    url: 'https://www.bmwk.de/Redaktion/DE/Artikel/Mittelstand/invest-zuschuss-wagniskapital.html',
    foerderhoehe: '25% des Investitionsbetrags, bis zu 500.000 Euro',
    zielgruppe: 'Business Angels, private Investoren',
    antragsfrist: 'Laufend',
    foerderart: 'Zuschuss',
    ansprechpartner: 'BMWK über Bundesländer',
    region: 'Deutschland',
    category: 'Gründung',
    applicant_type: 'Projektträger'
  },
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
    title: 'Hamburg Digital - IFB Hamburg',
    description: 'Förderung für Digitalisierung von KMU der Hamburger Wirtschaft mit Beratungs- und Investitionsleistungen. Unterstützt bei der Umstellung auf neue digitale Systeme und Geschäftsmodelle.',
    url: 'https://www.ifbhh.de/foerderprogramm/hamburg-digital',
    foerderhoehe: 'Bis zu 50% Zuschuss, mind. 3.000 € (netto) je Modul',
    zielgruppe: 'KMU der gewerblichen Wirtschaft und des Handwerks, freiberuflich Tätige',
    antragsfrist: 'Laufend (Programm eingestellt bis 15.11.2024)',
    foerderart: 'Zuschuss',
    ansprechpartner: 'IFB Hamburg',
    region: 'Hamburg',
    category: 'Digitalisierung',
    applicant_type: 'KMU'
  },
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
    title: 'PROFI Standard - IFB Hamburg',
    description: 'Förderung für Forschung und Entwicklung in Unternehmen. Unterstützt innovative Projekte zur Entwicklung neuer Produkte, Verfahren oder Dienstleistungen.',
    url: 'https://www.ifbhh.de/programme/gruender-and-unternehmen/innovationen-realisieren',
    foerderhoehe: 'Zuschuss für FuE-Projekte',
    zielgruppe: 'KMU, Forschungseinrichtungen',
    antragsfrist: 'Laufend',
    foerderart: 'Zuschuss',
    ansprechpartner: 'IFB Hamburg Innovationsagentur',
    region: 'Hamburg',
    category: 'Forschung',
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
  keys: ['title', 'description'],
  includeScore: true,
  threshold: 0.4
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
const resultsEl = document.getElementById('results');
const regionFilterEl = document.getElementById('regionFilter');
const categoryFilterEl = document.getElementById('categoryFilter');

// Custom Dropdown elements for 'Förderberechtigte'
const eligibleDropdownContainer = document.getElementById('eligibleDropdownContainer');
const eligibleDropdownButton = document.getElementById('eligibleDropdownButton');
const eligibleDropdownLabel = document.getElementById('eligibleDropdownLabel');
const eligibleDropdownPanel = document.getElementById('eligibleDropdownPanel');

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

/* ----------  VOICE INPUT (Web Speech API)  ---------- */
const supportsSpeech = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
let recognition = null;
/* ----------  DOCUMENT CONTEXT  ---------- */
let docContext = '';   // wird gefüllt, wenn der Nutzer eine Datei hochlädt
let lastUserQueryForFilter = ''; // Speichert die letzte Benutzeranfrage für automatische Filter-Neuanfragen

function setupVoiceInput() {
  if (!supportsSpeech) return;

  // Create microphone button dynamically
  const micBtn = document.createElement('button');
  micBtn.id = 'micBtn';
  micBtn.type = 'button';
  micBtn.title = 'Spracheingabe';
  micBtn.className = 'ml-2 p-2 rounded-full bg-blue-600 hover:bg-blue-700 text-white focus:outline-none';
  micBtn.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 14a3 3 0 003-3V5a3 3 0 00-6 0v6a3 3 0 003 3z"/>
      <path d="M19 10v1a7 7 0 01-14 0v-1h-2v1a9 9 0 008 8.94V22h-2v2h6v-2h-2v-2.06A9 9 0 0021 11v-1h-2z"/>
    </svg>`;
  chatForm.insertBefore(micBtn, chatForm.firstChild);

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  recognition = new SpeechRecognition();
  recognition.lang = 'de-DE';
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  let listening = false;

  micBtn.addEventListener('click', () => {
    if (listening) {
      recognition.stop();
      return;
    }
    recognition.start();
  });

  recognition.addEventListener('start', () => {
    listening = true;
    micBtn.classList.remove('bg-blue-600');
    micBtn.classList.add('bg-red-600');
  });

  recognition.addEventListener('end', () => {
    listening = false;
    micBtn.classList.remove('bg-red-600');
    micBtn.classList.add('bg-blue-600');
  });

  recognition.addEventListener('result', (event) => {
    const transcript = event.results[0][0].transcript.trim();
    queryInput.value = transcript;
    search(); // trigger the same search workflow
  });
}

// Datei-Upload und Voice-Input initialisieren, wenn DOM bereit
/* ----------  FILE UPLOAD (PDF/TXT)  ---------- */
function setupFileUpload() {
  // verstecktes Input-Feld
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.id = 'docFile';
  fileInput.accept = '.pdf,.txt';
  fileInput.className = 'hidden';
  chatForm.appendChild(fileInput);

  // Label-Button
  const fileLbl = document.createElement('label');
  fileLbl.htmlFor = 'docFile';
  fileLbl.className = 'ml-2 cursor-pointer text-blue-600 hover:underline';
  fileLbl.textContent = 'Datei hochladen';
  chatForm.insertBefore(fileLbl, chatForm.firstChild.nextSibling);

  fileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      let text = '';
      if (file.type === 'text/plain') {
        text = await file.text();
      } else if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
        if (!window.pdfjsLib) {
          alert('PDF-Parser konnte nicht geladen werden.');
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
        alert('Dateityp nicht unterstützt. Bitte PDF oder TXT verwenden.');
        return;
      }
      docContext = text.slice(0, 8000);
      addMessage('📄 Datei analysiert – Kontext wird in die nächste KI-Anfrage eingefügt.', 'ai');
    } catch (err) {
      console.error('Datei-Analyse-Fehler', err);
      addMessage('<span class="text-red-600">Datei konnte nicht verarbeitet werden.</span>', 'ai');
    }
  });
}

function populateRegionFilter() {
  if (!regionFilterEl) return;
  const regionsSet = new Set();
  programmes.forEach(p => { if (p.region) regionsSet.add(p.region); });
  // include favorites data if any
  const favData = getFavoritesData();
  Object.values(favData).forEach(p => { if (p && p.region) regionsSet.add(p.region); });
  // Ensure EU-weit is included if present in any KI entries later
  regionFilterEl.innerHTML = '<option value="">Alle Regionen</option>' +
    Array.from(regionsSet).sort().map(r => `<option>${r}</option>`).join('');
}

function setupEligibleDropdown() {
    if (!eligibleDropdownContainer) return;

    const eligibleSet = new Set();
    const fromImage = [
        'Bildungseinrichtung', 'Existenzgründer/in', 'Forschungseinrichtung',
        'Hochschule', 'Kommune', 'Öffentliche Einrichtung',
        'Privatperson', 'Unternehmen', 'Verband/Vereinigung'
    ];
    fromImage.forEach(item => eligibleSet.add(item));
    programmes.forEach(p => {
        if (p.zielgruppe) p.zielgruppe.split(',').forEach(zg => eligibleSet.add(zg.trim()));
    });

    eligibleDropdownPanel.innerHTML = ''; // Clear existing
    Array.from(eligibleSet).sort().forEach(item => {
        if (!item) return;
        const wrapper = document.createElement('div');
        wrapper.className = 'flex items-center p-2 hover:bg-gray-100 cursor-pointer';
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = `dd-check-${item.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
        checkbox.value = item;
        checkbox.className = 'h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer';

        const label = document.createElement('label');
        label.htmlFor = checkbox.id;
        label.textContent = item;
        label.className = 'ml-2 block text-sm text-gray-900 flex-1 cursor-pointer';
        
        wrapper.appendChild(checkbox);
        wrapper.appendChild(label);
        eligibleDropdownPanel.appendChild(wrapper);
    });
    
    // Dropdown logic
    eligibleDropdownButton.addEventListener('click', () => {
        eligibleDropdownPanel.classList.toggle('hidden');
    });

    document.addEventListener('click', (e) => {
        if (!eligibleDropdownContainer.contains(e.target)) {
            eligibleDropdownPanel.classList.add('hidden');
        }
    });

    eligibleDropdownPanel.addEventListener('change', () => {
        const selected = Array.from(eligibleDropdownPanel.querySelectorAll('input:checked')).map(cb => cb.value);
        if (selected.length === 0) {
            eligibleDropdownLabel.textContent = 'Alle auswählen';
        } else if (selected.length === 1) {
            eligibleDropdownLabel.textContent = selected[0];
        } else {
            eligibleDropdownLabel.textContent = `${selected.length} ausgewählt`;
        }
        handleFilterChange(); // Trigger search on change
    });
}

function setupFundingTypeDropdown() {
    if (!fundingTypeDropdownContainer) return;

    const fundingTypeSet = new Set();
    const fromImage = ['Beteiligung', 'Bürgschaft', 'Darlehen', 'Garantie', 'Sonstige', 'Zuschuss', 'Kredit', 'Stipendium'];
    fromImage.forEach(item => fundingTypeSet.add(item));
    programmes.forEach(p => {
        if (p.foerderart) p.foerderart.split(',').forEach(fa => fundingTypeSet.add(fa.trim()));
    });
    
    fundingTypeDropdownPanel.innerHTML = ''; // Clear existing
    Array.from(fundingTypeSet).sort().forEach(item => {
        if (!item) return;
        const wrapper = document.createElement('div');
        wrapper.className = 'flex items-center p-2 hover:bg-gray-100 cursor-pointer';
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = `ft-check-${item.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
        checkbox.value = item;
        checkbox.className = 'h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer';

        const label = document.createElement('label');
        label.htmlFor = checkbox.id;
        label.textContent = item;
        label.className = 'ml-2 block text-sm text-gray-900 flex-1 cursor-pointer';
        
        wrapper.appendChild(checkbox);
        wrapper.appendChild(label);
        fundingTypeDropdownPanel.appendChild(wrapper);
    });

    // Dropdown logic
    fundingTypeDropdownButton.addEventListener('click', () => {
        fundingTypeDropdownPanel.classList.toggle('hidden');
    });

    document.addEventListener('click', (e) => {
        if (!fundingTypeDropdownContainer.contains(e.target)) {
            fundingTypeDropdownPanel.classList.add('hidden');
        }
    });

    fundingTypeDropdownPanel.addEventListener('change', () => {
        const selected = Array.from(fundingTypeDropdownPanel.querySelectorAll('input:checked')).map(cb => cb.value);
        if (selected.length === 0) {
            fundingTypeDropdownLabel.textContent = 'Alle auswählen';
        } else if (selected.length === 1) {
            fundingTypeDropdownLabel.textContent = selected[0];
        } else {
            fundingTypeDropdownLabel.textContent = `${selected.length} ausgewählt`;
        }
        handleFilterChange(); // Trigger search on change
    });
}

function setupCompanySizeDropdown() {
    if (!companySizeDropdownContainer) return;

    const companySizeOptions = ['Großes Unternehmen', 'Mittleres Unternehmen', 'Kleines Unternehmen', 'Kleinstunternehmen'];
    
    companySizeDropdownPanel.innerHTML = ''; // Clear existing
    companySizeOptions.forEach(item => {
        const wrapper = document.createElement('div');
        wrapper.className = 'flex items-center p-2 hover:bg-gray-100 cursor-pointer';
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = `cs-check-${item.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
        checkbox.value = item;
        checkbox.className = 'h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer';

        const label = document.createElement('label');
        label.htmlFor = checkbox.id;
        label.textContent = item;
        label.className = 'ml-2 block text-sm text-gray-900 flex-1 cursor-pointer';
        
        wrapper.appendChild(checkbox);
        wrapper.appendChild(label);
        companySizeDropdownPanel.appendChild(wrapper);
    });

    // Dropdown logic
    companySizeDropdownButton.addEventListener('click', () => {
        companySizeDropdownPanel.classList.toggle('hidden');
    });

    document.addEventListener('click', (e) => {
        if (!companySizeDropdownContainer.contains(e.target)) {
            companySizeDropdownPanel.classList.add('hidden');
        }
    });

    companySizeDropdownPanel.addEventListener('change', () => {
        const selected = Array.from(companySizeDropdownPanel.querySelectorAll('input:checked')).map(cb => cb.value);
        if (selected.length === 0) {
            companySizeDropdownLabel.textContent = 'Alle auswählen';
        } else if (selected.length === 1) {
            companySizeDropdownLabel.textContent = selected[0];
        } else {
            companySizeDropdownLabel.textContent = `${selected.length} ausgewählt`;
        }
        handleFilterChange(); // Trigger search on change
    });
}

document.addEventListener('DOMContentLoaded', () => {
  setupVoiceInput();
  setupFileUpload();
  setupFavoriteStyles();
  setupEligibleDropdown();
  setupFundingTypeDropdown();
  setupCompanySizeDropdown();

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
  if(filterToggle && filterSection && filterContent){
    filterToggle.addEventListener('click', ()=>{
      // If currently collapsed, expand
      if(filterSection.classList.contains('collapsed')){
        filterSection.classList.remove('collapsed');
        filterSection.classList.add('collapsing');
        // Set height to 0, then to scrollHeight to trigger transition
        filterContent.style.height = '0px';
        filterContent.style.opacity = '0';
        // Force reflow
        void filterContent.offsetHeight;
        filterContent.style.height = filterContent.scrollHeight + 'px';
        filterContent.style.opacity = '1';
        // After transition, cleanup
        filterContent.addEventListener('transitionend', function handler(e){
          if(e.propertyName === 'height'){
            filterContent.style.height = '';
            filterSection.classList.remove('collapsing');
            filterContent.removeEventListener('transitionend', handler);
          }
        });
      }else{
        // Collapse
        filterSection.classList.add('collapsing');
        // Set height to current, then to 0
        filterContent.style.height = filterContent.scrollHeight + 'px';
        filterContent.style.opacity = '1';
        // Force reflow
        void filterContent.offsetHeight;
        filterContent.style.height = '0px';
        filterContent.style.opacity = '0';
        filterContent.addEventListener('transitionend', function handler(e){
          if(e.propertyName === 'height'){
            filterSection.classList.add('collapsed');
            filterSection.classList.remove('collapsing');
            filterContent.style.height = '';
            filterContent.removeEventListener('transitionend', handler);
          }
        });
      }
    });
  }
});

function addMessage(content, sender = 'user') {
  const msg = document.createElement('div');
  msg.className = `rounded-lg p-3 mb-2 max-w-2xl ${sender === 'user' ? 'self-end chat-bubble-user' : sender === 'system' ? 'self-center system-message' : 'self-start chat-bubble-ai'}`;
  msg.innerHTML = content;
  chatEl.appendChild(msg);
  chatEl.scrollTop = chatEl.scrollHeight;
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
  prog.customId = 'ai_' + slugify(prog.title || ('prog-'+Date.now()));
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

    return `
    <article class="programme-card bg-white p-4 mb-2 relative" data-antragsfrist="${p.antragsfrist || ''}">
      <button 
        title="Zu Favoriten hinzufügen/entfernen"
        class="heart-icon absolute top-3 right-3 p-2 rounded-full hover:bg-red-100 focus:outline-none ${isProgFavorite ? 'favorited' : ''}"
        data-program-id="${id}">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" stroke-width="1.5" class="w-6 h-6">
          ${heartIconPath}
        </svg>
      </button>
      <h2 class="text-lg font-semibold text-blue-800 mb-1 pr-10">
        ${p.title}
      </h2>
      <p class="text-sm text-gray-500 mb-2">${p.description || ''}</p>
      <ul class="text-sm mb-2 text-gray-700">
        ${p.foerderhoehe ? `<li><strong>Förderhöhe:</strong> ${p.foerderhoehe}</li>` : ''}
        ${p.zielgruppe ? `<li><strong>Zielgruppe:</strong> ${p.zielgruppe}</li>` : ''}
        ${p.region ? `<li><strong>Region:</strong> ${p.region}</li>` : ''}
        ${p.antragsfrist ? `<li><strong>Antragsfrist:</strong> ${p.antragsfrist}</li>` : ''}
        ${p.foerderart ? `<li><strong>Förderart:</strong> ${p.foerderart}</li>` : ''}
        ${p.ansprechpartner ? `<li><strong>Ansprechpartner:</strong> ${p.ansprechpartner}</li>` : ''}
        ${p.category ? `<li><strong>Kategorie:</strong> ${p.category}</li>` : ''}
      </ul>
      <a class="inline-block mt-2 text-blue-600 font-semibold hover:underline" href="${p.url}" target="_blank" rel="noopener">Mehr Infos & Antrag</a>
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

///
async function askOpenAIChat(userMsg) {
  addMessage(userMsg, 'user');

  const urls = extractUrls(userMsg);
  if (urls.length > 0) {
    const firstUrl = urls[0];
    addMessage(`Versuche, Inhalte von <a href="${firstUrl}" target="_blank" rel="noopener noreferrer" class="text-blue-300 underline">${firstUrl}</a> zu laden...`, 'ai');
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
  
  addMessage('<span class="flex items-center gap-2 text-blue-700"><svg class="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path></svg>KI sucht passende Förderprogramme…</span>', 'ai');

  try {
    const selectedRegion = regionFilterEl.value;
    const selectedCategory = categoryFilterEl.value;
    const selectedEligible = eligibleDropdownPanel ?
      Array.from(eligibleDropdownPanel.querySelectorAll('input:checked')).map(cb => cb.value) :
      [];
    const selectedFundingTypes = fundingTypeDropdownPanel ?
      Array.from(fundingTypeDropdownPanel.querySelectorAll('input:checked')).map(cb => cb.value) :
      [];
    const selectedCompanySizes = companySizeDropdownPanel ?
        Array.from(companySizeDropdownPanel.querySelectorAll('input:checked')).map(cb => cb.value) :
        [];

    let filterContext = '';
    const filters = [];
    if (selectedRegion) filters.push(`Region: ${selectedRegion}`);
    if (selectedCategory) filters.push(`Kategorie: ${selectedCategory}`);
    if (selectedEligible.length > 0) filters.push(`Förderberechtigte: ${selectedEligible.join(', ')}`);
    if (selectedFundingTypes.length > 0) filters.push(`Förderart: ${selectedFundingTypes.join(', ')}`);
    if (selectedCompanySizes.length > 0) filters.push(`Unternehmensgröße: ${selectedCompanySizes.join(', ')}`);
    
    if (filters.length > 0) {
      filterContext = `Berücksichtige folgende explizite Filtervorgaben: ${filters.join('; ')}\n\n`;
    }

    const systemPrompt = `Du bist ein Experte für Förderprogramme in Deutschland und der EU. Deine Aufgabe ist es, basierend auf der Firmenbeschreibung, der Nutzeranfrage und den explizit genannten Filterkriterien (Region, Kategorie, Förderberechtigte, Förderart, Unternehmensgröße) passende Förderprogramme zu finden und diese strukturiert zurückzugeben. Antworte IMMER und AUSSCHLIESSLICH mit einem einzelnen, validen JSON-Objekt. Das JSON-Objekt muss die Schlüssel "begruendung" (ein String, der deine Gesamtempfehlung zusammenfasst) und "programme" (ein Array von Programm-Objekten) enthalten. Gib absolut keinen Text vor oder nach dem JSON-Objekt aus. ACHTE PENIBEL auf die Korrektheit und Gültigkeit der URLs. Jeder Link muss zu einer tatsächlich existierenden und relevanten Seite des Förderprogramms führen.`;
    
    const userQueryPrompt = `${filterContext}Basierend auf der folgenden Firmenbeschreibung/Webseiten-Kontext (falls vorhanden) und der aktuellen Nutzeranfrage, identifiziere passende Förderprogramme. Versuche bitte, eine möglichst umfassende Liste relevanter Programme zu erstellen (z.B. 5-10, falls passend), aber priorisiere immer die Relevanz und die Datenqualität.\n\n${docContext ? `Firmenbeschreibung/Webseiten-Kontext:\n${docContext}\n\n` : ''}Aktuelle Nutzeranfrage: "${userMsg}"\n\nStelle für jedes empfohlene Programm folgende Informationen im "programme"-Array bereit: title, description, url (muss eine gültige, existierende und offizielle URL des Programms sein), foerderhoehe, zielgruppe, antragsfrist, foerderart, ansprechpartner, region, category, und eine spezifische "why"-Begründung für dieses Programm. Die "begruendung" im Hauptobjekt soll deine übergreifende Analyse und Empfehlungsstrategie kurz erläutern.\n\nBeispiel für das "programme"-Array (kann mehr Einträge enthalten):
[\n  {\n    "title": "Beispielprogramm Alpha",\n    "description": "Beschreibung des Programms Alpha.",\n    "url": "https://beispiel.de/alpha",\n    "foerderhoehe": "bis 50%",\n    "zielgruppe": "KMU",\n    "antragsfrist": "laufend",\n    "foerderart": "Zuschuss",\n    "ansprechpartner": "Behörde X",\n    "region": "Bundesweit",\n    "category": "Digitalisierung",\n    "why": "Passt gut zu Aspekt A der Anfrage."},\n  {\n    "title": "Förderinitiative Beta",\n    "description": "Details zur Initiative Beta.",\n    "url": "https://initiative.org/beta",\n    "foerderhoehe": "bis 2 Mio. €",\n    "zielgruppe": "Forschungseinrichtungen",\n    "antragsfrist": "31.12.2024",\n    "foerderart": "Projektförderung",\n    "ansprechpartner": "Stiftung Y",\n    "region": "EU-weit",\n    "category": "Innovation",\n    "why": "Relevant aufgrund der genannten Projektziele."
  }\n]\nStelle sicher, dass die gesamte Antwort nur das geforderte JSON-Objekt ist, beginnend mit { und endend mit }.`;

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userQueryPrompt }
        ],
        temperature: 0.2
      })
    });
    const data = await res.json();
    let content = data.choices?.[0]?.message?.content || '';
    content = content.replace(/```json|```/g, '').trim();
    let obj = null;
    try {
      obj = JSON.parse(content.match(/\{[\s\S]*\}/)?.[0] || content);
      if(obj.begruendung) addMessage(`<span class='italic text-gray-700'>${obj.begruendung}</span>`, 'ai');

      if(Array.isArray(obj.programme)) {
        // Prüfe Links: entferne Programme mit toten Links
        const { valid, invalidCount } = await filterProgrammesWithValidLinks(obj.programme);
        if (invalidCount > 0) {
          addMessage(`<span class='text-yellow-600'>${invalidCount} Programme wurden entfernt, weil die angegebene URL nicht erreichbar war.</span>`, 'system');
        }
        const MIN_RESULTS = 6;

        // Wenn zu wenig Programme übrig sind, versuche mit lokalen Daten aufzufüllen
        if (valid.length < MIN_RESULTS) {
          const needed = MIN_RESULTS - valid.length;
          const localCandidates = applyFilters(programmes)
            .filter(p => !valid.some(v => v.title === p.title));

          const { valid: localValid } = await filterProgrammesWithValidLinks(localCandidates);
          
          const addedProgrammes = localValid.slice(0, needed);
          if (addedProgrammes.length > 0) {
            addMessage(`<span class='text-blue-600'>Um mehr Ergebnisse zu liefern, wurden ${addedProgrammes.length} passende Programme aus der lokalen Datenbank hinzugefügt.</span>`, 'system');
            valid.push(...addedProgrammes);
          }

          if (valid.length < MIN_RESULTS) {
            addMessage(`<span class='text-orange-600'>Nur ${valid.length} Programme mit gültigen Links gefunden (inkl. lokaler Daten).</span>`, 'system');
          }
        }

        if (valid.length > 0) {
          addMessage(renderProgrammeList(valid), 'ai');
        } else {
          addMessage('<span class="text-red-600">Keine Programme mit gültiger URL gefunden.</span>', 'ai');
        }
      } else {
        throw new Error('Programme nicht gefunden oder Format falsch.');
      }
    } catch (e) {
      addMessage('<span class="text-red-600">KI-Antwort konnte nicht interpretiert werden.<br><br><b>Rohantwort:</b><br>' + content.replace(/</g, '&lt;'), 'ai');
    }
  } catch (err) {
    addMessage(`<span class="text-orange-600">KI nicht verfügbar (${err.message}). Zeige lokale Ergebnisse basierend auf Filtern und letzter Eingabe:</span>`, 'ai');
    const filteredLocalProgrammes = applyFilters(programmes);
    const lastUserQuery = queryInput.value;
    const matches = lastUserQuery ? fuse.search(lastUserQuery, { store: filteredLocalProgrammes, limit: 10 }).map(r=>r.item) : filteredLocalProgrammes.slice(0,10);
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
  list.forEach(p => {
    const card = document.createElement('article');
    card.className = 'bg-white p-4 rounded shadow';
    card.innerHTML = `
      <h2 class="text-xl font-semibold">${p.title}</h2>
      <p class="text-sm text-gray-500 mb-2">${p.description || ''}</p>
      <ul class="text-sm mb-2">
        ${p.foerderhoehe ? `<li><strong>Förderhöhe:</strong> ${p.foerderhoehe}</li>` : ''}
        ${p.zielgruppe ? `<li><strong>Zielgruppe:</strong> ${p.zielgruppe}</li>` : ''}
        ${p.region ? `<li><strong>Region:</strong> ${p.region}</li>` : ''}
        ${p.antragsfrist ? `<li><strong>Antragsfrist:</strong> ${p.antragsfrist}</li>` : ''}
        ${p.foerderart ? `<li><strong>Förderart:</strong> ${p.foerderart}</li>` : ''}
        ${p.ansprechpartner ? `<li><strong>Ansprechpartner:</strong> ${p.ansprechpartner}</li>` : ''}
        ${p.category ? `<li><strong>Kategorie:</strong> ${p.category}</li>` : ''}
      </ul>
      ${p.why ? `<p class="italic text-gray-600 mb-2">${p.why}</p>` : ''}
      <a class="inline-block mt-2 text-blue-600 hover:underline" href="${p.url}" target="_blank" rel="noopener">Mehr Infos & Antrag</a>
      ${source === 'ai' ? '<span class="block mt-2 text-xs text-green-600">(KI-Empfehlung)</span>' : ''}
    `;
    resultsEl.appendChild(card);
  });
}

function setLoading(isLoading) {
  if (isLoading) {
    resultsEl.innerHTML = '<div class="flex items-center gap-2 text-blue-700"><svg class="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path></svg>Lade KI-Ergebnisse…</div>';
  }
}

function applyFilters(list) {
  const region = regionFilterEl.value;
  const category = categoryFilterEl.value;
  const selectedEligible = eligibleDropdownPanel ?
    Array.from(eligibleDropdownPanel.querySelectorAll('input:checked')).map(cb => cb.value) :
    [];
  const selectedFundingTypes = fundingTypeDropdownPanel ?
    Array.from(fundingTypeDropdownPanel.querySelectorAll('input:checked')).map(cb => cb.value) :
    [];
  const selectedCompanySizes = companySizeDropdownPanel ?
    Array.from(companySizeDropdownPanel.querySelectorAll('input:checked')).map(cb => cb.value) :
    [];

  return list.filter(p => {
    const matchesRegion = !region || (p.region ? p.region.includes(region) : new RegExp(region, 'i').test(p.title + p.description));
    const matchesCategory = !category || (p.category ? p.category.includes(category) : new RegExp(category, 'i').test(p.title + p.description));
    const matchesEligible = selectedEligible.length === 0 || (p.zielgruppe && selectedEligible.some(eligible => p.zielgruppe.includes(eligible)));
    const matchesFundingType = selectedFundingTypes.length === 0 || (p.foerderart && selectedFundingTypes.some(type => p.foerderart.includes(type)));
    
    // Simple text search for company size in 'zielgruppe' as a fallback
    const kmuMapping = {
        'Kleines Unternehmen': 'KMU',
        'Mittleres Unternehmen': 'KMU',
        'Kleinstunternehmen': 'KMU',
    };
    const matchesCompanySize = selectedCompanySizes.length === 0 || (p.zielgruppe && selectedCompanySizes.some(size => {
        const mapping = kmuMapping[size];
        if (mapping && p.zielgruppe.includes(mapping)) return true;
        return p.zielgruppe.includes(size);
    }));

    return matchesRegion && matchesCategory && matchesEligible && matchesFundingType && matchesCompanySize;
  });
}

async function search() {
  const q = queryInput.value.trim();
  // apply filters to dataset before any search
  const filteredList = applyFilters(programmes);
  if (!q && filteredList.length===0) {
    resultsEl.innerHTML = '<p class="text-gray-600">Bitte Suchbegriff oder Filter wählen.</p>';
    return;
  }
  setLoading(true);
  try {
    // Use filtered list for KI prompt and fuse search fallback
    const listForPrompt = filteredList.length ? filteredList : programmes;
    const prompt = `${docContext ? 'Firmenbeschreibung:\n' + docContext + '\n\n' : ''}Der Nutzer beschreibt sein Anliegen...`;
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: 'Du bist ein Förderprogramm-Experte.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.2
      })
    });
    const data = await res.json();
    let content = data.choices?.[0]?.message?.content || '';
    content = content.replace(/```json|```/g, '').trim();
    let arr = null;
    try {
      arr = extractJSONArray(content);
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
      renderResults(arr, 'ai');
    } catch (e) {
      addMessage('<span class="text-red-600">KI-Antwort konnte nicht interpretiert werden.<br><br><b>Rohantwort:</b><br>' + content.replace(/</g, '&lt;'), 'ai');
    }
  } catch (err) {
    resultsEl.innerHTML = `<p class="text-orange-600">KI nicht verfügbar (${err.message}). Zeige lokale Ergebnisse:</p>`;
    const searchBase = filteredList.length ? filteredList : programmes;
    const matches = q ? fuse.search(q).map(r=>r.item) : searchBase;
    const limited = matches.slice(0,10);
    renderResults(limited, 'local');
  }
} 

// Funktion, die bei Filteränderung aufgerufen wird
function handleFilterChange() {
  if (lastUserQueryForFilter) {
    // Optional: eine Nachricht hinzufügen, dass eine neue Suche aufgrund von Filteränderung gestartet wird.
    // addMessage('Filtereinstellungen geändert. Führe die letzte Anfrage erneut aus...', 'ai');
    askOpenAIChat(lastUserQueryForFilter);
  }
} 

// EVENT DELEGATION for heart-icon clicks
if (typeof window !== 'undefined') {
  window.addEventListener('click', function(e) {
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
function createChat(title = 'New chat') {
  const chats = getChats();
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
  chat.messages.forEach(m => addMessage(m.content, m.sender));
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
  const chats = getChats();
  // Jedes <li> bekommt nun ebenfalls die ID, damit Klicks auf den Rand (nicht direkt auf den Link) erkannt werden
  listEl.innerHTML = chats.map(c => `
    <li data-chat-id="${c.id}" class="${c.id === currentChatId ? 'active' : ''}">
      <a href="#" class="chat-item ${c.id === currentChatId ? 'active' : ''}" data-chat-id="${c.id}">${c.title || 'Untitled'}</a>
    </li>`).join('');
}
// delegate click on chat items
if (typeof window !== 'undefined') {
  // Gemeinsame Handler-Funktion, um Element mit data-chat-id zu ermitteln
  const getChatElement = (evt) => evt.target.closest('[data-chat-id]');

  // Einzel-Klick: Chat laden
  window.addEventListener('click', e => {
    const elem = getChatElement(e);
    if (elem) {
      e.preventDefault();
      // Load chat but keep list intact to allow potential double-click rename
      loadChat(elem.getAttribute('data-chat-id'), true);
      return;
    }
    if (e.target.id === 'newChatBtn') {
      currentChatId = createChat('New chat');
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
addMessage = function(content, sender = 'user') {
  origAddMessage(content, sender);
  addMessageToCurrentChat(content, sender);
};

// render chat list on load
document.addEventListener('DOMContentLoaded', () => {
  renderChatList();
}); 

function renameChat(id, title) {
  const chats = getChats();
  const chat = chats.find(c => c.id === id);
  if (!chat) return;
  chat.title = title;
  saveChats(chats);
  renderChatList();
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
  const timeout = setTimeout(() => controller.abort(), 5000); // 5-Sek-Timeout

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

    // --- zusätzliche Qualitätsprüfung (entschärft, um weniger falsch-positive Ergebnisse zu haben) ---
    const snippet = html.slice(0, 2000).toLowerCase(); 
    const badPatterns = [
      '404 not found',
      'seite nicht gefunden',
      'page not found',
      'kann die seite nicht öffnen',
      'nicht erreichbar',
      'seite wurde nicht gefunden',
      'the requested url was not found on this server',
      'not found on this server'
    ];
    const hasBadPattern = badPatterns.some(p => snippet.includes(p));

    if (hasBadPattern) {
      console.warn(`[checkUrlReachable] URL abgelehnt (Pattern gefunden: "${badPatterns.find(p => snippet.includes(p))}"): ${url}`);
      return false;
    }

    // Mindest-Länge stark reduziert (von 4000 auf 500), um valide, aber kurze Seiten nicht fälschlicherweise auszufiltern.
    const minLengthOk = html.length > 500; 

    if (!minLengthOk) {
        console.warn(`[checkUrlReachable] URL abgelehnt (zu kurzer Inhalt: ${html.length} bytes): ${url}`);
        return false;
    }
    
    return true; // Gilt als erreichbar

  } catch (err) {
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