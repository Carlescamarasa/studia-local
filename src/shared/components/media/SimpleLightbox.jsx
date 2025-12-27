import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { createPortal } from 'react-dom';

export default function SimpleLightbox({ open, src, alt, onClose, type = 'image' }) {
    // Block scroll when open
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

    // Handle ESC key
    useEffect(() => {
        if (!open) return;
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [open, onClose]);

    if (!open || !src) return null;

    const isPdf = type === 'pdf';

    return createPortal(
        <div
            className="fixed inset-0 z-[9999] bg-black/90 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={onClose}
        >
            {/* Close button - Top Right */}
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    onClose();
                }}
                className="absolute top-4 right-4 text-white/70 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors z-[10000]"
                aria-label="Cerrar"
            >
                <X className="w-8 h-8" />
            </button>

            {/* Content Container */}
            <div
                className={`relative flex items-center justify-center outline-none ${isPdf
                        ? 'w-full h-full max-w-[95vw] max-h-[90vh] bg-white rounded-lg shadow-2xl p-0 overflow-hidden'
                        : 'max-w-[95vw] max-h-[90vh]'
                    }`}
                onClick={(e) => e.stopPropagation()}
            >
                {isPdf ? (
                    <object
                        data={src}
                        type="application/pdf"
                        className="w-full h-full rounded-lg"
                    >
                        {/* Fallback for PDF embedding failure */}
                        <div className="flex flex-col items-center justify-center h-full space-y-4 p-8 bg-[var(--color-surface)] text-[var(--color-text-primary)]">
                            <p className="text-center">No se puede visualizar el PDF directamente.</p>
                            <a
                                href={src}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-md hover:opacity-90 transition-opacity"
                            >
                                Abrir en nueva pestaña
                            </a>
                        </div>
                    </object>
                ) : (
                    <img
                        src={src}
                        alt={alt || "Imagen a pantalla completa"}
                        className="max-w-full max-h-[90vh] w-auto h-auto object-contain rounded-sm shadow-2xl select-none"
                    />
                )}
            </div>
        </div>,
        document.body
    );
}
