/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { Button } from '@/features/shared/components/ds/Button';
import { componentStyles } from '@/design/componentStyles';
import { toast } from 'sonner';

const EvidenceType = {
    TABLE: 'table',
    LIST: 'list',
    CODE: 'code',
    TEXT: 'text',
    METRICS: 'metrics'
} as const;

type EvidenceTypeValue = typeof EvidenceType[keyof typeof EvidenceType];

interface EvidenceItem {
    type: EvidenceTypeValue;
    message?: string;
    data: any;
}

interface TestEvidenceProps {
    evidence?: EvidenceItem[];
    testId: string;
    testName: string;
}

/**
 * TestEvidence - Display test evidence in various formats
 */
export default function TestEvidence({ evidence = [], testId, testName }: TestEvidenceProps) {
    const [copiedJson, setCopiedJson] = React.useState(false);

    const handleCopyJson = () => {
        const jsonReport = {
            test: testName,
            testId,
            evidence,
            timestamp: new Date().toISOString()
        };

        navigator.clipboard.writeText(JSON.stringify(jsonReport, null, 2));
        setCopiedJson(true);
        toast.success('Report copied to clipboard');
        setTimeout(() => setCopiedJson(false), 2000);
    };

    if (evidence.length === 0) {
        return (
            <div className="text-sm text-[var(--color-text-secondary)] italic p-4">
                No evidence available
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Copy JSON Button */}
            <div className="flex justify-end">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCopyJson}
                    className={`h-8 ${componentStyles.buttons?.ghost}`}
                >
                    {copiedJson ? (
                        <>
                            <Check className="w-3 h-3 mr-1" />
                            Copied
                        </>
                    ) : (
                        <>
                            <Copy className="w-3 h-3 mr-1" />
                            Copy JSON Report
                        </>
                    )}
                </Button>
            </div>

            {/* Evidence Items */}
            {evidence.map((item, idx) => (
                <div key={idx} className="border border-[var(--color-border-default)] rounded-lg overflow-hidden">
                    {item.message && (
                        <div className="px-4 py-2 bg-[var(--color-surface-muted)] border-b border-[var(--color-border-default)]">
                            <p className="text-sm font-medium text-[var(--color-text-primary)]">
                                {item.message}
                            </p>
                        </div>
                    )}

                    <div className="p-4">
                        {renderEvidence(item)}
                    </div>
                </div>
            ))}
        </div>
    );
}

function renderEvidence(item: EvidenceItem) {
    switch (item.type) {
        case EvidenceType.TABLE:
            return <TableEvidence data={item.data} />;
        case EvidenceType.LIST:
            return <ListEvidence data={item.data} />;
        case EvidenceType.CODE:
            return <CodeEvidence data={item.data} />;
        case EvidenceType.TEXT:
            return <TextEvidence data={item.data} />;
        case EvidenceType.METRICS:
            return <MetricsEvidence data={item.data} />;
        default:
            return <pre className="text-xs">{JSON.stringify(item.data, null, 2)}</pre>;
    }
}

function TableEvidence({ data }: { data: { title?: string; columns: string[]; rows: any[][] } }) {
    return (
        <div className="overflow-x-auto">
            {data.title && (
                <h4 className="font-semibold text-sm text-[var(--color-text-primary)] mb-2">
                    {data.title}
                </h4>
            )}
            <table className="w-full text-sm">
                <thead>
                    <tr className="border-b border-[var(--color-border-default)]">
                        {data.columns.map((col, idx) => (
                            <th
                                key={idx}
                                className="text-left py-2 px-3 font-semibold text-[var(--color-text-primary)] bg-[var(--color-surface-muted)]"
                            >
                                {col}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {data.rows.map((row, rowIdx) => (
                        <tr
                            key={rowIdx}
                            className="border-b border-[var(--color-border-default)] last:border-0 hover:bg-[var(--color-surface-muted)]/50"
                        >
                            {row.map((cell, cellIdx) => (
                                <td key={cellIdx} className="py-2 px-3 text-[var(--color-text-secondary)]">
                                    {String(cell)}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function ListEvidence({ data }: { data: { title?: string; items: any[] } }) {
    return (
        <div>
            {data.title && (
                <h4 className="font-semibold text-sm text-[var(--color-text-primary)] mb-2">
                    {data.title}
                </h4>
            )}
            <ul className="space-y-1">
                {data.items.map((item, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
                        <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-primary)]" />
                        <span>{typeof item === 'string' ? item : item.text}</span>
                        {item.badge && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--color-surface-muted)] text-[var(--color-text-secondary)]">
                                {item.badge}
                            </span>
                        )}
                    </li>
                ))}
            </ul>
        </div>
    );
}

function CodeEvidence({ data }: { data: { content: string } }) {
    return (
        <pre className="text-xs font-mono bg-[var(--color-surface-muted)] p-3 rounded-lg overflow-x-auto">
            <code>{data.content}</code>
        </pre>
    );
}

function TextEvidence({ data }: { data: { content: string } }) {
    return (
        <p className="text-sm text-[var(--color-text-secondary)] whitespace-pre-wrap">
            {data.content}
        </p>
    );
}

function MetricsEvidence({ data }: { data: { values: Record<string, any> } }) {
    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(data.values || {}).map(([key, value]) => (
                <div key={key} className="text-center p-3 bg-[var(--color-surface-muted)] rounded-lg">
                    <p className="text-2xl font-bold text-[var(--color-text-primary)]">{String(value)}</p>
                    <p className="text-xs text-[var(--color-text-secondary)] mt-1">{key}</p>
                </div>
            ))}
        </div>
    );
}
