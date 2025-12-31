/* eslint-disable @typescript-eslint/no-explicit-any */
 
import React from 'react';
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
import { Loader2 } from 'lucide-react';

interface HabilidadesRadarChartProps {
    data: any[];
    isLoading?: boolean;
    dataKey1?: string; // Evaluaciones
    dataKey2?: string; // Experiencia
    dataKey3?: string; // Total
    compact?: boolean; // Compact mode with reduced height
    hideLegend?: boolean; // Hide internal legend for external rendering
}

export default function HabilidadesRadarChart({ data, isLoading, dataKey1, dataKey2, dataKey3, compact = false, hideLegend = false }: HabilidadesRadarChartProps) {
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

    // Determine which series are being shown
    const hasEvaluaciones = !!dataKey1;
    const hasExperiencia = !!dataKey2;
    const hasTotal = !!dataKey3;
    const showMultipleSeries = (hasEvaluaciones ? 1 : 0) + (hasExperiencia ? 1 : 0) + (hasTotal ? 1 : 0) > 1;

    return (
        <div className={compact ? "w-full" : "w-full max-w-md mx-auto"}>
            <div className={compact ? "h-[300px] w-full" : "h-[300px] w-full"}>
                <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius={compact ? "65%" : "70%"} data={data}>
                        <PolarGrid stroke="var(--color-border-default)" strokeOpacity={0.7} />
                        <PolarAngleAxis
                            dataKey="subject"
                            tick={{ fill: 'var(--color-text-primary)', fontSize: 11, fontWeight: 500 }}
                            tickLine={false}
                        />
                        <PolarRadiusAxis angle={30} domain={[0, 10]} tick={false} axisLine={false} />

                        {/* Layer 3: Total (Background - Gray) */}
                        {dataKey3 && (
                            <Radar
                                name="Total"
                                dataKey={dataKey3}
                                stroke="#64748b" // Slate-500
                                fill="#64748b"
                                fillOpacity={0.15}
                            />
                        )}

                        {/* Layer 2: Experiencia (Green) */}
                        {dataKey2 && (
                            <Radar
                                name="Experiencia"
                                dataKey={dataKey2}
                                stroke="#10b981" // Emerald-500
                                fill="#10b981"
                                fillOpacity={0.4}
                            />
                        )}

                        {/* Layer 1: Evaluaciones (Orange/Primary) - Foreground */}
                        {dataKey1 && (
                            <Radar
                                name="Evaluaciones"
                                dataKey={dataKey1}
                                stroke="#f97316" // Orange-500
                                fill="#f97316"
                                fillOpacity={showMultipleSeries ? 0.25 : 0.4}
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
                                // For qualitative skills (Sonido, Cognición): show value directly (0-10)
                                const isQualitative = props.payload.subject === 'Sonido' || props.payload.subject === 'Cognición';

                                if (isQualitative) {
                                    return [value.toFixed(1) + ' / 10', name];
                                }

                                // For quantitative skills: show original XP values
                                const maxXP = props.payload.maxXP || 0;
                                let originalValue = 0;

                                if (name === 'Experiencia') {
                                    originalValue = props.payload.originalExp || 0;
                                } else if (name === 'Evaluaciones') {
                                    originalValue = props.payload.originalEval || 0;
                                } else if (name === 'Total') {
                                    originalValue = props.payload.originalTotal || 0;
                                }

                                return [`${Math.round(originalValue)} / ${maxXP} XP (${value.toFixed(1)}/10)`, name];
                            }}
                        />
                        {showMultipleSeries && !hideLegend && (
                            <Legend
                                wrapperStyle={{ paddingTop: '10px' }}
                                iconType="circle"
                            />
                        )}
                    </RadarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
