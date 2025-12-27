import React, { useMemo, useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ds";
import { Button } from "@/components/ds/Button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import EventoSesion from "./EventoSesion";
import EventoFeedback from "./EventoFeedback";
import EventoAsignacion from "./EventoAsignacion";
import EventoImportante from "./EventoImportante";
import { agruparEventosPorDia, startOfMonday, endOfSunday, formatLocalDate } from "./utils";
import { componentStyles } from "@/design/componentStyles";
import { useIsMobile } from "@/hooks/use-mobile";
import { Badge } from "@/components/ds";
import MediaPreviewModal from "@/shared/components/media/MediaPreviewModal";

export default function VistaSemana({ fechaActual, onFechaChange, eventos, onEventoClick, usuarios, filtroTipo = 'all', registrosSesion = [] }) {
  const isMobile = useIsMobile();
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024);
  const [diaSeleccionado, setDiaSeleccionado] = useState(() => formatLocalDate(new Date()));

  // Detectar tamaño de ventana para tablet
  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isTablet = windowWidth >= 768 && windowWidth < 1024;
  const isDesktop = windowWidth >= 1024;

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
    // En móvil, seleccionar el primer día de la nueva semana
    if (isMobile) {
      setDiaSeleccionado(formatLocalDate(nuevaFecha));
    }
  };

  const irHoy = () => {
    const hoy = new Date();
    onFechaChange(hoy);
    if (isMobile) {
      setDiaSeleccionado(formatLocalDate(hoy));
    }
  };

  const hoyISO = formatLocalDate(new Date());

  // En móvil, obtener eventos del día seleccionado
  const eventosDiaSeleccionado = useMemo(() => {
    if (!isMobile) return null;
    return eventosPorDia[diaSeleccionado] || { sesiones: [], feedbacks: [], asignaciones: [], eventos: [] };
  }, [isMobile, diaSeleccionado, eventosPorDia]);

  // En tablet, mostrar 4 días a la vez (Lun-Jue o Vie-Dom según la semana)
  const diasVisiblesTablet = useMemo(() => {
    if (!isTablet) return diasSemana;
    // Mostrar Lun-Jue por defecto, o Vie-Dom si estamos en la segunda mitad de la semana
    const diaActual = fechaActual.getDay();
    const esSegundaMitad = diaActual >= 4; // Jueves o después
    return esSegundaMitad ? diasSemana.slice(4) : diasSemana.slice(0, 4);
  }, [isTablet, diasSemana, fechaActual]);

  // Normalizar media links para EventoImportante
  const normalizeMediaLinks = (rawLinks) => {
    if (!rawLinks || !Array.isArray(rawLinks)) return [];
    return rawLinks
      .map((raw) => {
        if (typeof raw === 'string') return raw;
        if (raw && typeof raw === 'object' && raw.url) return raw.url;
        if (raw && typeof raw === 'object' && raw.href) return raw.href;
        if (raw && typeof raw === 'object' && raw.link) return raw.link;
        return '';
      })
      .filter((url) => typeof url === 'string' && url.length > 0);
  };

  const [showMediaModal, setShowMediaModal] = useState(false);
  const [selectedMediaLinks, setSelectedMediaLinks] = useState([]);
  const [selectedMediaIndex, setSelectedMediaIndex] = useState(0);

  const handleMediaClick = (index, mediaLinks) => {
    if (!mediaLinks || !Array.isArray(mediaLinks) || mediaLinks.length === 0) return;
    const normalizedLinks = normalizeMediaLinks(mediaLinks);
    if (normalizedLinks.length === 0) return;
    const safeIndex = Math.max(0, Math.min(index, normalizedLinks.length - 1));
    setSelectedMediaLinks(normalizedLinks);
    setSelectedMediaIndex(safeIndex);
    setShowMediaModal(true);
  };

  // Renderizar evento compacto para desktop/tablet (variante week)
  const renderEventoCompacto = (evento, tipo, fechaDia = null) => {
    const props = {
      usuarios,
      onClick: () => onEventoClick(evento, tipo),
      variant: 'week'
    };
    switch (tipo) {
      case 'sesion':
        return <EventoSesion key={evento.id} sesion={evento} {...props} onMediaClick={handleMediaClick} />;
      case 'feedback':
        return <EventoFeedback key={evento.id} feedback={evento} {...props} onMediaClick={handleMediaClick} />;
      case 'asignacion':
        return <EventoAsignacion key={evento.id} asignacion={evento} {...props} registrosSesion={registrosSesion} fechaEvento={fechaDia} />;
      case 'evento':
        return <EventoImportante key={evento.id} evento={evento} onClick={props.onClick} variant="week" onMediaClick={handleMediaClick} />;
      default:
        return null;
    }
  };

  // Vista móvil: selector de días + lista
  if (isMobile) {
    return (
      <Card className={componentStyles.containers.cardBase}>
        <CardContent className="p-4">
          {/* Navegación */}
          <div className="flex items-center justify-between mb-4">
            <Button variant="outline" size="sm" onClick={() => navegarSemana(-1)} className="rounded-xl focus-brand">
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <div className="text-center">
              <h3 className="text-sm font-semibold">
                {lunesSemana.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
              </h3>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={irHoy} className="rounded-xl focus-brand text-xs">
                Hoy
              </Button>
              <Button variant="outline" size="sm" onClick={() => navegarSemana(1)} className="rounded-xl focus-brand">
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Selector de días (scroll horizontal) */}
          <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-hide">
            {diasSemana.map((dia) => {
              const fechaISO = formatLocalDate(dia);
              const esHoy = hoyISO === fechaISO;
              const estaSeleccionado = diaSeleccionado === fechaISO;
              const eventosDia = eventosPorDia[fechaISO] || { sesiones: [], feedbacks: [], asignaciones: [], eventos: [] };
              const totalEventos = eventosDia.sesiones.length + eventosDia.feedbacks.length +
                eventosDia.asignaciones.length + eventosDia.eventos.length;

              return (
                <button
                  key={fechaISO}
                  onClick={() => setDiaSeleccionado(fechaISO)}
                  className={`flex flex-col items-center justify-center min-w-[60px] px-3 py-2 rounded-lg border transition-colors shrink-0 ${estaSeleccionado
                      ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
                      : esHoy
                        ? 'bg-[var(--color-primary)]/10 border-[var(--color-primary)] text-[var(--color-primary)]'
                        : 'bg-[var(--color-surface-muted)] border-[var(--color-border-default)] text-[var(--color-text-primary)]'
                    }`}
                >
                  <span className="text-xs font-medium">
                    {dia.toLocaleDateString('es-ES', { weekday: 'narrow' })}
                  </span>
                  <span className="text-base font-semibold">
                    {dia.getDate()}
                  </span>
                  {totalEventos > 0 && (
                    <span className={`text-[10px] mt-1 ${estaSeleccionado ? 'text-white/80' : 'text-[var(--color-text-secondary)]'
                      }`}>
                      {totalEventos}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Lista de eventos del día seleccionado */}
          <div className="space-y-2">
            {eventosDiaSeleccionado.eventos.map(evento => (
              <EventoImportante
                key={evento.id}
                evento={evento}
                onClick={() => onEventoClick(evento, 'evento')}
                variant="week"
                onMediaClick={handleMediaClick}
              />
            ))}
            {eventosDiaSeleccionado.asignaciones.map(asignacion => (
              <EventoAsignacion
                key={asignacion.id}
                asignacion={asignacion}
                usuarios={usuarios}
                onClick={() => onEventoClick(asignacion, 'asignacion')}
                variant="week"
                registrosSesion={registrosSesion}
                fechaEvento={diaSeleccionado}
              />
            ))}
            {eventosDiaSeleccionado.sesiones.map(sesion => (
              <EventoSesion
                key={sesion.id}
                sesion={sesion}
                usuarios={usuarios}
                onClick={() => onEventoClick(sesion, 'sesion')}
                variant="week"
              />
            ))}
            {eventosDiaSeleccionado.feedbacks.map(feedback => (
              <EventoFeedback
                key={feedback.id}
                feedback={feedback}
                usuarios={usuarios}
                onClick={() => onEventoClick(feedback, 'feedback')}
                variant="week"
              />
            ))}
            {eventosDiaSeleccionado.sesiones.length === 0 &&
              eventosDiaSeleccionado.feedbacks.length === 0 &&
              eventosDiaSeleccionado.asignaciones.length === 0 &&
              eventosDiaSeleccionado.eventos.length === 0 && (
                <div className="text-center py-8 text-[var(--color-text-secondary)]">
                  <p>No hay eventos para este día</p>
                </div>
              )}
          </div>
        </CardContent>

        {/* Modal de preview de medios para eventos importantes */}
        {showMediaModal && selectedMediaLinks.length > 0 && (
          <MediaPreviewModal
            urls={selectedMediaLinks}
            initialIndex={selectedMediaIndex || 0}
            open={showMediaModal}
            onClose={() => {
              setShowMediaModal(false);
              setSelectedMediaLinks([]);
              setSelectedMediaIndex(0);
            }}
          />
        )}
      </Card>
    );
  }

  // Vista desktop o tablet
  return (
    <Card className={componentStyles.containers.cardBase}>
      <CardContent className="p-4">
        {/* Navegación */}
        <div className="flex items-center justify-between mb-4">
          <Button variant="outline" size="sm" onClick={() => navegarSemana(-1)} className="rounded-xl focus-brand">
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <div className="text-center">
            <h3 className="font-semibold text-base">
              {lunesSemana.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
            </h3>
            {isDesktop && (
              <p className="text-sm text-ui/60">
                {lunesSemana.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })} — {domingoSemana.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={irHoy} className="rounded-xl focus-brand">
              Hoy
            </Button>
            <Button variant="outline" size="sm" onClick={() => navegarSemana(1)} className="rounded-xl focus-brand">
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Grid de días: 7 columnas en desktop, 4 en tablet */}
        <div className={`grid ${isTablet ? 'grid-cols-4' : 'grid-cols-7'} gap-2`}>
          {(isTablet ? diasVisiblesTablet : diasSemana).map((dia, idx) => {
            const fechaISO = formatLocalDate(dia);
            const eventosDia = eventosPorDia[fechaISO] || { sesiones: [], feedbacks: [], asignaciones: [], eventos: [] };
            const esHoy = hoyISO === fechaISO;
            const totalEventos = eventosDia.sesiones.length + eventosDia.feedbacks.length +
              eventosDia.asignaciones.length + eventosDia.eventos.length;

            return (
              <div
                key={idx}
                className={`border rounded-lg p-2 min-h-[200px] ${esHoy ? 'bg-[var(--color-primary)]/5 border-[var(--color-primary)]' : 'bg-background border-[var(--color-border-default)]'
                  }`}
              >
                {/* Cabecera del día */}
                <div className={`text-sm font-medium mb-2 ${esHoy ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-primary)]'}`}>
                  {dia.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' })}
                </div>

                {/* Contenedor de eventos con scroll */}
                <div className="space-y-1 max-h-[520px] overflow-y-auto pr-1">
                  {eventosDia.eventos.map(evento => renderEventoCompacto(evento, 'evento', fechaISO))}
                  {eventosDia.asignaciones.map(asignacion => renderEventoCompacto(asignacion, 'asignacion', fechaISO))}
                  {eventosDia.sesiones.map(sesion => renderEventoCompacto(sesion, 'sesion', fechaISO))}
                  {eventosDia.feedbacks.map(feedback => renderEventoCompacto(feedback, 'feedback', fechaISO))}
                  {totalEventos === 0 && (
                    <div className="text-xs text-[var(--color-text-secondary)]/40 text-center py-4">
                      Sin eventos
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>

      {/* Modal de preview de medios para eventos importantes */}
      {showMediaModal && selectedMediaLinks.length > 0 && (
        <MediaPreviewModal
          urls={selectedMediaLinks}
          initialIndex={selectedMediaIndex || 0}
          open={showMediaModal}
          onClose={() => {
            setShowMediaModal(false);
            setSelectedMediaLinks([]);
            setSelectedMediaIndex(0);
          }}
        />
      )}
    </Card>
  );
}
