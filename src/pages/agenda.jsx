
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, Badge } from "@/components/ds";
import { Button } from "@/components/ds/Button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Calendar, User, Music, Target, MessageSquare, 
  Search, X, Edit, Trash2, Save, Eye
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";
import { displayName, calcularLunesSemanaISO, calcularOffsetSemanas } from "../components/utils/helpers";
import WeekNavigator from "../components/common/WeekNavigator";
import MediaLinksInput from "../components/common/MediaLinksInput";
import MediaLinksBadges from "../components/common/MediaLinksBadges";
import MediaViewer from "../components/common/MediaViewer";
import MediaPreviewModal from "../components/common/MediaPreviewModal";
import RequireRole from "@/components/auth/RequireRole";
import SessionContentView from "../components/study/SessionContentView";
import { calcularTiempoSesion } from "../components/study/sessionSequence";

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

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: usuarios = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
  });

  const { data: asignaciones = [] } = useQuery({
    queryKey: ['asignaciones'],
    queryFn: () => base44.entities.Asignacion.list(),
  });

  const { data: feedbacksSemanal = [] } = useQuery({
    queryKey: ['feedbacksSemanal'],
    queryFn: () => base44.entities.FeedbackSemanal.list('-created_date'),
  });

  const crearFeedbackMutation = useMutation({
    mutationFn: (data) => base44.entities.FeedbackSemanal.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feedbacksSemanal'] });
      toast.success('✅ Feedback guardado');
      setFeedbackDrawer(null);
    },
  });

  const actualizarFeedbackMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.FeedbackSemanal.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feedbacksSemanal'] });
      toast.success('✅ Feedback actualizado');
      setFeedbackDrawer(null);
    },
  });

  const eliminarFeedbackMutation = useMutation({
    mutationFn: (id) => base44.entities.FeedbackSemanal.delete(id),
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

  const isProfesorOrAdmin = currentUser?.rolPersonalizado === 'PROF' || currentUser?.rolPersonalizado === 'ADMIN';

  let estudiantesFiltrados = usuarios.filter(u => u.rolPersonalizado === 'ESTU');
  
  if (currentUser?.rolPersonalizado === 'PROF') {
    const directos = estudiantesFiltrados.filter(e => e.profesorAsignadoId === currentUser.id);
    if (directos.length > 0) {
      estudiantesFiltrados = directos;
    } else {
      const asignacionesProf = asignaciones.filter(a => 
        a.profesorId === currentUser.id && 
        (a.estado === 'publicada' || a.estado === 'en_curso' || a.estado === 'borrador')
      );
      const alumnoIds = [...new Set(asignacionesProf.map(a => a.alumnoId))];
      estudiantesFiltrados = estudiantesFiltrados.filter(e => alumnoIds.includes(e.id));
    }
  }

  if (searchTerm) {
    const term = searchTerm.toLowerCase();
    estudiantesFiltrados = estudiantesFiltrados.filter(e => {
      const nombre = displayName(e).toLowerCase();
      const email = (e.email || '').toLowerCase();
      return nombre.includes(term) || email.includes(term);
    });
  }

  const abrirFeedbackDrawer = (alumno, existente = null) => {
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

  const guardarFeedback = () => {
    if (!feedbackDrawer.notaProfesor?.trim()) {
      toast.error('❌ Debes escribir un comentario');
      return;
    }

    const data = {
      alumnoId: feedbackDrawer.alumnoId,
      profesorId: currentUser.id,
      semanaInicioISO: semanaActualISO,
      notaProfesor: feedbackDrawer.notaProfesor.trim(),
      mediaLinks: feedbackDrawer.mediaLinks || [],
    };

    if (feedbackDrawer.existingId) {
      actualizarFeedbackMutation.mutate({ id: feedbackDrawer.existingId, data });
    } else {
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

  return (
    <div className="min-h-screen bg-background">
      {/* Header unificado */}
      <div className="bg-card border-b border-ui sticky top-0 z-10 shadow-card">
        <div className="max-w-7xl mx-auto px-6 md:px-8 py-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="icon-tile">
              <Calendar className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-3xl font-bold text-ui">Agenda Semanal</h1>
              <p className="text-sm text-muted hidden md:block">Vista por estudiante y semana</p>
            </div>
          </div>

          <WeekNavigator 
            mondayISO={semanaActualISO}
            onPrev={() => cambiarSemana(-1)}
            onNext={() => cambiarSemana(1)}
            onToday={irSemanaActual}
          />
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4 md:p-6 lg:px-8 space-y-4">
        {/* Búsqueda */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
          <Input
            id="search-input"
            placeholder="Buscar estudiante... (Ctrl/⌘+K)"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 pr-9 h-10 rounded-xl border-ui focus-brand"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ui"
              aria-label="Limpiar búsqueda"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Lista de estudiantes */}
        {estudiantesFiltrados.length === 0 ? (
          <Card className="app-card">
            <CardContent className="text-center py-12">
              <User className="w-16 h-16 mx-auto mb-4 icon-empty" />
              <p className="text-muted">
                {searchTerm ? 'No se encontraron estudiantes' : 'No hay estudiantes asignados'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {estudiantesFiltrados.map(alumno => {
              const asignacionActiva = asignaciones.find(a => {
                if (a.alumnoId !== alumno.id) return false;
                if (a.estado !== 'publicada' && a.estado !== 'en_curso') return false;
                const offset = calcularOffsetSemanas(a.semanaInicioISO, semanaActualISO);
                return offset >= 0 && offset < (a.plan?.semanas?.length || 0);
              });

              const feedback = feedbacksSemanal.find(f => 
                f.alumnoId === alumno.id && f.semanaInicioISO === semanaActualISO
              );

              const semanaIdx = asignacionActiva ? 
                calcularOffsetSemanas(asignacionActiva.semanaInicioISO, semanaActualISO) : 0;
              
              const semana = asignacionActiva?.plan?.semanas?.[semanaIdx];

              return (
                <Card key={alumno.id} className="app-card hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        <div className="w-10 h-10 bg-gradient-to-br from-muted to-muted-foreground/20 rounded-full flex items-center justify-center shrink-0">
                          <span className="text-ui font-semibold text-sm">
                            {displayName(alumno).slice(0, 1).toUpperCase()}
                          </span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <CardTitle className="text-lg break-words">{displayName(alumno)}</CardTitle>
                          <p className="text-sm text-muted break-all">{alumno.email}</p>
                        </div>
                      </div>
                      {asignacionActiva && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(createPageUrl(`asignacion-detalle?id=${asignacionActiva.id}`))}
                          className="shrink-0 h-9 rounded-xl focus-brand"
                          aria-label="Ver detalle de asignación"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {!asignacionActiva || !semana ? (
                      <div className="text-center py-6 border-2 border-dashed rounded-2xl bg-muted">
                        <Target className="w-10 h-10 mx-auto mb-2 icon-empty" />
                        <p className="text-sm text-muted">Sin asignación esta semana</p>
                      </div>
                    ) : (
                      <>
                        <div className="space-y-3">
                          <div className="flex items-start gap-2">
                            <Music className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                            <div className="min-w-0 flex-1">
                              <p className="text-xs text-muted">Pieza</p>
                              <p className="text-sm font-medium break-words">{asignacionActiva.piezaSnapshot?.nombre}</p>
                            </div>
                          </div>
                          
                          <div className="flex items-start gap-2">
                            <Target className="w-4 h-4 text-purple-600 mt-0.5 shrink-0" />
                            <div className="min-w-0 flex-1">
                              <p className="text-xs text-muted">Semana del Plan</p>
                              <p className="text-sm font-medium break-words">{semana.nombre}</p>
                              {semana.objetivo && (
                                <p className="text-xs text-muted italic mt-1 break-words">"{semana.objetivo}"</p>
                              )}
                            </div>
                          </div>

                          {/* Sesiones expandibles */}
                          {semana.sesiones && semana.sesiones.length > 0 && (
                            <div className="space-y-2 mt-3">
                              <p className="text-xs font-semibold text-ui">
                                {semana.sesiones.length} sesiones programadas:
                              </p>
                              {semana.sesiones.map((sesion, sesionIdx) => {
                                const sesionKey = `${alumno.id}-${semanaIdx}-${sesionIdx}`;
                                const isExpanded = expandedSessions.has(sesionKey);
                                const tiempo = calcularTiempoSesion(sesion);
                                const mins = Math.floor(tiempo / 60);
                                const secs = tiempo % 60;

                                return (
                                  <Card 
                                    key={sesionIdx}
                                    className="app-panel cursor-pointer hover:shadow-md transition-all"
                                    onClick={() => toggleSession(sesionKey)}
                                  >
                                    <CardContent className="pt-3 pb-3">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <span className="text-sm font-medium">{sesion.nombre}</span>
                                        <Badge variant="outline" className="rounded-full text-xs bg-green-50 border-green-300 text-green-800">
                                          ⏱ {mins}:{String(secs).padStart(2, '0')} min
                                        </Badge>
                                      </div>
                                      {isExpanded && (
                                        <div className="mt-3 pt-3 border-t border-ui" onClick={(e) => e.stopPropagation()}>
                                          <SessionContentView sesion={sesion} compact />
                                        </div>
                                      )}
                                    </CardContent>
                                  </Card>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        {isProfesorOrAdmin && (
                          <div className="pt-3 border-t border-ui">
                            {feedback ? (
                              <div className="bg-blue-50 rounded-2xl p-3 space-y-2">
                                <div className="flex items-center justify-between gap-2 flex-wrap">
                                  <div className="flex items-center gap-2">
                                    <MessageSquare className="w-4 h-4 text-blue-600" />
                                    <span className="text-sm font-semibold text-blue-900">Feedback del profesor</span>
                                  </div>
                                  <div className="flex gap-1">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => abrirFeedbackDrawer(alumno, feedback)}
                                      className="h-8 rounded-xl focus-brand"
                                      aria-label="Editar feedback"
                                    >
                                      <Edit className="w-3 h-3" />
                                    </Button>
                                    <Button
                                      variant="danger"
                                      size="sm"
                                      onClick={() => {
                                        if (window.confirm('¿Eliminar feedback?')) {
                                          eliminarFeedbackMutation.mutate(feedback.id);
                                        }
                                      }}
                                      className="h-8 rounded-xl focus-brand"
                                      aria-label="Eliminar feedback"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </Button>
                                  </div>
                                </div>
                                {feedback.notaProfesor && (
                                  <p className="text-sm text-ui italic border-l-2 border-blue-300 pl-2 break-words">
                                    "{feedback.notaProfesor}"
                                  </p>
                                )}
                                {feedback.mediaLinks && feedback.mediaLinks.length > 0 && (
                                  <MediaLinksBadges
                                    mediaLinks={feedback.mediaLinks}
                                    onMediaClick={(idx) => handlePreviewMedia(idx, feedback.mediaLinks)}
                                    compact={true}
                                    maxDisplay={3}
                                  />
                                )}
                              </div>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => abrirFeedbackDrawer(alumno)}
                                className="w-full h-9 rounded-xl"
                              >
                                <MessageSquare className="w-4 h-4 mr-2" />
                                Dar feedback de esta semana
                              </Button>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Drawer de feedback */}
      {feedbackDrawer && (
        <>
          <div className="fixed inset-0 bg-black/40 z-50" onClick={() => setFeedbackDrawer(null)} />
          <div className="fixed inset-0 z-50 flex items-center justify-end pointer-events-none overflow-hidden">
            <div 
              className="bg-card w-full max-w-lg h-full shadow-card flex flex-col animate-in slide-in-from-right pointer-events-auto overflow-y-auto rounded-l-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="border-b border-ui px-6 py-4 flex items-center justify-between bg-[hsl(var(--brand-500))] sticky top-0 z-10">
                <div className="flex items-center gap-3 text-white">
                  <MessageSquare className="w-6 h-6" />
                  <h2 className="text-xl font-bold">
                    {feedbackDrawer.existingId ? 'Editar Feedback' : 'Dar Feedback'}
                  </h2>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setFeedbackDrawer(null)} className="text-white hover:bg-white/20 h-9 w-9 rounded-xl focus-brand" aria-label="Cerrar drawer">
                  <X className="w-5 h-5" />
                </Button>
              </div>

              <div className="flex-1 p-6 space-y-6">
                <div>
                  <Label htmlFor="nota" className="text-sm font-medium text-ui">Observaciones del profesor *</Label>
                  <Textarea
                    id="nota"
                    value={feedbackDrawer.notaProfesor}
                    onChange={(e) => setFeedbackDrawer({...feedbackDrawer, notaProfesor: e.target.value})}
                    placeholder="Comentarios, áreas de mejora, felicitaciones..."
                    rows={8}
                    className="resize-none rounded-xl border-ui focus-brand mt-1"
                  />
                  <p className="text-xs text-muted mt-1">
                    Escribe observaciones sobre el progreso del estudiante esta semana
                  </p>
                </div>

                <MediaLinksInput
                  value={feedbackDrawer.mediaLinks}
                  onChange={(links) => setFeedbackDrawer({...feedbackDrawer, mediaLinks: links})}
                  onPreview={(idx) => handlePreviewMedia(idx, feedbackDrawer.mediaLinks)}
                />
              </div>

              <div className="border-t border-ui px-6 py-4 bg-muted sticky bottom-0">
                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setFeedbackDrawer(null)} className="flex-1 h-10 rounded-xl">
                    Cancelar
                  </Button>
                  <Button 
                    variant="primary"
                    onClick={guardarFeedback} 
                    disabled={crearFeedbackMutation.isPending || actualizarFeedbackMutation.isPending} 
                    className="flex-1 h-10 rounded-xl shadow-sm focus-brand"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Guardar
                  </Button>
                </div>
                <p className="text-xs text-center text-muted mt-2">
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
