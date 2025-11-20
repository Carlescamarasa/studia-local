import React, { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ds";
import { Button } from "@/components/ds/Button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, X } from "lucide-react";
import EventoSesion from "./EventoSesion";
import EventoFeedback from "./EventoFeedback";
import EventoAsignacion from "./EventoAsignacion";
import EventoImportante from "./EventoImportante";
import { formatLocalDate, parseLocalDate, formatearFechaEvento } from "./utils";
import { componentStyles } from "@/design/componentStyles";

export default function VistaLista({ fechaActual, onFechaChange, eventos, onEventoClick, usuarios }) {
  const [filtroTipo, setFiltroTipo] = useState('all');
  const [busqueda, setBusqueda] = useState('');

  // Combinar todos los eventos en una lista plana con fecha
  const eventosLista = useMemo(() => {
    const lista = [];

    // Agregar sesiones
    eventos.sesiones.forEach(sesion => {
      if (sesion.inicioISO) {
        const fecha = sesion.inicioISO.split('T')[0];
        lista.push({
          tipo: 'sesion',
          evento: sesion,
          fecha: fecha,
          fechaISO: sesion.inicioISO,
        });
      }
    });

    // Agregar feedbacks (usar semanaInicioISO)
    eventos.feedbacks.forEach(feedback => {
      if (feedback.semanaInicioISO) {
        lista.push({
          tipo: 'feedback',
          evento: feedback,
          fecha: feedback.semanaInicioISO,
          fechaISO: feedback.semanaInicioISO,
        });
      }
    });

    // Agregar asignaciones (usar semanaInicioISO)
    eventos.asignaciones.forEach(asignacion => {
      if (asignacion.semanaInicioISO) {
        lista.push({
          tipo: 'asignacion',
          evento: asignacion,
          fecha: asignacion.semanaInicioISO,
          fechaISO: asignacion.semanaInicioISO,
        });
      }
    });

    // Agregar eventos importantes
    eventos.eventosImportantes.forEach(evento => {
      lista.push({
        tipo: 'evento',
        evento: evento,
        fecha: evento.fechaInicio,
        fechaISO: evento.fechaInicio,
      });
    });

    // Ordenar por fecha descendente
    lista.sort((a, b) => {
      const fechaA = parseLocalDate(a.fecha);
      const fechaB = parseLocalDate(b.fecha);
      return fechaB - fechaA;
    });

    return lista;
  }, [eventos]);

  // Filtrar eventos
  const eventosFiltrados = useMemo(() => {
    let filtrados = eventosLista;

    // Filtrar por tipo
    if (filtroTipo !== 'all') {
      filtrados = filtrados.filter(e => e.tipo === filtroTipo);
    }

    // Filtrar por búsqueda
    if (busqueda.trim()) {
      const termino = busqueda.toLowerCase();
      filtrados = filtrados.filter(e => {
        if (e.tipo === 'sesion') {
          const sesion = e.evento;
          return (sesion.sesionNombre || '').toLowerCase().includes(termino) ||
                 (sesion.piezaNombre || '').toLowerCase().includes(termino);
        } else if (e.tipo === 'feedback') {
          const feedback = e.evento;
          return (feedback.notaProfesor || '').toLowerCase().includes(termino);
        } else if (e.tipo === 'asignacion') {
          const asignacion = e.evento;
          return (asignacion.piezaSnapshot?.nombre || '').toLowerCase().includes(termino);
        } else if (e.tipo === 'evento') {
          const evento = e.evento;
          return (evento.titulo || '').toLowerCase().includes(termino) ||
                 (evento.descripcion || '').toLowerCase().includes(termino);
        }
        return false;
      });
    }

    return filtrados;
  }, [eventosLista, filtroTipo, busqueda]);

  // Agrupar por fecha
  const eventosPorFecha = useMemo(() => {
    const agrupados = {};
    eventosFiltrados.forEach(item => {
      const fecha = item.fecha;
      if (!agrupados[fecha]) {
        agrupados[fecha] = [];
      }
      agrupados[fecha].push(item);
    });
    return agrupados;
  }, [eventosFiltrados]);

  const fechasOrdenadas = useMemo(() => {
    return Object.keys(eventosPorFecha).sort((a, b) => {
      const fechaA = parseLocalDate(a);
      const fechaB = parseLocalDate(b);
      return fechaB - fechaA;
    });
  }, [eventosPorFecha]);

  return (
    <Card className={componentStyles.containers.cardBase}>
      <CardHeader>
        <CardTitle className="text-lg">Lista de Eventos</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filtros */}
        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ui/60" />
            <Input
              placeholder="Buscar eventos..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className={`w-full pl-9 pr-9 ${componentStyles.controls.inputDefault}`}
            />
            {busqueda && (
              <button
                onClick={() => setBusqueda('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-ui/60 hover:text-ui"
                aria-label="Limpiar búsqueda"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <Select value={filtroTipo} onValueChange={setFiltroTipo}>
            <SelectTrigger className={`w-40 ${componentStyles.controls.selectDefault}`}>
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="sesion">Sesiones</SelectItem>
              <SelectItem value="feedback">Feedbacks</SelectItem>
              <SelectItem value="asignacion">Asignaciones</SelectItem>
              <SelectItem value="evento">Eventos</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Lista de eventos */}
        <div className="space-y-6">
          {fechasOrdenadas.length === 0 ? (
            <div className="text-center py-8 text-ui/60">
              No hay eventos para mostrar
            </div>
          ) : (
            fechasOrdenadas.map(fecha => {
              const eventosFecha = eventosPorFecha[fecha];
              const fechaFormateada = formatearFechaEvento(fecha);

              return (
                <div key={fecha} className="space-y-2">
                  <h3 className="font-semibold text-sm text-ui/80 border-b border-border-default pb-1">
                    {fechaFormateada}
                  </h3>
                  <div className="space-y-2 pl-4">
                    {eventosFecha.map((item, idx) => (
                      <div key={`${item.tipo}-${item.evento.id}-${idx}`}>
                        {item.tipo === 'sesion' && (
                          <EventoSesion
                            sesion={item.evento}
                            usuarios={usuarios}
                            onClick={() => onEventoClick(item.evento, 'sesion')}
                          />
                        )}
                        {item.tipo === 'feedback' && (
                          <EventoFeedback
                            feedback={item.evento}
                            usuarios={usuarios}
                            onClick={() => onEventoClick(item.evento, 'feedback')}
                          />
                        )}
                        {item.tipo === 'asignacion' && (
                          <EventoAsignacion
                            asignacion={item.evento}
                            usuarios={usuarios}
                            onClick={() => onEventoClick(item.evento, 'asignacion')}
                          />
                        )}
                        {item.tipo === 'evento' && (
                          <EventoImportante
                            evento={item.evento}
                            onClick={() => onEventoClick(item.evento, 'evento')}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
}

