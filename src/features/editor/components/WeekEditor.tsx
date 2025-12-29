
import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/features/shared/components/ui/button";
import { Input } from "@/features/shared/components/ui/input";
import { Label } from "@/features/shared/components/ui/label";
import { Textarea } from "@/features/shared/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/features/shared/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/features/shared/components/ui/card";
import { X, Save, Calendar } from "lucide-react";
import { createPortal } from "react-dom";

export default function WeekEditor({ semana, onSave, onClose }) {
  const [formData, setFormData] = useState({
    nombre: '',
    foco: 'GEN',
    objetivo: '',
    sesiones: [],
  });

  useEffect(() => {
    if (semana) {
      setFormData({
        nombre: semana.nombre || '',
        foco: semana.foco || 'GEN',
        objetivo: semana.objetivo || '',
        sesiones: semana.sesiones || [],
      });
    }
  }, [semana]);

  const handleSave = useCallback(() => {
    onSave(formData);
  }, [formData, onSave]);

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
  }, [onClose, handleSave]);

  const focoLabels = {
    GEN: 'General',
    SON: 'Sonido',
    FLX: 'Flexibilidad',
    MOT: 'Motricidad',
    ART: 'Articulación',
    COG: 'Cognitivo',
  };

  const modalContent = (
    <>
      <div 
        className="fixed inset-0 bg-black/40 z-[125]"
        onClick={onClose}
      />
      
      <div className="fixed inset-0 z-[130] flex items-center justify-center pointer-events-none p-4 overflow-y-auto">
        <Card 
          className="w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col pointer-events-auto shadow-card rounded-[var(--radius-modal)] app-card my-8"
          onClick={(e) => e.stopPropagation()}
        >
          <CardHeader className="border-b border-[var(--color-border-default)] bg-brand-500 text-white rounded-t-[var(--radius-modal)]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Calendar className="w-6 h-6" />
                <CardTitle>Editar Semana</CardTitle>
              </div>
              <Button variant="ghost" size="icon" onClick={onClose} className="text-white hover:bg-white/20 h-11 w-11 sm:h-9 sm:w-9 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 rounded-[var(--btn-radius)] touch-manipulation" aria-label="Cerrar editor">
                <X className="w-5 h-5" />
              </Button>
            </div>
          </CardHeader>

          <CardContent className="flex-1 overflow-y-auto p-6 space-y-4">
            <div>
              <Label htmlFor="nombre">Nombre de la Semana *</Label>
              <Input
                id="nombre"
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                placeholder="Ej: Semana 1"
                className="h-10 rounded-[var(--radius-ctrl)] border-[var(--color-border-default)] focus-orange"
              />
            </div>

            <div>
              <Label htmlFor="foco">Foco de la Semana *</Label>
              <Select 
                value={formData.foco} 
                onValueChange={(v) => setFormData({ ...formData, foco: v })}
                modal={false}
              >
                <SelectTrigger id="foco" className="w-full h-10 rounded-[var(--radius-ctrl)] border-[var(--color-border-default)] focus-orange">
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

            <div>
              <Label htmlFor="objetivo">Objetivo de la Semana</Label>
              <Textarea
                id="objetivo"
                value={formData.objetivo}
                onChange={(e) => setFormData({ ...formData, objetivo: e.target.value })}
                placeholder="Si está vacío, heredará el objetivo por defecto del plan"
                rows={3}
                className="rounded-[var(--radius-ctrl)] border-[var(--color-border-default)] focus-orange resize-none"
              />
            </div>

            <div className="text-sm text-muted">
              Esta semana contiene {formData.sesiones?.length || 0} sesiones.
            </div>
          </CardContent>

          <div className="border-t border-[var(--color-border-default)] px-6 py-4 bg-muted rounded-b-2xl">
            <div className="flex gap-3 mb-2">
              <Button variant="outline" onClick={onClose} className="flex-1 h-10 rounded-[var(--radius-ctrl)]">
                Cancelar
              </Button>
              <Button onClick={handleSave} className="flex-1 btn-primary h-10 rounded-[var(--radius-ctrl)] shadow-sm">
                <Save className="w-4 h-4 mr-2" />
                Guardar
              </Button>
            </div>
            <p className="text-xs text-center text-muted">
              Ctrl/⌘+Intro : guardar • Ctrl/⌘+. : cancelar
            </p>
          </div>
        </Card>
      </div>
    </>
  );

  return createPortal(modalContent, document.body);
}
