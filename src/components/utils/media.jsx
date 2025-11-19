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
 */
export function isValidUrl(urlString) {
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
 */
export function resolveMedia(urlString) {
  if (!isValidUrl(urlString)) {
    return { kind: MediaKind.UNKNOWN, originalUrl: urlString };
  }

  const url = urlString.trim();
  const urlLower = url.toLowerCase();

  // YouTube
  for (const pattern of YOUTUBE_PATTERNS) {
    const match = url.match(pattern);
    if (match) {
      const videoId = match[1];
      return {
        kind: MediaKind.YOUTUBE,
        embedUrl: `https://www.youtube.com/embed/${videoId}`,
        originalUrl: url,
        title: 'YouTube Video',
      };
    }
  }

  // Vimeo
  const vimeoMatch = url.match(VIMEO_PATTERN);
  if (vimeoMatch) {
    const videoId = vimeoMatch[1];
    return {
      kind: MediaKind.VIMEO,
      embedUrl: `https://player.vimeo.com/video/${videoId}`,
      originalUrl: url,
      title: 'Vimeo Video',
    };
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
    
    return {
      kind: MediaKind.SOUNDCLOUD,
      embedUrl: `https://w.soundcloud.com/player/?url=${encodeURIComponent(cleanUrl)}&color=%23ff5500&auto_play=false&hide_related=false&show_comments=true&show_user=true&show_reposts=false&show_teaser=true&visual=true`,
      originalUrl: url,
      title: 'SoundCloud Audio',
    };
  }

  // Google Drive
  for (const pattern of DRIVE_PATTERNS) {
    const match = url.match(pattern);
    if (match) {
      const fileId = match[1];
      return {
        kind: MediaKind.DRIVE,
        embedUrl: `https://drive.google.com/file/d/${fileId}/preview`,
        originalUrl: url,
        title: 'Google Drive File',
      };
    }
  }

  // Audio files
  if (AUDIO_EXTENSIONS.some(ext => urlLower.endsWith(ext))) {
    return {
      kind: MediaKind.AUDIO,
      embedUrl: url,
      originalUrl: url,
      title: 'Audio File',
    };
  }

  // Video files
  if (VIDEO_EXTENSIONS.some(ext => urlLower.endsWith(ext))) {
    return {
      kind: MediaKind.VIDEO,
      embedUrl: url,
      originalUrl: url,
      title: 'Video File',
    };
  }

  // Images
  if (IMAGE_EXTENSIONS.some(ext => urlLower.endsWith(ext))) {
    return {
      kind: MediaKind.IMAGE,
      embedUrl: url,
      originalUrl: url,
      title: 'Image',
    };
  }

  // PDF
  if (urlLower.endsWith(PDF_EXTENSION)) {
    // Usar Google Docs Viewer para PDFs
    return {
      kind: MediaKind.PDF,
      embedUrl: `https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`,
      originalUrl: url,
      title: 'PDF Document',
    };
  }

  // Unknown - link genérico
  return {
    kind: MediaKind.UNKNOWN,
    originalUrl: url,
    title: 'External Link',
  };
}

/**
 * Normaliza y deduplica una lista de URLs
 */
export function normalizeMediaLinks(urls) {
  if (!Array.isArray(urls)) return [];
  
  const seen = new Set();
  const normalized = [];
  
  for (const url of urls) {
    if (!url || typeof url !== 'string') continue;
    
    const trimmed = url.trim();
    if (!trimmed || seen.has(trimmed)) continue;
    
    if (isValidUrl(trimmed)) {
      seen.add(trimmed);
      normalized.push(trimmed);
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
  return normalizeMediaLinks(lines);
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

    console.group('🔍 Media Resolution Tests');
    tests.forEach(url => {
      const result = resolveMedia(url);
      console.log(`${url}\n→`, result);
    });
    console.groupEnd();
  };
}