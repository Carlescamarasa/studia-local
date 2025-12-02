import React, { useState, useMemo } from 'react';
import HabilidadesRadarChart from './HabilidadesRadarChart';
import EvolucionPPMChart from './EvolucionPPMChart';
import HabilidadesTrabajadas from './HabilidadesTrabajadas';
import { useHabilidadesStats, DataSource } from '@/hooks/useHabilidadesStats';
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Activity, ClipboardList, Layers } from 'lucide-react';

interface HabilidadesViewProps {
    alumnoId: string;
}

export default function HabilidadesView({ alumnoId }: HabilidadesViewProps) {
    const [showEvaluaciones, setShowEvaluaciones] = useState(true);
    const [showExperiencia, setShowExperiencia] = useState(true);
    const { experienceStats, evaluationStats, isLoading } = useHabilidadesStats(alumnoId);

    // Determine data for Radar Chart
    const radarData = useMemo(() => {
        if (!showEvaluaciones && !showExperiencia) return [];

        if (showEvaluaciones && !showExperiencia) return evaluationStats;
        if (!showEvaluaciones && showExperiencia) return experienceStats.radarData;

        if (showEvaluaciones && showExperiencia) {
            // Standard subjects to ensure consistent order
            const subjects = ['Sonido', 'Flexibilidad', 'Motricidad', 'Articulación (T)', 'Cognitivo'];

            return subjects.map(subject => {
                const evalItem = evaluationStats?.find((i: any) => i.subject === subject);
                const expItem = experienceStats.radarData.find((i: any) => i.subject === subject);

                return {
                    subject,
                    A: evalItem?.A || 0,
                    B: expItem?.A || 0,
                    original: evalItem?.original,
                    originalExperiencia: expItem?.original,
                    fullMark: 10
                };
            });
        }
        return [];
    }, [showEvaluaciones, showExperiencia, evaluationStats, experienceStats]);

    // Determine data for List
    const listData = experienceStats.listData;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h3 className="text-lg font-semibold">Habilidades Maestras</h3>

                <div className="flex items-center gap-2 bg-muted/50 p-1 rounded-lg">
                    <ToggleGroup type="multiple" value={[showEvaluaciones ? 'evaluaciones' : '', showExperiencia ? 'experiencia' : ''].filter(Boolean)}>
                        <ToggleGroupItem
                            value="evaluaciones"
                            aria-label="Evaluaciones"
                            className="gap-2 px-3 data-[state=on]:bg-[var(--color-accent)]/10 data-[state=on]:text-[var(--color-accent)] data-[state=on]:border-[var(--color-accent)] data-[state=on]:border data-[state=on]:shadow-sm hover:text-[var(--color-accent)] transition-all"
                            onClick={() => setShowEvaluaciones(!showEvaluaciones)}
                        >
                            <ClipboardList className="h-4 w-4" />
                            <span className="text-sm font-medium">Evaluaciones</span>
                        </ToggleGroupItem>
                        <ToggleGroupItem
                            value="experiencia"
                            aria-label="Experiencia"
                            className="gap-2 px-3 data-[state=on]:bg-[var(--color-accent)]/10 data-[state=on]:text-[var(--color-accent)] data-[state=on]:border-[var(--color-accent)] data-[state=on]:border data-[state=on]:shadow-sm hover:text-[var(--color-accent)] transition-all"
                            onClick={() => setShowExperiencia(!showExperiencia)}
                        >
                            <Activity className="h-4 w-4" />
                            <span className="text-sm font-medium">Experiencia</span>
                        </ToggleGroupItem>
                    </ToggleGroup>
                </div>
            </div>

            <div className="p-4 border rounded-lg bg-card text-card-foreground shadow-sm">
                {!showEvaluaciones && !showExperiencia ? (
                    <div className="text-center py-12 text-muted-foreground">
                        <Layers className="h-12 w-12 mx-auto mb-4 opacity-20" />
                        <p>Activa al menos una fuente para mostrar resultados.</p>
                    </div>
                ) : (
                    <>
                        <p className="text-muted-foreground mb-4 text-sm">
                            {showEvaluaciones && !showExperiencia && 'Basado en las evaluaciones manuales del profesor.'}
                            {!showEvaluaciones && showExperiencia && 'Basado en los registros de práctica de los últimos 30 días.'}
                            {showEvaluaciones && showExperiencia && 'Comparativa entre evaluación del profesor y datos de práctica.'}
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                            <HabilidadesRadarChart
                                data={radarData || []}
                                isLoading={isLoading}
                                dataKey1="A"
                                dataKey2={showEvaluaciones && showExperiencia ? "B" : undefined}
                            />
                            <EvolucionPPMChart alumnoId={alumnoId} />
                        </div>

                        {showExperiencia && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <HabilidadesTrabajadas data={listData} isLoading={isLoading} />
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
