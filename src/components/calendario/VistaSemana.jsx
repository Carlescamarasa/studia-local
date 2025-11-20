import React, { useMemo } from "react";
import { Card, CardContent } from "@/components/ds";
import { Button } from "@/components/ds/Button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import EventoSesion from "./EventoSesion";
import EventoFeedback from "./EventoFeedback";
import EventoAsignacion from "./EventoAsignacion";
import EventoImportante from "./EventoImportante";
import { agruparEventosPorDia, startOfMonday, endOfSunday, formatLocalDate } from "./utils";
import { componentStyles } from "@/design/componentStyles";

export default function VistaSemana({ fechaActual, onFechaChange, eventos, onEventoClick, usuarios, filtroTipo = 'all' }) {
  const lunesSemana = useMemo(() => {
    return startOfMonday(fechaActual);
  }, [fechaActual]);

  const domingoSemana = useMemo(() => {
    return endOfSunday(fechaActual);
  }, [fechaActual]);

  const diasSemana = useMemo(() => {
    const dias = [];
    for (let i = 0; i < 7; i++) {
      const fecha = new Date(lunesSemana);
      fecha.setDate(lunesSemana.getDate() + i);
      dias.push(fecha);
    }
    return dias;
  }, [lunesSemana]);

  const eventosPorDia = useMemo(() => {
    const eventosFiltrados = {
      sesiones: filtroTipo === 'all' || filtroTipo === 'sesion' ? eventos.sesiones : [],
      feedbacks: filtroTipo === 'all' || filtroTipo === 'feedback' ? eventos.feedbacks : [],
      asignaciones: filtroTipo === 'all' || filtroTipo === 'asignacion' ? eventos.asignaciones : [],
      eventosImportantes: filtroTipo === 'all' || filtroTipo === 'evento' ? eventos.eventosImportantes : [],
    };
    return agruparEventosPorDia(eventosFiltrados, lunesSemana, domingoSemana);
  }, [eventos, lunesSemana, domingoSemana, filtroTipo]);

  const navegarSemana = (direccion) => {
    const nuevaFecha = new Date(lunesSemana);
    nuevaFecha.setDate(lunesSemana.getDate() + (direccion * 7));
    onFechaChange(nuevaFecha);
  };

  const irHoy = () => {
    onFechaChange(new Date());
  };

  const hoyISO = formatLocalDate(new Date());

  return (
    <Card className={componentStyles.containers.cardBase}>
      <CardContent className="p-4">
        {/* Navegación */}
        <div className="flex items-center justify-between mb-4">
          <Button variant="outline" size="sm" onClick={() => navegarSemana(-1)}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <div className="text-center">
            <h3 className="font-semibold text-base">
              {lunesSemana.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
            </h3>
            <p className="text-sm text-ui/60">
              {lunesSemana.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })} — {domingoSemana.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={irHoy}>
              Hoy
            </Button>
            <Button variant="outline" size="sm" onClick={() => navegarSemana(1)}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Grid de días */}
        <div className="grid grid-cols-7 gap-2">
          {diasSemana.map((dia, idx) => {
            const fechaISO = formatLocalDate(dia);
            const eventosDia = eventosPorDia[fechaISO] || { sesiones: [], feedbacks: [], asignaciones: [], eventos: [] };
            const esHoy = hoyISO === fechaISO;
            const totalEventos = eventosDia.sesiones.length + eventosDia.feedbacks.length + 
                                eventosDia.asignaciones.length + eventosDia.eventos.length;

            return (
              <div
                key={idx}
                className={`border rounded-lg p-2 min-h-[200px] ${
                  esHoy ? 'bg-primary/5 border-primary' : 'bg-background border-border-default'
                }`}
              >
                <div className={`text-sm font-medium mb-2 ${esHoy ? 'text-primary' : 'text-ui'}`}>
                  {dia.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' })}
                </div>
                <div className="space-y-1">
                  {eventosDia.eventos.map(evento => (
                    <EventoImportante
                      key={evento.id}
                      evento={evento}
                      onClick={() => onEventoClick(evento, 'evento')}
                    />
                  ))}
                  {eventosDia.asignaciones.map(asignacion => (
                    <EventoAsignacion
                      key={asignacion.id}
                      asignacion={asignacion}
                      usuarios={usuarios}
                      onClick={() => onEventoClick(asignacion, 'asignacion')}
                    />
                  ))}
                  {eventosDia.sesiones.map(sesion => (
                    <EventoSesion
                      key={sesion.id}
                      sesion={sesion}
                      usuarios={usuarios}
                      onClick={() => onEventoClick(sesion, 'sesion')}
                    />
                  ))}
                  {eventosDia.feedbacks.map(feedback => (
                    <EventoFeedback
                      key={feedback.id}
                      feedback={feedback}
                      usuarios={usuarios}
                      onClick={() => onEventoClick(feedback, 'feedback')}
                    />
                  ))}
                  {totalEventos === 0 && (
                    <div className="text-xs text-ui/40 text-center py-4">
                      Sin eventos
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

