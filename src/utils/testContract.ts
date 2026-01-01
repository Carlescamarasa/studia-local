/* eslint-disable @typescript-eslint/no-explicit-any */


// Dummy implementation to satisfy imports in other files
// since we cannot run vitest in this environment

export interface TestContext {
    name: string;
    [key: string]: any;
}

export interface TestResult {
    name: string;
    passed: boolean;
    duration?: number;
    error?: any;
    actions?: any[];
    evidence?: any[];
    critical?: boolean;
}

export const createTestResult = (name: string, passed: boolean, options: any = {}): TestResult => ({
    name,
    passed,
    ...options
});

export const createAction = (name: string, details?: any) => ({
    type: 'ACTION',
    name,
    details,
    timestamp: Date.now()
});

export const createEvidence = (name: string, data?: any) => ({
    type: 'EVIDENCE',
    name,
    data,
    timestamp: Date.now()
});

export const testContract = {
    // placeholder
};
