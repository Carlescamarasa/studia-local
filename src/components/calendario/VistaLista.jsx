import React, { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ds";
import { Button } from "@/components/ds/Button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, X, ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import EventoSesion from "./EventoSesion";
import EventoFeedback from "./EventoFeedback";
import EventoAsignacion from "./EventoAsignacion";
import EventoImportante from "./EventoImportante";
import { formatLocalDate, parseLocalDate, formatearFechaEvento, startOfMonday } from "./utils";
import { componentStyles } from "@/design/componentStyles";
import { useIsMobile } from "@/hooks/use-mobile";

export default function VistaLista({ fechaActual, onFechaChange, eventos, onEventoClick, usuarios, filtroTipoGlobal, setFiltroTipoGlobal }) {
  const isMobile = useIsMobile();
  const [busqueda, setBusqueda] = useState('');
  const filtroTipo = filtroTipoGlobal || 'all';

  // Calcular rango de fechas: hoy hasta hoy+7 días (basado en fechaActual)
  const hoy = useMemo(() => {
    const h = new Date();
    h.setHours(0, 0, 0, 0);
    return h;
  }, []);
  
  const fechaFin = useMemo(() => {
    const fin = new Date(hoy);
    fin.setDate(fin.getDate() + 7);
    return fin;
  }, [hoy]);

  const hoyISO = formatLocalDate(hoy);
  const fechaFinISO = formatLocalDate(fechaFin);

  // Combinar todos los eventos en una lista plana con fecha
  const eventosLista = useMemo(() => {
    const lista = [];

    // Agregar eventos importantes (prioridad 1)
    eventos.eventosImportantes.forEach(evento => {
      const fechaEvento = parseLocalDate(evento.fechaInicio);
      if (fechaEvento >= hoy && fechaEvento <= fechaFin) {
        lista.push({
          tipo: 'evento',
          evento: evento,
          fecha: evento.fechaInicio,
          fechaISO: evento.fechaInicio,
          prioridad: 1,
        });
      }
    });

    // Agregar asignaciones (prioridad 2)
    eventos.asignaciones.forEach(asignacion => {
      if (asignacion.semanaInicioISO) {
        const fechaAsignacion = parseLocalDate(asignacion.semanaInicioISO);
        if (fechaAsignacion >= hoy && fechaAsignacion <= fechaFin) {
          lista.push({
            tipo: 'asignacion',
            evento: asignacion,
            fecha: asignacion.semanaInicioISO,
            fechaISO: asignacion.semanaInicioISO,
            prioridad: 2,
          });
        }
      }
    });

    // Agregar sesiones (prioridad 3)
    eventos.sesiones.forEach(sesion => {
      if (sesion.inicioISO) {
        const fecha = sesion.inicioISO.split('T')[0];
        const fechaSesion = parseLocalDate(fecha);
        if (fechaSesion >= hoy && fechaSesion <= fechaFin) {
          lista.push({
            tipo: 'sesion',
            evento: sesion,
            fecha: fecha,
            fechaISO: sesion.inicioISO,
            prioridad: 3,
          });
        }
      }
    });

    // Agregar feedbacks (prioridad 4)
    eventos.feedbacks.forEach(feedback => {
      if (feedback.semanaInicioISO) {
        const fechaFeedback = parseLocalDate(feedback.semanaInicioISO);
        if (fechaFeedback >= hoy && fechaFeedback <= fechaFin) {
          lista.push({
            tipo: 'feedback',
            evento: feedback,
            fecha: feedback.semanaInicioISO,
            fechaISO: feedback.semanaInicioISO,
            prioridad: 4,
          });
        }
      }
    });

    // Ordenar: primero por fecha, luego por prioridad (evento > asignación > sesión > feedback)
    lista.sort((a, b) => {
      const fechaA = parseLocalDate(a.fecha);
      const fechaB = parseLocalDate(b.fecha);
      
      // Si es la misma fecha, ordenar por prioridad
      if (fechaA.getTime() === fechaB.getTime()) {
        return a.prioridad - b.prioridad;
      }
      
      // Ordenar por fecha ascendente (más antiguo primero)
      return fechaA - fechaB;
    });

    return lista;
  }, [eventos, hoy, fechaFin]);

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
    if (!eventosFiltrados || eventosFiltrados.length === 0) {
      return {};
    }
    const agrupados = {};
    eventosFiltrados.forEach(item => {
      if (item && item.fecha) {
      const fecha = item.fecha;
      if (!agrupados[fecha]) {
        agrupados[fecha] = [];
      }
      agrupados[fecha].push(item);
      }
    });
    return agrupados;
  }, [eventosFiltrados]);

  const fechasOrdenadas = useMemo(() => {
    if (!eventosPorFecha || typeof eventosPorFecha !== 'object') {
      return [];
    }
    const fechas = Object.keys(eventosPorFecha);
    if (fechas.length === 0) {
      return [];
    }
    const fechasOrdenadas = fechas.sort((a, b) => {
      try {
      const fechaA = parseLocalDate(a);
      const fechaB = parseLocalDate(b);
      return fechaA - fechaB; // Ascendente (hoy primero)
      } catch (e) {
        console.error('[VistaLista] Error ordenando fechas:', e);
        return 0;
      }
    });
    
    // Asegurar que hoy esté primero
    const hoyIndex = fechas.indexOf(hoyISO);
    if (hoyIndex > 0) {
      fechas.splice(hoyIndex, 1);
      fechas.unshift(hoyISO);
    } else if (hoyIndex === -1 && fechas.length > 0) {
      // Si hoy no está en la lista pero hay eventos, poner hoy al inicio si hay eventos futuros
      const primeraFecha = parseLocalDate(fechas[0]);
      if (primeraFecha >= hoy) {
        fechas.unshift(hoyISO);
      }
    }
    
    return fechasOrdenadas;
  }, [eventosPorFecha, hoyISO, hoy]);

  const navegarFechas = (direccion) => {
    const nuevaFecha = new Date(fechaActual);
    nuevaFecha.setDate(nuevaFecha.getDate() + (direccion * 7));
    onFechaChange(nuevaFecha);
  };

  const irHoy = () => {
    onFechaChange(new Date());
  };

  const headerContent = (
    <div className={`flex items-center justify-between flex-wrap gap-3 ${isMobile ? 'mb-2 px-0' : ''}`}>
      <h2 className={`font-semibold ${isMobile ? 'text-base' : 'text-lg'}`}>Lista de Eventos</h2>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navegarFechas(-1)}
              className="h-8"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={irHoy}
              className="h-8"
            >
              <Calendar className="w-4 h-4 mr-1" />
              Hoy
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navegarFechas(1)}
              className="h-8"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
  );

  const bodyContent = (
    <>
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
          <Select value={filtroTipo} onValueChange={setFiltroTipoGlobal}>
            <SelectTrigger className={`w-40 ${componentStyles.controls.selectDefault}`}>
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="evento">Eventos</SelectItem>
              <SelectItem value="asignacion">Asignaciones</SelectItem>
              <SelectItem value="sesion">Sesiones</SelectItem>
              <SelectItem value="feedback">Feedbacks</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Lista de eventos */}
      <div className={`${isMobile ? 'space-y-6 px-0' : 'space-y-6'}`}>
          {fechasOrdenadas.length === 0 ? (
            <div className="text-center py-8 text-ui/60">
              No hay eventos para mostrar
            </div>
          ) : (
            fechasOrdenadas.map(fecha => {
            const eventosFecha = eventosPorFecha[fecha] || [];
              const fechaFormateada = formatearFechaEvento(fecha);

            if (!eventosFecha || !Array.isArray(eventosFecha) || eventosFecha.length === 0) {
              return null;
            }

              return (
                <div key={fecha} className="space-y-2">
                  <h3 className="font-semibold text-sm text-ui/80 border-b border-border-default pb-1">
                    {fechaFormateada}
                  </h3>
                  <div className="space-y-2 pl-4">
                    {eventosFecha
                    .sort((a, b) => {
                      const prioridadA = a?.prioridad || 999;
                      const prioridadB = b?.prioridad || 999;
                      return prioridadA - prioridadB;
                    })
                      .map((item, idx) => (
                      <div key={`${item.tipo}-${item.evento.id}-${idx}`}>
                        {item.tipo === 'evento' && (
                          <EventoImportante
                            evento={item.evento}
                            onClick={() => onEventoClick(item.evento, 'evento')}
                          />
                        )}
                        {item.tipo === 'asignacion' && (
                          <EventoAsignacion
                            asignacion={item.evento}
                            usuarios={usuarios}
                            onClick={() => onEventoClick(item.evento, 'asignacion')}
                          />
                        )}
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
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>
    </>
  );

  // En mobile, sin Card wrapper para máximo espacio
  if (isMobile) {
    return (
      <>
        {headerContent}
        <div className="space-y-3 px-0">
          {bodyContent}
        </div>
      </>
    );
  }

  // En desktop, con Card
  return (
    <Card className={componentStyles.containers.cardBase}>
      <CardHeader>
        <CardTitle className="text-lg">Lista de Eventos</CardTitle>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navegarFechas(-1)}
            className="h-8"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={irHoy}
            className="h-8"
          >
            <Calendar className="w-4 h-4 mr-1" />
            Hoy
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navegarFechas(1)}
            className="h-8"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {bodyContent}
      </CardContent>
    </Card>
  );
}

