import React, { useState, useMemo } from "react";
import { localDataClient } from "@/api/localDataClient";
import { useQuery } from "@tanstack/react-query";
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
import ModalCrearEvento from "../components/calendario/ModalCrearEvento";
import { componentStyles } from "@/design/componentStyles";
import { useNavigate } from "react-router-dom";

function CalendarioPageContent() {
  const navigate = useNavigate();
  const [vista, setVista] = useState('semana'); // 'semana' | 'mes' | 'lista'
  const [fechaActual, setFechaActual] = useState(new Date());
  const [eventoSeleccionado, setEventoSeleccionado] = useState(null);
  const [tipoEventoSeleccionado, setTipoEventoSeleccionado] = useState(null); // 'sesion' | 'feedback' | 'asignacion' | 'evento'

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
    if (tipo === 'asignacion') {
      // Navegar a detalle de asignación
      navigate(`/asignacion-detalle?id=${evento.id}`);
    } else {
      setEventoSeleccionado(evento);
      setTipoEventoSeleccionado(tipo);
    }
  };

  const handleCrearEvento = () => {
    setTipoEventoSeleccionado('evento');
    setEventoSeleccionado(null);
  };

  const handleCerrarModal = (open) => {
    if (!open) {
      setEventoSeleccionado(null);
      setTipoEventoSeleccionado(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        icon={Calendar}
        title="Calendario"
        subtitle="Visualiza sesiones, feedbacks, asignaciones y eventos importantes"
        actions={
          <div className="flex gap-2">
            <Button
              variant={vista === 'semana' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setVista('semana')}
            >
              <Grid3x3 className="w-4 h-4 mr-2" />
              Semana
            </Button>
            <Button
              variant={vista === 'mes' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setVista('mes')}
            >
              <Calendar className="w-4 h-4 mr-2" />
              Mes
            </Button>
            <Button
              variant={vista === 'lista' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setVista('lista')}
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
        {vista === 'semana' && (
          <VistaSemana
            fechaActual={fechaActual}
            onFechaChange={setFechaActual}
            eventos={eventosFiltrados}
            onEventoClick={handleEventoClick}
            usuarios={usuarios}
          />
        )}
        {vista === 'mes' && (
          <VistaMes
            fechaActual={fechaActual}
            onFechaChange={setFechaActual}
            eventos={eventosFiltrados}
            onEventoClick={handleEventoClick}
            usuarios={usuarios}
          />
        )}
        {vista === 'lista' && (
          <VistaLista
            fechaActual={fechaActual}
            onFechaChange={setFechaActual}
            eventos={eventosFiltrados}
            onEventoClick={handleEventoClick}
            usuarios={usuarios}
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
        />
      )}
      {tipoEventoSeleccionado === 'feedback' && eventoSeleccionado && (
        <ModalFeedback
          open={!!eventoSeleccionado}
          onOpenChange={handleCerrarModal}
          feedback={eventoSeleccionado}
          usuarios={usuarios}
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

