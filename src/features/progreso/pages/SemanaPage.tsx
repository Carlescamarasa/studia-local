import React, { useState, useMemo } from "react";
import { localDataClient } from "@/api/localDataClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useUsers } from "@/features/shared/hooks/useUsers";
import { useAsignaciones } from "@/features/asignaciones/hooks/useAsignaciones";
import { useRegistrosSesion } from "@/features/estudio/hooks/useRegistrosSesion";

import { useFeedbacksSemanal } from "@/features/progreso/hooks/useFeedbacksSemanal";
import { Button } from "@/features/shared/components/ds/Button";
import { Card, CardHeader, CardTitle, CardContent } from "@/features/shared/components/ds";
import { Badge } from "@/features/shared/components/ds";
import { Alert, AlertDescription } from "@/features/shared/components/ds";
import {
  Music, Calendar, Target, PlayCircle, MessageSquare, Layers, ChevronLeft, ChevronRight, ChevronDown, Home, Clock, CheckCircle2, Star, Trash2, BookOpen
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { calcularLunesSemanaISO, calcularOffsetSemanas, calcularTiempoSesion, isoWeekNumberLocal } from "@/features/shared/utils/helpers";
import { useEffectiveUser } from "@/providers/EffectiveUserProvider";
import { displayName } from "@/features/shared/utils/helpers";
import PeriodHeader from "@/features/shared/components/common/PeriodHeader";
import RequireRole from "@/features/auth/components/RequireRole";
import { PageHeader } from "@/features/shared/components/ds/PageHeader";
import { componentStyles } from "@/design/componentStyles";
import { cn } from "@/lib/utils";
import SessionContentView from "@/features/shared/components/study/SessionContentView";
import MediaLinksBadges from "@/features/shared/components/media/MediaLinksBadges";
import MediaPreviewModal from "@/features/shared/components/media/MediaPreviewModal";
import { log } from "@/utils/log";

// --- Helpers de fechas locales ---
// --- Helpers de fechas locales ---
const pad2 = (n: number) => String(n).padStart(2, "0");
const formatLocalDate = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const parseLocalDate = (s: string) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
const startOfMonday = (date: Date) => {
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
  const [expandedSessions, setExpandedSessions] = useState(new Set<string>());
  const [showMediaModal, setShowMediaModal] = useState(false);
  const [selectedMediaLinks, setSelectedMediaLinks] = useState<string[]>([]);
  const [selectedMediaIndex, setSelectedMediaIndex] = useState(0);
  const [tipoFeedbackSemana, setTipoFeedbackSemana] = useState('todos'); // 'todos' | 'profesor' | 'sesiones'
  const queryClient = useQueryClient();

  const { effectiveUserId, effectiveEmail } = useEffectiveUser();

  const { data: asignaciones = [] } = useAsignaciones();

  // Feedbacks semanales via hook
  const { data: feedbacksSemanal = [] } = useFeedbacksSemanal();

  const { data: usuarios = [] } = useUsers();

  const { data: registrosSesion = [] } = useRegistrosSesion();



  // Buscar el usuario real en la base de datos por email si effectiveUser viene de Supabase
  // Esto es necesario porque effectiveUser puede tener el ID de Supabase Auth, no el ID de la BD
  // Buscar el usuario real en la base de datos por email si effectiveUser viene de Supabase
  // Esto es necesario porque effectiveUser puede tener el ID de Supabase Auth, no el ID de la BD
  const usuarioActual = usuarios.find(u => {
    if (effectiveEmail && u.email) {
      return u.email.toLowerCase().trim() === (effectiveEmail as string).toLowerCase().trim();
    }
    return u.id === effectiveUserId;
  });

  // Usar el ID del usuario de la base de datos, no el de Supabase Auth
  const userIdActual = usuarioActual?.id || effectiveUserId;

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
        return dateB.getTime() - dateA.getTime();
      });
  }, [feedbacksSemanal, userIdActual]);

  // Filtrar registros de sesión de este alumno (todas las semanas, no solo la actual)
  // Solo sesiones válidas: aquellas con calificación (sesiones realmente finalizadas)
  const registrosSesionesAlumno = useMemo(() => {
    return registrosSesion
      .filter(r => r.alumnoId === userIdActual)
      .filter(r => r.inicioISO) // Solo los que tienen fecha
      .filter(r => r.calificacion != null) // Solo sesiones válidas (con calificación)
      .sort((a, b) => {
        // Ordenar por fecha descendente (más reciente primero)
        return new Date(b.inicioISO).getTime() - new Date(a.inicioISO).getTime();
      });
  }, [registrosSesion, userIdActual]);

  // Combinar feedbacks, evaluaciones y registros, ordenados por timestamp, filtrando solo semana actual
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const itemsCombinados = useMemo(() => {
    const items: any[] = [];
    const lunesSemana = parseLocalDate(semanaActualISO);
    const domingoSemana = new Date(lunesSemana);
    domingoSemana.setDate(domingoSemana.getDate() + 6);
    domingoSemana.setHours(23, 59, 59, 999);

    // Agregar feedbacks (solo de la semana actual)
    feedbacksProfesor.forEach(feedback => {
      const fechaFeedback = feedback.semanaInicioISO ? parseLocalDate(feedback.semanaInicioISO) : null;
      if (fechaFeedback && fechaFeedback >= lunesSemana && fechaFeedback <= domingoSemana) {
        // Supabase returns createdAt (camelCase via snakeToCamel), local has created_at
        const timestampStr = (feedback as any).createdAt || (feedback as any).created_at;
        const timestamp = timestampStr ? new Date(timestampStr) : fechaFeedback;
        items.push({
          tipo: 'feedback',
          fecha: fechaFeedback,
          timestamp: timestamp,
          fechaISO: timestampStr || feedback.semanaInicioISO,
          data: feedback,
        });
      }
    });

    // Agregar registros de sesión (solo de la semana actual)
    registrosSesionesAlumno.forEach(registro => {
      if (registro.inicioISO) {
        const fechaRegistro = parseLocalDate(registro.inicioISO.split('T')[0]);
        if (fechaRegistro >= lunesSemana && fechaRegistro <= domingoSemana) {
          items.push({
            tipo: 'registro',
            fecha: fechaRegistro,
            timestamp: new Date(registro.inicioISO),
            fechaISO: registro.inicioISO,
            data: registro,
          });
        }
      }
    });

    // Ordenar por timestamp descendente (más reciente primero)
    return items.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }, [feedbacksProfesor, registrosSesionesAlumno, userIdActual, semanaActualISO]);

  // Mapa de usuarios para mostrar nombres
  const usuariosMap = useMemo(() => {
    const map: Record<string, any> = {};
    usuarios.forEach(u => {
      map[u.id] = u;
    });
    return map;
  }, [usuarios]);

  // Filtrar items según el tipo seleccionado
  // Tabs: 'todos' | 'sesiones' | 'feedback' | 'evaluaciones'
  const itemsFiltrados = useMemo(() => {
    if (tipoFeedbackSemana === 'todos') {
      return itemsCombinados;
    } else if (tipoFeedbackSemana === 'sesiones') {
      return itemsCombinados.filter(item => item.tipo === 'registro');
    } else if (tipoFeedbackSemana === 'feedback') {
      return itemsCombinados.filter(item => item.tipo === 'feedback');
    }
    return itemsCombinados;
  }, [itemsCombinados, tipoFeedbackSemana]);

  // Normalizar media links: acepta strings u objetos con url
  const normalizeMediaLinks = (rawLinks: any) => {
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

  const handlePreviewMedia = (index: number, mediaLinks: any[]) => {
    if (!mediaLinks || !Array.isArray(mediaLinks) || mediaLinks.length === 0) return;

    // Normalizar media links
    const normalizedLinks = normalizeMediaLinks(mediaLinks);
    if (normalizedLinks.length === 0) return;

    // Asegurar que el índice esté dentro del rango
    const safeIndex = Math.max(0, Math.min(index, normalizedLinks.length - 1));

    setSelectedMediaLinks(normalizedLinks);
    setSelectedMediaIndex(safeIndex);
    setShowMediaModal(true);
  };

  const deleteRegistroMutation = useMutation({
    mutationFn: async (id: any) => {
      return await localDataClient.entities.RegistroSesion.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['registrosSesion'] });
    },
  });

  const handleDeleteRegistro = async (registro: any) => {
    if (!window.confirm('¿Eliminar esta sesión de estudio? Esta acción no se puede deshacer.')) {
      return;
    }
    try {
      await deleteRegistroMutation.mutateAsync(registro.id);
    } catch (error) {
      log.error('Error al eliminar sesión:', error);
      alert('Error al eliminar la sesión. Por favor, inténtalo de nuevo.');
    }
  };

  const cambiarSemana = (direccion: number) => {
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
    SON: 'Sonido',
    FLX: 'Flexibilidad',
    MOT: 'Motricidad',
    ART: 'Articulación',
    COG: 'Cognitivo',
  };

  const focoColors = {
    GEN: componentStyles.status.badgeDefault,
    LIG: componentStyles.status.badgeInfo,
    RIT: componentStyles.status.badgeDefault,
    ART: componentStyles.status.badgeSuccess,
    'S&A': componentStyles.status.badgeDefault,
  };

  const toggleSession = (key: string) => {
    setExpandedSessions(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };


  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        icon={Calendar}
        title="Mi Semana"
        subtitle="Resumen y planificación semanal"
        actions={
          (() => {
            const lunesSemana = parseLocalDate(semanaActualISO);
            const domingoSemana = new Date(lunesSemana);
            domingoSemana.setDate(lunesSemana.getDate() + 6);
            const numeroSemana = isoWeekNumberLocal(lunesSemana);
            const labelSemana = `Semana ${numeroSemana}`;
            const rangeTextSemana = `${lunesSemana.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })} – ${domingoSemana.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}`;

            return (
              <PeriodHeader
                label={labelSemana}
                rangeText={rangeTextSemana}
                onPrev={() => cambiarSemana(-1)}
                onNext={() => cambiarSemana(1)}
                onToday={irSemanaActual}
                className=""
              />
            );
          })()
        }
      />

      <div className={`$"studia-section" space-y-4`}>
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
                Ir a Studia ahora
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className={componentStyles.containers.cardBase}>
            <CardHeader>
              <div className="flex items-start md:items-center justify-between gap-3 flex-col md:flex-row">
                <CardTitle className={componentStyles.typography.cardTitle}>{semanaDelPlan.nombre}</CardTitle>
                <Badge className={(focoColors as any)[semanaDelPlan.foco || 'GEN']}>
                  {(focoLabels as any)[semanaDelPlan.foco || 'GEN']}
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

              </div>


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
                                <Badge className={`rounded-full ${(focoColors as any)[sesion.foco || 'GEN']}`} variant="outline">
                                  {(focoLabels as any)[sesion.foco || 'GEN']}
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
                              <SessionContentView sesion={sesion as any} compact />
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
                  Ir a Studia ahora
                </Button>
              </div>

              {/* Feedback y Registros de Semana Actual - Combinados por fecha */}
              <div className="pt-4 border-t border-[var(--color-border-default)]">
                {/* Título arriba de los filtros */}
                <h3 className={cn(componentStyles.typography.sectionTitle, "mb-3")}>
                  Semana Actual
                </h3>

                {/* Filtros compactos debajo del título */}
                <div className="flex gap-1.5 flex-wrap mb-4">
                  <Button
                    variant={tipoFeedbackSemana === 'todos' ? 'primary' : 'outline'}
                    size="sm"
                    onClick={() => setTipoFeedbackSemana('todos')}
                    className="text-xs h-8 sm:h-9 rounded-xl focus-brand transition-all"
                  >
                    Todos
                  </Button>
                  <Button
                    variant={tipoFeedbackSemana === 'sesiones' ? 'primary' : 'outline'}
                    size="sm"
                    onClick={() => setTipoFeedbackSemana('sesiones')}
                    className="text-xs h-8 sm:h-9 rounded-xl focus-brand transition-all"
                  >
                    <BookOpen className="w-3.5 h-3.5 mr-1" />
                    Registro Sesiones
                  </Button>
                  <Button
                    variant={tipoFeedbackSemana === 'feedback' ? 'primary' : 'outline'}
                    size="sm"
                    onClick={() => setTipoFeedbackSemana('feedback')}
                    className="text-xs h-8 sm:h-9 rounded-xl focus-brand transition-all"
                  >
                    <MessageSquare className="w-3.5 h-3.5 mr-1" />
                    Feedback
                  </Button>

                </div>

                {itemsFiltrados.length === 0 ? (
                  <div className="text-center py-8">
                    {tipoFeedbackSemana === 'sesiones' ? (
                      <BookOpen className={`w-12 h-12 mx-auto mb-3 ${componentStyles.empty.emptyIcon} text-[var(--color-text-secondary)]`} />
                    ) : tipoFeedbackSemana === 'feedback' ? (
                      <MessageSquare className={`w-12 h-12 mx-auto mb-3 ${componentStyles.empty.emptyIcon} text-[var(--color-text-secondary)]`} />
                    ) : (
                      <Calendar className={`w-12 h-12 mx-auto mb-3 ${componentStyles.empty.emptyIcon} text-[var(--color-text-secondary)]`} />
                    )}
                    <p className={componentStyles.empty.emptyText}>
                      {tipoFeedbackSemana === 'todos'
                        ? 'No hay actividad esta semana'
                        : tipoFeedbackSemana === 'sesiones'
                          ? 'No hay registros de sesiones esta semana'
                          : tipoFeedbackSemana === 'feedback'
                            ? 'No hay feedback del profesor esta semana'
                            : 'No hay actividad esta semana'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {itemsFiltrados.map((item) => {
                      // Renderizar Feedback del Profesor
                      if (item.tipo === 'feedback') {
                        const feedback = item.data;
                        const prof = usuarios.find(u => u.id === feedback.profesorId);
                        const fechaFormateada = item.timestamp.toLocaleDateString('es-ES', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit'
                        });

                        return (
                          <div key={`feedback-${feedback.id}`} className="flex items-start gap-2 py-2 px-3 border-l-4 border-l-[var(--color-info)] bg-[var(--color-info)]/5 hover:bg-[var(--color-info)]/10 transition-colors">
                            <MessageSquare className="w-4 h-4 text-[var(--color-info)] mt-0.5 shrink-0" />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap mb-1">
                                <p className="text-xs text-[var(--color-text-secondary)] font-medium">🗨️ Comentario del profesor</p>
                                {prof && (
                                  <span className="text-xs text-[var(--color-text-secondary)]">
                                    • {displayName(prof)}
                                  </span>
                                )}
                                <span className="text-xs text-[var(--color-text-secondary)]">
                                  • {fechaFormateada}
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
                      }



                      // Renderizar Registro de Sesión
                      if (item.tipo === 'registro') {
                        const registro = item.data;
                        const fechaFormateada = item.timestamp.toLocaleDateString('es-ES', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit'
                        });

                        const getCalificacionBadge = (cal: number) => {
                          if (!cal || cal <= 0) return null;
                          const calInt = Math.round(cal);
                          if (calInt === 1) return componentStyles.status.badgeDanger;
                          if (calInt === 2) return componentStyles.status.badgeWarning;
                          if (calInt === 3) return componentStyles.status.badgeInfo;
                          if (calInt === 4) return componentStyles.status.badgeSuccess;
                          return componentStyles.status.badgeDefault;
                        };

                        return (
                          <div key={`registro-${registro.id}`} className="flex items-start gap-2 py-2 px-3 border-l-4 border-l-[var(--color-success)] bg-[var(--color-success)]/5 hover:bg-[var(--color-success)]/10 transition-colors relative group">
                            <BookOpen className="w-4 h-4 text-[var(--color-success)] mt-0.5 shrink-0" />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap mb-1">
                                <p className="text-xs text-[var(--color-text-secondary)] font-medium">Sesión de estudio</p>
                                <span className="text-xs text-[var(--color-text-secondary)]">
                                  • {fechaFormateada}
                                </span>
                                {registro.piezaNombre && (
                                  <span className="text-xs text-[var(--color-text-secondary)]">
                                    • {registro.piezaNombre}
                                  </span>
                                )}
                                {registro.calificacion && registro.calificacion > 0 && (
                                  <Badge className={`${getCalificacionBadge(registro.calificacion)} shrink-0 ml-auto`}>
                                    <Star className="w-3 h-3 mr-1 fill-current" />
                                    {isNaN(registro.calificacion) ? '0' : Math.round(registro.calificacion)}/4
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-[var(--color-text-primary)] font-semibold mb-1">
                                {registro.sesionNombre || 'Sesión sin nombre'}
                              </p>
                              {registro.notas && registro.notas.trim() && (
                                <p className="text-sm text-[var(--color-text-primary)] italic break-words mb-2">
                                  "{registro.notas.trim()}"
                                </p>
                              )}
                              {registro.mediaLinks && Array.isArray(registro.mediaLinks) && registro.mediaLinks.length > 0 && (
                                <div className="mt-2">
                                  <MediaLinksBadges
                                    mediaLinks={registro.mediaLinks}
                                    onMediaClick={(idx) => handlePreviewMedia(idx, registro.mediaLinks)}
                                    compact={true}
                                    maxDisplay={3}
                                  />
                                </div>
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteRegistro(registro)}
                              disabled={deleteRegistroMutation.isPending}
                              className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0 h-8 w-8 p-0 text-[var(--color-danger)] hover:bg-[var(--color-danger)]/10 hover:text-[var(--color-danger)]"
                              aria-label="Eliminar sesión"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        );
                      }

                      return null;
                    })}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Modal de preview de medios */}
      {
        showMediaModal && selectedMediaLinks.length > 0 && (
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
        )
      }
    </div >
  );
}

export default function SemanaPage() {
  return (
    <RequireRole anyOf={['ESTU']}>
      <SemanaPageContent />
    </RequireRole>
  );
}