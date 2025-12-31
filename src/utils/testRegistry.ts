/**
 * Test Registry - Central registry and runner for all maintenance tests
 */

import { testStorageConfig, testStorageRoundtrip } from './tests/storageTests';
import { testMenuCoverage, testDeprecatedRoutes } from './tests/routesTests';
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { describe, it, expect, vi, beforeEach } from 'vitest';
// import { testDatabaseConnection } from './tests/dbTests';
import type { TestDefinition, TestContext, TestResult } from './testContract';

/**
 * All registered tests
 */
export const ALL_TESTS: TestDefinition[] = [
    // Storage Tests (2)
    {
        id: 'storage-config',
        title: 'Storage Configuration Sanity',
        category: 'storage',
        defaultSeverity: 'critical',
        run: testStorageConfig
    },
    {
        id: 'storage-roundtrip',
        title: 'Upload/Download Roundtrip',
        category: 'storage',
        defaultSeverity: 'high',
        run: testStorageRoundtrip
    },

    // Routes Tests (2)
    {
        id: 'routes-menu-coverage',
        title: 'Menu Coverage Audit',
        category: 'routes',
        defaultSeverity: 'high',
        run: testMenuCoverage
    },
    {
        id: 'cleanup-deprecated-routes',
        title: 'Deprecated Routes Detector',
        category: 'cleanup',
        defaultSeverity: 'low',
        run: testDeprecatedRoutes
    },

    /*
    // Database Tests (1)
    {
        id: 'db-connection',
        title: 'Database Connection & Query',
        category: 'db',
        defaultSeverity: 'critical',
        run: testDatabaseConnection
    },
    */
];

/**
 * Get tests by category
 */
export function getTestsByCategory(category: string): TestDefinition[] {
    return ALL_TESTS.filter(test => test.category === category);
}

/**
 * Get test by ID
 */
export function getTestById(id: string): TestDefinition | undefined {
    return ALL_TESTS.find(test => test.id === id);
}

/**
 * Run a single test
 */
export async function runTest(
    testId: string,
    context: TestContext,
    signal?: AbortSignal
): Promise<TestResult> {
    const test = getTestById(testId);

    if (!test) {
        throw new Error(`Test not found: ${testId}`);
    }

    if (signal?.aborted) {
        throw new Error('Test aborted');
    }

    const ctx: TestContext = {
        ...context,
        abort: signal
    };

    return await test.run(ctx);
}

/**
 * Run multiple tests
 */
export async function runTests(
    testIds: string[],
    context: TestContext,
    signal?: AbortSignal,
    onProgress?: (testId: string, result: TestResult) => void
): Promise<Record<string, TestResult>> {
    const results: Record<string, TestResult> = {};

    for (const testId of testIds) {
        if (signal?.aborted) {
            break;
        }

        try {
            const result = await runTest(testId, context, signal);
            results[testId] = result;

            if (onProgress) {
                onProgress(testId, result);
            }
        } catch (error: any) {
            // If test throws, create a fail result
            results[testId] = {
                id: testId,
                title: getTestById(testId)?.title || testId,
                status: 'fail',
                severity: 'high',
                whyItMatters: 'Test execution failed',
                evidence: {
                    summary: `Error: ${error.message}`,
                    items: []
                },
                actions: [],
                duration: 0,
                debug: error
            };
        }
    }

    return results;
}

/**
 * Run all tests
 */
export async function runAllTests(
    context: TestContext,
    signal?: AbortSignal,
    onProgress?: (testId: string, result: TestResult) => void
): Promise<Record<string, TestResult>> {
    const testIds = ALL_TESTS.map(t => t.id);
    return runTests(testIds, context, signal, onProgress);
}

/**
 * Get critical issues from test results
 * Returns up to 5 most critical issues
 */
export function getCriticalIssues(results: Record<string, TestResult>): TestResult[] {
    const issues = Object.values(results).filter(r => r.status === 'fail' || r.status === 'warn');

    // Sort by severity (critical > high > medium > low) then by status (fail > warn)
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    const statusOrder = { fail: 0, warn: 1, pass: 2, skip: 3 };

    issues.sort((a, b) => {
        const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
        if (severityDiff !== 0) return severityDiff;

        return statusOrder[a.status] - statusOrder[b.status];
    });

    return issues.slice(0, 5);
}
