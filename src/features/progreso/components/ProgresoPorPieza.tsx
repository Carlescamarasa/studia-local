/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, Badge } from "@/features/shared/components/ds";
import { Music, BarChart3 } from "lucide-react";
import { componentStyles } from "@/design/componentStyles";
import { useIsMobile } from "@/hooks/use-mobile";
import { formatDuracionHM } from "../utils/progresoUtils";
import StatCard from "./StatCard";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';

/**
 * ProgresoPorPieza - Componente para mostrar progreso por pieza
 */
export interface ProgresoPorPiezaProps {
    progresoPorPieza: Array<{
        piezaNombre: string;
        tiempoTotal: number;
        sesiones: number;
        calificacionPromedio: number | null;
        ratioCompletado: number;
    }>;
}

export default function ProgresoPorPieza({ progresoPorPieza }: ProgresoPorPiezaProps) {
    const isMobile = useIsMobile();

    if (progresoPorPieza.length === 0) {
        return (
            <Card className={componentStyles.components.cardBase}>
                <CardHeader>
                    <CardTitle className="text-sm sm:text-base md:text-lg flex items-center gap-2">
                        <Music className="w-4 h-4 sm:w-5 sm:h-5 text-[var(--color-primary)]" />
                        Progreso por Pieza
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-center py-8 text-[var(--color-text-secondary)]">
                        No hay datos de piezas en el periodo seleccionado
                    </div>
                </CardContent>
            </Card>
        );
    }

    const datosGrafico = progresoPorPieza.map(p => ({
        nombre: p.piezaNombre.length > 15 ? p.piezaNombre.substring(0, 15) + '...' : p.piezaNombre,
        tiempo: Math.round(p.tiempoTotal / 60), // Convertir a minutos
        sesiones: p.sesiones,
    }));

    return (
        <div className="space-y-6">
            {/* Métricas resumen */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                <StatCard
                    value={progresoPorPieza.length}
                    label="Piezas practicadas"
                    icon={Music}
                    variant="primary"
                />
                <StatCard
                    value={progresoPorPieza.reduce((sum, p) => sum + p.sesiones, 0)}
                    label="Total sesiones"
                    icon={BarChart3}
                    variant="info"
                />
                <StatCard
                    value={formatDuracionHM(progresoPorPieza.reduce((sum, p) => sum + p.tiempoTotal, 0))}
                    label="Tiempo total"
                    icon={BarChart3}
                    variant="primary"
                />
                <StatCard
                    value={progresoPorPieza.filter(p => p.calificacionPromedio).length}
                    label="Con calificación"
                    icon={Music}
                    variant="success"
                />
            </div>

            {/* Gráfico de barras */}
            <Card className={componentStyles.components.cardBase}>
                <CardHeader>
                    <CardTitle className="text-sm sm:text-base md:text-lg flex items-center gap-2">
                        <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5 text-[var(--color-primary)]" />
                        Tiempo por Pieza
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="w-full">
                        <ResponsiveContainer width="100%" height={isMobile ? 250 : 350}>
                            <BarChart data={datosGrafico} margin={{ top: 5, right: isMobile ? 5 : 20, left: isMobile ? -10 : 0, bottom: isMobile ? 60 : 40 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
                                <XAxis
                                    dataKey="nombre"
                                    tick={{ fontSize: isMobile ? 9 : 11 }}
                                    angle={isMobile ? -45 : -30}
                                    textAnchor='end'
                                    height={isMobile ? 80 : 60}
                                />
                                <YAxis
                                    tick={{ fontSize: isMobile ? 9 : 11 }}
                                    width={isMobile ? 30 : 50}
                                />
                                <RechartsTooltip
                                    formatter={(value: any) => [`${value} min`, 'Tiempo']}
                                    contentStyle={{
                                        backgroundColor: 'var(--color-surface-elevated)',
                                        border: '1px solid var(--color-border-default)',
                                        borderRadius: '8px',
                                        fontSize: isMobile ? '11px' : '12px',
                                    }}
                                />
                                <Bar dataKey="tiempo" fill="var(--color-primary)" name="Tiempo (min)" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>

            {/* Lista detallada */}
            <Card className={componentStyles.components.cardBase}>
                <CardHeader>
                    <CardTitle className="text-sm sm:text-base md:text-lg flex items-center gap-2">
                        <Music className="w-4 h-4 sm:w-5 sm:h-5 text-[var(--color-primary)]" />
                        Detalle por Pieza
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {progresoPorPieza.map((pieza, idx) => (
                            <div
                                key={idx}
                                className="p-4 border border-[var(--color-border-default)] rounded-lg hover:bg-[var(--color-surface-muted)] transition-colors"
                            >
                                <div className="flex items-start justify-between gap-3 mb-2">
                                    <h3 className="font-semibold text-sm sm:text-base text-[var(--color-text-primary)] flex-1">
                                        {pieza.piezaNombre}
                                    </h3>
                                    {pieza.calificacionPromedio && (
                                        <Badge className={componentStyles.status.badgeSuccess}>
                                            ⭐ {pieza.calificacionPromedio}/4
                                        </Badge>
                                    )}
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
                                    <div>
                                        <p className="text-xs text-[var(--color-text-secondary)]">Tiempo</p>
                                        <p className="text-sm font-medium text-[var(--color-text-primary)]">
                                            {formatDuracionHM(pieza.tiempoTotal)}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-[var(--color-text-secondary)]">Sesiones</p>
                                        <p className="text-sm font-medium text-[var(--color-text-primary)]">
                                            {pieza.sesiones}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-[var(--color-text-secondary)]">Ratio completado</p>
                                        <p className="text-sm font-medium text-[var(--color-text-primary)]">
                                            {pieza.ratioCompletado}%
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-[var(--color-text-secondary)]">Promedio/sesión</p>
                                        <p className="text-sm font-medium text-[var(--color-text-primary)]">
                                            {formatDuracionHM(pieza.tiempoTotal / pieza.sesiones)}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
