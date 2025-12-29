import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/features/shared/components/ui/button';
import { Play, ExternalLink, AlertCircle } from 'lucide-react';

/**
 * Reproductor de audio personalizado
 * Para Google Drive, muestra un mensaje claro sobre las limitaciones
 * Para otros servicios, usa reproductor embebido
 */
export default function AudioPlayer({ url, className = '' }) {
  const audioRef = useRef(null);
  const [error, setError] = useState(false);
  const [triedDirect, setTriedDirect] = useState(false);

  // Si es Google Drive, intentar primero con elemento audio directo
  if (url && url.includes('drive.google.com')) {
    const driveMatch = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
    const fileId = driveMatch ? driveMatch[1] : null;
    
    // Intentar diferentes formatos de URL
    const directUrl = fileId 
      ? `https://drive.google.com/uc?export=download&id=${fileId}`
      : url;

    // Si no hemos intentado aún, intentar con elemento audio
    if (!triedDirect && fileId) {
      return (
        <div className={`w-full bg-[var(--color-surface-muted)] rounded-lg p-4 space-y-3 ${className}`}>
          <audio
            ref={audioRef}
            controls
            className="w-full"
            preload="metadata"
            src={directUrl}
            aria-label="Reproductor de audio"
            onError={() => {
              setError(true);
              setTriedDirect(true);
            }}
            onLoadedData={() => {
              setError(false);
            }}
          >
            Tu navegador no soporta el elemento audio.
          </audio>
          
          {error && (
            <div className="bg-[var(--color-warning)]/10 border border-[var(--color-warning)]/20 rounded-lg p-4 space-y-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-[var(--color-warning)] shrink-0 mt-0.5" />
                <div className="flex-1 space-y-2">
                  <p className="text-sm font-medium text-[var(--color-warning)]">
                    Google Drive no permite reproducir audio embebido
                  </p>
                  <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
                    Google Drive bloquea la reproducción directa de audio por restricciones de seguridad (CORS). 
                    Para reproducir el audio, debes abrirlo en una nueva pestaña.
                  </p>
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="default"
                  size="sm"
                  onClick={() => {
                    window.open(url, '_blank', 'noopener,noreferrer');
                  }}
                  className="h-9 px-4 min-h-[36px] touch-manipulation flex items-center gap-2"
                >
                  <Play className="w-4 h-4" />
                  Reproducir en nueva pestaña
                  <ExternalLink className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          )}
        </div>
      );
    }

    // Si ya intentamos y falló, mostrar mensaje claro
    return (
      <div className={`w-full bg-[var(--color-surface-muted)] rounded-lg p-4 space-y-3 ${className}`}>
        <div className="bg-[var(--color-warning)]/10 border border-[var(--color-warning)]/20 rounded-lg p-4 space-y-3">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-[var(--color-warning)] shrink-0 mt-0.5" />
            <div className="flex-1 space-y-2">
              <p className="text-sm font-medium text-[var(--color-warning)]">
                Google Drive no permite reproducir audio embebido
              </p>
              <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
                Google Drive bloquea la reproducción directa de audio por restricciones de seguridad (CORS). 
                Para reproducir el audio mientras usas el modal, abre el enlace en una nueva pestaña.
              </p>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={() => {
                window.open(url, '_blank', 'noopener,noreferrer');
              }}
              className="h-9 px-4 min-h-[36px] touch-manipulation flex items-center gap-2"
            >
              <Play className="w-4 h-4" />
              Reproducir en nueva pestaña
              <ExternalLink className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Para otros servicios, usar reproductor embebido
  return (
    <div className={`w-full bg-[var(--color-surface-muted)] rounded-lg p-4 ${className}`}>
      <audio
        controls
        className="w-full"
        preload="metadata"
        src={url}
        aria-label="Reproductor de audio"
      >
        Tu navegador no soporta el elemento audio.
      </audio>
    </div>
  );
}

