import React from "react";
import { obtenerColorTipoEvento, obtenerLabelTipoEvento } from "./utils";
import MediaLinksBadges from "@/components/common/MediaLinksBadges";

export default function EventoImportante({ evento, onClick, variant = 'default', onMediaClick }) {
  const colores = obtenerColorTipoEvento(evento.tipo);

  // Variante compacta para vista Semana
  if (variant === 'week') {
    // Calcular línea 3: hora (solo si no es todo el día)
    let linea3 = null;
    // Verificar si es all_day
    const isAllDay = evento.all_day === true;
    
    if (!isAllDay && evento.start_at) {
      try {
        // Usar start_at si está disponible (nuevo formato)
        const fechaInicioObj = new Date(evento.start_at);
        const horaInicio = fechaInicioObj.toLocaleTimeString('es-ES', { 
          hour: '2-digit', 
          minute: '2-digit',
          hour12: false 
        });
        
        if (evento.end_at) {
          const fechaFinObj = new Date(evento.end_at);
          const horaFin = fechaFinObj.toLocaleTimeString('es-ES', { 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: false 
          });
          linea3 = `${horaInicio}–${horaFin}h`;
        } else {
          linea3 = `${horaInicio}h`;
        }
      } catch (e) {
        // Si falla el parsing, intentar con fechaInicio legacy
        if (evento.fechaInicio && evento.fechaInicio.includes('T')) {
          try {
            const fechaInicioObj = new Date(evento.fechaInicio);
            const horaInicio = fechaInicioObj.toLocaleTimeString('es-ES', { 
              hour: '2-digit', 
              minute: '2-digit',
              hour12: false 
            });
            linea3 = `${horaInicio}h`;
          } catch (e2) {
            // Si también falla, no mostrar hora
          }
        }
      }
    } else if (!isAllDay && evento.fechaInicio && evento.fechaInicio.includes('T')) {
      // Fallback: usar fechaInicio legacy si tiene hora
      try {
        const fechaInicioObj = new Date(evento.fechaInicio);
        const horaInicio = fechaInicioObj.toLocaleTimeString('es-ES', { 
          hour: '2-digit', 
          minute: '2-digit',
          hour12: false 
        });
        linea3 = `${horaInicio}h`;
      } catch (e) {
        // Si falla, no mostrar hora
      }
    }

    return (
      <div
        onClick={onClick}
        className={`${colores.bg} ${colores.border} border rounded p-1.5 text-xs cursor-pointer hover:opacity-80 transition-opacity`}
      >
        {/* Línea 1: Tipo de evento (texto principal) */}
        <p className={`text-xs text-[var(--color-text-primary)] font-semibold mb-0.5 line-clamp-1`}>
          {obtenerLabelTipoEvento(evento.tipo)}
        </p>
        {/* Línea 2: Nombre del evento (texto pequeño, sin negrita) */}
        <p className={`text-[10px] text-[var(--color-text-secondary)] mb-0.5 line-clamp-1`}>
          {evento.titulo}
        </p>
        {/* Línea 3: Hora (texto pequeño, sin negrita, solo si no es todo el día) */}
        {linea3 && (
          <p className={`text-[10px] text-[var(--color-text-secondary)] mb-1`}>
            {linea3}
          </p>
        )}
        {/* Media links */}
        {evento.mediaLinks && Array.isArray(evento.mediaLinks) && evento.mediaLinks.length > 0 && onMediaClick && (
          <div className="mt-1">
            <MediaLinksBadges
              mediaLinks={evento.mediaLinks}
              onMediaClick={(idx) => onMediaClick(idx, evento.mediaLinks)}
              compact={true}
              maxDisplay={3}
            />
          </div>
        )}
      </div>
    );
  }

  // Variante default (completa) - para Mes y Lista
  // Calcular línea 3: hora (solo si no es todo el día)
  let linea3 = null;
  const isAllDay = evento.all_day === true;
  
  if (!isAllDay && evento.start_at) {
    try {
      // Usar start_at si está disponible (nuevo formato)
      const fechaInicioObj = new Date(evento.start_at);
      const horaInicio = fechaInicioObj.toLocaleTimeString('es-ES', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
      });
      
      if (evento.end_at) {
        const fechaFinObj = new Date(evento.end_at);
        const horaFin = fechaFinObj.toLocaleTimeString('es-ES', { 
          hour: '2-digit', 
          minute: '2-digit',
          hour12: false 
        });
        linea3 = `${horaInicio}–${horaFin}h`;
      } else {
        linea3 = `${horaInicio}h`;
      }
    } catch (e) {
      // Si falla el parsing, intentar con fechaInicio legacy
      if (evento.fechaInicio && evento.fechaInicio.includes('T')) {
        try {
          const fechaInicioObj = new Date(evento.fechaInicio);
          const horaInicio = fechaInicioObj.toLocaleTimeString('es-ES', { 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: false 
          });
          linea3 = `${horaInicio}h`;
        } catch (e2) {
          // Si también falla, no mostrar hora
        }
      }
    }
  } else if (!isAllDay && evento.fechaInicio && evento.fechaInicio.includes('T')) {
    // Fallback: usar fechaInicio legacy si tiene hora
    try {
      const fechaInicioObj = new Date(evento.fechaInicio);
      const horaInicio = fechaInicioObj.toLocaleTimeString('es-ES', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
      });
      linea3 = `${horaInicio}h`;
    } catch (e) {
      // Si falla, no mostrar hora
    }
  }

  return (
    <div
      onClick={onClick}
      className={`${colores.bg} ${colores.border} border rounded p-1.5 text-xs cursor-pointer hover:opacity-80 transition-opacity`}
    >
      {/* Línea 1: Tipo de evento (texto principal) */}
      <p className={`text-xs text-[var(--color-text-primary)] font-semibold mb-0.5 line-clamp-1`}>
        {obtenerLabelTipoEvento(evento.tipo)}
      </p>
      {/* Línea 2: Nombre del evento (texto pequeño, sin negrita) */}
      <p className={`text-[10px] text-[var(--color-text-secondary)] mb-0.5 line-clamp-1`}>
        {evento.titulo}
      </p>
      {/* Línea 3: Hora (texto pequeño, sin negrita, solo si no es todo el día) */}
      {linea3 && (
        <p className={`text-[10px] text-[var(--color-text-secondary)] mb-1`}>
          {linea3}
        </p>
      )}
      {/* Media links */}
      {evento.mediaLinks && Array.isArray(evento.mediaLinks) && evento.mediaLinks.length > 0 && onMediaClick && (
        <div className="mt-1">
          <MediaLinksBadges
            mediaLinks={evento.mediaLinks}
            onMediaClick={(idx) => onMediaClick(idx, evento.mediaLinks)}
            compact={true}
            maxDisplay={3}
          />
      </div>
      )}
    </div>
  );
}

