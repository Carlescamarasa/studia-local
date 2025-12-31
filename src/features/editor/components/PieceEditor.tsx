/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useState, useEffect, useCallback } from "react";
import { localDataClient } from "@/api/localDataClient";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/features/shared/components/ui/button";
import { Input } from "@/features/shared/components/ui/input";
import { Label } from "@/features/shared/components/ui/label";
import { Textarea } from "@/features/shared/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/features/shared/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/features/shared/components/ui/card";
import { X, Save, Plus, Trash2, GripVertical, Music } from "lucide-react";
import { Alert, AlertDescription } from "@/features/shared/components/ui/alert";
import { DndProvider, SortableContext, verticalListSortingStrategy, arrayMove } from "@/features/shared/components/dnd/DndProvider";
import { SortableItem } from "@/features/shared/components/dnd/SortableItem";
import { createPortal } from "react-dom";
import { componentStyles } from "@/design/componentStyles";
import MediaLinksInput from "@/features/shared/components/media/MediaLinksInput";
import { normalizeMediaLinks } from "@/features/shared/utils/media";
import { useDataEntities } from "@/providers/DataProvider";
import { useEffectiveUser } from "@/providers/EffectiveUserProvider";

import { Pieza, PiezaFormData, Elemento, NivelPieza } from "../types";
import { MediaItem } from "@/features/shared/components/media/MediaLinksInput";

export default function PieceEditor({ pieza, onClose }: { pieza?: Pieza | null; onClose: () => void }) {
  const queryClient = useQueryClient();
  const entities = useDataEntities();
  const effectiveUser = useEffectiveUser();
  const [formData, setFormData] = useState<PiezaFormData>({
    nombre: '',
    descripcion: '',
    nivel: 'principiante',
    tiempoObjetivoSeg: 0,
    elementos: [],
  });
  const [saveResult, setSaveResult] = useState<{ success: boolean; message: string } | null>(null);

  // Convertir elementos antiguos con media object a mediaLinks array
  const normalizeElementos = (elementos: any[]): Elemento[] => {
    return elementos.map(el => {
      // Si tiene el formato antiguo (media object), convertir a array
      if (el.media && typeof el.media === 'object' && !Array.isArray(el.media)) {
        const urls: string[] = [];
        if (el.media.video) urls.push(el.media.video);
        if (el.media.audio) urls.push(el.media.audio);
        if (el.media.imagen) urls.push(el.media.imagen);
        if (el.media.pdf) urls.push(el.media.pdf);
        return { ...el, mediaLinks: normalizeMediaLinks(urls), media: undefined } as Elemento;
      }
      // Si ya tiene mediaLinks o está vacío, normalizar
      return {
        ...el,
        mediaLinks: el.mediaLinks ? normalizeMediaLinks(el.mediaLinks) : []
      } as Elemento;
    });
  };

  useEffect(() => {
    if (pieza) {
      setFormData({
        nombre: pieza.nombre || '',
        descripcion: pieza.descripcion || '',
        nivel: pieza.nivel || 'principiante',
        tiempoObjetivoSeg: pieza.tiempoObjetivoSeg || 0,
        elementos: normalizeElementos(pieza.elementos || []),
      });
    }
  }, [pieza]);

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      if (pieza?.id) {
        return entities.Pieza.update(pieza.id, data);
      }
      return entities.Pieza.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['piezas'] });
      setSaveResult({ success: true, message: '✅ Cambios guardados' });
      setTimeout(() => onClose(), 1500);
    },
    onError: (error: any) => {
      setSaveResult({ success: false, message: `❌ Error: ${error.message}` });
    },
  });

  const handleSave = useCallback(() => {
    if (!formData.nombre.trim()) {
      setSaveResult({ success: false, message: '❌ El nombre es obligatorio' });
      return;
    }

    // Map mediaLinks to string[] for DB compatibility
    const dataToSave = {
      ...(pieza?.id ? formData : { ...formData, profesorId: effectiveUser?.effectiveUserId }),
      elementos: formData.elementos.map(el => ({
        ...el,
        mediaLinks: (el.mediaLinks || []).map((m: any) => typeof m === 'string' ? m : m.url)
      }))
    };

    saveMutation.mutate(dataToSave as any);
  }, [formData, pieza?.id, effectiveUser?.effectiveUserId, saveMutation]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === '.') {
        e.preventDefault();
        onClose();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, handleSave]);

  const addElemento = () => {
    setFormData({
      ...formData,
      elementos: [
        ...formData.elementos,
        {
          nombre: '',
          mediaLinks: []
        }
      ]
    });
  };

  const updateElemento = useCallback((index: number, field: 'nombre' | 'mediaLinks', value: any) => {
    const newElementos = [...formData.elementos];
    if (field === 'nombre') {
      newElementos[index].nombre = value as string;
    } else if (field === 'mediaLinks') {
      // Normalizar y mantener objetos
      newElementos[index].mediaLinks = normalizeMediaLinks(value, true) as MediaItem[];
    }
    setFormData(prev => ({ ...prev, elementos: newElementos }));
  }, [formData.elementos]);

  const removeElemento = (index: number) => {
    setFormData({
      ...formData,
      elementos: formData.elementos.filter((_, i) => i !== index)
    });
  };

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = formData.elementos.findIndex((_, i) => `elemento-${i}` === active.id);
    const newIndex = formData.elementos.findIndex((_, i) => `elemento-${i}` === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    setFormData({
      ...formData,
      elementos: arrayMove(formData.elementos, oldIndex, newIndex),
    });
  };

  const modalContent = (
    <>
      <div
        className="fixed inset-0 bg-black/40 z-[220]"
        onClick={() => onClose()}
      />
      <div className="fixed inset-0 z-[225] flex items-center justify-center pointer-events-none p-4 overflow-y-auto">
        <div
          className="bg-[var(--color-surface-elevated)] w-full max-w-3xl max-h-[92vh] shadow-[0_8px_24px_rgba(0,0,0,0.16)] rounded-[var(--radius-modal)] flex flex-col pointer-events-auto my-8"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="border-b border-[var(--color-border-default)] bg-[var(--color-surface-muted)] rounded-t-[var(--radius-modal)] px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Music className="w-6 h-6 text-[var(--color-text-primary)]" />
                <div>
                  <h2 className="text-xl font-bold text-[var(--color-text-primary)]">
                    {pieza ? 'Editar Pieza' : 'Nueva Pieza'}
                  </h2>
                  <p className="text-sm text-[var(--color-text-secondary)]">Plantilla de pieza musical</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={onClose} className="text-[var(--color-text-primary)] hover:bg-[var(--color-surface)] h-11 w-11 sm:h-9 sm:w-9 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 rounded-[var(--btn-radius)] touch-manipulation">
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {saveResult && (
              <Alert className={saveResult.success ? 'border-[var(--color-success)]/20 bg-[var(--color-success)]/10' : 'border-[var(--color-danger)]/20 bg-[var(--color-danger)]/10'}>
                <AlertDescription className={`text-[var(--color-text-primary)] ${saveResult.success ? '' : ''}`}>
                  {saveResult.message}
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-4">
              <div className={componentStyles.form.field}>
                <Label htmlFor="nombre" className={componentStyles.typography.cardTitle}>
                  Nombre de la Pieza *
                </Label>
                <Input
                  id="nombre"
                  value={formData.nombre}
                  onChange={(e) => {
                    if (e?.target?.value !== undefined) {
                      setFormData(prev => ({ ...prev, nombre: e.target.value }));
                    }
                  }}
                  placeholder="Ej: Sonata en Do Mayor"
                  autoComplete="off"
                  data-form-type="other"
                />
              </div>

              <div className={componentStyles.form.field}>
                <Label htmlFor="descripcion" className={componentStyles.typography.cardTitle}>
                  Descripción
                </Label>
                <Textarea
                  id="descripcion"
                  value={formData.descripcion}
                  onChange={(e) => {
                    if (e?.target?.value !== undefined) {
                      setFormData(prev => ({ ...prev, descripcion: e.target.value }));
                    }
                  }}
                  placeholder="Descripción detallada de la pieza..."
                  rows={3}
                  autoComplete="off"
                  data-form-type="other"
                />
              </div>

              <div className={componentStyles.layout.grid2}>
                <div className={componentStyles.form.field}>
                  <Label htmlFor="nivel" className={componentStyles.typography.cardTitle}>Nivel</Label>
                  <Select
                    value={formData.nivel}
                    onValueChange={(v) => setFormData({ ...formData, nivel: v as NivelPieza })}
                  >
                    <SelectTrigger id="nivel" className={`w-full ${componentStyles.controls.selectDefault}`}>
                      <SelectValue placeholder="Selecciona nivel..." />
                    </SelectTrigger>
                    <SelectContent
                      position="popper"
                      side="bottom"
                      align="start"
                      sideOffset={4}
                      className="z-[230] min-w-[var(--radix-select-trigger-width)] max-h-64 overflow-auto"
                    >
                      <SelectItem value="principiante">Principiante</SelectItem>
                      <SelectItem value="intermedio">Intermedio</SelectItem>
                      <SelectItem value="avanzado">Avanzado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className={componentStyles.form.field}>
                  <Label htmlFor="tiempo" className={componentStyles.typography.cardTitle}>
                    Tiempo Objetivo (minutos)
                  </Label>
                  <Input
                    id="tiempo"
                    type="number"
                    min="0"
                    value={Math.floor(formData.tiempoObjetivoSeg / 60)}
                    onChange={(e) => {
                      if (e?.target?.value !== undefined) {
                        setFormData(prev => ({ ...prev, tiempoObjetivoSeg: parseInt(e.target.value.toString() || '0') * 60 }));
                      }
                    }}
                    autoComplete="off"
                    data-form-type="other"
                  />
                </div>
              </div>
            </div>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg text-[var(--color-text-primary)]">Elementos Multimedia</CardTitle>
                  <Button onClick={addElemento} size="sm" variant="outline" className={componentStyles.buttons.outline}>
                    <Plus className="w-4 h-4 mr-2" />
                    Añadir Elemento
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 overflow-hidden">
                {formData.elementos.length === 0 ? (
                  <div className="text-center py-8">
                    <Music className="w-12 h-12 mx-auto mb-3 text-[var(--color-text-secondary)]" />
                    <p className="text-sm text-[var(--color-text-secondary)]">No hay elementos. Añade el primer elemento multimedia.</p>
                  </div>
                ) : (
                  <DndProvider onDragEnd={handleDragEnd}>
                    <SortableContext
                      items={formData.elementos.map((_, i) => `elemento-${i}`)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="space-y-3">
                        {formData.elementos.map((elemento, index) => (
                          <SortableItem
                            key={`elemento-${index}`}
                            id={`elemento-${index}`}
                            className="border-2"
                          >
                            {({ dragHandleProps, isDragging }) => (
                              <Card
                                className={`border-2 ${isDragging ? 'shadow-card border-[var(--color-primary)]' : ''}`}
                              >
                                <CardContent className="pt-4 space-y-3 overflow-hidden">
                                  <div className="flex items-start gap-3">
                                    <div {...dragHandleProps} className="flex flex-col gap-1 pt-2">
                                      <GripVertical className="w-5 h-5 text-[var(--color-text-secondary)]" />
                                    </div>
                                    <div className="flex-1 space-y-3 overflow-hidden">
                                      <div>
                                        <Label htmlFor={`elemento-nombre-${index}`} className={componentStyles.typography.cardTitle}>Nombre del elemento</Label>
                                        <Input
                                          id={`elemento-nombre-${index}`}
                                          placeholder="Ej: Partitura, Audio guía, Video tutorial..."
                                          value={elemento.nombre}
                                          onChange={(e) => {
                                            if (e?.target?.value !== undefined) {
                                              updateElemento(index, 'nombre', e.target.value);
                                            }
                                          }}
                                          className={`mt-1 ${componentStyles.controls.inputDefault}`}
                                          autoComplete="off"
                                          data-form-type="other"
                                        />
                                      </div>

                                      <MediaLinksInput
                                        value={elemento.mediaLinks || []}
                                        onChange={(links) => updateElemento(index, 'mediaLinks', links)}
                                      />
                                    </div>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => removeElemento(index)}
                                      className={componentStyles.buttons.deleteIcon}
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </div>
                                </CardContent>
                              </Card>
                            )}
                          </SortableItem>
                        ))}
                      </div>
                    </SortableContext>
                  </DndProvider>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="border-t border-[var(--color-border-default)] px-6 py-4 bg-[var(--color-surface-muted)] rounded-b-2xl">
            <div className="flex gap-3 mb-2">
              <Button variant="outline" onClick={onClose} className={`flex-1 ${componentStyles.buttons.outline}`}>
                Cancelar
              </Button>
              <Button
                onClick={handleSave}
                disabled={saveMutation.isPending}
                className={`flex-1 ${componentStyles.buttons.primary}`}
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
            <p className="text-xs text-center text-[var(--color-text-secondary)]">
              Ctrl/⌘+Intro : guardar • Ctrl/⌘+. : cancelar
            </p>
          </div>
        </div>
      </div>
    </>
  );

  return createPortal(modalContent, document.body);
}
