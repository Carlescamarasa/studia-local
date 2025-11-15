import React, { useState, useMemo, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { getCurrentUser } from "@/api/localDataClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ds";
import { Button } from "@/components/ds/Button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ds";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import {
  Activity, Clock, Calendar, Star, Smile, BarChart3, TrendingUp,
  MessageSquare, Eye, RefreshCw, Dumbbell, List, PieChart
} from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { displayName } from "../components/utils/helpers";
import MultiSelect from "../components/ui/MultiSelect";
import MediaLinksBadges from "../components/common/MediaLinksBadges";
import MediaViewer from "../components/common/MediaViewer";
import RequireRole from "@/components/auth/RequireRole";
import SegmentedTabs from "@/components/ui/SegmentedTabs";

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

function EstadisticasPageContent() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
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
  const [granularidad, setGranularidad] = useState('semana');
  const [calificacionFilter, setCalificacionFilter] = useState('all');
  const [soloConNotas, setSoloConNotas] = useState(false);
  const [searchEjercicio, setSearchEjercicio] = useState('');
  const [viewingMedia, setViewingMedia] = useState(null);

  const currentUser = getCurrentUser();

  const isAdmin = currentUser?.rolPersonalizado === 'ADMIN';
  const isProf = currentUser?.rolPersonalizado === 'PROF';
  const isEstu = currentUser?.rolPersonalizado === 'ESTU';

  const { data: asignacionesProf = [] } = useQuery({
    queryKey: ['asignacionesProf', currentUser?.id],
    queryFn: () => base44.entities.Asignacion.list(),
    enabled: isProf && !!currentUser?.id,
  });

  const estudiantesDelProfesor = useMemo(() => {
    if (!isProf || !currentUser) return [];
    
    const misAsignaciones = asignacionesProf.filter(a => 
      a.profesorId === currentUser.id && 
      (a.estado === 'publicada' || a.estado === 'en_curso' || a.estado === 'borrador')
    );
    
    const alumnosIds = [...new Set(misAsignaciones.map(a => a.alumnoId))];
    return alumnosIds;
  }, [asignacionesProf, currentUser, isProf]);

  const { data: registros = [] } = useQuery({
    queryKey: ['registrosSesion'],
    queryFn: () => base44.entities.RegistroSesion.list('-inicioISO'),
  });

  const { data: bloques = [] } = useQuery({
    queryKey: ['registrosBloques'],
    queryFn: () => base44.entities.RegistroBloque.list('-inicioISO'),
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

  const calcularCalidadPromedio = (registrosFiltrados) => {
    const conCalificacion = registrosFiltrados.filter(r => {
      const cal = safeNumber(r.calificacion);
      return cal > 0 && cal <= 4; // Solo calificaciones válidas (1-4)
    });
    if (conCalificacion.length === 0) return 0;
    const suma = conCalificacion.reduce((acc, r) => acc + safeNumber(r.calificacion), 0);
    const promedio = suma / conCalificacion.length;
    return safeNumber(promedio).toFixed(1);
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
      filtered = filtered.filter(r => r.alumnoId === currentUser.id);
    } else {
      let targetAlumnoIds = new Set();

      if (alumnosSeleccionados.length > 0) {
        alumnosSeleccionados.forEach(id => targetAlumnoIds.add(id));
      } else if (profesoresSeleccionados.length > 0) {
        usuarios
          .filter(u => u.rolPersonalizado === 'ESTU' && profesoresSeleccionados.includes(u.profesorAsignadoId))
          .map(u => u.id)
          .forEach(id => targetAlumnoIds.add(id));
      } else if (isProf && estudiantesDelProfesor.length > 0) {
        estudiantesDelProfesor.forEach(id => targetAlumnoIds.add(id));
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
  }, [registros, currentUser, periodoInicio, periodoFin, isEstu, profesoresSeleccionados, alumnosSeleccionados, focosSeleccionados, usuarios, isProf, estudiantesDelProfesor]);

  const bloquesFiltrados = useMemo(() => {
    const registrosIds = new Set(registrosFiltrados.map(r => r.id));
    return bloques
      .filter(b => registrosIds.has(b.registroSesionId))
      .map(b => ({
        ...b,
        duracionRealSeg: safeNumber(b.duracionRealSeg),
        duracionObjetivoSeg: safeNumber(b.duracionObjetivoSeg),
      }));
  }, [bloques, registrosFiltrados]);

  const kpis = useMemo(() => {
    // Validar y corregir duraciones antes de calcular
    const tiempoTotal = registrosFiltrados.reduce((sum, r) => {
      const duracion = validarDuracion(r.duracionRealSeg);
      return sum + duracion;
    }, 0);
    const racha = calcularRacha(registrosFiltrados, isEstu ? currentUser?.id : null);
    const calidadPromedio = calcularCalidadPromedio(registrosFiltrados);
    const semanasDistintas = calcularSemanasDistintas(registrosFiltrados);

    return {
      tiempoTotal,
      racha,
      calidadPromedio,
      semanasDistintas,
    };
  }, [registrosFiltrados, isEstu, currentUser]);

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
    
    registrosFiltrados.forEach(r => {
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
          satisfaccion: satisfaccion ? safeNumber(satisfaccion) : null,
          completados: safeNumber(item.completados),
          omitidos: safeNumber(item.omitidos),
        };
      })
      .sort((a, b) => a.fecha.localeCompare(b.fecha));
  }, [registrosFiltrados, granularidad]);

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
    
    registrosFiltrados.forEach(r => {
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
  }, [registrosFiltrados]);

  const feedbackProfesor = useMemo(() => {
    if (!isEstu) return [];
    
    return feedbacksSemanal.filter(f => {
      if (f.alumnoId !== currentUser?.id) return false;
      if (!f.semanaInicioISO) return false;
      
      const feedbackDate = parseLocalDate(f.semanaInicioISO);
      
      if (periodoInicio) {
        const inicioDate = parseLocalDate(periodoInicio);
        if (feedbackDate < inicioDate) return false;
      }
      
      if (periodoFin) {
        const finDate = parseLocalDate(periodoFin);
        if (feedbackDate > finDate) return false;
      }
      
      return true;
    }).sort((a, b) => b.semanaInicioISO.localeCompare(a.semanaInicioISO));
  }, [feedbacksSemanal, currentUser, periodoInicio, periodoFin, isEstu]);

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
    CA: 'bg-brand-100 text-brand-800',
    CB: 'bg-blue-100 text-blue-800',
    TC: 'bg-purple-100 text-purple-800',
    TM: 'bg-green-100 text-green-800',
    FM: 'bg-pink-100 text-pink-800',
    VC: 'bg-cyan-100 text-cyan-800',
    AD: 'bg-gray-100 text-gray-800',
  };

  const focoLabels = {
    GEN: 'General',
    LIG: 'Ligaduras',
    RIT: 'Ritmo',
    ART: 'Articulación',
    'S&A': 'Sonido y Afinación',
  };

  const focoColors = {
    GEN: 'bg-gray-100 text-gray-800',
    LIG: 'bg-blue-100 text-blue-800',
    RIT: 'bg-purple-100 text-purple-800',
    ART: 'bg-green-100 text-green-800',
    'S&A': 'bg-brand-100 text-brand-800',
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
    <div className="min-h-screen bg-background">
      <div className="bg-card border-b border-ui sticky top-0 z-10 shadow-card">
        <div className="max-w-[1600px] mx-auto px-6 md:px-8 py-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="icon-tile">
              <Activity className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-3xl font-bold text-ui">
                {isEstu ? 'Mis Estadísticas' : isProf ? 'Estadísticas de Estudiantes' : 'Estadísticas Generales'}
              </h1>
              <p className="text-sm text-muted hidden md:block">
                {isEstu ? 'Tu progreso en la práctica' : 'Análisis del rendimiento y progreso'}
              </p>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => window.location.reload()}
              className="shrink-0 h-9 rounded-xl focus-brand"
              aria-label="Actualizar datos"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>

          <div className="space-y-3">
            <div className="flex gap-2 flex-wrap items-center">
              <div className="flex gap-2 items-center flex-wrap">
                <Input
                  type="date"
                  value={periodoInicio}
                  onChange={(e) => setPeriodoInicio(e.target.value)}
                  className="h-10 rounded-xl border-ui focus-brand text-sm w-full md:w-auto"
                  aria-label="Fecha de inicio"
                />
                <span className="text-muted">—</span>
                <Input
                  type="date"
                  value={periodoFin}
                  onChange={(e) => setPeriodoFin(e.target.value)}
                  className="h-10 rounded-xl border-ui focus-brand text-sm w-full md:w-auto"
                  aria-label="Fecha de fin"
                />
              </div>
              
              <div className="flex gap-1 flex-wrap">
                {presets.map(p => (
                  <Button
                    key={p.key}
                    variant={rangoPreset === p.key ? "primary" : "outline"}
                    size="sm"
                    onClick={() => aplicarPreset(p.key)}
                    className="text-xs h-9 rounded-xl focus-brand"
                    aria-label={`Preset ${p.label}`}
                  >
                    {p.label}
                  </Button>
                ))}
              </div>
            </div>

            <div className="flex gap-2 flex-wrap items-center">
              {!isEstu && (
                <>
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
                </>
              )}
              
              <MultiSelect
                label="Foco"
                items={Object.entries(focoLabels).map(([key, label]) => ({ 
                  value: key, 
                  label: label 
                }))}
                value={focosSeleccionados}
                onChange={setFocosSeleccionados}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto p-4 md:p-6 lg:p-8 space-y-6">
        <div className="flex justify-center">
          <SegmentedTabs
            value={tabActiva}
            onChange={setTabActiva}
            options={[
              { value: 'resumen', label: <><BarChart3 className="w-4 h-4 sm:mr-2" /><span className="hidden sm:inline">Resumen</span></> },
              { value: 'evolucion', label: <><TrendingUp className="w-4 h-4 sm:mr-2" /><span className="hidden sm:inline">Evolución</span></> },
              { value: 'tipos', label: <><PieChart className="w-4 h-4 sm:mr-2" /><span className="hidden sm:inline">Tipos</span></> },
              { value: 'top', label: <><Star className="w-4 h-4 sm:mr-2" /><span className="hidden sm:inline">Top</span></> },
              { value: 'historial', label: <><List className="w-4 h-4 sm:mr-2" /><span className="hidden sm:inline">Historial</span></> },
              { value: 'feedback', label: <><MessageSquare className="w-4 h-4 sm:mr-2" /><span className="hidden sm:inline">Feedback</span></> },
            ]}
          />
        </div>

        {tabActiva === 'resumen' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
              <Card className="app-card hover:shadow-md transition-shadow">
                <CardContent className="pt-4 text-center">
                  <Clock className="w-6 h-6 mx-auto mb-2 text-[hsl(var(--brand-500))]" />
                  <p className="text-2xl font-bold text-ui">
                    {Math.floor(kpis.tiempoTotal / 60)}
                  </p>
                  <p className="text-xs text-muted">Minutos</p>
                </CardContent>
              </Card>

              <Card className="app-card hover:shadow-md transition-shadow">
                <CardContent className="pt-4 text-center">
                  <Star className="w-6 h-6 mx-auto mb-2 text-emerald-600" />
                  <p className="text-2xl font-bold text-ui">{kpis.racha.actual}</p>
                  <p className="text-xs text-muted">Racha</p>
                  <p className="text-xs text-muted">Máx: {kpis.racha.maxima}</p>
                </CardContent>
              </Card>

              <Card className="app-card hover:shadow-md transition-shadow">
                <CardContent className="pt-4 text-center">
                  <Smile className="w-6 h-6 mx-auto mb-2 text-blue-600" />
                  <p className="text-2xl font-bold text-ui">
                    {kpis.calidadPromedio}/4
                  </p>
                  <p className="text-xs text-muted">Calidad</p>
                </CardContent>
              </Card>

              <Card className="app-card hover:shadow-md transition-shadow">
                <CardContent className="pt-4 text-center">
                  <Calendar className="w-6 h-6 mx-auto mb-2 text-purple-600" />
                  <p className="text-2xl font-bold text-ui">{kpis.semanasDistintas}</p>
                  <p className="text-xs text-muted">Semanas</p>
                </CardContent>
              </Card>
            </div>

            <div className="flex justify-center">
              <SegmentedTabs
                value={granularidad}
                onChange={setGranularidad}
                options={[
                  { value: 'dia', label: 'Días' },
                  { value: 'semana', label: 'Semanas' },
                  { value: 'mes', label: 'Meses' },
                ]}
              />
            </div>

            <Card className="app-card">
              <CardHeader>
                <CardTitle className="text-base md:text-lg flex items-center gap-2">
                  <Clock className="w-5 h-5 text-[hsl(var(--brand-600))]" />
                  Tiempo de Estudio
                </CardTitle>
              </CardHeader>
              <CardContent>
                {datosLinea.length === 0 ? (
                  <div className="text-center py-12">
                    <TrendingUp className="w-16 h-16 mx-auto mb-4 icon-empty" />
                    <p className="text-muted">No hay datos en el periodo seleccionado</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={datosLinea}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                      <XAxis 
                        dataKey="fecha" 
                        tick={{ fontSize: 11 }}
                        tickFormatter={(fecha) => {
                          if (granularidad === 'dia') {
                            const d = parseLocalDate(fecha);
                            return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
                          } else if (granularidad === 'semana') {
                            const d = parseLocalDate(fecha);
                            return `${d.getDate()}/${d.getMonth() + 1}`;
                          } else {
                            const [y, m] = fecha.split('-');
                            const d = new Date(Number(y), Number(m) - 1, 1);
                            return d.toLocaleDateString('es-ES', { month: 'short', year: '2-digit' });
                          }
                        }}
                      />
                      <YAxis tick={{ fontSize: 11 }} label={{ value: 'Minutos', angle: -90, position: 'insideLeft', style: { fontSize: 11 } }} />
                      <RechartsTooltip 
                        content={({ active, payload }) => {
                          if (!active || !payload || payload.length === 0) return null;
                          return (
                            <div className="bg-card border border-ui app-panel shadow-card p-3">
                              <p className="text-xs font-semibold mb-2 text-ui">
                                {granularidad === 'dia' 
                                  ? parseLocalDate(payload[0]?.payload.fecha).toLocaleDateString('es-ES')
                                  : payload[0]?.payload.fecha}
                              </p>
                              <p className="text-xs text-[hsl(var(--brand-600))]">
                                <strong>Tiempo:</strong> {payload[0]?.payload.tiempo} min
                              </p>
                            </div>
                          );
                        }}
                      />
                      <Line type="monotone" dataKey="tiempo" stroke="hsl(var(--brand-500))" strokeWidth={2} name="Tiempo (min)" dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card className="app-card">
              <CardHeader>
                <CardTitle className="text-base md:text-lg flex items-center gap-2">
                  <Smile className="w-5 h-5 text-blue-600" />
                  Autoevaluación (1-4)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {datosLinea.filter(d => d.satisfaccion !== null).length === 0 ? (
                  <div className="text-center py-12">
                    <Smile className="w-16 h-16 mx-auto mb-4 icon-empty" />
                    <p className="text-muted">No hay datos de autoevaluación</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={datosLinea}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                      <XAxis 
                        dataKey="fecha" 
                        tick={{ fontSize: 11 }}
                        tickFormatter={(fecha) => {
                          if (granularidad === 'dia') {
                            const d = parseLocalDate(fecha);
                            return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
                          } else if (granularidad === 'semana') {
                            const d = parseLocalDate(fecha);
                            return `${d.getDate()}/${d.getMonth() + 1}`;
                          } else {
                            const [y, m] = fecha.split('-');
                            const d = new Date(Number(y), Number(m) - 1, 1);
                            return d.toLocaleDateString('es-ES', { month: 'short', year: '2-digit' });
                          }
                        }}
                      />
                      <YAxis tick={{ fontSize: 11 }} domain={[0, 4]} label={{ value: 'Nivel', angle: -90, position: 'insideLeft', style: { fontSize: 11 } }} />
                      <RechartsTooltip 
                        content={({ active, payload }) => {
                          if (!active || !payload || payload.length === 0) return null;
                          return (
                            <div className="bg-card border border-ui app-panel shadow-card p-3">
                              <p className="text-xs font-semibold mb-2 text-ui">
                                {granularidad === 'dia' 
                                  ? parseLocalDate(payload[0]?.payload.fecha).toLocaleDateString('es-ES')
                                  : payload[0]?.payload.fecha}
                              </p>
                              {payload[0]?.payload.satisfaccion !== null && (
                                <p className="text-xs text-blue-600">
                                  <strong>Autoevaluación:</strong> {payload[0]?.payload.satisfaccion}/4
                                </p>
                              )}
                            </div>
                          );
                        }}
                      />
                      <Line type="monotone" dataKey="satisfaccion" stroke="#3B82F6" strokeWidth={2} name="Autoevaluación" dot={{ r: 3 }} connectNulls />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card className="app-card">
              <CardHeader>
                <CardTitle className="text-base md:text-lg flex items-center gap-2">
                  <Dumbbell className="w-5 h-5 text-purple-600" />
                  Ejercicios: Completados vs Omitidos
                </CardTitle>
              </CardHeader>
              <CardContent>
                {datosLinea.length === 0 ? (
                  <div className="text-center py-12">
                    <Dumbbell className="w-16 h-16 mx-auto mb-4 icon-empty" />
                    <p className="text-muted">No hay datos</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={datosLinea}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                      <XAxis 
                        dataKey="fecha" 
                        tick={{ fontSize: 11 }}
                        tickFormatter={(fecha) => {
                          if (granularidad === 'dia') {
                            const d = parseLocalDate(fecha);
                            return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
                          } else if (granularidad === 'semana') {
                            const d = parseLocalDate(fecha);
                            return `${d.getDate()}/${d.getMonth() + 1}`;
                          } else {
                            const [y, m] = fecha.split('-');
                            const d = new Date(Number(y), Number(m) - 1, 1);
                            return d.toLocaleDateString('es-ES', { month: 'short', year: '2-digit' });
                          }
                        }}
                      />
                      <YAxis tick={{ fontSize: 11 }} label={{ value: 'Ejercicios', angle: -90, position: 'insideLeft', style: { fontSize: 11 } }} />
                      <RechartsTooltip 
                        content={({ active, payload }) => {
                          if (!active || !payload || payload.length === 0) return null;
                          return (
                            <div className="bg-card border border-ui app-panel shadow-card p-3">
                              <p className="text-xs font-semibold mb-2 text-ui">
                                {granularidad === 'dia' 
                                  ? parseLocalDate(payload[0]?.payload.fecha).toLocaleDateString('es-ES')
                                  : payload[0]?.payload.fecha}
                              </p>
                              <p className="text-xs text-green-600">
                                <strong>Completados:</strong> {payload[0]?.payload.completados}
                              </p>
                              <p className="text-xs text-red-600">
                                <strong>Omitidos:</strong> {payload[1]?.payload.omitidos}
                              </p>
                            </div>
                          );
                        }}
                      />
                      <Line type="monotone" dataKey="completados" stroke="#10B981" strokeWidth={2} name="Completados" dot={{ r: 3 }} />
                      <Line type="monotone" dataKey="omitidos" stroke="#EF4444" strokeWidth={2} name="Omitidos" dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {tabActiva === 'evolucion' && (
          <Card className="app-card">
            <CardHeader>
              <CardTitle className="text-base md:text-lg">Evolución por Día/Semana/Mes</CardTitle>
            </CardHeader>
            <CardContent>
              {datosLinea.length === 0 ? (
                <div className="text-center py-12">
                  <TrendingUp className="w-16 h-16 mx-auto mb-4 icon-empty" />
                  <p className="text-muted">No hay datos</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {datosLinea.map((item, idx) => (
                    <Card key={idx} className="app-panel hover:shadow-md transition-shadow">
                      <CardContent className="pt-3 pb-3">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <span className="text-sm font-medium">{item.fecha}</span>
                          <div className="flex gap-2 flex-wrap">
                            {item.tiempo > 0 && (
                              <Badge className="rounded-full bg-brand-100 text-brand-800 text-xs">
                                {item.tiempo} min
                              </Badge>
                            )}
                            {item.satisfaccion && (
                              <Badge className="rounded-full bg-blue-100 text-blue-800 text-xs">
                                ⭐ {item.satisfaccion}/4
                              </Badge>
                            )}
                            {item.completados > 0 && (
                              <Badge className="rounded-full bg-green-100 text-green-800 text-xs">
                                ✓ {item.completados}
                              </Badge>
                            )}
                            {item.omitidos > 0 && (
                              <Badge className="rounded-full bg-red-100 text-red-800 text-xs">
                                ⏭ {item.omitidos}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {tabActiva === 'tipos' && (
          <Card className="app-card">
            <CardHeader>
              <CardTitle className="text-base md:text-lg">Tiempo por Tipo de Bloque</CardTitle>
            </CardHeader>
            <CardContent>
              {tiposBloques.length === 0 ? (
                <div className="text-center py-12">
                  <BarChart3 className="w-16 h-16 mx-auto mb-4 icon-empty" />
                  <p className="text-muted">No hay datos</p>
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
                          <Badge className={`rounded-full ${tipoColors[tipo.tipo]} min-w-[140px] justify-center text-xs`}>
                            {tipoLabels[tipo.tipo]}
                          </Badge>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-medium">{minutos} min</span>
                              <span className="text-xs text-muted">{porcentaje}%</span>
                            </div>
                            <div className="bg-muted rounded-full h-2 overflow-hidden">
                              <div 
                                className="bg-[hsl(var(--brand-500))] h-full transition-all"
                                style={{ width: `${porcentaje}%` }}
                              />
                            </div>
                          </div>
                        </div>
                        <div className="ml-[152px] flex gap-3 text-xs text-muted">
                          <span>Bloques: {tipo.count}</span>
                          <span>Promedio: {Math.floor(safeNumber(tipo.tiempoMedio) / 60)}:{String(Math.floor(safeNumber(tipo.tiempoMedio) % 60)).padStart(2, '0')} min</span>
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
          <Card className="app-card">
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-3">
                <CardTitle className="text-base md:text-lg">Top Ejercicios Practicados</CardTitle>
                <div className="relative flex-1 md:flex-none md:w-64">
                  <Input
                    placeholder="Buscar ejercicio..."
                    value={searchEjercicio}
                    onChange={(e) => setSearchEjercicio(e.target.value)}
                    className="h-9 rounded-xl border-ui focus-brand text-sm"
                    aria-label="Buscar ejercicio"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {topEjerciciosFiltrados.length === 0 ? (
                <div className="text-center py-12">
                  <Dumbbell className="w-16 h-16 mx-auto mb-4 icon-empty" />
                  <p className="text-muted">No hay ejercicios registrados</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {topEjerciciosFiltrados.slice(0, 20).map((ejercicio, idx) => (
                    <Card key={idx} className="app-panel hover:shadow-md transition-shadow">
                      <CardContent className="pt-3 pb-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge className="rounded-full bg-muted text-ui font-bold w-8 h-8 flex items-center justify-center shrink-0">
                            {idx + 1}
                          </Badge>
                          <Badge className={`rounded-full ${tipoColors[ejercicio.tipo]} shrink-0`}>
                            {ejercicio.tipo}
                          </Badge>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{ejercicio.nombre}</p>
                            <p className="text-xs text-muted">{ejercicio.code}</p>
                          </div>
                          <div className="flex gap-2 flex-wrap shrink-0">
                            <Badge variant="outline" className="rounded-full text-xs bg-blue-50">
                              {ejercicio.sesionesCount} sesiones
                            </Badge>
                            <Badge variant="outline" className="rounded-full text-xs bg-brand-50">
                              {Math.floor(ejercicio.tiempoTotal / 60)} min
                            </Badge>
                            {ejercicio.ultimaPractica && (
                              <Badge variant="outline" className="rounded-full text-xs bg-muted">
                                {new Date(ejercicio.ultimaPractica).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {tabActiva === 'historial' && (
          <Card className="app-card">
            <CardHeader>
              <CardTitle className="text-base md:text-lg">Historial de Sesiones ({registrosFiltrados.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {registrosFiltrados.length === 0 ? (
                <div className="text-center py-12">
                  <Activity className="w-16 h-16 mx-auto mb-4 icon-empty" />
                  <p className="text-muted">No hay datos en el periodo seleccionado</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {registrosFiltrados.slice(0, 50).map((registro) => {
                    const alumno = usuarios.find(u => u.id === registro.alumnoId);
                    return (
                      <Card key={registro.id} className="app-panel hover:shadow-md transition-shadow">
                        <CardContent className="pt-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <h3 className="font-semibold text-sm md:text-base truncate">{registro.sesionNombre}</h3>
                                {!isEstu && (
                                  <Badge variant="outline" className="rounded-full text-xs">
                                    {displayName(alumno)}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs md:text-sm text-muted truncate">
                                {registro.piezaNombre} • {registro.planNombre}
                              </p>
                              <div className="flex items-center gap-2 mt-2 flex-wrap">
                                <Badge variant="outline" className="rounded-full text-xs bg-green-50 border-green-300 text-green-800">
                                  {Math.floor(validarDuracion(registro.duracionRealSeg) / 60)} min
                                </Badge>
                                <Badge variant="outline" className="rounded-full text-xs">
                                  Obj: {Math.floor(validarDuracion(registro.duracionObjetivoSeg) / 60)} min
                                </Badge>
                                {registro.calificacion !== undefined && registro.calificacion !== null && (
                                  <Badge className="rounded-full bg-purple-100 text-purple-800 text-xs">
                                    {registro.calificacion}/4
                                  </Badge>
                                )}
                                <span className="text-xs text-muted">
                                  {registro.inicioISO ? new Date(registro.inicioISO).toLocaleDateString('es-ES') : '-'}
                                </span>
                              </div>
                              {registro.notas && (
                                <p className="text-sm text-ui mt-2 italic line-clamp-2">"{registro.notas}"</p>
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
        )}

        {tabActiva === 'feedback' && (
          <Card className="app-card">
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <CardTitle className="text-base md:text-lg">
                  {isEstu ? 'Feedback del Profesor' : 'Autoevaluación del Estudiante'}
                </CardTitle>
                {!isEstu && (
                  <div className="flex gap-2 flex-wrap">
                    {[1, 2, 3, 4].map(val => (
                      <Button
                        key={val}
                        variant={calificacionFilter == val ? "primary" : "outline"}
                        size="sm"
                        onClick={() => setCalificacionFilter(calificacionFilter == val ? 'all' : String(val))}
                        className="h-8 w-8 p-0 rounded-xl focus-brand"
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
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {isEstu ? (
                <div className="space-y-3">
                  {feedbackProfesor.length === 0 ? (
                    <div className="text-center py-12">
                      <MessageSquare className="w-16 h-16 mx-auto mb-4 icon-empty" />
                      <p className="text-muted">No hay feedback del profesor en este periodo</p>
                    </div>
                  ) : (
                    feedbackProfesor.map(f => {
                      const profesor = usuarios.find(u => u.id === f.profesorId);
                      return (
                        <Card key={f.id} className="app-card border-blue-200 bg-blue-50/30 hover:shadow-md transition-shadow">
                          <CardContent className="pt-4">
                            <div className="space-y-2">
                              <div className="flex items-center gap-2 flex-wrap">
                                <Badge className="rounded-full bg-blue-600 text-white">
                                  Semana {parseLocalDate(f.semanaInicioISO).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                                </Badge>
                                <span className="text-xs text-muted">
                                  {displayName(profesor)}
                                </span>
                              </div>
                              {f.notaProfesor && (
                                <p className="text-sm text-ui italic border-l-2 border-blue-400 pl-3 break-words">
                                  "{f.notaProfesor}"
                                </p>
                              )}
                              <MediaLinksBadges 
                                mediaLinks={f.mediaLinks}
                                onMediaClick={(media) => setViewingMedia(media)}
                              />
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })
                  )}
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-4 gap-2 md:gap-3">
                    {[1, 2, 3, 4].map(nivel => (
                      <div key={nivel} className="text-center p-2 md:p-3 app-panel hover:shadow-sm transition-shadow">
                        <p className="text-xl md:text-2xl font-bold text-ui">{feedbackAlumno.distribucion[nivel]}</p>
                        <p className="text-xs text-muted">Nivel {nivel}</p>
                        <p className="text-xs text-muted">
                          {registrosFiltrados.length > 0 
                            ? ((feedbackAlumno.distribucion[nivel] / registrosFiltrados.length) * 100).toFixed(1)
                            : 0}%
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-3 pt-4 border-t border-ui">
                    <h3 className="font-semibold text-sm">Comentarios del estudiante ({comentariosFiltrados.length})</h3>
                    {comentariosFiltrados.length === 0 ? (
                      <p className="text-sm text-muted text-center py-6">No hay comentarios</p>
                    ) : (
                      comentariosFiltrados.slice(0, 20).map(r => {
                        const alumno = usuarios.find(u => u.id === r.alumnoId);
                        return (
                          <Card key={r.id} className="app-panel hover:shadow-md transition-shadow">
                            <CardContent className="pt-3 pb-3">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs text-muted truncate">{displayName(alumno)}</p>
                                  <p className="text-sm font-medium truncate">{r.sesionNombre}</p>
                                  <p className="text-xs text-muted truncate">
                                    {r.piezaNombre} • {new Date(r.inicioISO).toLocaleDateString('es-ES')}
                                  </p>
                                  {r.calificacion && (
                                    <Badge className="rounded-full bg-purple-100 text-purple-800 text-xs mt-1">
                                      {r.calificacion}/4
                                    </Badge>
                                  )}
                                  {r.notas && (
                                    <p className="text-sm text-ui mt-2 italic line-clamp-2">"{r.notas}"</p>
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
                                  className="shrink-0 h-9 rounded-xl hover:bg-muted focus-brand"
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
                </>
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