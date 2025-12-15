import React, { useState, useMemo } from "react";
import { localDataClient } from "@/api/localDataClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ds";
import { Button } from "@/components/ds/Button";
import PageHeader from "@/components/ds/PageHeader";
import { Calendar, Grid3x3, List, Plus, CalendarDays } from "lucide-react";
import { useEffectiveUser, resolveUserIdActual, isoWeekNumberLocal, parseLocalDate } from "../components/utils/helpers";
import PeriodHeader from "../components/common/PeriodHeader";
import RequireRole from "@/components/auth/RequireRole";
import VistaSemana from "../components/calendario/VistaSemana";
import VistaMes from "../components/calendario/VistaMes";
import VistaLista from "../components/calendario/VistaLista";
import ModalSesion from "../components/calendario/ModalSesion";
import ModalFeedback from "../components/calendario/ModalFeedback";
import ModalAsignacion from "../components/calendario/ModalAsignacion";
import ModalCrearEvento from "../components/calendario/ModalCrearEvento";
import { componentStyles } from "@/design/componentStyles";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";
import { startOfMonday, formatLocalDate } from "../components/calendario/utils";

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
  const [eventoSeleccionado, setEventoSeleccionado] = useState(null);
  const [tipoEventoSeleccionado, setTipoEventoSeleccionado] = useState(null); // 'sesion' | 'feedback' | 'asignacion' | 'evento'
  const [filtroTipoGlobal, setFiltroTipoGlobal] = useState('all'); // Filtro global para todas las vistas
  const [feedbackEditando, setFeedbackEditando] = useState(null);

  const effectiveUser = useEffectiveUser();

  // Cargar datos
  const { data: usuarios = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => localDataClient.entities.User.list(),
    staleTime: 5 * 60 * 1000,
  });

  const { data: registrosSesion = [] } = useQuery({
    queryKey: ['registrosSesion'],
    queryFn: () => localDataClient.entities.RegistroSesion.list('-inicioISO'),
    staleTime: 5 * 60 * 1000,
  });

  const { data: feedbacksSemanal = [] } = useQuery({
    queryKey: ['feedbacksSemanal'],
    queryFn: () => localDataClient.entities.FeedbackSemanal.list('-created_at'),
    staleTime: 5 * 60 * 1000,
  });

  const { data: asignaciones = [] } = useQuery({
    queryKey: ['asignaciones'],
    queryFn: () => localDataClient.entities.Asignacion.list(),
    staleTime: 5 * 60 * 1000,
  });

  const { data: eventos = [] } = useQuery({
    queryKey: ['eventosCalendario'],
    queryFn: () => localDataClient.entities.EventoCalendario.list('-fechaInicio'),
    staleTime: 5 * 60 * 1000,
  });

  const userIdActual = useMemo(() => {
    return resolveUserIdActual(effectiveUser, usuarios);
  }, [effectiveUser, usuarios]);

  // Determinar rol y permisos
  const userRole = useMemo(() => {
    return effectiveUser?.rolPersonalizado || 'ESTU';
  }, [effectiveUser]);

  const isAdmin = userRole === 'ADMIN';
  const isProf = userRole === 'PROF';
  const isEstu = userRole === 'ESTU';

  // Filtrar eventos según permisos
  const eventosFiltrados = useMemo(() => {
    let sesiones = registrosSesion;
    let feedbacks = feedbacksSemanal;
    let asignacionesFiltradas = asignaciones;
    let eventosImportantes = eventos;

    if (isEstu) {
      // Estudiante: solo sus propios registros
      sesiones = sesiones.filter(r => r.alumnoId === userIdActual);
      feedbacks = feedbacks.filter(f => f.alumnoId === userIdActual);
      asignacionesFiltradas = asignacionesFiltradas.filter(a => a.alumnoId === userIdActual);
    } else if (isProf) {
      // Profesor: por defecto solo sus estudiantes
      // Obtener IDs de estudiantes que tienen asignaciones con este profesor
      const estudiantesIds = new Set(
        asignaciones
          .filter(a => a.profesorId === userIdActual)
          .map(a => a.alumnoId)
      );

      sesiones = sesiones.filter(r => estudiantesIds.has(r.alumnoId));
      feedbacks = feedbacks.filter(f =>
        f.profesorId === userIdActual || estudiantesIds.has(f.alumnoId)
      );
      asignacionesFiltradas = asignacionesFiltradas.filter(a =>
        a.profesorId === userIdActual
      );
    }
    // Admin: ve todo (sin filtrar)

    // Filtrar eventos importantes por visibilidad
    eventosImportantes = eventosImportantes.filter(e =>
      e.visiblePara && e.visiblePara.includes(userRole)
    );

    return {
      sesiones,
      feedbacks,
      asignaciones: asignacionesFiltradas,
      eventosImportantes,
    };
  }, [registrosSesion, feedbacksSemanal, asignaciones, eventos, userRole, userIdActual, isEstu, isProf]);

  const handleEventoClick = (evento, tipo) => {
    setEventoSeleccionado(evento);
    setTipoEventoSeleccionado(tipo);
  };

  const handleCrearEvento = () => {
    setTipoEventoSeleccionado('evento');
    setEventoSeleccionado(null);
  };

  const handleCerrarModal = (open) => {
    if (!open) {
      setEventoSeleccionado(null);
      setTipoEventoSeleccionado(null);
      setFeedbackEditando(null);
    }
  };

  // Mutaciones para eliminar
  const deleteSesionMutation = useMutation({
    mutationFn: async (id) => {
      return await localDataClient.entities.RegistroSesion.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['registrosSesion'] });
      toast.success('✅ Sesión eliminada');
      handleCerrarModal(false);
    },
    onError: () => {
      toast.error('❌ Error al eliminar sesión');
    },
  });

  const deleteFeedbackMutation = useMutation({
    mutationFn: async (id) => {
      return await localDataClient.entities.FeedbackSemanal.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feedbacksSemanal'] });
      toast.success('✅ Feedback eliminado');
      handleCerrarModal(false);
    },
    onError: () => {
      toast.error('❌ Error al eliminar feedback');
    },
  });

  const deleteAsignacionMutation = useMutation({
    mutationFn: async (id) => {
      return await localDataClient.entities.Asignacion.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['asignaciones'] });
      toast.success('✅ Asignación eliminada');
      handleCerrarModal(false);
    },
    onError: () => {
      toast.error('❌ Error al eliminar asignación');
    },
  });

  const handleEditFeedback = (feedback) => {
    setFeedbackEditando(feedback);
    // Aquí se podría abrir un drawer de edición similar a agenda.jsx
    // Por ahora, navegamos a la página de estadísticas donde se puede editar
    navigate(`/estadisticas`);
  };

  const handleDeleteSesion = (id) => {
    deleteSesionMutation.mutate(id);
  };

  const handleDeleteFeedback = (id) => {
    deleteFeedbackMutation.mutate(id);
  };

  const handleDeleteAsignacion = (id) => {
    deleteAsignacionMutation.mutate(id);
  };

  // Funciones de navegación según la vista
  const navegarPeriodo = (direccion) => {
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
      const formatoFecha = (fecha) => {
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
          <div className="flex gap-2 items-center">
            {/* Selector de vista: Mes / Semana / Lista */}
            <div className="flex items-center gap-1 border border-[var(--color-border-default)] rounded-xl p-0.5">
              <Button
                variant={vista === 'mes' ? 'primary' : 'ghost'}
                size="sm"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setVista('mes');
                }}
                className={`text-xs h-8 sm:h-9 px-2 sm:px-3 rounded-lg transition-all ${vista === 'mes'
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
                  className={`text-xs h-8 sm:h-9 px-2 sm:px-3 rounded-lg transition-all ${vista === 'semana'
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
                className={`text-xs h-8 sm:h-9 px-2 sm:px-3 rounded-lg transition-all ${vista === 'lista'
                  ? componentStyles.buttons.primary
                  : `${componentStyles.buttons.ghost} hover:bg-transparent`
                  }`}
                type="button"
              >
                Lista
              </Button>
            </div>

            <PeriodHeader
              label={labelPeriodo}
              rangeText={rangeTextPeriodo}
              onPrev={() => navegarPeriodo(-1)}
              onNext={() => navegarPeriodo(1)}
              onToday={irHoy}
            />

            {(isAdmin || isProf) && (
              <Button
                variant="primary"
                size="sm"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleCrearEvento();
                }}
                className="text-xs h-8 sm:h-9 rounded-xl focus-brand"
                type="button"
              >
                <Plus className="w-3.5 h-3.5 mr-1.5" />
                <span className="hidden sm:inline">Evento</span>
              </Button>
            )}
          </div>
        }
      />


      <div className={componentStyles.layout.page}>
        {/* Filtros compactos: Tipo en una sola fila */}
        <div className="mb-3 flex gap-1.5 flex-wrap items-center">
          {/* Tipo: Todos / Eventos / Asignaciones / Sesiones / Feedback */}
          <div className="flex items-center gap-1 flex-wrap">
            <Button
              variant={filtroTipoGlobal === 'all' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setFiltroTipoGlobal('all')}
              className="text-xs h-8 sm:h-9 rounded-xl focus-brand transition-all"
            >
              Todos
            </Button>
            <Button
              variant={filtroTipoGlobal === 'evento' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setFiltroTipoGlobal('evento')}
              className="text-xs h-8 sm:h-9 rounded-xl focus-brand transition-all"
            >
              Eventos
            </Button>
            <Button
              variant={filtroTipoGlobal === 'asignacion' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setFiltroTipoGlobal('asignacion')}
              className="text-xs h-8 sm:h-9 rounded-xl focus-brand transition-all"
            >
              Asignaciones
            </Button>
            <Button
              variant={filtroTipoGlobal === 'sesion' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setFiltroTipoGlobal('sesion')}
              className="text-xs h-8 sm:h-9 rounded-xl focus-brand transition-all"
            >
              Sesiones
            </Button>
            <Button
              variant={filtroTipoGlobal === 'feedback' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setFiltroTipoGlobal('feedback')}
              className="text-xs h-8 sm:h-9 rounded-xl focus-brand transition-all"
            >
              Feedbacks
            </Button>
          </div>
        </div>

        {vista === 'semana' && !isMobile && (
          <VistaSemana
            fechaActual={fechaActual}
            onFechaChange={setFechaActual}
            eventos={eventosFiltrados}
            onEventoClick={handleEventoClick}
            usuarios={usuarios}
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
            usuarios={usuarios}
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
          usuarios={usuarios}
          userIdActual={userIdActual}
          userRole={userRole}
          onDelete={handleDeleteSesion}
        />
      )}
      {tipoEventoSeleccionado === 'feedback' && eventoSeleccionado && (
        <ModalFeedback
          open={!!eventoSeleccionado}
          onOpenChange={handleCerrarModal}
          feedback={eventoSeleccionado}
          usuarios={usuarios}
          userIdActual={userIdActual}
          userRole={userRole}
          onEdit={handleEditFeedback}
          onDelete={handleDeleteFeedback}
        />
      )}
      {tipoEventoSeleccionado === 'asignacion' && eventoSeleccionado && (
        <ModalAsignacion
          open={!!eventoSeleccionado}
          onOpenChange={handleCerrarModal}
          asignacion={eventoSeleccionado}
          usuarios={usuarios}
          userIdActual={userIdActual}
          userRole={userRole}
          onDelete={handleDeleteAsignacion}
        />
      )}
      {tipoEventoSeleccionado === 'evento' && (
        <ModalCrearEvento
          open={true}
          onOpenChange={handleCerrarModal}
          evento={eventoSeleccionado}
          userIdActual={userIdActual}
        />
      )}
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

