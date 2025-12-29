import React, { useState, useEffect, useRef } from 'react';
import { X, ScrollText, Filter, Download, Trash2 } from 'lucide-react';
import { Button } from '@/features/shared/components/ds/Button';
import { componentStyles } from '@/design/componentStyles';

interface LogEntry {
    message: string;
    type: 'info' | 'success' | 'error' | 'warning';
    timestamp: string;
}

interface LogsDrawerProps {
    logs: LogEntry[];
    onClear: () => void;
    isOpen: boolean;
    onToggle: () => void;
}

/**
 * LogsDrawer - Logs displayed in a side/bottom drawer
 */
export default function LogsDrawer({ logs = [], onClear, isOpen, onToggle }: LogsDrawerProps) {
    const [filterType, setFilterType] = useState<string>('all');
    const logsEndRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to latest log
    useEffect(() => {
        if (isOpen && logsEndRef.current) {
            logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [logs, isOpen]);

    const filteredLogs = filterType === 'all'
        ? logs
        : logs.filter(log => log.type === filterType);

    const handleExport = () => {
        const dataStr = JSON.stringify(logs, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `maintenance-logs-${new Date().toISOString()}.json`;
        link.click();
        URL.revokeObjectURL(url);
    };

    const logTypeCounts: Record<string, number> = {
        all: logs.length,
        info: logs.filter(l => l.type === 'info').length,
        success: logs.filter(l => l.type === 'success').length,
        warning: logs.filter(l => l.type === 'warning').length,
        error: logs.filter(l => l.type === 'error').length,
    };

    if (!isOpen) return null;

    return (
        <>
            {/* Overlay */}
            <div
                className="fixed inset-0 bg-[var(--color-overlay)] z-[100] lg:hidden"
                onClick={onToggle}
                aria-hidden="true"
            />

            {/* Drawer */}
            <div
                className={`
          fixed z-[101] bg-[var(--color-surface)] border-[var(--color-border-default)] shadow-2xl
          flex flex-col
          lg:right-0 lg:top-0 lg:bottom-0 lg:w-[500px] lg:border-l
          max-lg:bottom-0 max-lg:left-0 max-lg:right-0 max-lg:h-[70vh] max-lg:border-t max-lg:rounded-t-2xl
          transition-transform duration-300
        `}
                role="dialog"
                aria-label="Logs drawer"
            >
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-[var(--color-border-default)] shrink-0">
                    <div className="flex items-center gap-2">
                        <ScrollText className="w-5 h-5 text-[var(--color-primary)]" />
                        <h2 className="font-semibold text-lg text-[var(--color-text-primary)]">
                            Logs
                        </h2>
                        {logs.length > 0 && (
                            <span className="text-sm text-[var(--color-text-secondary)]">
                                ({logs.length})
                            </span>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleExport}
                            disabled={logs.length === 0}
                            className={`h-8 ${componentStyles.buttons?.ghost}`}
                            aria-label="Export logs"
                        >
                            <Download className="w-4 h-4" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={onClear}
                            disabled={logs.length === 0}
                            className={`h-8 ${componentStyles.buttons?.ghost}`}
                            aria-label="Clear logs"
                        >
                            <Trash2 className="w-4 h-4" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={onToggle}
                            className={`h-8 ${componentStyles.buttons?.ghost}`}
                            aria-label="Close logs"
                        >
                            <X className="w-4 h-4" />
                        </Button>
                    </div>
                </div>

                {/* Filter Bar */}
                <div className="flex items-center gap-2 p-3 border-b border-[var(--color-border-default)] shrink-0 overflow-x-auto scrollbar-hide">
                    <Filter className="w-4 h-4 text-[var(--color-text-secondary)] shrink-0" />
                    {['all', 'info', 'success', 'warning', 'error'].map((type) => (
                        <button
                            key={type}
                            onClick={() => setFilterType(type)}
                            className={`
                px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap
                ${filterType === type
                                    ? 'bg-[var(--color-primary)] text-[var(--color-text-inverse)]'
                                    : 'bg-[var(--color-surface-muted)] text-[var(--color-text-secondary)] hover:bg-[var(--color-border-default)]'
                                }
              `}
                            aria-label={`Filter by ${type}`}
                            aria-pressed={filterType === type}
                        >
                            {type.charAt(0).toUpperCase() + type.slice(1)}
                            {logTypeCounts[type] > 0 && ` (${logTypeCounts[type]})`}
                        </button>
                    ))}
                </div>

                {/* Logs Content */}
                <div className="flex-1 overflow-y-auto p-4">
                    {filteredLogs.length === 0 ? (
                        <div className="text-center py-12 text-[var(--color-text-secondary)]">
                            <ScrollText className="w-12 h-12 mx-auto mb-3 opacity-30" />
                            <p className="text-sm">
                                {logs.length === 0 ? 'No logs yet' : `No ${filterType} logs`}
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {filteredLogs.map((log, idx) => (
                                <div
                                    key={idx}
                                    className={`
                    text-sm font-mono p-3 rounded-lg border
                    ${log.type === 'success'
                                            ? 'bg-[var(--color-success)]/10 border-[var(--color-success)]/30 text-[var(--color-success)]'
                                            : log.type === 'error'
                                                ? 'bg-[var(--color-danger)]/10 border-[var(--color-danger)]/30 text-[var(--color-danger)]'
                                                : log.type === 'warning'
                                                    ? 'bg-[var(--color-warning)]/10 border-[var(--color-warning)]/30 text-[var(--color-warning)]'
                                                    : 'bg-[var(--color-surface-muted)] border-[var(--color-border-default)] text-[var(--color-text-primary)]'
                                        }
                  `}
                                >
                                    <div className="flex items-start gap-2">
                                        <span className="text-[var(--color-text-secondary)] shrink-0 text-xs">
                                            [{log.timestamp}]
                                        </span>
                                        <span className="flex-1 break-words">{log.message}</span>
                                    </div>
                                </div>
                            ))}
                            <div ref={logsEndRef} />
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
