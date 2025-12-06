import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ds/Button";
import { Badge } from "@/components/ds";
import { getNombreVisible } from "@/components/utils/helpers";
import { formatearFechaEvento, obtenerLabelEstadoAsignacion } from "./utils";
import { componentStyles } from "@/design/componentStyles";
import { Target, User, Calendar, Edit, Trash2, PlayCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function ModalAsignacion({
  open,
  onOpenChange,
  asignacion,
  usuarios,
  userIdActual,
  userRole,
  onDelete
}) {
  const navigate = useNavigate();

  if (!asignacion) return null;

  const alumno = usuarios.find(u => u.id === asignacion.alumnoId);
  const profesor = usuarios.find(u => u.id === asignacion.profesorId);
  const fechaSemana = asignacion.semanaInicioISO ? formatearFechaEvento(asignacion.semanaInicioISO) : '';
  const piezaNombre = asignacion.piezaSnapshot?.nombre || asignacion.piezaId || 'Sin pieza específica';

  const isAdmin = userRole === 'ADMIN';
  const isProf = userRole === 'PROF';
  const isEstu = userRole === 'ESTU';

  const canEdit = isAdmin || isEstu || (isProf && asignacion.profesorId === userIdActual);
  const canDelete = isAdmin || (isProf && asignacion.profesorId === userIdActual);
  const canPractice = isEstu && asignacion.estado === 'publicada';

  const estadoColors = {
    publicada: 'success',
    borrador: 'default',
    archivada: 'warning',
    cerrada: 'default',
  };

  const handleEdit = () => {
    navigate(`/asignacion-detalle?id=${asignacion.id}`);
  };

  const handlePractice = () => {
    navigate(`${createPageUrl('hoy')}?asignacionId=${asignacion.id}`);
  };

  const handleDelete = () => {
    if (window.confirm('¿Eliminar esta asignación? Esta acción no se puede deshacer.')) {
      if (onDelete) {
        onDelete(asignacion.id);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto p-4">
        <DialogHeader className="pb-2">
          <DialogTitle className="text-base flex items-center gap-2">
            <Target className="w-4 h-4 text-[var(--color-primary)]" />
            Detalles de Asignación
          </DialogTitle>
          <DialogDescription className="sr-only">
            Información detallada de la asignación
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 text-sm">
          {/* Información básica compacta */}
          <div className="grid grid-cols-2 gap-2 pb-2 border-b border-[var(--color-border-default)]">
            <div className="flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5 text-[var(--color-text-secondary)] shrink-0" />
              <span className="text-xs text-[var(--color-text-secondary)]">Pieza:</span>
              <span className="font-medium truncate">{piezaNombre}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-[var(--color-text-secondary)] shrink-0" />
              <span className="text-xs text-[var(--color-text-secondary)]">Estudiante:</span>
              <span className="font-medium truncate">{getNombreVisible(alumno)}</span>
            </div>
            {profesor && (
              <div className="flex items-center gap-1.5 col-span-2">
                <User className="w-3.5 h-3.5 text-[var(--color-text-secondary)] shrink-0" />
                <span className="text-xs text-[var(--color-text-secondary)]">Profesor:</span>
                <span className="font-medium truncate">{getNombreVisible(profesor)}</span>
              </div>
            )}
            <div className="flex items-center gap-1.5 col-span-2">
              <Calendar className="w-3.5 h-3.5 text-[var(--color-text-secondary)] shrink-0" />
              <span className="text-xs text-[var(--color-text-secondary)]">Semana:</span>
              <span>{fechaSemana}</span>
            </div>
            <div className="flex items-center gap-1.5 col-span-2">
              <span className="text-xs text-[var(--color-text-secondary)]">Estado:</span>
              <Badge variant={estadoColors[asignacion.estado] || 'default'} className="text-xs">
                {obtenerLabelEstadoAsignacion(asignacion.estado)}
              </Badge>
            </div>
          </div>

          {/* Acciones */}
          {(canEdit || canDelete || canPractice) && (
            <div className="flex gap-2 pt-2 border-t border-[var(--color-border-default)]">
              {canPractice && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handlePractice}
                  className="flex-1"
                >
                  <PlayCircle className="w-4 h-4 mr-2" />
                  Practicar ahora
                </Button>
              )}
              {canEdit && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleEdit}
                  className={canPractice ? '' : 'flex-1'}
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Editar
                </Button>
              )}
              {canDelete && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDelete}
                  className="text-[var(--color-danger)] hover:bg-[var(--color-danger)]/10 hover:text-[var(--color-danger)]"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Eliminar
                </Button>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

