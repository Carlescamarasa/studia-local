
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { X, Save, Plus, Trash2, PlayCircle, Edit, Copy, GripVertical, Search, RotateCcw, AlertTriangle, ChevronDown, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { toast } from "sonner";
import ExerciseEditor from "./ExerciseEditor";
import { createPortal } from "react-dom";
import { uid, ensureRondaIds, buildDefaultSecuencia } from "../study/sessionSequence";

export default function SessionEditor({ sesion, pieza, piezaSnapshot, onSave, onClose }) {
  const [formData, setFormData] = useState({
    nombre: '',
    foco: 'GEN',
    bloques: [],
    rondas: [],
    secuencia: [],
  });
  const [selectedEjercicios, setSelectedEjercicios] = useState(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [tiposFilter, setTiposFilter] = useState(new Set());
  const [expandedRondas, setExpandedRondas] = useState(new Set());
  const [editingEjercicio, setEditingEjercicio] = useState(null);

  const { data: ejercicios = [] } = useQuery({
    queryKey: ['bloques'],
    queryFn: () => base44.entities.Bloque.list(),
  });

  useEffect(() => {
    if (sesion) {
      // Asegurar ID estable en rondas
      const sesionConIds = ensureRondaIds(sesion);
      const rondasConId = sesionConIds.rondas || [];

      // Si no hay secuencia guardada, la creamos
      const secuenciaDefault = buildDefaultSecuencia(sesionConIds);

      setFormData({
        nombre: sesion.nombre || '',
        foco: sesion.foco || 'GEN',
        bloques: sesion.bloques || [],
        rondas: rondasConId,
        secuencia: sesion.secuencia || secuenciaDefault,
      });

      if (sesion.rondas && sesion.rondas.length > 0) {
        const allRondasExpanded = new Set(sesion.rondas.map((_, idx) => idx));
        setExpandedRondas(allRondasExpanded);
      }
    }
  }, [sesion]);

  const handleRepararReferencias = useCallback(() => {
    const codesInSession = formData.bloques.map(b => b.code);
    const rondasReparadas = formData.rondas.map(r => ({
      ...r,
      bloques: r.bloques.filter(code => codesInSession.includes(code))
    })).filter(r => r.bloques.length > 0);
    
    setFormData({ ...formData, rondas: rondasReparadas });
    toast.success('✅ Referencias reparadas');
  }, [formData]);

  const handleSave = useCallback(() => {
    const codesInSession = formData.bloques.map(b => b.code);
    const rondasConHuerfanas = formData.rondas.some(r => 
      r.bloques.some(code => !codesInSession.includes(code))
    );
    
    if (rondasConHuerfanas) {
      if (window.confirm('❌ Esta sesión contiene referencias inválidas en las rondas. ¿Deseas repararlas automáticamente?')) {
        handleRepararReferencias();
        return;
      }
      return;
    }
    
    onSave(formData);
  }, [formData, onSave, handleRepararReferencias]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (editingEjercicio) return;
      
      if ((e.ctrlKey || e.metaKey) && e.key === '.') {
        e.preventDefault();
        onClose();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        handleSave();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault();
        setSelectedEjercicios(new Set());
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [editingEjercicio, onClose, handleSave]);

  const filteredEjercicios = ejercicios.filter(e => {
    const matchSearch = e.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       e.code?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchTipo = tiposFilter.size === 0 || tiposFilter.has(e.tipo);
    return matchSearch && matchTipo;
  });

  const toggleTipoFilter = (tipo) => {
    const newFilters = new Set(tiposFilter);
    if (newFilters.has(tipo)) {
      newFilters.delete(tipo);
    } else {
      newFilters.add(tipo);
    }
    setTiposFilter(newFilters);
  };

  const addEjerciciosSeleccionados = () => {
    const newBloquesToAdd = [];
    const newSecItems = [];
    
    selectedEjercicios.forEach(ejercicioId => {
      const ejercicio = ejercicios.find(e => e.id === ejercicioId);
      if (ejercicio) {
        const exists = formData.bloques.some(b => b.code === ejercicio.code);
        if (exists && !window.confirm(`El ejercicio ${ejercicio.code} ya existe. ¿Añadir de nuevo?`)) {
          return;
        }
        
        const nuevoEjercicio = {
          nombre: ejercicio.nombre,
          code: ejercicio.code,
          tipo: ejercicio.tipo,
          duracionSeg: ejercicio.duracionSeg,
          instrucciones: ejercicio.instrucciones,
          indicadorLogro: ejercicio.indicadorLogro,
          materialesRequeridos: ejercicio.materialesRequeridos || [],
          media: ejercicio.media || {},
          elementosOrdenados: ejercicio.elementosOrdenados || [],
        };
        
        if (!exists) {
          newBloquesToAdd.push(nuevoEjercicio);
        }
        newSecItems.push({ kind: 'BLOQUE', code: ejercicio.code });
      }
    });
    
    setFormData(prev => ({
      ...prev,
      bloques: [...prev.bloques, ...newBloquesToAdd],
      secuencia: [...prev.secuencia, ...newSecItems],
    }));
    setSelectedEjercicios(new Set());
  };

  const crearRondaDesdeSeleccion = () => {
    const codigosSeleccionados = [];
    const newBloquesToAdd = [];

    selectedEjercicios.forEach(ejercicioId => {
      const ejercicio = ejercicios.find(e => e.id === ejercicioId);
      if (ejercicio) {
        const existsInSession = formData.bloques.some(b => b.code === ejercicio.code) || newBloquesToAdd.some(b => b.code === ejercicio.code);
        if (!existsInSession) {
          const nuevoEjercicio = {
            nombre: ejercicio.nombre,
            code: ejercicio.code,
            tipo: ejercicio.tipo,
            duracionSeg: ejercicio.duracionSeg,
            instrucciones: ejercicio.instrucciones,
            indicadorLogro: ejercicio.indicadorLogro,
            materialesRequeridos: ejercicio.materialesRequeridos || [],
            media: ejercicio.media || {},
            elementosOrdenados: ejercicio.elementosOrdenados || [],
          };
          newBloquesToAdd.push(nuevoEjercicio);
        }
        codigosSeleccionados.push(ejercicio.code);
      }
    });

    if (codigosSeleccionados.length === 0) return;

    const nuevaRonda = { 
      id: uid(), 
      bloques: codigosSeleccionados, 
      repeticiones: 1,
      aleatoria: false
    };

    setFormData(prev => ({
      ...prev,
      bloques: [...prev.bloques, ...newBloquesToAdd],
      rondas: [...prev.rondas, nuevaRonda],
      secuencia: [...prev.secuencia, { kind: 'RONDA', id: nuevaRonda.id }],
    }));
    setSelectedEjercicios(new Set());
    setExpandedRondas(prev => new Set([...prev, (formData.rondas?.length || 0)]));
  };

  const updateEjercicioInline = (index, updatedEjercicio) => {
    const newBloques = [...formData.bloques];
    newBloques[index] = updatedEjercicio;
    setFormData({ ...formData, bloques: newBloques });
    setEditingEjercicio(null);
    toast.success('✅ Ejercicio actualizado');
  };

  const removeEjercicio = (index) => {
    const ejercicio = formData.bloques[index];
    const newBloques = formData.bloques.filter((_, i) => i !== index);
    const newRondas = formData.rondas.map(r => ({
      ...r,
      bloques: r.bloques.filter(code => code !== ejercicio.code)
    })).filter(r => r.bloques.length > 0);
    
    // Eliminar de secuencia también
    const newSecuencia = formData.secuencia.filter(item => 
      !(item.kind === 'BLOQUE' && item.code === ejercicio.code)
    );
    
    setFormData({ ...formData, bloques: newBloques, rondas: newRondas, secuencia: newSecuencia });
    toast.success('✅ Ejercicio eliminado y referencias actualizadas');
  };

  const removeEjercicioFromRonda = (rondaIndex, ejercicioCode) => {
    const newRondas = [...formData.rondas];
    newRondas[rondaIndex].bloques = newRondas[rondaIndex].bloques.filter(c => c !== ejercicioCode);
    if (newRondas[rondaIndex].bloques.length === 0) {
      newRondas.splice(rondaIndex, 1);
    }
    setFormData({ ...formData, rondas: newRondas });
  };

  const updateRondaRepeticiones = (rondaId, reps) => {
    const newRondas = formData.rondas.map(r => 
      r.id === rondaId ? { ...r, repeticiones: Math.max(1, parseInt(reps) || 1) } : r
    );
    setFormData({ ...formData, rondas: newRondas });
  };

  const updateRondaAleatoria = (rondaId, aleatoria) => {
    const newRondas = formData.rondas.map(r => 
      r.id === rondaId ? { ...r, aleatoria: !!aleatoria } : r
    );
    setFormData({ ...formData, rondas: newRondas });
  };

  const duplicateRonda = (rondaId) => {
    const ronda = formData.rondas.find(r => r.id === rondaId);
    if (!ronda) return;
    
    const newRonda = { ...JSON.parse(JSON.stringify(ronda)), id: uid() };
    const rondaIdx = formData.secuencia.findIndex(s => s.kind === 'RONDA' && s.id === rondaId);
    
    const newSecuencia = [...formData.secuencia];
    newSecuencia.splice(rondaIdx + 1, 0, { kind: 'RONDA', id: newRonda.id });
    
    setFormData({ 
      ...formData, 
      rondas: [...formData.rondas, newRonda],
      secuencia: newSecuencia
    });
    toast.success('✅ Ronda duplicada');
  };

  const onDragEnd = (result) => {
    const { source, destination } = result;
    if (!destination) return;

    const from = source.droppableId;
    const to = destination.droppableId;

    // 1) Reordenar dentro de la SECUENCIA (rondas y ejercicios intercalados)
    if (from === 'SECUENCIA' && to === 'SECUENCIA') {
      const items = Array.from(formData.secuencia);
      const [moved] = items.splice(source.index, 1);
      items.splice(destination.index, 0, moved);
      setFormData({ ...formData, secuencia: items });
      return;
    }

    // 2) Mover dentro de una misma ronda
    if (from.startsWith('R-') && to.startsWith('R-') && from === to) {
      const rondaId = from.slice(2);
      const newRondas = formData.rondas.map(r => ({ ...r }));
      const ronda = newRondas.find(r => r.id === rondaId);
      const items = Array.from(ronda.bloques);
      const [moved] = items.splice(source.index, 1);
      items.splice(destination.index, 0, moved);
      ronda.bloques = items;
      setFormData({ ...formData, rondas: newRondas });
      return;
    }

    // 3) Mover ejercicio de una ronda a otra ronda
    if (from.startsWith('R-') && to.startsWith('R-') && from !== to) {
      const fromId = from.slice(2);
      const toId = to.slice(2);
      const newRondas = formData.rondas.map(r => ({ ...r }));
      const rFrom = newRondas.find(r => r.id === fromId);
      const rTo = newRondas.find(r => r.id === toId);
      const [code] = rFrom.bloques.splice(source.index, 1);
      rTo.bloques.splice(destination.index, 0, code);
      setFormData({ ...formData, rondas: newRondas });
      return;
    }

    // 4) Meter ejercicio suelto (SECUENCIA) dentro de una ronda
    if (from === 'SECUENCIA' && to.startsWith('R-')) {
      const rondaId = to.slice(2);
      const items = Array.from(formData.secuencia);
      const moved = items[source.index];

      // Sólo permitimos mover BLOQUE a ronda
      if (moved.kind !== 'BLOQUE') return;

      const code = moved.code;
      const newRondas = formData.rondas.map(r =>
        r.id === rondaId
          ? { ...r, bloques: [
                ...r.bloques.slice(0, destination.index),
                code,
                ...r.bloques.slice(destination.index)
             ] }
          : r
      );

      // Remueve el bloque de la secuencia (ya está dentro de la ronda)
      items.splice(source.index, 1);

      setFormData({ ...formData, secuencia: items, rondas: newRondas });
      return;
    }

    // 5) Sacar ejercicio de una ronda a la SECUENCIA
    if (from.startsWith('R-') && to === 'SECUENCIA') {
      const rondaId = from.slice(2);
      const newRondas = formData.rondas.map(r => ({ ...r }));
      const r = newRondas.find(r => r.id === rondaId);
      const [code] = r.bloques.splice(source.index, 1);

      const items = Array.from(formData.secuencia);
      items.splice(destination.index, 0, { kind: 'BLOQUE', code });

      setFormData({ ...formData, rondas: newRondas, secuencia: items });
      return;
    }
  };

  const calcularTiempoTotal = () => {
    let tiempoEjercicios = formData.bloques
      .filter(b => b.tipo !== 'AD')
      .reduce((total, b) => total + (b.duracionSeg || 0), 0);
    
    let tiempoRondas = formData.rondas.reduce((total, ronda) => {
      const tiempoRonda = ronda.bloques.reduce((sum, code) => {
        const bloque = formData.bloques.find(b => b.code === code);
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

  const tipoLabels = {
    CA: 'Calentamiento',
    CB: 'Cuerpo',
    TC: 'Técnica',
    TM: 'Tempo',
    FM: 'Fragmento Musical',
    VC: 'Vuelta a la Calma',
    AD: 'Advertencia',
  };

  const tipoColors = {
    CA: 'bg-brand-100 text-brand-800 border-brand-200',
    CB: 'bg-blue-100 text-blue-800 border-blue-200',
    TC: 'bg-purple-100 text-purple-800 border-purple-200',
    TM: 'bg-green-100 text-green-800 border-green-200',
    FM: 'bg-pink-100 text-pink-800 border-pink-200',
    VC: 'bg-cyan-100 text-cyan-800 border-cyan-200',
    AD: 'bg-slate-100 text-slate-800 border-slate-200',
  };

  const tiempoTotal = calcularTiempoTotal();

  const modalContent = (
    <>
      <div 
        className="fixed inset-0 bg-black/40 z-[100]"
        onClick={onClose}
      />
      
      <div className="fixed inset-0 z-[110] flex items-center justify-center pointer-events-none p-4 overflow-y-auto">
        <Card 
          className="w-full max-w-6xl my-8 overflow-hidden flex flex-col max-h-[92vh] pointer-events-auto shadow-card rounded-2xl app-card"
          onClick={(e) => e.stopPropagation()}
        >
          <CardHeader className="border-b border-[var(--color-border-default)] bg-brand-500 text-white rounded-t-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <PlayCircle className="w-6 h-6" />
                <CardTitle>Editar Sesión</CardTitle>
              </div>
              <Button variant="ghost" size="icon" onClick={onClose} className="text-white hover:bg-white/20 h-9 w-9 rounded-xl">
                <X className="w-5 h-5" />
              </Button>
            </div>
          </CardHeader>

          <CardContent className="flex-1 overflow-y-auto p-6 space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="nombre">Nombre de la Sesión *</Label>
                <Input
                  id="nombre"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  placeholder="Ej: Sesión A"
                  className="h-10 rounded-xl border-[var(--color-border-default)] focus-orange"
                />
              </div>

              <div>
                <Label htmlFor="foco">Foco de la Sesión *</Label>
                <Select 
                  value={formData.foco} 
                  onValueChange={(v) => setFormData({ ...formData, foco: v })}
                  modal={false}
                >
                  <SelectTrigger id="foco" className="w-full h-10 rounded-xl border-[var(--color-border-default)] focus-orange">
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
              </div>
            </div>

            <div className="app-panel bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-900 font-medium">Tiempo previsto (excluyendo AD)</p>
                  <p className="text-xs text-blue-700 mt-1">
                    {formData.bloques.filter(b => b.tipo !== 'AD').length} ejercicios + {formData.rondas.length} rondas
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold text-blue-900">
                    {Math.floor(tiempoTotal / 60)}:{String(tiempoTotal % 60).padStart(2, '0')}
                  </p>
                  <p className="text-xs text-blue-700">minutos</p>
                </div>
              </div>
            </div>

            <Card className="app-panel">
              <CardHeader>
                <CardTitle className="text-lg">Estructura de la sesión</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {formData.secuencia.length === 0 ? (
                  <div className="text-center py-12 text-muted">
                    <PlayCircle className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                    <p className="text-sm mb-4">Aún no hay ejercicios ni rondas en esta sesión.</p>
                  </div>
                ) : (
                  <DragDropContext onDragEnd={onDragEnd}>
                    <Droppable droppableId="SECUENCIA" type="ANY">
                      {(provided) => (
                        <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-2">
                          {formData.secuencia.map((item, seqIndex) => {
                            if (item.kind === 'BLOQUE') {
                              const bloque = formData.bloques.find(b => b.code === item.code);
                              if (!bloque) return null;
                              
                              return (
                                <Draggable key={`seq-b-${item.code}-${seqIndex}`} draggableId={`seq-b-${item.code}-${seqIndex}`} index={seqIndex}>
                                  {(provided, snapshot) => (
                                    <div
                                      ref={provided.innerRef}
                                      {...provided.draggableProps}
                                      className={`flex items-center gap-2 p-3 border border-[var(--color-border-default)] rounded-xl bg-card hover:shadow-sm transition-all ${
                                        snapshot.isDragging ? 'shadow-card border-brand-300' : ''
                                      }`}
                                    >
                                      <div {...provided.dragHandleProps} className="cursor-grab active:cursor-grabbing">
                                        <GripVertical className="w-4 h-4 text-muted" />
                                      </div>
                                      <Badge className={`rounded-full ${tipoColors[bloque.tipo]}`}>
                                        {bloque.tipo}
                                      </Badge>
                                      <div className="flex-1 min-w-0">
                                        <p className="font-medium text-sm truncate text-ui">{bloque.nombre}</p>
                                        <p className="text-xs text-muted">
                                          {bloque.code} • {Math.floor(bloque.duracionSeg / 60)}:{String(bloque.duracionSeg % 60).padStart(2, '0')} min
                                        </p>
                                      </div>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setEditingEjercicio({ 
                                          index: formData.bloques.findIndex(b => b.code === bloque.code), 
                                          ejercicio: bloque, 
                                          piezaSnapshot: piezaSnapshot || pieza 
                                        })}
                                        className="h-8 w-8 p-0 rounded-xl hover:bg-slate-50"
                                      >
                                        <Edit className="w-4 h-4" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => removeEjercicio(formData.bloques.findIndex(b => b.code === bloque.code))}
                                        className="h-8 w-8 p-0 text-red-600 hover:bg-red-50 rounded-xl"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </Button>
                                    </div>
                                  )}
                                </Draggable>
                              );
                            }

                            // RONDA
                            const ronda = formData.rondas.find(r => r.id === item.id);
                            if (!ronda) return null;
                            const isExpanded = expandedRondas.has(seqIndex);
                            
                            return (
                              <Draggable key={`seq-r-${item.id}`} draggableId={`seq-r-${item.id}`} index={seqIndex}>
                                {(provided, snapshot) => (
                                  <Card 
                                    ref={provided.innerRef} 
                                    {...provided.draggableProps}
                                    className={`app-panel border-purple-300 bg-purple-50/30 ${
                                      snapshot.isDragging ? 'shadow-card border-purple-500' : ''
                                    }`}
                                  >
                                    <CardContent className="pt-4">
                                      <div 
                                        className="flex items-center gap-2 mb-2 cursor-pointer hover:bg-purple-100/50 rounded-xl p-1 -m-1 transition-colors"
                                        onClick={() => setExpandedRondas(prev => {
                                          const n = new Set(prev);
                                          n.has(seqIndex) ? n.delete(seqIndex) : n.add(seqIndex);
                                          return n;
                                        })}
                                      >
                                        <div {...provided.dragHandleProps} className="cursor-grab active:cursor-grabbing" onClick={(e) => e.stopPropagation()}>
                                          <GripVertical className="w-4 h-4 text-purple-600" />
                                        </div>
                                        <div className="pt-0.5">
                                          {isExpanded ? (
                                            <ChevronDown className="w-4 h-4 text-purple-600" />
                                          ) : (
                                            <ChevronRight className="w-4 h-4 text-purple-600" />
                                          )}
                                        </div>
                                        <Badge className="bg-purple-600 text-white rounded-full">Ronda</Badge>
                                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                          <span className="text-sm font-medium">×</span>
                                          <Input
                                            type="number"
                                            min="1"
                                            value={ronda.repeticiones}
                                            onChange={(e) => updateRondaRepeticiones(ronda.id, e.target.value)}
                                            className="w-16 h-8 text-center rounded-xl border-[var(--color-border-default)]"
                                          />
                                          <span className="text-sm text-muted">repeticiones</span>
                                        </div>
                                        <span className="text-sm text-muted ml-auto">({ronda.bloques.length} ejercicios)</span>
                                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                          <Label className="text-xs text-muted cursor-pointer flex items-center gap-1">
                                            <Checkbox 
                                              checked={!!ronda.aleatoria}
                                              onCheckedChange={(v) => updateRondaAleatoria(ronda.id, v)}
                                            />
                                            🎲 Random
                                          </Label>
                                        </div>
                                        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => duplicateRonda(ronda.id)}
                                            title="Duplicar ronda"
                                            className="h-8 w-8 p-0 hover:bg-purple-100 rounded-xl"
                                          >
                                            <Copy className="w-4 h-4" />
                                          </Button>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => {
                                              if (window.confirm('¿Eliminar esta ronda?')) {
                                                setFormData(prev => {
                                                  const newRondas = prev.rondas.filter(r => r.id !== ronda.id);
                                                  const newSeq = prev.secuencia.filter(s => !(s.kind === 'RONDA' && s.id === ronda.id));
                                                  return { ...prev, rondas: newRondas, secuencia: newSeq };
                                                });
                                              }
                                            }}
                                            className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-xl"
                                          >
                                            <Trash2 className="w-4 h-4" />
                                          </Button>
                                        </div>
                                      </div>

                                      {isExpanded && (
                                        <Droppable droppableId={`R-${ronda.id}`} type="ANY">
                                          {(prov) => (
                                            <div 
                                              ref={prov.innerRef} 
                                              {...prov.droppableProps}
                                              className="ml-6 mt-3 space-y-2 border-l-2 border-purple-300 pl-4"
                                            >
                                              {ronda.bloques.map((code, eIndex) => {
                                                const ejercicio = formData.bloques.find(b => b.code === code);
                                                if (!ejercicio) {
                                                  return (
                                                    <div key={`${ronda.id}-${eIndex}`} className="p-2 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex items-center gap-2">
                                                      <AlertTriangle className="w-4 h-4" />
                                                      ⚠️ Referencia huérfana: {code}
                                                    </div>
                                                  );
                                                }
                                                
                                                return (
                                                  <Draggable 
                                                    key={`${ronda.id}-${code}-${eIndex}`} 
                                                    draggableId={`${ronda.id}-${code}-${eIndex}`} 
                                                    index={eIndex}
                                                  >
                                                    {(p, s) => (
                                                      <div 
                                                        ref={p.innerRef}
                                                        {...p.draggableProps}
                                                        className={`flex items-center gap-2 p-2 bg-card border border-[var(--color-border-default)] rounded-xl ${
                                                          s.isDragging ? 'shadow-card border-purple-500' : ''
                                                        }`}
                                                      >
                                                        <div {...p.dragHandleProps} className="cursor-grab active:cursor-grabbing">
                                                          <GripVertical className="w-3 h-3 text-muted" />
                                                        </div>
                                                        <Badge variant="outline" className={`shrink-0 rounded-full ${tipoColors[ejercicio.tipo]}`}>
                                                          {ejercicio.tipo}
                                                        </Badge>
                                                        <span className="text-sm flex-1 text-ui">
                                                          {ejercicio.nombre} <span className="text-muted">({ejercicio.code})</span>
                                                        </span>
                                                        <Button
                                                          variant="ghost"
                                                          size="sm"
                                                          onClick={() => {
                                                            const idx = formData.bloques.findIndex(b => b.code === code);
                                                            if (idx !== -1) {
                                                              setEditingEjercicio({ 
                                                                index: idx, 
                                                                ejercicio, 
                                                                piezaSnapshot: piezaSnapshot || pieza 
                                                              });
                                                            }
                                                          }}
                                                          className="h-6 px-2 rounded-xl hover:bg-slate-50"
                                                          title="Editar ejercicio"
                                                        >
                                                          <Edit className="w-3 h-3" />
                                                        </Button>
                                                        <Button
                                                          variant="ghost"
                                                          size="sm"
                                                          onClick={() => removeEjercicioFromRonda(
                                                            formData.rondas.findIndex(r => r.id === ronda.id), 
                                                            code
                                                          )}
                                                          className="h-6 px-2 text-red-600 hover:bg-red-50 rounded-xl"
                                                          title="Quitar de la ronda"
                                                        >
                                                          <X className="w-3 h-3" />
                                                        </Button>
                                                      </div>
                                                    )}
                                                  </Draggable>
                                                );
                                              })}
                                              {prov.placeholder}
                                            </div>
                                          )}
                                        </Droppable>
                                      )}
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
                  </DragDropContext>
                )}
              </CardContent>
            </Card>

            <Card className="app-panel">
              <CardHeader>
                <CardTitle className="text-lg">Biblioteca de Ejercicios</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2 flex-wrap">
                  <div className="flex-1 min-w-[200px] relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted" />
                    <Input
                      placeholder="Buscar ejercicios..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 h-10 rounded-xl border-[var(--color-border-default)] focus-orange"
                    />
                  </div>
                  <div className="flex gap-1 flex-wrap">
                    {Object.entries(tipoLabels).map(([key, label]) => (
                      <Badge
                        key={key}
                        variant={tiposFilter.has(key) ? "default" : "outline"}
                        className={`cursor-pointer transition-all rounded-full ${
                          tiposFilter.has(key) ? tipoColors[key] : 'hover:bg-slate-50 hover:shadow-sm'
                        }`}
                        onClick={() => toggleTipoFilter(key)}
                      >
                        {key}
                      </Badge>
                    ))}
                    {tiposFilter.size > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setTiposFilter(new Set())}
                        className="h-6 px-2 rounded-xl"
                      >
                        <RotateCcw className="w-3 h-3 mr-1" />
                        Todos
                      </Button>
                    )}
                  </div>
                </div>

                {selectedEjercicios.size > 0 && (
                  <Alert className="rounded-xl border-blue-200 bg-blue-50">
                    <AlertDescription className="text-blue-800 flex items-center justify-between flex-wrap gap-2">
                      <span>
                        <strong>{selectedEjercicios.size} ejercicio(s) seleccionado(s).</strong> 
                        {' '}Puedes agregarlos directamente o crear una ronda con ellos.
                      </span>
                      <div className="flex gap-2 flex-wrap">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedEjercicios(new Set())}
                          className="bg-card hover:shadow-sm h-8 rounded-xl"
                        >
                          <RotateCcw className="w-3 h-3 mr-1" />
                          Limpiar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={crearRondaDesdeSeleccion}
                          className="bg-purple-100 border-purple-300 text-purple-900 hover:bg-purple-200 h-8 rounded-xl"
                        >
                          Crear Ronda ({selectedEjercicios.size})
                        </Button>
                        <Button
                          size="sm"
                          onClick={addEjerciciosSeleccionados}
                          className="btn-primary h-8 rounded-xl shadow-sm"
                        >
                          Agregar Ejercicios ({selectedEjercicios.size})
                        </Button>
                      </div>
                    </AlertDescription>
                  </Alert>
                )}

                <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 max-h-80 overflow-y-auto border border-[var(--color-border-default)] rounded-xl p-3 bg-muted">
                  {filteredEjercicios.length === 0 ? (
                    <div className="col-span-full text-center py-8 text-muted">
                      <p className="text-sm">No se encontraron ejercicios</p>
                    </div>
                  ) : (
                    filteredEjercicios.map((ejercicio) => (
                      <div
                        key={ejercicio.id}
                        className={`flex items-center gap-2 p-2 border border-[var(--color-border-default)] rounded-xl cursor-pointer transition-all ${
                          selectedEjercicios.has(ejercicio.id) 
                            ? 'border-brand-300 bg-brand-50 shadow-sm' 
                            : 'bg-card hover:bg-muted hover:shadow-sm'
                        }`}
                        onClick={() => {
                          const newSelected = new Set(selectedEjercicios);
                          if (newSelected.has(ejercicio.id)) {
                            newSelected.delete(ejercicio.id);
                          } else {
                            newSelected.add(ejercicio.id);
                          }
                          setSelectedEjercicios(newSelected);
                        }}
                      >
                        <Checkbox
                          checked={selectedEjercicios.has(ejercicio.id)}
                          onCheckedChange={() => {}}
                        />
                        <Badge variant="outline" className={`shrink-0 rounded-full ${tipoColors[ejercicio.tipo]}`}>
                          {ejercicio.tipo}
                        </Badge>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate text-ui">{ejercicio.nombre}</p>
                          <p className="text-xs text-muted truncate">{ejercicio.code}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </CardContent>

          <div className="border-t border-[var(--color-border-default)] px-6 py-4 bg-muted rounded-b-2xl">
            <div className="flex gap-3 mb-2">
              <Button variant="outline" onClick={onClose} className="flex-1 h-10 rounded-xl">
                Cancelar
              </Button>
              <Button onClick={handleSave} className="flex-1 btn-primary h-10 rounded-xl shadow-sm">
                <Save className="w-4 h-4 mr-2" />
                Guardar
              </Button>
            </div>
            <p className="text-xs text-center text-muted">
              Ctrl/⌘+Intro : guardar • Ctrl/⌘+. : cancelar • Ctrl/⌘+B : limpiar selección
            </p>
          </div>
        </Card>
      </div>

      {editingEjercicio && (
        <ExerciseEditor
          ejercicio={editingEjercicio.ejercicio}
          piezaSnapshot={editingEjercicio.piezaSnapshot}
          onClose={(updated) => {
            if (updated) {
              updateEjercicioInline(editingEjercicio.index, updated);
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
