/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useState } from 'react';
import { useDesign } from './DesignProvider';
import { useDesignDiff } from './useDesignDiff';
import { Button } from '@/features/shared/components/ui/button';
import { Badge } from '@/features/shared/components/ds';
import { Sun, Moon, RotateCcw, Download, ChevronDown, ChevronUp, X, Copy } from 'lucide-react';
import { toast } from 'sonner';

interface DesignStatusBlockProps {
    activeTab: string;
    onTabChange: (tab: string) => void;
    tabs: { value: string; label: string }[];
}

interface DiffChange {
    path: string;
    from: any;
    to: any;
}

export function DesignStatusBlock({ activeTab, onTabChange, tabs }: DesignStatusBlockProps) {
    const { activeMode, setActiveMode, isPreviewActive, clearPreview } = useDesign();
    const { totalCount, hasChanges, downloadExport, diff, revertChange } = useDesignDiff();
    const [showChanges, setShowChanges] = useState(false);

    // Safe access to diff arrays
    const common = diff?.common || [];
    const light = diff?.light || [];
    const dark = diff?.dark || [];

    return (
        <div className="mb-6 rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface)] shadow-sm overflow-hidden">
            {/* Main Status Bar */}
            <div className="flex flex-wrap items-center justify-between gap-4 p-2 pl-4">
                {/* Left: Status & Toggle */}
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-3">
                        <span className="text-[10px] text-[var(--color-text-secondary)] uppercase tracking-wide font-bold">
                            Estado
                        </span>
                        <div className="flex items-center gap-2">
                            {isPreviewActive ? (
                                <>
                                    <Badge className="bg-amber-500 hover:bg-amber-600 text-white border-none flex gap-1 items-center px-2 py-0.5 text-xs">
                                        Preview Activo
                                    </Badge>
                                    <button
                                        type="button"
                                        onClick={() => setShowChanges(!showChanges)}
                                        className="text-xs font-medium text-[var(--color-text-primary)] hover:text-[var(--color-primary)] flex items-center gap-1 cursor-pointer"
                                    >
                                        ({totalCount} cambios)
                                        {showChanges ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                    </button>
                                </>
                            ) : (
                                <Badge variant="outline" className="text-[var(--color-text-secondary)] border-[var(--color-border-default)] bg-transparent px-2 py-0.5 text-xs">
                                    Base
                                </Badge>
                            )}
                        </div>
                    </div>

                    {/* Mode Switcher - Icon Only Segmented Toggle */}
                    <div className="flex items-center gap-1 bg-[var(--color-surface-muted)] p-1 rounded-full border border-[var(--color-border-muted)]">
                        <button
                            type="button"
                            onClick={() => {
                                console.log('[DesignStatusBlock] Toggle to light, current:', activeMode);
                                setActiveMode('light');
                            }}
                            className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${activeMode === 'light'
                                ? 'bg-[var(--color-surface)] text-amber-500 shadow-sm border border-[var(--color-border-muted)]'
                                : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'}`}
                            title="Modo Claro"
                        >
                            <Sun className="w-4 h-4" />
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                console.log('[DesignStatusBlock] Toggle to dark, current:', activeMode);
                                setActiveMode('dark');
                            }}
                            className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${activeMode === 'dark'
                                ? 'bg-[var(--color-surface)] text-indigo-400 shadow-sm border border-[var(--color-border-muted)]'
                                : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'}`}
                            title="Modo Oscuro"
                        >
                            <Moon className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Center: Tabs */}
                <div className="bg-[var(--color-surface-muted)] p-1 rounded-lg border border-[var(--color-border-muted)] flex items-center gap-1">
                    {tabs && tabs.map(tab => (
                        <button
                            key={tab.value}
                            onClick={() => onTabChange && onTabChange(tab.value)}
                            className={`px-4 py-1.5 rounded-md text-xs font-medium transition-all ${activeTab === tab.value
                                ? 'bg-[var(--color-surface)] text-[var(--color-text-primary)] shadow-sm border border-[var(--color-border-default)]'
                                : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface)]/50'}`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-2">
                    {isPreviewActive && (
                        <>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                    clearPreview();
                                    toast.info('Preview cancelado');
                                }}
                                className="h-8 text-xs gap-2 text-[var(--color-danger)] border-[var(--color-danger)]/20 hover:bg-[var(--color-danger)]/5 hover:text-[var(--color-danger)]"
                            >
                                <RotateCcw className="w-3.5 h-3.5" />
                                Salir
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                    const text = [
                                        common.length > 0 && `Comunes (${common.length}):\n${common.map((c: DiffChange) => `  ${c.path}: ${c.to}`).join('\n')}`,
                                        light.length > 0 && `Solo Light (${light.length}):\n${light.map((c: DiffChange) => `  ${c.path}: ${c.to}`).join('\n')}`,
                                        dark.length > 0 && `Solo Dark (${dark.length}):\n${dark.map((c: DiffChange) => `  ${c.path}: ${c.to}`).join('\n')}`
                                    ].filter(Boolean).join('\n\n');
                                    navigator.clipboard.writeText(text);
                                    toast.success('Cambios copiados al portapapeles');
                                }}
                                className="h-8 text-xs gap-2"
                            >
                                <Copy className="w-3.5 h-3.5" />
                                Copiar
                            </Button>
                            <Button
                                variant="default"
                                size="sm"
                                onClick={() => {
                                    downloadExport(diff, `design-export-${new Date().toISOString()}.json`);
                                    toast.success('Informe exportado correctamente');
                                }}
                                className="h-8 text-xs gap-2 btn-primary"
                            >
                                <Download className="w-3.5 h-3.5" />
                                Exportar
                            </Button>
                        </>
                    )}
                </div>
            </div>

            {/* Collapsible Changes Panel - with smooth transition */}
            {isPreviewActive && hasChanges && (
                <div
                    className={`bg-[var(--color-surface-muted)] overflow-hidden transition-all duration-200 ease-out ${showChanges ? 'border-t border-[var(--color-border-default)]' : ''}`}
                    style={{
                        display: 'grid',
                        gridTemplateRows: showChanges ? '1fr' : '0fr',
                    }}
                >
                    <div className="min-h-0 p-4" style={{ visibility: showChanges ? 'visible' : 'hidden' }}>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                            {/* Common changes */}
                            <div>
                                <div className="font-semibold text-[var(--color-text-primary)] mb-2 flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                                    Comunes ({common.length})
                                </div>
                                {common.length > 0 ? (
                                    <ul className="space-y-1 text-[var(--color-text-secondary)] max-h-40 overflow-y-auto">
                                        {common.map((c: DiffChange, i: number) => (
                                            <li key={i} className="flex items-center justify-between gap-2 group">
                                                <span className="truncate font-mono text-[11px]">
                                                    {c.path}: {String(c.to).slice(0, 20)}
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => revertChange(c.path, 'common')}
                                                    className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-[var(--color-danger)]/10 text-[var(--color-danger)] transition-opacity shrink-0"
                                                    title="Deshacer cambio"
                                                >
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="text-[var(--color-text-muted)] italic">Sin cambios</p>
                                )}
                            </div>

                            {/* Light-only changes */}
                            <div>
                                <div className="font-semibold text-[var(--color-text-primary)] mb-2 flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                                    Solo Light ({light.length})
                                </div>
                                {light.length > 0 ? (
                                    <ul className="space-y-1 text-[var(--color-text-secondary)] max-h-40 overflow-y-auto">
                                        {light.map((c: DiffChange, i: number) => (
                                            <li key={i} className="flex items-center justify-between gap-2 group">
                                                <span className="truncate font-mono text-[11px]">
                                                    {c.path}: {String(c.to).slice(0, 20)}
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => revertChange(c.path, 'light')}
                                                    className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-[var(--color-danger)]/10 text-[var(--color-danger)] transition-opacity shrink-0"
                                                    title="Deshacer cambio"
                                                >
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="text-[var(--color-text-muted)] italic">Sin cambios</p>
                                )}
                            </div>

                            {/* Dark-only changes */}
                            <div>
                                <div className="font-semibold text-[var(--color-text-primary)] mb-2 flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-indigo-400"></span>
                                    Solo Dark ({dark.length})
                                </div>
                                {dark.length > 0 ? (
                                    <ul className="space-y-1 text-[var(--color-text-secondary)] max-h-40 overflow-y-auto">
                                        {dark.map((c: DiffChange, i: number) => (
                                            <li key={i} className="flex items-center justify-between gap-2 group">
                                                <span className="truncate font-mono text-[11px]">
                                                    {c.path}: {String(c.to).slice(0, 20)}
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => revertChange(c.path, 'dark')}
                                                    className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-[var(--color-danger)]/10 text-[var(--color-danger)] transition-opacity shrink-0"
                                                    title="Deshacer cambio"
                                                >
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="text-[var(--color-text-muted)] italic">Sin cambios</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
