import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ds";
import { getNombreVisible } from "@/components/utils/helpers";
import { formatearFechaEvento } from "./utils";
import MediaLinksBadges from "../common/MediaLinksBadges";
import { componentStyles } from "@/design/componentStyles";
import { MessageSquare, User, Calendar, ArrowRight } from "lucide-react";

export default function ModalFeedback({ open, onOpenChange, feedback, usuarios }) {
  if (!feedback) return null;

  const profesor = usuarios.find(u => u.id === feedback.profesorId);
  const alumno = usuarios.find(u => u.id === feedback.alumnoId);
  const fechaSemana = feedback.semanaInicioISO ? formatearFechaEvento(feedback.semanaInicioISO) : '';
  const fechaCreacion = feedback.created_at ? new Date(feedback.created_at).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }) : '';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-green-600" />
            Detalles de Feedback
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Información básica */}
          <Card className={componentStyles.containers.cardBase}>
            <CardHeader>
              <CardTitle className="text-base">Información General</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-ui/60" />
                <span className="text-sm font-medium">Profesor:</span>
                <span className="text-sm">{getNombreVisible(profesor)}</span>
                <ArrowRight className="w-4 h-4 text-ui/60" />
                <span className="text-sm font-medium">Estudiante:</span>
                <span className="text-sm">{getNombreVisible(alumno)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-ui/60" />
                <span className="text-sm font-medium">Semana:</span>
                <span className="text-sm">{fechaSemana}</span>
              </div>
              {fechaCreacion && (
                <div className="text-xs text-ui/60">
                  Creado: {fechaCreacion}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Feedback */}
          <Card className={componentStyles.containers.cardBase}>
            <CardHeader>
              <CardTitle className="text-base">Feedback del Profesor</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-wrap">{feedback.notaProfesor || 'Sin comentarios'}</p>
            </CardContent>
          </Card>

          {/* Media Links */}
          {feedback.mediaLinks && feedback.mediaLinks.length > 0 && (
            <Card className={componentStyles.containers.cardBase}>
              <CardHeader>
                <CardTitle className="text-base">Materiales Adjuntos</CardTitle>
              </CardHeader>
              <CardContent>
                <MediaLinksBadges mediaLinks={feedback.mediaLinks} />
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

