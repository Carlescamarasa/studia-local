import React, { useState, useEffect, useMemo } from 'react';
import { useEvaluaciones } from '../hooks/useEvaluaciones';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Trophy, HelpCircle } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { localDataClient } from '@/api/localDataClient';
import { computeKeyCriteriaStatus, canPromote, promoteLevel, CriteriaStatusResult, PromotionCheckResult } from '@/utils/levelLogic';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { useEffectiveUser } from "@/providers/EffectiveUserProvider";
import CurrentXPInline from './CurrentXPInline';
import { Separator } from '@/components/ui/separator';
import Badge from '@/components/ds/Badge';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import {
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription
} from '@/components/ui/dialog';
import { Slider } from '@/components/ui/slider';
import { addXP } from '@/shared/services/xpService';
import { QUERY_KEYS } from '@/lib/queryKeys';
import { useUsers } from '@/hooks/entities/useUsers';


interface EvaluacionFormProps {
    alumnoId: string;
    onClose?: () => void;
}

export default function EvaluacionForm({ alumnoId, onClose }: EvaluacionFormProps) {
    const effectiveUser = useEffectiveUser();

    // OPTIMIZED: Use useUsers() for student data
    const { data: allUsers = [] } = useUsers();

    // Get student profile from cache
    const studentProfile = useMemo(() =>
        allUsers.find((u: any) => u.id === alumnoId),
        [allUsers, alumnoId]
    );

    const [fecha, setFecha] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [notas, setNotas] = useState('');

    // Habilidades % (0-100) - Direct Edit
    const [sonido, setSonido] = useState<number>(50);
    const [cognitivo, setCognitivo] = useState<number>(50);

    // XP Deltas (+/-)
    const [deltaMotricidad, setDeltaMotricidad] = useState('');
    const [deltaArticulacion, setDeltaArticulacion] = useState('');
    const [deltaFlexibilidad, setDeltaFlexibilidad] = useState('');

    // Level System State
    const [currentLevel, setCurrentLevel] = useState<number>(0);
    const [nextLevelCriteria, setNextLevelCriteria] = useState<CriteriaStatusResult[]>([]);
    const [promotionCheck, setPromotionCheck] = useState<PromotionCheckResult | null>(null);

    const { createEvaluacion, evaluaciones: evaluacionesList, isCreating } = useEvaluaciones(alumnoId);

    // Load last evaluation values from the reactive list
    useEffect(() => {
        if (!evaluacionesList || evaluacionesList.length === 0) {
            return;
        }

        // Find the most recent evaluation
        const sorted = [...evaluacionesList].sort((a, b) => {
            const dateA = new Date(a.fecha).getTime();
            const dateB = new Date(b.fecha).getTime();
            if (dateA !== dateB) return dateB - dateA;

            const createdA = a.createdAt ? new Date(a.createdAt).getTime() : (a.created_at ? new Date(a.created_at).getTime() : 0);
            const createdB = b.createdAt ? new Date(b.createdAt).getTime() : (b.created_at ? new Date(b.created_at).getTime() : 0);

            if (createdA !== createdB) return createdB - createdA;
            return (b.id || '').localeCompare(a.id || '');
        });

        const lastEval = sorted[0];

        if (lastEval && lastEval.habilidades) {
            // Scale from 0-10 to 0-100
            const sonidoVal = (lastEval.habilidades.sonido || 0) * 10;
            const cognitivoVal = (lastEval.habilidades.cognitivo || 0) * 10;

            setSonido(sonidoVal);
            setCognitivo(cognitivoVal);
        }
    }, [evaluacionesList]);

    // OPTIMIZED: Reactively update level when student profile changes
    useEffect(() => {
        if (studentProfile) {
            const level = studentProfile.nivelTecnico || 0;
            setCurrentLevel(level);
            loadCriteriaAndPromotion(level);
        }
    }, [studentProfile, alumnoId]);

    const loadCriteriaAndPromotion = async (level: number) => {
        try {
            const criteria = await computeKeyCriteriaStatus(alumnoId, level + 1);
            setNextLevelCriteria(criteria);

            const check = await canPromote(alumnoId, level);
            setPromotionCheck(check);
        } catch (error) {
            console.error('Error loading level criteria:', error);
        }
    };

    const handleCriteriaToggle = async (criterionId: string, currentStatus: string) => {
        const newStatus = currentStatus === 'PASSED' ? 'FAILED' : 'PASSED';

        // Optimistic update
        setNextLevelCriteria(prev => prev.map(c =>
            c.criterion.id === criterionId ? { ...c, status: newStatus as any } : c
        ));

        try {
            const allStatus = await localDataClient.entities.StudentCriteriaStatus.list();
            const existing = allStatus.find((s: any) => s.studentId === alumnoId && s.criterionId === criterionId);

            if (existing && existing.id && existing.id.length === 36) {
                await localDataClient.entities.StudentCriteriaStatus.update(existing.id, { status: newStatus });
            } else {
                await localDataClient.entities.StudentCriteriaStatus.create({
                    studentId: alumnoId,
                    criterionId: criterionId,
                    status: newStatus,
                    assessedAt: new Date().toISOString(),
                    assessedBy: effectiveUser?.effectiveUserId
                });
            }

            const check = await canPromote(alumnoId, currentLevel);
            setPromotionCheck(check);
        } catch (error) {
            console.error('Error updating criteria:', error);
            toast.error('Error al actualizar criterio');
            // Reload criteria after error
            loadCriteriaAndPromotion(currentLevel);
        }
    };

    const handlePromote = async () => {
        if (!confirm(`¿Confirmar promoción a Nivel ${currentLevel + 1}?`)) return;

        try {
            await promoteLevel(alumnoId, currentLevel + 1, 'Promoción por evaluación', effectiveUser?.effectiveUserId || 'system');
            toast.success(`¡Alumno promovido a Nivel ${currentLevel + 1}!`);
            // Level will be updated reactively when studentProfile changes
            loadCriteriaAndPromotion(currentLevel + 1);
        } catch (error) {
            console.error('Error promoting:', error);
            toast.error('Error al promover');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const nuevaEvaluacion = {
            alumnoId,
            profesorId: effectiveUser?.effectiveUserId || 'unknown',
            fecha: new Date(fecha).toISOString(),
            habilidades: {
                // Scale down to 0-10 for DB storage
                sonido: sonido / 10,
                cognitivo: cognitivo / 10,
            },
            notas: notas.trim() || undefined
        };

        try {
            await createEvaluacion(nuevaEvaluacion);

            // Apply XP Deltas
            if (deltaMotricidad || deltaArticulacion || deltaFlexibilidad) {
                if (deltaMotricidad) await addXP(alumnoId, 'motricidad', parseInt(deltaMotricidad), 'PROF');
                if (deltaArticulacion) await addXP(alumnoId, 'articulacion', parseInt(deltaArticulacion), 'PROF');
                if (deltaFlexibilidad) await addXP(alumnoId, 'flexibilidad', parseInt(deltaFlexibilidad), 'PROF');
            }

            const queryClient = (window as any).__queryClient;
            if (queryClient) {
                // Use centralized invalidation helper
                QUERY_KEYS.invalidateStudentSkills(queryClient, alumnoId);
            }
            if (onClose) onClose();
        } catch (error) {
            console.error('Error al guardar evaluación:', error);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="flex flex-col h-full max-h-[90vh]">


            <DialogHeader className="px-6 py-4 border-b border-[var(--color-border-default)] bg-[var(--color-surface-muted)] shrink-0 flex flex-row items-center justify-between pr-12">
                <div className="flex items-center justify-between">
                    <div className="flex flex-col gap-0.5">
                        <DialogTitle className="text-[var(--color-text-primary)]">Nueva Evaluación Técnica</DialogTitle>
                        <DialogDescription className="text-[var(--color-text-secondary)]">
                            {format(new Date(fecha), "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })}
                        </DialogDescription>
                    </div>
                    <div className="flex items-center gap-4">
                        <Input
                            type="date"
                            value={fecha}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFecha(e.target.value)}
                            className="w-auto h-8 text-xs bg-[var(--color-surface-default)] text-[var(--color-text-primary)] border-[var(--color-border-default)]"
                        />
                    </div>
                </div>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto p-6 bg-[var(--color-surface-muted)]">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full">
                    {/* Left Column: Level Logic */}
                    <div className="space-y-6">
                        <div className="bg-[var(--color-surface-default)] rounded-xl p-6 border border-[var(--color-border-default)] shadow-sm">
                            <div className="flex flex-col items-center justify-center text-center mb-6">
                                <span className="text-sm text-[var(--color-text-secondary)] uppercase tracking-wider font-medium mb-1">Siguiente Objetivo</span>
                                <div className="text-6xl font-bold text-[var(--color-primary)] mb-2">{currentLevel + 1}</div>
                                <Badge variant="outline" className="text-xs px-3 py-1 bg-[var(--color-surface-default)] text-[var(--color-text-primary)] border-[var(--color-border-default)]">
                                    Nivel Actual: {currentLevel}
                                </Badge>
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-sm font-semibold text-[var(--color-text-primary)]">Criterios de Nivel</h4>
                                    <span className="text-xs text-[var(--color-text-secondary)]">
                                        {nextLevelCriteria.filter(c => c.status === 'PASSED').length}/{nextLevelCriteria.length} completados
                                    </span>
                                </div>

                                <div className="space-y-2 max-h-[250px] overflow-y-auto pr-2">
                                    {nextLevelCriteria.length === 0 ? (
                                        <p className="text-xs text-[var(--color-text-secondary)] italic text-center py-4">No hay criterios definidos.</p>
                                    ) : (
                                        nextLevelCriteria.map((item) => (
                                            <div key={item.criterion.id} className="flex items-start space-x-3 p-2 rounded-lg hover:bg-[var(--color-surface-muted)] transition-colors">
                                                <Checkbox
                                                    id={`crit-${item.criterion.id}`}
                                                    checked={item.status === 'PASSED'}
                                                    onCheckedChange={() => handleCriteriaToggle(item.criterion.id, item.status)}
                                                    disabled={item.criterion.source !== 'PROF'}
                                                    className="mt-0.5 data-[state=checked]:bg-[var(--color-primary)] data-[state=checked]:border-[var(--color-primary)] border-[var(--color-text-secondary)]"
                                                />
                                                <div className="grid gap-1 leading-none">
                                                    <label
                                                        htmlFor={`crit-${item.criterion.id}`}
                                                        className="text-sm font-medium leading-tight peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-[var(--color-text-primary)]"
                                                    >
                                                        {item.criterion.description}
                                                    </label>
                                                    <p className="text-[10px] text-[var(--color-text-secondary)] uppercase tracking-wide">
                                                        {item.criterion.skill} • {item.criterion.source}
                                                    </p>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>

                            <div className="mt-6 pt-6 border-t border-[var(--color-border-default)]">
                                <Button
                                    type="button"
                                    onClick={handlePromote}
                                    className="w-full"
                                    variant={promotionCheck?.allowed ? 'primary' : 'destructive'}
                                >
                                    <Trophy className="w-4 h-4 mr-2" />
                                    Promocionar Nivel
                                </Button>
                                {!promotionCheck?.allowed && promotionCheck?.missing && promotionCheck.missing.length > 0 && (
                                    <div className="flex items-center justify-center gap-2 mt-2">
                                        <p className="text-xs text-[var(--color-text-secondary)] text-center">
                                            Faltan criterios para la subida automática.
                                        </p>
                                        <TooltipProvider>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <HelpCircle className="h-3 w-3 text-[var(--color-text-secondary)] cursor-help" />
                                                </TooltipTrigger>
                                                <TooltipContent className="z-[200] bg-[var(--color-surface-elevated)] text-[var(--color-text-primary)] border border-[var(--color-border-default)]">
                                                    <ul className="list-disc pl-4 text-xs space-y-1">
                                                        {promotionCheck.missing.map((msg, i) => (
                                                            <li key={i}>{msg}</li>
                                                        ))}
                                                    </ul>
                                                </TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Data Management */}
                    <div className="space-y-6">
                        {/* Group 1: XP Skills (Delta) */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-semibold flex items-center gap-2 text-[var(--color-primary)]">
                                <span className="w-1 h-4 bg-[var(--color-primary)] rounded-full"></span>
                                Habilidades XP
                            </h3>

                            <div className="grid gap-4">
                                {/* Flexibilidad */}
                                <div className="flex items-center justify-between p-3 rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-default)] shadow-sm">
                                    <div className="space-y-1">
                                        <Label className="text-base text-[var(--color-text-primary)]">Flexibilidad</Label>
                                        <div className="text-xs text-[var(--color-text-secondary)]">
                                            Progreso actual: <CurrentXPInline studentId={alumnoId} skill="flexibilidad" simple target={promotionCheck?.config?.minXpFlex} />
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Input
                                            type="number"
                                            placeholder="+/-"
                                            value={deltaFlexibilidad}
                                            onChange={(e) => setDeltaFlexibilidad(e.target.value)}
                                            className="w-24 text-right font-mono bg-[var(--color-surface-default)] text-[var(--color-text-primary)] border-[var(--color-border-default)]"
                                        />
                                    </div>
                                </div>

                                {/* Motricidad */}
                                <div className="flex items-center justify-between p-3 rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-default)] shadow-sm">
                                    <div className="space-y-1">
                                        <Label className="text-base text-[var(--color-text-primary)]">Motricidad</Label>
                                        <div className="text-xs text-[var(--color-text-secondary)]">
                                            Progreso actual: <CurrentXPInline studentId={alumnoId} skill="motricidad" simple target={promotionCheck?.config?.minXpMotr} />
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Input
                                            type="number"
                                            placeholder="+/-"
                                            value={deltaMotricidad}
                                            onChange={(e) => setDeltaMotricidad(e.target.value)}
                                            className="w-24 text-right font-mono bg-[var(--color-surface-default)] text-[var(--color-text-primary)] border-[var(--color-border-default)]"
                                        />
                                    </div>
                                </div>

                                {/* Articulación */}
                                <div className="flex items-center justify-between p-3 rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-default)] shadow-sm">
                                    <div className="space-y-1">
                                        <Label className="text-base text-[var(--color-text-primary)]">Articulación</Label>
                                        <div className="text-xs text-[var(--color-text-secondary)]">
                                            Progreso actual: <CurrentXPInline studentId={alumnoId} skill="articulacion" simple target={promotionCheck?.config?.minXpArt} />
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Input
                                            type="number"
                                            placeholder="+/-"
                                            value={deltaArticulacion}
                                            onChange={(e) => setDeltaArticulacion(e.target.value)}
                                            className="w-24 text-right font-mono bg-[var(--color-surface-default)] text-[var(--color-text-primary)] border-[var(--color-border-default)]"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <Separator className="bg-[var(--color-border-default)]" />

                        {/* Group 2: Percentage Skills (Direct Edit) */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-semibold flex items-center gap-2 text-[var(--color-primary)]">
                                <span className="w-1 h-4 bg-[var(--color-primary)] rounded-full"></span>
                                Habilidades Cualitativas (0-100)
                            </h3>

                            <div className="grid gap-4">
                                {/* Sonido */}
                                <div className="space-y-3 p-3 rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-default)] shadow-sm">
                                    <div className="flex items-center justify-between">
                                        <Label className="text-base text-[var(--color-text-primary)]">Sonido</Label>
                                        <span className="font-mono text-sm font-semibold text-[var(--color-primary)]">{sonido}%</span>
                                    </div>
                                    <Slider
                                        value={[sonido]}
                                        onValueChange={(vals) => setSonido(vals[0])}
                                        max={100}
                                        step={1}
                                        className="py-2"
                                    />
                                </div>

                                {/* Cognición */}
                                <div className="space-y-3 p-3 rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-default)] shadow-sm">
                                    <div className="flex items-center justify-between">
                                        <Label className="text-base text-[var(--color-text-primary)]">Cognición</Label>
                                        <span className="font-mono text-sm font-semibold text-[var(--color-primary)]">{cognitivo}%</span>
                                    </div>
                                    <Slider
                                        value={[cognitivo]}
                                        onValueChange={(vals) => setCognitivo(vals[0])}
                                        max={100}
                                        step={1}
                                        className="py-2"
                                    />
                                </div>
                            </div>
                        </div>

                        <Separator className="bg-[var(--color-border-default)]" />

                        <div className="space-y-2">
                            <Label htmlFor="notas" className="text-sm font-medium text-[var(--color-text-primary)]">Feedback / Observaciones</Label>
                            <Textarea
                                id="notas"
                                placeholder="Escribe aquí tus comentarios sobre el progreso del alumno..."
                                value={notas}
                                onChange={(e) => setNotas(e.target.value)}
                                rows={3}
                                className="resize-none bg-[var(--color-surface-default)] text-[var(--color-text-primary)] border-[var(--color-border-default)]"
                            />
                        </div>
                    </div>
                </div>
            </div>

            <DialogFooter className="px-6 py-4 border-t border-[var(--color-border-default)] bg-[var(--color-surface-default)]">
                {onClose && (
                    <Button type="button" onClick={onClose} disabled={isCreating} variant="outline">
                        Cancelar
                    </Button>
                )}
                <Button type="submit" disabled={isCreating} variant="primary">
                    {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Guardar Evaluación
                </Button>
            </DialogFooter>
        </form>
    );
}
