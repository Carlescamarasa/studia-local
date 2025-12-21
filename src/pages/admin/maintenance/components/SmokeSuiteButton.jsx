import React, { useState } from 'react';
import { Zap, Loader2, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ds/Button';
import { Card, CardContent } from '@/components/ds';
import { componentStyles } from '@/design/componentStyles';

/**
 * SmokeSuiteButton - Run all critical tests with one click
 */
export default function SmokeSuiteButton({ tests = [], onComplete }) {
    const [isRunning, setIsRunning] = useState(false);
    const [results, setResults] = useState(null);

    const handleRunSmokeSuite = async () => {
        setIsRunning(true);
        setResults(null);

        const testResults = {};
        let passed = 0;
        let failed = 0;

        for (const test of tests) {
            try {
                const result = await test.fn();
                testResults[test.id] = {
                    passed: result.passed,
                    message: result.message,
                    duration: result.duration
                };

                if (result.passed) {
                    passed++;
                } else {
                    failed++;
                }
            } catch (error) {
                testResults[test.id] = {
                    passed: false,
                    message: error.message || 'Test failed',
                    error: true
                };
                failed++;
            }
        }

        const finalResults = {
            passed,
            failed,
            total: tests.length,
            details: testResults
        };

        setResults(finalResults);
        setIsRunning(false);

        if (onComplete) {
            onComplete(finalResults);
        }
    };

    const allPassed = results && results.failed === 0;
    const anyFailed = results && results.failed > 0;

    return (
        <div className="space-y-4">
            <Card className="app-card border-[var(--color-primary)]/30 bg-[var(--color-primary)]/5">
                <CardContent className="p-6">
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                            <h3 className="font-semibold text-lg text-[var(--color-text-primary)] mb-2 flex items-center gap-2">
                                <Zap className="w-5 h-5 text-[var(--color-primary)]" />
                                Smoke Suite
                            </h3>
                            <p className="text-sm text-[var(--color-text-secondary)] mb-4">
                                Ejecuta todos los tests críticos del sistema: conexión a BD, storage, enlaces y autenticación.
                            </p>

                            {results && (
                                <div className="flex items-center gap-4 text-sm">
                                    <div className="flex items-center gap-2">
                                        <CheckCircle2 className="w-4 h-4 text-[var(--color-success)]" />
                                        <span className="text-[var(--color-success)] font-medium">{results.passed} passed</span>
                                    </div>
                                    {results.failed > 0 && (
                                        <div className="flex items-center gap-2">
                                            <XCircle className="w-4 h-4 text-[var(--color-danger)]" />
                                            <span className="text-[var(--color-danger)] font-medium">{results.failed} failed</span>
                                        </div>
                                    )}
                                    <span className="text-[var(--color-text-secondary)]">
                                        of {results.total} tests
                                    </span>
                                </div>
                            )}
                        </div>

                        <Button
                            variant="primary"
                            size="lg"
                            onClick={handleRunSmokeSuite}
                            loading={isRunning}
                            className={`${componentStyles.buttons.primary} min-w-[140px]`}
                            aria-label="Run smoke suite"
                        >
                            {isRunning ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Running...
                                </>
                            ) : (
                                <>
                                    <Zap className="w-4 h-4 mr-2" />
                                    Run Suite
                                </>
                            )}
                        </Button>
                    </div>

                    {/* Results Summary */}
                    {results && (
                        <div className={`mt-4 p-4 rounded-xl border ${allPassed
                            ? 'bg-[var(--color-success)]/10 border-[var(--color-success)]/30'
                            : anyFailed
                                ? 'bg-[var(--color-danger)]/10 border-[var(--color-danger)]/30'
                                : 'bg-[var(--color-surface-muted)] border-[var(--color-border-default)]'
                            }`}>
                            <div className="flex items-start gap-3">
                                {allPassed ? (
                                    <CheckCircle2 className="w-5 h-5 text-[var(--color-success)] mt-0.5" />
                                ) : anyFailed ? (
                                    <AlertTriangle className="w-5 h-5 text-[var(--color-danger)] mt-0.5" />
                                ) : null}

                                <div className="flex-1">
                                    <p className={`font-medium ${allPassed ? 'text-[var(--color-success)]' : 'text-[var(--color-danger)]'
                                        }`}>
                                        {allPassed
                                            ? '✅ All tests passed! System is healthy.'
                                            : `⚠️ ${results.failed} test(s) failed. Check logs for details.`
                                        }
                                    </p>

                                    {anyFailed && (
                                        <div className="mt-2 space-y-1">
                                            {Object.entries(results.details).map(([testId, result]) => {
                                                if (!result.passed) {
                                                    const test = tests.find(t => t.id === testId);
                                                    return (
                                                        <p key={testId} className="text-xs text-[var(--color-text-secondary)]">
                                                            • {test?.name || testId}: {result.message}
                                                        </p>
                                                    );
                                                }
                                                return null;
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
