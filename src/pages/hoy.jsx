import React, { useState, useEffect, useRef } from "react";
import { localDataClient } from "@/api/localDataClient";
import { createRemoteDataAPI } from "@/api/remoteDataAPI";

// Create remote API instance for fetching bloques with variations
const remoteDataAPI = createRemoteDataAPI();
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ds";
import { Button } from "@/components/ds/Button"; // Updated import path
import { Badge } from "@/components/ds";
import { Alert, AlertDescription, AlertTitle } from "@/components/ds";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
  RotateCcw,
  SkipForward,
  Maximize2,
  BookOpen,
  CheckCircle,
  Clock,
  Music,
  MoreVertical,
  Flag,
  ChevronsRight,
  ChevronUp,
  ChevronDown,
  Target,
  X,
  Piano,
  PlayCircle,
  User,
  Calendar,
  Layers,
  AlertTriangle,
  List,
  HelpCircle,
  Minimize2,
  XCircle,
  Shuffle,
  Menu,
  ShieldAlert,
  Save,
  FileText,
  Video,
  ExternalLink,
  ImageIcon
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { cn } from "@/lib/utils";
import {
  calcularLunesSemanaISO,
  calcularOffsetSemanas,
  calcularTiempoSesion,
  aplanarSesion,
  getNombreVisible,
  useEffectiveUser,
  formatLocalDate,
  parseLocalDate,
  isoWeekNumberLocal
} from "../components/utils/helpers";
import PeriodHeader from "../components/common/PeriodHeader";
import { getSecuencia, ensureRondaIds, mapBloquesByCode } from "../components/study/sessionSequence";
import TimelineProgreso from "../components/estudio/TimelineProgreso";
import ModalCancelar from "../components/estudio/ModalCancelar";
import ResumenFinal from "../components/estudio/ResumenFinal";
import Metronomo from "../components/study/Metronomo";
import PianoPanel from "../components/study/PianoPanel"; // Refactored component
import SessionContentView from "../components/study/SessionContentView";
// detectMediaType eliminado, usamos resolveMedia de media.jsx

import ReportErrorButtonInTimer from "../components/common/ReportErrorButtonInTimer";
import { toast } from "sonner";
import { useSidebar } from "@/components/ui/SidebarState";
import PageHeader from "@/components/ds/PageHeader";
import { componentStyles } from "@/design/componentStyles";
import MediaEmbed from "../components/common/MediaEmbed";
import CustomAudioPlayer from "../components/common/CustomAudioPlayer";
import { MediaIcon, getMediaLabel } from "../components/common/MediaEmbed";
import { resolveMedia, MediaKind } from "../components/utils/media";
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
  const { setShowHotkeysModal } = useHotkeysModal();

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
  const [sesionActiva, setSesionActiva] = useState(null);
  const [indiceActual, setIndiceActual] = useState(0);
  const [tiempoActual, setTiempoActual] = useState(0);
  const [cronometroActivo, setCronometroActiva] = useState(false);
  // Layout and UI state
  const [timerCollapsed, setTimerCollapsed] = useState(false); // Collapsed by default? No, usually open.
  const [footerHeight, setFooterHeight] = useState(80); // Default height
  const footerRef = useRef(null);

  // Measure footer height for PianoPanel positioning
  // Helper to get REAL bottom offset
  const measureFooterOffset = () => {
    if (!footerRef.current) return 0;
    const viewportH = window.visualViewport?.height ?? window.innerHeight;
    const rect = footerRef.current.getBoundingClientRect();
    const offset = Math.max(0, Math.round(viewportH - rect.top));
    return offset;
  };

  useEffect(() => {
    if (!footerRef.current) return;

    const updateFooterHeight = () => {
      const h = measureFooterOffset();
      setFooterHeight(h);
    };

    // Initial measure with robust loop for load stability (Chrome Hotfix)
    const measureAndLoop = () => {
      updateFooterHeight();
      let rafId;
      const startTime = performance.now();
      const loop = (time) => {
        updateFooterHeight();
        // Poll for 1000ms to ensure initial layout/transitions (e.g. fonts, dynamic content) are caught
        if (time - startTime < 1000) {
          rafId = requestAnimationFrame(loop);
        }
      };
      rafId = requestAnimationFrame(loop);
      return () => cancelAnimationFrame(rafId);
    };

    const cancelLoop = measureAndLoop();

    // ResizeObserver
    const resizeObserver = new ResizeObserver(() => {
      requestAnimationFrame(updateFooterHeight);
    });

    resizeObserver.observe(footerRef.current);

    // Window resize fallback
    window.addEventListener('resize', updateFooterHeight);
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', updateFooterHeight);
    }

    return () => {
      cancelLoop();
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateFooterHeight);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', updateFooterHeight);
      }
    };
  }, []);

  // Force re-measure when collapse state changes (Chrome Hotfix)
  useEffect(() => {
    if (!footerRef.current) return;
    const update = () => setFooterHeight(measureFooterOffset());
    update();

    let rafId;
    const startTime = performance.now();
    const loop = (time) => {
      update();
      if (time - startTime < 400) {
        rafId = requestAnimationFrame(loop);
      }
    };
    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, [timerCollapsed]);

  // Handler for Piano Toggle
  const handleTogglePiano = () => {
    if (!mostrarPiano) {
      // Opening: Force measure FIRST
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const offset = measureFooterOffset();
          setFooterHeight(offset);
          setMostrarPiano(true);
        });
      });
      // Backup check
      setTimeout(() => {
        setFooterHeight(measureFooterOffset());
      }, 80);
    } else {
      setMostrarPiano(false);
    }
  };
  const [completados, setCompletados] = useState(new Set());
  const [omitidos, setOmitidos] = useState(new Set());
  const [pantallaCompleta, setPantallaCompleta] = useState(false);
  const [mostrarItinerario, setMostrarItinerario] = useState(false);
  const [mostrarModalCancelar, setMostrarModalCancelar] = useState(false);
  const [rondasExpandidasItinerario, setRondasExpandidasItinerario] = useState(new Set());
  const [cronometroPausadoPorModal, setCronometroPausadoPorModal] = useState(false);
  const [sesionFinalizada, setSesionFinalizada] = useState(false);
  const [datosFinal, setDatosFinal] = useState(null);
  const [mediaFullscreen, setMediaFullscreen] = useState(null);
  const [mediaModal, setMediaModal] = useState(null); // Para el popup de materiales
  const [reportModalAbierto, setReportModalAbierto] = useState(false);
  const [pianoCerradoPorUsuario, setPianoCerradoPorUsuario] = useState(true); // Control del fab del piano
  const [mostrarPiano, setMostrarPiano] = useState(false); // Modal del piano
  const [ppmAlcanzado, setPpmAlcanzado] = useState(null);

  // Estado para la posición del timer arrastrable
  const [timerPosition, setTimerPosition] = useState(() => {
    const saved = localStorage.getItem('timer-position');
    if (saved) {
      try {
        const { top, left } = JSON.parse(saved);
        return { top, left };
      } catch (e) {
        // Si hay error, usar valores por defecto
      }
    }
    // Valores por defecto: esquina superior derecha
    return { top: 16, left: null, right: 16 };
  });
  const [isDraggingTimer, setIsDraggingTimer] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const timerRef = useRef(null);

  const [registroSesionId, setRegistroSesionId] = useState(null);
  const [timestampInicio, setTimestampInicio] = useState(null);
  const [timestampUltimoPausa, setTimestampUltimoPausa] = useState(null);
  const [tiempoAcumuladoAntesPausa, setTiempoAcumuladoAntesPausa] = useState(0);
  const heartbeatIntervalRef = useRef(null);
  const colaOfflineRef = useRef([]);
  const bloquesPendientesRef = useRef([]); // Almacenar bloques en memoria hasta finalizar

  const sidebarCerradoRef = useRef(false);

  const effectiveUser = useEffectiveUser();

  const { data: usuarios = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => localDataClient.entities.User.list(),
    staleTime: 5 * 60 * 1000, // 5 min
  });

  // Buscar el usuario real en la base de datos por email si effectiveUser viene de Supabase
  // Esto es necesario porque effectiveUser puede tener el ID de Supabase Auth, no el ID de la BD
  const alumnoActual = usuarios.find(u => {
    if (effectiveUser?.email && u.email) {
      return u.email.toLowerCase().trim() === effectiveUser.email.toLowerCase().trim();
    }
    return u.id === effectiveUser?.id;
  }) || effectiveUser;

  // Usar el ID del usuario de la base de datos, no el de Supabase Auth
  const userIdActual = alumnoActual?.id || effectiveUser?.id;


  const { data: asignacionesRaw = [] } = useQuery({
    queryKey: ['asignaciones'],
    queryFn: () => localDataClient.entities.Asignacion.list(),
    staleTime: 2 * 60 * 1000, // 2 min
  });

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
    const alumno = usuarios.find(u => u.id === a.alumnoId);
    if (!alumno) {
      // Si es el usuario actual pero no está en la lista de usuarios, permitir la asignación
      // Esto puede pasar si los usuarios aún no se han cargado completamente
      if (a.alumnoId === userIdActual) {
        // Continuar con la validación del plan y semanas
      } else {
        return false;
      }
    }

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

  useEffect(() => {
    if (sesionActiva && !sesionFinalizada && !sidebarCerradoRef.current) {
      closeSidebar();
      sidebarCerradoRef.current = true;
    }
    if (!sesionActiva) {
      sidebarCerradoRef.current = false;
    }
  }, [sesionActiva, sesionFinalizada, closeSidebar]);

  // Notificar cuando el timer está visible o no
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('timer-state-change', {
      detail: { visible: !!sesionActiva }
    }));

    return () => {
      // Notificar cuando el timer se oculta
      window.dispatchEvent(new CustomEvent('timer-state-change', {
        detail: { visible: false }
      }));
    };
  }, [sesionActiva]);

  // useEffect para manejar el arrastre del timer
  useEffect(() => {
    if (!isDraggingTimer) return;

    const handleMouseMove = (e) => {
      const newLeft = e.clientX - dragOffset.x;
      const newTop = e.clientY - dragOffset.y;

      // Limitar a los bordes de la ventana
      const maxLeft = window.innerWidth - (timerRef.current?.offsetWidth || 200);
      const maxTop = window.innerHeight - (timerRef.current?.offsetHeight || 100);
      const minLeft = 0;
      const minTop = 0;

      const clampedLeft = Math.max(minLeft, Math.min(maxLeft, newLeft));
      const clampedTop = Math.max(minTop, Math.min(maxTop, newTop));

      const newPosition = { top: clampedTop, left: clampedLeft, right: null };
      setTimerPosition(newPosition);

      // Guardar en localStorage
      localStorage.setItem('timer-position', JSON.stringify({ top: clampedTop, left: clampedLeft }));
    };

    const handleTouchMove = (e) => {
      const touch = e.touches[0];
      const newLeft = touch.clientX - dragOffset.x;
      const newTop = touch.clientY - dragOffset.y;

      // Limitar a los bordes de la ventana
      const maxLeft = window.innerWidth - (timerRef.current?.offsetWidth || 200);
      const maxTop = window.innerHeight - (timerRef.current?.offsetHeight || 100);
      const minLeft = 0;
      const minTop = 0;

      const clampedLeft = Math.max(minLeft, Math.min(maxLeft, newLeft));
      const clampedTop = Math.max(minTop, Math.min(maxTop, newTop));

      const newPosition = { top: clampedTop, left: clampedLeft, right: null };
      setTimerPosition(newPosition);

      // Guardar en localStorage
      localStorage.setItem('timer-position', JSON.stringify({ top: clampedTop, left: clampedLeft }));
    };

    const handleMouseUp = () => {
      setIsDraggingTimer(false);
    };

    const handleTouchEnd = () => {
      setIsDraggingTimer(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isDraggingTimer, dragOffset]);

  // Handlers para arrastrar el timer (usando useCallback para mantener referencias estables)
  const handleTimerMouseDown = React.useCallback((e) => {
    if (!timerRef.current) return;
    const rect = timerRef.current.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
    setIsDraggingTimer(true);
    e.preventDefault();
  }, []);

  const handleTimerTouchStart = React.useCallback((e) => {
    if (!timerRef.current) return;
    const touch = e.touches[0];
    const rect = timerRef.current.getBoundingClientRect();
    setDragOffset({
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top,
    });
    setIsDraggingTimer(true);
    e.preventDefault();
  }, []);

  useEffect(() => {
    if (!cronometroActivo || !sesionActiva || sesionFinalizada) {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }
      return;
    }

    const listaEjecucion = aplanarSesion(sesionActiva);
    const ejercicioActual = listaEjecucion[indiceActual];

    if (ejercicioActual?.tipo === 'AD') {
      setCronometroActiva(false);
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }
      return;
    }

    const interval = setInterval(() => {
      const ahora = Date.now();
      const tiempoDesdeInicio = timestampInicio ? Math.floor((ahora - timestampInicio) / 1000) : 0;
      const tiempoTotal = tiempoAcumuladoAntesPausa + tiempoDesdeInicio;

      if (tiempoTotal >= 18000) {
        setTiempoActual(18000);
        setCronometroActiva(false);
        toast.error("⏳ Tiempo máximo alcanzado (5h). Sesión guardada.");
        setSesionFinalizada(true);
        return;
      }

      setTiempoActual(tiempoTotal);
    }, 1000);

    return () => clearInterval(interval);
  }, [cronometroActivo, sesionActiva, indiceActual, sesionFinalizada, timestampInicio, tiempoAcumuladoAntesPausa]);

  // NOTA: guardarRegistroSesion eliminado, se reemplaza por finalizarSesion

  const guardarRegistroBloque = async (indice, estado, duracionReal = 0) => {
    if (!sesionActiva) return;

    const listaEjecucion = aplanarSesion(sesionActiva);
    const bloque = listaEjecucion[indice];
    if (!bloque) return;

    const dataBloque = {
      // registroSesionId: se asignará al finalizar
      asignacionId: asignacionActiva.id,
      alumnoId: userIdActual,
      semanaIdx: semanaIdx,
      sesionIdx: semanaDelPlan?.sesiones?.indexOf(sesionActiva) || 0,
      ordenEjecucion: indice,
      tipo: bloque.tipo,
      code: bloque.code,
      nombre: bloque.nombre,
      duracionObjetivoSeg: bloque.duracionSeg || 0,
      duracionRealSeg: bloque.tipo === 'AD' ? 0 : duracionReal,
      estado: estado,
      inicioISO: new Date().toISOString(),
      finISO: new Date().toISOString(),
      iniciosPausa: 0,
      ppmAlcanzado: ppmAlcanzado,
    };

    // Guardar en memoria
    bloquesPendientesRef.current.push(dataBloque);
    console.log('Bloque guardado en memoria:', dataBloque);
  };

  // NOTA: Eliminados los useEffect que actualizaban el registro periódicamente
  // El registro solo se actualiza una vez al final cuando el usuario presiona "Finalizar" en ResumenFinal

  useEffect(() => {
    if (!sesionActiva || sesionFinalizada) return;
    const listaEjecucion = aplanarSesion(sesionActiva);
    const ejercicioActual = listaEjecucion[indiceActual];

    if (ejercicioActual?.tipo !== 'AD' && document.hasFocus()) {
      if (!cronometroActivo) {
        const ahora = Date.now();
        setTimestampInicio(ahora);
        setTiempoAcumuladoAntesPausa(0);
        setTimestampUltimoPausa(null);
        setCronometroActiva(true);
      }
    } else {
      setCronometroActiva(false);
      setTimestampInicio(null);
      setTiempoAcumuladoAntesPausa(0);
      setTimestampUltimoPausa(null);
    }
    setPpmAlcanzado(null); // Resetear PPM al cambiar de ejercicio
  }, [indiceActual, sesionActiva, sesionFinalizada]);


  // Expandir todas las rondas por defecto cuando se abre el panel de itinerario
  useEffect(() => {
    if (mostrarItinerario && sesionActiva) {
      const S = ensureRondaIds(sesionActiva);
      const secuencia = getSecuencia(S);
      const todasLasRondas = new Set(
        secuencia
          .filter(item => item.kind === 'RONDA' && item.id)
          .map(item => item.id)
      );
      setRondasExpandidasItinerario(todasLasRondas);
    }
  }, [mostrarItinerario, sesionActiva]);

  // Escuchar eventos del modal de reportes
  useEffect(() => {
    const handleReportModalOpened = () => setReportModalAbierto(true);
    const handleReportModalClosed = () => setReportModalAbierto(false);

    window.addEventListener('report-modal-opened', handleReportModalOpened);
    window.addEventListener('report-modal-closed', handleReportModalClosed);

    return () => {
      window.removeEventListener('report-modal-opened', handleReportModalOpened);
      window.removeEventListener('report-modal-closed', handleReportModalClosed);
    };
  }, []);

  // Pausar/reanudar cronómetro cuando se abren/cierran modales
  useEffect(() => {
    const hayModalAbierto = mostrarModalCancelar || mostrarItinerario || mediaFullscreen || reportModalAbierto;

    if (hayModalAbierto && cronometroActivo && !cronometroPausadoPorModal) {
      // Pausar el cronómetro
      const ahora = Date.now();
      const tiempoDesdeInicio = timestampInicio ? Math.floor((ahora - timestampInicio) / 1000) : 0;
      setTiempoAcumuladoAntesPausa(prev => prev + tiempoDesdeInicio);
      setTimestampUltimoPausa(ahora);
      setTimestampInicio(null);
      setCronometroActiva(false);
      setCronometroPausadoPorModal(true);
    } else if (!hayModalAbierto && cronometroPausadoPorModal && sesionActiva && !sesionFinalizada) {
      // Reanudar el cronómetro
      const ahora = Date.now();
      setTimestampInicio(ahora);
      setTimestampUltimoPausa(null);
      setCronometroActiva(true);
      setCronometroPausadoPorModal(false);
    }
  }, [mostrarModalCancelar, mostrarItinerario, mediaFullscreen, reportModalAbierto, cronometroActivo, cronometroPausadoPorModal, sesionActiva, sesionFinalizada, timestampInicio]);

  const empezarSesion = async (sesion, sesionIdxProp) => {
    // Actualizar bloques con mediaLinks actuales de la base de datos
    const sesionActualizada = {
      ...sesion,
      bloques: (sesion.bloques || []).map(bloqueSnapshot => {
        // Buscar el bloque actual en la base de datos por código
        const bloqueActual = bloquesActuales.find(b => b.code === bloqueSnapshot.code);

        if (!bloqueActual) {
          console.warn(`[WARNING] Bloque ${bloqueSnapshot.code} no encontrado en la biblioteca (bloquesActuales). No se podrán cargar variaciones.`);
        }

        if (bloqueActual) {
          // VARIATIONS LOGIC INJECTION
          // Intentar resolver variación si existe contenido Y si estamos en modo repaso
          let selectedVariationMedia = null;
          let variationLabel = null;
          let selectedVariationDuration = null;

          // Only pick random variation if mode is 'repaso'
          const isRepaso = bloqueSnapshot.modo === 'repaso';
          if (isRepaso && bloqueActual.variations && bloqueActual.variations.length > 0) {
            const userLevel = alumnoActual?.nivelTecnico || 1;
            const validVars = getValidVariations(bloqueActual, userLevel);

            if (validVars) {
              const picked = pickRandomVariation(validVars);

              if (picked) {
                variationLabel = picked.label;

                // 1. Media/Multimedia (Materiales)
                // Handle rich media items if available (from content.mediaItems or similar structure in variation)
                if (picked.mediaItems && Array.isArray(picked.mediaItems)) {
                  selectedVariationMedia = picked.mediaItems;
                }
                // Fallback to assetUrl/assetUrls logic
                else if (picked.assetUrl || picked.asset_url) {
                  selectedVariationMedia = [{ url: picked.assetUrl || picked.asset_url, name: null }];
                } else if ((picked.assetUrls || picked.asset_urls) && Array.isArray(picked.assetUrls || picked.asset_urls)) {
                  selectedVariationMedia = (picked.assetUrls || picked.asset_urls).map(u => ({ url: u, name: null }));
                }

                // 2. Duration
                if (picked.duracionSeg || picked.duracion_seg) {
                  selectedVariationDuration = picked.duracionSeg || picked.duracion_seg;
                }
              }
            }
          }

          // Actualizar con mediaLinks y otras propiedades actualizadas
          // Priorizar Variación > Bloque Actual (Rich) > Bloque Actual (Legacy) > Snapshot

          // Construct final media list, normalizing to objects {url, name}
          let mediaLinksFinal = [];

          if (selectedVariationMedia) {
            mediaLinksFinal = selectedVariationMedia;
          } else if (bloqueActual.content?.mediaItems && bloqueActual.content.mediaItems.length > 0) {
            mediaLinksFinal = bloqueActual.content.mediaItems;
          } else if (bloqueActual.mediaLinks && bloqueActual.mediaLinks.length > 0) {
            mediaLinksFinal = bloqueActual.mediaLinks.map(u => typeof u === 'string' ? { url: u, name: null } : u);
          } else if (bloqueSnapshot.mediaLinks && bloqueSnapshot.mediaLinks.length > 0) {
            mediaLinksFinal = bloqueSnapshot.mediaLinks.map(u => typeof u === 'string' ? { url: u, name: null } : u);
          }

          const baseName = bloqueActual.nombre || bloqueSnapshot.nombre;
          const finalName = variationLabel ? `${baseName} / ${variationLabel}` : baseName;

          return {
            ...bloqueSnapshot,
            nombre: finalName,
            mediaLinks: mediaLinksFinal, // Now populated with rich objects if available
            // Mantener otras propiedades actualizadas si existen
            // Instructions/Indicators always come from the Base/Snaphost
            instrucciones: bloqueActual.instrucciones || bloqueSnapshot.instrucciones,
            indicadorLogro: bloqueActual.indicadorLogro || bloqueSnapshot.indicadorLogro,
            materialesRequeridos: bloqueActual.materialesRequeridos || bloqueSnapshot.materialesRequeridos || [],
            duracionSeg: selectedVariationDuration || bloqueActual.duracionSeg || bloqueSnapshot.duracionSeg || 0,
            targetPPMs: bloqueActual.targetPPMs || bloqueSnapshot.targetPPMs || [],
            // Inyectar info de variación para UI (opcional)
            variationName: variationLabel
          };
        }
        return bloqueSnapshot;
      })
    };


    setSesionActiva(sesionActualizada);
    setIndiceActual(0);
    setTiempoActual(0);
    setCronometroActiva(false);
    setCompletados(new Set());
    setOmitidos(new Set());
    setSesionFinalizada(false);
    setDatosFinal(null);
    setRegistroSesionId(null); // No hay ID hasta finalizar
    bloquesPendientesRef.current = []; // Reiniciar bloques pendientes

    const timestampInicio = Date.now();
    setTimestampInicio(timestampInicio);
    setTimestampUltimoPausa(null);
    setTiempoAcumuladoAntesPausa(0);
  };

  // Listener para el hotkey global Ctrl+Alt+S "Studia ahora"
  // DEBE estar después de la declaración de empezarSesion
  useEffect(() => {
    const handleStartStudySession = async () => {
      // Verificar que no hay sesión activa
      if (sesionActiva) return;

      // Verificar que hay asignación activa y semana del plan
      if (!asignacionActiva || !semanaDelPlan) {
        toast.info('No tienes asignaciones activas. Habla con tu profesor.');
        return;
      }

      // Verificar que hay sesiones disponibles
      if (!semanaDelPlan.sesiones || semanaDelPlan.sesiones.length === 0) {
        toast.info('No hay sesiones disponibles para esta semana.');
        return;
      }

      // Seleccionar automáticamente la primera sesión si no hay ninguna seleccionada
      // o si la seleccionada no es válida
      const primeraSesionIdx = 0;
      const primeraSesion = semanaDelPlan.sesiones[primeraSesionIdx];

      if (!primeraSesion) {
        toast.info('No hay sesiones disponibles para esta semana.');
        return;
      }

      // Asegurar que la sesión esté seleccionada
      setSesionSeleccionada(primeraSesionIdx);

      // Iniciar la primera sesión automáticamente
      await empezarSesion(primeraSesion, primeraSesionIdx);
    };

    window.addEventListener('start-study-session', handleStartStudySession);

    return () => {
      window.removeEventListener('start-study-session', handleStartStudySession);
    };
  }, [asignacionActiva, semanaDelPlan, sesionActiva, empezarSesion, setSesionSeleccionada]);

  const cerrarSesion = () => {
    setCronometroActiva(false);
    setSesionActiva(null);
    setIndiceActual(0);
    setTiempoActual(0);
    setCompletados(new Set());
    setOmitidos(new Set());
    setPantallaCompleta(false);
    setMostrarItinerario(false);
    setSesionFinalizada(false);
    setDatosFinal(null);
    setRegistroSesionId(null);
    setTimestampInicio(null);
    setTimestampUltimoPausa(null);
    setTiempoAcumuladoAntesPausa(0);
  };

  const reiniciarSesion = () => {
    setIndiceActual(0);
    setTiempoActual(0);
    setCronometroActiva(false);
    setCompletados(new Set());
    setOmitidos(new Set());
    setSesionFinalizada(false);
    setDatosFinal(null);

    const ahora = Date.now();
    setTimestampInicio(ahora);
    setTimestampUltimoPausa(null);
    setTiempoAcumuladoAntesPausa(0);
  };

  const togglePlayPausa = () => {
    const ahora = Date.now();

    if (cronometroActivo) {
      const tiempoDesdeInicio = timestampInicio ? Math.floor((ahora - timestampInicio) / 1000) : 0;
      setTiempoAcumuladoAntesPausa(prev => prev + tiempoDesdeInicio);
      setTimestampUltimoPausa(ahora);
      setTimestampInicio(null);
      setCronometroActiva(false);
    } else {
      setTimestampInicio(ahora);
      setTimestampUltimoPausa(null);
      setCronometroActiva(true);
    }
  };

  const handleAnterior = () => {
    if (indiceActual > 0) {
      setCronometroActiva(false);
      setIndiceActual(prev => prev - 1);
      setTiempoActual(0);
      const ahora = Date.now();
      setTimestampInicio(ahora);
      setTiempoAcumuladoAntesPausa(0);
      setTimestampUltimoPausa(null);
    }
  };

  const omitirYAvanzar = async () => {
    const listaEjecucion = aplanarSesion(sesionActiva);

    await guardarRegistroBloque(indiceActual, 'omitido', 0);

    const newCompletados = new Set(completados);
    const newOmitidos = new Set(omitidos);
    newOmitidos.add(indiceActual);
    newCompletados.delete(indiceActual);
    setCompletados(newCompletados);
    setOmitidos(newOmitidos);

    // NO actualizar registro de sesión aquí - solo se actualiza al final en ResumenFinal

    toast.info("⏭️ Ejercicio omitido");

    if (indiceActual === listaEjecucion.length - 1) {
      setSesionFinalizada(true);
    } else {
      setCronometroActiva(false);
      setIndiceActual(prev => prev + 1);
      setTiempoActual(0);
      const ahora = Date.now();
      setTimestampInicio(ahora);
      setTiempoAcumuladoAntesPausa(0);
      setTimestampUltimoPausa(null);
    }
  };

  const completarYAvanzar = async () => {
    const listaEjecucion = aplanarSesion(sesionActiva);

    await guardarRegistroBloque(indiceActual, 'completado', tiempoActual);

    const newCompletados = new Set(completados);
    const newOmitidos = new Set(omitidos);
    newCompletados.add(indiceActual);
    newOmitidos.delete(indiceActual);
    setCompletados(newCompletados);
    setOmitidos(newOmitidos);

    // NO actualizar registro de sesión aquí - solo se actualiza al final en ResumenFinal

    if (indiceActual === listaEjecucion.length - 1) {
      setSesionFinalizada(true);
    } else {
      setCronometroActiva(false);
      setIndiceActual(prev => prev + 1);
      setTiempoActual(0);
      const ahora = Date.now();
      setTimestampInicio(ahora);
      setTiempoAcumuladoAntesPausa(0);
      setTimestampUltimoPausa(null);
    }
  };

  // Manejo de atajos de teclado - debe estar después de las definiciones de funciones
  useEffect(() => {
    if (!sesionActiva || sesionFinalizada) return;

    const handleKeyDown = (e) => {
      // No procesar si hay un modal abierto (excepto para cerrar modales)
      const hayModalAbierto = mostrarModalCancelar || mostrarItinerario || mediaFullscreen || reportModalAbierto;

      // Permitir Escape siempre para cerrar modales
      if (e.key === 'Escape') {
        e.preventDefault();
        if (mediaFullscreen) {
          setMediaFullscreen(null);
        } else if (mostrarItinerario) {
          setMostrarItinerario(false);
        } else if (mostrarModalCancelar) {
          setMostrarModalCancelar(false);
        } else if (sesionActiva && !sesionFinalizada) {
          // Si no hay modales abiertos y hay sesión activa, abrir modal de cancelar
          setMostrarModalCancelar(true);
        }
        return;
      }

      // Si el modal de reporte está abierto, no permitir ningún hotkey (excepto Escape)
      if (reportModalAbierto) {
        return;
      }

      // Permitir 'I' para toggle del índice siempre (incluso cuando está abierto, excepto con modal de reporte)
      if (e.key === 'i' || e.key === 'I') {
        e.preventDefault();
        setMostrarItinerario(prev => !prev);
        return;
      }

      // Permitir '?' para toggle de ayuda siempre (incluso cuando está abierto, excepto con modal de reporte)
      if (e.key === '?') {
        e.preventDefault();
        setShowHotkeysModal(prev => !prev);
        return;
      }

      // Si hay un modal abierto, no procesar otros atajos
      if (hayModalAbierto) return;

      // Usar helper centralizado para detectar campos editables
      if (shouldIgnoreHotkey(e)) return;

      // Espacio: play/pause del reproductor de audio
      if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault();
        const listaEjecucion = aplanarSesion(sesionActiva);
        const ejercicioActual = listaEjecucion[indiceActual];
        if (ejercicioActual?.tipo !== 'AD') {
          togglePlayPausa();
        }
      }

      // Flecha izquierda: ejercicio anterior
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        if (indiceActual > 0) {
          handleAnterior();
        }
      }

      // Flecha derecha: ejercicio siguiente
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        const listaEjecucion = aplanarSesion(sesionActiva);
        if (indiceActual < listaEjecucion.length - 1) {
          omitirYAvanzar(); // O usar completarYAvanzar según lógica
        }
      }

      // Tecla O: completar ejercicio actual (OK)
      if (e.key === 'o' || e.key === 'O') {
        e.preventDefault();
        completarYAvanzar();
      }

      // Enter: también completar ejercicio (mantener compatibilidad)
      if (e.key === 'Enter') {
        e.preventDefault();
        completarYAvanzar();
      }

      // Tecla N: omitir ejercicio (mantener compatibilidad)
      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        omitirYAvanzar();
      }

      // Tecla P: ejercicio anterior (mantener compatibilidad)
      if (e.key === 'p' || e.key === 'P') {
        e.preventDefault();
        handleAnterior();
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);

    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [sesionActiva, sesionFinalizada, indiceActual, mediaFullscreen, mostrarItinerario, mostrarModalCancelar, togglePlayPausa, completarYAvanzar, omitirYAvanzar, handleAnterior, reportModalAbierto, setShowHotkeysModal]);

  const handleCancelar = () => {
    setMostrarModalCancelar(true);
  };

  const guardarYSalir = async () => {
    // NO actualizar registro aquí - solo se actualiza al final en ResumenFinal cuando el usuario presiona "Finalizar"
    setMostrarModalCancelar(false);
    // Finalizar la sesión para mostrar el feedback en lugar de cerrar directamente
    setSesionFinalizada(true);
  };

  const salirSinGuardar = () => {
    setMostrarModalCancelar(false);
    cerrarSesion();
  };

  const navegarA = (idx) => {
    setCronometroActiva(false);
    setIndiceActual(idx);
    setTiempoActual(0);
    const ahora = Date.now();
    setTimestampInicio(ahora);
    setTiempoAcumuladoAntesPausa(0);
    setTimestampUltimoPausa(null);
    setMostrarItinerario(false);
  };


  const tipoColors = {
    CA: componentStyles.status.badgeDefault, // brand -> default
    CB: componentStyles.status.badgeInfo,
    TC: componentStyles.status.badgeDefault, // purple -> default
    TM: componentStyles.status.badgeSuccess,
    FM: componentStyles.status.badgeDefault, // pink -> default
    VC: componentStyles.status.badgeInfo, // cyan -> info
    AD: componentStyles.status.badgeDefault,
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
    RIT: componentStyles.status.badgeDefault, // purple -> default
    ART: componentStyles.status.badgeSuccess,
    'S&A': componentStyles.status.badgeDefault, // brand -> default
  };

  const finalizarSesion = async (calidad, notas, mediaLinks) => {
    if (!asignacionActiva || !sesionActiva) return;

    const listaEjecucion = aplanarSesion(sesionActiva);
    const tiempoPrevisto = listaEjecucion
      .filter(e => e.tipo !== 'AD')
      .reduce((sum, e) => sum + (e.duracionSeg || 0), 0);

    // Calcular duración total real sumando duraciones de bloques completados
    // Esto asegura consistencia con los bloques guardados
    const duracionRealTotal = bloquesPendientesRef.current.reduce((acc, b) => acc + (b.duracionRealSeg || 0), 0);

    const dataRegistro = {
      asignacionId: asignacionActiva.id,
      alumnoId: userIdActual,
      profesorAsignadoId: alumnoActual?.profesorAsignadoId || null,
      semanaIdx: semanaIdx,
      sesionIdx: semanaDelPlan?.sesiones?.indexOf(sesionActiva) || 0,
      inicioISO: timestampInicio ? new Date(timestampInicio).toISOString() : new Date().toISOString(),
      finISO: new Date().toISOString(),
      duracionRealSeg: duracionRealTotal, // Usar la suma de bloques
      duracionObjetivoSeg: tiempoPrevisto,
      bloquesTotales: listaEjecucion.length,
      bloquesCompletados: completados.size,
      bloquesOmitidos: omitidos.size,
      finalizada: true,
      finAnticipado: false,
      motivoFin: null,
      calificacion: calidad,
      notas: notas,
      mediaLinks: mediaLinks || [],
      dispositivo: navigator.userAgent,
      versionSchema: "1.0",
      piezaNombre: asignacionActiva.piezaSnapshot?.nombre || '',
      planNombre: asignacionActiva.plan?.nombre || '',
      semanaNombre: semanaDelPlan?.nombre || '',
      sesionNombre: sesionActiva.nombre || '',
      foco: sesionActiva.foco || 'GEN',
    };

    try {
      // 1. Crear la sesión
      const nuevoRegistro = await localDataClient.entities.RegistroSesion.create(dataRegistro);
      const nuevoId = nuevoRegistro.id;
      setRegistroSesionId(nuevoId);

      // 2. Guardar todos los bloques pendientes vinculados a esta sesión
      const promesasBloques = bloquesPendientesRef.current.map(bloque => {
        return localDataClient.entities.RegistroBloque.create({
          ...bloque,
          registroSesionId: nuevoId
        });
      });

      await Promise.all(promesasBloques);

      toast.success("✅ Sesión guardada correctamente");

      // Limpiar cola
      bloquesPendientesRef.current = [];

    } catch (error) {
      console.error("Error al guardar sesión:", error);
      toast.error("❌ Error al guardar la sesión. Se intentará guardar localmente.");

      // En caso de error, guardar en cola offline (implementación simplificada)
      colaOfflineRef.current.push({
        tipo: 'sesion_completa',
        data: {
          sesion: dataRegistro,
          bloques: bloquesPendientesRef.current
        },
        timestamp: Date.now(),
      });
    }
  };

  // Resumen final
  if (sesionActiva && sesionFinalizada) {
    const listaEjecucion = aplanarSesion(sesionActiva);
    const tiempoPrevisto = listaEjecucion
      .filter(e => e.tipo !== 'AD')
      .reduce((sum, e) => sum + (e.duracionSeg || 0), 0);

    return (
      <ResumenFinal
        sesion={sesionActiva}
        tiempoReal={datosFinal?.tiempoReal || tiempoActual}
        tiempoPrevisto={tiempoPrevisto}
        completados={completados}
        omitidos={omitidos}
        totalEjercicios={listaEjecucion.length}
        onGuardarYSalir={cerrarSesion}
        onReiniciar={reiniciarSesion}
        open={sesionFinalizada}
        onOpenChange={(open) => {
          if (!open) {
            // Si se cierra el modal sin guardar, cerrar la sesión
            cerrarSesion();
          }
        }}
        onCalidadNotas={async (calidad, notas, mediaLinks) => {
          setDatosFinal(prev => ({ ...prev, calidad, notas, mediaLinks }));
          await finalizarSesion(calidad, notas, mediaLinks);
        }}
        // Props adicionales para subida de vídeo
        userId={userIdActual}
        userProfile={alumnoActual}
        registroSesionId={registroSesionId}
        profesorAsignadoId={alumnoActual?.profesorAsignadoId}
      />
    );
  }

  // Player activo
  if (sesionActiva) {
    const listaEjecucion = aplanarSesion(sesionActiva);

    // Validar si la sesión está vacía
    if (!listaEjecucion || listaEjecucion.length === 0) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <Alert className={`max-w-2xl ${componentStyles.containers.panelBase} border-[var(--color-warning)] bg-[var(--color-warning)]/10`}>
            <AlertTriangle className="h-5 w-5 text-[var(--color-warning)]" />
            <AlertTitle className={`${componentStyles.typography.sectionTitle} text-[var(--color-warning)]`}>
              Sesión vacía
            </AlertTitle>
            <AlertDescription className={`${componentStyles.typography.bodyText} text-[var(--color-text-primary)] mt-2`}>
              Esta sesión no tiene ejercicios. Elige otra sesión, descansa o contacta con tu profesor.
            </AlertDescription>
            <div className="mt-4">
              <Button
                variant="outline"
                onClick={() => setSesionActiva(null)}
                className="rounded-xl focus-brand"
              >
                Volver a la lista
              </Button>
            </div>
          </Alert>
        </div>
      );
    }

    // Validar que el índice esté dentro del rango
    const indiceValido = Math.max(0, Math.min(indiceActual, listaEjecucion.length - 1));
    if (indiceActual !== indiceValido) {
      setIndiceActual(indiceValido);
      return null; // Renderizará de nuevo con el índice corregido
    }

    const ejercicioActual = listaEjecucion[indiceActual];

    // Validar que ejercicioActual existe (doble validación)
    if (!ejercicioActual) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <Alert className={`max-w-2xl ${componentStyles.containers.panelBase} border-[var(--color-danger)] bg-[var(--color-danger)]/10`}>
            <AlertTriangle className="h-5 w-5 text-[var(--color-danger)]" />
            <AlertTitle className={`${componentStyles.typography.sectionTitle} text-[var(--color-danger)]`}>
              Error al cargar el ejercicio
            </AlertTitle>
            <AlertDescription className={`${componentStyles.typography.bodyText} text-[var(--color-text-primary)] mt-2`}>
              No se pudo cargar el ejercicio actual. Por favor, vuelve a la lista de sesiones.
            </AlertDescription>
            <div className="mt-4">
              <Button
                variant="outline"
                onClick={() => setSesionActiva(null)}
                className="rounded-xl focus-brand"
              >
                Volver a la lista
              </Button>
            </div>
          </Alert>
        </div>
      );
    }

    const progreso = ((indiceActual + 1) / listaEjecucion.length) * 100;
    const isAD = ejercicioActual?.tipo === 'AD';
    const isFM = ejercicioActual?.tipo === 'FM';
    const isUltimo = indiceActual === listaEjecucion.length - 1;

    const elementosFM = isFM ? (
      ejercicioActual.elementosOrdenados && ejercicioActual.elementosOrdenados.length > 0
        ? ejercicioActual.elementosOrdenados.map(nombre =>
          asignacionActiva.piezaSnapshot?.elementos?.find(e => e.nombre === nombre)
        ).filter(Boolean)
        : asignacionActiva.piezaSnapshot?.elementos || []
    ) : [];

    const tiempoTotalPrevisto = listaEjecucion
      .filter(e => e.tipo !== 'AD')
      .reduce((sum, e) => sum + (e.duracionSeg || 0), 0);

    // Calcular porcentaje del tiempo del ejercicio actual
    const porcentajeEjercicio = ejercicioActual?.duracionSeg > 0
      ? (tiempoActual / ejercicioActual.duracionSeg) * 100
      : 0;
    const porcentajeEjercicioLimitado = Math.min(porcentajeEjercicio, 100);
    const tiempoRestante = ejercicioActual?.duracionSeg > 0
      ? Math.max(0, ejercicioActual.duracionSeg - tiempoActual)
      : 0;
    const excedido = tiempoActual > (ejercicioActual?.duracionSeg || 0);
    // Verificar si está en rango de warning (90-100%)
    const enRangoWarning = !excedido && porcentajeEjercicio >= 90 && porcentajeEjercicio <= 100;

    // Calcular información de rondas para el stepper
    const totalRondas = sesionActiva?.rondas?.length || 0;
    const rondaActual = ejercicioActual?.esRonda ? (ejercicioActual.rondaIdx + 1) : null;
    const repeticionActual = ejercicioActual?.esRonda ? ejercicioActual.repeticion : null;
    const totalRepeticiones = ejercicioActual?.esRonda ? ejercicioActual.totalRepeticiones : null;

    // Componente del stepper de rondas
    const RoundStepper = ({ compact = false }) => {
      if (!ejercicioActual?.esRonda || totalRondas === 0) return null;

      return (
        <div className="flex flex-col items-center gap-1.5 shrink-0">
          {/* Stepper visual: mini cápsulas */}
          <div className="flex items-center gap-1.5">
            {Array.from({ length: totalRondas }).map((_, idx) => {
              const rondaNum = idx + 1;
              const isActive = rondaNum === rondaActual;
              return (
                <div
                  key={idx}
                  className={cn(
                    "h-2 w-2 rounded-full transition-all duration-300",
                    isActive
                      ? "bg-[var(--color-primary)]"
                      : "border border-[var(--color-border-default)]/50 bg-transparent"
                  )}
                  title={`Ronda ${rondaNum}`}
                />
              );
            })}
          </div>
          {/* Texto "Ronda X de Y" */}
          <span className="text-[10px] sm:text-xs text-[var(--color-text-secondary)] font-medium tabular-nums">
            Ronda {rondaActual} de {totalRondas}
            {repeticionActual && totalRepeticiones && (
              <span className="text-[var(--color-text-tertiary)]"> • Rep {repeticionActual}/{totalRepeticiones}</span>
            )}
          </span>
        </div>
      );
    };

    return (
      <div className="bg-background transition-all duration-300 ease-in-out" style={{
        paddingBottom: timerCollapsed ? '80px' : '150px'
      }}>
        {/* Timer dock inferior fijo - Una única barra con dos filas */}
        {sesionActiva && (
          <div
            ref={footerRef}
            className={cn(
              "fixed bottom-0 left-0 right-0 z-50 bg-[var(--color-surface-elevated)] border-t border-[var(--color-border-default)] shadow-[0_-4px_12px_rgba(0,0,0,0.08)] transition-all duration-300 ease-in-out pb-[env(safe-area-inset-bottom)]",
              timerCollapsed ? "h-[80px]" : "min-h-[80px]"
            )}
          >
            {/* Botón de reporte - Posicionado absolutamente, separación constante */}
            <div className="absolute right-4 bottom-full mb-4 z-[50]">
              <ReportErrorButtonInTimer />
            </div>

            {/* Barra de progreso - SIEMPRE en el borde superior, de lado a lado, MISMO grosor en expandido y colapsado */}
            {!isAD && ejercicioActual?.duracionSeg > 0 && (
              <div className={cn(
                "w-full rounded-full h-2 md:h-2.5 overflow-hidden transition-all duration-300",
                enRangoWarning ? 'bg-[var(--color-warning)]/20 shadow-[0_0_8px_rgba(245,158,11,0.4)]' : 'bg-[var(--color-border-default)]/30'
              )}>
                <div
                  className={cn(
                    "h-full transition-all duration-300",
                    excedido ? 'bg-[var(--color-danger)]' : enRangoWarning ? 'bg-[var(--color-warning)] animate-warning-glow' : 'bg-[var(--color-primary)]'
                  )}
                  style={{ width: `${porcentajeEjercicioLimitado}%` }}
                />
              </div>
            )}

            {/* Fila principal - Siempre visible (tanto expandido como colapsado) */}
            <div className="max-w-5xl mx-auto px-4 py-2">
              <div className="flex items-center justify-between gap-3">
                {/* Izquierda: Tiempo */}
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <Clock className={cn(
                    "w-4 h-4 shrink-0",
                    excedido ? "text-[var(--color-danger)]" : enRangoWarning ? "text-[var(--color-warning)]" : "text-[var(--color-primary)]"
                  )} />
                  <div className="flex flex-col min-w-0">
                    <div className={cn(
                      "text-base font-mono font-bold tabular-nums leading-tight",
                      excedido ? "text-[var(--color-danger)]" : enRangoWarning ? "text-[var(--color-warning)]" : "text-[var(--color-text-primary)]"
                    )}>
                      {Math.floor(tiempoActual / 60)}:{String(tiempoActual % 60).padStart(2, '0')}
                    </div>
                    {!isAD && ejercicioActual?.duracionSeg > 0 && (
                      <div className="text-[10px] text-[var(--color-text-secondary)] font-mono tabular-nums leading-tight">
                        / {Math.floor(ejercicioActual.duracionSeg / 60)}:{String((ejercicioActual.duracionSeg % 60)).padStart(2, '0')}
                      </div>
                    )}
                  </div>

                  {/* Piano Toggle - Icon only, left side near clock */}
                  <Button
                    variant={mostrarPiano ? "default" : "ghost"}
                    size="sm"
                    onClick={handleTogglePiano}
                    className={cn(
                      "h-8 w-8 p-0 rounded-lg shrink-0 ml-1 transition-colors",
                      mostrarPiano
                        ? "bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary)]/90"
                        : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-primary)]"
                    )}
                    title="Piano (T)"
                    aria-label={mostrarPiano ? "Ocultar piano" : "Mostrar piano"}
                  >
                    <Piano className="w-4 h-4" />
                  </Button>
                </div>

                {/* Centro: Controles - Solo visible cuando expandido */}
                {!timerCollapsed && (
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {/* Atrás */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleAnterior}
                      disabled={indiceActual === 0}
                      className="h-9 flex-[0.5] min-w-0 rounded-lg"
                      title="Anterior (P)"
                      aria-label="Ejercicio anterior"
                    >
                      <ChevronLeft className="w-4 h-4 mr-1.5 shrink-0" />
                      <span className="truncate">Atrás</span>
                    </Button>

                    {/* Play/Pause */}
                    {!isAD && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={togglePlayPausa}
                        className="h-9 w-9 p-0 rounded-lg shrink-0"
                        title={cronometroActivo ? "Pausar (Espacio)" : "Reproducir (Espacio)"}
                        aria-label={cronometroActivo ? "Pausar cronómetro" : "Iniciar cronómetro"}
                      >
                        {cronometroActivo ? (
                          <Pause className="w-4 h-4" />
                        ) : (
                          <Play className="w-4 h-4" />
                        )}
                      </Button>
                    )}




                    {/* OK - Botón primario */}
                    <Button
                      variant="primary"
                      onClick={completarYAvanzar}
                      className="h-9 flex-[0.5] min-w-0 bg-[var(--color-success)] hover:bg-[var(--color-success)]/90 font-semibold text-sm rounded-lg focus-brand shadow-sm text-white"
                      title="Completar (Enter)"
                      aria-label={isUltimo ? 'Finalizar sesión' : 'Completar y continuar'}
                    >
                      <CheckCircle className="w-4 h-4 mr-1.5 shrink-0" />
                      <span className="truncate">{isUltimo ? 'Finalizar' : 'OK'}</span>
                    </Button>

                    {/* Saltar */}
                    {!isUltimo && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={omitirYAvanzar}
                        className="h-9 flex-[0.5] min-w-0 rounded-lg"
                        title="Omitir y pasar (N)"
                        aria-label="Omitir ejercicio"
                      >
                        <ChevronsRight className="w-4 h-4 mr-1.5 shrink-0" />
                        <span className="truncate">Saltar</span>
                      </Button>
                    )}
                  </div>
                )}

                {/* OK en modo compacto (cuando colapsado) */}
                {timerCollapsed && (
                  <Button
                    variant="primary"
                    onClick={completarYAvanzar}
                    className="h-9 px-4 bg-[var(--color-success)] hover:bg-[var(--color-success)]/90 font-semibold text-sm rounded-lg focus-brand shadow-sm text-white"
                    title="Completar (Enter)"
                    aria-label={isUltimo ? 'Finalizar sesión' : 'Completar y continuar'}
                  >
                    <CheckCircle className="w-4 h-4 mr-1" />
                    {isUltimo ? 'Finalizar' : 'OK'}
                  </Button>
                )}

                {/* Derecha: Pill de progreso + Botón colapsar/expandir */}
                <div className="flex items-center gap-2 shrink-0">
                  {/* Pill de progreso */}
                  {sesionActiva && listaEjecucion.length > 0 && (
                    <div className={cn(
                      "flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-bold text-xs transition-all",
                      "bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/30",
                      "text-[var(--color-primary)]"
                    )}>
                      <Target className="w-3.5 h-3.5" />
                      <span className="font-mono tabular-nums">
                        {indiceActual + 1}<span className="text-[var(--color-text-secondary)] font-normal">/{listaEjecucion.length}</span>
                      </span>
                    </div>
                  )}

                  {/* Botón colapsar/expandir */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setTimerCollapsed(!timerCollapsed)}
                    className="h-9 w-9 p-0"
                    aria-label={timerCollapsed ? "Expandir timer" : "Colapsar timer"}
                  >
                    {timerCollapsed ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>

            {/* Fila secundaria - Solo en modo expandido: Breadcrumb de ejercicios */}
            {!timerCollapsed && sesionActiva && listaEjecucion.length > 0 && (
              <div className="max-w-5xl mx-auto px-4 pb-3 border-t border-[var(--color-border-default)]/50 pt-2">
                <TooltipProvider>
                  <div className="flex items-center gap-1.5 pb-2 overflow-x-auto scrollbar-hide">
                    {listaEjecucion.map((ej, idx) => {
                      const isActive = idx === indiceActual;
                      const isCompleted = completados.has(idx);
                      const isOmitted = omitidos.has(idx);

                      // Formatear label: código corto
                      let label = ej.tipo;
                      if (ej.esRonda && ej.rondaIdx !== undefined && ej.repeticion !== undefined) {
                        label = `${ej.tipo} R${ej.rondaIdx + 1}-${ej.repeticion}`;
                      }

                      const nombreEjercicio = ej.nombre || `${ej.tipo}${ej.esRonda ? ` - Ronda ${ej.rondaIdx + 1}, Repetición ${ej.repeticion}/${ej.totalRepeticiones}` : ''}`;

                      return (
                        <React.Fragment key={idx}>
                          {idx > 0 && <ChevronRight className="w-3 h-3 text-[var(--color-text-muted)] shrink-0" />}
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div
                                className={cn(
                                  "px-2 py-0.5 rounded text-xs font-medium shrink-0 transition-all whitespace-nowrap flex items-center gap-1 cursor-default",
                                  isActive
                                    ? "bg-[var(--color-primary)] text-white shadow-sm"
                                    : isCompleted
                                      ? "bg-[var(--color-success)]/20 text-[var(--color-success)] border border-[var(--color-success)]/30"
                                      : isOmitted
                                        ? "bg-[var(--color-warning)]/20 text-[var(--color-warning)] border border-[var(--color-warning)]/30"
                                        : "bg-[var(--color-surface-muted)] text-[var(--color-text-secondary)] border border-[var(--color-border-default)]"
                                )}
                              >
                                {isCompleted && <CheckCircle className="w-3 h-3" />}
                                <span>{label}</span>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="max-w-xs">{nombreEjercicio}</p>
                            </TooltipContent>
                          </Tooltip>
                        </React.Fragment>
                      );
                    })}
                  </div>
                </TooltipProvider>
                {/* Nombre corto del ejercicio actual (opcional) */}
                {ejercicioActual?.nombre && (
                  <div className="px-2">
                    <span className="text-xs text-[var(--color-text-secondary)] truncate block">
                      {ejercicioActual.nombre}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        )
        }

        {/* Header del Player */}
        <div className="page-header header-modern lg:sticky lg:top-0 z-10">
          <div className="px-2 sm:px-3 md:px-6 py-1 sm:py-1.5 md:py-2">
            <div className="max-w-5xl mx-auto">
              <div className="flex items-center gap-1.5 sm:gap-2 md:gap-2.5 mb-0 sm:mb-0.5 md:mb-1">
                <PlayCircle className="w-4 h-4 sm:w-4 sm:h-4 md:w-5 md:h-5 text-[var(--color-primary)]" />
                <h1 className={`${componentStyles.typography.pageTitle} text-base sm:text-lg md:text-xl lg:text-2xl flex-1 min-w-0`}>
                  <span className="truncate block">{ejercicioActual?.nombre || 'Ejercicio sin nombre'}</span>
                  {ejercicioActual?.esRonda && (
                    <div className="flex items-center gap-2 mt-1">
                      {/* Stepper visual: mini cápsulas */}
                      <div className="flex items-center gap-1">
                        {Array.from({ length: totalRondas }).map((_, idx) => {
                          const rondaNum = idx + 1;
                          const isActive = rondaNum === rondaActual;
                          return (
                            <div
                              key={idx}
                              className={cn(
                                "h-1.5 w-1.5 rounded-full transition-all duration-300",
                                isActive
                                  ? "bg-[var(--color-primary)]"
                                  : "border border-[var(--color-border-default)]/50 bg-transparent"
                              )}
                              title={`Ronda ${rondaNum}`}
                            />
                          );
                        })}
                      </div>
                      {/* Texto "Ronda X de Y" */}
                      <span className="text-xs sm:text-sm text-[var(--color-text-secondary)] font-normal tabular-nums">
                        Ronda {rondaActual} de {totalRondas} • Rep {repeticionActual}/{totalRepeticiones}
                      </span>
                    </div>
                  )}
                </h1>
                <div className="flex items-center gap-1 shrink-0">
                  <Button variant="ghost" size="sm" className="h-11 w-11 sm:h-9 sm:w-9 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 p-0 rounded-xl focus-brand touch-manipulation" onClick={() => setMostrarItinerario(true)} aria-label="Mostrar índice de ejercicios">
                    <List className="w-5 h-5 sm:w-4 sm:h-4" />
                  </Button>
                  <Button variant="ghost" size="sm" className="h-11 w-11 sm:h-9 sm:w-9 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 p-0 rounded-xl focus-brand touch-manipulation" onClick={() => setShowHotkeysModal(true)} aria-label="Mostrar atajos de teclado">
                    <HelpCircle className="w-5 h-5 sm:w-4 sm:h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-11 w-11 sm:h-9 sm:w-9 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 p-0 rounded-xl focus-brand hover:bg-[var(--color-danger)]/10 hover:text-[var(--color-danger)] transition-colors touch-manipulation"
                    onClick={handleCancelar}
                    aria-label="Salir del modo estudio"
                    title="Salir (Esc)"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Breadcrumbs */}
              <div className="hidden sm:flex items-center mb-0.5 md:mb-1">
                <div className="w-8 md:w-12 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className={`${componentStyles.typography.pageSubtitle} text-xs sm:text-sm md:text-base flex items-center gap-2 flex-wrap`}>
                    <Music className="w-3 h-3 text-[var(--color-primary)] shrink-0" />
                    <span className="font-medium">{asignacionActiva.piezaSnapshot?.nombre}</span>
                    <span className="text-[var(--color-text-secondary)]">•</span>
                    <Target className="w-3 h-3 text-[var(--color-info)] shrink-0" />
                    <span>{asignacionActiva.plan?.nombre}</span>
                    <span className="text-[var(--color-text-secondary)]">•</span>
                    <Badge className={focoColors[sesionActiva.foco]} variant="outline">
                      {focoLabels[sesionActiva.foco]}
                    </Badge>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Contenido del ejercicio - Tarjeta principal unificada */}
        <div
          className="max-w-[900px] md:max-w-[1000px] mx-auto p-4 md:p-6"
        >
          <Card className="app-card shadow-md">
            <CardContent className="p-3 md:p-4 lg:p-6 space-y-3 md:space-y-4">
              {isAD && (
                <Alert className={`${componentStyles.containers.panelBase} border-[var(--color-primary)] bg-[var(--color-primary-soft)]`}>
                  <AlertTriangle className="h-4 w-4 text-[var(--color-primary)]" />
                  <AlertDescription className={`${componentStyles.typography.bodyText} text-[var(--color-text-primary)]`}>
                    Este ejercicio no suma tiempo real
                  </AlertDescription>
                </Alert>
              )}

              {/* Objetivo de logro */}
              {ejercicioActual.indicadorLogro && (
                <div className="border-b border-[var(--color-border-default)] pb-3 md:pb-4">
                  <p className={`${componentStyles.typography.sectionTitle} text-[var(--color-info)] mb-1.5 md:mb-2`}>💡 Objetivo de logro</p>
                  <p className="text-sm text-[var(--color-text-primary)] whitespace-pre-wrap leading-relaxed">{ejercicioActual.indicadorLogro}</p>
                </div>
              )}

              {/* Instrucciones */}
              {ejercicioActual.instrucciones && (
                <div className="border-b border-[var(--color-border-default)] pb-3 md:pb-4">
                  <p className={`${componentStyles.typography.sectionTitle} text-[var(--color-text-primary)] mb-1.5 md:mb-2`}>📋 Instrucciones</p>
                  <p className="text-sm text-[var(--color-text-primary)] whitespace-pre-wrap leading-relaxed">
                    {ejercicioActual.instrucciones}
                  </p>
                </div>
              )}

              {!isAD && ejercicioActual.targetPPMs?.length > 0 && (() => {
                // Lógica estricta: mostrar metrónomo SOLO si hay targetPPM para el nivel del alumno
                const nivelAlumno = alumnoActual?.nivelTecnico || 1;
                // Buscar target exacto para el nivel
                const target = ejercicioActual.targetPPMs.find(t => t.nivel === nivelAlumno);

                if (target) {
                  return (
                    <div className="border-b border-[var(--color-border-default)] pb-3 md:pb-4">
                      <div className="mb-4 p-3 bg-[var(--color-info)]/10 text-[var(--color-info)] rounded-lg flex items-center gap-2 text-sm font-medium border border-[var(--color-info)]/20">
                        <span>🎯</span>
                        <span>Tempo objetivo (Nivel {target.nivel}): {target.unidad || 'Negra'} = {target.bpm} bpm</span>
                      </div>
                      <Metronomo
                        initialBpm={target.bpm}
                        onPpmChange={setPpmAlcanzado}
                      />
                    </div>
                  );
                }
                // Si no hay target para este nivel, NO renderizar nada (ni metrónomo ni aviso)
                return null;
              })()}

              {/* Material de la pieza */}
              {!isAD && (isFM ? elementosFM.length > 0 : ((ejercicioActual.media && Object.keys(ejercicioActual.media).length > 0) || (ejercicioActual.mediaLinks && ejercicioActual.mediaLinks.length > 0))) && (
                <div className="border-b border-[var(--color-border-default)] pb-3 md:pb-4 last:border-b-0">
                  <p className={`${componentStyles.typography.sectionTitle} text-[var(--color-text-primary)] mb-2 md:mb-3`}>
                    {isFM ? '🎼 Material de la Pieza' : '📎 Material de Práctica'}
                  </p>
                  <div className="space-y-4">
                    {/* Renderizado de materiales optimizado */}
                    {(isFM ? (elementosFM[0]?.mediaLinks || []) : (ejercicioActual.mediaLinks || []))
                      .map((item, idx) => {
                        // Normalizar input: puede ser string (legacy) o objeto {url, name}
                        const url = typeof item === 'string' ? item : item?.url;
                        const customName = typeof item === 'object' ? item?.name : null;

                        if (!url) return null; // Skip invalid items

                        // Use robust resolution
                        const mediaInfo = resolveMedia(url);
                        const type = mediaInfo.kind;

                        // Use custom name if available, otherwise filename/title
                        const fileName = customName || mediaInfo.name || (typeof url === 'string' ? url.split('/').pop().split('?')[0] : 'Archivo adjunto');

                        // AUDIO - Embedido (Sin tarjeta exterior)
                        if (type === MediaKind.AUDIO) {
                          return (
                            <div key={idx} className="mb-2">
                              <CustomAudioPlayer
                                className="w-full"
                                src={mediaInfo.embedUrl || mediaInfo.originalUrl}
                              />
                            </div>
                          );
                        }

                        // IMAGEN - Embedida
                        if (type === MediaKind.IMAGE) {
                          return (
                            <div key={idx} className="bg-[var(--color-surface-elevated)] border border-[var(--color-border-default)] rounded-xl overflow-hidden shadow-sm">
                              <img
                                src={mediaInfo.embedUrl || mediaInfo.originalUrl}
                                alt={fileName}
                                className="w-full h-auto cursor-pointer hover:opacity-95 transition-opacity"
                                onClick={() => setMediaFullscreen({ tipo: 'imagen', url: mediaInfo.originalUrl })}
                              />
                            </div>
                          );
                        }

                        // PDF - Card
                        if (type === MediaKind.PDF) {
                          return (
                            <div key={idx} className="bg-white border border-[var(--color-border-default)] rounded-xl p-4 flex items-center gap-4 hover:border-[var(--color-primary)]/50 transition-colors shadow-sm group">
                              <div className="bg-red-50 p-3 rounded-lg group-hover:bg-red-100 transition-colors">
                                <FileText className="w-6 h-6 text-red-500" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-[var(--color-text-primary)] truncate">{fileName}</p>
                                <p className="text-xs text-[var(--color-text-secondary)]">Documento PDF</p>
                              </div>
                              <Button
                                variant="outline"
                                onClick={() => setMediaModal(mediaInfo.originalUrl)}
                                className="shrink-0 rounded-lg hover:bg-[var(--color-surface-elevated)]"
                              >
                                Abrir Partitura en Pantalla Completa
                              </Button>
                            </div>
                          );
                        }

                        // VIDEO - Card (o modal si es link externo)
                        if (type === MediaKind.VIDEO || type === MediaKind.YOUTUBE || type === MediaKind.VIMEO) {
                          return (
                            <div key={idx} className="bg-white border border-[var(--color-border-default)] rounded-xl p-4 flex items-center gap-4 hover:border-[var(--color-primary)]/50 transition-colors shadow-sm group">
                              <div className="bg-blue-50 p-3 rounded-lg group-hover:bg-blue-100 transition-colors">
                                <Video className="w-6 h-6 text-blue-500" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-[var(--color-text-primary)] truncate">{fileName}</p>
                                <p className="text-xs text-[var(--color-text-secondary)]">Video</p>
                              </div>
                              <Button
                                variant="outline"
                                onClick={() => setMediaModal(mediaInfo.originalUrl)}
                                className="shrink-0 rounded-lg hover:bg-[var(--color-surface-elevated)]"
                              >
                                Ver Video
                              </Button>
                            </div>
                          );
                        }

                        // fallback - Link genérico
                        return (
                          <div key={idx} className="bg-white border border-[var(--color-border-default)] rounded-xl p-3 flex items-center gap-3">
                            <ExternalLink className="w-5 h-5 text-[var(--color-text-secondary)]" />
                            <a href={mediaInfo.originalUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-[var(--color-primary)] hover:underline truncate flex-1">
                              {fileName}
                            </a>
                          </div>
                        );
                      })
                    }

                    {/* Fallback para objetos media legacy (no mediaLinks array) */}
                    {!isFM && ejercicioActual.media?.pdf && (
                      <div className="bg-white border border-[var(--color-border-default)] rounded-xl p-4 flex items-center gap-4 hover:border-[var(--color-primary)]/50 transition-colors shadow-sm group">
                        <div className="bg-red-50 p-3 rounded-lg group-hover:bg-red-100 transition-colors">
                          <FileText className="w-6 h-6 text-red-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-[var(--color-text-primary)] truncate">Partitura</p>
                          <p className="text-xs text-[var(--color-text-secondary)]">Documento PDF</p>
                        </div>
                        <Button
                          variant="outline"
                          onClick={() => setMediaModal(ejercicioActual.media.pdf)}
                          className="shrink-0 rounded-lg hover:bg-[var(--color-surface-elevated)]"
                        >
                          Abrir Partitura en Pantalla Completa
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Materiales Requeridos */}
              {ejercicioActual.materialesRequeridos && ejercicioActual.materialesRequeridos.length > 0 && (
                <div className="pt-4">
                  <p className={`${componentStyles.typography.sectionTitle} text-[var(--color-text-primary)] mb-2`}>🎒 Materiales Requeridos</p>
                  <ul className="list-disc list-inside space-y-1 text-sm text-[var(--color-text-primary)]">
                    {ejercicioActual.materialesRequeridos.map((material, idx) => (
                      <li key={idx}>{material}</li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Footer de controles - Oculto (controles ahora en timer flotante) */}
        {
          false && (
            <div className="fixed bottom-0 left-0 right-0 bg-card border-t shadow-card z-30 pb-[env(safe-area-inset-bottom,0px)]">
              <div className="max-w-5xl mx-auto px-3 py-2">
                {/* Breadcrumb compacto */}
                <TooltipProvider>
                  <div className="flex items-center gap-1 mb-2 overflow-x-auto scrollbar-hide -mx-3 px-3">
                    {listaEjecucion.slice(Math.max(0, indiceActual - 2), Math.min(listaEjecucion.length, indiceActual + 3)).map((ej, idx) => {
                      const realIdx = Math.max(0, indiceActual - 2) + idx;
                      const isActive = realIdx === indiceActual;
                      const isCompleted = completados.has(realIdx);
                      const isOmitted = omitidos.has(realIdx);

                      // Formatear label para el breadcrumb
                      let label = ej.tipo;
                      if (ej.esRonda && ej.rondaIdx !== undefined && ej.repeticion !== undefined) {
                        // Mostrar: "TC R1-2" donde R1 es la ronda y 2 es la repetición actual
                        label = `${ej.tipo} R${ej.rondaIdx + 1}-${ej.repeticion}`;
                      }

                      const nombreEjercicio = ej.nombre || `${ej.tipo}${ej.esRonda ? ` - Ronda ${ej.rondaIdx + 1}, Repetición ${ej.repeticion}/${ej.totalRepeticiones}` : ''}`;

                      return (
                        <React.Fragment key={realIdx}>
                          {idx > 0 && <ChevronRight className="w-3 h-3 text-[var(--color-text-muted)] shrink-0" />}
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div
                                className={cn(
                                  "px-2 py-0.5 rounded text-xs font-medium shrink-0 transition-all whitespace-nowrap cursor-default",
                                  isActive
                                    ? "bg-[var(--color-primary)] text-white shadow-sm"
                                    : isCompleted
                                      ? "bg-[var(--color-success)]/20 text-[var(--color-success)] border border-[var(--color-success)]/30"
                                      : isOmitted
                                        ? "bg-[var(--color-warning)]/20 text-[var(--color-warning)] border border-[var(--color-warning)]/30"
                                        : "bg-[var(--color-surface-muted)] text-[var(--color-text-secondary)] border border-[var(--color-border-default)]"
                                )}
                              >
                                {label}
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="max-w-xs">{nombreEjercicio}</p>
                            </TooltipContent>
                          </Tooltip>
                        </React.Fragment>
                      );
                    })}
                  </div>
                </TooltipProvider>

                {/* Controles principales - Distribución 19-2-29-2-29-2-19 con gaps */}
                <div className="flex items-center w-full gap-[2%] mb-2">
                  {/* Navegación: Atrás - 50% */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleAnterior}
                    disabled={indiceActual === 0}
                    className="h-12 md:h-14 flex-[0.5] min-w-0 rounded-xl focus-brand hover:bg-[var(--color-surface-muted)] transition-colors"
                    title="Anterior (P)"
                    aria-label="Ejercicio anterior"
                  >
                    <ChevronLeft className="w-5 h-5 md:w-6 md:h-6 mr-2 shrink-0" />
                    <span className="truncate">Atrás</span>
                  </Button>

                  {/* Control principal: Play/Pause - Solo si no es AD */}
                  {!isAD && (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={togglePlayPausa}
                      className="h-12 md:h-14 w-12 md:w-14 shrink-0 rounded-xl focus-brand shadow-sm hover:shadow-md transition-all"
                      title={cronometroActivo ? "Pausar (Espacio)" : "Reproducir (Espacio)"}
                      aria-label={cronometroActivo ? "Pausar cronómetro" : "Iniciar cronómetro"}
                    >
                      {cronometroActivo ? <Pause className="w-5 h-5 md:w-6 md:h-6" /> : <Play className="w-5 h-5 md:w-6 md:h-6" />}
                    </Button>
                  )}

                  {/* Acciones de ejercicio: Completar - 50% */}
                  <Button
                    variant="primary"
                    onClick={completarYAvanzar}
                    className={cn(
                      "h-12 md:h-14 flex-[0.5] min-w-0 bg-[var(--color-success)] hover:bg-[var(--color-success)]/90 font-semibold text-base md:text-lg rounded-xl focus-brand shadow-sm hover:shadow-md transition-all text-white",
                      isAD && "flex-[1]"
                    )}
                    title="Completar (Enter)"
                    aria-label={isUltimo ? 'Finalizar sesión' : 'Completar y continuar'}
                  >
                    <CheckCircle className="w-5 h-5 md:w-6 md:h-6 mr-2 shrink-0" />
                    <span className="truncate">{isUltimo ? 'Finalizar' : 'OK'}</span>
                  </Button>

                  {/* Acciones de ejercicio: Saltar - 50% */}
                  {!isUltimo && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={omitirYAvanzar}
                      disabled={isUltimo}
                      className="h-12 md:h-14 flex-[0.5] min-w-0 rounded-xl focus-brand hover:bg-[var(--color-surface-muted)] transition-colors"
                      title="Omitir y pasar (N)"
                      aria-label="Omitir ejercicio"
                    >
                      <ChevronsRight className="w-5 h-5 md:w-6 md:h-6 mr-2 shrink-0" />
                      <span className="truncate">Saltar</span>
                    </Button>
                  )}
                </div>

                {/* Progreso de sesión - Compacto */}
                <div className="mt-2 space-y-0.5">
                  <div className="flex items-center justify-between text-xs text-[var(--color-text-secondary)]">
                    <span>{indiceActual + 1}/{listaEjecucion.length}</span>
                    <span>{completados.size}✓ {omitidos.size}⏭</span>
                  </div>
                  <div className="bg-[var(--color-border-default)]/30 rounded-full h-1 overflow-hidden">
                    <div
                      className={cn(
                        "h-full transition-all duration-300",
                        progreso <= 85 ? 'bg-[var(--color-success)]' : progreso <= 100 ? 'bg-[var(--color-warning)]' : 'bg-[var(--color-danger)]'
                      )}
                      style={{ width: `${Math.min(progreso, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )
        }

        {/* Media fullscreen */}
        {
          mediaFullscreen && (
            <>
              <div className="fixed inset-0 bg-black z-[100]" onClick={() => setMediaFullscreen(null)} />
              <div className="fixed inset-0 z-[101] flex items-center justify-center p-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setMediaFullscreen(null)}
                  className="absolute top-4 right-4 bg-white/90 hover:bg-white text-ui h-10 w-10 p-0 rounded-full shadow-card focus-brand"
                  aria-label="Cerrar pantalla completa"
                >
                  <X className="w-5 h-5" />
                </Button>

                {mediaFullscreen.tipo === 'video' && (
                  <video
                    controls
                    autoPlay
                    className="max-w-full max-h-full rounded-lg shadow-card"
                    src={mediaFullscreen.url}
                  />
                )}

                {mediaFullscreen.tipo === 'imagen' && (
                  <img
                    src={mediaFullscreen.url}
                    alt="Imagen en pantalla completa"
                    className="max-w-full max-h-full rounded-lg shadow-card"
                  />
                )}

                {mediaFullscreen.tipo === 'pdf' && (
                  <div className="w-full h-full flex flex-col bg-card rounded-lg">
                    <iframe
                      src={mediaFullscreen.url}
                      className="w-full flex-1"
                      title={mediaFullscreen.nombre || 'PDF'}
                    />
                  </div>
                )}
              </div>
            </>
          )
        }

        {/* Modal de pantalla completa para recursos multimedia (modo estudio) */}
        {
          mediaModal && (
            <div
              className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-0 md:p-4"
              onClick={(e) => {
                if (e.target === e.currentTarget) {
                  setMediaModal(null);
                }
              }}
            >
              <div className="w-full h-full md:w-[95vw] md:h-[95vh] md:max-w-7xl bg-[var(--color-surface-elevated)] md:rounded-2xl shadow-2xl flex flex-col">
                {/* Header del modal */}
                <div className="flex items-center justify-between p-4 md:p-6 border-b border-[var(--color-border-default)] shrink-0">
                  <h2 className="text-lg md:text-xl font-semibold text-[var(--color-text-primary)]">
                    Recurso multimedia
                  </h2>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setMediaModal(null)}
                    className="h-9 w-9 p-0"
                    aria-label="Cerrar"
                  >
                    <X className="w-5 h-5" />
                  </Button>
                </div>
                {/* Contenido del modal */}
                <div className="flex-1 overflow-auto p-4 md:p-6 min-h-0">
                  <MediaEmbed url={mediaModal} className="w-full h-full min-h-[400px]" />
                  {/* Enlace de emergencia si el embed falla (especialmente para PDFs) */}
                  <div className="mt-4 text-center">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(mediaModal, "_blank", "noopener,noreferrer")}
                      className="text-xs"
                    >
                      Abrir en nueva pestaña
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )
        }

        {/* FAB Piano - ELIMINADO en Modo Estudio (refactor) */}

        {/* Modal Piano - Ahora Panel Inline */}
        <PianoPanel isOpen={mostrarPiano && sesionActiva && !sesionFinalizada} onClose={() => setMostrarPiano(false)} bottomOffset={footerHeight} />

        {/* Panel de itinerario - Dialog central mediano */}
        {
          sesionActiva && (
            <Dialog open={mostrarItinerario} onOpenChange={setMostrarItinerario}>
              <DialogContent size="md" className="max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Índice de Ejercicios</DialogTitle>
                  <DialogDescription className="sr-only">
                    Lista de ejercicios de la sesión actual
                  </DialogDescription>
                </DialogHeader>
                <div className="p-3 space-y-2">
                  {(() => {
                    const S = ensureRondaIds(sesionActiva);
                    const secuencia = getSecuencia(S);
                    const bloquesMap = mapBloquesByCode(S);

                    // Crear mapeo de posiciones en listaEjecucion para cada elemento de la secuencia
                    let contadorLista = 0;
                    const mapeoPosiciones = new Map();

                    secuencia.forEach((item) => {
                      if (item.kind === 'BLOQUE') {
                        mapeoPosiciones.set(`bloque-${item.code}`, contadorLista);
                        contadorLista++;
                      } else if (item.kind === 'RONDA') {
                        const ronda = S.rondas.find(r => r.id === item.id);
                        if (ronda) {
                          const posicionesRonda = [];
                          for (let rep = 0; rep < ronda.repeticiones; rep++) {
                            ronda.bloques.forEach(() => {
                              posicionesRonda.push(contadorLista);
                              contadorLista++;
                            });
                          }
                          mapeoPosiciones.set(`ronda-${item.id}`, posicionesRonda);
                        }
                      }
                    });

                    return secuencia.map((item, seqIdx) => {
                      if (item.kind === 'BLOQUE') {
                        const posicion = mapeoPosiciones.get(`bloque-${item.code}`);
                        const ej = bloquesMap.get(item.code);
                        if (!ej) return null;

                        const estaActivo = posicion === indiceActual;
                        const estaCompletado = completados.has(posicion);
                        const estaOmitido = omitidos.has(posicion);

                        return (
                          <button
                            key={`bloque-${item.code}-${seqIdx}`}
                            onClick={() => navegarA(posicion)}
                            className={`w-full text-left p-3 rounded-lg border transition-all min-h-[52px] ${estaActivo
                              ? 'bg-[var(--color-primary-soft)] text-[var(--color-text-primary)] border-[var(--color-primary)] shadow-sm'
                              : estaCompletado
                                ? 'bg-[var(--color-success)]/10 border-[var(--color-success)]'
                                : estaOmitido
                                  ? 'bg-[var(--color-warning)]/10 border-[var(--color-warning)]'
                                  : 'bg-[var(--color-surface)] border-[var(--color-border-strong)] hover:bg-[var(--color-surface-muted)]'
                              }`}
                            aria-label={`Ir a ejercicio ${posicion + 1}: ${ej.nombre}`}
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold min-w-[24px] text-[var(--color-text-primary)]">#{posicion + 1}</span>
                              <Badge variant="outline" className={`${tipoColors[ej.tipo]} text-xs border`}>
                                {ej.tipo}
                              </Badge>
                              <span className="flex-1 text-sm font-medium truncate text-[var(--color-text-primary)]">{ej.nombre}</span>
                              {estaCompletado && <CheckCircle className="w-4 h-4 text-[var(--color-success)] shrink-0" />}
                              {estaOmitido && <XCircle className="w-4 h-4 text-[var(--color-text-secondary)] shrink-0" />}
                            </div>
                          </button>
                        );
                      } else if (item.kind === 'RONDA') {
                        const ronda = S.rondas.find(r => r.id === item.id);
                        if (!ronda) return null;

                        const posicionesRonda = mapeoPosiciones.get(`ronda-${item.id}`) || [];
                        const estaExpandida = rondasExpandidasItinerario.has(item.id);

                        // Verificar si alguna posición de la ronda está activa
                        const tieneActivo = posicionesRonda.includes(indiceActual);
                        const tieneCompletado = posicionesRonda.some(p => completados.has(p));
                        const tieneOmitido = posicionesRonda.some(p => omitidos.has(p));

                        return (
                          <div key={`ronda-${item.id}-${seqIdx}`} className="space-y-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setRondasExpandidasItinerario(prev => {
                                  const next = new Set(prev);
                                  if (next.has(item.id)) {
                                    next.delete(item.id);
                                  } else {
                                    next.add(item.id);
                                  }
                                  return next;
                                });
                              }}
                              className={`w-full text-left p-3 rounded-lg border transition-all ${tieneActivo
                                ? 'bg-[var(--color-primary-soft)] border-[var(--color-primary)] shadow-sm'
                                : tieneCompletado
                                  ? 'bg-[var(--color-success)]/10 border-[var(--color-success)]'
                                  : tieneOmitido
                                    ? 'bg-[var(--color-warning)]/10 border-[var(--color-warning)]'
                                    : 'bg-[var(--color-primary-soft)] border-[var(--color-primary)]/30'
                                }`}
                            >
                              <div className="flex items-center gap-2">
                                {estaExpandida ? (
                                  <ChevronDown className="w-4 h-4 text-[var(--color-primary)] shrink-0" />
                                ) : (
                                  <ChevronRight className="w-4 h-4 text-[var(--color-primary)] shrink-0" />
                                )}
                                <Badge className="bg-[var(--color-primary)] text-[var(--color-text-inverse)] text-xs">Ronda</Badge>
                                <span className="text-xs text-[var(--color-text-secondary)]">× {ronda.repeticiones} repeticiones</span>
                                <span className="text-xs text-[var(--color-text-secondary)]">({ronda.bloques.length} ejercicios)</span>
                                {ronda.aleatoria && (
                                  <Badge variant="outline" className="text-[10px] border-[var(--color-primary)]/40 text-[var(--color-primary)] bg-[var(--color-primary-soft)] flex items-center gap-1">
                                    <Shuffle className="w-3 h-3" />
                                    aleatorio
                                  </Badge>
                                )}
                              </div>
                            </button>

                            {estaExpandida && (
                              <div className="ml-4 space-y-1 border-l-2 border-[var(--color-primary)]/30 pl-3">
                                {posicionesRonda.map((posicion, idx) => {
                                  // Determinar qué bloque y repetición corresponde a esta posición
                                  const bloqueIdx = idx % ronda.bloques.length;
                                  const repeticionIdx = Math.floor(idx / ronda.bloques.length);
                                  const code = ronda.bloques[bloqueIdx];

                                  const ej = bloquesMap.get(code);
                                  if (!ej) return null;

                                  const estaActivo = posicion === indiceActual;
                                  const estaCompletado = completados.has(posicion);
                                  const estaOmitido = omitidos.has(posicion);

                                  return (
                                    <button
                                      key={`ronda-${item.id}-pos-${posicion}`}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        navegarA(posicion);
                                      }}
                                      className={`w-full text-left p-2 rounded-lg border transition-all ${estaActivo
                                        ? 'bg-[var(--color-primary-soft)] text-[var(--color-text-primary)] border-[var(--color-primary)] shadow-sm'
                                        : estaCompletado
                                          ? 'bg-[var(--color-success)]/10 border-[var(--color-success)]'
                                          : estaOmitido
                                            ? 'bg-[var(--color-warning)]/10 border-[var(--color-warning)]'
                                            : 'bg-[var(--color-surface)] border-[var(--color-border-default)] hover:bg-[var(--color-surface-muted)]'
                                        }`}
                                      aria-label={`Ir a ejercicio ${posicion + 1}: ${ej.nombre}`}
                                    >
                                      <div className="flex items-center gap-2">
                                        <span className="text-xs font-bold min-w-[24px] text-[var(--color-text-primary)]">#{posicion + 1}</span>
                                        <Badge variant="outline" className={`${tipoColors[ej.tipo]} text-xs border`}>
                                          {ej.tipo}
                                        </Badge>
                                        <span className="flex-1 text-sm font-medium truncate text-[var(--color-text-primary)]">
                                          {ej.nombre}
                                          {ronda.repeticiones > 1 && (
                                            <span className="text-xs text-[var(--color-text-secondary)] ml-1">
                                              (Rep {repeticionIdx + 1})
                                            </span>
                                          )}
                                        </span>
                                        {estaCompletado && <CheckCircle className="w-4 h-4 text-[var(--color-success)] shrink-0" />}
                                        {estaOmitido && <XCircle className="w-4 h-4 text-[var(--color-text-secondary)] shrink-0" />}
                                      </div>
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      }
                      return null;
                    });
                  })()}
                </div>
              </DialogContent>
            </Dialog>
          )
        }


        {/* Modal cancelar */}
        {
          mostrarModalCancelar && (
            <ModalCancelar
              onGuardarYSalir={guardarYSalir}
              onSalirSinGuardar={salirSinGuardar}
              onContinuar={() => setMostrarModalCancelar(false)}
            />
          )
        }
      </div >
    );
  }

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

      <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-4">
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

            <div className="flex items-center justify-center pt-4 border-t">
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

