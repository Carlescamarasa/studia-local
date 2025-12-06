
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { localDataClient } from "@/api/localDataClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { X, Save, Plus, Trash2, PlayCircle, Edit, Copy, GripVertical, Search, RotateCcw, AlertTriangle, ChevronDown, ChevronRight, Shuffle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { DndProvider, SortableContext, verticalListSortingStrategy, arrayMove } from "@/components/dnd/DndProvider";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { toast } from "sonner";
import ExerciseEditor from "./ExerciseEditor";
import { createPortal } from "react-dom";
import { uid, ensureRondaIds, buildDefaultSecuencia } from "../study/sessionSequence";
import { componentStyles } from "@/design/componentStyles";
import { SortableItem } from "@/components/dnd/SortableItem";

// Componente Sortable para Ronda
function SortableRonda({
  id,
  ronda,
  seqIndex,
  isExpanded,
  formData,
  expandedRondas,
  setExpandedRondas,
  updateRondaRepeticiones,
  updateRondaAleatoria,
  duplicateRonda,
  setFormData,
  setEditingEjercicio,
  removeEjercicioFromRonda,
  piezaSnapshot,
  pieza,
  tipoColors,
  componentStyles
}) {
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
    <Card
      ref={setNodeRef}
      style={style}
      className={`app-panel border-[var(--color-primary)]/30 bg-[var(--color-primary-soft)] ${isDragging ? 'shadow-card border-[var(--color-primary)]' : ''
        }`}
    >
      <CardContent className="pt-4">
        <div
          className="flex items-center gap-2 mb-2 cursor-pointer hover:bg-[var(--color-primary-soft)] rounded-[var(--radius-card)] p-1 -m-1 transition-colors"
          onClick={() => setExpandedRondas(prev => {
            const n = new Set(prev);
            n.has(seqIndex) ? n.delete(seqIndex) : n.add(seqIndex);
            return n;
          })}
        >
          <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing" onClick={(e) => e.stopPropagation()}>
            <GripVertical className="w-4 h-4 text-[var(--color-primary)]" />
          </div>
          <div className="pt-0.5">
            {isExpanded ? (
              <ChevronDown className="w-4 h-4 text-[var(--color-primary)]" />
            ) : (
              <ChevronRight className="w-4 h-4 text-[var(--color-primary)]" />
            )}
          </div>
          <Badge className="bg-[var(--color-primary)] text-[var(--color-text-inverse)] rounded-full">Ronda</Badge>
          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            <span className="text-sm font-medium">×</span>
            <Input
              type="number"
              min="1"
              value={ronda.repeticiones}
              onChange={(e) => updateRondaRepeticiones(ronda.id, e.target.value)}
              className={`w-16 h-8 text-center ${componentStyles.controls.inputDefault}`}
            />
            <span className="text-sm text-[var(--color-text-secondary)]">repeticiones</span>
          </div>
          <span className="text-sm text-[var(--color-text-secondary)] ml-auto">({ronda.bloques.length} ejercicios)</span>
          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            <Label className="text-xs text-[var(--color-text-secondary)] cursor-pointer flex items-center gap-1">
              <Checkbox
                checked={!!ronda.aleatoria}
                onCheckedChange={(v) => updateRondaAleatoria(ronda.id, v)}
              />
              <Shuffle className="w-3 h-3" />
              aleatorio
            </Label>
          </div>
          <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => duplicateRonda(ronda.id)}
              title="Duplicar ronda"
              className={componentStyles.buttons.editIcon}
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
              className={componentStyles.buttons.deleteIcon}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {isExpanded && (
          <SortableContext
            items={ronda.bloques.map((code, i) => `${ronda.id}-r-${code}-${i}`)}
            strategy={verticalListSortingStrategy}
          >
            <div className="ml-6 mt-3 space-y-2 border-l-2 border-[var(--color-primary)]/30 pl-4">
              {ronda.bloques.map((code, eIndex) => {
                const ejercicio = formData.bloques.find(b => b.code === code);
                if (!ejercicio) {
                  return (
                    <div key={`${ronda.id}-${eIndex}`} className="p-2 bg-[var(--color-danger)]/10 border border-[var(--color-danger)]/20 rounded-[var(--radius-card)] text-sm text-[var(--color-danger)] flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" />
                      ⚠️ Referencia huérfana: {code}
                    </div>
                  );
                }

                return (
                  <SortableItem
                    key={`${ronda.id}-${code}-${eIndex}`}
                    id={`${ronda.id}-r-${code}-${eIndex}`}
                    className="flex items-center gap-2 p-2 bg-[var(--color-surface-elevated)] border border-[var(--color-border-default)] rounded-[var(--radius-card)] cursor-pointer hover:border-[var(--color-primary)] transition-colors"
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
                  >
                    {({ dragHandleProps, isDragging }) => (
                      <>
                        <div {...dragHandleProps} className="cursor-grab active:cursor-grabbing p-1 -m-1" onClick={(e) => e.stopPropagation()}>
                          <GripVertical className="w-3 h-3 text-[var(--color-text-secondary)]" />
                        </div>
                        <Badge variant="outline" className={`shrink-0 rounded-full ${tipoColors[ejercicio.tipo]}`}>
                          {ejercicio.tipo}
                        </Badge>
                        <span className="text-sm flex-1 text-[var(--color-text-primary)]">
                          {ejercicio.nombre} <span className="text-[var(--color-text-secondary)]">({ejercicio.code})</span>
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            const idx = formData.bloques.findIndex(b => b.code === code);
                            if (idx !== -1) {
                              setEditingEjercicio({
                                index: idx,
                                ejercicio,
                                piezaSnapshot: piezaSnapshot || pieza
                              });
                            }
                          }}
                          className={`${componentStyles.buttons.iconSmall} ${componentStyles.buttons.ghost} ${componentStyles.buttons.editSubtle}`}
                          title="Editar ejercicio"
                        >
                          <Edit className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeEjercicioFromRonda(
                              formData.rondas.findIndex(r => r.id === ronda.id),
                              code
                            );
                          }}
                          className={`${componentStyles.buttons.iconSmall} ${componentStyles.buttons.ghost} ${componentStyles.buttons.deleteSubtle}`}
                          title="Quitar de la ronda"
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </>
                    )}
                  </SortableItem>
                );
              })}
            </div>
          </SortableContext>
        )}
      </CardContent>
    </Card>
  );
}

export default function SessionEditor({ sesion, pieza, piezaSnapshot, alumnoId, onSave, onClose }) {
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
    queryFn: () => localDataClient.entities.Bloque.list(),
  });

  const { data: alumno } = useQuery({
    queryKey: ['user', alumnoId],
    queryFn: async () => {
      if (!alumnoId) return null;
      const users = await localDataClient.entities.User.list();
      return users.find(u => u.id === alumnoId);
    },
    enabled: !!alumnoId,
  });

  useEffect(() => {
    if (sesion) {
      // Asegurar ID estable en rondas
      const sesionConIds = ensureRondaIds(sesion);
      const rondasConId = sesionConIds.rondas || [];

      // Si no hay secuencia guardada, la creamos
      const secuenciaDefault = buildDefaultSecuencia(sesionConIds);
      const secuenciaFinal = sesion.secuencia || secuenciaDefault;

      setFormData({
        nombre: sesion.nombre || '',
        foco: sesion.foco || 'GEN',
        bloques: sesion.bloques || [],
        rondas: rondasConId,
        secuencia: secuenciaFinal,
      });

      // Expandir todas las rondas por defecto (basándose en su posición en la secuencia)
      if (rondasConId.length > 0) {
        const allRondasExpanded = new Set(
          secuenciaFinal
            .map((item, seqIndex) => item.kind === 'RONDA' ? seqIndex : null)
            .filter(idx => idx !== null)
        );
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
        if (!exists) {
          newBloquesToAdd.push(nuevoEjercicio);
        }
        newSecItems.push({ kind: 'BLOQUE', code: ejercicio.code });

        // Validación pedagógica de BPMs
        if (alumno?.nivelTecnico && ejercicio.targetPPMs?.length) {
          const target = ejercicio.targetPPMs.find(t => t.nivel === alumno.nivelTecnico);
          if (!target) {
            toast.warning(
              `⚠️ Este ejercicio no tiene objetivos definidos para el Nivel Técnico ${alumno.nivelTecnico}`,
              { duration: 5000 }
            );
          }
        }
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

    let nuevoSeqIndex;
    setFormData(prev => {
      const nuevaSecuencia = [...prev.secuencia, { kind: 'RONDA', id: nuevaRonda.id }];
      nuevoSeqIndex = nuevaSecuencia.length - 1; // Índice de la nueva ronda en la secuencia

      return {
        ...prev,
        bloques: [...prev.bloques, ...newBloquesToAdd],
        rondas: [...prev.rondas, nuevaRonda],
        secuencia: nuevaSecuencia,
      };
    });
    setSelectedEjercicios(new Set());
    // Expandir la nueva ronda automáticamente (usando el índice en la secuencia)
    setExpandedRondas(prev => new Set([...prev, nuevoSeqIndex]));
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
    const nuevoSeqIndex = rondaIdx + 1; // Índice de la nueva ronda en la secuencia
    newSecuencia.splice(nuevoSeqIndex, 0, { kind: 'RONDA', id: newRonda.id });

    setFormData({
      ...formData,
      rondas: [...formData.rondas, newRonda],
      secuencia: newSecuencia
    });

    // Expandir la ronda duplicada automáticamente
    setExpandedRondas(prev => new Set([...prev, nuevoSeqIndex]));
    toast.success('✅ Ronda duplicada');
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    // 1) Reordenar dentro de SECUENCIA (ambos son seq-${index})
    if (activeId.startsWith('seq-') && overId.startsWith('seq-') &&
      !activeId.includes('-r-') && !overId.includes('-r-')) {
      const oldIndex = parseInt(activeId.split('-').pop());
      const newIndex = parseInt(overId.split('-').pop());
      setFormData({
        ...formData,
        secuencia: arrayMove(formData.secuencia, oldIndex, newIndex),
      });
      return;
    }

    // 2) Mover dentro de una misma ronda
    if (activeId.includes('-r-') && overId.includes('-r-') &&
      activeId.split('-r-')[0] === overId.split('-r-')[0]) {
      const rondaId = activeId.split('-r-')[0];
      const ronda = formData.rondas.find(r => r.id === rondaId);
      if (!ronda) return;

      const oldIndex = parseInt(activeId.split('-').pop());
      const newIndex = parseInt(overId.split('-').pop());
      const newBloques = arrayMove(ronda.bloques, oldIndex, newIndex);

      setFormData({
        ...formData,
        rondas: formData.rondas.map(r =>
          r.id === rondaId ? { ...r, bloques: newBloques } : r
        ),
      });
      return;
    }

    // 3) Mover ejercicio de una ronda a otra ronda
    if (activeId.includes('-r-') && overId.includes('-r-') &&
      activeId.split('-r-')[0] !== overId.split('-r-')[0]) {
      const fromRondaId = activeId.split('-r-')[0];
      const toRondaId = overId.split('-r-')[0];
      const bloqueCode = activeId.split('-r-')[1].split('-')[0];
      const newIndex = parseInt(overId.split('-').pop());

      const newRondas = formData.rondas.map(r => {
        if (r.id === fromRondaId) {
          return { ...r, bloques: r.bloques.filter(code => code !== bloqueCode) };
        }
        if (r.id === toRondaId) {
          return {
            ...r,
            bloques: [
              ...r.bloques.slice(0, newIndex),
              bloqueCode,
              ...r.bloques.slice(newIndex),
            ],
          };
        }
        return r;
      });

      setFormData({ ...formData, rondas: newRondas });
      return;
    }

    // 4) Mover de SECUENCIA (bloque) a RONDA
    if (activeId.startsWith('seq-') && !activeId.includes('-r-') && overId.includes('-r-')) {
      const activeIndex = parseInt(activeId.split('-').pop());
      const activeItem = formData.secuencia[activeIndex];

      // Sólo permitimos mover BLOQUE a ronda
      if (activeItem.kind !== 'BLOQUE') return;

      const bloqueCode = activeItem.code;
      const rondaId = overId.split('-r-')[0];
      const newIndex = parseInt(overId.split('-').pop());

      // Remover de secuencia
      const newSecuencia = formData.secuencia.filter((_, idx) => idx !== activeIndex);

      // Añadir a ronda
      const newRondas = formData.rondas.map(r =>
        r.id === rondaId
          ? {
            ...r,
            bloques: [
              ...r.bloques.slice(0, newIndex),
              bloqueCode,
              ...r.bloques.slice(newIndex),
            ],
          }
          : r
      );

      setFormData({ ...formData, secuencia: newSecuencia, rondas: newRondas });
      return;
    }

    // 5) Mover de RONDA a SECUENCIA
    if (activeId.includes('-r-') && overId.startsWith('seq-') && !overId.includes('-r-')) {
      const rondaId = activeId.split('-r-')[0];
      const bloqueCode = activeId.split('-r-')[1].split('-')[0];
      const newIndex = parseInt(overId.split('-').pop());

      // Remover de ronda
      const newRondas = formData.rondas.map(r =>
        r.id === rondaId
          ? { ...r, bloques: r.bloques.filter(code => code !== bloqueCode) }
          : r
      );

      // Añadir a secuencia
      const newSecuencia = [...formData.secuencia];
      newSecuencia.splice(newIndex, 0, { kind: 'BLOQUE', code: bloqueCode });

      setFormData({ ...formData, secuencia: newSecuencia, rondas: newRondas });
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
    SON: 'Sonido',
    FLX: 'Flexibilidad',
    ART: 'Articulación',
    MOT: 'Motricidad',
    COG: 'Cognitivo',
  };

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
    CB: componentStyles.status.badgeInfo,
    TC: componentStyles.status.badgeDefault,
    FM: componentStyles.status.badgeDefault,
    VC: componentStyles.status.badgeInfo,
    AD: componentStyles.status.badgeDefault,
  };

  const tiempoTotal = calcularTiempoTotal();

  const modalContent = (
    <>
      <div
        className="fixed inset-0 bg-black/40 z-[125]"
        onClick={onClose}
      />

      <div className="fixed inset-0 z-[130] flex items-center justify-center pointer-events-none p-4 overflow-y-auto">
        <div
          className="w-full max-w-6xl my-8 overflow-hidden flex flex-col max-h-[92vh] pointer-events-auto shadow-card rounded-[var(--radius-modal)] bg-[var(--color-surface-elevated)] border border-[var(--color-border-default)]"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="border-b border-[var(--color-border-default)] bg-[var(--color-surface-muted)] rounded-t-[var(--radius-modal)] px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <PlayCircle className="w-6 h-6 text-[var(--color-text-primary)]" />
                <CardTitle className="text-[var(--color-text-primary)]">Editar Sesión</CardTitle>
              </div>
              <Button variant="ghost" size="icon" onClick={onClose} className="text-[var(--color-text-primary)] hover:bg-[var(--color-surface)] h-11 w-11 sm:h-9 sm:w-9 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 rounded-[var(--btn-radius)] touch-manipulation">
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>

          <CardContent className="flex-1 overflow-y-auto p-6 space-y-6">
            <div className={componentStyles.layout.grid2}>
              <div>
                <Label htmlFor="nombre" className="text-[var(--color-text-primary)]">Nombre de la Sesión *</Label>
                <Input
                  id="nombre"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  placeholder="Ej: Sesión A"
                  className={componentStyles.controls.inputDefault}
                />
              </div>

              <div>
                <Label htmlFor="foco" className="text-[var(--color-text-primary)]">Foco de la Sesión *</Label>
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
                    className="z-[230] min-w-[var(--radix-select-trigger-width)] max-h-64 overflow-auto"
                  >
                    {Object.entries(focoLabels).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="app-panel border-[var(--color-info)]/20 bg-[var(--color-info)]/10 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[var(--color-text-primary)] font-medium">Tiempo previsto (excluyendo AD)</p>
                  <p className="text-xs text-[var(--color-text-secondary)] mt-1">
                    {formData.bloques.filter(b => b.tipo !== 'AD').length} ejercicios + {formData.rondas.length} rondas
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold text-[var(--color-text-primary)]">
                    {Math.floor(tiempoTotal / 60)}:{String(tiempoTotal % 60).padStart(2, '0')}
                  </p>
                  <p className="text-xs text-[var(--color-text-secondary)]">minutos</p>
                </div>
              </div>
            </div>

            <Card className="app-panel">
              <CardHeader>
                <CardTitle className="text-lg text-[var(--color-text-primary)]">Estructura de la sesión</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {formData.secuencia.length === 0 ? (
                  <div className="text-center py-12">
                    <PlayCircle className="w-16 h-16 mx-auto mb-4 text-[var(--color-text-secondary)]" />
                    <p className="text-sm mb-4 text-[var(--color-text-primary)]">Aún no hay ejercicios ni rondas en esta sesión.</p>
                  </div>
                ) : (
                  <DndProvider onDragEnd={handleDragEnd}>
                    <SortableContext
                      items={formData.secuencia.map((_, i) => `seq-${i}`)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="space-y-2">
                        {formData.secuencia.map((item, seqIndex) => {
                          if (item.kind === 'BLOQUE') {
                            const bloque = formData.bloques.find(b => b.code === item.code);
                            if (!bloque) return null;

                            return (
                              <SortableItem
                                key={`seq-b-${item.code}-${seqIndex}`}
                                id={`seq-${seqIndex}`}
                                className="flex items-center gap-2 p-3 border border-[var(--color-border-default)] rounded-[var(--radius-card)] bg-[var(--color-surface-elevated)] hover:shadow-sm transition-all"
                              >
                                {({ dragHandleProps, isDragging }) => (
                                  <>
                                    <div {...dragHandleProps} className="cursor-grab active:cursor-grabbing">
                                      <GripVertical className="w-4 h-4 text-[var(--color-text-secondary)]" />
                                    </div>
                                    <Badge className={`rounded-full ${tipoColors[bloque.tipo]}`}>
                                      {bloque.tipo}
                                    </Badge>
                                    <div className="flex-1 min-w-0">
                                      <p className="font-medium text-sm truncate text-[var(--color-text-primary)]">{bloque.nombre}</p>
                                      <p className="text-xs text-[var(--color-text-secondary)]">
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
                                      className={componentStyles.buttons.editIcon}
                                    >
                                      <Edit className="w-4 h-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => removeEjercicio(formData.bloques.findIndex(b => b.code === bloque.code))}
                                      className={componentStyles.buttons.deleteIcon}
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </>
                                )}
                              </SortableItem>
                            );
                          }

                          // RONDA
                          const ronda = formData.rondas.find(r => r.id === item.id);
                          if (!ronda) return null;
                          const isExpanded = expandedRondas.has(seqIndex);

                          return (
                            <SortableRonda
                              key={`seq-r-${item.id}`}
                              id={`seq-${seqIndex}`}
                              ronda={ronda}
                              seqIndex={seqIndex}
                              isExpanded={isExpanded}
                              formData={formData}
                              expandedRondas={expandedRondas}
                              setExpandedRondas={setExpandedRondas}
                              updateRondaRepeticiones={updateRondaRepeticiones}
                              updateRondaAleatoria={updateRondaAleatoria}
                              duplicateRonda={duplicateRonda}
                              setFormData={setFormData}
                              setEditingEjercicio={setEditingEjercicio}
                              removeEjercicioFromRonda={removeEjercicioFromRonda}
                              piezaSnapshot={piezaSnapshot}
                              pieza={pieza}
                              tipoColors={tipoColors}
                              componentStyles={componentStyles}
                            />
                          );
                        })}
                      </div>
                    </SortableContext>
                  </DndProvider>
                )}
              </CardContent>
            </Card>

            <Card className="app-panel">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg text-[var(--color-text-primary)]">Biblioteca de Ejercicios</CardTitle>
                  <button
                    onClick={() => setEditingEjercicio({ ejercicio: null, piezaSnapshot: piezaSnapshot || pieza })}
                    className="text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:underline transition-colors cursor-pointer"
                  >
                    Crear Ejercicio
                  </button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2 flex-wrap">
                  <div className="flex-1 min-w-[200px] relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[var(--color-text-secondary)]" />
                    <Input
                      placeholder="Buscar ejercicios..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className={`pl-10 ${componentStyles.controls.inputDefault}`}
                    />
                  </div>
                  <div className="flex gap-1 flex-wrap">
                    {Object.entries(tipoLabels).map(([key, label]) => (
                      <Badge
                        key={key}
                        variant={tiposFilter.has(key) ? "default" : "outline"}
                        className={`cursor-pointer transition-all rounded-full ${tiposFilter.has(key) ? tipoColors[key] : 'hover:bg-[var(--color-surface-muted)] hover:shadow-sm'
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
                        className="h-6 px-2 rounded-[var(--radius-card)]"
                      >
                        <RotateCcw className="w-3 h-3 mr-1" />
                        Todos
                      </Button>
                    )}
                  </div>
                </div>

                {selectedEjercicios.size > 0 && (
                  <Alert className="rounded-[var(--radius-card)] border-[var(--color-info)]/20 bg-[var(--color-info)]/10">
                    <AlertDescription className="text-[var(--color-text-primary)] flex items-center justify-between flex-wrap gap-2">
                      <span>
                        <strong className="text-[var(--color-info)]">{selectedEjercicios.size} ejercicio(s) seleccionado(s).</strong>
                        {' '}Puedes agregarlos directamente o crear una ronda con ellos.
                      </span>
                      <div className="flex gap-2 flex-wrap">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedEjercicios(new Set())}
                          className={`${componentStyles.buttons.outline} h-8`}
                        >
                          <RotateCcw className="w-3 h-3 mr-1" />
                          Limpiar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={crearRondaDesdeSeleccion}
                          className={`bg-[var(--color-primary-soft)] border-[var(--color-primary)]/30 text-[var(--color-primary)] hover:bg-[var(--color-primary-soft)] h-8 ${componentStyles.buttons.outline}`}
                        >
                          Crear Ronda ({selectedEjercicios.size})
                        </Button>
                        <Button
                          size="sm"
                          onClick={addEjerciciosSeleccionados}
                          className={`${componentStyles.buttons.primary} h-8`}
                        >
                          Agregar Ejercicios ({selectedEjercicios.size})
                        </Button>
                      </div>
                    </AlertDescription>
                  </Alert>
                )}

                <div className={`${componentStyles.layout.grid3} gap-2 max-h-80 overflow-y-auto border border-[var(--color-border-default)] rounded-[var(--radius-card)] p-3 bg-[var(--color-surface-muted)]`}>
                  {filteredEjercicios.length === 0 ? (
                    <div className="col-span-full text-center py-8">
                      <p className="text-sm text-[var(--color-text-secondary)]">No se encontraron ejercicios</p>
                    </div>
                  ) : (
                    filteredEjercicios.map((ejercicio) => (
                      <div
                        key={ejercicio.id}
                        className={`flex items-center gap-2 p-2 border border-[var(--color-border-default)] rounded-[var(--radius-card)] cursor-pointer transition-all ${selectedEjercicios.has(ejercicio.id)
                          ? 'border-[var(--color-primary)] bg-[var(--color-primary-soft)] shadow-sm'
                          : 'bg-[var(--color-surface-elevated)] hover:bg-[var(--color-surface-muted)] hover:shadow-sm'
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
                          onCheckedChange={() => { }}
                        />
                        <Badge variant="outline" className={`shrink-0 rounded-full ${tipoColors[ejercicio.tipo]}`}>
                          {ejercicio.tipo}
                        </Badge>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate text-[var(--color-text-primary)]">{ejercicio.nombre}</p>
                          <p className="text-xs text-[var(--color-text-secondary)] truncate">{ejercicio.code}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </CardContent>

          <div className="border-t border-[var(--color-border-default)] px-6 py-4 bg-[var(--color-surface-muted)] rounded-b-2xl">
            <div className="flex gap-3 mb-2">
              <Button variant="outline" onClick={onClose} className={`flex-1 ${componentStyles.buttons.outline}`}>
                Cancelar
              </Button>
              <Button onClick={handleSave} className={`flex-1 ${componentStyles.buttons.primary}`}>
                <Save className="w-4 h-4 mr-2" />
                Guardar
              </Button>
            </div>
            <p className="text-xs text-center text-[var(--color-text-secondary)]">
              Ctrl/⌘+Intro : guardar • Ctrl/⌘+. : cancelar • Ctrl/⌘+B : limpiar selección
            </p>
          </div>
        </div>
      </div>

      {editingEjercicio && (
        <ExerciseEditor
          ejercicio={editingEjercicio.ejercicio}
          piezaSnapshot={editingEjercicio.piezaSnapshot}
          isInlineMode={true}
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
