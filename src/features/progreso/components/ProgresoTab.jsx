import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ds";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ComposedChart, LineChart, Line, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from 'recharts';
import { Clock, TrendingUp, CheckCircle, XCircle, Activity, LayoutList, Target, Info } from "lucide-react";
import { componentStyles } from "@/design/componentStyles";
import { useIsMobile } from "@/hooks/use-mobile";
import KpiTile from "./KpiTile";
import { formatDuracionHM, parseLocalDate, formatDurationChart, formatDurationDDHHMM } from "../utils/progresoUtils";
import { cn } from "@/lib/utils";
import TiposBloquesTab from "./TiposBloquesTab";
import TopEjerciciosTab from "./TopEjerciciosTab";
import HeatmapFranjas from "./HeatmapFranjas";

/**
 * ProgresoTab - Tab de progreso con opciones Rendimiento (Métricas) y Ejercicios.
 * Sin acordeones.
 * 
 * @param {Object} props
 * @param {Array} props.datosLinea - Datos para el gráfico de línea
 * @param {string} props.granularidad - 'dia' | 'semana' | 'mes'
 * @param {Function} props.onGranularidadChange - Callback para cambiar granularidad
 * @param {Object} props.tiempoRealVsObjetivo - Datos de comparación tiempo real vs objetivo
 * @param {Object} props.kpis - KPIs con nuevas métricas
 * @param {Array} props.tiposBloque - Datos para Tipos de Bloque
 * @param {Array} props.topEjercicios - Datos para Top Ejercicios
 * @param {Array} props.registrosFiltrados - Para Heatmap
 * @param {Date} props.periodoInicio - Para Heatmap
 * @param {Date} props.periodoFin - Para Heatmap
 */
export default function ProgresoTab({
  datosLinea,
  granularidad,
  onGranularidadChange,
  tiempoRealVsObjetivo,
  kpis,
  tiposBloque = [],
  topEjercicios = [],
  registrosFiltrados,
  periodoInicio,
  periodoFin
}) {
  const isMobile = useIsMobile();
  // Estado para el toggle de vista: 'rendimiento' | 'ejercicios'
  const [view, setView] = useState('rendimiento');

  const formatFecha = (fecha) => {
    if (!fecha) return "";
    const d = parseLocalDate(fecha);

    if (granularidad === 'dia' || granularidad === 'dia_compacto') {
      return isMobile
        ? `${d.getDate()}/${d.getMonth() + 1}`
        : d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
    } else if (granularidad === 'semana') {
      return isMobile
        ? `S${d.getDate()}/${d.getMonth() + 1}`
        : `Sem. ${d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}`;
    } else if (granularidad === 'mes') {
      return d.toLocaleDateString('es-ES', { month: 'short' }); // "En.", "Feb."
    } else {
      // Quincena u otros
      return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
    }
  };

  // Logic to show/hide dots
  const showDots = granularidad !== 'dia' && granularidad !== 'dia_compacto';
  const dotProps = showDots ? { r: 3, fill: "var(--color-primary)", strokeWidth: 0 } : false;
  const dotPropsSuccess = showDots ? { r: 3, fill: "var(--color-success)", strokeWidth: 0 } : false;
  const dotPropsDanger = showDots ? { r: 4 } : false;

  // XAxis props optimization
  const xAxisProps = {
    dataKey: "fecha",
    tick: { fontSize: 10, fill: "var(--color-text-secondary)" },
    tickLine: false,
    axisLine: false,
    tickFormatter: formatFecha,
    dy: 10,
    minTickGap: 30, // Avoid overlapping
    interval: "preserveStartEnd"
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="flex bg-[var(--color-surface-muted)] p-1 rounded-lg">
            <button onClick={() => setView('rendimiento')} className={cn("flex items-center px-4 py-1.5 text-sm font-medium rounded-md transition-all", view === 'rendimiento' ? "bg-[var(--color-surface-default)] text-[var(--color-primary)] shadow-sm" : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]")}>
              <TrendingUp className="w-4 h-4 mr-2" /> Rendimiento
            </button>
            <button onClick={() => setView('ejercicios')} className={cn("flex items-center px-4 py-1.5 text-sm font-medium rounded-md transition-all", view === 'ejercicios' ? "bg-[var(--color-surface-default)] text-[var(--color-primary)] shadow-sm" : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]")}>
              <LayoutList className="w-4 h-4 mr-2" /> Ejercicios
            </button>
          </div>
          {view === 'rendimiento' && (
            <Popover>
              <PopoverTrigger asChild>
                <button
                  className="p-1.5 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-muted)] rounded-md transition-colors"
                  aria-label="Información sobre las métricas"
                >
                  <Info className="w-4 h-4" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-4" align="start">
                <div className="space-y-3">
                  <h4 className="font-semibold text-sm text-[var(--color-text-primary)]">Tus métricas de rendimiento</h4>
                  <div className="space-y-2 text-xs text-[var(--color-text-secondary)]">
                    <p><strong className="text-[var(--color-text-primary)]">Ratio completado:</strong> Porcentaje de bloques que has completado en tus sesiones (vs los que has omitido).</p>
                    <p><strong className="text-[var(--color-text-primary)]">Sesiones sin omitir:</strong> Porcentaje de sesiones donde has hecho todos los bloques sin saltar ninguno.</p>
                    <p><strong className="text-[var(--color-text-primary)]">Cumplimiento objetivo:</strong> Cuánto tiempo has practicado respecto al tiempo objetivo que tenías marcado.</p>
                    <p><strong className="text-[var(--color-text-primary)]">Sesiones cumplen:</strong> En cuántas sesiones has alcanzado al menos el 90% del tiempo objetivo.</p>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          )}
        </div>
      </div>

      {/* 2. Contenido según vista */}
      {view === 'rendimiento' && (
        <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200">
          <div className="grid grid-cols-1 min-[400px]:grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 pb-4">
            <KpiTile icon={CheckCircle} label="Ratio completado" value={`${kpis.ratioCompletado}%`} valueClassName="text-[var(--color-success)]" subtext={`${kpis.totalCompletados} compl. · ${kpis.totalOmitidos} omit.`} />
            <KpiTile icon={CheckCircle} label="Sesiones sin omitir" value={`${kpis.porcentajeCompletadas}%`} valueClassName="text-[var(--color-success)]" subtext={`${kpis.sesionesCompletadas}/${kpis.numSesiones || 0} sesiones`} />
            <KpiTile icon={Clock} label="Cumplimiento objetivo" value={`${tiempoRealVsObjetivo.porcentajeCumplimiento}%`} valueClassName={parseFloat(tiempoRealVsObjetivo.porcentajeCumplimiento) >= 90 ? "text-[var(--color-success)]" : "text-orange-500"} subtext={`Real: ${formatDuracionHM(tiempoRealVsObjetivo.totalReal)}`} />
            <KpiTile icon={Target} label="Sesiones cumplen" value={`${tiempoRealVsObjetivo.porcentajeSesionesCumplen}%`} valueClassName="text-[var(--color-primary)]" subtext={`${tiempoRealVsObjetivo.sesionesCumplenObjetivo}/${tiempoRealVsObjetivo.totalSesiones} sesiones`} />
          </div>

          {/* Gráfico de evolución temporal */}
          <Card className={`${componentStyles.components.cardBase}`}>
            <CardHeader className="p-1.5 sm:p-2 md:p-3">
              <CardTitle className="text-sm sm:text-base md:text-lg flex items-center gap-2">
                <Activity className="w-4 h-4 sm:w-5 sm:h-5 text-[var(--color-primary)]" />
                Evolución Temporal
              </CardTitle>
            </CardHeader>
            <CardContent className="p-1.5 sm:p-2 md:p-3">
              {datosLinea.length === 0 ? (
                <div className="text-center py-8 sm:py-12">
                  <TrendingUp className={componentStyles.components.emptyStateIcon} />
                  <p className={componentStyles.components.emptyStateText}>No hay datos en el periodo seleccionado</p>
                </div>
              ) : (
                <div className="w-full min-w-0">
                  <ResponsiveContainer width="100%" height={isMobile ? 250 : 350} minHeight={250}>
                    <ComposedChart data={datosLinea} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" vertical={false} />
                      <XAxis {...xAxisProps} />
                      <YAxis
                        yAxisId="left"
                        orientation="left"
                        tick={{ fontSize: 10, fill: "var(--color-text-secondary)" }}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(val) => val >= 3600 ? `${Math.round(val / 3600)}h` : `${Math.round(val / 60)}m`}
                        width={35}
                        tickCount={5}
                        minTickGap={15}
                      />
                      <YAxis
                        yAxisId="right"
                        orientation="right"
                        domain={[1, 4]}
                        ticks={[1, 2, 3, 4]}
                        tick={{ fontSize: 9, fill: "var(--color-text-secondary)" }}
                        tickLine={false}
                        tickSize={0}
                        axisLine={false}
                        tickFormatter={(val) => `${val}★`}
                        width={18}
                        tickMargin={4}
                      />
                      <RechartsTooltip
                        contentStyle={{ backgroundColor: 'var(--color-surface-elevated)', border: '1px solid var(--color-border-default)', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        itemStyle={{ fontSize: '12px', padding: 0 }}
                        formatter={(value, name) => {
                          if (name === 'Tiempo') return [formatDurationDDHHMM(value, 'sec'), 'Tiempo'];
                          if (name === 'Valoración') return [`${value != null ? value.toFixed(1) : ''} / 4`, 'Valoración'];
                          return [value, name];
                        }}
                        labelStyle={{ color: 'var(--color-text-primary)', marginBottom: '0.25rem', fontWeight: 600 }}
                        labelFormatter={(label, payload) => payload?.[0]?.payload?.fechaLabel || formatFecha(label)}
                      />
                      <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '0px' }} />
                      <Area yAxisId="left" type="monotone" dataKey="tiempo" name="Tiempo" stroke="var(--color-primary)" strokeWidth={2} fill="var(--color-primary)" fillOpacity={0.15} dot={{ r: 3, fill: "var(--color-primary)", strokeWidth: 0 }} activeDot={{ r: 5, fill: "var(--color-primary)", strokeWidth: 0 }} />
                      <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="satisfaccion"
                        name="Valoración"
                        stroke="var(--color-success)"
                        strokeWidth={2}
                        strokeDasharray="5 5"
                        dot={{ r: 3, fill: "var(--color-success)", strokeWidth: 0 }}
                        activeDot={{ r: 5, fill: "var(--color-success)", strokeWidth: 0 }}
                        connectNulls={true}
                      />  </ComposedChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Gráfico de completados vs omitidos */}
          <Card className={`${componentStyles.components.cardBase}`}>
            <CardHeader className="p-1.5 sm:p-2 md:p-3">
              <CardTitle className="text-sm sm:text-base md:text-lg flex items-center gap-2">
                <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-[var(--color-success)]" />
                Bloques Completados vs Omitidos
              </CardTitle>
            </CardHeader>
            <CardContent className="p-1.5 sm:p-2 md:p-3">
              {datosLinea.length === 0 ? (
                <div className="text-center py-8 sm:py-12">
                  <XCircle className={componentStyles.components.emptyStateIcon} />
                  <p className={componentStyles.components.emptyStateText}>No hay datos en el periodo seleccionado</p>
                </div>
              ) : (
                <div className="w-full">
                  <ResponsiveContainer width="100%" height={isMobile ? 200 : 300} minHeight={200}>
                    <LineChart data={datosLinea} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
                      <XAxis {...xAxisProps} />
                      <YAxis tick={{ fontSize: 10, fill: "var(--color-text-secondary)" }} tickLine={false} axisLine={false} />
                      <RechartsTooltip
                        contentStyle={{ backgroundColor: 'var(--color-surface-elevated)', border: '1px solid var(--color-border-default)', borderRadius: '8px' }}
                        labelStyle={{ color: 'var(--color-text-primary)', fontWeight: 600 }}
                        labelFormatter={(label, payload) => payload?.[0]?.payload?.fechaLabel || formatFecha(label)}
                      />
                      <Line type="monotone" dataKey="completados" stroke="var(--color-success)" strokeWidth={2} name="Completados" dot={{ r: 3, fill: "var(--color-success)", strokeWidth: 0 }} activeDot={{ r: 5, fill: "var(--color-success)", strokeWidth: 0 }} />
                      <Line type="monotone" dataKey="omitidos" stroke="var(--color-danger)" strokeWidth={2} name="Omitidos" dot={{ r: 3, fill: "var(--color-danger)", strokeWidth: 0 }} activeDot={{ r: 5, fill: "var(--color-danger)", strokeWidth: 0 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Section: Heatmap de Franjas */}
          <HeatmapFranjas
            registrosFiltrados={registrosFiltrados}
            periodoInicio={periodoInicio}
            periodoFin={periodoFin}
          />
        </div>
      )}

      {view === 'ejercicios' && (
        <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200">
          {/* DEBUG: Log para trazar flujo de datos de Ejercicios */}

          {/* 1. Tipos de Bloque */}
          <TiposBloquesTab tiposBloques={tiposBloque} />

          {/* 2. Top Ejercicios */}
          <TopEjerciciosTab topEjercicios={topEjercicios} />
        </div>
      )}

    </div>
  );
}
