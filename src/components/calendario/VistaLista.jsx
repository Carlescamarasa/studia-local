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
import { formatLocalDate, parseLocalDate, formatearFechaEvento, startOfMonday, formatearHora } from "./utils";
import { componentStyles } from "@/design/componentStyles";
import { useIsMobile } from "@/hooks/use-mobile";

/**
 * Vista Lista del calendario
 * 
 * Muestra eventos en un rango de "Hoy + 7 días" (7 días en total: hoy hasta hoy+6)
 * Los eventos están ordenados por fecha ASC y hora ASC, agrupados por día
 */
export default function VistaLista({ fechaActual, onFechaChange, eventos, onEventoClick, usuarios, filtroTipoGlobal, setFiltroTipoGlobal, registrosSesion = [] }) {
  const isMobile = useIsMobile();
  const [busqueda, setBusqueda] = useState('');
  const filtroTipo = filtroTipoGlobal || 'all';

  // Calcular rango: "Hoy + 7 días" (startDate = hoy, endDate = hoy + 6)
  // El rango se calcula basándose en la semana que contiene fechaActual
  const hoy = useMemo(() => {
    const h = new Date();
    h.setHours(0, 0, 0, 0);
    return h;
  }, []);

  const hoyISO = formatLocalDate(hoy);

  // Calcular el inicio del rango basado en fechaActual (lunes de la semana)
  const lunesSemana = useMemo(() => {
    return startOfMonday(fechaActual);
  }, [fechaActual]);
  
  // Rango: desde el lunes de la semana hasta el domingo (7 días)
  const domingoSemana = useMemo(() => {
    const domingo = new Date(lunesSemana);
    domingo.setDate(lunesSemana.getDate() + 6);
    domingo.setHours(23, 59, 59, 999);
    return domingo;
  }, [lunesSemana]);

  // Combinar todos los eventos en una lista plana con fecha y hora
  const eventosLista = useMemo(() => {
    const lista = [];

    // Agregar eventos importantes
    eventos.eventosImportantes.forEach(evento => {
      const fechaEvento = parseLocalDate(evento.fechaInicio);
      if (fechaEvento >= lunesSemana && fechaEvento <= domingoSemana) {
        const horaISO = evento.fechaInicio?.includes('T') ? evento.fechaInicio : `${evento.fechaInicio}T00:00:00`;
        lista.push({
          tipo: 'evento',
          evento: evento,
          fecha: evento.fechaInicio,
          fechaISO: evento.fechaInicio,
          horaISO: horaISO,
          prioridad: 1,
        });
      }
    });

    // Agregar asignaciones (todas las semanas del plan que caen en el rango)
    eventos.asignaciones.forEach(asignacion => {
      if (asignacion.semanaInicioISO && asignacion.plan && Array.isArray(asignacion.plan.semanas)) {
        const lunesAsignacion = startOfMonday(parseLocalDate(asignacion.semanaInicioISO));
        const totalSemanas = Math.max(1, asignacion.plan.semanas.length);
        const totalDias = totalSemanas * 7;
        
        // Generar eventos para cada día del plan que cae en el rango visible
        for (let i = 0; i < totalDias; i++) {
          const fecha = new Date(lunesAsignacion);
          fecha.setDate(lunesAsignacion.getDate() + i);
          const fechaISO = formatLocalDate(fecha);
          
          // Solo incluir si está en el rango visible
          if (fecha >= lunesSemana && fecha <= domingoSemana) {
          lista.push({
            tipo: 'asignacion',
            evento: asignacion,
              fecha: fechaISO,
              fechaISO: fechaISO,
              horaISO: `${fechaISO}T00:00:00`, // Sin hora específica
            prioridad: 2,
          });
          }
        }
      }
    });

    // Agregar sesiones (con hora)
    eventos.sesiones.forEach(sesion => {
      if (sesion.inicioISO) {
        const fecha = sesion.inicioISO.split('T')[0];
        const fechaSesion = parseLocalDate(fecha);
        if (fechaSesion >= lunesSemana && fechaSesion <= domingoSemana) {
          lista.push({
            tipo: 'sesion',
            evento: sesion,
            fecha: fecha,
            fechaISO: sesion.inicioISO,
            horaISO: sesion.inicioISO, // Tiene hora completa
            prioridad: 3,
          });
        }
      }
    });

    // Agregar feedbacks
    eventos.feedbacks.forEach(feedback => {
      if (feedback.semanaInicioISO) {
        const fechaFeedback = parseLocalDate(feedback.semanaInicioISO);
        if (fechaFeedback >= lunesSemana && fechaFeedback <= domingoSemana) {
          lista.push({
            tipo: 'feedback',
            evento: feedback,
            fecha: feedback.semanaInicioISO,
            fechaISO: feedback.semanaInicioISO,
            horaISO: feedback.created_at || `${feedback.semanaInicioISO}T00:00:00`,
            prioridad: 4,
          });
        }
      }
    });

    // Ordenar: primero por fecha ASC, luego por hora ASC, luego por prioridad
    lista.sort((a, b) => {
      const fechaA = parseLocalDate(a.fecha);
      const fechaB = parseLocalDate(b.fecha);
      
      // Si es la misma fecha, ordenar por hora
      if (fechaA.getTime() === fechaB.getTime()) {
        const horaA = a.horaISO ? new Date(a.horaISO).getTime() : 0;
        const horaB = b.horaISO ? new Date(b.horaISO).getTime() : 0;
        
        // Si es la misma hora, ordenar por prioridad
        if (horaA === horaB) {
        return a.prioridad - b.prioridad;
        }
        
        return horaA - horaB;
      }
      
      // Ordenar por fecha ascendente (más antiguo primero)
      return fechaA - fechaB;
    });

    return lista;
  }, [eventos, lunesSemana, domingoSemana]);

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
                 (sesion.piezaNombre || '').toLowerCase().includes(termino) ||
                 (sesion.notas || '').toLowerCase().includes(termino);
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
    // Ordenar fechas ascendente
    return fechas.sort((a, b) => {
      try {
      const fechaA = parseLocalDate(a);
      const fechaB = parseLocalDate(b);
        return fechaA - fechaB;
      } catch (e) {
        console.error('[VistaLista] Error ordenando fechas:', e);
        return 0;
      }
    });
  }, [eventosPorFecha]);

  // Navegación: mueve el rango una semana hacia atrás o adelante
  const navegarFechas = (direccion) => {
    const nuevaFecha = new Date(lunesSemana);
    nuevaFecha.setDate(lunesSemana.getDate() + (direccion * 7));
    onFechaChange(nuevaFecha);
  };

  // Ir a hoy: resetea el rango a [hoy, hoy+6]
  const irHoy = () => {
    onFechaChange(new Date());
  };

  // Formatear rango de fechas para mostrar
  const rangoTexto = useMemo(() => {
    const inicio = lunesSemana.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
    const fin = domingoSemana.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
    return `${inicio} — ${fin}`;
  }, [lunesSemana, domingoSemana]);

  return (
    <Card className={componentStyles.containers.cardBase}>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <CardTitle className="text-lg">Lista de Eventos</CardTitle>
            <p className="text-sm text-[var(--color-text-secondary)] mt-1">
              {rangoTexto}
            </p>
          </div>
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
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filtros */}
        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-secondary)]" />
            <Input
              placeholder="Buscar eventos..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className={`w-full pl-9 pr-9 ${componentStyles.controls.inputDefault}`}
            />
            {busqueda && (
              <button
                onClick={() => setBusqueda('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
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

        {/* Lista de eventos agrupados por día */}
        <div className="space-y-6">
          {fechasOrdenadas.length === 0 ? (
            <div className="text-center py-8 text-[var(--color-text-secondary)]">
              No hay eventos para mostrar
            </div>
          ) : (
            fechasOrdenadas.map(fecha => {
            const eventosFecha = eventosPorFecha[fecha] || [];
              const fechaObj = parseLocalDate(fecha);
              const fechaFormateada = fechaObj.toLocaleDateString('es-ES', { 
                weekday: 'short', 
                day: 'numeric', 
                month: 'short' 
              });
              const esHoy = fecha === hoyISO;

            if (!eventosFecha || !Array.isArray(eventosFecha) || eventosFecha.length === 0) {
              return null;
            }

              return (
                <div key={fecha} className="space-y-2">
                  <h3 className={`font-semibold text-sm border-b border-[var(--color-border-default)] pb-1 ${
                    esHoy ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-primary)]'
                  }`}>
                    {fechaFormateada}
                  </h3>
                  <div className="space-y-2 pl-4">
                    {eventosFecha.map((item, idx) => (
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
                            registrosSesion={registrosSesion}
                            fechaEvento={item.fechaISO}
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
      </CardContent>
    </Card>
  );
}
