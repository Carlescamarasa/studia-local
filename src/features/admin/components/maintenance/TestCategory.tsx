import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Play, Loader2, CheckCircle2, XCircle, AlertTriangle, Clock } from 'lucide-react';
import { Button } from '@/features/shared/components/ds/Button';
import { componentStyles } from '@/design/componentStyles';
import TestEvidence from './TestEvidence';

interface TestResult {
    id: string;
    title: string;
    status: 'pass' | 'fail' | 'warn';
    whyItMatters?: string;
    metrics?: Record<string, any>;
    evidence?: {
        summary?: string;
        items?: any[];
    };
    actions?: Array<{
        title: string;
        detail?: string;
        file?: string;
    }>;
}

interface TestDefinition {
    id: string;
    title: string;
}

interface TestCategoryProps {
    title: string;
    tests: TestDefinition[];
    results: Record<string, TestResult>;
    onRunSingle: (testId: string) => Promise<any>;
    isRunning: boolean;
}

/**
 * TestCategory - Collapsible category of tests
 */
export default function TestCategory({ title, tests, results, onRunSingle, isRunning }: TestCategoryProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [runningTests, setRunningTests] = useState(new Set<string>());
    const [expandedDetails, setExpandedDetails] = useState(new Set<string>());

    const handleRunSingle = async (testId: string) => {
        setRunningTests(prev => new Set(prev).add(testId));
        try {
            await onRunSingle(testId);
        } finally {
            setRunningTests(prev => {
                const next = new Set(prev);
                next.delete(testId);
                return next;
            });
        }
    };

    const toggleDetails = (testId: string) => {
        setExpandedDetails(prev => {
            const next = new Set(prev);
            if (next.has(testId)) {
                next.delete(testId);
            } else {
                next.add(testId);
            }
            return next;
        });
    };

    const getStatusIcon = (testId: string) => {
        if (runningTests.has(testId)) {
            return <Loader2 className="w-4 h-4 animate-spin text-[var(--color-info)]" />;
        }

        const result = results[testId];
        if (!result) {
            return <Clock className="w-4 h-4 text-[var(--color-text-secondary)]" />;
        }

        switch (result.status) {
            case 'pass':
                return <CheckCircle2 className="w-4 h-4 text-[var(--color-success)]" />;
            case 'fail':
                return <XCircle className="w-4 h-4 text-[var(--color-danger)]" />;
            case 'warn':
                return <AlertTriangle className="w-4 h-4 text-[var(--color-warning)]" />;
            default:
                return <Clock className="w-4 h-4 text-[var(--color-text-secondary)]" />;
        }
    };

    const categoryResults = tests.map(t => results[t.id]).filter(Boolean);
    const allPassed = categoryResults.length > 0 && categoryResults.every(r => r.status === 'pass');
    const anyFailed = categoryResults.some(r => r.status === 'fail');

    return (
        <div className="border border-[var(--color-border-default)] rounded-xl overflow-hidden">
            {/* Header */}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center justify-between p-4 hover:bg-[var(--color-surface-muted)] transition-colors"
                aria-expanded={isExpanded}
            >
                <div className="flex items-center gap-3">
                    {isExpanded ? (
                        <ChevronDown className="w-5 h-5 text-[var(--color-text-secondary)]" />
                    ) : (
                        <ChevronRight className="w-5 h-5 text-[var(--color-text-secondary)]" />
                    )}
                    <span className="font-semibold text-[var(--color-text-primary)]">{title}</span>
                    <span className="text-sm text-[var(--color-text-secondary)]">
                        ({tests.length} {tests.length === 1 ? 'test' : 'tests'})
                    </span>
                </div>

                <div className="flex items-center gap-2">
                    {allPassed && <CheckCircle2 className="w-5 h-5 text-[var(--color-success)]" />}
                    {anyFailed && <XCircle className="w-5 h-5 text-[var(--color-danger)]" />}
                </div>
            </button>

            {/* Content */}
            {isExpanded && (
                <div className="border-t border-[var(--color-border-default)] bg-[var(--color-surface-muted)]/30">
                    <div className="p-4 space-y-2">
                        {tests.map((test) => {
                            const result = results[test.id];
                            const isDetailsExpanded = expandedDetails.has(test.id);
                            const hasEvidence = result?.evidence && (result.evidence.items && result.evidence.items.length > 0 || result.evidence.summary);

                            return (
                                <div
                                    key={test.id}
                                    className="bg-[var(--color-surface)] rounded-lg border border-[var(--color-border-default)] overflow-hidden"
                                >
                                    {/* Test Header */}
                                    <div className="flex items-center justify-between p-3">
                                        <div className="flex items-center gap-3 flex-1">
                                            {getStatusIcon(test.id)}
                                            <div className="flex-1">
                                                <p className="font-medium text-sm text-[var(--color-text-primary)]">
                                                    {test.title}
                                                </p>
                                                {result?.evidence?.summary && (
                                                    <p className={`text-xs mt-1 ${result.status === 'pass' ? 'text-[var(--color-success)]' :
                                                        result.status === 'fail' ? 'text-[var(--color-danger)]' :
                                                            result.status === 'warn' ? 'text-[var(--color-warning)]' :
                                                                'text-[var(--color-text-secondary)]'
                                                        }`}>
                                                        {result.evidence.summary}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {hasEvidence && (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => toggleDetails(test.id)}
                                                    className={`h-8 ${componentStyles.buttons?.ghost}`}
                                                >
                                                    {isDetailsExpanded ? 'Hide Details' : 'View Details'}
                                                </Button>
                                            )}
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleRunSingle(test.id)}
                                                loading={runningTests.has(test.id)}
                                                disabled={isRunning && !runningTests.has(test.id)}
                                                className={`h-8 ${componentStyles.buttons?.ghost}`}
                                                aria-label={`Run ${test.title}`}
                                            >
                                                <Play className="w-3 h-3" />
                                            </Button>
                                        </div>
                                    </div>

                                    {/* Test Details */}
                                    {isDetailsExpanded && result && (
                                        <div className="border-t border-[var(--color-border-default)] bg-[var(--color-surface-muted)]/50 p-4">
                                            {/* Why It Matters */}
                                            {result.whyItMatters && (
                                                <div className="mb-4 p-3 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border-default)]">
                                                    <h4 className="text-xs font-semibold text-[var(--color-text-primary)] mb-1 uppercase tracking-wide">
                                                        Why It Matters
                                                    </h4>
                                                    <p className="text-sm text-[var(--color-text-secondary)]">
                                                        {result.whyItMatters}
                                                    </p>
                                                </div>
                                            )}

                                            {/* Metrics */}
                                            {result.metrics && Object.keys(result.metrics).length > 0 && (
                                                <div className="mb-4">
                                                    <h4 className="text-xs font-semibold text-[var(--color-text-primary)] mb-2 uppercase tracking-wide">
                                                        Metrics
                                                    </h4>
                                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                                        {Object.entries(result.metrics).map(([key, value]) => {
                                                            const isLongValue = typeof value === 'string' && (value.length > 30 || value.startsWith('http'));
                                                            return (
                                                                <div
                                                                    key={key}
                                                                    className={`bg-[var(--color-surface)] p-2 rounded border border-[var(--color-border-default)] min-w-0 ${isLongValue ? 'col-span-2 md:col-span-4' : ''}`}
                                                                >
                                                                    <p className="text-lg font-bold text-[var(--color-text-primary)] break-words overflow-wrap-anywhere">{String(value)}</p>
                                                                    <p className="text-xs text-[var(--color-text-secondary)]">{key}</p>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Evidence */}
                                            {result.evidence && result.evidence.items && result.evidence.items.length > 0 && (
                                                <div className="mb-4">
                                                    <h4 className="text-xs font-semibold text-[var(--color-text-primary)] mb-2 uppercase tracking-wide">
                                                        Evidence
                                                    </h4>
                                                    <TestEvidence
                                                        evidence={[{
                                                            type: 'table',
                                                            data: {
                                                                columns: Object.keys(result.evidence.items[0]),
                                                                rows: result.evidence.items.map(item => Object.values(item))
                                                            }
                                                        }]}
                                                        testId={test.id}
                                                        testName={test.title}
                                                    />
                                                </div>
                                            )}

                                            {/* Actions */}
                                            {result.actions && result.actions.length > 0 && (
                                                <div>
                                                    <h4 className="text-xs font-semibold text-[var(--color-text-primary)] mb-2 uppercase tracking-wide">
                                                        Suggested Actions
                                                    </h4>
                                                    <div className="space-y-2">
                                                        {result.actions.map((action, idx) => (
                                                            <div key={idx} className="flex items-start gap-2 text-xs p-2 rounded bg-[var(--color-surface)] border border-[var(--color-border-default)]">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-primary)] mt-1.5 shrink-0" />
                                                                <div className="flex-1">
                                                                    <p className="font-medium text-[var(--color-text-primary)]">{action.title}</p>
                                                                    {action.detail && (
                                                                        <p className="text-[var(--color-text-secondary)] mt-0.5">{action.detail}</p>
                                                                    )}
                                                                    {action.file && (
                                                                        <p className="text-[var(--color-text-muted)] mt-1 font-mono">{action.file}</p>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
