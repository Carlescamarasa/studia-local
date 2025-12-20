
import React, { useState, useEffect, useMemo } from "react";
import { localDataClient } from "@/api/localDataClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, Badge } from "@/components/ds";
import { Button } from "@/components/ds/Button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Calendar, User, Users, Music, Target, MessageSquare,
  Search, X, Edit, Trash2, Save, Eye, Clock, Activity,
  ChevronDown, ChevronRight, PlayCircle, PlusCircle
} from "lucide-react";
import ModalFeedbackSemanal from "@/components/calendario/ModalFeedbackSemanal";
import { Upload } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import EvaluacionForm from "@/components/evaluaciones/EvaluacionForm";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";
import { displayName, calcularLunesSemanaISO, calcularOffsetSemanas, useEffectiveUser, resolveUserIdActual, isoWeekNumberLocal } from "../components/utils/helpers";
import { shouldIgnoreHotkey } from "@/utils/hotkeys";
import PeriodHeader from "../components/common/PeriodHeader";
import MediaLinksBadges from "../components/common/MediaLinksBadges";
import MediaViewer from "../components/common/MediaViewer";
import MediaPreviewModal from "../components/common/MediaPreviewModal";
import MediaLinksInput from "../components/common/MediaLinksInput";
import { uploadVideoToYouTube } from "@/utils/uploadVideoToYouTube";
import RequireRole from "@/components/auth/RequireRole";
import SessionContentView from "../components/study/SessionContentView";
import { calcularTiempoSesion } from "../components/study/sessionSequence";
import { componentStyles } from "@/design/componentStyles";
import PageHeader from "@/components/ds/PageHeader";
import { useIsMobile } from "@/hooks/use-mobile";
import { Checkbox } from "@/components/ui/checkbox";
import TablePagination from "@/components/common/TablePagination";
import RowActionsMenu from "@/components/common/RowActionsMenu";
import UserActionsMenu from "@/components/common/UserActionsMenu";

const pad2 = (n) => String(n).padStart(2, "0");
const formatLocalDate = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const parseLocalDate = (s) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
const startOfMonday = (date) => {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dow = d.getDay();
  const diff = dow === 0 ? -6 : 1 - dow;
  d.setDate(d.getDate() + diff);
  return d;
};

export default function AgendaPage() {
  return (
    <RequireRole anyOf={['PROF', 'ADMIN']}>
      <AgendaPageContent />
    </RequireRole>
  );
}

function AgendaPageContent() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [semanaActualISO, setSemanaActualISO] = useState(() => {
    return calcularLunesSemanaISO(new Date());
  });
  const [searchTerm, setSearchTerm] = useState('');
  // Modal unificado de Feedback
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);
  const [selectedFeedbackData, setSelectedFeedbackData] = useState(null); // { studentId, feedback?, weekStartISO, weekLabel }
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [viewingMedia, setViewingMedia] = useState(null);
  const [showMediaPreview, setShowMediaPreview] = useState(false);
  const [previewUrls, setPreviewUrls] = useState([]);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [expandedSessions, setExpandedSessions] = useState(new Set());
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [filtroEstudiantes, setFiltroEstudiantes] = useState('asignados'); // 'asignados' | 'todos'

  const effectiveUser = useEffectiveUser();
  const isMobile = useIsMobile();

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

  const { data: usuarios = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => localDataClient.entities.User.list(),
    staleTime: 5 * 60 * 1000, // 5 minutos - evita refetch en navegación cálida
  });

  const { data: asignacionesRaw = [] } = useQuery({
    queryKey: ['asignaciones'],
    queryFn: () => localDataClient.entities.Asignacion.list(),
    staleTime: 5 * 60 * 1000,
  });

  const { data: feedbacksSemanalRaw = [] } = useQuery({
    queryKey: ['feedbacksSemanal'],
    queryFn: () => localDataClient.entities.FeedbackSemanal.list('-created_at'),
    staleTime: 5 * 60 * 1000,
  });

  // Resolver ID de usuario actual de la BD (UUID en Supabase, string en local)
  // Usar useMemo para recalcular cuando usuarios cambie
  const userIdActual = useMemo(() => {
    return resolveUserIdActual(effectiveUser, usuarios);
  }, [effectiveUser, usuarios]);

  // Filtrar y validar asignaciones
  const asignaciones = useMemo(() => {
    return asignacionesRaw.filter(a => {
      // Validar que tiene alumnoId válido
      if (!a.alumnoId) return false;
      const alumno = usuarios.find(u => u.id === a.alumnoId);
      if (!alumno) return false;

      // Validar que tiene plan y semanas
      if (!a.plan || !Array.isArray(a.plan.semanas) || a.plan.semanas.length === 0) return false;

      // Validar que tiene semanaInicioISO válida
      if (!a.semanaInicioISO || typeof a.semanaInicioISO !== 'string') return false;

      return true;
    });
  }, [asignacionesRaw, usuarios]);

  const feedbacksSemanal = useMemo(() => feedbacksSemanalRaw, [feedbacksSemanalRaw]);

  // Logs de depuración (después de declarar feedbacksSemanal)

  // --- MODAL FEEDBACK UNIFICADO ---
  const abrirFeedbackModal = (alumno, feedbackExistente = null) => {
    setSelectedFeedbackData({
      studentId: alumno.id,
      feedback: feedbackExistente,
      weekStartISO: semanaActualISO,
      weekLabel: `Semana ${isoWeekNumberLocal(parseLocalDate(semanaActualISO))}`
    });
    setFeedbackModalOpen(true);
  };

  const handleFeedbackSaved = () => {
    queryClient.invalidateQueries({ queryKey: ['feedbacksSemanal'] });
    queryClient.invalidateQueries({ queryKey: ['agenda-semanal'] });
    // Keep modal open? No, modal closes itself or we close it. 
    // The modal component calls onOpenChange(false) on success.
    // We just need to refresh data.
  };

  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        document.getElementById('search-input')?.focus();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

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


  const isProfesorOrAdmin = effectiveUser?.rolPersonalizado === 'PROF' || effectiveUser?.rolPersonalizado === 'ADMIN';
  const isAdmin = effectiveUser?.rolPersonalizado === 'ADMIN';

  // Filtrar estudiantes según el filtro seleccionado
  let estudiantesFiltrados = usuarios.filter(u => u.rolPersonalizado === 'ESTU');

  // Si es PROF y el filtro es "asignados", mostrar solo estudiantes asignados a este profesor
  if (isProfesorOrAdmin && !isAdmin && filtroEstudiantes === 'asignados') {
    const asignacionesDelProfesor = asignaciones.filter(a => a.profesorId === userIdActual);
    const alumnosAsignadosIds = new Set(asignacionesDelProfesor.map(a => a.alumnoId));
    estudiantesFiltrados = estudiantesFiltrados.filter(e => alumnosAsignadosIds.has(e.id));
  }

  if (searchTerm) {
    const term = searchTerm.toLowerCase();
    estudiantesFiltrados = estudiantesFiltrados.filter(e => {
      const nombre = displayName(e).toLowerCase();
      const email = (e.email || '').toLowerCase();
      return nombre.includes(term) || email.includes(term);
    });
  }




  const handlePreviewMedia = (index, urls) => {
    setPreviewUrls(urls);
    setPreviewIndex(index);
    setShowMediaPreview(true);
  };

  const toggleSession = (key) => {
    setExpandedSessions(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  // Preparar datos para la tabla
  // Usar useMemo para recalcular cuando userIdActual, feedbacksSemanal o asignaciones cambien
  const tableData = useMemo(() => {
    return estudiantesFiltrados.map(alumno => {
      const asignacionActiva = asignaciones.find(a => {
        if (a.alumnoId !== alumno.id) return false;
        if (a.estado !== 'publicada' && a.estado !== 'en_curso') return false;
        const offset = calcularOffsetSemanas(a.semanaInicioISO, semanaActualISO);
        return offset >= 0 && offset < (a.plan?.semanas?.length || 0);
      });

      // Buscar TODOS los feedbacks para este alumno/semana (puede haber múltiples de diferentes profesores)
      // Mostraremos el más reciente o el del profesor actual si existe
      const feedbacksAlumno = feedbacksSemanal.filter(f =>
        f.alumnoId === alumno.id && f.semanaInicioISO === semanaActualISO
      );

      // Si hay múltiples, preferir el del profesor actual, sino el más reciente
      const feedback = feedbacksAlumno.find(f => f.profesorId === userIdActual) || feedbacksAlumno[0];

      const semanaIdx = asignacionActiva ?
        calcularOffsetSemanas(asignacionActiva.semanaInicioISO, semanaActualISO) : 0;

      const semana = asignacionActiva?.plan?.semanas?.[semanaIdx];

      return {
        id: alumno.id,
        alumno,
        asignacionActiva,
        semana,
        semanaIdx,
        feedback,
      };
    });
  }, [estudiantesFiltrados, asignaciones, feedbacksSemanal, semanaActualISO, userIdActual, usuarios]);

  // Calcular datos paginados
  const displayData = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return tableData.slice(startIndex, endIndex);
  }, [tableData, currentPage, pageSize]);

  const toggleSelection = (itemId) => {
    setSelectedItems(prev => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedItems.size === tableData.length && tableData.length > 0) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(tableData.map(item => item.id)));
    }
  };

  // Función para renderizar una card de estudiante
  const renderStudentCard = (row) => {
    const totalSemanas = row.asignacionActiva?.plan?.semanas?.length || 0;
    const semanaActual = totalSemanas > 0 ? (row.semanaIdx + 1) : null;
    const planNombre = row.asignacionActiva?.plan?.nombre || '';
    const isSelected = selectedItems.has(row.id);

    const actions = [];
    if (row.asignacionActiva) {
      actions.push({
        id: 'view',
        label: 'Ver detalle de asignación',
        onClick: () => navigate(createPageUrl(`asignacion-detalle?id=${row.asignacionActiva.id}`)),
        icon: <Eye className="w-4 h-4" />,
      });
    }

    return (
      <div
        key={row.id}
        className={`border border-[var(--color-border-default)] bg-[var(--color-surface-default)] dark:bg-[var(--color-surface-elevated)] px-4 py-3 md:px-5 md:py-4 shadow-sm flex flex-col gap-3 md:gap-4 ${isSelected ? 'border-l-4 border-l-[var(--color-primary)] bg-[var(--color-primary-soft)]' : ''
          }`}
        style={{ borderRadius: 'var(--card-radius, 0.75rem)' }}
      >
        {/* Cabecera: avatar + nombre + badges */}
        <div className="flex flex-col gap-2 md:gap-0">
          {/* Desktop: todo en una línea */}
          <div className="hidden md:flex md:items-center md:justify-between md:gap-4">
            {/* Izquierda: checkbox + avatar + nombre */}
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <Checkbox
                checked={isSelected}
                onCheckedChange={() => toggleSelection(row.id)}
                className="h-4 w-4 shrink-0"
                aria-label={`Seleccionar ${displayName(row.alumno)}`}
              />
              <div className="w-10 h-10 bg-gradient-to-br from-[var(--color-surface-muted)] to-[var(--color-surface-muted)]/20 rounded-full flex items-center justify-center shrink-0">
                <span className="text-[var(--color-text-primary)] font-semibold text-sm">
                  {displayName(row.alumno).slice(0, 1).toUpperCase()}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-[var(--color-text-primary)] break-words">
                  {displayName(row.alumno)}
                </p>
              </div>
            </div>
            {/* Derecha: badges + botón menú */}
            <div className="flex items-center gap-3 shrink-0">
              {row.asignacionActiva && row.semana && (
                <div className="flex flex-wrap gap-2">
                  {semanaActual && totalSemanas > 0 && (
                    <Badge variant="outline" className="text-xs px-2 py-0.5">
                      Semana {semanaActual} de {totalSemanas}
                    </Badge>
                  )}
                  {planNombre && (
                    <Badge variant="secondary" className="text-xs px-2 py-0.5">
                      {planNombre}
                    </Badge>
                  )}
                </div>
              )}
              <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
                <UserActionsMenu user={row.alumno} usuarios={usuarios} />
              </div>
            </div>
          </div>

          {/* Mobile: primera línea checkbox + avatar + nombre */}
          <div className="flex md:hidden items-center gap-3">
            <Checkbox
              checked={isSelected}
              onCheckedChange={() => toggleSelection(row.id)}
              className="h-4 w-4 shrink-0"
              aria-label={`Seleccionar ${displayName(row.alumno)}`}
            />
            <div className="w-10 h-10 bg-gradient-to-br from-[var(--color-surface-muted)] to-[var(--color-surface-muted)]/20 rounded-full flex items-center justify-center shrink-0">
              <span className="text-[var(--color-text-primary)] font-semibold text-sm">
                {displayName(row.alumno).slice(0, 1).toUpperCase()}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-[var(--color-text-primary)] break-words">
                {displayName(row.alumno)}
              </p>
            </div>
          </div>
          {/* Mobile: segunda línea badges + botón menú */}
          {(row.asignacionActiva && row.semana) || actions.length > 0 ? (
            <div className="flex md:hidden items-center justify-between gap-2">
              {/* Badges de semana y plan */}
              {row.asignacionActiva && row.semana && (
                <div className="flex flex-wrap gap-2">
                  {semanaActual && totalSemanas > 0 && (
                    <Badge variant="outline" className="text-xs px-2 py-0.5">
                      Semana {semanaActual} de {totalSemanas}
                    </Badge>
                  )}
                  {planNombre && (
                    <Badge variant="secondary" className="text-xs px-2 py-0.5">
                      {planNombre}
                    </Badge>
                  )}
                </div>
              )}
              {/* Botón de menú - UserActionsMenu */}
              <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
                <UserActionsMenu user={row.alumno} usuarios={usuarios} />
              </div>
            </div>
          ) : null}
        </div>

        {/* Cuerpo: pieza + sesiones (izquierda) y feedback (derecha) */}
        {!row.asignacionActiva || !row.semana ? (
          /* Sin asignación: mensaje + botón feedback */
          isProfesorOrAdmin && (
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-2 px-3 py-2 bg-[var(--color-surface-muted)]/50 border border-[var(--color-border-default)] rounded-lg">
                <Target className="w-4 h-4 text-[var(--color-text-secondary)] shrink-0" />
                <span className="text-sm text-[var(--color-text-secondary)]">Sin asignación esta semana</span>
              </div>
              {!row.feedback && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    abrirFeedbackModal(row.alumno);
                  }}
                  className={`w-full md:w-auto ${componentStyles.buttons.outline}`}
                >
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Dar feedback
                </Button>
              )}
            </div>
          )
        ) : (
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:gap-6">
            {/* Columna izquierda: pieza + semana del plan + sesiones (2/3 en desktop) */}
            <div className="flex-1 md:flex-[2] space-y-2">
              {/* Línea 1: icono música + nombre de la pieza */}
              <div className="flex items-center gap-2">
                <Music className="w-4 h-4 text-[var(--color-primary)] shrink-0" />
                <p className="text-sm font-medium text-[var(--color-text-primary)] break-words">
                  {row.asignacionActiva.piezaSnapshot?.nombre || '—'}
                </p>
              </div>
              {/* Línea 2: semana del plan (subtítulo) */}
              {row.semana.nombre && (
                <p className="text-xs text-[var(--color-text-secondary)] ml-6">
                  {row.semana.nombre}
                </p>
              )}
              {/* Línea 3: pills de sesiones */}
              {row.semana?.sesiones && row.semana.sesiones.length > 0 && (
                <div className="space-y-1.5 mt-2">
                  {row.semana.sesiones.map((sesion, sesionIdx) => {
                    const sesionKey = `${row.alumno.id}-${row.semanaIdx}-${sesionIdx}`;
                    const isExpanded = expandedSessions.has(sesionKey);
                    const tiempo = calcularTiempoSesion(sesion);
                    const mins = Math.floor(tiempo / 60);
                    const tiempoTexto = mins > 0 ? `${mins} min` : null;
                    const focoTexto = sesion.foco ? focoLabels[sesion.foco] : null;

                    return (
                      <div key={sesionIdx} className="space-y-1">
                        <div
                          className="flex items-center gap-2 px-2 py-1.5 rounded-md transition-colors hover:bg-[var(--color-surface-muted)] cursor-pointer border border-[var(--color-border-default)]/50"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleSession(sesionKey);
                          }}
                        >
                          <PlayCircle className="w-4 h-4 text-[var(--color-info)] shrink-0" />
                          <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
                            <span className="text-sm text-[var(--color-text-primary)] break-words">
                              {sesion.nombre}
                            </span>
                            {tiempoTexto && (
                              <span className="text-xs text-[var(--color-text-secondary)] whitespace-nowrap">
                                · {tiempoTexto}
                              </span>
                            )}
                            {focoTexto && (
                              <span className="text-xs text-[var(--color-text-secondary)] whitespace-nowrap">
                                · {focoTexto}
                              </span>
                            )}
                          </div>
                          <ChevronRight className={`w-4 h-4 text-[var(--color-text-secondary)] shrink-0 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                        </div>
                        {isExpanded && (
                          <div className="ml-6 mt-1 mb-2 border-l-2 border-[var(--color-info)]/40 pl-3" onClick={(e) => e.stopPropagation()}>
                            <SessionContentView sesion={sesion} compact />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Columna derecha: feedback (1/3 en desktop) */}
            {isProfesorOrAdmin && (
              <div className="w-full md:flex-1 md:min-w-[220px] space-y-2">
                {!row.feedback ? (
                  <div className="flex flex-col gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        abrirFeedbackModal(row.alumno);
                      }}
                      className={`w-full md:w-auto ${componentStyles.buttons.outline}`}
                    >
                      <MessageSquare className="w-4 h-4 mr-2" />
                      Dar feedback
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {/* Título: Feedback del profesor · Nombre */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <MessageSquare className="w-4 h-4 text-[var(--color-info)] shrink-0" />
                      <span className="text-xs text-[var(--color-text-secondary)] font-medium">Feedback del profesor</span>
                      {(() => {
                        const profesor = usuarios.find(u => u.id === row.feedback.profesorId);
                        if (profesor) {
                          return (
                            <span className="text-xs text-[var(--color-text-secondary)]">
                              · {displayName(profesor)}
                            </span>
                          );
                        }
                        return null;
                      })()}
                    </div>
                    {/* Cita del feedback (máx 2-3 líneas con ellipsis) */}
                    {row.feedback.notaProfesor && (
                      <p className="text-sm text-[var(--color-text-primary)] italic line-clamp-3 break-words">
                        "{row.feedback.notaProfesor}"
                      </p>
                    )}
                    {/* Media links (solo iconos) */}
                    {row.feedback.mediaLinks && row.feedback.mediaLinks.length > 0 && (
                      <div>
                        <MediaLinksBadges
                          mediaLinks={row.feedback.mediaLinks}
                          onMediaClick={(idx) => handlePreviewMedia(idx, row.feedback.mediaLinks)}
                          compact={true}
                          maxDisplay={3}
                        />
                      </div>
                    )}
                    {/* Botones de acción */}
                    <div className="flex gap-1">
                      {(() => {
                        // Verificar permisos: solo el profesor que creó el feedback o ADMIN puede editarlo/eliminarlo
                        const canEditFeedback = isAdmin || row.feedback.profesorId === userIdActual;

                        if (!canEditFeedback) return null;

                        return (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                abrirFeedbackModal(row.alumno, row.feedback);
                              }}
                              className={`h-8 ${componentStyles.buttons.ghost}`}
                              aria-label="Editar Feedback Unificado"
                              title="Editar Feedback"
                            >
                              <Edit className="w-3 h-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (window.confirm('¿Eliminar feedback?')) {
                                  eliminarFeedbackMutation.mutate(row.feedback.id);
                                }
                              }}
                              className={`h-8 ${componentStyles.buttons.ghost} ${componentStyles.buttons.deleteSubtle}`}
                              aria-label="Eliminar feedback"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // Definir columnas de la tabla (mantenidas para compatibilidad, pero no se usan en el renderizado)
  const columns = [
    {
      key: 'estudiante',
      label: 'Estudiante',
      sortable: true,
      sortValue: (row) => displayName(row.alumno),
      render: (row) => {
        const totalSemanas = row.asignacionActiva?.plan?.semanas?.length || 0;
        const semanaActual = totalSemanas > 0 ? (row.semanaIdx + 1) : null;
        const planNombre = row.asignacionActiva?.plan?.nombre || '';

        return (
          <div className="flex items-center justify-between gap-3 min-w-0">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="w-10 h-10 bg-gradient-to-br from-[var(--color-surface-muted)] to-[var(--color-surface-muted)]/20 rounded-full flex items-center justify-center shrink-0">
                <span className="text-[var(--color-text-primary)] font-semibold text-sm">
                  {displayName(row.alumno).slice(0, 1).toUpperCase()}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-[var(--color-text-primary)] break-words">
                  {displayName(row.alumno)}
                </p>
              </div>
            </div>
            {row.asignacionActiva && row.semana && (
              <div className="flex items-center gap-2 shrink-0">
                {semanaActual && totalSemanas > 0 && (
                  <Badge variant="outline" className="text-xs px-2 py-0.5">
                    Semana {semanaActual} de {totalSemanas}
                  </Badge>
                )}
                {planNombre && (
                  <Badge variant="secondary" className="text-xs px-2 py-0.5">
                    {planNombre}
                  </Badge>
                )}
              </div>
            )}
          </div>
        );
      },
    },
    {
      key: 'pieza',
      label: 'Pieza',
      sortable: true,
      sortValue: (row) => row.asignacionActiva?.piezaSnapshot?.nombre || '',
      render: (row) => {
        if (!row.asignacionActiva || !row.semana) {
          return (
            <div className="flex items-center gap-2 px-3 py-2 bg-[var(--color-surface-muted)]/50 border border-[var(--color-border-default)] rounded-lg">
              <Target className="w-4 h-4 text-[var(--color-text-secondary)] shrink-0" />
              <span className="text-sm text-[var(--color-text-secondary)]">Sin asignación esta semana</span>
            </div>
          );
        }
        return (
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Music className="w-4 h-4 text-[var(--color-primary)] shrink-0" />
              <p className="text-sm font-medium text-[var(--color-text-primary)] break-words">
                {row.asignacionActiva.piezaSnapshot?.nombre || '—'}
              </p>
            </div>
            {row.semana.nombre && (
              <p className="text-xs text-[var(--color-text-secondary)] ml-6">
                {row.semana.nombre}
              </p>
            )}
          </div>
        );
      },
    },
    {
      key: 'semana',
      label: 'Semana del Plan',
      sortable: true,
      sortValue: (row) => row.semana?.nombre || '',
      mobileHidden: true, // Ocultar en mobile ya que se muestra en la columna "pieza"
      render: (row) => {
        if (!row.asignacionActiva || !row.semana) {
          return null; // No mostrar nada si no hay asignación
        }
        return (
          <div className="min-w-0">
            {row.semana.objetivo && (
              <p className="text-xs text-[var(--color-text-secondary)] break-words">
                {row.semana.objetivo}
              </p>
            )}
          </div>
        );
      },
    },
    {
      key: 'sesiones',
      label: 'Sesiones',
      sortable: true,
      sortValue: (row) => row.semana?.sesiones?.length || 0,
      render: (row) => {
        if (!row.semana?.sesiones || row.semana.sesiones.length === 0) {
          return null; // No mostrar nada si no hay sesiones
        }
        return (
          <div className="space-y-1.5">
            {row.semana.sesiones.map((sesion, sesionIdx) => {
              const sesionKey = `${row.alumno.id}-${row.semanaIdx}-${sesionIdx}`;
              const isExpanded = expandedSessions.has(sesionKey);
              const tiempo = calcularTiempoSesion(sesion);
              const mins = Math.floor(tiempo / 60);
              const tiempoTexto = mins > 0 ? `${mins} min` : null;
              const focoTexto = sesion.foco ? focoLabels[sesion.foco] : null;

              return (
                <div key={sesionIdx} className="space-y-1">
                  <div
                    className="flex items-center gap-2 px-2 py-1.5 rounded-md transition-colors hover:bg-[var(--color-surface-muted)] cursor-pointer border border-[var(--color-border-default)]/50"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleSession(sesionKey);
                    }}
                  >
                    <PlayCircle className="w-4 h-4 text-[var(--color-info)] shrink-0" />
                    <div className="flex-1 min-w-0 flex items-center gap-2">
                      <span className="text-sm text-[var(--color-text-primary)] break-words">
                        {sesion.nombre}
                      </span>
                      {tiempoTexto && (
                        <span className="text-xs text-[var(--color-text-secondary)]">
                          · {tiempoTexto}
                        </span>
                      )}
                      {focoTexto && (
                        <span className="text-xs text-[var(--color-text-secondary)]">
                          · {focoTexto}
                        </span>
                      )}
                    </div>
                    <ChevronRight className={`w-4 h-4 text-[var(--color-text-secondary)] shrink-0 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                  </div>
                  {isExpanded && (
                    <div className="ml-6 mt-1 mb-2 border-l-2 border-[var(--color-info)]/40 pl-3" onClick={(e) => e.stopPropagation()}>
                      <SessionContentView sesion={sesion} compact />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        );
      },
    },
    ...(isProfesorOrAdmin ? [{
      key: 'feedback',
      label: 'Feedback',
      sortable: false,
      render: (row) => {
        if (!row.feedback) {
          return (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  abrirFeedbackModal(row.alumno);
                }}
                className={`${componentStyles.buttons.outline}`}
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                Dar feedback
              </Button>
            </div>
          );
        }
        return (
          <div className={"flex items-start gap-2 py-1 " + componentStyles.components.toneRowFeedback}>
            <MessageSquare className="w-4 h-4 text-[var(--color-info)] mt-0.5 shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-xs text-[var(--color-text-secondary)] font-medium">Feedback del profesor</p>
                {(() => {
                  const profesor = usuarios.find(u => u.id === row.feedback.profesorId);
                  if (profesor) {
                    return (
                      <span className="text-xs text-[var(--color-text-secondary)]">
                        • {displayName(profesor)}
                      </span>
                    );
                  }
                  return null;
                })()}
              </div>
              {row.feedback.notaProfesor && (
                <p className="text-sm text-[var(--color-text-primary)] italic mt-0.5 break-words">
                  "{row.feedback.notaProfesor}"
                </p>
              )}
              {row.feedback.mediaLinks && row.feedback.mediaLinks.length > 0 && (
                <div className="mt-2">
                  <MediaLinksBadges
                    mediaLinks={row.feedback.mediaLinks}
                    onMediaClick={(idx) => handlePreviewMedia(idx, row.feedback.mediaLinks)}
                    compact={true}
                    maxDisplay={3}
                  />
                </div>
              )}
            </div>
            <div className="flex gap-1 shrink-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  abrirFeedbackModal(row.alumno, row.feedback);
                }}
                className={`h-8 ${componentStyles.buttons.ghost}`}
                aria-label="Editar feedback"
              >
                <Edit className="w-3 h-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  if (window.confirm('¿Eliminar feedback?')) {
                    eliminarFeedbackMutation.mutate(row.feedback.id);
                  }
                }}
                className={`h-8 ${componentStyles.buttons.ghost} ${componentStyles.buttons.deleteSubtle}`}
                aria-label="Eliminar feedback"
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          </div >
        );
      },
    }] : []),
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header de página unificado */}
      {/* Header de página unificado */}
      <PageHeader
        icon={Calendar}
        title="Agenda Semanal"
        subtitle="Vista por estudiante y semana"
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
              />
            );
          })()
        }
      />

      <div className="studia-section py-4 space-y-4">
        {/* Barra de búsqueda */}
        <div className="relative">
          <Input
            id="search-input"
            placeholder="Buscar estudiante... (Ctrl/⌘+K)"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`w-full pr-9 ${componentStyles.controls.inputDefault}`}
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
              aria-label="Limpiar búsqueda"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>


      {/* Filtro de estudiantes (solo para PROF) */}
      <div className="studia-section">
        {isProfesorOrAdmin && !isAdmin && (
          <div className="mb-4 px-4 py-3 rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-muted)]">
            <div className="flex gap-2">
              <button
                onClick={() => setFiltroEstudiantes('asignados')}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${filtroEstudiantes === 'asignados'
                  ? 'bg-[var(--color-primary)] text-[var(--color-text-inverse)]'
                  : 'bg-[var(--color-surface)] text-[var(--color-text-primary)] hover:bg-[var(--color-surface-muted)]'
                  }`}
              >
                Mis alumnos
              </button>
              <button
                onClick={() => setFiltroEstudiantes('todos')}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${filtroEstudiantes === 'todos'
                  ? 'bg-[var(--color-primary)] text-[var(--color-text-inverse)]'
                  : 'bg-[var(--color-surface)] text-[var(--color-text-primary)] hover:bg-[var(--color-surface-muted)]'
                  }`}
              >
                Ver todos
              </button>
            </div>
          </div>
        )}

        {/* Cards de estudiantes */}
        <div className="space-y-3">
          {tableData.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-12 h-12 mx-auto mb-4 text-[var(--color-text-secondary)]" />
              <p className="text-[var(--color-text-secondary)]">
                {searchTerm ? 'No se encontraron estudiantes' : 'No hay estudiantes asignados'}
              </p>
            </div>
          ) : (
            <>
              {/* Selector de "Seleccionar todo" */}
              {tableData.length > 0 && (
                <div className="flex items-center gap-2 pb-2">
                  <Checkbox
                    checked={selectedItems.size === tableData.length && tableData.length > 0}
                    onCheckedChange={toggleSelectAll}
                    aria-label="Seleccionar todo"
                    className="h-4 w-4"
                  />
                  <span className="text-sm text-[var(--color-text-secondary)]">
                    Seleccionar todo
                  </span>
                </div>
              )}

              {/* Lista de cards */}
              <div className="space-y-3">
                {displayData.map(row => renderStudentCard(row))}
              </div>

              {/* Paginación */}
              {tableData.length > pageSize && (
                <div className="mt-4">
                  <TablePagination
                    data={tableData}
                    pageSize={pageSize}
                    currentPage={currentPage}
                    onPageChange={setCurrentPage}
                    onPageSizeChange={(newSize) => {
                      setPageSize(newSize);
                      setCurrentPage(1);
                    }}
                  />
                </div>
              )}

              {/* Acciones en lote */}
              {selectedItems.size > 0 && (
                <div className="sticky bottom-0 left-0 right-0 border-t border-[var(--color-border-default)] bg-[var(--color-surface-default)]/95 backdrop-blur px-4 py-2 flex flex-wrap items-center justify-between gap-2 shadow-[0_-4px_12px_rgba(15,23,42,0.08)] z-20">
                  <span className="text-sm font-semibold text-[var(--color-text-primary)]">
                    {selectedItems.size} {selectedItems.size === 1 ? 'elemento seleccionado' : 'elementos seleccionados'}
                  </span>
                  <div className="flex gap-2 flex-wrap">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const primerEstudiante = tableData.find(row => selectedItems.has(row.id));
                        if (primerEstudiante) {
                          abrirFeedbackModal(primerEstudiante.alumno);
                        }
                        setSelectedItems(new Set());
                      }}
                      className="h-9 text-xs"
                    >
                      <MessageSquare className="w-4 h-4 mr-2" />
                      Dar Feedback Unificado
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>


      {showMediaPreview && (
        <MediaPreviewModal
          urls={previewUrls}
          initialIndex={previewIndex}
          open={showMediaPreview}
          onClose={() => setShowMediaPreview(false)}
        />
      )}

      {viewingMedia && (
        <MediaViewer
          media={viewingMedia}
          onClose={() => setViewingMedia(null)}
        />
      )}

      <ModalFeedbackSemanal
        open={feedbackModalOpen}
        onOpenChange={setFeedbackModalOpen}
        feedback={selectedFeedbackData?.feedback}
        studentId={selectedFeedbackData?.studentId}
        weekStartISO={selectedFeedbackData?.weekStartISO}
        weekLabel={selectedFeedbackData?.weekLabel}
        onSaved={handleFeedbackSaved}
      />
    </div>
  );
}
