import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ds/Button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { localDataClient } from "@/api/localDataClient";
import { toast } from "sonner";
import { componentStyles } from "@/design/componentStyles";
import { generateId } from "@/data/localStorageClient";

const pad2 = (n) => String(n).padStart(2, "0");
const formatLocalDate = (d) => `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;

export default function ModalCrearEvento({ open, onOpenChange, evento, userIdActual }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    titulo: '',
    descripcion: '',
    fechaInicio: formatLocalDate(new Date()),
    fechaFin: '',
    tipo: 'otro',
    visiblePara: ['ESTU', 'PROF', 'ADMIN'],
  });

  useEffect(() => {
    if (evento) {
      setFormData({
        titulo: evento.titulo || '',
        descripcion: evento.descripcion || '',
        fechaInicio: evento.fechaInicio || formatLocalDate(new Date()),
        fechaFin: evento.fechaFin || '',
        tipo: evento.tipo || 'otro',
        visiblePara: evento.visiblePara || ['ESTU', 'PROF', 'ADMIN'],
      });
    } else {
      setFormData({
        titulo: '',
        descripcion: '',
        fechaInicio: formatLocalDate(new Date()),
        fechaFin: '',
        tipo: 'otro',
        visiblePara: ['ESTU', 'PROF', 'ADMIN'],
      });
    }
  }, [evento, open]);

  const crearMutation = useMutation({
    mutationFn: async (data) => {
      const eventoData = {
        id: generateId('evento'),
        ...data,
        creadoPorId: userIdActual,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      return await localDataClient.entities.EventoCalendario.create(eventoData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['eventosCalendario'] });
      toast.success('✅ Evento creado exitosamente');
      onOpenChange(false);
    },
    onError: (error) => {
      console.error('Error creando evento:', error);
      toast.error('❌ Error al crear evento');
    },
  });

  const actualizarMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const eventoData = {
        ...data,
        updated_at: new Date().toISOString(),
      };
      return await localDataClient.entities.EventoCalendario.update(id, eventoData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['eventosCalendario'] });
      toast.success('✅ Evento actualizado exitosamente');
      onOpenChange(false);
    },
    onError: (error) => {
      console.error('Error actualizando evento:', error);
      toast.error('❌ Error al actualizar evento');
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.titulo.trim()) {
      toast.error('El título es requerido');
      return;
    }
    if (!formData.fechaInicio) {
      toast.error('La fecha de inicio es requerida');
      return;
    }
    if (formData.fechaFin && formData.fechaFin < formData.fechaInicio) {
      toast.error('La fecha de fin debe ser posterior a la fecha de inicio');
      return;
    }

    const data = {
      titulo: formData.titulo.trim(),
      descripcion: formData.descripcion.trim() || null,
      fechaInicio: formData.fechaInicio,
      fechaFin: formData.fechaFin || null,
      tipo: formData.tipo,
      visiblePara: formData.visiblePara,
    };

    if (evento) {
      actualizarMutation.mutate({ id: evento.id, data });
    } else {
      crearMutation.mutate(data);
    }
  };

  const toggleRol = (rol) => {
    setFormData(prev => ({
      ...prev,
      visiblePara: prev.visiblePara.includes(rol)
        ? prev.visiblePara.filter(r => r !== rol)
        : [...prev.visiblePara, rol],
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {evento ? 'Editar Evento' : 'Crear Evento Importante'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="titulo">Título *</Label>
            <Input
              id="titulo"
              value={formData.titulo}
              onChange={(e) => setFormData(prev => ({ ...prev, titulo: e.target.value }))}
              className={componentStyles.controls.inputDefault}
              required
            />
          </div>

          <div>
            <Label htmlFor="descripcion">Descripción</Label>
            <Textarea
              id="descripcion"
              value={formData.descripcion}
              onChange={(e) => setFormData(prev => ({ ...prev, descripcion: e.target.value }))}
              className={componentStyles.controls.textareaDefault}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="fechaInicio">Fecha de Inicio *</Label>
              <Input
                id="fechaInicio"
                type="date"
                value={formData.fechaInicio}
                onChange={(e) => setFormData(prev => ({ ...prev, fechaInicio: e.target.value }))}
                className={componentStyles.controls.inputDefault}
                required
              />
            </div>
            <div>
              <Label htmlFor="fechaFin">Fecha de Fin (opcional)</Label>
              <Input
                id="fechaFin"
                type="date"
                value={formData.fechaFin}
                onChange={(e) => setFormData(prev => ({ ...prev, fechaFin: e.target.value }))}
                className={componentStyles.controls.inputDefault}
                min={formData.fechaInicio}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="tipo">Tipo de Evento</Label>
            <Select
              value={formData.tipo}
              onValueChange={(value) => setFormData(prev => ({ ...prev, tipo: value }))}
            >
              <SelectTrigger className={componentStyles.controls.selectDefault}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="encuentro">Encuentro</SelectItem>
                <SelectItem value="masterclass">Masterclass</SelectItem>
                <SelectItem value="colectiva">Colectiva</SelectItem>
                <SelectItem value="otro">Otro</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Visible para (roles)</Label>
            <div className="space-y-2 mt-2">
              {['ESTU', 'PROF', 'ADMIN'].map(rol => (
                <div key={rol} className="flex items-center space-x-2">
                  <Checkbox
                    id={`rol-${rol}`}
                    checked={formData.visiblePara.includes(rol)}
                    onCheckedChange={() => toggleRol(rol)}
                  />
                  <Label htmlFor={`rol-${rol}`} className="text-sm font-normal cursor-pointer">
                    {rol === 'ESTU' ? 'Estudiantes' : rol === 'PROF' ? 'Profesores' : 'Administradores'}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={crearMutation.isPending || actualizarMutation.isPending}
            >
              {evento ? 'Actualizar' : 'Crear'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

