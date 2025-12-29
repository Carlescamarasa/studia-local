import React from 'react';
import { useLocation } from 'react-router-dom';
import { Bug, Search, X } from 'lucide-react';
import { Button } from '@/features/shared/components/ui/button';

export default function SystemTopBar({
    isImpersonating,
    effectiveUser,
    effectiveRole,
    stopImpersonation,
    isMobile
}) {
    const location = useLocation();
    const isStudiaMode = location.pathname.startsWith('/studia');

    // Logic: Always show bar globally unless we are in Studia Mode (session).
    // The bar itself contains logic to show/hide content (impersonation info vs tools).
    const showBar = !isStudiaMode;

    if (!showBar) return null;

    const handleReportError = () => {
        window.dispatchEvent(new CustomEvent('open-error-report', { detail: {} }));
    };

    const handleToggleHardcodeList = () => {
        window.dispatchEvent(new CustomEvent('toggle-hardcode-inspector'));
    };

    // Styles reused from previous Impersonation Banner
    // Adjusted z-index to 300 to be above sidebar (z-200)
    // Sticky to push content down naturally? User said "fixed at top". 
    // If fixed, it overlaps content. But "mantenerse en la superior" implies fixed.
    // Let's try sticky first as it handles layout flow better, but z-index 300 might overlap sidebar.
    // If fixed, we need padding-top on body. Sticky is safer for now if we want it to push content.
    // But user said "mantenerse a pesar del scroll" -> Fixed/Sticky can both do this. Sticky stays at top of viewport if top-0.
    // However, sidebar is Fixed. If TopBar is Sticky inside a container, it might scroll away if the container scrolls?
    // In Layout.jsx, the content is in a div. 
    return (
        <>
            {/* Fixed Bar */}
            <div
                className="fixed top-0 left-0 right-0 z-[300] bg-amber-500 text-amber-950 px-3 py-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 shadow-md min-h-[40px]"
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
                    <div className="flex items-center gap-2 relative z-10">
                        {/* Separator if both sections present */}
                        {isImpersonating && <div className="h-4 w-px bg-amber-700/20 hidden sm:block" />}

                        {/* Reportar Error Button (Badge Style) */}
                        <button
                            type="button"
                            onClick={handleReportError}
                            className="flex items-center gap-1.5 px-3 py-1 bg-amber-100/50 hover:bg-amber-100 text-amber-900 text-xs font-medium rounded-xl transition-colors border border-amber-700/10 cursor-pointer active:scale-95"
                        >
                            <Bug className="w-3.5 h-3.5" />
                            <span>Reportar error</span>
                        </button>

                        {/* Hardcode Finder (ADMIN only) */}
                        {effectiveRole === 'ADMIN' && (
                            <button
                                type="button"
                                onClick={handleToggleHardcodeList}
                                className="flex items-center gap-1.5 px-3 py-1 bg-amber-100/50 hover:bg-amber-100 text-amber-900 text-xs font-medium rounded-xl transition-colors border border-amber-700/10 cursor-pointer active:scale-95"
                            >
                                <Search className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Hardcode Finder</span>
                                <span className="sm:hidden">HF</span>
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Spacer to push content down (since bar is fixed) */}
            <div className="h-[40px] w-full" aria-hidden="true" />
        </>
    );
}
