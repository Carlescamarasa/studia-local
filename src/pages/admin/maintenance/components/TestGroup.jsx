import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Play, Loader2, CheckCircle2, XCircle, Clock, AlertTriangle, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ds/Button';
import { componentStyles } from '@/design/componentStyles';
// Legacy component - TestStatus removed (was from old testContract.js)
import TestEvidence from './TestEvidence';

/**
 * TestGroup - Accordion component for test categories with detailed evidence
 */
export default function TestGroup({ title, icon: Icon, tests = [], onRunAll, onRunSingle }) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [runningTests, setRunningTests] = useState(new Set());
    const [testResults, setTestResults] = useState({});
    const [expandedDetails, setExpandedDetails] = useState(new Set());

    const handleRunAll = async () => {
        if (!onRunAll) return;

        const testIds = tests.map(t => t.id);
        setRunningTests(new Set(testIds));

        try {
            const results = await onRunAll(tests);
            setTestResults(prev => ({ ...prev, ...results }));
        } finally {
            setRunningTests(new Set());
        }
    };

    const handleRunSingle = async (test) => {
        if (!onRunSingle) return;

        setRunningTests(prev => new Set(prev).add(test.id));

        try {
            const result = await onRunSingle(test);
            setTestResults(prev => ({ ...prev, [test.id]: result }));
        } finally {
            setRunningTests(prev => {
                const next = new Set(prev);
                next.delete(test.id);
                return next;
            });
        }
    };

    const toggleDetails = (testId) => {
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

    const getStatusIcon = (testId) => {
        if (runningTests.has(testId)) {
            return <Loader2 className="w-4 h-4 animate-spin text-[var(--color-info)]" />;
        }

        const result = testResults[testId];
        if (!result) {
            return <Clock className="w-4 h-4 text-[var(--color-text-secondary)]" />;
        }

        switch (result.status) {
            case TestStatus.PASS:
                return <CheckCircle2 className="w-4 h-4 text-[var(--color-success)]" />;
            case TestStatus.FAIL:
                return <XCircle className="w-4 h-4 text-[var(--color-danger)]" />;
            case TestStatus.WARNING:
                return <AlertTriangle className="w-4 h-4 text-[var(--color-warning)]" />;
            default:
                return <Clock className="w-4 h-4 text-[var(--color-text-secondary)]" />;
        }
    };

    const allPassed = tests.length > 0 && tests.every(t => testResults[t.id]?.status === TestStatus.PASS);
    const anyFailed = tests.some(t => testResults[t.id]?.status === TestStatus.FAIL);
    const isRunning = runningTests.size > 0;

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
                    {Icon && <Icon className="w-5 h-5 text-[var(--color-primary)]" />}
                    <span className="font-semibold text-[var(--color-text-primary)]">{title}</span>
                    <span className="text-sm text-[var(--color-text-secondary)]">
                        ({tests.length} {tests.length === 1 ? 'test' : 'tests'})
                    </span>
                </div>

                <div className="flex items-center gap-2">
                    {allPassed && (
                        <CheckCircle2 className="w-5 h-5 text-[var(--color-success)]" />
                    )}
                    {anyFailed && (
                        <XCircle className="w-5 h-5 text-[var(--color-danger)]" />
                    )}
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                            e.stopPropagation();
                            handleRunAll();
                        }}
                        loading={isRunning}
                        className={`h - 8 ${componentStyles.buttons.outline} `}
                        aria-label={`Run all ${title} `}
                    >
                        <Play className="w-3 h-3 mr-1" />
                        Run All
                    </Button>
                </div>
            </button>

            {/* Content */}
            {isExpanded && (
                <div className="border-t border-[var(--color-border-default)] bg-[var(--color-surface-muted)]/30">
                    <div className="p-4 space-y-2">
                        {tests.map((test) => {
                            const result = testResults[test.id];
                            const isDetailsExpanded = expandedDetails.has(test.id);
                            const hasEvidence = result?.evidence && result.evidence.length > 0;

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
                                                    {test.name}
                                                </p>
                                                {test.description && (
                                                    <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
                                                        {test.description}
                                                    </p>
                                                )}
                                                {result?.summary && (
                                                    <p className={`text - xs mt - 1 ${result.status === TestStatus.PASS ? 'text-[var(--color-success)]' :
                                                        result.status === TestStatus.FAIL ? 'text-[var(--color-danger)]' :
                                                            result.status === TestStatus.WARNING ? 'text-[var(--color-warning)]' :
                                                                'text-[var(--color-text-secondary)]'
                                                        } `}>
                                                        {result.summary}
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
                                                    className={`h - 8 ${componentStyles.buttons.ghost} `}
                                                >
                                                    {isDetailsExpanded ? (
                                                        <>
                                                            <ChevronUp className="w-3 h-3 mr-1" />
                                                            Hide Details
                                                        </>
                                                    ) : (
                                                        <>
                                                            <ChevronDown className="w-3 h-3 mr-1" />
                                                            View Details
                                                        </>
                                                    )}
                                                </Button>
                                            )}
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleRunSingle(test)}
                                                loading={runningTests.has(test.id)}
                                                className={`h - 8 ${componentStyles.buttons.ghost} `}
                                                aria-label={`Run ${test.name} `}
                                            >
                                                <Play className="w-3 h-3" />
                                            </Button>
                                        </div>
                                    </div>

                                    {/* Test Details (Evidence) */}
                                    {isDetailsExpanded && result && (
                                        <div className="border-t border-[var(--color-border-default)] bg-[var(--color-surface-muted)]/50 p-4">
                                            {/* Metrics */}
                                            {result.metrics && Object.keys(result.metrics).length > 0 && (
                                                <div className="mb-4">
                                                    <h4 className="text-xs font-semibold text-[var(--color-text-primary)] mb-2 uppercase tracking-wide">
                                                        Metrics
                                                    </h4>
                                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                                        {Object.entries(result.metrics).map(([key, value]) => {
                                                            // Check if value is a URL or very long string
                                                            const isLongValue = typeof value === 'string' && (value.length > 30 || value.startsWith('http'));
                                                            return (
                                                                <div
                                                                    key={key}
                                                                    className={`bg - [var(--color - surface)]p - 2 rounded border border - [var(--color - border -default)]min - w - 0 ${isLongValue ? 'col-span-2 md:col-span-3' : ''} `}
                                                                >
                                                                    <p className="text-lg font-bold text-[var(--color-text-primary)] break-words overflow-wrap-anywhere">{value}</p>
                                                                    <p className="text-xs text-[var(--color-text-secondary)]">{key}</p>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Checked Items */}
                                            {result.checked && result.checked.length > 0 && (
                                                <div className="mb-4">
                                                    <h4 className="text-xs font-semibold text-[var(--color-text-primary)] mb-2 uppercase tracking-wide">
                                                        Checked Items
                                                    </h4>
                                                    <div className="space-y-1">
                                                        {result.checked.map((item, idx) => (
                                                            <div key={idx} className="flex items-start gap-2 text-xs">
                                                                {item.status === 'pass' ? (
                                                                    <CheckCircle2 className="w-3 h-3 text-[var(--color-success)] mt-0.5 shrink-0" />
                                                                ) : item.status === 'fail' ? (
                                                                    <XCircle className="w-3 h-3 text-[var(--color-danger)] mt-0.5 shrink-0" />
                                                                ) : (
                                                                    <AlertTriangle className="w-3 h-3 text-[var(--color-warning)] mt-0.5 shrink-0" />
                                                                )}
                                                                <div className="flex-1">
                                                                    <span className="text-[var(--color-text-primary)] font-medium">{item.item}</span>
                                                                    {item.details && (
                                                                        <span className="text-[var(--color-text-secondary)]"> - {item.details}</span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Evidence */}
                                            {result.evidence && result.evidence.length > 0 && (
                                                <div className="mb-4">
                                                    <h4 className="text-xs font-semibold text-[var(--color-text-primary)] mb-2 uppercase tracking-wide">
                                                        Evidence
                                                    </h4>
                                                    <TestEvidence
                                                        evidence={result.evidence}
                                                        testId={test.id}
                                                        testName={test.name}
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
                                                            <div key={idx} className="flex items-center gap-2 text-xs text-[var(--color-text-secondary)]">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-primary)]" />
                                                                <span>{action.label}</span>
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
