import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { localDataClient } from '@/api/localDataClient';
import { useEvaluaciones } from '@/hooks/useEvaluaciones';
import { RegistroBloque, Bloque } from '@/types/domain';

export type DataSource = 'evaluaciones' | 'experiencia' | 'ambas';

export function useHabilidadesStats(alumnoId: string) {
    // 1. Fetch Practice Data
    const { data: registros = [], isLoading: loadingRegistros } = useQuery({
        queryKey: ['registrosBloque', alumnoId],
        queryFn: () => localDataClient.entities.RegistroBloque.list('-inicioISO'),
    });

    const { data: bloques = [], isLoading: loadingBloques } = useQuery<Bloque[]>({
        queryKey: ['bloques'],
        queryFn: async () => {
            const result = await localDataClient.entities.Bloque.list();
            return result as Bloque[];
        },
    });

    // 2. Fetch Evaluations Data
    const { evaluaciones, isLoading: loadingEvaluaciones } = useEvaluaciones(alumnoId);

    // 3. Calculate Experience Stats
    const experienceStats = useMemo(() => {
        if (!registros.length || !bloques.length) return { skillCounts: [], radarData: [] };

        const hace30dias = new Date();
        hace30dias.setDate(hace30dias.getDate() - 30);

        const bloquesMap = new Map(bloques.map((b: Bloque) => [b.code, b]));
        const skillCounts: Record<string, number> = {};
        const skillBPMs: Record<string, number[]> = {};

        registros.forEach((r: RegistroBloque) => {
            // Filter: Student + Completed + Recent + Has PPM
            if (r.alumnoId !== alumnoId || r.estado !== 'completado' || !r.ppmAlcanzado || r.ppmAlcanzado.bpm <= 0) return;
            if (new Date(r.inicioISO) < hace30dias) return;

            const bloque = bloquesMap.get(r.code);

            // STRICT FILTER: Must have targetPPMs AND skillTags
            if (!bloque || !bloque.targetPPMs || !bloque.skillTags || bloque.skillTags.length === 0) return;

            bloque.skillTags.forEach(tag => {
                skillCounts[tag] = (skillCounts[tag] || 0) + 1;

                if (!skillBPMs[tag]) skillBPMs[tag] = [];
                skillBPMs[tag].push(r.ppmAlcanzado!.bpm);
            });
        });

        // Format for List
        const listData = Object.entries(skillCounts)
            .map(([skill, count]) => ({ skill, count }))
            .sort((a, b) => b.count - a.count);

        // Format for Radar (Normalize BPM to 0-10 scale, e.g., 120bpm = 10)
        // This is a heuristic. We might need a better normalization based on targetPPMs.
        // For now, let's assume 120 is max.
        const radarData = Object.entries(skillBPMs).map(([skill, bpms]) => {
            const avgBpm = bpms.reduce((a, b) => a + b, 0) / bpms.length;
            return {
                subject: skill,
                A: Math.min(avgBpm / 12, 10), // 120 bpm -> 10
                original: Math.round(avgBpm),
                fullMark: 10
            };
        });

        return { listData, radarData };
    }, [registros, bloques, alumnoId]);

    // 4. Process Evaluations Data (Latest)
    const evaluationStats = useMemo(() => {
        if (!evaluaciones || evaluaciones.length === 0) return null;

        // Sort by date desc
        const latest = [...evaluaciones].sort((a, b) =>
            new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
        )[0];

        if (!latest || !latest.habilidades) return null;

        const h = latest.habilidades;

        // Map to Radar format
        return [
            { subject: 'Sonido', A: h.sonido || 0, fullMark: 10 },
            { subject: 'Flexibilidad', A: h.flexibilidad || 0, fullMark: 10 },
            { subject: 'Motricidad', A: h.motricidad ? Math.min(h.motricidad / 12, 10) : 0, original: h.motricidad, fullMark: 10 },
            { subject: 'Articulación (T)', A: h.articulacion?.t ? Math.min(h.articulacion.t / 12, 10) : 0, original: h.articulacion?.t, fullMark: 10 },
            { subject: 'Cognitivo', A: h.cognitivo || 0, fullMark: 10 },
        ];
    }, [evaluaciones]);

    return {
        experienceStats,
        evaluationStats,
        isLoading: loadingRegistros || loadingBloques || loadingEvaluaciones
    };
}
