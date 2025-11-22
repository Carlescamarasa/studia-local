import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ds";
import { Calendar } from "lucide-react";
import { componentStyles } from "@/design/componentStyles";
import { useIsMobile } from "@/hooks/use-mobile";
import { formatLocalDate, parseLocalDate, startOfMonday } from "./utils";
import { cn } from "@/lib/utils";

/**
 * HeatmapActividad - Componente de heatmap estilo GitHub Contributions
 * 
 * @param {Object} props
 * @param {Array} props.data - Array de { fecha, sesiones, tiempo } (tiempo en segundos)
 * @param {string} props.periodoInicio - Fecha inicio (YYYY-MM-DD)
 * @param {string} props.periodoFin - Fecha fin (YYYY-MM-DD)
 * @param {Array} props.registrosFiltrados - Registros de sesión para calcular resumen
 */
export default function HeatmapActividad({ data, periodoInicio, periodoFin, registrosFiltrados = [] }) {
  const isMobile = useIsMobile();

  // Nombres de días de la semana (0 = Lunes, 6 = Domingo)
  const nombresDias = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
  const nombresDiasCompletos = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

  // Crear mapa de actividad por fecha
  const actividadMap = useMemo(() => {
    const map = new Map();
    data.forEach(d => {
      map.set(d.fecha, d);
    });
    return map;
  }, [data]);

  // Generar semanas del período (desde el lunes de la primera semana hasta el domingo de la última)
  const semanasData = useMemo(() => {
    if (!periodoInicio || !periodoFin) return [];
    
    const inicio = parseLocalDate(periodoInicio);
    const fin = parseLocalDate(periodoFin);
    
    // Encontrar el lunes de la semana de inicio
    const lunesInicio = startOfMonday(inicio);
    
    // Encontrar el domingo de la semana de fin
    const finDate = new Date(fin);
    const diaSemanaFin = finDate.getDay(); // 0 = Domingo, 1 = Lunes, ...
    const diasHastaDomingo = diaSemanaFin === 0 ? 0 : 7 - diaSemanaFin;
    const domingoFin = new Date(finDate);
    domingoFin.setDate(finDate.getDate() + diasHastaDomingo);
    
    // Generar todas las semanas
    const semanas = [];
    const fechaActual = new Date(lunesInicio);
    
    while (fechaActual <= domingoFin) {
      const lunesSemana = new Date(fechaActual);
      const domingoSemana = new Date(fechaActual);
      domingoSemana.setDate(fechaActual.getDate() + 6);
      
      // Formatear etiqueta de semana
      const inicioSem = lunesSemana.getDate();
      const mesInicioSem = lunesSemana.toLocaleDateString('es-ES', { month: 'short' });
      const finSem = domingoSemana.getDate();
      const mesFinSem = domingoSemana.toLocaleDateString('es-ES', { month: 'short' });
      
      const etiquetaSemana = mesInicioSem === mesFinSem
        ? `${inicioSem}–${finSem} ${mesInicioSem}`
        : `${inicioSem} ${mesInicioSem}–${finSem} ${mesFinSem}`;
      
      semanas.push({
        lunes: new Date(lunesSemana),
        domingo: new Date(domingoSemana),
        etiqueta: etiquetaSemana,
        semanaKey: formatLocalDate(lunesSemana),
      });
      
      fechaActual.setDate(fechaActual.getDate() + 7);
    }
    
    return semanas;
  }, [periodoInicio, periodoFin]);

  // Crear matriz de datos: [weekday][weekIndex] = minutos
  const matrizActividad = useMemo(() => {
    const matriz = Array(7).fill(null).map(() => Array(semanasData.length).fill(0));
    const sesionesPorCelda = Array(7).fill(null).map(() => Array(semanasData.length).fill(0));
    
    data.forEach(actividad => {
      const fecha = parseLocalDate(actividad.fecha);
      const weekday = fecha.getDay(); // 0 = Domingo, 1 = Lunes, ...
      // Convertir a índice: 0 = Lunes, 6 = Domingo
      const weekdayIndex = weekday === 0 ? 6 : weekday - 1;
      
      // Encontrar en qué semana está esta fecha
      const weekIndex = semanasData.findIndex(semana => {
        return fecha >= semana.lunes && fecha <= semana.domingo;
      });
      
      if (weekIndex >= 0) {
        const minutos = Math.round((actividad.tiempo || 0) / 60);
        matriz[weekdayIndex][weekIndex] += minutos;
        sesionesPorCelda[weekdayIndex][weekIndex] += actividad.sesiones || 0;
      }
    });
    
    return { matriz, sesionesPorCelda };
  }, [data, semanasData]);

  // Calcular intensidad basada en minutos (0-4 niveles)
  const getIntensidad = (minutos) => {
    if (minutos === 0) return 0;
    if (minutos < 15) return 1;
    if (minutos < 30) return 2;
    if (minutos < 60) return 3;
    return 4; // 60+ minutos
  };

  // Calcular estadísticas para el resumen
  const resumen = useMemo(() => {
    if (registrosFiltrados.length === 0) return null;
    
    const diasConPractica = new Set();
    const minutosPorDiaSemana = [0, 0, 0, 0, 0, 0, 0]; // L-D
    const sesionesPorDiaSemana = [0, 0, 0, 0, 0, 0, 0];
    
    registrosFiltrados.forEach(registro => {
      if (!registro.inicioISO) return;
      const fecha = new Date(registro.inicioISO);
      const weekday = fecha.getDay();
      const weekdayIndex = weekday === 0 ? 6 : weekday - 1;
      
      diasConPractica.add(formatLocalDate(fecha));
      const minutos = Math.round((registro.duracionRealSeg || 0) / 60);
      minutosPorDiaSemana[weekdayIndex] += minutos;
      sesionesPorDiaSemana[weekdayIndex] += 1;
    });
    
    const diasPracticados = diasConPractica.size;
    const semanas = semanasData.length;
    const diasTotales = semanas * 7;
    const promedioDiasPorSemana = semanas > 0 ? (diasPracticados / semanas).toFixed(1) : 0;
    
    // Encontrar el día más practicado
    const maxMinutos = Math.max(...minutosPorDiaSemana);
    const diaMasPracticado = minutosPorDiaSemana.indexOf(maxMinutos);
    const segundoMaxMinutos = minutosPorDiaSemana.filter((_, i) => i !== diaMasPracticado).sort((a, b) => b - a)[0];
    const diaSegundoMasPracticado = minutosPorDiaSemana.indexOf(segundoMaxMinutos);
    
    return {
      diasPracticados,
      semanas,
      promedioDiasPorSemana,
      diaMasPracticado,
      diaSegundoMasPracticado,
      minutosPorDiaSemana,
    };
  }, [registrosFiltrados, semanasData]);

  // Obtener color según intensidad
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

  // Formatear fecha para tooltip
  const formatearFechaTooltip = (weekdayIndex, weekIndex) => {
    const semana = semanasData[weekIndex];
    if (!semana) return '';
    
    const fecha = new Date(semana.lunes);
    fecha.setDate(semana.lunes.getDate() + weekdayIndex);
    
    const nombreDia = nombresDiasCompletos[weekdayIndex];
    const dia = fecha.getDate();
    const mes = fecha.toLocaleDateString('es-ES', { month: 'short' });
    
    return `${nombreDia} ${dia} ${mes}`;
  };

  if (!periodoInicio || !periodoFin || semanasData.length === 0) {
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

  const maxMinutos = Math.max(...matrizActividad.matriz.flat());

  return (
    <Card className={componentStyles.components.cardBase}>
      <CardHeader>
        <div className="space-y-2">
          <CardTitle className="text-sm sm:text-base md:text-lg flex items-center gap-2">
            <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-[var(--color-primary)]" />
            Actividad por Día
          </CardTitle>
          <p className="text-xs text-[var(--color-text-secondary)]">
            Pasa el ratón sobre un día para ver detalles
          </p>
          {resumen && resumen.diasPracticados > 0 && (
            <div className="text-xs text-[var(--color-text-secondary)] space-y-1">
              {resumen.diaMasPracticado >= 0 && resumen.minutosPorDiaSemana[resumen.diaMasPracticado] > 0 && (
                <p>
                  <strong>Practicas más los {nombresDiasCompletos[resumen.diaMasPracticado]}s</strong>
                  {resumen.diaSegundoMasPracticado >= 0 && resumen.minutosPorDiaSemana[resumen.diaSegundoMasPracticado] > resumen.minutosPorDiaSemana[resumen.diaMasPracticado] * 0.5 && (
                    <span> y {nombresDiasCompletos[resumen.diaSegundoMasPracticado]}s</span>
                  )}
                </p>
              )}
              {resumen.promedioDiasPorSemana > 0 && (
                <p>
                  Sueles practicar <strong>{resumen.promedioDiasPorSemana} días por semana</strong> de media
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
              {/* Heatmap - Estilo GitHub */}
              <div className="flex gap-2">
                {/* Etiquetas de días de la semana (eje Y) */}
                <div className="flex flex-col gap-1 pt-7">
                  {nombresDias.map((dia, idx) => (
                    <div
                      key={idx}
                      className="h-[12px] sm:h-[14px] text-[10px] sm:text-[11px] text-[var(--color-text-secondary)] flex items-center justify-end pr-2 font-medium"
                      style={{ minHeight: isMobile ? '12px' : '14px' }}
                    >
                      {idx % 2 === 0 ? dia : ''}
                    </div>
                  ))}
                </div>

                {/* Grid de semanas (eje X) */}
                <div className="flex-1 min-w-0">
                  {/* Etiquetas de semanas (arriba) */}
                  <div className="flex gap-1 mb-1">
                    {semanasData.map((semana, weekIdx) => {
                      // Mostrar solo algunas etiquetas para no saturar
                      const mostrarEtiqueta = isMobile 
                        ? weekIdx % Math.ceil(semanasData.length / 6) === 0 || weekIdx === semanasData.length - 1
                        : weekIdx % Math.ceil(semanasData.length / 12) === 0 || weekIdx === semanasData.length - 1;
                      
                      if (!mostrarEtiqueta) return <div key={weekIdx} className="w-[12px] sm:w-[14px]" />;
                      
                      return (
                        <div
                          key={weekIdx}
                          className="w-[12px] sm:w-[14px] text-[9px] sm:text-[10px] text-[var(--color-text-secondary)] text-center font-medium"
                          title={semana.etiqueta}
                        >
                          {weekIdx % 2 === 0 ? semana.lunes.getDate() : ''}
                        </div>
                      );
                    })}
                  </div>

                  {/* Filas de días (7 filas) */}
                  <div className="flex flex-col gap-1">
                    {[0, 1, 2, 3, 4, 5, 6].map(weekdayIndex => (
                      <div key={weekdayIndex} className="flex gap-1">
                        {semanasData.map((semana, weekIndex) => {
                          const minutos = matrizActividad.matriz[weekdayIndex][weekIndex];
                          const sesiones = matrizActividad.sesionesPorCelda[weekdayIndex][weekIndex];
                          const intensidad = getIntensidad(minutos);
                          const fechaTooltip = formatearFechaTooltip(weekdayIndex, weekIndex);
                          
                          return (
                            <div
                              key={weekIndex}
                              className={cn(
                                "w-[12px] sm:w-[14px] h-[12px] sm:h-[14px] rounded-sm cursor-pointer transition-all hover:scale-125 hover:z-10 relative border",
                                getColorClass(intensidad),
                                minutos > 0 && "ring-1 ring-orange-400/30"
                              )}
                              title={
                                minutos > 0
                                  ? `${fechaTooltip} – ${minutos} min${sesiones > 0 ? ` (${sesiones} ${sesiones === 1 ? 'sesión' : 'sesiones'})` : ''}`
                                  : `${fechaTooltip} – Sin actividad`
                              }
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
                    intensidad === 1 ? '< 15 min' :
                    intensidad === 2 ? '15–29 min' :
                    intensidad === 3 ? '30–59 min' :
                    '60+ min'
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
