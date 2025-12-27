
import React, { useState, useEffect, useMemo } from "react";
import { localDataClient } from "@/api/localDataClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useBloques } from "@/hooks/entities/useBloques";
import { useAsignaciones } from "@/hooks/entities/useAsignaciones";
import { useUsers } from "@/hooks/entities/useUsers";
// Updated Card, Badge, Alert paths from @/components/ui to @/components/ds
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ds";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ds";
import { Alert, AlertDescription } from "@/components/ds";
import {
  ArrowLeft, Target, User, Music, BookOpen, Calendar, Settings, ChevronDown, ChevronRight, Clock, Edit, XCircle, Shield, Save, X, SlidersHorizontal, Trash2, // Existing icons
  Eye, CheckCircle2, Layers, PlayCircle, MessageSquare // New icons from outline
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";
// Preserving all helper functions and components used in the original file
import { getNombreVisible, formatLocalDate, parseLocalDate, startOfMonday, resolveUserIdActual } from "../components/utils/helpers";
import { useEffectiveUser } from "@/providers/EffectiveUserProvider";
import { calcularTiempoSesion } from "../components/study/sessionSequence";
import SessionContentView from "@/shared/components/study/SessionContentView";
import PageHeader from "@/components/ds/PageHeader";
import { LoadingSpinner } from "@/components/ds";
import { componentStyles } from "@/design/componentStyles";

export default function AsignacionDetallePage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [expandedSemanas, setExpandedSemanas] = useState(new Set([0]));
  const [expandedSesiones, setExpandedSesiones] = useState(new Set());
  const [showEditDrawer, setShowEditDrawer] = useState(false);
  const [editData, setEditData] = useState(null);

  const urlParams = new URLSearchParams(window.location.search);
  const asignacionId = urlParams.get('id');

  const effectiveUser = useEffectiveUser();

  // Query para obtener bloques con hook centralizado
  const { data: dbBloques = [], isLoading: isLoadingBloques, isError: isErrorBloques } = useBloques();

  const { data: allAsignaciones = [], isLoading: isLoadingAsignaciones } = useAsignaciones();

  const asignacion = useMemo(() =>
    allAsignaciones.find(a => a.id === asignacionId),
    [allAsignaciones, asignacionId]
  );

  const isLoading = isLoadingAsignaciones;

  // Query para obtener usuarios con hook centralizado
  const { data: usuarios = [] } = useUsers();

  // Resolver ID de usuario actual de la BD
  const userIdActual = useMemo(() => {
    return resolveUserIdActual(effectiveUser, usuarios);
  }, [effectiveUser, usuarios]);

  const { data: piezas = [] } = useQuery({
    queryKey: ['piezas'],
    queryFn: () => localDataClient.entities.Pieza.list(),
  });

  const cerrarMutation = useMutation({
    mutationFn: () => localDataClient.entities.Asignacion.update(asignacionId, { estado: 'cerrada' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['asignaciones'] });
      toast.success('✅ Asignación cerrada');
    },
  });

  const eliminarMutation = useMutation({
    mutationFn: () => localDataClient.entities.Asignacion.delete(asignacionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['asignaciones'] });
      toast.success('✅ Asignación eliminada');
      navigate(-1);
    },
    onError: (error) => {
      console.error('[asignacion-detalle.jsx] Error al eliminar asignación:', error);
      toast.error('❌ Error al eliminar asignación');
    },
  });

  const publicarMutation = useMutation({
    mutationFn: () => localDataClient.entities.Asignacion.update(asignacionId, { estado: 'publicada' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['asignaciones'] });
      toast.success('✅ Asignación publicada');
    },
  });

  const editarMutation = useMutation({
    mutationFn: async (data) => {
      if (data.piezaId && data.piezaId !== asignacion.piezaId) {
        const pieza = piezas.find(p => p.id === data.piezaId);
        if (pieza) {
          data.piezaSnapshot = {
            nombre: pieza.nombre,
            descripcion: pieza.descripcion || '',
            nivel: pieza.nivel,
            tiempoObjetivoSeg: pieza.tiempoObjetivoSeg || 0,
            elementos: pieza.elementos || [],
          };
        }
      }

      return localDataClient.entities.Asignacion.update(asignacionId, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['asignaciones'] });
      toast.success('✅ Cambios guardados');
      setShowEditDrawer(false);
    },
    onError: (error) => {
      console.error('[asignacion-detalle.jsx] Error al actualizar asignación:', error);
      let errorMsg = '❌ Error al guardar cambios. Inténtalo de nuevo.';

      // Mensajes específicos según el tipo de error
      if (error?.code === 'PGRST204' || error?.code === '406') {
        errorMsg = '❌ Error 406: El servidor rechazó la actualización. El campo "plan" no puede actualizarse directamente. Solo se pueden actualizar: notas, foco, estado, semanaInicioISO y piezaId.';
      } else if (error?.code === 'PGRST301' || error?.code === '23503') {
        errorMsg = '❌ Error de integridad: Verifica que la pieza (piezaId) exista en la base de datos.';
      } else if (error?.code === '42501' || error?.status === 403) {
        errorMsg = '❌ Error de permisos: No tienes permisos para actualizar esta asignación. Verifica tu rol de usuario.';
      } else if (error?.message) {
        errorMsg = `❌ Error: ${error.message}`;
      }

      toast.error(errorMsg);
    },
  });

  const calcularLunesSemanaISO = (fecha) => {
    if (!fecha) return formatLocalDate(startOfMonday(new Date()));
    try {
      const date = parseLocalDate(fecha);
      return formatLocalDate(startOfMonday(date));
    } catch (error) {
      return formatLocalDate(startOfMonday(new Date()));
    }
  };

  // Actualizar semanaInicioISO cuando cambia fechaSeleccionada
  useEffect(() => {
    if (editData?.fechaSeleccionada) {
      const lunes = calcularLunesSemanaISO(editData.fechaSeleccionada);
      setEditData(prev => ({ ...prev, semanaInicioISO: lunes }));
    }
  }, [editData?.fechaSeleccionada]);

  // Verificar si el usuario puede editar el profesor asignado
  const puedeEditarProfesor = useMemo(() => {
    if (!asignacion || !effectiveUser) return false;
    const isAdmin = effectiveUser?.rolPersonalizado === 'ADMIN';
    if (isAdmin) return true;

    // Si es profesor, solo puede editar si es su asignación
    const isProf = effectiveUser?.rolPersonalizado === 'PROF';
    if (isProf) {
      // Verificar si el profesorId de la asignación coincide con el ID del usuario actual
      // (considerando posibles desincronizaciones entre auth y BD)
      return asignacion.profesorId === userIdActual || asignacion.profesorId === effectiveUser?.id;
    }

    return false;
  }, [asignacion, effectiveUser, userIdActual]);

  // Obtener lista de profesores disponibles
  const profesoresDisponibles = useMemo(() => {
    return usuarios
      .filter(u => u.rolPersonalizado === 'PROF')
      .map(p => ({
        value: p.id,
        label: getNombreVisible(p),
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [usuarios]);

  const handleEditarInformacion = () => {
    if (!asignacion) return;
    // Usar semanaInicioISO si existe, sino usar la fecha actual
    const fechaInicial = asignacion.semanaInicioISO
      ? asignacion.semanaInicioISO
      : formatLocalDate(new Date());

    console.log('Inicializando edición con fecha:', fechaInicial, 'de asignación:', asignacion.semanaInicioISO);

    setEditData({
      piezaId: asignacion.piezaId,
      fechaSeleccionada: fechaInicial,
      semanaInicioISO: fechaInicial,
      foco: asignacion.foco || 'GEN',
      notas: asignacion.notas || '',
      profesorId: asignacion.profesorId || null,
    });
    setShowEditDrawer(true);
  };

  // Atajos de teclado para el modal de edición
  useEffect(() => {
    if (!showEditDrawer) return;

    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === '.') {
        e.preventDefault();
        setShowEditDrawer(false);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        handleGuardarEdicion();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showEditDrawer, editData]);

  const handleGuardarEdicion = () => {
    console.log('[handleGuardarEdicion] Called with editData:', editData);
    if (!editData) {
      toast.error('❌ Error: No hay datos para guardar');
      return;
    }
    console.log('[handleGuardarEdicion] piezaId:', editData.piezaId, 'fechaSeleccionada:', editData.fechaSeleccionada);
    // piezaId can be null (optional field now)
    if (!editData.fechaSeleccionada || editData.fechaSeleccionada.trim() === '') {
      toast.error('❌ Debes seleccionar una fecha');
      return;
    }
    console.log('[handleGuardarEdicion] Passed fecha validation');

    // Only show confirmation when changing from one pieza to another (not when removing pieza)
    if (editData.piezaId && editData.piezaId !== asignacion.piezaId) {
      if (!window.confirm('Cambiar pieza actualizará el material de FM. ¿Continuar?')) {
        return;
      }
    }
    console.log('[handleGuardarEdicion] Passed pieza confirm check');

    const semanaInicioISO = calcularLunesSemanaISO(editData.fechaSeleccionada);
    console.log('[handleGuardarEdicion] semanaInicioISO:', semanaInicioISO);
    if (!semanaInicioISO) {
      toast.error('❌ Error al calcular la fecha de inicio');
      return;
    }
    console.log('[handleGuardarEdicion] Passed semana validation');

    // Validar foco: solo valores permitidos
    const focoPermitidos = ['GEN', 'LIG', 'RIT', 'ART', 'S&A'];
    const foco = editData.foco || 'GEN';
    console.log('[handleGuardarEdicion] foco:', foco, 'permitidos:', focoPermitidos);
    if (!focoPermitidos.includes(foco)) {
      toast.error(`❌ Valor de foco no válido. Debe ser uno de: ${focoPermitidos.join(', ')}`);
      return;
    }
    console.log('[handleGuardarEdicion] Passed foco validation');

    // Validar notas: string o null (no puede ser undefined)
    const notas = editData.notas && editData.notas.trim() !== ''
      ? editData.notas.trim()
      : null;

    const dataToSave = {
      piezaId: editData.piezaId,
      semanaInicioISO: semanaInicioISO,
      foco: foco,
      notas: notas, // null si está vacío
    };
    console.log('[handleGuardarEdicion] dataToSave created:', dataToSave);

    // Incluir profesorId solo si el usuario tiene permisos para cambiarlo
    console.log('[handleGuardarEdicion] puedeEditarProfesor:', puedeEditarProfesor, 'editData.profesorId:', editData.profesorId, 'original:', asignacion?.profesorId);
    if (puedeEditarProfesor && editData.profesorId !== undefined) {
      // Solo validar si el profesor cambió respecto al original
      if (editData.profesorId !== asignacion?.profesorId && editData.profesorId !== null) {
        // Validar que el nuevo profesorId existe en la lista de profesores
        const profesorExiste = profesoresDisponibles.some(p => p.value === editData.profesorId);
        console.log('[handleGuardarEdicion] profesorExiste:', profesorExiste, 'profesoresDisponibles:', profesoresDisponibles.length);
        if (!profesorExiste) {
          toast.error('❌ El profesor seleccionado no es válido');
          return;
        }
      }
      dataToSave.profesorId = editData.profesorId || null;
    }
    console.log('[handleGuardarEdicion] Final dataToSave:', dataToSave);

    // Campos permitidos en update: notas, foco, estado, semanaInicioISO, piezaId, piezaSnapshot (solo si piezaId cambió), profesorId (solo si tiene permisos)
    // Campos PROHIBIDOS en update: plan (solo se actualiza en create completo)

    console.log('[handleGuardarEdicion] Calling editarMutation.mutate...');
    editarMutation.mutate(dataToSave);
  };

  const toggleSemana = (index) => {
    const newExpanded = new Set(expandedSemanas);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedSemanas(newExpanded);
  };

  const toggleSesion = (semanaIndex, sesionIndex) => {
    const key = `${semanaIndex}-${sesionIndex}`;
    const newExpanded = new Set(expandedSesiones);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedSesiones(newExpanded);
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
    RIT: componentStyles.status.badgeDefault, // Usar default para púrpura
    ART: componentStyles.status.badgeSuccess,
    'S&A': componentStyles.status.badgeDefault, // Usar default para brand
  };

  const estadoColors = {
    borrador: componentStyles.status.badgeDefault,
    publicada: componentStyles.status.badgeSuccess,
    en_curso: componentStyles.status.badgeInfo,
    cerrada: componentStyles.status.badgeWarning,
  };

  const estadoLabels = {
    borrador: 'Borrador',
    publicada: 'Publicada',
    en_curso: 'En Curso',
    cerrada: 'Cerrada',
  };

  if (isLoading) {
    return (
      <LoadingSpinner
        size="xl"
        variant="fullPage"
        text="Cargando asignación..."
      />
    );
  }

  if (!asignacion) {
    return (
      <div className="flex items-center justify-center min-h-[80vh]">
        <Card className={`max-w-md ${componentStyles.containers.cardBase}`}>
          <CardContent className="pt-6 text-center space-y-4">
            <Shield className={`w-16 h-16 mx-auto ${componentStyles.empty.emptyIcon} text-[var(--color-danger)]`} />
            <div>
              <h2 className="text-lg md:text-xl font-semibold text-[var(--color-text-primary)] mb-2 font-headings">Asignación No Encontrada</h2>
              <p className="text-sm md:text-base text-[var(--color-text-primary)]">No tienes acceso a esta asignación o no existe.</p>
              <Button onClick={() => navigate(-1)} className={`mt-4 ${componentStyles.buttons.primary}`}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Volver
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!asignacion) {
    return null; // Early return si asignacion es undefined
  }

  const alumno = usuarios.find(u => u.id === asignacion.alumnoId);
  const isCerrada = asignacion.estado === 'cerrada';
  const isBorrador = asignacion.estado === 'borrador';
  const isAdminOrProf = effectiveUser?.rolPersonalizado === 'ADMIN' || effectiveUser?.rolPersonalizado === 'PROF';

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        icon={Target}
        title="Detalle de Asignación"
        subtitle={`Estudiante: ${getNombreVisible(alumno)}`}
      />

      <div className="studia-section space-y-4">
        <Card className={componentStyles.containers.cardBase}>
          <CardHeader className="space-y-4">
            {/* Primera fila: Acciones */}
            <div className="flex items-center justify-between gap-4">
              {/* Volver: alineado a la izquierda */}
              <Button variant="ghost" onClick={() => navigate(-1)} className={componentStyles.buttons.ghost}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Volver
              </Button>
              {/* Resto: alineado a la derecha */}
              <div className="flex gap-2 flex-wrap items-center">
                {/* 2. Adaptar Plan */}
                {isAdminOrProf && (
                  <Button
                    variant="outline"
                    onClick={() => navigate(createPageUrl(`adaptar-asignacion?id=${asignacionId}`))}
                    className={componentStyles.buttons.outline}
                  >
                    <SlidersHorizontal className="w-4 h-4 mr-2" />
                    Adaptar plan
                  </Button>
                )}
                {/* 3. Editar Asignación */}
                {isAdminOrProf && (
                  <Button variant="outline" size="sm" onClick={handleEditarInformacion} className={componentStyles.buttons.outline}>
                    <Edit className="w-4 h-4 mr-2" />
                    Editar Asignación
                  </Button>
                )}
                {/* 4. Cerrar */}
                {!isCerrada && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (window.confirm('¿Cerrar esta asignación?')) {
                        cerrarMutation.mutate();
                      }
                    }}
                    disabled={cerrarMutation.isPending}
                    className={componentStyles.buttons.outline}
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Cerrar
                  </Button>
                )}
                {/* 5. Eliminar */}
                {isAdminOrProf && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (window.confirm('¿Eliminar permanentemente esta asignación? Esta acción no se puede deshacer.')) {
                        eliminarMutation.mutate();
                      }
                    }}
                    disabled={eliminarMutation.isPending}
                    className={`${componentStyles.buttons.outline} text-[var(--color-danger)] hover:bg-[var(--color-danger)]/10 hover:border-[var(--color-danger)]`}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Eliminar
                  </Button>
                )}
                {/* 6. Estado (Badge) */}
                <Badge className={`rounded-full ${estadoColors[asignacion.estado]}`}>
                  {estadoLabels[asignacion.estado]}
                </Badge>
                {/* Publicar (solo si es borrador) */}
                {isBorrador && (
                  <Button
                    onClick={() => publicarMutation.mutate()}
                    disabled={publicarMutation.isPending}
                    className={componentStyles.buttons.primary}
                  >
                    Publicar
                  </Button>
                )}
              </div>
            </div>
            {/* Segunda fila: Título */}
            <CardTitle className="text-[var(--color-text-primary)]">Información General</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className={componentStyles.layout.grid2}>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-[var(--color-primary-soft)] border border-[var(--color-primary)]/20 flex items-center justify-center shrink-0">
                  <User className="w-5 h-5 text-[var(--color-primary)]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-[var(--color-text-secondary)] mb-1 uppercase tracking-wide">Estudiante</p>
                  <p className="text-base md:text-lg font-semibold text-[var(--color-text-primary)] mb-0.5">{getNombreVisible(alumno)}</p>
                  <p className="text-xs text-[var(--color-text-secondary)]">{alumno?.email}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-[var(--color-primary-soft)] border border-[var(--color-primary)]/20 flex items-center justify-center shrink-0">
                  <Music className="w-5 h-5 text-[var(--color-primary)]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-[var(--color-text-secondary)] mb-1 uppercase tracking-wide">Pieza</p>
                  <p className="text-base md:text-lg font-semibold text-[var(--color-text-primary)] mb-0.5">{asignacion.piezaSnapshot?.nombre}</p>
                  <p className="text-xs text-[var(--color-text-secondary)]">
                    {asignacion.piezaSnapshot?.nivel} • {asignacion.piezaSnapshot?.elementos?.length || 0} elementos
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-[var(--color-primary-soft)] border border-[var(--color-primary)]/20 flex items-center justify-center shrink-0">
                  <BookOpen className="w-5 h-5 text-[var(--color-primary)]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-[var(--color-text-secondary)] mb-1 uppercase tracking-wide">Plan</p>
                  <p className="text-base md:text-lg font-semibold text-[var(--color-text-primary)] mb-0.5">{asignacion.plan?.nombre}</p>
                  <p className="text-xs text-[var(--color-text-secondary)]">
                    {asignacion.plan?.semanas?.length || 0} semanas
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-[var(--color-primary-soft)] border border-[var(--color-primary)]/20 flex items-center justify-center shrink-0">
                  <Calendar className="w-5 h-5 text-[var(--color-primary)]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-[var(--color-text-secondary)] mb-1 uppercase tracking-wide">Semana de Inicio</p>
                  <p className="text-base md:text-lg font-semibold text-[var(--color-text-primary)]">
                    {asignacion?.semanaInicioISO && typeof asignacion.semanaInicioISO === 'string' && asignacion.semanaInicioISO.trim() !== '' ? (
                      (() => {
                        try {
                          const fecha = parseLocalDate(asignacion.semanaInicioISO);
                          return fecha.toLocaleDateString('es-ES', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          });
                        } catch (error) {
                          console.error('Error parsing fecha:', error, asignacion.semanaInicioISO);
                          return <span className="text-[var(--color-text-secondary)]">Fecha inválida</span>;
                        }
                      })()
                    ) : (
                      <span className="text-[var(--color-text-secondary)]">No definida</span>
                    )}
                  </p>
                </div>
              </div>

              {asignacion.foco && (
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[var(--color-primary-soft)] border border-[var(--color-primary)]/20 flex items-center justify-center shrink-0">
                    <Settings className="w-5 h-5 text-[var(--color-primary)]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-[var(--color-text-secondary)] mb-1 uppercase tracking-wide">Foco</p>
                    <div className="mt-0.5">
                      <Badge className={focoColors[asignacion.foco]}>
                        {focoLabels[asignacion.foco]}
                      </Badge>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-[var(--color-primary-soft)] border border-[var(--color-primary)]/20 flex items-center justify-center shrink-0">
                  <User className="w-5 h-5 text-[var(--color-primary)]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-[var(--color-text-secondary)] mb-1 uppercase tracking-wide">Profesor</p>
                  {(() => {
                    const profesor = usuarios.find(u => u.id === asignacion.profesorId);
                    return profesor ? (
                      <>
                        <p className="text-base md:text-lg font-semibold text-[var(--color-text-primary)] mb-0.5">{getNombreVisible(profesor)}</p>
                        {profesor.email && <p className="text-xs text-[var(--color-text-secondary)]">{profesor.email}</p>}
                      </>
                    ) : (
                      <p className="text-base md:text-lg font-semibold text-[var(--color-text-secondary)]">No asignado</p>
                    );
                  })()}
                </div>
              </div>
            </div>

            {asignacion.notas && (
              <div className="pt-4 border-t border-[var(--color-border-default)]">
                <p className="text-xs font-medium text-[var(--color-text-secondary)] mb-2 uppercase tracking-wide">Notas del Profesor</p>
                <p className="text-sm md:text-base text-[var(--color-text-primary)] leading-relaxed">{asignacion.notas}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className={componentStyles.containers.cardBase}>
          <CardHeader>
            <CardTitle className="text-[var(--color-text-primary)]">Plan de Estudio ({asignacion.plan?.semanas?.length || 0} semanas)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {asignacion.plan?.semanas?.map((semana, semanaIndex) => (
              <div
                key={semanaIndex}
                className="border-l-4 border-[var(--color-primary)] bg-[var(--color-primary-soft)]/50 rounded-r-lg p-3 transition-all hover:bg-[var(--color-primary-soft)] cursor-pointer"
                onClick={() => toggleSemana(semanaIndex)}
              >
                {/* Semana Header */}
                <div className="flex items-start gap-2">
                  <button className="pt-1 flex-shrink-0">
                    {expandedSemanas.has(semanaIndex) ? (
                      <ChevronDown className="w-4 h-4 text-[var(--color-text-secondary)]" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-[var(--color-text-secondary)]" />
                    )}
                  </button>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="font-semibold text-base text-[var(--color-text-primary)]">{semana.nombre}</h3>
                      <Badge className={`rounded-full ${focoColors[semana.foco]}`}>
                        {focoLabels[semana.foco]}
                      </Badge>
                      <span className="text-sm text-[var(--color-text-secondary)]">
                        ({semana.sesiones?.length || 0} sesiones)
                      </span>
                    </div>
                    {semana.objetivo && expandedSemanas.has(semanaIndex) && (
                      <p className="text-sm text-[var(--color-text-secondary)] italic mb-2">"{semana.objetivo}"</p>
                    )}
                  </div>
                </div>

                {/* Sesiones - Expandidas */}
                {expandedSemanas.has(semanaIndex) && semana.sesiones && semana.sesiones.length > 0 && (
                  <div className="mt-3 space-y-2" onClick={(e) => e.stopPropagation()}>
                    {semana.sesiones.map((sesion, sesionIndex) => {
                      const sesionKey = `${semanaIndex}-${sesionIndex}`;
                      const isExpanded = expandedSesiones.has(sesionKey);
                      const tiempoTotal = calcularTiempoSesion(sesion);
                      const tiempoMinutos = Math.floor(tiempoTotal / 60);
                      const tiempoSegundos = tiempoTotal % 60;

                      return (
                        <div
                          key={sesionIndex}
                          className="ml-4 border-l-2 border-[var(--color-info)]/40 bg-[var(--color-info)]/10 rounded-r-lg p-2.5 transition-all hover:bg-[var(--color-info)]/20 cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleSesion(semanaIndex, sesionIndex);
                          }}
                        >
                          {/* Sesión Header */}
                          <div className="flex items-start gap-2">
                            <button className="pt-1 flex-shrink-0">
                              {isExpanded ? (
                                <ChevronDown className="w-3.5 h-3.5 text-[var(--color-text-secondary)]" />
                              ) : (
                                <ChevronRight className="w-3.5 h-3.5 text-[var(--color-text-secondary)]" />
                              )}
                            </button>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <PlayCircle className="w-3.5 h-3.5 text-[var(--color-info)] flex-shrink-0" />
                                <span className="text-sm font-semibold text-[var(--color-text-primary)]">{sesion.nombre}</span>
                                <Badge
                                  variant="outline"
                                  className={tiempoTotal > 0 ? componentStyles.status.badgeSuccess : componentStyles.status.badgeDefault}
                                >
                                  <Clock className="w-3 h-3 mr-1" />
                                  {tiempoMinutos}:{String(tiempoSegundos).padStart(2, '0')} min
                                </Badge>
                                <Badge className={focoColors[sesion.foco]} variant="outline">
                                  {focoLabels[sesion.foco]}
                                </Badge>
                              </div>

                              {isExpanded && (
                                <div className="ml-2 mt-1.5" onClick={(e) => e.stopPropagation()}>
                                  <SessionContentView sesion={sesion} dbBloques={dbBloques} />
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Modal de edición - Drawer en móvil, Modal centrado en desktop */}
      {showEditDrawer && editData && (
        <>
          <div
            className="fixed inset-0 bg-black/40 z-[210]"
            onClick={() => setShowEditDrawer(false)}
          />
          {/* Container: drawer bottom en móvil, modal centrado en desktop */}
          <div className="fixed inset-0 z-[220] flex items-end lg:items-center lg:justify-center pointer-events-none overflow-hidden lg:p-4">
            <div
              className="bg-[var(--color-surface-elevated)] w-full lg:max-w-2xl max-h-[90vh] lg:max-h-[95vh] shadow-card rounded-t-2xl lg:rounded-2xl flex flex-col pointer-events-auto border border-[var(--color-border-default)] lg:my-4"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Handle de arrastre para móvil */}
              <div className="lg:hidden flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 bg-[var(--color-border-strong)] rounded-full" />
              </div>
              <div className="border-b border-[var(--color-border-default)] bg-[var(--color-surface-muted)] lg:rounded-t-2xl px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Edit className="w-6 h-6 text-[var(--color-text-primary)]" />
                    <div>
                      <h2 className="text-xl font-bold text-[var(--color-text-primary)] font-headings">Editar Asignación</h2>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => setShowEditDrawer(false)} className="text-[var(--color-text-primary)] hover:bg-[var(--color-surface)] h-11 w-11 sm:h-9 sm:w-9 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 rounded-xl touch-manipulation" aria-label="Cerrar modal">
                    <X className="w-5 h-5" />
                  </Button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <div>
                  <Label htmlFor="pieza" className="text-[var(--color-text-primary)]">Pieza (opcional)</Label>
                  <Select
                    value={editData.piezaId || 'none'}
                    onValueChange={(v) => setEditData({ ...editData, piezaId: v === 'none' ? null : v })}
                    modal={false}
                  >
                    <SelectTrigger id="pieza" className={`w-full ${componentStyles.controls.selectDefault}`}>
                      <SelectValue placeholder="Selecciona una pieza" />
                    </SelectTrigger>
                    <SelectContent
                      position="popper"
                      side="bottom"
                      align="start"
                      sideOffset={4}
                      className="z-[230] min-w-[var(--radix-select-trigger-width)] max-h-64 overflow-auto"
                    >
                      <SelectItem value="none">Sin pieza asignada</SelectItem>
                      {piezas.length === 0 ? (
                        <div className="p-2 text-sm text-[var(--color-text-secondary)]">No hay piezas</div>
                      ) : (
                        piezas.map((pieza) => (
                          <SelectItem key={pieza.id} value={pieza.id}>
                            {pieza.nombre}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="fecha" className="text-sm font-medium text-[var(--color-text-primary)]">Fecha de inicio (cualquier día) *</Label>
                  <Input
                    id="fecha"
                    type="date"
                    value={editData.fechaSeleccionada || ''}
                    onChange={(e) => {
                      const nuevaFecha = e.target.value;
                      setEditData({ ...editData, fechaSeleccionada: nuevaFecha });
                    }}
                    className={componentStyles.controls.inputDefault}
                  />
                  {editData.fechaSeleccionada && (
                    <Alert className={`mt-2 ${componentStyles.containers.panelBase} border-[var(--color-info)] bg-[var(--color-info)]/10`}>
                      <AlertDescription className="text-xs text-[var(--color-info)]">
                        Se guardará la semana ISO del Lunes{' '}
                        {editData.fechaSeleccionada ? (
                          (() => {
                            try {
                              const lunesISO = calcularLunesSemanaISO(editData.fechaSeleccionada);
                              if (lunesISO && typeof lunesISO === 'string') {
                                return parseLocalDate(lunesISO).toLocaleDateString('es-ES');
                              }
                              return '-';
                            } catch (error) {
                              return '-';
                            }
                          })()
                        ) : '-'}
                      </AlertDescription>
                    </Alert>
                  )}
                </div>

                <div>
                  <Label htmlFor="foco" className="text-sm font-medium text-[var(--color-text-primary)]">Foco</Label>
                  <Select
                    value={editData.foco}
                    onValueChange={(v) => setEditData({ ...editData, foco: v })}
                    modal={false}
                  >
                    <SelectTrigger id="foco" className={`w-full ${componentStyles.controls.selectDefault}`}>
                      <SelectValue placeholder="Selecciona un foco" />
                    </SelectTrigger>
                    <SelectContent
                      position="popper"
                      side="bottom"
                      align="start"
                      sideOffset={4}
                      className="z-[230] min-w-[var(--radix-select-trigger-width)] max-h-64 overflow-auto"
                    >
                      {Object.entries(focoLabels).map(([key, label]) => (
                        <SelectItem key={key} value={key}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="notas" className="text-sm font-medium text-[var(--color-text-primary)]">Notas del profesor</Label>
                  <Textarea
                    id="notas"
                    value={editData.notas}
                    onChange={(e) => setEditData({ ...editData, notas: e.target.value })}
                    placeholder="Comentarios, instrucciones..."
                    rows={4}
                    className={`${componentStyles.controls.inputDefault} resize-none`}
                  />
                </div>

                {puedeEditarProfesor && (
                  <div>
                    <Label htmlFor="profesor" className="text-sm font-medium text-[var(--color-text-primary)]">Profesor asignado</Label>
                    <Select
                      value={editData.profesorId || ''}
                      onValueChange={(v) => setEditData({ ...editData, profesorId: v || null })}
                      modal={false}
                    >
                      <SelectTrigger id="profesor" className={`w-full ${componentStyles.controls.selectDefault}`}>
                        <SelectValue placeholder="Selecciona un profesor" />
                      </SelectTrigger>
                      <SelectContent
                        position="popper"
                        side="bottom"
                        align="start"
                        sideOffset={4}
                        className="z-[230] min-w-[var(--radix-select-trigger-width)] max-h-64 overflow-auto"
                      >
                        {profesoresDisponibles.length === 0 ? (
                          <div className="p-2 text-sm text-[var(--color-text-secondary)]">No hay profesores disponibles</div>
                        ) : (
                          profesoresDisponibles.map((profesor) => (
                            <SelectItem key={profesor.value} value={profesor.value}>
                              {profesor.label}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    {effectiveUser?.rolPersonalizado === 'PROF' && (
                      <p className="text-xs text-[var(--color-text-secondary)] mt-1">
                        Solo puedes cambiar el profesor de tus propias asignaciones.
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div className="border-t border-[var(--color-border-default)] px-6 py-4 bg-[var(--color-surface-muted)] lg:rounded-b-2xl">
                <div className="flex gap-3 mb-2">
                  <Button variant="outline" onClick={() => setShowEditDrawer(false)} className={`flex-1 ${componentStyles.buttons.outline}`}>
                    Cancelar
                  </Button>
                  <Button onClick={handleGuardarEdicion} disabled={editarMutation.isPending} className={`flex-1 ${componentStyles.buttons.primary}`}>
                    {editarMutation.isPending ? (
                      'Guardando...'
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Guardar
                      </>
                    )}
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
    </div>
  );
}
