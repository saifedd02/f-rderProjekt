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

    const url = new URL(request.url);

    // TTS Endpoint
    if (url.pathname === '/tts') {
      try {
        const body = await request.json();
        const ttsResponse = await fetch('https://api.openai.com/v1/audio/speech', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${env.OPENAI_API_KEY}`
          },
          body: JSON.stringify({
            model: body.model || 'tts-1',
            voice: body.voice || 'nova',
            input: body.input || '',
            speed: body.speed || 1.0,
            response_format: body.response_format || 'mp3'
          })
        });

        if (!ttsResponse.ok) {
          const err = await ttsResponse.text();
          return new Response(err, { status: ttsResponse.status, headers: corsHeaders });
        }

        const audioBuffer = await ttsResponse.arrayBuffer();
        return new Response(audioBuffer, {
          status: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'audio/mpeg',
          }
        });
      } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    try {
      // Request body lesen
      const body = await request.json();

      // Check if this is a search request
      if (body.type === 'search') {
        const query = body.query;
        const apiKey = env.GOOGLE_API_KEY;
        const cx = env.GOOGLE_CX;

        if (!apiKey || !cx) {
          return new Response(JSON.stringify({
            error: 'Search API not configured. Please add GOOGLE_API_KEY and GOOGLE_CX to Cloudflare environment variables.'
          }), {
            status: 503,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        const searchUrl = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${cx}&q=${encodeURIComponent(query)}`;
        const searchResponse = await fetch(searchUrl);
        const searchData = await searchResponse.json();

        return new Response(JSON.stringify(searchData), {
          status: searchResponse.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Default: OpenAI API call
      const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${env.OPENAI_API_KEY}`
        },
        body: JSON.stringify(body)
      });

      const data = await openaiResponse.json();

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