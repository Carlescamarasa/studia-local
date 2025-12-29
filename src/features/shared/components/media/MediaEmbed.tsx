import React, { useState } from 'react';
import { resolveMedia, MediaKind } from '@/features/shared/utils/media';
import {
    Youtube,
    Music,
    FileAudio,
    FileVideo,
    Image as ImageIcon,
    FileText,
    Link as LinkIcon,
    ExternalLink,
    Maximize2
} from 'lucide-react';
import AudioPlayer from './AudioPlayer';
import SimpleLightbox from './SimpleLightbox';

interface MediaEmbedProps {
    url: string;
    className?: string;
    open?: boolean;
}

/**
 * Componente que renderiza un medio embebido según su tipo
 * Soporta: YouTube, Vimeo, SoundCloud, Google Drive, audio/video/imagen/PDF directo
 */
export default function MediaEmbed({ url, className = '', open = false }: MediaEmbedProps) {
    const media = resolveMedia(url);
    const [lightboxOpen, setLightboxOpen] = useState(false);

    const baseIframeProps = {
        loading: 'lazy' as const,
        sandbox: 'allow-scripts allow-same-origin allow-popups allow-presentation',
        allow: 'autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture',
        className: 'w-full h-full border-0',
    };

    // Renderizado según tipo
    switch (media.kind) {
        case MediaKind.YOUTUBE:
            return (
                <div className={`relative w-full bg-black rounded-lg overflow-hidden pb-[56.25%] ${className}`}>
                    <iframe
                        {...baseIframeProps}
                        src={media.embedUrl}
                        title={media.title}
                        className="absolute inset-0 w-full h-full border-0"
                        aria-label="Reproductor de YouTube"
                    />
                </div>
            );

        case MediaKind.VIMEO:
            return (
                <div className={`relative w-full bg-black rounded-lg overflow-hidden pb-[56.25%] ${className}`}>
                    <iframe
                        {...baseIframeProps}
                        src={media.embedUrl}
                        title={media.title}
                        className="absolute inset-0 w-full h-full border-0"
                        aria-label="Reproductor de Vimeo"
                    />
                </div>
            );

        case MediaKind.SOUNDCLOUD:
            return (
                <div className={`w-full bg-[var(--color-surface-muted)] rounded-lg overflow-hidden ${className}`}>
                    <iframe
                        {...baseIframeProps}
                        src={media.embedUrl}
                        title={media.title}
                        height="166"
                        scrolling="no"
                        frameBorder="no"
                        allow="autoplay"
                        aria-label="Reproductor de SoundCloud"
                        onError={(e) => {
                            console.warn('[MediaEmbed] Error cargando SoundCloud embed:', e);
                        }}
                    />
                    {/* Fallback: enlace directo si el iframe falla */}
                    <div className="mt-2 text-center">
                        <a
                            href={media.originalUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 hover:text-blue-700 underline"
                        >
                            Abrir en SoundCloud
                        </a>
                    </div>
                </div>
            );

        case MediaKind.DRIVE:
            return (
                <div className={`relative w-full bg-[var(--color-surface-muted)] rounded-lg overflow-hidden pb-[75%] ${className}`}>
                    <iframe
                        {...baseIframeProps}
                        src={media.embedUrl}
                        title={media.title}
                        className="absolute inset-0 w-full h-full border-0"
                        aria-label="Visor de Google Drive"
                    />
                </div>
            );

        case MediaKind.AUDIO:
            return (
                <AudioPlayer url={media.embedUrl || media.originalUrl} className={className} />
            );

        case MediaKind.VIDEO:
            return (
                <div className={`relative w-full bg-black rounded-lg overflow-hidden ${className}`}>
                    <video
                        controls
                        playsInline
                        src={media.embedUrl}
                        className="w-full h-auto"
                        preload="metadata"
                        aria-label="Reproductor de video"
                    >
                        Tu navegador no soporta el elemento video.
                    </video>
                </div>
            );

        case MediaKind.IMAGE:
            return (
                <>
                    <div
                        className={`w-full bg-[var(--color-surface-muted)] rounded-lg overflow-hidden cursor-zoom-in hover:brightness-95 transition-all ${className}`}
                        onClick={() => setLightboxOpen(true)}
                    >
                        <img
                            src={media.embedUrl}
                            alt={media.title}
                            className="w-full h-auto object-contain max-h-[600px]"
                            loading="lazy"
                        />
                    </div>
                    <SimpleLightbox
                        open={lightboxOpen}
                        onClose={() => setLightboxOpen(false)}
                        src={media.embedUrl}
                        alt={media.title}
                    />
                </>
            );

        case MediaKind.PDF:
            // Add parameters to hide native PDF viewer toolbar
            const pdfUrlWithParams = `${media.embedUrl}#toolbar=0&navpanes=0&scrollbar=1`;
            return (
                <>
                    <div
                        className={`relative w-full bg-white rounded-lg overflow-hidden ${className}`}
                        style={{ minHeight: '400px' }}
                    >
                        <object
                            data={pdfUrlWithParams}
                            type="application/pdf"
                            className="w-full h-full absolute inset-0"
                            aria-label="Visor de PDF"
                        >
                            {/* Fallback for browsers without native PDF support */}
                            <div className="flex flex-col items-center justify-center h-full space-y-4 p-8 bg-[var(--color-surface-muted)] text-[var(--color-text-primary)]">
                                <p className="text-center">No se puede visualizar el PDF directamente.</p>
                                <a
                                    href={media.originalUrl || ''}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-md hover:opacity-90 transition-opacity"
                                >
                                    Abrir en nueva pestaña
                                </a>
                            </div>
                        </object>
                        {/* Expand button to open lightbox - centered at top */}
                        <button
                            onClick={() => setLightboxOpen(true)}
                            className="absolute top-3 left-1/2 -translate-x-1/2 z-10 px-4 py-2 bg-black/70 hover:bg-black/90 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
                            aria-label="Ver a pantalla completa"
                        >
                            <Maximize2 className="w-4 h-4" />
                            Pantalla completa
                        </button>
                    </div>
                    <SimpleLightbox
                        open={lightboxOpen}
                        onClose={() => setLightboxOpen(false)}
                        src={media.embedUrl}
                        alt={media.title}
                        type="pdf"
                    />
                </>
            );

        case MediaKind.UNKNOWN:
        default:
            return (
                <div className={`w-full bg-[var(--color-surface-muted)] border border-[var(--color-border-default)] rounded-lg p-4 ${className}`}>
                    <div className="flex items-center gap-3">
                        <LinkIcon className="w-5 h-5 text-ui/60 shrink-0" />
                        <div className="flex-1 min-w-0">
                            <p className="text-sm text-ui/80 break-all" title={media.originalUrl}>{media.originalUrl}</p>
                        </div>
                        <a
                            href={media.originalUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 shrink-0"
                            aria-label="Abrir enlace en nueva pestaña"
                        >
                            <ExternalLink className="w-4 h-4" />
                            Abrir
                        </a>
                    </div>
                </div>
            );
    }
}

interface MediaIconProps {
    url: string;
    className?: string;
}

/**
 * Icono según tipo de medio
 */
export function MediaIcon({ url, className = '' }: MediaIconProps) {
    const media = resolveMedia(url);

    const iconClass = `${className}`;

    switch (media.kind) {
        case MediaKind.YOUTUBE:
            return <Youtube className={iconClass} />;
        case MediaKind.VIMEO:
            return <FileVideo className={iconClass} />;
        case MediaKind.SOUNDCLOUD:
            return <Music className={iconClass} />;
        case MediaKind.DRIVE:
            return <FileText className={iconClass} />;
        case MediaKind.AUDIO:
            return <FileAudio className={iconClass} />;
        case MediaKind.VIDEO:
            return <FileVideo className={iconClass} />;
        case MediaKind.IMAGE:
            return <ImageIcon className={iconClass} />;
        case MediaKind.PDF:
            return <FileText className={iconClass} />;
        default:
            return <LinkIcon className={iconClass} />;
    }
}

/**
 * Label según tipo de medio
 */
export function getMediaLabel(url: string) {
    const media = resolveMedia(url);

    const labels: Record<string, string> = {
        [MediaKind.YOUTUBE]: 'YouTube',
        [MediaKind.VIMEO]: 'Vimeo',
        [MediaKind.SOUNDCLOUD]: 'SoundCloud',
        [MediaKind.DRIVE]: 'Google Drive',
        [MediaKind.AUDIO]: 'Audio',
        [MediaKind.VIDEO]: 'Video',
        [MediaKind.IMAGE]: 'Imagen',
        [MediaKind.PDF]: 'PDF',
        [MediaKind.UNKNOWN]: 'Enlace',
    };

    return labels[media.kind] || 'Enlace';
}
