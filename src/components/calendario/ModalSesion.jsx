import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ds";
import { Badge } from "@/components/ds";
import { getNombreVisible } from "@/components/utils/helpers";
import { formatearHora, formatearFechaEvento } from "./utils";
import MediaLinksBadges from "../common/MediaLinksBadges";
import { componentStyles } from "@/design/componentStyles";
import { Clock, User, Calendar, CheckCircle, XCircle, PlayCircle } from "lucide-react";

export default function ModalSesion({ open, onOpenChange, registroSesion, usuarios }) {
  if (!registroSesion) return null;

  const alumno = usuarios.find(u => u.id === registroSesion.alumnoId);
  const fecha = registroSesion.inicioISO ? new Date(registroSesion.inicioISO) : null;
  const fechaTexto = fecha ? formatearFechaEvento(registroSesion.inicioISO.split('T')[0]) : '';
  const horaTexto = fecha ? formatearHora(registroSesion.inicioISO) : '';
  const duracionMin = Math.floor(registroSesion.duracionRealSeg / 60);
  const duracionSeg = registroSesion.duracionRealSeg % 60;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PlayCircle className="w-5 h-5 text-blue-600" />
            Detalles de Sesión
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
                <span className="text-sm font-medium">Estudiante:</span>
                <span className="text-sm">{getNombreVisible(alumno)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-ui/60" />
                <span className="text-sm font-medium">Fecha:</span>
                <span className="text-sm">{fechaTexto}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-ui/60" />
                <span className="text-sm font-medium">Hora:</span>
                <span className="text-sm">{horaTexto}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-ui/60" />
                <span className="text-sm font-medium">Duración:</span>
                <span className="text-sm">
                  {duracionMin > 0 ? `${duracionMin} min ` : ''}{duracionSeg} seg
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Detalles de la sesión */}
          <Card className={componentStyles.containers.cardBase}>
            <CardHeader>
              <CardTitle className="text-base">Detalles de la Sesión</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {registroSesion.sesionNombre && (
                <div>
                  <span className="text-sm font-medium">Sesión:</span>
                  <span className="text-sm ml-2">{registroSesion.sesionNombre}</span>
                </div>
              )}
              {registroSesion.semanaNombre && (
                <div>
                  <span className="text-sm font-medium">Semana:</span>
                  <span className="text-sm ml-2">{registroSesion.semanaNombre}</span>
                </div>
              )}
              {registroSesion.piezaNombre && (
                <div>
                  <span className="text-sm font-medium">Pieza:</span>
                  <span className="text-sm ml-2">{registroSesion.piezaNombre}</span>
                </div>
              )}
              {registroSesion.foco && (
                <div>
                  <span className="text-sm font-medium">Foco:</span>
                  <Badge variant="info" className="ml-2">{registroSesion.foco}</Badge>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Progreso */}
          <Card className={componentStyles.containers.cardBase}>
            <CardHeader>
              <CardTitle className="text-base">Progreso</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span className="text-sm">
                    Completados: {registroSesion.bloquesCompletados || 0} / {registroSesion.bloquesTotales || 0}
                  </span>
                </div>
                {registroSesion.bloquesOmitidos > 0 && (
                  <div className="flex items-center gap-2">
                    <XCircle className="w-4 h-4 text-red-600" />
                    <span className="text-sm">Omitidos: {registroSesion.bloquesOmitidos}</span>
                  </div>
                )}
              </div>
              {registroSesion.finalizada && (
                <Badge variant="success">Sesión finalizada</Badge>
              )}
              {registroSesion.finAnticipado && (
                <Badge variant="warning">Finalizada anticipadamente</Badge>
              )}
            </CardContent>
          </Card>

          {/* Notas */}
          {registroSesion.notas && (
            <Card className={componentStyles.containers.cardBase}>
              <CardHeader>
                <CardTitle className="text-base">Notas</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{registroSesion.notas}</p>
              </CardContent>
            </Card>
          )}

          {/* Media Links */}
          {/* TODO: Agregar mediaLinks cuando estén disponibles en RegistroSesion */}
        </div>
      </DialogContent>
    </Dialog>
  );
}

