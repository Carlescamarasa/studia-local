/* eslint-disable @typescript-eslint/no-explicit-any */
 
/**
 * Utility script to upload a video file to YouTube via Data API v3 (browser-side flow).
 * NOTE: This requires a Google Cloud project with YouTube Data API enabled,
 */
/**
 * Helper para subir vídeos a YouTube usando la Edge Function
 */

export interface UploadVideoMetadata {
  alumno_id?: string;
  alumno_nombre?: string;
  profesor_id?: string;
  profesor_nombre?: string;
  contexto: 'ticket_alumno' | 'ticket_profesor' | 'sesion_estudio';
  comentarios?: string;
  ticket_id?: string;
  sesion_id?: string;
}

export interface UploadVideoResult {
  ok: boolean;
  videoUrl: string | null;
  videoId: string | null;
  message: string;
  error: string | null;
  metadata: any;
}

/**
 * Sube un vídeo a YouTube usando la Edge Function
 */
export async function uploadVideoToYouTube(
  file: File,
  metadata: UploadVideoMetadata
): Promise<UploadVideoResult> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    throw new Error('Faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY en las variables de entorno');
  }

  // Crear FormData
  const formData = new FormData();
  formData.append('file', file);
  formData.append('meta', JSON.stringify(metadata));

  // Llamar a la Edge Function
  const functionUrl = `${supabaseUrl}/functions/v1/upload-youtube`;

  const res = await fetch(functionUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${anonKey}`,
      'apikey': anonKey,
    },
    body: formData,
  });

  // Parsear respuesta
  let data: UploadVideoResult;
  const contentType = res.headers.get('content-type');

  if (contentType && contentType.includes('application/json')) {
    data = await res.json();
  } else {
    const text = await res.text().catch(() => '');
    throw new Error(`Respuesta no es JSON válido: ${text}`);
  }

  // Verificar éxito
  if (!res.ok || !data.ok) {
    throw new Error(data.error || data.message || 'Error al subir el vídeo');
  }

  return data;
}

