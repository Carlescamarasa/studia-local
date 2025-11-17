import React, { useState } from "react";
import { localDataClient } from "@/api/localDataClient";
import { useQuery } from "@tanstack/react-query";
import { getCurrentUser } from "@/api/localDataClient";
import { Button } from "@/components/ds/Button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ds";
import { Badge } from "@/components/ds";
import { Alert, AlertDescription } from "@/components/ds";
import {
  Music, Calendar, Target, PlayCircle, MessageSquare,
  Layers,
  ChevronLeft, ChevronRight, Home, Clock, CheckCircle2,
  Activity, Eye, Star
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { calcularLunesSemanaISO, calcularOffsetSemanas, calcularTiempoSesion } from "../components/utils/helpers";
import { displayName } from "@/components/utils/helpers";
import WeekNavigator from "../components/common/WeekNavigator";
import RequireRole from "@/components/auth/RequireRole";
import PageHeader from "@/components/ds/PageHeader";
import { componentStyles } from "@/design/componentStyles";
import UnifiedTable from "@/components/tables/UnifiedTable";
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

  const currentUser = getCurrentUser();

  const { data: asignaciones = [] } = useQuery({
    queryKey: ['asignaciones'],
    queryFn: () => localDataClient.entities.Asignacion.list(),
  });

  const { data: feedbacksSemanal = [] } = useQuery({
    queryKey: ['feedbacksSemanal'],
    queryFn: () => localDataClient.entities.FeedbackSemanal.list('-created_date'),
  });

  const { data: usuarios = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => localDataClient.entities.User.list(),
  });

  const { data: registrosSesion = [] } = useQuery({
    queryKey: ['registrosSesion'],
    queryFn: () => localDataClient.entities.RegistroSesion.list('-inicioISO'),
  });

  const simulatingUser = sessionStorage.getItem('simulatingUser') ? 
    JSON.parse(sessionStorage.getItem('simulatingUser')) : null;
  
  const userIdActual = simulatingUser?.id || currentUser?.id;

  const asignacionActiva = asignaciones.find(a => {
    if (a.alumnoId !== userIdActual) return false;
    if (a.estado !== 'publicada' && a.estado !== 'en_curso') return false;
    const offset = calcularOffsetSemanas(a.semanaInicioISO, semanaActualISO);
    return offset >= 0 && offset < (a.plan?.semanas?.length || 0);
  });

  const semanaIdx = asignacionActiva ? 
    calcularOffsetSemanas(asignacionActiva.semanaInicioISO, semanaActualISO) : 0;

  const semanaDelPlan = asignacionActiva?.plan?.semanas?.[semanaIdx];

  const feedbackSemana = feedbacksSemanal.find(f => 
    f.alumnoId === userIdActual && f.semanaInicioISO === semanaActualISO
  );

  // Filtrar registros de sesión de la semana actual con feedback
  const registrosConFeedback = registrosSesion.filter(r => {
    // Debe ser del alumno actual
    if (r.alumnoId !== userIdActual) return false;
    
    // Debe tener feedback (calificacion, notas o mediaLinks)
    const tieneFeedback = (r.calificacion && r.calificacion > 0) || 
                          (r.notas && r.notas.trim()) || 
                          (r.mediaLinks && Array.isArray(r.mediaLinks) && r.mediaLinks.length > 0);
    if (!tieneFeedback) return false;
    
    // Debe ser de la semana actual
    if (!r.inicioISO) return false;
    const fechaSesion = parseLocalDate(r.inicioISO);
    const lunesSemana = parseLocalDate(semanaActualISO);
    const domingoSemana = new Date(lunesSemana);
    domingoSemana.setDate(domingoSemana.getDate() + 6);
    
    return fechaSesion >= lunesSemana && fechaSesion <= domingoSemana;
  }).sort((a, b) => {
    // Ordenar por fecha descendente (más reciente primero)
    return new Date(b.inicioISO) - new Date(a.inicioISO);
  });

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

  // Preparar datos para la tabla
  const tableData = semanaDelPlan?.sesiones?.map((sesion, idx) => {
    const tiempoTotal = calcularTiempoSesion(sesion);
    const minutos = Math.floor(tiempoTotal / 60);
    const segundos = tiempoTotal % 60;
    
    return {
      id: `sesion-${idx}`,
      sesion,
      sesionIdx: idx,
      tiempoTotal,
      minutos,
      segundos,
    };
  }) || [];

  // Definir columnas de la tabla
  const columns = [
    {
      key: 'sesion',
      label: 'Sesión',
      sortable: true,
      sortValue: (row) => row.sesion?.nombre || '',
      render: (row) => (
        <div className="flex items-start gap-2 min-w-0">
          <PlayCircle className="w-4 h-4 text-[var(--color-primary)] mt-0.5 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-[var(--color-text-primary)] break-words">
              {row.sesion.nombre}
            </p>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
                <Badge variant="outline" className={componentStyles.status.badgeSuccess}>
                  <Clock className="w-3 h-3 mr-1" />
                  {row.minutos}:{String(row.segundos).padStart(2, '0')} min
                </Badge>
              <Badge className={focoColors[row.sesion.foco]} variant="outline">
                {focoLabels[row.sesion.foco]}
              </Badge>
            </div>
            <div className="flex items-center gap-1 mt-1 text-xs text-[var(--color-text-secondary)]">
              <Layers className="w-3 h-3 shrink-0" />
              <span>
                {row.sesion.bloques?.length || 0} ejercicios
                {row.sesion.rondas && row.sesion.rondas.length > 0 && ` • ${row.sesion.rondas.length} rondas`}
              </span>
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'detalle',
      label: 'Detalle',
      sortable: false,
      render: (row) => {
        const sesionKey = `sesion-${row.sesionIdx}`;
        const isExpanded = expandedSessions.has(sesionKey);
        
        return (
          <div className="space-y-2">
            <Card 
              className={componentStyles.components.panelSesion + " cursor-pointer"}
              data-sesion-key={sesionKey}
              onClick={(e) => {
                e.stopPropagation();
                toggleSession(sesionKey);
              }}
            >
              <CardContent className="pt-3 pb-3 px-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[var(--color-text-secondary)]">
                    {isExpanded ? 'Ocultar detalles' : 'Ver detalles'}
                  </span>
                  <ChevronRight className={`w-4 h-4 text-[var(--color-text-secondary)] transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                </div>
                {isExpanded && (
                  <div className="mt-3 pt-3 border-t border-[var(--color-border-default)]" onClick={(e) => e.stopPropagation()}>
                    <SessionContentView sesion={row.sesion} compact />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        );
      },
    },
  ];

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

      <div className="max-w-7xl mx-auto p-4 md:p-6 lg:px-8 space-y-4">
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

                {feedbackSemana && feedbackSemana.notaProfesor && (
                  <div className={"flex items-start gap-2 py-1 " + componentStyles.components.toneRowFeedback}>
                    <MessageSquare className="w-4 h-4 text-[var(--color-info)] mt-0.5 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-[var(--color-text-secondary)] font-medium">Feedback del profesor</p>
                      <p className="text-sm text-[var(--color-text-primary)] italic mt-0.5 break-words">
                        "{feedbackSemana.notaProfesor}"
                      </p>
                      <p className="text-xs text-[var(--color-text-secondary)] mt-1">
                        {(() => {
                          const prof = usuarios.find(u => u.id === feedbackSemana.profesorId);
                          return `Por ${displayName(prof)}`;
                        })()}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Separador */}
              <div className="border-t border-[var(--color-border-default)] pt-4">
                <h3 className={`${componentStyles.typography.sectionTitle} mb-4`}>
                  Sesiones ({semanaDelPlan.sesiones?.length || 0})
                </h3>
                
                {/* Tabla de sesiones */}
                {tableData.length === 0 ? (
                  <div className="text-center py-12">
                    <Layers className={`w-16 h-16 mx-auto mb-4 ${componentStyles.empty.emptyIcon}`} />
                    <p className={componentStyles.empty.emptyText}>No hay sesiones planificadas</p>
                  </div>
                ) : (
                  <UnifiedTable
                    columns={columns}
                    data={tableData}
                    getRowActions={(row) => [
                      {
                        id: 'study',
                        label: 'Ir a estudiar',
                        icon: <PlayCircle className="w-4 h-4" />,
                        onClick: () => navigate(createPageUrl('hoy')),
                      },
                      {
                        id: 'statistics',
                        label: 'Ver estadísticas',
                        icon: <Activity className="w-4 h-4" />,
                        onClick: () => navigate(createPageUrl('estadisticas')),
                      },
                      {
                        id: 'view',
                        label: 'Ver detalles completos',
                        icon: <Eye className="w-4 h-4" />,
                        onClick: () => {
                          const sesionKey = `sesion-${row.sesionIdx}`;
                          if (!expandedSessions.has(sesionKey)) {
                            toggleSession(sesionKey);
                          }
                          // Scroll suave al elemento si es necesario
                          setTimeout(() => {
                            const element = document.querySelector(`[data-sesion-key="${sesionKey}"]`);
                            element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                          }, 100);
                        },
                      },
                    ]}
                    keyField="id"
                    emptyMessage="No hay sesiones planificadas"
                  />
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

              {/* Historial de Feedback */}
              <div className="pt-4 border-t border-[var(--color-border-default)]">
                <h3 className={`${componentStyles.typography.sectionTitle} mb-4`}>
                  Historial de Feedback ({registrosConFeedback.length})
                </h3>
                
                {registrosConFeedback.length === 0 ? (
                  <div className="text-center py-8">
                    <MessageSquare className={`w-12 h-12 mx-auto mb-3 ${componentStyles.empty.emptyIcon} text-[var(--color-text-secondary)]`} />
                    <p className={componentStyles.empty.emptyText}>
                      No hay feedback de sesiones de estudio esta semana
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {registrosConFeedback.map((registro) => {
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