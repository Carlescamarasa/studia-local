import React from "react";
import { Check, X } from "lucide-react";

interface EjercicioEjecucion {
    nombre: string;
    [key: string]: unknown;
}

interface ItinerarioMiniProps {
    /** Lista de ejercicios en la ejecución */
    listaEjecucion: EjercicioEjecucion[];
    /** Índice del ejercicio actual */
    indiceActual: number;
    /** Set de índices de ejercicios completados */
    completados: Set<number>;
    /** Set de índices de ejercicios omitidos */
    omitidos: Set<number>;
    /** Callback al navegar a un ejercicio */
    onNavegar: (idx: number) => void;
}

export default function ItinerarioMini({
    listaEjecucion,
    indiceActual,
    completados,
    omitidos,
    onNavegar
}: ItinerarioMiniProps) {
    return (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
            {listaEjecucion.map((ej, idx) => {
                const isActual = idx === indiceActual;
                const isCompletado = completados.has(idx);
                const isOmitido = omitidos.has(idx);

                return (
                    <button
                        key={idx}
                        onClick={() => onNavegar(idx)}
                        className={`shrink-0 relative rounded-full transition-all ${isActual
                                ? 'w-7 h-7 bg-[hsl(var(--brand-500))] ring-2 ring-[hsl(var(--brand-500))] ring-offset-2'
                                : isCompletado
                                    ? 'w-5 h-5 bg-[var(--color-success)] hover:bg-[var(--color-success)]/80'
                                    : isOmitido
                                        ? 'w-5 h-5 bg-[var(--color-border-default)] hover:bg-[var(--color-border-strong)]'
                                        : 'w-5 h-5 bg-[var(--color-surface-muted)] hover:bg-[var(--color-border-default)]'
                            }`}
                        title={`${idx + 1}. ${ej.nombre} ${isCompletado ? '(✓)' : isOmitido ? '(omitido)' : ''}`}
                        aria-label={`Ejercicio ${idx + 1}: ${ej.nombre}`}
                    >
                        {isCompletado && !isActual && (
                            <Check className="w-3 h-3 text-white absolute inset-0 m-auto" />
                        )}
                        {isOmitido && !isActual && (
                            <X className="w-3 h-3 text-white absolute inset-0 m-auto" />
                        )}
                    </button>
                );
            })}
        </div>
    );
}
