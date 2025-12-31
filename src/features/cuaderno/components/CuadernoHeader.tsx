import React from "react";
import { PageHeader } from "@/features/shared/components/ds";
import { Button } from "@/features/shared/components/ui/button";
import { Notebook, Plus } from "lucide-react";
// @ts-expect-error
import PeriodHeader from "@/features/shared/components/common/PeriodHeader";
import { parseLocalDate, isoWeekNumber } from "../utils";

interface CuadernoHeaderProps {
    semanaActualISO: string;
    onPrev: () => void;
    onNext: () => void;
    onToday: () => void;
    onNuevaAsignacion?: () => void;
}

/**
 * CuadernoHeader - Header with week navigation and "Nueva Asignación" button
 */
export default function CuadernoHeader({
    semanaActualISO,
    onPrev,
    onNext,
    onToday,
    onNuevaAsignacion
}: CuadernoHeaderProps) {
    const lunesSemana = parseLocalDate(semanaActualISO);
    const domingoSemana = new Date(lunesSemana);
    domingoSemana.setDate(lunesSemana.getDate() + 6);
    const numeroSemana = isoWeekNumber(lunesSemana);
    const labelSemana = `Semana ${numeroSemana}`;
    const rangeTextSemana = `${lunesSemana.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })} – ${domingoSemana.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}`;

    const handleNuevaAsignacion = () => {
        onNuevaAsignacion?.();
    };

    return (
        <div className="space-y-4 mb-6">
            <PageHeader
                icon={Notebook}
                title="Cuaderno"
                subtitle="Cuaderno de seguimiento y asignación"
                actions={
                    <div className="flex flex-wrap gap-2 items-center">
                        <Button
                            onClick={handleNuevaAsignacion}
                            size="sm"
                            className="gap-1.5"
                        >
                            <Plus className="w-4 h-4" />
                            Nueva Asignación
                        </Button>
                        <PeriodHeader
                            label={labelSemana}
                            rangeText={rangeTextSemana}
                            onPrev={onPrev}
                            onNext={onNext}
                            onToday={onToday}
                            className="bg-card text-card-foreground rounded-lg px-2 py-1 shadow-sm"
                        />
                    </div>
                }
            />
        </div>
    );
}
