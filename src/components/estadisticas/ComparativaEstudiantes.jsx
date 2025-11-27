import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ds";
import { Users, TrendingUp } from "lucide-react";
import { componentStyles } from "@/design/componentStyles";
import { useIsMobile } from "@/hooks/use-mobile";
import { formatDuracionHM } from "./utils";
import UnifiedTable from "@/components/tables/UnifiedTable";
import { Badge } from "@/components/ds";
import { displayName } from "@/components/utils/helpers";
import MultiSelect from "@/components/ui/MultiSelect";

/**
 * ComparativaEstudiantes - Componente para comparar métricas entre estudiantes (PROF/ADMIN)
 * 
 * @param {Object} props
 * @param {Array} props.estudiantes - Array de estudiantes con sus métricas
 * @param {Array} props.usuarios - Array de usuarios para obtener nombres
 */
export default function ComparativaEstudiantes({ estudiantes, usuarios }) {
  const isMobile = useIsMobile();
  const [estudiantesFiltrados, setEstudiantesFiltrados] = useState([]);
  
  // Filtrar estudiantes según la selección
  const estudiantesMostrados = useMemo(() => {
    if (estudiantesFiltrados.length === 0) return estudiantes;
    return estudiantes.filter(e => estudiantesFiltrados.includes(e.id));
  }, [estudiantes, estudiantesFiltrados]);
  
  // Opciones para el multiselector (todos los estudiantes disponibles)
  const opcionesEstudiantes = useMemo(() => {
    return estudiantes.map(e => {
      const usuario = usuarios.find(u => u.id === e.id);
      return {
        value: e.id,
        label: usuario ? displayName(usuario) : e.id
      };
    });
  }, [estudiantes, usuarios]);

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
        <CardHeader>
          <CardTitle className="text-sm sm:text-base md:text-lg flex items-center gap-2">
            <Users className="w-4 h-4 sm:w-5 sm:h-5 text-[var(--color-primary)]" />
            Comparativa de Estudiantes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-[var(--color-text-secondary)]">
            No hay datos de estudiantes para comparar
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={componentStyles.components.cardBase}>
      <CardHeader>
        <div className="space-y-4">
          <CardTitle className="text-sm sm:text-base md:text-lg flex items-center gap-2">
            <Users className="w-4 h-4 sm:w-5 sm:h-5 text-[var(--color-primary)]" />
            Comparativa de Estudiantes ({estudiantesMostrados.length} de {estudiantes.length})
          </CardTitle>
          
          {/* Filtro multiselector de estudiantes */}
          <div className="max-w-md">
            <MultiSelect
              label="Filtrar por estudiantes"
              items={opcionesEstudiantes}
              value={estudiantesFiltrados}
              onChange={setEstudiantesFiltrados}
              placeholder="Selecciona estudiantes para comparar..."
            />
            {estudiantesFiltrados.length > 0 && (
              <button
                onClick={() => setEstudiantesFiltrados([])}
                className="text-xs text-[var(--color-primary)] hover:underline mt-1"
              >
                Mostrar todos los estudiantes
              </button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {estudiantesMostrados.length === 0 ? (
          <div className="text-center py-8 text-[var(--color-text-secondary)]">
            No hay estudiantes seleccionados. Usa el filtro para seleccionar estudiantes.
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

