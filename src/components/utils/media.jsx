/**
 * Utilidades para resolución y normalización de URLs multimedia
 * Soporta: YouTube, Vimeo, SoundCloud, Google Drive, archivos directos
 */

export const MediaKind = {
  YOUTUBE: 'youtube',
  VIMEO: 'vimeo',
  SOUNDCLOUD: 'soundcloud',
  DRIVE: 'drive',
  AUDIO: 'audio',
  VIDEO: 'video',
  IMAGE: 'image',
  PDF: 'pdf',
  UNKNOWN: 'unknown',
};

// Patrones de detección
const YOUTUBE_PATTERNS = [
  /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
  /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
];

const VIMEO_PATTERN = /vimeo\.com\/(?:video\/)?(\d+)/;

const SOUNDCLOUD_PATTERN = /soundcloud\.com\/.+/;

const DRIVE_PATTERNS = [
  /drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/,
  /drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/,
  /drive\.google\.com\/uc\?id=([a-zA-Z0-9_-]+)/,
];

const AUDIO_EXTENSIONS = ['.mp3', '.wav', '.ogg', '.m4a', '.aac', '.flac'];
const VIDEO_EXTENSIONS = ['.mp4', '.webm', '.mov', '.avi', '.mkv'];
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg'];
const PDF_EXTENSION = '.pdf';

/**
 * Valida si una URL es segura (http/https)
 * Soporta string o objeto {url: string}
 */
export function isValidUrl(input) {
  if (!input) return false;
  const urlString = typeof input === 'string' ? input : input.url;

  if (!urlString || typeof urlString !== 'string') return false;

  try {
    const url = new URL(urlString.trim());
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Detecta el tipo de medio y genera URL de embed
 * Soporta string o objeto {url: string, name?: string}
 */
export function resolveMedia(input) {
  const urlString = typeof input === 'string' ? input : input?.url;
  const customName = typeof input === 'object' ? input?.name : null;

  if (!isValidUrl(urlString)) {
    return { kind: MediaKind.UNKNOWN, originalUrl: urlString, name: customName };
  }

  const url = urlString.trim();
  const urlLower = url.toLowerCase();

  let result = { kind: MediaKind.UNKNOWN, originalUrl: url, name: customName, title: 'External Link' };

  // Helper to attach name if present
  const withName = (res) => ({ ...res, name: customName || res.title });

  // YouTube
  for (const pattern of YOUTUBE_PATTERNS) {
    const match = url.match(pattern);
    if (match) {
      const videoId = match[1];
      return withName({
        kind: MediaKind.YOUTUBE,
        embedUrl: `https://www.youtube.com/embed/${videoId}`,
        originalUrl: url,
        title: 'YouTube Video',
      });
    }
  }

  // Vimeo
  const vimeoMatch = url.match(VIMEO_PATTERN);
  if (vimeoMatch) {
    const videoId = vimeoMatch[1];
    return withName({
      kind: MediaKind.VIMEO,
      embedUrl: `https://player.vimeo.com/video/${videoId}`,
      originalUrl: url,
      title: 'Vimeo Video',
    });
  }

  // SoundCloud
  if (SOUNDCLOUD_PATTERN.test(url)) {
    // Limpiar parámetros de tracking de la URL para evitar problemas
    let cleanUrl = url;
    try {
      const urlObj = new URL(url);
      // Eliminar parámetros de tracking comunes
      urlObj.searchParams.delete('utm_source');
      urlObj.searchParams.delete('utm_medium');
      urlObj.searchParams.delete('utm_campaign');
      urlObj.searchParams.delete('utm_content');
      cleanUrl = urlObj.toString();
    } catch (e) {
      // Si falla el parsing, usar la URL original
      cleanUrl = url;
    }

    return withName({
      kind: MediaKind.SOUNDCLOUD,
      embedUrl: `https://w.soundcloud.com/player/?url=${encodeURIComponent(cleanUrl)}&color=%23ff5500&auto_play=false&hide_related=false&show_comments=true&show_user=true&show_reposts=false&show_teaser=true&visual=true`,
      originalUrl: url,
      title: 'SoundCloud Audio',
    });
  }

  // Google Drive
  for (const pattern of DRIVE_PATTERNS) {
    const match = url.match(pattern);
    if (match) {
      const fileId = match[1];

      // Verificar si tiene parámetro format=mp3 o similar para audio
      const urlLower = url.toLowerCase();
      if (urlLower.includes('format=mp3') ||
        urlLower.includes('format=wav') ||
        urlLower.includes('format=ogg') ||
        urlLower.includes('format=m4a') ||
        urlLower.includes('format=aac') ||
        urlLower.includes('format=flac') ||
        urlLower.includes('&format=mp3') ||
        urlLower.includes('&format=wav') ||
        urlLower.includes('&format=ogg') ||
        urlLower.includes('&format=m4a') ||
        urlLower.includes('&format=aac') ||
        urlLower.includes('&format=flac')) {
        // Es un archivo de audio desde Google Drive
        return withName({
          kind: MediaKind.AUDIO,
          embedUrl: url, // Usar la URL completa con el parámetro format
          originalUrl: url,
        });
      }

      // Si no es audio, tratarlo como Drive normal
      return withName({
        kind: MediaKind.DRIVE,
        embedUrl: `https://drive.google.com/file/d/${fileId}/preview`,
        originalUrl: url,
        title: 'Google Drive File',
      });
    }
  }

  // Audio files
  if (AUDIO_EXTENSIONS.some(ext => urlLower.endsWith(ext))) {
    return withName({
      kind: MediaKind.AUDIO,
      embedUrl: url,
      originalUrl: url,
    });
  }

  // Video files
  if (VIDEO_EXTENSIONS.some(ext => urlLower.endsWith(ext))) {
    return withName({
      kind: MediaKind.VIDEO,
      embedUrl: url,
      originalUrl: url,
    });
  }

  // Images
  if (IMAGE_EXTENSIONS.some(ext => urlLower.endsWith(ext))) {
    return withName({
      kind: MediaKind.IMAGE,
      embedUrl: url,
      originalUrl: url,
    });
  }

  // PDF
  if (urlLower.endsWith(PDF_EXTENSION)) {
    // Usar Google Docs Viewer para PDFs
    return withName({
      kind: MediaKind.PDF,
      embedUrl: `https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`,
      originalUrl: url,
      title: 'PDF Document',
    });
  }

  // Unknown - link genérico
  return withName({
    kind: MediaKind.UNKNOWN,
    originalUrl: url,
    title: 'External Link',
  });
}

/**
 * Normaliza y deduplica una lista de URLs
 * Soporta mezclar strings y objetos {url, name}
 * Devuelve array de objetos {url, name} si preserveObjects es true, o array de strings
 */
export function normalizeMediaLinks(items, preserveObjects = false) {
  if (!Array.isArray(items)) return [];

  const seen = new Set();
  const normalized = [];

  for (const item of items) {
    if (!item) continue;

    // Normalizar a objeto internamente
    const entry = typeof item === 'string'
      ? { url: item, name: null }
      : { url: item.url, name: item.name || null };

    if (!entry.url || typeof entry.url !== 'string') continue;

    const trimmed = entry.url.trim();
    if (!trimmed || seen.has(trimmed)) continue;

    // Validar URL
    if (isValidUrl(trimmed)) {
      seen.add(trimmed);
      // Devolver objeto o string según preferencia
      if (preserveObjects) {
        normalized.push({ url: trimmed, name: entry.name });
      } else {
        normalized.push(trimmed);
      }
    }
  }

  return normalized;
}

/**
 * Extrae URLs de un texto multi-línea
 */
export function extractUrlsFromText(text) {
  if (!text || typeof text !== 'string') return [];

  const lines = text.split('\n').map(line => line.trim()).filter(Boolean);
  // Default to returning strings for parsing raw text
  return normalizeMediaLinks(lines, false);
}

// Tests rápidos en desarrollo
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  window.testMediaResolve = () => {
    const tests = [
      'https://youtu.be/dQw4w9WgXcQ',
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      'https://www.youtube.com/shorts/abc123',
      'https://vimeo.com/123456789',
      'https://soundcloud.com/artist/track-name',
      'https://drive.google.com/file/d/1ABC123/view?usp=sharing',
      'https://example.com/audio.mp3',
      'https://example.com/video.mp4',
      'https://example.com/image.jpg',
      'https://example.com/document.pdf',
      'https://example.com/unknown-link',
    ];

    if (process.env.NODE_ENV === 'development') {
      console.group('🔍 Media Resolution Tests');
      tests.forEach(url => {
        const result = resolveMedia(url);
        console.log(`${url}\n→`, result);
      });
      console.groupEnd();
    }
  };
}