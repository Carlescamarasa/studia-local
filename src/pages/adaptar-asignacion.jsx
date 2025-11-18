
import React, { useState, useEffect } from "react";
import { localDataClient } from "@/api/localDataClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ds";
import { Badge } from "@/components/ds";
import {
  ArrowLeft, Save, Target, User, Music, BookOpen, Calendar,
  ChevronDown, ChevronRight, Clock, Layers, Plus, Edit, Trash2,
  GripVertical, Copy, PlayCircle, AlertCircle, Shuffle
} from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import WeekEditor from "@/components/editor/WeekEditor";
import SessionEditor from "@/components/editor/SessionEditor";
import ExerciseEditor from "@/components/editor/ExerciseEditor";
import { Alert, AlertDescription } from "@/components/ds";
import PageHeader from "@/components/ds/PageHeader";
import { getNombreVisible } from "@/components/utils/helpers";
import { componentStyles } from "@/design/componentStyles";
import { getSecuencia, ensureRondaIds, mapBloquesByCode } from "@/components/study/sessionSequence";
import RequireRole from "@/components/auth/RequireRole";

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
  const [expandedSemanas, setExpandedSemanas] = useState(new Set([0]));
  const [expandedSesiones, setExpandedSesiones] = useState(new Set());
  const [expandedEjercicios, setExpandedEjercicios] = useState(new Set());
  const [editingSemana, setEditingSemana] = useState(null);
  const [editingSesion, setEditingSesion] = useState(null);
  const [editingEjercicio, setEditingEjercicio] = useState(null);
  const [planData, setPlanData] = useState(null);

  const asignacionId = searchParams.get('id');

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

  const { data: usuarios = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => localDataClient.entities.User.list(),
  });

  useEffect(() => {
    if (asignacion?.plan) {
      setPlanData(JSON.parse(JSON.stringify(asignacion.plan)));
    }
  }, [asignacion]);

  const guardarMutation = useMutation({
    mutationFn: async (updatedPlan) => {
      return localDataClient.entities.Asignacion.update(asignacionId, { plan: updatedPlan });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['asignacion', asignacionId] });
      toast.success('✅ Plan adaptado guardado');
    },
  });

  const publicarMutation = useMutation({
    mutationFn: async () => {
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
    guardarMutation.mutate(planData);
  };

  const handlePublicar = () => {
    if (window.confirm('¿Publicar esta asignación?')) {
      publicarMutation.mutate();
    }
  };

  const addSemana = () => {
    const newSemana = {
      nombre: `Semana ${planData.semanas.length + 1}`,
      objetivo: '',
      foco: 'GEN',
      sesiones: [],
    };
    setPlanData({
      ...planData,
      semanas: [...planData.semanas, newSemana]
    });
  };

  const updateSemana = (index, updatedSemana) => {
    const newSemanas = [...planData.semanas];
    newSemanas[index] = updatedSemana;
    setPlanData({ ...planData, semanas: newSemanas });
    setEditingSemana(null);
  };

  const removeSemana = (index) => {
    if (window.confirm('¿Eliminar esta semana y todas sus sesiones?')) {
      setPlanData({
        ...planData,
        semanas: planData.semanas.filter((_, i) => i !== index)
      });
    }
  };

  const duplicateSemana = (index) => {
    const semana = planData.semanas[index];
    const newSemana = JSON.parse(JSON.stringify(semana));
    newSemana.nombre = `${semana.nombre} (copia)`;
    const newSemanas = [...planData.semanas];
    newSemanas.splice(index + 1, 0, newSemana);
    setPlanData({ ...planData, semanas: newSemanas });
  };

  const addSesion = (semanaIndex) => {
    const newSemanas = [...planData.semanas];
    if (!newSemanas[semanaIndex].sesiones) {
      newSemanas[semanaIndex].sesiones = [];
    }
    newSemanas[semanaIndex].sesiones.push({
      nombre: `Sesión ${newSemanas[semanaIndex].sesiones.length + 1}`,
      foco: 'GEN',
      bloques: [],
      rondas: []
    });
    setPlanData({ ...planData, semanas: newSemanas });
  };

  const updateSesion = (semanaIndex, sesionIndex, updatedSesion) => {
    const newSemanas = [...planData.semanas];
    newSemanas[semanaIndex].sesiones[sesionIndex] = updatedSesion;
    setPlanData({ ...planData, semanas: newSemanas });
    setEditingSesion(null);
  };

  const removeSesion = (semanaIndex, sesionIndex) => {
    if (window.confirm('¿Eliminar esta sesión?')) {
      const newSemanas = [...planData.semanas];
      newSemanas[semanaIndex].sesiones = newSemanas[semanaIndex].sesiones.filter((_, i) => i !== sesionIndex);
      setPlanData({ ...planData, semanas: newSemanas });
      toast.success('✅ Sesión eliminada');
    }
  };

  const updateEjercicioInline = (semanaIndex, sesionIndex, ejercicioIndex, updatedEjercicio) => {
    const newSemanas = [...planData.semanas];
    newSemanas[semanaIndex].sesiones[sesionIndex].bloques[ejercicioIndex] = updatedEjercicio;
    setPlanData({ ...planData, semanas: newSemanas });
    setEditingEjercicio(null);
  };

  const removeEjercicio = (semanaIndex, sesionIndex, ejercicioIndex) => {
    if (window.confirm('¿Eliminar este ejercicio?')) {
      const newSemanas = [...planData.semanas];
      const ejercicio = newSemanas[semanaIndex].sesiones[sesionIndex].bloques[ejercicioIndex];
      newSemanas[semanaIndex].sesiones[sesionIndex].bloques =
        newSemanas[semanaIndex].sesiones[sesionIndex].bloques.filter((_, i) => i !== ejercicioIndex);

      if (newSemanas[semanaIndex].sesiones[sesionIndex].rondas) {
        newSemanas[semanaIndex].sesiones[sesionIndex].rondas =
          newSemanas[semanaIndex].sesiones[sesionIndex].rondas.map(r => ({
            ...r,
            bloques: r.bloques.filter(code => code !== ejercicio.code)
          })).filter(r => r.bloques.length > 0);
      }

      setPlanData({ ...planData, semanas: newSemanas });
    }
  };

  const updateEjercicioEnRonda = (semanaIndex, sesionIndex, rondaIndex, ejercicioCode, updatedEjercicio) => {
    const newSemanas = [...planData.semanas];
    const bloqueIndex = newSemanas[semanaIndex].sesiones[sesionIndex].bloques.findIndex(b => b.code === ejercicioCode);
    if (bloqueIndex !== -1) {
      newSemanas[semanaIndex].sesiones[sesionIndex].bloques[bloqueIndex] = updatedEjercicio;
      setPlanData({ ...planData, semanas: newSemanas });
      setEditingEjercicio(null);
    }
  };

  const removeRonda = (semanaIndex, sesionIndex, rondaIndex) => {
    if (window.confirm('¿Eliminar esta ronda?')) {
      const newSemanas = [...planData.semanas];
      newSemanas[semanaIndex].sesiones[sesionIndex].rondas =
        newSemanas[semanaIndex].sesiones[sesionIndex].rondas.filter((_, i) => i !== rondaIndex);
      setPlanData({ ...planData, semanas: newSemanas });
    }
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

  const toggleEjercicios = (semanaIndex, sesionIndex) => {
    const key = `${semanaIndex}-${sesionIndex}-ej`;
    const newExpanded = new Set(expandedEjercicios);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedEjercicios(newExpanded);
  };

  const toggleRonda = (semanaIndex, sesionIndex, rondaIndex) => {
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

  const onDragEnd = (result) => {
    if (!result.destination) return;
    const { source, destination, type } = result;

    if (type === 'SEMANA') {
      const items = Array.from(planData.semanas);
      const [reorderedItem] = items.splice(source.index, 1);
      items.splice(destination.index, 0, reorderedItem);
      setPlanData({ ...planData, semanas: items });
    } else if (type.startsWith('SESION-')) {
      const semanaIndex = parseInt(type.split('-')[1]);
      const newSemanas = [...planData.semanas];
      const items = Array.from(newSemanas[semanaIndex].sesiones);
      const [reorderedItem] = items.splice(source.index, 1);
      items.splice(destination.index, 0, reorderedItem);
      newSemanas[semanaIndex].sesiones = items;
      setPlanData({ ...planData, semanas: newSemanas });
    }
  };

  const calcularTiempoSesion = (sesion) => {
    if (!sesion.bloques) return 0;
    const tiempoEjercicios = sesion.bloques
      .filter(b => b.tipo !== 'AD')
      .reduce((total, b) => total + (b.duracionSeg || 0), 0);
    const tiempoRondas = (sesion.rondas || []).reduce((total, ronda) => {
      const tiempoRonda = ronda.bloques.reduce((sum, code) => {
        const bloque = sesion.bloques.find(b => b.code === code);
        if (bloque && bloque.tipo !== 'AD') {
          return sum + (bloque.duracionSeg || 0);
        }
        return sum;
      }, 0);
      return total + (tiempoRonda * ronda.repeticiones);
    }, 0);
    return tiempoEjercicios + tiempoRondas;
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

  const tipoColors = {
    CA: componentStyles.status.badgeDefault, // brand -> default
    CB: componentStyles.status.badgeInfo,
    TC: componentStyles.status.badgeDefault, // purple -> default
    TM: componentStyles.status.badgeSuccess,
    FM: componentStyles.status.badgeDefault, // pink -> default
    VC: componentStyles.status.badgeInfo, // cyan -> info
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
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
          <p className="text-ui/80">Cargando asignación...</p>
        </div>
      </div>
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
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
          <p className="text-ui/80">Cargando plan...</p>
        </div>
      </div>
    );
  }

  const alumno = usuarios.find(u => u.id === asignacion.alumnoId);
  const isCerrada = asignacion.estado === 'cerrada';

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        icon={Target}
        title="Adaptar Plan de Asignación"
        subtitle={`Estudiante: ${getNombreVisible(alumno)} • Pieza: ${asignacion.piezaSnapshot?.nombre}`}
        actions={
          <div className="flex gap-2 flex-wrap">
            <Button variant="ghost" onClick={() => navigate(-1)} className={componentStyles.buttons.ghost}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver
            </Button>
            <Button
              onClick={handleGuardar}
              disabled={guardarMutation.isPending}
              variant="outline"
              className={componentStyles.buttons.outline}
            >
              <Save className="w-4 h-4 mr-2" />
              Guardar cambios
            </Button>
            {asignacion.estado === 'borrador' && (
              <Button
                onClick={handlePublicar}
                disabled={publicarMutation.isPending}
                className={`${componentStyles.buttons.primary} shadow-sm focus-brand`}
              >
                Publicar asignación
              </Button>
            )}
          </div>
        }
      />

      {isCerrada && (
        <div className={`${componentStyles.layout.page} mt-4`}>
          <Alert className={`${componentStyles.containers.panelBase} border-[var(--color-warning)] bg-[var(--color-warning)]/10 rounded-[var(--radius-card)]`}>
            <AlertCircle className="h-4 w-4 text-[var(--color-warning)]" />
            <AlertDescription className={`${componentStyles.typography.bodyText} text-[var(--color-warning)]`}>
              <strong>Advertencia:</strong> Esta asignación está cerrada. Los cambios se guardarán pero considera duplicar como borrador para preservar el histórico.
            </AlertDescription>
          </Alert>
        </div>
      )}

      <div className={componentStyles.layout.page}>
        <Card className={componentStyles.containers.cardBase}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Árbol del Plan ({planData.semanas.length} semanas)</CardTitle>
              <Button onClick={addSemana} size="sm" className={`${componentStyles.buttons.primary} h-9 shadow-sm`}>
                <Plus className="w-4 h-4 mr-2" />
                Añadir Semana
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 sm:space-y-2">
            {planData.semanas.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-ui/80 mb-4">No hay semanas en este plan</p>
                <Button onClick={addSemana} variant="outline" className={componentStyles.buttons.outline}>
                  <Plus className="w-4 h-4 mr-2" />
                  Crear Primera Semana
                </Button>
              </div>
            ) : (
              <DragDropContext onDragEnd={onDragEnd}>
                <Droppable droppableId="semanas" type="SEMANA">
                  {(provided) => (
                    <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-2">
                      {planData.semanas.map((semana, semanaIndex) => (
                        <Draggable key={`semana-${semanaIndex}`} draggableId={`semana-${semanaIndex}`} index={semanaIndex}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              className={`border-l-4 border-[var(--color-primary)] bg-[var(--color-primary-soft)]/50 rounded-r-lg p-3 transition-all ${
                                snapshot.isDragging ? 'shadow-card border-[var(--color-primary)] opacity-90' : 'hover:bg-[var(--color-primary-soft)]'
                              }`}
                            >
                              {/* Semana Header */}
                              <div className="flex items-start gap-2">
                                <div {...provided.dragHandleProps} className="cursor-grab active:cursor-grabbing pt-1" onClick={(e) => e.stopPropagation()}>
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
                                    <Badge className={`rounded-full ${focoColors[semana.foco]}`}>
                                      {focoLabels[semana.foco]}
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

                              {/* Sesiones - Expandidas */}
                              {expandedSemanas.has(semanaIndex) && semana.sesiones && semana.sesiones.length > 0 && (
                                <Droppable droppableId={`sesiones-${semanaIndex}`} type={`SESION-${semanaIndex}`}>
                                  {(provided) => (
                                    <div {...provided.droppableProps} ref={provided.innerRef} className="mt-3 space-y-2" onClick={(e) => e.stopPropagation()}>
                                      {semana.sesiones.map((sesion, sesionIndex) => {
                                        const sesionKey = `${semanaIndex}-${sesionIndex}`;
                                        const isExpanded = expandedSesiones.has(sesionKey);
                                        const tiempoTotal = calcularTiempoSesion(sesion);
                                        const tiempoMinutos = Math.floor(tiempoTotal / 60);
                                        const tiempoSegundos = tiempoTotal % 60;

                                        return (
                                          <Draggable key={`sesion-${sesionIndex}`} draggableId={`sesion-${semanaIndex}-${sesionIndex}`} index={sesionIndex}>
                                            {(provided, snapshot) => (
                                              <div
                                                ref={provided.innerRef}
                                                {...provided.draggableProps}
                                                className={`ml-4 border-l-2 border-[var(--color-info)]/40 bg-[var(--color-info)]/10 rounded-r-lg p-2.5 transition-all ${
                                                  snapshot.isDragging ? 'shadow-card border-[var(--color-info)] opacity-90' : 'hover:bg-[var(--color-info)]/20'
                                                }`}
                                              >
                                                {/* Sesión Header */}
                                                <div className="flex items-start gap-2">
                                                  <div {...provided.dragHandleProps} className="cursor-grab active:cursor-grabbing pt-1" onClick={(e) => e.stopPropagation()}>
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
                                                      <Badge className={`rounded-full ${focoColors[sesion.foco]}`} variant="outline">
                                                        {focoLabels[sesion.foco]}
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

                                                {/* Ejercicios y Rondas - Expandidos */}
                                                {isExpanded && (
                                                  <div className="mt-2 space-y-2" onClick={(e) => e.stopPropagation()}>
                                                    {(() => {
                                                      const S = ensureRondaIds(sesion);
                                                      const secuencia = getSecuencia(S);
                                                      const bloquesMap = mapBloquesByCode(S);
                                                      
                                                      return (
                                                        <div className="ml-2 space-y-1.5">
                                                          {secuencia.map((item, seqIdx) => {
                                                            if (item.kind === 'BLOQUE') {
                                                              const ejercicio = bloquesMap.get(item.code);
                                                              if (!ejercicio) return null;
                                                              
                                                              return (
                                                                <div key={`bloque-${item.code}-${seqIdx}`} className={componentStyles.items.compactItem}>
                                                                  <Badge variant="outline" className={`${tipoColors[ejercicio.tipo]} rounded-full ${componentStyles.typography.compactText}`}>
                                                                    {ejercicio.tipo}
                                                                  </Badge>
                                                                  <span className="flex-1 text-[var(--color-text-primary)] font-medium truncate">{ejercicio.nombre}</span>
                                                                  <span className={`text-[var(--color-text-secondary)] ${componentStyles.typography.compactTextTiny} flex-shrink-0`}>{ejercicio.code}</span>
                                                                </div>
                                                              );
                                                            } else if (item.kind === 'RONDA') {
                                                              const ronda = S.rondas.find(r => r.id === item.id);
                                                              if (!ronda) return null;
                                                              
                                                              const rondaIndex = sesion.rondas.findIndex(r => r.id === item.id);
                                                              const rondaKey = `${semanaIndex}-${sesionIndex}-ronda-${rondaIndex}`;
                                                              const isRondaExpanded = expandedEjercicios.has(rondaKey);
                                                              
                                                              return (
                                                                <div key={`ronda-${item.id}-${seqIdx}`}>
                                                                  <div 
                                                                    className={componentStyles.items.compactItemHover}
                                                                    onClick={(e) => {
                                                                      e.stopPropagation();
                                                                      toggleRonda(semanaIndex, sesionIndex, rondaIndex);
                                                                    }}
                                                                  >
                                                                    <div className={`flex items-center ${componentStyles.layout.gapCompact} flex-shrink-0`}>
                                                                      {isRondaExpanded ? (
                                                                        <ChevronDown className="w-3 h-3 text-[var(--color-text-secondary)]" />
                                                                      ) : (
                                                                        <ChevronRight className="w-3 h-3 text-[var(--color-text-secondary)]" />
                                                                      )}
                                                                      <Badge variant="outline" className={`bg-[var(--color-primary)]/10 border-[var(--color-primary)]/30 text-[var(--color-primary)] rounded-full ${componentStyles.typography.compactText} font-semibold`}>
                                                                        RONDA
                                                                      </Badge>
                                                                    </div>
                                                                    <span className="flex-1 text-[var(--color-text-primary)] font-medium truncate">
                                                                      {ronda.aleatoria && <Shuffle className="w-3 h-3 inline mr-1 text-[var(--color-primary)]" />}
                                                                      × {ronda.repeticiones} repeticiones ({ronda.bloques.length} ejercicios)
                                                                    </span>
                                                                  </div>

                                                                  {isRondaExpanded && (
                                                                    <div className="ml-2 mt-1.5 space-y-1">
                                                                      {ronda.bloques.map((code, eIndex) => {
                                                                        const ejercicio = bloquesMap.get(code);
                                                                        if (!ejercicio) {
                                                                          return (
                                                                            <div key={eIndex} className={`text-xs text-[var(--color-danger)] p-1 ml-2`}>
                                                                              ⚠️ Referencia huérfana: {code}
                                                                            </div>
                                                                          );
                                                                        }
                                                                        return (
                                                                          <div key={eIndex} className={`${componentStyles.items.compactItem} ml-2`}>
                                                                            <Badge variant="outline" className={`${componentStyles.typography.compactText} rounded-full ${tipoColors[ejercicio.tipo]}`}>
                                                                              {ejercicio.tipo}
                                                                            </Badge>
                                                                            <span className="flex-1 text-[var(--color-text-primary)] truncate">{ejercicio.nombre}</span>
                                                                            <span className={`text-[var(--color-text-secondary)] ${componentStyles.typography.compactTextTiny} flex-shrink-0`}>{ejercicio.code}</span>
                                                                          </div>
                                                                        );
                                                                      })}
                                                                    </div>
                                                                  )}
                                                                </div>
                                                              );
                                                            }
                                                            return null;
                                                          })}
                                                        </div>
                                                      );
                                                    })()}

                                                    <div className={`flex ${componentStyles.layout.gapCompact} items-center pt-1`}>
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
                                                        Editar sesión
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
                                                        Eliminar sesión
                                                      </Button>
                                                    </div>
                                                  </div>
                                                )}
                                              </div>
                                            )}
                                          </Draggable>
                                        );
                                      })}
                                      {provided.placeholder}
                                    </div>
                                  )}
                                </Droppable>
                              )}

                              {/* Botones de acción de semana */}
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
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>
            )}
          </CardContent>
        </Card>
      </div>

      {editingSemana && (
        <WeekEditor
          semana={editingSemana.semana}
          onSave={(updated) => updateSemana(editingSemana.index, updated)}
          onClose={() => setEditingSemana(null)}
        />
      )}

      {editingSesion && (
        <SessionEditor
          sesion={editingSesion.sesion}
          piezaSnapshot={asignacion.piezaSnapshot}
          onSave={(updated) => updateSesion(editingSesion.semanaIndex, editingSesion.sesionIndex, updated)}
          onClose={() => setEditingSesion(null)}
        />
      )}

      {editingEjercicio && (
        <ExerciseEditor
          ejercicio={editingEjercicio.ejercicio}
          piezaSnapshot={asignacion.piezaSnapshot}
          onClose={(updated) => {
            if (updated) {
              if (editingEjercicio.source === 'ronda') {
                updateEjercicioEnRonda(
                  editingEjercicio.semanaIndex,
                  editingEjercicio.sesionIndex,
                  editingEjercicio.rondaIndex,
                  editingEjercicio.ejercicioCode,
                  updated
                );
              } else {
                updateEjercicioInline(
                  editingEjercicio.semanaIndex,
                  editingEjercicio.sesionIndex,
                  editingEjercicio.ejercicioIndex,
                  updated
                );
              }
            } else {
              setEditingEjercicio(null);
            }
          }}
        />
      )}
    </div>
  );
}
