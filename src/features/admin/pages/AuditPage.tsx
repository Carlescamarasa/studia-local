import React, { useEffect, useState } from 'react';
import { useData } from '@/providers/DataProvider';

interface AuditReport {
    totalSessions: number;
    sessionsWithoutBlocks: any[];
    sessionsZeroDuration: any[];
    sessionsNoRating: any[];
    durationMismatches: any[];
    duplicates: any[];
}

export default function AuditPage() {
    const api = useData();
    const [report, setReport] = useState<AuditReport | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const runAudit = async () => {
            try {
                console.log('Starting audit...');
                const sessions = await api.registrosSesion.list();
                console.log('Fetched sessions:', sessions.length);

                const totalSessions = sessions.length;
                const sessionsWithoutBlocks = sessions.filter(s => !s.registrosBloque || s.registrosBloque.length === 0);
                const sessionsZeroDuration = sessions.filter(s => s.duracionRealSeg === 0);
                const sessionsNoRating = sessions.filter(s => s.calificacion === null || s.calificacion === undefined);

                const durationMismatches = sessions.filter(s => {
                    if (!s.registrosBloque) return false;
                    const blocksDuration = s.registrosBloque.reduce((acc: number, b: any) => acc + (b.duracionRealSeg || 0), 0);
                    // Allow small difference for floating point or minor inconsistencies (e.g. 1 second)
                    return Math.abs((s.duracionRealSeg || 0) - blocksDuration) > 1;
                }).map(s => ({
                    id: s.id,
                    sessionDuration: s.duracionRealSeg,
                    blocksDuration: (s.registrosBloque || []).reduce((acc: number, b: any) => acc + (b.duracionRealSeg || 0), 0),
                    diff: (s.duracionRealSeg || 0) - (s.registrosBloque || []).reduce((acc: number, b: any) => acc + (b.duracionRealSeg || 0), 0)
                }));

                // Check for duplicates (same start time within 1 minute)
                const sortedSessions = [...sessions].sort((a, b) => new Date(a.inicioISO).getTime() - new Date(b.inicioISO).getTime());
                const duplicates = [];
                for (let i = 0; i < sortedSessions.length - 1; i++) {
                    const current = sortedSessions[i];
                    const next = sortedSessions[i + 1];
                    const timeDiff = Math.abs(new Date(current.inicioISO).getTime() - new Date(next.inicioISO).getTime());
                    if (timeDiff < 60000) { // Less than 1 minute difference
                        duplicates.push({
                            id1: current.id,
                            id2: next.id,
                            time1: current.inicioISO,
                            time2: next.inicioISO,
                            diffMs: timeDiff
                        });
                    }
                }

                setReport({
                    totalSessions,
                    sessionsWithoutBlocks,
                    sessionsZeroDuration,
                    sessionsNoRating,
                    durationMismatches,
                    duplicates
                });
                (window as any)._auditReport = {
                    totalSessions,
                    sessionsWithoutBlocks,
                    sessionsZeroDuration,
                    sessionsNoRating,
                    durationMismatches,
                    duplicates
                };
                console.log('AUDIT_REPORT:', JSON.stringify({
                    totalSessions,
                    sessionsWithoutBlocks,
                    sessionsZeroDuration,
                    sessionsNoRating,
                    durationMismatches,
                    duplicates
                }));
            } catch (err: any) {
                console.error('Audit failed:', err);
                setError(err.message || 'Unknown error');
            } finally {
                setLoading(false);
            }
        };

        runAudit();
    }, []);

    if (loading) return <div className="p-8">Running audit... check console</div>;
    if (error) return <div className="p-8 text-red-500">Error: {error}</div>;
    if (!report) return <div className="p-8">No report generated</div>;

    return (
        <div className="p-8 max-w-4xl mx-auto space-y-8">
            <h1 className="text-2xl font-bold">Session Data Audit Report</h1>

            <section className="space-y-4">
                <h2 className="text-xl font-semibold">Summary</h2>
                <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-gray-100 rounded">
                        <div className="text-sm text-gray-500">Total Sessions</div>
                        <div className="text-2xl font-bold">{report.totalSessions}</div>
                    </div>
                    <div className={`p-4 rounded ${report.sessionsWithoutBlocks.length > 0 ? 'bg-red-100' : 'bg-green-100'}`}>
                        <div className="text-sm text-gray-500">Sessions w/o Blocks</div>
                        <div className="text-2xl font-bold">{report.sessionsWithoutBlocks.length}</div>
                    </div>
                    <div className={`p-4 rounded ${report.sessionsZeroDuration.length > 0 ? 'bg-yellow-100' : 'bg-green-100'}`}>
                        <div className="text-sm text-gray-500">Zero Duration</div>
                        <div className="text-2xl font-bold">{report.sessionsZeroDuration.length}</div>
                    </div>
                    <div className={`p-4 rounded ${report.sessionsNoRating.length > 0 ? 'bg-orange-100' : 'bg-green-100'}`}>
                        <div className="text-sm text-gray-500">Missing Rating</div>
                        <div className="text-2xl font-bold">{report.sessionsNoRating.length}</div>
                    </div>
                    <div className={`p-4 rounded ${report.durationMismatches.length > 0 ? 'bg-red-100' : 'bg-green-100'}`}>
                        <div className="text-sm text-gray-500">Duration Mismatches</div>
                        <div className="text-2xl font-bold">{report.durationMismatches.length}</div>
                    </div>
                    <div className={`p-4 rounded ${report.duplicates.length > 0 ? 'bg-yellow-100' : 'bg-green-100'}`}>
                        <div className="text-sm text-gray-500">Potential Duplicates</div>
                        <div className="text-2xl font-bold">{report.duplicates.length}</div>
                    </div>
                </div>
            </section>

            {/* Detailed sections commented out for stability */}
            {/*
            {report.sessionsWithoutBlocks.length > 0 && (
                <section>
                    <h2 className="text-xl font-semibold mb-2">Sessions Without Blocks</h2>
                    <div className="bg-gray-50 p-4 rounded overflow-auto max-h-60">
                        <pre className="text-xs">{JSON.stringify(report.sessionsWithoutBlocks.map(s => ({ id: s.id, date: s.inicioISO })), null, 2)}</pre>
                    </div>
                </section>
            )}
            {report.sessionsZeroDuration.length > 0 && (
                <section>
                    <h2 className="text-xl font-semibold mb-2">Sessions with Zero Duration</h2>
                    <div className="bg-gray-50 p-4 rounded overflow-auto max-h-60">
                        <pre className="text-xs">{JSON.stringify(report.sessionsZeroDuration.map(s => ({ id: s.id, date: s.inicioISO })), null, 2)}</pre>
                    </div>
                </section>
            )}
            {report.sessionsNoRating.length > 0 && (
                <section>
                    <h2 className="text-xl font-semibold mb-2">Sessions with No Rating</h2>
                    <div className="bg-gray-50 p-4 rounded overflow-auto max-h-60">
                        <pre className="text-xs">{JSON.stringify(report.sessionsNoRating.map(s => ({ id: s.id, date: s.inicioISO })), null, 2)}</pre>
                    </div>
                </section>
            )}
            {report.durationMismatches.length > 0 && (
                <section>
                    <h2 className="text-xl font-semibold mb-2">Duration Mismatches</h2>
                    <div className="bg-gray-50 p-4 rounded overflow-auto max-h-60">
                        <pre className="text-xs">{JSON.stringify(report.durationMismatches, null, 2)}</pre>
                    </div>
                </section>
            )}
            {report.duplicates.length > 0 && (
                <section>
                    <h2 className="text-xl font-semibold mb-2">Potential Duplicate Sessions</h2>
                    <div className="bg-gray-50 p-4 rounded overflow-auto max-h-60">
                        <pre className="text-xs">{JSON.stringify(report.duplicates, null, 2)}</pre>
                    </div>
                </section>
            )}
            */}

            {report && (
                <div className="mt-8 border-t pt-8">
                    <h2 className="text-xl font-bold mb-4">Raw Report Data (for extraction)</h2>
                    <pre id="audit-report-text" className="bg-slate-100 p-4 rounded text-xs overflow-auto max-h-96 select-all">
                        {JSON.stringify(report, null, 2)}
                    </pre>
                </div>
            )}
        </div>
    );
}
