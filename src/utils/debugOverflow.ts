/**
 * Debug utility to detect horizontal overflow culprits
 * Usage: import and call debugHorizontalOverflow() in your component
 */

export function debugHorizontalOverflow() {
    const results: any[] = [];
    const elements = document.querySelectorAll('*');
    const viewportWidth = window.innerWidth;

    elements.forEach((el) => {
        const rect = el.getBoundingClientRect();
        const styles = window.getComputedStyle(el);

        // Check if element extends beyond viewport
        if (rect.right > viewportWidth || rect.left < 0) {
            const overflow = Math.max(
                rect.right - viewportWidth,
                Math.abs(rect.left)
            );

            results.push({
                element: el,
                tagName: el.tagName,
                className: el.className,
                id: el.id,
                overflow: overflow,
                rect: {
                    left: rect.left,
                    right: rect.right,
                    width: rect.width
                },
                styles: {
                    width: styles.width,
                    maxWidth: styles.maxWidth,
                    position: styles.position,
                    transform: styles.transform,
                    margin: styles.margin,
                    padding: styles.padding
                }
            });
        }
    });

    // Sort by overflow amount (descending)
    results.sort((a, b) => b.overflow - a.overflow);

    // Log top 5 culprits
    console.group('🔍 Horizontal Overflow Debug');
    console.log(`Viewport width: ${viewportWidth}px`);
    console.log(`Total elements overflowing: ${results.length}`);
    console.log('\n📊 Top 5 culprits:');

    results.slice(0, 5).forEach((item, index) => {
        console.group(`${index + 1}. ${item.tagName}${item.className ? '.' + item.className.split(' ').join('.') : ''}`);
        console.log('Overflow amount:', item.overflow.toFixed(2) + 'px');
        console.log('Element:', item.element);
        console.log('Rect:', item.rect);
        console.log('Styles:', item.styles);
        console.groupEnd();

        // Highlight element with red outline
        if (item.element instanceof HTMLElement) {
            item.element.style.outline = '3px solid red';
            item.element.style.outlineOffset = '-3px';
        }
    });

    console.groupEnd();

    return results;
}

/**
 * Remove debug highlights
 */
export function clearDebugHighlights() {
    document.querySelectorAll('*').forEach(el => {
        if (el instanceof HTMLElement) {
            el.style.outline = '';
            el.style.outlineOffset = '';
        }
    });
}

/**
 * Auto-run debug on window resize (debounced)
 */
export function enableAutoDebug() {
    let timeout: any;
    const handler = () => {
        clearTimeout(timeout);
        timeout = setTimeout(() => {
            clearDebugHighlights();
            debugHorizontalOverflow();
        }, 300);
    };

    window.addEventListener('resize', handler);

    // Run immediately
    debugHorizontalOverflow();

    return () => window.removeEventListener('resize', handler);
}
