import React, { useState, useEffect, useRef } from "react";
import { localDataClient } from "@/api/localDataClient";
import { createRemoteDataAPI } from "@/api/remoteDataAPI";
import { useAsignaciones } from "@/hooks/entities/useAsignaciones";
import { useCurrentProfile } from "@/hooks/useCurrentProfile";

// Create remote API instance for fetching bloques with variations
const remoteDataAPI = createRemoteDataAPI();
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ds";
import { Button } from "@/components/ds/Button";
import { Badge } from "@/components/ds";
import { Alert, AlertDescription, AlertTitle } from "@/components/ds";
import {
  ChevronRight,
  ChevronDown,
  PlayCircle,
  User,
  Calendar,
  Layers,
  CheckCircle,
  XCircle,
  Clock,
  Shuffle,
  AlertTriangle,
  Backpack,
  Music,
  Target
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { toStudia } from "@/lib/routes";
import {
  calcularLunesSemanaISO,
  calcularOffsetSemanas,
  calcularTiempoSesion,
  aplanarSesion,
  getNombreVisible,
  formatLocalDate,
  parseLocalDate,
  isoWeekNumberLocal
} from "../components/utils/helpers";
import { useEffectiveUser } from "@/providers/EffectiveUserProvider";
import PeriodHeader from "../components/common/PeriodHeader";
import { getSecuencia, ensureRondaIds, mapBloquesByCode } from "../components/study/sessionSequence";
import SessionContentView from "../components/study/SessionContentView";
import { toast } from "sonner";
import { useSidebar } from "@/components/ui/SidebarState";
import PageHeader from "@/components/ds/PageHeader";
import { componentStyles } from "@/design/componentStyles";
import CustomAudioPlayer from "@/shared/components/media/AudioPlayer";
import { MediaIcon, getMediaLabel } from "@/shared/components/media/MediaEmbed";
import { resolveMedia, MediaKind } from "@/shared/utils/media";
import { shouldIgnoreHotkey } from "@/utils/hotkeys";
import { useHotkeysModal } from "@/hooks/useHotkeysModal.jsx";
import { getValidVariations, pickRandomVariation } from "@/hooks/useExerciseVariations";

import RequireRole from "@/components/auth/RequireRole";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// --- Helpers de fechas locales (para formateo de semana) ---
const startOfMonday = (date) => {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dow = d.getDay();
  const diff = dow === 0 ? -6 : 1 - dow;
  d.setDate(d.getDate() + diff);
  return d;
};

const InfoSection = ({ title, icon, children, defaultOpen = true }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-[var(--color-border-default)] pb-3 md:pb-4 last:border-b-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 w-full text-left mb-1.5 md:mb-2 group"
      >
        {isOpen ? <ChevronDown className="w-4 h-4 text-[var(--color-text-secondary)]" /> : <ChevronRight className="w-4 h-4 text-[var(--color-text-secondary)]" />}
        <span className={`${componentStyles.typography.sectionTitle} text-[var(--color-text-primary)] group-hover:text-[var(--color-primary)] transition-colors flex items-center gap-2`}>
          {icon && <span>{icon}</span>}
          {title}
        </span>
      </button>
      {isOpen && (
        <div className="pl-6 animate-in fade-in slide-in-from-top-1 duration-200">
          {children}
        </div>
      )}
    </div>
  );
};

export default function HoyPage() {
  return (
    <RequireRole anyOf={['ESTU']}>
      <HoyPageContent />
    </RequireRole>
  );
}

function HoyPageContent() {
  const navigate = useNavigate();
  const { closeSidebar, abierto, toggleSidebar } = useSidebar();
  const { showHotkeysModal, setShowHotkeysModal } = useHotkeysModal();

  const focoLabels = {
    GEN: 'General',
    LIG: 'Ligadura',
    RIT: 'Ritmo',
    ART: 'Articulación',
    'S&A': 'Sonido y Aire'
  };

  const focoColors = {
    GEN: componentStyles.status.badgeDefault,
    LIG: componentStyles.status.badgeInfo,
    RIT: componentStyles.status.badgeDefault,
    ART: componentStyles.status.badgeSuccess,
    'S&A': componentStyles.status.badgeDefault,
  };

  const [semanaActualISO, setSemanaActualISO] = useState(() => {
    return calcularLunesSemanaISO(new Date());
  });

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


  const [asignacionSeleccionadaId, setAsignacionSeleccionadaId] = useState(null); // Para múltiples asignaciones
  const [sesionSeleccionada, setSesionSeleccionada] = useState(0);
  const [sesionesConResumenExpandido, setSesionesConResumenExpandido] = useState(new Set());

  // Usar el nuevo provider de impersonación para obtener el usuario efectivo
  const { effectiveUserId, effectiveEmail, isImpersonating } = useEffectiveUser();

  // Usar hook optimizado para perfil actual (usa caché de useUsers)
  const { profile: alumnoActual } = useCurrentProfile();

  // Usar el ID del usuario efectivo (impersonado o real)
  const userIdActual = alumnoActual?.id || effectiveUserId;


  // Usar hook centralizado para asignaciones
  const { data: asignacionesRaw = [] } = useAsignaciones();

  // Cargar bloques actuales desde Supabase (remoteDataAPI tiene content → variations mapping)
  const { data: bloquesActuales = [] } = useQuery({
    queryKey: ['bloques-with-variations'],
    queryFn: async () => {
      try {
        // Fetch from Supabase to get content/variations field
        const bloques = await remoteDataAPI.bloques.list();
        if (bloques) {
          console.log('[DEBUG] bloquesActuales sample (from Supabase):', bloques.slice(0, 3).map(b => ({
            code: b.code,
            nombre: b.nombre,
            variations: b.variations,
            hasVariations: !!(b.variations && b.variations.length > 0)
          })));
        }
        return bloques || [];
      } catch (error) {
        console.error('Error fetching bloques from Supabase, falling back to localStorage:', error);
        // Fallback to localStorage if Supabase fails
        const localRes = await localDataClient.entities.Bloque.list();
        return localRes || [];
      }
    },
    staleTime: 30 * 1000, // 30s - needs recent data for study session
  });


  // Filtrar y validar asignaciones
  const asignaciones = asignacionesRaw.filter(a => {
    // Validar que tiene alumnoId válido
    if (!a.alumnoId) {
      return false;
    }
    // Validar que tiene alumnoId válido
    if (!a.alumnoId) {
      return false;
    }

    // Validar existencia de perfil (usando datos embebidos del RPC si están disponibles)
    // Si no tenemos alumnos cargados (porque quitamos useUsers), confiamos en el RPC o en que es el usuario actual.
    // Simplificación: Si es el usuario actual, siempre permitir.
    // Si la asignación tiene alumnoId, asumimos que es válida para ese alumno.
    // El RPC trae 'alumnoNombre'. Si es null, el perfil quizás no existe, pero la asignación sí.
    // Mantenemos lógica defensiva mínima:

    // Si no coincide con el usuario actual, se filtrará más adelante en asignacionesActivas.
    // Esta validación previa era para asegurar consistencia de datos.
    if (!userIdActual) return false;

    // Validar que tiene plan y semanas
    if (!a.plan || !Array.isArray(a.plan.semanas) || a.plan.semanas.length === 0) {
      return false;
    }

    // Validar que tiene semanaInicioISO válida
    if (!a.semanaInicioISO || typeof a.semanaInicioISO !== 'string') {
      return false;
    }

    return true;
  });


  // Filtrar asignaciones activas (que tienen semana válida para la semana actual)
  const asignacionesActivas = asignaciones.filter(a => {
    if (a.alumnoId !== userIdActual) return false;
    if (a.estado !== 'publicada' && a.estado !== 'en_curso') return false;
    try {
      const offset = calcularOffsetSemanas(a.semanaInicioISO, semanaActualISO);
      const tieneSemanaValida = offset >= 0 && offset < (a.plan?.semanas?.length || 0);
      return tieneSemanaValida;
    } catch (error) {
      return false;
    }
  });

  // Determinar asignación activa: si hay selección, usarla; sino, la primera
  const asignacionActiva = asignacionSeleccionadaId
    ? asignacionesActivas.find(a => a.id === asignacionSeleccionadaId)
    : asignacionesActivas[0] || null;

  // Si no hay selección y hay asignaciones, seleccionar la primera automáticamente
  useEffect(() => {
    if (!asignacionSeleccionadaId && asignacionesActivas.length > 0) {
      setAsignacionSeleccionadaId(asignacionesActivas[0].id);
    }
  }, [asignacionesActivas.length, asignacionSeleccionadaId]);

  // Calcular semanaDelPlan de forma más robusta
  let semanaDelPlan = null;
  let semanaIdx = 0;

  if (asignacionActiva) {
    try {
      semanaIdx = calcularOffsetSemanas(asignacionActiva.semanaInicioISO, semanaActualISO);
      semanaDelPlan = asignacionActiva.plan?.semanas?.[semanaIdx] || null;
    } catch (error) {
      semanaDelPlan = null;
    }
  }

  // Navigation function - empezarSesion navigates to /studia
  const empezarSesion = (sesion, sesionIdxProp) => {
    const url = toStudia({
      asignacionId: asignacionActiva?.id,
      semanaIdx: semanaIdx,
      sesionIdx: sesionIdxProp,
    });
    navigate(url);
  };

  // Main selection UI - No player code here
  // Navigation to /studia handled by empezarSesion() function


  // Vista de listado (no hay sesión activa)
  return (
    <div className="min-h-screen bg-background">
      {/* Header con estilo unificado */}
      <PageHeader
        icon={PlayCircle}
        title="Studia ahora"
        subtitle="Plan de estudio semanal"
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

      <div className="studia-section space-y-4">
        {/* Barra de contexto: pieza / plan / alumno en el body */}
        {asignacionActiva && (
          <div className="flex items-center gap-2 flex-wrap text-sm">
            <Music className="w-4 h-4 text-[var(--color-primary)] shrink-0" />
            <span className="font-semibold text-[var(--color-text-primary)]">{asignacionActiva.piezaSnapshot?.nombre}</span>
            <span className="text-[var(--color-text-secondary)]">·</span>
            <Target className="w-4 h-4 text-[var(--color-info)] shrink-0" />
            <span className="text-[var(--color-text-primary)]">{asignacionActiva.plan?.nombre}</span>
            <span className="text-[var(--color-text-secondary)]">·</span>
            <User className="w-4 h-4 text-[var(--color-text-secondary)] shrink-0" />
            <span className="font-medium text-[var(--color-text-primary)]">{getNombreVisible(alumnoActual)}</span>
          </div>
        )}

        {!asignacionActiva || !semanaDelPlan ? (
          <Card className="border-dashed border-2">
            <CardContent className="text-center py-16">
              <Target className={`w-20 h-20 mx-auto mb-4 ${componentStyles.empty.emptyIcon}`} />
              <h2 className={`${componentStyles.typography.pageTitle} mb-2`}>
                No tienes estudio esta semana
              </h2>
              <p className={`${componentStyles.empty.emptyText} mb-4`}>
                Consulta con tu profesor para obtener asignaciones
              </p>
              <Button
                variant="outline"
                onClick={() => {
                  navigate(createPageUrl('estadisticas'), {
                    state: { from: 'hoy' }
                  });
                }}
                className={`${componentStyles.buttons.outline} focus-brand`}
              >
                Ver mi historial y estadísticas →
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Si hay múltiples asignaciones, mostrarlas como tarjetas en columna */}
            {asignacionesActivas.length > 1 ? (
              <div className="space-y-4">
                {asignacionesActivas.map((asignacion) => {
                  const offsetAsignacion = calcularOffsetSemanas(asignacion.semanaInicioISO, semanaActualISO);
                  const semanaAsignacion = asignacion.plan?.semanas?.[offsetAsignacion] || null;
                  const isSelected = asignacionSeleccionadaId === asignacion.id || (!asignacionSeleccionadaId && asignacion.id === asignacionesActivas[0]?.id);

                  if (!semanaAsignacion) return null;

                  return (
                    <Card key={asignacion.id} className={`border-l-4 ${isSelected ? 'border-[var(--color-primary)]' : 'border-[var(--color-border-default)]'}`}>
                      <CardContent className="p-4">
                        {/* Header de asignación */}
                        <div className="mb-3">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <Music className="w-4 h-4 text-[var(--color-primary)]" />
                            <span className="font-semibold text-[var(--color-text-primary)]">{asignacion.piezaSnapshot?.nombre}</span>
                            <span className="text-[var(--color-text-secondary)]">·</span>
                            <Target className="w-4 h-4 text-[var(--color-info)]" />
                            <span className="text-[var(--color-text-primary)]">{asignacion.plan?.nombre}</span>
                          </div>
                          <h2 className={`text-base font-bold text-[var(--color-text-primary)] font-headings`}>{semanaAsignacion.nombre}</h2>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <Badge className={focoColors[semanaAsignacion.foco]}>
                              {focoLabels[semanaAsignacion.foco]}
                            </Badge>
                            <span className="text-sm text-[var(--color-text-secondary)]">
                              ({semanaAsignacion.sesiones?.length || 0} sesiones)
                            </span>
                          </div>
                          {semanaAsignacion.objetivo && (
                            <p className="text-sm text-[var(--color-text-secondary)] italic mt-1">"{semanaAsignacion.objetivo}"</p>
                          )}
                        </div>

                        {/* Sesiones - siempre visibles */}
                        {semanaAsignacion.sesiones && (
                          <div className="space-y-2">
                            {semanaAsignacion.sesiones.map((sesion, sesionIdx) => {
                              const tiempoTotal = calcularTiempoSesion(sesion);
                              const minutos = Math.floor(tiempoTotal / 60);
                              const segundos = tiempoTotal % 60;
                              const resumenExpandido = sesionesConResumenExpandido.has(`${asignacion.id}-${sesionIdx}`);

                              const toggleResumen = (e) => {
                                e.stopPropagation();
                                setSesionesConResumenExpandido(prev => {
                                  const next = new Set(prev);
                                  const key = `${asignacion.id}-${sesionIdx}`;
                                  if (next.has(key)) {
                                    next.delete(key);
                                  } else {
                                    next.add(key);
                                  }
                                  return next;
                                });
                              };

                              return (
                                <div
                                  key={sesionIdx}
                                  className={`border rounded-lg p-3 cursor-pointer hover:shadow-sm transition-all ${sesionSeleccionada === sesionIdx && isSelected
                                    ? `border-[var(--color-primary)] bg-[var(--color-primary-soft)] shadow-sm`
                                    : `border-[var(--color-border-default)] bg-[var(--color-surface-default)] hover:bg-[var(--color-surface-muted)]`
                                    }`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setAsignacionSeleccionadaId(asignacion.id);
                                    setSesionSeleccionada(sesionIdx);
                                  }}
                                >
                                  <div className="space-y-3">
                                    {/* Header de la sesión: chip + tiempo + foco */}
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <Badge variant="outline" className="text-xs px-2 py-0.5 bg-[var(--color-surface-muted)]">
                                        {sesion.nombre}
                                      </Badge>
                                      <Badge
                                        variant="outline"
                                        className={`text-xs px-2 py-0.5 ${componentStyles.status.badgeSuccess}`}
                                      >
                                        <Clock className="w-3 h-3 mr-1" />
                                        {minutos}:{String(segundos).padStart(2, '0')} min
                                      </Badge>
                                      <Badge className={`${focoColors[sesion.foco]} text-xs px-2 py-0.5`} variant="outline">
                                        Foco: {focoLabels[sesion.foco]}
                                      </Badge>
                                      {sesion.foco !== semanaAsignacion.foco && (
                                        <Badge className="bg-purple-100 text-purple-700 text-xs px-2 py-0.5" variant="outline">
                                          <Shuffle className="w-3 h-3 mr-1" />
                                          Repaso
                                        </Badge>
                                      )}
                                    </div>

                                    {/* Botón para desplegar/colapsar ejercicios */}
                                    <button
                                      className={`w-full flex items-center gap-2 p-1.5 rounded-lg transition-colors ${resumenExpandido ? 'bg-[var(--color-surface-muted)]' : 'hover:bg-[var(--color-surface-muted)]'
                                        }`}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        toggleResumen(e);
                                      }}
                                    >
                                      {resumenExpandido ? (
                                        <ChevronDown className="w-4 h-4 text-[var(--color-text-secondary)]" />
                                      ) : (
                                        <ChevronRight className="w-4 h-4 text-[var(--color-text-secondary)]" />
                                      )}
                                      <span className="text-sm font-medium text-[var(--color-text-primary)]">
                                        {resumenExpandido ? 'Ocultar ejercicios' : 'Ver ejercicios'}
                                      </span>
                                    </button>

                                    {/* Resumen expandido */}
                                    {resumenExpandido && (
                                      <div className="border-t border-[var(--color-border-default)] pt-2" onClick={(e) => e.stopPropagation()}>
                                        <SessionContentView sesion={sesion} compact dbBloques={bloquesActuales} semanaFoco={semanaAsignacion.foco} />
                                      </div>
                                    )}

                                    {/* Botón de iniciar práctica (solo si está seleccionada) */}
                                    {sesionSeleccionada === sesionIdx && isSelected && (
                                      <div className="pt-2 border-t border-[var(--color-border-default)] flex justify-center" onClick={(e) => e.stopPropagation()}>
                                        <Button
                                          variant="primary"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            empezarSesion(sesion, sesionIdx);
                                          }}
                                          size="lg"
                                          className={`${componentStyles.buttons.primary} w-full md:w-auto h-12 shadow-sm`}
                                        >
                                          <PlayCircle className="w-5 h-5 mr-2" />
                                          Studia ahora
                                        </Button>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              /* Una sola asignación: mostrar como antes pero sin toggle de sesiones */
              <div className="border-l-4 border-[var(--color-primary)] bg-[var(--color-primary-soft)]/50 rounded-r-lg p-3">
                {/* Información de la semana - siempre visible */}
                <div className="mb-3">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h2 className={`text-base font-bold text-[var(--color-text-primary)] font-headings`}>{semanaDelPlan.nombre}</h2>
                    <Badge className={focoColors[semanaDelPlan.foco]}>
                      {focoLabels[semanaDelPlan.foco]}
                    </Badge>
                    <span className="text-sm text-[var(--color-text-secondary)]">
                      ({semanaDelPlan.sesiones?.length || 0} sesiones)
                    </span>
                  </div>
                  {semanaDelPlan.objetivo && (
                    <p className="text-sm text-[var(--color-text-secondary)] italic mt-1">"{semanaDelPlan.objetivo}"</p>
                  )}
                </div>

                {/* Sesiones - siempre visibles */}
                {
                  semanaDelPlan.sesiones && (
                    <div className="space-y-2">
                      {semanaDelPlan.sesiones.map((sesion, sesionIdx) => {
                        const tiempoTotal = calcularTiempoSesion(sesion);
                        const minutos = Math.floor(tiempoTotal / 60);
                        const segundos = tiempoTotal % 60;
                        const resumenExpandido = sesionesConResumenExpandido.has(sesionIdx);

                        const toggleResumen = (e) => {
                          e.stopPropagation();
                          setSesionesConResumenExpandido(prev => {
                            const next = new Set(prev);
                            if (next.has(sesionIdx)) {
                              next.delete(sesionIdx);
                            } else {
                              next.add(sesionIdx);
                            }
                            return next;
                          });
                        };

                        return (
                          <div
                            key={sesionIdx}
                            className={`border rounded-lg p-3 cursor-pointer hover:shadow-sm transition-all ${sesionSeleccionada === sesionIdx
                              ? `border-[var(--color-primary)] bg-[var(--color-primary-soft)] shadow-sm`
                              : `border-[var(--color-border-default)] bg-[var(--color-surface-default)] hover:bg-[var(--color-surface-muted)]`
                              }`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSesionSeleccionada(sesionIdx);
                            }}
                          >
                            <div className="space-y-3">
                              {/* Header de la sesión: chip + tiempo + foco */}
                              <div className="flex items-center gap-2 flex-wrap">
                                <Badge variant="outline" className="text-xs px-2 py-0.5 bg-[var(--color-surface-muted)]">
                                  {sesion.nombre}
                                </Badge>
                                <Badge
                                  variant="outline"
                                  className={`text-xs px-2 py-0.5 ${componentStyles.status.badgeSuccess}`}
                                >
                                  <Clock className="w-3 h-3 mr-1" />
                                  {minutos}:{String(segundos).padStart(2, '0')} min
                                </Badge>
                                <Badge className={`${focoColors[sesion.foco]} text-xs px-2 py-0.5`} variant="outline">
                                  Foco: {focoLabels[sesion.foco]}
                                </Badge>
                              </div>

                              {/* Botón para desplegar/colapsar ejercicios */}
                              <button
                                className={`w-full flex items-center gap-2 p-1.5 rounded-lg transition-colors ${resumenExpandido ? 'bg-[var(--color-surface-muted)]' : 'hover:bg-[var(--color-surface-muted)]'
                                  }`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleResumen(e);
                                }}
                              >
                                {resumenExpandido ? (
                                  <ChevronDown className="w-4 h-4 text-[var(--color-text-secondary)]" />
                                ) : (
                                  <ChevronRight className="w-4 h-4 text-[var(--color-text-secondary)]" />
                                )}
                                <span className="text-sm font-medium text-[var(--color-text-primary)]">
                                  {resumenExpandido ? 'Ocultar ejercicios' : 'Ver ejercicios'}
                                </span>
                              </button>

                              {/* Resumen expandido */}
                              {resumenExpandido && (
                                <div className="border-t border-[var(--color-border-default)] pt-2" onClick={(e) => e.stopPropagation()}>
                                  <SessionContentView sesion={sesion} compact dbBloques={bloquesActuales} semanaFoco={semanaDelPlan?.foco} />
                                </div>
                              )}

                              {/* Botón de iniciar práctica (solo si está seleccionada) */}
                              {sesionSeleccionada === sesionIdx && (
                                <div className="pt-2 border-t border-[var(--color-border-default)] flex justify-center" onClick={(e) => e.stopPropagation()}>
                                  <Button
                                    variant="primary"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      empezarSesion(sesion, sesionIdx);
                                    }}
                                    size="lg"
                                    className={`${componentStyles.buttons.primary} w-full md:w-auto h-12 shadow-sm`}
                                  >
                                    <PlayCircle className="w-5 h-5 mr-2" />
                                    Iniciar Práctica
                                  </Button>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )
                }
              </div>
            )}

            <div className="flex flex-wrap items-center justify-center gap-3 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => {
                  const params = new URLSearchParams();
                  params.set('tab', 'mochila');
                  if (effectiveUserId) {
                    params.set('students', effectiveUserId);
                  }
                  navigate(`/progreso?${params.toString()}`);
                }}
                className="rounded-xl focus-brand"
              >
                <Backpack className="w-4 h-4 mr-2" />
                Ver Mochila
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  navigate(createPageUrl('estadisticas'), {
                    state: { from: 'hoy' }
                  });
                }}
                className="rounded-xl focus-brand"
              >
                Ver Historial y estadísticas →
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}