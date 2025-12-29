import React, { useState, useEffect, useCallback } from "react";
import { getCachedAuthUser } from "@/auth/authUserCache";
import { localDataClient } from "@/api/localDataClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useUsers } from "@/features/shared/hooks/useUsers";
import type { UserEntity } from "@/features/shared/hooks/useUsers";
import { Button } from "@/features/shared/components/ui/button";
import { Input } from "@/features/shared/components/ui/input";
import { Label } from "@/features/shared/components/ui/label";
import { Textarea } from "@/features/shared/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/features/shared/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/features/shared/components/ui/card";
import { X, Save, Users, Music, BookOpen, Calendar, Settings, Target, Plus, Ban } from "lucide-react";
import { Alert, AlertDescription } from "@/features/shared/components/ui/alert";
import { Switch } from "@/features/shared/components/ui/switch";
import StudentSearchBarAsync from "@/features/asignaciones/components/StudentSearchBarAsync";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { displayName, formatLocalDate, parseLocalDate, startOfMonday } from "@/features/shared/utils/helpers";
import { useEffectiveUser } from "@/providers/EffectiveUserProvider";
import { createPortal } from "react-dom";
import { componentStyles } from "@/design/componentStyles";
import { supabase } from "@/lib/supabaseClient";
// @ts-expect-error PieceEditor not typed yet
import PieceEditor from "@/features/editor/components/PieceEditor";
// @ts-expect-error PlanEditor not typed yet
import PlanEditor from "@/features/editor/components/PlanEditor";

// ============================================================================
// Type Definitions
// ============================================================================

type FocoKey = 'GEN' | 'TEC' | 'INT' | 'MEM' | 'RIT' | 'SON' | 'OTR';

interface FormularioFormData {
  estudiantesIds: string[];
  piezaId: string;
  planId: string;
  fechaSeleccionada: string;
  semanaInicioISO: string;
  foco: FocoKey;
  notas: string;
  publicarAhora: boolean;
  adaptarPlanAhora: boolean;
}

interface FormErrors {
  estudiantes?: string | null;
  pieza?: string | null;
  plan?: string | null;
  fecha?: string | null;
}

interface Pieza {
  id: string;
  nombre: string;
  descripcion?: string;
  nivel?: string;
  tiempoObjetivoSeg?: number;
  elementos?: unknown[];
}

interface Plan {
  id: string;
  nombre: string;
  semanas?: unknown[];
  focoGeneral?: string;
}

interface SelectedStudent {
  id: string;
  nombre: string;
  email?: string;
}

interface FormularioRapidoProps {
  onClose: () => void;
  initialStudentId?: string | null;
}

// ============================================================================
// Component
// ============================================================================

export default function FormularioRapido({ onClose, initialStudentId = null }: FormularioRapidoProps) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [formData, setFormData] = useState<FormularioFormData>({
    estudiantesIds: initialStudentId ? [initialStudentId] : [],
    piezaId: '',
    planId: '',
    fechaSeleccionada: '',
    semanaInicioISO: '',
    foco: 'GEN',
    notas: '',
    publicarAhora: false,
    adaptarPlanAhora: true,
  });
  const [filtroProfesor, setFiltroProfesor] = useState<string>('all');
  const [piezaEditorAbierto, setPiezaEditorAbierto] = useState<boolean>(false);
  const [planEditorAbierto, setPlanEditorAbierto] = useState<boolean>(false);
  const [contadorPiezasAntes, setContadorPiezasAntes] = useState<number | null>(null);
  const [contadorPlanesAntes, setContadorPlanesAntes] = useState<number | null>(null);

  const effectiveUser = useEffectiveUser();

  // Usar hook centralizado para usuarios
  const { data: usuarios = [] } = useUsers();

  // Obtener profesores para el filtro
  const profesores = React.useMemo(() => {
    return usuarios
      .filter(u => u.rolPersonalizado === 'PROF' || u.rolPersonalizado === 'ADMIN')
      .map(p => ({
        value: p.id,
        label: displayName(p),
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [usuarios]);

  // Obtener información de estudiantes ya seleccionados para mostrarlos en los chips
  const selectedStudentsData = React.useMemo(() => {
    return formData.estudiantesIds
      .map(id => {
        const usuario = usuarios.find(u => u.id === id && u.rolPersonalizado === 'ESTU');
        if (!usuario) return null;
        return {
          id: usuario.id,
          nombre: displayName(usuario),
        };
      })
      .filter((s): s is SelectedStudent => s !== null);
  }, [formData.estudiantesIds, usuarios]);

  const { data: piezas = [] } = useQuery({
    queryKey: ['piezas'],
    queryFn: () => localDataClient.entities.Pieza.list(),
  });

  const { data: planes = [] } = useQuery({
    queryKey: ['planes'],
    queryFn: () => localDataClient.entities.Plan.list(),
  });

  const crearAsignacionesMutation = useMutation({
    mutationFn: async (data: FormularioFormData) => {
      // Intentar obtener usuario de Supabase, pero no bloquear si falla si tenemos effectiveUser
      const authUser = await getCachedAuthUser();

      const profesorId = authUser?.id || effectiveUser?.effectiveUserId;

      if (!profesorId) {
        if (import.meta.env.DEV) {
          console.error('[FormularioRapido] No se encontró usuario autenticado ni effectiveUser');
        }
        throw new Error('Usuario no autenticado. Por favor, inicia sesión nuevamente.');
      }


      const pieza = piezas.find(p => p.id === data.piezaId);
      const plan = planes.find(p => p.id === data.planId);

      if (!plan) {
        throw new Error('Plan no encontrado');
      }

      const planCopy = JSON.parse(JSON.stringify(plan));
      let piezaSnapshot = {
        nombre: 'Sin pieza asignada',
        descripcion: '',
        nivel: '',
        tiempoObjetivoSeg: 0,
        elementos: [],
      };

      if (pieza) {
        piezaSnapshot = {
          nombre: pieza.nombre,
          descripcion: pieza.descripcion || '',
          nivel: pieza.nivel,
          tiempoObjetivoSeg: pieza.tiempoObjetivoSeg || 0,
          elementos: pieza.elementos || [],
        };
      }

      const asignaciones = data.estudiantesIds.map(alumnoId => ({
        alumnoId,
        piezaId: data.piezaId === 'no-piece' ? null : data.piezaId,
        semanaInicioISO: data.semanaInicioISO,
        estado: data.adaptarPlanAhora ? 'borrador' : (data.publicarAhora ? 'publicada' : 'borrador'),
        foco: data.foco || 'GEN',
        notas: data.notas || null,
        plan: planCopy,
        piezaSnapshot,
        profesorId,
      }));

      const results = [];
      for (const asignacion of asignaciones) {
        try {
          const result = await localDataClient.entities.Asignacion.create(asignacion);
          results.push(result);
        } catch (error) {
          if (import.meta.env.DEV) {
            console.error('[FormularioRapido] Error al crear asignación:', {
              error: (error as Error)?.message || error,
              code: (error as { code?: string })?.code,
              status: (error as { status?: number })?.status,
              details: (error as { details?: unknown })?.details,
              asignacion,
            });
          }

          const alumno = usuarios.find(e => e.id === asignacion.alumnoId && e.rolPersonalizado === 'ESTU');
          const errorMessage = (error as Error)?.message || 'Error desconocido';

          if ((error as { code?: string })?.code === '42501' || errorMessage.includes('row-level security')) {
            toast.error(`❌ Error de permisos: No tienes permiso para crear esta asignación. Verifica que estés autenticado correctamente.`);
          } else if (errorMessage.includes('CORS') || (error as { status?: number | null })?.status === null) {
            toast.error(`❌ Error de CORS: Problema de conexión con el servidor. Verifica tu conexión y configuración de CORS en Supabase.`);
          } else {
            toast.error(`❌ No se pudo crear la asignación para ${displayName(alumno)}: ${errorMessage}`);
          }
        }
      }

      return results;
    },
    onSuccess: (results) => {
      queryClient.invalidateQueries({ queryKey: ['asignaciones'] });

      if (results.length === 0) {
        toast.error('No se pudo crear ninguna asignación');
        return;
      }

      if (formData.adaptarPlanAhora && results.length === 1) {
        toast.success('✅ Asignación creada en borrador');
        navigate(createPageUrl(`adaptar-asignacion?id=${results[0].id}`));
      } else if (results.length === 1) {
        toast.success('✅ Asignación creada');
        navigate(createPageUrl(`asignacion-detalle?id=${results[0].id}`));
      } else {
        toast.success(`✅ Se crearon ${results.length} asignaciones`);
        onClose();
      }
    },
    onError: (error) => {
      toast.error(`❌ Error: ${error.message}`);
    },
  });

  const calcularLunesSemanaISO = (fecha: string): string => {
    const date = parseLocalDate(fecha);
    return formatLocalDate(startOfMonday(date));
  };

  const getDomingoSemana = (lunes: string): string => {
    const date = parseLocalDate(lunes);
    date.setDate(date.getDate() + 6);
    return formatLocalDate(date);
  };

  const [errors, setErrors] = useState<FormErrors>({});

  const focoLabels = {
    GEN: 'General',
    TEC: 'Técnica',
    INT: 'Interpretación',
    MEM: 'Memoria',
    RIT: 'Ritmo',
    SON: 'Sonido',
    OTR: 'Otro',
  };

  const piezaSeleccionada = React.useMemo(() => {
    return piezas.find(p => p.id === formData.piezaId);
  }, [formData.piezaId, piezas]);

  const planSeleccionado = React.useMemo(() => {
    return planes.find(p => p.id === formData.planId);
  }, [formData.planId, planes]);

  useEffect(() => {
    if (formData.fechaSeleccionada) {
      setFormData(prev => ({
        ...prev,
        semanaInicioISO: calcularLunesSemanaISO(prev.fechaSeleccionada),
      }));
    } else {
      setFormData(prev => ({ ...prev, semanaInicioISO: '' }));
    }
  }, [formData.fechaSeleccionada]);

  const handlePiezaEditorClose = useCallback((newPieceId: string | null) => {
    setPiezaEditorAbierto(false);
    if (newPieceId && contadorPiezasAntes !== null && piezas.length < contadorPiezasAntes + 1) {
      queryClient.invalidateQueries({ queryKey: ['piezas'] });
      setFormData(prev => ({ ...prev, piezaId: newPieceId }));
    }
  }, [piezas.length, contadorPiezasAntes, queryClient]);

  const handlePlanEditorClose = useCallback((newPlanId: string | null) => {
    setPlanEditorAbierto(false);
    if (newPlanId && contadorPlanesAntes !== null && planes.length < contadorPlanesAntes + 1) {
      queryClient.invalidateQueries({ queryKey: ['planes'] });
      setFormData(prev => ({ ...prev, planId: newPlanId }));
    }
  }, [planes.length, contadorPlanesAntes, queryClient]);

  const handleCrear = () => {
    const newErrors = {};
    let hasError = false;

    if (formData.estudiantesIds.length === 0) {
      newErrors.estudiantes = 'Selecciona al menos un estudiante';
      hasError = true;
    }
    if (!formData.piezaId) {
      // Allow 'no-piece' or empty if that's what we want, but user specifically asked for "Sin pieza" option.
      // If we add a specific "Sin pieza" item with value "no-piece", we should check for falsy but allow "no-piece".
      // But actually, if we initially have '', we force selection.
      newErrors.pieza = 'Selecciona una pieza o indica "Sin pieza"';
      hasError = true;
    }
    if (!formData.planId) {
      newErrors.plan = 'Selecciona un plan';
      hasError = true;
    }
    if (!formData.fechaSeleccionada) {
      newErrors.fecha = 'Selecciona una fecha de inicio';
      hasError = true;
    }

    if (hasError) {
      setErrors(newErrors);
      toast.error('Por favor, completa los campos requeridos');
      return;
    }

    setErrors({});
    crearAsignacionesMutation.mutate(formData);
  };

  const modalContent = (
    <>
      <div className="fixed inset-0 bg-black/40 z-[300] transition-opacity" onClick={onClose} />

      <div className="fixed inset-0 z-[310] flex items-center justify-center pointer-events-none p-4" role="dialog" aria-modal="true">
        <div
          className="bg-[var(--color-surface-elevated)] w-full max-w-4xl max-h-[92vh] shadow-card rounded-[var(--radius-modal)] flex flex-col pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-[var(--color-border-default)] shrink-0">
            <h2 className="text-xl font-semibold text-[var(--color-text-primary)]">Asignación rápida</h2>
            <Button variant="ghost" size="icon" onClick={onClose} className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]">
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Same content as before, assuming inner structure is fine if wrapper is fixed */}
            {/* ... Content Lines 259 to 633 in original check ... */}

            {/* Grupo 1: Datos base */}
            <div className="rounded-2xl shadow-sm border border-[var(--color-border-default)] p-6 bg-[var(--color-surface-muted)]/30">
              <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4 flex items-center gap-2">
                <Target className="w-5 h-5 text-[var(--color-primary)]" />
                Datos base
              </h3>
              <div className={`grid grid-cols-1 lg:grid-cols-2 gap-6`}>
                {/* Estudiante(s) */}
                <Card className="app-panel">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <Users className="w-5 h-5 text-[var(--color-primary)]" />
                      <CardTitle className="text-base text-[var(--color-text-primary)]">Estudiante(s)</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <Label htmlFor="filtro-profesor" className="text-sm text-[var(--color-text-primary)]">
                        Filtrar por profesor
                      </Label>
                      <Select value={filtroProfesor} onValueChange={setFiltroProfesor}>
                        <SelectTrigger id="filtro-profesor" className={`w-full mt-1 ${componentStyles.controls.selectDefault}`}>
                          <SelectValue placeholder="Todos los profesores" />
                        </SelectTrigger>
                        <SelectContent className="z-[320]">
                          <SelectItem value="all">Todos los profesores</SelectItem>
                          {profesores.map((prof) => (
                            <SelectItem key={prof.value} value={prof.value}>
                              {prof.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <StudentSearchBarAsync
                      value={formData.estudiantesIds}
                      onChange={(vals) => {
                        setFormData({ ...formData, estudiantesIds: vals });
                        if (errors.estudiantes) setErrors({ ...errors, estudiantes: null });
                      }}
                      placeholder="Buscar estudiante por nombre..."
                      profesorFilter={filtroProfesor !== 'all' ? filtroProfesor : null}
                      selectedStudents={selectedStudentsData}
                    />
                    <p className="text-xs text-[var(--color-text-secondary)]">
                      {formData.estudiantesIds.length > 0 ? `${formData.estudiantesIds.length} seleccionado(s)` : 'Ninguno seleccionado'}
                    </p>
                    {errors.estudiantes && <p className="text-xs text-red-500">{errors.estudiantes}</p>}
                  </CardContent>
                </Card>

                {/* Pieza */}
                <Card className="app-panel">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Music className="w-5 h-5 text-[var(--color-primary)]" />
                        <CardTitle className="text-base text-[var(--color-text-primary)]">Pieza</CardTitle>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setContadorPiezasAntes(piezas.length);
                          setPiezaEditorAbierto(true);
                        }}
                        className="text-xs gap-1 text-[var(--color-primary)]"
                      >
                        <Plus className="w-3 h-3" />
                        Añadir nueva
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Select
                      value={formData.piezaId}
                      onValueChange={(v) => {
                        setFormData({ ...formData, piezaId: v });
                        if (errors.pieza) setErrors({ ...errors, pieza: null });
                      }}
                      modal={false}
                    >
                      <SelectTrigger id="pieza" className={`w-full ${componentStyles.controls.selectDefault} ${errors.pieza ? 'border-red-500' : ''}`}>
                        <SelectValue placeholder="Selecciona una pieza..." />
                      </SelectTrigger>
                      <SelectContent
                        position="popper"
                        side="bottom"
                        align="start"
                        sideOffset={4}
                        className="z-[320] min-w-[var(--radix-select-trigger-width)] max-h-64 overflow-auto"
                      >
                        {piezas.length === 0 ? (
                          <div className="p-2 text-sm text-[var(--color-text-secondary)]">No hay piezas disponibles</div>
                        ) : (
                          <>
                            <SelectItem value="no-piece">
                              <div className="flex items-center gap-2 text-[var(--color-text-secondary)]">
                                <Ban className="w-4 h-4" />
                                <span>Sin pieza asignada</span>
                              </div>
                            </SelectItem>
                            {piezas.map((pieza) => (
                              <SelectItem key={pieza.id} value={pieza.id}>
                                {pieza.nombre}
                              </SelectItem>
                            ))}
                          </>
                        )}
                      </SelectContent>
                    </Select>
                    {errors.pieza && <p className="text-xs text-red-500">{errors.pieza}</p>}
                    {piezaSeleccionada && (
                      <div className="mt-2 p-3 bg-[var(--color-surface-muted)] rounded-lg border border-[var(--color-border-default)]">
                        <p className="text-sm font-medium text-[var(--color-text-primary)] mb-1">{piezaSeleccionada.nombre}</p>
                        <div className="flex gap-4 text-xs text-[var(--color-text-secondary)]">
                          <span><strong className="text-[var(--color-text-primary)]">Nivel:</strong> {piezaSeleccionada.nivel || 'No especificado'}</span>
                          <span><strong className="text-[var(--color-text-primary)]">Elementos:</strong> {piezaSeleccionada.elementos?.length || 0}</span>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Fecha de inicio */}
                <Card className="app-panel lg:col-span-2">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-[var(--color-primary)]" />
                      <CardTitle className="text-base text-[var(--color-text-primary)]">Fecha de inicio</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2 relative" style={{ zIndex: 120 }}>
                    <Input
                      type="date"
                      value={formData.fechaSeleccionada}
                      onChange={(e) => {
                        setFormData({ ...formData, fechaSeleccionada: e.target.value });
                        if (errors.fecha) setErrors({ ...errors, fecha: null });
                      }}
                      className={`${componentStyles.controls.inputDefault} relative ${errors.fecha ? 'border-red-500' : ''}`}
                      style={{ zIndex: 130, position: 'relative' }}
                    />
                    {errors.fecha && <p className="text-xs text-red-500">{errors.fecha}</p>}
                    {formData.fechaSeleccionada && formData.semanaInicioISO && (
                      <Alert className="border-[var(--color-info)]/20 bg-[var(--color-info)]/10 app-panel">
                        <AlertDescription className="text-xs text-[var(--color-text-primary)]">
                          <strong className="text-[var(--color-info)]">Elegido:</strong> {parseLocalDate(formData.fechaSeleccionada).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
                          <br />
                          <strong className="text-[var(--color-info)]">Semana ISO:</strong> Lunes {parseLocalDate(formData.semanaInicioISO).toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })} - Domingo {parseLocalDate(getDomingoSemana(formData.semanaInicioISO)).toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}
                        </AlertDescription>
                      </Alert>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Grupo 2: Detalles del plan */}
            <div className="rounded-2xl shadow-sm border border-[var(--color-border-default)] p-6 bg-[var(--color-surface-muted)]/30">
              <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-[var(--color-primary)]" />
                Detalles del plan
              </h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Plan */}
                <Card className="app-panel">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <BookOpen className="w-5 h-5 text-[var(--color-primary)]" />
                        <CardTitle className="text-base text-[var(--color-text-primary)]">Plan</CardTitle>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setContadorPlanesAntes(planes.length);
                          setPlanEditorAbierto(true);
                        }}
                        className="text-xs gap-1 text-[var(--color-primary)]"
                      >
                        <Plus className="w-3 h-3" />
                        Añadir nuevo
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Select
                      value={formData.planId}
                      onValueChange={(v) => {
                        setFormData({ ...formData, planId: v });
                        if (errors.plan) setErrors({ ...errors, plan: null });
                      }}
                      modal={false}
                    >
                      <SelectTrigger id="plan" className={`w-full ${componentStyles.controls.selectDefault} ${errors.plan ? 'border-red-500' : ''}`}>
                        <SelectValue placeholder="Selecciona un plan..." />
                      </SelectTrigger>
                      <SelectContent
                        position="popper"
                        side="bottom"
                        align="start"
                        sideOffset={4}
                        className="z-[400] min-w-[var(--radix-select-trigger-width)] max-h-64 overflow-auto"
                      >
                        {planes.length === 0 ? (
                          <div className="p-2 text-sm text-[var(--color-text-secondary)]">No hay planes</div>
                        ) : (
                          planes.map((plan) => (
                            <SelectItem key={plan.id} value={plan.id}>
                              {plan.nombre} ({plan.semanas?.length || 0} semanas)
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    {errors.plan && <p className="text-xs text-red-500">{errors.plan}</p>}
                    {planSeleccionado && (
                      <div className="mt-2 p-3 bg-[var(--color-surface-muted)] rounded-lg border border-[var(--color-border-default)]">
                        <p className="text-sm font-medium text-[var(--color-text-primary)] mb-1">{planSeleccionado.nombre}</p>
                        <div className="flex gap-4 text-xs text-[var(--color-text-secondary)]">
                          <span><strong className="text-[var(--color-text-primary)]">Semanas:</strong> {planSeleccionado.semanas?.length || 0}</span>
                          {planSeleccionado.focoGeneral && (
                            <span><strong className="text-[var(--color-text-primary)]">Foco:</strong> {focoLabels[planSeleccionado.focoGeneral] || planSeleccionado.focoGeneral}</span>
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Foco */}
                <Card className="app-panel">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <Settings className="w-5 h-5 text-[var(--color-primary)]" />
                      <CardTitle className="text-base text-[var(--color-text-primary)]">Foco</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Select
                      value={formData.foco}
                      onValueChange={(v) => setFormData({ ...formData, foco: v })}
                      modal={false}
                    >
                      <SelectTrigger id="foco" className={`w-full ${componentStyles.controls.selectDefault}`}>
                        <SelectValue placeholder="Selecciona foco..." />
                      </SelectTrigger>
                      <SelectContent
                        position="popper"
                        side="bottom"
                        align="start"
                        sideOffset={4}
                        className="z-[400] min-w-[var(--radix-select-trigger-width)] max-h-64 overflow-auto"
                      >
                        {Object.entries(focoLabels).map(([key, label]) => (
                          <SelectItem key={key} value={key}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-[var(--color-text-secondary)] mt-2">Por defecto: General</p>
                  </CardContent>
                </Card>

                {/* Notas del estudiante */}
                <Card className="app-panel lg:col-span-2">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <Target className="w-5 h-5 text-[var(--color-primary)]" />
                      <CardTitle className="text-base text-[var(--color-text-primary)]">Notas del estudiante (opcional)</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Textarea
                      id="notas"
                      value={formData.notas}
                      onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
                      placeholder="Instrucciones o comentarios..."
                      rows={3}
                      className={componentStyles.controls.inputDefault}
                    />
                  </CardContent>
                </Card>

                {/* Opciones de publicación */}
                <Card className="app-panel lg:col-span-2">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <Settings className="w-5 h-5 text-[var(--color-primary)]" />
                      <CardTitle className="text-base text-[var(--color-text-primary)]">Opciones de publicación</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between p-3 border border-[var(--color-border-default)] app-panel hover:bg-muted hover:shadow-sm transition-all rounded-lg">
                      <div className="flex-1">
                        <Label htmlFor="publicar" className="font-medium text-[var(--color-text-primary)]">Publicar ahora</Label>
                        <p className="text-xs text-[var(--color-text-secondary)]">Si está desactivado, se guardará como borrador</p>
                      </div>
                      <Switch
                        id="publicar"
                        checked={formData.publicarAhora}
                        onCheckedChange={(checked) => setFormData({ ...formData, publicarAhora: checked, adaptarPlanAhora: false })}
                      />
                    </div>

                    <div className={`flex items-center justify-between p-3 border border-[var(--color-border-default)] app-panel bg-[var(--color-info)]/10 rounded-lg ${formData.estudiantesIds.length > 1 ? 'opacity-60' : ''
                      }`}>
                      <div className="flex-1">
                        <Label htmlFor="adaptar" className="font-medium text-[var(--color-text-primary)]">Adaptar plan ahora (recomendado)</Label>
                        <p className="text-xs text-[var(--color-text-secondary)]">Crear en borrador y abrir editor para adaptar el plan</p>
                      </div>
                      <Switch
                        id="adaptar"
                        checked={formData.adaptarPlanAhora}
                        onCheckedChange={(checked) => setFormData({ ...formData, adaptarPlanAhora: checked, publicarAhora: false })}
                        disabled={formData.estudiantesIds.length > 1}
                      />
                    </div>

                    {formData.estudiantesIds.length > 1 && (
                      <p className="text-xs text-[var(--color-warning)]">
                        ⚠️ Solo puedes adaptar el plan si seleccionas un único estudiante
                      </p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Resumen */}
            {formData.estudiantesIds.length > 0 && formData.piezaId && formData.planId && formData.fechaSeleccionada && (
              <Alert className="border-[var(--color-primary)]/20 bg-[var(--color-primary-soft)] app-panel">
                <AlertDescription className="text-sm text-[var(--color-text-primary)]">
                  <strong className="text-[var(--color-primary)]">Resumen:</strong>
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>{formData.estudiantesIds.length} estudiante(s)</li>
                    <li>Pieza: {formData.piezaId === 'no-piece' ? 'Sin pieza asignada' : piezaSeleccionada?.nombre}</li>
                    <li>Plan: {planSeleccionado?.nombre} ({planSeleccionado?.semanas?.length || 0} semanas)</li>
                    <li>Inicio: {formData.semanaInicioISO && parseLocalDate(formData.semanaInicioISO).toLocaleDateString('es-ES')}</li>
                    <li>Foco: {focoLabels[formData.foco]}</li>
                    <li>Estado: {formData.adaptarPlanAhora ? 'Borrador (adaptar)' : (formData.publicarAhora ? 'Publicada' : 'Borrador')}</li>
                  </ul>
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-[var(--color-border-default)] px-6 py-4 bg-[var(--color-surface-muted)] rounded-b-[var(--radius-modal)] shrink-0 z-50 pointer-events-auto">
            <div className="flex gap-3 mb-2">
              <Button variant="outline" onClick={onClose} className={`flex-1 ${componentStyles.buttons.outline}`}>
                Cancelar
              </Button>
              {formData.adaptarPlanAhora ? (
                <Button
                  onClick={handleCrear}
                  loading={crearAsignacionesMutation.isPending}
                  loadingText="Creando..."
                  className={`flex-1 ${componentStyles.buttons.primary}`}
                >
                  Crear y adaptar
                </Button>
              ) : formData.publicarAhora ? (
                <Button
                  onClick={handleCrear}
                  loading={crearAsignacionesMutation.isPending}
                  loadingText="Creando..."
                  className={`flex-1 ${componentStyles.buttons.primary}`}
                >
                  Crear y publicar
                </Button>
              ) : (
                <Button
                  onClick={handleCrear}
                  loading={crearAsignacionesMutation.isPending}
                  loadingText="Guardando..."
                  className={`flex-1 ${componentStyles.buttons.primary}`}
                >
                  <Save className="w-4 h-4 mr-2" />
                  Guardar borrador
                </Button>
              )}
            </div>
            <p className="text-xs text-center text-[var(--color-text-secondary)]">
              Ctrl/⌘+Intro : acción principal • Ctrl/⌘+. : cancelar
            </p>
          </div>
        </div>
      </div>

      {/* Modales de editores */}
      {
        piezaEditorAbierto && (
          <PieceEditor
            pieza={null}
            onClose={handlePiezaEditorClose}
          />
        )
      }

      {
        planEditorAbierto && (
          <PlanEditor
            plan={null}
            onClose={handlePlanEditorClose}
          />
        )
      }
    </>
  );

  return createPortal(modalContent, document.body);
}
