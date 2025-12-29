import React, { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/features/shared/components/ds";
import { Clock } from "lucide-react";
import { componentStyles } from "@/design/componentStyles";
import { useIsMobile } from "@/hooks/use-mobile";
import { formatLocalDate, parseLocalDate } from "../utils/progresoUtils";
import { cn } from "@/lib/utils";
import { RegistroSesion } from "@/features/shared/types/domain";

/**
 * HeatmapFranjas - Heatmap de actividad por franjas horarias
 */
export interface HeatmapFranjasProps {
    registrosFiltrados: RegistroSesion[];
    periodoInicio: string | null | undefined;
    periodoFin: string | null | undefined;
}

export default function HeatmapFranjas({ registrosFiltrados = [], periodoInicio, periodoFin }: HeatmapFranjasProps) {
    const isMobile = useIsMobile();
    // Modo de visualización: 'timeline' (default), 'week_pattern' (L-D), 'month_pattern' (1-31)
    const [heatmapMode, setHeatmapMode] = useState<'timeline' | 'week_pattern' | 'month_pattern'>('timeline');

    // Auto-calculate range if missing (e.g. "Todo" preset)
    const { effectiveInicio, effectiveFin } = useMemo(() => {
        if (periodoInicio && periodoFin) return { effectiveInicio: periodoInicio, effectiveFin: periodoFin };

        if (registrosFiltrados.length === 0) return { effectiveInicio: periodoInicio, effectiveFin: periodoFin };

        const fechas = registrosFiltrados
            .map(r => r.inicioISO ? new Date(r.inicioISO) : null)
            .filter((d): d is Date => !!d);

        if (fechas.length === 0) return { effectiveInicio: periodoInicio, effectiveFin: periodoFin };

        const minDate = new Date(Math.min(...fechas.map(d => d.getTime())));
        const maxDate = new Date(Math.max(...fechas.map(d => d.getTime())));

        return {
            effectiveInicio: formatLocalDate(minDate),
            effectiveFin: formatLocalDate(maxDate)
        };
    }, [periodoInicio, periodoFin, registrosFiltrados]);

    // Definir las 8 franjas horarias de 3h
    const franjas = [
        { label: "00–03", start: 0, end: 3 },
        { label: "03–06", start: 3, end: 6 },
        { label: "06–09", start: 6, end: 9 },
        { label: "09–12", start: 9, end: 12 },
        { label: "12–15", start: 12, end: 15 },
        { label: "15–18", start: 15, end: 18 },
        { label: "18–21", start: 18, end: 21 },
        { label: "21–24", start: 21, end: 24 },
    ];

    interface Columna {
        id: string | number;
        label: string | number;
        fullLabel: string;
        isPattern?: boolean;
        start?: Date;
        end?: Date;
    }

    // Generar columnas según modo
    const { columnas, granularidad } = useMemo(() => {
        const cols: Columna[] = [];

        if (heatmapMode === 'week_pattern') {
            const baseMonday = new Date(2024, 0, 1);
            for (let i = 0; i < 7; i++) {
                const dia = new Date(baseMonday);
                dia.setDate(baseMonday.getDate() + i);
                const nombreDia = dia.toLocaleDateString('es-ES', { weekday: 'short' });
                const label = nombreDia.charAt(0).toUpperCase() + nombreDia.slice(1);

                cols.push({
                    id: i,
                    label: label.substring(0, 2),
                    fullLabel: dia.toLocaleDateString('es-ES', { weekday: 'long' }),
                    isPattern: true
                });
            }
            return { columnas: cols, granularidad: 'patron_semana' };
        }
        else if (heatmapMode === 'month_pattern') {
            for (let i = 1; i <= 31; i++) {
                cols.push({
                    id: i,
                    label: `${i}`,
                    fullLabel: `Día ${i} del mes`
                });
            }
            return { columnas: cols, granularidad: 'patron_mes' };
        }
        else {
            if (!effectiveInicio || !effectiveFin) return { columnas: [], granularidad: 'dia' };

            const inicio = parseLocalDate(effectiveInicio);
            const fin = parseLocalDate(effectiveFin);
            const diffTime = Math.abs(fin.getTime() - inicio.getTime());
            const totalDias = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            const usarSemanas = totalDias > 50;
            const current = new Date(inicio);

            if (usarSemanas) {
                while (current <= fin) {
                    const weekStart = new Date(current);
                    const weekEnd = new Date(current);
                    weekEnd.setDate(weekEnd.getDate() + 6);

                    const labelInicio = formatLocalDate(weekStart);

                    cols.push({
                        id: labelInicio,
                        label: `${weekStart.getDate()}/${weekStart.getMonth() + 1}`,
                        fullLabel: `${weekStart.toLocaleDateString()} - ${weekEnd.toLocaleDateString()}`,
                        start: new Date(weekStart),
                        end: new Date(weekEnd <= fin ? weekEnd : fin)
                    });
                    current.setDate(current.getDate() + 7);
                }
                return { columnas: cols, granularidad: 'semana' };
            } else {
                while (current <= fin) {
                    cols.push({
                        id: formatLocalDate(current),
                        label: current.getDate(),
                        fullLabel: current.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }),
                        start: new Date(current),
                        end: new Date(current)
                    });
                    current.setDate(current.getDate() + 1);
                }
                return { columnas: cols, granularidad: 'dia' };
            }
        }
    }, [effectiveInicio, effectiveFin, isMobile, heatmapMode]);

    // Crear matriz [franjas x columnas]
    const { matriz, maxSesiones } = useMemo(() => {
        const mat = Array(franjas.length).fill(null).map(() =>
            Array(columnas.length).fill(null).map(() => [] as string[])
        );

        registrosFiltrados.forEach(r => {
            if (!r.inicioISO) return;

            const fecha = new Date(r.inicioISO);
            const hora = fecha.getHours();

            let colIdx = -1;

            if (heatmapMode === 'week_pattern') {
                const day = fecha.getDay();
                const adjustedDay = day === 0 ? 6 : day - 1;
                colIdx = adjustedDay;
            } else if (heatmapMode === 'month_pattern') {
                const day = fecha.getDate();
                colIdx = day - 1;
            } else {
                if (granularidad === 'dia') {
                    const diaStr = formatLocalDate(fecha);
                    colIdx = columnas.findIndex(c => c.id === diaStr);
                } else if (granularidad === 'semana') {
                    colIdx = columnas.findIndex(c => c.start && c.end && fecha >= c.start && fecha <= new Date(c.end.getTime() + 86399000));
                }
            }

            if (colIdx === -1 || colIdx >= columnas.length) return;

            const franjaIdx = Math.min(Math.floor(hora / 3), 7);
            const horaStr = fecha.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

            mat[franjaIdx][colIdx].push(horaStr);
        });

        let max = 0;
        mat.forEach(fila => fila.forEach(celda => {
            if (celda.length > max) max = celda.length;
        }));

        return { matriz: mat, maxSesiones: max };
    }, [registrosFiltrados, columnas, granularidad, heatmapMode, franjas.length]);

    const getIntensidad = (numSesiones: number) => {
        if (numSesiones === 0) return 0;
        if (maxSesiones <= 2) return 4;

        const ratio = numSesiones / maxSesiones;
        if (ratio < 0.25) return 1;
        if (ratio < 0.5) return 2;
        if (ratio < 0.75) return 3;
        return 4;
    };

    const getColorClass = (intensidad: number) => {
        switch (intensidad) {
            case 0: return 'bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700';
            case 1: return 'bg-orange-200 dark:bg-orange-900/30 border border-orange-300 dark:border-orange-800';
            case 2: return 'bg-orange-300 dark:bg-orange-800/40 border border-orange-400 dark:border-orange-700';
            case 3: return 'bg-orange-400 dark:bg-orange-700/50 border border-orange-500 dark:border-orange-600';
            case 4: return 'bg-orange-500 dark:bg-orange-600 border border-orange-600 dark:border-orange-500';
            default: return 'bg-gray-100 dark:bg-gray-800';
        }
    };

    const resumen = useMemo(() => {
        if (registrosFiltrados.length === 0) return null;
        const totalSesiones = registrosFiltrados.length;
        const colsConPractica = columnas.filter((_, idx) =>
            matriz.some(fila => fila[idx].length > 0)
        ).length;

        const sesionesPorFranja = franjas.map((_, idx) =>
            matriz[idx].reduce((sum, celda) => sum + celda.length, 0)
        );
        const maxSesionesFranja = Math.max(...sesionesPorFranja);
        const franjaMasPracticada = sesionesPorFranja.indexOf(maxSesionesFranja);

        const sesionesPorColumna = columnas.map((_, colIdx) =>
            matriz.reduce((sum, fila) => sum + fila[colIdx].length, 0)
        );
        const maxSesionesColumna = Math.max(...sesionesPorColumna);
        const colMasPracticadaIdx = sesionesPorColumna.indexOf(maxSesionesColumna);
        const diaFavorito = colMasPracticadaIdx >= 0 ? columnas[colMasPracticadaIdx].fullLabel : null;

        let semanaFavorita: string | null = null;
        let sesionesSemanaFavorita = 0;

        if (heatmapMode === 'month_pattern') {
            const semanasMes = [0, 0, 0, 0, 0];
            sesionesPorColumna.forEach((count, idx) => {
                const semanaIdx = Math.floor(idx / 7);
                if (semanaIdx < 5) semanasMes[semanaIdx] += count;
            });
            const maxSemana = Math.max(...semanasMes);
            if (maxSemana > 0) {
                const semanaIdx = semanasMes.indexOf(maxSemana);
                semanaFavorita = `Semana ${semanaIdx + 1}`;
                sesionesSemanaFavorita = maxSemana;
            }
        }

        return {
            totalSesiones,
            colsConPractica,
            franjaMasPracticada,
            sesionesFranjaMasPracticada: maxSesionesFranja,
            diaFavorito,
            sesionesDiaFavorito: maxSesionesColumna,
            semanaFavorita,
            sesionesSemanaFavorita
        };
    }, [matriz, franjas, columnas, registrosFiltrados.length, heatmapMode]);

    if (!effectiveInicio && !registrosFiltrados.length) return null;

    return (
        <Card className={componentStyles.components.cardBase}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div className="space-y-1">
                    <CardTitle className="text-sm sm:text-base md:text-lg flex items-center gap-2">
                        <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-[var(--color-primary)]" />
                        Actividad por Franja Horaria
                    </CardTitle>
                    <p className="text-xs text-[var(--color-text-secondary)]">
                        {heatmapMode === 'timeline' ? "Evolución cronológica" :
                            heatmapMode === 'week_pattern' ? "Patrón semanal acumulado" : "Patrón mensual acumulado"}
                    </p>
                </div>

                <div className="flex bg-[var(--color-surface-muted)] p-0.5 rounded-lg shrink-0">
                    <button onClick={() => setHeatmapMode('timeline')} title="Cronograma" className={cn("px-2 py-1 text-[10px] font-medium rounded transition-all", heatmapMode === 'timeline' ? "bg-[var(--color-surface-default)] text-[var(--color-primary)] shadow-sm" : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]")}>Rango</button>
                    <button onClick={() => setHeatmapMode('week_pattern')} title="Patrón Semanal" className={cn("px-2 py-1 text-[10px] font-medium rounded transition-all", heatmapMode === 'week_pattern' ? "bg-[var(--color-surface-default)] text-[var(--color-primary)] shadow-sm" : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]")}>Sem</button>
                    <button onClick={() => setHeatmapMode('month_pattern')} title="Patrón Mensual" className={cn("px-2 py-1 text-[10px] font-medium rounded transition-all", heatmapMode === 'month_pattern' ? "bg-[var(--color-surface-default)] text-[var(--color-primary)] shadow-sm" : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]")}>Mes</button>
                </div>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {resumen && resumen.totalSesiones > 0 && (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
                            <div className="bg-[var(--color-surface-muted)] p-2 rounded border border-[var(--color-border-default)]">
                                <p className="text-[10px] text-[var(--color-text-secondary)] uppercase">Total Sesiones</p>
                                <p className="text-sm font-semibold text-[var(--color-text-primary)]">{resumen.totalSesiones}</p>
                            </div>

                            <div className="bg-[var(--color-surface-muted)] p-2 rounded border border-[var(--color-border-default)]">
                                <p className="text-[10px] text-[var(--color-text-secondary)] uppercase">
                                    {heatmapMode === 'timeline' ? 'Días Activos' :
                                        heatmapMode === 'week_pattern' ? 'Días/Semana' : 'Días/Mes'}
                                </p>
                                <p className="text-sm font-semibold text-[var(--color-text-primary)]">{resumen.colsConPractica}</p>
                            </div>

                            <div className="bg-[var(--color-surface-muted)] p-2 rounded border border-[var(--color-border-default)]">
                                <p className="text-[10px] text-[var(--color-text-secondary)] uppercase">Hora Favorita</p>
                                <p className="text-sm font-semibold text-[var(--color-text-primary)] truncate" title={`${resumen.sesionesFranjaMasPracticada} sesiones`}>
                                    {resumen.franjaMasPracticada >= 0 ? franjas[resumen.franjaMasPracticada].label : '-'}
                                </p>
                            </div>

                            <div className="bg-[var(--color-surface-muted)] p-2 rounded border border-[var(--color-border-default)]">
                                <p className="text-[10px] text-[var(--color-text-secondary)] uppercase">
                                    {heatmapMode === 'month_pattern' ? 'Semana Top' : 'Día Top'}
                                </p>
                                <p className="text-sm font-semibold text-[var(--color-text-primary)] truncate" title={heatmapMode === 'month_pattern' && resumen.semanaFavorita ? `${resumen.sesionesSemanaFavorita} sesiones` : `${resumen.sesionesDiaFavorito} sesiones`}>
                                    {heatmapMode === 'month_pattern' && resumen.semanaFavorita
                                        ? resumen.semanaFavorita
                                        : (resumen.diaFavorito || '-')}
                                </p>
                            </div>
                        </div>
                    )}

                    <div className="w-full overflow-x-auto pb-2">
                        <div className="min-w-full">
                            <div className="flex gap-2 w-full">
                                <div className="flex flex-col gap-1 pt-9 shrink-0">
                                    {franjas.map((franja, idx) => (
                                        <div key={idx} className="h-[14px] sm:h-[16px] text-[10px] sm:text-[11px] text-[var(--color-text-secondary)] flex items-center justify-end pr-2 font-medium whitespace-nowrap" style={{ minHeight: isMobile ? '14px' : '16px' }}>
                                            {franja.label}
                                        </div>
                                    ))}
                                </div>

                                <div className="flex-1 w-full min-w-0">
                                    <div className="flex gap-[1px] mb-1 w-full h-8 items-end mt-0">
                                        {columnas.map((col, colIdx) => {
                                            let showLabel = true;
                                            if (columnas.length > 20) {
                                                const interval = Math.ceil(columnas.length / 15);
                                                showLabel = colIdx % interval === 0 || colIdx === columnas.length - 1;
                                            }

                                            if (heatmapMode === 'week_pattern') showLabel = true;

                                            if (!showLabel) return <div key={colIdx} className="flex-1 min-w-[2px]" />;

                                            return (
                                                <div key={colIdx} className="flex-1 min-w-[2px] text-[9px] sm:text-[10px] text-[var(--color-text-secondary)] text-center font-medium truncate leading-none pb-1" title={col.fullLabel}>
                                                    {col.label}
                                                </div>
                                            );
                                        })}
                                    </div>

                                    <div className="flex flex-col gap-[1px] w-full">
                                        {franjas.map((franja, franjaIdx) => (
                                            <div key={franjaIdx} className="flex gap-[1px] w-full">
                                                {columnas.map((col, colIdx) => {
                                                    const sesiones = matriz[franjaIdx][colIdx];
                                                    const count = sesiones.length;
                                                    const intensidad = getIntensidad(count);
                                                    const tooltipText = count > 0
                                                        ? `${col.fullLabel}\n${franja.label}: ${count} sesión(es)`
                                                        : `${col.fullLabel}\n${franja.label}: Sin actividad`;

                                                    return (
                                                        <div
                                                            key={colIdx}
                                                            className={cn(
                                                                "flex-1 h-[14px] sm:h-[16px] rounded-[1px] cursor-pointer transition-all hover:scale-125 hover:z-10 relative border border-transparent hover:border-gray-300",
                                                                getColorClass(intensidad),
                                                                count > 0 && "ring-[0.5px] ring-orange-400/30"
                                                            )}
                                                            title={tooltipText}
                                                        />
                                                    );
                                                })}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 text-xs text-[var(--color-text-secondary)]">
                        <span className="font-medium">Sesiones:</span>
                        <span>0</span>
                        <div className="flex gap-0.5">
                            {[0, 1, 2, 3, 4].map(intensidad => (
                                <div key={intensidad} className={cn("w-3 h-3 rounded-sm border", getColorClass(intensidad))} />
                            ))}
                        </div>
                        <span>+</span>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
