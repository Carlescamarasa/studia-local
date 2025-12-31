/**
 * Test Contract - TypeScript definitions for actionable test system
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

export type Severity = "critical" | "high" | "medium" | "low";
export type Status = "pass" | "warn" | "fail" | "skip";

export interface TestAction {
    title: string;
    detail?: string;
    command?: string;
    file?: string;
    route?: string;
    link?: string;
}

export interface TestEvidence {
    summary: string;
    items?: Array<Record<string, any>>;
    raw?: any;
}

export interface TestResult {
    id: string;
    title: string;
    status: Status;
    severity: Severity;
    whyItMatters: string;
    metrics?: Record<string, number | string>;
    evidence?: TestEvidence;
    actions?: TestAction[];
    debug?: any;
    duration?: number;
}

export interface TestDefinition {
    id: string;
    title: string;
    category: "routes" | "integrity" | "storage" | "db" | "seeds" | "cleanup" | "design-system";
    defaultSeverity: Severity;
    run: (ctx: TestContext) => Promise<TestResult>;
}

export interface TestContext {
    supabase: any;
    localDataClient: any;
    router?: any;
    abort?: AbortSignal;
}

/**
 * Helper to create test result
 */
export function createTestResult(data: Partial<TestResult> & { id: string; title: string; status: Status; severity: Severity; whyItMatters: string }): TestResult {
    return {
        ...data,
        duration: data.duration || 0,
        metrics: data.metrics || {},
        evidence: data.evidence,
        actions: data.actions || [],
        debug: data.debug,
    };
}

/**
 * Helper to create test action
 */
export function createAction(title: string, detail?: string, extra?: Partial<TestAction>): TestAction {
    return {
        title,
        detail,
        ...extra,
    };
}

/**
 * Helper to create evidence
 */
export function createEvidence(summary: string, items?: Array<Record<string, any>>, raw?: any): TestEvidence {
    return {
        summary,
        items,
        raw,
    };
}
