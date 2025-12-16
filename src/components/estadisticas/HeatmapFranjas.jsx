import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ds";
import { Clock } from "lucide-react";
import { componentStyles } from "@/design/componentStyles";
import { useIsMobile } from "@/hooks/use-mobile";
import { formatLocalDate, parseLocalDate } from "./utils";
import { cn } from "@/lib/utils";

/**
 * HeatmapFranjas - Heatmap de actividad por franjas horarias
 * 
 * Muestra la actividad de práctica organizada por:
 * - FILAS: 8 franjas horarias de 3h (00–03, 03–06, ..., 21–24)
 * - COLUMNAS: días individuales del rango seleccionado
 * - VALOR: minutos totales de práctica en esa franja y día
 * 
 * @param {Object} props
 * @param {Array} props.registrosFiltrados - Registros de sesión con inicioISO y duracionRealSeg
 * @param {string} props.periodoInicio - Fecha inicio (YYYY-MM-DD)
 * @param {string} props.periodoFin - Fecha fin (YYYY-MM-DD)
 */
export default function HeatmapFranjas({ registrosFiltrados = [], periodoInicio, periodoFin }) {
    const isMobile = useIsMobile();

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

    // Generar lista de días del período
    const diasDelPeriodo = useMemo(() => {
        if (!periodoInicio || !periodoFin) return [];

        const inicio = parseLocalDate(periodoInicio);
        const fin = parseLocalDate(periodoFin);
        const dias = [];

        const fechaActual = new Date(inicio);
        while (fechaActual <= fin) {
            dias.push({
                fecha: formatLocalDate(fechaActual),
                dia: fechaActual.getDate(),
                mes: fechaActual.toLocaleDateString('es-ES', { month: 'short' }),
                diaSemana: fechaActual.toLocaleDateString('es-ES', { weekday: 'short' }),
            });
            fechaActual.setDate(fechaActual.getDate() + 1);
        }

        return dias;
    }, [periodoInicio, periodoFin]);

    // Crear matriz [franjas x días] con minutos
    const { matriz, maxMinutos, p95Minutos } = useMemo(() => {
        // Inicializar matriz con 0s
        const mat = Array(franjas.length).fill(null).map(() =>
            Array(diasDelPeriodo.length).fill(0)
        );

        // Crear mapa de día -> índice para búsqueda rápida
        const diaIndex = {};
        diasDelPeriodo.forEach((d, idx) => {
            diaIndex[d.fecha] = idx;
        });

        // Acumular minutos por franja y día
        registrosFiltrados.forEach(r => {
            if (!r.inicioISO) return;

            // Obtener hora local del navegador
            const fecha = new Date(r.inicioISO);
            const hora = fecha.getHours();
            const diaStr = formatLocalDate(fecha);

            // Encontrar índice de franja (0-7)
            const franjaIdx = Math.min(Math.floor(hora / 3), 7);

            // Encontrar índice de día
            const dayIdx = diaIndex[diaStr];
            if (dayIdx === undefined) return; // Día fuera del rango

            // Sumar minutos
            const minutos = Math.round((r.duracionRealSeg || 0) / 60);
            mat[franjaIdx][dayIdx] += minutos;
        });

        // Calcular máximo y percentil 95 para la escala de color
        const todosValores = mat.flat().filter(v => v > 0);
        const max = todosValores.length > 0 ? Math.max(...todosValores) : 0;

        // Calcular p95
        let p95 = max;
        if (todosValores.length > 0) {
            const sorted = [...todosValores].sort((a, b) => a - b);
            const idx = Math.floor(sorted.length * 0.95);
            p95 = sorted[Math.min(idx, sorted.length - 1)];
        }

        return { matriz: mat, maxMinutos: max, p95Minutos: p95 };
    }, [registrosFiltrados, diasDelPeriodo, franjas.length]);

    // Calcular intensidad de color (0-4) basada en percentil
    const getIntensidad = (minutos) => {
        if (minutos === 0) return 0;
        if (p95Minutos === 0) return 1;

        const ratio = minutos / p95Minutos;
        if (ratio < 0.25) return 1;
        if (ratio < 0.5) return 2;
        if (ratio < 0.75) return 3;
        return 4;
    };

    // Obtener clase de color según intensidad
    const getColorClass = (intensidad) => {
        switch (intensidad) {
            case 0: return 'bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700';
            case 1: return 'bg-orange-200 dark:bg-orange-900/30 border border-orange-300 dark:border-orange-800';
            case 2: return 'bg-orange-300 dark:bg-orange-800/40 border border-orange-400 dark:border-orange-700';
            case 3: return 'bg-orange-400 dark:bg-orange-700/50 border border-orange-500 dark:border-orange-600';
            case 4: return 'bg-orange-500 dark:bg-orange-600 border border-orange-600 dark:border-orange-500';
            default: return 'bg-gray-100 dark:bg-gray-800';
        }
    };

    // Calcular estadísticas de resumen
    const resumen = useMemo(() => {
        if (registrosFiltrados.length === 0) return null;

        const minutosPorFranja = franjas.map((_, idx) =>
            matriz[idx].reduce((sum, v) => sum + v, 0)
        );

        const maxMinutosFranja = Math.max(...minutosPorFranja);
        const franjaMasPracticada = minutosPorFranja.indexOf(maxMinutosFranja);

        const totalMinutos = minutosPorFranja.reduce((sum, v) => sum + v, 0);
        const diasConPractica = diasDelPeriodo.filter((_, idx) =>
            matriz.some(fila => fila[idx] > 0)
        ).length;

        return {
            franjaMasPracticada,
            minutosFranjaMasPracticada: maxMinutosFranja,
            totalMinutos,
            diasConPractica,
        };
    }, [matriz, franjas, diasDelPeriodo, registrosFiltrados.length]);

    if (!periodoInicio || !periodoFin || diasDelPeriodo.length === 0) {
        return (
            <Card className={componentStyles.components.cardBase}>
                <CardHeader>
                    <CardTitle className="text-sm sm:text-base md:text-lg flex items-center gap-2">
                        <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-[var(--color-primary)]" />
                        Actividad por Franja Horaria
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-center py-8 text-[var(--color-text-secondary)]">
                        No hay datos en el periodo seleccionado
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className={componentStyles.components.cardBase}>
            <CardHeader>
                <div className="space-y-2">
                    <CardTitle className="text-sm sm:text-base md:text-lg flex items-center gap-2">
                        <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-[var(--color-primary)]" />
                        Actividad por Franja Horaria
                    </CardTitle>
                    <p className="text-xs text-[var(--color-text-secondary)]">
                        Pasa el ratón sobre una celda para ver detalles
                    </p>
                    {resumen && resumen.totalMinutos > 0 && (
                        <div className="text-xs text-[var(--color-text-secondary)] space-y-1">
                            {resumen.franjaMasPracticada >= 0 && resumen.minutosFranjaMasPracticada > 0 && (
                                <p>
                                    <strong>Practicas más entre las {franjas[resumen.franjaMasPracticada].label}</strong>
                                    {' '}({Math.round(resumen.minutosFranjaMasPracticada)} min total)
                                </p>
                            )}
                            {resumen.diasConPractica > 0 && (
                                <p>
                                    Has practicado <strong>{resumen.diasConPractica} días</strong> en este período
                                </p>
                            )}
                        </div>
                    )}
                </div>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    <div className="overflow-x-auto -mx-2 px-2">
                        <div className="inline-block min-w-full">
                            {/* Heatmap Grid */}
                            <div className="flex gap-2">
                                {/* Etiquetas de franjas horarias (eje Y) */}
                                <div className="flex flex-col gap-1 pt-7">
                                    {franjas.map((franja, idx) => (
                                        <div
                                            key={idx}
                                            className="h-[14px] sm:h-[16px] text-[10px] sm:text-[11px] text-[var(--color-text-secondary)] flex items-center justify-end pr-2 font-medium whitespace-nowrap"
                                            style={{ minHeight: isMobile ? '14px' : '16px' }}
                                        >
                                            {franja.label}
                                        </div>
                                    ))}
                                </div>

                                {/* Grid de días (eje X) */}
                                <div className="flex-1 min-w-0">
                                    {/* Etiquetas de días (arriba) */}
                                    <div className="flex gap-1 mb-1">
                                        {diasDelPeriodo.map((dia, dayIdx) => {
                                            // Mostrar etiqueta cada ciertos días para no saturar
                                            const interval = isMobile
                                                ? Math.ceil(diasDelPeriodo.length / 8)
                                                : Math.ceil(diasDelPeriodo.length / 14);
                                            const mostrarEtiqueta = dayIdx % interval === 0 || dayIdx === diasDelPeriodo.length - 1;

                                            if (!mostrarEtiqueta) return <div key={dayIdx} className="w-[14px] sm:w-[16px]" />;

                                            return (
                                                <div
                                                    key={dayIdx}
                                                    className="w-[14px] sm:w-[16px] text-[9px] sm:text-[10px] text-[var(--color-text-secondary)] text-center font-medium"
                                                    title={`${dia.diaSemana} ${dia.dia} ${dia.mes}`}
                                                >
                                                    {dia.dia}
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {/* Filas de franjas (8 filas) */}
                                    <div className="flex flex-col gap-1">
                                        {franjas.map((franja, franjaIdx) => (
                                            <div key={franjaIdx} className="flex gap-1">
                                                {diasDelPeriodo.map((dia, dayIdx) => {
                                                    const minutos = matriz[franjaIdx][dayIdx];
                                                    const intensidad = getIntensidad(minutos);

                                                    const tooltipText = minutos > 0
                                                        ? `${dia.diaSemana} ${dia.dia} ${dia.mes}, ${franja.label}: ${minutos} min`
                                                        : `${dia.diaSemana} ${dia.dia} ${dia.mes}, ${franja.label}: Sin actividad`;

                                                    return (
                                                        <div
                                                            key={dayIdx}
                                                            className={cn(
                                                                "w-[14px] sm:w-[16px] h-[14px] sm:h-[16px] rounded-sm cursor-pointer transition-all hover:scale-125 hover:z-10 relative border",
                                                                getColorClass(intensidad),
                                                                minutos > 0 && "ring-1 ring-orange-400/30"
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

                    {/* Leyenda */}
                    <div className="flex items-center justify-end gap-2 text-xs text-[var(--color-text-secondary)]">
                        <span className="font-medium">Intensidad:</span>
                        <span>Menos</span>
                        <div className="flex gap-0.5">
                            {[0, 1, 2, 3, 4].map(intensidad => (
                                <div
                                    key={intensidad}
                                    className={cn(
                                        "w-3 h-3 rounded-sm border",
                                        getColorClass(intensidad)
                                    )}
                                    title={
                                        intensidad === 0 ? 'Sin actividad' :
                                            intensidad === 1 ? `< ${Math.round(p95Minutos * 0.25)} min` :
                                                intensidad === 2 ? `${Math.round(p95Minutos * 0.25)}–${Math.round(p95Minutos * 0.5)} min` :
                                                    intensidad === 3 ? `${Math.round(p95Minutos * 0.5)}–${Math.round(p95Minutos * 0.75)} min` :
                                                        `${Math.round(p95Minutos * 0.75)}+ min`
                                    }
                                />
                            ))}
                        </div>
                        <span>Más</span>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
