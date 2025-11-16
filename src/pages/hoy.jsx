
import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { getCurrentUser } from "@/api/localDataClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ds";
import { Button } from "@/components/ds/Button"; // Updated import path
import { Badge } from "@/components/ds";
import { Alert, AlertDescription } from "@/components/ds";
import {
  PlayCircle, Calendar, Target, Music, Clock, Layers,
  ChevronRight, ChevronLeft, AlertTriangle, ChevronDown,
  Play, Pause, X, List, HelpCircle,
  Maximize2, Minimize2, CheckCircle, XCircle,
  SkipForward
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  calcularLunesSemanaISO,
  calcularOffsetSemanas,
  calcularTiempoSesion,
  aplanarSesion,
  getNombreVisible
} from "../components/utils/helpers";
import TimelineProgreso from "../components/estudio/TimelineProgreso";
import ModalCancelar from "../components/estudio/ModalCancelar";
import ResumenFinal from "../components/estudio/ResumenFinal";
import { toast } from "sonner";
import { useSidebar } from "@/components/ui/SidebarState";
import PageHeader from "@/components/ds/PageHeader";
import { componentStyles } from "@/design/componentStyles";

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
  const { closeSidebar } = useSidebar();

  const [semanaActualISO, setSemanaActualISO] = useState(() => {
    return calcularLunesSemanaISO(new Date());
  });
  const [sesionSeleccionada, setSesionSeleccionada] = useState(0);
  const [planDesplegado, setPlanDesplegado] = useState(false);
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
  const [sesionFinalizada, setSesionFinalizada] = useState(false);
  const [datosFinal, setDatosFinal] = useState(null);
  const [mediaFullscreen, setMediaFullscreen] = useState(null);

  const [registroSesionId, setRegistroSesionId] = useState(null);
  const [timestampInicio, setTimestampInicio] = useState(null);
  const [timestampUltimoPausa, setTimestampUltimoPausa] = useState(null);
  const [tiempoAcumuladoAntesPausa, setTiempoAcumuladoAntesPausa] = useState(0);
  const heartbeatIntervalRef = useRef(null);
  const colaOfflineRef = useRef([]);

  const sidebarCerradoRef = useRef(false);

  const currentUser = getCurrentUser();

  const { data: usuarios = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
  });

  const simulatingUser = sessionStorage.getItem('simulatingUser') ?
    JSON.parse(sessionStorage.getItem('simulatingUser')) : null;

  const userIdActual = simulatingUser?.id || currentUser?.id;
  const isSimulacion = !!simulatingUser;
  const alumnoActual = usuarios.find(u => u.id === userIdActual) || currentUser;

  const { data: asignacionesRaw = [] } = useQuery({
    queryKey: ['asignaciones'],
    queryFn: () => base44.entities.Asignacion.list(),
  });

  // Filtrar y validar asignaciones
  const asignaciones = asignacionesRaw.filter(a => {
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

  const asignacionActiva = asignaciones.find(a => {
    if (a.alumnoId !== userIdActual) return false;
    if (a.estado !== 'publicada' && a.estado !== 'en_curso') return false;
    try {
      const offset = calcularOffsetSemanas(a.semanaInicioISO, semanaActualISO);
      return offset >= 0 && offset < (a.plan?.semanas?.length || 0);
    } catch (error) {
      console.warn('Error calculando offset de semana:', error, a);
      return false;
    }
  });

  const semanaDelPlan = asignacionActiva ?
    asignacionActiva.plan?.semanas?.[calcularOffsetSemanas(asignacionActiva.semanaInicioISO, semanaActualISO)] :
    null;

  const semanaIdx = asignacionActiva ?
    calcularOffsetSemanas(asignacionActiva.semanaInicioISO, semanaActualISO) : 0;

  useEffect(() => {
    if (sesionActiva && !sesionFinalizada && !sidebarCerradoRef.current) {
      closeSidebar();
      sidebarCerradoRef.current = true;
    }
    if (!sesionActiva) {
      sidebarCerradoRef.current = false;
    }
  }, [sesionActiva, sesionFinalizada, closeSidebar]);

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
    if (isSimulacion || !asignacionActiva || !sesionActiva) return;

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
        await base44.entities.RegistroSesion.update(registroSesionId, dataRegistro);
      } else {
        const nuevoRegistro = await base44.entities.RegistroSesion.create(dataRegistro);
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
    if (isSimulacion || !registroSesionId || !sesionActiva) return;

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
      await base44.entities.RegistroBloque.create(dataBloque);
    } catch (error) {
      colaOfflineRef.current.push({
        tipo: 'bloque',
        data: dataBloque,
        timestamp: Date.now(),
      });
    }
  };

  useEffect(() => {
    if (!sesionActiva || sesionFinalizada || isSimulacion) return;

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
  }, [sesionActiva, sesionFinalizada, tiempoActual, completados, omitidos, registroSesionId, isSimulacion]);

  useEffect(() => {
    const handlePageHide = () => {
      if (sesionActiva && !sesionFinalizada && !isSimulacion && registroSesionId) {
        guardarRegistroSesion(false);
      }
    };

    window.addEventListener('pagehide', handlePageHide);
    window.addEventListener('beforeunload', handlePageHide);

    return () => {
      window.removeEventListener('pagehide', handlePageHide);
      window.removeEventListener('beforeunload', handlePageHide);
    };
  }, [sesionActiva, sesionFinalizada, registroSesionId, tiempoActual, completados, omitidos, isSimulacion]);

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

  useEffect(() => {
    if (!sesionActiva || sesionFinalizada) return;

    const handleKeyDown = (e) => {
      if (e.target.matches('input, textarea')) return;
      if ((e.metaKey || e.ctrlKey) && e.key === 'm') return;

      if (e.key === 'Escape') {
        e.preventDefault();
        if (mediaFullscreen) {
          setMediaFullscreen(null);
        } else {
          setMostrarModalCancelar(true);
        }
      }
      if (e.code === 'Space') {
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
      if (e.key === 'n') {
        e.preventDefault();
        omitirYAvanzar();
      }
      if (e.key === 'p') {
        e.preventDefault();
        handleAnterior();
      }
      if (e.key === 'i') {
        e.preventDefault();
        setMostrarItinerario(prev => !prev);
      }
      if (e.key === '?') {
        e.preventDefault();
        setMostrarAyuda(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [sesionActiva, indiceActual, sesionFinalizada, mostrarItinerario, mostrarAyuda, mediaFullscreen]);

  const empezarSesion = async (sesion, sesionIdxProp) => {
    setSesionActiva(sesion);
    setIndiceActual(0);
    setTiempoActual(0);
    setCronometroActiva(false);
    setCompletados(new Set());
    setOmitidos(new Set());
    setSesionFinalizada(false);
    setDatosFinal(null);

    if (!isSimulacion) {
      const ahora = new Date().toISOString();
      const listaEjecucion = aplanarSesion(sesion);
      const tiempoPrevisto = listaEjecucion
        .filter(e => e.tipo !== 'AD')
        .reduce((sum, e) => sum + (e.duracionSeg || 0), 0);

      try {
        const nuevoRegistro = await base44.entities.RegistroSesion.create({
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
        console.error("Error creando registro:", error);
      }
    }

    const ahora = Date.now();
    setTimestampInicio(ahora);
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

  const handleCancelar = () => {
    setMostrarModalCancelar(true);
  };

  const guardarYSalir = async () => {
    await guardarRegistroSesion(false);
    setMostrarModalCancelar(false);
    cerrarSesion();
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
        onCalidadNotas={async (calidad, notas, mediaLinks) => {
          setDatosFinal(prev => ({ ...prev, calidad, notas, mediaLinks }));

          if (!isSimulacion && registroSesionId) {
            try {
              await base44.entities.RegistroSesion.update(registroSesionId, {
                calificacion: calidad,
                notas: notas,
                mediaLinks: mediaLinks || [],
                finalizada: true,
              });
            } catch (error) {
              console.error("Error guardando feedback:", error);
            }
          }
        }}
      />
    );
  }

  // Player activo
  if (sesionActiva) {
    const listaEjecucion = aplanarSesion(sesionActiva);
    const ejercicioActual = listaEjecucion[indiceActual];
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

    return (
      <div className="min-h-screen bg-background pb-[160px]">
        {/* Header del Player */}
        <div className="bg-card border-b border-[var(--color-border-default)] px-4 py-4 lg:sticky lg:top-0 z-10 shadow-card">
          <div className="max-w-5xl mx-auto">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-10 h-10 bg-gradient-to-br from-brand-500 to-brand-600 rounded-xl flex items-center justify-center shadow-card">
                  <PlayCircle className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-xl md:text-2xl font-bold text-ui truncate">
                    {ejercicioActual.nombre}
                  </h2>
                  {ejercicioActual.esRonda && (
                    <p className="text-xs text-ui/80">
                      Ronda {ejercicioActual.rondaIdx + 1} • Rep {ejercicioActual.repeticion}/{ejercicioActual.totalRepeticiones}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" className="h-9 w-9 p-0 rounded-xl focus-brand" onClick={() => setMostrarItinerario(true)} aria-label="Mostrar índice de ejercicios">
                  <List className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" className="h-9 w-9 p-0 rounded-xl focus-brand" onClick={() => setMostrarAyuda(true)} aria-label="Mostrar ayuda de atajos">
                  <HelpCircle className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Breadcrumbs */}
            <div className="flex items-center gap-2 flex-wrap text-xs text-ui/80">
              <Music className="w-3 h-3 text-[var(--color-primary)]" />
              <span className="font-medium">{asignacionActiva.piezaSnapshot?.nombre}</span>
              <span className="text-ui/60">•</span>
              <Target className="w-3 h-3 text-[var(--color-info)]" />
              <span>{asignacionActiva.plan?.nombre}</span>
              <span className="text-ui/60">•</span>
              <Badge className={focoColors[sesionActiva.foco]} variant="outline">
                {focoLabels[sesionActiva.foco]}
              </Badge>
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

          {!isAD && (isFM ? elementosFM.length > 0 : (ejercicioActual.media && Object.keys(ejercicioActual.media).length > 0)) && (
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

        {/* Footer de controles */}
        <div className="fixed bottom-0 left-0 right-0 bg-card border-t shadow-card z-30 pb-[env(safe-area-inset-bottom,0px)]">
          <div className="max-w-5xl mx-auto px-3 py-3">
            {/* Barra de progreso de tiempo */}
            <div className="mb-3">
              <TimelineProgreso
                tiempoActual={tiempoActual}
                tiempoObjetivo={tiempoTotalPrevisto}
              />
            </div>

            {/* Controles principales */}
            <div className="flex items-center justify-center gap-2 mb-2">
              <Button
                variant="danger"
                size="sm"
                onClick={handleCancelar}
                className="h-11 px-3 min-w-[44px] rounded-xl focus-brand"
                title="Cancelar sesión (Esc)"
                aria-label="Cancelar sesión"
              >
                <X className="w-4 h-4" />
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handleAnterior}
                disabled={indiceActual === 0}
                className="h-11 px-3 min-w-[44px] rounded-xl focus-brand"
                title="Anterior (P)"
                aria-label="Ejercicio anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>

              {!isAD && (
                <>
                  <div className="flex items-center gap-1.5 bg-muted rounded-lg px-3 py-2">
                    <Clock className="w-4 h-4 text-ui/80" />
                    <span className="text-sm font-mono font-semibold text-ui">
                      {Math.floor(tiempoActual / 60)}:{String(tiempoActual % 60).padStart(2, '0')}
                    </span>
                  </div>

                  <Button
                    variant="primary"
                    size="sm"
                    onClick={togglePlayPausa}
                    className="h-11 px-4 min-w-[44px] rounded-xl focus-brand shadow-sm"
                    title={cronometroActivo ? "Pausar (Espacio)" : "Reproducir (Espacio)"}
                    aria-label={cronometroActivo ? "Pausar cronómetro" : "Iniciar cronómetro"}
                  >
                    {cronometroActivo ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                  </Button>
                </>
              )}

              <Button
                variant="primary"
                onClick={completarYAvanzar}
                className="h-11 px-5 bg-[hsl(var(--success))] hover:bg-[hsl(var(--success)/0.9)] min-w-[90px] font-semibold rounded-xl focus-brand shadow-sm text-white"
                title="Completar (Enter)"
                aria-label={isUltimo ? 'Finalizar sesión' : 'Completar y continuar'}
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                {isUltimo ? 'Finalizar' : 'OK'}
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={omitirYAvanzar}
                disabled={isUltimo}
                className="h-11 px-3 min-w-[44px] rounded-xl focus-brand"
                title="Omitir y pasar (N)"
                aria-label="Omitir ejercicio"
              >
                <SkipForward className="w-4 h-4" />
              </Button>
            </div>

            {/* Info de progreso */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs text-ui/80">
                <span>Bloque {indiceActual + 1}/{listaEjecucion.length}</span>
                <span>{completados.size} ✓ • {omitidos.size} omitidos</span>
              </div>
              <div className="bg-muted rounded-full h-1.5 overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${
                    progreso <= 85 ? 'bg-[var(--color-success)]' : progreso <= 100 ? 'bg-[var(--color-warning)]' : 'bg-[var(--color-danger)]'
                  }`}
                  style={{ width: `${Math.min(progreso, 100)}%` }}
                />
              </div>

              <p className="text-center text-xs text-ui/80">
                Espacio: ⏯ • Enter: ✓ • N: omitir • P: ← • Esc: cancelar • Ctrl/Cmd+M: menú
              </p>
            </div>
          </div>
        </div>

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

        {/* Panel de itinerario */}
        {mostrarItinerario && (
          <>
            <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setMostrarItinerario(false)} />
            <div className="fixed inset-y-0 right-0 w-full max-w-sm bg-card shadow-card z-50 overflow-y-auto">
              <div className="sticky top-0 bg-card border-b px-4 py-3 flex items-center justify-between">
                <h3 className="text-base font-bold">Índice de Ejercicios</h3>
                <Button variant="ghost" size="sm" onClick={() => setMostrarItinerario(false)} className="h-8 w-8 p-0 rounded-xl focus-brand" aria-label="Cerrar índice">
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <div className="p-3 space-y-2">
                {listaEjecucion.map((ej, idx) => (
                  <button
                    key={idx}
                    onClick={() => navegarA(idx)}
                        className={`w-full text-left p-3 rounded-lg border transition-all min-h-[52px] focus-brand ${
                          idx === indiceActual
                            ? 'bg-[var(--color-primary-soft)] text-[var(--color-text-primary)] border-[var(--color-primary)] shadow-sm'
                            : completados.has(idx)
                            ? 'bg-[var(--color-success)]/10 border-[var(--color-success)]'
                            : omitidos.has(idx)
                            ? 'bg-[var(--color-warning)]/10 border-[var(--color-warning)]'
                            : 'bg-[var(--color-surface)] border-[var(--color-border-strong)] hover:bg-[var(--color-surface-muted)]'
                        }`}
                    aria-label={`Ir a ejercicio ${idx + 1}: ${ej.nombre}`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold min-w-[24px]">#{idx + 1}</span>
                      <Badge variant="outline" className={`${tipoColors[ej.tipo]} text-xs border`}>
                        {ej.tipo}
                      </Badge>
                          <span className="flex-1 text-sm font-medium truncate text-ui">{ej.nombre}</span>
                      {completados.has(idx) && <CheckCircle className="w-4 h-4 text-[var(--color-success)] shrink-0" />}
                      {omitidos.has(idx) && <XCircle className="w-4 h-4 text-ui/80 shrink-0" />}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Panel de ayuda */}
        {mostrarAyuda && (
          <>
            <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setMostrarAyuda(false)} />
            <Card className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[90vw] max-w-md z-50 max-h-[80vh] overflow-y-auto">
              <CardHeader className="border-b pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">⌨️ Atajos de Teclado</CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => setMostrarAyuda(false)} className="h-8 w-8 p-0 rounded-xl focus-brand" aria-label="Cerrar ayuda">
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-4 space-y-2">
                <div className="grid grid-cols-2 gap-2 text-sm">
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
                  <div className="flex items-center gap-2 min-h-[40px] col-span-2">
                    <kbd className="kbd">Ctrl/Cmd+M</kbd>
                    <span className="text-xs">Mostrar/Ocultar Menú</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}

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
            <Card className={`border-2 ${componentStyles.containers.cardBase} border-[var(--color-primary)]`}>
              <CardContent className="pt-4">
                <div className="flex items-start gap-3">
                  <div className="pt-1 cursor-pointer" onClick={() => setPlanDesplegado(!planDesplegado)}>
                    {planDesplegado ? (
                      <ChevronDown className="w-5 h-5 text-ui/80" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-ui/80" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h2 className="font-bold text-xl">{semanaDelPlan.nombre}</h2>
                      <Badge className={focoColors[semanaDelPlan.foco]}>
                        {focoLabels[semanaDelPlan.foco]}
                      </Badge>
                      <span className="text-sm text-ui/80">
                        ({semanaDelPlan.sesiones?.length || 0} sesiones)
                      </span>
                    </div>
                    {semanaDelPlan.objetivo && (
                      <p className="text-sm text-ui/80 italic mt-1">"{semanaDelPlan.objetivo}"</p>
                    )}
                  </div>
                </div>

                {planDesplegado && semanaDelPlan.sesiones && (
                  <div className="ml-8 mt-4 space-y-2">
                    {semanaDelPlan.sesiones.map((sesion, sesionIdx) => {
                      const tiempoTotal = calcularTiempoSesion(sesion);
                      const minutos = Math.floor(tiempoTotal / 60);
                      const segundos = tiempoTotal % 60;

                      return (
                        <Card
                          key={sesionIdx}
                          className={`border-2 cursor-pointer hover:shadow-sm transition-all ${
                            sesionSeleccionada === sesionIdx
                              ? `border-[var(--color-primary)] bg-[var(--color-primary-soft)] shadow-sm ${componentStyles.items.itemCardHighlight}`
                              : `border-[var(--color-info)] bg-[var(--color-info)]/10 ${componentStyles.items.itemCard}`
                          }`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSesionSeleccionada(sesionIdx);
                          }}
                        >
                          <CardContent className="pt-4 pb-4">
                            <div className="flex items-start gap-3">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 flex-wrap mb-2">
                                  <PlayCircle className="w-4 h-4 text-[var(--color-info)]" />
                                  <span className={`${componentStyles.typography.cardTitle} font-semibold`}>{sesion.nombre}</span>
                                  <Badge
                                    variant="outline"
                                    className={componentStyles.status.badgeSuccess}
                                  >
                                    ⏱ {minutos}:{String(segundos).padStart(2, '0')} min
                                  </Badge>
                                  <Badge className={focoColors[sesion.foco]} variant="outline">
                                    {focoLabels[sesion.foco]}
                                  </Badge>
                                </div>

                                {sesionSeleccionada === sesionIdx && (
                                  <div className="mt-3 space-y-3" onClick={(e) => e.stopPropagation()}>
                                    <Button
                                      variant="primary"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        empezarSesion(sesion, sesionIdx);
                                      }}
                                      size="lg"
                                      className={`w-full h-14 text-lg font-bold shadow-card ${componentStyles.buttons.primary} focus-brand`}
                                    >
                                      <PlayCircle className="w-6 h-6 mr-2" />
                                      Iniciar Práctica
                                    </Button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

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
