import React from "react";
import KpiTile from "./KpiTile";
import StreakMetric from "./StreakMetric";
import RatingStarsMetric from "./RatingStarsMetric";
import { Timer, Clock, CalendarRange, Repeat } from "lucide-react";
import { formatDurationDDHHMM, formatDurationChart } from "../utils/progresoUtils";

/**
 * ResumenTab - Tab de resumen con 6 KPIs unificados visualmente.
 */
export interface ResumenTabProps {
    kpis: {
        tiempoTotal: number;
        tiempoPromedioPorSesion: number;
        calidadPromedio: number | null;
        racha: {
            actual: number;
            maxima: number;
        };
        semanasDistintas: number;
        mediaSemanalSesiones: number;
    };
}

export default function ResumenTab({ kpis }: ResumenTabProps) {
    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 border-b border-[var(--color-border-default)] pb-6">
                {/* 1. Tiempo Total */}
                <KpiTile
                    icon={Timer}
                    label="Tiempo total"
                    value={formatDurationDDHHMM(kpis.tiempoTotal, 'sec')}
                    valueClassName="text-orange-500"
                />

                {/* 2. Promedio/Sesión */}
                <KpiTile
                    icon={Clock}
                    label="Prom/sesión"
                    value={formatDurationChart(kpis.tiempoPromedioPorSesion)}
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
