const FAVORITES_KEY = 'mpoolFoerderFavoriten';
const FAVORITES_DATA_KEY = 'mpoolFoerderFavoritenData';

// IMPORTANT: This `programmes` array needs to be kept in sync with the one in script.js
// or loaded from a shared JSON file if this were a larger application.
// For this backend-less example, we'll redefine it here.
// Ensure customId values are consistent with how they are generated in script.js.
const programmes = [
  {
    customId: 'prog_0',
    title: 'Digital Jetzt – Investitionsförderung für KMU',
    description: 'Förderung für Digitalisierungsvorhaben im Mittelstand.',
    url: 'https://www.bmwk.de/Redaktion/DE/Dossier/digital-jetzt.html?utm_source=chatgpt.com',
    foerderhoehe: 'bis zu 50%',
    zielgruppe: 'KMU, Handwerk',
    antragsfrist: 'laufend',
    foerderart: 'Zuschuss',
    ansprechpartner: 'BMWK',
    region: 'Bundesweit',
    category: 'Digitalisierung',
    applicant_type: 'KMU'
  },
  {
    customId: 'prog_1',
    title: 'Zentrales Innovationsprogramm Mittelstand (ZIM)',
    description: 'Förderung von Forschungs- und Entwicklungsprojekten im Mittelstand.',
    url: 'https://www.zim.de/?utm_source=chatgpt.com',
    foerderhoehe: 'bis zu 60%',
    zielgruppe: 'KMU',
    antragsfrist: 'laufend',
    foerderart: 'Zuschuss',
    ansprechpartner: 'BMWK',
    region: 'Bundesweit',
    category: 'Innovation',
    applicant_type: 'KMU'
  },
  {
    customId: 'prog_2',
    title: 'go-digital',
    description: 'Beratung und Umsetzung für die Digitalisierung von Geschäftsprozessen.',
    url: 'https://www.innovation-beratung-foerderung.de/INNO/Navigation/DE/go-digital/go-digital.html?utm_source=chatgpt.com',
    foerderhoehe: 'bis zu 50%',
    zielgruppe: 'KMU, Handwerk',
    antragsfrist: 'laufend',
    foerderart: 'Zuschuss',
    ansprechpartner: 'BMWK',
    region: 'Bundesweit',
    category: 'Digitalisierung',
    applicant_type: 'KMU'
  },
  {
    customId: 'prog_3',
    title: 'ZIM – Zentrales Innovationsprogramm Mittelstand (englisch)',
    description: 'Funding for innovative SMEs in Germany (English).',
    url: 'https://www.eura-ag.com/en/funding-programmes/zentrales-innovationsprogramm-mittelstand-zim?utm_source=chatgpt.com',
    applicant_type: 'KMU'
  },
  {
    customId: 'prog_4',
    title: 'KI für KMU',
    description: 'Förderprogramme für Künstliche Intelligenz in kleinen und mittleren Unternehmen.',
    url: 'https://www.softwaresysteme.dlr-pt.de/de/ki-fuer-kmu.php?utm_source=chatgpt.com',
    foerderhoehe: 'individuell',
    zielgruppe: 'KMU',
    antragsfrist: 'laufend',
    foerderart: 'Zuschuss',
    ansprechpartner: 'DLR Projektträger',
    region: 'Bundesweit',
    category: 'KI',
    applicant_type: 'KMU'
  },
  {
    customId: 'prog_5',
    title: 'Technologieprogramme Künstliche Intelligenz',
    description: 'Aktuelle Technologieprogramme im Bereich KI.',
    url: 'https://www.digitale-technologien.de/DT/Navigation/DE/ProgrammeProjekte/AktuelleTechnologieprogramme/Kuenstliche_Intelligenz/ki.html?utm_source=chatgpt.com',
    applicant_type: 'Projektträger'
  },
  {
    customId: 'prog_6',
    title: 'Mittelstand-Digital',
    description: 'Zentren des Netzwerks Mittelstand-Digital unterstützen KMU und Handwerk bei der Digitalisierung.',
    url: 'https://www.mittelstand-digital.de/MD/Redaktion/DE/Artikel/Themenbuehne/neuausrichtung-mittelstand-digital.html?utm_source=chatgpt.com',
    applicant_type: 'KMU'
  },
  {
    customId: 'prog_7',
    title: 'Forschungszulage',
    description: 'Steuerliche Förderung von Forschung und Entwicklung.',
    url: 'https://www.bundesfinanzministerium.de/Web/DE/Themen/Steuern/Steuerliche_Themengebiete/Forschungszulage/forschungszulage.html?utm_source=chatgpt.com',
    foerderhoehe: '25% der förderfähigen Aufwendungen',
    zielgruppe: 'Unternehmen aller Größen',
    antragsfrist: 'laufend',
    foerderart: 'Steuerliche Förderung',
    ansprechpartner: 'Finanzamt',
    region: 'Bundesweit',
    category: 'Innovation',
    applicant_type: 'KMU'
  },
  {
    customId: 'prog_8',
    title: 'Bescheinigung Forschungszulage',
    description: 'Antragsportal für die Bescheinigung der Forschungszulage.',
    url: 'https://www.bescheinigung-forschungszulage.de/?utm_source=chatgpt.com',
    applicant_type: 'KMU'

  },
  {
    customId: 'prog_9',
    title: 'Effiziente Gebäude (BAFA)',
    description: 'Förderung für effiziente Gebäude und energetische Sanierung.',
    url: 'https://www.bafa.de/DE/Energie/Effiziente_Gebaeude/effiziente_gebaeude_node.html?utm_source=chatgpt.com',
    applicant_type: 'KMU'
  },
  {
    customId: 'prog_10',
    title: 'Bundesförderung für effiziente Gebäude (KfW)',
    description: 'KfW-Förderung für energieeffiziente Gebäude.',
    url: 'https://www.kfw.de/inlandsfoerderung/Bundesf%C3%B6rderung-f%C3%BCr-effiziente-Geb%C3%A4ude/?utm_source=chatgpt.com',
    applicant_type: 'KMU'
  },
  {
    customId: 'prog_11',
    title: 'Förderung von KI-Ökosystemen',
    description: 'Förderung von KI-Ökosystemen in Deutschland.',
    url: 'https://www.bmwk.de/Redaktion/DE/Infografiken/Technologie/foerderung-von-ki-oekosystemen.html?utm_source=chatgpt.com',
    applicant_type: 'KMU'
  },
  {
    customId: 'prog_12',
    title: 'Mittelstand Innovativ & Digital NRW',
    description: 'Förderung für Digitalisierung und Innovation in NRW.',
    url: 'https://www.mittelstand-innovativ-digital.nrw/?utm_source=chatgpt.com',
    applicant_type: 'KMU'
  },
  {
    customId: 'prog_13',
    title: 'Mittelstand Innovation & Digital GUT NRW',
    description: 'Förderung für Digitalisierung und Innovation in NRW (GUT).',
    url: 'https://www.foerderdatenbank.de/FDB/Content/DE/Foerderprogramm/Land/NRW/mittelstand-innovation-digital-gut-nrw.html?utm_source=chatgpt.com',
    applicant_type: 'KMU'
  },
  {
    customId: 'prog_14',
    title: 'progres.nrw – Programmbereich Klimaschutztechnik',
    description: 'Förderung für Klimaschutztechnik in NRW.',
    url: 'https://www.foerderdatenbank.de/FDB/Content/DE/Foerderprogramm/Land/NRW/progres-nrw-programmbereich-klimaschutztechnik.html?utm_source=chatgpt.com',
    foerderhoehe: 'bis zu 60%',
    zielgruppe: 'Unternehmen, Kommunen',
    antragsfrist: 'laufend',
    foerderart: 'Zuschuss',
    ansprechpartner: 'NRW.BANK',
    region: 'Nordrhein-Westfalen',
    category: 'Umwelt',
    applicant_type: 'Projektträger'
  },
  {
    customId: 'prog_15',
    title: 'progres.nrw – Wärme- und Kältenetzsysteme',
    description: 'Förderung für Wärme- und Kältenetzsysteme in NRW.',
    url: 'https://www.nrwbank.de/de/foerderung/foerderprodukte/15734/progresnrw---programmbereich-waerme--und-kaeltenetzsysteme.html?utm_source=chatgpt.com',
    applicant_type: 'KMU'
  },
  {
    customId: 'prog_16',
    title: 'Innovationsgutscheine Baden-Württemberg',
    description: 'Innovationsgutscheine für Unternehmen in Baden-Württemberg.',
    url: 'https://wm.baden-wuerttemberg.de/de/innovation/innovationsgutscheine?utm_source=chatgpt.com',
    applicant_type: 'KMU'
  },
  {
    customId: 'prog_17',
    title: 'Innovationsgutschein L-Bank',
    description: 'Innovationsgutscheine der L-Bank Baden-Württemberg.',
    url: 'https://www.l-bank.de/produkte/finanzhilfen/innovationsgutschein.html?utm_source=chatgpt.com',
    applicant_type: 'KMU'
  },
  {
    customId: 'prog_18',
    title: 'Innovationsgutschein Bayern',
    description: 'Innovationsgutscheine für Unternehmen in Bayern.',
    url: 'https://www.bayern-innovativ.de/leistungen/projekttraeger/projekttraeger-bayern/innovationsgutschein-bayern/?utm_source=chatgpt.com',
    foerderhoehe: 'bis zu 80%',
    zielgruppe: 'KMU, Handwerk',
    antragsfrist: 'laufend',
    foerderart: 'Zuschuss',
    ansprechpartner: 'Bayern Innovativ',
    region: 'Bayern',
    category: 'Innovation',
    applicant_type: 'KMU'
  },
  {
    customId: 'prog_19',
    title: 'Innovationsgutscheine Bayern (StMWi)',
    description: 'Innovationsgutscheine des Bayerischen Wirtschaftsministeriums.',
    url: 'https://www.stmwi.bayern.de/foerderungen/innovationsgutscheine/?utm_source=chatgpt.com',
    applicant_type: 'KMU'
  },
  {
    customId: 'prog_20',
    title: 'Pro FIT Projektfinanzierung (IBB)',
    description: 'Förderung für innovative Projekte in Berlin.',
    url: 'https://www.ibb.de/de/foerderprogramme/pro-fit-projektfinanzierung.html?utm_source=chatgpt.com',
    applicant_type: 'KMU'
  },
  {
    customId: 'prog_21',
    title: 'Pro FIT Frühphasenfinanzierung (IBB)',
    description: 'Frühphasenfinanzierung für innovative Unternehmen in Berlin.',
    url: 'https://www.ibb.de/de/foerderprogramme/pro-fit-fruehphasenfinanzierung.html?utm_source=chatgpt.com',
    applicant_type: 'KMU'
  },
  {
    customId: 'prog_22',
    title: 'Solarförderung NRW',
    description: 'Förderung für Solaranlagen in Nordrhein-Westfalen.',
    url: 'https://www.solarplatz.de/foerderung/nordrhein-westfalen?utm_source=chatgpt.com',
    applicant_type: 'KMU'
  },
  {
    customId: 'prog_23',
    title: 'EIC Accelerator (EU)',
    description: 'EU-Förderung für innovative KMU und Startups.',
    url: 'https://eic.ec.europa.eu/eic-funding-opportunities/eic-accelerator_en?utm_source=chatgpt.com',
    foerderhoehe: 'bis zu 2,5 Mio. €',
    zielgruppe: 'KMU, Start-ups',
    antragsfrist: 'mehrmals jährlich',
    foerderart: 'Zuschuss, Beteiligung',
    ansprechpartner: 'EU-Kommission',
    region: 'EU-weit',
    category: 'Innovation',
    applicant_type: 'Projektträger'
  },
  {
    customId: 'prog_24',
    title: 'KMU-innovativ: IKT / KI',
    description: 'Förderung risikoreicher KI-F&E-Projekte für kleine und mittlere Unternehmen.',
    url: 'https://www.kmu-innovativ.de/foerderlinie/ikt?utm_source=chatgpt.com',
    applicant_type: 'KMU'
  },
  {
    customId: 'prog_25',
    title: 'KI-Innovationswettbewerb',
    description: 'Wettbewerblicher Aufruf zur Entwicklung innovativer KI-Plattformen und -Ökosysteme.',
    url: 'https://www.digitale-technologien.de/DT/Navigation/DE/ProgrammeProjekte/AktuelleTechnologieprogramme/Kuenstliche_Intelligenz/ki_innovationswettbewerb.html?utm_source=chatgpt.com',
    applicant_type: 'KMU' 
  },
  {
    customId: 'prog_26',
    title: 'Mittelstand-Digital Zentren',
    description: 'Kostenfreie Schulungen und KI-Trainer für Digitalisierungsvorhaben im Mittelstand.',
    url: 'https://www.mittelstand-digital.de/MD/Redaktion/DE/Artikel/Themenbuehne/neuausrichtung-mittelstand-digital.html?utm_source=chatgpt.com',
    applicant_type: 'KMU'
  },
  {
    customId: 'prog_27',
    title: 'EXIST-Gründungsstipendium',
    description: '12 Monate Lebenshaltungs- und Sachkostenförderung für technologieorientierte Gründungsteams.',
    url: 'https://www.exist.de/EXIST/Navigation/DE/Programm/Exist-Gruendungsstipendium/exist-gruendungsstipendium.html?utm_source=chatgpt.com',
    foerderhoehe: 'bis zu 3.000 €/Monat',
    zielgruppe: 'Gründungsteams, Hochschulabsolventen',
    antragsfrist: 'laufend',
    foerderart: 'Stipendium',
    ansprechpartner: 'BMWK',
    region: 'Bundesweit',
    category: 'Start-up',
    applicant_type: 'KMU'
  },
  {
    customId: 'prog_28',
    title: 'Bundesförderung Effiziente Gebäude (BEG)',
    description: 'Zuschüsse und Kredite für energieeffiziente Sanierungen und Neubauten.',
    url: 'https://www.kfw.de/inlandsfoerderung/Bundesf%C3%B6rderung-f%C3%BCr-effiziente-Geb%C3%A4ude/?utm_source=chatgpt.com',
    foerderhoehe: 'bis zu 45%',
    zielgruppe: 'Unternehmen, Privatpersonen',
    antragsfrist: 'laufend',
    foerderart: 'Zuschuss, Kredit',
    ansprechpartner: 'KfW, BAFA',
    region: 'Bundesweit',
    category: 'Energie',
    applicant_type: 'KMU'
  },
  {
    customId: 'prog_29',
    title: 'MID‑Digitale Sicherheit NRW',
    description: 'Fördermodul für Cyber‑Security‑Projekte in kleinen und mittleren Unternehmen in NRW.',
    url: 'https://www.mittelstand-innovativ-digital.nrw/foerderlinien/mid-digitale-sicherheit?utm_source=chatgpt.com',
    applicant_type: 'KMU'
  },
  {
    customId: 'prog_30',
    title: 'Progress Solar Invest NRW',
    description: 'Zuschüsse für Photovoltaik-Anlagen und Speicherlösungen in Nordrhein‑Westfalen.',
    url: 'https://www.progress.nrw/solar?utm_source=chatgpt.com',
    applicant_type: 'KMU'
  },
  {
    customId: 'prog_31',
    title: 'EEN‑Hessen Innovationsberatung',
    description: 'Kostenfreier EU‑Förderscouting‑ und Innovationsservice für hessische KMU.',
    url: 'https://www.een-hessen.de/?utm_source=chatgpt.com',
    applicant_type: 'KMU'
  },
  {
    customId: 'prog_32',
    title: 'Innovationsgutschein Handwerk Bayern',
    description: 'Gutschein für Kleinstunternehmen und Handwerksbetriebe zur Finanzierung externer F&E-Leistungen.',
    url: 'https://www.stmwi.bayern.de/foerderungen/innovationsgutscheine/?utm_source=chatgpt.com',
    applicant_type: 'KMU'
  },
  {
    customId: 'prog_33',
    title: 'progres.nrw – Batteriespeicher',
    description: '100 €/kWh Zuschuss für Stromspeicher im unternehmerischen Umfeld in NRW.',
    url: 'https://www.nrwbank.de/de/foerderung/foerderprodukte/15734?utm_source=chatgpt.com',
    applicant_type: 'KMU'
  },
  {
    customId: 'prog_34',
    title: 'SME Instrument (Horizon Europe)',
    description: 'EU‑Finanzierung zur Skalierung hochinnovativer KMU (Nachfolger Phase 2).',
    url: 'https://eic.ec.europa.eu/eic-funding-opportunities/eic-accelerator_en?utm_source=chatgpt.com',
    applicant_type: 'KMU'
  },
  {
    customId: 'prog_35',
    title: 'Horizon Europe Cluster 4 – Digital, Industry & Space',
    description: 'Förderlinien für KI, Robotik und Datenökosysteme im EU-Rahmenprogramm.',
    url: 'https://ec.europa.eu/info/funding-tenders/opportunities/portal/screen/home?utm_source=chatgpt.com',
    applicant_type: 'KMU' 
  },
  {
    customId: 'prog_36',
    title: 'AI Innovation Fund (EU‑Pilot)',
    description: 'Pilotförderung zur Entwicklung vertrauenswürdiger KI-Lösungen in Europa.',
    url: 'https://digital-strategy.ec.europa.eu/en/funding/ai-innovation?utm_source=chatgpt.com',
    applicant_type: 'KMU'
  },
  {
    customId: 'prog_37',
    title: 'EIT Digital Challenge',
    description: 'Preisgelder und Accelerator‑Support für Scale‑ups aus dem Bereich Digital & KI.',
    url: 'https://www.eitdigital.eu/challenge?utm_source=chatgpt.com',
    applicant_type: 'KMU'
  },
  {
    customId: 'prog_38',
    title: 'Copernicus Masters / ESA‑BIC',
    description: 'Wettbewerb und Inkubation für KI-Anwendungen auf Basis von Erdbeobachtungsdaten.',
    url: 'https://www.copernicus-masters.com/?utm_source=chatgpt.com',
    applicant_type: 'KMU'
  },
  {
    customId: 'prog_39',
    title: 'Umweltinnovationsprogramm (BMUV)',
    description: 'Zuschüsse für erstmalige großtechnische Umwelt- und Klimaschutzinnovationen in Deutschland.',
    url: 'https://www.bmuv.de/themen/wirtschaft-produkte-ressourcen-tourismus/foerderprogramme/umweltinnovationsprogramm?utm_source=chatgpt.com',
    applicant_type: 'KMU'
  },
  {
    customId: 'prog_40',
    title: 'ERP-Digitalisierungs- und Innovationskredit (KfW 380/390)',
    description: 'Zinsgünstige Darlehen für Digitalisierungs- und Innovationsprojekte von KMU.',
    url: 'https://www.kfw.de/inlandsfoerderung/Unternehmen/Erschließen-Innovationen-und-Digitalisierung/ERP-Digitalisierungs-und-Innovationskredit/?utm_source=chatgpt.com',
    applicant_type: 'KMU'
  },
  {
    customId: 'prog_41',
    title: 'INVEST – Zuschuss für Wagniskapital',
    description: 'BAFA-Zuschuss für private Investitionen in junge, innovative Start-ups.',
    url: 'https://www.bafa.de/DE/Wirtschaft_Mittelstand/INVEST/invest_node.html?utm_source=chatgpt.com',
    applicant_type: 'KMU'
  },
  {
    customId: 'prog_42',
    title: 'High-Tech Gründerfonds (HTGF)',
    description: 'Seed-Finanzierung für High-Tech-Startups bis zu 1 Mio. € in der Startphase.',
    url: 'https://www.htgf.de/?utm_source=chatgpt.com',
    applicant_type: 'KMU'
  },
  {
    customId: 'prog_43',
    title: 'LIFE Programme (EU)',
    description: 'EU-Förderung für Umwelt-, Naturschutz- und Klimaprojekte, auch für Unternehmen.',
    url: 'https://cinea.ec.europa.eu/life_en?utm_source=chatgpt.com',
    applicant_type: 'KMU'
  },
  {
    customId: 'prog_44',
    title: 'Innovation Fund (EU)',
    description: 'Finanzierung großskaliger Demonstrationsprojekte für CO₂-arme Technologien.',
    url: 'https://cinea.ec.europa.eu/innovation-fund_en?utm_source=chatgpt.com',
    applicant_type: 'KMU'
  },
  {
    customId: 'prog_45',
    title: 'CEF Digital – Connecting Europe Facility',
    description: 'Förderung für europaweite digitale Infrastruktur und 5G-Korridore.',
    url: 'https://digital-strategy.ec.europa.eu/en/funding/cef-digital?utm_source=chatgpt.com',
    applicant_type: 'KMU'
  },
  {
    customId: 'prog_46',
    title: 'Klimaschutzoffensive für den Mittelstand (KfW 292)',
    description: 'Kreditprogramm für Investitionen in Energieeffizienz und erneuerbare Energien.',
    url: 'https://www.kfw.de/inlandsfoerderung/Unternehmen/Energie-Umwelt/KfW-Klimaschutzoffensive-für-den-Mittelstand-(292)/?utm_source=chatgpt.com',
    applicant_type: 'KMU'
  },
  {
    customId: 'prog_47',
    title: 'Digitalbonus Bayern',
    description: 'Zuschuss bis zu 50 % für Digitalisierungsmaßnahmen bei KMU in Bayern.',
    url: 'https://www.digitalbonus.bayern/?utm_source=chatgpt.com',
    applicant_type: 'KMU'
  },
  {
    customId: 'prog_48',
    title: 'InnoRampUp Hamburg',
    description: 'Zuschüsse bis 150 k€ für innovative Start-ups in Hamburg.',
    url: 'https://www.ifbhh.de/foerderprogramm/innorampup?utm_source=chatgpt.com',
    applicant_type: 'KMU'
  },
  {
    customId: 'prog_49',
    title: 'GRW Digital Sachsen',
    description: 'Investitionszuschüsse für digitale Produktions- und Geschäftsprozesse im Freistaat Sachsen.',
    url: 'https://www.sab.sachsen.de/wirtschaft/gueltige-programme/grw-digital.jsp?utm_source=chatgpt.com',
    applicant_type: 'KMU'
  },
  {
    customId: 'prog_50',
    title: 'BIG Digital Brandenburg',
    description: 'Brandenburg-Innovation-Gutschein für Digitalisierungsprojekte in KMU.',
    url: 'https://www.ilb.de/de/gruendung-unternehmen/big-digital?utm_source=chatgpt.com',
    applicant_type: 'KMU'
  },
  {
    customId: 'prog_51',
    title: 'Start-up Transfer.NRW',
    description: 'Förderung für Ausgründungen aus Hochschulen und Forschungseinrichtungen in NRW.',
    url: 'https://www.ptj.de/projektfoerderung/start-up-transfer-nrw?utm_source=chatgpt.com',
    applicant_type: 'KMU'
  },
  {
    customId: 'prog_52',
    title: 'PROFI Brandenburg',
    description: '„Programm zur Förderung von Forschung, Innovationen und Technologien" für Brandenburger Unternehmen.',
    url: 'https://www.ilb.de/de/gruendung-unternehmen/profi?utm_source=chatgpt.com',
    applicant_type: 'KMU'
  },
  {
    customId: 'prog_53',
    title: 'Zukunft Bau – Forschungsförderung',
    description: 'BMWSB‑Programm zur Förderung von Forschung im Bauwesen und klimafreundlichen Baustoffen.',
    url: 'https://www.bbsr.bund.de/BBSR/DE/forschung/zukunftbau/zukunftbau_node.html?utm_source=chatgpt.com',
    applicant_type: 'KMU'
  }
];

// Fill applicant_type if missing (consistent with script.js)
programmes.forEach(p => {
  if (!p.applicant_type) {
    p.applicant_type = 'KMU';
  }
});

const resultsEl = document.getElementById('favoritesResults');

function getFavoriteProgramIds() {
  const favorites = localStorage.getItem(FAVORITES_KEY);
  return favorites ? JSON.parse(favorites) : [];
}

function saveFavoriteProgramIds(idsArray) {
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(idsArray));
}

function getFavoritesData() {
  const json = localStorage.getItem(FAVORITES_DATA_KEY);
  return json ? JSON.parse(json) : {};
}

function saveFavoritesData(obj) {
  localStorage.setItem(FAVORITES_DATA_KEY, JSON.stringify(obj));
}

function removeFromFavoritesAndRefresh(programId) {
  let favoriteIds = getFavoriteProgramIds();
  favoriteIds = favoriteIds.filter(id => id !== programId);
  saveFavoriteProgramIds(favoriteIds);
  // also remove stored details if present
  const data = getFavoritesData();
  if (data[programId]) {
    delete data[programId];
    saveFavoritesData(data);
  }
  renderFavoritePrograms(); // Re-render
}

function renderFavoritePrograms() {
  resultsEl.innerHTML = '';
  const favoriteIds = getFavoriteProgramIds();
  if (favoriteIds.length === 0) {
    resultsEl.innerHTML = '<p class="no-favorites col-span-full">Sie haben noch keine Förderprogramme als Favoriten markiert.</p>';
    return;
  }
  const storedData = getFavoritesData();
  const favoriteProgramObjects = favoriteIds.map(id => {
    return programmes.find(p => p.customId === id) || storedData[id];
  }).filter(Boolean);

  if (favoriteProgramObjects.length === 0) {
    resultsEl.innerHTML = '<p class="no-favorites col-span-full">Ihre gespeicherten Favoriten konnten nicht geladen werden.</p>';
    return;
  }

  favoriteProgramObjects.forEach(p => {
    const metaItems = [
      { label: 'Förderhöhe', value: p.foerderhoehe },
      { label: 'Zielgruppe', value: p.zielgruppe },
      { label: 'Region', value: p.region },
      { label: 'Antragsfrist', value: p.antragsfrist },
      { label: 'Förderart', value: p.foerderart },
      { label: 'Ansprechpartner', value: p.ansprechpartner },
      { label: 'Kategorie', value: p.category }
    ].filter(item => !!item.value);

    const eyebrow = p.region || p.category || '';
    const heartSVG = `<path stroke-linecap="round" stroke-linejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />`;

    const card = document.createElement('article');
    card.className = 'programme-card favorite-card';
    card.innerHTML = `
      <div class="favorite-card__header">
        <div>
          ${eyebrow ? `<p class="favorite-card__eyebrow">${eyebrow}</p>` : ''}
          <h3>
            ${p.title}
            ${p.applicant_type === 'Projektträger' ? '<span class="favorite-card__chip">Für Mpool</span>' : ''}
          </h3>
        </div>
        <button type="button" class="heart-icon favorited" data-program-id="${p.customId}" aria-label="Von Favoriten entfernen">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1.5">
            ${heartSVG}
          </svg>
        </button>
      </div>
      ${p.description ? `<p class="favorite-card__description">${p.description}</p>` : ''}
      ${metaItems.length ? `<ul class="favorite-card__list">
        ${metaItems.map(item => `<li><strong>${item.label}:</strong> <span>${item.value}</span></li>`).join('')}
      </ul>` : ''}
      <a class="favorite-card__link" href="${p.url}" target="_blank" rel="noopener">
        Mehr Infos & Antrag
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M5 12h14M13 6l6 6-6 6" />
        </svg>
      </a>
    `;

    const removeBtn = card.querySelector('.heart-icon');
    removeBtn.addEventListener('click', () => removeFromFavoritesAndRefresh(p.customId));
    resultsEl.appendChild(card);
  });
}

document.addEventListener('DOMContentLoaded', renderFavoritePrograms);

window.removeFromFavoritesAndRefresh = removeFromFavoritesAndRefresh; 