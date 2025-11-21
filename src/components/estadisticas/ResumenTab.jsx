import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ds";
import StatCard from "./StatCard";
import { Clock, Timer, Smile, Star, Calendar, CalendarDays, Activity, TrendingUp } from "lucide-react";
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
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 sm:gap-4 md:gap-6 px-2 py-4 sm:py-6 border-b border-[var(--color-border-default)]">
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
        
        <StatCard
          value={kpis.racha.actual}
          label="Racha"
          icon={Star}
          variant="warning"
          tooltip={`Racha actual: ${kpis.racha.actual}, Máxima: ${kpis.racha.maxima}`}
        />
        
        <div className="text-center">
          <p className="text-[10px] sm:text-xs text-[var(--color-text-muted)] mt-0.5">
            Máx: {kpis.racha.maxima}
          </p>
        </div>
        
        <StatCard
          value={kpis.semanasDistintas}
          label="Semanas practicadas"
          icon={Calendar}
          variant="info"
        />
        
        <StatCard
          value={kpis.semanasPeriodo}
          label="Semanas totales"
          icon={CalendarDays}
          variant="default"
        />
        
        <StatCard
          value={kpis.mediaSemanalSesiones.toFixed(1)}
          label="Sesiones/semana"
          icon={Activity}
          variant="primary"
        />
      </div>

      {/* Tabs de granularidad y gráfico */}
      <div className="space-y-4">
        <div className="flex justify-center">
          <Tabs
            variant="segmented"
            value={granularidad}
            onChange={onGranularidadChange}
            showIconsOnlyMobile={true}
            items={[
              { value: 'dia', label: 'Diario', icon: Sun },
              { value: 'semana', label: 'Semanal', icon: CalendarRange },
              { value: 'mes', label: 'Mensual', icon: Grid3x3 },
            ]}
          />
        </div>

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
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
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
                    />
                    <RechartsTooltip 
                      contentStyle={{ 
                        backgroundColor: 'var(--color-surface-elevated)',
                        border: '1px solid var(--color-border-default)',
                        borderRadius: '8px',
                        fontSize: isMobile ? '11px' : '12px',
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
      </div>
    </div>
  );
}

