import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Settings, ScrollText, Music, Calendar, Layers, Target, MessageSquare, Activity, PlayCircle, Users, Shield } from 'lucide-react';
import { localDataClient } from '@/api/localDataClient';
import { Card, CardContent } from '@/features/shared/components/ds';
import { useEffectiveUser } from "@/providers/EffectiveUserProvider";
import { PageHeader } from '@/features/shared/components/ds/PageHeader';
import ModeToggle from './ModeToggle';
import SeedsPanel from './SeedsPanel';
import TestsPanel from './TestsPanel';
import LogsDrawer from './LogsDrawer';
import { Button } from '@/features/shared/components/ds/Button';

interface SeedStat {
    piezas?: number;
    planes?: number;
    bloques?: number;
    asignaciones?: number;
    feedbacks?: number;
    registrosSesion?: number;
    registrosBloques?: number;
    usersCount?: number;
    usersAdmin?: number;
    usersProf?: number;
    usersEstu?: number;
}

interface LogEntry {
    message: string;
    type: 'info' | 'success' | 'error' | 'warning';
    timestamp: string;
}

interface MaintenancePanelProps {
    embedded?: boolean;
}

/**
 * MaintenancePanel - Main orchestrator for Seeds and Tests
 */
export default function MaintenancePanel({ embedded = false }: MaintenancePanelProps) {
    const [mode, setMode] = useState<'seeds' | 'tests'>('seeds');
    const [seedLogs, setSeedLogs] = useState<LogEntry[]>([]);
    const [logsDrawerOpen, setLogsDrawerOpen] = useState(false);

    const effectiveUser = useEffectiveUser();

    // Fetch stats
    const { data: stats, refetch: refetchStats } = useQuery<SeedStat>({
        queryKey: ['seedStats'],
        queryFn: async () => {
            return await localDataClient.getSeedStats();
        },
    });

    const addLog = (message: string, type: 'info' | 'success' | 'error' | 'warning' = 'info') => {
        setSeedLogs(prev => [...prev, { message, type, timestamp: new Date().toLocaleTimeString() }]);
    };

    const clearLogs = () => setSeedLogs([]);

    const handleRunTest = async (test: any) => {
        addLog(`Running test: ${test.name}...`, 'info');
        try {
            const result = await test.fn();
            addLog(`Test ${test.name}: ${result.passed ? '✅ PASSED' : '❌ FAILED'} - ${result.message}`,
                result.passed ? 'success' : 'error');
            return result;
        } catch (error: any) {
            addLog(`Test ${test.name}: ❌ ERROR - ${error.message}`, 'error');
            return { passed: false, message: error.message };
        }
    };

    const handleRunSmokeSuite = () => {
        // Results are already logged by SmokeSuiteButton
        // Just open the logs drawer to show results
        setLogsDrawerOpen(true);
    };

    // Access control
    if (effectiveUser.loading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <p className="text-muted-foreground">Cargando permisos...</p>
            </div>
        );
    }

    if (effectiveUser.effectiveRole !== 'ADMIN') {
        return (
            <div className="flex items-center justify-center min-h-[80vh]">
                <Card className="max-w-md app-card">
                    <CardContent className="pt-6 text-center space-y-4">
                        <Shield className="w-16 h-16 mx-auto text-[var(--color-danger)]" />
                        <div>
                            <h2 className="font-semibold text-lg text-[var(--color-text-primary)] mb-2">Acceso Denegado</h2>
                            <p className="text-[var(--color-text-secondary)]">Esta vista requiere permisos de Administrador.</p>
                            {import.meta.env.DEV && (
                                <p className="text-xs text-muted-foreground mt-2">
                                    Rol detectado: {effectiveUser.effectiveRole || 'Ninguno'}
                                </p>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Stats counts
    const countPiezas = stats?.piezas || 0;
    const countPlanes = stats?.planes || 0;
    const countBloques = stats?.bloques || 0;
    const countAsignaciones = stats?.asignaciones || 0;
    const countFeedbacks = stats?.feedbacks || 0;
    const countRegistrosSesion = stats?.registrosSesion || 0;
    const countRegistrosBloques = stats?.registrosBloques || 0;
    const countUsuarios = stats?.usersCount || 0;
    const countAdmin = stats?.usersAdmin || 0;
    const countProf = stats?.usersProf || 0;
    const countEstu = stats?.usersEstu || 0;

    return (
        <div className={embedded ? "" : "min-h-screen bg-background"}>
            {!embedded && (
                <PageHeader
                    icon={Settings}
                    title="Maintenance Panel"
                    subtitle="Herramientas de mantenimiento: datos de prueba y validaciones del sistema"
                />
            )}

            <div className="studia-section space-y-6">
                {/* Mode Toggle */}
                <div className="flex items-center justify-between">
                    <ModeToggle mode={mode} onModeChange={setMode} />

                    {/* Logs Button */}
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setLogsDrawerOpen(!logsDrawerOpen)}
                        className="relative"
                        aria-label="Toggle logs drawer"
                    >
                        <ScrollText className="w-4 h-4 mr-2" />
                        Logs
                        {seedLogs.length > 0 && (
                            <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-[var(--color-primary)] rounded-full">
                                {seedLogs.length > 99 ? '99+' : seedLogs.length}
                            </span>
                        )}
                    </Button>
                </div>

                {/* Stats Dashboard */}
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 sm:gap-4 md:gap-6">
                    <div className="text-center min-w-[80px] sm:min-w-[100px]">
                        <Music className="w-4 h-4 sm:w-5 sm:h-5 mx-auto mb-1 text-[var(--color-primary)]" />
                        <p className="text-xl sm:text-2xl font-bold text-[var(--color-text-primary)]">{countPiezas}</p>
                        <p className="text-[10px] sm:text-xs text-[var(--color-text-secondary)]">Piezas</p>
                    </div>

                    <div className="text-center min-w-[80px] sm:min-w-[100px]">
                        <Calendar className="w-4 h-4 sm:w-5 sm:h-5 mx-auto mb-1 text-[var(--color-info)]" />
                        <p className="text-xl sm:text-2xl font-bold text-[var(--color-text-primary)]">{countPlanes}</p>
                        <p className="text-[10px] sm:text-xs text-[var(--color-text-secondary)]">Planes</p>
                    </div>

                    <div className="text-center min-w-[80px] sm:min-w-[100px]">
                        <Layers className="w-4 h-4 sm:w-5 sm:h-5 mx-auto mb-1 text-[var(--color-primary)]" />
                        <p className="text-xl sm:text-2xl font-bold text-[var(--color-text-primary)]">{countBloques}</p>
                        <p className="text-[10px] sm:text-xs text-[var(--color-text-secondary)]">Ejercicios</p>
                    </div>

                    <div className="text-center min-w-[80px] sm:min-w-[100px]">
                        <Target className="w-4 h-4 sm:w-5 sm:h-5 mx-auto mb-1 text-[var(--color-primary)]" />
                        <p className="text-xl sm:text-2xl font-bold text-[var(--color-text-primary)]">{countAsignaciones}</p>
                        <p className="text-[10px] sm:text-xs text-[var(--color-text-secondary)]">Asignaciones</p>
                    </div>

                    <div className="text-center min-w-[80px] sm:min-w-[100px]">
                        <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5 mx-auto mb-1 text-[var(--color-info)]" />
                        <p className="text-xl sm:text-2xl font-bold text-[var(--color-text-primary)]">{countFeedbacks}</p>
                        <p className="text-[10px] sm:text-xs text-[var(--color-text-secondary)]">Feedbacks</p>
                    </div>

                    <div className="text-center min-w-[80px] sm:min-w-[100px]">
                        <Activity className="w-4 h-4 sm:w-5 sm:h-5 mx-auto mb-1 text-[var(--color-success)]" />
                        <p className="text-xl sm:text-2xl font-bold text-[var(--color-text-primary)]">{countRegistrosSesion}</p>
                        <p className="text-[10px] sm:text-xs text-[var(--color-text-secondary)]">Sesiones</p>
                    </div>

                    <div className="text-center min-w-[80px] sm:min-w-[100px]">
                        <PlayCircle className="w-4 h-4 sm:w-5 sm:h-5 mx-auto mb-1 text-[var(--color-primary)]" />
                        <p className="text-xl sm:text-2xl font-bold text-[var(--color-text-primary)]">{countRegistrosBloques}</p>
                        <p className="text-[10px] sm:text-xs text-[var(--color-text-secondary)]">Bloques</p>
                    </div>

                    <div className="text-center min-w-[80px] sm:min-w-[100px]">
                        <Users className="w-4 h-4 sm:w-5 sm:h-5 mx-auto mb-1 text-[var(--color-primary)]" />
                        <p className="text-xl sm:text-2xl font-bold text-[var(--color-text-primary)]">{countUsuarios}</p>
                        <p className="text-[10px] sm:text-xs text-[var(--color-text-secondary)]">Usuarios</p>
                        <p className="text-[9px] sm:text-[10px] text-[var(--color-text-muted)] mt-0.5">
                            {countAdmin}A {countProf}P {countEstu}E
                        </p>
                    </div>
                </div>

                {/* Content based on mode */}
                {mode === 'seeds' ? (
                    <SeedsPanel addLog={addLog} />
                ) : (
                    <TestsPanel
                        addLog={addLog}
                    />
                )}
            </div>

            {/* Logs Drawer */}
            <LogsDrawer
                logs={seedLogs}
                onClear={clearLogs}
                isOpen={logsDrawerOpen}
                onToggle={() => setLogsDrawerOpen(!logsDrawerOpen)}
            />
        </div>
    );
}
