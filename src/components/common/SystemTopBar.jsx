import React from 'react';
import { useLocation } from 'react-router-dom';
import { Bug, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function SystemTopBar({
    isImpersonating,
    effectiveUser,
    effectiveRole,
    stopImpersonation,
    isMobile
}) {
    const location = useLocation();
    const isStudiaMode = location.pathname.startsWith('/hoy');

    // Logic: Show bar if Impersonating OR (Mobile AND NOT Studia Mode)
    // In Studia Mode, we use the header icon instead of this bar.
    // Exception: Impersonation banner must always be visible if active.
    const showBar = isImpersonating || (isMobile && !isStudiaMode);

    if (!showBar) return null;

    const handleReportError = () => {
        window.dispatchEvent(new CustomEvent('open-error-report', { detail: {} }));
    };

    const handleToggleHardcodeList = () => {
        window.dispatchEvent(new CustomEvent('toggle-hardcode-inspector'));
    };

    // Styles reused from previous Impersonation Banner
    // Adjusted z-index to 60 (below Sidebar z-90, Overlay z-80)
    // Sticky to push content down naturally
    return (
        <div
            className="sticky top-0 left-0 right-0 z-[60] bg-amber-500 text-amber-950 px-3 py-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 shadow-md min-h-[40px]"
            role="banner"
        >
            {/* Impersonation Info */}
            {isImpersonating && (
                <div className="flex items-center gap-2">
                    <span className="text-sm font-medium whitespace-nowrap">
                        👁️ <span className="hidden sm:inline">Viendo como:</span> <strong>{effectiveUser?.full_name || 'Usuario'}</strong>
                        <span className="opacity-75 text-xs ml-1">({effectiveRole})</span>
                    </span>
                    <button
                        onClick={() => {
                            stopImpersonation();
                            window.location.reload();
                        }}
                        className="px-2 py-0.5 bg-amber-700 hover:bg-amber-800 text-white text-xs font-semibold rounded flex items-center gap-1 transition-colors"
                        title="Salir de la suplantación"
                    >
                        <X className="w-3 h-3" />
                        <span className="sm:inline">Salir</span>
                    </button>
                </div>
            )}

            {/* Tools Section - Hide in Studia Mode (we use header icon there) */}
            {!isStudiaMode && (
                <div className="flex items-center gap-2">
                    {/* Separator if both sections present */}
                    {isImpersonating && <div className="h-4 w-px bg-amber-700/20 hidden sm:block" />}

                    {/* Reportar Error Button (Badge Style) */}
                    <button
                        onClick={handleReportError}
                        className="flex items-center gap-1.5 px-3 py-1 bg-amber-100/50 hover:bg-amber-100 text-amber-900 text-xs font-medium rounded-full transition-colors border border-amber-700/10"
                    >
                        <Bug className="w-3.5 h-3.5" />
                        <span>Reportar error</span>
                    </button>

                    {/* Hardcode Finder (ADMIN only) */}
                    {effectiveRole === 'ADMIN' && (
                        <button
                            onClick={handleToggleHardcodeList}
                            className="flex items-center gap-1.5 px-3 py-1 bg-amber-100/50 hover:bg-amber-100 text-amber-900 text-xs font-medium rounded-full transition-colors border border-amber-700/10"
                        >
                            <Search className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Hardcode Finder</span>
                            <span className="sm:hidden">HF</span>
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
