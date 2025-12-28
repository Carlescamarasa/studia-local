import React from 'react';
import SyntheticSchoolYearCard from './SyntheticSchoolYearCard';

interface SeedsPanelProps {
    addLog: (message: string, type?: 'info' | 'success' | 'error' | 'warning') => void;
}

/**
 * SeedsPanel - Panel for generating demo/test data
 * Uses the new SyntheticSchoolYearCard for the course 2025-26
 */
export default function SeedsPanel({ addLog }: SeedsPanelProps) {
    return (
        <div className="space-y-4">
            {/* Curso Sintético 2025-26 */}
            <SyntheticSchoolYearCard addLog={addLog} />
        </div>
    );
}
