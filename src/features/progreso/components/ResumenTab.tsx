/* eslint-disable @typescript-eslint/no-explicit-any */
 
import React from "react";
import KpiTile from "./KpiTile";
import StreakMetric from "./StreakMetric";
import RatingStarsMetric from "./RatingStarsMetric";
import { Timer, Clock, CalendarRange, Repeat } from "lucide-react";
import { formatDurationDDHHMM, formatDurationChart } from "../utils/progresoUtils";
import HabilidadesView from "./HabilidadesView";

/**
 * ResumenTab - Tab de resumen con 6 KPIs unificados visualmente y vista de habilidades.
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
    // Props for HabilidadesView
    alumnosSeleccionados?: string[];
    allStudentIds?: string[];
    userIdActual?: string;
    fechaInicio?: string;
    fechaFin?: string;
    xpData?: any[];
    evaluations?: any[];
    feedbacks?: any[];
    users?: any[];
}

export default function ResumenTab({
    kpis,
    alumnosSeleccionados,
    allStudentIds,
    userIdActual,
    fechaInicio,
    fechaFin,
    xpData,
    evaluations,
    feedbacks,
    users
}: ResumenTabProps) {
    return (
        <div className="space-y-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 sm:gap-4 border-b border-[var(--color-border-default)] pb-6">
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

            {/* Panel de Habilidades - cálculos totales (sin filtros de forma/rango) */}
            <div className="mt-6">
                <HabilidadesView
                    alumnosSeleccionados={alumnosSeleccionados}
                    allStudentIds={allStudentIds}
                    userIdActual={userIdActual}
                    fechaInicio={fechaInicio}
                    fechaFin={fechaFin}
                    xpData={xpData}
                    evaluations={evaluations}
                    feedbacks={feedbacks}
                    users={users}
                    hideViewModeToggle={true}
                    forceViewMode="rango"
                    customTitle="Habilidades"
                />
            </div>
        </div>
    );
}
