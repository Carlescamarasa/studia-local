
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
  ChevronDown, ChevronRight, PlayCircle
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";
import { displayName, calcularLunesSemanaISO, calcularOffsetSemanas, useEffectiveUser, resolveUserIdActual } from "../components/utils/helpers";
import WeekNavigator from "../components/common/WeekNavigator";
import MediaLinksInput from "../components/common/MediaLinksInput";
import MediaLinksBadges from "../components/common/MediaLinksBadges";
import MediaViewer from "../components/common/MediaViewer";
import MediaPreviewModal from "../components/common/MediaPreviewModal";
import RequireRole from "@/components/auth/RequireRole";
import SessionContentView from "../components/study/SessionContentView";
import { calcularTiempoSesion } from "../components/study/sessionSequence";
import { componentStyles } from "@/design/componentStyles";
import PageHeader from "@/components/ds/PageHeader";
import UnifiedTable from "@/components/tables/UnifiedTable";

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
  const [feedbackDrawer, setFeedbackDrawer] = useState(null);
  const [viewingMedia, setViewingMedia] = useState(null);
  const [showMediaPreview, setShowMediaPreview] = useState(false);
  const [previewUrls, setPreviewUrls] = useState([]);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [expandedSessions, setExpandedSessions] = useState(new Set());

  const effectiveUser = useEffectiveUser();

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

  const { data: usuarios = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => localDataClient.entities.User.list(),
  });

  const { data: asignacionesRaw = [] } = useQuery({
    queryKey: ['asignaciones'],
    queryFn: () => localDataClient.entities.Asignacion.list(),
  });

  const { data: feedbacksSemanalRaw = [] } = useQuery({
    queryKey: ['feedbacksSemanal'],
    queryFn: () => localDataClient.entities.FeedbackSemanal.list('-created_at'),
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
  if (process.env.NODE_ENV === 'development' && feedbacksSemanal.length > 0) {
    console.log('[agenda.jsx] Resolución de usuario:', {
      effectiveUserId: effectiveUser?.id,
      userIdActual,
      totalFeedbacks: feedbacksSemanal.length,
      feedbacksPorProfesor: feedbacksSemanal.filter(f => f.profesorId === userIdActual).length,
      esProfesorOAdmin: effectiveUser?.rolPersonalizado === 'PROF' || effectiveUser?.rolPersonalizado === 'ADMIN',
  });
  }

  const crearFeedbackMutation = useMutation({
    mutationFn: async (data) => {
      // Intentar crear, pero si falla con 409, buscar y actualizar
      try {
        if (process.env.NODE_ENV === 'development') {
          console.log('[agenda.jsx] Intentando crear feedback:', data);
        }
        const resultado = await localDataClient.entities.FeedbackSemanal.create(data);
        if (process.env.NODE_ENV === 'development') {
          console.log('[agenda.jsx] Feedback creado exitosamente:', resultado.id);
        }
        return resultado;
      } catch (error) {
        console.error('[agenda.jsx] Error al crear feedback:', error);
        console.error('[agenda.jsx] Detalles del error:', {
          code: error?.code,
          message: error?.message,
          status: error?.status,
          details: error?.details,
        });
        
        // Si es error 409, buscar el feedback existente directamente en la BD
        if (error?.code === '23505' || error?.message?.includes('duplicate') || error?.status === 409) {
          console.log('[agenda.jsx] Error 409 detectado, buscando feedback existente...');
          // Buscar el feedback existente directamente en la base de datos
          try {
            const feedbacksExistentes = await localDataClient.entities.FeedbackSemanal.filter({
              alumnoId: data.alumnoId,
              profesorId: data.profesorId,
              semanaInicioISO: data.semanaInicioISO,
            });
            
            if (feedbacksExistentes && feedbacksExistentes.length > 0) {
              const feedbackExistente = feedbacksExistentes[0];
              console.log('[agenda.jsx] Feedback existente encontrado, actualizando:', feedbackExistente.id);
              // Actualizar el feedback existente
              return await localDataClient.entities.FeedbackSemanal.update(feedbackExistente.id, data);
            } else {
              console.warn('[agenda.jsx] Error 409 pero no se encontró feedback en BD');
            }
          } catch (searchError) {
            console.error('[agenda.jsx] Error buscando feedback existente:', searchError);
          }
        }
        // Si no es 409 o no se encontró, relanzar el error
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feedbacksSemanal'] });
      toast.success('✅ Feedback guardado');
      setFeedbackDrawer(null);
    },
    onError: (error) => {
      console.error('[agenda.jsx] Error final guardando feedback:', error);
      let errorMsg = '❌ Error al guardar feedback. Inténtalo de nuevo.';
      
      // Mensajes específicos según el tipo de error
      if (error?.code === '23505' || error?.message?.includes('duplicate') || error?.status === 409) {
        errorMsg = '⚠️ Ya existe un feedback para este alumno y semana. Se intentará actualizar automáticamente.';
      } else if (error?.code === 'PGRST204' || error?.code === '23503') {
        errorMsg = '❌ Error de integridad: Verifica que el alumno y profesor existan en la base de datos.';
      } else if (error?.code === '42501' || error?.status === 403) {
        errorMsg = '❌ Error de permisos: No tienes permisos para crear feedback. Verifica tu rol de usuario.';
      } else if (error?.message) {
        errorMsg = `❌ Error: ${error.message}`;
      }
      
      toast.error(errorMsg);
    },
  });

  const actualizarFeedbackMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      if (process.env.NODE_ENV === 'development') {
        console.log('[agenda.jsx] Actualizando feedback:', { id, data });
      }
      try {
        const resultado = await localDataClient.entities.FeedbackSemanal.update(id, data);
        if (process.env.NODE_ENV === 'development') {
          console.log('[agenda.jsx] Feedback actualizado exitosamente');
        }
        return resultado;
      } catch (error) {
        console.error('[agenda.jsx] Error al actualizar feedback:', error);
        console.error('[agenda.jsx] Detalles del error:', {
          code: error?.code,
          message: error?.message,
          status: error?.status,
          details: error?.details,
        });
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feedbacksSemanal'] });
      toast.success('✅ Feedback actualizado');
      setFeedbackDrawer(null);
    },
    onError: (error) => {
      console.error('[agenda.jsx] Error final actualizando feedback:', error);
      let errorMsg = '❌ Error al actualizar feedback. Inténtalo de nuevo.';
      
      // Mensajes específicos según el tipo de error
      if (error?.code === 'PGRST204' || error?.code === '23503') {
        errorMsg = '❌ Error de integridad: Verifica que el alumno y profesor existan en la base de datos.';
      } else if (error?.code === '42501' || error?.status === 403) {
        errorMsg = '❌ Error de permisos: No tienes permisos para actualizar feedback. Verifica tu rol de usuario.';
      } else if (error?.message) {
        errorMsg = `❌ Error: ${error.message}`;
      }
      
      toast.error(errorMsg);
    },
  });

  const eliminarFeedbackMutation = useMutation({
    mutationFn: (id) => localDataClient.entities.FeedbackSemanal.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feedbacksSemanal'] });
      toast.success('✅ Feedback eliminado');
      setFeedbackDrawer(null);
    },
  });

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

  useEffect(() => {
    if (!feedbackDrawer) return;
    
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === '.') {
        e.preventDefault();
        setFeedbackDrawer(null);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        guardarFeedback();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [feedbackDrawer]);

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

  // Todos los profesores y admins pueden ver y dar feedback a TODOS los estudiantes
  // No es necesario que el alumno esté asignado a un profesor en particular
  let estudiantesFiltrados = usuarios.filter(u => u.rolPersonalizado === 'ESTU');

  if (searchTerm) {
    const term = searchTerm.toLowerCase();
    estudiantesFiltrados = estudiantesFiltrados.filter(e => {
      const nombre = displayName(e).toLowerCase();
      const email = (e.email || '').toLowerCase();
      return nombre.includes(term) || email.includes(term);
    });
  }

  const abrirFeedbackDrawer = (alumno, existente = null) => {
    // Si no se pasa un feedback existente, buscar si hay uno en la lista
    // Buscar primero el feedback del profesor actual, sino cualquier feedback de ese alumno/semana
    if (!existente) {
      existente = feedbacksSemanal.find(
        f => f.alumnoId === alumno.id &&
             f.profesorId === userIdActual &&
             f.semanaInicioISO === semanaActualISO
      ) || feedbacksSemanal.find(
        f => f.alumnoId === alumno.id &&
             f.semanaInicioISO === semanaActualISO
      ) || null;
    }

    if (existente) {
      setFeedbackDrawer({
        alumnoId: existente.alumnoId,
        notaProfesor: existente.notaProfesor || '',
        mediaLinks: existente.mediaLinks || [],
        existingId: existente.id,
      });
    } else {
      setFeedbackDrawer({
        alumnoId: alumno.id,
        notaProfesor: '',
        mediaLinks: [],
        existingId: null,
      });
    }
  };

  const guardarFeedback = async () => {
    if (!feedbackDrawer.notaProfesor?.trim()) {
      toast.error('❌ Debes escribir un comentario');
      return;
    }

    const data = {
      alumnoId: feedbackDrawer.alumnoId,
      profesorId: userIdActual,
      semanaInicioISO: semanaActualISO,
      notaProfesor: feedbackDrawer.notaProfesor.trim(),
      mediaLinks: feedbackDrawer.mediaLinks || [],
    };

    if (process.env.NODE_ENV === 'development') {
      console.log('[agenda.jsx] Guardando feedback:', {
        data,
        userIdActual,
        existingId: feedbackDrawer.existingId,
        totalFeedbacks: feedbacksSemanal.length,
      });
    }

    // Verificar si ya existe un feedback para este alumno/profesor/semana
    // El índice único es (alumno_id, profesor_id, semana_inicio_iso)
    // Buscar específicamente el feedback del profesor actual para esa semana
    let feedbackExistente = feedbacksSemanal.find(
      f => f.alumnoId === data.alumnoId &&
           f.profesorId === data.profesorId &&
           f.semanaInicioISO === data.semanaInicioISO
    );

    if (process.env.NODE_ENV === 'development') {
      console.log('[agenda.jsx] Feedback en lista local:', feedbackExistente ? 'encontrado' : 'no encontrado');
      if (feedbackExistente) {
        console.log('[agenda.jsx] Feedback encontrado:', {
          id: feedbackExistente.id,
          alumnoId: feedbackExistente.alumnoId,
          profesorId: feedbackExistente.profesorId,
          semanaInicioISO: feedbackExistente.semanaInicioISO,
        });
      }
    }

    // Si no se encuentra en la lista local, buscar directamente en la BD
    // IMPORTANTE: Buscar solo por alumno y semana, ya que el índice único es (alumno_id, profesor_id, semana_inicio_iso)
    // Si ya existe un feedback para ese alumno/semana (incluso de otro profesor), el 409 ocurrirá
    if (!feedbackExistente && !feedbackDrawer.existingId) {
      try {
        if (process.env.NODE_ENV === 'development') {
          console.log('[agenda.jsx] Buscando feedback en BD...');
        }
        const feedbacksEnBD = await localDataClient.entities.FeedbackSemanal.filter({
          alumnoId: data.alumnoId,
          profesorId: data.profesorId,
          semanaInicioISO: data.semanaInicioISO,
        });
        if (feedbacksEnBD && feedbacksEnBD.length > 0) {
          feedbackExistente = feedbacksEnBD[0];
          if (process.env.NODE_ENV === 'development') {
            console.log('[agenda.jsx] Feedback encontrado en BD:', feedbackExistente.id);
          }
        } else {
          if (process.env.NODE_ENV === 'development') {
            console.log('[agenda.jsx] No se encontró feedback en BD con los filtros exactos');
            // Intentar buscar solo por alumno y semana para ver si hay algún feedback
            const todosFeedbacksAlumno = await localDataClient.entities.FeedbackSemanal.filter({
              alumnoId: data.alumnoId,
              semanaInicioISO: data.semanaInicioISO,
            });
            if (todosFeedbacksAlumno && todosFeedbacksAlumno.length > 0) {
              console.log('[agenda.jsx] Se encontraron feedbacks para este alumno/semana pero de otro profesor:', todosFeedbacksAlumno);
            }
          }
        }
      } catch (error) {
        console.warn('[agenda.jsx] Error buscando feedback en BD:', error);
        // Continuar con el flujo normal si falla la búsqueda
      }
    }

    if (feedbackDrawer.existingId || feedbackExistente) {
      const id = feedbackDrawer.existingId || feedbackExistente.id;
      if (process.env.NODE_ENV === 'development') {
        console.log('[agenda.jsx] Actualizando feedback existente:', id);
      }
      actualizarFeedbackMutation.mutate({ id, data });
    } else {
      if (process.env.NODE_ENV === 'development') {
        console.log('[agenda.jsx] Creando nuevo feedback');
      }
      crearFeedbackMutation.mutate(data);
    }
  };

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
      
      // Logs de depuración
      if (process.env.NODE_ENV === 'development' && feedbacksAlumno.length > 0) {
        console.log('[agenda.jsx] Feedbacks encontrados para alumno/semana:', {
          alumnoId: alumno.id,
          alumnoNombre: displayName(alumno),
          semanaActualISO,
          totalFeedbacks: feedbacksAlumno.length,
          feedbacks: feedbacksAlumno.map(f => ({
            id: f.id,
            profesorId: f.profesorId,
            profesorNombre: displayName(usuarios.find(u => u.id === f.profesorId)),
            coincideConUsuarioActual: f.profesorId === userIdActual,
          })),
          userIdActual,
        });
      }
      
      // Si hay múltiples, preferir el del profesor actual, sino el más reciente
      const feedback = feedbacksAlumno.find(f => f.profesorId === userIdActual) || feedbacksAlumno[0];
      
      if (process.env.NODE_ENV === 'development' && feedbacksAlumno.length > 0) {
        console.log('[agenda.jsx] Feedback seleccionado para row:', {
          alumnoId: alumno.id,
          feedbackId: feedback?.id,
          feedbackProfesorId: feedback?.profesorId,
          feedbackProfesorNombre: displayName(usuarios.find(u => u.id === feedback?.profesorId)),
        });
      }

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

  // Definir columnas de la tabla
  const columns = [
    {
      key: 'estudiante',
      label: 'Estudiante',
      sortable: true,
      sortValue: (row) => displayName(row.alumno),
      render: (row) => (
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 bg-gradient-to-br from-[var(--color-surface-muted)] to-[var(--color-surface-muted)]/20 rounded-full flex items-center justify-center shrink-0">
            <span className="text-[var(--color-text-primary)] font-semibold text-sm">
              {displayName(row.alumno).slice(0, 1).toUpperCase()}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-[var(--color-text-primary)] break-words">
              {displayName(row.alumno)}
            </p>
            <p className="text-xs text-[var(--color-text-secondary)] break-all">
              {row.alumno.email}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: 'pieza',
      label: 'Pieza',
      sortable: true,
      sortValue: (row) => row.asignacionActiva?.piezaSnapshot?.nombre || '',
      render: (row) => {
        if (!row.asignacionActiva || !row.semana) {
          return (
            <div className="text-center py-6 border-2 border-dashed border-[var(--color-border-default)] rounded-2xl bg-[var(--color-surface-muted)]">
              <Target className={`w-10 h-10 mx-auto mb-2 ${componentStyles.empty.emptyIcon}`} />
              <p className="text-sm text-[var(--color-text-secondary)]">Sin asignación esta semana</p>
            </div>
          );
        }
        return (
          <div className={"flex items-start gap-2 py-1 " + componentStyles.components.toneRowPlan}>
            <Music className="w-4 h-4 text-[var(--color-primary)] mt-0.5 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-xs text-[var(--color-text-secondary)] font-medium">Pieza</p>
              <p className="text-sm break-words text-[var(--color-text-primary)] mt-0.5">
                {row.asignacionActiva.piezaSnapshot?.nombre || '—'}
              </p>
            </div>
          </div>
        );
      },
    },
    {
      key: 'semana',
      label: 'Semana del Plan',
      sortable: true,
      sortValue: (row) => row.semana?.nombre || '',
      render: (row) => {
        if (!row.asignacionActiva || !row.semana) {
          return null; // No mostrar nada si no hay asignación
        }
        return (
          <div className={"flex items-start gap-2 py-1 " + componentStyles.components.toneRowSemana}>
            <Target className="w-4 h-4 text-[var(--color-primary)] mt-0.5 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-xs text-[var(--color-text-secondary)] font-medium">Semana del Plan</p>
              <p className="text-sm break-words text-[var(--color-text-primary)] mt-0.5">
                {row.semana.nombre}
              </p>
              {row.semana.objetivo && (
                <p className="text-xs text-[var(--color-text-secondary)] italic mt-1 break-words">
                  "{row.semana.objetivo}"
                </p>
              )}
            </div>
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
          <div className="space-y-2">
            <p className="text-xs font-semibold text-[var(--color-text-primary)] mb-2">
              {row.semana.sesiones.length} sesiones programadas:
            </p>
            {row.semana.sesiones.map((sesion, sesionIdx) => {
              const sesionKey = `${row.alumno.id}-${row.semanaIdx}-${sesionIdx}`;
              const isExpanded = expandedSessions.has(sesionKey);
              const tiempo = calcularTiempoSesion(sesion);
              const mins = Math.floor(tiempo / 60);
              const secs = tiempo % 60;

              return (
                <div
                  key={sesionIdx}
                  className="ml-4 border-l-2 border-[var(--color-info)]/40 bg-[var(--color-info)]/10 rounded-r-lg p-2.5 transition-all hover:bg-[var(--color-info)]/20 cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleSession(sesionKey);
                  }}
                >
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
                        <span className="text-sm font-medium text-[var(--color-text-primary)]">
                          {sesion.nombre}
                        </span>
                        <Badge 
                          variant="outline" 
                          className={tiempo > 0 ? componentStyles.status.badgeSuccess : componentStyles.status.badgeDefault}
                        >
                          <Clock className="w-3 h-3 mr-1" />
                          {mins}:{String(secs).padStart(2, '0')} min
                        </Badge>
                        {sesion.foco && (
                          <Badge className={`rounded-full ${focoColors[sesion.foco]}`} variant="outline">
                            {focoLabels[sesion.foco]}
                          </Badge>
                        )}
                      </div>
                      {isExpanded && (
                        <div className="ml-2 mt-2" onClick={(e) => e.stopPropagation()}>
                          <SessionContentView sesion={sesion} compact />
                        </div>
                      )}
                    </div>
                  </div>
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
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                abrirFeedbackDrawer(row.alumno);
              }}
              className={`${componentStyles.buttons.outline}`}
            >
              <MessageSquare className="w-4 h-4 mr-2" />
              Dar feedback
            </Button>
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
                  abrirFeedbackDrawer(row.alumno, row.feedback);
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
          </div>
        );
      },
    }] : []),
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header de página unificado */}
      <PageHeader
        icon={Calendar}
        title="Agenda Semanal"
        subtitle="Vista por estudiante y semana"
        filters={
          <WeekNavigator 
            mondayISO={semanaActualISO}
            onPrev={() => cambiarSemana(-1)}
            onNext={() => cambiarSemana(1)}
            onToday={irSemanaActual}
          >
            {/* Búsqueda */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-secondary)]" />
              <Input
                id="search-input"
                placeholder="Buscar estudiante... (Ctrl/⌘+K)"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`w-full pl-9 pr-9 ${componentStyles.controls.inputDefault}`}
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
          </WeekNavigator>
        }
      />

      <div className={componentStyles.layout.page}>

        {/* Tabla de estudiantes */}
        {/* Nota: UnifiedTable maneja sus propios Cards en móvil, no necesita contenedor adicional */}
        <div className={componentStyles.layout.tableSection}>
          <UnifiedTable
            columns={columns}
            data={tableData}
            selectable={true}
            bulkActions={[
              {
                id: 'feedback',
                label: 'Dar feedback',
                icon: MessageSquare,
                onClick: (ids) => {
                  const primerEstudiante = tableData.find(row => ids.includes(row.id));
                  if (primerEstudiante) {
                    abrirFeedbackDrawer(primerEstudiante.alumno);
                  }
                },
              },
            ]}
            getRowActions={(row) => {
              const actions = [];
              if (row.asignacionActiva) {
                actions.push({
                  id: 'view',
                  label: 'Ver detalle de asignación',
                  onClick: () => navigate(createPageUrl(`asignacion-detalle?id=${row.asignacionActiva.id}`)),
                  icon: <Eye className="w-4 h-4" />,
                });
              }
              return actions;
            }}
            emptyMessage={searchTerm ? 'No se encontraron estudiantes' : 'No hay estudiantes asignados'}
            emptyIcon={Users}
            keyField="id"
          />
        </div>
      </div>

      {/* Modal de feedback */}
      {feedbackDrawer && (
        <>
          <div 
            className="fixed inset-0 bg-black/40 z-[100]"
            onClick={() => setFeedbackDrawer(null)}
          />
          <div className="fixed inset-0 z-[110] flex items-center justify-center pointer-events-none p-4 overflow-y-auto">
            <div 
              className="bg-[var(--color-surface-elevated)] w-full max-w-lg max-h-[95vh] shadow-card rounded-2xl flex flex-col pointer-events-auto my-4 border border-[var(--color-border-default)]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="border-b border-[var(--color-border-default)] bg-[var(--color-surface-muted)] rounded-t-2xl px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <MessageSquare className="w-6 h-6 text-[var(--color-text-primary)]" />
                    <div>
                      <h2 className="text-xl font-bold text-[var(--color-text-primary)]">
                        {feedbackDrawer.existingId ? 'Editar Feedback' : 'Dar Feedback'}
                      </h2>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => setFeedbackDrawer(null)} className="text-[var(--color-text-primary)] hover:bg-[var(--color-surface)] h-11 w-11 sm:h-9 sm:w-9 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 rounded-xl touch-manipulation" aria-label="Cerrar modal">
                    <X className="w-5 h-5" />
                  </Button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <div>
                  <Label htmlFor="nota" className="text-sm font-medium text-[var(--color-text-primary)]">Observaciones del profesor *</Label>
                  <Textarea
                    id="nota"
                    value={feedbackDrawer.notaProfesor}
                    onChange={(e) => setFeedbackDrawer({...feedbackDrawer, notaProfesor: e.target.value})}
                    placeholder="Comentarios, áreas de mejora, felicitaciones..."
                    rows={8}
                    className={`resize-none mt-1 ${componentStyles.controls.inputDefault}`}
                  />
                  <p className="text-xs text-[var(--color-text-secondary)] mt-1">
                    Escribe observaciones sobre el progreso del estudiante esta semana
                  </p>
                </div>

                <MediaLinksInput
                  value={feedbackDrawer.mediaLinks}
                  onChange={(links) => setFeedbackDrawer({...feedbackDrawer, mediaLinks: links})}
                  onPreview={(idx) => handlePreviewMedia(idx, feedbackDrawer.mediaLinks)}
                />
              </div>

              <div className="border-t border-[var(--color-border-default)] px-6 py-4 bg-[var(--color-surface-muted)] rounded-b-2xl">
                <div className="flex gap-3 mb-2">
                  <Button variant="outline" onClick={() => setFeedbackDrawer(null)} className={`flex-1 ${componentStyles.buttons.outline}`}>
                    Cancelar
                  </Button>
                  <Button 
                    variant="primary"
                    onClick={guardarFeedback} 
                    disabled={crearFeedbackMutation.isPending || actualizarFeedbackMutation.isPending} 
                    className={`flex-1 ${componentStyles.buttons.primary}`}
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Guardar
                  </Button>
                </div>
                <p className="text-xs text-center text-[var(--color-text-secondary)]">
                  Ctrl/⌘+Intro : guardar • Ctrl/⌘+. : cancelar
                </p>
              </div>
            </div>
          </div>
        </>
      )}

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
    </div>
  );
}
