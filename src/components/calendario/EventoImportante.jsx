import React from "react";
import { Calendar as CalendarIcon } from "lucide-react";
import { obtenerColorTipoEvento, obtenerLabelTipoEvento, formatearFechaEvento } from "./utils";

export default function EventoImportante({ evento, onClick }) {
  const fechaInicio = formatearFechaEvento(evento.fechaInicio);
  const fechaFin = evento.fechaFin ? formatearFechaEvento(evento.fechaFin) : null;
  const fechaTexto = fechaFin ? `${fechaInicio} - ${fechaFin}` : fechaInicio;

  const colores = obtenerColorTipoEvento(evento.tipo);

  return (
    <div
      onClick={onClick}
      className={`${colores.bg} ${colores.border} border rounded p-1.5 text-xs cursor-pointer hover:opacity-80 transition-opacity`}
    >
      <div className="flex items-center gap-1 mb-1">
        <CalendarIcon className={`w-3 h-3 ${colores.text}`} />
        <span className={`font-medium ${colores.text}`}>
          {evento.titulo}
        </span>
      </div>
      <div className={`${colores.text} text-[10px] mb-0.5`}>
        {obtenerLabelTipoEvento(evento.tipo)}
      </div>
      <div className={`${colores.text} text-[10px]`}>
        {fechaTexto}
      </div>
    </div>
  );
}

