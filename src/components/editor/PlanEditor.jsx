
import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { X, Save, Plus, Edit, Trash2, Calendar, ChevronDown, ChevronRight, Copy, PlayCircle, GripVertical, Layers } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import WeekEditor from "./WeekEditor";
import SessionEditor from "./SessionEditor";
import ExerciseEditor from "./ExerciseEditor";
import { createPortal } from "react-dom";

export default function PlanEditor({ plan, onClose }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    nombre: '',
    focoGeneral: '',
    objetivoSemanalPorDefecto: '',
    piezaId: '',
    semanas: [],
  });
  const [expandedSemanas, setExpandedSemanas] = useState(new Set([0]));
  const [expandedSesiones, setExpandedSesiones] = useState(new Set());
  const [expandedEjercicios, setExpandedEjercicios] = useState(new Set());
  const [editingSemana, setEditingSemana] = useState(null);
  const [editingSesion, setEditingSesion] = useState(null);
  const [editingEjercicio, setEditingEjercicio] = useState(null);
  const [saveResult, setSaveResult] = useState(null);

  const { data: piezas = [] } = useQuery({
    queryKey: ['piezas'],
    queryFn: () => base44.entities.Pieza.list(),
  });

  useEffect(() => {
    if (plan) {
      setFormData({
        nombre: plan.nombre || '',
        focoGeneral: plan.focoGeneral || '',
        objetivoSemanalPorDefecto: plan.objetivoSemanalPorDefecto || '',
        piezaId: plan.piezaId || '',
        semanas: plan.semanas || [],
      });
      if (plan.semanas && plan.semanas.length > 0) {
        setExpandedSemanas(new Set([0]));
      }
    }
  }, [plan]);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      const semanaNombres = data.semanas.map(s => s.nombre?.trim().toLowerCase());
      const duplicados = semanaNombres.filter((nombre, index) =>
        semanaNombres.indexOf(nombre) !== index
      );
      
      if (duplicados.length > 0) {
        throw new Error('Hay semanas con nombres duplicados. Cada semana debe tener un nombre único.');
      }

      if (plan?.id) {
        return base44.entities.Plan.update(plan.id, data);
      }
      return base44.entities.Plan.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planes'] });
      setSaveResult({ success: true, message: '✅ Cambios guardados' });
      setTimeout(() => onClose(), 1500);
    },
    onError: (error) => {
      setSaveResult({ success: false, message: `❌ ${error.message}` });
    },
  });

  const handleSave = useCallback(() => {
    if (!formData.nombre.trim()) {
      setSaveResult({ success: false, message: '❌ El nombre es obligatorio' });
      return;
    }
    if (!formData.piezaId) {
      setSaveResult({ success: false, message: '❌ Debes seleccionar una pieza' });
      return;
    }
    saveMutation.mutate(formData);
  }, [formData, saveMutation]);

  const addSemana = useCallback(() => {
    const newSemana = {
      nombre: `Semana ${formData.semanas.length + 1}`,
      objetivo: '',
      foco: 'GEN',
      sesiones: [],
    };
    setFormData(prevData => ({
      ...prevData,
      semanas: [...prevData.semanas, newSemana]
    }));
    setExpandedSemanas(prevExpanded => new Set([...prevExpanded, formData.semanas.length]));
  }, [formData.semanas]);

  // Atajos de teclado
  useEffect(() => {
    const handleKeyDown = (e) => {
      // No capturar si hay subeditor abierto
      if (editingSemana || editingSesion || editingEjercicio) return;
      
      // Cerrar con Ctrl/Cmd + .
      if ((e.ctrlKey || e.metaKey) && e.key === '.') {
        e.preventDefault();
        onClose();
      }
      // Guardar con Ctrl/Cmd + Enter
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        handleSave();
      }
      // Nueva Semana con Ctrl/Cmd + Alt + N
      if ((e.ctrlKey || e.metaKey) && e.altKey && e.key === 'n') {
        e.preventDefault();
        addSemana();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [editingSemana, editingSesion, editingEjercicio, onClose, handleSave, addSemana]);

  const updateSemana = (index, updatedSemana) => {
    const newSemanas = [...formData.semanas];
    newSemanas[index] = updatedSemana;
    setFormData({ ...formData, semanas: newSemanas });
    setEditingSemana(null);
  };

  const removeSemana = (index) => {
    if (window.confirm('¿Eliminar esta semana y todas sus sesiones?')) {
      setFormData({
        ...formData,
        semanas: formData.semanas.filter((_, i) => i !== index)
      });
    }
  };

  const duplicateSemana = (index) => {
    const semana = formData.semanas[index];
    const newSemana = JSON.parse(JSON.stringify(semana));
    newSemana.nombre = `${semana.nombre} (copia)`;
    
    const newSemanas = [...formData.semanas];
    newSemanas.splice(index + 1, 0, newSemana);
    setFormData({ ...formData, semanas: newSemanas });
    setSaveResult({ success: true, message: '✅ Semana duplicada' });
    setTimeout(() => setSaveResult(null), 3000);
  };

  const toggleSemana = (index, e) => {
    if (e) e.stopPropagation();
    const newExpanded = new Set(expandedSemanas);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedSemanas(newExpanded);
  };

  const toggleSesion = (semanaIndex, sesionIndex, e) => {
    if (e) e.stopPropagation();
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

  const addSesion = (semanaIndex) => {
    const newSemanas = [...formData.semanas];
    if (!newSemanas[semanaIndex].sesiones) {
      newSemanas[semanaIndex].sesiones = [];
    }
    newSemanas[semanaIndex].sesiones.push({
      nombre: `Sesión ${newSemanas[semanaIndex].sesiones.length + 1}`,
      foco: 'GEN',
      bloques: [],
      rondas: []
    });
    setFormData({ ...formData, semanas: newSemanas });
    setExpandedSesiones(new Set([...expandedSesiones, `${semanaIndex}-${newSemanas[semanaIndex].sesiones.length - 1}`]));
  };

  const updateSesion = (semanaIndex, sesionIndex, updatedSesion) => {
    const newSemanas = [...formData.semanas];
    newSemanas[semanaIndex].sesiones[sesionIndex] = updatedSesion;
    setFormData({ ...formData, semanas: newSemanas });
    setEditingSesion(null);
  };

  const removeSesion = (semanaIndex, sesionIndex) => {
    if (window.confirm('¿Eliminar esta sesión y todas sus rondas?')) {
      const newSemanas = [...formData.semanas];
      newSemanas[semanaIndex].sesiones = newSemanas[semanaIndex].sesiones.filter((_, i) => i !== sesionIndex);
      setFormData({ ...formData, semanas: newSemanas });
      setSaveResult({ success: true, message: '✅ Sesión eliminada' });
      setTimeout(() => setSaveResult(null), 3000);
    }
  };
  
  const updateEjercicioInline = (semanaIndex, sesionIndex, ejercicioIndex, updatedEjercicio) => {
    const newSemanas = [...formData.semanas];
    newSemanas[semanaIndex].sesiones[sesionIndex].bloques[ejercicioIndex] = updatedEjercicio;
    setFormData({ ...formData, semanas: newSemanas });
    setEditingEjercicio(null);
    setSaveResult({ success: true, message: '✅ Ejercicio actualizado' });
    setTimeout(() => setSaveResult(null), 3000);
  };

  const removeEjercicio = (semanaIndex, sesionIndex, ejercicioIndex) => {
    if (window.confirm('¿Eliminar este ejercicio?')) {
      const newSemanas = [...formData.semanas];
      const ejercicio = newSemanas[semanaIndex].sesiones[sesionIndex].bloques[ejercicioIndex];
      
      // Eliminar ejercicio de bloques
      newSemanas[semanaIndex].sesiones[sesionIndex].bloques = 
        newSemanas[semanaIndex].sesiones[sesionIndex].bloques.filter((_, i) => i !== ejercicioIndex);
      
      // Actualizar referencias en rondas
      if (newSemanas[semanaIndex].sesiones[sesionIndex].rondas) {
        newSemanas[semanaIndex].sesiones[sesionIndex].rondas = 
          newSemanas[semanaIndex].sesiones[sesionIndex].rondas.map(r => ({
            ...r,
            bloques: r.bloques.filter(code => code !== ejercicio.code)
          })).filter(r => r.bloques.length > 0);
      }
      
      setFormData({ ...formData, semanas: newSemanas });
      setSaveResult({ success: true, message: '✅ Ejercicio eliminado y referencias actualizadas' });
      setTimeout(() => setSaveResult(null), 3000);
    }
  };
  
  const updateEjercicioEnRonda = (semanaIndex, sesionIndex, rondaIndex, ejercicioCode, updatedEjercicio) => {
    const newSemanas = [...formData.semanas];
    const bloqueIndex = newSemanas[semanaIndex].sesiones[sesionIndex].bloques.findIndex(b => b.code === ejercicioCode);
    if (bloqueIndex !== -1) {
      newSemanas[semanaIndex].sesiones[sesionIndex].bloques[bloqueIndex] = updatedEjercicio;
      setFormData({ ...formData, semanas: newSemanas });
      setEditingEjercicio(null);
      setSaveResult({ success: true, message: '✅ Ejercicio actualizado' });
      setTimeout(() => setSaveResult(null), 3000);
    }
  };

  const removeRonda = (semanaIndex, sesionIndex, rondaIndex) => {
    if (window.confirm('¿Eliminar esta ronda?')) {
      const newSemanas = [...formData.semanas];
      newSemanas[semanaIndex].sesiones[sesionIndex].rondas = 
        newSemanas[semanaIndex].sesiones[sesionIndex].rondas.filter((_, i) => i !== rondaIndex);
      setFormData({ ...formData, semanas: newSemanas });
      setSaveResult({ success: true, message: '✅ Ronda eliminada' });
      setTimeout(() => setSaveResult(null), 3000);
    }
  };

  const toggleRonda = (semanaIndex, sesionIndex, rondaIndex, e) => {
    if (e) e.stopPropagation();
    const key = `${semanaIndex}-${sesionIndex}-ronda-${rondaIndex}`;
    const newExpanded = new Set(expandedEjercicios); // Reutilizamos el mismo set
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedEjercicios(newExpanded);
  };

  // Drag & Drop handlers
  const onDragEnd = (result) => {
    if (!result.destination) return;

    const { source, destination, type } = result;

    if (type === 'SEMANA') {
      const items = Array.from(formData.semanas);
      const [reorderedItem] = items.splice(source.index, 1);
      items.splice(destination.index, 0, reorderedItem);
      setFormData({ ...formData, semanas: items });
    } else if (type.startsWith('SESION-')) {
      const semanaIndex = parseInt(type.split('-')[1]);
      const newSemanas = [...formData.semanas];
      const items = Array.from(newSemanas[semanaIndex].sesiones);
      const [reorderedItem] = items.splice(source.index, 1);
      items.splice(destination.index, 0, reorderedItem);
      newSemanas[semanaIndex].sesiones = items;
      setFormData({ ...formData, semanas: newSemanas });
    }
  };

  // Calcular tiempo total de una sesión (incluyendo rondas)
  const calcularTiempoSesion = (sesion) => {
    if (!sesion.bloques) return 0;
    
    // Tiempo de ejercicios (excluyendo AD)
    const tiempoEjercicios = sesion.bloques
      .filter(b => b.tipo !== 'AD')
      .reduce((total, b) => total + (b.duracionSeg || 0), 0);
    
    // Tiempo de rondas
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
    GEN: 'bg-[var(--color-surface-muted)] text-ui',
    LIG: 'bg-blue-100 text-blue-800',
    RIT: 'bg-purple-100 text-purple-800',
    ART: 'bg-green-100 text-green-800',
    'S&A': 'bg-brand-100 text-brand-800',
  };

  const tipoColors = {
    CA: 'bg-brand-100 text-brand-800',
    CB: 'bg-blue-100 text-blue-800',
    TC: 'bg-purple-100 text-purple-800',
    TM: 'bg-green-100 text-green-800',
    FM: 'bg-pink-100 text-pink-800',
    VC: 'bg-cyan-100 text-cyan-800',
    AD: 'bg-[var(--color-surface-muted)] text-ui',
  };

  const modalContent = (
    <>
      {/* Overlay con cierre al hacer clic */}
      <div 
        className="fixed inset-0 bg-black/40 z-[80]"
        onClick={() => {
          if (!editingSemana && !editingSesion && !editingEjercicio) {
            onClose();
          }
        }}
      />
      
      <div className="fixed inset-0 z-[90] flex items-center justify-center pointer-events-none p-4 overflow-y-auto">
        <div 
          className="bg-white w-full max-w-5xl max-h-[92vh] shadow-card rounded-2xl flex flex-col pointer-events-auto my-8 app-card"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="border-b px-6 py-4 flex items-center justify-between bg-card rounded-t-2xl">
            <div className="flex items-center gap-3 text-[var(--color-primary)]">
              <Calendar className="w-6 h-6 text-[var(--color-primary)]" />
              <div>
                <h2 className="text-xl font-bold text-[var(--color-primary)]">
                  {plan ? 'Editar Plan' : 'Nuevo Plan'}
                </h2>
                <p className="text-sm text-[var(--color-primary)]/90">Plantilla de plan de estudio</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} className="text-[var(--color-primary)] hover:bg-[var(--color-primary-soft)] h-9 w-9 rounded-xl" aria-label="Cerrar editor">
              <X className="w-5 h-5 " />
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {saveResult && (
              <Alert className={saveResult.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
                <AlertDescription className={saveResult.success ? 'text-green-800' : 'text-red-800'}>
                  {saveResult.message}
                </AlertDescription>
              </Alert>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Información del Plan</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="nombre">Nombre del Plan *</Label>
                  <Input
                    id="nombre"
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                    placeholder="Ej: Plan Inicial - Sonata Op. 1"
                  />
                </div>

                <div>
                  <Label htmlFor="pieza">Pieza Asociada *</Label>
                  <Select 
                    value={formData.piezaId} 
                    onValueChange={(v) => setFormData({ ...formData, piezaId: v })}
                    modal={false}
                  >
                    <SelectTrigger id="pieza" className="w-full">
                      <SelectValue placeholder="Selecciona una pieza..." />
                    </SelectTrigger>
                    <SelectContent 
                      position="popper" 
                      side="bottom" 
                      align="start" 
                      sideOffset={4}
                      className="z-[120] min-w-[var(--radix-select-trigger-width)] max-h-64 overflow-auto"
                    >
                      {piezas.length === 0 ? (
                        <div className="p-2 text-sm text-ui/80">No hay piezas</div>
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
                  <Label htmlFor="foco">Foco General</Label>
                  <Select 
                    value={formData.focoGeneral} 
                    onValueChange={(v) => setFormData({ ...formData, focoGeneral: v })}
                    modal={false}
                  >
                    <SelectTrigger id="foco" className="w-full">
                      <SelectValue placeholder="Selecciona foco..." />
                    </SelectTrigger>
                    <SelectContent 
                      position="popper" 
                      side="bottom" 
                      align="start" 
                      sideOffset={4}
                      className="z-[120] min-w-[var(--radix-select-trigger-width)] max-h-64 overflow-auto"
                    >
                      <SelectItem value={null}>Sin foco específico</SelectItem>
                      {Object.entries(focoLabels).map(([key, label]) => (
                        <SelectItem key={key} value={key}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="objetivo">Objetivo Semanal por Defecto</Label>
                  <Textarea
                    id="objetivo"
                    value={formData.objetivoSemanalPorDefecto}
                    onChange={(e) => setFormData({ ...formData, objetivoSemanalPorDefecto: e.target.value })}
                    placeholder="Objetivo que se aplicará a las semanas si no tienen uno específico..."
                    rows={2}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Árbol del Plan ({formData.semanas.length} semanas)</CardTitle>
                  <Button onClick={addSemana} size="sm" className="bg-brand-500 hover:bg-brand-600">
                    <Plus className="w-4 h-4 mr-2" />
                    Añadir Semana
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {formData.semanas.length === 0 ? (
                  <div className="text-center py-12 text-ui/80">
                    <Calendar className="w-16 h-16 mx-auto mb-4 text-ui/60" />
                    <p className="text-sm mb-4">Aún no hay semanas. Crea la primera semana.</p>
                    <Button onClick={addSemana} variant="outline">
                      <Plus className="w-4 h-4 mr-2" />
                      Crear Primera Semana
                    </Button>
                  </div>
                ) : (
                  <DragDropContext onDragEnd={onDragEnd}>
                    <Droppable droppableId="semanas" type="SEMANA">
                      {(provided) => (
                        <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-2">
                          {formData.semanas.map((semana, semanaIndex) => (
                            <Draggable key={`semana-${semanaIndex}`} draggableId={`semana-${semanaIndex}`} index={semanaIndex}>
                              {(provided, snapshot) => (
                                <Card 
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  className={`border-2 border-brand-200 cursor-pointer hover:bg-brand-50/30 transition-colors ${snapshot.isDragging ? 'shadow-card border-brand-400' : ''}`}
                                  onClick={(e) => toggleSemana(semanaIndex, e)}
                                >
                                  <CardContent className="pt-4">
                                    <div className="flex items-start gap-2">
                                      <div {...provided.dragHandleProps} className="cursor-grab active:cursor-grabbing pt-1" onClick={(e) => e.stopPropagation()}>
                                        <GripVertical className="w-5 h-5 text-ui/60" />
                                      </div>
                                      
                                      <div className="pt-1">
                                        {expandedSemanas.has(semanaIndex) ? (
                                          <ChevronDown className="w-5 h-5" />
                                        ) : (
                                          <ChevronRight className="w-5 h-5" />
                                        )}
                                      </div>
                                      
                                      <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-2">
                                          <h4 className="font-semibold">{semana.nombre}</h4>
                                          <Badge className={focoColors[semana.foco]}>
                                            {focoLabels[semana.foco]}
                                          </Badge>
                                          <span className="text-sm text-ui/80">
                                            ({semana.sesiones?.length || 0} sesiones)
                                          </span>
                                        </div>

                                        {expandedSemanas.has(semanaIndex) && (
                                          <div className="ml-4 mt-3 space-y-3" onClick={(e) => e.stopPropagation()}>
                                            {semana.objetivo && (
                                              <p className="text-sm text-ui/80 italic">"{semana.objetivo}"</p>
                                            )}

                                            {semana.sesiones && semana.sesiones.length > 0 && (
                                              <Droppable droppableId={`sesiones-${semanaIndex}`} type={`SESION-${semanaIndex}`}>
                                                {(provided) => (
                                                  <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-2">
                                                    {semana.sesiones.map((sesion, sesionIndex) => {
                                                      const sesionKey = `${semanaIndex}-${sesionIndex}`;
                                                      const isExpanded = expandedSesiones.has(sesionKey);
                                                      const tiempoTotal = calcularTiempoSesion(sesion);
                                                      const tiempoMinutos = Math.floor(tiempoTotal / 60);
                                                      const tiempoSegundos = tiempoTotal % 60;
                                                      
                                                      return (
                                                        <Draggable key={`sesion-${sesionIndex}`} draggableId={`sesion-${semanaIndex}-${sesionIndex}`} index={sesionIndex}>
                                                          {(provided, snapshot) => (
                                                            <Card 
                                                              ref={provided.innerRef}
                                                              {...provided.draggableProps}
                                                              className={`border border-blue-200 bg-blue-50/30 cursor-pointer hover:bg-blue-100/30 transition-colors ${snapshot.isDragging ? 'shadow-card border-blue-500' : ''}`}
                                                              onClick={(e) => toggleSesion(semanaIndex, sesionIndex, e)}
                                                            >
                                                              <CardContent className="pt-3 pb-3">
                                                                <div className="flex items-start gap-2">
                                                                  <div {...provided.dragHandleProps} className="cursor-grab active:cursor-grabbing pt-1" onClick={(e) => e.stopPropagation()}>
                                                                <GripVertical className="w-4 h-4 text-ui/60" />
                                                                  </div>
                                                                  
                                                                  <div className="pt-1">
                                                                    {isExpanded ? (
                                                                      <ChevronDown className="w-4 h-4" />
                                                                    ) : (
                                                                      <ChevronRight className="w-4 h-4" />
                                                                    )}
                                                                  </div>
                                                                  
                                                                  <div className="flex-1">
                                                                    <div className="flex items-center gap-2 flex-wrap">
                                                                      <PlayCircle className="w-4 h-4 text-blue-600" />
                                                                      <span className="font-medium text-sm">{sesion.nombre}</span>
                                                                      <Badge 
                                                                        variant="outline" 
                                                                        className={`text-xs ${
                                                                          tiempoTotal > 0 ? 'bg-green-50 border-green-300 text-green-800' : 'bg-[var(--color-surface-muted)]'
                                                                        }`}
                                                                      >
                                                                        ⏱ {tiempoMinutos}:{String(tiempoSegundos).padStart(2, '0')} min
                                                                      </Badge>
                                                                      <Badge className={focoColors[sesion.foco]} variant="outline">
                                                                        {focoLabels[sesion.foco]}
                                                                      </Badge>
                                                                    </div>

                                                                    {isExpanded && (
                                                                      <div className="ml-6 mt-2 space-y-2" onClick={(e) => e.stopPropagation()}>
                                                                        <div className="flex items-center gap-2 text-xs text-ui/80">
                                                                          <Layers className="w-3 h-3" />
                                                                          <span>
                                                                            {sesion.bloques?.length || 0} ejercicios
                                                                            {sesion.rondas && sesion.rondas.length > 0 && `, ${sesion.rondas.length} rondas`}
                                                                          </span>
                                                                          <Button
                                                                            size="sm"
                                                                            variant="ghost"
                                                                            onClick={(e) => {
                                                                              e.stopPropagation();
                                                                              toggleEjercicios(semanaIndex, sesionIndex);
                                                                            }}
                                                                            className="text-xs h-6 px-2"
                                                                          >
                                                                            {expandedEjercicios.has(`${sesionKey}-ej`) ? 'Ocultar' : 'Ver'} contenido
                                                                          </Button>
                                                                        </div>

                                                                        {expandedEjercicios.has(`${sesionKey}-ej`) && (
                                                                          <div className="border-l-2 border-blue-300 pl-3 space-y-2">
                                                                            {sesion.bloques && sesion.bloques.length > 0 && (
                                                                              <div className="space-y-1">
                                                                                <p className="text-xs font-semibold text-blue-900 mb-1">Ejercicios:</p>
                                                                                {sesion.bloques.map((ejercicio, ejercicioIndex) => (
                                                                                  <div key={ejercicioIndex} className="flex items-center gap-2 p-2 bg-white border rounded text-xs">
                                                                                    <Badge className={tipoColors[ejercicio.tipo]} variant="outline">
                                                                                      {ejercicio.tipo}
                                                                                    </Badge>
                                                                                    <span className="flex-1">{ejercicio.nombre}</span>
                                                                                    <span className="text-ui/80">{ejercicio.code}</span>
                                                                                    <Button
                                                                                      size="sm"
                                                                                      variant="ghost"
                                                                                      onClick={(e) => {
                                                                                        e.stopPropagation();
                                                                                        setEditingEjercicio({ semanaIndex, sesionIndex, ejercicioIndex, ejercicio, source: 'session' });
                                                                                      }}
                                                                                      className="h-6 px-2"
                                                                                    >
                                                                                      <Edit className="w-3 h-3" />
                                                                                    </Button>
                                                                                    <Button
                                                                                      size="sm"
                                                                                      variant="ghost"
                                                                                      onClick={(e) => {
                                                                                        e.stopPropagation();
                                                                                        removeEjercicio(semanaIndex, sesionIndex, ejercicioIndex);
                                                                                      }}
                                                                                      className="h-6 px-2 text-red-600"
                                                                                    >
                                                                                      <Trash2 className="w-3 h-3" />
                                                                                    </Button>
                                                                                  </div>
                                                                                ))}
                                                                              </div>
                                                                            )}

                                                                            {sesion.rondas && sesion.rondas.length > 0 && (
                                                                              <div className="space-y-1">
                                                                                <p className="text-xs font-semibold text-purple-900 mb-1">Rondas:</p>
                                                                                {sesion.rondas.map((ronda, rondaIndex) => {
                                                                                  const rondaKey = `${semanaIndex}-${sesionIndex}-ronda-${rondaIndex}`;
                                                                                  const isRondaExpanded = expandedEjercicios.has(rondaKey);
                                                                                  return (
                                                                                    <Card 
                                                                                      key={rondaIndex}
                                                                                      className="border border-purple-300 bg-purple-50/50 cursor-pointer hover:bg-purple-100/50 transition-colors"
                                                                                      onClick={(e) => toggleRonda(semanaIndex, sesionIndex, rondaIndex, e)}
                                                                                    >
                                                                                      <CardContent className="pt-2 pb-2">
                                                                                        <div className="flex items-center gap-2">
                                                                                          <div className="pt-0.5">
                                                                                            {isRondaExpanded ? (
                                                                                              <ChevronDown className="w-3 h-3 text-purple-600" />
                                                                                            ) : (
                                                                                              <ChevronRight className="w-3 h-3 text-purple-600" />
                                                                                            )}
                                                                                          </div>
                                                                                          <Badge className="bg-purple-600 text-white text-xs">Ronda</Badge>
                                                                                          <span className="text-xs text-ui/80">× {ronda.repeticiones} repeticiones</span>
                                                                                          <span className="text-xs text-ui/80">({ronda.bloques.length} ejercicios)</span>
                                                                                          <Button
                                                                                            size="sm"
                                                                                            variant="ghost"
                                                                                            onClick={(e) => {
                                                                                              e.stopPropagation();
                                                                                              removeRonda(semanaIndex, sesionIndex, rondaIndex);
                                                                                            }}
                                                                                            className="ml-auto text-red-600 hover:text-red-700 h-5 px-1"
                                                                                          >
                                                                                            <Trash2 className="w-3 h-3" />
                                                                                          </Button>
                                                                                        </div>
                                                                                        
                                                                                        {isRondaExpanded && (
                                                                                          <div className="ml-4 mt-2 space-y-1" onClick={(e) => e.stopPropagation()}>
                                                                                            {ronda.bloques.map((code, eIndex) => {
                                                                                              const ejercicio = sesion.bloques.find(b => b.code === code);
                                                                                              if (!ejercicio) {
                                                                                                return (
                                                                                                  <div key={eIndex} className="text-xs text-red-600 p-1">
                                                                                                    ⚠️ Referencia huérfana: {code}
                                                                                                  </div>
                                                                                                );
                                                                                              }
                                                                                              return (
                                                                                                <div key={eIndex} className="flex items-center gap-2 p-1.5 bg-white border rounded text-xs">
                                                                                                  <Badge variant="outline" className={`text-xs ${tipoColors[ejercicio.tipo]}`}>
                                                                                                    {ejercicio.tipo}
                                                                                                  </Badge>
                                                                                                  <span className="flex-1">{ejercicio.nombre}</span>
                                                                                                  <Button
                                                                                                    size="sm"
                                                                                                    variant="ghost"
                                                                                                    onClick={(e) => {
                                                                                                      e.stopPropagation();
                                                                                                      setEditingEjercicio({ semanaIndex, sesionIndex, rondaIndex, ejercicio, ejercicioCode: code, source: 'ronda' });
                                                                                                    }}
                                                                                                    className="h-5 px-1"
                                                                                                  >
                                                                                                    <Edit className="w-3 h-3" />
                                                                                                  </Button>
                                                                                                </div>
                                                                                              );
                                                                                            })}
                                                                                          </div>
                                                                                        )}
                                                                                      </CardContent>
                                                                                    </Card>
                                                                                  );
                                                                                })}
                                                                              </div>
                                                                            )}
                                                                          </div>
                                                                        )}
                                                                        
                                                                        <div className="flex gap-2">
                                                                          <Button
                                                                            size="sm"
                                                                            variant="outline"
                                                                            onClick={(e) => {
                                                                              e.stopPropagation();
                                                                              addSesion(semanaIndex);
                                                                            }}
                                                                          >
                                                                            <Plus className="w-3 h-3 mr-1" />
                                                                            Añadir Sesión
                                                                          </Button>
                                                                          <Button
                                                                            size="sm"
                                                                            variant="outline"
                                                                            onClick={(e) => {
                                                                              e.stopPropagation();
                                                                              setEditingSesion({ semanaIndex, sesionIndex, sesion });
                                                                            }}
                                                                          >
                                                                            <Edit className="w-3 h-3 mr-1" />
                                                                            Editar Sesión
                                                                          </Button>
                                                                          <Button
                                                                            size="sm"
                                                                            variant="ghost"
                                                                            onClick={(e) => {
                                                                              e.stopPropagation();
                                                                              removeSesion(semanaIndex, sesionIndex);
                                                                            }}
                                                                            className="text-red-600 hover:text-red-700"
                                                                          >
                                                                            <Trash2 className="w-3 h-3 mr-1" />
                                                                            Eliminar
                                                                          </Button>
                                                                        </div>
                                                                      </div>
                                                                    )}
                                                                  </div>
                                                                </div>
                                                              </CardContent>
                                                            </Card>
                                                          )}
                                                        </Draggable>
                                                      );
                                                    })}
                                                    {provided.placeholder}
                                                  </div>
                                                )}
                                              </Droppable>
                                            )}

                                            <div className="flex gap-2">
                                              <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  addSesion(semanaIndex);
                                                }}
                                              >
                                                <Plus className="w-3 h-3 mr-1" />
                                                Añadir Sesión
                                              </Button>
                                              <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  setEditingSemana({ index: semanaIndex, semana });
                                                }}
                                              >
                                                <Edit className="w-3 h-3 mr-1" />
                                                Editar Semana
                                              </Button>
                                            </div>
                                          </div>
                                        )}
                                      </div>

                                      <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            duplicateSemana(semanaIndex);
                                          }}
                                          title="Duplicar semana"
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
                                          className="text-red-600 hover:text-red-700"
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </Button>
                                      </div>
                                    </div>
                                  </CardContent>
                                </Card>
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

          <div className="border-t px-6 py-4 bg-[var(--color-surface-muted)] rounded-b-2xl">
            <div className="flex gap-3 mb-2">
              <Button variant="outline" onClick={onClose} className="flex-1 h-10 rounded-xl">
                Cancelar
              </Button>
              <Button
                onClick={handleSave}
                disabled={saveMutation.isPending}
                className="flex-1 btn-primary h-10 rounded-xl shadow-sm"
              >
                {saveMutation.isPending ? (
                  'Guardando...'
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Guardar
                  </>
                )}
              </Button>
            </div>
            <p className="text-xs text-center text-ui/80">
              Ctrl/⌘+Intro : guardar • Ctrl/⌘+. : cancelar • Ctrl/⌘+Alt+N : añadir semana
            </p>
          </div>
        </div>
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
          pieza={piezas.find(p => p.id === formData.piezaId)}
          onSave={(updated) => updateSesion(editingSesion.semanaIndex, editingSesion.sesionIndex, updated)}
          onClose={() => setEditingSesion(null)}
        />
      )}

      {editingEjercicio && (
        <ExerciseEditor
          ejercicio={editingEjercicio.ejercicio}
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
    </>
  );

  return createPortal(modalContent, document.body);
}
