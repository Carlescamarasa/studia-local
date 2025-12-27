import React from "react";
import { Star } from "lucide-react";
import KpiTile from "./KpiTile";
import { cn } from "@/lib/utils";

/**
 * RatingStarsMetric - KPIs de Valoración refactorizado
 */
export interface RatingStarsMetricProps {
    value?: number | string | null;
    max?: number;
    label?: string;
    precision?: number;
    className?: string;
}

export default function RatingStarsMetric({
    value,
    max = 4,
    label = "Valoración",
    precision = 1,
    className
}: RatingStarsMetricProps) {
    const hasValue = value !== null && value !== undefined && value !== "";
    const numericValue = hasValue ? Math.min(Math.max(Number(value), 0), max) : 0;

    // Constantes de estrellas
    const starsArray = Array.from({ length: max }, (_, i) => i + 1);

    // Visual element: Stars Row
    const starsVisual = hasValue ? (
        <div className="flex items-center gap-1" aria-hidden="true">
            {starsArray.map((starIndex) => {
                let fillPercentage = 0;
                if (numericValue >= starIndex) {
                    fillPercentage = 1;
                } else if (numericValue > starIndex - 1) {
                    fillPercentage = numericValue - (starIndex - 1);
                }

                return (
                    <div key={starIndex} className="relative w-4 h-4 text-gray-200">
                        {/* Background star */}
                        <Star className="w-full h-full fill-current text-[var(--color-border-default)]" strokeWidth={0} />

                        {/* Foreground star (filled) */}
                        <div
                            className="absolute top-0 left-0 h-full overflow-hidden text-yellow-400"
                            style={{ width: `${fillPercentage * 100}%` }}
                        >
                            <Star className="w-full h-full fill-current" strokeWidth={0} />
                        </div>
                    </div>
                );
            })}
        </div>
    ) : null;

    return (
        <div role="group" aria-label={`${label}: ${hasValue ? numericValue.toFixed(precision) : 'Sin datos'} de ${max}`} className={cn("h-full", className)}>
            <KpiTile
                className="h-full"
                icon={Star}
                label={label}
                value={hasValue ? numericValue.toFixed(precision) : "—"}
                valueClassName="text-[var(--color-success)]"
                extra={starsVisual}
            />
        </div>
    );
}
