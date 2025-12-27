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

// --- YouTube oEmbed Caching Utilities ---

const YOUTUBE_TITLE_CACHE_KEY = 'yt_title_cache_v1';
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// In-memory cache for current session speed
const memoryCache = new Map();

/**
 * Clean up expired items from localStorage
 */
function pruneCache() {
  try {
    const raw = localStorage.getItem(YOUTUBE_TITLE_CACHE_KEY);
    if (!raw) return;

    const cache = JSON.parse(raw);
    const now = Date.now();
    let changed = false;

    Object.keys(cache).forEach(key => {
      if (now - cache[key].timestamp > CACHE_TTL_MS) {
        delete cache[key];
        changed = true;
      }
    });

    if (changed) {
      localStorage.setItem(YOUTUBE_TITLE_CACHE_KEY, JSON.stringify(cache));
    }
  } catch (e) {
    // Ignore storage errors
  }
}

// Run prune once on load
if (typeof window !== 'undefined') {
  setTimeout(pruneCache, 5000);
}

/**
 * Fetches YouTube video title using oEmbed (no API key required)
 * Includes Caching: Memory -> LocalStorage -> Network
 * @param {string} url - The YouTube URL
 * @returns {Promise<string|null>} - The title or null if failed
 */
export async function getYouTubeTitle(url) {
  if (!url) return null;

  // 1. Check Memory Cache
  if (memoryCache.has(url)) return memoryCache.get(url);

  // 2. Check LocalStorage
  try {
    const raw = localStorage.getItem(YOUTUBE_TITLE_CACHE_KEY);
    if (raw) {
      const cache = JSON.parse(raw);
      if (cache[url] && (Date.now() - cache[url].timestamp < CACHE_TTL_MS)) {
        memoryCache.set(url, cache[url].title);
        return cache[url].title;
      }
    }
  } catch (e) { /* ignore */ }

  // 3. Network Request
  try {
    // Use noembed wrapper or direct youtube oembed if CORS allows (YouTube usually has CORS strictness)
    // Actually YouTube oembed does NOT support CORS directly for client-side JS without a proxy usually.
    // BUT we can use 'noembed.com' as a public proxy which is standard for this.
    // Or try fetch with 'no-cors' but then we can't read the text.
    // Let's use `noembed.com` which is reliable for this specific use case.

    const target = `https://noembed.com/embed?url=${encodeURIComponent(url)}`;
    const res = await fetch(target).then(r => r.json());

    if (res && res.title) {
      const title = res.title;

      // Update Caches
      memoryCache.set(url, title);

      try {
        const raw = localStorage.getItem(YOUTUBE_TITLE_CACHE_KEY) || '{}';
        const cache = JSON.parse(raw);
        cache[url] = { title, timestamp: Date.now() };
        localStorage.setItem(YOUTUBE_TITLE_CACHE_KEY, JSON.stringify(cache));
      } catch (e) { }

      return title;
    }
  } catch (error) {
    // Fail silently
  }

  return null;
}