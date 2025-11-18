
import React, { useState } from "react";
import { localDataClient } from "@/api/localDataClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ds/Button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ds";
import { Badge } from "@/components/ds";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Settings, Trash2, Users, Music, Target, PlayCircle,
  Loader2, Shield,
  RefreshCw, AlertTriangle, CheckCircle2, XCircle, AlertCircle,
  Search, FileSearch, Clock, FileDown, Sprout,
  ClipboardList,
  ChevronDown, ChevronRight, Link2, ScrollText, Zap, Database,
  Calendar, Layers,
  FlaskConical, Download, Upload, Play, FileText, Link as LinkIcon
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ds";
import { toast } from "sonner";
import { formatLocalDate, parseLocalDate, displayName, calcularOffsetSemanas, useEffectiveUser } from "../components/utils/helpers";
import { parseAuditSpec, runAudit, runDesignAudit, QUICK_PROFILES } from "../components/utils/auditor";
import PageHeader from "@/components/ds/PageHeader";
import Tabs from "@/components/ds/Tabs";
import { roleHome } from "../components/auth/roleMap";
import { createPageUrl } from "@/utils";
import { componentStyles } from "@/design/componentStyles";

export default function TestSeedPage() {
  const queryClient = useQueryClient();
  const [isSeeding, setIsSeeding] = useState(false);
  const [seedLogs, setSeedLogs] = useState([]);
  const [testResults, setTestResults] = useState([]);
  const [linkAudit, setLinkAudit] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [auditSpec, setAuditSpec] = useState('');
  const [auditResults, setAuditResults] = useState(null);
  const [lastAuditSpec, setLastAuditSpec] = useState('');
  const [isAuditing, setIsAuditing] = useState(false);
  const [expandedFiles, setExpandedFiles] = useState(new Set());
  const [activeTab, setActiveTab] = useState('seeds');

  const tipoColors = {
    CA: `${componentStyles.status.badgeDefault} border-[var(--color-primary)]/30`,
    CB: `${componentStyles.status.badgeInfo}`,
    TC: `${componentStyles.status.badgeDefault} border-[var(--color-primary)]/30`,
    TM: `${componentStyles.status.badgeSuccess}`,
    FM: `${componentStyles.status.badgeWarning}`,
    VC: `${componentStyles.status.badgeInfo}`,
    AD: `bg-[var(--color-surface-muted)] text-[var(--color-text-primary)] border-[var(--color-border-default)]`,
  };

  const focoColors = {
    GEN: 'bg-[var(--color-surface-muted)] text-[var(--color-text-primary)]',
    LIG: componentStyles.status.badgeInfo,
    RIT: `${componentStyles.status.badgeDefault} border-[var(--color-primary)]/30`,
    ART: componentStyles.status.badgeSuccess,
    'S&A': `${componentStyles.status.badgeDefault} border-[var(--color-primary)]/30`,
  };

  const effectiveUser = useEffectiveUser();

  const { data: stats, isLoading, refetch: refetchStats } = useQuery({
    queryKey: ['seedStats'],
    queryFn: async () => {
      const [users, piezas, planes, bloques, asignaciones, registrosSesion, registrosBloques, feedbacks] = await Promise.all([
        localDataClient.entities.User.list(),
        localDataClient.entities.Pieza.list(),
        localDataClient.entities.Plan.list(),
        localDataClient.entities.Bloque.list(),
        localDataClient.entities.Asignacion.list(),
        localDataClient.entities.RegistroSesion.list(),
        localDataClient.entities.RegistroBloque.list(),
        localDataClient.entities.FeedbackSemanal.list(),
      ]);
      return { users, piezas, planes, bloques, asignaciones, registrosSesion, registrosBloques, feedbacks };
    },
  });

  const addLog = (message, type = 'info') => {
    setSeedLogs(prev => [...prev, { message, type, timestamp: new Date().toLocaleTimeString() }]);
  };

  const clearLogs = () => setSeedLogs([]);

  // ======================== SEMILLAS REALISTAS ========================
  const generarSemillasRealistas = async (numSemanas) => {
    setIsSeeding(true);
    clearLogs();
    addLog(`🌱 Iniciando generación de ${numSemanas} ${numSemanas === 1 ? 'semana' : 'semanas'} realistas...`, 'info');

    try {
      const startTime = Date.now();
      const usuarios = await localDataClient.entities.User.list();
      const estudiantes = usuarios.filter(u => u.rolPersonalizado === 'ESTU');
      const profesores = usuarios.filter(u => u.rolPersonalizado === 'PROF');

      if (estudiantes.length === 0) {
        addLog('❌ No hay estudiantes. Crea usuarios con rol ESTU primero.', 'error');
        toast.error('No hay estudiantes en el sistema');
        setIsSeeding(false);
        return;
      }

      let profesor = profesores[0] || effectiveUser;
      if (!profesor || (profesor.rolPersonalizado !== 'PROF' && profesor.rolPersonalizado !== 'ADMIN')) {
        addLog('⚠️ No hay profesor disponible, usando administrador', 'warning');
      }

      let piezas = await localDataClient.entities.Pieza.list();
      let piezaBase = piezas.find(p => p.nombre === 'Seed – Estudio base');

      if (!piezaBase) {
        addLog('📝 Creando pieza base...', 'info');
        piezaBase = await localDataClient.entities.Pieza.create({
          nombre: 'Seed – Estudio base',
          descripcion: 'Pieza de referencia para generación de datos de prueba',
          nivel: 'intermedio',
          tiempoObjetivoSeg: 1200,
          elementos: [
            { nombre: 'Introducción', media: { video: 'https://www.youtube.com/embed/dQw4w9WgXcQ' } },
            { nombre: 'Tema Principal', media: { audio: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3' } },
            { nombre: 'Partitura', media: { imagen: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/74/Music_notes.svg/800px-Music_notes.svg.png' } },
          ],
          profesorId: profesor.id,
        });
        addLog('✅ Pieza base creada', 'success');
      }

      let bloques = await localDataClient.entities.Bloque.list();
      const tiposRequeridos = ['CA', 'CB', 'TC', 'TM', 'FM', 'VC', 'AD'];
      const ejerciciosBase = {};

      for (const tipo of tiposRequeridos) {
        let ejercicio = bloques.find(b => b.tipo === tipo && b.code?.includes('SEED'));
        if (!ejercicio) {
          const configs = {
            CA: { nombre: 'Calentamiento A', duracion: 300 },
            CB: { nombre: 'Calentamiento B', duracion: 360 },
            TC: { nombre: 'Técnica Central', duracion: 480 },
            TM: { nombre: 'Técnica Mantenimiento', duracion: 360 },
            FM: { nombre: 'Fragmento Musical', duracion: 600 },
            VC: { nombre: 'Vuelta a la Calma', duracion: 240 },
            AD: { nombre: 'Advertencia', duracion: 0 },
          };

          ejercicio = await localDataClient.entities.Bloque.create({
            nombre: configs[tipo].nombre,
            code: `${tipo}-SEED-001`,
            tipo: tipo,
            duracionSeg: configs[tipo].duracion,
            instrucciones: `Ejercicio ${configs[tipo].nombre}`,
            indicadorLogro: `Completar ${configs[tipo].nombre}`,
            materialesRequeridos: [],
            media: {},
            profesorId: profesor.id,
          });
          addLog(`✅ Ejercicio ${tipo} creado`, 'info');
        }
        ejerciciosBase[tipo] = ejercicio;
      }

      bloques = await localDataClient.entities.Bloque.list();

      let planes = await localDataClient.entities.Plan.list();
      let planBase = planes.find(p => p.nombre === 'Seed – Plan Base');

      if (!planBase) {
        addLog('📅 Creando plan base...', 'info');
        planBase = await localDataClient.entities.Plan.create({
          nombre: 'Seed – Plan Base',
          focoGeneral: 'GEN',
          objetivoSemanalPorDefecto: 'Desarrollar técnica y musicalidad',
          piezaId: piezaBase.id,
          profesorId: profesor.id,
          semanas: [
            {
              nombre: 'Semana 1',
              foco: 'GEN',
              objetivo: 'Bases técnicas y musicales',
              sesiones: [
                {
                  nombre: 'Sesión A',
                  foco: 'GEN',
                  bloques: [
                    { ...ejerciciosBase.CA, code: ejerciciosBase.CA.code, nombre: ejerciciosBase.CA.nombre, tipo: 'CA', duracionSeg: 300 },
                    { ...ejerciciosBase.TC, code: ejerciciosBase.TC.code, nombre: ejerciciosBase.TC.nombre, tipo: 'TC', duracionSeg: 480 },
                    { ...ejerciciosBase.FM, code: ejerciciosBase.FM.code, nombre: ejerciciosBase.FM.nombre, tipo: 'FM', duracionSeg: 600 },
                    { ...ejerciciosBase.VC, code: ejerciciosBase.VC.code, nombre: ejerciciosBase.VC.nombre, tipo: 'VC', duracionSeg: 240 },
                  ],
                  rondas: []
                },
                {
                  nombre: 'Sesión B',
                  foco: 'RIT',
                  bloques: [
                    { ...ejerciciosBase.CB, code: ejerciciosBase.CB.code, nombre: ejerciciosBase.CB.nombre, tipo: 'CB', duracionSeg: 360 },
                    { ...ejerciciosBase.TM, code: ejerciciosBase.TM.code, nombre: ejerciciosBase.TM.nombre, tipo: 'TM', duracionSeg: 360 },
                    { ...ejerciciosBase.AD, code: ejerciciosBase.AD.code, nombre: ejerciciosBase.AD.nombre, tipo: 'AD', duracionSeg: 0 },
                    { ...ejerciciosBase.VC, code: ejerciciosBase.VC.code, nombre: ejerciciosBase.VC.nombre, tipo: 'VC', duracionSeg: 240 },
                  ],
                  rondas: []
                }
              ]
            },
            {
              nombre: 'Semana 2',
              foco: 'ART',
              objetivo: 'Refinar articulación',
              sesiones: [
                {
                  nombre: 'Sesión A',
                  foco: 'ART',
                  bloques: [
                    { ...ejerciciosBase.CA, code: ejerciciosBase.CA.code, nombre: ejerciciosBase.CA.nombre, tipo: 'CA', duracionSeg: 300 },
                    { ...ejerciciosBase.TC, code: ejerciciosBase.TC.code, nombre: ejerciciosBase.TC.nombre, tipo: 'TC', duracionSeg: 480 },
                    { ...ejerciciosBase.FM, code: ejerciciosBase.FM.code, nombre: ejerciciosBase.FM.nombre, tipo: 'FM', duracionSeg: 600 },
                  ],
                  rondas: []
                }
              ]
            },
            {
              nombre: 'Semana 3',
              foco: 'S&A',
              objetivo: 'Sonido y afinación',
              sesiones: [
                {
                  nombre: 'Sesión A',
                  foco: 'S&A',
                  bloques: [
                    { ...ejerciciosBase.CA, code: ejerciciosBase.CA.code, nombre: ejerciciosBase.CA.nombre, tipo: 'CA', duracionSeg: 300 },
                    { ...ejerciciosBase.CB, code: ejerciciosBase.CB.code, nombre: ejerciciosBase.CB.nombre, tipo: 'CB', duracionSeg: 360 },
                    { ...ejerciciosBase.FM, code: ejerciciosBase.FM.code, nombre: ejerciciosBase.FM.nombre, tipo: 'FM', duracionSeg: 600 },
                    { ...ejerciciosBase.VC, code: ejerciciosBase.VC.code, nombre: ejerciciosBase.VC.nombre, tipo: 'VC', duracionSeg: 240 },
                  ],
                  rondas: []
                }
              ]
            },
            {
              nombre: 'Semana 4',
              foco: 'LIG',
              objetivo: 'Ligaduras y fluidez',
              sesiones: [
                {
                  nombre: 'Sesión A',
                  foco: 'LIG',
                  bloques: [
                    { ...ejerciciosBase.CA, code: ejerciciosBase.CA.code, nombre: ejerciciosBase.CA.nombre, tipo: 'CA', duracionSeg: 300 },
                    { ...ejerciciosBase.TC, code: ejerciciosBase.TC.code, nombre: ejerciciosBase.TC.nombre, tipo: 'TC', duracionSeg: 480 },
                    { ...ejerciciosBase.TM, code: ejerciciosBase.TM.code, nombre: ejerciciosBase.TM.nombre, tipo: 'TM', duracionSeg: 360 },
                  ],
                  rondas: []
                }
              ]
            }
          ]
        });
        addLog('✅ Plan base creado (4 semanas)', 'success');
      }

      const hoy = new Date();
      const lunesActual = new Date(hoy);
      lunesActual.setDate(lunesActual.getDate() - (lunesActual.getDay() + 6) % 7); // startOfMonday

      let totalSesiones = 0;
      let totalBloques = 0;
      let totalFeedbacks = 0;

      // Para cada estudiante
      for (const estudiante of estudiantes) {
        const profesorAsignado = usuarios.find(u => u.id === estudiante.profesorAsignadoId) || profesor;

        // Para cada semana (-2, -1, 0)
        for (let offsetSemana = -(numSemanas - 1); offsetSemana <= 0; offsetSemana++) {
          const lunesSemana = new Date(lunesActual);
          lunesSemana.setDate(lunesSemana.getDate() + (offsetSemana * 7));
          const semanaInicioISO = formatLocalDate(lunesSemana);

          // Verificar si ya existe asignación para esta semana
          const asignaciones = await localDataClient.entities.Asignacion.list();
          let asignacion = asignaciones.find(a =>
            a.alumnoId === estudiante.id &&
            a.semanaInicioISO === semanaInicioISO
          );

          if (!asignacion) {
            asignacion = await localDataClient.entities.Asignacion.create({
              alumnoId: estudiante.id,
              piezaId: piezaBase.id,
              semanaInicioISO: semanaInicioISO,
              estado: 'publicada',
              foco: 'GEN',
              notas: `Asignación automática - semana del ${parseLocalDate(semanaInicioISO).toLocaleDateString('es-ES')}`,
              plan: JSON.parse(JSON.stringify(planBase)),
              piezaSnapshot: {
                nombre: piezaBase.nombre,
                descripcion: piezaBase.descripcion,
                nivel: piezaBase.nivel,
                elementos: piezaBase.elementos,
                tiempoObjetivoSeg: piezaBase.tiempoObjetivoSeg,
              },
              profesorId: profesorAsignado.id
            });
            addLog(`✅ Asignación creada para ${estudiante.nombreCompleto || estudiante.email} semana ${semanaInicioISO}`, 'info');
          }

          // Generar 3-5 sesiones para esta semana
          const numSesionesEnSemana = 3 + Math.floor(Math.random() * 3); // 3-5
          const diasPracticados = new Set();

          // Seleccionar días únicos (4-5 días diferentes)
          while (diasPracticados.size < Math.min(numSesionesEnSemana, 5)) {
            const diaOffset = Math.floor(Math.random() * 7); // 0-6 (lunes-domingo)
            diasPracticados.add(diaOffset);
          }

          const diasArray = Array.from(diasPracticados).sort();
          const franjas = ['manana', 'tarde', 'noche'];
          const focos = ['GEN', 'LIG', 'RIT', 'ART', 'S&A'];

          for (let i = 0; i < numSesionesEnSemana; i++) {
            const diaOffset = diasArray[i % diasArray.length];
            const franja = franjas[Math.floor(Math.random() * franjas.length)];

            let hora, minuto;
            if (franja === 'manana') {
              hora = 7 + Math.floor(Math.random() * 5); // 7-11
              minuto = Math.floor(Math.random() * 60);
            } else if (franja === 'tarde') {
              hora = 15 + Math.floor(Math.random() * 5); // 15-19
              minuto = Math.floor(Math.random() * 60);
            } else {
              hora = 20 + Math.floor(Math.random() * 3); // 20-22
              minuto = Math.floor(Math.random() * 60);
            }

            const fechaSesion = new Date(lunesSemana);
            fechaSesion.setDate(fechaSesion.getDate() + diaOffset);
            fechaSesion.setHours(hora, minuto, 0, 0);

            const duracionSesion = (20 + Math.floor(Math.random() * 41)) * 60; // 20-60 min en segundos
            const fechaFin = new Date(fechaSesion.getTime() + duracionSesion * 1000);

            // Seleccionar 2-4 bloques
            const numBloques = 2 + Math.floor(Math.random() * 3); // 2-4
            const tiposPesos = { CA: 0.2, CB: 0.2, TC: 0.3, TM: 0.15, FM: 0.25, VC: 0.08, AD: 0.02 };
            const bloquesSeleccionados = [];
            const tiposUsados = new Set();

            for (let b = 0; b < numBloques; b++) {
              const rand = Math.random();
              let acumulado = 0;
              let tipoSeleccionado = 'TC'; // Default to a common type if none match

              for (const [tipo, peso] of Object.entries(tiposPesos)) {
                acumulado += peso;
                if (rand < acumulado && !tiposUsados.has(tipo)) {
                  tipoSeleccionado = tipo;
                  tiposUsados.add(tipo);
                  break;
                }
              }

              const ejercicio = bloques.find(e => e.tipo === tipoSeleccionado && e.code?.includes('SEED'));
              if (ejercicio) {
                bloquesSeleccionados.push(ejercicio);
              }
            }

            const calificacion = 1 + Math.floor(Math.random() * 4); // 1-4
            const semanaIdx = 0;
            const sesionIdx = i;
            const foco = focos[Math.floor(Math.random() * focos.length)];

            const duracionObjetivo = bloquesSeleccionados
              .filter(b => b.tipo !== 'AD')
              .reduce((sum, b) => sum + (b.duracionSeg || 0), 0);

            const registroSesion = await localDataClient.entities.RegistroSesion.create({
              asignacionId: asignacion.id,
              alumnoId: estudiante.id,
              profesorAsignadoId: profesorAsignado.id,
              semanaIdx,
              sesionIdx,
              inicioISO: fechaSesion.toISOString(),
              finISO: fechaFin.toISOString(),
              duracionRealSeg: duracionSesion,
              duracionObjetivoSeg: duracionObjetivo,
              bloquesTotales: bloquesSeleccionados.length,
              bloquesCompletados: bloquesSeleccionados.filter((_, idx) => idx < bloquesSeleccionados.length * 0.85).length,
              bloquesOmitidos: Math.floor(bloquesSeleccionados.length * 0.15),
              finalizada: true,
              finAnticipado: false,
              motivoFin: 'terminado',
              calificacion,
              notas: calificacion === 4 ? 'Excelente sesión' : calificacion === 3 ? 'Buena práctica' : calificacion === 2 ? 'Práctica aceptable' : 'Sesión difícil',
              dispositivo: 'TestSeed',
              versionSchema: '1.0',
              piezaNombre: piezaBase.nombre,
              planNombre: planBase.nombre,
              semanaNombre: 'Semana 1',
              sesionNombre: `Sesión ${String.fromCharCode(65 + i)}`,
              foco
            });

            totalSesiones++;

            // Crear registros de bloques
            let tiempoAcumulado = 0;
            for (let b = 0; b < bloquesSeleccionados.length; b++) {
              const bloque = bloquesSeleccionados[b];
              const esOmitido = Math.random() < 0.15; // 15% omitidos
              const duracionReal = esOmitido ? 0 : (bloque.duracionSeg || 0) + Math.floor((Math.random() * 60) - 30);

              await localDataClient.entities.RegistroBloque.create({
                registroSesionId: registroSesion.id,
                asignacionId: asignacion.id,
                alumnoId: estudiante.id,
                semanaIdx,
                sesionIdx,
                ordenEjecucion: b,
                tipo: bloque.tipo,
                code: bloque.code,
                nombre: bloque.nombre,
                duracionObjetivoSeg: bloque.duracionSeg,
                duracionRealSeg: Math.max(0, duracionReal),
                estado: esOmitido ? 'omitido' : 'completado',
                iniciosPausa: Math.floor(Math.random() * 2),
                inicioISO: new Date(fechaSesion.getTime() + tiempoAcumulado * 1000).toISOString(),
                finISO: new Date(fechaSesion.getTime() + (tiempoAcumulado + duracionReal) * 1000).toISOString()
              });

              tiempoAcumulado += duracionReal;
              totalBloques++;
            }
          }

          // Crear feedback semanal (SOLO texto, sin valoración)
          const notasProfesor = [
            'Excelente progreso esta semana. Sigue mejorando la técnica de respiración.',
            'Buen trabajo general. Recomiendo enfocarte más en la articulación.',
            'Mejora la consistencia en la práctica diaria. Intenta practicar al menos 4 días por semana.',
            'Se nota avance en el control del sonido. Trabaja más en la afinación en el registro agudo.',
            'Práctica sólida esta semana. Continúa con el trabajo de ligaduras.',
            'Necesitas mayor dedicación. Ajusta la embocadura y practica escalas con metrónomo.'
          ];

          await localDataClient.entities.FeedbackSemanal.create({
            asignacionId: asignacion.id,
            alumnoId: estudiante.id,
            profesorId: profesorAsignado.id,
            semanaInicioISO: semanaInicioISO,
            notaProfesor: notasProfesor[Math.floor(Math.random() * notasProfesor.length)]
          });

          totalFeedbacks++;
        }
      }

      const duracion = Date.now() - startTime;
      addLog(`✅ Completado en ${(duracion / 1000).toFixed(1)}s`, 'success');
      addLog(`📊 Resumen: ${estudiantes.length} estudiantes × ${numSemanas} semanas`, 'info');
      addLog(`📊 ${totalSesiones} sesiones, ${totalBloques} bloques, ${totalFeedbacks} feedbacks`, 'info');

      await queryClient.invalidateQueries({ queryKey: ['seedStats'] });
      toast.success(`✅ ${numSemanas} ${numSemanas === 1 ? 'semana' : 'semanas'} generadas`);
    } catch (error) {
      addLog(`❌ Error: ${error.message}`, 'error');
      toast.error('Error al generar semillas');
    }
    setIsSeeding(false);
  };

  const borrarSemillas = async () => {
    if (!window.confirm('⚠️ ¿Eliminar todas las semillas de prueba? No se puede deshacer.')) {
      return;
    }

    setIsSeeding(true);
    clearLogs();
    addLog('🗑️ Eliminando semillas...', 'warning');

    try {
      // Orden: FeedbackSemanal → RegistroBloque → RegistroSesion → Asignacion → Plan → Bloque → Pieza

      const feedbacks = await localDataClient.entities.FeedbackSemanal.list();
      let feedbacksEliminados = 0;
      for (const f of feedbacks) {
        if (f.profesorId === effectiveUser?.id || effectiveUser?.rolPersonalizado === 'ADMIN') {
          await localDataClient.entities.FeedbackSemanal.delete(f.id);
          feedbacksEliminados++;
        }
      }
      addLog(`✅ ${feedbacksEliminados} feedbacks eliminados`, 'info');

      const registrosBloques = await localDataClient.entities.RegistroBloque.list();
      for (const rb of registrosBloques) {
        await localDataClient.entities.RegistroBloque.delete(rb.id);
      }
      addLog(`✅ ${registrosBloques.length} registros de bloques eliminados`, 'info');

      const registrosSesion = await localDataClient.entities.RegistroSesion.list();
      for (const rs of registrosSesion) {
        await localDataClient.entities.RegistroSesion.delete(rs.id);
      }
      addLog(`✅ ${registrosSesion.length} registros de sesión eliminados`, 'info');

      const asignaciones = await localDataClient.entities.Asignacion.list();
      let asignacionesEliminadas = 0;
      for (const a of asignaciones) {
        if (a.profesorId === effectiveUser?.id || effectiveUser?.rolPersonalizado === 'ADMIN') {
          await localDataClient.entities.Asignacion.delete(a.id);
          asignacionesEliminadas++;
        }
      }
      addLog(`✅ ${asignacionesEliminadas} asignaciones eliminadas`, 'info');

      const planes = await localDataClient.entities.Plan.list();
      const planesSeed = planes.filter(p => p.nombre?.startsWith('Seed') && (p.profesorId === effectiveUser?.id || effectiveUser?.rolPersonalizado === 'ADMIN'));
      for (const p of planesSeed) {
        await localDataClient.entities.Plan.delete(p.id);
      }
      addLog(`✅ ${planesSeed.length} planes seed eliminados`, 'info');

      const bloques = await localDataClient.entities.Bloque.list();
      const bloquesSeed = bloques.filter(b => b.code?.includes('SEED') && (b.profesorId === effectiveUser?.id || effectiveUser?.rolPersonalizado === 'ADMIN'));
      for (const b of bloquesSeed) {
        await localDataClient.entities.Bloque.delete(b.id);
      }
      addLog(`✅ ${bloquesSeed.length} ejercicios seed eliminados`, 'info');

      const piezas = await localDataClient.entities.Pieza.list();
      const piezasSeed = piezas.filter(p => p.nombre?.startsWith('Seed') && (p.profesorId === effectiveUser?.id || effectiveUser?.rolPersonalizado === 'ADMIN'));
      for (const p of piezasSeed) {
        await localDataClient.entities.Pieza.delete(p.id);
      }
      addLog(`✅ ${piezasSeed.length} piezas seed eliminadas`, 'info');

      await queryClient.invalidateQueries();
      addLog('✅ Limpieza completada', 'success');
      toast.success('Semillas eliminadas');
    } catch (error) {
      addLog(`❌ Error: ${error.message}`, 'error');
      toast.error('Error al limpiar');
    }
    setIsSeeding(false);
  };


  // ======================== AUDITORÍA PERSONALIZADA ========================
  const ejecutarAuditoria = async () => {
    if (!auditSpec.trim()) {
      toast.error('Escribe una especificación de auditoría');
      return;
    }

    setIsAuditing(true);
    setExpandedFiles(new Set());

    try {
      const config = parseAuditSpec(auditSpec);
      const results = await runAudit(config);

      setAuditResults(results);
      setLastAuditSpec(auditSpec);

      const profileName = Object.entries(QUICK_PROFILES).find(([_, p]) => p.spec === auditSpec)?.[1]?.name || 'Custom';
      addLog(`🔍 Auditoría "${profileName}": ${results.matchesTotal} coincidencias en ${results.filesScanned} archivos (${results.durationMs}ms)`,
        results.matchesTotal > 0 ? 'warning' : 'success');

      if (results.matchesTotal === 0) {
        if (results.reason) {
          toast.warning(results.reason);
        } else {
          toast.success('Auditoría completada: 0 coincidencias');
        }
      } else {
        toast.success(`Auditoría completada: ${results.matchesTotal} coincidencias`);
      }
    } catch (error) {
      addLog(`❌ Error en auditoría: ${error.message}`, 'error');
      toast.error('Error al ejecutar auditoría');
      setAuditResults(null);
    }

    setIsAuditing(false);
  };

  const refrescarAuditoria = () => {
    if (!lastAuditSpec) {
      toast.error('No hay auditoría previa para refrescar');
      return;
    }
    setAuditSpec(lastAuditSpec);
    setTimeout(ejecutarAuditoria, 100);
  };

  const cargarPerfil = (profileKey) => {
    const profile = QUICK_PROFILES[profileKey];
    if (profile) {
      setAuditSpec(profile.spec);
      toast.success(`Perfil cargado: ${profile.name}`);
    }
  };

  const toggleFileExpanded = (path) => {
    const newExpanded = new Set(expandedFiles);
    if (newExpanded.has(path)) {
      newExpanded.delete(path);
    } else {
      newExpanded.add(path);
    }
    setExpandedFiles(newExpanded);
  };

  const exportarAuditoriaCSV = () => {
    if (!auditResults || auditResults.matchesTotal === 0) {
      toast.error('No hay resultados para exportar');
      return;
    }

    const headers = ['Archivo', 'Línea', 'Patrón', 'Coincidencia'];
    const rows = [];

    for (const file of auditResults.perFile) {
      for (const match of file.matches) {
        rows.push([
          file.path,
          match.line.toString(),
          match.pattern,
          match.match
        ]);
      }
    }

    const csv = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `auditoria-${formatLocalDate(new Date())}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    toast.success('CSV exportado');
  };

  // ======================== PRUEBAS ========================
  const ejecutarPruebas = async () => {
    setIsSeeding(true);
    setTestResults([]);
    addLog('🧪 Ejecutando pruebas automáticas...', 'info');

    const tests = [];

    try {
      const { data: freshData } = await refetchStats();
      const data = freshData || stats;

      if (!data) {
        addLog('❌ No se pudieron cargar los datos', 'error');
        toast.error('Error al cargar datos para pruebas');
        setIsSeeding(false);
        return;
      }

      const tiposRequeridos = ['CA', 'CB', 'TC', 'TM', 'FM', 'VC', 'AD'];
      const bloquesSeed = (data.bloques || []).filter(b => b.code?.includes('SEED'));
      const tiposPresentes = new Set(bloquesSeed.map(b => b.tipo));
      const todosLosTipos = tiposRequeridos.every(t => tiposPresentes.has(t));
      tests.push({
        name: 'Ejercicios de 7 tipos',
        passed: todosLosTipos,
        detail: todosLosTipos ? `✓ Todos los tipos presentes` : `✗ Faltan tipos`
      });

      const piezaBase = (data.piezas || []).find(p => p.nombre?.includes('Seed'));
      tests.push({
        name: 'Pieza base generada',
        passed: !!piezaBase,
        detail: piezaBase ? `✓ ${piezaBase.nombre}` : '✗ Sin pieza seed'
      });

      const planBase = (data.planes || []).find(p => p.nombre?.includes('Seed'));
      const planValido = planBase && planBase.semanas && planBase.semanas.length >= 4;
      tests.push({
        name: 'Plan con 4+ semanas',
        passed: planValido,
        detail: planValido ? `✓ ${planBase.semanas.length} semanas` : '✗ Plan inválido'
      });

      const asignacionDemo = (data.asignaciones || []).find(a => 
        (a.estado === 'publicada' || a.estado === 'en_curso') && 
        a.plan?.nombre?.includes('Seed')
      );
      tests.push({
        name: 'Asignación publicada (Seed)',
        passed: !!asignacionDemo,
        detail: asignacionDemo ? `✓ Estado: ${asignacionDemo.estado}` : '✗ Sin asignaciones seed'
      });

      const registroCompleto = (data.registrosSesion || []).find(r => 
        r.finalizada && 
        r.calificacion && 
        r.planNombre?.includes('Seed')
      );
      tests.push({
        name: 'RegistroSesion con feedback (Seed)',
        passed: !!registroCompleto,
        detail: registroCompleto ? `✓ Calificación ${registroCompleto.calificacion}/4` : '✗ Sin registros seed'
      });

      const registrosBloquesSeed = (data.registrosBloques || []).filter(rb => 
        bloquesSeed.some(bs => bs.code === rb.code)
      );
      const tiposEstado = new Set(registrosBloquesSeed.map(rb => rb.estado));
      const estadosVariados = tiposEstado.has('completado') && tiposEstado.has('omitido');
      tests.push({
        name: 'Estados variados en bloques (Seed)',
        passed: estadosVariados,
        detail: estadosVariados ? `✓ Estados: ${Array.from(tiposEstado).join(', ')}` : '✗ Falta variedad'
      });

      const tieneFeedbacks = (data.feedbacks || []).some(f => f.semanaInicioISO && f.asignacionId);
      tests.push({
        name: 'Feedbacks semanales',
        passed: tieneFeedbacks,
        detail: tieneFeedbacks ? `✓ ${data.feedbacks.length} feedbacks` : '✗ Sin feedbacks'
      });

      setTestResults(tests);
      const totalPassed = tests.filter(t => t.passed).length;
      addLog(`✅ Pruebas: ${totalPassed}/${tests.length} exitosas`, totalPassed === tests.length ? 'success' : 'warning');
      toast.success(`Pruebas: ${totalPassed}/${tests.length} exitosas`);
    } catch (error) {
      addLog(`❌ Error en pruebas: ${error.message}`, 'error');
      toast.error('Error al ejecutar pruebas');
    }
    setIsSeeding(false);
  };

  // ======================== AUDITORÍA DE ENLACES ========================
  const auditarEnlaces = async () => {
    setIsSeeding(true);
    addLog('🔗 Auditando enlaces...', 'info');

    try {
      const navigationByRole = {
        ADMIN: [
          { title: "Usuarios", url: "/usuarios" },
          { title: "Asignaciones", url: "/asignaciones" },
          { title: "Plantillas", url: "/plantillas" },
          { title: "Agenda", url: "/agenda" },
          { title: "Estadísticas", url: "/estadisticas" },
          { title: "Tests & Seeds", url: "/testseed" },
          { title: "Importar y Exportar", url: "/import-export" },
        ],
        PROF: [
          { title: "Mis Estudiantes", url: "/estudiantes" },
          { title: "Asignaciones", url: "/asignaciones" },
          { title: "Plantillas", url: "/plantillas" },
          { title: "Agenda", url: "/agenda" },
        ],
        ESTU: [
          { title: "Estudiar Ahora", url: "/hoy" },
          { title: "Mi Semana", url: "/semana" },
          { title: "Mis Estadísticas", url: "/estadisticas" },
        ],
      };

      const todasLasPaginas = [
        "/usuarios", "/asignaciones", "/plantillas", "/agenda", "/testseed", "/estadisticas",
        "/estudiantes", "/hoy", "/semana", "/perfil", "/asignacion-detalle", "/adaptar-asignacion",
        "/import-export"
      ];

      const audit = {
        ADMIN: { pages: navigationByRole.ADMIN, orphans: [] },
        PROF: { pages: navigationByRole.PROF, orphans: [] },
        ESTU: { pages: navigationByRole.ESTU, orphans: [] },
      };

      for (const [rol, config] of Object.entries(audit)) {
        const paginasEnMenu = config.pages.map(p => p.url);
        const huerfanas = todasLasPaginas.filter(p =>
          !paginasEnMenu.includes(p) &&
          !['/perfil', '/asignacion-detalle', '/adaptar-asignacion'].includes(p)
        );
        config.orphans = huerfanas;
      }

      setLinkAudit(audit);
      addLog('✅ Auditoría de enlaces completada', 'success');
      toast.success('Auditoría de enlaces completada');
    } catch (error) {
      addLog(`❌ Error: ${error.message}`, 'error');
      toast.error('Error en auditoría');
    }
    setIsSeeding(false);
  };

  // ======================== REFRESCAR ========================
  const refrescarTodo = async () => {
    setIsRefreshing(true);
    addLog('🔄 Refrescando...', 'info');

    try {
      await queryClient.invalidateQueries();
      await refetchStats();
      await ejecutarPruebas();
      addLog('✅ Datos refrescados', 'success');
      toast.success('Datos refrescados');
    } catch (error) {
      addLog(`❌ Error: ${error.message}`, 'error');
      toast.error('Error al refrescar');
    }
    setIsRefreshing(false);
  };

  // Derived state for KPIs
  const countPiezas = stats?.piezas.length || 0;
  const countPlanes = stats?.planes.length || 0;
  const countBloques = stats?.bloques.length || 0;
  const countAsignaciones = stats?.asignaciones.length || 0;

  // ======================== RENDER ========================
  if (effectiveUser?.rolPersonalizado !== 'ADMIN') {
    return (
      <div className="flex items-center justify-center min-h-[80vh]">
        <Card className="max-w-md app-card">
          <CardContent className="pt-6 text-center space-y-4">
            <Shield className="w-16 h-16 mx-auto text-[var(--color-danger)]" />
            <div>
            <h2 className="font-semibold text-lg text-[var(--color-text-primary)] mb-2">Acceso Denegado</h2>
            <p className="text-[var(--color-text-secondary)]">Esta vista requiere permisos de Administrador.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const tabs = [
    {
      value: 'seeds',
      label: 'Seeds',
      icon: Database,
      content: (
        <div className="space-y-4">
          <Card className="app-card">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Sprout className="w-5 h-5 text-[var(--color-success)]" />
                Semillas Realistas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-[var(--color-text-secondary)]">
                Genera datos de prueba realistas para todos los estudiantes existentes.
              </p>
              <Alert className="rounded-xl border-[var(--color-info)]/20 bg-[var(--color-info)]/10">
                <AlertTriangle className="h-4 w-4 text-[var(--color-info)]" />
                <AlertDescription className="text-xs text-[var(--color-text-primary)]">
                  <strong>Importante:</strong> Usa estudiantes existentes. Crea usuarios con rol ESTU antes de semillar.
                </AlertDescription>
              </Alert>
              <div className={componentStyles.layout.grid3}>
                <Button
                  variant="primary"
                  onClick={() => generarSemillasRealistas(1)}
                  loading={isSeeding}
                  className={`w-full ${componentStyles.buttons.primary}`}
                  aria-label="Generar 1 semana de semillas realistas"
                >
                  <Zap className="w-4 h-4 mr-2" />
                  1 Semana
                </Button>
                <Button
                  variant="primary"
                  onClick={() => generarSemillasRealistas(3)}
                  loading={isSeeding}
                  className={`w-full ${componentStyles.buttons.primary}`}
                  aria-label="Generar 3 semanas de semillas realistas"
                >
                  <Sprout className="w-4 h-4 mr-2" />
                  3 Semanas
                </Button>
                <Button
                  variant="outline"
                  onClick={refrescarTodo}
                  loading={isRefreshing}
                  disabled={isSeeding}
                  className={`w-full ${componentStyles.buttons.outline}`}
                  aria-label="Actualizar datos y ejecutar pruebas"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Actualizar
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="app-card">
            <CardHeader>
              <CardTitle className="text-[var(--color-danger)] flex items-center gap-2">
                <Trash2 className="w-5 h-5" />
                Limpiar Datos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-ui/80 mb-4">
                ⚠️ Elimina todas las semillas de prueba (asignaciones, registros, feedbacks, plantillas seed).
              </p>
              <Button
                variant="danger"
                onClick={borrarSemillas}
                loading={isSeeding}
                className={`w-full ${componentStyles.buttons.danger}`}
                aria-label="Borrar todas las semillas de prueba"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Borrar Semillas
              </Button>
            </CardContent>
          </Card>
        </div>
      )
    },
    {
      value: 'tests',
      label: 'Tests',
      icon: PlayCircle,
      content: (
        <Card className="app-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-[var(--color-primary)]" />
                Pruebas Automáticas
              </CardTitle>
              <Button
                variant="primary"
                onClick={ejecutarPruebas}
                loading={isSeeding}
                size="sm"
                className={componentStyles.buttons.primary}
                aria-label="Ejecutar pruebas"
              >
                Ejecutar
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {testResults.length === 0 ? (
              <div className="text-center py-8 text-[var(--color-text-secondary)]">
                <AlertCircle className="w-12 h-12 mx-auto mb-3 icon-empty" />
                <p>Ejecuta las pruebas</p>
              </div>
            ) : (
              <div className="space-y-2">
                {testResults.map((test, idx) => (
                  <div key={idx} className={`flex items-start gap-3 p-3 rounded-xl border ${test.passed ? 'bg-[var(--color-success)]/10 border-[var(--color-success)]/20' : 'bg-[var(--color-danger)]/10 border-[var(--color-danger)]/20'}`}>
                    {test.passed ?
                      <CheckCircle2 className="w-5 h-5 text-[var(--color-success)] shrink-0 mt-0.5" /> :
                      <XCircle className="w-5 h-5 text-[var(--color-danger)] shrink-0 mt-0.5" />
                    }
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-[var(--color-text-primary)]">{test.name}</p>
                      <p className="text-xs text-[var(--color-text-secondary)]">{test.detail}</p>
                    </div>
                  </div>
                ))}
                <div className="pt-3 border-t border-[var(--color-border-default)]">
                  <Badge className={`rounded-full ${testResults.every(t => t.passed) ? componentStyles.status.badgeSuccess + ' text-[var(--color-text-inverse)]' : componentStyles.status.badgeWarning + ' text-[var(--color-text-inverse)]'}`}>
                    {testResults.filter(t => t.passed).length}/{testResults.length} exitosas
                  </Badge>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )
    },
    {
      value: 'links',
      label: 'Links',
      icon: Link2,
      content: (
        <Card className="app-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <LinkIcon className="w-5 h-5 text-[var(--color-primary)]" />
                Auditoría de Enlaces
              </CardTitle>
              <Button
                variant="primary"
                onClick={auditarEnlaces}
                loading={isSeeding}
                className={componentStyles.buttons.primary}
                aria-label="Auditar enlaces"
              >
                Auditar
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {!linkAudit ? (
              <div className="text-center py-8 text-[var(--color-text-secondary)]">
                <LinkIcon className="w-12 h-12 mx-auto mb-3 icon-empty" />
                <p>Ejecuta la auditoría</p>
              </div>
            ) : (
              <div className="space-y-4">
                {Object.entries(linkAudit).map(([rol, data]) => (
                  <div key={rol} className="app-panel p-4">
                    <h3 className="font-bold text-lg text-[var(--color-text-primary)] mb-3">{rol}</h3>
                    <div className="space-y-2">
                      <div>
                        <p className="text-sm font-semibold text-[var(--color-text-primary)]">Páginas en menú:</p>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {data.pages.map(p => (
                            <Badge key={p.url} variant="outline" className="text-xs rounded-full">
                              {p.title}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      {data.orphans.length > 0 && (
                        <div className="pt-2 border-t border-[var(--color-border-default)]">
                          <p className="text-sm font-semibold text-[var(--color-warning)] flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4" />
                            Páginas huérfanas:
                          </p>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {data.orphans.map(url => (
                              <Badge key={url} className={`${componentStyles.status.badgeWarning} text-xs rounded-full`}>
                                {url}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )
    },
    {
      value: 'audit',
      label: 'Audit',
      icon: Search,
      content: (
        <Card className="app-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSearch className="w-5 h-5 text-[var(--color-primary)]" />
              Auditoría Personalizada
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block text-[var(--color-text-primary)]">
                Especificación de auditoría (DSL)
              </label>
              <Textarea
                value={auditSpec}
                onChange={(e) => setAuditSpec(e.target.value)}
                placeholder="pattern: toISOString\s*\(&#10;include: /src/**/*.{js,jsx}&#10;exclude: **/node_modules/**"
                rows={6}
                className={`font-mono text-xs ${componentStyles.controls.inputDefault}`}
                aria-label="Especificación de auditoría"
              />
            </div>

            <div>
              <p className="text-sm font-medium mb-2 text-[var(--color-text-primary)]">Perfiles rápidos:</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(QUICK_PROFILES).map(([key, profile]) => (
                  <Button
                    key={key}
                    variant="outline"
                    size="sm"
                    onClick={() => cargarPerfil(key)}
                    className={`text-xs ${componentStyles.buttons.outline}`}
                    aria-label={`Cargar perfil ${profile.name}`}
                  >
                    {profile.name}
                  </Button>
                ))}
              </div>
            </div>

            <div className="flex gap-2 flex-wrap">
              <Button
                variant="primary"
                onClick={ejecutarAuditoria}
                loading={isAuditing}
                className={componentStyles.buttons.primary}
                aria-label="Ejecutar auditoría"
              >
                <Search className="w-4 h-4 mr-2" />
                Ejecutar
              </Button>
              <Button
                onClick={refrescarAuditoria}
                disabled={!lastAuditSpec || isAuditing}
                variant="outline"
                className={componentStyles.buttons.outline}
                aria-label="Refrescar auditoría"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refrescar
              </Button>
              {auditResults && auditResults.matchesTotal > 0 && (
                <Button
                  onClick={exportarAuditoriaCSV}
                  variant="outline"
                  className={componentStyles.buttons.outline}
                  aria-label="Exportar resultados a CSV"
                >
                  <FileDown className="w-4 h-4 mr-2" />
                  Exportar CSV
                </Button>
              )}
            </div>

            {auditResults && (
              <div className="pt-4 border-t border-[var(--color-border-default)]">
                <div className="flex items-center gap-4 text-sm flex-wrap">
                  <span className="text-[var(--color-text-primary)]">
                    <strong>Archivos:</strong> {auditResults.filesScanned}
                  </span>
                  <span className="text-[var(--color-text-primary)]">
                    <strong>Coincidencias:</strong> {auditResults.matchesTotal}
                  </span>
                  <span className="text-[var(--color-text-secondary)]">
                    <Clock className="w-3 h-3 inline mr-1" />
                    {auditResults.durationMs}ms
                  </span>
                </div>

                {auditResults.reason && (
                  <Alert className="mt-3 rounded-xl border-[var(--color-warning)]/20 bg-[var(--color-warning)]/10">
                    <AlertTriangle className="h-4 w-4 text-[var(--color-warning)]" />
                    <AlertDescription className="text-[var(--color-text-primary)] text-sm">
                      <strong>{auditResults.reason}</strong>
                      <details className="mt-2 text-xs">
                        <summary className="cursor-pointer">Ver configuración aplicada</summary>
                        <div className="mt-2 space-y-1">
                          <div><strong>Includes:</strong> {auditResults.compiled.includes.join(', ')}</div>
                          <div><strong>Excludes:</strong> {auditResults.compiled.excludes.join(', ')}</div>
                          <div><strong>Patterns:</strong> {auditResults.compiled.patterns.length}</div>
                        </div>
                      </details>
                    </AlertDescription>
                  </Alert>
                )}

                {auditResults.perFile && auditResults.perFile.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <p className="text-sm font-semibold text-[var(--color-text-primary)]">Resultados por archivo:</p>
                    {auditResults.perFile.map((file, idx) => (
                      <Card key={idx} className="app-panel">
                        <CardHeader
                          className="cursor-pointer hover:bg-[var(--color-surface-muted)] py-3 rounded-t-xl"
                          onClick={() => toggleFileExpanded(file.path)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {expandedFiles.has(file.path) ? (
                                <ChevronDown className="w-4 h-4 text-[var(--color-text-secondary)]" />
                              ) : (
                                <ChevronRight className="w-4 h-4 text-[var(--color-text-secondary)]" />
                              )}
                              <span className="font-mono text-sm text-[var(--color-primary)] break-all">{file.path}</span>
                            </div>
                            <Badge variant="outline" className={`${componentStyles.status.badgeWarning} shrink-0 ml-2 rounded-full`}>
                              {file.matches.length}
                            </Badge>
                          </div>
                        </CardHeader>
                        {expandedFiles.has(file.path) && (
                          <CardContent className="pt-0 space-y-3">
                            {file.matches.map((match, mIdx) => (
                              <div key={mIdx} className="border-l-2 border-[var(--color-border-default)] pl-3 pb-2">
                                <div className="flex items-baseline gap-2 mb-1">
                                  <span className="text-xs text-[var(--color-text-secondary)]">Línea {match.line}</span>
                                  <span className="text-xs text-[var(--color-text-secondary)]">• Patrón: <code className="bg-[var(--color-surface-muted)] px-1 rounded">{match.pattern}</code></span>
                                </div>
                                <pre className="bg-[var(--color-surface-muted)] rounded-xl p-2 text-xs overflow-x-auto">
                                  <code>
                                    {match.context.before && (
                                      <div className="text-[var(--color-text-secondary)]">{match.context.before}</div>
                                    )}
                                    <div>
                                      {match.context.current.substring(0, match.start)}
                                      <mark className="bg-[var(--color-warning)]/30 font-semibold">
                                        {match.context.current.substring(match.start, match.end)}
                                      </mark>
                                      {match.context.current.substring(match.end)}
                                    </div>
                                    {match.context.after && (
                                      <div className="text-[var(--color-text-secondary)]">{match.context.after}</div>
                                    )}
                                  </code>
                                </pre>
                              </div>
                            ))}
                          </CardContent>
                        )}
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )
    },
    {
      value: 'logs',
      label: 'Logs',
      icon: ScrollText,
      content: (
        <Card className="app-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-[var(--color-primary)]" />
                Logs
              </CardTitle>
              <Button
                onClick={clearLogs}
                variant="outline"
                size="sm"
                className={`h-9 ${componentStyles.buttons.outline}`}
                aria-label="Limpiar logs"
              >
                Limpiar
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {seedLogs.length === 0 ? (
              <div className="text-center py-8 text-[var(--color-text-secondary)]">
                <p>No hay logs aún</p>
              </div>
            ) : (
              <div className="space-y-1 max-h-96 overflow-y-auto">
                {seedLogs.map((log, idx) => (
                  <div key={idx} className={`text-sm font-mono p-2 rounded-xl ${
                    log.type === 'success' ? 'bg-[var(--color-success)]/10 text-[var(--color-success)]' :
                    log.type === 'error' ? 'bg-[var(--color-danger)]/10 text-[var(--color-danger)]' :
                    log.type === 'warning' ? 'bg-[var(--color-warning)]/10 text-[var(--color-warning)]' :
                    'bg-[var(--color-surface-muted)] text-[var(--color-text-primary)]'
                  }`}>
                    <span className="text-[var(--color-text-secondary)] mr-2">[{log.timestamp}]</span>
                    {log.message}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        icon={Settings}
        title="Tests & Seeds"
        subtitle="Semillas de datos, pruebas y utilidades"
      />

      <div className={`${componentStyles.layout.page} space-y-6`}>
        <div className={componentStyles.layout.grid4}>
          <Card className="app-card hover:shadow-md transition-shadow">
            <CardContent className="pt-4 text-center">
              <Music className="w-6 h-6 mx-auto mb-2 text-[var(--color-primary)]" />
              <p className="text-2xl font-bold text-[var(--color-text-primary)]">{countPiezas}</p>
              <p className="text-xs text-[var(--color-text-secondary)]">Piezas</p>
            </CardContent>
          </Card>

          <Card className="app-card hover:shadow-md transition-shadow">
            <CardContent className="pt-4 text-center">
              <Calendar className="w-6 h-6 mx-auto mb-2 text-[var(--color-info)]" />
              <p className="text-2xl font-bold text-[var(--color-text-primary)]">{countPlanes}</p>
              <p className="text-xs text-[var(--color-text-secondary)]">Planes</p>
            </CardContent>
          </Card>

          <Card className="app-card hover:shadow-md transition-shadow">
            <CardContent className="pt-4 text-center">
              <Layers className="w-6 h-6 mx-auto mb-2 text-[var(--color-primary)]" />
              <p className="text-2xl font-bold text-[var(--color-text-primary)]">{countBloques}</p>
              <p className="text-xs text-[var(--color-text-secondary)]">Ejercicios</p>
            </CardContent>
          </Card>

          <Card className="app-card hover:shadow-md transition-shadow">
            <CardContent className="pt-4 text-center">
              <Target className="w-6 h-6 mx-auto mb-2 text-[var(--color-primary)]" />
              <p className="text-2xl font-bold text-[var(--color-text-primary)]">{countAsignaciones}</p>
              <p className="text-xs text-[var(--color-text-secondary)]">Asignaciones</p>
            </CardContent>
          </Card>
        </div>

        <Tabs
          variant="segmented"
          value={activeTab}
          onChange={setActiveTab}
          items={tabs}
        />
      </div>
    </div>
  );
}
