/**
 * AdminUpdateNotice - Fixed banner for ADMIN users when a new version is available
 */
import React from 'react';
import { useAdminUpdateNotice } from '@/hooks/useAdminUpdateNotice';
import { Button } from '@/components/ui/button';
import { RefreshCw, X, Zap } from 'lucide-react';

export default function AdminUpdateNotice() {
    const {
        isUpdateAvailable,
        serverVersion,
        localVersion,
        isChecking,
        dismiss,
        performUpdate,
    } = useAdminUpdateNotice();

    // Don't render anything if no update is available
    if (!isUpdateAvailable || !serverVersion) {
        return null;
    }

    return (
        <div
            className="fixed bottom-4 right-4 z-[100] max-w-sm animate-in slide-in-from-bottom-2 fade-in duration-300"
            role="alert"
            aria-live="polite"
        >
            <div className="bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-primary-hover)] text-white rounded-xl shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-4 pt-3 pb-2">
                    <div className="flex items-center gap-2">
                        <Zap className="w-5 h-5" />
                        <span className="font-semibold text-sm">Nueva versión disponible</span>
                    </div>
                    <button
                        onClick={dismiss}
                        className="p-1 hover:bg-white/20 rounded-full transition-colors"
                        aria-label="Cerrar aviso"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Content */}
                <div className="px-4 pb-3">
                    <p className="text-white/90 text-sm mb-1">
                        <span className="font-medium">{serverVersion.versionName}</span>
                        <span className="text-white/70 ml-1 text-xs font-mono">
                            ({serverVersion.commit})
                        </span>
                    </p>
                    {localVersion && (
                        <p className="text-white/60 text-xs">
                            Versión actual: {localVersion.versionName} ({localVersion.commit})
                        </p>
                    )}
                </div>

                {/* Actions */}
                <div className="flex gap-2 px-4 pb-4">
                    <Button
                        onClick={performUpdate}
                        size="sm"
                        className="flex-1 bg-white text-[var(--color-primary)] hover:bg-white/90 font-medium"
                    >
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Actualizar ahora
                    </Button>
                    <Button
                        onClick={dismiss}
                        size="sm"
                        variant="ghost"
                        className="text-white/80 hover:text-white hover:bg-white/10"
                    >
                        Más tarde
                    </Button>
                </div>
            </div>
        </div>
    );
}
