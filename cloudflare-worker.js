// Cloudflare Worker - Kostenloser OpenAI Proxy
// Dieser Code läuft auf Cloudflare's Servern und hält deinen API-Schlüssel sicher

export default {
  async fetch(request, env) {
    // CORS headers für Browser-Zugriff
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // Nur POST requests erlauben
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { 
        status: 405,
        headers: corsHeaders 
      });
    }

    try {
      // Request body lesen
      const body = await request.json();

      // OpenAI API aufrufen
      const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // WICHTIG: Hier kommt dein API-Schlüssel hin (wird in Cloudflare Environment Variables gespeichert)
          'Authorization': `Bearer ${env.OPENAI_API_KEY}`
        },
        body: JSON.stringify(body)
      });

      const data = await openaiResponse.json();

      // Response mit CORS headers zurückgeben
      return new Response(JSON.stringify(data), {
        status: openaiResponse.status,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        }
      });

    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        }
      });
    }
  }
}; 