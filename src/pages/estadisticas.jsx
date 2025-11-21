import React, { useState, useMemo, useEffect } from "react";
import TablePagination from "@/components/common/TablePagination";
import { localDataClient } from "@/api/localDataClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ds";
import { Button } from "@/components/ds/Button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import DateRangePicker from "@/components/ui/DateRangePicker";
import { Badge } from "@/components/ds";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart as RechartsPieChart, Pie, Cell, Legend, BarChart, Bar } from 'recharts';
import {
  Activity, Clock, Calendar, Star, Smile, BarChart3, TrendingUp,
  MessageSquare, Eye, RefreshCw, Dumbbell, List, PieChart, CalendarDays, Calendar as CalendarIcon,
  Sun, CalendarRange, Grid3x3, Layers, FileText, Timer, Edit, X, Save
} from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { displayName, useEffectiveUser, resolveUserIdActual } from "../components/utils/helpers";
import MultiSelect from "../components/ui/MultiSelect";
import MediaLinksBadges from "../components/common/MediaLinksBadges";
import MediaLinksInput from "../components/common/MediaLinksInput";
import MediaViewer from "../components/common/MediaViewer";
import { resolveMedia } from "../components/utils/media";
import RequireRole from "@/components/auth/RequireRole";
import Tabs from "@/components/ds/Tabs";
import { componentStyles } from "@/design/componentStyles";
import { designSystem } from "@/design/designSystem";
import PageHeader from "@/components/ds/PageHeader";
import { useIsMobile } from "@/hooks/use-mobile";
import ModalSesion from "@/components/calendario/ModalSesion";
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

/**
 * Normaliza un número, reemplazando valores inválidos por 0
 * Maneja Infinity, NaN, valores negativos y valores absurdamente grandes
 */
function safeNumber(n) {
  if (n === null || n === undefined) return 0;
  if (typeof n !== 'number') {
    const parsed = parseFloat(n);
    if (isNaN(parsed) || !isFinite(parsed)) return 0;
    n = parsed;
  }
  if (!isFinite(n)) return 0;
  if (n < 0) return 0;
  // Limitar valores absurdamente grandes (más de 12 horas en segundos)
  if (n > 43200) {
    // Si parece estar en milisegundos, convertir
    if (n > 43200000) {
      return Math.floor(n / 1000);
    }
    return 43200; // Máximo 12 horas
  }
  return Math.round(n);
}

// Helper para validar y corregir duración (detecta si está en milisegundos en lugar de segundos)
const validarDuracion = (duracionSeg) => {
  return safeNumber(duracionSeg);
};

// Normaliza valores agregados (sin límite superior de 12h)
const normalizeAggregate = (n) => {
  if (n === null || n === undefined) return 0;
  if (typeof n !== 'number') {
    const parsed = parseFloat(n);
    if (isNaN(parsed) || !isFinite(parsed)) return 0;
    n = parsed;
  }
  if (!isFinite(n)) return 0;
  if (n < 0) return 0;
  return Math.round(n);
};

// Formatea una duración en segundos a "H h M min" o "D d H h M min" si >= 24h
const formatDuracionHM = (duracionSeg) => {
  const totalSeg = normalizeAggregate(duracionSeg);
  const horas = Math.floor(totalSeg / 3600);
  const minutos = Math.floor((totalSeg % 3600) / 60);
  
  // Si las horas son >= 24, mostrar formato con días
  if (horas >= 24) {
    const dias = Math.floor(horas / 24);
    const horasRestantes = horas % 24;
    if (dias > 0 && horasRestantes > 0 && minutos > 0) {
      return `${dias} d ${horasRestantes} h ${minutos} min`;
    }
    if (dias > 0 && horasRestantes > 0) {
      return `${dias} d ${horasRestantes} h`;
    }
    if (dias > 0 && minutos > 0) {
      return `${dias} d ${minutos} min`;
    }
    if (dias > 0) {
      return `${dias} d`;
    }
  }
  
  // Formato normal para < 24h
  if (horas > 0 && minutos > 0) return `${horas} h ${minutos} min`;
  if (horas > 0) return `${horas} h`;
  return `${minutos} min`;
};

function EstadisticasPageContent() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();
  
  const [rangoPreset, setRangoPreset] = useState('4-semanas');
  const [periodoInicio, setPeriodoInicio] = useState(() => {
    const stored = searchParams.get('inicio');
    if (stored) return stored;
    const hace28 = new Date();
    hace28.setDate(hace28.getDate() - 28);
    return formatLocalDate(hace28);
  });
  
  const [periodoFin, setPeriodoFin] = useState(() => {
    return searchParams.get('fin') || formatLocalDate(new Date());
  });

  const [tabActiva, setTabActiva] = useState(searchParams.get('tab') || 'resumen');
  const [alumnosSeleccionados, setAlumnosSeleccionados] = useState(() => {
    const stored = searchParams.get('alumnos');
    return stored ? stored.split(',') : [];
  });
  const [profesoresSeleccionados, setProfesoresSeleccionados] = useState(() => {
    const stored = searchParams.get('profesores');
    return stored ? stored.split(',') : [];
  });
  const [focosSeleccionados, setFocosSeleccionados] = useState(() => {
    const stored = searchParams.get('focos');
    return stored ? stored.split(',') : [];
  });
  const [granularidad, setGranularidad] = useState('dia');
  const [calificacionFilter, setCalificacionFilter] = useState('all');
  const [soloConNotas, setSoloConNotas] = useState(false);
  const [searchEjercicio, setSearchEjercicio] = useState('');
  const [viewingMedia, setViewingMedia] = useState(null);
  const [feedbackDrawer, setFeedbackDrawer] = useState(null);
  const [modalSesionOpen, setModalSesionOpen] = useState(false);
  const [registroSesionSeleccionado, setRegistroSesionSeleccionado] = useState(null);

  const effectiveUser = useEffectiveUser();

  const isAdmin = effectiveUser?.rolPersonalizado === 'ADMIN';
  const isProf = effectiveUser?.rolPersonalizado === 'PROF';
  const isEstu = effectiveUser?.rolPersonalizado === 'ESTU';

  // Cargar usuarios primero para poder calcular userIdActual
  const { data: usuarios = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => localDataClient.entities.User.list(),
  });

  // Resolver ID de usuario actual de la BD (UUID en Supabase, string en local)
  // Usar useMemo para recalcular cuando usuarios cambie
  const userIdActual = useMemo(() => {
    const resolved = resolveUserIdActual(effectiveUser, usuarios);
    console.log('[DEBUG] userIdActual resuelto:', resolved, 'typeof:', typeof resolved);
    console.log('[DEBUG] effectiveUser:', effectiveUser);
    console.log('[DEBUG] usuarios disponibles:', usuarios.map(u => ({ id: u.id, email: u.email, rol: u.rolPersonalizado })));
    return resolved;
  }, [effectiveUser, usuarios]);

  const { data: asignacionesProf = [] } = useQuery({
    queryKey: ['asignacionesProf', userIdActual],
    queryFn: () => localDataClient.entities.Asignacion.list(),
    enabled: isProf && !!userIdActual,
  });

  const estudiantesDelProfesor = useMemo(() => {
    if (!isProf || !effectiveUser) return [];
    
    const misAsignaciones = asignacionesProf.filter(a => 
      a.profesorId === userIdActual && 
      (a.estado === 'publicada' || a.estado === 'en_curso' || a.estado === 'borrador')
    );
    
    const alumnosIds = [...new Set(misAsignaciones.map(a => a.alumnoId))];
    return alumnosIds;
  }, [asignacionesProf, effectiveUser, isProf, userIdActual]);

  const { data: registros = [] } = useQuery({
    queryKey: ['registrosSesion'],
    queryFn: () => localDataClient.entities.RegistroSesion.list('-inicioISO'),
  });

  const { data: bloques = [] } = useQuery({
    queryKey: ['registrosBloques'],
    queryFn: () => localDataClient.entities.RegistroBloque.list('-inicioISO'),
  });

  const { data: asignaciones = [] } = useQuery({
    queryKey: ['asignaciones'],
    queryFn: () => localDataClient.entities.Asignacion.list(),
  });

  const { data: feedbacksSemanal = [] } = useQuery({
    queryKey: ['feedbacksSemanal'],
    queryFn: async () => {
      if (process.env.NODE_ENV === 'development') {
        console.log('[estadisticas.jsx] Consultando tabla feedbacks_semanal (NO registros_sesion)');
      }
      return await localDataClient.entities.FeedbackSemanal.list('-created_at');
    },
  });

  const estudiantes = usuarios.filter(u => u.rolPersonalizado === 'ESTU');
  const profesores = usuarios.filter(u => u.rolPersonalizado === 'PROF');

  useEffect(() => {
    if (periodoInicio && periodoFin) {
      const inicio = parseLocalDate(periodoInicio);
      const fin = parseLocalDate(periodoFin);
      if (inicio > fin) {
        const temp = periodoInicio;
        setPeriodoInicio(periodoFin);
        setPeriodoFin(temp);
      }
    }
  }, [periodoInicio, periodoFin]);

  useEffect(() => {
    if (isProf && estudiantesDelProfesor.length > 0 && alumnosSeleccionados.length === 0) {
      setAlumnosSeleccionados(estudiantesDelProfesor);
    }
  }, [isProf, estudiantesDelProfesor, alumnosSeleccionados]);

  useEffect(() => {
    const params = {};
    if (periodoInicio) params.inicio = periodoInicio;
    if (periodoFin) params.fin = periodoFin;
    if (tabActiva !== 'resumen') params.tab = tabActiva;
    if (!isEstu && alumnosSeleccionados.length > 0) params.alumnos = alumnosSeleccionados.join(',');
    if (!isEstu && profesoresSeleccionados.length > 0) params.profesores = profesoresSeleccionados.join(',');
    if (focosSeleccionados.length > 0) params.focos = focosSeleccionados.join(',');
    setSearchParams(params);
  }, [periodoInicio, periodoFin, tabActiva, alumnosSeleccionados, profesoresSeleccionados, focosSeleccionados, isEstu, setSearchParams]);

  const aplicarPreset = (preset) => {
    const hoy = new Date();
    let inicio, fin;
    
    switch (preset) {
      case 'esta-semana':
        inicio = startOfMonday(hoy);
        fin = hoy;
        break;
      case '4-semanas':
        inicio = new Date(hoy);
        inicio.setDate(inicio.getDate() - 28);
        fin = hoy;
        break;
      case 'este-mes':
        inicio = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
        fin = hoy;
        break;
      case '3-meses':
        inicio = new Date(hoy);
        inicio.setMonth(inicio.getMonth() - 3);
        fin = hoy;
        break;
      case 'este-ano':
        inicio = new Date(hoy.getFullYear(), 0, 1);
        fin = hoy;
        break;
      case 'ultimo-ano':
        inicio = new Date(hoy);
        inicio.setFullYear(inicio.getFullYear() - 1);
        fin = hoy;
        break;
      case 'todo':
        inicio = null;
        fin = null;
        break;
      default:
        inicio = null;
        fin = null;
        break;
    }
    
    setPeriodoInicio(inicio ? formatLocalDate(inicio) : '');
    setPeriodoFin(fin ? formatLocalDate(fin) : '');
    setRangoPreset(preset);
  };

  const calcularRacha = (registrosFiltrados, alumnoId = null) => {
    const targetRegistros = registrosFiltrados
      .filter(r => (!alumnoId || r.alumnoId === alumnoId) && (r.duracionRealSeg || 0) >= 60);

    if (targetRegistros.length === 0) return { actual: 0, maxima: 0 };

    const diasUnicos = new Set();
    targetRegistros.forEach(r => {
      if (r.inicioISO) {
        const fecha = new Date(r.inicioISO);
        const fechaLocal = formatLocalDate(fecha);
        diasUnicos.add(fechaLocal);
      }
    });

    if (diasUnicos.size === 0) return { actual: 0, maxima: 0 };

    const diasArraySortedDesc = Array.from(diasUnicos).sort((a, b) => b.localeCompare(a));
    const diasArraySortedAsc = Array.from(diasUnicos).sort((a, b) => a.localeCompare(b));

    let rachaActual = 0;
    const hoy = formatLocalDate(new Date());
    const ayer = (() => {
      const d = new Date();
      d.setDate(d.getDate() - 1);
      return formatLocalDate(d);
    })();

    if (diasArraySortedDesc.length > 0) {
      const lastPracticeDay = diasArraySortedDesc[0];
      if (lastPracticeDay === hoy || lastPracticeDay === ayer) {
        rachaActual = 1;
        for (let i = 1; i < diasArraySortedDesc.length; i++) {
          const currentDate = parseLocalDate(diasArraySortedDesc[i]);
          const previousDate = parseLocalDate(diasArraySortedDesc[i - 1]);
          const diffDays = Math.round((previousDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));

          if (diffDays === 1) {
            rachaActual++;
          } else if (diffDays > 1) {
            break;
          }
        }
      }
    }

    let rachaMaxima = 1;
    if (diasArraySortedAsc.length > 0) {
      let currentMaxStreak = 1;

      for (let i = 1; i < diasArraySortedAsc.length; i++) {
        const currentDate = parseLocalDate(diasArraySortedAsc[i]);
        const previousDate = parseLocalDate(diasArraySortedAsc[i - 1]);
        const diffDays = Math.round((currentDate.getTime() - previousDate.getTime()) / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
          currentMaxStreak++;
        } else if (diffDays > 1) {
          currentMaxStreak = 1;
        }
        rachaMaxima = Math.max(rachaMaxima, currentMaxStreak);
      }
    }

    return { actual: rachaActual, maxima: rachaMaxima };
  };

  const calcularSemanasDistintas = (registrosFiltrados) => {
    const semanasSet = new Set();
    registrosFiltrados.forEach(r => {
      if (r.inicioISO) {
        const fecha = new Date(r.inicioISO);
        const fechaLocal = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
        const lunes = startOfMonday(fechaLocal);
        const semanaISO = formatLocalDate(lunes);
        semanasSet.add(semanaISO);
      }
    });
    return semanasSet.size;
  };

  // Calcular número total de semanas en el período (prorateado)
  const calcularSemanasPeriodo = useMemo(() => {
    if (!periodoInicio || !periodoFin) return 0;
    const inicio = parseLocalDate(periodoInicio);
    const fin = parseLocalDate(periodoFin);
    
    // Calcular diferencia en días entre inicio y fin (inclusive)
    const diffMs = fin.getTime() - inicio.getTime();
    const diffDias = Math.ceil(diffMs / (1000 * 60 * 60 * 24)) + 1; // +1 para incluir el día final
    
    // Convertir días a semanas (prorateado)
    // Si hay 7 días o menos = 1 semana, 8-14 días = 2 semanas, etc.
    const semanasTotales = diffDias > 0 ? Math.ceil(diffDias / 7) : 0;
    
    return semanasTotales;
  }, [periodoInicio, periodoFin]);

  const calcularCalidadPromedio = (registrosFiltrados) => {
    const conCalificacion = registrosFiltrados.filter(r => {
      const cal = safeNumber(r.calificacion);
      return cal > 0 && cal <= 4; // Solo calificaciones válidas (1-4)
    });
    if (conCalificacion.length === 0) return '0.0';
    const suma = conCalificacion.reduce((acc, r) => acc + safeNumber(r.calificacion), 0);
    const promedio = suma / conCalificacion.length;
    // Mantener 1 decimal sin redondear primero (usar toFixed directamente sobre el promedio)
    return promedio.toFixed(1);
  };

  const registrosFiltrados = useMemo(() => {
    // Filtrar y normalizar registros antes de procesar
    let filtered = registros
      .filter(r => {
        // Filtrar registros con duración inválida
        const duracion = safeNumber(r.duracionRealSeg);
        return duracion > 0 && duracion <= 43200; // Entre 0 y 12 horas
      })
      .map(r => ({
        ...r,
        duracionRealSeg: safeNumber(r.duracionRealSeg),
        duracionObjetivoSeg: safeNumber(r.duracionObjetivoSeg),
        bloquesCompletados: safeNumber(r.bloquesCompletados),
        bloquesOmitidos: safeNumber(r.bloquesOmitidos),
        calificacion: r.calificacion != null ? safeNumber(r.calificacion) : null,
      }));

    if (isEstu) {
      filtered = filtered.filter(r => r.alumnoId === userIdActual);
    } else {
      let targetAlumnoIds = new Set();

      if (alumnosSeleccionados.length > 0) {
        alumnosSeleccionados.forEach(id => targetAlumnoIds.add(id));
      } else if (profesoresSeleccionados.length > 0) {
        // Filtrar estudiantes que tienen asignaciones con los profesores seleccionados
        const estudiantesConAsignaciones = asignaciones
          .filter(a => profesoresSeleccionados.includes(a.profesorId))
          .map(a => a.alumnoId);
        
        estudiantesConAsignaciones.forEach(id => targetAlumnoIds.add(id));
        
        // También incluir estudiantes que tienen profesorAsignadoId (compatibilidad con usuarios que tienen esta propiedad)
        usuarios
          .filter(u => u.rolPersonalizado === 'ESTU' && u.profesorAsignadoId && profesoresSeleccionados.includes(u.profesorAsignadoId))
          .map(u => u.id)
          .forEach(id => targetAlumnoIds.add(id));
      } else if (isProf && estudiantesDelProfesor.length > 0) {
        // Profesor sin filtros explícitos: por defecto, solo sus estudiantes
        estudiantesDelProfesor.forEach(id => targetAlumnoIds.add(id));
      } else {
        // Admin u otros roles sin filtros: por defecto, todos los estudiantes visibles
        estudiantes.forEach(e => targetAlumnoIds.add(e.id));
      }

      if (targetAlumnoIds.size > 0) {
        filtered = filtered.filter(r => targetAlumnoIds.has(r.alumnoId));
      }
    }

    if (periodoInicio) {
      const inicioDate = parseLocalDate(periodoInicio);
      filtered = filtered.filter(r => {
        if (!r.inicioISO) return false;
        const registroDate = new Date(r.inicioISO);
        const registroLocal = new Date(registroDate.getFullYear(), registroDate.getMonth(), registroDate.getDate());
        return registroLocal >= inicioDate;
      });
    }
    if (periodoFin) {
      const finDate = parseLocalDate(periodoFin);
      finDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter(r => {
        if (!r.inicioISO) return false;
        const registroDate = new Date(r.inicioISO);
        return registroDate <= finDate;
      });
    }

    if (focosSeleccionados.length > 0) {
      filtered = filtered.filter(r => r.foco && focosSeleccionados.includes(r.foco));
    }

    return filtered;
  }, [registros, effectiveUser, periodoInicio, periodoFin, isEstu, profesoresSeleccionados, alumnosSeleccionados, focosSeleccionados, usuarios, isProf, estudiantesDelProfesor, asignaciones]);

  // Evitar duplicados de sesiones (por id) antes de agregar estadísticas
  const registrosFiltradosUnicos = useMemo(() => {
    const map = new Map();
    registrosFiltrados.forEach((r) => {
      if (!r || !r.id) return;
      if (!map.has(r.id)) {
        map.set(r.id, r);
      }
    });
    return Array.from(map.values());
  }, [registrosFiltrados]);

  const bloquesFiltrados = useMemo(() => {
    const registrosIds = new Set(registrosFiltradosUnicos.map(r => r.id));
    return bloques
      .filter(b => registrosIds.has(b.registroSesionId))
      .map(b => ({
        ...b,
        duracionRealSeg: safeNumber(b.duracionRealSeg),
        duracionObjetivoSeg: safeNumber(b.duracionObjetivoSeg),
      }));
  }, [bloques, registrosFiltradosUnicos]);

  const kpis = useMemo(() => {
    // Validar y corregir duraciones antes de calcular
    const tiempoTotal = registrosFiltradosUnicos.reduce((sum, r) => {
      const duracion = validarDuracion(r.duracionRealSeg);
      return sum + duracion;
    }, 0);
    const racha = calcularRacha(registrosFiltradosUnicos, isEstu ? userIdActual : null);
    const calidadPromedio = calcularCalidadPromedio(registrosFiltradosUnicos);
    const semanasDistintas = calcularSemanasDistintas(registrosFiltradosUnicos);
    
    // Calcular promedio de tiempo por sesión
    const numSesiones = registrosFiltradosUnicos.length;
    const tiempoPromedioPorSesion = numSesiones > 0 ? tiempoTotal / numSesiones : 0;

    // Calcular media semanal de sesiones (prorateado al período en días)
    // Ejemplo: 1 día con 1 sesión = 7 sesiones/semana
    // Ejemplo: 2 días (domingo-lunes) con 1 sesión = 3.5 sesiones/semana
    let mediaSemanalSesiones = 0;
    if (periodoInicio && periodoFin) {
      const inicio = parseLocalDate(periodoInicio);
      const fin = parseLocalDate(periodoFin);
      const diffMs = fin.getTime() - inicio.getTime();
      const numDias = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)) + 1); // +1 para incluir el día final
      // Prorratear a la semana: (sesiones / días) * 7
      mediaSemanalSesiones = numDias > 0 ? (numSesiones / numDias) * 7 : 0;
    }

    return {
      tiempoTotal,
      racha,
      calidadPromedio,
      semanasDistintas,
      tiempoPromedioPorSesion,
      semanasPeriodo: calcularSemanasPeriodo,
      mediaSemanalSesiones,
    };
  }, [registrosFiltradosUnicos, isEstu, effectiveUser, calcularSemanasPeriodo, periodoInicio, periodoFin]);

  const tiposBloques = useMemo(() => {
    const agrupado = {};
    bloquesFiltrados.forEach(b => {
      if (!agrupado[b.tipo]) {
        agrupado[b.tipo] = { tipo: b.tipo, tiempoReal: 0, count: 0 };
      }
      const duracion = validarDuracion(b.duracionRealSeg);
      agrupado[b.tipo].tiempoReal += duracion;
      agrupado[b.tipo].count += 1;
    });
    return Object.values(agrupado).map(t => ({
      ...t,
      tiempoReal: safeNumber(t.tiempoReal),
      tiempoMedio: t.count > 0 ? safeNumber(t.tiempoReal / t.count) : 0,
    }));
  }, [bloquesFiltrados]);

  const datosLinea = useMemo(() => {
    const agrupado = {};
    
    registrosFiltradosUnicos.forEach(r => {
      if (!r.inicioISO) return;
      
      const fecha = new Date(r.inicioISO);
      const fechaLocal = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
      let clave;
      
      if (granularidad === 'dia') {
        clave = formatLocalDate(fechaLocal);
      } else if (granularidad === 'semana') {
        const lunes = startOfMonday(fechaLocal);
        clave = formatLocalDate(lunes);
      } else {
        clave = `${fechaLocal.getFullYear()}-${pad2(fechaLocal.getMonth() + 1)}`;
      }
      
      if (!agrupado[clave]) {
        agrupado[clave] = { 
          fecha: clave, 
          tiempo: 0, 
          valoraciones: [], 
          count: 0,
          completados: 0,
          omitidos: 0,
        };
      }
      
      const duracion = validarDuracion(r.duracionRealSeg);
      agrupado[clave].tiempo += duracion / 60;
      agrupado[clave].completados += r.bloquesCompletados || 0;
      agrupado[clave].omitidos += r.bloquesOmitidos || 0;
      
      if (r.calificacion !== undefined && r.calificacion !== null) {
        agrupado[clave].valoraciones.push(r.calificacion);
      }
      agrupado[clave].count++;
    });
    
    return Object.values(agrupado)
      .map(item => {
        let satisfaccion = null;
        if (item.valoraciones.length > 0) {
          satisfaccion = item.valoraciones.reduce((sum, v) => sum + v, 0) / item.valoraciones.length;
        }

        return {
          fecha: item.fecha,
          tiempo: safeNumber(item.tiempo),
          satisfaccion: satisfaccion ? Number(satisfaccion.toFixed(1)) : null,
          completados: safeNumber(item.completados),
          omitidos: safeNumber(item.omitidos),
        };
      })
      .sort((a, b) => a.fecha.localeCompare(b.fecha));
  }, [registrosFiltradosUnicos, granularidad]);

  const topEjercicios = useMemo(() => {
    const ejerciciosMap = {};
    
    bloquesFiltrados.forEach(b => {
      const key = `${b.code}_${b.nombre}_${b.tipo}`;
      if (!ejerciciosMap[key]) {
        ejerciciosMap[key] = {
          code: b.code,
          nombre: b.nombre,
          tipo: b.tipo,
          tiempoTotal: 0,
          sesiones: new Set(),
          ultimaPractica: null,
        };
      }
      
      const duracion = validarDuracion(b.duracionRealSeg);
      ejerciciosMap[key].tiempoTotal += duracion;
      if (b.registroSesionId) {
        ejerciciosMap[key].sesiones.add(b.registroSesionId);
      }
      if (b.inicioISO) {
        const fechaActual = new Date(b.inicioISO);
        if (!ejerciciosMap[key].ultimaPractica || fechaActual > new Date(ejerciciosMap[key].ultimaPractica)) {
          ejerciciosMap[key].ultimaPractica = b.inicioISO;
        }
      }
    });

    return Object.values(ejerciciosMap)
      .map(e => ({
        ...e,
        tiempoTotal: safeNumber(e.tiempoTotal),
        sesionesCount: e.sesiones.size,
      }))
      .sort((a, b) => b.tiempoTotal - a.tiempoTotal);
  }, [bloquesFiltrados]);

  const topEjerciciosFiltrados = topEjercicios.filter(e => {
    if (searchEjercicio) {
      const term = searchEjercicio.toLowerCase();
      return e.nombre.toLowerCase().includes(term) || e.code.toLowerCase().includes(term);
    }
    return true;
  });

  const feedbackAlumno = useMemo(() => {
    const distribucion = { 1: 0, 2: 0, 3: 0, 4: 0 };
    const comentarios = [];
    
    registrosFiltradosUnicos.forEach(r => {
      const cal = safeNumber(r.calificacion);
      if (cal > 0 && cal <= 4) {
        const calInt = Math.round(cal);
        if (calInt >= 1 && calInt <= 4) {
          distribucion[calInt]++;
        }
      }
      if (r.notas || (cal > 0 && cal <= 4)) {
        comentarios.push(r);
      }
    });
    
    return { distribucion, comentarios };
  }, [registrosFiltradosUnicos]);

  const [feedbackPageSize, setFeedbackPageSize] = useState(10);
  const [feedbackCurrentPage, setFeedbackCurrentPage] = useState(1);
  const [evolucionPageSize, setEvolucionPageSize] = useState(10);
  const [evolucionCurrentPage, setEvolucionCurrentPage] = useState(1);
  const [topEjerciciosPageSize, setTopEjerciciosPageSize] = useState(10);
  const [topEjerciciosCurrentPage, setTopEjerciciosCurrentPage] = useState(1);
  const [historialPageSize, setHistorialPageSize] = useState(10);
  const [historialCurrentPage, setHistorialCurrentPage] = useState(1);
  const [historialCalificacionFilter, setHistorialCalificacionFilter] = useState('all');
  const [historialSoloConNotas, setHistorialSoloConNotas] = useState(false);

  // Feedbacks del profesor para estudiantes
  const feedbackProfesor = useMemo(() => {
    console.log('[DEBUG feedbackProfesor] isEstu:', isEstu, 'userIdActual:', userIdActual, 'feedbacksSemanal:', feedbacksSemanal.length);
    if (!isEstu) return [];
    
    const filtrados = feedbacksSemanal.filter(f => {
      console.log('[DEBUG] Comparando feedback:', {
        feedbackId: f.id,
        alumnoId: f.alumnoId,
        userIdActual: userIdActual,
        match: f.alumnoId === userIdActual,
        semanaInicioISO: f.semanaInicioISO,
        periodoInicio: periodoInicio,
        periodoFin: periodoFin
      });
      
      if (f.alumnoId !== userIdActual) {
        console.log('[DEBUG] Filtrado por alumnoId diferente:', f.alumnoId, 'vs', userIdActual);
        return false;
      }
      if (!f.semanaInicioISO) {
        console.log('[DEBUG] Filtrado por falta de semanaInicioISO');
        return false;
      }
      
      const feedbackDate = parseLocalDate(f.semanaInicioISO);
      
      if (periodoInicio) {
        const inicioDate = parseLocalDate(periodoInicio);
        if (feedbackDate < inicioDate) {
          console.log('[DEBUG] Filtrado por fecha anterior al periodo inicio:', feedbackDate, '<', inicioDate);
          return false;
        }
      }
      
      if (periodoFin) {
        const finDate = parseLocalDate(periodoFin);
        if (feedbackDate > finDate) {
          console.log('[DEBUG] Filtrado por fecha posterior al periodo fin:', feedbackDate, '>', finDate);
          return false;
        }
      }
      
      return true;
    });
    
    console.log('[DEBUG feedbackProfesor] Resultado filtrado:', filtrados.length, filtrados);
    return filtrados.sort((a, b) => b.semanaInicioISO.localeCompare(a.semanaInicioISO));
  }, [feedbacksSemanal, userIdActual, periodoInicio, periodoFin, isEstu]);

  // Feedbacks para profesores y admins: ADMIN y PROF ven TODOS los feedbacks
  const feedbacksParaProfAdmin = useMemo(() => {
    if (isEstu) return [];
    
    // Logs exhaustivos para diagnóstico
    if (process.env.NODE_ENV === 'development') {
    console.log('[estadisticas.jsx] [feedbacksParaProfAdmin] Inicio del filtrado:', {
      totalFeedbacksSemanal: feedbacksSemanal.length,
      feedbacksConNotaProfesor: feedbacksSemanal.filter(f => f.notaProfesor).length,
      alumnosSeleccionados: alumnosSeleccionados,
      alumnosSeleccionadosLength: alumnosSeleccionados.length,
      periodoInicio,
      periodoFin,
      isAdmin,
      isProf,
    });
    }
    
    // Para ADMIN: mostrar TODOS los feedbacks si no hay filtros explícitos
    // Para PROF: mostrar TODOS los feedbacks si no hay filtros explícitos
    let resultado = [...feedbacksSemanal];
    
    // Solo filtrar por estudiantes si hay selección EXPLÍCITA
    if (alumnosSeleccionados.length > 0) {
      const antes = resultado.length;
      resultado = resultado.filter(f => alumnosSeleccionados.includes(f.alumnoId));
      if (process.env.NODE_ENV === 'development') {
      console.log('[estadisticas.jsx] [feedbacksParaProfAdmin] Filtro por estudiantes (explícito):', {
        antes,
        despues: resultado.length,
        alumnosSeleccionados: alumnosSeleccionados.length,
      });
      }
    }
    
    // Solo filtrar por profesores si hay selección EXPLÍCITA
    if (profesoresSeleccionados.length > 0) {
      const antes = resultado.length;
      resultado = resultado.filter(f => profesoresSeleccionados.includes(f.profesorId));
      if (process.env.NODE_ENV === 'development') {
      console.log('[estadisticas.jsx] [feedbacksParaProfAdmin] Filtro por profesores (explícito):', {
        antes,
        despues: resultado.length,
        profesoresSeleccionados: profesoresSeleccionados.length,
      });
      }
    }
    
    // Solo filtrar por período si hay filtro EXPLÍCITO de período
    // IMPORTANTE: Para ADMIN y PROF, incluir feedbacks sin semanaInicioISO también
    // Si el filtro de período excluye todos los feedbacks, no aplicar el filtro
    if (periodoInicio || periodoFin) {
      const antes = resultado.length;
      const resultadoConFiltroPeriodo = resultado.filter(f => {
        // Si no tiene semanaInicioISO, INCLUIR siempre (no excluir feedbacks sin fecha)
        // Esto permite ver todos los feedbacks aunque no tengan fecha configurada
        if (!f.semanaInicioISO) {
          return true;
        }
        
        const feedbackDate = parseLocalDate(f.semanaInicioISO);
        const feedbackDateOnly = new Date(feedbackDate.getFullYear(), feedbackDate.getMonth(), feedbackDate.getDate());
        
        if (periodoInicio) {
          const inicioDate = parseLocalDate(periodoInicio);
          const inicioDateOnly = new Date(inicioDate.getFullYear(), inicioDate.getMonth(), inicioDate.getDate());
          if (feedbackDateOnly < inicioDateOnly) {
            return false;
          }
        }
        
        if (periodoFin) {
          const finDate = parseLocalDate(periodoFin);
          const finDateOnly = new Date(finDate.getFullYear(), finDate.getMonth(), finDate.getDate());
          if (feedbackDateOnly > finDateOnly) {
            return false;
          }
        }
        
        return true;
      });
      
      // Aplicar el filtro de período (sin ignorar si no hay resultados)
      resultado = resultadoConFiltroPeriodo;
      if (process.env.NODE_ENV === 'development') {
      console.log('[estadisticas.jsx] [feedbacksParaProfAdmin] Filtro por período aplicado:', {
        antes,
        despues: resultado.length,
        periodoInicio,
        periodoFin,
        feedbacksSinFecha: resultado.filter(f => !f.semanaInicioISO).length,
      });
      }
    }
    
    // Ordenar: primero por alumno, luego por fecha descendente
    resultado.sort((a, b) => {
      if (a.alumnoId !== b.alumnoId) {
        return (a.alumnoId || '').localeCompare(b.alumnoId || '');
      }
      const fechaA = a.semanaInicioISO || '';
      const fechaB = b.semanaInicioISO || '';
      return fechaB.localeCompare(fechaA);
    });
    
    if (process.env.NODE_ENV === 'development') {
    console.log('[estadisticas.jsx] [feedbacksParaProfAdmin] Resultado final:', {
      total: resultado.length,
      conNotaProfesor: resultado.filter(f => f.notaProfesor).length,
      sinNotaProfesor: resultado.filter(f => !f.notaProfesor).length,
      conSemanaInicioISO: resultado.filter(f => f.semanaInicioISO).length,
      sinSemanaInicioISO: resultado.filter(f => !f.semanaInicioISO).length,
      primeros3: resultado.slice(0, 3).map(f => ({
        id: f.id?.substring(0, 20),
        tieneNotaProfesor: !!f.notaProfesor,
        notaProfesorPreview: f.notaProfesor?.substring(0, 50) || null,
        alumnoId: f.alumnoId?.substring(0, 20),
        profesorId: f.profesorId?.substring(0, 20),
        semanaInicioISO: f.semanaInicioISO,
      })),
    });
    }
    
    return resultado;
  }, [feedbacksSemanal, alumnosSeleccionados, profesoresSeleccionados, periodoInicio, periodoFin, isEstu, isAdmin, isProf]);

  // Mutación para actualizar feedback
  const actualizarFeedbackMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      return localDataClient.entities.FeedbackSemanal.update(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feedbacksSemanal'] });
      toast.success('✅ Feedback actualizado');
      setFeedbackDrawer(null);
    },
    onError: (error) => {
      console.error('[estadisticas.jsx] Error al actualizar feedback:', {
        error: error?.message || error,
        code: error?.code,
        id,
      });
      toast.error('❌ Error al actualizar feedback. Inténtalo de nuevo.');
    },
  });

  // Función para abrir el drawer de edición
  const abrirEditarFeedback = (feedback) => {
    setFeedbackDrawer({
      id: feedback.id,
      alumnoId: feedback.alumnoId,
      profesorId: feedback.profesorId,
      semanaInicioISO: feedback.semanaInicioISO,
      notaProfesor: feedback.notaProfesor || '',
      mediaLinks: feedback.mediaLinks || [],
    });
  };

  // Función para guardar feedback
  const guardarFeedback = () => {
    if (!feedbackDrawer) return;
    
    if (!feedbackDrawer.notaProfesor?.trim()) {
      toast.error('❌ Las observaciones del profesor son obligatorias');
      return;
    }

    const data = {
      alumnoId: feedbackDrawer.alumnoId,
      profesorId: feedbackDrawer.profesorId,
      semanaInicioISO: feedbackDrawer.semanaInicioISO,
      notaProfesor: feedbackDrawer.notaProfesor.trim(),
      mediaLinks: feedbackDrawer.mediaLinks || [],
    };

    actualizarFeedbackMutation.mutate({ id: feedbackDrawer.id, data });
  };

  // Función para manejar clicks en medialinks
  // MediaLinksBadges pasa un índice, pero MediaViewer espera un objeto {url, kind}
  const handleMediaClick = (mediaLinks, index) => {
    if (!mediaLinks || !Array.isArray(mediaLinks) || index < 0 || index >= mediaLinks.length) {
      return;
    }
    
    const url = typeof mediaLinks[index] === 'string' 
      ? mediaLinks[index] 
      : (mediaLinks[index]?.url || '');
    
    if (!url) return;
    
    const media = resolveMedia(url);
    setViewingMedia({
      url: media.originalUrl || url,
      kind: media.kind,
      embedUrl: media.embedUrl,
      title: media.title,
    });
  };

  // Atajos de teclado para el drawer de feedback
  useEffect(() => {
    if (!feedbackDrawer) return;
    
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        if (feedbackDrawer && feedbackDrawer.notaProfesor?.trim()) {
          const data = {
            alumnoId: feedbackDrawer.alumnoId,
            profesorId: feedbackDrawer.profesorId,
            semanaInicioISO: feedbackDrawer.semanaInicioISO,
            notaProfesor: feedbackDrawer.notaProfesor.trim(),
            mediaLinks: feedbackDrawer.mediaLinks || [],
          };
          actualizarFeedbackMutation.mutate({ id: feedbackDrawer.id, data });
        } else {
          toast.error('❌ Las observaciones del profesor son obligatorias');
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key === '.') {
        e.preventDefault();
        setFeedbackDrawer(null);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [feedbackDrawer, actualizarFeedbackMutation]);

  // Atajo de teclado nav-1 (ArrowLeft) para volver
  useEffect(() => {
    const handleKeyDown = (e) => {
      // No procesar si hay un modal o drawer abierto
      if (modalSesionOpen || feedbackDrawer || viewingMedia) return;
      
      // No procesar si está en un input o textarea
      if (e.target.matches('input, textarea, select')) return;
      
      // ArrowLeft para volver
      if (e.key === 'ArrowLeft' && !e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        navigate(-1);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate, modalSesionOpen, feedbackDrawer, viewingMedia]);

  const tipoLabels = {
    CA: 'Calentamiento A',
    CB: 'Calentamiento B',
    TC: 'Técnica Central',
    TM: 'Técnica Mantenimiento',
    FM: 'Fragmento Musical',
    VC: 'Vuelta a la Calma',
    AD: 'Advertencia/Descanso',
  };

  const tipoColors = {
    CA: componentStyles.status.badgeDefault,
    CB: componentStyles.status.badgeDefault,
    TC: componentStyles.status.badgeDefault,
    TM: componentStyles.status.badgeDefault,
    FM: componentStyles.status.badgeDefault,
    VC: componentStyles.status.badgeDefault,
    AD: componentStyles.status.badgeDefault,
  };

  // Colores para el piechart de tipos de bloques
  const tipoChartColors = {
    CA: '#3b82f6', // blue-500
    CB: '#60a5fa', // blue-400
    TC: '#8b5cf6', // purple-500
    TM: '#10b981', // green-500
    FM: '#ec4899', // pink-500
    VC: '#06b6d4', // cyan-500
    AD: '#94a3b8', // slate-400
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

  const comentariosFiltrados = feedbackAlumno.comentarios.filter(r => {
    if (calificacionFilter !== 'all' && r.calificacion != calificacionFilter) return false;
    if (soloConNotas && !r.notas) return false;
    return true;
  });

  const presets = [
    { key: 'esta-semana', label: 'Semana' },
    { key: '4-semanas', label: '4 sem' },
    { key: 'este-mes', label: 'Mes' },
    { key: '3-meses', label: '3 meses' },
    { key: 'este-ano', label: 'Año' },
    { key: 'ultimo-ano', label: '1 año' },
    { key: 'todo', label: 'Todo' },
  ];

  return (
    <div className={componentStyles.layout.appBackground}>
      <PageHeader
        icon={Activity}
        title={isEstu ? 'Mis Estadísticas' : isProf ? 'Estadísticas de Estudiantes' : 'Estadísticas Generales'}
        subtitle={isEstu ? 'Tu progreso en la práctica' : 'Análisis del rendimiento y progreso'}
        filters={
          <div className="w-full space-y-2 sm:space-y-3 md:space-y-4">
            {/* Filtros de fecha y presets */}
            <div className={componentStyles.components.panelBase + " p-2 sm:p-3 md:p-4"}>
              <div className="space-y-2 sm:space-y-3">
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 items-start sm:items-center justify-between">
                  <div className="flex-1 w-full sm:w-auto">
                    <DateRangePicker
                      startDate={periodoInicio}
                      endDate={periodoFin}
                      onDateChange={(start, end) => {
                        setPeriodoInicio(start);
                        setPeriodoFin(end);
                      }}
                      className="w-full sm:w-auto"
                    />
                  </div>
                  <div className="flex gap-1 flex-wrap">
                    {presets.map(p => (
                      <Button
                        key={p.key}
                        variant={rangoPreset === p.key ? "primary" : "outline"}
                        size="sm"
                        onClick={() => aplicarPreset(p.key)}
                        className="text-xs h-8 sm:h-9 rounded-xl focus-brand"
                        aria-label={`Preset ${p.label}`}
                      >
                        {p.label}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Filtros adicionales (solo si no es estudiante) */}
            {!isEstu && (
              <div className={componentStyles.components.panelBase + " p-2 sm:p-3 md:p-4"}>
                <div className={`${componentStyles.layout.grid2} gap-2 sm:gap-3`}>
                  <MultiSelect
                    label="Profesores"
                    items={profesores.map(p => ({ value: p.id, label: displayName(p) }))}
                    value={profesoresSeleccionados}
                    onChange={setProfesoresSeleccionados}
                  />
                  <MultiSelect
                    label="Alumnos"
                    items={estudiantes.map(a => ({ value: a.id, label: displayName(a) }))}
                    value={alumnosSeleccionados}
                    onChange={setAlumnosSeleccionados}
                  />
                </div>
              </div>
            )}

            {/* Filtro de Foco y botón Actualizar datos */}
            <div className={componentStyles.components.panelBase + " p-2 sm:p-3 md:p-4"}>
              <div className={`${componentStyles.layout.grid2} gap-2 sm:gap-3 items-end`}>
                <MultiSelect
                  label="Foco"
                  items={Object.entries(focoLabels).map(([key, label]) => ({ value: key, label }))}
                  value={focosSeleccionados}
                  onChange={setFocosSeleccionados}
                />
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={async () => {
                    try {
                      // Invalidar todas las queries relacionadas con estadísticas
                      // Usar exact: false para invalidar todas las variantes con parámetros
                      await Promise.all([
                        queryClient.invalidateQueries({ queryKey: ['users'] }),
                        queryClient.invalidateQueries({ queryKey: ['asignacionesProf'], exact: false }),
                        queryClient.invalidateQueries({ queryKey: ['registrosSesion'] }),
                        queryClient.invalidateQueries({ queryKey: ['registrosBloques'] }),
                        queryClient.invalidateQueries({ queryKey: ['asignaciones'] }),
                        queryClient.invalidateQueries({ queryKey: ['feedbacksSemanal'] }),
                      ]);
                      toast.success('✅ Datos actualizados');
                    } catch (error) {
                      console.error('[estadisticas.jsx] Error al actualizar datos:', {
                        error: error?.message || error,
                        code: error?.code,
                      });
                      toast.error('❌ Error al actualizar datos');
                    }
                  }}
                  className={`${componentStyles.buttons.outline} h-8 sm:h-9 w-full sm:w-auto text-xs sm:text-sm`}
                >
                  <RefreshCw className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
                  Actualizar datos
                </Button>
              </div>
            </div>
          </div>
        }
      />

      <div className={componentStyles.layout.page}>
        {/* Tabs principales */}
        <div className="flex justify-center mb-6">
          <Tabs
            variant="segmented"
            value={tabActiva}
            onChange={setTabActiva}
            items={[
              { value: 'resumen', label: 'Resumen', icon: BarChart3 },
              { value: 'evolucion', label: 'Evolución', icon: TrendingUp },
              { value: 'tipos', label: 'Tipos', icon: PieChart },
              { value: 'top', label: 'Top', icon: Star },
              { value: 'historial', label: 'Historial', icon: List },
              { value: 'feedback', label: 'Feedback', icon: MessageSquare },
            ]}
          />
        </div>

        {tabActiva === 'resumen' && (
          <div className="space-y-6">
            {/* KPIs - Grid responsive */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 sm:gap-4 md:gap-6 px-2 py-4 sm:py-6 border-b border-[var(--color-border-default)]">
              {/* Tiempo total */}
              <div className="text-center">
                <Clock className="w-4 h-4 sm:w-5 sm:h-5 mx-auto mb-1 text-[var(--color-text-secondary)]" />
                <p className="text-lg sm:text-xl md:text-2xl font-bold text-[var(--color-text-primary)] mb-0.5">
                  {formatDuracionHM(kpis.tiempoTotal)}
                </p>
                <p className="text-xs sm:text-sm text-[var(--color-text-secondary)]">Tiempo total</p>
              </div>

              {/* Promedio/sesión */}
              <div className="text-center">
                <Timer className="w-4 h-4 sm:w-5 sm:h-5 mx-auto mb-1 text-[var(--color-text-secondary)]" />
                <p className="text-lg sm:text-xl md:text-2xl font-bold text-[var(--color-text-primary)] mb-0.5">
                  {formatDuracionHM(kpis.tiempoPromedioPorSesion)}
                </p>
                <p className="text-xs sm:text-sm text-[var(--color-text-secondary)]">Promedio/sesión</p>
              </div>

              {/* Valoración */}
              <div className="text-center">
                <Smile className="w-4 h-4 sm:w-5 sm:h-5 mx-auto mb-1 text-[var(--color-text-secondary)]" />
                <p className="text-lg sm:text-xl md:text-2xl font-bold text-[var(--color-text-primary)] mb-0.5">
                  {kpis.calidadPromedio}/4
                </p>
                <p className="text-xs sm:text-sm text-[var(--color-text-secondary)]">Valoración</p>
              </div>

              {/* Racha */}
              <div className="text-center">
                <Star className="w-4 h-4 sm:w-5 sm:h-5 mx-auto mb-1 text-[var(--color-text-secondary)]" />
                <p className="text-lg sm:text-xl md:text-2xl font-bold text-[var(--color-text-primary)] mb-0.5">{kpis.racha.actual}</p>
                <p className="text-xs sm:text-sm text-[var(--color-text-secondary)]">Racha</p>
                <p className="text-[10px] sm:text-xs text-[var(--color-text-muted)] mt-0.5">Máx: {kpis.racha.maxima}</p>
              </div>

              {/* Semanas practicadas */}
              <div className="text-center">
                <Calendar className="w-4 h-4 sm:w-5 sm:h-5 mx-auto mb-1 text-[var(--color-text-secondary)]" />
                <p className="text-lg sm:text-xl md:text-2xl font-bold text-[var(--color-text-primary)] mb-0.5">{kpis.semanasDistintas}</p>
                <p className="text-xs sm:text-sm text-[var(--color-text-secondary)]">Semanas practicadas</p>
              </div>

              {/* Semanas totales período */}
              <div className="text-center">
                <CalendarDays className="w-4 h-4 sm:w-5 sm:h-5 mx-auto mb-1 text-[var(--color-text-secondary)]" />
                <p className="text-lg sm:text-xl md:text-2xl font-bold text-[var(--color-text-primary)] mb-0.5">{kpis.semanasPeriodo}</p>
                <p className="text-xs sm:text-sm text-[var(--color-text-secondary)]">Semanas totales</p>
              </div>

              {/* Media semanal sesiones */}
              <div className="text-center">
                <Activity className="w-4 h-4 sm:w-5 sm:h-5 mx-auto mb-1 text-[var(--color-text-secondary)]" />
                <p className="text-lg sm:text-xl md:text-2xl font-bold text-[var(--color-text-primary)] mb-0.5">
                  {kpis.mediaSemanalSesiones.toFixed(1)}
                </p>
                <p className="text-xs sm:text-sm text-[var(--color-text-secondary)]">Sesiones/semana</p>
              </div>
            </div>

            {/* Tabs de granularidad y gráfico */}
            <div className="space-y-4">
              <div className="flex justify-center">
                <Tabs
                  variant="segmented"
                  value={granularidad}
                  onChange={setGranularidad}
                  showIconsOnlyMobile={true}
                  items={[
                    { value: 'dia', label: 'Diario', icon: Sun },
                    { value: 'semana', label: 'Semanal', icon: CalendarRange },
                    { value: 'mes', label: 'Mensual', icon: Grid3x3 },
                  ]}
                />
              </div>

              <Card className={`${componentStyles.components.cardBase} ${isMobile ? '!p-0' : ''}`}>
                <CardHeader className={`${isMobile ? 'px-1 pt-1 pb-0.5' : 'p-1.5'} sm:p-2 md:p-3`}>
                  <CardTitle className="text-sm sm:text-base md:text-lg flex items-center gap-2">
                    <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-[var(--color-primary)]" />
                    Tiempo de Estudio
                  </CardTitle>
                </CardHeader>
              <CardContent className={`${isMobile ? 'px-1 pb-1' : 'p-1.5'} sm:p-2 md:p-3`}>
                {datosLinea.length === 0 ? (
                  <div className="text-center py-8 sm:py-12">
                    <TrendingUp className={componentStyles.components.emptyStateIcon} />
                    <p className={componentStyles.components.emptyStateText}>No hay datos en el periodo seleccionado</p>
                  </div>
                ) : (
                  <div className="w-full overflow-x-auto -mx-2 px-2">
                    <ResponsiveContainer width="100%" height={isMobile ? 180 : 250} minHeight={180}>
                      <LineChart data={datosLinea} margin={{ top: 5, right: isMobile ? 5 : 20, left: isMobile ? -10 : 0, bottom: isMobile ? 40 : 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                        <XAxis 
                          dataKey="fecha" 
                          tick={{ fontSize: isMobile ? 9 : 11 }}
                          angle={isMobile ? -45 : 0}
                          textAnchor={isMobile ? 'end' : 'middle'}
                          height={isMobile ? 60 : 30}
                          interval={isMobile ? 'preserveStartEnd' : 0}
                          tickFormatter={(fecha) => {
                            if (granularidad === 'dia') {
                              const d = parseLocalDate(fecha);
                              return isMobile 
                                ? `${d.getDate()}/${d.getMonth() + 1}`
                                : d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
                            } else if (granularidad === 'semana') {
                              const d = parseLocalDate(fecha);
                              return `${d.getDate()}/${d.getMonth() + 1}`;
                            } else {
                              const [y, m] = fecha.split('-');
                              const d = new Date(Number(y), Number(m) - 1, 1);
                              return isMobile
                                ? `${m}/${y.slice(-2)}`
                                : d.toLocaleDateString('es-ES', { month: 'short', year: '2-digit' });
                            }
                          }}
                        />
                        <YAxis 
                          tick={{ fontSize: isMobile ? 9 : 11 }} 
                          width={isMobile ? 40 : 60}
                          tickFormatter={(v) => {
                            const minutos = safeNumber(v);
                            if (minutos >= 60) {
                              const horas = Math.floor(minutos / 60);
                              return isMobile ? `${horas}h` : `${horas} h`;
                            }
                            return isMobile ? `${minutos}m` : `${minutos} min`;
                          }}
                          label={isMobile ? undefined : { value: 'Tiempo', angle: -90, position: 'insideLeft', style: { fontSize: 11 } }} 
                        />
                      <RechartsTooltip 
                        content={({ active, payload }) => {
                          if (!active || !payload || payload.length === 0) return null;
                          return (
                            <div className={`bg-card border border-[var(--color-border-default)] ${componentStyles.containers.panelBase} shadow-card p-3`}>
                              <p className="text-xs font-semibold mb-2 text-[var(--color-text-primary)]">
                                {granularidad === 'dia' 
                                  ? parseLocalDate(payload[0]?.payload.fecha).toLocaleDateString('es-ES')
                                  : payload[0]?.payload.fecha}
                              </p>
                              <p className="text-xs text-[var(--color-primary)]">
                                <strong>Tiempo:</strong> {formatDuracionHM(safeNumber(payload[0]?.payload.tiempo) * 60)}
                              </p>
                            </div>
                          );
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="tiempo"
                        stroke={designSystem.colors.primary}
                        strokeWidth={isMobile ? 1.5 : 2}
                        name="Tiempo"
                        dot={{ r: isMobile ? 2 : 3, stroke: designSystem.colors.primary, fill: designSystem.colors.primary }}
                        activeDot={{ r: isMobile ? 3 : 4 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className={`${componentStyles.components.cardBase} ${isMobile ? '!p-0' : ''}`}>
              <CardHeader className={`${isMobile ? 'px-1 pt-1 pb-0.5' : 'p-1.5'} sm:p-2 md:p-3`}>
                <CardTitle className="text-sm sm:text-base md:text-lg flex items-center gap-2">
                  <Smile className="w-4 h-4 sm:w-5 sm:h-5 text-[var(--color-info)]" />
                  Autoevaluación (1-4)
                </CardTitle>
              </CardHeader>
              <CardContent className={`${isMobile ? 'px-1 pb-1' : 'p-1.5'} sm:p-2 md:p-3`}>
                {datosLinea.filter(d => d.satisfaccion !== null).length === 0 ? (
                  <div className="text-center py-8 sm:py-12">
                    <Smile className={componentStyles.components.emptyStateIcon} />
                    <p className={componentStyles.components.emptyStateText}>No hay datos de autoevaluación</p>
                  </div>
                ) : (
                  <div className="w-full overflow-x-auto -mx-2 px-2">
                    <ResponsiveContainer width="100%" height={isMobile ? 180 : 250} minHeight={180}>
                      <LineChart data={datosLinea} margin={{ top: 5, right: isMobile ? 5 : 20, left: isMobile ? -10 : 0, bottom: isMobile ? 40 : 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                        <XAxis 
                          dataKey="fecha" 
                          tick={{ fontSize: isMobile ? 9 : 11 }}
                          angle={isMobile ? -45 : 0}
                          textAnchor={isMobile ? 'end' : 'middle'}
                          height={isMobile ? 60 : 30}
                          interval={isMobile ? 'preserveStartEnd' : 0}
                          tickFormatter={(fecha) => {
                            if (granularidad === 'dia') {
                              const d = parseLocalDate(fecha);
                              return isMobile 
                                ? `${d.getDate()}/${d.getMonth() + 1}`
                                : d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
                            } else if (granularidad === 'semana') {
                              const d = parseLocalDate(fecha);
                              return `${d.getDate()}/${d.getMonth() + 1}`;
                            } else {
                              const [y, m] = fecha.split('-');
                              const d = new Date(Number(y), Number(m) - 1, 1);
                              return isMobile
                                ? `${m}/${y.slice(-2)}`
                                : d.toLocaleDateString('es-ES', { month: 'short', year: '2-digit' });
                            }
                          }}
                        />
                        <YAxis 
                          tick={{ fontSize: isMobile ? 9 : 11 }} 
                          width={isMobile ? 30 : 60}
                          domain={[0, 4]} 
                          label={isMobile ? undefined : { value: 'Nivel', angle: -90, position: 'insideLeft', style: { fontSize: 11 } }} 
                        />
                      <RechartsTooltip 
                        content={({ active, payload }) => {
                          if (!active || !payload || payload.length === 0) return null;
                          return (
                            <div className={`bg-card border border-[var(--color-border-default)] ${componentStyles.containers.panelBase} shadow-card p-3`}>
                              <p className="text-xs font-semibold mb-2 text-[var(--color-text-primary)]">
                                {granularidad === 'dia' 
                                  ? parseLocalDate(payload[0]?.payload.fecha).toLocaleDateString('es-ES')
                                  : payload[0]?.payload.fecha}
                              </p>
                              {payload[0]?.payload.satisfaccion !== null && (
                                <p className="text-xs text-[var(--color-info)]">
                                  <strong>Autoevaluación:</strong> {payload[0]?.payload.satisfaccion}/4
                                </p>
                              )}
                            </div>
                          );
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="satisfaccion"
                        stroke={designSystem.colors.secondary}
                        strokeWidth={isMobile ? 1.5 : 2}
                        name="Autoevaluación"
                        dot={{ r: isMobile ? 2 : 3, stroke: designSystem.colors.secondary, fill: designSystem.colors.secondary }}
                        connectNulls
                      />
                    </LineChart>
                  </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className={`${componentStyles.components.cardBase} ${isMobile ? '!p-0' : ''}`}>
              <CardHeader className={`${isMobile ? 'px-1 pt-1 pb-0.5' : 'p-1.5'} sm:p-2 md:p-3`}>
                <CardTitle className="text-sm sm:text-base md:text-lg flex items-center gap-2">
                  <Layers className="w-4 h-4 sm:w-5 sm:h-5 text-[var(--color-primary)]" />
                  Ejercicios: Completados vs Omitidos
                </CardTitle>
              </CardHeader>
              <CardContent className={`${isMobile ? 'px-1 pb-1' : 'p-1.5'} sm:p-2 md:p-3`}>
                {datosLinea.length === 0 ? (
                  <div className="text-center py-8 sm:py-12">
                    <Layers className={componentStyles.components.emptyStateIcon} />
                    <p className={componentStyles.components.emptyStateText}>No hay datos</p>
                  </div>
                ) : (
                  <div className="w-full overflow-x-auto -mx-2 px-2">
                    <ResponsiveContainer width="100%" height={isMobile ? 180 : 250} minHeight={180}>
                      <LineChart data={datosLinea} margin={{ top: 5, right: isMobile ? 5 : 20, left: isMobile ? -10 : 0, bottom: isMobile ? 40 : 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                        <XAxis 
                          dataKey="fecha" 
                          tick={{ fontSize: isMobile ? 9 : 11 }}
                          angle={isMobile ? -45 : 0}
                          textAnchor={isMobile ? 'end' : 'middle'}
                          height={isMobile ? 60 : 30}
                          interval={isMobile ? 'preserveStartEnd' : 0}
                          tickFormatter={(fecha) => {
                            if (granularidad === 'dia') {
                              const d = parseLocalDate(fecha);
                              return isMobile 
                                ? `${d.getDate()}/${d.getMonth() + 1}`
                                : d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
                            } else if (granularidad === 'semana') {
                              const d = parseLocalDate(fecha);
                              return `${d.getDate()}/${d.getMonth() + 1}`;
                            } else {
                              const [y, m] = fecha.split('-');
                              const d = new Date(Number(y), Number(m) - 1, 1);
                              return isMobile
                                ? `${m}/${y.slice(-2)}`
                                : d.toLocaleDateString('es-ES', { month: 'short', year: '2-digit' });
                            }
                          }}
                        />
                        <YAxis 
                          tick={{ fontSize: isMobile ? 9 : 11 }} 
                          width={isMobile ? 30 : 60}
                          label={isMobile ? undefined : { value: 'Ejercicios', angle: -90, position: 'insideLeft', style: { fontSize: 11 } }} 
                        />
                      <RechartsTooltip 
                        content={({ active, payload }) => {
                          if (!active || !payload || payload.length === 0) return null;
                          return (
                            <div className={`bg-card border border-[var(--color-border-default)] ${componentStyles.containers.panelBase} shadow-card p-3`}>
                              <p className="text-xs font-semibold mb-2 text-[var(--color-text-primary)]">
                                {granularidad === 'dia' 
                                  ? parseLocalDate(payload[0]?.payload.fecha).toLocaleDateString('es-ES')
                                  : payload[0]?.payload.fecha}
                              </p>
                              <p className="text-xs text-[var(--color-success)]">
                                <strong>Completados:</strong> {payload[0]?.payload.completados}
                              </p>
                              <p className="text-xs text-[var(--color-danger)]">
                                <strong>Omitidos:</strong> {payload[1]?.payload.omitidos}
                              </p>
                            </div>
                          );
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="completados"
                        stroke={designSystem.colors.success}
                        strokeWidth={isMobile ? 1.5 : 2}
                        name="Completados"
                        dot={{ r: isMobile ? 2 : 3, stroke: designSystem.colors.success, fill: designSystem.colors.success }}
                      />
                      <Line
                        type="monotone"
                        dataKey="omitidos"
                        stroke={designSystem.colors.danger}
                        strokeWidth={isMobile ? 1.5 : 2}
                        name="Omitidos"
                        dot={{ r: isMobile ? 2 : 3, stroke: designSystem.colors.danger, fill: designSystem.colors.danger }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
              </Card>
            </div>
          </div>
        )}

        {tabActiva === 'evolucion' && (
          <Card className={componentStyles.components.cardBase}>
            <CardHeader>
              <CardTitle className="text-base md:text-lg">Evolución por Día/Semana/Mes</CardTitle>
            </CardHeader>
            <CardContent>
              <UnifiedTable
                columns={[
                  {
                    key: 'fecha',
                    label: 'Fecha',
                    sortable: true,
                    sortValue: (item) => {
                      if (granularidad === 'dia') {
                        return parseLocalDate(item.fecha).getTime();
                      } else if (granularidad === 'semana') {
                        return parseLocalDate(item.fecha).getTime();
                      } else {
                        const [y, m] = item.fecha.split('-');
                        return new Date(Number(y), Number(m) - 1, 1).getTime();
                      }
                    },
                    render: (item) => {
                      let fechaFormateada = item.fecha;
                      if (granularidad === 'dia') {
                        const d = parseLocalDate(item.fecha);
                        fechaFormateada = d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
                      } else if (granularidad === 'semana') {
                        const d = parseLocalDate(item.fecha);
                        fechaFormateada = d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
                      } else {
                        const [y, m] = item.fecha.split('-');
                        const d = new Date(Number(y), Number(m) - 1, 1);
                        fechaFormateada = d.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
                      }
                      return <span className="text-sm font-medium">{fechaFormateada}</span>;
                    },
                  },
                  {
                    key: 'tiempo',
                    label: 'Tiempo',
                    sortable: true,
                    render: (item) => item.tiempo > 0 ? (
                              <Badge className={`rounded-full ${componentStyles.status.badgeDefault} text-xs`}>
                        {item.tiempo.toFixed(1)} min
                              </Badge>
                    ) : (
                      <span className="text-xs text-[var(--color-text-muted)]">-</span>
                    ),
                  },
                  {
                    key: 'satisfaccion',
                    label: 'Valoración',
                    sortable: true,
                    render: (item) => item.satisfaccion ? (
                              <Badge className={componentStyles.status.badgeInfo}>
                                ⭐ {item.satisfaccion}/4
                              </Badge>
                    ) : (
                      <span className="text-xs text-[var(--color-text-muted)]">-</span>
                    ),
                  },
                  {
                    key: 'completados',
                    label: 'Completados',
                    sortable: true,
                    render: (item) => item.completados > 0 ? (
                              <Badge className={componentStyles.status.badgeSuccess}>
                                ✓ {item.completados}
                              </Badge>
                    ) : (
                      <span className="text-xs text-[var(--color-text-muted)]">0</span>
                    ),
                  },
                  {
                    key: 'omitidos',
                    label: 'Omitidos',
                    sortable: true,
                    render: (item) => item.omitidos > 0 ? (
                              <Badge className={componentStyles.status.badgeDanger}>
                                ⏭ {item.omitidos}
                              </Badge>
                    ) : (
                      <span className="text-xs text-[var(--color-text-muted)]">0</span>
                    ),
                  },
                ]}
                data={datosLinea}
                keyField="fecha"
                paginated={true}
                defaultPageSize={10}
                emptyMessage="No hay datos"
                emptyIcon={TrendingUp}
              />
            </CardContent>
          </Card>
        )}

        {tabActiva === 'tipos' && (
          <Card className={componentStyles.components.cardBase}>
            <CardHeader>
              <CardTitle className="text-base md:text-lg">Tiempo por Tipo de Bloque</CardTitle>
            </CardHeader>
            <CardContent>
              {tiposBloques.length === 0 ? (
                <div className="text-center py-12">
                  <BarChart3 className={componentStyles.components.emptyStateIcon} />
                  <p className={componentStyles.components.emptyStateText}>No hay datos</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {tiposBloques.sort((a, b) => b.tiempoReal - a.tiempoReal).map((tipo) => {
                    const minutos = safeNumber(Math.floor(tipo.tiempoReal / 60));
                    const totalMinutos = safeNumber(tiposBloques.reduce((sum, t) => sum + safeNumber(t.tiempoReal), 0) / 60);
                    const porcentaje = totalMinutos > 0 ? safeNumber((minutos / totalMinutos) * 100).toFixed(1) : 0;
                    
                    return (
                      <div key={tipo.tipo} className="space-y-1">
                        <div className="flex items-center gap-3">
                          <Badge className={`rounded-full ${tipoColors[tipo.tipo]} min-w-[140px] flex items-center justify-center text-xs shrink-0`}>
                            {tipoLabels[tipo.tipo]}
                          </Badge>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-medium text-[var(--color-text-primary)]">{formatDuracionHM(tipo.tiempoReal)}</span>
                              <span className="text-xs text-[var(--color-text-secondary)]">{porcentaje}%</span>
                            </div>
                            <div className="bg-[var(--color-surface-muted)] rounded-full h-2 overflow-hidden">
                              <div 
                                  className="h-full transition-all"
                                  style={{ 
                                    width: `${porcentaje}%`,
                                    backgroundColor: tipoChartColors[tipo.tipo] || tipoChartColors.AD
                                  }}
                              />
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-3 text-xs text-[var(--color-text-secondary)]">
                          <span>Bloques: {tipo.count}</span>
                          <span>
                            Promedio: {formatDuracionHM(safeNumber(tipo.tiempoMedio))}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {tabActiva === 'top' && (
          <Card className={componentStyles.components.cardBase}>
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-3">
                <CardTitle className="text-base md:text-lg">Top Ejercicios Practicados</CardTitle>
                <div className="relative flex-1 md:flex-none md:w-64">
                  <Input
                    placeholder="Buscar ejercicio..."
                    value={searchEjercicio}
                    onChange={(e) => setSearchEjercicio(e.target.value)}
                    className="h-9 rounded-xl border-[var(--color-border-default)] focus-brand text-sm"
                    aria-label="Buscar ejercicio"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <UnifiedTable
                columns={[
                  {
                    key: 'ranking',
                    label: '#',
                    sortable: false,
                    render: (item, index) => {
                      const globalIdx = (topEjerciciosCurrentPage - 1) * topEjerciciosPageSize + index;
                      return (
                          <Badge className="rounded-full bg-[var(--color-surface-muted)] text-[var(--color-text-primary)] font-bold w-8 h-8 flex items-center justify-center shrink-0">
                            {globalIdx + 1}
                          </Badge>
                      );
                    },
                  },
                  {
                    key: 'tipo',
                    label: 'Tipo',
                    sortable: true,
                    render: (item) => (
                      <Badge className={`rounded-full ${tipoColors[item.tipo]} shrink-0`}>
                        {item.tipo}
                          </Badge>
                    ),
                  },
                  {
                    key: 'nombre',
                    label: 'Nombre',
                    sortable: true,
                    render: (item) => (
                          <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{item.nombre}</p>
                        <p className="text-xs text-[var(--color-text-secondary)]">{item.code}</p>
                          </div>
                    ),
                  },
                  {
                    key: 'sesionesCount',
                    label: 'Sesiones',
                    sortable: true,
                    render: (item) => (
                            <Badge variant="outline" className={componentStyles.status.badgeInfo}>
                        {item.sesionesCount} sesiones
                            </Badge>
                    ),
                  },
                  {
                    key: 'tiempoTotal',
                    label: 'Tiempo Total',
                    sortable: true,
                    sortValue: (item) => item.tiempoTotal,
                    render: (item) => (
                            <Badge variant="outline" className={componentStyles.status.badgeDefault}>
                        {formatDuracionHM(item.tiempoTotal)}
                            </Badge>
                    ),
                  },
                  {
                    key: 'ultimaPractica',
                    label: 'Última Práctica',
                    sortable: true,
                    sortValue: (item) => item.ultimaPractica ? new Date(item.ultimaPractica).getTime() : 0,
                    render: (item) => item.ultimaPractica ? (
                              <Badge variant="outline" className="rounded-full text-xs bg-[var(--color-surface-muted)]">
                        {new Date(item.ultimaPractica).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                              </Badge>
                    ) : (
                      <span className="text-xs text-[var(--color-text-muted)]">-</span>
                    ),
                  },
                ]}
                    data={topEjerciciosFiltrados}
                keyField="code"
                paginated={true}
                defaultPageSize={10}
                emptyMessage="No hay ejercicios registrados"
                emptyIcon={FileText}
                  />
            </CardContent>
          </Card>
        )}

        {tabActiva === 'historial' && (
          <>
            {isEstu ? (
              // Para estudiantes: mostrar historial de sesiones
          <Card className={componentStyles.components.cardBase}>
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <CardTitle className="text-base md:text-lg">Historial de Sesiones ({registrosFiltradosUnicos.length})</CardTitle>
                <div className="flex gap-2 flex-wrap">
                  {[1, 2, 3, 4].map(val => (
                    <Button
                      key={val}
                      variant={historialCalificacionFilter == val ? "primary" : "outline"}
                      size="sm"
                      onClick={() => setHistorialCalificacionFilter(historialCalificacionFilter == val ? 'all' : String(val))}
                      className="h-8 w-8 p-0 rounded-xl focus-brand"
                      aria-label={`Filtrar por calificación ${val}`}
                    >
                      {val}
                    </Button>
                  ))}
                  <Button
                    variant={historialSoloConNotas ? "primary" : "outline"}
                    size="sm"
                    onClick={() => setHistorialSoloConNotas(!historialSoloConNotas)}
                    className="h-8 rounded-xl focus-brand"
                    aria-label={historialSoloConNotas ? 'Mostrar todos' : 'Solo con notas'}
                  >
                    <MessageSquare className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {(() => {
                const historialFiltrado = registrosFiltradosUnicos.filter(r => {
                  if (historialCalificacionFilter !== 'all') {
                    const cal = safeNumber(r.calificacion);
                    const calInt = Math.round(cal);
                    if (calInt != parseInt(historialCalificacionFilter)) return false;
                  }
                  if (historialSoloConNotas && !r.notas) return false;
                  return true;
                });
                return historialFiltrado.length === 0 ? (
                  <div className="text-center py-12">
                    <Activity className={componentStyles.components.emptyStateIcon} />
                    <p className={componentStyles.components.emptyStateText}>No hay datos en el periodo seleccionado</p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-3">
                      {(() => {
                        const startIndex = (historialCurrentPage - 1) * historialPageSize;
                        const endIndex = startIndex + historialPageSize;
                        return historialFiltrado.slice(startIndex, endIndex);
                      })().map((registro) => {
                    const alumno = usuarios.find(u => u.id === registro.alumnoId);
                    return (
                      <Card 
                        key={registro.id} 
                        className={`${componentStyles.containers.panelBase} hover:shadow-md transition-shadow cursor-pointer`}
                        onClick={() => {
                          setRegistroSesionSeleccionado(registro);
                          setModalSesionOpen(true);
                        }}
                      >
                        <CardContent className="pt-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <h3 className="font-semibold text-sm md:text-base truncate">{registro.sesionNombre}</h3>
                              </div>
                              <p className="text-xs md:text-sm text-[var(--color-text-secondary)] truncate">
                                {registro.piezaNombre} • {registro.planNombre}
                              </p>
                              <div className="flex items-center gap-2 mt-2 flex-wrap">
                                <Badge variant="outline" className={componentStyles.status.badgeSuccess}>
                                  {formatDuracionHM(registro.duracionRealSeg)}
                                </Badge>
                                <Badge variant="outline" className="rounded-full text-xs">
                                  Obj: {formatDuracionHM(registro.duracionObjetivoSeg)}
                                </Badge>
                                {registro.calificacion !== undefined && registro.calificacion !== null && (
                                  <Badge className={componentStyles.status.badgeDefault}>
                                    {registro.calificacion}/4
                                  </Badge>
                                )}
                                <span className="text-xs text-[var(--color-text-secondary)]">
                                  {registro.inicioISO ? new Date(registro.inicioISO).toLocaleDateString('es-ES') : '-'}
                                </span>
                              </div>
                              {registro.notas && (
                                <p className="text-sm text-[var(--color-text-primary)] mt-2 italic line-clamp-2">"{registro.notas}"</p>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                      );
                    })}
                    </div>
                    <TablePagination
                      data={historialFiltrado}
                      pageSize={historialPageSize}
                      currentPage={historialCurrentPage}
                      onPageChange={setHistorialCurrentPage}
                      onPageSizeChange={(newSize) => {
                        setHistorialPageSize(newSize);
                        setHistorialCurrentPage(1);
                      }}
                    />
                  </>
                );
              })()}
            </CardContent>
          </Card>
            ) : (
              // Para profesores/admins: mostrar autoevaluación del estudiante (filtros, distribución, comentarios)
          <Card className={componentStyles.components.cardBase}>
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-2">
                    <CardTitle className="text-base md:text-lg">Autoevaluación del Estudiante</CardTitle>
                  <div className="flex gap-2 flex-wrap">
                    {[1, 2, 3, 4].map(val => (
                      <Button
                        key={val}
                        variant={calificacionFilter == val ? "primary" : "outline"}
                        size="sm"
                        onClick={() => setCalificacionFilter(calificacionFilter == val ? 'all' : String(val))}
                        className="h-11 w-11 sm:h-8 sm:w-8 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 p-0 rounded-xl focus-brand touch-manipulation"
                        aria-label={`Filtrar por calificación ${val}`}
                      >
                        {val}
                      </Button>
                    ))}
                    <Button
                      variant={soloConNotas ? "primary" : "outline"}
                      size="sm"
                      onClick={() => setSoloConNotas(!soloConNotas)}
                      className="h-8 rounded-xl focus-brand"
                      aria-label={soloConNotas ? 'Mostrar todos' : 'Solo con notas'}
                    >
                      <MessageSquare className="w-4 h-4" />
                    </Button>
                  </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
                  {/* Grid compacto en una línea sin Cards */}
                  <div className="grid grid-cols-4 gap-2 sm:gap-3 md:gap-4 items-center justify-items-center px-2 py-3 border-b border-[var(--color-border-default)]">
                    {[1, 2, 3, 4].map(nivel => (
                      <div key={nivel} className="text-center w-full">
                        <p className="text-xl md:text-2xl font-bold text-[var(--color-text-primary)] mb-0.5">{feedbackAlumno.distribucion[nivel]}</p>
                        <p className="text-xs text-[var(--color-text-secondary)]">Nivel {nivel}</p>
                        <p className="text-xs text-[var(--color-text-secondary)]">
                          {registrosFiltradosUnicos.length > 0 
                            ? ((feedbackAlumno.distribucion[nivel] / registrosFiltradosUnicos.length) * 100).toFixed(1)
                            : 0}%
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-3 pt-4 border-t border-[var(--color-border-default)]">
                    <h3 className="font-semibold text-sm">Comentarios del estudiante ({comentariosFiltrados.length})</h3>
                    {comentariosFiltrados.length === 0 ? (
                      <p className="text-sm text-[var(--color-text-secondary)] text-center py-6">No hay comentarios</p>
                    ) : (
                      comentariosFiltrados.slice(0, 20).map(r => {
                        const alumno = usuarios.find(u => u.id === r.alumnoId);
                        return (
                          <Card key={r.id} className={`${componentStyles.containers.panelBase} hover:shadow-md transition-shadow`}>
                            <CardContent className="pt-3 pb-3">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs text-[var(--color-text-secondary)] truncate">{displayName(alumno)}</p>
                                  <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">{r.sesionNombre}</p>
                                  <p className="text-xs text-[var(--color-text-secondary)] truncate">
                                    {r.piezaNombre} • {new Date(r.inicioISO).toLocaleDateString('es-ES')}
                                  </p>
                                  {r.calificacion && (
                                    <Badge className={`rounded-full ${componentStyles.status.badgeDefault} text-xs mt-1`}>
                                      {r.calificacion}/4
                                    </Badge>
                                  )}
                                  {r.notas && (
                                    <p className="text-sm text-[var(--color-text-primary)] mt-2 italic line-clamp-2">"{r.notas}"</p>
                                  )}
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    const asign = asignaciones.find(a => a.id === r.asignacionId);
                                    if (asign) {
                                      navigate(createPageUrl(`asignacion-detalle?id=${asign.id}`));
                                    }
                                  }}
                                  className="shrink-0 h-9 rounded-xl hover:bg-[var(--color-surface-muted)] focus-brand"
                                  aria-label="Ver detalle de asignación"
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
                </>
              )}

        {tabActiva === 'feedback' && (
          <Card className={componentStyles.components.cardBase}>
            <CardHeader>
              <CardTitle className="text-base md:text-lg">
                {isEstu 
                  ? `Feedback del Profesor (${feedbackProfesor.length})`
                  : `Feedbacks de Estudiantes (${feedbacksParaProfAdmin.length})`
                }
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isEstu ? (
                // Vista para estudiantes: lista simple de feedbacks
                feedbackProfesor.length === 0 ? (
                  <div className="text-center py-12">
                    <MessageSquare className={componentStyles.components.emptyStateIcon} />
                    <p className={componentStyles.components.emptyStateText}>No hay feedback del profesor en este periodo</p>
                  </div>
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="border-b border-[var(--color-border-default)]">
                            <th className="text-left p-2 text-xs font-semibold text-[var(--color-text-secondary)]">Profesor</th>
                            <th className="text-left p-2 text-xs font-semibold text-[var(--color-text-secondary)]">Fecha del Feedback</th>
                            <th className="text-left p-2 text-xs font-semibold text-[var(--color-text-secondary)]">Contenido</th>
                            <th className="text-left p-2 text-xs font-semibold text-[var(--color-text-secondary)]">MediaLinks</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(() => {
                            const startIndex = (feedbackCurrentPage - 1) * feedbackPageSize;
                            const endIndex = startIndex + feedbackPageSize;
                            return feedbackProfesor.slice(startIndex, endIndex);
                          })().map(f => {
                          const profesor = usuarios.find(u => u.id === f.profesorId);
                          const puedeEditar = isAdmin || f.profesorId === userIdActual;
                          const fechaSemana = f.semanaInicioISO ? parseLocalDate(f.semanaInicioISO) : null;
                          const fechaFormateada = fechaSemana ? fechaSemana.toLocaleDateString('es-ES', { 
                            weekday: 'short',
                            day: 'numeric', 
                            month: 'short', 
                            year: 'numeric' 
                          }) : 'N/A';
                          
                          return (
                            <tr key={f.id} className="border-b border-[var(--color-border-default)] hover:bg-[var(--color-surface-muted)]">
                              <td className="p-3 text-sm text-[var(--color-text-primary)]">
                                {profesor ? displayName(profesor) : f.profesorId || 'N/A'}
                              </td>
                              <td className="p-3 text-sm text-[var(--color-text-secondary)]">
                                {fechaFormateada}
                              </td>
                              <td className="p-3 text-sm text-[var(--color-text-primary)] max-w-md">
                                <p className="break-words whitespace-pre-wrap">
                                  {f.notaProfesor || '(Sin nota)'}
                                </p>
                              </td>
                              <td className="p-3">
                                {f.mediaLinks && f.mediaLinks.length > 0 ? (
                                  <MediaLinksBadges 
                                    mediaLinks={f.mediaLinks}
                                    onMediaClick={(index) => handleMediaClick(f.mediaLinks, index)}
                                  />
                                ) : (
                                  <span className="text-xs text-[var(--color-text-muted)]">-</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    </div>
                    <TablePagination
                      data={feedbackProfesor}
                      pageSize={feedbackPageSize}
                      currentPage={feedbackCurrentPage}
                      onPageChange={setFeedbackCurrentPage}
                      onPageSizeChange={(newSize) => {
                        setFeedbackPageSize(newSize);
                        setFeedbackCurrentPage(1);
                      }}
                    />
                  </>
                )
              ) : (
                // Vista para profesores y admins: lista simple de feedbacks
                feedbacksParaProfAdmin.length === 0 ? (
                  <div className="text-center py-12">
                    <MessageSquare className={componentStyles.components.emptyStateIcon} />
                    <p className={componentStyles.components.emptyStateText}>
                      {alumnosSeleccionados.length > 0 
                        ? 'No hay feedbacks para los estudiantes seleccionados en este periodo'
                        : 'No hay feedbacks en este periodo'
                      }
                    </p>
                    {feedbacksSemanal.length > 0 && (
                      <div className="mt-4 p-3 bg-[var(--color-surface-muted)] rounded text-xs text-left">
                        <p className="font-semibold mb-2">Total en BD: {feedbacksSemanal.length} feedbacks</p>
                        <p>Estudiantes cargados: {estudiantes.length}</p>
                        <p>Filtros aplicados: {alumnosSeleccionados.length > 0 ? `${alumnosSeleccionados.length} estudiantes` : 'Todos'} | 
                           {periodoInicio || periodoFin ? ` Período: ${periodoInicio || '...'} - ${periodoFin || '...'}` : ' Sin período'}
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {feedbacksParaProfAdmin.map(f => {
                      const alumno = usuarios.find(u => u.id === f.alumnoId);
                      const profesor = usuarios.find(u => u.id === f.profesorId);
                      const puedeEditar = isAdmin || f.profesorId === userIdActual;
                      const fechaSemana = f.semanaInicioISO ? parseLocalDate(f.semanaInicioISO) : null;
                      const fechaFormateada = fechaSemana ? fechaSemana.toLocaleDateString('es-ES', { 
                        weekday: 'short',
                        day: 'numeric', 
                        month: 'short', 
                        year: 'numeric' 
                      }) : 'N/A';
                      
                      return (
                        <div key={f.id} className="p-3 border border-[var(--color-border-default)] rounded relative">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-[var(--color-text-primary)] break-words mb-2">
                                {f.notaProfesor || '(Sin nota)'}
                              </p>
                              {f.mediaLinks && f.mediaLinks.length > 0 && (
                                <div className="mb-2">
                                  <MediaLinksBadges 
                                    mediaLinks={f.mediaLinks}
                                    onMediaClick={(index) => handleMediaClick(f.mediaLinks, index)}
                                  />
                                </div>
                              )}
                              <div className="text-xs text-[var(--color-text-secondary)] space-y-1">
                                <div><strong>Alumno:</strong> {alumno ? displayName(alumno) : f.alumnoId || 'N/A'}</div>
                                <div><strong>Profesor:</strong> {profesor ? displayName(profesor) : f.profesorId || 'N/A'}</div>
                                <div><strong>Semana:</strong> {fechaFormateada}</div>
                                {(f.created_at || f.createdAt) && (
                                  <div><strong>Creado:</strong> {
                                    (() => {
                                      const createdDate = f.created_at || f.createdAt;
                                      const date = typeof createdDate === 'string' 
                                        ? parseLocalDate(createdDate.split('T')[0]) 
                                        : new Date(createdDate);
                                      return date.toLocaleDateString('es-ES', {
                                        weekday: 'short',
                                        day: 'numeric',
                                        month: 'short',
                                        year: 'numeric'
                                      });
                                    })()
                                  }</div>
                                )}
                              </div>
                            </div>
                            {puedeEditar && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => abrirEditarFeedback(f)}
                                className="h-8 w-8 p-0 shrink-0"
                                aria-label="Editar feedback"
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )
              )}
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

      {/* Drawer de edición de feedback */}
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
                      <h2 className="text-xl font-bold text-[var(--color-text-primary)] font-headings">
                        Editar Feedback
                      </h2>
                    </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => setFeedbackDrawer(null)} 
                    className="text-[var(--color-text-primary)] hover:bg-[var(--color-surface)] h-11 w-11 sm:h-9 sm:w-9 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 rounded-xl touch-manipulation" 
                    aria-label="Cerrar modal"
                  >
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
                />
              </div>

              <div className="border-t border-[var(--color-border-default)] px-6 py-4 bg-[var(--color-surface-muted)] rounded-b-2xl">
                <div className="flex gap-3 mb-2">
                  <Button 
                    variant="outline" 
                    onClick={() => setFeedbackDrawer(null)} 
                    className={`flex-1 ${componentStyles.buttons.outline}`}
                  >
                    Cancelar
                  </Button>
                  <Button 
                    variant="primary"
                    onClick={guardarFeedback} 
                    disabled={actualizarFeedbackMutation.isPending} 
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

      <ModalSesion
        open={modalSesionOpen}
        onOpenChange={setModalSesionOpen}
        registroSesion={registroSesionSeleccionado}
        usuarios={usuarios}
      />
    </div>
  );
}

export default function EstadisticasPage() {
  return (
    <RequireRole anyOf={['ESTU', 'PROF', 'ADMIN']}>
      <EstadisticasPageContent />
    </RequireRole>
  );
}