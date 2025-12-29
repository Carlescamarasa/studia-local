import React from "react";
import { Button } from "@/features/shared/components/ds/Button";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { componentStyles } from "@/design/componentStyles";
import { cn } from "@/lib/utils";

interface PeriodHeaderProps {
  label: string;
  rangeText: string;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  className?: string; // Optional
}

export default function PeriodHeader({
  label,
  rangeText,
  onPrev,
  onNext,
  onToday,
  className = ""
}: PeriodHeaderProps) {
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


