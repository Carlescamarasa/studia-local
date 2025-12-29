/**
 * useDesignDiff - Hook for computing and managing partitioned design diffs
 * 
 * REFACTORED: Now uses partitioned diffs (common/light/dark) and new export APIs
 */

import { useMemo, useCallback } from 'react';
import { useDesign } from './DesignProvider';

/**
 * Hook to compute and manage diffs between base design and preview overlay
 * @returns {Object} - partitioned diff, counts, and utility functions
 */
export function useDesignDiff() {
    const {
        baseDesign,
        previewOverlay,
        isPreviewActive,
        activeMode,
        revertChange,
        clearPreview,
        getPartitionedDiff,
        exportFull,
        exportDiff,
        exportFullAndDiff,
    } = useDesign();

    // Compute partitioned diff
    const diff = useMemo(() => {
        return getPartitionedDiff();
    }, [getPartitionedDiff, previewOverlay, baseDesign]);

    // Counts
    const counts = useMemo(() => ({
        common: diff.common.length,
        light: diff.light.length,
        dark: diff.dark.length,
    }), [diff]);

    const totalCount = counts.common + counts.light + counts.dark;
    const hasChanges = totalCount > 0;

    // Flat diff for legacy compatibility
    const flatDiff = useMemo(() => {
        return [...diff.common, ...diff.light, ...diff.dark];
    }, [diff]);

    // Download as JSON file
    const downloadExport = useCallback((data, filename) => {
        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename || `design-export-${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, []);


    // Generate human-readable report
    const generateReport = useCallback(() => {
        const lines = [
            '# Design System Changes Report',
            `Generated: ${new Date().toISOString()}`,
            `Active Mode: ${activeMode}`,
            '',
        ];

        if (!hasChanges) {
            lines.push('✅ No changes detected.');
            return lines.join('\n');
        }

        lines.push(`## Summary: ${totalCount} change(s)`);
        lines.push(`- Common: ${counts.common}`);
        lines.push(`- Light mode: ${counts.light}`);
        lines.push(`- Dark mode: ${counts.dark}`);
        lines.push('');

        if (diff.common.length > 0) {
            lines.push('## Common Changes (affect both modes)');
            diff.common.forEach(c => {
                lines.push(`- \`${c.path}\`: ${JSON.stringify(c.from)} → ${JSON.stringify(c.to)}`);
            });
            lines.push('');
        }

        if (diff.light.length > 0) {
            lines.push('## Light Mode Changes');
            diff.light.forEach(c => {
                lines.push(`- \`${c.path}\`: ${JSON.stringify(c.from)} → ${JSON.stringify(c.to)}`);
            });
            lines.push('');
        }

        if (diff.dark.length > 0) {
            lines.push('## Dark Mode Changes');
            diff.dark.forEach(c => {
                lines.push(`- \`${c.path}\`: ${JSON.stringify(c.from)} → ${JSON.stringify(c.to)}`);
            });
            lines.push('');
        }

        return lines.join('\n');
    }, [diff, counts, totalCount, hasChanges, activeMode]);

    // Download as Markdown report
    const downloadReport = useCallback(() => {
        const report = generateReport();
        const blob = new Blob([report], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `design-report-${new Date().toISOString().slice(0, 10)}.md`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, [generateReport]);

    return {
        // Partitioned diff (new API)
        diff,
        counts,
        totalCount,
        hasChanges,

        // Legacy flat diff (for components not yet updated)
        flatDiff,
        changeCount: totalCount,

        // Mode info
        activeMode,
        isPreviewActive,

        // Actions
        revertChange,
        clearPreview,

        // Export functions
        exportFull,
        exportDiff,
        exportFullAndDiff,
        downloadExport,
        downloadReport,
        generateReport,

        // Legacy compatibility
        // NOTE: commitPreview was removed - use export instead
    };
}
