import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { createPortal } from 'react-dom';

export default function SimpleLightbox({ open, src, alt, onClose }) {
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

            {/* Image Container - Click stopPropagation to prevent closing when clicking the image */}
            <div
                className="relative max-w-[95vw] max-h-[90vh] flex items-center justify-center outline-none"
                onClick={(e) => e.stopPropagation()}
            >
                <img
                    src={src}
                    alt={alt || "Imagen a pantalla completa"}
                    className="max-w-full max-h-[90vh] w-auto h-auto object-contain rounded-sm shadow-2xl select-none"
                />
            </div>
        </div>,
        document.body
    );
}
