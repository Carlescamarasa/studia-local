import React, { useState, useMemo } from "react";
import { localDataClient } from "@/api/localDataClient";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ds/Button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ds";
import { Badge } from "@/components/ds";
import { Alert, AlertDescription } from "@/components/ds";
import {
  Music, Calendar, Target, PlayCircle, MessageSquare,
  Layers,
  ChevronLeft, ChevronRight, ChevronDown, Home, Clock, CheckCircle2,
  Star
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { calcularLunesSemanaISO, calcularOffsetSemanas, calcularTiempoSesion, useEffectiveUser } from "../components/utils/helpers";
import { displayName } from "@/components/utils/helpers";
import WeekNavigator from "../components/common/WeekNavigator";
import RequireRole from "@/components/auth/RequireRole";
import PageHeader from "@/components/ds/PageHeader";
import { componentStyles } from "@/design/componentStyles";
import SessionContentView from "../components/study/SessionContentView";
import MediaLinksBadges from "@/components/common/MediaLinksBadges";
import MediaViewer from "@/components/common/MediaViewer";

// --- Helpers de fechas locales ---
const pad2 = (n) => String(n).padStart(2, "0");
const formatLocalDate = (d) => `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;
const parseLocalDate = (s) => { const [y,m,d] = s.split("-").map(Number); return new Date(y, m-1, d); };
const startOfMonday = (date) => {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dow = d.getDay();
  const diff = dow === 0 ? -6 : 1 - dow;
  d.setDate(d.getDate() + diff);
  return d;
};

function SemanaPageContent() {
  const navigate = useNavigate();
  const [semanaActualISO, setSemanaActualISO] = useState(() => {
    return calcularLunesSemanaISO(new Date());
  });
  const [expandedSessions, setExpandedSessions] = useState(new Set());
  const [viewingMedia, setViewingMedia] = useState(null);
  const [tipoFeedback, setTipoFeedback] = useState('todos'); // 'todos', 'profesor', 'sesiones'

  const effectiveUser = useEffectiveUser();

  const { data: asignaciones = [] } = useQuery({
    queryKey: ['asignaciones'],
    queryFn: () => localDataClient.entities.Asignacion.list(),
  });

  const { data: feedbacksSemanal = [] } = useQuery({
    queryKey: ['feedbacksSemanal'],
    queryFn: () => localDataClient.entities.FeedbackSemanal.list('-created_at'),
  });

  const { data: usuarios = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => localDataClient.entities.User.list(),
  });

  const { data: registrosSesion = [] } = useQuery({
    queryKey: ['registrosSesion'],
    queryFn: () => localDataClient.entities.RegistroSesion.list('-inicioISO'),
  });

  // Buscar el usuario real en la base de datos por email si effectiveUser viene de Supabase
  // Esto es necesario porque effectiveUser puede tener el ID de Supabase Auth, no el ID de la BD
  const usuarioActual = usuarios.find(u => {
    if (effectiveUser?.email && u.email) {
      return u.email.toLowerCase().trim() === effectiveUser.email.toLowerCase().trim();
    }
    return u.id === effectiveUser?.id;
  }) || effectiveUser;

  // Usar el ID del usuario de la base de datos, no el de Supabase Auth
  const userIdActual = usuarioActual?.id || effectiveUser?.id;

  const asignacionActiva = asignaciones.find(a => {
    if (a.alumnoId !== userIdActual) return false;
    if (a.estado !== 'publicada' && a.estado !== 'en_curso') return false;
    const offset = calcularOffsetSemanas(a.semanaInicioISO, semanaActualISO);
    return offset >= 0 && offset < (a.plan?.semanas?.length || 0);
  });

  const semanaIdx = asignacionActiva ? 
    calcularOffsetSemanas(asignacionActiva.semanaInicioISO, semanaActualISO) : 0;

  const semanaDelPlan = asignacionActiva?.plan?.semanas?.[semanaIdx];

  // Buscar todos los feedbacks del profesor para este alumno (no solo semana actual)
  const feedbacksProfesor = useMemo(() => {
    return feedbacksSemanal
      .filter(f => f.alumnoId === userIdActual)
      .filter(f => f.semanaInicioISO) // Solo los que tienen fecha
      .sort((a, b) => {
        // Ordenar por fecha descendente (más reciente primero)
        const dateA = parseLocalDate(a.semanaInicioISO);
        const dateB = parseLocalDate(b.semanaInicioISO);
        return dateB - dateA;
      });
  }, [feedbacksSemanal, userIdActual]);

  // Filtrar registros de sesión de este alumno (todas las semanas, no solo la actual)
  const registrosSesionesAlumno = useMemo(() => {
    return registrosSesion
      .filter(r => r.alumnoId === userIdActual)
      .filter(r => r.inicioISO) // Solo los que tienen fecha
      .sort((a, b) => {
        // Ordenar por fecha descendente (más reciente primero)
        return new Date(b.inicioISO) - new Date(a.inicioISO);
      });
  }, [registrosSesion, userIdActual]);

  // Filtrar según el tipo seleccionado
  const feedbacksMostrar = (tipoFeedback === 'todos' || tipoFeedback === 'profesor') 
    ? feedbacksProfesor 
    : [];

  const registrosMostrar = (tipoFeedback === 'todos' || tipoFeedback === 'sesiones') 
    ? registrosSesionesAlumno 
    : [];

  const handlePreviewMedia = (index, mediaLinks) => {
    if (!mediaLinks || !Array.isArray(mediaLinks) || mediaLinks.length === 0) return;
    const url = mediaLinks[index];
    if (!url) return;
    
    // Determinar tipo de media
    const urlLower = url.toLowerCase();
    let kind = 'link';
    if (urlLower.includes('youtube.com') || urlLower.includes('youtu.be')) kind = 'video';
    else if (urlLower.match(/\.(jpg|jpeg|png|gif|webp)$/)) kind = 'image';
    else if (urlLower.match(/\.(mp4|webm|ogg)$/)) kind = 'video';
    else if (urlLower.match(/\.(mp3|wav|ogg|m4a)$/)) kind = 'audio';
    else if (urlLower.match(/\.pdf$/)) kind = 'pdf';
    
    setViewingMedia({ url, kind });
  };

  const cambiarSemana = (direccion) => {
    const base = parseLocalDate(semanaActualISO);
    base.setDate(base.getDate() + (direccion * 7));
    const lunes = startOfMonday(base);
    const nextISO = formatLocalDate(lunes);
    if (nextISO !== semanaActualISO) setSemanaActualISO(nextISO);
  };

  const irSemanaActual = () => {
    const lunes = startOfMonday(new Date());
    setSemanaActualISO(formatLocalDate(lunes));
  };

  const focoLabels = {
    GEN: 'General',
    LIG: 'Ligaduras',
    RIT: 'Ritmo',
    ART: 'Articulación',
    'S&A': 'Sonido y Afinación',
  };

  const focoColors = {
    GEN: componentStyles.status.badgeDefault,
    LIG: componentStyles.status.badgeInfo,
    RIT: componentStyles.status.badgeDefault,
    ART: componentStyles.status.badgeSuccess,
    'S&A': componentStyles.status.badgeDefault,
  };

  const toggleSession = (key) => {
    setExpandedSessions(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };


  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        icon={Calendar}
        title="Mi Semana"
        subtitle="Resumen y planificación semanal"
        filters={
          <WeekNavigator 
            mondayISO={semanaActualISO}
            onPrev={() => cambiarSemana(-1)}
            onNext={() => cambiarSemana(1)}
            onToday={irSemanaActual}
          />
        }
      />

      <div className={`${componentStyles.layout.page} space-y-4`}>
        {!asignacionActiva || !semanaDelPlan ? (
          <Card className={componentStyles.containers.cardBase}>
            <CardContent className="text-center py-16">
              <Target className={`w-20 h-20 mx-auto mb-4 ${componentStyles.empty.emptyIcon}`} />
              <h2 className={`text-xl font-semibold ${componentStyles.typography.pageTitle} mb-2`}>
                No tienes asignación esta semana
              </h2>
              <p className={`text-sm ${componentStyles.typography.bodyText} mb-4`}>
                Consulta con tu profesor para obtener un plan de estudio
              </p>
              <Button
                variant="primary"
                onClick={() => navigate(createPageUrl('hoy'))}
                className={`${componentStyles.buttons.primary} h-10 shadow-sm`}
              >
                <PlayCircle className="w-4 h-4 mr-2" />
                Ir a Estudiar Ahora
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className={componentStyles.containers.cardBase}>
            <CardHeader>
              <div className="flex items-start md:items-center justify-between gap-3 flex-col md:flex-row">
                <CardTitle className={componentStyles.typography.cardTitle}>{semanaDelPlan.nombre}</CardTitle>
                <Badge className={focoColors[semanaDelPlan.foco]}>
                  {focoLabels[semanaDelPlan.foco]}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Información de la semana */}
              <div className="space-y-3">
                <div className={"flex items-start gap-2 py-1 " + componentStyles.components.toneRowPlan}>
                  <Music className="w-4 h-4 text-[var(--color-primary)] mt-0.5 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-[var(--color-text-secondary)] font-medium">Pieza</p>
                    <p className="text-sm break-words text-[var(--color-text-primary)] mt-0.5">
                      {asignacionActiva.piezaSnapshot?.nombre || '—'}
                    </p>
                  </div>
                </div>
                
                <div className={"flex items-start gap-2 py-1 " + componentStyles.components.toneRowSemana}>
                  <Target className="w-4 h-4 text-[var(--color-primary)] mt-0.5 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-[var(--color-text-secondary)] font-medium">Semana del Plan</p>
                    <p className="text-sm break-words text-[var(--color-text-primary)] mt-0.5">
                      {semanaDelPlan.nombre}
                    </p>
                    {semanaDelPlan.objetivo && (
                      <p className="text-xs text-[var(--color-text-secondary)] italic mt-1 break-words">
                        "{semanaDelPlan.objetivo}"
                      </p>
                    )}
                  </div>
                </div>

                {/* Feedback del profesor de esta semana */}
                {feedbacksProfesor.find(f => f.semanaInicioISO === semanaActualISO) && (() => {
                  const feedbackSemana = feedbacksProfesor.find(f => f.semanaInicioISO === semanaActualISO);
                  return (feedbackSemana && (feedbackSemana.notaProfesor || (feedbackSemana.mediaLinks && feedbackSemana.mediaLinks.length > 0))) && (
                    <div className={"flex items-start gap-2 py-1 " + componentStyles.components.toneRowFeedback}>
                      <MessageSquare className="w-4 h-4 text-[var(--color-info)] mt-0.5 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <p className="text-xs text-[var(--color-text-secondary)] font-medium">Feedback del profesor</p>
                          {(() => {
                            const prof = usuarios.find(u => u.id === feedbackSemana.profesorId);
                            if (prof) {
                              return (
                                <span className="text-xs text-[var(--color-text-secondary)]">
                                  • {displayName(prof)}
                                </span>
                              );
                            }
                            return null;
                          })()}
                        </div>
                        {feedbackSemana.notaProfesor && (
                          <p className="text-sm text-[var(--color-text-primary)] italic mt-0.5 break-words">
                            "{feedbackSemana.notaProfesor}"
                          </p>
                        )}
                        {feedbackSemana.mediaLinks && feedbackSemana.mediaLinks.length > 0 && (
                          <div className={feedbackSemana.notaProfesor ? "mt-2" : "mt-0.5"}>
                            <MediaLinksBadges
                              mediaLinks={feedbackSemana.mediaLinks}
                              onMediaClick={(idx) => handlePreviewMedia(idx, feedbackSemana.mediaLinks)}
                              compact={true}
                              maxDisplay={3}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Feedbacks del profesor - Historial */}
              {feedbacksProfesor.filter(f => {
                if (!f.semanaInicioISO) return false;
                const feedbackDate = parseLocalDate(f.semanaInicioISO);
                const semanaActualDate = parseLocalDate(semanaActualISO);
                return feedbackDate < semanaActualDate;
              }).length > 0 && (
                <div className="border-t border-[var(--color-border-default)] pt-4">
                  <h3 className={`${componentStyles.typography.sectionTitle} mb-4`}>
                    Feedbacks del profesor - Historial
                  </h3>
                  <div className="space-y-2">
                    {feedbacksProfesor.filter(f => {
                      if (!f.semanaInicioISO) return false;
                      const feedbackDate = parseLocalDate(f.semanaInicioISO);
                      const semanaActualDate = parseLocalDate(semanaActualISO);
                      return feedbackDate < semanaActualDate;
                    }).map((feedback) => {
                      const prof = usuarios.find(u => u.id === feedback.profesorId);
                      const fechaFeedback = parseLocalDate(feedback.semanaInicioISO);
                      const fechaFormateada = fechaFeedback.toLocaleDateString('es-ES', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                      });

                      return (
                        <div key={feedback.id} className="flex items-start gap-2 py-2 px-3 border-b border-[var(--color-border-default)] last:border-0 hover:bg-[var(--color-surface-muted)]/30 transition-colors">
                          <MessageSquare className="w-4 h-4 text-[var(--color-info)] mt-0.5 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <p className="text-xs text-[var(--color-text-secondary)] font-medium">Feedback del profesor</p>
                              {prof && (
                                <span className="text-xs text-[var(--color-text-secondary)]">
                                  • {displayName(prof)}
                                </span>
                              )}
                              <span className="text-xs text-[var(--color-text-secondary)]">
                                • Semana del {fechaFormateada}
                              </span>
                            </div>
                            {feedback.notaProfesor && (
                              <p className="text-sm text-[var(--color-text-primary)] italic break-words">
                                "{feedback.notaProfesor}"
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Separador */}
              <div className="border-t border-[var(--color-border-default)] pt-4">
                <h3 className={`${componentStyles.typography.sectionTitle} mb-4`}>
                  Sesiones ({semanaDelPlan.sesiones?.length || 0})
                </h3>
                
                {/* Lista compacta de sesiones */}
                {semanaDelPlan.sesiones && semanaDelPlan.sesiones.length === 0 ? (
                  <div className="text-center py-12">
                    <Layers className={`w-16 h-16 mx-auto mb-4 ${componentStyles.empty.emptyIcon}`} />
                    <p className={componentStyles.empty.emptyText}>No hay sesiones planificadas</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {semanaDelPlan.sesiones.map((sesion, sesionIdx) => {
                      const sesionKey = `sesion-${sesionIdx}`;
                      const isExpanded = expandedSessions.has(sesionKey);
                      const tiempoTotal = calcularTiempoSesion(sesion);
                      const tiempoMinutos = Math.floor(tiempoTotal / 60);
                      const tiempoSegundos = tiempoTotal % 60;

                      return (
                        <div
                          key={sesionIdx}
                          className="ml-4 border-l-2 border-[var(--color-info)]/40 bg-[var(--color-info)]/10 rounded-r-lg p-2.5 transition-all hover:bg-[var(--color-info)]/20 cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleSession(sesionKey);
                          }}
                        >
                          {/* Sesión Header */}
                          <div className="flex items-start gap-2">
                            <button className="pt-1 flex-shrink-0">
                              {isExpanded ? (
                                <ChevronDown className="w-3.5 h-3.5 text-[var(--color-text-secondary)]" />
                              ) : (
                                <ChevronRight className="w-3.5 h-3.5 text-[var(--color-text-secondary)]" />
                              )}
                            </button>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <PlayCircle className="w-3.5 h-3.5 text-[var(--color-info)] flex-shrink-0" />
                                <span className="text-sm font-medium text-[var(--color-text-primary)]">{sesion.nombre}</span>
                                <Badge 
                                  variant="outline" 
                                  className={tiempoTotal > 0 ? componentStyles.status.badgeSuccess : componentStyles.status.badgeDefault}
                                >
                                  <Clock className="w-3 h-3 mr-1" />
                                  {tiempoMinutos}:{String(tiempoSegundos).padStart(2, '0')} min
                                </Badge>
                                <Badge className={`rounded-full ${focoColors[sesion.foco]}`} variant="outline">
                                  {focoLabels[sesion.foco]}
                                </Badge>
                              </div>
                              {!isExpanded && (
                                <div className="flex items-center gap-1.5 mt-1 text-xs text-[var(--color-text-secondary)]">
                                  <Layers className="w-2.5 h-2.5" />
                                  <span>
                                    {sesion.bloques?.length || 0} ejercicios
                                    {sesion.rondas && sesion.rondas.length > 0 && `, ${sesion.rondas.length} ${sesion.rondas.length === 1 ? 'ronda' : 'rondas'}`}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Contenido expandido */}
                          {isExpanded && (
                            <div className="mt-2" onClick={(e) => e.stopPropagation()}>
                              <SessionContentView sesion={sesion} compact />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Botón principal */}
              <div className="flex justify-center pt-4 border-t border-[var(--color-border-default)]">
                <Button
                  variant="primary"
                  onClick={() => navigate(createPageUrl('hoy'))}
                  size="lg"
                  className={`${componentStyles.buttons.primary} w-full md:w-auto h-12 shadow-sm`}
                >
                  <PlayCircle className="w-5 h-5 mr-2" />
                  Ir a Estudiar Ahora
                </Button>
              </div>

              {/* Feedback y Registros de Semana Actual */}
              <div className="pt-4 border-t border-[var(--color-border-default)]">
                <div className="flex items-center justify-between mb-4">
                  <h3 className={componentStyles.typography.sectionTitle}>
                    Semana Actual
                  </h3>
                  {/* Botones de filtro */}
                  <div className="flex gap-2">
                    <Button
                      variant={tipoFeedback === 'todos' ? 'primary' : 'outline'}
                      size="sm"
                      onClick={() => setTipoFeedback('todos')}
                      className="text-xs"
                    >
                      Todos
                    </Button>
                    <Button
                      variant={tipoFeedback === 'profesor' ? 'primary' : 'outline'}
                      size="sm"
                      onClick={() => setTipoFeedback('profesor')}
                      className="text-xs"
                    >
                      Feedback Profesor
                    </Button>
                    <Button
                      variant={tipoFeedback === 'sesiones' ? 'primary' : 'outline'}
                      size="sm"
                      onClick={() => setTipoFeedback('sesiones')}
                      className="text-xs"
                    >
                      Registro Sesiones
                    </Button>
                  </div>
                </div>

                {/* Feedbacks del profesor */}
                {(tipoFeedback === 'todos' || tipoFeedback === 'profesor') && feedbacksMostrar.length > 0 && (
                  <div className="space-y-2 mb-4">
                    {feedbacksMostrar.map((feedback) => {
                      const prof = usuarios.find(u => u.id === feedback.profesorId);
                      const fechaFeedback = feedback.semanaInicioISO ? parseLocalDate(feedback.semanaInicioISO) : null;
                      const fechaFormateada = fechaFeedback ? fechaFeedback.toLocaleDateString('es-ES', { 
                        day: 'numeric', 
                        month: 'short', 
                        year: 'numeric' 
                      }) : 'Sin fecha';

                      return (
                        <div key={feedback.id} className="flex items-start gap-2 py-2 px-3 border-l-4 border-l-[var(--color-info)] bg-[var(--color-info)]/5 hover:bg-[var(--color-info)]/10 transition-colors">
                          <MessageSquare className="w-4 h-4 text-[var(--color-info)] mt-0.5 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <p className="text-xs text-[var(--color-text-secondary)] font-medium">Feedback del profesor</p>
                              {prof && (
                                <span className="text-xs text-[var(--color-text-secondary)]">
                                  • {displayName(prof)}
                                </span>
                              )}
                              <span className="text-xs text-[var(--color-text-secondary)]">
                                • Semana del {fechaFormateada}
                              </span>
                            </div>
                            {feedback.notaProfesor && (
                              <p className="text-sm text-[var(--color-text-primary)] italic break-words">
                                "{feedback.notaProfesor}"
                              </p>
                            )}
                            {feedback.mediaLinks && feedback.mediaLinks.length > 0 && (
                              <div className="mt-2">
                                <MediaLinksBadges
                                  mediaLinks={feedback.mediaLinks}
                                  onMediaClick={(idx) => handlePreviewMedia(idx, feedback.mediaLinks)}
                                  compact={true}
                                  maxDisplay={3}
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Registros de sesiones */}
                {(tipoFeedback === 'todos' || tipoFeedback === 'sesiones') && (
                  <>
                    {registrosMostrar.length === 0 ? (
                      <div className="text-center py-8">
                        <MessageSquare className={`w-12 h-12 mx-auto mb-3 ${componentStyles.empty.emptyIcon} text-[var(--color-text-secondary)]`} />
                        <p className={componentStyles.empty.emptyText}>
                          No hay registros de sesiones
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {registrosMostrar.map((registro) => {
                      const fecha = new Date(registro.inicioISO);
                      const fechaFormateada = fecha.toLocaleDateString('es-ES', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit'
                      });

                      // Determinar color del badge según calificación
                      const getCalificacionBadge = (cal) => {
                        if (!cal || cal <= 0) return null;
                        const calInt = Math.round(cal);
                        if (calInt === 1) return componentStyles.status.badgeDanger;
                        if (calInt === 2) return componentStyles.status.badgeWarning;
                        if (calInt === 3) return componentStyles.status.badgeInfo;
                        if (calInt === 4) return componentStyles.status.badgeSuccess;
                        return componentStyles.status.badgeDefault;
                      };

                      return (
                        <Card key={registro.id} className={`${componentStyles.containers.panelBase} hover:shadow-md transition-shadow`}>
                          <CardContent className="pt-3 pb-3">
                            <div className="space-y-2">
                              {/* Header: Sesión y fecha */}
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <p className={`${componentStyles.typography.cardTitle} font-semibold truncate`}>
                                    {registro.sesionNombre || 'Sesión sin nombre'}
                                  </p>
                                  <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
                                    {fechaFormateada}
                                    {registro.piezaNombre && ` • ${registro.piezaNombre}`}
                                  </p>
                                </div>
                                {registro.calificacion && registro.calificacion > 0 && (
                                  <Badge className={`${getCalificacionBadge(registro.calificacion)} shrink-0`}>
                                    <Star className="w-3 h-3 mr-1 fill-current" />
                                    {Math.round(registro.calificacion)}/4
                                  </Badge>
                                )}
                              </div>

                              {/* Comentario */}
                              {registro.notas && registro.notas.trim() && (
                                <div className="pt-2 border-t border-[var(--color-border-default)]">
                                  <p className="text-sm text-[var(--color-text-primary)] italic whitespace-pre-wrap break-words">
                                    "{registro.notas.trim()}"
                                  </p>
                                </div>
                              )}

                              {/* Multimedia */}
                              {registro.mediaLinks && Array.isArray(registro.mediaLinks) && registro.mediaLinks.length > 0 && (
                                <div className={`pt-2 ${registro.notas ? '' : 'border-t border-[var(--color-border-default)]'}`}>
                                  <MediaLinksBadges
                                    mediaLinks={registro.mediaLinks}
                                    onMediaClick={(idx) => handlePreviewMedia(idx, registro.mediaLinks)}
                                    compact={true}
                                    maxDisplay={3}
                                  />
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                      </div>
                    )}
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {viewingMedia && (
        <MediaViewer 
          media={viewingMedia}
          onClose={() => setViewingMedia(null)}
        />
      )}
    </div>
  );
}

export default function SemanaPage() {
  return (
    <RequireRole anyOf={['ESTU']}>
      <SemanaPageContent />
    </RequireRole>
  );
}