import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ds";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { List, Star } from "lucide-react";
import { componentStyles } from "@/design/componentStyles";
import { useIsMobile } from "@/hooks/use-mobile";
import UnifiedTable from "@/components/tables/UnifiedTable";
import { Badge } from "@/components/ds";
import ModalSesion from "@/components/calendario/ModalSesion";

const getCalificacionBadge = (cal) => {
  if (!cal || cal === 0) return componentStyles.status.badgeDefault;
  const calInt = Math.round(cal);
  if (calInt === 1) return componentStyles.status.badgeDanger;
  if (calInt === 2) return componentStyles.status.badgeWarning;
  if (calInt === 3) return componentStyles.status.badgeInfo;
  if (calInt === 4) return componentStyles.status.badgeSuccess;
  return componentStyles.status.badgeDefault;
};

/**
 * AutoevaluacionesTab - Tab de historial de autoevaluaciones del estudiante
 * 
 * @param {Object} props
 * @param {Array} props.registros - Array de registros de sesión
 * @param {Array} props.usuarios - Array de usuarios para mostrar nombres
 */
export default function AutoevaluacionesTab({ registros, usuarios }) {
  const isMobile = useIsMobile();
  const [calificacionFilter, setCalificacionFilter] = useState('all');
  const [soloConNotas, setSoloConNotas] = useState(false);
  const [modalSesionOpen, setModalSesionOpen] = useState(false);
  const [registroSesionSeleccionado, setRegistroSesionSeleccionado] = useState(null);

  const historialFiltrado = registros.filter(r => {
    if (calificacionFilter !== 'all') {
      const cal = r.calificacion;
      if (!cal || cal === null) return false;
      const calInt = Math.round(cal);
      if (calificacionFilter === '1' && calInt !== 1) return false;
      if (calificacionFilter === '2' && calInt !== 2) return false;
      if (calificacionFilter === '3' && calInt !== 3) return false;
      if (calificacionFilter === '4' && calInt !== 4) return false;
    }
    if (soloConNotas && !r.notas) return false;
    return true;
  });

  const handleViewSesion = (registro) => {
    setRegistroSesionSeleccionado(registro);
    setModalSesionOpen(true);
  };

  const columns = [
    {
      key: 'fecha',
      label: 'Fecha',
      sortable: true,
      render: (r) => (
        <span className="text-sm text-[var(--color-text-primary)]">
          {r.inicioISO 
            ? new Date(r.inicioISO).toLocaleDateString('es-ES', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              })
            : '-'
          }
        </span>
      ),
    },
    {
      key: 'pieza',
      label: 'Pieza',
      sortable: true,
      render: (r) => (
        <span className="text-sm text-[var(--color-text-primary)]">
          {r.piezaNombre || '-'}
        </span>
      ),
    },
    {
      key: 'calificacion',
      label: 'Calificación',
      sortable: true,
      render: (r) => {
        if (!r.calificacion || r.calificacion === null || isNaN(r.calificacion)) {
          return <span className="text-xs text-[var(--color-text-muted)]">—</span>;
        }
        return (
          <Badge className={`${getCalificacionBadge(r.calificacion)} shrink-0`}>
            <Star className="w-3 h-3 mr-1 fill-current" />
            {Math.round(r.calificacion)}/4
          </Badge>
        );
      },
    },
    {
      key: 'notas',
      label: 'Notas',
      sortable: false,
      render: (r) => (
        <span className="text-xs text-[var(--color-text-secondary)] line-clamp-2 max-w-md">
          {r.notas || '—'}
        </span>
      ),
    },
  ];

  return (
    <>
      <Card className={componentStyles.components.cardBase}>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle className="text-sm sm:text-base md:text-lg flex items-center gap-2">
              <List className="w-4 h-4 sm:w-5 sm:h-5 text-[var(--color-primary)]" />
              Sesiones
            </CardTitle>
            <div className="flex items-center gap-3 flex-wrap">
              <Select value={calificacionFilter} onValueChange={setCalificacionFilter}>
                <SelectTrigger className="w-full sm:w-[150px]">
                  <SelectValue placeholder="Calificación" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="4">4 estrellas</SelectItem>
                  <SelectItem value="3">3 estrellas</SelectItem>
                  <SelectItem value="2">2 estrellas</SelectItem>
                  <SelectItem value="1">1 estrella</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="solo-notas"
                  checked={soloConNotas}
                  onCheckedChange={setSoloConNotas}
                />
                <label
                  htmlFor="solo-notas"
                  className="text-sm text-[var(--color-text-primary)] cursor-pointer"
                >
                  Solo con notas
                </label>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {historialFiltrado.length === 0 ? (
            <div className="text-center py-8 sm:py-12">
              <List className={componentStyles.components.emptyStateIcon} />
              <p className={componentStyles.components.emptyStateText}>
                No hay autoevaluaciones en el periodo seleccionado
              </p>
            </div>
          ) : (
            <UnifiedTable
              data={historialFiltrado}
              columns={columns}
              defaultPageSize={10}
              keyField="id"
              onRowClick={handleViewSesion}
            />
          )}
        </CardContent>
      </Card>

      <ModalSesion
        open={modalSesionOpen}
        onOpenChange={setModalSesionOpen}
        registroSesion={registroSesionSeleccionado}
        usuarios={usuarios}
      />
    </>
  );
}

