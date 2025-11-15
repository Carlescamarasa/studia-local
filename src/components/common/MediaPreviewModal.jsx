
import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, ExternalLink, X } from 'lucide-react';
import MediaEmbed, { getMediaLabel } from './MediaEmbed';
import { resolveMedia } from '../utils/media';
import { useSidebar } from '@/components/ui/SidebarState';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

/**
 * Modal con carrusel para previsualizar medios
 * Soporta navegación con teclado (flechas, Ctrl/⌘+. para cerrar)
 * Se ajusta al ancho disponible respetando el sidebar
 * Modo compacto para audio con control de velocidad
 */
export default function MediaPreviewModal({ urls = [], initialIndex = 0, open, onClose }) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const { abierto } = useSidebar();
  const [isMobile, setIsMobile] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(() => {
    const saved = localStorage.getItem('media.playbackRate');
    return saved ? parseFloat(saved) : 1.0;
  });
  const audioRef = useRef(null);
  
  useEffect(() => {
    if (open) {
      setCurrentIndex(initialIndex);
    }
  }, [open, initialIndex]);

  // Detectar mobile
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 1024);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e) => {
      // Ctrl/⌘+. para cerrar
      if ((e.metaKey || e.ctrlKey) && e.key === '.') {
        e.preventDefault();
        onClose?.();
        return;
      }

      // Flechas para navegación (solo si hay múltiples y NO es audio)
      const currentUrl = urls[currentIndex] || '';
      const media = resolveMedia(currentUrl);
      const isAudio = media.kind === 'audio';

      if (!isAudio && urls.length > 1) {
        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          handlePrevious();
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          handleNext();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, currentIndex, urls.length]);

  // Bloquear scroll del body
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  // Aplicar velocidad de reproducción al audio
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate, currentIndex]);

  if (!urls || urls.length === 0 || !open) return null;

  const currentUrl = urls[currentIndex] || '';
  const media = resolveMedia(currentUrl);
  const hasMultiple = urls.length > 1;
  const isAudio = media.kind === 'audio';

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : urls.length - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev < urls.length - 1 ? prev + 1 : 0));
  };

  const handleOpenExternal = () => {
    if (media.originalUrl) {
      window.open(media.originalUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose?.();
    }
  };

  const handlePlaybackRateChange = (value) => {
    const rate = parseFloat(value);
    setPlaybackRate(rate);
    localStorage.setItem('media.playbackRate', rate.toString());
  };

  // Calcular left y width según estado del sidebar
  const leftOffset = !isMobile && abierto ? 280 : 0;
  const widthCalc = `calc(100vw - ${leftOffset}px)`;

  // Modo AUDIO compacto
  if (isAudio) {
    return createPortal(
      <div
        className="fixed top-0 right-0 bottom-0 z-[100] flex items-center justify-center"
        style={{
          left: leftOffset,
          width: widthCalc,
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="media-preview-title"
      >
        {/* Overlay transparente para audio */}
        <div
          className="absolute inset-0 bg-transparent"
          onClick={handleOverlayClick}
          aria-hidden="true"
        />

        {/* Tarjeta compacta para audio */}
        <div className="relative z-10 mx-auto w-full max-w-md px-4">
          <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-card border border-gray-200 p-6">
            {/* Header */}
            <div className="flex items-center justify-between gap-4 mb-4">
              <h2 id="media-preview-title" className="font-semibold text-base truncate flex-1">
                {getMediaLabel(currentUrl)}
              </h2>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleOpenExternal}
                  className="text-blue-600 hover:text-blue-700 h-8 rounded-xl"
                  aria-label="Abrir en nueva pestaña"
                >
                  <ExternalLink className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  className="h-8 w-8 rounded-xl"
                  aria-label="Cerrar"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </div>

            {/* Reproductor de audio */}
            <div className="space-y-4">
              <audio
                ref={audioRef}
                controls
                className="w-full"
                preload="metadata"
                src={media.embedUrl || currentUrl}
              >
                Tu navegador no soporta el elemento de audio.
              </audio>

              {/* Control de velocidad */}
              <div className="flex items-center gap-3">
                <label className="text-sm text-gray-600 font-medium shrink-0">
                  Velocidad:
                </label>
                <div className="flex gap-1 flex-wrap">
                  {[0.5, 0.75, 1, 1.25, 1.5, 2].map((rate) => (
                    <button
                      key={rate}
                      onClick={() => handlePlaybackRateChange(rate.toString())}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                        playbackRate === rate
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                      aria-label={`Velocidad ${rate}x`}
                    >
                      {rate}x
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Ayuda de teclado */}
            <div className="mt-4 text-center border-t pt-3">
              <p className="text-xs text-gray-500">
                Ctrl/⌘+. : cerrar
              </p>
            </div>
          </div>
        </div>
      </div>,
      document.body
    );
  }

  // Modo VIDEO/IMAGEN (fondo oscuro)
  return createPortal(
    <div
      className="fixed top-0 right-0 bottom-0 z-[100] flex items-center justify-center"
      style={{
        left: leftOffset,
        width: widthCalc,
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="media-preview-title"
    >
      {/* Overlay oscuro para video/imagen */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleOverlayClick}
        aria-hidden="true"
      />

      {/* Contenedor del modal */}
      <div className="relative z-10 mx-auto w-full max-w-[1100px] px-4 lg:px-6 flex items-center justify-center max-h-[95vh]">
        <div className="bg-white rounded-2xl shadow-card w-full max-h-full overflow-hidden flex flex-col">
          {/* Header con título y botón de cierre */}
          <div className="px-4 lg:px-6 py-4 border-b bg-white sticky top-0 z-20 flex items-center justify-between gap-4 shrink-0">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <h2 id="media-preview-title" className="font-semibold text-base lg:text-lg truncate">
                {getMediaLabel(currentUrl)}
              </h2>
              {hasMultiple && (
                <span className="text-xs lg:text-sm text-gray-500 whitespace-nowrap">
                  {currentIndex + 1} de {urls.length}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleOpenExternal}
                className="text-blue-600 hover:text-blue-700 h-8 rounded-xl"
                aria-label="Abrir en nueva pestaña"
              >
                <ExternalLink className="w-4 h-4 mr-1" />
                <span className="hidden sm:inline">Abrir</span>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="h-8 w-8 rounded-xl"
                aria-label="Cerrar"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* Contenido del medio */}
          <div className="relative flex-1 overflow-y-auto">
            <div className="p-4 lg:p-6">
              {/* Navegación - Solo si hay múltiples medios */}
              {hasMultiple && (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handlePrevious}
                    className="absolute left-2 lg:left-4 top-1/2 -translate-y-1/2 z-10 h-10 w-10 rounded-full bg-white/95 hover:bg-white shadow-card"
                    aria-label="Anterior"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleNext}
                    className="absolute right-2 lg:right-4 top-1/2 -translate-y-1/2 z-10 h-10 w-10 rounded-full bg-white/95 hover:bg-white shadow-card"
                    aria-label="Siguiente"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </Button>
                </>
              )}

              {/* Medio */}
              <div className="w-full">
                <MediaEmbed url={currentUrl} />
              </div>
            </div>

            {/* Indicadores (si hay múltiples) */}
            {hasMultiple && urls.length <= 10 && (
              <div className="px-4 lg:px-6 pb-4">
                <div className="flex gap-2 justify-center flex-wrap">
                  {urls.map((url, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentIndex(idx)}
                      className={`h-2 rounded-full transition-all ${
                        idx === currentIndex 
                          ? 'bg-blue-600 w-6' 
                          : 'bg-gray-300 hover:bg-gray-400 w-2'
                      }`}
                      aria-label={`Ir a medio ${idx + 1}`}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Ayuda de teclado */}
            <div className="px-4 lg:px-6 pb-4 text-center">
              <p className="text-xs text-gray-500">
                {hasMultiple && 'Usa las flechas ← → para navegar • '}Ctrl/⌘+. : cerrar
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
