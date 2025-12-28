import React, { useState } from 'react';
import { Play, Loader2, Download } from 'lucide-react';
import { Button } from '@/components/ds/Button';
import { componentStyles } from '@/design/componentStyles';
import { supabase } from '@/lib/supabaseClient';
import { localDataClient } from '@/api/localDataClient';
// @ts-ignore - Assuming registry is available
import { runAllTests, runTest, getCriticalIssues, ALL_TESTS, getTestsByCategory } from '@/utils/testRegistry';
import CriticalIssues from './CriticalIssues';
import TestCategory from './TestCategory';
import { toast } from 'sonner';

interface TestsPanelProps {
    addLog: (message: string, type?: 'info' | 'success' | 'error' | 'warning') => void;
}

/**
 * TestsPanel - Actionable test system with critical issues and evidence
 */
export default function TestsPanel({ addLog }: TestsPanelProps) {
    const [isRunning, setIsRunning] = useState(false);
    const [testResults, setTestResults] = useState<Record<string, any>>({});
    const [abortController, setAbortController] = useState<AbortController | null>(null);

    /** @type {TestContext} */
    const context = {
        supabase,
        localDataClient
    };

    const handleRunAll = async () => {
        const controller = new AbortController();
        setAbortController(controller);
        setIsRunning(true);
        setTestResults({});

        addLog('🚀 Running all tests...', 'info');

        try {
            const results = await runAllTests(
                context,
                controller.signal,
                (testId: string, result: any) => {
                    setTestResults(prev => ({ ...prev, [testId]: result }));
                    addLog(
                        `${result.status === 'pass' ? '✅' : result.status === 'fail' ? '❌' : '⚠️'} ${result.title}: ${result.status.toUpperCase()}`,
                        result.status === 'pass' ? 'success' : result.status === 'fail' ? 'error' : 'warning'
                    );
                }
            );

            setTestResults(results);

            const passed = Object.values(results).filter((r: any) => r.status === 'pass').length;
            const failed = Object.values(results).filter((r: any) => r.status === 'fail').length;
            const warned = Object.values(results).filter((r: any) => r.status === 'warn').length;

            addLog(
                `✅ Test suite completed: ${passed} passed, ${warned} warnings, ${failed} failed`,
                failed > 0 ? 'error' : warned > 0 ? 'warning' : 'success'
            );

            toast.success(`Tests completed: ${passed}/${Object.keys(results).length} passed`);
        } catch (error: any) {
            if (error.message !== 'Test aborted') {
                addLog(`❌ Error running tests: ${error.message}`, 'error');
                toast.error('Error running tests');
            }
        } finally {
            setIsRunning(false);
            setAbortController(null);
        }
    };

    const handleCancel = () => {
        if (abortController) {
            abortController.abort();
            addLog('⏹️ Tests cancelled', 'warning');
            toast.info('Tests cancelled');
        }
    };

    const handleRunSingle = async (testId: string) => {
        addLog(`🔍 Running test: ${testId}...`, 'info');

        try {
            const result = await runTest(testId, context);
            setTestResults(prev => ({ ...prev, [testId]: result }));

            addLog(
                `${result.status === 'pass' ? '✅' : result.status === 'fail' ? '❌' : '⚠️'} ${result.title}: ${result.status.toUpperCase()}`,
                result.status === 'pass' ? 'success' : result.status === 'fail' ? 'error' : 'warning'
            );

            return result;
        } catch (error: any) {
            addLog(`❌ Error running test ${testId}: ${error.message}`, 'error');
            toast.error(`Test failed: ${error.message}`);
            throw error;
        }
    };

    const handleExportJson = () => {
        const report = {
            timestamp: new Date().toISOString(),
            totalTests: Object.keys(testResults).length,
            passed: Object.values(testResults).filter((r: any) => r.status === 'pass').length,
            failed: Object.values(testResults).filter((r: any) => r.status === 'fail').length,
            warned: Object.values(testResults).filter((r: any) => r.status === 'warn').length,
            results: testResults
        };

        const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `test-report-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);

        toast.success('Report exported');
    };

    const criticalIssues = getCriticalIssues(testResults);
    const hasResults = Object.keys(testResults).length > 0;

    // Group tests by category
    const storageTests = getTestsByCategory('storage');
    const routesTests = getTestsByCategory('routes');
    const dbTests = getTestsByCategory('db');
    const cleanupTests = getTestsByCategory('cleanup');

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3">
                    <Button
                        variant="primary"
                        onClick={handleRunAll}
                        loading={isRunning}
                        className={componentStyles.buttons?.primary}
                        disabled={isRunning}
                    >
                        {isRunning ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Running...
                            </>
                        ) : (
                            <>
                                <Play className="w-4 h-4 mr-2" />
                                Run All Tests
                            </>
                        )}
                    </Button>

                    {isRunning && (
                        <Button
                            variant="outline"
                            onClick={handleCancel}
                            className={componentStyles.buttons?.outline}
                        >
                            Cancel
                        </Button>
                    )}

                    {hasResults && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleExportJson}
                            className={componentStyles.buttons?.ghost}
                        >
                            <Download className="w-4 h-4 mr-2" />
                            Export JSON
                        </Button>
                    )}
                </div>

                {hasResults && (
                    <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-[var(--color-success)]" />
                            <span className="text-[var(--color-text-secondary)]">
                                {Object.values(testResults).filter((r: any) => r.status === 'pass').length} passed
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-[var(--color-warning)]" />
                            <span className="text-[var(--color-text-secondary)]">
                                {Object.values(testResults).filter((r: any) => r.status === 'warn').length} warnings
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-[var(--color-danger)]" />
                            <span className="text-[var(--color-text-secondary)]">
                                {Object.values(testResults).filter((r: any) => r.status === 'fail').length} failed
                            </span>
                        </div>
                    </div>
                )}
            </div>

            {/* Critical Issues */}
            {criticalIssues.length > 0 && (
                <CriticalIssues issues={criticalIssues} />
            )}

            {/* Test Categories */}
            <div className="space-y-4">
                {dbTests.length > 0 && (
                    <TestCategory
                        title="Database"
                        tests={dbTests}
                        results={testResults}
                        onRunSingle={handleRunSingle}
                        isRunning={isRunning}
                    />
                )}

                {storageTests.length > 0 && (
                    <TestCategory
                        title="Storage"
                        tests={storageTests}
                        results={testResults}
                        onRunSingle={handleRunSingle}
                        isRunning={isRunning}
                    />
                )}

                {routesTests.length > 0 && (
                    <TestCategory
                        title="Routes & Navigation"
                        tests={routesTests}
                        results={testResults}
                        onRunSingle={handleRunSingle}
                        isRunning={isRunning}
                    />
                )}

                {cleanupTests.length > 0 && (
                    <TestCategory
                        title="Cleanup & Legacy"
                        tests={cleanupTests}
                        results={testResults}
                        onRunSingle={handleRunSingle}
                        isRunning={isRunning}
                    />
                )}
            </div>
        </div>
    );
}
