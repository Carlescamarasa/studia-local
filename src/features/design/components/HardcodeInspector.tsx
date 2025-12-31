/**
 * HardcodeInspector - Floating widget for detecting hardcoded styles
 * 
 * Features:
 * - Toggleable on/off (persists during navigation via sessionStorage)
 * - Floats in corner of screen
 * - Auto-scans on page load when enabled
 * - Lists colors by value with count
 * - Click to highlight matching elements
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
    Search, X, Copy, Download, ChevronDown, ChevronUp,
    Eye, EyeOff, Settings, Minimize2, Maximize2
} from 'lucide-react';
import { toast } from 'sonner';

// ============================================================================
// STORAGE KEY
// ============================================================================
const STORAGE_KEY = 'studia_hardcode_inspector_enabled';

// ============================================================================
// PATTERNS TO DETECT
// ============================================================================

// Inline style properties to check
const STYLE_PROPERTIES = [
    { key: 'backgroundColor', category: 'background' },
    { key: 'color', category: 'color' },
    { key: 'borderColor', category: 'border' },
    { key: 'borderTopColor', category: 'border' },
    { key: 'borderBottomColor', category: 'border' },
    { key: 'borderLeftColor', category: 'border' },
    { key: 'borderRightColor', category: 'border' },
    { key: 'boxShadow', category: 'shadow' },
    { key: 'borderRadius', category: 'radius' },
];

// Tailwind arbitrary patterns AND standard color classes
// Tailwind arbitrary patterns AND standard color classes
const TAILWIND_PATTERNS = [
    // Arbitrary values
    { regex: /\bbg-\[#[0-9a-f]{3,8}\]/gi, category: 'background', type: 'arbitrary' },
    { regex: /\bbg-\[rgb\([^)]+\)\]/gi, category: 'background', type: 'arbitrary' },
    { regex: /\btext-\[#[0-9a-f]{3,8}\]/gi, category: 'color', type: 'arbitrary' },
    { regex: /\btext-\[rgb\([^)]+\)\]/gi, category: 'color', type: 'arbitrary' },
    { regex: /\bborder-\[#[0-9a-f]{3,8}\]/gi, category: 'border', type: 'arbitrary' },
    { regex: /\brounded-\[\d+(\.\d+)?(px|rem|em|%)\]/gi, category: 'radius', type: 'arbitrary' },
    // Standard Tailwind color classes (hardcoded colors not using CSS vars)
    { regex: /\bbg-(red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|slate|gray|zinc|neutral|stone)-\d{2,3}\b/gi, category: 'background', type: 'non-var' },
    { regex: /\btext-(red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|slate|gray|zinc|neutral|stone)-\d{2,3}\b/gi, category: 'color', type: 'non-var' },
    { regex: /\bborder-(red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|slate|gray|zinc|neutral|stone)-\d{2,3}\b/gi, category: 'border', type: 'non-var' },
];

// Excluded zones
const EXCLUDED_SELECTORS = [
    '.recharts', '[data-radix-', 'canvas', 'svg', '.chart',
    '[data-hardcode-inspector]'
];

// Allowed values
const ALLOWED_VALUES = new Set([
    'inherit', 'initial', 'unset', 'transparent', 'currentColor', 'none', ''
]);

// ============================================================================
// CSS VARIABLE OPTIONS FOR DESHARDCODE
// ============================================================================
const CSS_VARIABLE_OPTIONS = {
    background: [
        { var: '--color-background', label: 'Background' },
        { var: '--color-surface', label: 'Surface' },
        { var: '--color-surface-muted', label: 'Surface Muted' },
        { var: '--color-surface-elevated', label: 'Surface Elevated' },
        { var: '--color-primary', label: 'Primary' },
        { var: '--color-primary-soft', label: 'Primary Soft' },
        { var: '--color-success', label: 'Success' },
        { var: '--color-warning', label: 'Warning' },
        { var: '--color-danger', label: 'Danger' },
        { var: '--color-info', label: 'Info' },
    ],
    color: [
        { var: '--color-text-primary', label: 'Text Primary' },
        { var: '--color-text-secondary', label: 'Text Secondary' },
        { var: '--color-text-muted', label: 'Text Muted' },
        { var: '--color-primary', label: 'Primary' },
        { var: '--color-success', label: 'Success' },
        { var: '--color-warning', label: 'Warning' },
        { var: '--color-danger', label: 'Danger' },
        { var: '--color-info', label: 'Info' },
    ],
    border: [
        { var: '--color-border-default', label: 'Border Default' },
        { var: '--color-border-muted', label: 'Border Muted' },
        { var: '--color-border-strong', label: 'Border Strong' },
        { var: '--color-primary', label: 'Primary' },
        { var: '--color-danger', label: 'Danger' },
    ],
    shadow: [
        { var: '--color-shadow', label: 'Shadow' },
        { var: '--shadow-sm', label: 'Shadow SM' },
        { var: '--shadow-md', label: 'Shadow MD' },
        { var: '--shadow-lg', label: 'Shadow LG' },
    ],
    radius: [
        { var: '--radius-sm', label: 'Radius SM' },
        { var: '--radius-md', label: 'Radius MD' },
        { var: '--radius-lg', label: 'Radius LG' },
        { var: '--radius-xl', label: 'Radius XL' },
        { var: '--radius-full', label: 'Radius Full' },
    ],
};

// ============================================================================
// UTILITIES
// ============================================================================

function isInExcludedZone(element: Element) {
    try {
        for (const selector of EXCLUDED_SELECTORS) {
            if (element.closest(selector)) return true;
        }
        const tag = element.tagName?.toLowerCase();
        if (['html', 'head', 'body', 'script', 'style', 'link', 'meta'].includes(tag)) {
            return true;
        }
    } catch (_) { }
    return false;
}

function isHardcodedValue(value: string | undefined, category: string | null = null) {
    if (!value) return false;
    if (ALLOWED_VALUES.has(value)) return false;
    if (value.includes('var(')) return false;

    // For radius category, check for hardcoded dimensions
    if (category === 'radius') {
        // Detect hardcoded radius values like 10px, 1rem, 50%, etc.
        return /^\d+(\.\d+)?(px|rem|em|%|vh|vw)$/.test(value.trim());
    }

    // For color-based categories
    const colorPatterns = [
        /^#[0-9a-f]{3,8}$/i,
        /^rgb\(/i,
        /^rgba\(/i,
        /^hsl\(/i,
    ];

    return colorPatterns.some(p => p.test(value.trim()));
}

function normalizeColor(value: string) {
    // Extract the color value for grouping
    const hexMatch = value.match(/#[0-9a-f]{3,8}/i);
    if (hexMatch) return hexMatch[0].toLowerCase();

    const rgbMatch = value.match(/rgba?\([^)]+\)/i);
    if (rgbMatch) return rgbMatch[0].toLowerCase();

    return value.toLowerCase();
}

// ============================================================================
// SCANNING
// ============================================================================

function scanPage() {
    const byColor = new Map(); // color -> { count, elements, type, category }
    const elements = document.querySelectorAll('*');

    elements.forEach((el) => {
        if (isInExcludedZone(el)) return;

        // Check inline styles
        STYLE_PROPERTIES.forEach(({ key, category }) => {
            const value = (el as HTMLElement).style?.[key as any];
            if (value && isHardcodedValue(value, category)) {
                const normalized = normalizeColor(value);
                if (!byColor.has(normalized)) {
                    byColor.set(normalized, { count: 0, elements: [], type: 'inline', category });
                }
                const entry = byColor.get(normalized);
                entry.count++;
                if (entry.elements.length < 10) entry.elements.push(el);
            }
        });

        // Check Tailwind classes
        const className = el.className;
        if (className && typeof className === 'string') {
            TAILWIND_PATTERNS.forEach(({ regex, category, type }) => {
                regex.lastIndex = 0;
                const matches = className.match(regex);
                if (matches) {
                    matches.forEach(match => {
                        const normalized = normalizeColor(match);
                        if (!byColor.has(normalized)) {
                            byColor.set(normalized, { count: 0, elements: [], type, category });
                        }
                        const entry = byColor.get(normalized);
                        entry.count++;
                        if (entry.elements.length < 10) entry.elements.push(el);
                    });
                }
            });
        }
    });

    // Convert to sorted array
    return Array.from(byColor.entries())
        .map(([color, data]) => ({ color, ...data }))
        .sort((a, b) => b.count - a.count);
}

// ============================================================================
// HIGHLIGHT HELPERS
// ============================================================================

function highlightElements(elements: HTMLElement[], color = '#ef4444') {
    elements.forEach((el: HTMLElement) => {
        if (!el.dataset.hardcodeHighlight) {
            el.dataset.hardcodeHighlight = 'true';
            el.dataset.originalOutline = el.style.outline || '';
            el.style.outline = `2px dashed ${color}`;
            el.style.outlineOffset = '2px';
        }
    });
}

function clearHighlights() {
    document.querySelectorAll('[data-hardcode-highlight]').forEach(el => {
        (el as HTMLElement).style.outline = (el as HTMLElement).dataset.originalOutline || '';
        (el as HTMLElement).style.outlineOffset = '';
        delete (el as HTMLElement).dataset.hardcodeHighlight;
        delete (el as HTMLElement).dataset.originalOutline;
    });
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function HardcodeInspector({ showToggleButton = true }) {
    const [isEnabled, setIsEnabled] = useState(() => {
        try {
            return sessionStorage.getItem(STORAGE_KEY) === 'true';
        } catch { return false; }
    });
    const [isMinimized, setIsMinimized] = useState(false);
    const [results, setResults] = useState<any[]>([]);
    const [selectedColor, setSelectedColor] = useState<string | null>(null);
    const [expandedItem, setExpandedItem] = useState<string | null>(null); // For dropdown expansion
    const [previewVars, setPreviewVars] = useState<Record<string, string>>({}); // { color: cssVar } mapping for preview
    const [savedAdjustments, setSavedAdjustments] = useState<any[]>([]); // Persisted adjustments: { url, hardcode, category, type, replacement }
    const [typeFilter, setTypeFilter] = useState('all'); // 'all' | 'inline' | 'tailwind'
    const [isScanning, setIsScanning] = useState(false);
    const [panelPosition, setPanelPosition] = useState<{ x: number | null, y: number | null }>({ x: null, y: null }); // null = default position
    const containerRef = useRef<HTMLDivElement>(null);
    const isDragging = useRef(false);
    const dragOffset = useRef({ x: 0, y: 0 });

    // Persist enabled state
    useEffect(() => {
        try {
            sessionStorage.setItem(STORAGE_KEY, isEnabled.toString());
        } catch { }
    }, [isEnabled]);

    // Auto-scan when enabled (initial scan)
    useEffect(() => {
        if (isEnabled && !isMinimized) {
            const timer = setTimeout(() => {
                handleScan();
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [isEnabled, isMinimized]);

    // Cleanup highlights on unmount or disable
    useEffect(() => {
        return () => {
            clearHighlights();
        };
    }, []);

    useEffect(() => {
        if (!isEnabled) {
            clearHighlights();
            setSelectedColor(null);
            setPanelPosition({ x: null, y: null }); // Reset position when disabled
        }
    }, [isEnabled]);

    // Listen for external toggle events (e.g. from sidebar)
    useEffect(() => {
        const handleToggle = () => setIsEnabled(prev => !prev);
        window.addEventListener('toggle-hardcode-inspector', handleToggle);
        return () => window.removeEventListener('toggle-hardcode-inspector', handleToggle);
    }, []);

    // Drag handlers
    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('select')) return; // Don't drag from buttons
        isDragging.current = true;
        const rect = containerRef.current?.getBoundingClientRect();
        if (rect) {
            dragOffset.current = {
                x: e.clientX - rect.left,
                y: e.clientY - rect.top
            };
        }
        e.preventDefault();
    }, []);

    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (!isDragging.current) return;
        const newX = e.clientX - dragOffset.current.x;
        const newY = e.clientY - dragOffset.current.y;
        // Keep within viewport
        const maxX = window.innerWidth - 320; // panel width
        const maxY = window.innerHeight - 100;
        setPanelPosition({
            x: Math.max(0, Math.min(newX, maxX)),
            y: Math.max(0, Math.min(newY, maxY))
        });
    }, []);

    const handleMouseUp = useCallback(() => {
        isDragging.current = false;
    }, []);

    // Add global mouse listeners when dragging
    useEffect(() => {
        if (isEnabled && !isMinimized) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            return () => {
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
            };
        }
    }, [isEnabled, isMinimized, handleMouseMove, handleMouseUp]);

    const handleScan = useCallback(() => {
        setIsScanning(true);
        requestAnimationFrame(() => {
            try {
                const data = scanPage();
                setResults(data);
                if (data.length === 0) {
                    toast.success('✅ No se encontraron estilos hardcodeados');
                }
            } catch (e) {
                console.error('[HardcodeInspector]', e);
                toast.error('Error al escanear');
            } finally {
                setIsScanning(false);
            }
        });
    }, []);


    // Auto-scan on route changes only (not on every DOM mutation to avoid excessive scanning)
    useEffect(() => {
        if (!isEnabled) return;

        let lastUrl = window.location.href;
        let debounceTimer: ReturnType<typeof setTimeout> | null = null;

        const checkRouteChange = () => {
            const currentUrl = window.location.href;
            if (currentUrl !== lastUrl) {
                lastUrl = currentUrl;
                // Debounce scan on route change
                if (debounceTimer) clearTimeout(debounceTimer);
                debounceTimer = setTimeout(() => {
                    handleScan();
                }, 500);
            }
        };

        // Check for SPA navigation via interval (more reliable than popstate alone)
        const intervalId = setInterval(checkRouteChange, 1000);

        // Also listen to popstate for back/forward navigation
        window.addEventListener('popstate', checkRouteChange);

        return () => {
            clearInterval(intervalId);
            window.removeEventListener('popstate', checkRouteChange);
            if (debounceTimer) clearTimeout(debounceTimer);
        };
    }, [isEnabled, handleScan]);


    const handleColorClick = useCallback((colorData: any) => {
        clearHighlights();
        if (selectedColor === colorData.color) {
            setSelectedColor(null);
        } else {
            setSelectedColor(colorData.color);
            highlightElements(colorData.elements, '#3b82f6');
            // Scroll to first element
            if (colorData.elements[0]) {
                colorData.elements[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
    }, [selectedColor]);

    const handleCopyReport = useCallback(() => {
        const currentUrl = window.location.href;
        const lines = [
            `# HardcodeFinder Report`,
            ``,
            `**URL:** ${currentUrl}`,
            ``,
            `## Hardcoded Values Found`,
            `Found ${results.reduce((acc, r) => acc + r.count, 0)} hardcoded values on this page.`,
            `Filter: ${typeFilter}`,
            ``,
        ];

        const reportData = typeFilter === 'all' ? results : filteredResults;

        reportData.forEach(r => {
            const adjustment = savedAdjustments.find(a => a.hardcode === r.color);
            if (adjustment) {
                lines.push(`- ✅ **${r.color}** → \`var(${adjustment.replacement})\` (${r.count}× ${r.type}, ${r.category})`);
            } else {
                lines.push(`- ⚠️ **${r.color}**: ${r.count} occurrences (${r.type}, ${r.category})`);
            }
        });

        if (savedAdjustments.length > 0) {
            lines.push(``);
            lines.push(`## Adjustments Made (${savedAdjustments.length})`);
            savedAdjustments.forEach(adj => {
                lines.push(`- \`${adj.hardcode}\` → \`var(${adj.replacement})\` (${adj.category}) @ ${adj.url}`);
            });
        }

        navigator.clipboard.writeText(lines.join('\\n'));
        toast.success('📋 Reporte copiado');
    }, [results, savedAdjustments]);

    // Apply CSS variable preview to elements and save adjustment
    const handleApplyPreview = useCallback((colorData: any, cssVar: string) => {
        const currentUrl = window.location.href;

        // Store the mapping for preview
        setPreviewVars(prev => ({ ...prev, [colorData.color]: cssVar }));

        // Save adjustment (update if exists, add if new)
        setSavedAdjustments(prev => {
            const existing = prev.findIndex(a => a.hardcode === colorData.color);
            const adjustment = {
                url: currentUrl,
                hardcode: colorData.color,
                category: colorData.category,
                type: colorData.type,
                replacement: cssVar,
                timestamp: Date.now()
            };
            if (existing >= 0) {
                const updated = [...prev];
                updated[existing] = adjustment;
                return updated;
            }
            return [...prev, adjustment];
        });

        // Apply preview to elements
        colorData.elements.forEach((el: HTMLElement) => {
            // Store original value if not already stored
            if (!el.dataset.originalHardcode) {
                const property = colorData.category === 'background' ? 'backgroundColor' :
                    colorData.category === 'color' ? 'color' :
                        colorData.category === 'border' ? 'borderColor' :
                            colorData.category === 'radius' ? 'borderRadius' : 'boxShadow';
                el.dataset.originalHardcode = el.style[property as any] || '';
                el.dataset.originalProperty = property;
            }
            // Apply the CSS variable
            const property = el.dataset.originalProperty || 'backgroundColor';
            el.style[property as any] = `var(${cssVar})`;
        });

        toast.success(`🎨 Ajuste guardado: var(${cssVar})`);
    }, []);

    // Clear all previews
    const handleClearPreviews = useCallback(() => {
        document.querySelectorAll('[data-original-hardcode]').forEach(el => {
            const property = (el as HTMLElement).dataset.originalProperty || 'backgroundColor';
            (el as HTMLElement).style[property as any] = (el as HTMLElement).dataset.originalHardcode || '';
            delete (el as HTMLElement).dataset.originalHardcode;
            delete (el as HTMLElement).dataset.originalProperty;
        });
        setPreviewVars({});
        setSavedAdjustments([]);
        toast.info('↩️ Todos los ajustes limpiados');
    }, []);

    // Remove single adjustment
    const handleRemoveAdjustment = useCallback((hardcode: string) => {
        setSavedAdjustments(prev => prev.filter(a => a.hardcode !== hardcode));
        setPreviewVars(prev => {
            const updated = { ...prev };
            delete updated[hardcode];
            return updated;
        });
        toast.info('❌ Ajuste eliminado');
    }, []);

    const totalCount = useMemo(() => results.reduce((acc, r) => acc + r.count, 0), [results]);

    // Filter results by type
    const filteredResults = useMemo(() => {
        if (typeFilter === 'all') return results;
        return results.filter(r => r.type === typeFilter);
    }, [results, typeFilter]);

    const inlineCount = useMemo(() => results.filter(r => r.type === 'inline').length, [results]);
    const tailwindCount = useMemo(() => results.filter(r => r.type === 'tailwind').length, [results]);

    // Toggle button - matches ReportErrorButton styling, positioned above it
    const toggleButton = !showToggleButton ? null : (
        <button
            onClick={() => setIsEnabled(!isEnabled)}
            className={`
                fixed bottom-24 right-6 z-[9999]
                w-14 h-14 rounded-full shadow-lg
                flex items-center justify-center
                transition-all hover:scale-110
                ${isEnabled
                    ? 'bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white'
                    : 'bg-[var(--color-surface-elevated)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)] hover:text-[var(--color-text-primary)] border border-[var(--color-border-default)]'
                }
            `}
            title={isEnabled ? 'Desactivar inspector' : 'Activar inspector de hardcode'}
            data-hardcode-inspector="toggle"
            aria-label={isEnabled ? 'Desactivar inspector de hardcode' : 'Activar inspector de hardcode'}
        >
            <Search className="w-6 h-6" />
            {isEnabled && totalCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-[var(--color-danger)] text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
                    {totalCount > 99 ? '99+' : totalCount}
                </span>
            )}
        </button>
    );

    // Panel (only when enabled) - draggable
    const panelStyle = panelPosition.x !== null ? {
        left: panelPosition.x,
        top: panelPosition.y ?? undefined,
        right: 'auto',
        bottom: 'auto'
    } : {};

    const panel = isEnabled && !isMinimized && (
        <div
            ref={containerRef}
            className="fixed z-[9998] w-80 max-h-[50vh] bg-[var(--color-surface-elevated)] border border-[var(--color-border-default)] rounded-xl shadow-2xl overflow-hidden flex flex-col"
            style={panelPosition.x !== null ? panelStyle : { bottom: '11rem', right: '1.5rem' }}
            data-hardcode-inspector="panel"
        >
            {/* Header - draggable */}
            <div
                onMouseDown={handleMouseDown}
                className="flex items-center justify-between p-3 border-b border-[var(--color-border-default)] bg-[var(--color-surface)] cursor-move select-none"
            >
                <div className="flex items-center gap-2">
                    <Search className="w-4 h-4 text-[var(--color-primary)]" />
                    <span className="text-sm font-medium text-[var(--color-text-primary)]">Buscador de Hardcode</span>
                </div>
                <div className="flex items-center gap-1">
                    <button
                        onClick={handleScan}
                        disabled={isScanning}
                        className="p-1.5 rounded-lg hover:bg-[var(--color-surface-muted)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
                        title="Escanear página"
                    >
                        <Search className={`w-4 h-4 ${isScanning ? 'animate-pulse' : ''}`} />
                    </button>
                    <button
                        onClick={() => setIsMinimized(true)}
                        className="p-1.5 rounded-lg hover:bg-[var(--color-surface-muted)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
                        title="Minimizar"
                    >
                        <Minimize2 className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => setIsEnabled(false)}
                        className="p-1.5 rounded-lg hover:bg-[var(--color-surface-muted)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
                        title="Cerrar"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Summary */}
            <div className="px-3 py-2 bg-[var(--color-surface-muted)]/50 border-b border-[var(--color-border-muted)]">
                <div className="flex items-center justify-between">
                    <span className="text-xs text-[var(--color-text-secondary)]">
                        {totalCount} hallazgos en esta página
                    </span>
                    {totalCount > 0 && (
                        <button
                            onClick={handleCopyReport}
                            className="text-[10px] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors flex items-center gap-1"
                        >
                            <Copy className="w-3 h-3" />
                            Copiar
                        </button>
                    )}
                </div>
            </div>

            {/* Type filter tabs */}
            {totalCount > 0 && (
                <div className="flex gap-1 px-2 py-1.5 border-b border-[var(--color-border-muted)] overflow-x-auto">
                    <button
                        onClick={() => setTypeFilter('all')}
                        className={`px-2 py-1 text-[10px] rounded transition-colors whitespace-nowrap ${typeFilter === 'all'
                            ? 'bg-[var(--color-primary)] text-white'
                            : 'bg-[var(--color-surface-muted)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)]'
                            }`}
                    >
                        Todos ({results.length})
                    </button>
                    <button
                        onClick={() => setTypeFilter('inline')}
                        className={`px-2 py-1 text-[10px] rounded transition-colors whitespace-nowrap ${typeFilter === 'inline'
                            ? 'bg-[var(--color-warning)] text-white'
                            : 'bg-[var(--color-surface-muted)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)]'
                            }`}
                    >
                        🔧 Inline
                    </button>
                    <button
                        onClick={() => setTypeFilter('arbitrary')}
                        className={`px-2 py-1 text-[10px] rounded transition-colors whitespace-nowrap ${typeFilter === 'arbitrary'
                            ? 'bg-purple-500 text-white'
                            : 'bg-[var(--color-surface-muted)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)]'
                            }`}
                    >
                        🎨 Arbitrary
                    </button>
                    <button
                        onClick={() => setTypeFilter('non-var')}
                        className={`px-2 py-1 text-[10px] rounded transition-colors whitespace-nowrap ${typeFilter === 'non-var'
                            ? 'bg-pink-500 text-white'
                            : 'bg-[var(--color-surface-muted)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)]'
                            }`}
                    >
                        🚫 Non-Var
                    </button>
                </div>
            )}

            {/* Results List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {results.length === 0 && !isScanning && (
                    <p className="text-xs text-[var(--color-text-muted)] text-center py-4">
                        {isEnabled ? 'Sin resultados' : 'Click en escanear'}
                    </p>
                )}
                {isScanning && (
                    <p className="text-xs text-[var(--color-text-secondary)] text-center py-4 animate-pulse">
                        Escaneando...
                    </p>
                )}
                {filteredResults.map((item, idx) => {
                    const isExpanded = expandedItem === item.color;
                    // Check previewVars first (live preview), then savedAdjustments (persisted)
                    const appliedVar = previewVars[item.color] ||
                        savedAdjustments.find(a => a.hardcode === item.color)?.replacement;
                    const options = (CSS_VARIABLE_OPTIONS as any)[item.category] || CSS_VARIABLE_OPTIONS.color;

                    return (
                        <div key={idx} className="space-y-1">
                            <button
                                onClick={() => {
                                    handleColorClick(item);
                                    setExpandedItem(isExpanded ? null : item.color);
                                }}
                                className={`w-full flex items-center gap-2 p-2 rounded-lg text-left transition-all ${selectedColor === item.color
                                    ? 'bg-[var(--color-info)]/20 border border-[var(--color-info)]/50'
                                    : 'hover:bg-[var(--color-surface-muted)] border border-transparent'
                                    }`}
                            >
                                {/* Color swatch */}
                                <div
                                    className="w-6 h-6 rounded border border-[var(--color-border-default)] shrink-0"
                                    style={{
                                        backgroundColor: appliedVar
                                            ? `var(${appliedVar})`
                                            : (item.color.startsWith('#') || item.color.startsWith('rgb')
                                                ? item.color.replace(/\[|\]/g, '')
                                                : 'transparent')
                                    }}
                                />
                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                    <code className="text-xs text-[var(--color-text-primary)] font-mono truncate block">
                                        {appliedVar ? `var(${appliedVar})` : item.color}
                                    </code>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <span className={`text-[9px] px-1 rounded ${item.type === 'inline' ? 'bg-[var(--color-warning)]/20 text-[var(--color-warning)]' : 'bg-purple-500/20 text-purple-400'
                                            }`}>
                                            {item.type === 'inline' ? '🔧' : '🎨'} {item.type}
                                        </span>
                                        <span className="text-[9px] text-[var(--color-text-muted)]">{item.category}</span>
                                        {appliedVar && <span className="text-[9px] text-[var(--color-success)]">✓ preview</span>}
                                    </div>
                                </div>
                                {/* Count + Expand indicator */}
                                <div className="flex items-center gap-1 shrink-0">
                                    <span className="text-xs text-[var(--color-text-secondary)]">
                                        {item.count}×
                                    </span>
                                    {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                </div>
                            </button>

                            {/* Expanded dropdown with CSS variable options */}
                            {isExpanded && (
                                <div className="ml-4 p-2 rounded-lg bg-[var(--color-surface-muted)] border border-[var(--color-border-muted)] space-y-1">
                                    <p className="text-[9px] text-[var(--color-text-muted)] mb-1">Selecciona una variable CSS:</p>
                                    <div className="flex flex-wrap gap-1">
                                        {options.map((opt: any) => (
                                            <button
                                                key={opt.var}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleApplyPreview(item, opt.var);
                                                }}
                                                className={`px-2 py-1 text-[9px] rounded transition-colors flex items-center gap-1 ${appliedVar === opt.var
                                                    ? 'bg-[var(--color-primary)] text-white'
                                                    : 'bg-[var(--color-surface)] hover:bg-[var(--color-surface-elevated)] text-[var(--color-text-secondary)] border border-[var(--color-border-muted)]'
                                                    }`}
                                            >
                                                <div
                                                    className="w-3 h-3 rounded-sm border border-[var(--color-border-default)]"
                                                    style={{ backgroundColor: `var(${opt.var})` }}
                                                />
                                                {opt.label}
                                            </button>
                                        ))}
                                    </div>
                                    {/* Remove adjustment button */}
                                    {appliedVar && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleRemoveAdjustment(item.color);
                                            }}
                                            className="mt-1 w-full py-1 text-[9px] text-[var(--color-danger)] hover:bg-[var(--color-danger)]/10 rounded transition-colors flex items-center justify-center gap-1"
                                        >
                                            <X className="w-3 h-3" />
                                            Quitar ajuste
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Footer */}
            {totalCount > 0 && (
                <div className="p-2 border-t border-[var(--color-border-default)] bg-[var(--color-surface-muted)]/50 flex gap-2">
                    <button
                        onClick={handleCopyReport}
                        className="flex-1 py-1.5 px-2 text-[10px] bg-[var(--color-surface)] hover:bg-[var(--color-surface-elevated)] text-[var(--color-text-secondary)] rounded-lg flex items-center justify-center gap-1 transition-colors border border-[var(--color-border-muted)]"
                    >
                        <Copy className="w-3 h-3" />
                        Copiar {savedAdjustments.length > 0 && `(${savedAdjustments.length} ✓)`}
                    </button>
                    {Object.keys(previewVars).length > 0 && (
                        <button
                            onClick={handleClearPreviews}
                            className="py-1.5 px-2 text-[10px] bg-[var(--color-danger)]/10 hover:bg-[var(--color-danger)]/20 text-[var(--color-danger)] rounded-lg flex items-center justify-center gap-1 transition-colors border border-[var(--color-danger)]/30"
                        >
                            <X className="w-3 h-3" />
                            Limpiar
                        </button>
                    )}
                </div>
            )}
        </div>
    );

    // Minimized state - positioned above toggle button
    const minimizedPanel = isEnabled && isMinimized && (
        <button
            onClick={() => setIsMinimized(false)}
            className="fixed bottom-44 right-6 z-[9998] px-3 py-2 bg-[var(--color-surface-elevated)] border border-[var(--color-border-default)] rounded-lg shadow-lg flex items-center gap-2 hover:bg-[var(--color-surface)] transition-colors"
            data-hardcode-inspector="minimized"
        >
            <Search className="w-4 h-4 text-[var(--color-primary)]" />
            <span className="text-xs text-[var(--color-text-primary)]">{totalCount} hardcode</span>
            <Maximize2 className="w-3 h-3 text-[var(--color-text-muted)]" />
        </button>
    );

    // Render via portal to body
    return createPortal(
        <>
            {toggleButton}
            {panel}
            {minimizedPanel}
        </>,
        document.body
    );
}

export default HardcodeInspector;
