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
  Sun, CalendarRange, Grid3x3, Layers, FileText, Timer, Edit, X, Save, ChevronLeft, ChevronDown, ChevronUp
} from "lucide-react";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { displayName, useEffectiveUser, resolveUserIdActual } from "../components/utils/helpers";
import MultiSelect from "../components/ui/MultiSelect";
import MediaLinksBadges from "../components/common/MediaLinksBadges";
import MediaLinksInput from "../components/common/MediaLinksInput";
import MediaPreviewModal from "../components/common/MediaPreviewModal";
import { resolveMedia } from "../components/utils/media";
import RequireRole from "@/components/auth/RequireRole";
import Tabs from "@/components/ds/Tabs";
import { componentStyles } from "@/design/componentStyles";
import { designSystem } from "@/design/designSystem";
import PageHeader from "@/components/ds/PageHeader";
import { useIsMobile } from "@/hooks/use-mobile";
import ModalSesion from "@/components/calendario/ModalSesion";
import UnifiedTable from "@/components/tables/UnifiedTable";
// Componentes modulares de estadísticas
import ResumenTab from "@/components/estadisticas/ResumenTab";
import ProgresoTab from "@/components/estadisticas/ProgresoTab";
import TiposBloquesTab from "@/components/estadisticas/TiposBloquesTab";
import TopEjerciciosTab from "@/components/estadisticas/TopEjerciciosTab";
import AutoevaluacionesTab from "@/components/estadisticas/AutoevaluacionesTab";
import FeedbackTab from "@/components/estadisticas/FeedbackTab";
import HeatmapActividad from "@/components/estadisticas/HeatmapActividad";
import ProgresoPorPieza from "@/components/estadisticas/ProgresoPorPieza";
import ComparativaEstudiantes from "@/components/estadisticas/ComparativaEstudiantes";

import { useEstadisticas, safeNumber } from "@/components/estadisticas/hooks/useEstadisticas";
import { formatDuracionHM, formatLocalDate, parseLocalDate, startOfMonday } from "@/components/estadisticas/utils";
import { shouldIgnoreHotkey } from "@/utils/hotkeys";

function EstadisticasPageContent() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();

  const [rangoPreset, setRangoPreset] = useState('4-semanas');
  const [filtersExpanded, setFiltersExpanded] = useState(false);
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
  const [showMediaModal, setShowMediaModal] = useState(false);
  const [selectedMediaLinks, setSelectedMediaLinks] = useState([]);
  const [selectedMediaIndex, setSelectedMediaIndex] = useState(0);
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
    return resolveUserIdActual(effectiveUser, usuarios);
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

  // Filtrar sesiones válidas: solo aquellas con calificación (sesiones realmente finalizadas)
  const registrosSesionValidos = useMemo(
    () => registros.filter(r => r.calificacion != null),
    [registros]
  );

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
    // Los datos se actualizarán automáticamente por los useMemo que dependen de periodoInicio/periodoFin
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
    // Usar solo sesiones válidas (con calificación) como base
    let filtered = registrosSesionValidos
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
  }, [registrosSesionValidos, effectiveUser, periodoInicio, periodoFin, isEstu, profesoresSeleccionados, alumnosSeleccionados, focosSeleccionados, usuarios, isProf, estudiantesDelProfesor, asignaciones]);

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

  // Usar hook para cálculos de estadísticas
  const estadisticas = useEstadisticas({
    registrosFiltradosUnicos,
    bloquesFiltrados,
    periodoInicio,
    periodoFin,
    granularidad,
    isEstu,
    userIdActual,
  });

  const {
    kpis,
    datosLinea,
    tiposBloques,
    topEjercicios,
    progresoPorPieza,
    heatmapData,
    tiempoRealVsObjetivo,
    diasSinPractica,
  } = estadisticas;

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
    if (!isEstu) return [];

    const filtrados = feedbacksSemanal.filter(f => {
      if (f.alumnoId !== userIdActual) {
        return false;
      }
      if (!f.semanaInicioISO) {
        return false;
      }

      const feedbackDate = parseLocalDate(f.semanaInicioISO);

      if (periodoInicio) {
        const inicioDate = parseLocalDate(periodoInicio);
        if (feedbackDate < inicioDate) {
          return false;
        }
      }

      if (periodoFin) {
        const finDate = parseLocalDate(periodoFin);
        if (feedbackDate > finDate) {
          return false;
        }
      }

      return true;
    });

    return filtrados.sort((a, b) => b.semanaInicioISO.localeCompare(a.semanaInicioISO));
  }, [feedbacksSemanal, userIdActual, periodoInicio, periodoFin, isEstu]);

  // Feedbacks para profesores y admins: ADMIN y PROF ven TODOS los feedbacks
  const feedbacksParaProfAdmin = useMemo(() => {
    if (isEstu) return [];

    // Para ADMIN: mostrar TODOS los feedbacks si no hay filtros explícitos
    // Para PROF: mostrar TODOS los feedbacks si no hay filtros explícitos
    let resultado = [...feedbacksSemanal];

    // Solo filtrar por estudiantes si hay selección EXPLÍCITA
    if (alumnosSeleccionados.length > 0) {
      resultado = resultado.filter(f => alumnosSeleccionados.includes(f.alumnoId));
    }

    // Solo filtrar por profesores si hay selección EXPLÍCITA
    if (profesoresSeleccionados.length > 0) {
      resultado = resultado.filter(f => profesoresSeleccionados.includes(f.profesorId));
    }

    // Solo filtrar por período si hay filtro EXPLÍCITO de período
    // IMPORTANTE: Para ADMIN y PROF, incluir feedbacks sin semanaInicioISO también
    if (periodoInicio || periodoFin) {
      resultado = resultado.filter(f => {
        // Si no tiene semanaInicioISO, INCLUIR siempre (no excluir feedbacks sin fecha)
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
    }

    // Agregar nombre del estudiante a cada feedback
    resultado = resultado.map(f => {
      const alumno = usuarios.find(u => u.id === f.alumnoId);
      return {
        ...f,
        alumnoNombre: alumno ? displayName(alumno) : f.alumnoId || 'N/A'
      };
    });

    // Ordenar: primero por alumno, luego por fecha descendente
    resultado.sort((a, b) => {
      if (a.alumnoId !== b.alumnoId) {
        return (a.alumnoId || '').localeCompare(b.alumnoId || '');
      }
      const fechaA = a.semanaInicioISO || '';
      const fechaB = b.semanaInicioISO || '';
      return fechaB.localeCompare(fechaA);
    });

    return resultado;
  }, [feedbacksSemanal, alumnosSeleccionados, profesoresSeleccionados, periodoInicio, periodoFin, isEstu, usuarios]);

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

  // Normalizar media links: acepta strings u objetos con url
  const normalizeMediaLinks = (rawLinks) => {
    if (!rawLinks || !Array.isArray(rawLinks)) return [];
    return rawLinks
      .map((raw) => {
        if (typeof raw === 'string') return raw;
        if (raw && typeof raw === 'object' && raw.url) return raw.url;
        if (raw && typeof raw === 'object' && raw.href) return raw.href;
        if (raw && typeof raw === 'object' && raw.link) return raw.link;
        return '';
      })
      .filter((url) => typeof url === 'string' && url.length > 0);
  };

  // Función para manejar clicks en medialinks
  const handleMediaClick = (mediaLinks, index) => {
    if (!mediaLinks || !Array.isArray(mediaLinks) || mediaLinks.length === 0) return;

    // Normalizar media links
    const normalizedLinks = normalizeMediaLinks(mediaLinks);
    if (normalizedLinks.length === 0) return;

    // Asegurar que el índice esté dentro del rango
    const safeIndex = Math.max(0, Math.min(index, normalizedLinks.length - 1));

    setSelectedMediaLinks(normalizedLinks);
    setSelectedMediaIndex(safeIndex);
    setShowMediaModal(true);
  };

  // Atajos de teclado para el drawer de feedback
  useEffect(() => {
    if (!feedbackDrawer) return;

    const handleKeyDown = (e) => {
      // No procesar si está en un campo editable
      if (shouldIgnoreHotkey(e)) return;

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
      if (modalSesionOpen || feedbackDrawer || showMediaModal) return;

      // No procesar si está en un input o textarea
      if (e.target.matches('input, textarea, select')) return;

      // ArrowLeft para volver
      if (e.key === 'ArrowLeft' && !e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        // Si venimos de /hoy, volver a /hoy; sino, usar navigate(-1)
        if (location.state?.from === 'hoy') {
          navigate('/hoy');
        } else {
          // Si no hay history útil, ir a /calendario
          if (window.history.length <= 1) {
            navigate('/calendario');
          } else {
            navigate(-1);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate, location.state, modalSesionOpen, feedbackDrawer, showMediaModal]);

  const tipoLabels = {
    CA: 'Calentamiento A',
    CB: 'Calentamiento B',
    TC: 'Técnica',
    FM: 'Fragmento Musical',
    VC: 'Vuelta a la Calma',
    AD: 'Aviso/Descanso',
  };

  const tipoColors = {
    CA: componentStyles.status.badgeDefault,
    CB: componentStyles.status.badgeDefault,
    TC: componentStyles.status.badgeDefault,
    FM: componentStyles.status.badgeDefault,
    VC: componentStyles.status.badgeDefault,
    AD: componentStyles.status.badgeDefault,
  };

  // Colores para el piechart de tipos de bloques
  const tipoChartColors = {
    CA: '#3b82f6', // blue-500
    CB: '#60a5fa', // blue-400
    TC: '#8b5cf6', // purple-500
    FM: '#ec4899', // pink-500
    VC: '#06b6d4', // cyan-500
    AD: '#94a3b8', // slate-400
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
    SON: componentStyles.status.badgeInfo,
    FLX: componentStyles.status.badgeDefault,
    ART: componentStyles.status.badgeSuccess,
    MOT: componentStyles.status.badgeDefault,
    COG: componentStyles.status.badgeInfo,
  };

  const comentariosFiltrados = feedbackAlumno.comentarios.filter(r => {
    if (calificacionFilter !== 'all' && r.calificacion != calificacionFilter) return false;
    if (soloConNotas && !r.notas) return false;
    return true;
  });

  // Calcular métricas de comparación de estudiantes - Siempre ejecutar el hook (fuera de condiciones)
  const estudiantesComparacion = useMemo(() => {
    if (isEstu) return [];

    // Calcular métricas por estudiante
    const estudiantesMap = new Map();

    // Obtener todos los estudiantes si no hay selección
    const estudiantesIds = alumnosSeleccionados.length > 0
      ? alumnosSeleccionados
      : estudiantes.map(e => e.id);

    estudiantesIds.forEach(alumnoId => {
      const registrosEstudiante = registrosFiltradosUnicos.filter(r => r.alumnoId === alumnoId);

      // Calcular KPIs manualmente para cada estudiante
      const tiempoTotal = registrosEstudiante.reduce((sum, r) => {
        const duracion = safeNumber(r.duracionRealSeg);
        return sum + (duracion > 0 && duracion <= 43200 ? duracion : 0);
      }, 0);

      const numSesiones = registrosEstudiante.length;

      let mediaSemanalSesiones = 0;
      if (periodoInicio && periodoFin) {
        const inicio = parseLocalDate(periodoInicio);
        const fin = parseLocalDate(periodoFin);
        const diffMs = fin.getTime() - inicio.getTime();
        const numDias = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)) + 1);
        mediaSemanalSesiones = numDias > 0 ? (numSesiones / numDias) * 7 : 0;
      }

      const conCalificacion = registrosEstudiante.filter(r => {
        const cal = safeNumber(r.calificacion);
        return cal > 0 && cal <= 4;
      });
      const calificacionPromedio = conCalificacion.length > 0
        ? (conCalificacion.reduce((acc, r) => acc + safeNumber(r.calificacion), 0) / conCalificacion.length).toFixed(1)
        : '0.0';

      const totalCompletados = registrosEstudiante.reduce((sum, r) =>
        sum + safeNumber(r.bloquesCompletados), 0
      );
      const totalOmitidos = registrosEstudiante.reduce((sum, r) =>
        sum + safeNumber(r.bloquesOmitidos), 0
      );
      const ratioCompletado = (totalCompletados + totalOmitidos) > 0
        ? ((totalCompletados / (totalCompletados + totalOmitidos)) * 100).toFixed(1)
        : 0;

      const racha = calcularRacha(registrosEstudiante, null);

      estudiantesMap.set(alumnoId, {
        id: alumnoId,
        tiempoTotal,
        sesiones: numSesiones,
        sesionesPorSemana: mediaSemanalSesiones,
        calificacionPromedio,
        ratioCompletado,
        racha: racha.actual,
        rachaMaxima: racha.maxima,
      });
    });

    return Array.from(estudiantesMap.values());
  }, [isEstu, alumnosSeleccionados, estudiantes, registrosFiltradosUnicos, periodoInicio, periodoFin]);

  const presets = [
    { key: 'esta-semana', label: 'Semana' },
    { key: '4-semanas', label: '4 sem' },
    { key: 'este-mes', label: 'Mes' },
    { key: '3-meses', label: '3 meses' },
    { key: 'este-ano', label: 'Año' },
    { key: 'ultimo-ano', label: '1 año' },
    { key: 'todo', label: 'Todo' },
  ];

  // Formatear el rango de fechas como "26 oct — 23 nov 2025"
  const formatDateRange = useMemo(() => {
    if (!periodoInicio && !periodoFin) {
      return 'Todo el período';
    }
    if (!periodoInicio || !periodoFin) {
      const fecha = periodoInicio || periodoFin;
      if (fecha) {
        try {
          const d = parseLocalDate(fecha);
          const day = d.getDate();
          const month = d.toLocaleDateString('es-ES', { month: 'short' });
          const year = d.getFullYear();
          return `${day} ${month} ${year}`;
        } catch (e) {
          return 'Seleccionar rango';
        }
      }
      return 'Seleccionar rango';
    }

    try {
      const inicio = parseLocalDate(periodoInicio);
      const fin = parseLocalDate(periodoFin);

      const dayInicio = inicio.getDate();
      const monthInicio = inicio.toLocaleDateString('es-ES', { month: 'short' });

      const dayFin = fin.getDate();
      const monthFin = fin.toLocaleDateString('es-ES', { month: 'short' });
      const yearFin = fin.getFullYear();

      // Si son el mismo mes, mostrar "26 — 30 oct 2025"
      if (inicio.getMonth() === fin.getMonth() && inicio.getFullYear() === fin.getFullYear()) {
        return `${dayInicio} — ${dayFin} ${monthFin} ${yearFin}`;
      }

      // Si son años diferentes, mostrar ambos años
      if (inicio.getFullYear() !== fin.getFullYear()) {
        const yearInicio = inicio.getFullYear();
        return `${dayInicio} ${monthInicio} ${yearInicio} — ${dayFin} ${monthFin} ${yearFin}`;
      }

      // Meses diferentes, mismo año: "26 oct — 23 nov 2025"
      return `${dayInicio} ${monthInicio} — ${dayFin} ${monthFin} ${yearFin}`;
    } catch (e) {
      return 'Seleccionar rango';
    }
  }, [periodoInicio, periodoFin]);

  return (
    <div className={componentStyles.layout.appBackground}>
      <PageHeader
        icon={Activity}
        title={isEstu ? 'Mis Estadísticas' : isProf ? 'Estadísticas de Estudiantes' : 'Estadísticas Generales'}
        subtitle={isEstu ? 'Tu progreso en la práctica' : 'Análisis del rendimiento y progreso'}
        actions={
          <>
            {/* Pill de rango de fechas */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setFiltersExpanded(!filtersExpanded)}
              className={`${componentStyles.buttons.outline} flex items-center justify-center gap-1 sm:gap-1.5 text-xs sm:text-sm h-8 sm:h-9 px-2 sm:px-3 py-1.5 touch-manipulation shrink-0 transition-all duration-300 whitespace-nowrap`}
              aria-label={filtersExpanded ? "Ocultar filtros" : "Mostrar filtros"}
              aria-expanded={filtersExpanded}
            >
              <CalendarDays className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
              <span className="text-xs sm:text-sm">
                {formatDateRange}
              </span>
              {filtersExpanded ? (
                <ChevronUp className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
              )}
            </Button>
            {location.state?.from === 'hoy' && (
              <Button
                variant="outline"
                onClick={() => navigate('/hoy')}
                className={`${componentStyles.buttons.outline} h-9 sm:h-10`}
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                Volver
              </Button>
            )}
          </>
        }
      />

      {/* Panel de filtros colapsable */}
      {filtersExpanded && (
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 py-3 md:py-4">
          <Card className={componentStyles.containers.cardBase}>
            <CardContent className="p-3 sm:p-4 md:p-6 space-y-4 md:space-y-6">
              <div className="flex items-center justify-between mb-2">
                <h2 className={`${componentStyles.typography.sectionTitle} text-base sm:text-lg`}>Filtros</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setFiltersExpanded(false)}
                  className="text-xs sm:text-sm h-8 w-8 p-0"
                  aria-label="Ocultar filtros"
                >
                  <ChevronUp className="w-4 h-4" />
                </Button>
              </div>

              <div className="w-full space-y-4 md:space-y-6">
                {/* Filtros de fecha y presets */}
                <div className="space-y-3">
                  <div className="flex flex-col gap-3">
                    {/* Rango de fechas */}
                    <div className="flex-1 w-full">
                      <Label className="text-xs sm:text-sm mb-1.5 block text-[var(--color-text-secondary)]">
                        Rango de fechas
                      </Label>
                      <DateRangePicker
                        startDate={periodoInicio}
                        endDate={periodoFin}
                        onDateChange={(start, end) => {
                          setPeriodoInicio(start);
                          setPeriodoFin(end);
                          setRangoPreset('personalizado');
                        }}
                        className="w-full sm:w-auto"
                      />
                    </div>

                    {/* Presets */}
                    <div>
                      <Label className="text-xs sm:text-sm mb-1.5 block text-[var(--color-text-secondary)]">
                        Presets rápidos
                      </Label>
                      <div className="flex gap-1.5 flex-wrap">
                        {presets.map(p => (
                          <Button
                            key={p.key}
                            variant={rangoPreset === p.key ? "primary" : "outline"}
                            size="sm"
                            onClick={() => {
                              aplicarPreset(p.key);
                            }}
                            className={`
                            text-xs h-8 sm:h-9 rounded-xl focus-brand transition-all
                            ${rangoPreset === p.key
                                ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)] shadow-sm'
                                : 'hover:bg-[var(--color-surface-muted)]'
                              }
                          `}
                            aria-label={`Preset ${p.label}`}
                            title={`Ver estadísticas: ${p.label}`}
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
                  <div className={`${componentStyles.layout.grid2} gap-3`}>
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
                )}

                {/* Filtro de Foco */}
                <div>
                  <MultiSelect
                    label="Foco"
                    items={Object.entries(focoLabels).map(([key, label]) => ({ value: key, label }))}
                    value={focosSeleccionados}
                    onChange={setFocosSeleccionados}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className={componentStyles.layout.page}>
        {/* Tabs principales - Ahora ocupan todo el ancho */}
        <Card className={`${componentStyles.components.cardBase} mb-6 p-0`}>
          <div className="w-full">
            <Tabs
              variant="segmented"
              value={tabActiva}
              onChange={setTabActiva}
              className="w-full"
              items={[
                { value: 'resumen', label: 'Resumen', icon: BarChart3 },
                { value: 'progreso', label: 'Progreso', icon: TrendingUp },

                { value: 'tipos', label: 'Tipos de Bloque', icon: Layers },
                { value: 'top', label: 'Top', icon: Star },
                { value: 'autoevaluaciones', label: 'Sesiones', icon: List },
                { value: 'feedback', label: 'Feedback', icon: MessageSquare },
                ...(!isEstu ? [{ value: 'comparar', label: 'Comparar', icon: Activity }] : []),
              ]}
            />
          </div>
        </Card>

        {/* Control de granularidad - Solo visible en tabs específicas (ahora dentro de cada tab) */}

        {tabActiva === 'resumen' && (
          <ResumenTab
            kpis={kpis}
            datosLinea={datosLinea}
            granularidad={granularidad}
            onGranularidadChange={setGranularidad}
          />
        )}

        {tabActiva === 'progreso' && (
          <ProgresoTab
            datosLinea={datosLinea}
            granularidad={granularidad}
            onGranularidadChange={setGranularidad}
            tiempoRealVsObjetivo={tiempoRealVsObjetivo}
            kpis={kpis}
          />
        )}



        {tabActiva === 'tipos' && (
          <TiposBloquesTab tiposBloques={tiposBloques} />
        )}







        {tabActiva === 'top' && (
          <TopEjerciciosTab
            topEjercicios={topEjercicios}
            bloquesFiltrados={bloquesFiltrados}
            registrosFiltrados={registrosFiltradosUnicos}
          />
        )}

        {tabActiva === 'autoevaluaciones' && (
          <AutoevaluacionesTab
            registros={registrosFiltradosUnicos}
            usuarios={usuarios}
            userIdActual={userIdActual}
            userRole={effectiveUser?.rolPersonalizado}
            onMediaClick={(mediaLinks, index) => handleMediaClick(mediaLinks, index)}
          />
        )}

        {tabActiva === 'feedback' && (
          <FeedbackTab
            feedbacks={isEstu ? feedbackProfesor : feedbacksParaProfAdmin}
            isEstu={isEstu}
            onEditFeedback={(f) => setFeedbackDrawer(f)}
            puedeEditar={(f) => {
              // Solo ADMIN y PROF pueden editar, y solo el profesor creador o un ADMIN
              return (isAdmin || isProf) && (isAdmin || f.profesorId === userIdActual);
            }}
            onMediaClick={(mediaLinks, index) => handleMediaClick(mediaLinks, index)}
          />
        )}

        {/* Tab de comparación de estudiantes (solo PROF/ADMIN) */}
        {!isEstu && tabActiva === 'comparar' && (
          <ComparativaEstudiantes
            estudiantes={estudiantesComparacion}
            usuarios={usuarios}
          />
        )}


        {/* Código antiguo removido - ahora usando componentes modulares arriba */}
        {false && (
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

        {/* Secciones antiguas de tabs eliminadas - ahora usando componentes modulares arriba */}

        {/* Sección antigua de feedback eliminada - ahora usando FeedbackTab arriba */}
        {false && tabActiva === 'feedback' && (
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
                            // Solo ADMIN y PROF pueden editar, y solo el profesor creador o un ADMIN
                            const puedeEditar = (isAdmin || isProf) && (isAdmin || f.profesorId === userIdActual);
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
                      // Solo ADMIN y PROF pueden editar, y solo el profesor creador o un ADMIN
                      const puedeEditar = (isAdmin || isProf) && (isAdmin || f.profesorId === userIdActual);
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

      {showMediaModal && selectedMediaLinks.length > 0 && (
        <MediaPreviewModal
          urls={selectedMediaLinks}
          initialIndex={selectedMediaIndex || 0}
          open={showMediaModal}
          onClose={() => {
            setShowMediaModal(false);
            setSelectedMediaLinks([]);
            setSelectedMediaIndex(0);
          }}
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
                    onChange={(e) => setFeedbackDrawer({ ...feedbackDrawer, notaProfesor: e.target.value })}
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
                  onChange={(links) => setFeedbackDrawer({ ...feedbackDrawer, mediaLinks: links })}
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
        userIdActual={userIdActual}
        userRole={effectiveUser?.rolPersonalizado}
        onMediaClick={(mediaLinks, index) => handleMediaClick(mediaLinks, index)}
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