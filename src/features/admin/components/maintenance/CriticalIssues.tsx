import React from 'react';
import { AlertTriangle, ExternalLink, FileText, Terminal, ArrowRight, Copy } from 'lucide-react';
import { Button } from '@/features/shared/components/ds/Button';
import { Card, CardContent } from '@/features/shared/components/ds';
import { componentStyles } from '@/design/componentStyles';
import { toast } from 'sonner';

interface IssueAction {
    title: string;
    detail?: string;
    link?: string;
    command?: string;
    file?: string;
}

interface CriticalIssue {
    id: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
    title: string;
    evidence?: {
        summary?: string;
    };
    whyItMatters?: string;
    metrics?: Record<string, any>;
    actions?: IssueAction[];
}

interface CriticalIssuesProps {
    issues: CriticalIssue[];
}

/**
 * CriticalIssues - Displays top 5 critical issues prominently
 */
export default function CriticalIssues({ issues }: CriticalIssuesProps) {
    if (issues.length === 0) {
        return null;
    }

    const handleCopyJson = (issue: CriticalIssue) => {
        navigator.clipboard.writeText(JSON.stringify(issue, null, 2));
        toast.success('Issue copied to clipboard');
    };

    const handleActionClick = (action: IssueAction) => {
        if (action.link) {
            window.open(action.link, '_blank');
        } else if (action.command) {
            navigator.clipboard.writeText(action.command);
            toast.success('Command copied to clipboard');
        } else if (action.file) {
            toast.info(`Open file: ${action.file}`);
        }
    };

    const getSeverityColor = (severity: string) => {
        switch (severity) {
            case 'critical':
                return 'text-[var(--color-danger)] border-[var(--color-danger)]/30 bg-[var(--color-danger)]/10';
            case 'high':
                return 'text-[var(--color-warning)] border-[var(--color-warning)]/30 bg-[var(--color-warning)]/10';
            case 'medium':
                return 'text-[var(--color-info)] border-[var(--color-info)]/30 bg-[var(--color-info)]/10';
            default:
                return 'text-[var(--color-text-secondary)] border-[var(--color-border-default)] bg-[var(--color-surface-muted)]';
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-[var(--color-text-primary)] flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-[var(--color-danger)]" />
                    Critical Issues
                    <span className="text-sm font-normal text-[var(--color-text-secondary)]">
                        ({issues.length} {issues.length === 1 ? 'issue' : 'issues'})
                    </span>
                </h2>
            </div>

            <div className="space-y-3">
                {issues.map((issue) => (
                    <Card
                        key={issue.id}
                        className={`app-card border ${getSeverityColor(issue.severity)}`}
                    >
                        <CardContent className="p-4">
                            {/* Header */}
                            <div className="flex items-start justify-between gap-4 mb-3">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-xs font-semibold uppercase tracking-wide opacity-75">
                                            {issue.severity}
                                        </span>
                                        <span className="text-xs text-[var(--color-text-secondary)]">•</span>
                                        <span className="text-xs text-[var(--color-text-secondary)]">
                                            {issue.id}
                                        </span>
                                    </div>
                                    <h3 className="font-semibold text-[var(--color-text-primary)] mb-1">
                                        {issue.title}
                                    </h3>
                                    <p className="text-sm text-[var(--color-text-secondary)]">
                                        {issue.evidence?.summary || 'No details available'}
                                    </p>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleCopyJson(issue)}
                                    className={`h-8 ${componentStyles.buttons?.ghost}`}
                                    aria-label="Copy JSON"
                                >
                                    <Copy className="w-3 h-3" />
                                </Button>
                            </div>

                            {/* Why It Matters */}
                            <div className="mb-3 p-3 rounded-lg bg-[var(--color-surface-muted)]/50 border border-[var(--color-border-default)]">
                                <p className="text-xs font-semibold text-[var(--color-text-primary)] mb-1 uppercase tracking-wide">
                                    Why It Matters
                                </p>
                                <p className="text-sm text-[var(--color-text-secondary)]">
                                    {issue.whyItMatters}
                                </p>
                            </div>

                            {/* Metrics */}
                            {issue.metrics && Object.keys(issue.metrics).length > 0 && (
                                <div className="mb-3 grid grid-cols-2 md:grid-cols-4 gap-2">
                                    {Object.entries(issue.metrics).map(([key, value]) => (
                                        <div
                                            key={key}
                                            className="p-2 rounded bg-[var(--color-surface)] border border-[var(--color-border-default)]"
                                        >
                                            <p className="text-xs text-[var(--color-text-secondary)] mb-0.5">
                                                {key}
                                            </p>
                                            <p className="text-sm font-semibold text-[var(--color-text-primary)] truncate">
                                                {String(value)}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Actions */}
                            {issue.actions && issue.actions.length > 0 && (
                                <div>
                                    <p className="text-xs font-semibold text-[var(--color-text-primary)] mb-2 uppercase tracking-wide">
                                        Actions
                                    </p>
                                    <div className="space-y-2">
                                        {issue.actions.map((action, actionIdx) => (
                                            <button
                                                key={actionIdx}
                                                onClick={() => handleActionClick(action)}
                                                className="w-full flex items-start gap-3 p-3 rounded-lg border border-[var(--color-border-default)] hover:bg-[var(--color-surface-muted)] transition-colors text-left group"
                                            >
                                                <div className="shrink-0 mt-0.5">
                                                    {action.link ? (
                                                        <ExternalLink className="w-4 h-4 text-[var(--color-primary)]" />
                                                    ) : action.command ? (
                                                        <Terminal className="w-4 h-4 text-[var(--color-primary)]" />
                                                    ) : action.file ? (
                                                        <FileText className="w-4 h-4 text-[var(--color-primary)]" />
                                                    ) : (
                                                        <ArrowRight className="w-4 h-4 text-[var(--color-primary)]" />
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium text-[var(--color-text-primary)] group-hover:text-[var(--color-primary)] transition-colors">
                                                        {action.title}
                                                    </p>
                                                    {action.detail && (
                                                        <p className="text-xs text-[var(--color-text-secondary)] mt-0.5 whitespace-pre-wrap">
                                                            {action.detail}
                                                        </p>
                                                    )}
                                                    {action.file && (
                                                        <p className="text-xs text-[var(--color-text-muted)] mt-1 font-mono">
                                                            {action.file}
                                                        </p>
                                                    )}
                                                    {action.command && (
                                                        <code className="text-xs text-[var(--color-text-muted)] mt-1 block font-mono">
                                                            {action.command}
                                                        </code>
                                                    )}
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
