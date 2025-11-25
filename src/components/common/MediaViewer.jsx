import React, { useEffect } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createPortal } from "react-dom";
import MediaEmbed from "./MediaEmbed";
import { MediaKind } from "../utils/media";

export default function MediaViewer({ media, onClose }) {
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  if (!media) return null;

  const renderContent = () => {
    // Si el media tiene un kind de MediaKind (YouTube, Vimeo, etc.), usar MediaEmbed
    if (media.kind === MediaKind.YOUTUBE || 
        media.kind === MediaKind.VIMEO || 
        media.kind === MediaKind.SOUNDCLOUD || 
        media.kind === MediaKind.DRIVE) {
      return (
        <div className="w-[90vw] max-w-4xl">
          <MediaEmbed url={media.originalUrl || media.url} />
        </div>
      );
    }

    // Para tipos básicos, usar el renderizado original
    switch (media.kind) {
      case MediaKind.IMAGE:
      case 'image':
        return (
          <img 
            src={media.url} 
            alt="Media adjunta" 
            className="max-h-[80vh] max-w-[90vw] object-contain"
            onError={(e) => {
              e.target.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg"/>';
              e.target.alt = 'Error al cargar imagen';
            }}
          />
        );
      case MediaKind.VIDEO:
      case 'video':
        return (
          <video 
            controls 
            autoPlay 
            className="max-h-[80vh] max-w-[90vw]"
            onError={(e) => {
              e.target.innerHTML = '<p style="color:white">Error al cargar video</p>';
            }}
          >
            <source src={media.url} />
            Tu navegador no soporta video.
          </video>
        );
      case MediaKind.AUDIO:
      case 'audio':
        return (
          <div className="media-viewer-bg p-8">
            <audio 
              controls 
              autoPlay 
              className="w-full max-w-md"
              onError={(e) => {
                e.target.innerHTML = '<p style="color:white">Error al cargar audio</p>';
              }}
            >
              <source src={media.url} />
              Tu navegador no soporta audio.
            </audio>
          </div>
        );
      case MediaKind.PDF:
      case 'pdf':
        return (
          <iframe 
            src={media.url} 
            className="w-[90vw] h-[80vh] bg-[var(--color-surface-elevated)] rounded-[var(--radius-card)] shadow-card"
            title="PDF Viewer"
            onError={(e) => {
              e.target.innerHTML = '<p>Error al cargar PDF</p>';
            }}
          />
        );
      default:
        // Si tiene una URL pero no se reconoce el tipo, intentar usar MediaEmbed
        if (media.originalUrl || media.url) {
          return (
            <div className="w-[90vw] max-w-4xl">
              <MediaEmbed url={media.originalUrl || media.url} />
            </div>
          );
        }
        return <p className="text-[var(--color-text-primary)]">Tipo de medio no soportado</p>;
    }
  };

  return createPortal(
    <>
      <div 
        className="fixed inset-0 bg-black/90 z-[200]" 
        onClick={onClose}
        aria-label="Cerrar visor"
      />
      <div className="fixed inset-0 z-[210] flex items-center justify-center p-4 pointer-events-none">
        <div className="pointer-events-auto max-w-full max-h-full flex flex-col items-center gap-4">
          <div className="flex items-center justify-between w-full">
            <div className="flex-1" />
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-white hover:bg-white/20 shrink-0"
              aria-label="Cerrar (Esc)"
            >
              <X className="w-6 h-6" />
            </Button>
          </div>
          
          <div className="flex items-center justify-center">
            {renderContent()}
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}