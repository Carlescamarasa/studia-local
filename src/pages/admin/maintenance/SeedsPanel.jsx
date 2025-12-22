import React from 'react';
import SyntheticSchoolYearCard from './components/SyntheticSchoolYearCard';

/**
 * SeedsPanel - Panel for generating demo/test data
 * Uses the new SyntheticSchoolYearCard for the course 2025-26
 */
export default function SeedsPanel({ addLog }) {
    return (
        <div className="space-y-4">
            {/* Curso Sintético 2025-26 */}
            <SyntheticSchoolYearCard addLog={addLog} />
        </div>
    );
}
