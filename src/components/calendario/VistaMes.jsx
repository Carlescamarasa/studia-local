import React, { useMemo, useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ds";
import { Button } from "@/components/ds/Button";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import EventoSesion from "./EventoSesion";
import EventoFeedback from "./EventoFeedback";
import EventoAsignacion from "./EventoAsignacion";
import EventoImportante from "./EventoImportante";
import { agruparEventosPorDia, startOfMonday, formatLocalDate, parseLocalDate, formatearFechaEvento } from "./utils";
import { componentStyles } from "@/design/componentStyles";
import { useIsMobile } from "@/hooks/use-mobile";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

export default function VistaMes({ fechaActual, onFechaChange, eventos, onEventoClick, usuarios, filtroTipo = 'all' }) {
  const isMobile = useIsMobile();
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024);
  const [diaSeleccionado, setDiaSeleccionado] = useState(null);

  // Detectar tamaño de ventana
  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isTablet = windowWidth >= 768 && windowWidth < 1024;
  const isDesktop = windowWidth >= 1024;

  const { primerLunes, ultimoDomingo } = useMemo(() => {
    const primerDiaMes = new Date(fechaActual.getFullYear(), fechaActual.getMonth(), 1);
    const ultimoDiaMes = new Date(fechaActual.getFullYear(), fechaActual.getMonth() + 1, 0);

    // Helper function to find the end of Sunday for a given date
    const endOfSunday = (date) => {
      const dayOfWeek = date.getDay(); // 0 for Sunday, 1 for Monday, ..., 6 for Saturday
      const diff = dayOfWeek === 0 ? 0 : 7 - dayOfWeek; // Days to add to reach next Sunday
      const domingo = new Date(date);
      domingo.setDate(date.getDate() + diff);
      domingo.setHours(23, 59, 59, 999); // Set to end of day
      return domingo;
    };

    return {
      primerLunes: startOfMonday(primerDiaMes),
      ultimoDomingo: endOfSunday(ultimoDiaMes),
    };
  }, [fechaActual]);

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
    const eventosFiltrados = {
      sesiones: filtroTipo === 'all' || filtroTipo === 'sesion' ? eventos.sesiones : [],
      feedbacks: filtroTipo === 'all' || filtroTipo === 'feedback' ? eventos.feedbacks : [],
      asignaciones: filtroTipo === 'all' || filtroTipo === 'asignacion' ? eventos.asignaciones : [],
      eventosImportantes: filtroTipo === 'all' || filtroTipo === 'evento' ? eventos.eventosImportantes : [],
    };
    return agruparEventosPorDia(eventosFiltrados, primerLunes, ultimoDomingo);
  }, [eventos, primerLunes, ultimoDomingo, filtroTipo]);

  const navegarMes = (direccion) => {
    const nuevaFecha = new Date(fechaActual);
    nuevaFecha.setMonth(fechaActual.getMonth() + direccion);
    onFechaChange(nuevaFecha);
    setDiaSeleccionado(null);
  };

  const irHoy = () => {
    onFechaChange(new Date());
    setDiaSeleccionado(null);
  };

  const hoyISO = formatLocalDate(new Date());
  const mesActual = fechaActual.getMonth();
  const añoActual = fechaActual.getFullYear();

  const nombresDias = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

  // Renderizar lista de eventos del día seleccionado
  const renderEventosDelDia = (dia = diaSeleccionado) => {
    if (!dia) return null;
    const fechaISO = formatLocalDate(dia);
    const eventosDiaSeleccionado = eventosPorDia[fechaISO] || { sesiones: [], feedbacks: [], asignaciones: [], eventos: [] };

    if (!eventosDiaSeleccionado) return null;

    const todosEventos = [
      ...eventosDiaSeleccionado.eventos.map(e => ({ tipo: 'evento', evento: e, prioridad: 1 })),
      ...eventosDiaSeleccionado.asignaciones.map(a => ({ tipo: 'asignacion', evento: a, prioridad: 2 })),
      ...eventosDiaSeleccionado.sesiones.map(s => ({ tipo: 'sesion', evento: s, prioridad: 3 })),
      ...eventosDiaSeleccionado.feedbacks.map(f => ({ tipo: 'feedback', evento: f, prioridad: 4 })),
    ].sort((a, b) => a.prioridad - b.prioridad);

    if (todosEventos.length === 0) {
      return (
        <div className="text-center py-8 text-[var(--color-text-secondary)]">
          No hay eventos este día
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {todosEventos.map((item, idx) => (
          <div key={`${item.tipo}-${item.evento.id}-${idx}`}>
            {item.tipo === 'evento' && (
              <EventoImportante
                evento={item.evento}
                onClick={() => {
                  onEventoClick(item.evento, 'evento');
                  setDiaSeleccionado(null);
                }}
              />
            )}
            {item.tipo === 'asignacion' && (
              <EventoAsignacion
                asignacion={item.evento}
                usuarios={usuarios}
                onClick={() => {
                  onEventoClick(item.evento, 'asignacion');
                  setDiaSeleccionado(null);
                }}
                fechaEvento={diaSeleccionado}
              />
            )}
            {item.tipo === 'sesion' && (
              <EventoSesion
                sesion={item.evento}
                usuarios={usuarios}
                onClick={() => {
                  onEventoClick(item.evento, 'sesion');
                  setDiaSeleccionado(null);
                }}
              />
            )}
            {item.tipo === 'feedback' && (
              <EventoFeedback
                feedback={item.evento}
                usuarios={usuarios}
                onClick={() => {
                  onEventoClick(item.evento, 'feedback');
                  setDiaSeleccionado(null);
                }}
              />
            )}
          </div>
        ))}
      </div>
    );
  };

  // Vista móvil/tablet: mini-calendario + lista
  if (isMobile || isTablet) {
    return (
      <div className="space-y-4">
        <Card className={componentStyles.containers.cardBase}>
          <CardContent className="p-4">
            {/* Navegación */}
            <div className="flex items-center justify-between mb-4">
              <Button variant="outline" size="sm" onClick={() => navegarMes(-1)} className="rounded-xl focus-brand">
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <div className="text-center">
                <h3 className="font-semibold text-base">
                  {fechaActual.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
                </h3>
              </div>
              <div className="flex gap-2">
                {!isMobile && (
                  <Button variant="outline" size="sm" onClick={irHoy} className="rounded-xl focus-brand">
                    Hoy
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={() => navegarMes(1)} className="rounded-xl focus-brand">
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Mini-calendario con puntos */}
            <div className="grid grid-cols-7 gap-1">
              {/* Encabezados */}
              {nombresDias.map(dia => (
                <div key={dia} className="text-center text-xs p-1 font-medium text-[var(--color-text-secondary)]">
                  {isMobile ? dia.substring(0, 1) : dia}
                </div>
              ))}

              {/* Días */}
              {diasCalendario.map((dia, idx) => {
                const fechaISO = formatLocalDate(dia);
                const eventosDia = eventosPorDia[fechaISO] || { sesiones: [], feedbacks: [], asignaciones: [], eventos: [] };
                const esHoy = hoyISO === fechaISO;
                const esOtroMes = dia.getMonth() !== mesActual;
                const estaSeleccionado = diaSeleccionado === fechaISO;
                const totalEventos = eventosDia.sesiones.length + eventosDia.feedbacks.length +
                  eventosDia.asignaciones.length + eventosDia.eventos.length;

                return (
                  <button
                    key={idx}
                    onClick={() => setDiaSeleccionado(fechaISO)}
                    className={`border rounded p-1 min-h-[40px] flex flex-col items-center justify-center transition-colors ${estaSeleccionado
                      ? 'bg-[var(--color-primary)]/20 border-[var(--color-primary)]'
                      : esHoy
                        ? 'bg-[var(--color-primary)]/5 border-[var(--color-primary)]'
                        : 'bg-background border-[var(--color-border-default)]'
                      } ${esOtroMes ? 'opacity-40' : ''} ${totalEventos > 0 ? 'hover:bg-[var(--color-primary)]/10' : ''}`}
                  >
                    <div className={`text-xs font-medium ${esHoy ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-primary)]'}`}>
                      {dia.getDate()}
                    </div>
                    {totalEventos > 0 && (
                      <div className="flex gap-0.5 mt-1 justify-center flex-wrap max-w-full">
                        {eventosDia.sesiones.length > 0 && (
                          <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-success)]" title={`${eventosDia.sesiones.length} sesión(es)`} />
                        )}
                        {eventosDia.feedbacks.length > 0 && (
                          <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-info)]" title={`${eventosDia.feedbacks.length} feedback(s)`} />
                        )}
                        {eventosDia.asignaciones.length > 0 && (
                          <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-warning)]" title={`${eventosDia.asignaciones.length} asignación(es)`} />
                        )}
                        {eventosDia.eventos.length > 0 && (
                          <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-primary)]" title={`${eventosDia.eventos.length} evento(s)`} />
                        )}
                        {totalEventos > 4 && (
                          <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-text-secondary)]" title={`+${totalEventos - 4} más`} />
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Lista de eventos del día seleccionado */}
        {diaSeleccionado && (
          <Card className={componentStyles.containers.cardBase}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-base">
                  {formatearFechaEvento(diaSeleccionado)}
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDiaSeleccionado(null)}
                  className="h-8 w-8 p-0"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              {renderEventosDelDia()}
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  // Vista desktop: cuadrícula completa con puntos de colores
  return (
    <Card className={componentStyles.containers.cardBase}>
      <CardContent className="p-4">
        {/* Navegación */}
        <div className="flex items-center justify-between mb-4">
          <Button variant="outline" size="sm" onClick={() => navegarMes(-1)} className="rounded-xl focus-brand">
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <div className="text-center">
            <h3 className="font-semibold text-base">
              {fechaActual.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
            </h3>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={irHoy} className="rounded-xl focus-brand">
              Hoy
            </Button>
            <Button variant="outline" size="sm" onClick={() => navegarMes(1)} className="rounded-xl focus-brand">
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Grid de calendario */}
        <div className="grid grid-cols-7 gap-1">
          {/* Encabezados de días */}
          {nombresDias.map(dia => (
            <div key={dia} className="text-center text-xs p-2 font-medium text-[var(--color-text-secondary)]">
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
              <button
                key={idx}
                onClick={() => totalEventos > 0 && setDiaSeleccionado(fechaISO)}
                className={`border rounded-lg p-2 min-h-[100px] flex flex-col transition-colors ${esHoy ? 'bg-[var(--color-primary)]/5 border-[var(--color-primary)]' : 'bg-background border-[var(--color-border-default)]'
                  } ${esOtroMes ? 'opacity-40' : ''} ${totalEventos > 0 ? 'hover:bg-[var(--color-primary)]/10 cursor-pointer' : 'cursor-default'}`}
              >
                {/* Número del día */}
                <div className={`text-sm font-medium mb-2 ${esHoy ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-primary)]'}`}>
                  {dia.getDate()}
                </div>

                {/* Puntos de colores */}
                {totalEventos > 0 && (
                  <div className="flex gap-1 flex-wrap justify-start">
                    {eventosDia.sesiones.length > 0 && (
                      <div className="w-2 h-2 rounded-full bg-[var(--color-success)]" title={`${eventosDia.sesiones.length} sesión(es)`} />
                    )}
                    {eventosDia.feedbacks.length > 0 && (
                      <div className="w-2 h-2 rounded-full bg-[var(--color-info)]" title={`${eventosDia.feedbacks.length} feedback(s)`} />
                    )}
                    {eventosDia.asignaciones.length > 0 && (
                      <div className="w-2 h-2 rounded-full bg-[var(--color-warning)]" title={`${eventosDia.asignaciones.length} asignación(es)`} />
                    )}
                    {eventosDia.eventos.length > 0 && (
                      <div className="w-2 h-2 rounded-full bg-[var(--color-primary)]" title={`${eventosDia.eventos.length} evento(s)`} />
                    )}
                    {totalEventos > 4 && (
                      <span className="text-[10px] text-[var(--color-text-secondary)] ml-1">
                        +{totalEventos - 4}
                      </span>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </CardContent>

      {/* Panel lateral (Sheet) para mostrar eventos del día seleccionado en desktop */}
      {isDesktop && diaSeleccionado && (
        <Sheet open={!!diaSeleccionado} onOpenChange={(open) => !open && setDiaSeleccionado(null)}>
          <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
            <SheetHeader className="mb-4">
              <SheetTitle>
                {formatearFechaEvento(diaSeleccionado)}
              </SheetTitle>
            </SheetHeader>
            {renderEventosDelDia()}
          </SheetContent>
        </Sheet>
      )}
    </Card>
  );
}
