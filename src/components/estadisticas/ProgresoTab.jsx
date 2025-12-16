import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ds";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from 'recharts';
import { Clock, TrendingUp, CheckCircle, XCircle, Activity, LayoutList } from "lucide-react";
import { componentStyles } from "@/design/componentStyles";
import { useIsMobile } from "@/hooks/use-mobile";
import StatCard from "./StatCard";
import { formatDuracionHM, parseLocalDate } from "./utils";
import { cn } from "@/lib/utils";
import TiposBloquesTab from "@/components/estadisticas/TiposBloquesTab";
import TopEjerciciosTab from "@/components/estadisticas/TopEjerciciosTab";
import HeatmapFranjas from "@/components/estadisticas/HeatmapFranjas";

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
    if (granularidad === 'dia') {
      const d = parseLocalDate(fecha);
      return isMobile
        ? `${d.getDate()}/${d.getMonth() + 1}`
        : d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
    } else if (granularidad === 'semana') {
      const d = parseLocalDate(fecha);
      return isMobile
        ? `S${d.getDate()}/${d.getMonth() + 1}`
        : `Sem. ${d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}`;
    } else {
      return fecha;
    }
  };

  return (
    <div className="space-y-6">

      {/* 1. Header con Toggle Pills */}
      <div className="flex flex-col sm:flex-row justify-center items-start sm:items-center gap-4">
        <div className="flex bg-[var(--color-surface-muted)] p-1 rounded-lg">
          <button
            onClick={() => setView('rendimiento')}
            className={cn(
              "flex items-center px-4 py-1.5 text-sm font-medium rounded-md transition-all",
              view === 'rendimiento'
                ? "bg-[var(--color-surface-default)] text-[var(--color-primary)] shadow-sm"
                : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
            )}
          >
            <TrendingUp className="w-4 h-4 mr-2" />
            Rendimiento
          </button>
          <button
            onClick={() => setView('ejercicios')}
            className={cn(
              "flex items-center px-4 py-1.5 text-sm font-medium rounded-md transition-all",
              view === 'ejercicios'
                ? "bg-[var(--color-surface-default)] text-[var(--color-primary)] shadow-sm"
                : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
            )}
          >
            <LayoutList className="w-4 h-4 mr-2" />
            Ejercicios
          </button>
        </div>
      </div>

      {/* 2. Contenido según vista */}
      {view === 'rendimiento' && (
        <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200">
          {/* Métricas de KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <StatCard
              value={kpis.ratioCompletado}
              suffix="%"
              label="Ratio completado"
              icon={CheckCircle}
              variant="success"
              tooltip={`Porcentaje de bloques completados vs omitidos. Completados: ${kpis.totalCompletados}, Omitidos: ${kpis.totalOmitidos}`}
            />
            <StatCard
              value={kpis.porcentajeCompletadas}
              suffix="%"
              label="Sesiones sin omitir"
              icon={CheckCircle}
              variant="success"
              tooltip="Porcentaje de sesiones completadas sin omitir bloques"
            />
            <StatCard
              value={tiempoRealVsObjetivo.porcentajeCumplimiento}
              suffix="%"
              label="Cumplimiento objetivo"
              icon={Clock}
              variant={parseFloat(tiempoRealVsObjetivo.porcentajeCumplimiento) >= 90 ? 'success' : 'warning'}
              tooltip={`Porcentaje de tiempo real vs tiempo objetivo. Real: ${formatDuracionHM(tiempoRealVsObjetivo.totalReal)}, Objetivo: ${formatDuracionHM(tiempoRealVsObjetivo.totalObjetivo)}`}
            />
            <StatCard
              value={tiempoRealVsObjetivo.porcentajeSesionesCumplen}
              suffix="%"
              label="Sesiones cumplen"
              icon={TrendingUp}
              variant="info"
              tooltip={`${tiempoRealVsObjetivo.sesionesCumplenObjetivo} de ${tiempoRealVsObjetivo.totalSesiones} sesiones cumplen al menos el 90% del objetivo`}
            />
          </div>

          {/* Gráfico de evolución temporal (Dual Axis: Tiempo vs Valoración) */}
          <Card className={`${componentStyles.components.cardBase} ${isMobile ? '!p-0' : ''}`}>
            <CardHeader className={`${isMobile ? 'px-1 pt-1 pb-0.5' : 'p-1.5'} sm:p-2 md:p-3`}>
              <CardTitle className="text-sm sm:text-base md:text-lg flex items-center gap-2">
                <Activity className="w-4 h-4 sm:w-5 sm:h-5 text-[var(--color-primary)]" />
                Evolución Temporal
              </CardTitle>
            </CardHeader>
            <CardContent className={`${isMobile ? 'px-1 pb-1' : 'p-1.5'} sm:p-2 md:p-3`}>
              {datosLinea.length === 0 ? (
                <div className="text-center py-8 sm:py-12">
                  <TrendingUp className={componentStyles.components.emptyStateIcon} />
                  <p className={componentStyles.components.emptyStateText}>
                    No hay datos en el periodo seleccionado
                  </p>
                </div>
              ) : (
                <div className="w-full overflow-x-auto -mx-2 px-2">
                  <ResponsiveContainer width="100%" height={isMobile ? 250 : 350} minHeight={250}>
                    <LineChart data={datosLinea} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" vertical={false} />
                      <XAxis
                        dataKey="fecha"
                        tick={{ fontSize: 10, fill: "var(--color-text-secondary)" }}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={formatFecha}
                        dy={10}
                      />
                      {/* Eje Y Izquierdo: Tiempo */}
                      <YAxis
                        yAxisId="left"
                        orientation="left"
                        tick={{ fontSize: 10, fill: "var(--color-text-secondary)" }}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(val) => `${val}m`}
                        width={40}
                      />
                      {/* Eje Y Derecho: Valoración */}
                      <YAxis
                        yAxisId="right"
                        orientation="right"
                        domain={[0, 4]}
                        ticks={[0, 1, 2, 3, 4]}
                        tick={{ fontSize: 10, fill: "var(--color-text-secondary)" }}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(val) => `${val}★`}
                        width={30}
                      />
                      <RechartsTooltip
                        contentStyle={{
                          backgroundColor: 'var(--color-surface-elevated)',
                          border: '1px solid var(--color-border-default)',
                          borderRadius: '8px',
                          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                        }}
                        itemStyle={{ fontSize: '12px', padding: 0 }}
                        formatter={(value, name) => {
                          if (name === 'tiempo') return [`${value.toFixed(1)} min`, 'Tiempo'];
                          if (name === 'satisfaccion') return [`${value != null ? value.toFixed(1) : ''} / 4`, 'Valoración'];
                          return [value, name];
                        }}
                        labelStyle={{ color: 'var(--color-text-primary)', marginBottom: '0.25rem', fontWeight: 600 }}
                        labelFormatter={(label) => formatFecha(label)}
                      />
                      <Legend
                        verticalAlign="top"
                        height={36}
                        iconType="circle"
                        wrapperStyle={{ fontSize: '12px', paddingTop: '0px' }}
                      />
                      <Line
                        yAxisId="left"
                        type="monotone"
                        dataKey="tiempo"
                        name="Tiempo"
                        stroke="var(--color-primary)"
                        strokeWidth={2}
                        dot={{ r: 3, fill: "var(--color-primary)", strokeWidth: 0 }}
                        activeDot={{ r: 5 }}
                      />
                      <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="satisfaccion"
                        name="Valoración"
                        stroke="var(--color-success)"
                        strokeWidth={2}
                        strokeDasharray="5 5"
                        dot={{ r: 3, fill: "var(--color-success)", strokeWidth: 0 }}
                        activeDot={{ r: 5 }}
                        connectNulls={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Gráfico de completados vs omitidos (Optional, keeping it as it was in original) */}
          <Card className={`${componentStyles.components.cardBase} ${isMobile ? '!p-0' : ''}`}>
            <CardHeader className={`${isMobile ? 'px-1 pt-1 pb-0.5' : 'p-1.5'} sm:p-2 md:p-3`}>
              <CardTitle className="text-sm sm:text-base md:text-lg flex items-center gap-2">
                <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-[var(--color-success)]" />
                Bloques Completados vs Omitidos
              </CardTitle>
            </CardHeader>
            <CardContent className={`${isMobile ? 'px-1 pb-1' : 'p-1.5'} sm:p-2 md:p-3`}>
              {datosLinea.length === 0 ? (
                <div className="text-center py-8 sm:py-12">
                  <XCircle className={componentStyles.components.emptyStateIcon} />
                  <p className={componentStyles.components.emptyStateText}>
                    No hay datos en el periodo seleccionado
                  </p>
                </div>
              ) : (
                <div className="w-full overflow-x-auto -mx-2 px-2">
                  <ResponsiveContainer width="100%" height={isMobile ? 200 : 300} minHeight={200}>
                    <LineChart data={datosLinea} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
                      <XAxis
                        dataKey="fecha"
                        tick={{ fontSize: 10, fill: "var(--color-text-secondary)" }}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={formatFecha}
                      />
                      <YAxis
                        tick={{ fontSize: 10, fill: "var(--color-text-secondary)" }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <RechartsTooltip
                        contentStyle={{
                          backgroundColor: 'var(--color-surface-elevated)',
                          border: '1px solid var(--color-border-default)',
                          borderRadius: '8px',
                        }}
                        labelStyle={{ color: 'var(--color-text-primary)', fontWeight: 600 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="completados"
                        stroke="var(--color-success)"
                        strokeWidth={2}
                        name="Completados"
                        dot={{ r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="omitidos"
                        stroke="var(--color-danger)"
                        strokeWidth={2}
                        name="Omitidos"
                        dot={{ r: 4 }}
                        activeDot={{ r: 6 }}
                      />
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
          {/* 1. Tipos de Bloque */}
          <TiposBloquesTab tiposBloques={tiposBloque} />

          {/* 2. Top Ejercicios */}
          <TopEjerciciosTab topEjercicios={topEjercicios} />
        </div>
      )}

    </div>
  );
}
