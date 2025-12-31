/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/features/shared/components/ui/button';
import { ChevronLeft, ChevronRight, ExternalLink, X } from 'lucide-react';
import MediaEmbed, { getMediaLabel } from './MediaEmbed';
import { resolveMedia } from '@/features/shared/utils/media';
import { useSidebar } from '@/features/shared/components/ui/SidebarState';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/features/shared/components/ui/select';
import { componentStyles } from '@/design/componentStyles';

/**
 * Normaliza media links: acepta strings u objetos con url/href/link
 */
function normalizeMediaLinks(rawLinks: any[]): string[] {
    if (!rawLinks || !Array.isArray(rawLinks)) return [];
    return rawLinks
        .map((raw) => {
            if (typeof raw === 'string') return raw;
            if (raw && typeof raw === 'object' && raw.url) return raw.url;
            if (raw && typeof raw === 'object' && raw.href) return raw.href;
            if (raw && typeof raw === 'object' && raw.link) return raw.link;
            return '';
        })
        .filter((url): url is string => typeof url === 'string' && url.length > 0);
}

interface MediaPreviewModalProps {
    urls?: any[];
    initialIndex?: number;
    open: boolean;
    onClose: () => void;
}

/**
 * Modal con carrusel para previsualizar medios
 * Soporta navegación con teclado (flechas, Ctrl/⌘+. para cerrar)
 * Se ajusta al ancho disponible respetando el sidebar
 * Modo compacto para audio con control de velocidad
 */
export default function MediaPreviewModal({ urls = [], initialIndex = 0, open, onClose }: MediaPreviewModalProps) {
    // Normalizar URLs al recibirlas
    const normalizedUrls = normalizeMediaLinks(urls);

    const [currentIndex, setCurrentIndex] = useState(initialIndex);
    const { abierto } = useSidebar();
    const [isMobile, setIsMobile] = useState(false);
    const [playbackRate, setPlaybackRate] = useState(() => {
        const saved = typeof localStorage !== 'undefined' ? localStorage.getItem('media.playbackRate') : null;
        return saved ? parseFloat(saved) : 1.0;
    });
    const audioRef = useRef<HTMLAudioElement>(null);

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

    const handlePrevious = () => {
        setCurrentIndex((prev) => (prev > 0 ? prev - 1 : normalizedUrls.length - 1));
    };

    const handleNext = () => {
        setCurrentIndex((prev) => (prev < normalizedUrls.length - 1 ? prev + 1 : 0));
    };

    // Keyboard navigation
    useEffect(() => {
        if (!open) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            // Ctrl/⌘+. para cerrar
            if ((e.metaKey || e.ctrlKey) && e.key === '.') {
                e.preventDefault();
                onClose?.();
                return;
            }

            // Flechas para navegación (solo si hay múltiples y NO es audio)
            const currentUrl = normalizedUrls[currentIndex] || '';
            const media = resolveMedia(currentUrl);
            const isAudio = media.kind === 'audio';

            if (!isAudio && normalizedUrls.length > 1) {
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, currentIndex, normalizedUrls.length]);

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

    if (!normalizedUrls || normalizedUrls.length === 0 || !open) return null;

    const currentUrl = normalizedUrls[currentIndex] || '';
    const media = resolveMedia(currentUrl);
    const hasMultiple = normalizedUrls.length > 1;
    const isAudio = media.kind === 'audio';

    const handleOpenExternal = () => {
        if (media.originalUrl) {
            window.open(media.originalUrl, '_blank', 'noopener,noreferrer');
        }
    };

    // Usamos onPointerUp en lugar de onClick porque:
    // 1. stopPropagation en pointerdown (necesario para prevenir que Radix cierre el modal padre)
    //    rompe el ciclo pointerdown → pointerup → click, haciendo que onClick nunca se dispare
    // 2. onPointerUp se dispara DESPUÉS de pointerdown, así que no hay conflicto
    // 3. Verificamos que el pointerup ocurrió en el overlay mismo (no en hijos)
    const handleOverlayPointerUp = (e: React.PointerEvent) => {
        // Solo cerrar si el pointerup fue directamente en el overlay
        if (e.target === e.currentTarget) {
            e.stopPropagation();
            onClose?.();
        }
    };

    const handlePlaybackRateChange = (value: string) => {
        const rate = parseFloat(value);
        setPlaybackRate(rate);
        localStorage.setItem('media.playbackRate', rate.toString());
    };

    // Modo AUDIO compacto
    if (isAudio) {
        return createPortal(
            <>
                {/* Overlay transparente para audio - Fixed para cubrir toda la pantalla */}
                <div
                    className="fixed inset-0 w-full h-full bg-transparent z-[110] pointer-events-auto left-0 top-0"
                    onPointerDown={(e) => e.stopPropagation()}
                    onPointerUp={handleOverlayPointerUp}
                    data-prevent-outside-close="true"
                    aria-hidden="true"
                />
                <div
                    className="fixed inset-0 z-[115] flex items-center justify-center pointer-events-none"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="media-preview-title"
                >

                    {/* Tarjeta compacta para audio */}
                    <div className="relative z-10 mx-auto w-full max-w-md px-4 pointer-events-auto" data-prevent-outside-close="true">
                        <div className="bg-[var(--color-surface-elevated)]/95 backdrop-blur-sm rounded-2xl shadow-card border border-[var(--color-border-default)] p-6">
                            {/* Header */}
                            <div className="flex items-center justify-between gap-4 mb-4">
                                <h2 id="media-preview-title" className={`font-semibold text-base truncate flex-1 ${componentStyles.typography.cardTitle}`}>
                                    {getMediaLabel(currentUrl)}
                                </h2>
                                <div className="flex items-center gap-2 shrink-0">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={handleOpenExternal}
                                        className="text-[var(--color-info)] hover:text-[var(--color-info)]/80 h-8 rounded-xl"
                                        aria-label="Abrir en nueva pestaña"
                                    >
                                        <ExternalLink className="w-4 h-4" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={onClose}
                                        className="h-8 w-8 rounded-xl text-[var(--color-text-primary)] hover:bg-[var(--color-surface-muted)]"
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
                                    <label className={`text-sm font-medium shrink-0 ${componentStyles.typography.smallMetaText} text-[var(--color-text-primary)]`}>
                                        Velocidad:
                                    </label>
                                    <div className="flex gap-1 flex-wrap">
                                        {[0.5, 0.75, 1, 1.25, 1.5, 2].map((rate) => (
                                            <button
                                                key={rate}
                                                onClick={() => handlePlaybackRateChange(rate.toString())}
                                                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${playbackRate === rate
                                                    ? 'bg-[var(--color-primary)] text-[var(--color-text-inverse)] shadow-sm'
                                                    : 'bg-[var(--color-surface-muted)] text-[var(--color-text-primary)] hover:bg-[var(--color-border-default)]/20'
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
                            <div className="mt-4 text-center border-t border-[var(--color-border-default)] pt-3">
                                <p className="text-xs text-[var(--color-text-secondary)]">
                                    Ctrl/⌘+. : cerrar
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </>,
            document.body
        );
    }

    // Modo VIDEO/IMAGEN (fondo oscuro)
    return createPortal(
        <>
            {/* Overlay oscuro para video/imagen - Fixed para cubrir toda la pantalla */}
            <div
                className="fixed inset-0 w-full h-full bg-black/60 backdrop-blur-sm z-[110] pointer-events-auto left-0 top-0"
                onPointerDown={(e) => e.stopPropagation()}
                onPointerUp={handleOverlayPointerUp}
                data-prevent-outside-close="true"
                aria-hidden="true"
            />
            <div
                className="fixed inset-0 z-[115] flex items-center justify-center pointer-events-none"
                role="dialog"
                aria-modal="true"
                aria-labelledby="media-preview-title"
            >

                {/* Contenedor del modal */}
                <div className="relative z-10 mx-auto w-full max-w-[1100px] px-4 lg:px-6 flex items-center justify-center max-h-[95vh] pointer-events-auto" data-prevent-outside-close="true">
                    <div className="bg-[var(--color-surface-elevated)] rounded-2xl shadow-card w-full max-h-full overflow-hidden flex flex-col border border-[var(--color-border-default)]">
                        {/* Header con título y botón de cierre */}
                        <div className="px-4 lg:px-6 py-4 border-b border-[var(--color-border-default)] bg-[var(--color-surface-elevated)] sticky top-0 z-20 flex items-center justify-between gap-4 shrink-0">
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                                <h2 id="media-preview-title" className={`font-semibold text-base lg:text-lg truncate ${componentStyles.typography.cardTitle}`}>
                                    {getMediaLabel(currentUrl)}
                                </h2>
                                {hasMultiple && (
                                    <span className="text-xs lg:text-sm text-[var(--color-text-secondary)] whitespace-nowrap">
                                        {currentIndex + 1} de {urls.length}
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleOpenExternal}
                                    className="text-[var(--color-info)] hover:text-[var(--color-info)]/80 h-8 rounded-xl"
                                    aria-label="Abrir en nueva pestaña"
                                >
                                    <ExternalLink className="w-4 h-4 mr-1" />
                                    <span className="hidden sm:inline">Abrir</span>
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={onClose}
                                    className="h-8 w-8 rounded-xl text-[var(--color-text-primary)] hover:bg-[var(--color-surface-muted)]"
                                    aria-label="Cerrar"
                                >
                                    <X className="w-5 h-5" />
                                </Button>
                            </div>
                        </div>

                        {/* Contenido del medio */}
                        <div className="relative flex-1 overflow-y-auto">
                            <div className="p-4 lg:p-6">
                                {/* Medio */}
                                <div className="w-full">
                                    <MediaEmbed url={currentUrl} />
                                </div>
                            </div>

                            {/* Navegación e indicadores (si hay múltiples) */}
                            {hasMultiple && (
                                <div className="px-4 lg:px-6 pb-2 border-t border-[var(--color-border-default)] pt-2">
                                    <div className="flex items-center justify-center gap-2">
                                        {/* Botón Anterior */}
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={handlePrevious}
                                            className="h-7 w-7 rounded-md"
                                            aria-label="Anterior"
                                        >
                                            <ChevronLeft className="w-3.5 h-3.5" />
                                        </Button>

                                        {/* Indicadores */}
                                        {normalizedUrls.length <= 10 && (
                                            <div className="flex gap-1 items-center">
                                                {normalizedUrls.map((_, idx) => (
                                                    <button
                                                        key={idx}
                                                        onClick={() => setCurrentIndex(idx)}
                                                        className={`h-1 rounded-full transition-all ${idx === currentIndex
                                                            ? 'bg-[var(--color-primary)] w-5'
                                                            : 'bg-[var(--color-border-default)] hover:bg-[var(--color-border-strong)] w-1'
                                                            }`}
                                                        aria-label={`Ir a medio ${idx + 1}`}
                                                    />
                                                ))}
                                            </div>
                                        )}

                                        {/* Botón Siguiente */}
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={handleNext}
                                            className="h-7 w-7 rounded-md"
                                            aria-label="Siguiente"
                                        >
                                            <ChevronRight className="w-3.5 h-3.5" />
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {/* Ayuda de teclado */}
                            <div className="px-4 lg:px-6 pb-4 text-center">
                                <p className="text-xs text-[var(--color-text-secondary)]">
                                    {hasMultiple && 'Usa las flechas ← → para navegar • '}Ctrl/⌘+. : cerrar
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>,
        document.body
    );
}
