/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Supabase Debug Utility
 * Enable with VITE_DEBUG_SUPA=1
 * Logs all Supabase calls with stack traces to identify initiators
 */

const DEBUG_SUPA = import.meta.env.VITE_DEBUG_SUPA === '1' || import.meta.env.VITE_DEBUG_SUPA === 'true';

// Store for request tracking
const requestLog: Map<string, { count: number; stacks: string[] }> = new Map();
let requestCounter = 0;

/**
 * Log a Supabase request with stack trace
 */
export function logSupabaseRequest(
    method: string,
    table: string,
    operation: string = 'query',
    extra?: Record<string, any>
): void {
    if (!DEBUG_SUPA) return;

    requestCounter++;
    const timestamp = new Date().toISOString().slice(11, 23);
    const stack = new Error().stack || '';

    // Extract meaningful parts of stack (skip first 2 lines which are this function)
    const stackLines = stack.split('\n').slice(2, 6).join('\n');

    const key = `${method.toUpperCase()} ${table} (${operation})`;

    // Store in map for aggregation
    const existing = requestLog.get(key) || { count: 0, stacks: [] };
    existing.count++;
    if (existing.stacks.length < 3 && !existing.stacks.includes(stackLines)) {
        existing.stacks.push(stackLines);
    }
    requestLog.set(key, existing);

    // Log to console with styling
    console.groupCollapsed(
        `%c[SUPA #${requestCounter}]%c ${method.toUpperCase()} %c${table}%c (${operation})`,
        'color: #ff6b35; font-weight: bold',
        'color: #4ecdc4',
        'color: #ffe66d; font-weight: bold',
        'color: gray'
    );
    console.log('Timestamp:', timestamp);
    if (extra) console.log('Extra:', extra);
    console.log('Stack:\n', stackLines);
    console.groupEnd();
}

/**
 * Print summary of all logged requests
 * Call this from console: window.__supaDebugSummary()
 */
export function printSupabaseSummary(): void {
    console.group('%c[SUPABASE DEBUG SUMMARY]', 'color: #ff6b35; font-size: 14px; font-weight: bold');
    console.log(`Total requests: ${requestCounter}`);
    console.log('\nBY ENDPOINT:');

    // Sort by count descending
    const sorted = [...requestLog.entries()].sort((a, b) => b[1].count - a[1].count);

    for (const [key, { count, stacks }] of sorted) {
        console.groupCollapsed(`%c${key}%c → ${count}x`, 'color: #ffe66d', 'color: #4ecdc4; font-weight: bold');
        stacks.forEach((s, i) => console.log(`Stack ${i + 1}:\n`, s));
        console.groupEnd();
    }

    console.groupEnd();
}

/**
 * Reset the request log
 * Call from console: window.__supaDebugReset()
 */
export function resetSupabaseLog(): void {
    requestLog.clear();
    requestCounter = 0;
    console.log('%c[SUPA DEBUG] Log reset', 'color: #ff6b35');
}

// Expose to window for console access
if (typeof window !== 'undefined' && DEBUG_SUPA) {
    (window as any).__supaDebugSummary = printSupabaseSummary;
    (window as any).__supaDebugReset = resetSupabaseLog;
    console.log('%c[SUPA DEBUG] Enabled. Use __supaDebugSummary() and __supaDebugReset() in console.',
        'color: #ff6b35; font-weight: bold');
}

export { DEBUG_SUPA };
