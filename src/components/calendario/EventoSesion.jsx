import React from "react";
import { PlayCircle, MessageSquare, Link as LinkIcon, Clock } from "lucide-react";
import { getNombreVisible } from "@/components/utils/helpers";
import { formatearHora, obtenerColorEvento } from "./utils";

export default function EventoSesion({ sesion, usuarios, onClick }) {
  const alumno = usuarios.find(u => u.id === sesion.alumnoId);
  const hora = sesion.inicioISO ? formatearHora(sesion.inicioISO) : '';
  const duracionMin = Math.floor(sesion.duracionRealSeg / 60);
  
  // Verificar si hay feedback relacionado (por semana y alumno)
  // Esto se puede mejorar consultando feedbacksSemanal
  const tieneFeedback = false; // TODO: verificar si hay feedback para esta sesión
  const tieneMedia = false; // TODO: verificar si hay mediaLinks en la sesión

  const colores = obtenerColorEvento('sesion');

  return (
    <div
      onClick={onClick}
      className={`${colores.bg} ${colores.border} border rounded p-1.5 text-xs cursor-pointer hover:opacity-80 transition-opacity`}
    >
      <div className="flex items-center gap-1 mb-1">
        <PlayCircle className={`w-3 h-3 ${colores.icon}`} />
        <span className={`font-medium ${colores.text}`}>
          {sesion.sesionNombre || 'Sesión'}
        </span>
      </div>
      <div className={`${colores.text} mb-1 text-[10px]`}>
        {getNombreVisible(alumno)} • {hora}
      </div>
      <div className="flex items-center gap-1">
        {tieneFeedback && <MessageSquare className={`w-3 h-3 ${colores.icon}`} />}
        {tieneMedia && <LinkIcon className={`w-3 h-3 ${colores.icon}`} />}
        <Clock className={`w-3 h-3 ${colores.icon}`} />
        <span className={colores.icon}>{duracionMin}min</span>
      </div>
    </div>
  );
}

