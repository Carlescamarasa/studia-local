import React, { useState, useEffect } from "react";
import { Badge } from "@/features/shared/components/ds/Badge";
import { ChevronDown, ChevronRight, Layers, Shuffle, Eye, Zap, Clock } from "lucide-react";
import { getSecuencia, ensureRondaIds } from "@/features/estudio/components/sessionSequence";
import { componentStyles } from "@/design/componentStyles";

export interface MediaItem {
    url: string;
    name?: string | null;
}

export interface Variation {
    id?: string;
    label?: string;
    mediaItems?: MediaItem[];
    assetUrl?: string;
    asset_url?: string;
    duracionSeg?: number;
    duracion_seg?: number;
}

export interface Bloque {
    code: string;
    id?: string;
    tipo: string;
    nombre: string;
    modo?: 'estudio' | 'repaso' | 'foco';
    duracionSeg?: number;
    duracion_seg?: number;
    variations?: Variation[];
    content?: Variation[];
}

export interface Ronda {
    id?: string;
    aleatoria?: boolean;
    repeticiones?: number;
    bloques: string[];
}

export interface Sesion {
    bloques?: Bloque[];
    rondas?: Ronda[];
    foco?: string;
}

interface SequenceItem {
    kind: 'BLOQUE' | 'RONDA';
    code?: string;
    id?: string;
}

interface SessionContentViewProps {
    sesion: Sesion | null;
    compact?: boolean;
    dbBloques?: Bloque[];
    semanaFoco?: string | null;
    expandedRondas?: Record<string, boolean> | null;
    onToggleRonda?: (roundId: string) => void;
}

const tipoColors: Record<string, string> = {
    CA: componentStyles.status.badgeDefault,
    CB: componentStyles.status.badgeInfo,
    TC: componentStyles.status.badgeDefault,
    TM: componentStyles.status.badgeSuccess,
    FM: componentStyles.status.badgeDefault,
    VC: componentStyles.status.badgeInfo,
    AD: componentStyles.status.badgeDefault,
};

const formatDuration = (seconds: number): string | null => {
    if (!seconds) return null;
    const min = Math.floor(seconds / 60);
    const seg = seconds % 60;
    if (seg === 0) return `${min} min`;
    return `${min}:${String(seg).padStart(2, '0')}`;
};

/**
 * Unified component to visualize session content.
 * Displays exercises and rounds interleaved according to sequence.
 * Rounds expanded by default.
 */
export default function SessionContentView({
    sesion,
    compact = false,
    dbBloques = [],
    semanaFoco = null,
    expandedRondas = null,
    onToggleRonda = undefined
}: SessionContentViewProps) {
    if (!sesion) return null;

    const S = ensureRondaIds(sesion);
    const secuencia = getSecuencia(S) as SequenceItem[];

    // Create bloquesMap with DB variations merged in
    const bloquesMap = new Map<string, Bloque & { duracionSeg: number }>();
    (S.bloques || []).forEach((b: Bloque) => {
        const dbBloque = dbBloques.find(db => db.code === b.code || db.id === b.id);
        const variations = dbBloque?.variations || dbBloque?.content || b.variations || [];
        const duracionSeg = dbBloque?.duracionSeg || dbBloque?.duracion_seg || b.duracionSeg || 0;
        bloquesMap.set(b.code, { ...b, variations, duracionSeg });
    });

    // Internal state for uncontrolled mode
    const [internalExpanded, setInternalExpanded] = useState<Record<string, boolean>>(() => {
        if (expandedRondas) return {};
        const expandedMap: Record<string, boolean> = {};
        const seq = getSecuencia(ensureRondaIds(sesion)) as SequenceItem[];
        seq.forEach((item) => {
            if (item.kind === "RONDA" && item.id) {
                expandedMap[item.id] = true;
            }
        });
        return expandedMap;
    });

    // Sync internal state if session changes and not controlled
    useEffect(() => {
        if (expandedRondas) return;
        const S = ensureRondaIds(sesion);
        const seq = getSecuencia(S) as SequenceItem[];
        const expandedMap: Record<string, boolean> = {};
        seq.forEach((item) => {
            if (item.kind === "RONDA" && item.id) {
                expandedMap[item.id] = true;
            }
        });
        setInternalExpanded(expandedMap);
    }, [sesion, expandedRondas]);

    const isControlled = expandedRondas !== null;
    const currentExpanded = isControlled ? expandedRondas : internalExpanded;

    const handleToggleRonda = (key: string, roundId?: string) => {
        if (isControlled && onToggleRonda) {
            onToggleRonda(roundId || key);
        } else {
            setInternalExpanded(prev => ({ ...prev, [key]: !prev[key] }));
        }
    };

    return (
        <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
                <Layers className="w-4 h-4 text-[var(--color-text-secondary)]" />
                <span>
                    {(S.bloques?.length || 0)} ejercicios totales • {(S.rondas?.length || 0)} rondas
                </span>
            </div>

            <div className="ml-2 space-y-1.5">
                {secuencia.map((item, idx) => {
                    if (item.kind === "BLOQUE") {
                        const ej = bloquesMap.get(item.code!);
                        if (!ej) {
                            return (
                                <div key={`miss-b-${idx}`} className={`text-xs text-[var(--color-danger)] p-1`}>
                                    ⚠️ Referencia huérfana: {item.code}
                                </div>
                            );
                        }

                        return (
                            <div key={`b-${item.code}-${idx}`} className={componentStyles.items.compactItem}>
                                <Badge variant="outline" className={`${tipoColors[ej.tipo]} rounded-full ${componentStyles.typography.compactText}`}>
                                    {ej.tipo}
                                </Badge>
                                {ej.modo === 'repaso' ? (
                                    <div className="flex items-center justify-center w-5 h-5 bg-purple-100 dark:bg-purple-900/30 rounded-full shrink-0" title="Modo Repaso">
                                        <Eye className="w-3 h-3 text-purple-600" />
                                    </div>
                                ) : ej.modo === 'foco' ? (
                                    <div className="flex items-center justify-center w-5 h-5 bg-amber-100 dark:bg-amber-900/30 rounded-full shrink-0" title="Modo Foco">
                                        <Zap className="w-3 h-3 text-amber-600" />
                                    </div>
                                ) : null}
                                {semanaFoco && S.foco !== semanaFoco && (
                                    <div className="flex items-center justify-center w-5 h-5 bg-purple-50 dark:bg-purple-900/20 rounded-full shrink-0" title="Modo Repaso">
                                        <Shuffle className="w-3 h-3 text-purple-500" />
                                    </div>
                                )}
                                <span className="flex-1 text-[var(--color-text-primary)] font-medium truncate">{ej.nombre}</span>

                                {ej.variations && ej.variations.length > 0 && (
                                    <span className="text-[10px] text-blue-500 bg-blue-50 dark:bg-blue-900/20 px-1.5 py-0.5 rounded-full font-medium" title={`${ej.variations.length} variaciones`}>
                                        {ej.variations.length} var
                                    </span>
                                )}

                                {ej.duracionSeg > 0 && (
                                    <span className={`text-[var(--color-text-secondary)] ${componentStyles.typography.compactTextTiny} flex items-center gap-0.5`}>
                                        <Clock className="w-3 h-3" />
                                        {formatDuration(ej.duracionSeg)}
                                    </span>
                                )}

                                <span className={`text-[var(--color-text-secondary)] ${componentStyles.typography.compactTextTiny} flex-shrink-0 ml-1`}>{ej.code}</span>
                            </div>
                        );
                    }

                    // Ronda
                    const r = (S.rondas || []).find((x: Ronda) => x.id === item.id);
                    if (!r) {
                        return (
                            <div key={`miss-r-${idx}`} className={`text-xs text-[var(--color-danger)] p-1`}>
                                ⚠️ Ronda no encontrada
                            </div>
                        );
                    }

                    const key = item.id || String(idx);
                    const isOpen = !!currentExpanded[key];

                    return (
                        <div key={`r-${key}`}>
                            <div
                                className={componentStyles.items.compactItemHover}
                                onClick={() => handleToggleRonda(key, item.id)}
                            >
                                <div className={`flex items-center ${componentStyles.layout.gapCompact} flex-shrink-0`}>
                                    {isOpen ? (
                                        <ChevronDown className="w-3 h-3 text-[var(--color-text-secondary)]" />
                                    ) : (
                                        <ChevronRight className="w-3 h-3 text-[var(--color-text-secondary)]" />
                                    )}
                                    <Badge variant="outline" className={`bg-[var(--color-primary)]/10 border-[var(--color-primary)]/30 text-[var(--color-primary)] rounded-full ${componentStyles.typography.compactText} font-semibold`}>
                                        RONDA
                                    </Badge>
                                </div>
                                <span className="flex-1 text-[var(--color-text-primary)] font-medium truncate">
                                    {r.aleatoria && <Shuffle className="w-3 h-3 inline mr-1 text-[var(--color-primary)]" />}
                                    × {r.repeticiones || 1} repeticiones ({r.bloques.length} ejercicios)
                                </span>
                            </div>

                            {isOpen && (
                                <div className="ml-2 mt-1.5 space-y-1">
                                    {r.bloques.map((codeOrBlock: string | any, j: number) => {
                                        const code = typeof codeOrBlock === 'string' ? codeOrBlock : codeOrBlock.code;
                                        const ej = bloquesMap.get(code); if (!ej) {
                                            return (
                                                <div key={`r-${key}-${j}`} className={`text-xs text-[var(--color-danger)] p-1 ml-2`}>
                                                    ⚠️ Referencia huérfana: {code}
                                                </div>
                                            );
                                        }

                                        return (
                                            <div key={`r-${key}-${code}-${j}`} className={`${componentStyles.items.compactItem} ml-2`}>
                                                <Badge variant="outline" className={`${componentStyles.typography.compactText} rounded-full ${tipoColors[ej.tipo]}`}>
                                                    {ej.tipo}
                                                </Badge>
                                                {ej.modo === 'repaso' ? (
                                                    <div className="flex items-center justify-center w-5 h-5 bg-purple-100 dark:bg-purple-900/30 rounded-full shrink-0" title="Modo Repaso">
                                                        <Eye className="w-3 h-3 text-purple-600" />
                                                    </div>
                                                ) : ej.modo === 'foco' ? (
                                                    <div className="flex items-center justify-center w-5 h-5 bg-amber-100 dark:bg-amber-900/30 rounded-full shrink-0" title="Modo Foco">
                                                        <Zap className="w-3 h-3 text-amber-600" />
                                                    </div>
                                                ) : null}
                                                <span className="flex-1 text-[var(--color-text-primary)] truncate">{ej.nombre}</span>

                                                {ej.variations && ej.variations.length > 0 && (
                                                    <span className="text-[10px] text-blue-500 bg-blue-50 dark:bg-blue-900/20 px-1.5 py-0.5 rounded-full font-medium" title={`${ej.variations.length} variaciones`}>
                                                        {ej.variations.length} var
                                                    </span>
                                                )}

                                                {ej.duracionSeg > 0 && (
                                                    <span className={`text-[var(--color-text-secondary)] ${componentStyles.typography.compactTextTiny} flex items-center gap-0.5`}>
                                                        <Clock className="w-3 h-3" />
                                                        {formatDuration(ej.duracionSeg)}
                                                    </span>
                                                )}

                                                <span className={`text-[var(--color-text-secondary)] ${componentStyles.typography.compactTextTiny} flex-shrink-0 ml-1`}>{ej.code}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
