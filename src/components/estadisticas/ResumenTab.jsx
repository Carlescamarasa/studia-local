import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ds";
import StatCard from "./StatCard";
import RachaBadge from "./RachaBadge";
import { Clock, Timer, Smile, Calendar, CalendarDays, Activity, TrendingUp } from "lucide-react";
import { formatDuracionHM, parseLocalDate } from "./utils";
import Tabs from "@/components/ds/Tabs";
import { Sun, CalendarRange, Grid3x3 } from "lucide-react";
import { componentStyles } from "@/design/componentStyles";
import { useIsMobile } from "@/hooks/use-mobile";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';

/**
 * ResumenTab - Tab de resumen con KPIs y gráfico de evolución
 * 
 * @param {Object} props
 * @param {Object} props.kpis - Objeto con métricas calculadas
 * @param {Array} props.datosLinea - Datos para el gráfico de línea
 * @param {string} props.granularidad - 'dia' | 'semana' | 'mes'
 * @param {Function} props.onGranularidadChange - Callback para cambiar granularidad
 */
export default function ResumenTab({
  kpis,
  datosLinea,
  granularidad,
  onGranularidadChange,
}) {
  const isMobile = useIsMobile();

  return (
    <div className="space-y-6">
      {/* KPIs - Grid responsive */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 md:gap-6 px-2 py-4 sm:py-6 border-b border-[var(--color-border-default)]">
        <StatCard
          value={formatDuracionHM(kpis.tiempoTotal)}
          label="Tiempo total"
          icon={Clock}
          variant="primary"
        />

        <StatCard
          value={formatDuracionHM(kpis.tiempoPromedioPorSesion)}
          label="Promedio/sesión"
          icon={Timer}
          variant="primary"
        />

        <StatCard
          value={kpis.calidadPromedio}
          suffix="/4"
          label="Valoración"
          icon={Smile}
          variant="success"
        />

        <div className="text-center flex flex-col items-center justify-center">
          <RachaBadge
            rachaActual={kpis.racha.actual}
            rachaMaxima={kpis.racha.maxima}
          />
        </div>

        <StatCard
          value={kpis.semanasDistintas}
          label="Semanas practicadas"
          icon={Calendar}
          variant="info"
        />

        <StatCard
          value={kpis.mediaSemanalSesiones.toFixed(1)}
          label="Sesiones/semana"
          icon={Activity}
          variant="primary"
        />
      </div>

      {/* Gráficos separados - Tiempo y Valoración */}
      <div className="space-y-4">

        {/* Gráfica de Tiempo de Estudio */}
        <Card className={`${componentStyles.components.cardBase} ${isMobile ? '!p-0' : ''}`}>
          <CardHeader className={`${isMobile ? 'px-1 pt-1 pb-0.5' : 'p-1.5'} sm:p-2 md:p-3`}>
            <CardTitle className="text-sm sm:text-base md:text-lg flex items-center gap-2">
              <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-[var(--color-primary)]" />
              Tiempo de Estudio
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
                <ResponsiveContainer width="100%" height={isMobile ? 180 : 250} minHeight={180}>
                  <LineChart data={datosLinea} margin={{ top: 5, right: isMobile ? 5 : 20, left: isMobile ? -10 : 0, bottom: isMobile ? 40 : 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
                    <XAxis
                      dataKey="fecha"
                      tick={{ fontSize: isMobile ? 9 : 11 }}
                      angle={isMobile ? -45 : 0}
                      textAnchor={isMobile ? 'end' : 'middle'}
                      height={isMobile ? 60 : 30}
                      interval={isMobile ? 'preserveStartEnd' : 0}
                      tickFormatter={(fecha) => {
                        if (granularidad === 'dia') {
                          const d = parseLocalDate(fecha);
                          return isMobile
                            ? `${d.getDate()}/${d.getMonth() + 1}`
                            : d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
                        } else if (granularidad === 'semana') {
                          const d = parseLocalDate(fecha);
                          return `${d.getDate()}/${d.getMonth() + 1}`;
                        } else {
                          const [y, m] = fecha.split('-');
                          const d = new Date(Number(y), Number(m) - 1, 1);
                          return isMobile
                            ? `${m}/${y.slice(-2)}`
                            : d.toLocaleDateString('es-ES', { month: 'short', year: '2-digit' });
                        }
                      }}
                    />
                    <YAxis
                      tick={{ fontSize: isMobile ? 9 : 11 }}
                      width={isMobile ? 30 : 50}
                      tickFormatter={(v) => {
                        const minutos = Math.round(v);
                        if (minutos >= 60) {
                          const horas = Math.floor(minutos / 60);
                          return isMobile ? `${horas}h` : `${horas} h`;
                        }
                        return isMobile ? `${minutos}m` : `${minutos} min`;
                      }}
                    />
                    <RechartsTooltip
                      content={({ active, payload }) => {
                        if (!active || !payload || payload.length === 0) return null;
                        return (
                          <div className={`${componentStyles.components.panelBase} bg-[var(--color-surface-elevated)] border border-[var(--color-border-default)] shadow-lg p-3 rounded-lg`}>
                            <p className="text-xs font-semibold mb-2 text-[var(--color-text-primary)]">
                              {granularidad === 'dia'
                                ? parseLocalDate(payload[0]?.payload.fecha).toLocaleDateString('es-ES')
                                : payload[0]?.payload.fecha}
                            </p>
                            <p className="text-xs text-[var(--color-primary)]">
                              <strong>Tiempo:</strong> {formatDuracionHM(payload[0]?.payload.tiempo * 60)}
                            </p>
                          </div>
                        );
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
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Gráfica de Evolución de Valoración - Separada */}
        {datosLinea.some(d => d.satisfaccion !== null) && (
          <Card className={`${componentStyles.components.cardBase} ${isMobile ? '!p-0' : ''}`}>
            <CardHeader className={`${isMobile ? 'px-1 pt-1 pb-0.5' : 'p-1.5'} sm:p-2 md:p-3`}>
              <CardTitle className="text-sm sm:text-base md:text-lg flex items-center gap-2">
                <Smile className="w-4 h-4 sm:w-5 sm:h-5 text-[var(--color-success)]" />
                Evolución de Valoración
              </CardTitle>
            </CardHeader>
            <CardContent className={`${isMobile ? 'px-1 pb-1' : 'p-1.5'} sm:p-2 md:p-3`}>
              <div className="w-full overflow-x-auto -mx-2 px-2">
                <ResponsiveContainer width="100%" height={isMobile ? 180 : 250} minHeight={180}>
                  <LineChart data={datosLinea} margin={{ top: 5, right: isMobile ? 5 : 20, left: isMobile ? -10 : 0, bottom: isMobile ? 40 : 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
                    <XAxis
                      dataKey="fecha"
                      tick={{ fontSize: isMobile ? 9 : 11 }}
                      angle={isMobile ? -45 : 0}
                      textAnchor={isMobile ? 'end' : 'middle'}
                      height={isMobile ? 60 : 30}
                      interval={isMobile ? 'preserveStartEnd' : 0}
                      tickFormatter={(fecha) => {
                        if (granularidad === 'dia') {
                          const d = parseLocalDate(fecha);
                          return isMobile
                            ? `${d.getDate()}/${d.getMonth() + 1}`
                            : d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
                        } else if (granularidad === 'semana') {
                          const d = parseLocalDate(fecha);
                          return `${d.getDate()}/${d.getMonth() + 1}`;
                        } else {
                          const [y, m] = fecha.split('-');
                          const d = new Date(Number(y), Number(m) - 1, 1);
                          return isMobile
                            ? `${m}/${y.slice(-2)}`
                            : d.toLocaleDateString('es-ES', { month: 'short', year: '2-digit' });
                        }
                      }}
                    />
                    <YAxis
                      tick={{ fontSize: isMobile ? 9 : 11 }}
                      width={isMobile ? 30 : 50}
                      domain={[0, 4]}
                      tickFormatter={(v) => `${v}/4`}
                    />
                    <RechartsTooltip
                      content={({ active, payload }) => {
                        if (!active || !payload || payload.length === 0) return null;
                        const satisfaccion = payload[0]?.payload.satisfaccion;
                        if (satisfaccion === null || satisfaccion === undefined) return null;
                        return (
                          <div className={`${componentStyles.components.panelBase} bg-[var(--color-surface-elevated)] border border-[var(--color-border-default)] shadow-lg p-3 rounded-lg`}>
                            <p className="text-xs font-semibold mb-2 text-[var(--color-text-primary)]">
                              {granularidad === 'dia'
                                ? parseLocalDate(payload[0]?.payload.fecha).toLocaleDateString('es-ES')
                                : payload[0]?.payload.fecha}
                            </p>
                            <p className="text-xs text-[var(--color-success)]">
                              <strong>Valoración:</strong> {satisfaccion}/4
                            </p>
                          </div>
                        );
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="satisfaccion"
                      stroke="var(--color-success)"
                      strokeWidth={2}
                      dot={{ r: isMobile ? 3 : 4 }}
                      activeDot={{ r: isMobile ? 5 : 6 }}
                      connectNulls
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

