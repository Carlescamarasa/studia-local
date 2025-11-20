import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ds/Button";
import { getNombreVisible } from "@/components/utils/helpers";
import { formatearFechaEvento } from "./utils";
import MediaLinksBadges from "../common/MediaLinksBadges";
import { componentStyles } from "@/design/componentStyles";
import { MessageSquare, User, Calendar, ArrowRight, Edit, Trash2 } from "lucide-react";

export default function ModalFeedback({ 
  open, 
  onOpenChange, 
  feedback, 
  usuarios, 
  userIdActual, 
  userRole,
  onEdit,
  onDelete 
}) {
  if (!feedback) return null;

  const profesor = usuarios.find(u => u.id === feedback.profesorId);
  const alumno = usuarios.find(u => u.id === feedback.alumnoId);
  const fechaSemana = feedback.semanaInicioISO ? formatearFechaEvento(feedback.semanaInicioISO) : '';
  const fechaCreacion = feedback.created_at ? new Date(feedback.created_at).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }) : '';

  const isAdmin = userRole === 'ADMIN';
  const isProf = userRole === 'PROF';
  const canEdit = isAdmin || (isProf && feedback.profesorId === userIdActual);
  const canDelete = isAdmin || (isProf && feedback.profesorId === userIdActual);

  const handleDelete = () => {
    if (window.confirm('¿Eliminar este feedback? Esta acción no se puede deshacer.')) {
      if (onDelete) {
        onDelete(feedback.id);
      }
    }
  };

  const handleEdit = () => {
    if (onEdit) {
      onEdit(feedback);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto p-4">
        <DialogHeader className="pb-2">
          <DialogTitle className="text-base flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-[var(--color-info)]" />
            Detalles de Feedback
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 text-sm">
          {/* Información básica compacta */}
          <div className="grid grid-cols-2 gap-2 pb-2 border-b border-[var(--color-border-default)]">
            <div className="flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-[var(--color-text-secondary)] shrink-0" />
              <span className="text-xs text-[var(--color-text-secondary)]">Profesor:</span>
              <span className="font-medium truncate">{getNombreVisible(profesor)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <ArrowRight className="w-3.5 h-3.5 text-[var(--color-text-secondary)] shrink-0" />
              <span className="text-xs text-[var(--color-text-secondary)]">Estudiante:</span>
              <span className="font-medium truncate">{getNombreVisible(alumno)}</span>
            </div>
            <div className="flex items-center gap-1.5 col-span-2">
              <Calendar className="w-3.5 h-3.5 text-[var(--color-text-secondary)] shrink-0" />
              <span className="text-xs text-[var(--color-text-secondary)]">Semana:</span>
              <span>{fechaSemana}</span>
            </div>
            {fechaCreacion && (
              <div className="text-xs text-[var(--color-text-secondary)] col-span-2">
                Creado: {fechaCreacion}
              </div>
            )}
          </div>

          {/* Feedback */}
          <div className="pb-2 border-b border-[var(--color-border-default)]">
            <div className="flex items-center gap-2 mb-1">
              <MessageSquare className="w-3.5 h-3.5 text-[var(--color-info)]" />
              <span className="text-xs font-medium text-[var(--color-text-secondary)]">Feedback del Profesor</span>
            </div>
            <p className="text-sm whitespace-pre-wrap break-words bg-[var(--color-surface-muted)] p-2 rounded">
              {feedback.notaProfesor || 'Sin comentarios'}
            </p>
          </div>

          {/* Media Links */}
          {feedback.mediaLinks && feedback.mediaLinks.length > 0 && (
            <div className="pb-2 border-b border-[var(--color-border-default)]">
              <p className="text-xs text-[var(--color-text-secondary)] mb-2">Materiales Adjuntos:</p>
              <MediaLinksBadges 
                mediaLinks={feedback.mediaLinks}
                compact={true}
                maxDisplay={5}
              />
            </div>
          )}

          {/* Acciones */}
          {(canEdit || canDelete) && (
            <div className="flex gap-2 pt-2">
              {canEdit && onEdit && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleEdit}
                  className="flex-1"
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Editar
                </Button>
              )}
              {canDelete && onDelete && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDelete}
                  className="flex-1 text-[var(--color-danger)] hover:bg-[var(--color-danger)]/10 hover:text-[var(--color-danger)]"
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

