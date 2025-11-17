
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { X, Save, Plus, Trash2, GripVertical, Music, Video, Headphones, Image as ImageIcon, FileText } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { createPortal } from "react-dom";
import { componentStyles } from "@/design/componentStyles";

export default function PieceEditor({ pieza, onClose }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    nivel: 'principiante',
    tiempoObjetivoSeg: 0,
    elementos: [],
  });
  const [saveResult, setSaveResult] = useState(null);

  useEffect(() => {
    if (pieza) {
      setFormData({
        nombre: pieza.nombre || '',
        descripcion: pieza.descripcion || '',
        nivel: pieza.nivel || 'principiante',
        tiempoObjetivoSeg: pieza.tiempoObjetivoSeg || 0,
        elementos: pieza.elementos || [],
      });
    }
  }, [pieza]);

  const handleSave = () => {
    if (!formData.nombre.trim()) {
      setSaveResult({ success: false, message: '❌ El nombre es obligatorio' });
      return;
    }
    saveMutation.mutate(formData);
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
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
  }, [formData, onClose, handleSave]); // Add handleSave to dependencies to prevent stale closure for handleSave


  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (pieza?.id) {
        return base44.entities.Pieza.update(pieza.id, data);
      }
      return base44.entities.Pieza.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['piezas'] });
      setSaveResult({ success: true, message: '✅ Cambios guardados' });
      setTimeout(() => onClose(), 1500);
    },
    onError: (error) => {
      setSaveResult({ success: false, message: `❌ Error: ${error.message}` });
    },
  });


  const addElemento = () => {
    setFormData({
      ...formData,
      elementos: [
        ...formData.elementos,
        {
          nombre: '',
          media: {}
        }
      ]
    });
  };

  const updateElemento = (index, field, value) => {
    const newElementos = [...formData.elementos];
    if (field === 'nombre') {
      newElementos[index].nombre = value;
    } else {
      newElementos[index].media = {
        ...newElementos[index].media,
        [field]: value
      };
    }
    setFormData({ ...formData, elementos: newElementos });
  };

  const removeElemento = (index) => {
    setFormData({
      ...formData,
      elementos: formData.elementos.filter((_, i) => i !== index)
    });
  };

  const onDragEnd = (result) => {
    if (!result.destination) return;
    
    const items = Array.from(formData.elementos);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    
    setFormData({ ...formData, elementos: items });
  };

  const modalContent = (
    <>
      <div 
        className="fixed inset-0 bg-black/40 z-[80]"
        onClick={onClose}
      />
      <div className="fixed inset-0 z-[90] flex items-center justify-center pointer-events-none p-4 overflow-y-auto">
        <div 
          className="bg-[var(--color-surface-elevated)] w-full max-w-3xl max-h-[92vh] shadow-card rounded-2xl flex flex-col pointer-events-auto my-8"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="border-b border-[var(--color-border-default)] bg-[var(--color-surface-muted)] rounded-t-2xl px-6 py-4">
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
              <Button variant="ghost" size="icon" onClick={onClose} className="text-[var(--color-text-primary)] hover:bg-[var(--color-surface)] h-9 w-9 rounded-xl">
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
              <div>
                <Label htmlFor="nombre" className="text-[var(--color-text-primary)]">Nombre de la Pieza *</Label>
                <Input
                  id="nombre"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  placeholder="Ej: Sonata en Do Mayor"
                  className={componentStyles.controls.inputDefault}
                />
              </div>

              <div>
                <Label htmlFor="descripcion" className="text-[var(--color-text-primary)]">Descripción</Label>
                <Textarea
                  id="descripcion"
                  value={formData.descripcion}
                  onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                  placeholder="Descripción detallada de la pieza..."
                  rows={3}
                  className={componentStyles.controls.inputDefault}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="nivel" className="text-[var(--color-text-primary)]">Nivel</Label>
                  <Select 
                    value={formData.nivel} 
                    onValueChange={(v) => setFormData({ ...formData, nivel: v })}
                    modal={false}
                  >
                    <SelectTrigger id="nivel" className={`w-full ${componentStyles.controls.selectDefault}`}>
                      <SelectValue placeholder="Selecciona nivel..." />
                    </SelectTrigger>
                    <SelectContent 
                      position="popper" 
                      side="bottom" 
                      align="start" 
                      sideOffset={4}
                      className="z-[120] min-w-[var(--radix-select-trigger-width)] max-h-64 overflow-auto"
                    >
                      <SelectItem value="principiante">Principiante</SelectItem>
                      <SelectItem value="intermedio">Intermedio</SelectItem>
                      <SelectItem value="avanzado">Avanzado</SelectItem>
                      <SelectItem value="profesional">Profesional</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="tiempo" className="text-[var(--color-text-primary)]">Tiempo Objetivo (minutos)</Label>
                  <Input
                    id="tiempo"
                    type="number"
                    min="0"
                    value={Math.floor(formData.tiempoObjetivoSeg / 60)}
                    onChange={(e) => setFormData({ ...formData, tiempoObjetivoSeg: parseInt(e.target.value || 0) * 60 })}
                    className={componentStyles.controls.inputDefault}
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
              <CardContent className="space-y-4">
                {formData.elementos.length === 0 ? (
                  <div className="text-center py-8">
                    <Music className="w-12 h-12 mx-auto mb-3 text-[var(--color-text-secondary)]" />
                    <p className="text-sm text-[var(--color-text-secondary)]">No hay elementos. Añade el primer elemento multimedia.</p>
                  </div>
                ) : (
                  <DragDropContext onDragEnd={onDragEnd}>
                    <Droppable droppableId="elementos">
                      {(provided) => (
                        <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-3">
                          {formData.elementos.map((elemento, index) => (
                            <Draggable key={`elemento-${index}`} draggableId={`elemento-${index}`} index={index}>
                              {(provided, snapshot) => (
                                <Card 
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  className={`border-2 ${snapshot.isDragging ? 'shadow-card border-[var(--color-primary)]' : ''}`}
                                >
                                  <CardContent className="pt-4 space-y-3">
                                    <div className="flex items-start gap-3">
                                      <div {...provided.dragHandleProps} className="flex flex-col gap-1 pt-2 cursor-grab active:cursor-grabbing">
                                        <GripVertical className="w-5 h-5 text-[var(--color-text-secondary)]" />
                                      </div>
                                      <div className="flex-1 space-y-3">
                                        <Input
                                          placeholder="Nombre del elemento"
                                          value={elemento.nombre}
                                          onChange={(e) => updateElemento(index, 'nombre', e.target.value)}
                                          className={componentStyles.controls.inputDefault}
                                        />
                                        
                                        <div className="grid grid-cols-2 gap-2">
                                          <div>
                                            <Label className="text-xs flex items-center gap-1 mb-1 text-[var(--color-text-primary)]">
                                              <Video className="w-3 h-3" /> Video
                                            </Label>
                                            <Input
                                              placeholder="URL del video"
                                              value={elemento.media?.video || ''}
                                              onChange={(e) => updateElemento(index, 'video', e.target.value)}
                                              className={`text-sm ${componentStyles.controls.inputDefault}`}
                                            />
                                          </div>
                                          <div>
                                            <Label className="text-xs flex items-center gap-1 mb-1 text-[var(--color-text-primary)]">
                                              <Headphones className="w-3 h-3" /> Audio
                                            </Label>
                                            <Input
                                              placeholder="URL del audio"
                                              value={elemento.media?.audio || ''}
                                              onChange={(e) => updateElemento(index, 'audio', e.target.value)}
                                              className={`text-sm ${componentStyles.controls.inputDefault}`}
                                            />
                                          </div>
                                          <div>
                                            <Label className="text-xs flex items-center gap-1 mb-1 text-[var(--color-text-primary)]">
                                              <ImageIcon className="w-3 h-3" /> Imagen
                                            </Label>
                                            <Input
                                              placeholder="URL de la imagen"
                                              value={elemento.media?.imagen || ''}
                                              onChange={(e) => updateElemento(index, 'imagen', e.target.value)}
                                              className={`text-sm ${componentStyles.controls.inputDefault}`}
                                            />
                                          </div>
                                          <div>
                                            <Label className="text-xs flex items-center gap-1 mb-1 text-[var(--color-text-primary)]">
                                              <FileText className="w-3 h-3" /> PDF
                                            </Label>
                                            <Input
                                              placeholder="URL del PDF"
                                              value={elemento.media?.pdf || ''}
                                              onChange={(e) => updateElemento(index, 'pdf', e.target.value)}
                                              className={`text-sm ${componentStyles.controls.inputDefault}`}
                                            />
                                          </div>
                                        </div>
                                      </div>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => removeElemento(index)}
                                        className={`text-[var(--color-danger)] hover:text-[var(--color-danger)] hover:bg-[var(--color-danger)]/10`}
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </Button>
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
