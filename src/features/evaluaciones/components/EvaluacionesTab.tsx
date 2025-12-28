import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ds";
import { ClipboardCheck, Gauge, Music, Brain, Zap, Target } from "lucide-react";
import { componentStyles } from "@/design/componentStyles";
import UnifiedTable from "@/components/tables/UnifiedTable";
import { parseLocalDate } from "@/features/progreso/utils/progresoUtils";

/**
 * EvaluacionesTab - Muestra evaluaciones técnicas del profesor
 */
export interface EvaluacionesTabProps {
    evaluaciones: any[];
    usuarios: Record<string, any>;
    emptyMessage?: string;
    compact?: boolean;
}

export default function EvaluacionesTab({
    evaluaciones = [],
    usuarios = {},
    emptyMessage = "No hay evaluaciones técnicas en el periodo seleccionado",
    compact = false
}: EvaluacionesTabProps) {

    // Formatear nombre del evaluador
    const getEvaluadorNombre = (profesorId: string) => {
        const usuario = usuarios[profesorId];
        return usuario?.nombre || usuario?.displayName || 'Profesor';
    };

    // Formatear fecha
    const formatFecha = (fechaISO: string) => {
        if (!fechaISO) return 'Sin fecha';
        const date = parseLocalDate(fechaISO);
        return date.toLocaleDateString('es-ES', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    // Renderizar habilidades evaluadas
    const renderHabilidades = (habilidades: any) => {
        if (!habilidades) return <span className="text-[var(--color-text-secondary)]">—</span>;

        const skills: React.ReactNode[] = [];

        // Sonido (0-10)
        if (habilidades.sonido !== undefined && habilidades.sonido !== null) {
            skills.push(
                <div key="sonido" className="flex items-center gap-1.5 text-xs">
                    <Music className="w-3.5 h-3.5 text-blue-500" />
                    <span className="font-medium text-[var(--color-text-primary)]">Sonido:</span>
                    <span className="text-[var(--color-text-primary)]">{habilidades.sonido}/10</span>
                </div>
            );
        }

        // Flexibilidad (0-10)
        if (habilidades.flexibilidad !== undefined && habilidades.flexibilidad !== null) {
            skills.push(
                <div key="flexibilidad" className="flex items-center gap-1.5 text-xs">
                    <Zap className="w-3.5 h-3.5 text-yellow-500" />
                    <span className="font-medium text-[var(--color-text-primary)]">Flexibilidad:</span>
                    <span className="text-[var(--color-text-primary)]">{habilidades.flexibilidad}/10</span>
                </div>
            );
        }

        // Cognitivo (0-10)
        if (habilidades.cognitivo !== undefined && habilidades.cognitivo !== null) {
            skills.push(
                <div key="cognitivo" className="flex items-center gap-1.5 text-xs">
                    <Brain className="w-3.5 h-3.5 text-purple-500" />
                    <span className="font-medium text-[var(--color-text-primary)]">Cognición:</span>
                    <span className="text-[var(--color-text-primary)]">{habilidades.cognitivo}/10</span>
                </div>
            );
        }

        // Motricidad (BPM)
        if (habilidades.motricidad !== undefined && habilidades.motricidad !== null) {
            skills.push(
                <div key="motricidad" className="flex items-center gap-1.5 text-xs">
                    <Gauge className="w-3.5 h-3.5 text-green-500" />
                    <span className="font-medium text-[var(--color-text-primary)]">Motricidad:</span>
                    <span className="text-[var(--color-text-primary)]">{habilidades.motricidad} BPM</span>
                </div>
            );
        }

        // Articulación (BPM por tipo)
        if (habilidades.articulacion) {
            const art = habilidades.articulacion;
            const artParts = [];
            if (art.t !== undefined && art.t !== null) artParts.push(`T: ${art.t}`);
            if (art.tk !== undefined && art.tk !== null) artParts.push(`TK: ${art.tk}`);
            if (art.ttk !== undefined && art.ttk !== null) artParts.push(`TTK: ${art.ttk}`);

            if (artParts.length > 0) {
                skills.push(
                    <div key="articulacion" className="flex items-center gap-1.5 text-xs">
                        <Target className="w-3.5 h-3.5 text-orange-500" />
                        <span className="font-medium text-[var(--color-text-primary)]">Articulación:</span>
                        <span className="text-[var(--color-text-primary)]">{artParts.join(', ')} BPM</span>
                    </div>
                );
            }
        }

        if (skills.length === 0) {
            return <span className="text-[var(--color-text-secondary)] text-xs italic">Sin datos evaluados</span>;
        }

        return (
            <div className="flex flex-wrap gap-x-4 gap-y-1">
                {skills}
            </div>
        );
    };

    const columns = [
        {
            key: 'fecha',
            label: 'Fecha',
            sortable: true,
            render: (ev: any) => (
                <span className="text-sm text-[var(--color-text-primary)] whitespace-nowrap">
                    {formatFecha(ev.fecha || ev.created_at)}
                </span>
            ),
        },
        ...(compact ? [] : [
            {
                key: 'evaluador',
                label: 'Evaluador',
                sortable: true,
                render: (ev: any) => (
                    <span className="text-sm text-[var(--color-text-primary)]">
                        {getEvaluadorNombre(ev.profesorId)}
                    </span>
                ),
            },
        ]),
        {
            key: 'habilidades',
            label: 'Habilidades Evaluadas',
            sortable: false,
            render: (ev: any) => renderHabilidades(ev.habilidades),
        },
        ...(compact ? [] : [
            {
                key: 'notas',
                label: 'Notas',
                sortable: false,
                render: (ev: any) => (
                    <span className="text-sm text-[var(--color-text-secondary)] line-clamp-2">
                        {ev.notas || '—'}
                    </span>
                ),
            },
        ]),
    ];

    return (
        <Card className={componentStyles.components.cardBase}>
            <CardHeader>
                <CardTitle className="text-sm sm:text-base md:text-lg flex items-center gap-2">
                    <ClipboardCheck className="w-4 h-4 sm:w-5 sm:h-5 text-[var(--color-primary)]" />
                    📋 Evaluaciones Técnicas ({evaluaciones.length})
                </CardTitle>
            </CardHeader>
            <CardContent>
                {evaluaciones.length === 0 ? (
                    <div className="text-center py-8 sm:py-12">
                        <ClipboardCheck className={componentStyles.components.emptyStateIcon} />
                        <p className={componentStyles.components.emptyStateText}>
                            {emptyMessage}
                        </p>
                    </div>
                ) : (
                    <UnifiedTable
                        data={evaluaciones}
                        columns={columns}
                        defaultPageSize={compact ? 5 : 10}
                        keyField="id"
                        onRowClick={() => { }}
                    />
                )}
            </CardContent>
        </Card>
    );
}
