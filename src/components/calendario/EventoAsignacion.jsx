import React from "react";
import { Calendar, User } from "lucide-react";
import { Badge } from "@/components/ds";
import { getNombreVisible } from "@/components/utils/helpers";
import { formatearFechaEvento, obtenerColorEvento, obtenerLabelEstadoAsignacion } from "./utils";

export default function EventoAsignacion({ asignacion, usuarios, onClick, variant = 'default', registrosSesion = [] }) {
  const alumno = usuarios.find(u => u.id === asignacion.alumnoId);
  const fechaSemana = asignacion.semanaInicioISO ? formatearFechaEvento(asignacion.semanaInicioISO) : '';
  const piezaNombre = asignacion.piezaSnapshot?.nombre || asignacion.piezaId || 'Pieza';

  const colores = obtenerColorEvento('asignacion');

  const estadoColors = {
    publicada: 'success',
    borrador: 'default',
    archivada: 'warning',
  };

  // Calcular patrón de semanas para variante week
  const calcularPatronSemanas = () => {
    if (!asignacion.plan || !Array.isArray(asignacion.plan.semanas)) return null;
    const totalSemanas = asignacion.plan.semanas.length;
    if (totalSemanas === 0) return null;

    // Calcular qué semanas tienen registros de sesión
    const semanasConSesiones = new Set();
    registrosSesion.forEach(registro => {
      if (registro.asignacionId === asignacion.id && registro.semanaIdx !== undefined) {
        semanasConSesiones.add(registro.semanaIdx);
      }
    });

    // Generar patrón: • = semana activa/trabajada, ○ = otras semanas
    const patron = [];
    for (let i = 0; i < Math.min(totalSemanas, 8); i++) { // Máximo 8 semanas en el patrón
      if (semanasConSesiones.has(i)) {
        patron.push('•');
      } else {
        patron.push('○');
      }
    }
    return patron.length > 0 ? patron.join(' ') : null;
  };

  // Variante compacta para vista Semana
  if (variant === 'week') {
    const patronSemanas = calcularPatronSemanas();

    return (
      <div
        onClick={onClick}
        className={`${colores.bg} ${colores.border} border rounded p-1.5 text-xs cursor-pointer hover:opacity-80 transition-opacity`}
      >
        {/* Línea 1: Nombre de la pieza */}
        <p className={`font-medium ${colores.text} mb-1 line-clamp-1`}>
          {piezaNombre}
        </p>
        {/* Línea 2: Patrón de semanas */}
        {patronSemanas && (
          <p className={`${colores.text} text-[10px] font-mono`}>
            {patronSemanas}
          </p>
        )}
      </div>
    );
  }

  // Variante default (completa)
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

