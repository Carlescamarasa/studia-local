import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ds";
import { Calendar } from "lucide-react";
import { componentStyles } from "@/design/componentStyles";
import { useIsMobile } from "@/hooks/use-mobile";
import { formatLocalDate, parseLocalDate, startOfMonday } from "./utils";
import { cn } from "@/lib/utils";

/**
 * HeatmapActividad - Componente de heatmap estilo GitHub para mostrar actividad
 * 
 * @param {Object} props
 * @param {Array} props.data - Array de { fecha, sesiones, tiempo }
 * @param {string} props.periodoInicio - Fecha inicio (YYYY-MM-DD)
 * @param {string} props.periodoFin - Fecha fin (YYYY-MM-DD)
 */
export default function HeatmapActividad({ data, periodoInicio, periodoFin }) {
  const isMobile = useIsMobile();

  // Generar todas las fechas del período
  const todasLasFechas = React.useMemo(() => {
    if (!periodoInicio || !periodoFin) return [];
    
    const inicio = parseLocalDate(periodoInicio);
    const fin = parseLocalDate(periodoFin);
    const fechas = [];
    const fechaActual = new Date(inicio);
    
    while (fechaActual <= fin) {
      fechas.push(formatLocalDate(fechaActual));
      fechaActual.setDate(fechaActual.getDate() + 1);
    }
    
    return fechas;
  }, [periodoInicio, periodoFin]);

  // Crear mapa de actividad por fecha
  const actividadMap = React.useMemo(() => {
    const map = new Map();
    data.forEach(d => {
      map.set(d.fecha, d);
    });
    return map;
  }, [data]);

  // Calcular intensidad (0-4) basada en número de sesiones
  const getIntensidad = (fecha) => {
    const actividad = actividadMap.get(fecha);
    if (!actividad || actividad.sesiones === 0) return 0;
    if (actividad.sesiones === 1) return 1;
    if (actividad.sesiones === 2) return 2;
    if (actividad.sesiones >= 3 && actividad.sesiones < 5) return 3;
    return 4; // 5+ sesiones
  };

  // Agrupar por semanas (lunes a domingo)
  const semanas = React.useMemo(() => {
    if (todasLasFechas.length === 0) return [];
    
    const semanasMap = new Map();
    
    todasLasFechas.forEach(fecha => {
      const fechaDate = parseLocalDate(fecha);
      const lunes = startOfMonday(fechaDate);
      const semanaKey = formatLocalDate(lunes);
      
      if (!semanasMap.has(semanaKey)) {
        semanasMap.set(semanaKey, []);
      }
      semanasMap.get(semanaKey).push(fecha);
    });
    
    return Array.from(semanasMap.entries())
      .map(([semanaKey, fechas]) => ({
        semanaKey,
        lunes: parseLocalDate(semanaKey),
        fechas: fechas.sort(),
      }))
      .sort((a, b) => a.semanaKey.localeCompare(b.semanaKey));
  }, [todasLasFechas]);

  // Nombres de días de la semana
  const nombresDias = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

  const getColorClass = (intensidad) => {
    switch (intensidad) {
      case 0: return 'bg-[var(--color-surface-muted)]';
      case 1: return 'bg-[var(--color-primary)]/20';
      case 2: return 'bg-[var(--color-primary)]/40';
      case 3: return 'bg-[var(--color-primary)]/60';
      case 4: return 'bg-[var(--color-primary)]';
      default: return 'bg-[var(--color-surface-muted)]';
    }
  };

  if (todasLasFechas.length === 0) {
    return (
      <Card className={componentStyles.components.cardBase}>
        <CardHeader>
          <CardTitle className="text-sm sm:text-base md:text-lg flex items-center gap-2">
            <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-[var(--color-primary)]" />
            Actividad por Día
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
        <CardTitle className="text-sm sm:text-base md:text-lg flex items-center gap-2">
          <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-[var(--color-primary)]" />
          Actividad por Día
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <div className="inline-block min-w-full">
            {/* Leyenda */}
            <div className="flex items-center justify-end gap-2 mb-4 text-xs text-[var(--color-text-secondary)]">
              <span>Menos</span>
              <div className="flex gap-1">
                {[0, 1, 2, 3, 4].map(i => (
                  <div
                    key={i}
                    className={cn(
                      "w-3 h-3 rounded",
                      getColorClass(i)
                    )}
                  />
                ))}
              </div>
              <span>Más</span>
            </div>

            {/* Heatmap */}
            <div className="flex gap-1">
              {/* Columna de días de la semana */}
              <div className="flex flex-col gap-1 mr-2">
                {nombresDias.map((dia, idx) => (
                  <div
                    key={idx}
                    className="h-3 sm:h-4 text-[8px] sm:text-[10px] text-[var(--color-text-secondary)] flex items-center justify-end pr-1"
                    style={{ minHeight: isMobile ? '12px' : '16px' }}
                  >
                    {idx % 2 === 0 ? dia : ''}
                  </div>
                ))}
              </div>

              {/* Semanas */}
              <div className="flex gap-1 overflow-x-auto">
                {semanas.map((semana, semanaIdx) => (
                  <div key={semana.semanaKey} className="flex flex-col gap-1">
                    {/* Días de la semana */}
                    {[0, 1, 2, 3, 4, 5, 6].map(diaSemana => {
                      const fechaEsperada = new Date(semana.lunes);
                      fechaEsperada.setDate(semana.lunes.getDate() + diaSemana);
                      const fechaKey = formatLocalDate(fechaEsperada);
                      const intensidad = getIntensidad(fechaKey);
                      const actividad = actividadMap.get(fechaKey);

                      return (
                        <div
                          key={fechaKey}
                          className={cn(
                            "w-3 sm:w-4 h-3 sm:h-4 rounded cursor-pointer transition-all hover:scale-110",
                            getColorClass(intensidad),
                            actividad && actividad.sesiones > 0 && "ring-1 ring-[var(--color-primary)]/30"
                          )}
                          title={actividad 
                            ? `${fechaKey}: ${actividad.sesiones} sesión${actividad.sesiones > 1 ? 'es' : ''}, ${Math.round(actividad.tiempo / 60)} min`
                            : `${fechaKey}: Sin actividad`
                          }
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>

            {/* Etiquetas de semanas (opcional, solo en desktop) */}
            {!isMobile && semanas.length > 0 && (
              <div className="flex gap-1 mt-2 ml-8">
                {semanas.map((semana, idx) => {
                  if (idx % 4 !== 0) return null; // Mostrar cada 4 semanas
                  return (
                    <div
                      key={semana.semanaKey}
                      className="w-3 sm:w-4 text-[8px] sm:text-[10px] text-[var(--color-text-secondary)] text-center"
                    >
                      {semana.lunes.getDate()}/{semana.lunes.getMonth() + 1}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

