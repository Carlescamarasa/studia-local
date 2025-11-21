import React, { useState, useMemo } from "react";
import { localDataClient } from "@/api/localDataClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ds";
import { Button } from "@/components/ds/Button";
import PageHeader from "@/components/ds/PageHeader";
import { Calendar, Grid3x3, List, Plus } from "lucide-react";
import { useEffectiveUser, resolveUserIdActual } from "../components/utils/helpers";
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

function CalendarioPageContent() {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [vista, setVista] = useState(() => isMobile ? 'lista' : 'semana'); // 'semana' | 'mes' | 'lista'
  
  // Asegurar que la vista por defecto sea 'lista' en mobile cuando cambie isMobile
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
  });

  const { data: registrosSesion = [] } = useQuery({
    queryKey: ['registrosSesion'],
    queryFn: () => localDataClient.entities.RegistroSesion.list('-inicioISO'),
  });

  const { data: feedbacksSemanal = [] } = useQuery({
    queryKey: ['feedbacksSemanal'],
    queryFn: () => localDataClient.entities.FeedbackSemanal.list('-created_at'),
  });

  const { data: asignaciones = [] } = useQuery({
    queryKey: ['asignaciones'],
    queryFn: () => localDataClient.entities.Asignacion.list(),
  });

  const { data: eventos = [] } = useQuery({
    queryKey: ['eventosCalendario'],
    queryFn: () => localDataClient.entities.EventoCalendario.list('-fechaInicio'),
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

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        icon={Calendar}
        title="Calendario"
        subtitle="Visualiza sesiones, feedbacks, asignaciones y eventos importantes"
        actions={
          <div className="flex gap-2">
            {!isMobile && (
            <Button
              variant={vista === 'semana' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setVista('semana')}
                className="rounded-xl focus-brand"
            >
              <Grid3x3 className="w-4 h-4 mr-2" />
              Semana
            </Button>
            )}
            <Button
              variant={vista === 'mes' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setVista('mes')}
              className="rounded-xl focus-brand"
            >
              <Calendar className="w-4 h-4 mr-2" />
              Mes
            </Button>
            <Button
              variant={vista === 'lista' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setVista('lista')}
              className="rounded-xl focus-brand"
            >
              <List className="w-4 h-4 mr-2" />
              Lista
            </Button>
            {(isAdmin || isProf) && (
              <Button
                variant="primary"
                size="sm"
                onClick={handleCrearEvento}
              >
                <Plus className="w-4 h-4 mr-2" />
                Evento
              </Button>
            )}
          </div>
        }
      />

      <div className={componentStyles.layout.page}>
        {/* Filtro global por tipo */}
        <div className="mb-4 flex gap-2 flex-wrap">
          <Button
            variant={filtroTipoGlobal === 'all' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setFiltroTipoGlobal('all')}
            className="rounded-xl focus-brand"
          >
            Todos
          </Button>
          <Button
            variant={filtroTipoGlobal === 'evento' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setFiltroTipoGlobal('evento')}
            className="rounded-xl focus-brand"
          >
            Eventos
          </Button>
          <Button
            variant={filtroTipoGlobal === 'asignacion' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setFiltroTipoGlobal('asignacion')}
            className="rounded-xl focus-brand"
          >
            Asignaciones
          </Button>
          <Button
            variant={filtroTipoGlobal === 'sesion' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setFiltroTipoGlobal('sesion')}
            className="rounded-xl focus-brand"
          >
            Sesiones
          </Button>
          <Button
            variant={filtroTipoGlobal === 'feedback' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setFiltroTipoGlobal('feedback')}
            className="rounded-xl focus-brand"
          >
            Feedbacks
          </Button>
        </div>

        {vista === 'semana' && (
          isMobile ? (
            // En mobile, mostrar VistaLista directamente
            <VistaLista
              fechaActual={fechaActual}
              onFechaChange={setFechaActual}
              eventos={eventosFiltrados}
              onEventoClick={handleEventoClick}
              usuarios={usuarios}
              filtroTipoGlobal={filtroTipoGlobal}
              setFiltroTipoGlobal={setFiltroTipoGlobal}
            />
          ) : (
          <VistaSemana
            fechaActual={fechaActual}
            onFechaChange={setFechaActual}
            eventos={eventosFiltrados}
            onEventoClick={handleEventoClick}
            usuarios={usuarios}
            filtroTipo={filtroTipoGlobal}
          />
          )
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

