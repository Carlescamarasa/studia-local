// Edge Function para subir vídeos a YouTube
// Genera títulos y descripciones estructuradas basadas en metadata

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400', // 24 horas
};

/**
 * Obtiene la fecha actual en formato YYYY-MM-DD (zona horaria Europa/Madrid)
 */
function getCurrentDateString(): string {
  // Usar Intl.DateTimeFormat para obtener fecha en zona horaria de Madrid
  const now = new Date();
  const madridTime = new Intl.DateTimeFormat('es-ES', {
    timeZone: 'Europe/Madrid',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);

  const year = madridTime.find(p => p.type === 'year')?.value || now.getFullYear().toString();
  const month = madridTime.find(p => p.type === 'month')?.value || String(now.getMonth() + 1).padStart(2, '0');
  const day = madridTime.find(p => p.type === 'day')?.value || String(now.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

/**
 * Obtiene fecha y hora actual en formato legible (zona horaria Europa/Madrid)
 */
function getCurrentDateTimeString(): string {
  const now = new Date();
  const madridTime = new Intl.DateTimeFormat('es-ES', {
    timeZone: 'Europe/Madrid',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(now);

  return `${madridTime} (Europa/Madrid)`;
}

/**
 * Convierte el contexto de metadata a texto legible
 */
function getContextoText(contexto: string | null | undefined): string {
  if (!contexto || typeof contexto !== 'string') {
    return 'Vídeo de práctica';
  }

  const contextoLower = contexto.toLowerCase().trim();

  switch (contextoLower) {
    case 'sesion_estudio':
      return 'Sesión de estudio';
    case 'ticket_alumno':
      return 'Consulta del alumno';
    case 'ticket_profesor':
      return 'Respuesta del profesor';
    default:
      return 'Vídeo de práctica';
  }
}

/**
 * Genera el título del vídeo según las especificaciones
 * Formato: [YYYY-MM-DD] Nombre Alumno – Contexto – Comentario corto
 */
function generateVideoTitle(metadata: Record<string, any> | null): string {
  const dateStr = getCurrentDateString();
  const alumnoNombre = metadata?.alumno_nombre || metadata?.alumnoNombre || 'Alumno sin nombre';
  const contexto = getContextoText(metadata?.contexto);
  const comentarios = metadata?.comentarios || metadata?.comentario || '';

  // Construir título
  let title = `[${dateStr}] ${alumnoNombre} – ${contexto}`;

  // Añadir comentario si existe y no está vacío
  if (comentarios && typeof comentarios === 'string' && comentarios.trim().length > 0) {
    // Limitar comentario a 50 caracteres para no hacer el título demasiado largo
    const comentarioCorto = comentarios.trim().substring(0, 50);
    title += ` – ${comentarioCorto}`;
  }

  return title;
}

/**
 * Genera la descripción del vídeo según las especificaciones
 */
function generateVideoDescription(metadata: Record<string, any> | null): string {
  const alumnoNombre = metadata?.alumno_nombre || metadata?.alumnoNombre || 'Desconocido';
  const profesorNombre = metadata?.profesor_nombre || metadata?.profesorNombre || 'No asignado';
  const contexto = getContextoText(metadata?.contexto);
  const comentarios = metadata?.comentarios || metadata?.comentario || '';
  const alumnoId = metadata?.alumno_id || metadata?.alumnoId || null;
  const profesorId = metadata?.profesor_id || metadata?.profesorId || null;
  const sesionId = metadata?.sesion_id || metadata?.sesionId || null;
  const ticketId = metadata?.ticket_id || metadata?.ticketId || null;
  const fechaSubida = getCurrentDateTimeString();

  let description = 'Estudio de trompeta con Studia 🎺\n\n';
  description += `Alumno: ${alumnoNombre}\n`;
  description += `Profesor: ${profesorNombre}\n`;
  description += `Contexto: ${contexto}\n`;
  description += `Fecha subida: ${fechaSubida}\n`;

  if (comentarios && typeof comentarios === 'string' && comentarios.trim().length > 0) {
    description += '\nComentarios del alumno/profesor:\n';
    description += `${comentarios.trim()}\n`;
  }

  description += '\nID interno:\n';
  if (alumnoId) {
    description += `- alumno_id: ${alumnoId}\n`;
  }
  if (profesorId) {
    description += `- profesor_id: ${profesorId}\n`;
  }
  if (sesionId) {
    description += `- sesion_id: ${sesionId}\n`;
  }
  if (ticketId) {
    description += `- ticket_id: ${ticketId}\n`;
  }

  return description.trim();
}

/**
 * Valida y normaliza la metadata recibida
 */
function normalizeMetadata(metaString: string | null): Record<string, any> | null {
  if (!metaString || typeof metaString !== 'string' || metaString.trim().length === 0) {
    return null;
  }

  try {
    const parsed = JSON.parse(metaString);

    // Asegurar que es un objeto
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      console.warn('[upload-youtube] Metadata no es un objeto válido:', parsed);
      return null;
    }

    return parsed as Record<string, any>;
  } catch (e) {
    console.warn('[upload-youtube] Error parsing meta JSON:', e);
    return null;
  }
}

/**
 * Formato de respuesta estándar para la Edge Function
 */
interface ResponseFormat {
  ok: boolean;
  videoUrl: string | null;
  videoId: string | null;
  message: string;
  error: string | null;
  metadata: Record<string, any> | null;
}

/**
 * Crea una respuesta de éxito
 */
function createSuccessResponse(videoId: string, metadata: Record<string, any> | null): ResponseFormat {
  return {
    ok: true,
    videoUrl: `https://www.youtube.com/watch?v=${videoId}`,
    videoId,
    message: 'Vídeo subido correctamente a YouTube',
    error: null,
    metadata,
  };
}

/**
 * Crea una respuesta de error
 */
function createErrorResponse(message: string, error: string, metadata: Record<string, any> | null = null): ResponseFormat {
  return {
    ok: false,
    videoUrl: null,
    videoId: null,
    message,
    error,
    metadata,
  };
}

// @ts-expect-error - Deno está disponible en el entorno de Supabase Edge Functions
Deno.serve(async (req) => {
  // Manejar CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders
    });
  }

  let metadata: Record<string, any> | null = null;

  try {
    // Solo permitir POST
    if (req.method !== 'POST') {
      const response = createErrorResponse(
        'Método no permitido',
        'Method not allowed. Use POST.',
        null
      );
      return new Response(
        JSON.stringify(response),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Leer formData (multipart/form-data)
    const formData = await req.formData();

    // Obtener el archivo
    const file = formData.get('file') as File | null;

    if (!file) {
      const response = createErrorResponse(
        'No se proporcionó archivo',
        'No file provided',
        null
      );
      return new Response(
        JSON.stringify(response),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Obtener y normalizar metadata (opcional)
    const metaString = formData.get('meta') as string | null;
    metadata = normalizeMetadata(metaString);

    // Generar título y descripción
    const videoTitle = generateVideoTitle(metadata);
    const videoDescription = generateVideoDescription(metadata);

    // Log de información del archivo y metadata generada
    console.log('[upload-youtube] File received:', {
      name: file.name,
      size: file.size,
      type: file.type,
      metadata,
      generatedTitle: videoTitle,
      generatedDescription: videoDescription.substring(0, 100) + '...',
    });

    // ============================================
    // SUBIDA REAL A YOUTUBE
    // ============================================

    // 1. Obtener credenciales de YouTube desde variables de entorno
    const clientId = Deno.env.get('YOUTUBE_CLIENT_ID');
    const clientSecret = Deno.env.get('YOUTUBE_CLIENT_SECRET');
    const refreshToken = Deno.env.get('YOUTUBE_REFRESH_TOKEN');

    if (!clientId || !clientSecret || !refreshToken) {
      console.error('[upload-youtube] Faltan credenciales de YouTube en variables de entorno');
      const response = createErrorResponse(
        'Error de configuración: Faltan credenciales de YouTube',
        'Missing YouTube credentials (YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET, or YOUTUBE_REFRESH_TOKEN)',
        metadata
      );
      return new Response(
        JSON.stringify(response),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Obtener access token usando refresh token
    console.log('[upload-youtube] Obteniendo access token de Google OAuth...');
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    console.log('[upload-youtube] Token response status:', tokenRes.status);

    if (!tokenRes.ok) {
      const tokenError = await tokenRes.text().catch(() => 'Error desconocido al obtener token');
      console.error('[upload-youtube] Error obteniendo access token:', tokenRes.status, tokenRes.statusText);
      const response = createErrorResponse(
        'Error al autenticar con YouTube',
        `Failed to get access token: ${tokenRes.status} ${tokenRes.statusText}`,
        metadata
      );
      return new Response(
        JSON.stringify(response),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;

    if (!accessToken) {
      console.error('[upload-youtube] No se recibió access_token en la respuesta');
      const response = createErrorResponse(
        'Error al autenticar con YouTube',
        'No access_token received from OAuth',
        metadata
      );
      return new Response(
        JSON.stringify(response),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[upload-youtube] Access token obtenido correctamente');

    // 3. Preparar metadata del vídeo para YouTube
    const videoMetadata = {
      snippet: {
        title: videoTitle,
        description: videoDescription,
        tags: ['trompeta', 'estudio', 'studia'],
      },
      status: {
        privacyStatus: 'unlisted',
        madeForKids: false,
        selfDeclaredMadeForKids: false,
      },
    };

    // 4. Iniciar upload resumable a YouTube
    console.log('[upload-youtube] Iniciando upload resumable a YouTube...');
    const uploadInitRes = await fetch(
      'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'X-Upload-Content-Type': file.type || 'video/*',
          'X-Upload-Content-Length': file.size.toString(),
        },
        body: JSON.stringify(videoMetadata),
      }
    );

    console.log('[upload-youtube] Upload init response status:', uploadInitRes.status);

    if (!uploadInitRes.ok) {
      const uploadError = await uploadInitRes.text().catch(() => 'Error desconocido al iniciar upload');
      console.error('[upload-youtube] Error iniciando upload:', uploadInitRes.status, uploadInitRes.statusText);
      const response = createErrorResponse(
        'Error al iniciar la subida del vídeo a YouTube',
        `Failed to initiate upload: ${uploadInitRes.status} ${uploadInitRes.statusText}`,
        metadata
      );
      return new Response(
        JSON.stringify(response),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Obtener la URL de upload resumable del header Location
    const uploadUrl = uploadInitRes.headers.get('Location');
    if (!uploadUrl) {
      console.error('[upload-youtube] No se recibió Location header para upload resumable');
      const response = createErrorResponse(
        'Error al iniciar la subida del vídeo a YouTube',
        'No upload URL received from YouTube',
        metadata
      );
      return new Response(
        JSON.stringify(response),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[upload-youtube] Upload URL obtenida, subiendo archivo...');

    // 5. Subir el archivo usando la URL resumable
    const fileArrayBuffer = await file.arrayBuffer();
    const uploadRes = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': file.type || 'video/*',
        'Content-Length': file.size.toString(),
      },
      body: fileArrayBuffer,
    });

    console.log('[upload-youtube] Upload file response status:', uploadRes.status);

    if (!uploadRes.ok) {
      const uploadError = await uploadRes.text().catch(() => 'Error desconocido al subir archivo');
      console.error('[upload-youtube] Error subiendo archivo:', uploadRes.status, uploadRes.statusText);
      const response = createErrorResponse(
        'Error al subir el archivo a YouTube',
        `Failed to upload file: ${uploadRes.status} ${uploadRes.statusText}`,
        metadata
      );
      return new Response(
        JSON.stringify(response),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 6. Obtener el videoId de la respuesta
    const uploadResult = await uploadRes.json();
    const videoId = uploadResult?.id;

    if (!videoId) {
      console.error('[upload-youtube] No se recibió videoId en la respuesta:', uploadResult);
      const response = createErrorResponse(
        'Error al obtener el ID del vídeo subido',
        'No videoId received from YouTube response',
        metadata
      );
      return new Response(
        JSON.stringify(response),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[upload-youtube] Vídeo subido correctamente, videoId:', videoId);

    // 7. Devolver respuesta de éxito con el videoId REAL de YouTube
    const response = createSuccessResponse(videoId, metadata);

    return new Response(
      JSON.stringify(response),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (e) {
    console.error('[upload-youtube] Error:', e);
    const errorMessage = e instanceof Error ? e.message : String(e);
    const response = createErrorResponse(
      'Error al subir el vídeo a YouTube',
      errorMessage,
      metadata
    );
    return new Response(
      JSON.stringify(response),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

