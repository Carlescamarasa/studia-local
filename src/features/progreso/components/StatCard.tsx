import React from "react";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

/**
 * StatCard - Componente reutilizable para mostrar métricas estadísticas
 */
export interface StatCardProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'prefix'> {
    value: string | number | null | undefined;
    label: string;
    icon?: LucideIcon;
    variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info';
    size?: 'sm' | 'md' | 'lg';
    suffix?: string | React.ReactNode;
    prefix?: string | React.ReactNode;
    tooltip?: string;
}

export default function StatCard({
    value,
    label,
    icon: Icon,
    className,
    variant = 'default',
    size = 'md',
    suffix = '',
    prefix = '',
    tooltip,
    ...props
}: StatCardProps) {
    // Validar y normalizar el valor
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

    const variantClasses = {
        default: 'text-[var(--color-text-primary)]',
        primary: 'text-[var(--color-primary)]',
        success: 'text-[var(--color-success)]',
        warning: 'text-[var(--color-warning)]',
        danger: 'text-[var(--color-danger)]',
        info: 'text-[var(--color-info)]',
    };

    const sizeClasses = {
        sm: {
            icon: 'w-3 h-3',
            value: 'text-sm sm:text-base',
            label: 'text-[10px] sm:text-xs',
        },
        md: {
            icon: 'w-4 h-4 sm:w-5 sm:h-5',
            value: 'text-lg sm:text-xl md:text-2xl',
            label: 'text-xs sm:text-sm',
        },
        lg: {
            icon: 'w-5 h-5 sm:w-6 sm:h-6',
            value: 'text-xl sm:text-2xl md:text-3xl',
            label: 'text-sm sm:text-base',
        },
    };

    const sizeConfig = sizeClasses[size];

    return (
        <div
            className={cn(
                "text-center",
                className
            )}
            title={tooltip}
            {...props}
        >
            {Icon && (
                <Icon className={cn(
                    "mx-auto mb-1",
                    sizeConfig.icon,
                    variantClasses[variant] || variantClasses.default
                )} />
            )}
            <p className={cn(
                "font-bold mb-0.5",
                sizeConfig.value,
                variantClasses[variant] || variantClasses.default
            )}>
                {prefix && <span className="mr-1">{prefix}</span>}
                {safeValue}
                {suffix && <span className="ml-1">{suffix}</span>}
            </p>
            <p className={cn(
                "text-[var(--color-text-secondary)]",
                sizeConfig.label
            )}>
                {label}
            </p>
        </div>
    );
}
