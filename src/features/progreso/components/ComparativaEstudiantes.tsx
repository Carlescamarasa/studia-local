/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useMemo } from "react";
import { Card, CardContent } from "@/features/shared/components/ds";
import { componentStyles } from "@/design/componentStyles";
import { formatDuracionHM } from "../utils/progresoUtils";
import UnifiedTable from "@/features/shared/components/tables/UnifiedTable";
import { Badge } from "@/features/shared/components/ds";
import { displayName } from "@/features/shared/utils/helpers";

/**
 * ComparativaEstudiantes - Componente para comparar métricas entre estudiantes (PROF/ADMIN)
 */
export interface ComparativaEstudiantesProps {
    estudiantes: Array<{
        id: string;
        tiempoTotal: number;
        sesiones: number;
        sesionesPorSemana: number;
        calificacionPromedio: string | number | null;
        ratioCompletado?: number;
        racha?: number;
        rachaMaxima?: number;
    }>;
    usuarios: any[];
}

export default function ComparativaEstudiantes({ estudiantes, usuarios }: ComparativaEstudiantesProps) {
    // Use all students directly (filtering is done at the page level)
    const estudiantesMostrados = estudiantes;

    const columns = [
        {
            key: 'nombre',
            label: 'Estudiante',
            sortable: true,
            render: (e: any) => {
                const usuario = usuarios.find(u => u.id === e.id);
                return (
                    <span className="text-sm font-medium text-[var(--color-text-primary)]">
                        {usuario ? displayName(usuario) : e.id}
                    </span>
                );
            },
        },
        {
            key: 'tiempoTotal',
            label: 'Tiempo total',
            sortable: true,
            render: (e: any) => (
                <span className="text-sm text-[var(--color-text-primary)]">
                    {formatDuracionHM(e.tiempoTotal)}
                </span>
            ),
        },
        {
            key: 'sesiones',
            label: 'Sesiones',
            sortable: true,
            render: (e: any) => (
                <Badge variant="outline" className={componentStyles.status.badgeInfo}>
                    {e.sesiones}
                </Badge>
            ),
        },
        {
            key: 'sesionesPorSemana',
            label: 'Sesiones/semana',
            sortable: true,
            render: (e: any) => (
                <span className="text-sm text-[var(--color-text-primary)]">
                    {e.sesionesPorSemana.toFixed(1)}
                </span>
            ),
        },
        {
            key: 'calificacionPromedio',
            label: 'Calificación',
            sortable: true,
            render: (e: any) => {
                if (!e.calificacionPromedio || e.calificacionPromedio === '0.0') {
                    return <span className="text-xs text-[var(--color-text-muted)]">—</span>;
                }
                return (
                    <Badge className={componentStyles.status.badgeSuccess}>
                        ⭐ {e.calificacionPromedio}/4
                    </Badge>
                );
            },
        },
        {
            key: 'ratioCompletado',
            label: 'Ratio completado',
            sortable: true,
            render: (e: any) => (
                <span className="text-sm text-[var(--color-text-primary)]">
                    {e.ratioCompletado}%
                </span>
            ),
        },
        {
            key: 'racha',
            label: 'Racha',
            sortable: true,
            render: (e: any) => (
                <div className="flex flex-col gap-0.5">
                    <Badge variant="outline" className={componentStyles.status.badgeWarning}>
                        {e.racha} días
                    </Badge>
                    {e.rachaMaxima && e.rachaMaxima > e.racha && (
                        <span className="text-xs text-[var(--color-text-muted)]">
                            Máx: {e.rachaMaxima}
                        </span>
                    )}
                </div>
            ),
        },
    ];

    if (estudiantes.length === 0) {
        return (
            <Card className={componentStyles.components.cardBase}>
                <CardContent className="p-4">
                    <div className="text-center py-8 text-[var(--color-text-secondary)]">
                        No hay datos de estudiantes para comparar
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className={componentStyles.components.cardBase}>
            <CardContent className="p-4">
                {estudiantesMostrados.length === 0 ? (
                    <div className="text-center py-8 text-[var(--color-text-secondary)]">
                        No hay estudiantes seleccionados. Usa el filtro global para seleccionar estudiantes.
                    </div>
                ) : (
                    <UnifiedTable
                        data={estudiantesMostrados}
                        columns={columns}
                        defaultPageSize={10}
                        keyField="id"
                    />
                )}
            </CardContent>
        </Card>
    );
}
