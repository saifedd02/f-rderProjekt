# 🚀 Sichere Veröffentlichung auf GitHub mit Cloudflare Workers

Diese Anleitung zeigt dir, wie du deinen OpenAI API-Schlüssel sicher hältst, während dein Projekt öffentlich auf GitHub verfügbar ist.

## Warum Cloudflare Workers?

- ✅ **100% Kostenlos** (100.000 Anfragen pro Tag gratis)
- ✅ **Sehr einfach** einzurichten (5 Minuten)
- ✅ **Sicher** - Dein API-Schlüssel bleibt geheim
- ✅ **Schnell** - Globales CDN von Cloudflare

## Schritt-für-Schritt Anleitung

### 1. Cloudflare Account erstellen (kostenlos)

1. Gehe zu https://workers.cloudflare.com
2. Klicke auf "Sign up" und erstelle einen kostenlosen Account
3. Bestätige deine E-Mail-Adresse

### 2. Worker erstellen

1. Im Dashboard, klicke auf "Create a Service"
2. Gib deinem Worker einen Namen, z.B. `openai-proxy`
3. Wähle "HTTP handler" als Starter
4. Klicke auf "Create service"

### 3. Worker Code einfügen

1. Klicke auf "Quick edit"
2. Lösche den vorhandenen Code
3. Kopiere den kompletten Code aus `cloudflare-worker.js` und füge ihn ein
4. Klicke auf "Save and deploy"

### 4. API-Schlüssel hinzufügen

1. Gehe zurück zu deinem Worker Dashboard
2. Klicke auf "Settings" → "Variables"
3. Klicke auf "Add variable"
4. Name: `OPENAI_API_KEY`
5. Value: Dein OpenAI API-Schlüssel (sk-...)
6. Klicke auf "Encrypt" (wichtig!)
7. Klicke auf "Save and deploy"

### 5. Worker URL kopieren

1. In deinem Worker Dashboard findest du die URL, z.B.:
   `https://openai-proxy.dein-username.workers.dev`
2. Kopiere diese URL

### 6. Projekt konfigurieren

1. Öffne `script.js`
2. Finde diese Zeile:
   ```javascript
   const PROXY_URL = 'FÜGE_DEINE_CLOUDFLARE_WORKER_URL_HIER_EIN';
   ```
3. Ersetze sie mit deiner Worker URL:
   ```javascript
   const PROXY_URL = 'https://openai-proxy.dein-username.workers.dev';
   ```

### 7. Auf GitHub veröffentlichen

Jetzt kannst du dein Projekt sicher auf GitHub veröffentlichen:

```bash
git add .
git commit -m "Sichere API-Integration mit Cloudflare Workers"
git push origin main
```

## 🎉 Fertig!

Dein Projekt ist jetzt öffentlich auf GitHub, aber dein API-Schlüssel bleibt sicher!

## Zusätzliche Sicherheit (Optional)

### Zugriff beschränken

Du kannst den Zugriff auf deinen Worker beschränken:

1. Im Worker Code, füge nach Zeile 7 ein:
   ```javascript
   // Nur Zugriffe von deiner Domain erlauben
   const allowedOrigins = [
     'https://deine-domain.com',
     'http://localhost:3000' // für lokale Entwicklung
   ];
   
   const origin = request.headers.get('Origin');
   if (!allowedOrigins.includes(origin)) {
     return new Response('Forbidden', { status: 403 });
   }
   ```

### Rate Limiting

Cloudflare bietet automatisches Rate Limiting. Für erweiterten Schutz:

1. Gehe zu "Workers" → "Your Worker" → "Triggers"
2. Aktiviere "Rate Limiting"
3. Setze z.B. 100 Anfragen pro Minute

## Troubleshooting

**Problem: "KI nicht verfügbar"**
- Prüfe, ob deine Worker URL korrekt in `script.js` eingetragen ist
- Prüfe, ob dein API-Schlüssel in den Worker-Variablen gespeichert ist
- Teste die Worker URL direkt im Browser (sollte "Method not allowed" zeigen)

**Problem: "CORS-Fehler"**
- Der Worker enthält bereits CORS-Header
- Prüfe, ob du die neueste Version von `cloudflare-worker.js` verwendest

## Alternative: Vercel (auch kostenlos)

Falls du lieber Vercel verwenden möchtest:

1. Erstelle eine Datei `api/openai-proxy.js`:
```javascript
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify(req.body)
    });

    const data = await response.json();
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
```

2. Deploy zu Vercel und setze die Umgebungsvariable `OPENAI_API_KEY`
3. Verwende die Vercel URL in deinem Code

## Fragen?

Erstelle ein Issue auf GitHub, wenn du Hilfe brauchst! 