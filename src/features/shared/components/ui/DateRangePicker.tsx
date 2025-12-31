import React, { useState, useRef, useCallback, useEffect } from "react";
import { Calendar } from "@/features/shared/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/features/shared/components/ui/popover";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter, DrawerClose } from "@/features/shared/components/ui/drawer";
import { Button } from "@/features/shared/components/ui/button";
import { CalendarIcon, Check, X } from "lucide-react";
import { format, startOfWeek, startOfMonth, subDays, subMonths } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { DateRange } from "react-day-picker";

const formatDate = (date: Date | undefined): string => {
  if (!date) return '';
  return format(new Date(date), "d MMM yyyy", { locale: es });
};

const formatDateShort = (date: Date | undefined): string => {
  if (!date) return '';
  return format(new Date(date), "d MMM", { locale: es });
};

const dateToString = (date: Date | undefined): string => {
  if (!date) return '';
  return format(new Date(date), "yyyy-MM-dd");
};

function normalizeRange(start: Date | undefined, end: Date | undefined): { from: Date | undefined; to: Date | undefined } {
  if (!start || !end) return { from: start, to: end };
  if (start > end) return { from: end, to: start };
  return { from: start, to: end };
}

interface Preset {
  key: string;
  label: string;
}

const DEFAULT_PRESETS: Preset[] = [
  { key: 'esta-semana', label: 'Semana' },
  { key: '4-semanas', label: '4 sem' },
  { key: 'este-mes', label: 'Mes' },
  { key: '3-meses', label: '3 meses' },
  { key: 'todo', label: 'Todo' },
];

function getPresetDates(presetKey: string): { from: Date | undefined; to: Date | undefined } {
  const hoy = new Date();
  let inicio: Date;
  let fin: Date;

  switch (presetKey) {
    case 'esta-semana':
      inicio = startOfWeek(hoy, { weekStartsOn: 1 });
      fin = hoy;
      break;
    case '4-semanas':
      inicio = subDays(hoy, 28);
      fin = hoy;
      break;
    case 'este-mes':
      inicio = startOfMonth(hoy);
      fin = hoy;
      break;
    case '3-meses':
      inicio = subMonths(hoy, 3);
      fin = hoy;
      break;
    case 'todo':
      return { from: undefined, to: undefined };
    default:
      return { from: undefined, to: undefined };
  }

  return { from: inicio, to: fin };
}

interface DatePickerContentProps {
  presets: Preset[];
  activePreset: string | null;
  onPresetClick: (key: string) => void;
  dateRange: DateRange;
  onSelect: (range: DateRange | undefined) => void;
  onCancel: () => void;
  onApply: () => void;
  canApply: boolean;
  statusText: string;
  isDrawerMode: boolean;
  isSingleMonth: boolean;
}

/**
 * Contenido compartido del picker (presets + calendario + footer)
 */
function DatePickerContent({
  presets,
  activePreset,
  onPresetClick,
  dateRange,
  onSelect,
  onCancel,
  onApply,
  canApply,
  statusText,
  isDrawerMode,
  isSingleMonth
}: DatePickerContentProps) {
  return (
    <div className="flex flex-col h-full">
      {/* Presets - solo horizontal en modo Drawer (Mobile/Tablet) */}
      {isDrawerMode && presets.length > 0 && (
        <div className="border-b border-[var(--color-border-default)] p-2 flex flex-wrap gap-1.5 shrink-0 bg-[var(--color-surface-card)]">
          {presets.map((preset) => (
            <button
              key={preset.key}
              onClick={() => onPresetClick(preset.key)}
              className={cn(
                "px-3 py-2 text-sm rounded-md transition-colors flex-1 min-w-[60px] text-center",
                activePreset === preset.key
                  ? "bg-[var(--color-primary)] text-white"
                  : "bg-[var(--color-surface-muted)] hover:bg-[var(--color-surface-alt)] text-[var(--color-text-primary)]"
              )}
            >
              {preset.label}
            </button>
          ))}
        </div>
      )}

      {/* Área del calendario con scroll */}
      <div className={cn(
        "flex-1 overflow-y-auto min-h-0", // Asegurar que el scroll funcione
        isDrawerMode ? "px-2 pb-2 bg-[var(--color-surface-card)]" : ""
      )}>
        <div className={cn(
          isDrawerMode ? "flex justify-center" : "flex"
        )}>
          {/* Desktop/Popover: sidebar de presets */}
          {!isDrawerMode && presets.length > 0 && (
            <div className="border-r border-[var(--color-border-default)] p-2 flex flex-col gap-1 min-w-[100px]">
              {presets.map((preset) => (
                <button
                  key={preset.key}
                  onClick={() => onPresetClick(preset.key)}
                  className={cn(
                    "px-3 py-2 text-sm rounded-md text-left transition-colors",
                    activePreset === preset.key
                      ? "bg-[var(--color-primary)] text-white"
                      : "hover:bg-[var(--color-surface-muted)] text-[var(--color-text-primary)]"
                  )}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          )}

          {/* Calendario */}
          <div className={cn(
            "flex justify-center",
            isDrawerMode ? "py-4 w-full" : ""
          )}>
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={dateRange?.from || new Date()}
              selected={dateRange}
              onSelect={onSelect}
              numberOfMonths={isSingleMonth ? 1 : 2}
              locale={es}
              weekStartsOn={1}
              className={isSingleMonth && isDrawerMode ? "w-full flex justify-center scale-100 origin-top mt-2" : "w-auto"}
            />
          </div>
        </div>
      </div>

      {/* Footer fijo - SIEMPRE VISIBLE */}
      <div className="flex justify-between items-center p-3 border-t border-[var(--color-border-default)] bg-[var(--color-surface-muted)] shrink-0 mt-auto">
        <div className="text-xs text-[var(--color-text-secondary)] font-medium">
          {dateRange.from && dateRange.to ? (
            `${formatDateShort(dateRange.from)} - ${formatDateShort(dateRange.to)}`
          ) : dateRange.from ? (
            `${formatDateShort(dateRange.from)} - ...`
          ) : (
            'Sin selección'
          )}
        </div>
        <div className="flex gap-2">
          {/* En modo Drawer usamos DrawerClose para cancelar */}
          {isDrawerMode ? (
            <DrawerClose asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={onCancel}
                className="h-9"
              >
                <X className="w-4 h-4 mr-1" />
                Cancelar
              </Button>
            </DrawerClose>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={onCancel}
              className="h-9"
            >
              <X className="w-4 h-4 mr-1" />
              Cancelar
            </Button>
          )}

          <Button
            variant="default"
            size="sm"
            onClick={onApply}
            disabled={!canApply}
            className="h-9"
          >
            <Check className="w-4 h-4 mr-1" />
            Aplicar
          </Button>
        </div>
      </div>
    </div>
  );
}

interface DateRangePickerProps {
  startDate?: string;
  endDate?: string;
  onDateChange?: (startDate: string, endDate: string) => void;
  presets?: Preset[];
  className?: string;
}

/**
 * DateRangePicker - Popover en desktop, Drawer en mobile/tablet
 */
export default function DateRangePicker({
  startDate,
  endDate,
  onDateChange,
  presets = DEFAULT_PRESETS,
  className = ""
}: DateRangePickerProps) {
  const [open, setOpen] = useState(false);

  // Responsive State: <1024 para Drawer, >=1024 Popover
  const [isDrawerMode, setIsDrawerMode] = useState(false);
  // Responsive State: <450 para 1 mes
  const [isSingleMonth, setIsSingleMonth] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      setIsDrawerMode(width < 1024);
      // Actualizamos a 640px (sm) para alinear con el estilo del Calendar (flex-col sm:flex-row).
      // Si el ancho es < 640px, el calendario se ve en una columna (vertical), por lo que forzamos 1 solo mes.
      setIsSingleMonth(width < 640);
    };

    handleResize(); // Initial check
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // MÁQUINA DE ESTADOS
  const [phase, setPhase] = useState<"start" | "end">("start");
  const phaseRef = useRef<"start" | "end">("start");

  const start = startDate ? new Date(startDate + 'T00:00:00') : undefined;
  const end = endDate ? new Date(endDate + 'T00:00:00') : undefined;

  const [dateRange, setDateRange] = useState<DateRange>({
    from: start,
    to: end,
  });

  const [activePreset, setActivePreset] = useState<string | null>(null);

  // Sincronizar con props
  useEffect(() => {
    const newStart = startDate ? new Date(startDate + 'T00:00:00') : undefined;
    const newEnd = endDate ? new Date(endDate + 'T00:00:00') : undefined;
    if (!open) {
      setDateRange({ from: newStart, to: newEnd });
      if (newStart && newEnd) {
        setPhase("start");
        phaseRef.current = "start";
      } else if (newStart && !newEnd) {
        setPhase("end");
        phaseRef.current = "end";
      } else {
        setPhase("start");
        phaseRef.current = "start";
      }
    }
  }, [startDate, endDate, open]);

  // Keyboard
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleCancel();
      } else if (e.key === 'Enter' && dateRange.from && dateRange.to) {
        e.preventDefault();
        handleApply();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, dateRange]);

  const handleSelect = useCallback((range: DateRange | undefined) => {
    const clickedDate = range?.from !== dateRange.from ? range?.from : range?.to;
    if (!clickedDate) return;

    setActivePreset(null);
    const currentPhase = phaseRef.current;
    const currentStart = dateRange.from;
    const currentEnd = dateRange.to;

    // Si ambos seteados, reiniciar
    if (currentStart && currentEnd) {
      setDateRange({ from: clickedDate, to: undefined });
      setPhase("end");
      phaseRef.current = "end";
      return;
    }

    if (currentPhase === "start") {
      setDateRange({ from: clickedDate, to: undefined });
      setPhase("end");
      phaseRef.current = "end";
    } else {
      if (currentStart && clickedDate < currentStart) {
        setDateRange({ from: clickedDate, to: undefined });
      } else {
        const normalized = normalizeRange(currentStart, clickedDate);
        setDateRange(normalized);
        setPhase("start");
        phaseRef.current = "start";
      }
    }
  }, [dateRange]);

  const handlePresetClick = (presetKey: string) => {
    const { from, to } = getPresetDates(presetKey);
    setDateRange({ from, to });
    setActivePreset(presetKey);
    setPhase("start");
    phaseRef.current = "start";

    if (presetKey === 'todo') {
      onDateChange?.('', '');
      setOpen(false);
    }
  };

  const handleApply = () => {
    if (dateRange.from && dateRange.to) {
      onDateChange?.(dateToString(dateRange.from), dateToString(dateRange.to));
      setOpen(false);
    } else if (!dateRange.from && !dateRange.to) {
      onDateChange?.('', '');
      setOpen(false);
    }
  };

  const handleCancel = () => {
    const newStart = startDate ? new Date(startDate + 'T00:00:00') : undefined;
    const newEnd = endDate ? new Date(endDate + 'T00:00:00') : undefined;
    setDateRange({ from: newStart, to: newEnd });
    setPhase("start");
    phaseRef.current = "start";
    setActivePreset(null);
    setOpen(false);
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      const newStart = startDate ? new Date(startDate + 'T00:00:00') : undefined;
      const newEnd = endDate ? new Date(endDate + 'T00:00:00') : undefined;
      setDateRange({ from: newStart, to: newEnd });
      setPhase("start");
      phaseRef.current = "start";
      setActivePreset(null);
    }
  };

  const displayText = (): string => {
    if (startDate && endDate) {
      const s = new Date(startDate + 'T00:00:00');
      const e = new Date(endDate + 'T00:00:00');
      return `${formatDateShort(s)} - ${formatDate(e)}`;
    }
    if (startDate) {
      return `${formatDate(new Date(startDate + 'T00:00:00'))} - ...`;
    }
    return "Seleccionar rango";
  };

  const getStatusText = (): string => {
    if (phase === "start" && !dateRange?.from) return "Selecciona inicio";
    if (phase === "end" || (dateRange?.from && !dateRange?.to)) return "Selecciona final";
    if (dateRange?.from && dateRange?.to) return "Rango seleccionado";
    return "Selecciona inicio";
  };

  const canApply = (dateRange.from && dateRange.to) || (!dateRange.from && !dateRange.to);

  // Trigger button común
  const TriggerButton = (
    <Button
      variant="outline"
      className={cn(
        "h-10 justify-start text-left font-normal rounded-xl border-[var(--color-border-default)] focus-brand text-sm w-auto min-w-[180px]",
        !startDate && !endDate && "text-muted-foreground",
        className
      )}
      onClick={() => isDrawerMode && setOpen(true)}
    >
      <CalendarIcon className="mr-2 h-4 w-4" />
      {displayText()}
    </Button>
  );

  // DRAWER (Mobile + Tablet)
  if (isDrawerMode) {
    return (
      <>
        {TriggerButton}
        <Drawer open={open} onOpenChange={handleOpenChange}>
          <DrawerContent className={cn(
            "flex flex-col rounded-t-xl bg-[var(--color-surface-card)]",
            // Altura y display
            "max-h-[95vh] h-auto",
            // Para permitir 2 meses en tablet, necesitamos ancho. Drawer por defecto es full width.
          )}>
            {/* Header fijo */}
            <div className="p-4 border-b border-[var(--color-border-default)] bg-[var(--color-surface-elevated)] shrink-0">
              <div className="flex items-center justify-between">
                <DrawerTitle className="text-base font-semibold">
                  {getStatusText()}
                </DrawerTitle>
                <DrawerClose asChild>
                  <button
                    onClick={handleCancel}
                    className="p-2 rounded-full hover:bg-[var(--color-surface-muted)] transition-colors"
                    aria-label="Cerrar"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </DrawerClose>
              </div>
              <DrawerDescription className="sr-only">
                Selector de rango de fechas
              </DrawerDescription>
            </div>

            {/* Contenido con scroll */}
            <DatePickerContent
              presets={presets}
              activePreset={activePreset}
              onPresetClick={handlePresetClick}
              dateRange={dateRange}
              onSelect={handleSelect}
              onCancel={handleCancel}
              onApply={handleApply}
              canApply={!!canApply}
              statusText={getStatusText()}
              isDrawerMode={true}
              isSingleMonth={isSingleMonth}
            />
          </DrawerContent>
        </Drawer>
      </>
    );
  }

  // DESKTOP: Popover
  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        {TriggerButton}
      </PopoverTrigger>
      <PopoverContent
        className="w-auto p-0 max-w-[min(720px,calc(100vw-2rem))] max-h-[70vh] overflow-auto"
        align="end"
        sideOffset={4}
        collisionPadding={16}
        avoidCollisions={true}
      >
        {/* Header */}
        <div className="p-3 border-b text-center font-medium text-sm bg-[var(--color-surface-muted)] sticky top-0 z-10">
          {getStatusText()}
        </div>

        <DatePickerContent
          presets={presets}
          activePreset={activePreset}
          onPresetClick={handlePresetClick}
          dateRange={dateRange}
          onSelect={handleSelect}
          onCancel={handleCancel}
          onApply={handleApply}
          canApply={!!canApply}
          statusText={getStatusText()}
          isSingleMonth={false} // Desktop siempre 2 meses
          isDrawerMode={false} // Desktop usa popover
        />
      </PopoverContent>
    </Popover>
  );
}
