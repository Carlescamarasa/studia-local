import React from 'react';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * ActionCard
 * Tarjeta interactiva para acciones secundarias o de navegación
 * @param {Object} props
 * @param {React.ReactNode} props.icon
 * @param {string} props.title
 * @param {string} props.description
 * @param {Function} props.onClick
 * @param {string} props.className
 */
interface ActionCardProps {
    icon: React.ReactNode;
    title: string;
    description?: string;
    onClick: () => void;
    className?: string;
}

export function ActionCard({ icon, title, description, onClick, className }: ActionCardProps) {
    return (
        <button
            onClick={onClick}
            className={cn(
                "group w-full flex items-center justify-between p-4",
                "bg-[var(--color-surface-card)] hover:bg-[var(--color-surface-muted)]",
                "border border-[var(--color-border-default)] rounded-[var(--radius-card)]",
                "transition-all duration-200 text-left",
                className
            )}
        >
            <div className="flex items-center gap-4">
                {icon && (
                    <div className="text-[var(--color-text-secondary)] group-hover:text-[var(--color-primary)] transition-colors">
                        {icon}
                    </div>
                )}
                <div>
                    <h3 className="text-sm font-medium text-[var(--color-text-primary)]">
                        {title}
                    </h3>
                    {description && (
                        <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
                            {description}
                        </p>
                    )}
                </div>
            </div>

            <ChevronRight className="w-4 h-4 text-[var(--color-text-tertiary)] group-hover:text-[var(--color-text-primary)] transition-colors" />
        </button>
    );
}
