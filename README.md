# 🤖 KI-Förderprogramm-Finder

Ein intelligenter Chatbot, der passende Förderprogramme für dein Unternehmen findet - powered by OpenAI GPT-4.

## 🌟 Features

- 💬 **KI-Chat**: Beschreibe dein Vorhaben und erhalte maßgeschneiderte Förderempfehlungen
- 🔍 **Intelligente Suche**: Findet die besten Programme aus über 100 Fördermöglichkeiten
- 🏷️ **Smart Filter**: Nach Region, Kategorie, Förderart und Unternehmensgröße
- 📄 **PDF-Upload**: Lade Firmenbeschreibungen hoch für präzisere Empfehlungen
- 🎤 **Sprachein gabe**: Stelle Fragen per Mikrofon
- ❤️ **Favoriten**: Speichere interessante Programme für später
- 🌓 **Dark Mode**: Augenschonend arbeiten

## 🚀 Schnellstart

### Option 1: Lokal mit eigenem API-Key

1. Clone das Repository:
   ```bash
   git clone https://github.com/dein-username/foerderprogramm-ki.git
   cd foerderprogramm-ki
   ```

2. Öffne `script.js` und füge deinen OpenAI API-Key ein:
   ```javascript
   const OPENAI_API_KEY = 'dein-api-key-hier';
   const PROXY_URL = ''; // Leer lassen für direkte Nutzung
   ```

3. Öffne `index.html` in deinem Browser

### Option 2: Mit Cloudflare Workers (Empfohlen für GitHub)

Folge der [SETUP-ANLEITUNG.md](SETUP-ANLEITUNG.md) für eine sichere Veröffentlichung auf GitHub.

### Option 3: GitHub Pages Demo

1. Forke dieses Repository
2. Aktiviere GitHub Pages in den Settings
3. Richte Cloudflare Workers ein (siehe Anleitung)
4. Besuche `https://dein-username.github.io/foerderprogramm-ki`

## 📖 Verwendung

1. **Chat starten**: Beschreibe dein Projekt oder stelle eine Frage
   - "Ich möchte meine Produktion digitalisieren"
   - "Welche Förderungen gibt es für KI-Projekte?"
   - "Wir sind ein Handwerksbetrieb und wollen klimaneutral werden"

2. **Filter nutzen**: Grenze die Ergebnisse ein
   - Region: Bundesweit, NRW, Bayern, etc.
   - Kategorie: Digitalisierung, Innovation, Umwelt, etc.
   - Förderart: Zuschuss, Kredit, Beratung
   - Unternehmensgröße: KMU, Startup, Großunternehmen

3. **Dokumente hochladen**: Für bessere Ergebnisse
   - Firmenprofil als PDF
   - Projektbeschreibung
   - Businessplan

## 🛠️ Technologie

- **Frontend**: Vanilla JavaScript, Tailwind CSS
- **KI**: OpenAI GPT-4 API
- **Suche**: Fuse.js für Fuzzy-Search
- **Hosting**: GitHub Pages / Cloudflare Workers

## 🔒 Sicherheit

- API-Schlüssel werden niemals im Code gespeichert
- Cloudflare Workers als sicherer Proxy
- Keine Nutzerdaten werden gespeichert
- Alles läuft im Browser (außer API-Calls)

## 🤝 Beitragen

Contributions sind willkommen! 

1. Fork das Projekt
2. Erstelle einen Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Committe deine Änderungen (`git commit -m 'Add some AmazingFeature'`)
4. Push zum Branch (`git push origin feature/AmazingFeature`)
5. Öffne einen Pull Request

## 📝 Lizenz

Dieses Projekt ist unter der MIT-Lizenz lizenziert - siehe [LICENSE](LICENSE) für Details.

## 🙏 Danksagung

- OpenAI für die großartige GPT-4 API
- Cloudflare für den kostenlosen Workers Service
- Alle Contributor und Tester

## 📞 Support

Bei Fragen oder Problemen:
- Erstelle ein [Issue](https://github.com/dein-username/foerderprogramm-ki/issues)
- Schreibe eine E-Mail an: support@example.com

---

Made with ❤️ für den deutschen Mittelstand 