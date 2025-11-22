// Edge Function stub para subir vídeos a YouTube
// Por ahora solo simula la subida y devuelve datos fake

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400', // 24 horas
};

// @ts-ignore - Deno está disponible en el entorno de Supabase Edge Functions
Deno.serve(async (req) => {
  // Manejar CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 200,
      headers: corsHeaders 
    });
  }

  try {
    // Solo permitir POST
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ success: false, message: 'Method not allowed. Use POST.' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Leer formData (multipart/form-data)
    const formData = await req.formData();
    
    // Obtener el archivo
    const file = formData.get('file') as File | null;

    if (!file) {
      return new Response(
        JSON.stringify({ success: false, message: 'No file provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Obtener meta (opcional)
    const metaString = formData.get('meta') as string | null;
    let meta = null;
    
    if (metaString) {
      try {
        meta = JSON.parse(metaString);
      } catch (e) {
        console.warn('[upload-youtube] Error parsing meta JSON:', e);
        // Continuar aunque meta no sea JSON válido
      }
    }

    // Log de información del archivo (solo para debug)
    console.log('[upload-youtube] File received:', {
      name: file.name,
      size: file.size,
      type: file.type,
      meta: meta,
    });

    // Generar un ID fake para el vídeo
    const fakeVideoId = `debug_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    // Respuesta simulada
    const response = {
      success: true,
      fakeVideoId,
      fakeUrl: `https://youtube.com/watch?v=${fakeVideoId}`,
      originalFilename: file.name,
      size: file.size,
      type: file.type,
      meta: meta || undefined,
    };

    return new Response(
      JSON.stringify(response),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (e) {
    console.error('[upload-youtube] Error:', e);
    return new Response(
      JSON.stringify({
        success: false,
        message: 'Internal error',
        details: e.message || String(e),
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

