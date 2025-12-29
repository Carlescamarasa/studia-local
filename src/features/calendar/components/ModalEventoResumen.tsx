import React from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/features/shared/components/ui/dialog";
import { CalendarDays, Clock } from "lucide-react";

interface EventoData {
    id: string;
    titulo?: string;
    descripcion?: string;
    tipo?: 'encuentro' | 'masterclass' | 'colectiva' | 'otro';
    tipoEvento?: string;
    all_day?: boolean;
    todoElDia?: boolean;
    start_at?: string;
    end_at?: string;
    fechaInicio?: string;
    fechaFin?: string;
    [key: string]: unknown;
}

interface ModalEventoResumenProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    evento: EventoData | null;
}

/**
 * Modal de solo lectura para ver detalles de un evento del calendario.
 * Usado por ESTU (estudiantes) que no pueden editar eventos.
 */
export default function ModalEventoResumen({
    open,
    onOpenChange,
    evento,
}: ModalEventoResumenProps) {
    if (!evento) return null;

    // Formatear fecha
    const formatFecha = (dateStr: string | undefined): string => {
        if (!dateStr) return '—';
        const date = new Date(dateStr);
        return date.toLocaleDateString('es-ES', {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
    };

    // Formatear hora con formato "02:40h" (sin ceros iniciales en hora)
    const formatHoraCompact = (dateStr: string | undefined): string => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        const h = date.getHours();
        const m = String(date.getMinutes()).padStart(2, '0');
        return `${h}:${m}`;
    };

    // Tipos de evento
    const tipoLabels: Record<string, string> = {
        encuentro: 'Encuentro',
        masterclass: 'Masterclass',
        colectiva: 'Colectiva',
        otro: 'Otro',
    };

    // Construir string de hora (inicio–finh)
    const horaDisplay = (): string => {
        if (evento.all_day || evento.todoElDia) return 'Todo el día';
        const inicioStr = evento.start_at || evento.fechaInicio;
        const finStr = evento.end_at || evento.fechaFin;
        const inicio = formatHoraCompact(inicioStr);
        const fin = formatHoraCompact(finStr);
        if (!inicio) return '—';
        if (!fin || fin === inicio) return `${inicio}h`;
        return `${inicio}–${fin}h`;
    };

    const tipoValue = evento.tipo || evento.tipoEvento || '';

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto p-4">
                <DialogHeader className="pb-2">
                    <DialogTitle className="text-base flex items-center gap-2">
                        <CalendarDays className="w-4 h-4 text-[var(--color-primary)]" />
                        Detalles del Evento
                    </DialogTitle>
                    <DialogDescription className="sr-only">
                        Información detallada del evento
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-3 text-sm">
                    <div className="pb-2 border-b border-[var(--color-border-default)]">
                        <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">
                            <span className="text-[var(--color-text-secondary)]">
                                {tipoLabels[tipoValue] || tipoValue || 'Evento'}:
                            </span>{' '}
                            {evento.titulo || 'Sin título'}
                        </h3>
                        {evento.descripcion && (
                            <p className="text-[var(--color-text-secondary)] mt-1">
                                {evento.descripcion}
                            </p>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                        <div className="flex items-center gap-1.5">
                            <CalendarDays className="w-3.5 h-3.5 text-[var(--color-text-secondary)] shrink-0" />
                            <span className="text-xs text-[var(--color-text-secondary)]">Inicio:</span>
                            <span className="font-medium">{formatFecha(evento.start_at || evento.fechaInicio)}</span>
                        </div>

                        <div className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-[var(--color-text-secondary)] shrink-0" />
                            <span className="text-xs text-[var(--color-text-secondary)]">Hora:</span>
                            <span className="font-medium">{horaDisplay()}</span>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
