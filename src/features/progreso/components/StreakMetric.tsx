import React from "react";
import { Flame } from "lucide-react";
import KpiTile from "./KpiTile";

/**
 * StreakMetric - KPIs de Racha
 */
export interface StreakMetricProps {
    streakDays: number | null | undefined;
    maxStreak?: number | null;
    label?: string;
    className?: string;
}

export default function StreakMetric({
    streakDays,
    maxStreak,
    label = "Racha",
    className
}: StreakMetricProps) {
    const hasValue = streakDays !== null && streakDays !== undefined;
    const currentStreak = hasValue ? streakDays : 0;
    const currentMax = maxStreak || 0;

    // Progress bar logic
    const progress = currentMax > 0
        ? Math.min(Math.max(currentStreak / currentMax, 0), 1)
        : 0;

    // Visual element: Progress Bar
    const progressBar = (currentMax > 0 && hasValue) ? (
        <div className="h-1.5 w-16 bg-[var(--color-border-default)] rounded-full overflow-hidden">
            <div
                className="h-full bg-orange-500 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${progress * 100}%` }}
            />
        </div>
    ) : null;

    return (
        <KpiTile
            className={className}
            icon={Flame}
            label={label}
            value={
                <span className="flex items-baseline gap-1">
                    {hasValue ? currentStreak : "—"}
                    {hasValue && (
                        <span className="text-base sm:text-lg font-normal text-[var(--color-text-secondary)]">
                            {currentStreak === 1 ? "día" : "días"}
                        </span>
                    )}
                </span>
            }
            extra={progressBar}
            subtext={currentMax > 0 ? `Máx: ${currentMax}` : null}
        />
    );
}
