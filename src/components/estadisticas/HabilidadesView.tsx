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
    const [dataSource, setDataSource] = useState<DataSource>('evaluaciones');
    const { experienceStats, evaluationStats, isLoading } = useHabilidadesStats(alumnoId);

    // Determine data for Radar Chart
    const radarData = useMemo(() => {
        if (dataSource === 'evaluaciones') return evaluationStats;
        if (dataSource === 'experiencia') return experienceStats.radarData;

        if (dataSource === 'ambas') {
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
    }, [dataSource, evaluationStats, experienceStats]);

    // Determine data for List
    const listData = experienceStats.listData;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h3 className="text-lg font-semibold">Habilidades Maestras</h3>

                <div className="flex items-center gap-2 bg-muted/50 p-1 rounded-lg">
                    <ToggleGroup type="single" value={dataSource} onValueChange={(val) => val && setDataSource(val as DataSource)}>
                        <ToggleGroupItem value="evaluaciones" aria-label="Evaluaciones" className="gap-2 px-3">
                            <ClipboardList className="h-4 w-4" />
                            <span className="text-sm">Evaluaciones</span>
                        </ToggleGroupItem>
                        <ToggleGroupItem value="experiencia" aria-label="Experiencia" className="gap-2 px-3">
                            <Activity className="h-4 w-4" />
                            <span className="text-sm">Experiencia</span>
                        </ToggleGroupItem>
                        <ToggleGroupItem value="ambas" aria-label="Ambas" className="gap-2 px-3">
                            <Layers className="h-4 w-4" />
                            <span className="text-sm">Ambas</span>
                        </ToggleGroupItem>
                    </ToggleGroup>
                </div>
            </div>

            <div className="p-4 border rounded-lg bg-card text-card-foreground shadow-sm">
                <p className="text-muted-foreground mb-4 text-sm">
                    {dataSource === 'evaluaciones' && 'Basado en las evaluaciones manuales del profesor.'}
                    {dataSource === 'experiencia' && 'Basado en los registros de práctica de los últimos 30 días.'}
                    {dataSource === 'ambas' && 'Comparativa entre evaluación del profesor y datos de práctica.'}
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <HabilidadesRadarChart
                        data={radarData || []}
                        isLoading={isLoading}
                        dataKey1="A"
                        dataKey2={dataSource === 'ambas' ? "B" : undefined}
                    />
                    <EvolucionPPMChart alumnoId={alumnoId} />
                </div>

                {(dataSource === 'experiencia' || dataSource === 'ambas') && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <HabilidadesTrabajadas data={listData} isLoading={isLoading} />
                    </div>
                )}
            </div>
        </div>
    );
}
