import React from "react";
import { MessageSquare } from "lucide-react";
import { getNombreVisible } from "@/components/utils/helpers";
import { formatearFechaEvento, obtenerColorEvento } from "./utils";

export default function EventoFeedback({ feedback, usuarios, onClick }) {
  const profesor = usuarios.find(u => u.id === feedback.profesorId);
  const alumno = usuarios.find(u => u.id === feedback.alumnoId);
  const fechaSemana = feedback.semanaInicioISO ? formatearFechaEvento(feedback.semanaInicioISO) : '';

  const colores = obtenerColorEvento('feedback');

  return (
    <div
      onClick={onClick}
      className={`${colores.bg} ${colores.border} border rounded p-1.5 text-xs cursor-pointer hover:opacity-80 transition-opacity`}
    >
      <div className="flex items-center gap-1 mb-1">
        <MessageSquare className={`w-3 h-3 ${colores.icon}`} />
        <span className={`font-medium ${colores.text}`}>
          Feedback
        </span>
      </div>
      <div className={`${colores.text} text-[10px]`}>
        {getNombreVisible(profesor)} → {getNombreVisible(alumno)}
      </div>
      <div className={`${colores.text} text-[10px] mt-0.5`}>
        {fechaSemana}
      </div>
    </div>
  );
}

