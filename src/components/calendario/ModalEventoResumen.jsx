import React from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { CalendarDays, Clock, Tag } from "lucide-react";

/**
 * Modal de solo lectura para ver detalles de un evento del calendario.
 * Usado por ESTU (estudiantes) que no pueden editar eventos.
 */
export default function ModalEventoResumen({
    open,
    onOpenChange,
    evento,
}) {
    if (!evento) return null;

    // Formatear fecha
    const formatFecha = (dateStr) => {
        if (!dateStr) return '—';
        const date = new Date(dateStr);
        return date.toLocaleDateString('es-ES', {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
    };

    // Formatear hora
    const formatHora = (dateStr) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        return date.toLocaleTimeString('es-ES', {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    // Tipos de evento (del selector: encuentro, masterclass, colectiva, otro)
    const tipoLabels = {
        encuentro: 'Encuentro',
        masterclass: 'Masterclass',
        colectiva: 'Colectiva',
        otro: 'Otro',
    };

    // Construir string de hora (inicio – fin)
    const horaDisplay = () => {
        if (evento.todoElDia) return 'Todo el día';
        const inicio = formatHora(evento.fechaInicio);
        const fin = formatHora(evento.fechaFin);
        if (!inicio) return '—';
        if (!fin || fin === inicio) return inicio;
        return `${inicio} – ${fin}`;
    };

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
                    {/* Título y descripción */}
                    <div className="pb-2 border-b border-[var(--color-border-default)]">
                        <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">
                            {evento.titulo || 'Sin título'}
                        </h3>
                        {evento.descripcion && (
                            <p className="text-[var(--color-text-secondary)] mt-1">
                                {evento.descripcion}
                            </p>
                        )}
                    </div>

                    {/* Información en grid */}
                    <div className="grid grid-cols-2 gap-2">
                        {/* Fecha inicio */}
                        <div className="flex items-center gap-1.5">
                            <CalendarDays className="w-3.5 h-3.5 text-[var(--color-text-secondary)] shrink-0" />
                            <span className="text-xs text-[var(--color-text-secondary)]">Inicio:</span>
                            <span className="font-medium">{formatFecha(evento.fechaInicio)}</span>
                        </div>

                        {/* Hora (inicio – fin) */}
                        <div className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-[var(--color-text-secondary)] shrink-0" />
                            <span className="text-xs text-[var(--color-text-secondary)]">Hora:</span>
                            <span className="font-medium">{horaDisplay()}</span>
                        </div>

                        {/* Tipo de evento (texto simple, no badge) */}
                        <div className="flex items-center gap-1.5 col-span-2">
                            <Tag className="w-3.5 h-3.5 text-[var(--color-text-secondary)] shrink-0" />
                            <span className="text-xs text-[var(--color-text-secondary)]">Tipo:</span>
                            <span className="font-medium">
                                {tipoLabels[evento.tipoEvento] || evento.tipoEvento || 'Evento'}
                            </span>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
