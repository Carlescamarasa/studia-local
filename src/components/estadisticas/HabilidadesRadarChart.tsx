import React, { useMemo } from 'react';
import {
    Radar,
    RadarChart,
    PolarGrid,
    PolarAngleAxis,
    PolarRadiusAxis,
    ResponsiveContainer,
    Tooltip,
    Legend
} from 'recharts';
import { useEvaluaciones } from '@/hooks/useEvaluaciones';
import { Loader2 } from 'lucide-react';

interface HabilidadesRadarChartProps {
    data: any[];
    isLoading?: boolean;
    dataKey1?: string;
    dataKey2?: string;
    dataKey3?: string;
}

export default function HabilidadesRadarChart({ data, isLoading, dataKey1 = "A", dataKey2, dataKey3 }: HabilidadesRadarChartProps) {
    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (!data || data.length === 0) {
        return (
            <div className="w-full max-w-md mx-auto border rounded-lg bg-card text-card-foreground shadow-sm">
                <div className="flex flex-col items-center justify-center h-64 text-muted-foreground p-6">
                    <p>No hay datos disponibles para la visualización seleccionada.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full max-w-md mx-auto border rounded-lg bg-card text-card-foreground shadow-sm">
            <div className="p-6 flex flex-col space-y-1.5">
                <h3 className="font-semibold leading-none tracking-tight text-center">Perfil Técnico</h3>
            </div>
            <div className="p-6 pt-0">
                <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
                            <PolarGrid stroke="var(--color-border-default)" strokeOpacity={0.4} />
                            <PolarAngleAxis
                                dataKey="subject"
                                tick={{ fill: 'var(--color-text-primary)', fontSize: 11, fontWeight: 500 }}
                                tickLine={false}
                            />
                            <PolarRadiusAxis angle={30} domain={[0, 10]} tick={false} axisLine={false} />

                            {/* Layer 3: Total (Background) */}
                            {dataKey3 && (
                                <Radar
                                    name="Total"
                                    dataKey={dataKey3}
                                    stroke="#64748b" // Slate-500
                                    fill="#64748b"
                                    fillOpacity={0.15}
                                />
                            )}

                            {/* Layer 2: Experience (Green) */}
                            {dataKey2 && (
                                <Radar
                                    name="Experiencia"
                                    dataKey={dataKey2}
                                    stroke="#10b981" // Emerald-500
                                    fill="#10b981"
                                    fillOpacity={0.4}
                                />
                            )}

                            {/* Layer 1: Evaluation (Orange/Primary) - Foreground */}
                            {dataKey1 && (
                                <Radar
                                    name={dataKey2 ? "Evaluación" : "Habilidades"}
                                    dataKey={dataKey1}
                                    stroke="var(--color-primary)"
                                    fill="var(--color-primary)"
                                    fillOpacity={dataKey2 ? 0.2 : 0.4}
                                />
                            )}

                            <Tooltip
                                contentStyle={{
                                    backgroundColor: 'var(--color-surface-elevated)',
                                    border: '1px solid var(--color-border-default)',
                                    borderRadius: '8px',
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                                }}
                                formatter={(value: number, name: string, props: any) => {
                                    // Show original value if exists (for XP), otherwise normalized value (0-10)
                                    let key = "original";
                                    if (name === "Experiencia") key = "originalExperiencia";
                                    if (name === "Total") key = "originalTotal";

                                    const original = props.payload[key];
                                    return [original !== undefined ? `${original} XP` : value.toFixed(1), name];
                                }}
                            />
                            <Legend
                                wrapperStyle={{ paddingTop: '10px' }}
                                iconType="circle"
                            />
                        </RadarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
}
