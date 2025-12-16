import React from "react";
import StatCard from "./StatCard";
import RachaBadge from "./RachaBadge";
import { Clock, Timer, Smile, Calendar, Activity } from "lucide-react";
import { formatDuracionHM } from "./utils";

/**
 * ResumenTab - Tab de resumen con KPIs
 * 
 * @param {Object} props
 * @param {Object} props.kpis - Objeto con métricas calculadas
 */
export default function ResumenTab({ kpis }) {

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
    </div>
  );
}

