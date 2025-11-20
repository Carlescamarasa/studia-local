import React, { useMemo } from "react";
import { Card, CardContent } from "@/components/ds";
import { Button } from "@/components/ds/Button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import EventoSesion from "./EventoSesion";
import EventoFeedback from "./EventoFeedback";
import EventoAsignacion from "./EventoAsignacion";
import EventoImportante from "./EventoImportante";
import { agruparEventosPorDia, startOfMonday, formatLocalDate, parseLocalDate } from "./utils";
import { componentStyles } from "@/design/componentStyles";

export default function VistaMes({ fechaActual, onFechaChange, eventos, onEventoClick, usuarios }) {
  const primerDiaMes = useMemo(() => {
    return new Date(fechaActual.getFullYear(), fechaActual.getMonth(), 1);
  }, [fechaActual]);

  const ultimoDiaMes = useMemo(() => {
    return new Date(fechaActual.getFullYear(), fechaActual.getMonth() + 1, 0);
  }, [fechaActual]);

  const primerLunes = useMemo(() => {
    return startOfMonday(primerDiaMes);
  }, [primerDiaMes]);

  const ultimoDomingo = useMemo(() => {
    const ultimoDia = ultimoDiaMes;
    const domingo = new Date(ultimoDia);
    const diff = 7 - ultimoDia.getDay();
    if (diff < 7) {
      domingo.setDate(ultimoDia.getDate() + diff);
    }
    return domingo;
  }, [ultimoDiaMes]);

  const diasCalendario = useMemo(() => {
    const dias = [];
    const fechaActual = new Date(primerLunes);
    while (fechaActual <= ultimoDomingo) {
      dias.push(new Date(fechaActual));
      fechaActual.setDate(fechaActual.getDate() + 1);
    }
    return dias;
  }, [primerLunes, ultimoDomingo]);

  const eventosPorDia = useMemo(() => {
    return agruparEventosPorDia(eventos, primerLunes, ultimoDomingo);
  }, [eventos, primerLunes, ultimoDomingo]);

  const navegarMes = (direccion) => {
    const nuevaFecha = new Date(fechaActual);
    nuevaFecha.setMonth(fechaActual.getMonth() + direccion);
    onFechaChange(nuevaFecha);
  };

  const irHoy = () => {
    onFechaChange(new Date());
  };

  const hoyISO = formatLocalDate(new Date());
  const mesActual = fechaActual.getMonth();
  const añoActual = fechaActual.getFullYear();

  const nombresDias = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

  return (
    <Card className={componentStyles.containers.cardBase}>
      <CardContent className="p-4">
        {/* Navegación */}
        <div className="flex items-center justify-between mb-4">
          <Button variant="outline" size="sm" onClick={() => navegarMes(-1)}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <div className="text-center">
            <h3 className="font-semibold text-base">
              {fechaActual.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
            </h3>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={irHoy}>
              Hoy
            </Button>
            <Button variant="outline" size="sm" onClick={() => navegarMes(1)}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Grid de calendario */}
        <div className="grid grid-cols-7 gap-1">
          {/* Encabezados de días */}
          {nombresDias.map(dia => (
            <div key={dia} className="text-center text-xs font-medium text-ui/60 p-2">
              {dia}
            </div>
          ))}

          {/* Días del mes */}
          {diasCalendario.map((dia, idx) => {
            const fechaISO = formatLocalDate(dia);
            const eventosDia = eventosPorDia[fechaISO] || { sesiones: [], feedbacks: [], asignaciones: [], eventos: [] };
            const esHoy = hoyISO === fechaISO;
            const esOtroMes = dia.getMonth() !== mesActual;
            const totalEventos = eventosDia.sesiones.length + eventosDia.feedbacks.length + 
                                eventosDia.asignaciones.length + eventosDia.eventos.length;

            return (
              <div
                key={idx}
                className={`border rounded-lg p-1 min-h-[100px] ${
                  esHoy ? 'bg-primary/5 border-primary' : 'bg-background border-border-default'
                } ${esOtroMes ? 'opacity-40' : ''}`}
              >
                <div className={`text-xs font-medium mb-1 ${esHoy ? 'text-primary' : 'text-ui'}`}>
                  {dia.getDate()}
                </div>
                <div className="space-y-0.5">
                  {eventosDia.sesiones.slice(0, 2).map(sesion => (
                    <EventoSesion
                      key={sesion.id}
                      sesion={sesion}
                      usuarios={usuarios}
                      onClick={() => onEventoClick(sesion, 'sesion')}
                    />
                  ))}
                  {eventosDia.feedbacks.slice(0, 1).map(feedback => (
                    <EventoFeedback
                      key={feedback.id}
                      feedback={feedback}
                      usuarios={usuarios}
                      onClick={() => onEventoClick(feedback, 'feedback')}
                    />
                  ))}
                  {eventosDia.asignaciones.slice(0, 1).map(asignacion => (
                    <EventoAsignacion
                      key={asignacion.id}
                      asignacion={asignacion}
                      usuarios={usuarios}
                      onClick={() => onEventoClick(asignacion, 'asignacion')}
                    />
                  ))}
                  {eventosDia.eventos.slice(0, 1).map(evento => (
                    <EventoImportante
                      key={evento.id}
                      evento={evento}
                      onClick={() => onEventoClick(evento, 'evento')}
                    />
                  ))}
                  {totalEventos > 3 && (
                    <div className="text-[9px] text-ui/60 text-center py-0.5">
                      +{totalEventos - 3} más
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

