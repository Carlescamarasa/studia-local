
import React, { useState, useEffect, useCallback } from "react";
import { localDataClient } from "@/api/localDataClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { X, Save, Users, Music, BookOpen, Calendar, Settings, Target, ChevronRight, ChevronLeft, Plus, Check, Loader2, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import StudentSearchBarAsync from "@/components/asignaciones/StudentSearchBarAsync";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { displayName, formatLocalDate, parseLocalDate, startOfMonday, useEffectiveUser } from "@/components/utils/helpers";
import { createPortal } from "react-dom";
import { componentStyles } from "@/design/componentStyles";
import { supabase } from "@/lib/supabaseClient";
import LoadingSpinner from "@/components/ds/LoadingSpinner";

export default function FormularioRapido({ onClose }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    estudiantesIds: [],
    piezaId: '',
    planId: '',
    fechaSeleccionada: '',
    semanaInicioISO: '',
    foco: 'GEN',
    notas: '',
    publicarAhora: false,
    adaptarPlanAhora: true,
  });
  const [filtroProfesor, setFiltroProfesor] = useState('all');

  const effectiveUser = useEffectiveUser();

  // Obtener usuarios solo para la lista de profesores (no para estudiantes)
  const { data: usuarios = [], isLoading: isLoadingUsuarios, isError: isErrorUsuarios, error: errorUsuarios } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const result = await localDataClient.entities.User.list();
      console.log('[FormularioRapido] Usuarios obtenidos de API:', result?.length || 0, result);
      if (result && result.length > 0) {
        console.log('[FormularioRapido] Primer usuario ejemplo:', result[0]);
        console.log('[FormularioRapido] Campos del primer usuario:', Object.keys(result[0]));
        console.log('[FormularioRapido] rolPersonalizado del primer usuario:', result[0].rolPersonalizado);
        console.log('[FormularioRapido] role del primer usuario:', result[0].role);
      }
      return result;
    },
    retry: (failureCount, error) => {
      // No reintentar si es AbortError
      if (error?.name === 'AbortError') return false;
      // Reintentar hasta 3 veces para otros errores
      return failureCount < 3;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 3000),
    staleTime: 5 * 60 * 1000, // 5 minutos
  });

  // Obtener profesores para el filtro
  const profesores = React.useMemo(() => {
    console.log('[FormularioRapido] usuarios recibidos:', usuarios.length, usuarios);
    
    // Verificar tanto rolPersonalizado como role (por si acaso no se normalizó correctamente)
    const profesoresFiltrados = usuarios.filter(u => {
      const rol = u.rolPersonalizado || u.role;
      const esProfesor = rol === 'PROF' || rol === 'ADMIN';
      if (!esProfesor) {
        console.log('[FormularioRapido] Usuario descartado:', u.id, 'rol:', rol, 'usuario completo:', u);
      }
      return esProfesor;
    });
    
    console.log('[FormularioRapido] profesores filtrados:', profesoresFiltrados.length, profesoresFiltrados);
    
    const profesoresMapeados = profesoresFiltrados.map(p => ({
      value: p.id,
      label: displayName(p),
    }));
    
    console.log('[FormularioRapido] profesores mapeados antes de sort:', profesoresMapeados);
    
    return profesoresMapeados.sort((a, b) => a.label.localeCompare(b.label));
  }, [usuarios]);

  // Obtener información de estudiantes ya seleccionados para mostrarlos en los chips
  const selectedStudentsData = React.useMemo(() => {
    return formData.estudiantesIds
      .map(id => {
        const usuario = usuarios.find(u => {
          const rol = u.rolPersonalizado || u.role;
          return u.id === id && rol === 'ESTU';
        });
        if (!usuario) return null;
        return {
          id: usuario.id,
          nombre: displayName(usuario),
          email: usuario.email,
        };
      })
      .filter(Boolean);
  }, [formData.estudiantesIds, usuarios]);

  const { data: piezas = [], isLoading: isLoadingPiezas, isError: isErrorPiezas, error: errorPiezas } = useQuery({
    queryKey: ['piezas'],
    queryFn: () => localDataClient.entities.Pieza.list(),
    retry: (failureCount, error) => {
      // No reintentar si es AbortError
      if (error?.name === 'AbortError') return false;
      // Reintentar hasta 3 veces para otros errores
      return failureCount < 3;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 3000),
    staleTime: 5 * 60 * 1000, // 5 minutos
  });

  const { data: planes = [], isLoading: isLoadingPlanes, isError: isErrorPlanes, error: errorPlanes } = useQuery({
    queryKey: ['planes'],
    queryFn: async () => {
      const result = await localDataClient.entities.Plan.list();
      console.log('[FormularioRapido] Planes obtenidos de API:', result?.length || 0, result);
      return result;
    },
    retry: (failureCount, error) => {
      // No reintentar si es AbortError
      if (error?.name === 'AbortError') return false;
      // Reintentar hasta 3 veces para otros errores
      return failureCount < 3;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 3000),
    staleTime: 5 * 60 * 1000, // 5 minutos
  });

  // Estados de carga agregados
  const isLoadingData = isLoadingUsuarios || isLoadingPiezas || isLoadingPlanes;
  const hasDataError = isErrorUsuarios || isErrorPiezas || isErrorPlanes;

  const crearAsignacionesMutation = useMutation({
    mutationFn: async (data) => {
      // Obtener el usuario autenticado directamente de Supabase Auth
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !authUser) {
        console.error('[FormularioRapido] Error obteniendo usuario autenticado:', authError);
        throw new Error('Usuario no autenticado. Por favor, inicia sesión nuevamente.');
      }

      const profesorId = authUser.id || effectiveUser?.id;
      
      if (!profesorId) {
        throw new Error('No se pudo obtener el ID del profesor. Por favor, inicia sesión nuevamente.');
      }

      const pieza = piezas.find(p => p.id === data.piezaId);
      const plan = planes.find(p => p.id === data.planId);
      
      if (!pieza || !plan) {
        throw new Error('Pieza o Plan no encontrados');
      }

      const planCopy = JSON.parse(JSON.stringify(plan));
      const piezaSnapshot = {
        nombre: pieza.nombre,
        descripcion: pieza.descripcion || '',
        nivel: pieza.nivel,
        tiempoObjetivoSeg: pieza.tiempoObjetivoSeg || 0,
        elementos: pieza.elementos || [],
      };

      const asignaciones = data.estudiantesIds.map(alumnoId => ({
        alumnoId,
        piezaId: data.piezaId,
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
          console.error('[FormularioRapido] Error al crear asignación:', {
            error: error?.message || error,
            code: error?.code,
            status: error?.status,
            details: error?.details,
            asignacion,
          });
          
          const alumno = usuarios.find(e => e.id === asignacion.alumnoId && e.rolPersonalizado === 'ESTU');
          const errorMessage = error?.message || 'Error desconocido';
          
          if (error?.code === '42501' || errorMessage.includes('row-level security')) {
            toast.error(`❌ Error de permisos: No tienes permiso para crear esta asignación.`);
          } else if (errorMessage.includes('CORS') || error?.status === null) {
            toast.error(`❌ Error de CORS: Problema de conexión con el servidor.`);
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

  const calcularLunesSemanaISO = (fecha) => {
    const date = parseLocalDate(fecha);
    return formatLocalDate(startOfMonday(date));
  };

  const getDomingoSemana = (lunes) => {
    const date = parseLocalDate(lunes);
    date.setDate(date.getDate() + 6);
    return formatLocalDate(date);
  };

  useEffect(() => {
    if (formData.fechaSeleccionada) {
      const lunes = calcularLunesSemanaISO(formData.fechaSeleccionada);
      setFormData(prev => ({ ...prev, semanaInicioISO: lunes }));
    }
  }, [formData.fechaSeleccionada]);

  // Validar paso 1 (incluyendo verificar que los datos estén disponibles)
  const isStep1Valid = formData.estudiantesIds.length > 0 && formData.piezaId && formData.fechaSeleccionada && !isLoadingData && piezas.length > 0;

  const handleNext = () => {
    if (isLoadingData) {
      toast.error('Espera a que se carguen los datos...');
      return;
    }
    
    if (piezas.length === 0 && !isLoadingPiezas) {
      toast.error('No hay piezas disponibles. Por favor, crea una pieza primero.');
      return;
    }

    if (!isStep1Valid) {
      if (formData.estudiantesIds.length === 0) {
        toast.error('Selecciona al menos un estudiante');
      } else if (!formData.piezaId) {
        toast.error('Selecciona una pieza');
      } else if (!formData.fechaSeleccionada) {
        toast.error('Selecciona una fecha de inicio');
      }
      return;
    }
    setStep(2);
  };

  const handlePrevious = () => {
    setStep(1);
  };

  const handleCrear = () => {
    if (isLoadingData) {
      toast.error('Espera a que se carguen los datos...');
      return;
    }

    if (!formData.planId) {
      toast.error('Selecciona un plan');
      return;
    }

    if (planes.length === 0 && !isLoadingPlanes) {
      toast.error('No hay planes disponibles. Por favor, crea un plan primero.');
      return;
    }

    crearAsignacionesMutation.mutate(formData);
  };

  // Shortcuts de teclado
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === '.') {
        e.preventDefault();
        onClose();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        if (step === 1) {
          handleNext();
        } else {
        handleCrear();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [step, formData, onClose, handleCrear, handleNext]);

  const piezaSeleccionada = piezas.find(p => p.id === formData.piezaId);
  const planSeleccionado = planes.find(p => p.id === formData.planId);

  const focoLabels = {
    GEN: 'General',
    LIG: 'Ligaduras',
    RIT: 'Ritmo',
    ART: 'Articulación',
    'S&A': 'Sonido y Afinación',
  };

  // Stepper visual
  const Stepper = () => (
    <div className="flex items-center justify-center gap-4 mb-6">
      {/* Paso 1 */}
      <div className="flex items-center gap-2">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm ${
          step >= 1 
            ? 'bg-[var(--color-primary)] text-white' 
            : 'bg-[var(--color-surface-muted)] text-[var(--color-text-secondary)]'
        }`}>
          {step > 1 ? <Check className="w-4 h-4" /> : '1'}
        </div>
        <span className={`text-sm font-medium ${
          step >= 1 
            ? 'text-[var(--color-primary)]' 
            : 'text-[var(--color-text-secondary)]'
        }`}>
          Selección de base
        </span>
      </div>
      
      <ChevronRight className="w-5 h-5 text-[var(--color-text-secondary)]" />
      
      {/* Paso 2 */}
      <div className="flex items-center gap-2">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm ${
          step >= 2 
            ? 'bg-[var(--color-primary)] text-white' 
            : 'bg-[var(--color-surface-muted)] text-[var(--color-text-secondary)]'
        }`}>
          {step > 2 ? <Check className="w-4 h-4" /> : '2'}
                </div>
        <span className={`text-sm font-medium ${
          step >= 2 
            ? 'text-[var(--color-primary)]' 
            : 'text-[var(--color-text-secondary)]'
        }`}>
          Plan de trabajo
        </span>
            </div>
          </div>
  );

  // Paso 1: Selección de base
  const Paso1 = () => {
    // Mostrar estado de carga si los datos no están listos
    if (isLoadingData) {
      return (
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner size="lg" text="Cargando datos..." />
        </div>
      );
    }

    // Mostrar error si hay problemas cargando los datos
    if (hasDataError) {
      return (
        <Alert className="border-[var(--color-danger)]/20 bg-[var(--color-danger)]/10">
          <AlertCircle className="w-4 h-4 text-[var(--color-danger)]" />
          <AlertDescription className="text-sm text-[var(--color-text-primary)]">
            <strong className="text-[var(--color-danger)]">Error al cargar los datos:</strong>
            <ul className="list-disc list-inside mt-2 space-y-1">
              {isErrorUsuarios && <li>No se pudieron cargar los usuarios: {errorUsuarios?.message || 'Error desconocido'}</li>}
              {isErrorPiezas && <li>No se pudieron cargar las piezas: {errorPiezas?.message || 'Error desconocido'}</li>}
              {isErrorPlanes && <li>No se pudieron cargar los planes: {errorPlanes?.message || 'Error desconocido'}</li>}
            </ul>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => {
                queryClient.invalidateQueries({ queryKey: ['users'] });
                queryClient.invalidateQueries({ queryKey: ['piezas'] });
                queryClient.invalidateQueries({ queryKey: ['planes'] });
              }}
              className="mt-3"
            >
              Reintentar
            </Button>
          </AlertDescription>
        </Alert>
      );
    }

    return (
      <div className="space-y-6">
            <div className={componentStyles.layout.grid2}>
        {/* Estudiante(s) */}
              <Card className="app-panel">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-[var(--color-primary)]" />
              <CardTitle className="text-base text-[var(--color-text-primary)]">Estudiante(s) *</CardTitle>
                  </div>
                </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label htmlFor="filtro-profesor" className="text-sm text-[var(--color-text-primary)]">
                Filtrar por profesor
              </Label>
              {isLoadingUsuarios ? (
                <div className="flex items-center gap-2 p-2 text-sm text-[var(--color-text-secondary)]">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Cargando profesores...
                </div>
              ) : (
                <Select value={filtroProfesor} onValueChange={setFiltroProfesor} modal={false} disabled={isErrorUsuarios}>
                  <SelectTrigger id="filtro-profesor" className={`w-full mt-1 ${componentStyles.controls.selectDefault}`}>
                    <SelectValue placeholder={isErrorUsuarios ? "Error al cargar profesores" : "Todos los profesores"} />
                  </SelectTrigger>
                  <SelectContent 
                    position="popper" 
                    side="bottom" 
                    align="start" 
                    sideOffset={4}
                    className="z-[120] min-w-[var(--radix-select-trigger-width)] max-h-64 overflow-auto"
                  >
                    <SelectItem value="all">Todos los profesores</SelectItem>
                    {(() => {
                      console.log('[FormularioRapido] Renderizando SelectContent de profesores, cantidad:', profesores.length, profesores);
                      return profesores.map((prof) => (
                        <SelectItem key={prof.value} value={prof.value}>
                          {prof.label}
                        </SelectItem>
                      ));
                    })()}
                  </SelectContent>
                </Select>
              )}
            </div>

            {isLoadingUsuarios ? (
              <div className="flex items-center gap-2 p-2 text-sm text-[var(--color-text-secondary)]">
                <Loader2 className="w-4 h-4 animate-spin" />
                Cargando estudiantes...
              </div>
            ) : isErrorUsuarios ? (
              <Alert className="border-[var(--color-danger)]/20 bg-[var(--color-danger)]/10">
                <AlertCircle className="w-4 h-4 text-[var(--color-danger)]" />
                <AlertDescription className="text-xs text-[var(--color-text-primary)]">
                  Error al cargar estudiantes: {errorUsuarios?.message || 'Error desconocido'}
                </AlertDescription>
              </Alert>
            ) : (
              <>
                <StudentSearchBarAsync
                  value={formData.estudiantesIds}
                  onChange={(vals) => {
                    setFormData({ ...formData, estudiantesIds: vals });
                  }}
                  placeholder="Buscar estudiante por nombre..."
                  profesorFilter={filtroProfesor !== 'all' ? filtroProfesor : null}
                  selectedStudents={selectedStudentsData}
                />
                <p className="text-xs text-[var(--color-text-secondary)]">
                  {formData.estudiantesIds.length > 0 ? `${formData.estudiantesIds.length} seleccionado(s)` : 'Ninguno seleccionado'}
                </p>
              </>
            )}
                </CardContent>
              </Card>

        {/* Fecha de inicio */}
              <Card className="app-panel">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-[var(--color-primary)]" />
              <CardTitle className="text-base text-[var(--color-text-primary)]">Fecha de inicio *</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Input
                    type="date"
                    value={formData.fechaSeleccionada}
                    onChange={(e) => setFormData({ ...formData, fechaSeleccionada: e.target.value })}
                    className={componentStyles.controls.inputDefault}
                  />
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

      {/* Pieza */}
      <Card className="app-panel">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Music className="w-5 h-5 text-[var(--color-primary)]" />
              <CardTitle className="text-base text-[var(--color-text-primary)]">Pieza *</CardTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                // TODO: Implementar creación inline de pieza
                toast.info('Próximamente: creación de pieza inline');
              }}
              className="text-xs gap-1 text-[var(--color-primary)]"
            >
              <Plus className="w-3 h-3" />
              Añadir nueva
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoadingPiezas ? (
            <div className="flex items-center gap-2 p-2 text-sm text-[var(--color-text-secondary)]">
              <Loader2 className="w-4 h-4 animate-spin" />
              Cargando piezas...
            </div>
          ) : isErrorPiezas ? (
            <Alert className="border-[var(--color-danger)]/20 bg-[var(--color-danger)]/10">
              <AlertCircle className="w-4 h-4 text-[var(--color-danger)]" />
              <AlertDescription className="text-xs text-[var(--color-text-primary)]">
                Error al cargar piezas: {errorPiezas?.message || 'Error desconocido'}
              </AlertDescription>
            </Alert>
          ) : (
            <Select 
              value={formData.piezaId} 
              onValueChange={(v) => {
                console.log('[FormularioRapido] Select Pieza onValueChange:', v);
                setFormData({ ...formData, piezaId: v });
              }}
              onOpenChange={(open) => {
                console.log('[FormularioRapido] Select Pieza onOpenChange:', open);
              }}
              modal={false}
              disabled={piezas.length === 0}
            >
              <SelectTrigger id="pieza" className={`w-full ${componentStyles.controls.selectDefault}`}>
                <SelectValue placeholder={piezas.length === 0 ? "No hay piezas disponibles" : "Selecciona una pieza..."} />
              </SelectTrigger>
              <SelectContent 
                position="popper" 
                side="bottom" 
                align="start" 
                sideOffset={4}
                className="z-[120] min-w-[var(--radix-select-trigger-width)] max-h-64 overflow-auto"
              >
                {(() => {
                  console.log('[FormularioRapido] Renderizando SelectContent de piezas, cantidad:', piezas.length, piezas);
                  if (piezas.length === 0) {
                    return <div className="p-2 text-sm text-[var(--color-text-secondary)]">No hay piezas disponibles</div>;
                  }
                  return piezas.map((pieza) => (
                    <SelectItem key={pieza.id} value={pieza.id}>
                      {pieza.nombre}
                    </SelectItem>
                  ));
                })()}
              </SelectContent>
            </Select>
          )}
          
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
      </div>
    );
  };

  // Paso 2: Plan de trabajo
  const Paso2 = () => (
    <div className="space-y-6">
      {/* Plan */}
      <Card className="app-panel">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-[var(--color-primary)]" />
              <CardTitle className="text-base text-[var(--color-text-primary)]">Plan *</CardTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                // TODO: Implementar creación inline de plan
                toast.info('Próximamente: creación de plan inline');
              }}
              className="text-xs gap-1 text-[var(--color-primary)]"
            >
              <Plus className="w-3 h-3" />
              Añadir nuevo
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoadingPlanes ? (
            <div className="flex items-center gap-2 p-2 text-sm text-[var(--color-text-secondary)]">
              <Loader2 className="w-4 h-4 animate-spin" />
              Cargando planes...
            </div>
          ) : isErrorPlanes ? (
            <Alert className="border-[var(--color-danger)]/20 bg-[var(--color-danger)]/10">
              <AlertCircle className="w-4 h-4 text-[var(--color-danger)]" />
              <AlertDescription className="text-xs text-[var(--color-text-primary)]">
                Error al cargar planes: {errorPlanes?.message || 'Error desconocido'}
              </AlertDescription>
            </Alert>
          ) : (
            <Select 
              value={formData.planId} 
              onValueChange={(v) => setFormData({ ...formData, planId: v })}
              modal={false}
              disabled={planes.length === 0}
            >
              <SelectTrigger id="plan" className={`w-full ${componentStyles.controls.selectDefault}`}>
                <SelectValue placeholder={planes.length === 0 ? "No hay planes disponibles" : "Selecciona un plan..."} />
              </SelectTrigger>
              <SelectContent 
                position="popper" 
                side="bottom" 
                align="start" 
                sideOffset={4}
                className="z-[120] min-w-[var(--radix-select-trigger-width)] max-h-64 overflow-auto"
              >
                {(() => {
                  console.log('[FormularioRapido] Renderizando SelectContent de planes, cantidad:', planes.length, planes);
                  if (planes.length === 0) {
                    return <div className="p-2 text-sm text-[var(--color-text-secondary)]">No hay planes disponibles</div>;
                  }
                  return planes.map((plan) => (
                    <SelectItem key={plan.id} value={plan.id}>
                      {plan.nombre}
                    </SelectItem>
                  ));
                })()}
              </SelectContent>
            </Select>
          )}
          
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

      {/* Notas y Foco */}
      <div className={componentStyles.layout.grid2}>
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
                className="z-[120] min-w-[var(--radix-select-trigger-width)] max-h-64 overflow-auto"
              >
                {Object.entries(focoLabels).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
                  <p className="text-xs text-[var(--color-text-secondary)] mt-1">Por defecto: General</p>
          </CardContent>
        </Card>

        <Card className="app-panel">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5 text-[var(--color-primary)]" />
              <CardTitle className="text-base text-[var(--color-text-primary)]">Notas del estudiante</CardTitle>
                </div>
          </CardHeader>
          <CardContent>
                  <Textarea
                    id="notas"
                    value={formData.notas}
                    onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
              placeholder="Instrucciones o comentarios... (opcional)"
              rows={4}
                    className={componentStyles.controls.inputDefault}
                  />
          </CardContent>
        </Card>
                </div>

      {/* Opciones */}
      <Card className="app-panel">
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

          <div className={`flex items-center justify-between p-3 border border-[var(--color-border-default)] app-panel bg-[var(--color-info)]/10 rounded-lg ${
            formData.estudiantesIds.length > 1 ? 'opacity-60' : ''
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

      {/* Resumen */}
      {isStep1Valid && formData.planId && (
              <Alert className="border-[var(--color-primary)]/20 bg-[var(--color-primary-soft)] app-panel">
                <AlertDescription className="text-sm text-[var(--color-text-primary)]">
                  <strong className="text-[var(--color-primary)]">Resumen:</strong>
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>{formData.estudiantesIds.length} estudiante(s)</li>
                    <li>Pieza: {piezaSeleccionada?.nombre}</li>
                    <li>Plan: {planSeleccionado?.nombre} ({planSeleccionado?.semanas?.length || 0} semanas)</li>
                    <li>Inicio: {formData.semanaInicioISO && parseLocalDate(formData.semanaInicioISO).toLocaleDateString('es-ES')}</li>
                    <li>Foco: {focoLabels[formData.foco]}</li>
              <li>Estado: {formData.adaptarPlanAhora ? 'Borrador (adaptar)' : (formData.publicarAhora ? 'Publicada' : 'Borrador')}</li>
                  </ul>
                </AlertDescription>
              </Alert>
            )}
    </div>
  );

  const modalContent = (
    <>
      <div className="fixed inset-0 bg-black/40 z-[80]" onClick={onClose} />
      
      <div className="fixed inset-0 z-[90] flex items-center justify-center pointer-events-none p-4 overflow-y-auto" role="dialog" aria-modal="true">
        <div 
          className="bg-[var(--color-surface-elevated)] w-full max-w-3xl max-h-[92vh] shadow-card rounded-[var(--radius-modal)] flex flex-col pointer-events-auto my-8"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="border-b border-[var(--color-border-default)] bg-[var(--color-surface-muted)] rounded-t-[var(--radius-modal)] px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Target className="w-6 h-6 text-[var(--color-text-primary)]" />
                <div>
                  <h2 className="text-xl font-bold text-[var(--color-text-primary)]">Nueva Asignación</h2>
                  <p className="text-sm text-[var(--color-text-secondary)]">Paso {step} de 2</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={onClose} className="text-[var(--color-text-primary)] hover:bg-[var(--color-surface)] h-11 w-11 sm:h-9 sm:w-9 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 rounded-[var(--btn-radius)] touch-manipulation">
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Stepper */}
            <div className="mt-4">
              <Stepper />
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {step === 1 ? <Paso1 /> : <Paso2 />}
          </div>

          {/* Footer */}
          <div className="border-t border-[var(--color-border-default)] px-6 py-4 bg-[var(--color-surface-muted)] rounded-b-[var(--radius-modal)]">
            <div className="flex gap-3 mb-2">
              {step === 1 ? (
                <>
              <Button variant="outline" onClick={onClose} className={`flex-1 ${componentStyles.buttons.outline}`}>
                Cancelar
              </Button>
                  <Button
                    onClick={handleNext}
                    disabled={!isStep1Valid || isLoadingData || piezas.length === 0}
                    className={`flex-1 ${componentStyles.buttons.primary}`}
                  >
                    {isLoadingData ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Cargando...
                      </>
                    ) : (
                      <>
                        Siguiente
                        <ChevronRight className="w-4 h-4 ml-2" />
                      </>
                    )}
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="outline" onClick={handlePrevious} className={`flex-1 ${componentStyles.buttons.outline}`}>
                    <ChevronLeft className="w-4 h-4 mr-2" />
                    Anterior
                  </Button>
                <Button
                  onClick={handleCrear}
                  loading={crearAsignacionesMutation.isPending}
                    loadingText={formData.adaptarPlanAhora ? "Creando..." : formData.publicarAhora ? "Publicando..." : "Guardando..."}
                    disabled={!formData.planId || crearAsignacionesMutation.isPending}
                  className={`flex-1 ${componentStyles.buttons.primary}`}
                >
                    {formData.adaptarPlanAhora ? (
                      <>
                        Crear y adaptar
                        <Target className="w-4 h-4 ml-2" />
                      </>
                    ) : formData.publicarAhora ? (
                      <>
                        Crear y publicar
                        <Save className="w-4 h-4 ml-2" />
                      </>
                    ) : (
                      <>
                  <Save className="w-4 h-4 mr-2" />
                  Guardar borrador
                      </>
                    )}
                </Button>
                </>
              )}
            </div>
            <p className="text-xs text-center text-[var(--color-text-secondary)]">
              {step === 1 
                ? 'Ctrl/⌘+Intro : siguiente • Ctrl/⌘+. : cancelar'
                : 'Ctrl/⌘+Intro : crear • Ctrl/⌘+. : cancelar'
              }
            </p>
          </div>
        </div>
      </div>
    </>
  );

  return createPortal(modalContent, document.body);
}
