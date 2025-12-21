#!/usr/bin/env node

/**
 * Design System Audit Script
 * 
 * Automatically detects:
 * - Hardcoded Tailwind classes that should use tokens
 * - Inline styles with hardcoded values
 * - Missing semantic class usage
 * - Orphaned tokens (defined but not consumed)
 * - Missing CSS variables (consumed but not emitted)
 * - Invalid token values
 * 
 * Generates:
 * - reports/design-audit.json (machine-readable)
 * - reports/design-audit.md (human-readable)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { glob } from 'glob';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const SRC_DIR = path.join(ROOT_DIR, 'src');
const REPORTS_DIR = path.join(ROOT_DIR, 'reports');

// Ensure reports directory exists
if (!fs.existsSync(REPORTS_DIR)) {
    fs.mkdirSync(REPORTS_DIR, { recursive: true });
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const HARDCODED_PATTERNS = {
    radius: /\b(rounded-(?:none|sm|md|lg|xl|2xl|3xl|full))\b/g,
    shadow: /\b(shadow-(?:none|sm|md|lg|xl|2xl|inner))\b/g,
    background: /\b(bg-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d+)\b/g,
    text: /\b(text-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d+)\b/g,
    border: /\b(border-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d+)\b/g,
    padding: /\b(p[xytblr]?-\d+)\b/g,
    margin: /\b(m[xytblr]?-\d+)\b/g,
    gap: /\b(gap-(?:x-|y-)?\d+)\b/g,
    width: /\b(w-\d+|w-\[[\d.]+(?:px|rem|em)\])\b/g,
    height: /\b(h-\d+|h-\[[\d.]+(?:px|rem|em)\])\b/g,
};

const INLINE_STYLE_PATTERNS = {
    borderRadius: /borderRadius\s*:\s*['"]?[\d.]+(?:px|rem|em)?['"]?/g,
    boxShadow: /boxShadow\s*:\s*['"][^'"]+['"]/g,
    background: /background(?:Color)?\s*:\s*['"]#[0-9a-fA-F]{3,8}['"]/g,
    color: /color\s*:\s*['"]#[0-9a-fA-F]{3,8}['"]/g,
    padding: /padding(?:Top|Right|Bottom|Left|Inline|Block)?\s*:\s*['"]?[\d.]+(?:px|rem|em)?['"]?/g,
    margin: /margin(?:Top|Right|Bottom|Left|Inline|Block)?\s*:\s*['"]?[\d.]+(?:px|rem|em)?['"]?/g,
};

const SEMANTIC_CLASSES = {
    card: ['.app-card', '.ui-card'],
    panel: ['.app-panel', '.ui-panel'],
    table: ['.ui-table-shell'],
    button: ['.btn', '.btn-primary', '.btn-secondary', '.btn-outline', '.btn-ghost'],
    input: ['.ctrl-field'],
    sidebar: ['.app-sidebar'],
    header: ['.page-header-shell', '.page-header-inner'],
};

// ============================================================================
// FILE SCANNING
// ============================================================================

async function scanFiles() {
    console.log('🔍 Scanning files...');

    const jsxFiles = await glob('**/*.{jsx,tsx,js,ts}', {
        cwd: SRC_DIR,
        ignore: ['**/node_modules/**', '**/dist/**', '**/*.test.*', '**/*.spec.*'],
    });

    const cssFiles = await glob('**/*.css', {
        cwd: SRC_DIR,
        ignore: ['**/node_modules/**', '**/dist/**'],
    });

    console.log(`  Found ${jsxFiles.length} JSX/TSX files`);
    console.log(`  Found ${cssFiles.length} CSS files`);

    return { jsxFiles, cssFiles };
}

// ============================================================================
// JSX/TSX ANALYSIS
// ============================================================================

function analyzeJSXFile(filePath) {
    const content = fs.readFileSync(path.join(SRC_DIR, filePath), 'utf-8');
    const issues = {
        hardcodedClasses: {},
        inlineStyles: {},
        missingSemanticClasses: [],
    };

    // Detect hardcoded Tailwind classes
    for (const [category, pattern] of Object.entries(HARDCODED_PATTERNS)) {
        const matches = content.match(pattern);
        if (matches) {
            issues.hardcodedClasses[category] = matches.length;
        }
    }

    // Detect inline styles
    for (const [property, pattern] of Object.entries(INLINE_STYLE_PATTERNS)) {
        const matches = content.match(pattern);
        if (matches) {
            issues.inlineStyles[property] = matches.length;
        }
    }

    // Detect missing semantic classes (heuristic)
    // Check if file has Card/Panel/Table components but no semantic classes
    const hasCardComponent = /\b(?:Card|Panel)\b/.test(content);
    const hasTableComponent = /\b(?:Table|DataTable)\b/.test(content);
    const hasButtonComponent = /\b(?:Button|btn)\b/.test(content);

    const hasCardClass = /className\s*=\s*["{`][^"}`]*(?:app-card|ui-card)/.test(content);
    const hasTableClass = /className\s*=\s*["{`][^"}`]*ui-table-shell/.test(content);
    const hasButtonClass = /className\s*=\s*["{`][^"}`]*btn(?:-primary|-secondary|-outline|-ghost)?/.test(content);

    if (hasCardComponent && !hasCardClass) {
        issues.missingSemanticClasses.push('card');
    }
    if (hasTableComponent && !hasTableClass) {
        issues.missingSemanticClasses.push('table');
    }
    if (hasButtonComponent && !hasButtonClass) {
        issues.missingSemanticClasses.push('button');
    }

    return issues;
}

// ============================================================================
// CSS ANALYSIS
// ============================================================================

function analyzeCSSFile(filePath) {
    const content = fs.readFileSync(path.join(SRC_DIR, filePath), 'utf-8');
    const cssVars = new Set();
    const semanticClasses = new Set();

    // Extract CSS variable usage: var(--variable-name)
    const varPattern = /var\(--([a-z0-9-]+)(?:,\s*[^)]+)?\)/g;
    let match;
    while ((match = varPattern.exec(content)) !== null) {
        cssVars.add(match[1]);
    }

    // Extract semantic class definitions
    for (const [component, classes] of Object.entries(SEMANTIC_CLASSES)) {
        for (const className of classes) {
            const classPattern = new RegExp(`\\${className}\\s*{`, 'g');
            if (classPattern.test(content)) {
                semanticClasses.add(className);
            }
        }
    }

    return { cssVars: Array.from(cssVars), semanticClasses: Array.from(semanticClasses) };
}

// ============================================================================
// TOKEN ANALYSIS
// ============================================================================

async function analyzeTokens() {
    console.log('🔍 Analyzing design tokens...');

    const designConfigPath = path.join(SRC_DIR, 'components/design/designConfig.ts');
    const designConfigContent = fs.readFileSync(designConfigPath, 'utf-8');

    // Extract token paths from DEFAULT_DESIGN (simplified heuristic)
    const tokenPaths = new Set();

    // Extract from object structure (simplified - would need proper TS parser for 100% accuracy)
    const pathPattern = /(?:colors|layout|typography|chrome|controls|components|focus)\.[\w.]+/g;
    let match;
    while ((match = pathPattern.exec(designConfigContent)) !== null) {
        tokenPaths.add(match[0]);
    }

    // Extract CSS variable names from generateCSSVariables function
    const emittedVars = new Set();
    const varEmissionPattern = /vars\['--([a-z0-9-]+)'\]/g;
    while ((match = varEmissionPattern.exec(designConfigContent)) !== null) {
        emittedVars.add(match[1]);
    }

    console.log(`  Found ${tokenPaths.size} token paths`);
    console.log(`  Found ${emittedVars.size} emitted CSS variables`);

    return { tokenPaths: Array.from(tokenPaths), emittedVars: Array.from(emittedVars) };
}

// ============================================================================
// CROSS-REFERENCE AND REPORTING
// ============================================================================

async function generateReport() {
    console.log('\n📊 Generating Design System Audit Report...\n');

    const { jsxFiles, cssFiles } = await scanFiles();
    const { tokenPaths, emittedVars } = await analyzeTokens();

    // Analyze all files
    const fileIssues = {};
    let totalHardcodedClasses = 0;
    let totalInlineStyles = 0;

    console.log('📝 Analyzing JSX/TSX files...');
    for (const file of jsxFiles) {
        const issues = analyzeJSXFile(file);
        const hardcodedCount = Object.values(issues.hardcodedClasses).reduce((a, b) => a + b, 0);
        const inlineCount = Object.values(issues.inlineStyles).reduce((a, b) => a + b, 0);

        if (hardcodedCount > 0 || inlineCount > 0 || issues.missingSemanticClasses.length > 0) {
            fileIssues[file] = issues;
            totalHardcodedClasses += hardcodedCount;
            totalInlineStyles += inlineCount;
        }
    }

    // Analyze CSS files for variable usage
    const consumedVars = new Set();
    const definedSemanticClasses = new Set();

    console.log('📝 Analyzing CSS files...');
    for (const file of cssFiles) {
        const { cssVars, semanticClasses } = analyzeCSSFile(file);
        cssVars.forEach(v => consumedVars.add(v));
        semanticClasses.forEach(c => definedSemanticClasses.add(c));
    }

    // Cross-reference: find orphaned and missing vars
    const emittedVarsSet = new Set(emittedVars);
    const orphanedVars = Array.from(emittedVars).filter(v => !consumedVars.has(v));
    const missingVars = Array.from(consumedVars).filter(v => !emittedVarsSet.has(v));

    // Top offenders
    const offenders = Object.entries(fileIssues)
        .map(([file, issues]) => {
            const hardcodedCount = Object.values(issues.hardcodedClasses).reduce((a, b) => a + b, 0);
            const inlineCount = Object.values(issues.inlineStyles).reduce((a, b) => a + b, 0);
            return {
                file,
                hardcodedClasses: hardcodedCount,
                inlineStyles: inlineCount,
                total: hardcodedCount + inlineCount,
                issues,
            };
        })
        .sort((a, b) => b.total - a.total)
        .slice(0, 20);

    // Build report
    const report = {
        timestamp: new Date().toISOString(),
        summary: {
            totalFiles: jsxFiles.length + cssFiles.length,
            filesWithIssues: Object.keys(fileIssues).length,
            totalHardcodedClasses,
            totalInlineStyles,
            orphanedVars: orphanedVars.length,
            missingVars: missingVars.length,
            definedSemanticClasses: definedSemanticClasses.size,
        },
        topOffenders: offenders,
        orphanedVars,
        missingVars,
        semanticClasses: {
            defined: Array.from(definedSemanticClasses),
            expected: Object.values(SEMANTIC_CLASSES).flat(),
        },
        tokenAnalysis: {
            totalTokenPaths: tokenPaths.length,
            emittedVars: emittedVars.size,
            consumedVars: consumedVars.size,
        },
    };

    // Write JSON report
    const jsonPath = path.join(REPORTS_DIR, 'design-audit.json');
    fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));
    console.log(`\n✅ JSON report written to: ${jsonPath}`);

    // Generate Markdown report
    generateMarkdownReport(report);

    // Print summary
    console.log('\n📊 AUDIT SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total files analyzed:        ${report.summary.totalFiles}`);
    console.log(`Files with issues:           ${report.summary.filesWithIssues}`);
    console.log(`Total hardcoded classes:     ${report.summary.totalHardcodedClasses}`);
    console.log(`Total inline styles:         ${report.summary.totalInlineStyles}`);
    console.log(`Orphaned CSS variables:      ${report.summary.orphanedVars}`);
    console.log(`Missing CSS variables:       ${report.summary.missingVars}`);
    console.log(`Semantic classes defined:    ${report.summary.definedSemanticClasses}`);
    console.log('='.repeat(60));

    if (offenders.length > 0) {
        console.log('\n🔥 TOP 5 OFFENDERS:');
        offenders.slice(0, 5).forEach((offender, idx) => {
            console.log(`  ${idx + 1}. ${offender.file} (${offender.total} issues)`);
        });
    }

    return report;
}

function generateMarkdownReport(report) {
    const lines = [];

    lines.push('# Design System Audit Report');
    lines.push('');
    lines.push(`**Generated:** ${new Date(report.timestamp).toLocaleString()}`);
    lines.push('');

    // Executive Summary
    lines.push('## Executive Summary');
    lines.push('');
    lines.push(`- **Total files analyzed:** ${report.summary.totalFiles}`);
    lines.push(`- **Files with issues:** ${report.summary.filesWithIssues}`);
    lines.push(`- **Total hardcoded classes:** ${report.summary.totalHardcodedClasses}`);
    lines.push(`- **Total inline styles:** ${report.summary.totalInlineStyles}`);
    lines.push(`- **Orphaned CSS variables:** ${report.summary.orphanedVars}`);
    lines.push(`- **Missing CSS variables:** ${report.summary.missingVars}`);
    lines.push('');

    // Top Offenders
    lines.push('## Top 20 Offenders');
    lines.push('');
    lines.push('Files with the most hardcoded styles that should use design tokens:');
    lines.push('');
    lines.push('| Rank | File | Hardcoded Classes | Inline Styles | Total |');
    lines.push('|------|------|-------------------|---------------|-------|');

    report.topOffenders.forEach((offender, idx) => {
        lines.push(`| ${idx + 1} | \`${offender.file}\` | ${offender.hardcodedClasses} | ${offender.inlineStyles} | ${offender.total} |`);
    });
    lines.push('');

    // Orphaned Variables
    if (report.orphanedVars.length > 0) {
        lines.push('## Orphaned CSS Variables');
        lines.push('');
        lines.push('These variables are emitted by `designConfig.ts` but never consumed in CSS:');
        lines.push('');
        report.orphanedVars.forEach(v => {
            lines.push(`- \`--${v}\``);
        });
        lines.push('');
    }

    // Missing Variables
    if (report.missingVars.length > 0) {
        lines.push('## Missing CSS Variables');
        lines.push('');
        lines.push('These variables are consumed in CSS but never emitted by `designConfig.ts`:');
        lines.push('');
        report.missingVars.forEach(v => {
            lines.push(`- \`--${v}\``);
        });
        lines.push('');
    }

    // Semantic Classes
    lines.push('## Semantic Classes Coverage');
    lines.push('');
    lines.push('### Defined Classes');
    lines.push('');
    report.semanticClasses.defined.forEach(c => {
        lines.push(`- \`${c}\``);
    });
    lines.push('');

    // Actionable Recommendations
    lines.push('## Actionable Recommendations');
    lines.push('');
    lines.push('### Quick Wins (High Impact, Low Effort)');
    lines.push('');
    lines.push('1. **Wrap cards with semantic classes**: Add `.app-card` or `.ui-card` to card components');
    lines.push('2. **Replace hardcoded radius**: Use `rounded-[var(--radius-card)]` instead of `rounded-lg`');
    lines.push('3. **Use button classes**: Apply `.btn-primary`, `.btn-secondary` instead of custom Tailwind');
    lines.push('');
    lines.push('### Medium Effort');
    lines.push('');
    lines.push('1. **Refactor top 10 offenders**: Focus on files with most hardcoded styles');
    lines.push('2. **Add table wrappers**: Wrap tables with `.ui-table-shell` for consistent styling');
    lines.push('3. **Clean up orphaned variables**: Remove unused CSS variables from `designConfig.ts`');
    lines.push('');
    lines.push('### Structural Changes');
    lines.push('');
    lines.push('1. **Create sidebar semantic class**: Add `.app-sidebar` for consistent sidebar styling');
    lines.push('2. **Implement header tokens**: Create token-driven header system');
    lines.push('3. **Establish token naming convention**: Standardize token paths and fallback chains');
    lines.push('');

    const mdPath = path.join(REPORTS_DIR, 'design-audit.md');
    fs.writeFileSync(mdPath, lines.join('\n'));
    console.log(`✅ Markdown report written to: ${mdPath}`);
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
    try {
        await generateReport();
        console.log('\n✨ Audit complete!\n');
    } catch (error) {
        console.error('❌ Audit failed:', error);
        process.exit(1);
    }
}

main();
