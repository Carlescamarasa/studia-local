
import React, { useState, useEffect, useRef } from "react";
import { localDataClient } from "@/api/localDataClient";
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
} from "@/components/ui/dialog";
import {
  PlayCircle, Calendar, Target, Music, Clock, Layers,
  ChevronRight, ChevronLeft, ChevronsRight, AlertTriangle, ChevronDown,
  Play, Pause, X, List, HelpCircle,
  Maximize2, Minimize2, CheckCircle, XCircle,
  SkipForward, Shuffle, Menu
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
  useEffectiveUser
} from "../components/utils/helpers";
import { getSecuencia, ensureRondaIds, mapBloquesByCode } from "../components/study/sessionSequence";
import TimelineProgreso from "../components/estudio/TimelineProgreso";
import ModalCancelar from "../components/estudio/ModalCancelar";
import ResumenFinal from "../components/estudio/ResumenFinal";
import SessionContentView from "../components/study/SessionContentView";
import { toast } from "sonner";
import { useSidebar } from "@/components/ui/SidebarState";
import PageHeader from "@/components/ds/PageHeader";
import { componentStyles } from "@/design/componentStyles";
import MediaEmbed from "../components/common/MediaEmbed";
import MediaIconButton from "../components/common/MediaIconButton";
import { resolveMedia, MediaKind } from "../components/utils/media";

import RequireRole from "@/components/auth/RequireRole";

// --- Helpers de fechas locales (para formateo de semana) ---
const pad2 = (n) => String(n).padStart(2, "0");
const formatLocalDate = (d) => `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;
const parseLocalDate = (s) => { const [y,m,d] = s.split("-").map(Number); return new Date(y, m-1, d); };

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

  const [semanaActualISO, setSemanaActualISO] = useState(() => {
    return calcularLunesSemanaISO(new Date());
  });
  const [sesionSeleccionada, setSesionSeleccionada] = useState(0);
  const [planDesplegado, setPlanDesplegado] = useState(true); // Por defecto desplegado
  const [sesionesConResumenExpandido, setSesionesConResumenExpandido] = useState(new Set());
  const [sesionActiva, setSesionActiva] = useState(null);
  const [indiceActual, setIndiceActual] = useState(0);
  const [tiempoActual, setTiempoActual] = useState(0);
  const [cronometroActivo, setCronometroActiva] = useState(false);
  const [completados, setCompletados] = useState(new Set());
  const [omitidos, setOmitidos] = useState(new Set());
  const [pantallaCompleta, setPantallaCompleta] = useState(false);
  const [mostrarItinerario, setMostrarItinerario] = useState(false);
  const [mostrarAyuda, setMostrarAyuda] = useState(false);
  const [mostrarModalCancelar, setMostrarModalCancelar] = useState(false);
  const [rondasExpandidasItinerario, setRondasExpandidasItinerario] = useState(new Set());
  const [cronometroPausadoPorModal, setCronometroPausadoPorModal] = useState(false);
  const [sesionFinalizada, setSesionFinalizada] = useState(false);
  const [datosFinal, setDatosFinal] = useState(null);
  const [mediaFullscreen, setMediaFullscreen] = useState(null);
  const [mediaModal, setMediaModal] = useState(null); // Para el popup de materiales

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

  const sidebarCerradoRef = useRef(false);

  const effectiveUser = useEffectiveUser();

  const { data: usuarios = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => localDataClient.entities.User.list(),
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

  // Log de usuarios cargados en desarrollo
  if (process.env.NODE_ENV === 'development') {
    console.log('[hoy.jsx] Usuarios y usuario actual:');
    console.log('  - Total usuarios:', usuarios.length);
    console.log('  - effectiveUser ID (Supabase):', effectiveUser?.id);
    console.log('  - effectiveUser email:', effectiveUser?.email);
    console.log('  - userIdActual (BD):', userIdActual);
    console.log('  - alumnoActual encontrado:', !!alumnoActual);
    console.log('  - alumnoActual ID:', alumnoActual?.id);
    console.log('  - Usuarios disponibles:', usuarios.map(u => `ID: ${u.id}, Email: ${u.email || 'N/A'}, Nombre: ${u.nombre || u.displayName || 'N/A'}`));
  }

  const { data: asignacionesRaw = [] } = useQuery({
    queryKey: ['asignaciones'],
    queryFn: () => localDataClient.entities.Asignacion.list(),
  });

  // Cargar bloques actuales para actualizar mediaLinks
  const { data: bloquesActuales = [] } = useQuery({
    queryKey: ['bloques'],
    queryFn: async () => {
      const bloques = await localDataClient.entities.Bloque.list();
      // Debug: Verificar bloque específico
      if (process.env.NODE_ENV === 'development') {
        const bloqueRespiración = bloques.find(b => b.code === 'CA-SEED-003');
        if (bloqueRespiración) {
          console.log('[hoy.jsx] Bloque CA-SEED-003 en BD:', {
            nombre: bloqueRespiración.nombre,
            code: bloqueRespiración.code,
            tieneMediaLinks: !!bloqueRespiración.mediaLinks,
            mediaLinks: bloqueRespiración.mediaLinks,
            todasLasPropiedades: Object.keys(bloqueRespiración)
          });
        }
      }
      return bloques;
    },
  });

  // Filtrar y validar asignaciones
  const asignaciones = asignacionesRaw.filter(a => {
    // Validar que tiene alumnoId válido
    if (!a.alumnoId) {
      if (process.env.NODE_ENV === 'development') {
        console.log('[hoy.jsx] Asignación filtrada: sin alumnoId', a.id);
      }
      return false;
    }
    const alumno = usuarios.find(u => u.id === a.alumnoId);
    if (!alumno) {
      if (process.env.NODE_ENV === 'development') {
        console.log('[hoy.jsx] Asignación filtrada: alumno no encontrado');
        console.log('  - Asignación ID:', a.id);
        console.log('  - alumnoId en asignación:', a.alumnoId);
        console.log('  - userIdActual:', userIdActual);
        console.log('  - ¿Es usuario actual?', a.alumnoId === userIdActual);
        console.log('  - Estado:', a.estado);
        console.log('  - Tiene plan:', !!a.plan);
        console.log('  - Semanas disponibles:', a.plan?.semanas?.length);
        console.log('  - semanaInicioISO:', a.semanaInicioISO);
        console.log('  - IDs de usuarios disponibles:', usuarios.map(u => u.id));
      }
      // Si es el usuario actual pero no está en la lista de usuarios, permitir la asignación
      // Esto puede pasar si los usuarios aún no se han cargado completamente
      if (a.alumnoId === userIdActual) {
        if (process.env.NODE_ENV === 'development') {
          console.log('[hoy.jsx] Asignación del usuario actual permitida aunque no esté en lista de usuarios');
        }
        // Continuar con la validación del plan y semanas
      } else {
        return false;
      }
    }
    
    // Validar que tiene plan y semanas
    if (!a.plan || !Array.isArray(a.plan.semanas) || a.plan.semanas.length === 0) {
      if (process.env.NODE_ENV === 'development') {
        console.log('[hoy.jsx] Asignación filtrada: sin plan o semanas válidas', {
          asignacionId: a.id,
          tienePlan: !!a.plan,
          tieneSemanas: Array.isArray(a.plan?.semanas),
          semanasLength: a.plan?.semanas?.length
        });
      }
      return false;
    }
    
    // Validar que tiene semanaInicioISO válida
    if (!a.semanaInicioISO || typeof a.semanaInicioISO !== 'string') {
      if (process.env.NODE_ENV === 'development') {
        console.log('[hoy.jsx] Asignación filtrada: sin semanaInicioISO válida', {
          asignacionId: a.id,
          semanaInicioISO: a.semanaInicioISO,
          tipo: typeof a.semanaInicioISO
        });
      }
      return false;
    }
    
    return true;
  });

  // Log de resumen del filtrado
  if (process.env.NODE_ENV === 'development') {
    console.log('[hoy.jsx] Resumen de asignaciones:');
    console.log('  - Total raw:', asignacionesRaw.length);
    console.log('  - Total filtradas:', asignaciones.length);
    console.log('  - Asignaciones raw:', asignacionesRaw.map(a => 
      `ID: ${a.id}, alumnoId: ${a.alumnoId}, estado: ${a.estado}, tienePlan: ${!!a.plan}, semanas: ${a.plan?.semanas?.length || 0}, inicio: ${a.semanaInicioISO || 'N/A'}`
    ));
  }

  const asignacionActiva = asignaciones.find(a => {
    if (a.alumnoId !== userIdActual) return false;
    if (a.estado !== 'publicada' && a.estado !== 'en_curso') return false;
    try {
      const offset = calcularOffsetSemanas(a.semanaInicioISO, semanaActualISO);
      const tieneSemanaValida = offset >= 0 && offset < (a.plan?.semanas?.length || 0);
      
      // Log de depuración en desarrollo
      if (process.env.NODE_ENV === 'development') {
        console.log('[hoy.jsx] Evaluando asignación:', {
          id: a.id,
          alumnoId: a.alumnoId,
          estado: a.estado,
          semanaInicioISO: a.semanaInicioISO,
          semanaActualISO,
          offset,
          semanasLength: a.plan?.semanas?.length,
          tieneSemanaValida
        });
      }
      
      return tieneSemanaValida;
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('[hoy.jsx] Error calculando offset de semana:', error, a);
      }
      return false;
    }
  });

  // Calcular semanaDelPlan de forma más robusta
  let semanaDelPlan = null;
  let semanaIdx = 0;
  
  if (asignacionActiva) {
    try {
      semanaIdx = calcularOffsetSemanas(asignacionActiva.semanaInicioISO, semanaActualISO);
      semanaDelPlan = asignacionActiva.plan?.semanas?.[semanaIdx] || null;
      
      // Log de depuración en desarrollo
      if (process.env.NODE_ENV === 'development') {
        console.log('[hoy.jsx] Asignación activa encontrada:', {
          asignacionId: asignacionActiva.id,
          semanaIdx,
          semanaDelPlan: semanaDelPlan ? { nombre: semanaDelPlan.nombre, foco: semanaDelPlan.foco } : null,
          semanasDisponibles: asignacionActiva.plan?.semanas?.length
        });
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('[hoy.jsx] Error calculando semanaDelPlan:', error, asignacionActiva);
      }
      semanaDelPlan = null;
    }
  } else {
    // Log de depuración en desarrollo
    if (process.env.NODE_ENV === 'development') {
      const asignacionesDelUsuario = asignaciones.filter(a => a.alumnoId === userIdActual);
      console.log('[hoy.jsx] No se encontró asignación activa:');
      console.log('  - userIdActual:', userIdActual);
      console.log('  - Total asignaciones (después de filtrado):', asignaciones.length);
      console.log('  - Asignaciones del usuario:', asignacionesDelUsuario.length);
      if (asignacionesDelUsuario.length > 0) {
        console.log('  - Detalles de asignaciones del usuario:');
        asignacionesDelUsuario.forEach(a => {
          let offset = null;
          try {
            offset = calcularOffsetSemanas(a.semanaInicioISO, semanaActualISO);
          } catch (e) {
            // Ignorar errores en el cálculo
          }
          const offsetValido = offset !== null && offset >= 0 && offset < (a.plan?.semanas?.length || 0);
          console.log(`    * ID: ${a.id}, Estado: ${a.estado}, Offset: ${offset}, Válido: ${offsetValido}, Semanas disponibles: ${a.plan?.semanas?.length || 0}`);
        });
      }
      console.log('  - Todas las asignaciones filtradas:', asignaciones.map(a => 
        `ID: ${a.id}, alumnoId: ${a.alumnoId}, estado: ${a.estado}, inicio: ${a.semanaInicioISO || 'N/A'}`
      ));
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

  const guardarRegistroSesion = async (esFinal = false) => {
    if (!asignacionActiva || !sesionActiva) return;

    const listaEjecucion = aplanarSesion(sesionActiva);
    const tiempoPrevisto = listaEjecucion
      .filter(e => e.tipo !== 'AD')
      .reduce((sum, e) => sum + (e.duracionSeg || 0), 0);

    const dataRegistro = {
      asignacionId: asignacionActiva.id,
      alumnoId: userIdActual,
      profesorAsignadoId: alumnoActual?.profesorAsignadoId || null,
      semanaIdx: semanaIdx,
      sesionIdx: semanaDelPlan?.sesiones?.indexOf(sesionActiva) || 0,
      inicioISO: timestampInicio ? new Date(timestampInicio).toISOString() : new Date().toISOString(),
      finISO: esFinal ? new Date().toISOString() : null,
      duracionRealSeg: Math.min(tiempoActual, 18000),
      duracionObjetivoSeg: tiempoPrevisto,
      bloquesTotales: listaEjecucion.length,
      bloquesCompletados: completados.size,
      bloquesOmitidos: omitidos.size,
      finalizada: esFinal,
      finAnticipado: false,
      motivoFin: null,
      calificacion: datosFinal?.calidad || null,
      notas: datosFinal?.notas || null,
      mediaLinks: datosFinal?.mediaLinks || [],
      dispositivo: navigator.userAgent,
      versionSchema: "1.0",
      piezaNombre: asignacionActiva.piezaSnapshot?.nombre || '',
      planNombre: asignacionActiva.plan?.nombre || '',
      semanaNombre: semanaDelPlan?.nombre || '',
      sesionNombre: sesionActiva.nombre || '',
      foco: sesionActiva.foco || 'GEN',
    };

    try {
      if (registroSesionId) {
        await localDataClient.entities.RegistroSesion.update(registroSesionId, dataRegistro);
      } else {
        const nuevoRegistro = await localDataClient.entities.RegistroSesion.create(dataRegistro);
        setRegistroSesionId(nuevoRegistro.id);
      }
    } catch (error) {
      colaOfflineRef.current.push({
        tipo: 'sesion',
        data: dataRegistro,
        id: registroSesionId,
        timestamp: Date.now(),
      });
    }
  };

  const guardarRegistroBloque = async (indice, estado, duracionReal = 0) => {
    if (!registroSesionId || !sesionActiva) return;

    const listaEjecucion = aplanarSesion(sesionActiva);
    const bloque = listaEjecucion[indice];
    if (!bloque) return;

    const dataBloque = {
      registroSesionId: registroSesionId,
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
    };

    try {
      await localDataClient.entities.RegistroBloque.create(dataBloque);
    } catch (error) {
      colaOfflineRef.current.push({
        tipo: 'bloque',
        data: dataBloque,
        timestamp: Date.now(),
      });
    }
  };

  useEffect(() => {
    if (!sesionActiva || sesionFinalizada) return;

    if (!heartbeatIntervalRef.current) {
      heartbeatIntervalRef.current = setInterval(() => {
        guardarRegistroSesion(false);
      }, 15000);
    }

    return () => {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }
    };
  }, [sesionActiva, sesionFinalizada, tiempoActual, completados, omitidos, registroSesionId]);

  useEffect(() => {
    const handlePageHide = () => {
      if (sesionActiva && !sesionFinalizada && registroSesionId) {
        guardarRegistroSesion(false);
      }
    };

    window.addEventListener('pagehide', handlePageHide);
    window.addEventListener('beforeunload', handlePageHide);

    return () => {
      window.removeEventListener('pagehide', handlePageHide);
      window.removeEventListener('beforeunload', handlePageHide);
    };
  }, [sesionActiva, sesionFinalizada, registroSesionId, tiempoActual, completados, omitidos]);

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

  // Pausar/reanudar cronómetro cuando se abren/cierran modales
  useEffect(() => {
    const hayModalAbierto = mostrarModalCancelar || mostrarItinerario || mostrarAyuda || mediaFullscreen;
    
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
  }, [mostrarModalCancelar, mostrarItinerario, mostrarAyuda, mediaFullscreen, cronometroActivo, cronometroPausadoPorModal, sesionActiva, sesionFinalizada, timestampInicio]);

  const empezarSesion = async (sesion, sesionIdxProp) => {
    // Actualizar bloques con mediaLinks actuales de la base de datos
    const sesionActualizada = {
      ...sesion,
      bloques: (sesion.bloques || []).map(bloqueSnapshot => {
        // Buscar el bloque actual en la base de datos por código
        const bloqueActual = bloquesActuales.find(b => b.code === bloqueSnapshot.code);
        if (bloqueActual) {
          // Debug: Log para verificar mediaLinks
          if (process.env.NODE_ENV === 'development' && bloqueSnapshot.code === 'CA-SEED-003') {
            console.log('[hoy.jsx] Actualizando bloque CA-SEED-003:', {
              bloqueSnapshot_mediaLinks: bloqueSnapshot.mediaLinks,
              bloqueActual_mediaLinks: bloqueActual.mediaLinks,
              bloqueActual_completo: bloqueActual
            });
          }
          
          // Actualizar con mediaLinks y otras propiedades actualizadas
          // Priorizar mediaLinks del bloque actual si existe y no está vacío
          const mediaLinksFinal = (bloqueActual.mediaLinks && bloqueActual.mediaLinks.length > 0) 
            ? bloqueActual.mediaLinks 
            : (bloqueSnapshot.mediaLinks && bloqueSnapshot.mediaLinks.length > 0)
              ? bloqueSnapshot.mediaLinks
              : [];
          
          return {
            ...bloqueSnapshot,
            mediaLinks: mediaLinksFinal,
            // Mantener otras propiedades actualizadas si existen
            instrucciones: bloqueActual.instrucciones || bloqueSnapshot.instrucciones,
            indicadorLogro: bloqueActual.indicadorLogro || bloqueSnapshot.indicadorLogro,
            materialesRequeridos: bloqueActual.materialesRequeridos || bloqueSnapshot.materialesRequeridos || [],
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

    const ahora = new Date().toISOString();
    const listaEjecucion = aplanarSesion(sesionActualizada);
    const tiempoPrevisto = listaEjecucion
      .filter(e => e.tipo !== 'AD')
      .reduce((sum, e) => sum + (e.duracionSeg || 0), 0);

    try {
      const nuevoRegistro = await localDataClient.entities.RegistroSesion.create({
        asignacionId: asignacionActiva.id,
        alumnoId: userIdActual,
        profesorAsignadoId: alumnoActual?.profesorAsignadoId || null,
        semanaIdx: semanaIdx,
        sesionIdx: sesionIdxProp,
        inicioISO: ahora,
        duracionRealSeg: 0,
        duracionObjetivoSeg: tiempoPrevisto,
        bloquesTotales: listaEjecucion.length,
        bloquesCompletados: 0,
        bloquesOmitidos: 0,
        finalizada: false,
        finAnticipado: false,
        dispositivo: navigator.userAgent,
        versionSchema: "1.0",
        piezaNombre: asignacionActiva.piezaSnapshot?.nombre || '',
        planNombre: asignacionActiva.plan?.nombre || '',
        semanaNombre: semanaDelPlan?.nombre || '',
        sesionNombre: sesion.nombre || '',
        foco: sesion.foco || 'GEN',
      });
      setRegistroSesionId(nuevoRegistro.id);
    } catch (error) {
      console.error('[hoy.jsx] Error creando registro de sesión:', {
        error: error?.message || error,
        code: error?.code,
        asignacionId: asignacionActiva?.id,
      });
    }

    const timestampInicio = Date.now();
    setTimestampInicio(timestampInicio);
    setTimestampUltimoPausa(null);
    setTiempoAcumuladoAntesPausa(0);
  };

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

    await guardarRegistroSesion(false);

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

    await guardarRegistroSesion(false);

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
      const hayModalAbierto = mostrarModalCancelar || mostrarItinerario || mostrarAyuda || mediaFullscreen;
      
      // Permitir Escape siempre para cerrar modales
      if (e.key === 'Escape') {
        e.preventDefault();
        if (mediaFullscreen) {
          setMediaFullscreen(null);
        } else if (mostrarItinerario) {
          setMostrarItinerario(false);
        } else if (mostrarAyuda) {
          setMostrarAyuda(false);
        } else if (mostrarModalCancelar) {
          setMostrarModalCancelar(false);
        }
        return;
      }

      // Permitir 'I' para toggle del índice siempre (incluso cuando está abierto)
      if (e.key === 'i' || e.key === 'I') {
        e.preventDefault();
        setMostrarItinerario(prev => !prev);
        return;
      }

      // Permitir '?' para toggle de ayuda siempre (incluso cuando está abierto)
      if (e.key === '?') {
        e.preventDefault();
        setMostrarAyuda(prev => !prev);
        return;
      }

      // Si hay un modal abierto, no procesar otros atajos
      if (hayModalAbierto) return;

      // No procesar si está en un input o textarea
      if (e.target.matches('input, textarea, select')) return;
      

      if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault();
        const listaEjecucion = aplanarSesion(sesionActiva);
        const ejercicioActual = listaEjecucion[indiceActual];
        if (ejercicioActual?.tipo !== 'AD') {
          togglePlayPausa();
        }
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        completarYAvanzar();
      }
      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        omitirYAvanzar();
      }
      if (e.key === 'p' || e.key === 'P') {
        e.preventDefault();
        handleAnterior();
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [sesionActiva, sesionFinalizada, indiceActual, mediaFullscreen, mostrarItinerario, mostrarAyuda, mostrarModalCancelar, togglePlayPausa, completarYAvanzar, omitirYAvanzar, handleAnterior]);

  const handleCancelar = () => {
    setMostrarModalCancelar(true);
  };

  const guardarYSalir = async () => {
    await guardarRegistroSesion(false);
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

  const formatearSemana = (lunesISO) => {
    const lunes = parseLocalDate(lunesISO);
    const domingo = new Date(lunes);
    domingo.setDate(lunes.getDate() + 6);

    const diaLunes = lunes.getDate();
    const diaDomingo = domingo.getDate();
    const mes = lunes.toLocaleDateString('es-ES', { month: 'short' });

    return `Semana ${diaLunes}–${diaDomingo} ${mes}`;
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
    LIG: 'Ligaduras',
    RIT: 'Ritmo',
    ART: 'Articulación',
    'S&A': 'Sonido y Afinación',
  };

  const focoColors = {
    GEN: componentStyles.status.badgeDefault,
    LIG: componentStyles.status.badgeInfo,
    RIT: componentStyles.status.badgeDefault, // purple -> default
    ART: componentStyles.status.badgeSuccess,
    'S&A': componentStyles.status.badgeDefault, // brand -> default
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

          if (registroSesionId) {
            try {
              // Nota: mediaLinks no se guarda en registros_sesion, solo en feedbacks_semanal
              // Asegurar que notas sea null si está vacía o undefined
              const updateData = {
                calificacion: calidad || null,
                notas: (notas && notas.trim()) ? notas.trim() : null,
                finalizada: true,
              };
              
              if (process.env.NODE_ENV === 'development') {
                console.log('[hoy.jsx] Actualizando registro de sesión:', {
                  registroSesionId,
                  updateData,
                });
              }
              
              // Verificar que el registro existe antes de actualizar
              const registroExistente = await localDataClient.entities.RegistroSesion.get(registroSesionId);
              
              if (!registroExistente) {
                if (process.env.NODE_ENV === 'development') {
                  console.warn('[hoy.jsx] El registro de sesión no existe, no se puede actualizar:', registroSesionId);
                }
                return;
              }
              
              await localDataClient.entities.RegistroSesion.update(registroSesionId, updateData);
              
              if (process.env.NODE_ENV === 'development') {
                console.log('[hoy.jsx] Registro de sesión actualizado correctamente');
              }
            } catch (error) {
              console.error('[hoy.jsx] Error guardando feedback:', {
                error: error?.message || error,
                code: error?.code,
                details: error?.details,
                hint: error?.hint,
                registroSesionId,
                ...(process.env.NODE_ENV === 'development' && { fullError: error }),
              });
            }
          } else {
            if (process.env.NODE_ENV === 'development') {
              console.warn('[hoy.jsx] No hay registroSesionId, no se puede guardar el feedback');
            }
          }
        }}
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
    
    // Debug: Verificar mediaLinks del ejercicio actual
    if (process.env.NODE_ENV === 'development' && ejercicioActual?.nombre?.includes('Respiración')) {
      console.log('[hoy.jsx] Ejercicio actual (Respiración):', {
        nombre: ejercicioActual.nombre,
        code: ejercicioActual.code,
        instrucciones: ejercicioActual.instrucciones,
        tieneMedia: !!ejercicioActual.media,
        media: ejercicioActual.media,
        tieneMediaLinks: !!ejercicioActual.mediaLinks,
        mediaLinks: ejercicioActual.mediaLinks,
        todasLasPropiedades: Object.keys(ejercicioActual)
      });
    }
    
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
      ? Math.min((tiempoActual / ejercicioActual.duracionSeg) * 100, 100)
      : 0;
    const tiempoRestante = ejercicioActual?.duracionSeg > 0
      ? Math.max(0, ejercicioActual.duracionSeg - tiempoActual)
      : 0;
    const excedido = tiempoActual > (ejercicioActual?.duracionSeg || 0);

    return (
      <div className="min-h-screen bg-background pb-4">
        {/* Timer flotante con controles integrados */}
        {sesionActiva && (
          <div
            ref={timerRef}
            className="fixed z-[30] select-none min-w-[320px] sm:min-w-[380px] md:min-w-[420px]"
            style={{
              top: timerPosition.top !== null ? `${timerPosition.top}px` : undefined,
              left: timerPosition.left !== null ? `${timerPosition.left}px` : undefined,
              right: timerPosition.right !== null ? `${timerPosition.right}px` : undefined,
              cursor: isDraggingTimer ? 'grabbing' : 'grab',
              userSelect: 'none',
            }}
            onMouseDown={handleTimerMouseDown}
            onTouchStart={handleTimerTouchStart}
          >
            <div className={cn(
              componentStyles.effects.playerTranslucent,
              !isAD && ejercicioActual?.duracionSeg > 0 && (
                excedido ? "border-[var(--color-danger)]/30" : porcentajeEjercicio >= 75 ? "border-[var(--color-warning)]/30" : "border-[var(--color-primary)]/20"
              ),
              !isAD && ejercicioActual?.duracionSeg > 0 && !isDraggingTimer && componentStyles.effects.playerTranslucentHover
            )}>
              {/* Header con Timer y Contador */}
              {(!isAD && ejercicioActual?.duracionSeg > 0) || (sesionActiva && listaEjecucion.length > 0) ? (
                <div className="px-3 py-2 border-b border-[var(--color-border-default)]/50">
                  <div className="flex items-center justify-between gap-2">
                    {/* Timer - Solo visible si no es AD y tiene duración */}
                    {!isAD && ejercicioActual?.duracionSeg > 0 && (
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <Clock className={cn(
                          "w-4 h-4 shrink-0",
                          excedido ? "text-[var(--color-danger)]" : porcentajeEjercicio >= 75 ? "text-[var(--color-warning)]" : "text-[var(--color-primary)]"
                        )} />
                        <div className="flex flex-col">
                          <div className={cn(
                            "text-lg font-mono font-bold tabular-nums leading-tight",
                            excedido ? "text-[var(--color-danger)]" : porcentajeEjercicio >= 75 ? "text-[var(--color-warning)]" : "text-[var(--color-text-primary)]"
                          )}>
                            {Math.floor(tiempoActual / 60)}:{String(tiempoActual % 60).padStart(2, '0')}
                          </div>
                          <div className="text-[10px] text-[var(--color-text-secondary)] font-mono tabular-nums leading-tight">
                            / {Math.floor(ejercicioActual.duracionSeg / 60)}:{String((ejercicioActual.duracionSeg % 60)).padStart(2, '0')}
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Contador visual de ejercicios - Siempre visible */}
                    {sesionActiva && listaEjecucion.length > 0 && (
                      <div className="flex flex-col items-end shrink-0">
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
                        {/* Mini barra de progreso del contador */}
                        <div className="mt-1 w-full max-w-[60px] bg-[var(--color-border-default)]/30 rounded-full h-1 overflow-hidden">
                          <div
                            className={cn(
                              "h-full transition-all duration-300 rounded-full",
                              progreso <= 85 ? 'bg-[var(--color-success)]' : progreso <= 100 ? 'bg-[var(--color-warning)]' : 'bg-[var(--color-danger)]'
                            )}
                            style={{ width: `${Math.min(progreso, 100)}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Barra de progreso del ejercicio - Solo si hay timer */}
                  {!isAD && ejercicioActual?.duracionSeg > 0 && (
                    <div className="mt-1.5 bg-[var(--color-border-default)]/30 rounded-full h-0.5 overflow-hidden">
                      <div
                        className={cn(
                          "h-full transition-all duration-300",
                          excedido ? 'bg-[var(--color-danger)]' : porcentajeEjercicio >= 75 ? 'bg-[var(--color-warning)]' : 'bg-[var(--color-primary)]'
                        )}
                        style={{ width: `${Math.min(porcentajeEjercicio, 100)}%` }}
                      />
                    </div>
                  )}
                </div>
              ) : null}
              
              {/* Controles principales - Compactos pero táctiles */}
              {/* Controles de ejercicio - Distribución 19-2-29-2-29-2-19 con gaps */}
              <div className="p-2 flex items-center w-full gap-[2%]">
                {/* Navegación: Atrás - 19% */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAnterior}
                  disabled={indiceActual === 0}
                  className="h-10 flex-[0.19] rounded-lg focus-brand hover:bg-[var(--color-surface-muted)] transition-colors"
                  title="Anterior (P)"
                  aria-label="Ejercicio anterior"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>

                {/* Control principal: Play/Pause - 29% */}
                {!isAD && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={togglePlayPausa}
                    className="h-10 flex-[0.29] rounded-lg focus-brand shadow-sm hover:shadow-md transition-all"
                    title={cronometroActivo ? "Pausar (Espacio)" : "Reproducir (Espacio)"}
                    aria-label={cronometroActivo ? "Pausar cronómetro" : "Iniciar cronómetro"}
                  >
                    {cronometroActivo ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  </Button>
                )}

                {/* Acciones de ejercicio: Completar - 29% */}
                <Button
                  variant="primary"
                  onClick={completarYAvanzar}
                  className={cn(
                    "h-10 flex-[0.29] bg-[var(--color-success)] hover:bg-[var(--color-success)]/90 font-semibold text-sm rounded-lg focus-brand shadow-sm hover:shadow-md transition-all text-white",
                    isAD && "flex-[0.58]"
                  )}
                  title="Completar (Enter)"
                  aria-label={isUltimo ? 'Finalizar sesión' : 'Completar y continuar'}
                >
                  <CheckCircle className="w-4 h-4 mr-1.5" />
                  {isUltimo ? 'Finalizar' : 'OK'}
                </Button>

                {/* Acciones de ejercicio: Saltar - 19% */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={omitirYAvanzar}
                  disabled={isUltimo}
                  className="h-10 flex-[0.19] rounded-lg focus-brand hover:bg-[var(--color-surface-muted)] transition-colors"
                  title="Omitir y pasar (N)"
                  aria-label="Omitir ejercicio"
                >
                  <ChevronsRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Header del Player */}
        <div className="page-header header-modern lg:sticky lg:top-0 z-10">
          <div className="px-2 sm:px-3 md:px-6 py-1 sm:py-1.5 md:py-2">
            <div className="max-w-5xl mx-auto">
              <div className="flex items-center gap-1.5 sm:gap-2 md:gap-2.5 mb-0 sm:mb-0.5 md:mb-1">
                <PlayCircle className="w-4 h-4 sm:w-4 sm:h-4 md:w-5 md:h-5 text-[var(--color-primary)]" />
                <h1 className={`${componentStyles.typography.pageTitle} text-base sm:text-lg md:text-xl lg:text-2xl flex-1 min-w-0`}>
                  <span className="truncate block">{ejercicioActual?.nombre || 'Ejercicio sin nombre'}</span>
                  {ejercicioActual?.esRonda && (
                    <span className="text-xs sm:text-sm text-[var(--color-text-secondary)] font-normal block mt-0.5">
                      Ronda {ejercicioActual.rondaIdx + 1} • Rep {ejercicioActual.repeticion}/{ejercicioActual.totalRepeticiones}
                    </span>
                  )}
                </h1>
                <div className="flex items-center gap-1 shrink-0">
                  <Button variant="ghost" size="sm" className="h-11 w-11 sm:h-9 sm:w-9 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 p-0 rounded-xl focus-brand touch-manipulation" onClick={() => setMostrarItinerario(true)} aria-label="Mostrar índice de ejercicios">
                    <List className="w-5 h-5 sm:w-4 sm:h-4" />
                  </Button>
                  <Button variant="ghost" size="sm" className="h-11 w-11 sm:h-9 sm:w-9 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 p-0 rounded-xl focus-brand touch-manipulation" onClick={() => setMostrarAyuda(true)} aria-label="Mostrar ayuda de atajos">
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

        {/* Contenido del ejercicio */}
        <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-4">
          {isAD && (
            <Alert className={`${componentStyles.containers.panelBase} border-[var(--color-primary)] bg-[var(--color-primary-soft)]`}>
              <AlertTriangle className="h-4 w-4 text-[var(--color-primary)]" />
              <AlertDescription className={`${componentStyles.typography.bodyText} text-[var(--color-text-primary)]`}>
                Este ejercicio no suma tiempo real
              </AlertDescription>
            </Alert>
          )}

          {ejercicioActual.indicadorLogro && (
            <Card className={`${componentStyles.items.itemCardHighlight} border-[var(--color-info)] bg-[var(--color-info)]/10`}>
              <CardContent className="pt-4">
                <p className={`${componentStyles.typography.sectionTitle} text-[var(--color-info)] mb-1`}>💡 Objetivo de logro</p>
                <p className={`${componentStyles.typography.bodyText} text-[var(--color-info)]`}>{ejercicioActual.indicadorLogro}</p>
              </CardContent>
            </Card>
          )}

          {ejercicioActual.instrucciones && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">📋 Instrucciones</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-ui whitespace-pre-wrap leading-relaxed">
                  {ejercicioActual.instrucciones}
                </p>
              </CardContent>
            </Card>
          )}

          {!isAD && (isFM ? elementosFM.length > 0 : ((ejercicioActual.media && Object.keys(ejercicioActual.media).length > 0) || (ejercicioActual.mediaLinks && ejercicioActual.mediaLinks.length > 0))) && (
            <Card className={isFM ? `border-[var(--color-accent)]` : ""}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className={`${componentStyles.typography.cardTitle} ${isFM ? "text-[var(--color-accent)]" : ""}`}>
                    {isFM ? '🎼 Material de la Pieza' : '📎 Material'}
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {isFM ? (
                  elementosFM.map((elemento, idx) => (
                    <div key={idx} className={`border rounded-lg p-3 bg-[var(--color-accent)]/10 space-y-2`}>
                      <h3 className={`${componentStyles.typography.cardTitle} text-[var(--color-accent)]`}>{elemento.nombre}</h3>

                      {/* Mostrar mediaLinks como iconos (excepto audio que va embedido) */}
                      {elemento.mediaLinks && elemento.mediaLinks.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {elemento.mediaLinks.map((url, urlIdx) => {
                            const media = resolveMedia(url);
                            // Audio y SoundCloud: embedidos directamente (solo en modo estudio)
                            if (media.kind === MediaKind.AUDIO || media.kind === MediaKind.SOUNDCLOUD) {
                              return (
                                <div key={urlIdx} className="w-full">
                                  <MediaEmbed url={url} className="w-full" />
                                </div>
                              );
                            }
                            // Resto: iconos clickeables
                            return (
                              <MediaIconButton
                                key={urlIdx}
                                url={url}
                                onOpen={(url) => setMediaModal(url)}
                                className="flex-shrink-0"
                              />
                            );
                          })}
                        </div>
                      )}

                      {elemento.media?.pdf && (
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-xs font-medium text-ui">📄 PDF</p>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setMediaFullscreen({ tipo: 'pdf', url: elemento.media.pdf, nombre: elemento.nombre })}
                              className="h-7 text-xs rounded-xl"
                              aria-label="Ver PDF en pantalla completa"
                            >
                              <Maximize2 className="w-3 h-3 mr-1" />
                              Pantalla completa
                            </Button>
                          </div>
                          <iframe
                            src={elemento.media.pdf}
                            className="w-full h-80 rounded-lg border"
                            title={elemento.nombre}
                          />
                        </div>
                      )}

                      {elemento.media?.video && (
                        <div>
                          <p className="text-xs font-medium text-ui mb-1">📹 Video</p>
                          <video
                            controls
                            className="w-full rounded-lg max-h-60"
                            src={elemento.media.video}
                          />
                        </div>
                      )}

                      {elemento.media?.audio && (
                        <div>
                          <p className="text-xs font-medium text-ui mb-1">🎵 Audio</p>
                          <audio controls className="w-full" src={elemento.media.audio} preload="metadata" />
                        </div>
                      )}

                      {elemento.media?.imagen && (
                        <div>
                          <p className="text-xs font-medium text-ui mb-1">🖼️ Imagen</p>
                          <img
                            src={elemento.media.imagen}
                            alt={elemento.nombre}
                            className="w-full rounded-lg cursor-pointer"
                            onClick={() => setMediaFullscreen({ tipo: 'imagen', url: elemento.media.imagen })}
                          />
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <>
                    {/* Mostrar mediaLinks como iconos (excepto audio que va embedido) */}
                    {ejercicioActual.mediaLinks && ejercicioActual.mediaLinks.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {ejercicioActual.mediaLinks.map((url, urlIdx) => {
                          const media = resolveMedia(url);
                          // Audio y SoundCloud: embedidos directamente (solo en modo estudio)
                          if (media.kind === MediaKind.AUDIO || media.kind === MediaKind.SOUNDCLOUD) {
                            return (
                              <div key={urlIdx} className="w-full">
                                <MediaEmbed url={url} className="w-full" />
                              </div>
                            );
                          }
                          // Resto: iconos clickeables
                          return (
                            <MediaIconButton
                              key={urlIdx}
                              url={url}
                              onOpen={(url) => setMediaModal(url)}
                              className="flex-shrink-0"
                            />
                          );
                        })}
                      </div>
                    )}

                    {ejercicioActual.media?.pdf && (
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-xs font-medium text-ui">📄 PDF</p>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setMediaFullscreen({ tipo: 'pdf', url: ejercicioActual.media.pdf, nombre: 'Material' })}
                            className="h-7 text-xs rounded-xl"
                            aria-label="Ver PDF en pantalla completa"
                          >
                            <Maximize2 className="w-3 h-3 mr-1" />
                            Pantalla completa
                          </Button>
                        </div>
                        <iframe
                          src={ejercicioActual.media.pdf}
                          className="w-full h-80 rounded-lg border"
                          title="Material PDF"
                        />
                      </div>
                    )}

                    {ejercicioActual.media?.video && (
                      <div>
                        <p className="text-xs font-medium text-ui mb-1">📹 Video</p>
                        <video
                          controls
                          className="w-full rounded-lg max-h-60"
                          src={ejercicioActual.media.video}
                        />
                      </div>
                    )}

                    {ejercicioActual.media?.audio && (
                      <div>
                        <p className="text-xs font-medium text-ui mb-1">🎵 Audio</p>
                        <audio controls className="w-full" src={ejercicioActual.media.audio} preload="metadata" />
                      </div>
                    )}

                    {ejercicioActual.media?.imagen && (
                      <div>
                        <p className="text-xs font-medium text-ui mb-1">🖼️ Imagen</p>
                        <img
                          src={ejercicioActual.media.imagen}
                          alt="Material"
                          className="w-full rounded-lg cursor-pointer"
                          onClick={() => setMediaFullscreen({ tipo: 'imagen', url: ejercicioActual.media.imagen })}
                        />
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {ejercicioActual.materialesRequeridos && ejercicioActual.materialesRequeridos.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">🎒 Materiales Requeridos</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="list-disc list-inside space-y-1 text-sm text-ui">
                  {ejercicioActual.materialesRequeridos.map((material, idx) => (
                    <li key={idx}>{material}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Footer de controles - Oculto (controles ahora en timer flotante) */}
        {false && (
        <div className="fixed bottom-0 left-0 right-0 bg-card border-t shadow-card z-30 pb-[env(safe-area-inset-bottom,0px)]">
          <div className="max-w-5xl mx-auto px-3 py-2">
            {/* Breadcrumb compacto */}
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
                
                return (
                  <React.Fragment key={realIdx}>
                    {idx > 0 && <ChevronRight className="w-3 h-3 text-[var(--color-text-muted)] shrink-0" />}
                    <div
                      className={cn(
                        "px-2 py-0.5 rounded text-xs font-medium shrink-0 transition-all whitespace-nowrap",
                        isActive 
                          ? "bg-[var(--color-primary)] text-white shadow-sm" 
                          : isCompleted
                          ? "bg-[var(--color-success)]/20 text-[var(--color-success)] border border-[var(--color-success)]/30"
                          : isOmitted
                          ? "bg-[var(--color-warning)]/20 text-[var(--color-warning)] border border-[var(--color-warning)]/30"
                          : "bg-[var(--color-surface-muted)] text-[var(--color-text-secondary)] border border-[var(--color-border-default)]"
                      )}
                      title={ej.nombre || `${ej.tipo}${ej.esRonda ? ` - Ronda ${ej.rondaIdx + 1}, Repetición ${ej.repeticion}/${ej.totalRepeticiones}` : ''}`}
                    >
                      {label}
                    </div>
                  </React.Fragment>
                );
              })}
            </div>

            {/* Controles principales - Distribución 19-2-29-2-29-2-19 con gaps */}
            <div className="flex items-center w-full gap-[2%] mb-2">
              {/* Navegación: Atrás - 19% */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleAnterior}
                disabled={indiceActual === 0}
                className="h-12 md:h-14 flex-[0.19] rounded-xl focus-brand hover:bg-[var(--color-surface-muted)] transition-colors"
                title="Anterior (P)"
                aria-label="Ejercicio anterior"
              >
                <ChevronLeft className="w-5 h-5 md:w-6 md:h-6" />
              </Button>

              {/* Control principal: Play/Pause - 29% */}
              {!isAD && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={togglePlayPausa}
                  className="h-12 md:h-14 flex-[0.29] rounded-xl focus-brand shadow-sm hover:shadow-md transition-all"
                  title={cronometroActivo ? "Pausar (Espacio)" : "Reproducir (Espacio)"}
                  aria-label={cronometroActivo ? "Pausar cronómetro" : "Iniciar cronómetro"}
                >
                  {cronometroActivo ? <Pause className="w-5 h-5 md:w-6 md:h-6" /> : <Play className="w-5 h-5 md:w-6 md:h-6" />}
                </Button>
              )}

              {/* Acciones de ejercicio: Completar - 29% */}
              <Button
                variant="primary"
                onClick={completarYAvanzar}
                className={cn(
                  "h-12 md:h-14 flex-[0.29] bg-[var(--color-success)] hover:bg-[var(--color-success)]/90 font-semibold text-base md:text-lg rounded-xl focus-brand shadow-sm hover:shadow-md transition-all text-white",
                  isAD && "flex-[0.58]"
                )}
                title="Completar (Enter)"
                aria-label={isUltimo ? 'Finalizar sesión' : 'Completar y continuar'}
              >
                <CheckCircle className="w-5 h-5 md:w-6 md:h-6 mr-2" />
                {isUltimo ? 'Finalizar' : 'OK'}
              </Button>

              {/* Acciones de ejercicio: Saltar - 19% */}
              <Button
                variant="outline"
                size="sm"
                onClick={omitirYAvanzar}
                disabled={isUltimo}
                className="h-12 md:h-14 flex-[0.19] rounded-xl focus-brand hover:bg-[var(--color-surface-muted)] transition-colors"
                title="Omitir y pasar (N)"
                aria-label="Omitir ejercicio"
              >
                <ChevronsRight className="w-5 h-5 md:w-6 md:h-6" />
              </Button>
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
        )}

        {/* Media fullscreen */}
        {mediaFullscreen && (
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
        )}

        {/* Modal para materiales (popup grande) */}
        {mediaModal && (
          <Dialog open={!!mediaModal} onOpenChange={(open) => !open && setMediaModal(null)}>
            <DialogContent className="max-w-6xl max-h-[90vh] w-full p-0 overflow-hidden">
              <DialogHeader className="px-6 pt-6 pb-4 border-b">
                <div className="flex items-center justify-between">
                  <DialogTitle className="text-lg font-semibold">
                    Material
                  </DialogTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setMediaModal(null)}
                    className="h-11 w-11 sm:h-9 sm:w-9 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 rounded-[var(--btn-radius)] touch-manipulation"
                    aria-label="Cerrar"
                  >
                    <X className="w-5 h-5" />
                  </Button>
                </div>
              </DialogHeader>
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
                <MediaEmbed url={mediaModal} className="w-full" />
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* Panel de itinerario - Dialog central mediano */}
        {sesionActiva && (
          <Dialog open={mostrarItinerario} onOpenChange={setMostrarItinerario}>
            <DialogContent size="md" className="max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Índice de Ejercicios</DialogTitle>
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
                          className={`w-full text-left p-3 rounded-lg border transition-all min-h-[52px] ${
                            estaActivo
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
                            className={`w-full text-left p-3 rounded-lg border transition-all ${
                              tieneActivo
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
                                    className={`w-full text-left p-2 rounded-lg border transition-all ${
                                      estaActivo
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
        )}

        {/* Panel de ayuda - Dialog central mediano */}
        <Dialog open={mostrarAyuda} onOpenChange={setMostrarAyuda}>
          <DialogContent size="md" className="max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>⌨️ Atajos de Teclado</DialogTitle>
            </DialogHeader>
            <div className="pt-4 space-y-2">
              <div className={`${componentStyles.layout.grid2} gap-2 text-sm`}>
                <div className="flex items-center gap-2 min-h-[40px]">
                  <kbd className="kbd">Espacio</kbd>
                  <span className="text-xs">Play/Pausa</span>
                </div>
                <div className="flex items-center gap-2 min-h-[40px]">
                  <kbd className="kbd">Enter</kbd>
                  <span className="text-xs">Completar</span>
                </div>
                <div className="flex items-center gap-2 min-h-[40px]">
                  <kbd className="kbd">N</kbd>
                  <span className="text-xs">Omitir</span>
                </div>
                <div className="flex items-center gap-2 min-h-[40px]">
                  <kbd className="kbd">P</kbd>
                  <span className="text-xs">Anterior</span>
                </div>
                <div className="flex items-center gap-2 min-h-[40px]">
                  <kbd className="kbd">Esc</kbd>
                  <span className="text-xs">Cancelar</span>
                </div>
                <div className="flex items-center gap-2 min-h-[40px]">
                  <kbd className="kbd">I</kbd>
                  <span className="text-xs">Índice</span>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Modal cancelar */}
        {mostrarModalCancelar && (
          <ModalCancelar
            onGuardarYSalir={guardarYSalir}
            onSalirSinGuardar={salirSinGuardar}
            onContinuar={() => setMostrarModalCancelar(false)}
          />
        )}
      </div>
    );
  }

  // Vista de listado (no hay sesión activa)
  return (
    <div className="min-h-screen bg-background">
      {/* Header con estilo unificado */}
      <PageHeader
        icon={PlayCircle}
        title="Estudiar Ahora"
        subtitle={`Plan de estudio para ${formatearSemana(semanaActualISO)}`}
        filters={asignacionActiva ? (
            <div className={`flex items-center gap-2 flex-wrap ${componentStyles.typography.bodyText} bg-[var(--color-primary-soft)] rounded-xl p-3 border border-[var(--color-primary)]`}>
              <Music className="w-4 h-4 text-[var(--color-primary)]" />
              <span className="font-semibold">{asignacionActiva.piezaSnapshot?.nombre}</span>
              <span className="text-ui/80">•</span>
              <Target className="w-4 h-4 text-[var(--color-info)]" />
              <span>{asignacionActiva.plan?.nombre}</span>
              <span className="text-ui/80">•</span>
              <span className="font-medium">{getNombreVisible(alumnoActual)}</span>
            </div>
        ) : null}
      />

      <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-4">
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
              {process.env.NODE_ENV === 'development' && (
                <div className="text-xs text-[var(--color-text-muted)] mb-4 p-2 bg-[var(--color-surface-muted)] rounded">
                  <p>Debug: asignacionActiva = {asignacionActiva ? '✓' : '✗'}</p>
                  <p>Debug: semanaDelPlan = {semanaDelPlan ? '✓' : '✗'}</p>
                  {asignacionActiva && (
                    <p>Debug: semanaIdx = {semanaIdx}, semanas disponibles = {asignacionActiva.plan?.semanas?.length}</p>
                  )}
                </div>
              )}
              <Button
                variant="outline"
                onClick={() => navigate(createPageUrl('estadisticas'))}
                className={`${componentStyles.buttons.outline} focus-brand`}
              >
                Ver mi historial y estadísticas →
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="border-l-4 border-[var(--color-primary)] bg-[var(--color-primary-soft)]/50 rounded-r-lg p-3">
              {/* Información de la semana - siempre visible */}
              <div className="mb-3">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <h2 className={`text-base font-bold text-[var(--color-text-primary)]`}>{semanaDelPlan.nombre}</h2>
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

              {/* Botón clickeable para desplegar/colapsar sesiones */}
              <button
                className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-[var(--color-primary-soft)] transition-colors"
                onClick={() => setPlanDesplegado(!planDesplegado)}
              >
                {planDesplegado ? (
                  <ChevronDown className="w-4 h-4 text-[var(--color-text-secondary)]" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-[var(--color-text-secondary)]" />
                )}
                <span className="text-base font-medium text-[var(--color-text-primary)]">
                  {planDesplegado ? 'Ocultar sesiones' : 'Mostrar sesiones'}
                </span>
              </button>

              {/* Sesiones - desplegables */}
              {planDesplegado && semanaDelPlan.sesiones && (
                <div className="mt-3 space-y-2">
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
                          className={`ml-4 border-l-2 cursor-pointer hover:shadow-sm transition-all rounded-r-lg p-2.5 ${
                            sesionSeleccionada === sesionIdx
                              ? `border-[var(--color-primary)] bg-[var(--color-primary-soft)] shadow-sm`
                              : `border-[var(--color-info)]/40 bg-[var(--color-info)]/10 hover:bg-[var(--color-info)]/20`
                          }`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSesionSeleccionada(sesionIdx);
                          }}
                        >
                          <div className="space-y-2">
                            {/* Header de la sesión */}
                            <div className="flex items-start gap-2">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <PlayCircle className="w-3.5 h-3.5 text-[var(--color-info)] flex-shrink-0" />
                                  <span className={`text-sm font-semibold text-[var(--color-text-primary)]`}>{sesion.nombre}</span>
                                  <Badge
                                    variant="outline"
                                    className={componentStyles.status.badgeSuccess}
                                  >
                                    <Clock className="w-3 h-3 mr-1" />
                                    {minutos}:{String(segundos).padStart(2, '0')} min
                                  </Badge>
                                  <Badge className={focoColors[sesion.foco]} variant="outline">
                                    {focoLabels[sesion.foco]}
                                  </Badge>
                                </div>
                              </div>
                            </div>

                            {/* Botón de resumen de sesión */}
                            <button
                              className={`w-full flex items-center gap-2 p-1.5 rounded-lg transition-colors ${
                                resumenExpandido ? 'bg-[var(--color-surface-muted)]' : 'hover:bg-[var(--color-surface-muted)]'
                              }`}
                              onClick={toggleResumen}
                            >
                              {resumenExpandido ? (
                                <ChevronDown className="w-4 h-4 text-[var(--color-text-secondary)]" />
                              ) : (
                                <ChevronRight className="w-4 h-4 text-[var(--color-text-secondary)]" />
                              )}
                              <span className="text-sm font-medium text-[var(--color-text-primary)]">
                                {resumenExpandido ? 'Ocultar resumen' : 'Ver resumen de la sesión'}
                              </span>
                            </button>

                            {/* Resumen expandido */}
                            {resumenExpandido && (
                              <div className="ml-2 sm:ml-4 mt-2 pt-2 border-t border-[var(--color-border-default)]" onClick={(e) => e.stopPropagation()}>
                                <SessionContentView sesion={sesion} compact />
                              </div>
                            )}

                            {/* Botón de iniciar práctica (solo si está seleccionada) */}
                            {sesionSeleccionada === sesionIdx && (
                              <div className="pt-2 border-t border-[var(--color-border-default)]" onClick={(e) => e.stopPropagation()}>
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
              )}
            </div>

            <div className="flex items-center justify-center pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => navigate(createPageUrl('estadisticas'))}
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
