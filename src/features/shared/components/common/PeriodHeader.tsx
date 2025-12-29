import React from "react";
import { Button } from "@/features/shared/components/ds/Button";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { componentStyles } from "@/design/componentStyles";
import { cn } from "@/lib/utils";

/**
 * PeriodHeader - Date navigation header with inline controls
 * Format: < {IconToday} {Label · Range} >
 * 
 * @param {Object} props
 * @param {string} props.label - Etiqueta principal (ej: "Semana 47")
 * @param {string} props.rangeText - Texto del rango (ej: "17–23 nov 2025")
 * @param {Function} props.onPrev - Handler para ir al período anterior
 * @param {Function} props.onNext - Handler para ir al período siguiente
 * @param {Function} props.onToday - Handler para ir al período actual
 * @param {string} props.className - Clases adicionales
 */
export default function PeriodHeader({
  label,
  rangeText,
  onPrev,
  onNext,
  onToday,
  className
}) {
  return (
    <div className={cn("flex items-center gap-1 sm:gap-2", className)}>
      <Button
        variant="ghost"
        size="icon"
        onClick={onPrev}
        className="h-8 w-8 sm:h-9 sm:w-9"
        aria-label="Anterior"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      <Button
        variant="outline"
        size="icon"
        onClick={onToday}
        className={cn(
          "h-8 w-8 sm:h-9 sm:w-9 hidden lg:flex",
          componentStyles.buttons.outline
        )}
        title="Ir a hoy"
        aria-label="Ir a hoy"
      >
        <Calendar className="h-4 w-4" />
      </Button>

      <span className="text-xs sm:text-sm font-medium mx-1 sm:mx-2 min-w-[120px] text-center whitespace-nowrap overflow-hidden text-ellipsis">
        {label}
        {rangeText && <span className="text-[var(--color-text-secondary)] ml-1">· {rangeText}</span>}
      </span>

      <Button
        variant="ghost"
        size="icon"
        onClick={onNext}
        className="h-8 w-8 sm:h-9 sm:w-9"
        aria-label="Siguiente"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}


