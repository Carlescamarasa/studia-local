import React from "react";
import { Button } from "@/components/ds/Button";
import { ChevronDown, ChevronUp } from "lucide-react";
import DateRangePicker from "@/components/ui/DateRangePicker";
import { cn } from "@/lib/utils";

/**
 * StatsDateHeader
 * Controles para el header de estadísticas: Selector de rango + Texto + Chevron.
 * Se usa dentro de PageHeader.actions.
 * 
 * @param {Object} props
 * @param {string|Date} props.startDate - Fecha de inicio
 * @param {string|Date} props.endDate - Fecha de fin
 * @param {Function} props.onDateChange - Handler de cambio de fechas ({from, to})
 * @param {boolean} props.isOpen - Estado del panel de filtros
 * @param {Function} props.onToggle - Handler para toggle del panel
 * @param {string} props.className - Clases adicionales
 */
export default function StatsDateHeader({
  startDate,
  endDate,
  onDateChange,
  isOpen,
  onToggle,
  className
}) {
  const handleDateChange = (startStr, endStr) => {
    if (onDateChange) {
      onDateChange({ from: startStr, to: endStr });
    }
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <DateRangePicker
        startDate={startDate}
        endDate={endDate}
        onDateChange={handleDateChange}
        className="w-auto"
      />

      <Button
        variant="ghost"
        size="icon"
        onClick={onToggle}
        className="h-9 w-9 border border-input bg-background hover:bg-accent text-muted-foreground"
        aria-label={isOpen ? "Ocultar filtros" : "Mostrar filtros"}
        aria-expanded={isOpen}
      >
        {isOpen ? (
          <ChevronUp className="h-4 w-4" />
        ) : (
          <ChevronDown className="h-4 w-4" />
        )}
      </Button>
    </div>
  );
}
