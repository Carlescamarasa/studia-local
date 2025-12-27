import React from "react";
import DateRangePicker from "@/components/ui/DateRangePicker";
import { cn } from "@/lib/utils";

/**
 * StatsDateHeader
 * Controles para el header de estadísticas: Selector de rango de fechas.
 * Se usa dentro de PageHeader.actions.
 * Elimina el toggle de presets ya que están integrados en el DatePicker.
 * 
 * @param {Object} props
 * @param {string|Date} props.startDate - Fecha de inicio
 * @param {string|Date} props.endDate - Fecha de fin
 * @param {Function} props.onDateChange - Handler de cambio de fechas ({from, to})
 * @param {string} props.className - Clases adicionales
 */
export default function StatsDateHeader({
  startDate,
  endDate,
  onDateChange,
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
    </div>
  );
}
