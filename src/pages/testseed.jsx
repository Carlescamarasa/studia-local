
import React, { useState } from "react";
import { localDataClient } from "@/api/localDataClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
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
  Calendar, Layers, MessageSquare, Activity,
  FlaskConical, Download, Upload, Play, FileText, Link as LinkIcon
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ds";
import { toast } from "sonner";
import { formatLocalDate, parseLocalDate, displayName, calcularOffsetSemanas, useEffectiveUser, getNombreVisible, startOfMonday } from "../components/utils/helpers";
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

  // ======================== CREAR USUARIOS DE PRUEBA ========================
  const crearUsuariosPrueba = async () => {
    setIsSeeding(true);
    clearLogs();
    addLog('👥 Creando usuarios de prueba...', 'info');

    try {
      const dataSource = import.meta.env.VITE_DATA_SOURCE || 'local';
      if (dataSource !== 'remote') {
        addLog('⚠️ Esta función solo funciona en modo remoto (Supabase)', 'warning');
        toast.error('Solo disponible en modo remoto');
        setIsSeeding(false);
        return;
      }

      // Verificar autenticación
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        addLog('⚠️ No hay sesión de Supabase activa', 'warning');
        toast.error('Debes estar autenticado para crear usuarios');
        setIsSeeding(false);
        return;
      }

      addLog('✓ Sesión de Supabase activa', 'info');

      // Obtener usuarios existentes para verificar duplicados
      const usuariosExistentes = await localDataClient.entities.User.list();
      const emailsExistentes = new Set(usuariosExistentes.map(u => u.email?.toLowerCase()));

      // Crear 2 profesores
      const profesores = [
        { nombre: 'Profesor Prueba 1', email: 'prof1@test.studia', role: 'PROF' },
        { nombre: 'Profesor Prueba 2', email: 'prof2@test.studia', role: 'PROF' }
      ];

      // Crear 5 estudiantes
      const estudiantes = [
        { nombre: 'Estudiante Prueba 1', email: 'estudiante1@test.studia', role: 'ESTU' },
        { nombre: 'Estudiante Prueba 2', email: 'estudiante2@test.studia', role: 'ESTU' },
        { nombre: 'Estudiante Prueba 3', email: 'estudiante3@test.studia', role: 'ESTU' },
        { nombre: 'Estudiante Prueba 4', email: 'estudiante4@test.studia', role: 'ESTU' },
        { nombre: 'Estudiante Prueba 5', email: 'estudiante5@test.studia', role: 'ESTU' }
      ];

      const usuariosACrear = [...profesores, ...estudiantes];
      let creados = 0;
      let saltados = 0;
      const profesoresCreados = [];

      for (const usuario of usuariosACrear) {
        const emailLower = usuario.email.toLowerCase();
        if (emailsExistentes.has(emailLower)) {
          addLog(`⚠️ Usuario ${usuario.email} ya existe. Saltando.`, 'warning');
          saltados++;
          // Si es profesor, añadirlo a la lista de profesores disponibles
          const usuarioExistente = usuariosExistentes.find(u => u.email?.toLowerCase() === emailLower);
          if (usuarioExistente && usuarioExistente.rolPersonalizado === 'PROF') {
            profesoresCreados.push(usuarioExistente.id);
          }
          continue;
        }

        try {
          addLog(`📝 Creando usuario ${usuario.nombre} (${usuario.email})...`, 'info');
          
          // Crear usuario usando signUp
          // Nota: Requiere que la confirmación de email esté deshabilitada en Supabase
          // o que uses Admin API con service_role key
          const { data: authData, error: authError } = await supabase.auth.signUp({
            email: usuario.email,
            password: 'TestPassword123!', // Contraseña temporal
            options: {
              data: {
                full_name: usuario.nombre,
                role: usuario.role
              },
              emailRedirectTo: undefined
            }
          });

          if (authError) {
            // Si el usuario ya existe, intentar obtenerlo
            const errorMessage = authError.message?.toLowerCase() || '';
            const errorCode = authError.code || authError.status || '';
            const isAlreadyExists = 
              errorMessage.includes('already registered') || 
              errorMessage.includes('already exists') || 
              errorMessage.includes('user already registered') ||
              errorMessage.includes('email address is already') ||
              errorCode === 'signup_disabled' ||
              authError.status === 400; // 400 puede ser usuario existente o email no confirmado
            
            if (isAlreadyExists) {
              addLog(`ℹ️ Usuario ${usuario.email} ya existe o está deshabilitado. Obteniendo información...`, 'info');
              const usuariosActualizados = await localDataClient.entities.User.list();
              const usuarioExistente = usuariosActualizados.find(u => u.email?.toLowerCase() === emailLower);
              if (usuarioExistente) {
                addLog(`✅ Usuario ${usuario.email} ya existe y está disponible`, 'success');
                creados++;
                if (usuario.role === 'PROF') {
                  profesoresCreados.push(usuarioExistente.id);
                }
                continue;
              } else {
                addLog(`⚠️ Usuario ${usuario.email} no se pudo crear (error: ${authError.message || errorCode}), pero no se encontró en la base de datos. Saltando...`, 'warning');
                continue;
              }
            }
            addLog(`❌ Error al crear usuario ${usuario.email}: ${authError.message}`, 'error');
            addLog(`💡 Nota: Si falla, puede requerir confirmación de email. Verifica la configuración de Supabase.`, 'info');
            continue;
          }

          if (authData?.user) {
            addLog(`✅ Usuario ${usuario.email} creado en auth.users (ID: ${authData.user.id})`, 'success');
            
            // Actualizar el perfil con los datos correctos
            const { error: updateError } = await supabase
              .from('profiles')
              .update({
                full_name: usuario.nombre,
                role: usuario.role,
                is_active: true
              })
              .eq('id', authData.user.id);

            if (updateError) {
              addLog(`⚠️ Error al actualizar perfil: ${updateError.message}. Verificando si existe...`, 'warning');
              // Verificar si el perfil existe
              const { data: perfilExistente } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', authData.user.id)
                .single();
              
              if (perfilExistente) {
                addLog(`✅ Perfil encontrado para ${usuario.email}`, 'success');
                creados++;
                if (usuario.role === 'PROF') {
                  profesoresCreados.push(authData.user.id);
                }
              } else {
                addLog(`⚠️ Perfil no encontrado. Puede requerir creación manual.`, 'warning');
              }
            } else {
              addLog(`✅ Perfil actualizado para ${usuario.email}`, 'success');
              creados++;
              
              if (usuario.role === 'PROF') {
                profesoresCreados.push(authData.user.id);
              }
            }
          } else if (authData?.user === null && !authError) {
            // Usuario creado pero requiere confirmación de email
            addLog(`⚠️ Usuario ${usuario.email} creado pero requiere confirmación de email.`, 'warning');
            addLog(`💡 Verifica tu email o deshabilita la confirmación de email en Supabase para usuarios de prueba.`, 'info');
          }
        } catch (error) {
          addLog(`❌ Error al crear usuario ${usuario.email}: ${error.message}`, 'error');
          console.error('Error completo:', error);
        }
      }

      // Asignar estudiantes a profesores aleatoriamente
      if (profesoresCreados.length > 0) {
        addLog('📝 Asignando estudiantes a profesores...', 'info');
        const estudiantesCreados = await localDataClient.entities.User.list();
        const estudiantesParaAsignar = estudiantesCreados.filter(u => 
          u.rolPersonalizado === 'ESTU' && 
          estudiantes.some(e => e.email.toLowerCase() === u.email?.toLowerCase())
        );

        for (const estudiante of estudiantesParaAsignar) {
          if (!estudiante.profesorAsignadoId) {
            const profesorAleatorio = profesoresCreados[Math.floor(Math.random() * profesoresCreados.length)];
            try {
              await localDataClient.entities.User.update(estudiante.id, {
                profesorAsignadoId: profesorAleatorio
              });
              addLog(`✅ Estudiante ${estudiante.email} asignado a profesor`, 'success');
            } catch (error) {
              addLog(`⚠️ Error al asignar profesor: ${error.message}`, 'warning');
            }
          }
        }
      }

      // Invalidar y refrescar queries
      await queryClient.invalidateQueries({ queryKey: ['users'] });
      await queryClient.invalidateQueries({ queryKey: ['allUsers'] });
      await queryClient.refetchQueries({ queryKey: ['users'] });

      addLog(`✅ Completado: ${creados} usuarios creados, ${saltados} saltados`, 'success');
      toast.success(`${creados} usuarios de prueba creados`);
    } catch (error) {
      addLog(`❌ Error general: ${error.message}`, 'error');
      toast.error(`Error al crear usuarios: ${error.message}`);
    }
    setIsSeeding(false);
  };

  // ======================== SEMILLAS REALISTAS ========================
  const generarSemillasRealistas = async (numSemanas, fechaInicio = null, fechaFin = null) => {
    setIsSeeding(true);
    clearLogs();
    
    // Determinar el modo de generación
    let semanasParaGenerar = [];
    let descripcion = '';
    
    if (fechaInicio && fechaFin) {
      // Modo rango de fechas: generar todas las semanas en el rango
      const inicio = startOfMonday(fechaInicio);
      const fin = startOfMonday(fechaFin);
      
      // Calcular todas las semanas entre inicio y fin
      let fechaActual = new Date(inicio);
      while (fechaActual <= fin) {
        semanasParaGenerar.push(new Date(fechaActual));
        fechaActual.setDate(fechaActual.getDate() + 7);
      }
      
      descripcion = `desde ${formatLocalDate(inicio)} hasta ${formatLocalDate(fin)} (${semanasParaGenerar.length} semanas)`;
      addLog(`🌱 Iniciando generación de semillas realistas ${descripcion}...`, 'info');
    } else {
      // Modo hacia atrás: generar desde ahora hacia atrás
      const hoy = new Date();
      const lunesActual = new Date(hoy);
      lunesActual.setDate(lunesActual.getDate() - (lunesActual.getDay() + 6) % 7);
      
      for (let offsetSemana = -(numSemanas - 1); offsetSemana <= 0; offsetSemana++) {
        const lunesSemana = new Date(lunesActual);
        lunesSemana.setDate(lunesSemana.getDate() + (offsetSemana * 7));
        semanasParaGenerar.push(lunesSemana);
      }
      
      descripcion = `${numSemanas} ${numSemanas === 1 ? 'semana' : 'semanas'}`;
      addLog(`🌱 Iniciando generación de ${descripcion} realistas...`, 'info');
    }

    try {
      // Validar que se está usando modo remoto
      const dataSource = import.meta.env.VITE_DATA_SOURCE || 'local';
      if (dataSource !== 'remote') {
        addLog('⚠️ Advertencia: No se detectó modo remoto. Asegúrate de que VITE_DATA_SOURCE=remote', 'warning');
      } else {
        addLog('✓ Modo remoto detectado (Supabase)', 'info');
        
        // Verificar autenticación de Supabase
        try {
          const { data: { session }, error: sessionError } = await supabase.auth.getSession();
          if (sessionError) {
            addLog(`⚠️ Error al verificar sesión: ${sessionError.message}`, 'warning');
          } else if (!session) {
            addLog('⚠️ No hay sesión de Supabase activa. Las políticas RLS pueden bloquear las inserciones.', 'warning');
          } else {
            addLog(`✓ Sesión de Supabase activa para usuario: ${session.user.email}`, 'info');
            addLog(`✓ User ID: ${session.user.id}`, 'info');
          }
        } catch (authError) {
          addLog(`⚠️ Error al verificar autenticación: ${authError.message}`, 'warning');
        }
      }

      const startTime = Date.now();
      addLog('📋 Obteniendo lista de usuarios...', 'info');
      const usuarios = await localDataClient.entities.User.list();
      const estudiantes = usuarios.filter(u => u.rolPersonalizado === 'ESTU');
      const profesores = usuarios.filter(u => u.rolPersonalizado === 'PROF');

      if (estudiantes.length === 0) {
        addLog('❌ No hay estudiantes. Crea usuarios con rol ESTU primero.', 'error');
        toast.error('No hay estudiantes en el sistema');
        setIsSeeding(false);
        return;
      }

      // Las asignaciones DEBEN asignarse a un usuario tipo PROF, nunca a ADMIN
      if (profesores.length === 0) {
        addLog('❌ No hay profesores disponibles. Las asignaciones deben asignarse a usuarios tipo PROF. Crea usuarios con rol PROF primero.', 'error');
        toast.error('No hay profesores en el sistema. Crea usuarios con rol PROF primero.');
        setIsSeeding(false);
        return;
      }

      let profesor = profesores[0];
      addLog(`✓ Usando profesor: ${getNombreVisible(profesor)} (${profesor.email})`, 'info');
      
      // En modo remoto, verificar que el profesor_id coincida con auth.uid() para RLS
      if (dataSource === 'remote') {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            const usuarioAutenticado = usuarios.find(u => u.id === session.user.id);
            // Solo usar usuario autenticado si es PROF (nunca ADMIN)
            if (usuarioAutenticado && usuarioAutenticado.rolPersonalizado === 'PROF') {
              profesor = usuarioAutenticado;
              addLog(`✓ Usando usuario autenticado como profesor: ${profesor.email} (PROF)`, 'info');
            } else if (usuarioAutenticado && usuarioAutenticado.rolPersonalizado === 'ADMIN') {
              addLog(`⚠️ El usuario autenticado es ADMIN. Las asignaciones deben asignarse a PROF. Usando primer profesor disponible: ${profesor.email}`, 'warning');
            } else if (session.user.id !== profesor.id) {
              addLog(`⚠️ ADVERTENCIA: profesor_id (${profesor.id}) no coincide con auth.uid() (${session.user.id}). Las políticas RLS pueden bloquear las inserciones.`, 'warning');
              addLog(`💡 Solución: Inicia sesión con un usuario tipo PROF`, 'info');
            } else {
              addLog(`✓ profesor_id coincide con auth.uid() - RLS debería permitir las inserciones`, 'info');
            }
          }
        } catch (authError) {
          addLog(`⚠️ Error al verificar coincidencia de IDs: ${authError.message}`, 'warning');
        }
      }

      let piezas = await localDataClient.entities.Pieza.list();
      
      // Definir múltiples piezas variadas para más realismo
      const piezasSeed = [
        {
          nombre: 'Seed – Estudio en Do Mayor',
          descripcion: 'Estudio clásico para desarrollar técnica y musicalidad',
          nivel: 'principiante',
          tiempoObjetivoSeg: 900,
          elementos: [
            { nombre: 'Partitura completa', mediaLinks: ['https://upload.wikimedia.org/wikipedia/commons/thumb/7/74/Music_notes.svg/800px-Music_notes.svg.png'] },
            { nombre: 'Grabación de referencia', mediaLinks: ['https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3'] }
          ]
        },
        {
          nombre: 'Seed – Concierto en Re Menor',
          descripcion: 'Obra de nivel intermedio con pasajes técnicos',
          nivel: 'intermedio',
          tiempoObjetivoSeg: 1200,
          elementos: [
            { nombre: 'Introducción', mediaLinks: ['https://www.youtube.com/watch?v=dQw4w9WgXcQ'] },
            { nombre: 'Tema Principal', mediaLinks: ['https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3'] },
            { nombre: 'Partitura', mediaLinks: ['https://upload.wikimedia.org/wikipedia/commons/thumb/7/74/Music_notes.svg/800px-Music_notes.svg.png'] }
          ]
        },
        {
          nombre: 'Seed – Sonata Clásica',
          descripcion: 'Pieza avanzada con estructura sonata completa',
          nivel: 'avanzado',
          tiempoObjetivoSeg: 1800,
          elementos: [
            { nombre: 'Exposición', mediaLinks: ['https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3'] },
            { nombre: 'Desarrollo', mediaLinks: ['https://upload.wikimedia.org/wikipedia/commons/thumb/7/74/Music_notes.svg/800px-Music_notes.svg.png'] },
            { nombre: 'Recapitulación', mediaLinks: ['https://www.youtube.com/watch?v=dQw4w9WgXcQ'] }
          ]
        },
        {
          nombre: 'Seed – Estudio de Velocidad',
          descripcion: 'Ejercicio técnico para mejorar agilidad y precisión',
          nivel: 'intermedio',
          tiempoObjetivoSeg: 600,
          elementos: [
            { nombre: 'Ejercicios progresivos', mediaLinks: ['https://upload.wikimedia.org/wikipedia/commons/thumb/7/74/Music_notes.svg/800px-Music_notes.svg.png'] },
            { nombre: 'Metrónomo', mediaLinks: ['https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3'] }
          ]
        },
        {
          nombre: 'Seed – Melodía Expresiva',
          descripcion: 'Pieza para desarrollar fraseo y expresión musical',
          nivel: 'principiante',
          tiempoObjetivoSeg: 750,
          elementos: [
            { nombre: 'Partitura', mediaLinks: ['https://upload.wikimedia.org/wikipedia/commons/thumb/7/74/Music_notes.svg/800px-Music_notes.svg.png'] },
            { nombre: 'Interpretación de referencia', mediaLinks: ['https://www.youtube.com/watch?v=dQw4w9WgXcQ'] }
          ]
        }
      ];

      // Crear piezas que no existan (siempre agregar a piezasCreadas aunque ya existan)
      const piezasCreadas = [];
      for (const piezaData of piezasSeed) {
        let piezaExistente = piezas.find(p => p.nombre === piezaData.nombre);
        if (!piezaExistente) {
          addLog(`📝 Creando pieza: ${piezaData.nombre}...`, 'info');
          try {
            piezaExistente = await localDataClient.entities.Pieza.create({
              ...piezaData,
              profesorId: profesor.id,
            });
            addLog(`✅ Pieza creada: ${piezaData.nombre}`, 'success');
          } catch (error) {
            const errorMsg = error?.message || error?.toString() || 'Error desconocido';
            const errorDetails = error?.details || error?.hint || '';
            addLog(`❌ Error al crear pieza ${piezaData.nombre}: ${errorMsg}${errorDetails ? ` - ${errorDetails}` : ''}`, 'error');
            console.error('Error completo al crear pieza:', error);
            // Continuar con la siguiente pieza en lugar de fallar completamente
            continue;
          }
        } else {
          addLog(`ℹ️ Pieza ya existe: ${piezaData.nombre}`, 'info');
        }
        // IMPORTANTE: Siempre agregar a piezasCreadas aunque ya exista
        if (piezaExistente) {
          piezasCreadas.push(piezaExistente);
        }
      }

      // Actualizar lista de piezas
      piezas = await localDataClient.entities.Pieza.list();
      
      // Si no hay piezas creadas, usar la primera disponible o crear una básica
      if (piezasCreadas.length === 0) {
        const piezaDisponible = piezas.find(p => p.profesorId === profesor.id);
        if (piezaDisponible) {
          piezasCreadas.push(piezaDisponible);
        } else {
          // Crear una pieza básica de emergencia
          try {
            const piezaEmergencia = await localDataClient.entities.Pieza.create({
          nombre: 'Seed – Estudio base',
          descripcion: 'Pieza de referencia para generación de datos de prueba',
          nivel: 'intermedio',
          tiempoObjetivoSeg: 1200,
          elementos: [
                { nombre: 'Partitura', mediaLinks: ['https://upload.wikimedia.org/wikipedia/commons/thumb/7/74/Music_notes.svg/800px-Music_notes.svg.png'] }
          ],
          profesorId: profesor.id,
          });
            piezasCreadas.push(piezaEmergencia);
            addLog('✅ Pieza de emergencia creada', 'success');
        } catch (error) {
            addLog(`❌ Error crítico al crear pieza de emergencia: ${error.message}`, 'error');
          throw error;
          }
        }
      }

      let bloques = await localDataClient.entities.Bloque.list();
      const tiposRequeridos = ['CA', 'CB', 'TC', 'TM', 'FM', 'VC', 'AD'];
      const ejerciciosBase = {};

      // Nombres variados para cada tipo de ejercicio (múltiples opciones)
      const nombresVariados = {
        CA: ['Respiración Profunda', 'Calentamiento de Embocadura', 'Ejercicios de Respiración', 'Preparación Técnica', 'Calentamiento Respiratorio'],
        CB: ['Escalas Básicas', 'Calentamiento de Dedos', 'Ejercicios de Agilidad', 'Técnica Fundamental', 'Ejercicios de Velocidad'],
        TC: ['Ligaduras Avanzadas', 'Técnica de Articulación', 'Ejercicios de Control', 'Práctica Técnica', 'Técnica de Precisión'],
        TM: ['Mantenimiento de Técnica', 'Ejercicios de Consistencia', 'Técnica de Refuerzo', 'Práctica de Mantenimiento', 'Refuerzo Técnico'],
        FM: ['Fragmento Principal', 'Pasaje Musical', 'Sección de la Pieza', 'Fragmento de Estudio', 'Pasaje de la Obra'],
        VC: ['Relajación Final', 'Vuelta a la Calma', 'Ejercicios de Respiración Final', 'Cierre de Sesión', 'Relajación Post-Práctica'],
        AD: ['Recordatorio Postura', 'Nota Importante', 'Aviso Técnico', 'Recomendación', 'Punto de Atención']
      };

      const duracionesBase = {
        CA: [240, 300, 360],
        CB: [300, 360, 420],
        TC: [420, 480, 540],
        TM: [300, 360, 420],
        FM: [540, 600, 660],
        VC: [180, 240, 300],
        AD: [0]
      };

      // Crear múltiples variantes de cada tipo (2-3 por tipo)
      for (const tipo of tiposRequeridos) {
        const ejerciciosDelTipo = [];
        const nombresDisponibles = nombresVariados[tipo];
        const duracionesDisponibles = duracionesBase[tipo];
        const numVariantes = tipo === 'AD' ? 1 : 3; // AD solo necesita 1 variante

        for (let variante = 1; variante <= numVariantes; variante++) {
          const code = `${tipo}-SEED-${String(variante).padStart(3, '0')}`;
          let ejercicio = bloques.find(b => b.tipo === tipo && b.code === code);
          
        if (!ejercicio) {
            // Seleccionar nombre y duración variados
            const nombreIndex = (variante - 1) % nombresDisponibles.length;
            const nombre = nombresDisponibles[nombreIndex];
            const duracion = duracionesDisponibles[(variante - 1) % duracionesDisponibles.length];

            addLog(`📝 Creando ejercicio ${tipo} variante ${variante}...`, 'info');
          try {
            ejercicio = await localDataClient.entities.Bloque.create({
                nombre: nombre,
                code: code,
            tipo: tipo,
                duracionSeg: duracion,
                instrucciones: `Ejercicio ${nombre} - Variante ${variante}`,
                indicadorLogro: `Completar ${nombre}`,
            materialesRequeridos: [],
                mediaLinks: [],
            profesorId: profesor.id,
            });
              addLog(`✅ Ejercicio ${tipo} variante ${variante} creado`, 'info');
          } catch (error) {
            const errorMsg = error?.message || error?.toString() || 'Error desconocido';
            const errorDetails = error?.details || error?.hint || '';
              addLog(`❌ Error al crear ejercicio ${tipo} variante ${variante}: ${errorMsg}${errorDetails ? ` - ${errorDetails}` : ''}`, 'error');
              // Continuar con la siguiente variante
              continue;
            }
          }
          
          if (ejercicio) {
            ejerciciosDelTipo.push(ejercicio);
          }
        }

        // Usar la primera variante como base, pero tener todas disponibles
        if (ejerciciosDelTipo.length > 0) {
          ejerciciosBase[tipo] = ejerciciosDelTipo[0];
          ejerciciosBase[`${tipo}_variantes`] = ejerciciosDelTipo; // Guardar todas las variantes
        } else {
          // Si no se pudo crear ninguna, buscar cualquier bloque del tipo
          const bloqueExistente = bloques.find(b => b.tipo === tipo);
          if (bloqueExistente) {
            ejerciciosBase[tipo] = bloqueExistente;
            ejerciciosBase[`${tipo}_variantes`] = [bloqueExistente];
          } else {
            addLog(`⚠️ No se pudo crear ni encontrar ningún bloque de tipo ${tipo}`, 'warning');
          }
        }
      }

      bloques = await localDataClient.entities.Bloque.list();
      
      // Validación: asegurar que hay al menos 1 ejercicio creado
      const bloquesSeedCreados = bloques.filter(b => b.code?.includes('SEED') || b.profesorId === profesor.id);
      if (bloquesSeedCreados.length === 0) {
        addLog('❌ No se creó ningún ejercicio. Creando ejercicio mínimo de emergencia...', 'error');
        try {
          const ejercicioEmergencia = await localDataClient.entities.Bloque.create({
            nombre: 'Seed – Ejercicio Base',
            code: 'CA-SEED-001',
            tipo: 'CA',
            duracionSeg: 300,
            instrucciones: 'Ejercicio base de emergencia',
            indicadorLogro: 'Completar ejercicio base',
            materialesRequeridos: [],
            mediaLinks: [],
            profesorId: profesor.id,
          });
          bloques.push(ejercicioEmergencia);
          ejerciciosBase.CA = ejercicioEmergencia;
          ejerciciosBase['CA_variantes'] = [ejercicioEmergencia];
          addLog('✅ Ejercicio de emergencia creado', 'success');
        } catch (error) {
          addLog(`❌ Error crítico al crear ejercicio de emergencia: ${error.message}`, 'error');
          throw new Error('No se pudo crear ningún ejercicio. Es necesario al menos 1 ejercicio para continuar.');
        }
      } else {
        addLog(`✅ Ejercicios creados: ${bloquesSeedCreados.length}`, 'info');
      }

      let planes = await localDataClient.entities.Plan.list();
      
      // Función helper para seleccionar bloque aleatorio de un tipo (usando variantes si están disponibles)
      const seleccionarBloque = (tipo) => {
        const variantes = ejerciciosBase[`${tipo}_variantes`];
        if (variantes && variantes.length > 0) {
          return variantes[Math.floor(Math.random() * variantes.length)];
        }
        return ejerciciosBase[tipo];
      };

      // Definir múltiples planes variados
      const planesSeed = [
        {
          nombre: 'Seed – Plan Base',
          focoGeneral: 'GEN',
          objetivoSemanalPorDefecto: 'Desarrollar técnica y musicalidad',
          semanas: [
            {
              nombre: 'Semana 1',
              foco: 'GEN',
              objetivo: 'Bases técnicas y musicales',
              sesiones: [
                {
                  nombre: 'Sesión A',
                  foco: 'GEN',
                  bloques: ['CA', 'TC', 'FM', 'VC']
                },
                {
                  nombre: 'Sesión B',
                  foco: 'RIT',
                  bloques: ['CB', 'TM', 'AD', 'VC']
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
                  bloques: ['CA', 'TC', 'FM']
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
                  bloques: ['CA', 'CB', 'FM', 'VC']
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
                  bloques: ['CA', 'TC', 'TM']
                }
              ]
            }
          ]
        },
        {
          nombre: 'Seed – Plan Intensivo',
          focoGeneral: 'TC',
          objetivoSemanalPorDefecto: 'Enfoque en técnica avanzada',
          semanas: [
            {
              nombre: 'Semana 1',
              foco: 'TC',
              objetivo: 'Técnica central intensiva',
              sesiones: [
                {
                  nombre: 'Sesión A',
                  foco: 'TC',
                  bloques: ['CA', 'TC', 'TC', 'VC']
                },
                {
                  nombre: 'Sesión B',
                  foco: 'TC',
                  bloques: ['CB', 'TC', 'TM', 'VC']
                }
              ]
            },
            {
              nombre: 'Semana 2',
              foco: 'LIG',
              objetivo: 'Ligaduras y técnica',
              sesiones: [
                {
                  nombre: 'Sesión A',
                  foco: 'LIG',
                  bloques: ['CA', 'TC', 'FM', 'VC']
                }
              ]
            },
            {
              nombre: 'Semana 3',
              foco: 'ART',
              objetivo: 'Articulación precisa',
              sesiones: [
                {
                  nombre: 'Sesión A',
                  foco: 'ART',
                  bloques: ['CA', 'TC', 'TM', 'VC']
                }
              ]
            }
          ]
        },
        {
          nombre: 'Seed – Plan Musical',
          focoGeneral: 'FM',
          objetivoSemanalPorDefecto: 'Desarrollo musical y expresivo',
          semanas: [
            {
              nombre: 'Semana 1',
              foco: 'FM',
              objetivo: 'Fragmentos musicales',
              sesiones: [
                {
                  nombre: 'Sesión A',
                  foco: 'FM',
                  bloques: ['CA', 'FM', 'FM', 'VC']
                },
                {
                  nombre: 'Sesión B',
                  foco: 'GEN',
                  bloques: ['CB', 'FM', 'VC']
                }
              ]
            },
            {
              nombre: 'Semana 2',
              foco: 'S&A',
              objetivo: 'Sonido y expresión',
              sesiones: [
                {
                  nombre: 'Sesión A',
                  foco: 'S&A',
                  bloques: ['CA', 'FM', 'VC']
                }
              ]
            },
            {
              nombre: 'Semana 3',
              foco: 'RIT',
              objetivo: 'Ritmo y fraseo',
              sesiones: [
                {
                  nombre: 'Sesión A',
                  foco: 'RIT',
                  bloques: ['CB', 'FM', 'TM', 'VC']
                }
              ]
            }
          ]
        }
      ];

      // Crear planes que no existan (siempre agregar a planesCreados aunque ya existan)
      const planesCreados = [];
      for (const planData of planesSeed) {
        let planExistente = planes.find(p => p.nombre === planData.nombre);
        if (!planExistente) {
          addLog(`📅 Creando plan: ${planData.nombre}...`, 'info');
          try {
            // Convertir estructura de bloques a objetos completos
            const semanasCompletas = planData.semanas.map(semana => ({
              ...semana,
              sesiones: semana.sesiones.map(sesion => ({
                ...sesion,
                bloques: sesion.bloques.map(tipo => {
                  const bloque = seleccionarBloque(tipo);
                  if (!bloque) {
                    addLog(`⚠️ No se encontró bloque de tipo ${tipo} para plan ${planData.nombre}`, 'warning');
                    return null;
                  }
                  return {
                    ...bloque,
                    code: bloque.code,
                    nombre: bloque.nombre,
                    tipo: bloque.tipo,
                    duracionSeg: bloque.duracionSeg || 0
                  };
                }).filter(b => b !== null),
                rondas: []
              }))
            }));

            // Usar la primera pieza disponible para este plan
            if (piezasCreadas.length === 0) {
              addLog(`❌ ERROR: No hay piezas disponibles para crear plan ${planData.nombre}`, 'error');
              continue;
            }
            const piezaParaPlan = piezasCreadas[Math.floor(Math.random() * piezasCreadas.length)];

            // Validar que focoGeneral sea uno de los valores permitidos: 'GEN', 'LIG', 'RIT', 'ART', 'S&A'
            const focosValidos = ['GEN', 'LIG', 'RIT', 'ART', 'S&A'];
            const focoGeneralValido = focosValidos.includes(planData.focoGeneral) 
              ? planData.focoGeneral 
              : 'GEN'; // Fallback a 'GEN' si no es válido
            
            planExistente = await localDataClient.entities.Plan.create({
              nombre: planData.nombre,
              focoGeneral: focoGeneralValido,
              objetivoSemanalPorDefecto: planData.objetivoSemanalPorDefecto || '',
              piezaId: piezaParaPlan.id,
              profesorId: profesor.id,
              semanas: semanasCompletas
            });
            addLog(`✅ Plan creado: ${planData.nombre}`, 'success');
          } catch (error) {
            const errorMsg = error?.message || error?.toString() || 'Error desconocido';
            const errorDetails = error?.details || error?.hint || '';
            addLog(`❌ Error al crear plan ${planData.nombre}: ${errorMsg}${errorDetails ? ` - ${errorDetails}` : ''}`, 'error');
            console.error('Error completo al crear plan:', error);
            // Continuar con el siguiente plan
            continue;
          }
        } else {
          addLog(`ℹ️ Plan ya existe: ${planData.nombre}`, 'info');
        }
        // IMPORTANTE: Siempre agregar a planesCreados aunque ya exista
        if (planExistente) {
          planesCreados.push(planExistente);
        }
      }

      // Actualizar lista de planes
      planes = await localDataClient.entities.Plan.list();
      
      // Si no hay planes creados, usar el primero disponible o crear uno básico
      if (planesCreados.length === 0) {
        const planDisponible = planes.find(p => p.profesorId === profesor.id);
        if (planDisponible) {
          planesCreados.push(planDisponible);
        } else {
          // Crear un plan básico de emergencia
          try {
            const piezaParaPlan = piezasCreadas.length > 0 ? piezasCreadas[0] : null;
            if (!piezaParaPlan) {
              throw new Error('No hay piezas disponibles para crear plan');
            }
            
            const planEmergencia = await localDataClient.entities.Plan.create({
              nombre: 'Seed – Plan Base',
              focoGeneral: 'GEN',
              objetivoSemanalPorDefecto: 'Desarrollar técnica y musicalidad',
              piezaId: piezaParaPlan.id,
              profesorId: profesor.id,
              semanas: [
                {
                  nombre: 'Semana 1',
                  foco: 'GEN',
                  objetivo: 'Bases técnicas',
                  sesiones: [
                    {
                      nombre: 'Sesión A',
                      foco: 'GEN',
                  bloques: [
                    { ...ejerciciosBase.CA, code: ejerciciosBase.CA.code, nombre: ejerciciosBase.CA.nombre, tipo: 'CA', duracionSeg: 300 },
                        { ...ejerciciosBase.VC, code: ejerciciosBase.VC.code, nombre: ejerciciosBase.VC.nombre, tipo: 'VC', duracionSeg: 240 }
                  ],
                  rondas: []
                }
              ]
            }
          ]
          });
            planesCreados.push(planEmergencia);
            addLog('✅ Plan de emergencia creado', 'success');
        } catch (error) {
            addLog(`❌ Error crítico al crear plan de emergencia: ${error.message}`, 'error');
          throw error;
          }
        }
      }

      // Calcular lunes actual si no se proporcionó rango de fechas
      const hoy = new Date();
      const lunesActual = new Date(hoy);
      lunesActual.setDate(lunesActual.getDate() - (lunesActual.getDay() + 6) % 7); // startOfMonday

      // Contadores globales para validación final
      let totalAsignaciones = 0;
      let totalSesiones = 0;
      let totalBloques = 0;
      let totalFeedbacks = 0;
      const asignacionesPorProfesorPorSemana = new Map(); // Map<profesorId_semanaISO, count>

      // En modo remoto, obtener el usuario autenticado una vez para cumplir con RLS
      // IMPORTANTE: Solo usar usuarios tipo PROF, nunca ADMIN
      let profesorParaRLS = profesor;
      if (dataSource === 'remote') {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            const usuarioAutenticado = usuarios.find(u => u.id === session.user.id);
            // Solo usar si es PROF (nunca ADMIN para asignaciones)
            if (usuarioAutenticado && usuarioAutenticado.rolPersonalizado === 'PROF') {
              profesorParaRLS = usuarioAutenticado;
              addLog(`✓ Usando usuario autenticado (PROF) para todas las asignaciones: ${profesorParaRLS.email} (${profesorParaRLS.id})`, 'info');
            } else if (usuarioAutenticado && usuarioAutenticado.rolPersonalizado === 'ADMIN') {
              // Si el usuario autenticado es ADMIN, usar el primer profesor disponible
              addLog(`⚠️ El usuario autenticado es ADMIN. Las asignaciones se asignarán al primer profesor disponible: ${profesorParaRLS.email}`, 'warning');
            } else {
              addLog(`⚠️ El usuario autenticado (${session.user.id}) no tiene rol PROF. Las políticas RLS pueden bloquear las inserciones.`, 'warning');
              addLog(`💡 Solución: Inicia sesión con un usuario tipo PROF o asegúrate de que las políticas RLS permitan crear asignaciones`, 'info');
            }
          }
        } catch (e) {
          addLog(`⚠️ Error al obtener sesión para RLS: ${e.message}`, 'warning');
        }
      }
      
      // Validación final: asegurar que profesorParaRLS es PROF
      if (profesorParaRLS.rolPersonalizado !== 'PROF') {
        addLog(`❌ ERROR: El profesor asignado debe ser tipo PROF, pero es ${profesorParaRLS.rolPersonalizado}. Buscando un profesor válido...`, 'error');
        const profesorValido = profesores.find(p => p.id !== profesorParaRLS.id) || profesores[0];
        if (!profesorValido) {
          addLog('❌ No se encontró ningún profesor válido. No se pueden crear asignaciones.', 'error');
          toast.error('No hay profesores válidos disponibles');
          setIsSeeding(false);
          return;
        }
        profesorParaRLS = profesorValido;
        addLog(`✓ Usando profesor válido: ${getNombreVisible(profesorParaRLS)} (${profesorParaRLS.email})`, 'info');
      }

      // Estrategia de distribución: cada profesor debe tener al menos 2 asignaciones por semana
      // Requerimos: profesores.length * 2 asignaciones mínimas por semana
      // Si estudiantes.length < profesores.length * 2, distribuir de forma que cada profesor tenga al menos 2
      const asignacionesMinimasPorSemana = profesores.length * 2;
      const estudiantesPorProfesor = Math.max(2, Math.ceil(estudiantes.length / profesores.length));
      addLog(`📊 Distribución: ${estudiantes.length} estudiantes, ${profesores.length} profesores, mínimo ${estudiantesPorProfesor} estudiantes por profesor, ${asignacionesMinimasPorSemana} asignaciones mínimas por semana`, 'info');
      
      if (estudiantes.length < asignacionesMinimasPorSemana) {
        addLog(`⚠️ ADVERTENCIA: Solo hay ${estudiantes.length} estudiantes, pero se necesitan al menos ${asignacionesMinimasPorSemana} para que cada profesor tenga 2 asignaciones por semana.`, 'warning');
        addLog(`💡 Nota: Algunos profesores podrían tener menos de 2 asignaciones por semana.`, 'info');
      }
      
      // Crear mapa de asignación estudiante -> profesor para distribución equitativa
      const asignacionesProfesorPorSemana = profesores.map(p => ({ profesor: p, contador: 0 }));
      let indiceProfesorActual = 0;

      // Para cada estudiante
      for (const estudiante of estudiantes) {
        addLog(`👤 Procesando estudiante: ${estudiante.nombreCompleto || estudiante.email}`, 'info');
        
        // Determinar profesor asignado con distribución equitativa que garantice mínimo de 2 por profesor/semana
        let profesorAsignado;
        if (dataSource === 'remote') {
          // En modo remoto: distribuir equitativamente pero respetando RLS
          // Estrategia: rotar entre profesores asegurando que cada uno tenga al menos 2 asignaciones antes de repetir
          const indiceEstudiante = estudiantes.indexOf(estudiante);
          
          // Para garantizar mínimo de 2 por profesor, primero asignar 2 estudiantes a cada profesor en orden
          if (indiceEstudiante < profesores.length * 2) {
            // Primera ronda: 2 estudiantes por profesor
            const indiceEnRonda = Math.floor(indiceEstudiante / 2); // Profesor para esta ronda (0, 0, 1, 1, 2, 2, ...)
            profesorAsignado = profesores[indiceEnRonda % profesores.length];
          } else {
            // Después de garantizar mínimo, rotar equitativamente
            const indiceProfesor = indiceEstudiante % profesores.length;
            profesorAsignado = profesores[indiceProfesor];
          }
          
          // Si hay solo un profesor o el profesorParaRLS está en la lista y es necesario para RLS
          if (profesores.length === 1) {
            profesorAsignado = profesores[0];
          } else if (profesores.find(p => p.id === profesorParaRLS.id)) {
            // Priorizar profesorParaRLS para RLS, pero solo si ya tiene menos asignaciones que otros
            const asignacionesProfParaRLS = asignacionesProfesorPorSemana.find(p => p.profesor.id === profesorParaRLS.id)?.contador || 0;
            const asignacionesOtrosFiltradas = asignacionesProfesorPorSemana.filter(p => p.profesor.id !== profesorParaRLS.id).map(p => p.contador);
            if (asignacionesOtrosFiltradas.length > 0) {
              const asignacionesOtros = Math.min(...asignacionesOtrosFiltradas);
              if (asignacionesProfParaRLS < asignacionesOtros + 1) {
                profesorAsignado = profesorParaRLS;
              }
            }
          }
        } else {
          // En modo local: usar el profesor asignado al estudiante si existe y es PROF
          const profesorDelEstudiante = estudiante.profesorAsignadoId 
            ? usuarios.find(u => u.id === estudiante.profesorAsignadoId)
            : null;
          if (profesorDelEstudiante && profesorDelEstudiante.rolPersonalizado === 'PROF') {
            profesorAsignado = profesorDelEstudiante;
          } else {
            // Distribuir equitativamente con estrategia de mínimo de 2 por profesor
            const indiceEstudiante = estudiantes.indexOf(estudiante);
            if (indiceEstudiante < profesores.length * 2) {
              const indiceEnRonda = Math.floor(indiceEstudiante / 2);
              profesorAsignado = profesores[indiceEnRonda % profesores.length];
            } else {
              const indiceProfesor = indiceEstudiante % profesores.length;
              profesorAsignado = profesores[indiceProfesor];
            }
          }
        }
        
        // Validación final: asegurar que siempre es PROF
        if (!profesorAsignado) {
          addLog(`❌ ERROR: No se pudo asignar profesor para ${estudiante.nombreCompleto || estudiante.email}. Usando primer profesor disponible.`, 'error');
          profesorAsignado = profesor;
        }
        if (profesorAsignado && profesorAsignado.rolPersonalizado !== 'PROF') {
          addLog(`⚠️ El profesor asignado para ${estudiante.nombreCompleto || estudiante.email} no es PROF (es ${profesorAsignado.rolPersonalizado}). Usando primer profesor disponible.`, 'warning');
          profesorAsignado = profesor;
        }

        // Para cada semana en la lista de semanas a generar
        for (let i = 0; i < semanasParaGenerar.length; i++) {
          const lunesSemana = semanasParaGenerar[i];
          const semanaInicioISO = formatLocalDate(lunesSemana);
          addLog(`📅 Procesando semana ${semanaInicioISO} (${i + 1}/${semanasParaGenerar.length})...`, 'info');

          // Verificar si ya existe asignación para esta semana
          // IMPORTANTE: Siempre crear nuevas asignaciones para las semanas solicitadas
          const asignaciones = await localDataClient.entities.Asignacion.list();
          let asignacionExistente = asignaciones.find(a =>
            a.alumnoId === estudiante.id &&
            a.semanaInicioISO === semanaInicioISO
          );

          let asignacion = asignacionExistente;

          // Si no existe, crear nueva. Si existe, aún así intentar crear una nueva para esa semana
          // (el usuario quiere generar nuevas asignaciones cada vez que ejecuta el generador)
          if (!asignacionExistente || true) { // Cambiar a false si no se quieren duplicados
            // Validar que tenemos pieza y plan antes de crear asignación
            if (piezasCreadas.length === 0) {
              addLog(`❌ ERROR: No hay piezas disponibles para crear asignación para ${estudiante.nombreCompleto || estudiante.email} semana ${semanaInicioISO}`, 'error');
              continue;
            }
            if (planesCreados.length === 0) {
              addLog(`❌ ERROR: No hay planes disponibles para crear asignación para ${estudiante.nombreCompleto || estudiante.email} semana ${semanaInicioISO}`, 'error');
              continue;
            }
            if (!profesorAsignado || !profesorAsignado.id) {
              addLog(`❌ ERROR: No hay profesor asignado para crear asignación para ${estudiante.nombreCompleto || estudiante.email} semana ${semanaInicioISO}`, 'error');
              continue;
            }

            // Seleccionar pieza y plan aleatorios para este estudiante (rotación variada)
            const indiceEstudiante = estudiantes.indexOf(estudiante);
            const piezaSeleccionada = piezasCreadas[indiceEstudiante % piezasCreadas.length];
            const planSeleccionado = planesCreados[indiceEstudiante % planesCreados.length];

            if (!piezaSeleccionada || !planSeleccionado) {
              addLog(`❌ ERROR: Pieza o plan no disponible para ${estudiante.nombreCompleto || estudiante.email} semana ${semanaInicioISO}`, 'error');
              continue;
            }

            addLog(`📝 Creando asignación para ${estudiante.nombreCompleto || estudiante.email} semana ${semanaInicioISO} (pieza: ${piezaSeleccionada.nombre}, plan: ${planSeleccionado.nombre})...`, 'info');
            try {
              const planCopy = JSON.parse(JSON.stringify(planSeleccionado));
              const piezaSnapshotData = {
                nombre: piezaSeleccionada.nombre,
                descripcion: piezaSeleccionada.descripcion,
                nivel: piezaSeleccionada.nivel,
                elementos: piezaSeleccionada.elementos || [],
                tiempoObjetivoSeg: piezaSeleccionada.tiempoObjetivoSeg || 0,
              };
              
              if (import.meta.env.DEV) {
                console.log('Datos antes de crear asignación:', {
                alumnoId: estudiante.id,
                piezaId: piezaSeleccionada.id,
                semanaInicioISO,
                estado: 'publicada',
                hasPlan: !!planCopy,
                planType: typeof planCopy,
                hasPiezaSnapshot: !!piezaSnapshotData,
                piezaSnapshotType: typeof piezaSnapshotData,
                profesorId: profesorAsignado.id
              }
              });
              
              // CRÍTICO: En modo remoto, usar SIEMPRE profesorParaRLS.id para cumplir con RLS
              // Las políticas RLS requieren que profesor_id = auth.uid()
              const profesorIdParaRLS = dataSource === 'remote' 
                ? profesorParaRLS.id 
                : profesorAsignado.id;
              
              addLog(`🔐 Usando profesorId para RLS: ${profesorIdParaRLS} (profesor lógico: ${profesorAsignado.id}, profesorParaRLS: ${profesorParaRLS.id})`, 'info');
              
              asignacion = await localDataClient.entities.Asignacion.create({
              alumnoId: estudiante.id,
              piezaId: piezaSeleccionada.id,
              semanaInicioISO: semanaInicioISO,
              estado: 'publicada',
              foco: 'GEN',
              notas: `Asignación automática - semana del ${parseLocalDate(semanaInicioISO).toLocaleDateString('es-ES')}`,
              plan: planCopy,
              piezaSnapshot: piezaSnapshotData,
              profesorId: profesorIdParaRLS
              });
              
              if (import.meta.env.DEV) {
                console.log('Asignación creada exitosamente:', {
                  id: asignacion.id,
                  estado: asignacion.estado,
                  hasPlan: !!asignacion.plan,
                  hasPiezaSnapshot: !!asignacion.piezaSnapshot
                });
              }
              
              addLog(`✅ Asignación creada para ${estudiante.nombreCompleto || estudiante.email} semana ${semanaInicioISO} (Prof RLS: ${getNombreVisible(profesorParaRLS)}, Prof lógico: ${getNombreVisible(profesorAsignado)})`, 'info');
              totalAsignaciones++;
              
              // Registrar asignación por profesor lógico (para distribución) y semana
              const key = `${profesorAsignado.id}_${semanaInicioISO}`;
              asignacionesPorProfesorPorSemana.set(key, (asignacionesPorProfesorPorSemana.get(key) || 0) + 1);
              
              // Actualizar contador en asignacionesProfesorPorSemana para distribución
              const profesorEnContador = asignacionesProfesorPorSemana.find(p => p.profesor.id === profesorAsignado.id);
              if (profesorEnContador) {
                profesorEnContador.contador++;
              }
            } catch (error) {
              const errorMsg = error?.message || error?.toString() || 'Error desconocido';
              const errorDetails = error?.details || error?.hint || '';
              const errorCode = error?.code || '';
              addLog(`❌ Error al crear asignación para ${estudiante.nombreCompleto || estudiante.email} semana ${semanaInicioISO}: ${errorMsg}${errorDetails ? ` - ${errorDetails}` : ''}${errorCode ? ` (Código: ${errorCode})` : ''}`, 'error');
              console.error('Error completo al crear asignación:', error);
              console.error('Datos del error:', {
                estudiante: estudiante.nombreCompleto || estudiante.email,
                semanaInicioISO,
                piezaSeleccionada: piezaSeleccionada?.id,
                planSeleccionado: planSeleccionado?.id,
                profesorAsignado: profesorAsignado?.id,
                error: error
              });
              
              // Si había una asignación existente, usarla como fallback
              if (asignacionExistente) {
                addLog(`⚠️ Usando asignación existente como fallback para ${estudiante.nombreCompleto || estudiante.email} semana ${semanaInicioISO}`, 'warning');
                asignacion = asignacionExistente;
                const key = `${profesorAsignado.id}_${semanaInicioISO}`;
                asignacionesPorProfesorPorSemana.set(key, (asignacionesPorProfesorPorSemana.get(key) || 0) + 1);
              } else {
                // No lanzar error, intentar continuar con la siguiente semana
                continue;
              }
            }
          } else {
            addLog(`ℹ️ Usando asignación existente para ${estudiante.nombreCompleto || estudiante.email} semana ${semanaInicioISO}`, 'info');
            // Contar asignación existente si no fue creada en esta ejecución
            const key = `${profesorAsignado.id}_${semanaInicioISO}`;
            asignacionesPorProfesorPorSemana.set(key, (asignacionesPorProfesorPorSemana.get(key) || 0) + 1);
          }

          // Obtener pieza y plan para esta asignación (para usar en registros)
          const piezaAsignacion = asignacion.piezaSnapshot 
            ? piezasCreadas.find(p => p.nombre === asignacion.piezaSnapshot.nombre) || piezasCreadas[0]
            : (piezasCreadas.find(p => p.id === asignacion.piezaId) || piezasCreadas[0]);
          const planAsignacion = asignacion.plan 
            ? planesCreados.find(p => p.nombre === asignacion.plan.nombre) || planesCreados[0]
            : planesCreados[0];

          // Verificar duplicados a nivel de sesión individual (fecha/hora específica)
          // Permitir crear múltiples ejecuciones con datos diferentes usando timestamps únicos
          // No saltar semanas completas, solo verificar duplicados exactos por fecha/hora

          // Contador local de sesiones para esta semana
          let sesionesCreadasEstaSemana = 0;

          // CRÍTICO: Generar al menos 1 sesión para garantizar comentario de sesión y feedback
          // Generar número variable de sesiones (1-6) para más variación, pero mínimo 1
          const numSesionesEnSemana = Math.max(1, 1 + Math.floor(Math.random() * 5)); // 1-6 (mínimo 1)
          addLog(`📝 Generando ${numSesionesEnSemana} sesiones para semana ${semanaInicioISO}...`, 'info');
          const diasPracticados = new Set();

          // Seleccionar días únicos (hasta 6 días diferentes)
          while (diasPracticados.size < Math.min(numSesionesEnSemana, 6)) {
            const diaOffset = Math.floor(Math.random() * 7); // 0-6 (lunes-domingo)
            diasPracticados.add(diaOffset);
          }

          const diasArray = Array.from(diasPracticados).sort();
          const franjas = ['manana', 'tarde', 'noche'];
          const focos = ['GEN', 'LIG', 'RIT', 'ART', 'S&A'];

          // Añadir offset aleatorio para variar fechas entre ejecuciones
          const offsetAleatorio = Math.floor(Math.random() * 1440); // 0-1440 minutos (0-24h)

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

            // Añadir variación aleatoria adicional a la hora para hacer cada ejecución única
            const variacionMinutos = Math.floor(Math.random() * 30) - 15; // -15 a +15 minutos
            const minutoFinal = Math.max(0, Math.min(59, minuto + variacionMinutos));

            const fechaSesion = new Date(lunesSemana);
            fechaSesion.setDate(fechaSesion.getDate() + diaOffset);
            fechaSesion.setHours(hora, minutoFinal, 0, 0);
            // Añadir offset aleatorio para variar entre ejecuciones
            fechaSesion.setMinutes(fechaSesion.getMinutes() + (offsetAleatorio % 60));

            // Variar duración más ampliamente (15-75 min) para más variación
            const duracionSesion = (15 + Math.floor(Math.random() * 61)) * 60; // 15-75 min en segundos
            const fechaFin = new Date(fechaSesion.getTime() + duracionSesion * 1000);

            // Seleccionar 2-5 bloques para más variación
            const numBloques = 2 + Math.floor(Math.random() * 4); // 2-5
            // Variar pesos aleatoriamente para cada sesión
            const variacionPesos = Math.random() * 0.3 - 0.15; // -0.15 a +0.15
            const tiposPesos = { 
              CA: 0.2 + variacionPesos, 
              CB: 0.2 + variacionPesos, 
              TC: 0.3 + variacionPesos, 
              TM: 0.15 + variacionPesos, 
              FM: 0.25 + variacionPesos, 
              VC: 0.08 + variacionPesos, 
              AD: 0.02 
            };
            const bloquesSeleccionados = [];
            const tiposUsados = new Set();
            const tiposDisponibles = Object.keys(tiposPesos);

            // Mezclar tipos disponibles para más aleatoriedad
            const tiposMezclados = [...tiposDisponibles].sort(() => Math.random() - 0.5);

            for (let b = 0; b < numBloques && b < tiposMezclados.length; b++) {
              const tipoSeleccionado = tiposMezclados[b];
              const ejercicio = bloques.find(e => e.tipo === tipoSeleccionado && e.code?.includes('SEED'));
              if (ejercicio && !tiposUsados.has(tipoSeleccionado)) {
                bloquesSeleccionados.push(ejercicio);
                tiposUsados.add(tipoSeleccionado);
              }
            }
            
            // Si no hay suficientes, añadir más aleatoriamente
            while (bloquesSeleccionados.length < numBloques && bloquesSeleccionados.length < tiposDisponibles.length) {
              const tipoAleatorio = tiposDisponibles[Math.floor(Math.random() * tiposDisponibles.length)];
              if (!tiposUsados.has(tipoAleatorio)) {
                const ejercicio = bloques.find(e => e.tipo === tipoAleatorio && e.code?.includes('SEED'));
              if (ejercicio) {
                bloquesSeleccionados.push(ejercicio);
                  tiposUsados.add(tipoAleatorio);
                }
              }
            }

            // Variar calificación con distribución más realista (más 3s y 4s)
            const randCalif = Math.random();
            let calificacion;
            if (randCalif < 0.2) calificacion = 1;
            else if (randCalif < 0.4) calificacion = 2;
            else if (randCalif < 0.7) calificacion = 3;
            else calificacion = 4;
            
            const semanaIdx = 0;
            const sesionIdx = i;
            const foco = focos[Math.floor(Math.random() * focos.length)];

            const duracionObjetivo = bloquesSeleccionados
              .filter(b => b.tipo !== 'AD')
              .reduce((sum, b) => sum + (b.duracionSeg || 0), 0);

            addLog(`📝 Creando registro de sesión ${i + 1}/${numSesionesEnSemana} para semana ${semanaInicioISO}...`, 'info');
            let registroSesion;
            try {
              // CRÍTICO: En modo remoto, usar profesorParaRLS.id para cumplir con RLS
              const profesorIdParaSesionRLS = dataSource === 'remote' 
                ? profesorParaRLS.id 
                : profesorAsignado.id;
              
              registroSesion = await localDataClient.entities.RegistroSesion.create({
              asignacionId: asignacion.id,
              alumnoId: estudiante.id,
              profesorAsignadoId: profesorIdParaSesionRLS,
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
              piezaNombre: piezaAsignacion?.nombre || 'Pieza',
              planNombre: planAsignacion?.nombre || 'Plan',
              semanaNombre: 'Semana 1',
              sesionNombre: `Sesión ${String.fromCharCode(65 + i)}`,
              foco
              });

              totalSesiones++;
              sesionesCreadasEstaSemana++;
              addLog(`✅ Registro de sesión creado: ${registroSesion.id}`, 'success');
            } catch (error) {
              const errorMsg = error?.message || error?.toString() || 'Error desconocido';
              const errorDetails = error?.details || error?.hint || '';
              addLog(`❌ Error al crear registro de sesión: ${errorMsg}${errorDetails ? ` - ${errorDetails}` : ''}`, 'error');
              console.error('Error completo al crear registro de sesión:', error);
              // Continuar con la siguiente sesión en lugar de detener todo
              continue;
            }

            // Crear registros de bloques
            let tiempoAcumulado = 0;
            for (let b = 0; b < bloquesSeleccionados.length; b++) {
              const bloque = bloquesSeleccionados[b];
              const esOmitido = Math.random() < 0.15; // 15% omitidos
              const duracionReal = esOmitido ? 0 : (bloque.duracionSeg || 0) + Math.floor((Math.random() * 60) - 30);

              try {
                const registroBloque = await localDataClient.entities.RegistroBloque.create({
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
                
                if (!registroBloque) {
                  addLog(`⚠️ Registro de bloque ${b + 1} no se creó correctamente`, 'warning');
                }

                tiempoAcumulado += duracionReal;
                totalBloques++;
                addLog(`✅ Registro de bloque creado: ${bloque.code}`, 'info');
              } catch (error) {
                const errorMsg = error?.message || error?.toString() || 'Error desconocido';
                const errorDetails = error?.details || error?.hint || '';
                addLog(`❌ Error al crear registro de bloque ${b + 1}: ${errorMsg}${errorDetails ? ` - ${errorDetails}` : ''}`, 'error');
                console.error('Error completo al crear registro de bloque:', error);
                // Continuar con el siguiente bloque en lugar de detener todo
                continue;
              }
            }
          }

          // CRÍTICO: Crear feedback semanal siempre que haya una asignación
          // Si no hay sesiones, crear feedback de todas formas para garantizar mínimo
          if (asignacion && profesorAsignado && profesorAsignado.id) {
            // Notas más variadas y específicas
          const notasProfesor = [
            'Excelente progreso esta semana. Sigue mejorando la técnica de respiración.',
            'Buen trabajo general. Recomiendo enfocarte más en la articulación.',
            'Mejora la consistencia en la práctica diaria. Intenta practicar al menos 4 días por semana.',
            'Se nota avance en el control del sonido. Trabaja más en la afinación en el registro agudo.',
            'Práctica sólida esta semana. Continúa con el trabajo de ligaduras.',
              'Necesitas mayor dedicación. Ajusta la embocadura y practica escalas con metrónomo.',
              'Muy buena evolución en el fraseo. Sigue trabajando la dinámica.',
              'El ritmo está mejorando notablemente. Mantén la constancia.',
              'Excelente control de la respiración. Ahora enfócate en la proyección del sonido.',
              'Buen trabajo en las escalas. Próximo paso: trabajar la velocidad con precisión.',
              'La postura ha mejorado mucho. Continúa prestando atención a este aspecto.',
              'Se nota dedicación en la práctica. Sigue así y verás resultados pronto.'
            ];
            // CRÍTICO: En modo remoto, usar profesorParaRLS.id para RLS
            // Pero crear con profesorId correcto para cumplir con RLS
            const profesorIdParaFeedbackRLS = dataSource === 'remote' 
              ? profesorParaRLS.id 
              : profesorAsignado.id;
            
            // Verificar si ya existe feedback para esta semana usando el profesorId correcto para RLS
            const feedbacksExistentes = await localDataClient.entities.FeedbackSemanal.list();
            const feedbackExistenteParaRLS = feedbacksExistentes.find(f => 
              f.alumnoId === estudiante.id && 
              f.profesorId === profesorIdParaFeedbackRLS &&
              f.semanaInicioISO === semanaInicioISO
            );

            if (!feedbackExistenteParaRLS) {
              try {
                addLog(`📝 Creando feedback semanal para semana ${semanaInicioISO}...`, 'info');
                // Usar nota según si hubo sesiones o no
                const notaFeedback = sesionesCreadasEstaSemana > 0
                  ? notasProfesor[Math.floor(Math.random() * notasProfesor.length)]
                  : 'Asignación creada. Próxima semana comenzarás a practicar.';
                  
                addLog(`🔐 Usando profesorId para feedback RLS: ${profesorIdParaFeedbackRLS} (profesor lógico: ${profesorAsignado.id}, profesorParaRLS: ${profesorParaRLS.id})`, 'info');
                  
                await localDataClient.entities.FeedbackSemanal.create({
                  alumnoId: estudiante.id,
                  profesorId: profesorIdParaFeedbackRLS,
                  semanaInicioISO: semanaInicioISO,
                  notaProfesor: notaFeedback,
                  mediaLinks: []
                });

                totalFeedbacks++;
                addLog(`✅ Feedback semanal creado para semana ${semanaInicioISO}`, 'success');
              } catch (error) {
                const errorMsg = error?.message || error?.toString() || 'Error desconocido';
                const errorDetails = error?.details || error?.hint || '';
                const errorCode = error?.code || '';
                
                // Si es error 409 (Conflict) por duplicado, intentar actualizar el feedback existente
                if (errorCode === '23505' || errorCode === '409' || errorMsg.includes('duplicate key') || errorMsg.includes('unique constraint')) {
                  addLog(`⚠️ Feedback ya existe para semana ${semanaInicioISO}. Intentando actualizar...`, 'warning');
                  try {
                    // Buscar el feedback existente nuevamente
                    const feedbacksActualizados = await localDataClient.entities.FeedbackSemanal.list();
                    const feedbackActualizado = feedbacksActualizados.find(f => 
                      f.alumnoId === estudiante.id && 
                      f.profesorId === profesorIdParaFeedbackRLS &&
                      f.semanaInicioISO === semanaInicioISO
                    );
                    
                    if (feedbackActualizado) {
                      const notaFeedback = sesionesCreadasEstaSemana > 0
                        ? notasProfesor[Math.floor(Math.random() * notasProfesor.length)]
                        : 'Asignación creada. Próxima semana comenzarás a practicar.';
                      
                      await localDataClient.entities.FeedbackSemanal.update(feedbackActualizado.id, {
                        notaProfesor: notaFeedback
                      });
                      
                      totalFeedbacks++;
                      addLog(`✅ Feedback semanal actualizado para semana ${semanaInicioISO}`, 'success');
                    } else {
                      addLog(`⚠️ No se encontró feedback existente para actualizar. Saltando...`, 'warning');
                      totalFeedbacks++;
                    }
                  } catch (updateError) {
                    addLog(`⚠️ Error al actualizar feedback existente: ${updateError.message}. Saltando...`, 'warning');
                    totalFeedbacks++;
                  }
                } else {
                  addLog(`❌ Error al crear feedback semanal: ${errorMsg}${errorDetails ? ` - ${errorDetails}` : ''}${errorCode ? ` (Código: ${errorCode})` : ''}`, 'error');
                  console.error('Error al crear feedback:', error);
                }
              }
            } else {
              addLog(`ℹ️ Feedback ya existe para semana ${semanaInicioISO}. Saltando.`, 'info');
              // Contar feedback existente para validación
              totalFeedbacks++;
            }
          } else {
            addLog(`⚠️ No se puede crear feedback: falta asignación o profesor para semana ${semanaInicioISO}`, 'warning');
          }
        }
      }

      const duracion = Date.now() - startTime;
      
      // VALIDACIÓN FINAL: Asegurar mínimos requeridos
      addLog('🔍 Validando mínimos requeridos...', 'info');
      let validacionExitosa = true;
      
      // 1. Pieza
      if (piezasCreadas.length === 0) {
        addLog('❌ ERROR: No se generó ninguna pieza (mínimo: 1)', 'error');
        validacionExitosa = false;
      } else {
        addLog(`✅ Piezas: ${piezasCreadas.length} (mínimo: 1)`, 'success');
      }
      
      // 2. Plan
      if (planesCreados.length === 0) {
        addLog('❌ ERROR: No se generó ningún plan (mínimo: 1)', 'error');
        validacionExitosa = false;
      } else {
        addLog(`✅ Planes: ${planesCreados.length} (mínimo: 1)`, 'success');
      }
      
      // 3. Ejercicio (bloque)
      const ejerciciosFinales = bloques.filter(b => b.code?.includes('SEED') || b.profesorId === profesor.id);
      if (ejerciciosFinales.length === 0) {
        addLog('❌ ERROR: No se generó ningún ejercicio (mínimo: 1)', 'error');
        validacionExitosa = false;
      } else {
        addLog(`✅ Ejercicios: ${ejerciciosFinales.length} (mínimo: 1)`, 'success');
      }
      
      // 4. Asignación
      if (totalAsignaciones === 0) {
        addLog('❌ ERROR: No se generó ninguna asignación (mínimo: 1)', 'error');
        validacionExitosa = false;
      } else {
        addLog(`✅ Asignaciones: ${totalAsignaciones} (mínimo: 1)`, 'success');
      }
      
      // 5. Comentario de sesión (notas en registroSesion)
      if (totalSesiones === 0) {
        addLog('❌ ERROR: No se generó ningún comentario de sesión (mínimo: 1 sesión con notas)', 'error');
        validacionExitosa = false;
      } else {
        addLog(`✅ Comentarios de sesión: ${totalSesiones} sesiones con notas (mínimo: 1)`, 'success');
      }
      
      // 6. Feedback
      if (totalFeedbacks === 0) {
        addLog('❌ ERROR: No se generó ningún feedback (mínimo: 1)', 'error');
        validacionExitosa = false;
      } else {
        addLog(`✅ Feedbacks: ${totalFeedbacks} (mínimo: 1)`, 'success');
      }
      
      // 7. Verificar distribución: cada profesor debe tener al menos 2 asignaciones por semana
      if (semanasParaGenerar.length > 0 && profesores.length > 0) {
        const asignacionesPorSemana = new Map(); // Map<semanaISO, Map<profesorId, count>>
        asignacionesPorProfesorPorSemana.forEach((count, key) => {
          const [profesorId, semanaISO] = key.split('_');
          if (!asignacionesPorSemana.has(semanaISO)) {
            asignacionesPorSemana.set(semanaISO, new Map());
          }
          asignacionesPorSemana.get(semanaISO).set(profesorId, count);
        });
        
        let problemasDistribucion = [];
        asignacionesPorSemana.forEach((profesoresMap, semanaISO) => {
          profesores.forEach(prof => {
            const count = profesoresMap.get(prof.id) || 0;
            if (count < 2) {
              problemasDistribucion.push({
                profesor: getNombreVisible(prof),
                semana: semanaISO,
                asignaciones: count,
                requerido: 2
              });
            }
          });
        });
        
        if (problemasDistribucion.length > 0) {
          addLog(`⚠️ ADVERTENCIA: Distribución insuficiente - ${problemasDistribucion.length} profesor(es)/semana(s) con menos de 2 asignaciones:`, 'warning');
          problemasDistribucion.forEach(p => {
            addLog(`  - ${p.profesor} en ${p.semana}: ${p.asignaciones} asignaciones (requerido: ${p.requerido})`, 'warning');
          });
          addLog(`💡 Nota: Esto puede ocurrir si hay más profesores que estudiantes, o si hay pocos estudiantes.`, 'info');
        } else {
          addLog(`✅ Distribución: Todos los profesores tienen al menos 2 asignaciones por semana`, 'success');
        }
      }
      
      if (!validacionExitosa) {
        addLog('❌ VALIDACIÓN FALLIDA: No se cumplieron los mínimos requeridos', 'error');
        toast.error('Validación fallida: Revisa los logs para más detalles');
      } else {
        addLog('✅ VALIDACIÓN EXITOSA: Todos los mínimos requeridos se cumplieron', 'success');
      }
      
      addLog(`✅ Completado en ${(duracion / 1000).toFixed(1)}s`, 'success');
      addLog(`📊 Resumen: ${estudiantes.length} estudiantes × ${semanasParaGenerar.length} semanas`, 'info');
      addLog(`📊 ${totalAsignaciones} asignaciones, ${totalSesiones} sesiones, ${totalBloques} bloques, ${totalFeedbacks} feedbacks`, 'info');

      // Invalidar todas las queries relacionadas (sin esperar)
      addLog('🔄 Invalidando cache...', 'info');
      queryClient.invalidateQueries({ queryKey: ['seedStats'] });
      queryClient.invalidateQueries({ queryKey: ['asignaciones'] });
      queryClient.invalidateQueries({ queryKey: ['asignacionesProf'] });
      queryClient.invalidateQueries({ queryKey: ['registrosSesion'] });
      queryClient.invalidateQueries({ queryKey: ['registrosBloques'] });
      queryClient.invalidateQueries({ queryKey: ['feedbacksSemanal'] });
      queryClient.invalidateQueries({ queryKey: ['piezas'] });
      queryClient.invalidateQueries({ queryKey: ['planes'] });
      queryClient.invalidateQueries({ queryKey: ['bloques'] });
      queryClient.invalidateQueries({ queryKey: ['users'] });

      toast.success(`✅ ${semanasParaGenerar.length} semanas generadas ${fechaInicio && fechaFin ? `(${descripcion})` : ''}`);
    } catch (error) {
      const errorMsg = error?.message || error?.toString() || 'Error desconocido';
      const errorDetails = error?.details || error?.hint || '';
      const errorCode = error?.code || '';
      addLog(`❌ Error general: ${errorMsg}${errorDetails ? ` - ${errorDetails}` : ''}${errorCode ? ` (Código: ${errorCode})` : ''}`, 'error');
      console.error('Error completo:', error);
      toast.error(`Error al generar semillas: ${errorMsg}`);
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

      const piezasSeed = (data.piezas || []).filter(p => p.nombre?.includes('Seed'));
      tests.push({
        name: 'Piezas generadas',
        passed: piezasSeed.length > 0,
        detail: piezasSeed.length > 0 ? `✓ ${piezasSeed.length} piezas` : '✗ Sin piezas seed'
      });

      const planesSeed = (data.planes || []).filter(p => p.nombre?.includes('Seed'));
      const planValido = planesSeed.length > 0 && planesSeed.some(p => p.semanas && p.semanas.length >= 3);
      tests.push({
        name: 'Planes con 3+ semanas',
        passed: planValido,
        detail: planValido ? `✓ ${planesSeed.length} planes` : '✗ Planes inválidos'
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

      const tieneFeedbacks = (data.feedbacks || []).some(f => f.semanaInicioISO && f.alumnoId && f.profesorId);
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
  const countFeedbacks = stats?.feedbacks.length || 0;
  const countRegistrosSesion = stats?.registrosSesion.length || 0;
  const countRegistrosBloques = stats?.registrosBloques.length || 0;
  
  // Usuarios por rol
  const countUsuarios = stats?.users.length || 0;
  const countAdmin = stats?.users.filter(u => u.rolPersonalizado === 'ADMIN').length || 0;
  const countProf = stats?.users.filter(u => u.rolPersonalizado === 'PROF').length || 0;
  const countEstu = stats?.users.filter(u => u.rolPersonalizado === 'ESTU').length || 0;

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
              <div className="space-y-3">
                <Button
                  variant="outline"
                  onClick={crearUsuariosPrueba}
                  loading={isSeeding}
                  className={`w-full ${componentStyles.buttons.outline}`}
                  aria-label="Crear usuarios de prueba"
                >
                  <Users className="w-4 h-4 mr-2" />
                  Crear Usuarios de Prueba (2 PROF + 5 ESTU)
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-3">
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
                  variant="primary"
                  onClick={() => generarSemillasRealistas(12)}
                  loading={isSeeding}
                  className={`w-full ${componentStyles.buttons.primary}`}
                  aria-label="Generar 3 meses (12 semanas) de semillas realistas"
                >
                  <Calendar className="w-4 h-4 mr-2" />
                  3 Meses
                </Button>
                <Button
                  variant="primary"
                  onClick={() => {
                    // Año académico: desde principios de septiembre 2025 hasta finales de agosto 2026
                    const fechaInicio = new Date(2025, 8, 1); // 1 de septiembre 2025 (mes 8 = septiembre, índice 0-based)
                    const fechaFin = new Date(2026, 7, 31); // 31 de agosto 2026 (mes 7 = agosto, índice 0-based)
                    generarSemillasRealistas(null, fechaInicio, fechaFin);
                  }}
                  loading={isSeeding}
                  className={`w-full ${componentStyles.buttons.primary}`}
                  aria-label="Generar año académico 2025-2026 (sept 2025 - ago 2026)"
                >
                  <Calendar className="w-4 h-4 mr-2" />
                  Año 2025-26
                </Button>
              </div>
              <div className="mt-3">
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
                    <h3 className="font-bold text-lg text-[var(--color-text-primary)] mb-3 font-headings">{rol}</h3>
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
        subtitle="Herramienta interna de desarrollo para poblar datos y validaciones"
      />

      <div className={`${componentStyles.layout.page} space-y-6`}>
        <Alert className={`rounded-xl ${componentStyles.containers.panelBase} border-[var(--color-info)] bg-[var(--color-info)]/10`}>
          <AlertCircle className="h-4 w-4 text-[var(--color-info)]" />
          <AlertDescription className="text-xs text-[var(--color-text-secondary)]">
            <strong>Herramienta de desarrollo:</strong> Esta página está diseñada para debugging y desarrollo. No hay tests automatizados configurados actualmente. Usa esta herramienta para poblar datos de prueba y realizar validaciones manuales.
          </AlertDescription>
        </Alert>
        
        <div className="flex flex-wrap justify-center items-center gap-3 sm:gap-4 md:gap-6">
          <div className="text-center min-w-[80px] sm:min-w-[100px]">
            <Music className="w-4 h-4 sm:w-5 sm:h-5 mx-auto mb-1 text-[var(--color-primary)]" />
            <p className="text-xl sm:text-2xl font-bold text-[var(--color-text-primary)]">{countPiezas}</p>
            <p className="text-[10px] sm:text-xs text-[var(--color-text-secondary)]">Piezas</p>
          </div>

          <div className="text-center min-w-[80px] sm:min-w-[100px]">
            <Calendar className="w-4 h-4 sm:w-5 sm:h-5 mx-auto mb-1 text-[var(--color-info)]" />
            <p className="text-xl sm:text-2xl font-bold text-[var(--color-text-primary)]">{countPlanes}</p>
            <p className="text-[10px] sm:text-xs text-[var(--color-text-secondary)]">Planes</p>
          </div>

          <div className="text-center min-w-[80px] sm:min-w-[100px]">
            <Layers className="w-4 h-4 sm:w-5 sm:h-5 mx-auto mb-1 text-[var(--color-primary)]" />
            <p className="text-xl sm:text-2xl font-bold text-[var(--color-text-primary)]">{countBloques}</p>
            <p className="text-[10px] sm:text-xs text-[var(--color-text-secondary)]">Ejercicios</p>
          </div>

          <div className="text-center min-w-[80px] sm:min-w-[100px]">
            <Target className="w-4 h-4 sm:w-5 sm:h-5 mx-auto mb-1 text-[var(--color-primary)]" />
            <p className="text-xl sm:text-2xl font-bold text-[var(--color-text-primary)]">{countAsignaciones}</p>
            <p className="text-[10px] sm:text-xs text-[var(--color-text-secondary)]">Asignaciones</p>
          </div>

          <div className="text-center min-w-[80px] sm:min-w-[100px]">
            <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5 mx-auto mb-1 text-[var(--color-info)]" />
            <p className="text-xl sm:text-2xl font-bold text-[var(--color-text-primary)]">{countFeedbacks}</p>
            <p className="text-[10px] sm:text-xs text-[var(--color-text-secondary)]">Feedbacks</p>
          </div>

          <div className="text-center min-w-[80px] sm:min-w-[100px]">
            <Activity className="w-4 h-4 sm:w-5 sm:h-5 mx-auto mb-1 text-[var(--color-success)]" />
            <p className="text-xl sm:text-2xl font-bold text-[var(--color-text-primary)]">{countRegistrosSesion}</p>
            <p className="text-[10px] sm:text-xs text-[var(--color-text-secondary)]">Sesiones</p>
          </div>

          <div className="text-center min-w-[80px] sm:min-w-[100px]">
            <PlayCircle className="w-4 h-4 sm:w-5 sm:h-5 mx-auto mb-1 text-[var(--color-primary)]" />
            <p className="text-xl sm:text-2xl font-bold text-[var(--color-text-primary)]">{countRegistrosBloques}</p>
            <p className="text-[10px] sm:text-xs text-[var(--color-text-secondary)]">Bloques</p>
          </div>

          <div className="text-center min-w-[80px] sm:min-w-[100px]">
            <Users className="w-4 h-4 sm:w-5 sm:h-5 mx-auto mb-1 text-[var(--color-primary)]" />
            <p className="text-xl sm:text-2xl font-bold text-[var(--color-text-primary)]">{countUsuarios}</p>
            <p className="text-[10px] sm:text-xs text-[var(--color-text-secondary)]">Usuarios</p>
            <p className="text-[9px] sm:text-[10px] text-[var(--color-text-muted)] mt-0.5">
              {countAdmin}A {countProf}P {countEstu}E
            </p>
          </div>
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
