import React from "react";
import DateRangePicker from "@/components/ui/DateRangePicker";
import { cn } from "@/lib/utils";

/**
 * StatsDateHeader - Controles para el header de estadísticas: Selector de rango de fechas.
 */
export interface StatsDateHeaderProps {
    startDate: string | Date | null;
    endDate: string | Date | null;
    onDateChange?: (range: { from: string | null; to: string | null }) => void;
    className?: string;
}

export default function StatsDateHeader({
    startDate,
    endDate,
    onDateChange,
    className
}: StatsDateHeaderProps) {
    const handleDateChange = (startStr: string | null, endStr: string | null) => {
        if (onDateChange) {
            onDateChange({ from: startStr, to: endStr });
        }
    };

    return (
        <div className={cn("flex items-center gap-2", className)}>
            <DateRangePicker
                startDate={startDate as any} // DateRangePicker internal expects string|Date
                endDate={endDate as any}
                onDateChange={handleDateChange}
                className="w-auto"
            />
        </div>
    );
}
