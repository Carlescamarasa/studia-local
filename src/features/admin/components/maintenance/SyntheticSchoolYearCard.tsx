import React, { useState } from 'react';
import { Play, Trash2, Eye, Copy, Loader2, AlertTriangle } from 'lucide-react';
import { Button } from '@/features/shared/components/ds/Button';
import { componentStyles } from '@/design/componentStyles';
import { toast } from 'sonner';
// @ts-ignore - Assuming these utils are available
import {
    dryRunSyntheticSchoolYear2025_26,
    seedSyntheticSchoolYear2025_26,
    deleteSyntheticSchoolYear2025_26
} from '@/utils/seeds/syntheticSchoolYear2025_26';

interface SeedReport {
    counts: Record<string, number>;
    users: Array<{
        id: string;
        fullName: string;
        email: string;
        role: string;
    }>;
    sqlStatements?: string[];
    conflicts?: string[];
}

interface SyntheticSchoolYearCardProps {
    addLog: (message: string, type?: 'info' | 'success' | 'error' | 'warning') => void;
}

/**
 * SyntheticSchoolYearCard - Manage synthetic school year 2025-26 data
 */
export default function SyntheticSchoolYearCard({ addLog }: SyntheticSchoolYearCardProps) {
    const [isRunning, setIsRunning] = useState(false);
    const [report, setReport] = useState<SeedReport | null>(null);
    const [showSQL, setShowSQL] = useState(false);

    const handleDryRun = async () => {
        setIsRunning(true);
        addLog('🔍 Running dry run for Synthetic School Year 2025-26...', 'info');

        try {
            const result = await dryRunSyntheticSchoolYear2025_26();
            setReport(result);
            addLog('✅ Dry run complete', 'success');
            toast.success('Dry run complete - check report below');
        } catch (error: any) {
            addLog(`❌ Dry run failed: ${error.message}`, 'error');
            toast.error(`Dry run failed: ${error.message}`);
        } finally {
            setIsRunning(false);
        }
    };

    const handleGenerate = async () => {
        if (!confirm('¿Generar datos sintéticos para el curso 2025-26?\n\nEsto creará usuarios, asignaciones, sesiones y más.')) {
            return;
        }

        setIsRunning(true);
        addLog('🌱 Generating Synthetic School Year 2025-26...', 'info');

        try {
            const result = await seedSyntheticSchoolYear2025_26();
            setReport(result);
            addLog('✅ Generation complete!', 'success');
            toast.success('Synthetic data generated successfully!');
        } catch (error: any) {
            addLog(`❌ Generation failed: ${error.message}`, 'error');
            toast.error(`Generation failed: ${error.message}`);
        } finally {
            setIsRunning(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm('⚠️ ¿BORRAR todos los datos sintéticos del curso 2025-26?\n\nEsta acción es PERMANENTE e IRREVERSIBLE.')) {
            return;
        }

        if (!confirm('⚠️ ÚLTIMA CONFIRMACIÓN\n\nSe borrarán TODOS los datos marcados como sintéticos.\n¿Estás seguro?')) {
            return;
        }

        setIsRunning(true);
        addLog('🗑️  Deleting Synthetic School Year 2025-26...', 'warning');

        try {
            const result = await deleteSyntheticSchoolYear2025_26();
            setReport(null);
            addLog('✅ Deletion complete!', 'success');
            toast.success('Synthetic data deleted successfully');
            console.log('Deleted:', result);
        } catch (error: any) {
            addLog(`❌ Deletion failed: ${error.message}`, 'error');
            toast.error(`Deletion failed: ${error.message}`);
        } finally {
            setIsRunning(false);
        }
    };

    const handleCopyReport = () => {
        if (!report) return;

        const json = JSON.stringify(report, null, 2);
        navigator.clipboard.writeText(json);
        toast.success('Report copied to clipboard');
    };

    const handleCopySQL = () => {
        if (!report?.sqlStatements) return;

        const sql = report.sqlStatements.join('\n');
        navigator.clipboard.writeText(sql);
        toast.success('SQL copied to clipboard');
    };

    return (
        <div
            className="rounded-lg border p-6 space-y-4"
            style={{
                backgroundColor: 'var(--color-surface)',
                borderColor: 'var(--color-border)'
            }}
        >
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                        Curso Sintético 2025-26
                    </h3>
                    <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                        Generador de datos completo para QA y desarrollo
                    </p>
                </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 flex-wrap">
                <Button
                    variant="outline"
                    onClick={handleDryRun}
                    disabled={isRunning}
                    className={componentStyles.buttons?.outline}
                >
                    {isRunning ? (
                        <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Running...
                        </>
                    ) : (
                        <>
                            <Eye className="w-4 h-4 mr-2" />
                            Dry Run
                        </>
                    )}
                </Button>

                <Button
                    variant="primary"
                    onClick={handleGenerate}
                    disabled={isRunning}
                    className={componentStyles.buttons?.primary}
                >
                    {isRunning ? (
                        <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Generating...
                        </>
                    ) : (
                        <>
                            <Play className="w-4 h-4 mr-2" />
                            Generar
                        </>
                    )}
                </Button>

                <Button
                    variant="outline"
                    onClick={handleDelete}
                    disabled={isRunning}
                    className={componentStyles.buttons?.outline}
                    style={{ color: 'var(--color-danger)' }}
                >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Borrar
                </Button>

                {report && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleCopyReport}
                        className={componentStyles.buttons?.ghost}
                    >
                        <Copy className="w-4 h-4 mr-2" />
                        Copy JSON
                    </Button>
                )}
            </div>

            {/* Report */}
            {report && (
                <div className="space-y-4 mt-6">
                    {/* Summary */}
                    <div>
                        <h4 className="text-sm font-semibold mb-3" style={{ color: 'var(--color-text-primary)' }}>
                            Resumen
                        </h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {Object.entries(report.counts).map(([key, value]) => (
                                <div
                                    key={key}
                                    className="rounded p-3"
                                    style={{
                                        backgroundColor: 'var(--color-background)',
                                        borderLeft: '3px solid var(--color-primary)'
                                    }}
                                >
                                    <div className="text-2xl font-bold" style={{ color: 'var(--color-primary)' }}>
                                        {value}
                                    </div>
                                    <div className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                                        {key}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Users */}
                    <div>
                        <h4 className="text-sm font-semibold mb-3" style={{ color: 'var(--color-text-primary)' }}>
                            Usuarios Creados
                        </h4>
                        <div className="space-y-2">
                            {report.users.map(user => (
                                <div
                                    key={user.id}
                                    className="flex items-center justify-between p-3 rounded"
                                    style={{
                                        backgroundColor: 'var(--color-background)',
                                        borderLeft: `3px solid ${user.role === 'PROF' ? 'var(--color-warning)' : 'var(--color-info)'}`
                                    }}
                                >
                                    <div>
                                        <div className="font-medium" style={{ color: 'var(--color-text-primary)' }}>
                                            {user.fullName}
                                        </div>
                                        <div className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                                            {user.email}
                                        </div>
                                    </div>
                                    <div
                                        className="px-2 py-1 rounded text-xs font-semibold"
                                        style={{
                                            backgroundColor: user.role === 'PROF' ? 'var(--color-warning-bg)' : 'var(--color-info-bg)',
                                            color: user.role === 'PROF' ? 'var(--color-warning)' : 'var(--color-info)'
                                        }}
                                    >
                                        {user.role}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* SQL Statements */}
                    {report.sqlStatements && report.sqlStatements.length > 0 && (
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <h4 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                                    SQL para Crear Usuarios Auth
                                </h4>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleCopySQL}
                                    className={componentStyles.buttons?.ghost}
                                >
                                    <Copy className="w-4 h-4 mr-2" />
                                    Copy SQL
                                </Button>
                            </div>

                            <div
                                className="rounded p-4 border"
                                style={{
                                    backgroundColor: 'var(--color-background)',
                                    borderColor: 'var(--color-border)'
                                }}
                            >
                                <div className="flex items-start gap-2 mb-3 p-3 rounded" style={{ backgroundColor: 'var(--color-info-bg)' }}>
                                    <AlertTriangle className="w-5 h-5 flex-shrink-0" style={{ color: 'var(--color-info)' }} />
                                    <div className="text-sm" style={{ color: 'var(--color-info)' }}>
                                        <strong>Usuarios Creados Automáticamente:</strong> Los usuarios se crean usando la misma Edge Function que la página de Usuarios.
                                        <br />
                                        <strong>Login:</strong> Usa cualquier email de la lista con password <code>12345678</code>
                                        <br />
                                        <strong>SQL (Opcional):</strong> Solo necesario si quieres recrear los usuarios manualmente.
                                    </div>
                                </div>

                                <button
                                    onClick={() => setShowSQL(!showSQL)}
                                    className="text-sm font-medium mb-2"
                                    style={{ color: 'var(--color-primary)' }}
                                >
                                    {showSQL ? '▼ Ocultar SQL' : '▶ Mostrar SQL'}
                                </button>

                                {showSQL && (
                                    <pre
                                        className="text-xs overflow-x-auto p-3 rounded"
                                        style={{
                                            backgroundColor: 'var(--color-surface)',
                                            color: 'var(--color-text-secondary)',
                                            maxHeight: '400px',
                                            overflowY: 'auto'
                                        }}
                                    >
                                        {report.sqlStatements.join('\n')}
                                    </pre>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Conflicts */}
                    {report.conflicts && report.conflicts.length > 0 && (
                        <div>
                            <h4 className="text-sm font-semibold mb-3" style={{ color: 'var(--color-danger)' }}>
                                Conflictos Detectados
                            </h4>
                            <div className="space-y-2">
                                {report.conflicts.map((conflict, idx) => (
                                    <div
                                        key={idx}
                                        className="p-3 rounded"
                                        style={{
                                            backgroundColor: 'var(--color-danger-bg)',
                                            color: 'var(--color-danger)'
                                        }}
                                    >
                                        {conflict}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
