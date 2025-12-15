import React, { useState, useRef } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";

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

export default function DateRangePicker({
  startDate,
  endDate,
  onDateChange,
  className = ""
}) {
  const [open, setOpen] = useState(false);

  // Estado explicito: ¿estamos en medio de seleccionar un rango (esperando el 2do click)?
  const [isSelectingRange, setIsSelectingRange] = useState(false);
  const isSelectingRangeRef = useRef(false);

  // Convertir strings a Date objects
  const start = startDate ? new Date(startDate + 'T00:00:00') : undefined;
  const end = endDate ? new Date(endDate + 'T00:00:00') : undefined;

  const [dateRange, setDateRange] = useState({
    from: start,
    to: end,
  });

  // Efecto para sincronizar con props externas
  React.useEffect(() => {
    const newStart = startDate ? new Date(startDate + 'T00:00:00') : undefined;
    const newEnd = endDate ? new Date(endDate + 'T00:00:00') : undefined;
    // Solo actualizar si el popover está cerrado para evitar sobreescribir selección en curso
    if (!open) {
      setDateRange({ from: newStart, to: newEnd });
      setIsSelectingRange(false);
      isSelectingRangeRef.current = false;
    }
  }, [startDate, endDate, open]);

  const handleSelect = (range) => {

    if (!isSelectingRangeRef.current) {
      // PRIMER CLICK: Empezamos nueva selección
      // Forzamos el rango a solo tener 'from', sin importar lo que devuelva react-day-picker
      const newRange = { from: range?.from || range?.to, to: undefined };
      setDateRange(newRange);

      setIsSelectingRange(true);
      isSelectingRangeRef.current = true;
      // NO cerramos el popover
    } else {
      // SEGUNDO CLICK: Completamos la selección
      // Usamos el 'from' que guardamos y el nuevo 'to'
      const finalFrom = dateRange.from;
      const finalTo = range?.to || range?.from;

      // Asegurarnos de que from <= to (ordenar si es necesario)
      let orderedFrom = finalFrom;
      let orderedTo = finalTo;
      if (finalFrom && finalTo && finalFrom > finalTo) {
        orderedFrom = finalTo;
        orderedTo = finalFrom;
      }

      const newRange = { from: orderedFrom, to: orderedTo };
      setDateRange(newRange);

      setIsSelectingRange(false);
      isSelectingRangeRef.current = false;

      // Ahora sí cerramos y notificamos
      if (orderedFrom && orderedTo) {
        const fromStr = dateToString(orderedFrom);
        const toStr = dateToString(orderedTo);
        onDateChange?.(fromStr, toStr);
        setOpen(false);
      }
    }
  };

  const handleOpenChange = (isOpen) => {
    // Si intenta cerrar y estamos en medio de selección, BLOQUEAR
    if (!isOpen && isSelectingRangeRef.current) {
      return;
    }


    setOpen(isOpen);

    // Si cerramos, resetear estados
    if (!isOpen) {
      const newStart = startDate ? new Date(startDate + 'T00:00:00') : undefined;
      const newEnd = endDate ? new Date(endDate + 'T00:00:00') : undefined;
      setDateRange({ from: newStart, to: newEnd });
      setIsSelectingRange(false);
      isSelectingRangeRef.current = false;
    }
  };

  const displayText = () => {
    if (dateRange?.from && dateRange?.to) {
      return `${formatDateShort(dateRange.from)} - ${formatDate(dateRange.to)}`;
    }
    if (dateRange?.from) {
      return `${formatDate(dateRange.from)} - ...`;
    }
    return "Seleccionar rango";
  };

  const getStatusText = () => {
    if (!isSelectingRange && !dateRange?.from) return "Selecciona inicio";
    if (isSelectingRange || (dateRange?.from && !dateRange?.to)) return "Selecciona final";
    return "Rango listo";
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "h-10 justify-start text-left font-normal rounded-xl border-[var(--color-border-default)] focus-brand text-sm w-auto min-w-[180px]",
            !dateRange && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {displayText()}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-auto p-0"
        align="start"
        onInteractOutside={(e) => {
          if (isSelectingRangeRef.current) {
            e.preventDefault();
          }
        }}
        onPointerDownOutside={(e) => {
          if (isSelectingRangeRef.current) {
            e.preventDefault();
          }
        }}
      >
        <div className="p-3 border-b text-center font-medium text-sm bg-muted/20">
          {getStatusText()}
        </div>
        <Calendar
          initialFocus
          mode="range"
          defaultMonth={dateRange?.from}
          selected={dateRange}
          onSelect={handleSelect}
          numberOfMonths={2}
          locale={es}
          weekStartsOn={1}
        />
      </PopoverContent>
    </Popover>
  );
}

