/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";
import DateRangePicker from "@/features/shared/components/ui/DateRangePicker";
import { cn } from "@/lib/utils";

/**
 * StatsDateHeader - Controles para el header de estadísticas: Selector de rango de fechas.
 */
export interface StatsDateHeaderProps {
    startDate: string | Date | null;
    endDate: string | Date | null;
    onDateChange?: (range: { from: string | null; to: string | null }) => void;
    className?: string;
    presets?: { key: string; label: string }[];
    // Legacy support props (optional, can be ignored or passed down if needed)
    isOpen?: boolean;
    onToggle?: () => void;
    rangoPreset?: string; // Kept optional to avoid breaking if passed, but ignored
    onPresetChange?: (preset: string) => void; // Kept optional, ignored
}

export default function StatsDateHeader({
    startDate,
    endDate,
    onDateChange,
    className,
    presets = []
}: StatsDateHeaderProps) {
    const handleDateChange = (startStr: string | null, endStr: string | null) => {
        if (onDateChange) {
            onDateChange({ from: startStr, to: endStr });
        }
    };

    return (
        <div className={cn("flex flex-wrap items-center gap-2", className)}>
            {/* Date Range Picker with internal presets */}
            <DateRangePicker
                startDate={startDate as any}
                endDate={endDate as any}
                onDateChange={handleDateChange}
                className="w-auto"
                presets={presets}
            />
        </div>
    );
}
