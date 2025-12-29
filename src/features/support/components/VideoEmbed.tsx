import React from 'react';

/**
 * Componente para insertar vídeos embebidos en el contenido de ayuda
 * @param {string} url - URL del vídeo (YouTube, Vimeo, etc.)
 * @param {string} title - Título del vídeo (opcional)
 */
export default function VideoEmbed({ url, title }) {
  if (!url) return null;

  // Detectar tipo de vídeo y generar embed URL
  let embedUrl = '';
  let videoId = '';

  // YouTube
  if (url.includes('youtube.com') || url.includes('youtu.be')) {
    if (url.includes('youtu.be')) {
      videoId = url.split('youtu.be/')[1]?.split('?')[0];
    } else {
      const match = url.match(/(?:youtube\.com\/watch\?v=|youtube\.com\/embed\/)([^&\n?#]+)/);
      videoId = match ? match[1] : '';
    }
    if (videoId) {
      embedUrl = `https://www.youtube.com/embed/${videoId}`;
    }
  }
  // Vimeo
  else if (url.includes('vimeo.com')) {
    const match = url.match(/vimeo\.com\/(\d+)/);
    videoId = match ? match[1] : '';
    if (videoId) {
      embedUrl = `https://player.vimeo.com/video/${videoId}`;
    }
  }
  // Si no es YouTube ni Vimeo, usar la URL directamente (puede ser un iframe embed)
  else {
    embedUrl = url;
  }

  if (!embedUrl) {
    return (
      <div className="my-4 p-4 bg-[var(--color-warning)]/10 border border-[var(--color-warning)]/30 rounded-lg">
        <p className="text-sm text-[var(--color-warning)]">
          URL de vídeo no válida: {url}
        </p>
      </div>
    );
  }

  return (
    <div className="my-6">
      {title && (
        <h4 className="text-lg font-semibold text-[var(--color-text-primary)] mb-3">
          {title}
        </h4>
      )}
      <div className="relative w-full" style={{ paddingBottom: '56.25%' }}> {/* 16:9 aspect ratio */}
        <iframe
          src={embedUrl}
          title={title || 'Vídeo embebido'}
          className="absolute top-0 left-0 w-full h-full rounded-lg border border-[var(--color-border-default)]"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          loading="lazy"
        />
      </div>
    </div>
  );
}

