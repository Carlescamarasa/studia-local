import React, { useState, useMemo, useEffect } from "react";
import { localDataClient } from "@/api/localDataClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, Badge } from "@/components/ds";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Users, Search, MessageSquare, TrendingUp,
  Clock, Star, X, Save, AlertCircle, Edit, UserCog,
  Eye, Activity, Target, Calendar
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";
import { displayName, calcularLunesSemanaISO, formatLocalDate, parseLocalDate, formatDurationMinutes, useEffectiveUser } from "../components/utils/helpers";
import UnifiedTable from "@/components/tables/UnifiedTable";
import MediaLinksInput from "../components/common/MediaLinksInput";
import MediaPreviewModal from "../components/common/MediaPreviewModal";
import RequireRole from "@/components/auth/RequireRole";
import PageHeader from "@/components/ds/PageHeader";
import { LoadingSpinner } from "@/components/ds";
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

  const effectiveUser = useEffectiveUser();

  const isProf = effectiveUser?.rolPersonalizado === 'PROF';
  const isAdmin = effectiveUser?.rolPersonalizado === 'ADMIN';
  const isAdminOrProf = isAdmin || isProf;

  const { data: asignaciones = [], isLoading: loadingAsignaciones } = useQuery({
    queryKey: ['asignacionesProfesor', effectiveUser?.id],
    queryFn: async () => {
      const allAsignaciones = await localDataClient.entities.Asignacion.list();
      return allAsignaciones;
    },
    enabled: !!effectiveUser,
  });

  const { data: usuariosAdmin = [] } = useQuery({
    queryKey: ['usersAdmin'],
    queryFn: async () => {
      const users = await localDataClient.entities.User.list();
      return users;
    },
    enabled: isAdmin,
  });

  const { data: registros = [] } = useQuery({
    queryKey: ['registrosSesion'],
    queryFn: () => localDataClient.entities.RegistroSesion.list('-inicioISO'),
  });

  const { data: feedbacksExistentes = [] } = useQuery({
    queryKey: ['feedbacksSemanal'],
    queryFn: () => localDataClient.entities.FeedbackSemanal.list('-created_date'),
  });

  const guardarFeedbackMutation = useMutation({
    mutationFn: async (data) => {
      const feedbackExistente = feedbacksExistentes.find(
        f => f.alumnoId === selectedAlumno.id &&
             f.semanaInicioISO === data.semanaInicioISO
      );

      if (feedbackExistente) {
        return localDataClient.entities.FeedbackSemanal.update(feedbackExistente.id, data);
      }
      return localDataClient.entities.FeedbackSemanal.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feedbacksSemanal'] });
      toast.success('✅ Feedback guardado');
      setShowFeedbackDrawer(false);
      setSelectedAlumno(null);
    },
  });

  const estudiantes = useMemo(() => {
    if (!effectiveUser) return [];

    if (isAdmin && usuariosAdmin.length > 0) {
      const estudiantesAdmin = usuariosAdmin.filter(u => u.rolPersonalizado === 'ESTU');
      return estudiantesAdmin;
    }

    if (isProf || isAdmin) {
      const misAsignaciones = asignaciones.filter(a =>
        a.profesorId === effectiveUser.id &&
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
            profesorAsignadoId: effectiveUser.id,
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
  }, [effectiveUser, usuariosAdmin, asignaciones, isProf, isAdmin]);

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
      profesorId: effectiveUser.id,
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

      <div className={componentStyles.layout.page}>
        <Card className={componentStyles.containers.cardBase}>
          <CardHeader>
            <CardTitle className="text-lg">
              Estudiantes ({estadisticasAlumnos.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingAsignaciones ? (
              <div className="text-center py-12">
                <LoadingSpinner 
                  size="xl" 
                  variant="inline" 
                  text="Cargando estudiantes..." 
                />
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
                        📊 Asignaciones encontradas: {asignaciones.filter(a => a.profesorId === effectiveUser?.id).length}
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
                  ];
                }}
                keyField="id"
                emptyMessage="No hay estudiantes"
              />
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={showFeedbackDrawer} onOpenChange={setShowFeedbackDrawer}>
        <DialogContent size="lg" className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <MessageSquare className="w-5 h-5 sm:w-6 sm:h-6 text-[var(--color-info)]" />
              <div>
                <DialogTitle className={componentStyles.typography.pageTitle}>Feedback Semanal</DialogTitle>
                <DialogDescription>{displayName(selectedAlumno)}</DialogDescription>
              </div>
            </div>
          </DialogHeader>
          
          {selectedAlumno && (
            <div className="pt-3 sm:pt-4 space-y-3 sm:space-y-4">
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

              {/* Estadísticas inline sin cuadro */}
              {(() => {
                const stats = calcularEstadisticasSemana(selectedAlumno.id, feedbackData.semanaInicioISO);
                return (
                  <div className="flex gap-4 sm:gap-6 justify-center items-center pb-2 sm:pb-3 border-b border-[var(--color-border-default)]">
                    <div className="text-center">
                      <Clock className="w-4 h-4 sm:w-5 sm:h-5 mx-auto mb-1 text-[var(--color-info)]" />
                      <p className="text-base sm:text-lg font-bold text-[var(--color-text-primary)]">{stats.minutosReales}</p>
                      <p className="text-xs sm:text-sm text-[var(--color-text-secondary)]">Minutos</p>
                    </div>
                    
                    <div className="text-center">
                      <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 mx-auto mb-1 text-[var(--color-info)]" />
                      <p className="text-base sm:text-lg font-bold text-[var(--color-text-primary)]">{stats.sesionesRealizadas}</p>
                      <p className="text-xs sm:text-sm text-[var(--color-text-secondary)]">Sesiones</p>
                    </div>
                    
                    <div className="text-center">
                      <Star className="w-4 h-4 sm:w-5 sm:h-5 mx-auto mb-1 text-[var(--color-info)]" />
                      <p className="text-base sm:text-lg font-bold text-[var(--color-text-primary)]">{stats.calidadMedia}/4</p>
                      <p className="text-xs sm:text-sm text-[var(--color-text-secondary)]">Calidad</p>
                    </div>
                  </div>
                );
              })()}

              <div>
                <Label htmlFor="notas">Observaciones del profesor *</Label>
                <Textarea
                  id="notas"
                  value={feedbackData.notaProfesor}
                  onChange={(e) => setFeedbackData({ ...feedbackData, notaProfesor: e.target.value })}
                  placeholder="Comentarios sobre el progreso, áreas de mejora, logros destacados..."
                  rows={6}
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

              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setShowFeedbackDrawer(false)}
                  className={`flex-1 text-xs sm:text-sm h-9 sm:h-10 ${componentStyles.buttons.outline}`}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleGuardarFeedback}
                  disabled={guardarFeedbackMutation.isPending}
                  className={`flex-1 text-xs sm:text-sm h-9 sm:h-10 ${componentStyles.buttons.primary}`}
                >
                  <Save className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1" />
                  {guardarFeedbackMutation.isPending ? 'Guardando...' : 'Guardar'}
                </Button>
              </div>
              <p className={`${componentStyles.typography.smallMetaText} text-center`}>
                Ctrl/⌘+Intro : guardar • Ctrl/⌘+. : cancelar
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>

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