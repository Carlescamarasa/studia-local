import React from "react";
import KpiTile from "./KpiTile";
import StreakMetric from "./StreakMetric";
import RatingStarsMetric from "./RatingStarsMetric";
import { Timer, Clock, CalendarRange, Repeat } from "lucide-react";
import { formatDuracionHM } from "./utils";

/**
 * ResumenTab - Tab de resumen con 6 KPIs unificados visualmente.
 * 
 * @param {Object} props
 * @param {Object} props.kpis
 */
export default function ResumenTab({ kpis }) {

  return (
    <div className="space-y-6">
      {/* 
        Grid Layout:
        - Desktop (lg): 6 columnas
        - Tablet (sm): 3 columnas
        - Mobile: 2 columnas
      */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 border-b border-[var(--color-border-default)] pb-6">

        {/* 1. Tiempo Total */}
        <KpiTile
          icon={Timer}
          label="Tiempo total"
          value={`${Math.round((kpis.tiempoTotal || 0) / 60)} min`} // Asumiendo kpis.tiempoTotal es segundos? formatDuracionHM devuelve string "Xh Ym". Si queremos "X min", calculamos manual.
          /* 
             NOTA: Si formatDuracionHM devuelve "1h 30m", el usuario pidió "{totalMinutes} min".
             Validaré la unidad de tiempoTotal. Usualmente es segundos en este codebase.
             Si es segundos -> kpis.tiempoTotal / 60.
          */
          valueClassName="text-orange-500"
          subtext=""
        />

        {/* 2. Promedio/Sesión */}
        <KpiTile
          icon={Clock}
          label="Prom/sesión"
          value={`${Math.round((kpis.tiempoPromedioPorSesion || 0) / 60)} min`}
        />

        {/* 3. Valoración */}
        <RatingStarsMetric
          value={kpis.calidadPromedio}
          max={4}
        />

        {/* 4. Racha */}
        <StreakMetric
          streakDays={kpis.racha.actual}
          maxStreak={kpis.racha.maxima}
        />

        {/* 5. Semanas Activas */}
        <KpiTile
          icon={CalendarRange}
          label="Semanas activas"
          value={kpis.semanasDistintas}
          subtext="en el periodo"
        />

        {/* 6. Frecuencia Semanal */}
        <KpiTile
          icon={Repeat}
          label="Frecuencia semanal"
          value={kpis.mediaSemanalSesiones.toFixed(1)}
          valueClassName="text-[var(--color-success)]"
          subtext="ses/sem · media"
        />
      </div>
    </div>
  );
}
