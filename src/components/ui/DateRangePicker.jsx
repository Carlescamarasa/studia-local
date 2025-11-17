import React, { useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const formatDate = (date) => {
  if (!date) return '';
  const d = new Date(date);
  const day = d.getDate();
  const month = d.toLocaleDateString('es-ES', { month: 'short' });
  const year = d.getFullYear();
  return `${day} ${month} ${year}`;
};

const formatDateShort = (date) => {
  if (!date) return '';
  const d = new Date(date);
  const day = d.getDate();
  const month = d.toLocaleDateString('es-ES', { month: 'short' });
  return `${day} ${month}`;
};

const dateToString = (date) => {
  if (!date) return '';
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function DateRangePicker({ 
  startDate, 
  endDate, 
  onDateChange,
  className = ""
}) {
  const [open, setOpen] = useState(false);
  
  // Convertir strings a Date objects
  const start = startDate ? new Date(startDate + 'T00:00:00') : undefined;
  const end = endDate ? new Date(endDate + 'T00:00:00') : undefined;
  
  const [dateRange, setDateRange] = useState({
    from: start,
    to: end,
  });

  const handleSelect = (range) => {
    setDateRange(range);
    
    // Si se seleccionaron ambas fechas, cerrar el popover y actualizar
    if (range?.from && range?.to) {
      const fromStr = dateToString(range.from);
      const toStr = dateToString(range.to);
      onDateChange?.(fromStr, toStr);
      setOpen(false);
    } else if (range?.from) {
      // Si solo se seleccionó el inicio, actualizar solo el inicio
      const fromStr = dateToString(range.from);
      onDateChange?.(fromStr, endDate || fromStr);
    }
  };

  // Actualizar el rango cuando cambien las props externas
  React.useEffect(() => {
    const newStart = startDate ? new Date(startDate + 'T00:00:00') : undefined;
    const newEnd = endDate ? new Date(endDate + 'T00:00:00') : undefined;
    setDateRange({ from: newStart, to: newEnd });
  }, [startDate, endDate]);

  const displayText = () => {
    if (dateRange?.from && dateRange?.to) {
      return `${formatDateShort(dateRange.from)} - ${formatDate(dateRange.to)}`;
    }
    if (dateRange?.from) {
      return formatDate(dateRange.from);
    }
    return "Seleccionar rango";
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "h-10 justify-start text-left font-normal rounded-xl border-[var(--color-border-default)] focus-brand text-sm w-full md:w-auto",
            !dateRange && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {displayText()}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          initialFocus
          mode="range"
          defaultMonth={dateRange?.from}
          selected={dateRange}
          onSelect={handleSelect}
          numberOfMonths={2}
        />
      </PopoverContent>
    </Popover>
  );
}

