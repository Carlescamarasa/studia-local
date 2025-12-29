import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/features/shared/components/ui/dialog";
import { Button } from "@/features/shared/components/ds/Button";
import { Input } from "@/features/shared/components/ui/input";
import { Textarea } from "@/features/shared/components/ui/textarea";
import { Label } from "@/features/shared/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/features/shared/components/ui/select";
import { Checkbox } from "@/features/shared/components/ui/checkbox";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { localDataClient } from "@/api/localDataClient";
import { toast } from "sonner";
import { componentStyles } from "@/design/componentStyles";
import { generateId } from "@/data/localStorageClient";

interface EventoData {
  id: string;
  titulo?: string;
  descripcion?: string;
  fechaInicio?: string;
  fechaFin?: string;
  start_at?: string;
  end_at?: string;
  all_day?: boolean;
  tipo?: 'encuentro' | 'masterclass' | 'colectiva' | 'otro';
  visiblePara?: string[];
  [key: string]: unknown;
}

interface ModalCrearEventoProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  evento?: EventoData | null;
  userIdActual: string;
}

const pad2 = (n: number): string => String(n).padStart(2, "0");
const formatLocalDate = (d: Date): string => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const formatLocalTime = (d: Date): string => `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;

// Helper para convertir fecha + hora a ISO timestamp
const buildISO = (dateStr: string, timeStr: string | null = null): string | null => {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  if (timeStr) {
    const [hours, minutes] = timeStr.split(':').map(Number);
    date.setHours(hours || 0, minutes || 0, 0, 0);
  } else {
    date.setHours(0, 0, 0, 0);
  }
  return date.toISOString();
};

// Helper para extraer fecha y hora de un ISO timestamp
const parseISO = (isoStr: string | undefined): { date: string; time: string } => {
  if (!isoStr) return { date: '', time: '' };
  const date = new Date(isoStr);
  return {
    date: formatLocalDate(date),
    time: formatLocalTime(date),
  };
};

export default function ModalCrearEvento({ open, onOpenChange, evento, userIdActual }: ModalCrearEventoProps) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    titulo: '',
    descripcion: '',
    fechaInicio: formatLocalDate(new Date()),
    fechaFin: '',
    horaInicio: '18:00',
    horaFin: '19:00',
    all_day: false,
    tipo: 'otro',
    visiblePara: ['ESTU', 'PROF', 'ADMIN'],
  });

  useEffect(() => {
    if (evento) {
      // Si tiene start_at, usar eso; si no, usar fechaInicio legacy
      const inicioData = evento.start_at ? parseISO(evento.start_at) : {
        date: evento.fechaInicio || formatLocalDate(new Date()),
        time: '18:00',
      };
      const finData = evento.end_at ? parseISO(evento.end_at) : {
        date: evento.fechaFin || '',
        time: '19:00',
      };

      setFormData({
        titulo: evento.titulo || '',
        descripcion: evento.descripcion || '',
        fechaInicio: inicioData.date,
        fechaFin: finData.date,
        horaInicio: inicioData.time,
        horaFin: finData.time,
        all_day: evento.all_day === true,
        tipo: evento.tipo || 'otro',
        visiblePara: evento.visiblePara || ['ESTU', 'PROF', 'ADMIN'],
      });
    } else {
      const ahora = new Date();
      const horaInicio = formatLocalTime(ahora);
      const horaFin = formatLocalTime(new Date(ahora.getTime() + 60 * 60 * 1000)); // +1h

      setFormData({
        titulo: '',
        descripcion: '',
        fechaInicio: formatLocalDate(ahora),
        fechaFin: '',
        horaInicio,
        horaFin,
        all_day: false,
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
      queryClient.invalidateQueries({ queryKey: ['calendarSummary'] });
      // Eventualmente esto podría afectar progreso si añadimos participación en eventos
      // queryClient.invalidateQueries({ queryKey: ['progressSummary'] });
      toast.success('✅ Evento creado exitosamente');
      onOpenChange(false);
    },
    onError: (error) => {
      console.error('Error creando evento:', error);
      console.error('Detalles del error:', {
        message: error?.message,
        code: error?.code,
        details: error?.details,
        hint: error?.hint,
        userIdActual,
        eventoData: {
          id: eventoData?.id,
          creadoPorId: eventoData?.creadoPorId,
          titulo: eventoData?.titulo,
        },
      });
      toast.error(`❌ Error al crear evento: ${error?.message || 'Error desconocido'}`);
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
      queryClient.invalidateQueries({ queryKey: ['calendarSummary'] });
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

    // Construir start_at y end_at según all_day
    let start_at = null;
    let end_at = null;

    if (formData.all_day) {
      // Todo el día: start_at a las 00:00, end_at al final del día o null
      start_at = buildISO(formData.fechaInicio, '00:00');
      if (formData.fechaFin) {
        const finDate = new Date(formData.fechaFin);
        finDate.setHours(23, 59, 59, 999);
        end_at = finDate.toISOString();
      } else {
        // Si no hay fecha fin, el evento dura todo el día de inicio
        const inicioDate = new Date(formData.fechaInicio);
        inicioDate.setHours(23, 59, 59, 999);
        end_at = inicioDate.toISOString();
      }
    } else {
      // Con horario específico
      start_at = buildISO(formData.fechaInicio, formData.horaInicio);
      if (formData.fechaFin) {
        end_at = buildISO(formData.fechaFin, formData.horaFin);
      } else {
        // Si no hay fecha fin, usar misma fecha con hora fin
        end_at = buildISO(formData.fechaInicio, formData.horaFin);
      }

      // Validar que end_at sea posterior a start_at
      if (end_at && start_at && new Date(end_at) <= new Date(start_at)) {
        toast.error('La hora de fin debe ser posterior a la hora de inicio');
        return;
      }
    }

    const data = {
      titulo: formData.titulo.trim(),
      descripcion: formData.descripcion.trim() || null,
      fechaInicio: formData.fechaInicio, // Mantener para compatibilidad
      fechaFin: formData.fechaFin || null, // Mantener para compatibilidad
      start_at,
      end_at,
      all_day: formData.all_day,
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
          <DialogDescription>
            {evento ? 'Edita los detalles del evento del calendario' : 'Crea un nuevo evento importante (masterclass, audición, etc.) para que aparezca en el calendario'}
          </DialogDescription>
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

          {/* Toggle Todo el día */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="all_day"
              checked={formData.all_day}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, all_day: checked === true }))}
            />
            <Label htmlFor="all_day" className="text-sm font-normal cursor-pointer">
              Todo el día
            </Label>
          </div>

          {/* Fechas */}
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

          {/* Horarios (solo si no es todo el día) */}
          {!formData.all_day && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="horaInicio">Hora de Inicio *</Label>
                <Input
                  id="horaInicio"
                  type="time"
                  value={formData.horaInicio}
                  onChange={(e) => setFormData(prev => ({ ...prev, horaInicio: e.target.value }))}
                  className={componentStyles.controls.inputDefault}
                  required
                />
              </div>
              <div>
                <Label htmlFor="horaFin">Hora de Fin *</Label>
                <Input
                  id="horaFin"
                  type="time"
                  value={formData.horaFin}
                  onChange={(e) => setFormData(prev => ({ ...prev, horaFin: e.target.value }))}
                  className={componentStyles.controls.inputDefault}
                  required
                />
              </div>
            </div>
          )}

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

