import React from 'react';
import { useTotalXP, totalXPToObject } from '@/features/progreso/hooks/useXP';
import { Loader2 } from 'lucide-react';

interface CurrentXPInlineProps {
    studentId: string;
    skill?: 'motricidad' | 'articulacion' | 'flexibilidad';
    simple?: boolean;
    target?: number;
}

export default function CurrentXPInline({ studentId, skill, simple, target }: CurrentXPInlineProps) {
    const { data: totalXP, isLoading } = useTotalXP(studentId);

    if (isLoading) {
        return (
            <div className="flex items-center gap-2 text-sm">
                <Loader2 className="animate-spin h-4 w-4" />
                <span className="text-[var(--color-text-secondary)]">Cargando...</span>
            </div>
        );
    }

    const xp = totalXPToObject(totalXP);

    if (skill) {
        const value = Math.round(xp[skill] || 0);
        const displayValue = target ? `${value} / ${target} XP` : `${value} XP`;

        if (simple) {
            return <span className="font-mono font-semibold">{displayValue}</span>;
        }
        return (
            <div>
                <span className="text-[var(--color-text-secondary)] capitalize">{skill}:</span>{' '}
                <span className="font-mono font-semibold">{displayValue}</span>
            </div>
        );
    }

    return (
        <div className="flex gap-6 text-sm">
            <div>
                <span className="text-[var(--color-text-secondary)]">Motricidad:</span>{' '}
                <span className="font-mono font-semibold">{Math.round(xp.motricidad)} XP</span>
            </div>
            <div>
                <span className="text-[var(--color-text-secondary)]">Articulación:</span>{' '}
                <span className="font-mono font-semibold">{Math.round(xp.articulacion)} XP</span>
            </div>
            <div>
                <span className="text-[var(--color-text-secondary)]">Flexibilidad:</span>{' '}
                <span className="font-mono font-semibold">{Math.round(xp.flexibilidad)} XP</span>
            </div>
        </div>
    );
}
