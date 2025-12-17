import { useRef, useCallback, useEffect } from 'react';

/**
 * Hook to synchronize a CSS custom property with the distance from 
 * viewport bottom to an anchor element's top edge.
 * 
 * Uses requestAnimationFrame for frame-by-frame tracking during transitions.
 * 
 * @param {Object} options
 * @param {React.RefObject} options.anchorRef - Ref to the anchor element (chevron/footer top bar)
 * @param {string} [options.cssVarName='--footer-offset'] - CSS variable name to update
 * @param {boolean} [options.enabled=true] - Whether to enable the hook
 */
export function useDockToFooterOffset({ anchorRef, cssVarName = '--footer-offset', enabled = true }) {
    const rafIdRef = useRef(null);
    const isTrackingRef = useRef(false);

    // Calculate offset from viewport bottom to anchor's top
    const calculateOffset = useCallback(() => {
        if (!anchorRef?.current) return 0;

        const anchorRect = anchorRef.current.getBoundingClientRect();
        const viewportHeight = window.innerHeight;

        // Distance from anchor's top to viewport bottom
        const offset = viewportHeight - anchorRect.top;

        // Clamp to non-negative, rounded value
        return Math.max(0, Math.round(offset));
    }, [anchorRef]);

    // Update the CSS custom property
    const updateCSSVar = useCallback((offset) => {
        document.documentElement.style.setProperty(cssVarName, `${offset}px`);
    }, [cssVarName]);

    // Single sync - calculate and update immediately
    const syncNow = useCallback(() => {
        if (!enabled) return;
        const offset = calculateOffset();
        updateCSSVar(offset);
        return offset;
    }, [enabled, calculateOffset, updateCSSVar]);

    // Start rAF loop for frame-by-frame tracking during transitions
    const startTracking = useCallback(() => {
        if (isTrackingRef.current) return;
        isTrackingRef.current = true;

        const tick = () => {
            if (!isTrackingRef.current) return;

            const offset = calculateOffset();
            updateCSSVar(offset);

            rafIdRef.current = requestAnimationFrame(tick);
        };

        rafIdRef.current = requestAnimationFrame(tick);
    }, [calculateOffset, updateCSSVar]);

    // Stop the rAF loop
    const stopTracking = useCallback(() => {
        isTrackingRef.current = false;
        if (rafIdRef.current) {
            cancelAnimationFrame(rafIdRef.current);
            rafIdRef.current = null;
        }
        // Final sync to ensure we're at the correct position
        syncNow();
    }, [syncNow]);

    // Attach transition listeners to the footer element
    const attachTransitionListeners = useCallback((footerElement) => {
        if (!footerElement) return () => { };

        const handleTransitionStart = () => {
            startTracking();
        };

        const handleTransitionEnd = (e) => {
            // Only stop if the transition is on a relevant property
            if (e.propertyName === 'height' || e.propertyName === 'max-height' || e.propertyName === 'transform') {
                stopTracking();
            }
        };

        footerElement.addEventListener('transitionstart', handleTransitionStart);
        footerElement.addEventListener('transitionrun', handleTransitionStart);
        footerElement.addEventListener('transitionend', handleTransitionEnd);

        return () => {
            footerElement.removeEventListener('transitionstart', handleTransitionStart);
            footerElement.removeEventListener('transitionrun', handleTransitionStart);
            footerElement.removeEventListener('transitionend', handleTransitionEnd);
        };
    }, [startTracking, stopTracking]);

    // Initial sync on mount and when enabled changes
    useEffect(() => {
        if (enabled) {
            syncNow();
        }
    }, [enabled, syncNow]);

    // Sync on window resize
    useEffect(() => {
        if (!enabled) return;

        const handleResize = () => {
            syncNow();
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [enabled, syncNow]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (rafIdRef.current) {
                cancelAnimationFrame(rafIdRef.current);
            }
        };
    }, []);

    return {
        syncNow,
        startTracking,
        stopTracking,
        attachTransitionListeners,
        calculateOffset,
    };
}

export default useDockToFooterOffset;
