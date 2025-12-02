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
}

export default function HabilidadesRadarChart({ data, isLoading, dataKey1 = "A", dataKey2 }: HabilidadesRadarChartProps) {
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
                            <PolarGrid stroke="var(--color-border-default)" />
                            <PolarAngleAxis dataKey="subject" tick={{ fill: 'var(--color-text-secondary)', fontSize: 12 }} />
                            <PolarRadiusAxis angle={30} domain={[0, 10]} tick={false} axisLine={false} />

                            <Radar
                                name={dataKey2 ? "Evaluación" : "Habilidades"}
                                dataKey={dataKey1}
                                stroke="var(--color-primary)"
                                fill="var(--color-primary)"
                                fillOpacity={dataKey2 ? 0.2 : 0.4}
                            />

                            {dataKey2 && (
                                <Radar
                                    name="Experiencia"
                                    dataKey={dataKey2}
                                    stroke="#10b981" // Green for experience? Or maybe secondary color?
                                    fill="#10b981"
                                    fillOpacity={0.4}
                                />
                            )}

                            <Tooltip
                                formatter={(value: number, name: string, props: any) => {
                                    // Mostrar valor original si existe (para BPM), sino el valor normalizado (0-10)
                                    // Si hay dos series, el props.payload tendrá ambas.
                                    // Pero el formatter se llama por cada serie.
                                    // Si es la serie "Experiencia", buscamos originalExperiencia?
                                    // Esto se complica si no estandarizamos los nombres.

                                    // Simplificación: mostrar el valor normalizado por ahora, o intentar buscar el original.
                                    // Si el data tiene { subject, A, B, originalA, originalB }

                                    const key = name === "Experiencia" ? "originalExperiencia" : "original";
                                    const original = props.payload[key];
                                    return [original !== undefined ? `${original} BPM` : value.toFixed(1), name];
                                }}
                            />
                            <Legend />
                        </RadarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
}
