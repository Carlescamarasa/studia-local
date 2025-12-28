import React from 'react';
import { Database, FlaskConical } from 'lucide-react';

interface ModeToggleProps {
    mode: 'seeds' | 'tests';
    onModeChange: (mode: 'seeds' | 'tests') => void;
}

/**
 * ModeToggle - Toggle between Seeds and Tests modes
 */
export default function ModeToggle({ mode, onModeChange }: ModeToggleProps) {
    return (
        <div className="inline-flex rounded-xl border border-[var(--color-border-default)] p-1 bg-[var(--color-surface-muted)]">
            <button
                onClick={() => onModeChange('seeds')}
                className={`
          flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all
          ${mode === 'seeds'
                        ? 'bg-[var(--color-surface)] text-[var(--color-text-primary)] shadow-sm'
                        : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
                    }
        `}
                aria-label="Modo Seeds"
                aria-pressed={mode === 'seeds'}
            >
                <Database className="w-4 h-4" />
                <span>Seeds</span>
            </button>
            <button
                onClick={() => onModeChange('tests')}
                className={`
          flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all
          ${mode === 'tests'
                        ? 'bg-[var(--color-surface)] text-[var(--color-text-primary)] shadow-sm'
                        : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
                    }
        `}
                aria-label="Modo Tests"
                aria-pressed={mode === 'tests'}
            >
                <FlaskConical className="w-4 h-4" />
                <span>Tests</span>
            </button>
        </div>
    );
}
