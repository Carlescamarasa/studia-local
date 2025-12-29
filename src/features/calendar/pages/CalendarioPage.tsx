import React, { useState, useMemo } from "react";
import { localDataClient } from "@/api/localDataClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCalendarSummary } from "@/features/calendar/hooks/useCalendarSummary";
import { useUsers } from "@/features/admin/hooks/useUsers";
import { Card, CardContent } from "@/features/shared/components/ds";
import { Button } from "@/features/shared/components/ds/Button";
import { PageHeader } from "@/features/shared/components/ds/PageHeader";
import { Calendar, Grid3x3, List, Plus, CalendarDays } from "lucide-react";
import { resolveUserIdActual, isoWeekNumberLocal, parseLocalDate } from "@/features/shared/utils/helpers";
import { useEffectiveUser } from "@/providers/EffectiveUserProvider";
import PeriodHeader from "@/features/shared/components/common/PeriodHeader";
import RequireRole from "@/features/auth/components/RequireRole";
import VistaSemana from "@/features/calendar/components/VistaSemana";
import VistaMes from "@/features/calendar/components/VistaMes";
import VistaLista from "@/features/calendar/components/VistaLista";
import ModalSesion from "@/features/calendar/components/ModalSesion";
import ModalFeedbackDetalle from "@/features/shared/components/feedback/ModalFeedbackDetalle";
import ModalAsignacion from "@/features/calendar/components/ModalAsignacion";
import ModalCrearEvento from "@/features/calendar/components/ModalCrearEvento";
import ModalEventoResumen from "@/features/calendar/components/ModalEventoResumen";
import ModalFeedbackSemanal from "@/features/shared/components/feedback/ModalFeedbackSemanal";
import { componentStyles } from "@/design/componentStyles";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";
import { startOfMonday, formatLocalDate, Sesion, Feedback, Asignacion, EventoImportante as EventoImp, Usuario } from "@/features/calendar/components/utils";
import { startOfMonth, endOfMonth } from "date-fns";

type TipoEvento = 'sesion' | 'feedback' | 'asignacion' | 'evento';

function CalendarioPageContent() {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [vista, setVista] = useState('mes'); // 'semana' | 'mes' | 'lista' - Vista por defecto: Mes

  // Asegurar que en mobile se oculte 'semana' y use solo 'mes' o 'lista'
  React.useEffect(() => {
    if (isMobile && vista === 'semana') {
      setVista('lista');
    }
  }, [isMobile, vista]);
  const [fechaActual, setFechaActual] = useState(new Date());
  const [eventoSeleccionado, setEventoSeleccionado] = useState<any>(null);
  const [tipoEventoSeleccionado, setTipoEventoSeleccionado] = useState<TipoEvento | null>(null);
  const [filtroTipoGlobal, setFiltroTipoGlobal] = useState('all');
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);
  const [feedbackEditando, setFeedbackEditando] = useState<Feedback | null>(null);

  // User and role detection - use effectiveRole from new provider for impersonation
  const { effectiveUserId, effectiveEmail, effectiveRole, isImpersonating } = useEffectiveUser();
  // Objeto para compatibilidad con código existente
  const effectiveUser = { id: effectiveUserId, email: effectiveEmail, rolPersonalizado: effectiveRole };

  // Cargar usuarios con hook centralizado
  const { data: usuarios = [] } = useUsers();

  // Calcular rango de fechas para el fetch
  // Calcular rango de fechas para el fetch (Siempre estandarizado a Mes completo para maximizar cache)
  const dateRange = useMemo(() => {
    let rangeStart, rangeEnd;

    if (vista === 'mes') {
      rangeStart = new Date(fechaActual);
      rangeEnd = new Date(fechaActual);
    } else {
      // Para semana y lista, determinar si cruza meses
      rangeStart = startOfMonday(fechaActual);
      rangeEnd = new Date(rangeStart);
      rangeEnd.setDate(rangeEnd.getDate() + 6);
    }

    // Expandir a mes completo (startOfMonth del inicio, endOfMonth del fin)
    // Esto asegura que si estamos en semana del 1-7 Enero, pedimos Enero completo (mismo key que Vista Mes)
    // Si estamos en 30 Ene - 5 Feb, pedimos Ene y Feb (key más amplia, pero necesaria)
    const start = startOfMonth(rangeStart);
    const end = endOfMonth(rangeEnd);
    end.setHours(23, 59, 59, 999);

    return { start, end };
  }, [vista, fechaActual]);



  const userIdActual = useMemo(() => {
    return resolveUserIdActual(effectiveUser, usuarios);
  }, [effectiveUser, usuarios]);

  // Determinar rol usando effectiveRole
  const userRole = effectiveRole || 'ESTU';
  const isEstu = effectiveRole === 'ESTU';

  // Unified Calendar Fetch (RPC)
  const { data: calendarSummary } = useCalendarSummary(dateRange, userIdActual, isEstu);

  const {
    registrosSesion = [],
    feedbacksSemanal = [],
    asignaciones = [],
    eventosCalendario: eventos = []
  } = calendarSummary || {};

  // Determinar rol y permisos
  const isAdmin = userRole === 'ADMIN';
  const isProf = userRole === 'PROF';
  // isEstu defined above

  // Filtrar eventos según permisos
  const eventosFiltrados = useMemo(() => {
    let sesiones = registrosSesion;
    let feedbacks = feedbacksSemanal;
    let asignacionesFiltradas = asignaciones;
    let eventosImportantes = eventos;

    if (isEstu) {
      // Estudiante: solo sus propios registros
      sesiones = sesiones.filter((r: Sesion) => r.alumnoId === userIdActual);
      feedbacks = feedbacks.filter((f: Feedback) => f.alumnoId === userIdActual);
      asignacionesFiltradas = asignacionesFiltradas.filter((a: Asignacion) => a.alumnoId === userIdActual);
    } else if (isProf) {
      // Profesor: por defecto solo sus estudiantes
      const estudiantesIds = new Set(
        asignaciones
          .filter((a: Asignacion) => a.profesorId === userIdActual)
          .map((a: Asignacion) => a.alumnoId)
      );

      sesiones = sesiones.filter((r: Sesion) => estudiantesIds.has(r.alumnoId));
      feedbacks = feedbacks.filter((f: Feedback) =>
        f.profesorId === userIdActual || (f.alumnoId && estudiantesIds.has(f.alumnoId))
      );
      asignacionesFiltradas = asignacionesFiltradas.filter((a: Asignacion) =>
        a.profesorId === userIdActual
      );
    }
    // Admin: ve todo (sin filtrar)

    // Filtrar eventos importantes por visibilidad
    eventosImportantes = eventosImportantes.filter((e: EventoImp) =>
      e.visiblePara && e.visiblePara.includes(userRole as any)
    );

    return {
      sesiones,
      feedbacks,
      asignaciones: asignacionesFiltradas,
      eventosImportantes,
    };
  }, [registrosSesion, feedbacksSemanal, asignaciones, eventos, userRole, userIdActual, isEstu, isProf]);

  const handleEventoClick = (evento: any, tipo: TipoEvento) => {
    setEventoSeleccionado(evento);
    setTipoEventoSeleccionado(tipo);
  };

  const handleCrearEvento = () => {
    setTipoEventoSeleccionado('evento');
    setEventoSeleccionado(null);
  };

  const handleCerrarModal = (open: boolean) => {
    if (!open) {
      setEventoSeleccionado(null);
      setTipoEventoSeleccionado(null);
      setFeedbackEditando(null);
    }
  };

  // Mutaciones para eliminar
  const deleteSesionMutation = useMutation({
    mutationFn: async (id: string) => {
      return await localDataClient.entities.RegistroSesion.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendarSummary'] });
      queryClient.invalidateQueries({ queryKey: ['progressSummary'] });
      toast.success('✅ Sesión eliminada');
      handleCerrarModal(false);
    },
    onError: () => {
      toast.error('❌ Error al eliminar sesión');
    },
  });

  const deleteFeedbackMutation = useMutation({
    mutationFn: async (id: string) => {
      return await localDataClient.entities.FeedbackSemanal.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendarSummary'] });
      queryClient.invalidateQueries({ queryKey: ['progressSummary'] });
      toast.success('✅ Feedback eliminado');
      handleCerrarModal(false);
    },
    onError: () => {
      toast.error('❌ Error al eliminar feedback');
    },
  });

  const deleteAsignacionMutation = useMutation({
    mutationFn: async (id: string) => {
      return await localDataClient.entities.Asignacion.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendarSummary'] });
      queryClient.invalidateQueries({ queryKey: ['progressSummary'] });
      toast.success('✅ Asignación eliminada');
      handleCerrarModal(false);
    },
    onError: () => {
      toast.error('❌ Error al eliminar asignación');
    },
  });

  const handleEditFeedback = (feedback: any) => {
    // Abrir el modal de edición de feedback semanal
    setFeedbackEditando(feedback as Feedback);
    setEventoSeleccionado(null);
    setTipoEventoSeleccionado(null);
    setFeedbackModalOpen(true);
  };

  const handleCloseFeedbackEdit = (open: boolean) => {
    if (!open) {
      setFeedbackEditando(null);
      setFeedbackModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['calendarSummary'] });
    }
  };

  const handleDeleteSesion = (id: string) => {
    deleteSesionMutation.mutate(id);
  };

  const handleDeleteFeedback = (id: string) => {
    deleteFeedbackMutation.mutate(id);
  };

  const handleDeleteAsignacion = (id: string) => {
    deleteAsignacionMutation.mutate(id);
  };

  // Funciones de navegación según la vista
  const navegarPeriodo = (direccion: number) => {
    const nuevaFecha = new Date(fechaActual);
    if (vista === 'mes') {
      // Navegar por meses
      nuevaFecha.setMonth(fechaActual.getMonth() + direccion);
      setFechaActual(nuevaFecha);
    } else {
      // Navegar por semanas (para vista semana y lista)
      const lunes = startOfMonday(fechaActual);
      lunes.setDate(lunes.getDate() + (direccion * 7));
      setFechaActual(lunes);
    }
  };

  const irHoy = () => {
    const hoy = new Date();
    if (vista === 'mes') {
      setFechaActual(hoy);
    } else {
      // Para semana y lista, ir al lunes de la semana actual
      const lunesSemanaActual = startOfMonday(hoy);
      setFechaActual(lunesSemanaActual);
    }
  };


  // Calcular label y rangeText para PeriodHeader según la vista
  const { labelPeriodo, rangeTextPeriodo } = useMemo(() => {
    if (vista === 'mes') {
      const mesNombre = fechaActual.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
      const primerDia = new Date(fechaActual.getFullYear(), fechaActual.getMonth(), 1);
      const ultimoDia = new Date(fechaActual.getFullYear(), fechaActual.getMonth() + 1, 0);
      const rango = `${primerDia.getDate()} – ${ultimoDia.getDate()}`;
      return {
        labelPeriodo: mesNombre.split(' ')[0], // "noviembre" -> "Noviembre"
        rangeTextPeriodo: rango + ' ' + fechaActual.getFullYear()
      };
    } else {
      // Para semana y lista
      const lunes = startOfMonday(fechaActual);
      const domingo = new Date(lunes);
      domingo.setDate(lunes.getDate() + 6);
      const numeroSemana = isoWeekNumberLocal(lunes);
      const formatoFecha = (fecha: Date) => {
        const dia = fecha.getDate();
        const mes = fecha.toLocaleDateString('es-ES', { month: 'short' });
        return `${dia} ${mes}`;
      };
      return {
        labelPeriodo: `Semana ${numeroSemana}`,
        rangeTextPeriodo: `${formatoFecha(lunes)} – ${formatoFecha(domingo)} ${lunes.getFullYear()}`
      };
    }
  }, [vista, fechaActual]);

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        icon={Calendar}
        title="Calendario"
        subtitle="Visualiza sesiones, feedbacks, asignaciones y eventos importantes"
        actions={
          <PeriodHeader
            label={labelPeriodo}
            rangeText={rangeTextPeriodo}
            onPrev={() => navegarPeriodo(-1)}
            onNext={() => navegarPeriodo(1)}
            onToday={irHoy}
            className=""
          />
        }
      />

      <div className="studia-section">
        {/* Toolbar: Filters (left) + View selector (center) + Create button (right) */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
          {/* Left: Type filters */}
          <div className="flex items-center gap-1 flex-wrap">
            <Button
              variant={filtroTipoGlobal === 'all' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setFiltroTipoGlobal('all')}
              className="text-xs h-8 sm:h-9 focus-brand transition-all"
            >
              Todos
            </Button>
            <Button
              variant={filtroTipoGlobal === 'evento' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setFiltroTipoGlobal('evento')}
              className="text-xs h-8 sm:h-9 focus-brand transition-all"
            >
              Eventos
            </Button>
            <Button
              variant={filtroTipoGlobal === 'asignacion' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setFiltroTipoGlobal('asignacion')}
              className="text-xs h-8 sm:h-9 focus-brand transition-all"
            >
              Asignaciones
            </Button>
            <Button
              variant={filtroTipoGlobal === 'sesion' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setFiltroTipoGlobal('sesion')}
              className="text-xs h-8 sm:h-9 focus-brand transition-all"
            >
              Sesiones
            </Button>
            <Button
              variant={filtroTipoGlobal === 'feedback' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setFiltroTipoGlobal('feedback')}
              className="text-xs h-8 sm:h-9 focus-brand transition-all"
            >
              Feedbacks
            </Button>
          </div>

          {/* Center: View selector */}
          <div className="flex items-center gap-1 border border-[var(--color-border-default)] p-0.5" style={{ borderRadius: 'var(--button-radius, 0.75rem)' }}>
            <Button
              variant={vista === 'mes' ? 'primary' : 'ghost'}
              size="sm"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setVista('mes');
              }}
              className={`text-xs h-8 sm:h-9 px-2 sm:px-3 transition-all ${vista === 'mes'
                ? componentStyles.buttons.primary
                : `${componentStyles.buttons.ghost} hover:bg-transparent`
                }`}
              type="button"
            >
              Mes
            </Button>
            {!isMobile && (
              <Button
                variant={vista === 'semana' ? 'primary' : 'ghost'}
                size="sm"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setVista('semana');
                }}
                className={`text-xs h-8 sm:h-9 px-2 sm:px-3 transition-all ${vista === 'semana'
                  ? componentStyles.buttons.primary
                  : `${componentStyles.buttons.ghost} hover:bg-transparent`
                  }`}
                type="button"
              >
                Semana
              </Button>
            )}
            <Button
              variant={vista === 'lista' ? 'primary' : 'ghost'}
              size="sm"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setVista('lista');
              }}
              className={`text-xs h-8 sm:h-9 px-2 sm:px-3 transition-all ${vista === 'lista'
                ? componentStyles.buttons.primary
                : `${componentStyles.buttons.ghost} hover:bg-transparent`
                }`}
              type="button"
            >
              Lista
            </Button>
          </div>

          {/* Right: Create event button */}
          {(isAdmin || isProf) && (
            <Button
              variant="primary"
              size="sm"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleCrearEvento();
              }}
              className={`${componentStyles.buttons.primary} text-xs`}
              type="button"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              <span className="hidden sm:inline">Crear evento</span>
              <span className="sm:hidden">Evento</span>
            </Button>
          )}
        </div>

        {vista === 'semana' && !isMobile && (
          <VistaSemana
            fechaActual={fechaActual}
            onFechaChange={setFechaActual}
            eventos={eventosFiltrados}
            onEventoClick={handleEventoClick}
            usuarios={usuarios as any[]}
            filtroTipo={filtroTipoGlobal}
            registrosSesion={registrosSesion}
          />
        )}
        {vista === 'mes' && (
          <VistaMes
            fechaActual={fechaActual}
            onFechaChange={setFechaActual}
            eventos={eventosFiltrados}
            onEventoClick={handleEventoClick}
            usuarios={usuarios as any[]}
            filtroTipo={filtroTipoGlobal}
          />
        )}
        {vista === 'lista' && (
          <VistaLista
            fechaActual={fechaActual}
            onFechaChange={setFechaActual}
            eventos={eventosFiltrados}
            onEventoClick={handleEventoClick}
            usuarios={usuarios}
            filtroTipoGlobal={filtroTipoGlobal}
            setFiltroTipoGlobal={setFiltroTipoGlobal}
            registrosSesion={registrosSesion}
          />
        )}
      </div>

      {/* Modales */}
      {tipoEventoSeleccionado === 'sesion' && eventoSeleccionado && (
        <ModalSesion
          open={!!eventoSeleccionado}
          onOpenChange={handleCerrarModal}
          registroSesion={eventoSeleccionado}
          usuarios={usuarios as any[]}
          userIdActual={userIdActual || ""}
          userRole={userRole as any}
          onDelete={handleDeleteSesion}
        />
      )}
      {tipoEventoSeleccionado === 'feedback' && eventoSeleccionado && (
        <ModalFeedbackDetalle
          open={!!eventoSeleccionado}
          onOpenChange={handleCerrarModal}
          feedback={eventoSeleccionado as any}
          usuarios={usuarios as any[]}
          userIdActual={effectiveUserId || ""}
          userRole={userRole as any}
          onEdit={(f) => handleEditFeedback(f)}
          onDelete={handleDeleteFeedback}
        />
      )}
      {tipoEventoSeleccionado === 'asignacion' && eventoSeleccionado && (
        <ModalAsignacion
          open={!!eventoSeleccionado}
          onOpenChange={handleCerrarModal}
          asignacion={eventoSeleccionado as any}
          usuarios={usuarios as any[]}
          userIdActual={effectiveUserId || ""}
          userRole={userRole as any}
          onDelete={handleDeleteAsignacion}
        />
      )}
      {tipoEventoSeleccionado === 'evento' && (
        isEstu && eventoSeleccionado ? (
          <ModalEventoResumen
            open={true}
            onOpenChange={handleCerrarModal}
            evento={eventoSeleccionado}
          />
        ) : (
          <ModalCrearEvento
            open={true}
            onOpenChange={handleCerrarModal}
            evento={eventoSeleccionado}
            userIdActual={userIdActual || ""}
          />
        )
      )}

      {/* Modal de edición de feedback semanal */}
      <ModalFeedbackSemanal
        open={feedbackModalOpen}
        onOpenChange={handleCloseFeedbackEdit}
        studentId={feedbackEditando?.alumnoId || ''}
        weekStartISO={feedbackEditando?.semanaInicioISO || ''}
        feedback={feedbackEditando as any}
        usuarios={usuarios as any[]}
        userIdActual={effectiveUserId || ""}
        onSaved={() => handleCloseFeedbackEdit(false)}
      />
    </div>
  );
}

export default function CalendarioPage() {
  return (
    <RequireRole anyOf={['ADMIN', 'PROF', 'ESTU']}>
      <CalendarioPageContent />
    </RequireRole>
  );
}

