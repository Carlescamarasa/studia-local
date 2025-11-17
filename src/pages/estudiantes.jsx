import React, { useState, useMemo, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getCurrentUser } from "@/api/localDataClient";
import { Card, CardContent, CardHeader, CardTitle, Badge } from "@/components/ds";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Users, Search, MessageSquare, TrendingUp,
  Clock, Star, X, Save, AlertCircle, Edit, UserCog,
  Eye, Activity, Target, Calendar
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";
import { displayName, calcularLunesSemanaISO, formatLocalDate, parseLocalDate, formatDurationMinutes } from "../components/utils/helpers";
import UnifiedTable from "@/components/tables/UnifiedTable";
import MediaLinksInput from "../components/common/MediaLinksInput";
import MediaPreviewModal from "../components/common/MediaPreviewModal";
import RequireRole from "@/components/auth/RequireRole";
import PageHeader from "@/components/ds/PageHeader";
import { componentStyles } from "@/design/componentStyles";

function EstudiantesPageContent() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [showFeedbackDrawer, setShowFeedbackDrawer] = useState(false);
  const [selectedAlumno, setSelectedAlumno] = useState(null);
  const [feedbackData, setFeedbackData] = useState({
    semanaInicioISO: calcularLunesSemanaISO(formatLocalDate(new Date())),
    notaProfesor: '',
    mediaLinks: [],
  });
  const [showMediaPreview, setShowMediaPreview] = useState(false);
  const [previewUrls, setPreviewUrls] = useState([]);
  const [previewIndex, setPreviewIndex] = useState(0);

  const currentUser = getCurrentUser();

  const isProf = currentUser?.rolPersonalizado === 'PROF';
  const isAdmin = currentUser?.rolPersonalizado === 'ADMIN';
  const isAdminOrProf = isAdmin || isProf;

  const { data: asignaciones = [], isLoading: loadingAsignaciones } = useQuery({
    queryKey: ['asignacionesProfesor', currentUser?.id],
    queryFn: async () => {
      const allAsignaciones = await base44.entities.Asignacion.list();
      return allAsignaciones;
    },
    enabled: !!currentUser,
  });

  const { data: usuariosAdmin = [] } = useQuery({
    queryKey: ['usersAdmin'],
    queryFn: async () => {
      const users = await base44.entities.User.list();
      return users;
    },
    enabled: isAdmin,
  });

  const { data: registros = [] } = useQuery({
    queryKey: ['registrosSesion'],
    queryFn: () => base44.entities.RegistroSesion.list('-inicioISO'),
  });

  const { data: feedbacksExistentes = [] } = useQuery({
    queryKey: ['feedbacksSemanal'],
    queryFn: () => base44.entities.FeedbackSemanal.list('-created_date'),
  });

  const guardarFeedbackMutation = useMutation({
    mutationFn: async (data) => {
      const feedbackExistente = feedbacksExistentes.find(
        f => f.alumnoId === selectedAlumno.id &&
             f.semanaInicioISO === data.semanaInicioISO
      );

      if (feedbackExistente) {
        return base44.entities.FeedbackSemanal.update(feedbackExistente.id, data);
      }
      return base44.entities.FeedbackSemanal.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feedbacksSemanal'] });
      toast.success('✅ Feedback guardado');
      setShowFeedbackDrawer(false);
      setSelectedAlumno(null);
    },
  });

  const estudiantes = useMemo(() => {
    if (!currentUser) return [];

    if (isAdmin && usuariosAdmin.length > 0) {
      const estudiantesAdmin = usuariosAdmin.filter(u => u.rolPersonalizado === 'ESTU');
      return estudiantesAdmin;
    }

    if (isProf || isAdmin) {
      const misAsignaciones = asignaciones.filter(a =>
        a.profesorId === currentUser.id &&
        (a.estado === 'publicada' || a.estado === 'en_curso' || a.estado === 'borrador')
      );

      const alumnosMap = new Map();

      misAsignaciones.forEach(asig => {
        if (!alumnosMap.has(asig.alumnoId)) {
          const alumnoInfo = {
            id: asig.alumnoId,
            email: '',
            nombreCompleto: null,
            full_name: null,
            rolPersonalizado: 'ESTU',
            profesorAsignadoId: currentUser.id,
          };

          if (asig.alumno) {
            alumnoInfo.email = asig.alumno.email || '';
            alumnoInfo.nombreCompleto = asig.alumno.nombreCompleto || asig.alumno.full_name;
            alumnoInfo.full_name = asig.alumno.full_name;
          }

          alumnosMap.set(asig.alumnoId, alumnoInfo);
        }
      });

      return Array.from(alumnosMap.values());
    }

    return [];
  }, [currentUser, usuariosAdmin, asignaciones, isProf, isAdmin]);

  const filteredEstudiantes = useMemo(() => {
    if (!searchTerm.trim()) return estudiantes;

    const term = searchTerm.toLowerCase();
    return estudiantes.filter(e => {
      const nombre = displayName(e).toLowerCase();
      const email = (e.email || '').toLowerCase();
      const id = (e.id || '').toLowerCase();
      return nombre.includes(term) || email.includes(term) || id.includes(term);
    });
  }, [estudiantes, searchTerm]);

  const calcularEstadisticasSemana = (alumnoId, semanaISO) => {
    const registrosAlumno = registros.filter(r => {
      if (r.alumnoId !== alumnoId) return false;
      if (!r.inicioISO) return false;
      const registroSemana = calcularLunesSemanaISO(r.inicioISO.split('T')[0]);
      return registroSemana === semanaISO;
    });

    const minutosReales = Math.floor(
      registrosAlumno.reduce((sum, r) => sum + (r.duracionRealSeg || 0), 0) / 60
    );

    const conCalificacion = registrosAlumno.filter(r =>
      r.calificacion !== undefined && r.calificacion !== null
    );
    const calidadMedia = conCalificacion.length > 0
      ? (conCalificacion.reduce((sum, r) => sum + r.calificacion, 0) / conCalificacion.length).toFixed(1)
      : 0;

    return { minutosReales, calidadMedia, sesionesRealizadas: registrosAlumno.length };
  };

  const simularAlumno = (alumno) => {
    sessionStorage.setItem('originalUser', JSON.stringify(currentUser));
    sessionStorage.setItem('simulatingUser', JSON.stringify(alumno));
    sessionStorage.setItem('originalPath', window.location.pathname);
    navigate(createPageUrl('hoy'), { replace: true });
    window.location.reload();
  };

  const handleAbrirFeedback = (alumno) => {
    setSelectedAlumno(alumno);
    const hoy = formatLocalDate(new Date());
    const semanaActual = calcularLunesSemanaISO(hoy);

    const feedbackExistente = feedbacksExistentes.find(
      f => f.alumnoId === alumno.id && f.semanaInicioISO === semanaActual
    );

    setFeedbackData({
      semanaInicioISO: semanaActual,
      notaProfesor: feedbackExistente?.notaProfesor || '',
      mediaLinks: feedbackExistente?.mediaLinks || [],
    });
    setShowFeedbackDrawer(true);
  };

  const handleGuardarFeedback = () => {
    if (!selectedAlumno) return;

    if (!feedbackData.notaProfesor?.trim()) {
      toast.error('❌ Debes escribir un comentario');
      return;
    }

    const asignacionAlumno = asignaciones.find(a =>
      a.alumnoId === selectedAlumno.id &&
      a.estado !== 'cerrada'
    );

    guardarFeedbackMutation.mutate({
      alumnoId: selectedAlumno.id,
      profesorId: currentUser.id,
      asignacionId: asignacionAlumno?.id || null,
      semanaInicioISO: feedbackData.semanaInicioISO,
      notaProfesor: feedbackData.notaProfesor.trim(),
      mediaLinks: feedbackData.mediaLinks || [],
    });
  };

  const handlePreviewMedia = (index, urls) => {
    setPreviewUrls(urls);
    setPreviewIndex(index);
    setShowMediaPreview(true);
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      const active = document.activeElement;
      const inInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes(active?.tagName) || active?.isContentEditable;

      if ((e.ctrlKey || e.metaKey) && e.key === 'k' && !inInput) {
        e.preventDefault();
        document.querySelector('input[placeholder*="Buscar"]')?.focus();
      }

      if (showFeedbackDrawer) {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
          e.preventDefault();
          handleGuardarFeedback();
        }
        if ((e.ctrlKey || e.metaKey) && e.key === '.') {
          e.preventDefault();
          setShowFeedbackDrawer(false);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showFeedbackDrawer]);

  const semanaActual = calcularLunesSemanaISO(formatLocalDate(new Date()));
  const estadisticasAlumnos = filteredEstudiantes.map(alumno => {
    const stats = calcularEstadisticasSemana(alumno.id, semanaActual);
    return { ...alumno, ...stats };
  });

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        icon={Users}
        title="Mis Estudiantes"
        subtitle="Gestiona el progreso y feedback de tus estudiantes"
        filters={
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-secondary)]" />
            <Input
              placeholder="Buscar estudiantes... (Ctrl/⌘+K)"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`pl-10 h-10 ${componentStyles.controls.inputDefault}`}
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
        }
      />

      <div className="max-w-[1600px] mx-auto p-4 md:p-6 lg:p-8">
        <Card className={componentStyles.containers.cardBase}>
          <CardHeader>
            <CardTitle className="text-lg">
              Estudiantes ({estadisticasAlumnos.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingAsignaciones ? (
              <div className="text-center py-12">
                <div className="w-12 h-12 border-4 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className={componentStyles.typography.bodyText}>Cargando estudiantes...</p>
              </div>
            ) : estadisticasAlumnos.length === 0 ? (
              <div className="text-center py-12">
                <Users className={`w-16 h-16 mx-auto mb-4 ${componentStyles.empty.emptyIcon}`} />
                <p className={`${componentStyles.empty.emptyText} mb-2`}>
                  {searchTerm ? 'No se encontraron estudiantes' : 'No tienes estudiantes asignados'}
                </p>
                {!searchTerm && isProf && (
                  <Alert className={`mt-4 ${componentStyles.containers.panelBase} border-[var(--color-warning)] bg-[var(--color-warning)]/10 text-left max-w-lg mx-auto`}>
                    <AlertCircle className="h-4 w-4 text-[var(--color-warning)]" />
                    <AlertDescription>
                      <strong className={`${componentStyles.typography.sectionTitle} text-[var(--color-warning)]`}>¿Dónde están mis estudiantes?</strong>
                      <ul className={`list-disc list-inside mt-2 space-y-1 ${componentStyles.typography.smallMetaText} text-[var(--color-warning)]`}>
                        <li>Necesitas tener <strong>asignaciones activas</strong> creadas para tus alumnos</li>
                        <li>Las asignaciones deben estar en estado: <strong>publicada, en curso o borrador</strong></li>
                        <li>Revisa la consola del navegador para logs de diagnóstico (F12 → Console)</li>
                      </ul>
                      <div className={`mt-3 p-2 bg-[var(--color-warning)]/20 rounded-lg ${componentStyles.typography.smallMetaText} font-mono text-[var(--color-warning)]`}>
                        📊 Asignaciones encontradas: {asignaciones.filter(a => a.profesorId === currentUser?.id).length}
                      </div>
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            ) : (
              <UnifiedTable
                columns={[
                  {
                    key: 'nombre',
                    label: 'Estudiante',
                    sortable: true,
                    render: (e) => (
                      <div className="min-w-0">
                        <p className="font-semibold truncate">{e?.nombreCompleto?.trim() || displayName(e)}</p>
                        <p className="text-xs text-[var(--color-text-secondary)] truncate">{e.email}</p>
                      </div>
                    ),
                    sortValue: (e) => displayName(e)
                  },
                  {
                    key: 'minutos',
                    label: 'Min. Semana',
                    sortable: true,
                    render: (e) => (
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-[var(--color-info)] shrink-0" />
                        <span className="font-medium">{formatDurationMinutes(e.minutosReales)}</span>
                      </div>
                    ),
                    sortValue: (e) => e.minutosReales
                  },
                  {
                    key: 'calidad',
                    label: 'Calidad Media',
                    sortable: true,
                    render: (e) => (
                      <div className="flex items-center gap-2">
                        <Star className="w-4 h-4 text-[var(--color-warning)] shrink-0" />
                        <span className="font-medium">{e.calidadMedia}/4</span>
                      </div>
                    ),
                    sortValue: (e) => parseFloat(e.calidadMedia)
                  }
                ]}
                data={estadisticasAlumnos}
                getRowActions={(alumno) => {
                  const asignacionesAlumno = asignaciones.filter(a => 
                    a.alumnoId === alumno.id && 
                    (a.estado === 'publicada' || a.estado === 'en_curso' || a.estado === 'borrador')
                  );
                  const asignacionActiva = asignacionesAlumno.find(a => 
                    a.estado === 'publicada' || a.estado === 'en_curso'
                  );

                  return [
                  {
                      id: 'feedback',
                    label: 'Dar feedback',
                    icon: <MessageSquare className="w-4 h-4" />,
                    onClick: () => handleAbrirFeedback(alumno),
                  },
                    {
                      id: 'estadisticas',
                      label: 'Ver estadísticas',
                      icon: <Activity className="w-4 h-4" />,
                      onClick: () => navigate(createPageUrl(`estadisticas?alumnos=${alumno.id}`)),
                    },
                    ...(asignacionActiva ? [{
                      id: 'asignacion',
                      label: 'Ver asignación',
                      icon: <Target className="w-4 h-4" />,
                      onClick: () => navigate(createPageUrl(`asignacion-detalle?id=${asignacionActiva.id}`)),
                    }] : []),
                    {
                      id: 'asignaciones',
                      label: 'Ver todas las asignaciones',
                      icon: <Calendar className="w-4 h-4" />,
                      onClick: () => navigate(createPageUrl(`asignaciones?alumno=${alumno.id}`)),
                    },
                  ...(isAdminOrProf && alumno.id !== currentUser?.id ? [{
                    id: 'impersonate',
                    label: 'Ver como estudiante',
                      icon: <Eye className="w-4 h-4" />,
                    onClick: () => simularAlumno(alumno),
                  }] : []),
                  ];
                }}
                keyField="id"
                emptyMessage="No hay estudiantes"
              />
            )}
          </CardContent>
        </Card>
      </div>

      {showFeedbackDrawer && selectedAlumno && (
        <>
          <div className="fixed inset-0 bg-black/40 z-50" onClick={() => setShowFeedbackDrawer(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-end pointer-events-none overflow-hidden">
            <div
              className="bg-card w-full max-w-2xl h-full shadow-card flex flex-col animate-in slide-in-from-right pointer-events-auto overflow-hidden rounded-l-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className={`border-b border-[var(--color-border-default)] px-6 py-4 flex items-center justify-between bg-[var(--color-info)] sticky top-0 z-10`}>
                <div className="flex items-center gap-3 text-[var(--color-text-inverse)]">
                  <MessageSquare className="w-6 h-6" />
                  <div>
                    <h2 className={componentStyles.typography.pageTitle}>Feedback Semanal</h2>
                    <p className={`${componentStyles.typography.bodyText} text-[var(--color-text-inverse)]/90`}>{displayName(selectedAlumno)}</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowFeedbackDrawer(false)}
                  className={`text-[var(--color-text-inverse)] hover:bg-[var(--color-text-inverse)]/20 h-9 w-9 rounded-xl`}
                  aria-label="Cerrar drawer"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <div>
                  <Label htmlFor="semana">Semana (Lunes inicio)</Label>
                  <Input
                    id="semana"
                    type="date"
                    value={feedbackData.semanaInicioISO}
                    onChange={(e) => {
                      const nuevaSemana = calcularLunesSemanaISO(e.target.value);
                      setFeedbackData({ ...feedbackData, semanaInicioISO: nuevaSemana });
                    }}
                    className={componentStyles.controls.inputDefault}
                  />
                  <p className={`${componentStyles.typography.smallMetaText} mt-1`}>
                    Semana ISO: {parseLocalDate(feedbackData.semanaInicioISO).toLocaleDateString('es-ES', {
                      weekday: 'long', day: 'numeric', month: 'long'
                    })}
                  </p>
                </div>

                <Card className={`${componentStyles.items.itemCardHighlight} border-[var(--color-info)] bg-[var(--color-info)]/10`}>
                  <CardContent className="pt-4">
                    <h3 className={`${componentStyles.typography.sectionTitle} mb-3 text-[var(--color-info)]`}>Resumen de la Semana</h3>
                    {(() => {
                      const stats = calcularEstadisticasSemana(selectedAlumno.id, feedbackData.semanaInicioISO);
                      return (
                        <div className="grid grid-cols-3 gap-3">
                          <div className="text-center">
                            <Clock className="w-5 h-5 mx-auto mb-1 text-[var(--color-info)]" />
                            <p className={`${componentStyles.typography.cardTitle} text-[var(--color-info)]`}>{stats.minutosReales}</p>
                            <p className={`${componentStyles.typography.smallMetaText} text-[var(--color-info)]`}>Minutos</p>
                          </div>
                          <div className="text-center">
                            <TrendingUp className="w-5 h-5 mx-auto mb-1 text-[var(--color-info)]" />
                            <p className={`${componentStyles.typography.cardTitle} text-[var(--color-info)]`}>{stats.sesionesRealizadas}</p>
                            <p className={`${componentStyles.typography.smallMetaText} text-[var(--color-info)]`}>Sesiones</p>
                          </div>
                          <div className="text-center">
                            <Star className="w-5 h-5 mx-auto mb-1 text-[var(--color-info)]" />
                            <p className={`${componentStyles.typography.cardTitle} text-[var(--color-info)]`}>{stats.calidadMedia}/4</p>
                            <p className={`${componentStyles.typography.smallMetaText} text-[var(--color-info)]`}>Calidad</p>
                          </div>
                        </div>
                      );
                    })()}
                  </CardContent>
                </Card>

                <div>
                  <Label htmlFor="notas">Observaciones del profesor *</Label>
                  <Textarea
                    id="notas"
                    value={feedbackData.notaProfesor}
                    onChange={(e) => setFeedbackData({ ...feedbackData, notaProfesor: e.target.value })}
                    placeholder="Comentarios sobre el progreso, áreas de mejora, logros destacados..."
                    rows={8}
                    className={`${componentStyles.controls.inputDefault} resize-none`}
                  />
                  <p className={`${componentStyles.typography.smallMetaText} mt-1`}>
                    Escribe observaciones sobre el progreso del estudiante esta semana
                  </p>
                </div>

                <MediaLinksInput
                  value={feedbackData.mediaLinks}
                  onChange={(links) => setFeedbackData({...feedbackData, mediaLinks: links})}
                  onPreview={(idx) => handlePreviewMedia(idx, feedbackData.mediaLinks)}
                />
              </div>

              <div className={`border-t border-[var(--color-border-default)] px-6 py-4 bg-[var(--color-surface-muted)] sticky bottom-0`}>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setShowFeedbackDrawer(false)}
                    className={`flex-1 ${componentStyles.buttons.outline}`}
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleGuardarFeedback}
                    disabled={guardarFeedbackMutation.isPending}
                    className={`flex-1 ${componentStyles.buttons.primary} shadow-sm`}
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {guardarFeedbackMutation.isPending ? 'Guardando...' : 'Guardar'}
                  </Button>
                </div>
                <p className={`${componentStyles.typography.smallMetaText} text-center mt-2`}>
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
    </div>
  );
}

export default function EstudiantesPage() {
  return (
    <RequireRole anyOf={['PROF', 'ADMIN']}>
      <EstudiantesPageContent />
    </RequireRole>
  );
}