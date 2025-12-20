/**
 * Design System Walkthrough Validation
 * 
 * Run this in the browser console on any page with PageHeader to validate
 * that design tokens are properly wired and produce visible changes.
 * 
 * Usage: 
 *   const { runDesignWalkthrough } = await import('/src/utils/runDesignWalkthrough.js');
 *   const results = await runDesignWalkthrough();
 *   console.table(results);
 */

const CHECKS = [
    {
        id: 1,
        name: 'Font Size Base',
        cssVar: '--font-size-base',
        selector: 'html',
        property: 'fontSize',
        testValue: '20px',
        description: 'Typography base scales all rem units'
    },
    {
        id: 2,
        name: 'Sidebar Width',
        cssVar: '--sidebar-width',
        selector: '.sidebar-width, [data-sidebar-abierto="true"] aside',
        property: 'width',
        testValue: '20rem',
        description: 'Sidebar width token'
    },
    {
        id: 3,
        name: 'Page Padding X',
        cssVar: '--page-padding-x',
        selector: '.page-container',
        property: 'paddingLeft',
        testValue: '3rem',
        description: 'Page container horizontal padding'
    },
    {
        id: 4,
        name: 'Page Max Width',
        cssVar: '--page-max-width',
        selector: '.page-container',
        property: 'maxWidth',
        testValue: '800px',
        description: 'Page container max width'
    },
    {
        id: 5,
        name: 'Header Height',
        cssVar: '--header-height',
        // Special handling - uses findHeaderElement()
        selector: 'HEADER_SPECIAL',
        property: 'height', // We use getBoundingClientRect().height
        testValue: '128px', // Use 128px to ensure delta >10 even for tall headers
        description: 'Header min-height via .header-modern'
    }
];

/**
 * Wait for 2 animation frames
 */
function waitFrames() {
    return new Promise(resolve => {
        requestAnimationFrame(() => {
            requestAnimationFrame(resolve);
        });
    });
}

/**
 * Find the real header element with .header-modern
 * Priority: data-testid="page-header" > .header-modern
 * Selects visible elements closest to viewport top
 */
function findHeaderElement() {
    // 1. Try data-testid first
    const byTestId = document.querySelector('[data-testid="page-header"]');
    if (byTestId && byTestId.getClientRects().length > 0) {
        return { element: byTestId, usedSelector: '[data-testid="page-header"]' };
    }

    // 2. Try .header-modern (may have multiple matches)
    const headerModerns = document.querySelectorAll('.header-modern');
    if (headerModerns.length === 0) {
        return { element: null, usedSelector: null };
    }

    // Find visible elements and select the one closest to top
    let bestElement = null;
    let bestTop = Infinity;
    let usedSelector = '.header-modern';

    for (const el of headerModerns) {
        // Check if visible
        if (el.getClientRects().length === 0) continue;

        const rect = el.getBoundingClientRect();
        // Skip elements with negative top (scrolled out) or zero height
        if (rect.height === 0) continue;

        // Prefer elements with non-negative top closest to 0
        const top = rect.top >= 0 ? rect.top : Infinity;
        if (top < bestTop) {
            bestTop = top;
            bestElement = el;
        }
    }

    return { element: bestElement, usedSelector };
}

/**
 * Find element using selector with fallback
 */
function findElement(selector) {
    const selectors = selector.split(', ');
    for (const sel of selectors) {
        const el = document.querySelector(sel.trim());
        if (el) return { element: el, usedSelector: sel.trim() };
    }
    return { element: null, usedSelector: null };
}

/**
 * Get computed style value
 */
function getComputedValue(element, property) {
    if (!element) return null;
    const computed = getComputedStyle(element);
    return computed[property] || null;
}

/**
 * Run Check 5 (Header Height) with special logic
 */
async function runCheck5() {
    // 200px ensures we exceed content natural height (~156px on /usuarios)
    const TEST_VALUE_PX = 200;
    const DELTA_THRESHOLD = 10;
    const CLOSENESS_TOLERANCE = 20;

    const result = {
        id: 5,
        name: 'Header Height',
        status: 'pending',
        before: null,
        after: null,
        ok: false,
        reason: '',
        selector: null
    };

    // Find header element
    const { element, usedSelector } = findHeaderElement();
    result.selector = usedSelector;

    if (!element) {
        result.status = 'skipped';
        result.reason = 'No se encontró page header (data-testid="page-header" o .header-modern) en esta ruta';
        return result;
    }

    const root = document.documentElement;

    // Get original value for cleanup
    const originalValue = root.style.getPropertyValue('--header-height');

    try {
        // Capture BEFORE using getBoundingClientRect (more reliable)
        const beforeHeight = Math.round(element.getBoundingClientRect().height);
        result.before = `${beforeHeight}px`;

        // Apply test value
        root.style.setProperty('--header-height', `${TEST_VALUE_PX}px`);

        // Force reflow and wait 2 frames
        void element.offsetHeight;
        await waitFrames();

        // Capture AFTER
        const afterHeight = Math.round(element.getBoundingClientRect().height);
        result.after = `${afterHeight}px`;

        // Determine pass/fail
        // OK if: delta >= threshold AND afterHeight is close to TEST_VALUE_PX
        const delta = Math.abs(afterHeight - beforeHeight);
        const closeToTestValue = Math.abs(afterHeight - TEST_VALUE_PX) <= CLOSENESS_TOLERANCE;

        result.ok = delta >= DELTA_THRESHOLD && closeToTestValue;

        if (result.ok) {
            result.status = 'pass';
            result.reason = `height: ${beforeHeight}px → ${afterHeight}px (Δ${delta}px, target=${TEST_VALUE_PX}px)`;
        } else if (delta > 0 && !closeToTestValue) {
            result.status = 'fail';
            result.reason = `height changed but not close to target: ${beforeHeight}px → ${afterHeight}px (target=${TEST_VALUE_PX}px, diff=${Math.abs(afterHeight - TEST_VALUE_PX)}px)`;
        } else if (delta < DELTA_THRESHOLD) {
            result.status = 'fail';
            result.reason = `Delta too small: ${beforeHeight}px → ${afterHeight}px (Δ${delta}px < ${DELTA_THRESHOLD}px threshold)`;
        } else {
            result.status = 'fail';
            result.reason = `No change: height stayed at ${beforeHeight}px. Check if .header-modern has min-height: var(--header-height)`;
        }
    } finally {
        // Restore original value (cleanup) - always runs even if error
        if (originalValue) {
            root.style.setProperty('--header-height', originalValue);
        } else {
            root.style.removeProperty('--header-height');
        }
    }

    return result;
}


/**
 * Run a single check (generic)
 */
async function runCheck(check) {
    // Check 5 has special handling
    if (check.id === 5) {
        return runCheck5();
    }

    const result = {
        id: check.id,
        name: check.name,
        status: 'pending',
        before: null,
        after: null,
        ok: false,
        reason: '',
        selector: null
    };

    // Find element
    const { element, usedSelector } = findElement(check.selector);
    result.selector = usedSelector;

    if (!element) {
        result.status = 'skipped';
        result.reason = `Selector not found: ${check.selector}`;
        return result;
    }

    const root = document.documentElement;
    const originalValue = root.style.getPropertyValue(check.cssVar);

    // Capture BEFORE
    result.before = getComputedValue(element, check.property);

    // Apply test value
    root.style.setProperty(check.cssVar, check.testValue);

    // Wait for layout
    void element.offsetHeight;
    await waitFrames();

    // Capture AFTER
    result.after = getComputedValue(element, check.property);

    // Restore
    if (originalValue) {
        root.style.setProperty(check.cssVar, originalValue);
    } else {
        root.style.removeProperty(check.cssVar);
    }

    // Determine pass/fail
    result.ok = result.before !== result.after;

    if (result.ok) {
        result.status = 'pass';
        result.reason = `${check.property}: ${result.before} → ${result.after}`;
    } else {
        result.status = 'fail';
        result.reason = `No change: ${check.property} stayed at ${result.before}`;
    }

    return result;
}

/**
 * Run all walkthrough checks
 */
async function runDesignWalkthrough() {
    console.log('🎨 Design System Walkthrough - Starting validation...\n');

    const results = [];

    for (const check of CHECKS) {
        console.log(`  Check ${check.id}: ${check.name}...`);
        const result = await runCheck(check);
        results.push(result);

        const icon = result.status === 'pass' ? '✅' : result.status === 'skipped' ? '⏭️' : '❌';
        console.log(`    ${icon} ${result.status.toUpperCase()}: ${result.reason}`);
        if (result.selector) {
            console.log(`       Selector: ${result.selector}`);
        }
    }

    console.log('\n📊 Summary:');
    const passed = results.filter(r => r.status === 'pass').length;
    const failed = results.filter(r => r.status === 'fail').length;
    const skipped = results.filter(r => r.status === 'skipped').length;
    console.log(`  ✅ Passed: ${passed}/${results.length}`);
    console.log(`  ❌ Failed: ${failed}/${results.length}`);
    console.log(`  ⏭️ Skipped: ${skipped}/${results.length}`);

    return results;
}

// Expose to global scope for console usage
if (typeof window !== 'undefined') {
    window.runDesignWalkthrough = runDesignWalkthrough;
}

export { runDesignWalkthrough, runCheck, CHECKS };

