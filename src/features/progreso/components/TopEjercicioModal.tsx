import React, { useMemo } from "react";
import { Button } from "@/features/shared/components/ds/Button";
import { X, Calendar, Clock, TrendingUp, FileText } from "lucide-react";
import { componentStyles } from "@/design/componentStyles";
import { formatDuracionHM, formatLocalDate, parseLocalDate } from "../utils/progresoUtils";
import { Badge } from "@/features/shared/components/ds";

const tipoLabels: Record<string, string> = {
    CA: 'Calentamiento A',
    CB: 'Calentamiento B',
    TC: 'Técnica',
    FM: 'Fragmento Musical',
    VC: 'Vuelta a la Calma',
    AD: 'Aviso/Descanso',
};

const tipoColors: Record<string, string> = {
    CA: 'bg-blue-100 text-blue-800 border-blue-300',
    CB: 'bg-blue-200 text-blue-900 border-blue-400',
    TC: 'bg-purple-100 text-purple-800 border-purple-300',
    FM: 'bg-green-100 text-green-800 border-green-300',
    VC: 'bg-orange-100 text-orange-800 border-orange-300',
    AD: 'bg-red-100 text-red-800 border-red-300',
};

/**
 * TopEjercicioModal - Modal de detalle para un ejercicio del Top
 */
export interface TopEjercicioModalProps {
    ejercicio: any | null;
    onClose: () => void;
    bloquesFiltrados?: any[];
    registrosFiltrados?: any[];
}

export default function TopEjercicioModal({
    ejercicio,
    onClose,
    bloquesFiltrados = [],
    registrosFiltrados = [],
}: TopEjercicioModalProps) {
    const estadisticas = useMemo(() => {
        if (!ejercicio) return null;

        // Filtrar bloques de este ejercicio
        const bloquesEjercicio = bloquesFiltrados.filter(b =>
            b.code === ejercicio.code &&
            b.nombre === ejercicio.nombre &&
            b.tipo === ejercicio.tipo
        );

        if (bloquesEjercicio.length === 0) return null;

        // Fechas primera y última vez practicado
        const fechasISO = bloquesEjercicio
            .map(b => b.inicioISO)
            .filter((iso): iso is string => !!iso)
            .sort();

        const primeraFecha = fechasISO.length > 0 ? fechasISO[0] : null;
        const ultimaFecha = fechasISO.length > 0 ? fechasISO[fechasISO.length - 1] : null;

        // Agrupar por semana para distribución temporal
        const porSemana: Record<string, { semana: string; sesiones: number; tiempo: number }> = {};
        bloquesEjercicio.forEach(b => {
            if (!b.inicioISO) return;
            const fecha = new Date(b.inicioISO);
            const fechaLocal = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
            const lunes = new Date(fechaLocal);
            lunes.setDate(lunes.getDate() - (fechaLocal.getDay() === 0 ? 6 : fechaLocal.getDay() - 1));
            const semanaKey = formatLocalDate(lunes);

            if (!porSemana[semanaKey]) {
                porSemana[semanaKey] = {
                    semana: semanaKey,
                    sesiones: 0,
                    tiempo: 0,
                };
            }

            porSemana[semanaKey].sesiones += 1;
            porSemana[semanaKey].tiempo += b.duracionRealSeg || 0;
        });

        const distribucionSemanas = Object.values(porSemana)
            .sort((a, b) => a.semana.localeCompare(b.semana))
            .map(item => ({
                ...item,
                tiempo: Math.round(item.tiempo / 60), // en minutos
            }));

        return {
            bloquesEjercicio,
            primeraFecha,
            ultimaFecha,
            distribucionSemanas,
        };
    }, [ejercicio, bloquesFiltrados]);

    if (!ejercicio || !estadisticas) return null;

    return (
        <>
            {/* Overlay */}
            <div
                className="fixed inset-0 bg-black/40 z-[100]"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="fixed inset-0 z-[110] flex items-center justify-center pointer-events-none p-4 overflow-y-auto">
                <div
                    className="bg-[var(--color-surface-elevated)] w-full max-w-2xl max-h-[90vh] shadow-card rounded-2xl flex flex-col pointer-events-auto my-4 border border-[var(--color-border-default)]"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="border-b border-[var(--color-border-default)] bg-[var(--color-surface-muted)] rounded-t-2xl px-6 py-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <FileText className="w-6 h-6 text-[var(--color-primary)]" />
                                <div>
                                    <h2 className="text-xl font-bold text-[var(--color-text-primary)] font-headings">
                                        {ejercicio.nombre}
                                    </h2>
                                    <p className="text-sm text-[var(--color-text-secondary)] mt-0.5">
                                        {ejercicio.code}
                                    </p>
                                </div>
                            </div>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={onClose}
                                className="text-[var(--color-text-primary)] hover:bg-[var(--color-surface)] h-11 w-11 rounded-xl"
                                aria-label="Cerrar modal"
                            >
                                <X className="w-5 h-5" />
                            </Button>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-6">
                        {/* Tipo */}
                        <div>
                            <Badge className={`rounded-full ${tipoColors[ejercicio.tipo] || 'bg-gray-100 text-gray-800'}`}>
                                {ejercicio.tipo} - {tipoLabels[ejercicio.tipo] || ejercicio.tipo}
                            </Badge>
                        </div>

                        {/* Métricas principales */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                            <div className="text-center p-3 bg-[var(--color-surface-muted)] rounded-lg">
                                <Clock className="w-5 h-5 mx-auto mb-2 text-[var(--color-primary)]" />
                                <p className="text-lg font-bold text-[var(--color-text-primary)]">
                                    {formatDuracionHM(ejercicio.tiempoTotal)}
                                </p>
                                <p className="text-xs text-[var(--color-text-secondary)]">Tiempo total</p>
                            </div>

                            <div className="text-center p-3 bg-[var(--color-surface-muted)] rounded-lg">
                                <TrendingUp className="w-5 h-5 mx-auto mb-2 text-[var(--color-info)]" />
                                <p className="text-lg font-bold text-[var(--color-text-primary)]">
                                    {ejercicio.sesionesCount}
                                </p>
                                <p className="text-xs text-[var(--color-text-secondary)]">Sesiones</p>
                            </div>

                            {estadisticas.primeraFecha && (
                                <div className="text-center p-3 bg-[var(--color-surface-muted)] rounded-lg">
                                    <Calendar className="w-5 h-5 mx-auto mb-2 text-[var(--color-success)]" />
                                    <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                                        {parseLocalDate(estadisticas.primeraFecha.split('T')[0]).toLocaleDateString('es-ES', {
                                            day: 'numeric',
                                            month: 'short'
                                        })}
                                    </p>
                                    <p className="text-xs text-[var(--color-text-secondary)]">Primera vez</p>
                                </div>
                            )}

                            {estadisticas.ultimaFecha && (
                                <div className="text-center p-3 bg-[var(--color-surface-muted)] rounded-lg">
                                    <Calendar className="w-5 h-5 mx-auto mb-2 text-[var(--color-warning)]" />
                                    <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                                        {parseLocalDate(estadisticas.ultimaFecha.split('T')[0]).toLocaleDateString('es-ES', {
                                            day: 'numeric',
                                            month: 'short'
                                        })}
                                    </p>
                                    <p className="text-xs text-[var(--color-text-secondary)]">Última vez</p>
                                </div>
                            )}
                        </div>

                        {/* Distribución temporal */}
                        {estadisticas.distribucionSemanas.length > 0 && (
                            <div>
                                <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-3">
                                    Distribución por semanas
                                </h3>
                                <div className="space-y-2 max-h-64 overflow-y-auto">
                                    {estadisticas.distribucionSemanas.map((sem, idx) => (
                                        <div
                                            key={idx}
                                            className="flex items-center justify-between p-2 bg-[var(--color-surface-muted)] rounded-lg text-sm"
                                        >
                                            <span className="text-[var(--color-text-primary)]">
                                                Sem. {parseLocalDate(sem.semana).toLocaleDateString('es-ES', {
                                                    day: 'numeric',
                                                    month: 'short'
                                                })}
                                            </span>
                                            <div className="flex items-center gap-3">
                                                <span className="text-[var(--color-text-secondary)] text-xs">
                                                    {sem.sesiones} {sem.sesiones === 1 ? 'sesión' : 'sesiones'}
                                                </span>
                                                <Badge variant="outline" className={componentStyles.status.badgeInfo}>
                                                    {sem.tiempo} min
                                                </Badge>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="border-t border-[var(--color-border-default)] px-6 py-4 bg-[var(--color-surface-muted)] rounded-b-2xl">
                        <Button
                            variant="primary"
                            onClick={onClose}
                            className={`w-full ${componentStyles.buttons.primary}`}
                        >
                            Cerrar
                        </Button>
                    </div>
                </div>
            </div>
        </>
    );
}
