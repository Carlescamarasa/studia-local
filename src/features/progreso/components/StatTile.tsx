import React from "react";
import { cn } from "@/lib/utils";

/**
 * StatTile - Ultra-compact KPI component for stats bar
 */
export interface StatTileProps {
    value: string | number | null | undefined;
    label: string;
    sublabel?: string;
    valueClassName?: string;
    className?: string;
}

export default function StatTile({
    value,
    label,
    sublabel,
    valueClassName,
    className,
}: StatTileProps) {
    // Validate value
    const safeValue = React.useMemo(() => {
        if (value === null || value === undefined) return '—';
        if (typeof value === 'number') {
            if (isNaN(value) || !isFinite(value)) return '—';
            return value;
        }
        if (typeof value === 'string') {
            if (value.includes('NaN')) return '—';
            return value;
        }
        return value;
    }, [value]);

    return (
        <div className={cn("text-center py-2 px-1", className)}>
            <p className={cn(
                "text-lg sm:text-xl font-bold leading-tight",
                valueClassName || "text-[var(--color-text-primary)]"
            )}>
                {safeValue}
            </p>
            <p className="text-[10px] sm:text-xs text-[var(--color-text-secondary)] leading-tight mt-0.5">
                {label}
            </p>
            {sublabel && (
                <p className="text-[9px] sm:text-[10px] text-[var(--color-text-secondary)]/70 leading-tight">
                    {sublabel}
                </p>
            )}
        </div>
    );
}
