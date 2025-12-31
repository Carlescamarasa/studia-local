import React, { useState } from 'react';
import { AlertTriangle, Check, X, ArrowRight } from 'lucide-react';
import { Button } from '@/features/shared/components/ui/button';
import { ScrollArea } from '@/features/shared/components/ui/scroll-area';
import { Badge } from '@/features/shared/components/ds/Badge';

/**
 * ImportReviewPanel
 * UI para revisar antes de importar y resolver conflictos.
 */
export default function ImportReviewPanel({ report, dataset, onCancel, onConfirm }: { report: any, dataset: any, onCancel: () => void, onConfirm: (data: any) => void }) {
    // Si quisieramos editar, clonaríamos report.rows a un state local
    // const [rows, setRows] = useState(report.rows);

    // Por ahora solo visualización y confirmación
    const summary = report.summary;

    const handleConfirm = () => {
        // En una implementación avanzada, aquí enviaríamos las "rows" corregidas
        // Por ahora enviamos las "originales + procesadas" del reporte
        const dataToImport = report.rows
            .filter((r: any) => r.status !== 'error') // Filtramos errores bloqueantes
            .map((r: any) => r.data); // Extraemos la data limpia

        onConfirm(dataToImport);
    };

    return (
        <div className="flex flex-col h-full animate-in fade-in slide-in-from-bottom-4">
            {/* Header */}
            <div className="flex-none p-6 border-b border-[var(--color-border-default)] bg-[var(--color-surface-elevated)]">
                <h2 className="text-xl font-bold flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-[var(--color-primary)]" />
                    Revisión de Importación
                </h2>
                <p className="text-sm text-[var(--color-text-secondary)] mt-1">
                    Verifica los cambios antes de aplicarlos. Las filas con errores serán ignoradas.
                </p>

                {/* Stats Chips */}
                <div className="flex gap-4 mt-4">
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                        {summary.changes.created} Nuevos
                    </Badge>
                    <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                        {summary.changes.updated} Actualizaciones
                    </Badge>
                    {(summary.errors > 0 || summary.warnings > 0) && (
                        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                            {summary.errors} Errores / {summary.warnings} Avisos
                        </Badge>
                    )}
                </div>
            </div>

            {/* Content: List of issues or rows */}
            <ScrollArea className="flex-1 p-6 bg-[var(--color-background)]">
                <div className="space-y-4 max-w-4xl mx-auto">

                    {/* Lista de Filas con problemas (Prioridad) */}
                    {report.rows.filter((r: any) => r.status !== 'valid').map((row: any, idx: number) => (
                        <div
                            key={row.id}
                            className={`p-4 rounded-[var(--radius-card)] border flex flex-col gap-3
                                ${row.status === 'error' ? 'border-red-200 bg-red-50/30' : 'border-yellow-200 bg-yellow-50/30'}
                            `}
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-2">
                                    <Badge variant={(row.status === 'error' ? 'destructive' : 'secondary')}>
                                        Fila {idx + 1}
                                    </Badge>
                                    <span className="font-mono text-xs text-[var(--color-text-secondary)]">
                                        {Object.values(row.original)[0] as React.ReactNode} {/* Primary Identifier */}
                                    </span>
                                </div>
                                <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-tertiary)]">
                                    {row.action === 'create' ? 'Creación' : 'Actualización'}
                                </span>
                            </div>

                            {/* Mensajes de Error/Warning */}
                            <div className="space-y-1">
                                {row.errors.map((err: string, i: number) => (
                                    <div key={i} className="text-sm text-red-600 flex items-center gap-2">
                                        <X className="w-4 h-4" /> {err}
                                    </div>
                                ))}
                                {row.warnings.map((warn: string, i: number) => (
                                    <div key={i} className="text-sm text-yellow-600 flex items-center gap-2">
                                        <AlertTriangle className="w-4 h-4" /> {warn}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}

                    {/* Mensaje si todo OK */}
                    {report.rows.every((r: any) => r.status === 'valid') && (
                        <div className="text-center py-12 text-[var(--color-text-secondary)]">
                            <Check className="w-12 h-12 mx-auto mb-4 text-green-500" />
                            <h3 className="text-lg font-medium text-[var(--color-text-primary)]">Todo parece correcto</h3>
                            <p>No se encontraron errores ni advertencias en {summary.total} registros.</p>
                        </div>
                    )}

                </div>
            </ScrollArea>

            {/* Footer Actions */}
            <div className="flex-none p-6 border-t border-[var(--color-border-default)] bg-[var(--color-surface-card)] flex justify-between items-center">
                <Button variant="ghost" onClick={onCancel}>
                    Atrás y Corregir
                </Button>
                <div className="flex gap-3">
                    <div className="text-right text-xs text-[var(--color-text-secondary)] mr-2 flex flex-col justify-center">
                        <span>Se aplicarán cambios en</span>
                        <strong className="text-[var(--color-text-primary)]">{summary.valid} registros</strong>
                    </div>
                    <Button
                        onClick={handleConfirm}
                        disabled={summary.valid === 0}
                        className="min-w-[140px]"
                        style={{ borderRadius: 'var(--radius-pill)' }}
                    >
                        Confirmar e Importar <ArrowRight className="ml-2 w-4 h-4" />
                    </Button>
                </div>
            </div>
        </div>
    );
}
