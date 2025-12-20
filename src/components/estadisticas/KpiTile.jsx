import React from "react";
import { cn } from "@/lib/utils";

/**
 * KpiTile - Componente base para tiles de KPI con diseño unificado.
 * Estructura:
 * 1. Header: Icono + Label
 * 2. Body: Valor grande
 * 3. Extra: Elemento visual (barras, estrellas)
 * 4. Footer: Subtexto
 * 
 * @param {Object} props
 * @param {React.ElementType} props.icon - Componente de icono Lucide
 * @param {string} props.label - Etiqueta del KPI
 * @param {React.ReactNode} props.value - Valor principal
 * @param {string} props.valueClassName - Clases para el valor (color)
 * @param {React.ReactNode} props.extra - Elemento visual opcional (estrellas, barra)
 * @param {React.ReactNode} props.subtext - Texto secundario inferior
 * @param {string} props.className - Clases contenedor
 */
export default function KpiTile({
    icon: Icon,
    label,
    value,
    valueClassName,
    extra,
    subtext,
    className,
}) {
    return (
        <div
            className={cn(
                "flex flex-col items-center justify-between p-3 sm:p-4 border border-[var(--color-border-default)] bg-[var(--color-surface)] h-full min-h-[140px]",
                className
            )}
            style={{ borderRadius: 'var(--card-radius, 0.75rem)' }}
        >
            {/* Header: Icon + Label */}
            <div className="flex flex-col items-center gap-1.5 mb-2 w-full">
                {Icon && <Icon className="w-5 h-5 text-[var(--color-text-secondary)]" strokeWidth={1.5} />}
                <span className="text-sm text-[var(--color-text-secondary)] font-medium text-center leading-tight">
                    {label}
                </span>
            </div>

            {/* Body: Value */}
            <div className="flex flex-col items-center justify-center flex-1 my-1">
                <span className={cn(
                    "text-2xl sm:text-3xl font-bold tracking-tight text-center",
                    valueClassName || "text-[var(--color-text-primary)]"
                )}>
                    {value}
                </span>
            </div>

            {/* Footer Group: Extra + Subtext */}
            <div className="flex flex-col items-center gap-1.5 w-full mt-2 min-h-[20px] justify-end">
                {extra && <div className="w-full flex justify-center">{extra}</div>}

                {subtext && (
                    <span className="text-xs text-[var(--color-text-muted)] text-center font-medium leading-none">
                        {subtext}
                    </span>
                )}
            </div>
        </div>
    );
}
