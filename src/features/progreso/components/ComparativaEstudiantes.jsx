import React, { useMemo } from "react";
import { Card, CardContent } from "@/components/ds";
import { componentStyles } from "@/design/componentStyles";
import { formatDuracionHM } from "../utils/progresoUtils";
import UnifiedTable from "@/components/tables/UnifiedTable";
import { Badge } from "@/components/ds";
import { displayName } from "@/components/utils/helpers";

/**
 * ComparativaEstudiantes - Componente para comparar métricas entre estudiantes (PROF/ADMIN)
 * 
 * @param {Object} props
 * @param {Array} props.estudiantes - Array de estudiantes con sus métricas
 * @param {Array} props.usuarios - Array de usuarios para obtener nombres
 */
export default function ComparativaEstudiantes({ estudiantes, usuarios }) {
  // Use all students directly (filtering is done at the page level)
  const estudiantesMostrados = estudiantes;

  const columns = [
    {
      key: 'nombre',
      label: 'Estudiante',
      sortable: true,
      render: (e) => {
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
      render: (e) => (
        <span className="text-sm text-[var(--color-text-primary)]">
          {formatDuracionHM(e.tiempoTotal)}
        </span>
      ),
    },
    {
      key: 'sesiones',
      label: 'Sesiones',
      sortable: true,
      render: (e) => (
        <Badge variant="outline" className={componentStyles.status.badgeInfo}>
          {e.sesiones}
        </Badge>
      ),
    },
    {
      key: 'sesionesPorSemana',
      label: 'Sesiones/semana',
      sortable: true,
      render: (e) => (
        <span className="text-sm text-[var(--color-text-primary)]">
          {e.sesionesPorSemana.toFixed(1)}
        </span>
      ),
    },
    {
      key: 'calificacionPromedio',
      label: 'Calificación',
      sortable: true,
      render: (e) => {
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
      render: (e) => (
        <span className="text-sm text-[var(--color-text-primary)]">
          {e.ratioCompletado}%
        </span>
      ),
    },
    {
      key: 'racha',
      label: 'Racha',
      sortable: true,
      render: (e) => (
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

