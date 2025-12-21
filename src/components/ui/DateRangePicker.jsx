import React, { useState, useRef, useCallback, useEffect } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { CalendarIcon, Check, X } from "lucide-react";
import { format, startOfWeek, startOfMonth, subDays, subMonths } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

const formatDate = (date) => {
  if (!date) return '';
  return format(new Date(date), "d MMM yyyy", { locale: es });
};

const formatDateShort = (date) => {
  if (!date) return '';
  return format(new Date(date), "d MMM", { locale: es });
};

const dateToString = (date) => {
  if (!date) return '';
  return format(new Date(date), "yyyy-MM-dd");
};

function normalizeRange(start, end) {
  if (!start || !end) return { from: start, to: end };
  if (start > end) return { from: end, to: start };
  return { from: start, to: end };
}

const DEFAULT_PRESETS = [
  { key: 'esta-semana', label: 'Semana' },
  { key: '4-semanas', label: '4 sem' },
  { key: 'este-mes', label: 'Mes' },
  { key: '3-meses', label: '3 meses' },
  { key: 'todo', label: 'Todo' },
];

function getPresetDates(presetKey) {
  const hoy = new Date();
  let inicio, fin;

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
  isMobile
}) {
  return (
    <div className="flex flex-col h-full">
      {/* Presets - solo horizontal en mobile (desktop usa el sidebar) */}
      {isMobile && presets.length > 0 && (
        <div className="border-b border-[var(--color-border-default)] p-2 flex flex-wrap gap-1.5">
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
        "flex-1 overflow-auto",
        isMobile ? "px-2 pb-2" : ""
      )}>
        <div className={cn(
          isMobile ? "" : "flex"
        )}>
          {/* Desktop: sidebar de presets */}
          {!isMobile && presets.length > 0 && (
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
            isMobile ? "py-4" : ""
          )}>
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={dateRange?.from || new Date()}
              selected={dateRange}
              onSelect={onSelect}
              numberOfMonths={isMobile ? 1 : 2}
              locale={es}
              weekStartsOn={1}
            />
          </div>
        </div>
      </div>

      {/* Footer fijo */}
      <div className="flex justify-between items-center p-3 border-t border-[var(--color-border-default)] bg-[var(--color-surface-muted)] shrink-0">
        <div className="text-xs text-[var(--color-text-secondary)]">
          {dateRange.from && dateRange.to ? (
            `${formatDateShort(dateRange.from)} - ${formatDateShort(dateRange.to)}`
          ) : dateRange.from ? (
            `${formatDateShort(dateRange.from)} - ...`
          ) : (
            'Sin selección'
          )}
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onCancel}
            className="h-9"
          >
            <X className="w-4 h-4 mr-1" />
            Cancelar
          </Button>
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

/**
 * DateRangePicker - Popover en desktop, Sheet fullscreen en mobile
 */
export default function DateRangePicker({
  startDate,
  endDate,
  onDateChange,
  presets = DEFAULT_PRESETS,
  className = ""
}) {
  const [open, setOpen] = useState(false);
  const isMobile = useIsMobile();

  // MÁQUINA DE ESTADOS
  const [phase, setPhase] = useState("start");
  const phaseRef = useRef("start");

  const start = startDate ? new Date(startDate + 'T00:00:00') : undefined;
  const end = endDate ? new Date(endDate + 'T00:00:00') : undefined;

  const [dateRange, setDateRange] = useState({
    from: start,
    to: end,
  });

  const [activePreset, setActivePreset] = useState(null);

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
    const handleKeyDown = (e) => {
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

  const handleSelect = useCallback((range) => {
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

  const handlePresetClick = (presetKey) => {
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

  const handleOpenChange = (isOpen) => {
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

  const displayText = () => {
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

  const getStatusText = () => {
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
      onClick={() => isMobile && setOpen(true)}
    >
      <CalendarIcon className="mr-2 h-4 w-4" />
      {displayText()}
    </Button>
  );

  // MOBILE: Sheet fullscreen
  if (isMobile) {
    return (
      <>
        {TriggerButton}
        <Sheet open={open} onOpenChange={handleOpenChange}>
          <SheetContent
            side="bottom"
            className="h-[90vh] max-h-[90vh] p-0 flex flex-col rounded-t-xl"
          >
            {/* Header fijo */}
            <div className="p-4 border-b border-[var(--color-border-default)] bg-[var(--color-surface)] shrink-0">
              <div className="flex items-center justify-between">
                <SheetTitle className="text-base font-semibold">
                  {getStatusText()}
                </SheetTitle>
                <button
                  onClick={handleCancel}
                  className="p-2 rounded-full hover:bg-[var(--color-surface-muted)] transition-colors"
                  aria-label="Cerrar"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <SheetDescription className="sr-only">
                Selector de rango de fechas
              </SheetDescription>
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
              canApply={canApply}
              statusText={getStatusText()}
              isMobile={true}
            />
          </SheetContent>
        </Sheet>
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
          canApply={canApply}
          statusText={getStatusText()}
          isMobile={false}
        />
      </PopoverContent>
    </Popover>
  );
}

