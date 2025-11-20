import React from "react";
import { Calendar, User } from "lucide-react";
import { Badge } from "@/components/ds";
import { getNombreVisible } from "@/components/utils/helpers";
import { formatearFechaEvento, obtenerColorEvento, obtenerLabelEstadoAsignacion } from "./utils";

export default function EventoAsignacion({ asignacion, usuarios, onClick }) {
  const alumno = usuarios.find(u => u.id === asignacion.alumnoId);
  const fechaSemana = asignacion.semanaInicioISO ? formatearFechaEvento(asignacion.semanaInicioISO) : '';
  const piezaNombre = asignacion.piezaSnapshot?.nombre || asignacion.piezaId || 'Pieza';

  const colores = obtenerColorEvento('asignacion');

  const estadoColors = {
    publicada: 'success',
    borrador: 'default',
    archivada: 'warning',
  };

  return (
    <div
      onClick={onClick}
      className={`${colores.bg} ${colores.border} border rounded p-1.5 text-xs cursor-pointer hover:opacity-80 transition-opacity`}
    >
      <div className="flex items-center gap-1 mb-1">
        <Calendar className={`w-3 h-3 ${colores.icon}`} />
        <span className={`font-medium ${colores.text}`}>
          {piezaNombre}
        </span>
      </div>
      <div className={`${colores.text} mb-1 text-[10px] flex items-center gap-1`}>
        <User className={`w-3 h-3 ${colores.icon}`} />
        {getNombreVisible(alumno)}
      </div>
      <div className="flex items-center justify-between">
        <span className={`${colores.text} text-[10px]`}>
          {fechaSemana}
        </span>
        <Badge variant={estadoColors[asignacion.estado] || 'default'} className="text-[9px] px-1 py-0">
          {obtenerLabelEstadoAsignacion(asignacion.estado)}
        </Badge>
      </div>
    </div>
  );
}

