import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ds";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Clock, TrendingUp, CheckCircle, XCircle } from "lucide-react";
import { componentStyles } from "@/design/componentStyles";
import { useIsMobile } from "@/hooks/use-mobile";
import StatCard from "./StatCard";
import { formatDuracionHM, parseLocalDate } from "./utils";

/**
 * ProgresoTab - Tab de progreso con línea de tiempo detallada y métricas avanzadas
 * 
 * @param {Object} props
 * @param {Array} props.datosLinea - Datos para el gráfico de línea
 * @param {string} props.granularidad - 'dia' | 'semana' | 'mes'
 * @param {Function} props.onGranularidadChange - Callback para cambiar granularidad
 * @param {Object} props.tiempoRealVsObjetivo - Datos de comparación tiempo real vs objetivo
 * @param {Object} props.kpis - KPIs con nuevas métricas
 */
export default function ProgresoTab({
  datosLinea,
  granularidad,
  onGranularidadChange,
  tiempoRealVsObjetivo,
  kpis,
}) {
  const isMobile = useIsMobile();

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
      {/* Métricas de progreso */}
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
          label="Sesiones cumplen objetivo"
          icon={TrendingUp}
          variant="info"
          tooltip={`${tiempoRealVsObjetivo.sesionesCumplenObjetivo} de ${tiempoRealVsObjetivo.totalSesiones} sesiones cumplen al menos el 90% del objetivo`}
        />
      </div>

      {/* Gráfico de evolución temporal */}
      <Card className={`${componentStyles.components.cardBase} ${isMobile ? '!p-0' : ''}`}>
        <CardHeader className={`${isMobile ? 'px-1 pt-1 pb-0.5' : 'p-1.5'} sm:p-2 md:p-3`}>
          <CardTitle className="text-sm sm:text-base md:text-lg flex items-center gap-2">
            <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-[var(--color-primary)]" />
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
              <ResponsiveContainer width="100%" height={isMobile ? 200 : 300} minHeight={200}>
                <LineChart data={datosLinea} margin={{ top: 5, right: isMobile ? 5 : 20, left: isMobile ? -10 : 0, bottom: isMobile ? 50 : 30 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis 
                    dataKey="fecha" 
                    tick={{ fontSize: isMobile ? 9 : 11 }}
                    angle={isMobile ? -45 : 0}
                    textAnchor={isMobile ? 'end' : 'middle'}
                    height={isMobile ? 70 : 40}
                    interval={isMobile ? 'preserveStartEnd' : 0}
                    tickFormatter={formatFecha}
                  />
                  <YAxis 
                    tick={{ fontSize: isMobile ? 9 : 11 }}
                    width={isMobile ? 30 : 50}
                  />
                  <RechartsTooltip 
                    contentStyle={{ 
                      backgroundColor: 'var(--color-surface-elevated)',
                      border: '1px solid var(--color-border-default)',
                      borderRadius: '8px',
                      fontSize: isMobile ? '11px' : '12px',
                    }}
                    formatter={(value, name) => {
                      if (name === 'tiempo') return [`${value.toFixed(1)} min`, 'Tiempo'];
                      if (name === 'satisfaccion') return [`${value}/4`, 'Valoración'];
                      if (name === 'completados') return [value, 'Completados'];
                      if (name === 'omitidos') return [value, 'Omitidos'];
                      return [value, name];
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="tiempo" 
                    stroke="var(--color-primary)" 
                    strokeWidth={2}
                    dot={{ r: isMobile ? 3 : 4 }}
                    activeDot={{ r: isMobile ? 5 : 6 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="satisfaccion" 
                    stroke="var(--color-success)" 
                    strokeWidth={2}
                    dot={{ r: isMobile ? 3 : 4 }}
                    activeDot={{ r: isMobile ? 5 : 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Gráfico de completados vs omitidos */}
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
                <BarChart data={datosLinea} margin={{ top: 5, right: isMobile ? 5 : 20, left: isMobile ? -10 : 0, bottom: isMobile ? 50 : 30 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis 
                    dataKey="fecha" 
                    tick={{ fontSize: isMobile ? 9 : 11 }}
                    angle={isMobile ? -45 : 0}
                    textAnchor={isMobile ? 'end' : 'middle'}
                    height={isMobile ? 70 : 40}
                    interval={isMobile ? 'preserveStartEnd' : 0}
                    tickFormatter={formatFecha}
                  />
                  <YAxis 
                    tick={{ fontSize: isMobile ? 9 : 11 }}
                    width={isMobile ? 30 : 50}
                  />
                  <RechartsTooltip 
                    contentStyle={{ 
                      backgroundColor: 'var(--color-surface-elevated)',
                      border: '1px solid var(--color-border-default)',
                      borderRadius: '8px',
                      fontSize: isMobile ? '11px' : '12px',
                    }}
                  />
                  <Bar dataKey="completados" fill="var(--color-success)" name="Completados" />
                  <Bar dataKey="omitidos" fill="var(--color-danger)" name="Omitidos" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

