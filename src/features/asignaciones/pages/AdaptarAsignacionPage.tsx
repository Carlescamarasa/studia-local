
import React, { useState, useEffect } from "react";
import { localDataClient } from "@/api/localDataClient";
import { createRemoteDataAPI } from "@/api/remoteDataAPI";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useUsers } from "@/features/shared/hooks/useUsers";
import { Button } from "@/features/shared/components/ui/button";
import { Card, CardContent } from "@/features/shared/components/ds";
import { Badge } from "@/features/shared/components/ds";
import {
  ArrowLeft, Edit, Trash2, GripVertical, Copy, PlayCircle, AlertCircle, Plus, ChevronDown, ChevronRight, Clock, Layers,
  Save, Target, User, Music, BookOpen, Calendar, Shuffle, Eye
} from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";
import { SortableContext, verticalListSortingStrategy, arrayMove } from "@/features/shared/components/dnd/DndProvider";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { LoadingSpinner } from "@/features/shared/components/ds";
import { componentStyles } from "@/design/componentStyles";
import { getSecuencia, ensureRondaIds, mapBloquesByCode } from "@/features/estudio/components/sessionSequence";
import RequireRole from "@/features/auth/components/RequireRole";
import SessionContentView from "@/features/shared/components/study/SessionContentView";
import { Asignacion, Plan, PlanSemana, PlanSesion, Bloque, SesionRonda, SesionBloque } from "@/types/data.types";
import { DndContext, DragEndEvent, DragOverlay, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import WeekEditor from "@/features/editor/components/WeekEditor";
import SessionEditor from "@/features/editor/components/SessionEditor";

interface SortableSesionAdaptarProps {
  id: string;
  sesion: PlanSesion;
  semanaIndex: number;
  sesionIndex: number;
  expandedSesiones: Set<string>;
  expandedEjercicios: Set<string>;
  toggleSesion: (semanaIndex: number, sesionIndex: number) => void;
  toggleRonda: (semanaIndex: number, sesionIndex: number, rondaIndex: number) => void;
  calcularTiempoSesion: (sesion: PlanSesion) => number;
  setEditingSesion: (data: { semanaIndex: number; sesionIndex: number; sesion: PlanSesion }) => void;
  removeSesion: (semanaIndex: number, sesionIndex: number) => void;
  focoColors: Record<string, string>;
  focoLabels: Record<string, string>;
  tipoColors: Record<string, string>;
  componentStyles: any;
  ensureRondaIds: typeof ensureRondaIds;
  getSecuencia: typeof getSecuencia;
  mapBloquesByCode: typeof mapBloquesByCode;
  dbBloques?: any[];
}

// Componente Sortable para Sesión (similar a PlanEditor pero adaptado)
function SortableSesionAdaptar({
  id,
  sesion,
  semanaIndex,
  sesionIndex,
  expandedSesiones,
  expandedEjercicios,
  toggleSesion,
  toggleRonda,
  calcularTiempoSesion,
  setEditingSesion,
  removeSesion,
  focoColors,
  focoLabels,
  componentStyles,
  dbBloques = []
}: SortableSesionAdaptarProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const sesionKey = `${semanaIndex}-${sesionIndex}`;
  const isExpanded = expandedSesiones.has(sesionKey);
  const tiempoTotal = calcularTiempoSesion(sesion);
  const tiempoMinutos = Math.floor(tiempoTotal / 60);
  const tiempoSegundos = tiempoTotal % 60;

  // Adaptar estado de expansión para SessionContentView
  const expandedRondasMap: Record<string, boolean> = {};
  if (sesion.rondas) {
    sesion.rondas.forEach((r, idx) => {
      const key = `${semanaIndex}-${sesionIndex}-ronda-${idx}`;
      if (expandedEjercicios.has(key)) {
        if (r.id) expandedRondasMap[r.id] = true;
      }
    });
  }

  const handleToggleRondaLocal = (rondaId: string) => {
    const rIndex = sesion.rondas.findIndex(r => r.id === rondaId);
    if (rIndex !== -1) {
      toggleRonda(semanaIndex, sesionIndex, rIndex);
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`ml-4 border-l-2 border-[var(--color-info)]/40 bg-[var(--color-info)]/10 rounded-r-lg p-2.5 transition-all ${isDragging ? 'shadow-card border-[var(--color-info)] opacity-90' : 'hover:bg-[var(--color-info)]/20'
        }`}
    >
      <div className="flex items-start gap-2">
        <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing pt-1" onClick={(e) => e.stopPropagation()}>
          <GripVertical className="w-3.5 h-3.5 text-ui/80" />
        </div>

        <button
          onClick={() => toggleSesion(semanaIndex, sesionIndex)}
          className="pt-1 flex-shrink-0"
        >
          {isExpanded ? (
            <ChevronDown className="w-3.5 h-3.5 text-ui" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 text-ui" />
          )}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <PlayCircle className="w-3.5 h-3.5 text-[var(--color-info)] flex-shrink-0" />
            <span className={`text-sm font-medium text-ui`}>{sesion.nombre}</span>
            <Badge
              variant="outline"
              className={tiempoTotal > 0 ? componentStyles.status.badgeSuccess : componentStyles.status.badgeDefault}
            >
              <Clock className="w-3 h-3 mr-1" />
              {tiempoMinutos}:{String(tiempoSegundos).padStart(2, '0')} min
            </Badge>
            <Badge className={`rounded-full ${focoColors[sesion.foco || 'GEN']}`} variant="outline">
              {focoLabels[sesion.foco || 'GEN']}
            </Badge>
          </div>
          {!isExpanded && (
            <div className="flex items-center gap-1.5 mt-1 text-xs text-[var(--color-text-secondary)]">
              <Layers className="w-2.5 h-2.5" />
              <span>
                {sesion.bloques?.length || 0} ejercicios
                {sesion.rondas && sesion.rondas.length > 0 && `, ${sesion.rondas.length} ${sesion.rondas.length === 1 ? 'ronda' : 'rondas'}`}
              </span>
            </div>
          )}
        </div>
      </div>

      {isExpanded && (
        <div className="mt-2" onClick={(e) => e.stopPropagation()}>
          <SessionContentView
            sesion={sesion as any}
            dbBloques={dbBloques}
            expandedRondas={expandedRondasMap}
            onToggleRonda={handleToggleRondaLocal}
          />
        </div>
      )}

      {/* Session action buttons - always visible */}
      <div className={`flex ${componentStyles.layout.gapCompact} items-center pt-2 mt-2 border-t border-dashed border-[var(--color-border-default)]`}>
        <Button
          size="sm"
          variant="ghost"
          onClick={(e) => {
            e.stopPropagation();
            setEditingSesion({ semanaIndex, sesionIndex, sesion });
          }}
          className={`${componentStyles.buttons.actionCompact} ${componentStyles.buttons.editSubtle}`}
        >
          <Edit className="w-3 h-3 mr-1" />
          Editar "{sesion.nombre}"
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={(e) => {
            e.stopPropagation();
            removeSesion(semanaIndex, sesionIndex);
          }}
          className={`${componentStyles.buttons.actionCompact} ${componentStyles.buttons.deleteSubtle}`}
        >
          <Trash2 className="w-3 h-3 mr-1" />
          Eliminar "{sesion.nombre}"
        </Button>
      </div>
    </div>
  );
}

interface SortableSemanaAdaptarProps {
  id: string;
  semana: PlanSemana;
  semanaIndex: number;
  expandedSemanas: Set<number>;
  expandedSesiones: Set<string>;
  expandedEjercicios: Set<string>;
  toggleSemana: (index: number) => void;
  toggleSesion: (semanaIndex: number, sesionIndex: number) => void;
  toggleRonda: (semanaIndex: number, sesionIndex: number, rondaIndex: number) => void;
  calcularTiempoSesion: (sesion: PlanSesion) => number;
  setEditingSemana: (data: { index: number; semana: PlanSemana }) => void;
  setEditingSesion: (data: { semanaIndex: number; sesionIndex: number; sesion: PlanSesion }) => void;
  removeSemana: (index: number) => void;
  removeSesion: (semanaIndex: number, sesionIndex: number) => void;
  addSesion: (semanaIndex: number) => void;
  duplicateSemana: (index: number) => void;
  focoColors: Record<string, string>;
  focoLabels: Record<string, string>;
  tipoColors: Record<string, string>;
  componentStyles: any;
  ensureRondaIds: typeof ensureRondaIds;
  getSecuencia: typeof getSecuencia;
  mapBloquesByCode: typeof mapBloquesByCode;
  dbBloques?: any[];
}

// Componente Sortable para Semana
function SortableSemanaAdaptar({
  id,
  semana,
  semanaIndex,
  expandedSemanas,
  expandedSesiones,
  expandedEjercicios,
  toggleSemana,
  toggleSesion,
  toggleRonda,
  calcularTiempoSesion,
  setEditingSemana,
  setEditingSesion,
  removeSemana,
  removeSesion,
  addSesion,
  duplicateSemana,
  focoColors,
  focoLabels,
  tipoColors,
  componentStyles,
  ensureRondaIds,
  getSecuencia,
  mapBloquesByCode,
  dbBloques = []
}: SortableSemanaAdaptarProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`border-l-4 border-[var(--color-primary)] bg-[var(--color-primary-soft)]/50 rounded-r-lg p-3 transition-all ${isDragging
        ? `${componentStyles.dnd.dragging} ${componentStyles.elevation.level3}`
        : 'hover:bg-[var(--color-primary-soft)]'
        }`}
    >
      <div className="flex items-start gap-2">
        <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing pt-1" onClick={(e) => e.stopPropagation()}>
          <GripVertical className="w-4 h-4 text-ui/80" />
        </div>

        <button
          onClick={() => toggleSemana(semanaIndex)}
          className="pt-1 flex-shrink-0"
        >
          {expandedSemanas.has(semanaIndex) ? (
            <ChevronDown className="w-4 h-4 text-ui" />
          ) : (
            <ChevronRight className="w-4 h-4 text-ui" />
          )}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h3 className="font-semibold text-base text-ui">{semana.nombre}</h3>
            <Badge className={`rounded-full ${focoColors[semana.foco || 'GEN']}`}>
              {focoLabels[semana.foco || 'GEN']}
            </Badge>
            <span className="text-sm text-ui/80">
              ({semana.sesiones?.length || 0} sesiones)
            </span>
          </div>
          {semana.objetivo && expandedSemanas.has(semanaIndex) && (
            <p className="text-sm text-ui/80 italic mb-2">"{semana.objetivo}"</p>
          )}
        </div>

        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              setEditingSemana({ index: semanaIndex, semana });
            }}
            className={componentStyles.buttons.editIcon}
            aria-label="Editar semana"
          >
            <Edit className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              duplicateSemana(semanaIndex);
            }}
            className={componentStyles.buttons.editIcon}
            title="Duplicar semana"
            aria-label="Duplicar semana"
          >
            <Copy className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              removeSemana(semanaIndex);
            }}
            className={componentStyles.buttons.deleteIcon}
            aria-label="Eliminar semana"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {expandedSemanas.has(semanaIndex) && semana.sesiones && semana.sesiones.length > 0 && (
        <SortableContext
          items={semana.sesiones.map((_, i) => `sesion-${semanaIndex}-${i}`)}
          strategy={verticalListSortingStrategy}
        >
          <div className="mt-3 space-y-2" onClick={(e) => e.stopPropagation()}>
            {semana.sesiones.map((sesion, sesionIndex) => (
              <SortableSesionAdaptar
                key={`sesion-${sesionIndex}`}
                id={`sesion-${semanaIndex}-${sesionIndex}`}
                sesion={sesion}
                semanaIndex={semanaIndex}
                sesionIndex={sesionIndex}
                expandedSesiones={expandedSesiones}
                expandedEjercicios={expandedEjercicios}
                toggleSesion={toggleSesion}
                toggleRonda={toggleRonda}
                calcularTiempoSesion={calcularTiempoSesion}
                setEditingSesion={setEditingSesion}
                removeSesion={removeSesion}
                focoColors={focoColors}
                focoLabels={focoLabels}
                tipoColors={tipoColors}
                componentStyles={componentStyles}
                ensureRondaIds={ensureRondaIds}
                getSecuencia={getSecuencia}
                mapBloquesByCode={mapBloquesByCode}
                dbBloques={dbBloques}
              />
            ))}
          </div>
        </SortableContext>
      )}

      {expandedSemanas.has(semanaIndex) && (
        <div className="flex gap-2 items-center mt-3" onClick={(e) => e.stopPropagation()}>
          <Button
            size="sm"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              addSesion(semanaIndex);
            }}
            className={`${componentStyles.buttons.actionCompact} ${componentStyles.buttons.editSubtle}`}
          >
            <Plus className="w-3 h-3 mr-1" />
            Añadir sesión
          </Button>
        </div>
      )}
    </div>
  );
}

export default function AdaptarAsignacionPage() {
  return (
    <RequireRole anyOf={['ADMIN', 'PROF']}>
      <AdaptarAsignacionPageContent />
    </RequireRole>
  );
}

function AdaptarAsignacionPageContent() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [expandedSemanas, setExpandedSemanas] = useState<Set<number>>(new Set([0]));
  const [expandedSesiones, setExpandedSesiones] = useState<Set<string>>(new Set());
  const [expandedEjercicios, setExpandedEjercicios] = useState<Set<string>>(new Set());
  const [editingSemana, setEditingSemana] = useState<{ index: number; semana: PlanSemana } | null>(null);
  const [editingSesion, setEditingSesion] = useState<{ semanaIndex: number; sesionIndex: number; sesion: PlanSesion } | null>(null);
  const [planData, setPlanData] = useState<Plan | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const asignacionId = searchParams.get('id');

  // Query para obtener bloques con variaciones actualizados
  const { data: dbBloques = [] } = useQuery({
    queryKey: ['bloques-with-variations'],
    queryFn: async () => {
      const api = createRemoteDataAPI();
      try {
        if (api) {
          const data = await api.bloques.list();
          return data || [];
        }
        const localData = await localDataClient.entities.Bloque.list();
        return localData || [];
      } catch (err) {
        console.warn('Error fetching bloques, falling back to empty array', err);
        return [];
      }
    },
    // Stale time de 5 minutos para evitar recargas constantes
    staleTime: 1000 * 60 * 5
  });

  const { data: asignacion, isLoading, error } = useQuery({
    queryKey: ['asignacion', asignacionId],
    queryFn: async () => {
      if (!asignacionId) {
        throw new Error('ID de asignación no proporcionado');
      }
      const result = await localDataClient.entities.Asignacion.list();
      const found = result.find(a => a.id === asignacionId);
      if (!found) {
        throw new Error(`Asignación con ID ${asignacionId} no encontrada`);
      }

      // Validar que la asignación tiene estructura válida
      if (!found.alumnoId) {
        throw new Error('Asignación sin alumnoId válido');
      }
      if (!found.plan || !Array.isArray(found.plan.semanas)) {
        throw new Error('Asignación sin plan válido');
      }

      return found;
    },
    enabled: !!asignacionId,
    retry: false,
  });

  const { data: usuarios = [] } = useUsers();

  useEffect(() => {
    if (asignacion?.plan) {
      setPlanData(JSON.parse(JSON.stringify(asignacion.plan)) as Plan);
    }
  }, [asignacion]);

  const guardarMutation = useMutation({
    mutationFn: async (updatedPlan: Plan) => {
      if (!asignacionId) throw new Error('No ID');
      return localDataClient.entities.Asignacion.update(asignacionId, { plan: updatedPlan });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['asignacion', asignacionId] });
      toast.success('✅ Plan adaptado guardado');
    },
  });

  const publicarMutation = useMutation({
    mutationFn: async () => {
      if (!asignacionId || !planData) throw new Error('No ID or Plan');
      return localDataClient.entities.Asignacion.update(asignacionId, {
        estado: 'publicada',
        plan: planData
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['asignacion', asignacionId] });
      toast.success('✅ Asignación publicada');
      navigate(createPageUrl(`asignacion-detalle?id=${asignacionId}`));
    },
  });

  const handleGuardar = () => {
    if (planData) guardarMutation.mutate(planData);
  };

  const handlePublicar = () => {
    if (window.confirm('¿Publicar esta asignación?')) {
      publicarMutation.mutate();
    }
  };

  const addSemana = () => {
    if (!planData) return;
    const newSemana: PlanSemana = {
      id: crypto.randomUUID(),
      nombre: `Semana ${planData.semanas.length + 1}`,
      objetivo: '',
      foco: 'GEN',
      sesiones: [],
      rondas: []
    };
    setPlanData({
      ...planData,
      semanas: [...planData.semanas, newSemana]
    });
  };

  const updateSemana = (index: number, updatedSemana: PlanSemana) => {
    if (!planData) return;
    const newSemanas = [...planData.semanas];
    newSemanas[index] = updatedSemana;
    setPlanData({ ...planData, semanas: newSemanas });
    setEditingSemana(null);
  };

  const removeSemana = (index: number) => {
    if (!planData) return;
    if (window.confirm('¿Eliminar esta semana y todas sus sesiones?')) {
      setPlanData({
        ...planData,
        semanas: planData.semanas.filter((_, i) => i !== index)
      });
    }
  };

  const duplicateSemana = (index: number) => {
    if (!planData) return;
    const semana = planData.semanas[index];
    const newSemana = JSON.parse(JSON.stringify(semana));
    newSemana.id = crypto.randomUUID();
    newSemana.nombre = `${semana.nombre} (copia)`;
    const newSemanas = [...planData.semanas];
    newSemanas.splice(index + 1, 0, newSemana);
    setPlanData({ ...planData, semanas: newSemanas });
  };

  const addSesion = (semanaIndex: number) => {
    if (!planData) return;
    const newSemanas = [...planData.semanas];
    if (!newSemanas[semanaIndex].sesiones) {
      newSemanas[semanaIndex].sesiones = [];
    }
    newSemanas[semanaIndex].sesiones.push({
      id: crypto.randomUUID(),
      nombre: `Sesión ${newSemanas[semanaIndex].sesiones.length + 1}`,
      foco: 'GEN',
      bloques: [],
      rondas: [],
      code: `S${semanaIndex}S${newSemanas[semanaIndex].sesiones.length}`,
      tipo: 'AD',
      duracionSeg: 0
    });
    setPlanData({ ...planData, semanas: newSemanas });
  };

  const updateSesion = (semanaIndex: number, sesionIndex: number, updatedSesion: PlanSesion) => {
    if (!planData) return;
    const newSemanas = [...planData.semanas];
    newSemanas[semanaIndex].sesiones[sesionIndex] = updatedSesion;
    setPlanData({ ...planData, semanas: newSemanas });
    setEditingSesion(null);
  };

  const removeSesion = (semanaIndex: number, sesionIndex: number) => {
    if (!planData) return;
    if (window.confirm('¿Eliminar esta sesión?')) {
      const newSemanas = [...planData.semanas];
      newSemanas[semanaIndex].sesiones = newSemanas[semanaIndex].sesiones.filter((_, i) => i !== sesionIndex);
      setPlanData({ ...planData, semanas: newSemanas });
      toast.success('✅ Sesión eliminada');
    }
  };

  const removeRonda = (semanaIndex: number, sesionIndex: number, rondaIndex: number) => {
    if (!planData) return;
    if (window.confirm('¿Eliminar esta ronda?')) {
      const newSemanas = [...planData.semanas];
      const sesion = newSemanas[semanaIndex].sesiones[sesionIndex];
      if (sesion && sesion.rondas) {
        sesion.rondas = sesion.rondas.filter((_, i) => i !== rondaIndex);
        setPlanData({ ...planData, semanas: newSemanas });
      }
    }
  };

  const toggleSemana = (index: number) => {
    const newExpanded = new Set(expandedSemanas);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedSemanas(newExpanded);
  };

  const toggleSesion = (semanaIndex: number, sesionIndex: number) => {
    const key = `${semanaIndex}-${sesionIndex}`;
    const newExpanded = new Set(expandedSesiones);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedSesiones(newExpanded);
  };

  const toggleRonda = (semanaIndex: number, sesionIndex: number, rondaIndex: number) => {
    const key = `${semanaIndex}-${sesionIndex}-ronda-${rondaIndex}`;
    const newExpanded = new Set(expandedEjercicios);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedEjercicios(newExpanded);
  };

  // Expandir todas las rondas por defecto cuando se expande el contenido de una sesión
  useEffect(() => {
    if (!planData) return;

    const nuevasRondasExpandidas = new Set(expandedEjercicios);
    let hayCambios = false;

    planData.semanas.forEach((semana, semanaIndex) => {
      semana.sesiones?.forEach((sesion, sesionIndex) => {
        const sesionKey = `${semanaIndex}-${sesionIndex}-ej`;
        if (expandedEjercicios.has(sesionKey) && sesion.rondas) {
          sesion.rondas.forEach((_, rondaIndex) => {
            const rondaKey = `${semanaIndex}-${sesionIndex}-ronda-${rondaIndex}`;
            if (!nuevasRondasExpandidas.has(rondaKey)) {
              nuevasRondasExpandidas.add(rondaKey);
              hayCambios = true;
            }
          });
        }
      });
    });

    if (hayCambios) {
      setExpandedEjercicios(nuevasRondasExpandidas);
    }
  }, [expandedEjercicios, planData]);

  const handleDragEnd = (event: DragEndEvent) => {
    if (!planData) return;
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    // Reordenar semanas
    if (activeId.startsWith('semana-') && overId.startsWith('semana-')) {
      const oldIndex = parseInt(activeId.split('-')[1]);
      const newIndex = parseInt(overId.split('-')[1]);
      setPlanData({
        ...planData,
        semanas: arrayMove(planData.semanas, oldIndex, newIndex),
      });
      return;
    }

    // Reordenar sesiones dentro de una semana
    if (activeId.startsWith('sesion-') && overId.startsWith('sesion-')) {
      const [, activeSemana, activeSesion] = activeId.split('-');
      const [, overSemana, overSesion] = overId.split('-');

      if (activeSemana === overSemana) {
        const semanaIndex = parseInt(activeSemana);
        const oldIndex = parseInt(activeSesion);
        const newIndex = parseInt(overSesion);
        const newSemanas = [...planData.semanas];
        newSemanas[semanaIndex].sesiones = arrayMove(
          newSemanas[semanaIndex].sesiones,
          oldIndex,
          newIndex
        );
        setPlanData({ ...planData, semanas: newSemanas });
      }
    }
  };

  const calcularTiempoSesion = (sesion: PlanSesion): number => {
    if (!sesion.bloques) return 0;

    // Sumar tiempo de bloques sueltos (no AD = admin/separator)
    const tiempoEjercicios = sesion.bloques
      .filter((b: SesionBloque) => b.tipo !== 'AD')
      .reduce((total: number, b: SesionBloque) => total + (b.duracionSeg || 0), 0);

    // Sumar tiempo de rondas
    const tiempoRondas = (sesion.rondas || []).reduce((total: number, ronda: SesionRonda) => {
      const tiempoRonda = ronda.bloques.reduce((sum: number, codeOrBlock: string | SesionBloque) => {
        const code = typeof codeOrBlock === 'string' ? codeOrBlock : codeOrBlock.code;
        // Buscar el bloque en la sesión
        const bloque = sesion.bloques.find((b: SesionBloque) => b.code === code);
        if (bloque && bloque.tipo !== 'AD') {
          return sum + (bloque.duracionSeg || 0);
        }
        return sum;
      }, 0);

      const reps = (ronda as any).repeticiones || 1;
      return total + (tiempoRonda * reps);
    }, 0);

    return tiempoEjercicios + tiempoRondas;
  };

  const focoLabels: Record<string, string> = {
    GEN: 'General',
    SON: 'Sonido',
    FLX: 'Flexibilidad',
    MOT: 'Motricidad',
    ART: 'Articulación',
    COG: 'Cognitivo',
  };

  const focoColors: Record<string, string> = {
    GEN: componentStyles.status.badgeDefault,
    LIG: componentStyles.status.badgeInfo,
    RIT: componentStyles.status.badgeDefault,
    ART: componentStyles.status.badgeSuccess,
    'S&A': componentStyles.status.badgeDefault,
  };

  const tipoColors: Record<string, string> = {
    CA: componentStyles.status.badgeDefault,
    CB: componentStyles.status.badgeInfo,
    TC: componentStyles.status.badgeDefault,
    TM: componentStyles.status.badgeSuccess,
    FM: componentStyles.status.badgeDefault,
    VC: componentStyles.status.badgeInfo,
    AD: componentStyles.status.badgeDefault,
  };

  // Validar que existe el ID
  if (!asignacionId) {
    return (
      <div className="flex items-center justify-center min-h-[80vh]">
        <Card className={`max-w-md ${componentStyles.containers.cardBase}`}>
          <CardContent className="pt-6 text-center space-y-4">
            <AlertCircle className={`w-12 h-12 ${componentStyles.empty.emptyIcon} text-[var(--color-warning)] mx-auto`} />
            <p className={componentStyles.typography.pageTitle}>ID de asignación no proporcionado</p>
            <p className={componentStyles.empty.emptyText}>Por favor, proporciona un ID válido en la URL.</p>
            <Button onClick={() => navigate(-1)} className={`mt-4 ${componentStyles.buttons.primary}`}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <LoadingSpinner
        size="xl"
        variant="fullPage"
        text="Cargando asignación..."
      />
    );
  }

  if (error || !asignacion) {
    return (
      <div className="flex items-center justify-center min-h-[80vh]">
        <Card className={`max-w-md ${componentStyles.containers.cardBase}`}>
          <CardContent className="pt-6 text-center space-y-4">
            <AlertCircle className={`w-12 h-12 ${componentStyles.empty.emptyIcon} text-[var(--color-danger)] mx-auto`} />
            <p className={componentStyles.typography.pageTitle}>Asignación no encontrada</p>
            <p className={componentStyles.empty.emptyText}>
              {error?.message || `No se encontró la asignación con ID: ${asignacionId}`}
            </p>
            <div className="flex gap-2 justify-center">
              <Button onClick={() => navigate(-1)} className={componentStyles.buttons.primary}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Volver
              </Button>
              <Button onClick={() => window.location.reload()} variant="outline" className={componentStyles.buttons.outline}>
                Reintentar
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!planData) {
    return (
      <LoadingSpinner
        size="xl"
        variant="fullPage"
        text="Cargando datos del plan..."
      />
    );
  }

  return (
    <div className={`min-h-screen ${componentStyles.layout.pageBackground} p-6 pb-20`}>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <div className="max-w-5xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                onClick={() => navigate(-1)}
                className="mr-2"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className={componentStyles.typography.pageTitle}>Adaptar Plan</h1>
                <p className="text-ui/60 text-sm">
                  {asignacion.piezaSnapshot?.nombre || 'Pieza sin nombre'} • {usuarios.find(u => u.id === asignacion.alumnoId)?.nombreCompleto || 'Alumno'}
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleGuardar}
                className={componentStyles.buttons.outline}
                disabled={guardarMutation.isPending}
              >
                <Save className="w-4 h-4 mr-2" />
                {guardarMutation.isPending ? 'Guardando...' : 'Guardar borrador'}
              </Button>
              <Button
                onClick={handlePublicar}
                className={componentStyles.buttons.primary}
                disabled={publicarMutation.isPending}
              >
                {publicarMutation.isPending ? 'Publicando...' : 'Publicar'}
              </Button>
            </div>
          </div>

          <SortableContext
            items={planData.semanas.map((_, i) => `semana-${i}`)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-4">
              {planData.semanas.map((semana, index) => (
                <SortableSemanaAdaptar
                  key={`semana-${index}`}
                  id={`semana-${index}`}
                  semana={semana}
                  semanaIndex={index}
                  expandedSemanas={expandedSemanas}
                  expandedSesiones={expandedSesiones}
                  expandedEjercicios={expandedEjercicios}
                  toggleSemana={toggleSemana}
                  toggleSesion={toggleSesion}
                  toggleRonda={toggleRonda}
                  calcularTiempoSesion={calcularTiempoSesion}
                  setEditingSemana={setEditingSemana}
                  setEditingSesion={setEditingSesion}
                  removeSemana={removeSemana}
                  removeSesion={removeSesion}
                  addSesion={addSesion}
                  duplicateSemana={duplicateSemana}
                  focoColors={focoColors}
                  focoLabels={focoLabels}
                  tipoColors={tipoColors}
                  componentStyles={componentStyles}
                  ensureRondaIds={ensureRondaIds}
                  getSecuencia={getSecuencia}
                  mapBloquesByCode={mapBloquesByCode}
                  dbBloques={dbBloques}
                />
              ))}
            </div>
          </SortableContext>

          <Button
            onClick={addSemana}
            variant="outline"
            className={`w-full py-6 border-dashed border-2 ${componentStyles.buttons.outline}`}
          >
            <Plus className="w-5 h-5 mr-2" />
            Añadir Semana
          </Button>
        </div>
      </DndContext>

      {/* Modales de edición */}
      {editingSemana && (
        <WeekEditor
          onClose={() => setEditingSemana(null)}
          onSave={(updated: any) => updateSemana(editingSemana.index, updated)}
          semana={editingSemana.semana as any}
        />
      )}

      {editingSesion && (
        <SessionEditor
          onClose={() => setEditingSesion(null)}
          onSave={(updated: any) => updateSesion(
            editingSesion.semanaIndex,
            editingSesion.sesionIndex,
            updated
          )}
          sesion={editingSesion.sesion as any}
          pieza={asignacion?.piezaSnapshot as any}
          piezaSnapshot={asignacion?.piezaSnapshot as any}
          alumnoId={asignacion?.alumnoId || ''}
        />
      )}
    </div>
  );
}
