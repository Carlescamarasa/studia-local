
import React from 'react';
import { useDesign } from './DesignProvider';
import { useDesignDiff } from './useDesignDiff';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ds';
import { Sun, Moon, RotateCcw, Download } from 'lucide-react';
import { toast } from 'sonner';

export function DesignStatusBlock() {
    const { activeMode, setActiveMode, isPreviewActive, clearPreview } = useDesign();
    const { totalCount, hasChanges, downloadExport } = useDesignDiff();

    return (
        <div className="flex flex-col gap-4 mb-6 p-4 rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface)] shadow-sm">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="flex flex-col">
                        <span className="text-[10px] text-[var(--color-text-secondary)] uppercase tracking-wide font-bold">
                            Estado
                        </span>
                        <div className="flex items-center gap-2 mt-1">
                            {isPreviewActive ? (
                                <>
                                    <Badge className="bg-amber-500 hover:bg-amber-600 text-white border-none flex gap-1 items-center px-2 py-1">
                                        Preview Activo
                                    </Badge>
                                    <span className="text-sm font-medium text-[var(--color-text-primary)]">
                                        ({totalCount} cambios)
                                    </span>
                                </>
                            ) : (
                                <Badge variant="outline" className="text-[var(--color-text-secondary)] border-[var(--color-border-default)] bg-transparent px-2 py-1">
                                    Base (Sin cambios)
                                </Badge>
                            )}
                        </div>
                    </div>

                    {/* Mode Switcher */}
                    <div className="flex items-center gap-1 bg-[var(--color-surface-muted)] p-1 rounded-lg border border-[var(--color-border-muted)] ml-6">
                        <Button
                            variant={activeMode === 'light' ? 'default' : 'ghost'}
                            size="sm"
                            onClick={() => setActiveMode('light')}
                            className={`h-7 px-2 gap-1.5 text-xs ${activeMode === 'light' ? 'bg-white text-black shadow-sm dark:bg-slate-200' : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'}`}
                            title="Modo Claro"
                        >
                            <Sun className="w-3.5 h-3.5" />
                            Light
                        </Button>
                        <Button
                            variant={activeMode === 'dark' ? 'default' : 'ghost'}
                            size="sm"
                            onClick={() => setActiveMode('dark')}
                            className={`h-7 px-2 gap-1.5 text-xs ${activeMode === 'dark' ? 'bg-slate-800 text-white shadow-sm dark:bg-slate-700' : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'}`}
                            title="Modo Oscuro"
                        >
                            <Moon className="w-3.5 h-3.5" />
                            Dark
                        </Button>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {isPreviewActive && (
                        <>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                    if (window.confirm('¿Seguro que quieres salir del preview? Se perderán los cambios no guardados.')) {
                                        clearPreview();
                                        toast.info('Preview cancelado');
                                    }
                                }}
                                className="h-9 gap-2 text-[var(--color-danger)] border-[var(--color-danger)]/20 hover:bg-[var(--color-danger)]/5 hover:text-[var(--color-danger)]"
                            >
                                <RotateCcw className="w-4 h-4" />
                                Salir del preview
                            </Button>
                            <Button
                                variant="default"
                                size="sm"
                                onClick={() => {
                                    downloadExport();
                                    toast.success('Informe exportado correctamente');
                                }}
                                className="h-9 gap-2 btn-primary"
                            >
                                <Download className="w-4 h-4" />
                                Exportar informe
                            </Button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
