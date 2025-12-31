/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
/**
 * HardcodeFinder - Runtime scanner for detecting hardcoded styles
 * 
 * IMPORTANT: This component is READ-ONLY and has NO side effects (except highlight mode).
 * 
 * Detects:
 * 1. Inline styles: element.style.color = '#fff'
 * 2. Tailwind arbitrary: bg-[#123456], text-[#fff], border-[rgb(x,y,z)]
 * 
 * Features:
 * - Groups by ROOT SELECTOR for actionability
 * - Navigation mode with DOM highlighting
 * - Filters by type and property
 */

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, Badge } from '@/features/shared/components/ds';
import { Button } from '@/features/shared/components/ui/button';
import {
    Scan, AlertTriangle, Copy, ChevronDown, ChevronUp, CheckCircle,
    FolderOpen, Eye, EyeOff, Filter, X
} from 'lucide-react';
import { toast } from 'sonner';

interface HardcodeIssue {
    element: Element;
    type: 'inline' | 'tailwind';
    property: string;
    category: string;
    value: string;
    selector: string;
    rootSelector: string;
}

interface HardcodeGroup {
    root: string;
    count: number;
    inlineCount: number;
    tailwindCount: number;
    issues: HardcodeIssue[];
}

interface ScanData {
    results: HardcodeGroup[];
    allIssues: HardcodeIssue[];
    totalInline: number;
    totalTailwind: number;
    totalIssues: number;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const MAX_RESULTS = 200;

// Excluded selectors - zones known to use inline styles legitimately
const EXCLUDED_SELECTORS = [
    '.recharts',
    '[data-radix-',
    'canvas',
    'svg',
    '.chart',
    '.chartjs',
    '[class*="recharts"]',
    '[class*="chart"]',
    '[data-hardcode-highlight]', // Our own highlights
];

// Properties to check for hardcoded values
const STYLE_PROPERTIES = [
    { key: 'backgroundColor', label: 'background', category: 'background' },
    { key: 'color', label: 'color', category: 'color' },
    { key: 'borderColor', label: 'border', category: 'border' },
    { key: 'borderTopColor', label: 'border-top', category: 'border' },
    { key: 'borderBottomColor', label: 'border-bottom', category: 'border' },
    { key: 'borderLeftColor', label: 'border-left', category: 'border' },
    { key: 'borderRightColor', label: 'border-right', category: 'border' },
    { key: 'boxShadow', label: 'box-shadow', category: 'shadow' },
];

// Allowed values that are not considered "hardcoded"
const ALLOWED_VALUES = new Set([
    'inherit', 'initial', 'unset', 'transparent', 'currentColor', 'none', '',
]);

// Tailwind arbitrary value patterns
const TAILWIND_ARBITRARY_PATTERNS = [
    { regex: /\bbg-\[#[0-9a-f]{3,8}\]/gi, category: 'background' },
    { regex: /\bbg-\[rgb\([^)]+\)\]/gi, category: 'background' },
    { regex: /\bbg-\[rgba\([^)]+\)\]/gi, category: 'background' },
    { regex: /\bbg-\[hsl\([^)]+\)\]/gi, category: 'background' },
    { regex: /\btext-\[#[0-9a-f]{3,8}\]/gi, category: 'color' },
    { regex: /\btext-\[rgb\([^)]+\)\]/gi, category: 'color' },
    { regex: /\btext-\[rgba\([^)]+\)\]/gi, category: 'color' },
    { regex: /\bborder-\[#[0-9a-f]{3,8}\]/gi, category: 'border' },
    { regex: /\bborder-\[rgb\([^)]+\)\]/gi, category: 'border' },
    { regex: /\bshadow-\[#[0-9a-f]{3,8}\]/gi, category: 'shadow' },
];

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function isInExcludedZone(element: Element): boolean {
    try {
        for (const selector of EXCLUDED_SELECTORS) {
            if (element.closest(selector)) return true;
        }
        const tag = element.tagName?.toLowerCase();
        if (['html', 'head', 'body', 'script', 'style', 'link', 'meta'].includes(tag)) {
            return true;
        }
    } catch (_) { /* Intentionally swallowed */ }
    return false;
}

function usesVariable(value: string) {
    return value && value.includes('var(');
}

function isHardcodedValue(value: string) {
    if (!value) return false;
    if (ALLOWED_VALUES.has(value)) return false;
    if (usesVariable(value)) return false;

    const colorPatterns = [
        /^#[0-9a-f]{3,8}$/i,
        /^rgb\(/i,
        /^rgba\(/i,
        /^hsl\(/i,
        /^hsla\(/i,
    ];

    return colorPatterns.some(p => p.test(value.trim()));
}

function getRootSelector(element: Element) {
    let current = element;
    let depth = 0;

    while (current && current !== document.body && depth < 10) {
        const dataComponent = current.getAttribute?.('data-component')
            || current.getAttribute?.('data-testid')
            || current.getAttribute?.('data-slot');

        if (dataComponent) {
            return `[data-*="${dataComponent}"]`;
        }

        if (current.className && typeof current.className === 'string') {
            const classes = current.className.split(' ');
            const meaningful = classes.find((c: string) =>
                c && !c.startsWith('p-') && !c.startsWith('m-') &&
                !c.startsWith('w-') && !c.startsWith('h-') &&
                !c.startsWith('flex') && !c.startsWith('grid') &&
                !c.startsWith('text-') && !c.startsWith('bg-') &&
                !c.startsWith('border') && !c.startsWith('rounded') &&
                c.length > 3
            );
            if (meaningful) {
                return `.${meaningful}`;
            }
        }

        if (current.id) {
            return `#${current.id}`;
        }

        if (current.parentElement) {
            current = current.parentElement as Element;
        } else {
            current = document.body; // Break loop
        }
        depth++;
    }

    return element.tagName?.toLowerCase() || 'unknown';
}

function getShortSelector(element: Element) {
    const parts: string[] = [];
    let current = element;
    let depth = 0;

    while (current && current !== document.body && depth < 2) {
        let sel = current.tagName?.toLowerCase() || '';
        if (current.className && typeof current.className === 'string') {
            const cls = current.className.split(' ')[0];
            if (cls && cls.length < 30 && !cls.startsWith('hardcode-')) sel += `.${cls}`;
        }
        if (sel) parts.unshift(sel);

        if (current.parentElement) {
            current = current.parentElement as Element;
        } else {
            break;
        }
        depth++;
    }

    return parts.join(' > ') || 'unknown';
}

// ============================================================================
// SCANNING FUNCTIONS
// ============================================================================

/**
 * Scan DOM for hardcoded INLINE styles
 */
function scanInlineStyles() {
    const results: any[] = [];
    const elements = document.querySelectorAll('*');

    elements.forEach((el) => {
        if (isInExcludedZone(el)) return;

        STYLE_PROPERTIES.forEach(({ key, label, category }) => {
            const inlineValue = (el as HTMLElement).style?.[key as any];

            if (inlineValue && isHardcodedValue(inlineValue)) {
                results.push({
                    element: el,
                    type: 'inline',
                    property: label,
                    category,
                    value: inlineValue,
                    selector: getShortSelector(el),
                    rootSelector: getRootSelector(el),
                });
            }
        });
    });

    return results;
}

/**
 * Scan DOM for Tailwind arbitrary color values
 */
function scanTailwindArbitrary() {
    const results: any[] = [];
    const elements = document.querySelectorAll('[class]');

    elements.forEach((el) => {
        if (isInExcludedZone(el)) return;

        const className = el.className;
        if (typeof className !== 'string') return;

        TAILWIND_ARBITRARY_PATTERNS.forEach(({ regex, category }) => {
            // Reset regex lastIndex
            regex.lastIndex = 0;
            const matches = className.match(regex);

            if (matches) {
                matches.forEach(match => {
                    results.push({
                        element: el,
                        type: 'tailwind',
                        property: match.split('-')[0], // bg, text, border, shadow
                        category,
                        value: match,
                        selector: getShortSelector(el),
                        rootSelector: getRootSelector(el),
                    });
                });
            }
        });
    });

    return results;
}

/**
 * Combined scan - returns grouped results
 */
function scanAll() {
    const inlineResults = scanInlineStyles();
    const tailwindResults = scanTailwindArbitrary();
    const allResults = [...inlineResults, ...tailwindResults];

    // Group by root selector
    const byRoot = new Map();

    allResults.forEach((issue: any) => {
        const key = issue.rootSelector;
        if (!byRoot.has(key)) {
            byRoot.set(key, { issues: [], inlineCount: 0, tailwindCount: 0 });
        }
        const group = byRoot.get(key);

        if (issue.type === 'inline') group.inlineCount++;
        else group.tailwindCount++;

        // Keep max 5 examples per root
        if (group.issues.length < 5) {
            group.issues.push(issue);
        }
    });

    // Convert to array sorted by total count
    const grouped = Array.from(byRoot.entries())
        .map(([root, data]) => ({
            root,
            count: data.inlineCount + data.tailwindCount,
            inlineCount: data.inlineCount,
            tailwindCount: data.tailwindCount,
            issues: data.issues,
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, MAX_RESULTS);

    return {
        results: grouped,
        allIssues: allResults,
        totalInline: inlineResults.length,
        totalTailwind: tailwindResults.length,
        totalIssues: allResults.length,
    };
}

// ============================================================================
// NAVIGATION MODE - HIGHLIGHT HELPERS
// ============================================================================

const HIGHLIGHT_STYLE = `
    outline: 2px dashed #ef4444 !important;
    outline-offset: 2px !important;
    position: relative !important;
`;

function addHighlight(element: HTMLElement) {
    if (!element || element.dataset.hardcodeHighlight) return;
    element.dataset.hardcodeHighlight = 'true';
    element.dataset.originalOutline = element.style.outline || '';
    element.dataset.originalOutlineOffset = element.style.outlineOffset || '';
    element.style.outline = '2px dashed #ef4444';
    element.style.outlineOffset = '2px';
}

function removeHighlight(element: HTMLElement) {
    if (!element || !element.dataset.hardcodeHighlight) return;
    element.style.outline = element.dataset.originalOutline || '';
    element.style.outlineOffset = element.dataset.originalOutlineOffset || '';
    delete element.dataset.hardcodeHighlight;
    delete element.dataset.originalOutline;
    delete element.dataset.originalOutlineOffset;
}

function clearAllHighlights() {
    document.querySelectorAll('[data-hardcode-highlight]').forEach(el => {
        removeHighlight(el as HTMLElement);
    });
}

function scrollToElement(element: HTMLElement) {
    if (!element) return;
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    // Flash effect
    const originalBg = element.style.backgroundColor;
    element.style.backgroundColor = 'rgba(239, 68, 68, 0.3)';
    setTimeout(() => {
        element.style.backgroundColor = originalBg;
    }, 1000);
}

// ============================================================================
// REPORT GENERATION
// ============================================================================

function generateMarkdownReport(data: any) {
    if (data.results.length === 0) {
        return '# Hardcoded Styles Report\n\n✅ No hardcoded styles found.';
    }

    const lines = [
        '# Hardcoded Styles Report',
        '',
        `Found **${data.totalIssues}** issues in **${data.results.length}** components/zones.`,
        `- Inline styles: ${data.totalInline}`,
        `- Tailwind arbitrary: ${data.totalTailwind}`,
        '',
    ];

    data.results.forEach((r: any) => {
        const badges = [];
        if (r.inlineCount > 0) badges.push(`${r.inlineCount} inline`);
        if (r.tailwindCount > 0) badges.push(`${r.tailwindCount} tailwind`);

        lines.push(`## ${r.root} (${badges.join(', ')})`);
        lines.push('');
        r.issues.forEach((issue: any) => {
            const typeTag = issue.type === 'inline' ? '🔧' : '🎨';
            lines.push(`- ${typeTag} \`${issue.property}: ${issue.value}\` → ${issue.selector}`);
        });
        if (r.count > r.issues.length) {
            lines.push(`- _...and ${r.count - r.issues.length} more_`);
        }
        lines.push('');
    });

    lines.push('---');
    lines.push('_Generated by HardcodeFinder_');

    return lines.join('\n');
}

// ============================================================================
// COMPONENT
// ============================================================================

export function HardcodeFinder() {
    const [openRoot, setOpenRoot] = useState<number | null>(null);
    const [scanData, setScanData] = useState<ScanData | null>(null);
    const [isScanning, setIsScanning] = useState(false);

    // Navigation mode
    const [navMode, setNavMode] = useState(false);
    const highlightedElements = useRef(new Set());

    // Filters
    const [showFilters, setShowFilters] = useState(false);
    const [filterType, setFilterType] = useState('all'); // 'all' | 'inline' | 'tailwind'
    const [filterCategory, setFilterCategory] = useState('all'); // 'all' | 'background' | 'color' | 'border' | 'shadow'

    // Cleanup highlights on unmount or nav mode off
    useEffect(() => {
        return () => {
            clearAllHighlights();
        };
    }, []);

    useEffect(() => {
        if (!navMode) {
            clearAllHighlights();
            highlightedElements.current.clear();
        } else if (scanData) {
            // Apply highlights to all detected elements
            scanData.allIssues.forEach((issue: any) => {
                if (issue.element) {
                    addHighlight(issue.element as HTMLElement);
                    highlightedElements.current.add(issue.element);
                }
            });
        }
    }, [navMode, scanData]);

    const handleScan = useCallback(() => {
        setIsScanning(true);
        setOpenRoot(null);
        setNavMode(false);
        clearAllHighlights();

        requestAnimationFrame(() => {
            try {
                const data = scanAll();
                setScanData(data);

                if (data.results.length === 0) {
                    toast.success('✅ No se encontraron estilos hardcodeados');
                } else {
                    toast.info(`🔍 ${data.totalIssues} problemas (${data.totalInline} inline, ${data.totalTailwind} Tailwind)`);
                }
            } catch (e) {
                toast.error('❌ Error durante el escaneo');
                console.error('[HardcodeFinder]', e);
            } finally {
                setIsScanning(false);
            }
        });
    }, []);

    const handleCopyReport = useCallback(() => {
        if (!scanData) return;
        const markdown = generateMarkdownReport(scanData);
        navigator.clipboard.writeText(markdown);
        toast.success('📋 Reporte copiado al portapapeles');
    }, [scanData]);

    const handleItemClick = useCallback((issue: any) => {
        if (issue.element) {
            scrollToElement(issue.element as HTMLElement);
        }
    }, []);

    const toggleNavMode = useCallback(() => {
        setNavMode(prev => !prev);
    }, []);

    // Filtered results
    const filteredResults = useMemo(() => {
        if (!scanData) return [];

        return scanData.results.map(group => {
            const filteredIssues = group.issues.filter((issue: any) => {
                if (filterType !== 'all' && issue.type !== filterType) return false;
                if (filterCategory !== 'all' && issue.category !== filterCategory) return false;
                return true;
            });

            // Recalculate counts based on filter
            let inlineCount = 0;
            let tailwindCount = 0;
            group.issues.forEach((issue: any) => {
                const passesFilter =
                    (filterType === 'all' || issue.type === filterType) &&
                    (filterCategory === 'all' || issue.category === filterCategory);
                if (passesFilter) {
                    if (issue.type === 'inline') inlineCount++;
                    else tailwindCount++;
                }
            });

            return {
                ...group,
                issues: filteredIssues,
                inlineCount,
                tailwindCount,
                count: inlineCount + tailwindCount,
            };
        }).filter(group => group.count > 0);
    }, [scanData, filterType, filterCategory]);

    const hasResults = scanData && scanData.results.length > 0;
    const hasFilteredResults = filteredResults.length > 0;

    return (
        <Card className="app-card mt-6">
            <CardHeader className="border-b border-[var(--color-border-default)]">
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-base">
                        <Scan className="w-4 h-4" />
                        Detector de Estilos Hardcodeados
                    </CardTitle>
                    <div className="flex gap-2">
                        {hasResults && (
                            <>
                                <Button
                                    onClick={toggleNavMode}
                                    variant={navMode ? 'default' : 'outline'}
                                    size="sm"
                                    className={`h-8 text-xs ${navMode ? 'btn-primary' : ''}`}
                                    title="Resaltar elementos en el DOM"
                                >
                                    {navMode ? <EyeOff className="w-3 h-3 mr-1" /> : <Eye className="w-3 h-3 mr-1" />}
                                    {navMode ? 'Ocultar' : 'Resaltar'}
                                </Button>
                                <Button
                                    onClick={handleCopyReport}
                                    variant="outline"
                                    size="sm"
                                    className="h-8 text-xs"
                                >
                                    <Copy className="w-3 h-3 mr-1" />
                                    Reporte
                                </Button>
                            </>
                        )}
                        <Button
                            onClick={handleScan}
                            disabled={isScanning}
                            size="sm"
                            className="btn-primary h-8"
                        >
                            <Scan className="w-3 h-3 mr-1" />
                            {isScanning ? 'Escaneando...' : 'Escanear'}
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="pt-4">
                {!scanData && (
                    <p className="text-sm text-[var(--color-text-secondary)]">
                        Escanea el DOM para detectar estilos hardcodeados.
                        <br />
                        <span className="text-xs text-[var(--color-text-muted)]">
                            Detecta: estilos inline y clases Tailwind arbitrary (bg-[#xxx], text-[#xxx]).
                        </span>
                    </p>
                )}

                {scanData && scanData.results.length === 0 && (
                    <div className="flex items-center gap-2 text-[var(--color-success)]">
                        <CheckCircle className="w-4 h-4" />
                        <span className="text-sm">No se encontraron estilos hardcodeados</span>
                    </div>
                )}

                {hasResults && (
                    <div className="space-y-3">
                        {/* Summary */}
                        <div className="flex items-center gap-4 flex-wrap">
                            <div className="flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4 text-amber-500" />
                                <span className="text-sm text-[var(--color-text-primary)]">
                                    <strong>{scanData.totalIssues}</strong> problemas en <strong>{scanData.results.length}</strong> zonas
                                </span>
                            </div>
                            <div className="flex gap-2">
                                <Badge className="badge-warning text-[10px]">
                                    🔧 {scanData.totalInline} inline
                                </Badge>
                                <Badge className="badge-info text-[10px]">
                                    🎨 {scanData.totalTailwind} Tailwind
                                </Badge>
                            </div>
                        </div>

                        {/* Filters */}
                        <div className="border border-[var(--color-border-muted)] rounded-lg">
                            <button
                                onClick={() => setShowFilters(!showFilters)}
                                className="w-full flex items-center justify-between p-2 text-xs text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-muted)]"
                            >
                                <div className="flex items-center gap-2">
                                    <Filter className="w-3 h-3" />
                                    <span>Filtros</span>
                                    {(filterType !== 'all' || filterCategory !== 'all') && (
                                        <Badge className="badge-primary text-[9px]">activos</Badge>
                                    )}
                                </div>
                                {showFilters ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                            </button>

                            {showFilters && (
                                <div className="p-3 border-t border-[var(--color-border-muted)] space-y-3">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="text-xs text-[var(--color-text-muted)] w-12">Tipo:</span>
                                        {['all', 'inline', 'tailwind'].map(t => (
                                            <button
                                                key={t}
                                                onClick={() => setFilterType(t)}
                                                className={`px-2 py-1 text-[10px] rounded ${filterType === t
                                                    ? 'bg-[var(--color-primary)] text-white'
                                                    : 'bg-[var(--color-surface-muted)] text-[var(--color-text-secondary)]'
                                                    }`}
                                            >
                                                {t === 'all' ? 'Todos' : t === 'inline' ? '🔧 Inline' : '🎨 Tailwind'}
                                            </button>
                                        ))}
                                    </div>
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="text-xs text-[var(--color-text-muted)] w-12">Prop:</span>
                                        {['all', 'background', 'color', 'border', 'shadow'].map(c => (
                                            <button
                                                key={c}
                                                onClick={() => setFilterCategory(c)}
                                                className={`px-2 py-1 text-[10px] rounded ${filterCategory === c
                                                    ? 'bg-[var(--color-primary)] text-white'
                                                    : 'bg-[var(--color-surface-muted)] text-[var(--color-text-secondary)]'
                                                    }`}
                                            >
                                                {c === 'all' ? 'Todas' : c}
                                            </button>
                                        ))}
                                    </div>
                                    {(filterType !== 'all' || filterCategory !== 'all') && (
                                        <button
                                            onClick={() => { setFilterType('all'); setFilterCategory('all'); }}
                                            className="flex items-center gap-1 text-[10px] text-[var(--color-danger)] hover:underline"
                                        >
                                            <X className="w-3 h-3" />
                                            Limpiar filtros
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Results List */}
                        <div className="max-h-72 overflow-y-auto space-y-1">
                            {!hasFilteredResults && (
                                <p className="text-xs text-[var(--color-text-muted)] py-2">
                                    No hay resultados con los filtros actuales.
                                </p>
                            )}
                            {filteredResults.map((group: any, idx: number) => (
                                <div
                                    key={idx}
                                    className="border border-[var(--color-border-muted)] rounded-lg overflow-hidden"
                                >
                                    <button
                                        onClick={() => setOpenRoot(openRoot === idx ? null : idx)}
                                        className="w-full flex items-center justify-between p-2 text-left bg-[var(--color-surface-muted)] hover:bg-[var(--color-surface)] text-xs"
                                    >
                                        <div className="flex items-center gap-2">
                                            <FolderOpen className="w-3 h-3 text-[var(--color-text-muted)]" />
                                            <code className="text-[var(--color-primary)] font-mono">{group.root}</code>
                                            <Badge className="badge-warning text-[10px]">{group.count}</Badge>
                                            {group.inlineCount > 0 && group.tailwindCount > 0 && (
                                                <span className="text-[9px] text-[var(--color-text-muted)]">
                                                    ({group.inlineCount}🔧 {group.tailwindCount}🎨)
                                                </span>
                                            )}
                                        </div>
                                        {openRoot === idx ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                    </button>

                                    {openRoot === idx && (
                                        <div className="p-2 space-y-1 bg-[var(--color-surface-elevated)]">
                                            {group.issues.map((issue: any, iidx: number) => (
                                                <div
                                                    key={iidx}
                                                    className="text-[10px] flex gap-2 items-center cursor-pointer hover:bg-[var(--color-surface-muted)] p-1 rounded"
                                                    onClick={() => handleItemClick(issue)}
                                                    title="Click para ir al elemento"
                                                >
                                                    <span className="text-[var(--color-text-muted)]">
                                                        {issue.type === 'inline' ? '🔧' : '🎨'}
                                                    </span>
                                                    <span className="text-[var(--color-text-muted)] w-16 shrink-0">{issue.property}:</span>
                                                    <code className="text-[var(--color-danger)]">{issue.value}</code>
                                                    <span className="text-[var(--color-text-muted)] truncate">→ {issue.selector}</span>
                                                </div>
                                            ))}
                                            {group.count > group.issues.length && (
                                                <div className="text-[10px] text-[var(--color-text-muted)] italic">
                                                    +{group.count - group.issues.length} más...
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* Navigation mode hint */}
                        {navMode && (
                            <p className="text-[10px] text-[var(--color-text-muted)] bg-[var(--color-surface-muted)] p-2 rounded">
                                🎯 Modo navegación activo — los elementos problemáticos están resaltados con borde rojo.
                                Click en un item para hacer scroll al elemento.
                            </p>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

export default HardcodeFinder;
