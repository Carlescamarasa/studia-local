import React, { useMemo } from 'react';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer
} from 'recharts';
import { useBloques } from '@/features/estudio/hooks/useBloques';
import { useRegistrosSesion } from '@/features/estudio/hooks/useRegistrosSesion';
import { Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { RegistroBloque, Bloque } from '@/features/shared/types/domain';
import { getPPMNormalizado } from '@/utils/ppm';

interface EvolucionPPMChartProps {
    alumnoId: string;
}

export default function EvolucionPPMChart({ alumnoId }: EvolucionPPMChartProps) {
    // 1. Obtener sesiones con bloques embebidos
    const { data: sesiones = [], isLoading: loadingSesiones } = useRegistrosSesion();

    // Extraer bloques embebidos de las sesiones (evita query separada)
    const registros = useMemo(
        () => (sesiones || []).flatMap((s: any) => s.registrosBloque || [])
            .sort((a: RegistroBloque, b: RegistroBloque) => (b.inicioISO || '').localeCompare(a.inicioISO || '')),
        [sesiones]
    );

    // 2. Obtener bloques con hook centralizado
    const { data: bloquesData = [], isLoading: loadingBloques, isError: errorBloques } = useBloques();
    const bloques = bloquesData as Bloque[];

    const chartData = useMemo(() => {
        if (!registros.length || !bloques.length) return [];

        // Mapa de bloques
        const bloquesMap = new Map(bloques.map((b: Bloque) => [b.code, b]));

        // Agrupar por fecha (día)
        const dailyMax: Record<string, Record<string, number>> = {};

        registros.forEach((r: RegistroBloque) => {
            if (!r.ppmAlcanzado || !r.ppmAlcanzado.bpm) return;
            if (r.alumnoId !== alumnoId) return;

            const dateKey = format(new Date(r.inicioISO), 'yyyy-MM-dd');
            const bloque = bloquesMap.get(r.code);

            if (!bloque || !bloque.skillTags) return;

            // Normalizar BPM
            const normalizedBpm = getPPMNormalizado(r.ppmAlcanzado.bpm, r.ppmAlcanzado.unidad);

            if (!dailyMax[dateKey]) {
                dailyMax[dateKey] = {};
            }

            bloque.skillTags.forEach(tag => {
                // Guardar el máximo BPM alcanzado ese día para ese skill
                if (!dailyMax[dateKey][tag] || normalizedBpm > dailyMax[dateKey][tag]) {
                    dailyMax[dateKey][tag] = normalizedBpm;
                }
            });
        });

        // Convertir a array ordenado por fecha
        return Object.entries(dailyMax)
            .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
            .map(([date, skills]) => ({
                fecha: date,
                fechaFormatted: format(new Date(date), 'd MMM', { locale: es }),
                ...skills
            }));
    }, [registros, bloques, alumnoId]);

    if (loadingSesiones || loadingBloques) {
        return (
            <div className="flex justify-center items-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (chartData.length === 0) {
        return (
            <div className="w-full border rounded-lg bg-card text-card-foreground shadow-sm">
                <div className="flex flex-col items-center justify-center h-64 text-muted-foreground p-6">
                    <p>No hay datos de evolución de velocidad disponibles.</p>
                </div>
            </div>
        );
    }

    // Identificar qué skills tenemos para crear las líneas dinámicamente
    const availableSkills = new Set<string>();
    chartData.forEach(d => {
        Object.keys(d).forEach(k => {
            if (k !== 'fecha' && k !== 'fechaFormatted') {
                availableSkills.add(k);
            }
        });
    });

    const colors = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#0088fe', '#00c49f'];

    return (
        <div className="w-full border rounded-lg bg-card text-card-foreground shadow-sm">
            <div className="p-6 flex flex-col space-y-1.5">
                <h3 className="font-semibold leading-none tracking-tight text-center">Evolución de Velocidad (PPM Normalizado)</h3>
                <p className="text-sm text-muted-foreground text-center">
                    Progreso real basado en la práctica diaria
                </p>
            </div>
            <div className="p-6 pt-0">
                <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis
                                dataKey="fechaFormatted"
                                tick={{ fontSize: 12 }}
                                tickMargin={10}
                            />
                            <YAxis
                                tick={{ fontSize: 12 }}
                                domain={['auto', 'auto']}
                                label={{ value: 'BPM (Negra)', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle' } }}
                            />
                            <Tooltip
                                labelFormatter={(label) => `Fecha: ${label}`}
                                formatter={(value: number) => [`${Math.round(value)} BPM`]}
                            />
                            <Legend />

                            {Array.from(availableSkills).map((skill, index) => (
                                <Line
                                    key={skill}
                                    type="monotone"
                                    dataKey={skill}
                                    name={skill.charAt(0).toUpperCase() + skill.slice(1)}
                                    stroke={colors[index % colors.length]}
                                    strokeWidth={2}
                                    dot={{ r: 4 }}
                                    connectNulls
                                />
                            ))}
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
}
