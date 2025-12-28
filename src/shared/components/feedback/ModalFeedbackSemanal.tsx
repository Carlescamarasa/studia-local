import React, { useState, useEffect, useMemo } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import {
    Drawer,
    DrawerContent,
    DrawerHeader,
    DrawerTitle,
    DrawerDescription,
} from "@/components/ui/drawer";
import { Button } from "@/components/ds/Button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ds";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { MessageSquare, Music, Brain, Save, X, Activity, Paperclip, CheckSquare, Trophy, HelpCircle } from "lucide-react";
// FeedbacksSemanalAPI removed - using localDataClient for Supabase sync
import { useToast } from "@/components/ui/use-toast";
import MediaLinksInput from "@/shared/components/media/MediaLinksInput";
import { normalizeMediaLinks } from "@/shared/utils/media";
import { cn } from "@/lib/utils";
import { localDataClient } from '@/api/localDataClient';
import { useFeedbacksSemanal } from "@/hooks/entities/useFeedbacksSemanal";
import { useUsers } from '@/hooks/entities/useUsers';
import { computeKeyCriteriaStatus, canPromote, promoteLevel } from '@/utils/levelLogic';
import { useEffectiveUser } from "@/providers/EffectiveUserProvider";
import { Checkbox } from '@/components/ui/checkbox';
import { uploadVideoToYouTube } from "@/utils/uploadVideoToYouTube";
import CurrentXPInline from '@/components/evaluaciones/CurrentXPInline';

interface FeedbackData {
    id?: string;
    notaProfesor?: string;
    sonido?: number;
    cognicion?: number;
    habilidades?: Record<string, unknown>;
    mediaLinks?: unknown[];
    [key: string]: unknown;
}

interface ModalFeedbackSemanalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    feedback?: FeedbackData | null;
    studentId: string;
    weekStartISO: string;
    weekLabel?: string;
    onSaved?: () => void;
    onMediaClick?: (mediaLinks: unknown[], index: number) => void;
    usuarios?: any[];
    userIdActual?: string;
}

/**
 * Modal para crear o editar Feedback Semanal UNFICADO.
 * Layout: 2 Columnas.
 * Izquierda: Estado del Nivel (Criterios, Promoción) - Reutilizado de EvaluacionForm.
 * Derecha: 3 Tabs (Evaluación, Comentarios, Multimedia).
 */
export default function ModalFeedbackSemanal({
    open,
    onOpenChange,
    feedback,
    studentId,
    weekStartISO,
    weekLabel,
    onSaved,
    onMediaClick
}: ModalFeedbackSemanalProps) {
    const { toast } = useToast();
    const effectiveUser = useEffectiveUser();
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Responsive: use Drawer on mobile/tablet (<1024px)
    const [isMobile, setIsMobile] = useState(false);
    const [isTablet, setIsTablet] = useState(false); // 450-1023px
    useEffect(() => {
        const mqMobile = window.matchMedia('(max-width: 1023px)');
        const mqTablet = window.matchMedia('(min-width: 450px) and (max-width: 1023px)');
        const handleMobileChange = (e: any) => setIsMobile(e.matches);
        const handleTabletChange = (e: any) => setIsTablet(e.matches);
        setIsMobile(mqMobile.matches);
        setIsTablet(mqTablet.matches);
        mqMobile.addEventListener('change', handleMobileChange);
        mqTablet.addEventListener('change', handleTabletChange);
        return () => {
            mqMobile.removeEventListener('change', handleMobileChange);
            mqTablet.removeEventListener('change', handleTabletChange);
        };
    }, []);

    // TABS state
    const [activeTab, setActiveTab] = useState('evaluacion'); // evaluacion | comentarios | multimedia

    // --- LEFT COLUMN STATE (Level Logic) ---
    const [currentLevel, setCurrentLevel] = useState(0);
    const [currentLevelConfig, setCurrentLevelConfig] = useState<any>(null); // Config for CURRENT level (XP targets)
    const [nextLevelCriteria, setNextLevelCriteria] = useState<any[]>([]);
    const [promotionCheck, setPromotionCheck] = useState<any>(null);
    const [loadingLevelData, setLoadingLevelData] = useState(false);

    // --- RIGHT COLUMN STATE ---

    // 1. Evaluación: Qualitative (0-10)
    const [sonido, setSonido] = useState(5.0);
    const [cognicion, setCognicion] = useState(5.0);

    // 1. Evaluación: XP Deltas (Manual +/-)
    const [deltaMotricidad, setDeltaMotricidad] = useState("");
    const [deltaArticulacion, setDeltaArticulacion] = useState("");
    const [deltaFlexibilidad, setDeltaFlexibilidad] = useState("");
    // Track original loaded deltas to calculate "Base XP" (Current Total - Previous Input)
    const [originalXpDeltas, setOriginalXpDeltas] = useState({ motricidad: 0, articulacion: 0, flexibilidad: 0 });

    // 2. Comentarios
    const [notaProfesor, setNotaProfesor] = useState("");

    // 3. Multimedia
    const [mediaLinks, setMediaLinks] = useState([]);
    const [videoFile, setVideoFile] = useState(null);
    const [uploadingVideo, setUploadingVideo] = useState(false);

    // --- OPTIMISTIC UI: Calculate projected promotion status based on current inputs ---
    const projectedPromotionStatus = useMemo(() => {
        if (!promotionCheck || !currentLevelConfig) {
            return promotionCheck; // Fallback to server data
        }

        // Calculate projected XP totals (base + delta from inputs)
        const baseMotr = (promotionCheck.xp?.motr || 0) - (originalXpDeltas.motricidad || 0);
        const baseArt = (promotionCheck.xp?.art || 0) - (originalXpDeltas.articulacion || 0);
        const baseFlex = (promotionCheck.xp?.flex || 0) - (originalXpDeltas.flexibilidad || 0);

        const projectedMotr = baseMotr + (Number(deltaMotricidad) || 0);
        const projectedArt = baseArt + (Number(deltaArticulacion) || 0);
        const projectedFlex = baseFlex + (Number(deltaFlexibilidad) || 0);

        // Check against current level config requirements
        const missing = [];
        if (projectedFlex < (currentLevelConfig.minXpFlex || 0)) {
            missing.push(`Flexibilidad XP: ${projectedFlex}/${currentLevelConfig.minXpFlex}`);
        }
        if (projectedMotr < (currentLevelConfig.minXpMotr || 0)) {
            missing.push(`Motricidad XP: ${projectedMotr}/${currentLevelConfig.minXpMotr}`);
        }
        if (projectedArt < (currentLevelConfig.minXpArt || 0)) {
            missing.push(`Articulación XP: ${projectedArt}/${currentLevelConfig.minXpArt}`);
        }

        // Check criteria using LOCAL STATE (optimistic - no DB roundtrip)
        const failedCriteria = nextLevelCriteria
            .filter(c => c.criterion.required && c.status !== 'PASSED')
            .map(c => `Criterio: ${c.criterion.description}`);

        const allMissing = [...missing, ...failedCriteria];

        return {
            ...promotionCheck,
            allowed: allMissing.length === 0,
            missing: allMissing,
            xp: { motr: projectedMotr, art: projectedArt, flex: projectedFlex }
        };
    }, [promotionCheck, currentLevelConfig, originalXpDeltas, deltaMotricidad, deltaArticulacion, deltaFlexibilidad, nextLevelCriteria]);


    // Helper to hydrate form from feedback data
    const hydrateFormFromFeedback = (fb: any) => {
        console.log('[ModalFeedbackSemanal] hydrateFormFromFeedback:', fb);
        setNotaProfesor(fb.notaProfesor || "");

        // sonido and cognicion are stored INSIDE habilidades JSONB (see remoteDataAPI.ts)
        const habilidades = fb.habilidades || {};
        console.log('[ModalFeedbackSemanal] habilidades object:', habilidades);

        // Read from habilidades.sonido/cognicion first, fallback to top-level for legacy data
        const loadedSonido = habilidades.sonido ?? fb.sonido ?? 5.0;
        const loadedCognicion = habilidades.cognicion ?? fb.cognicion ?? 5.0;
        setSonido(Number(loadedSonido));
        setCognicion(Number(loadedCognicion));

        // XP deltas - stored inside habilidades.xpDeltas
        const deltas = habilidades.xpDeltas || fb.xp_delta_by_skill || fb.xpDeltaBySkill || {};
        console.log('[ModalFeedbackSemanal] XP Deltas loaded:', deltas);

        const dMotr = deltas.motricidad != null ? Number(deltas.motricidad) : 0;
        const dArt = deltas.articulacion != null ? Number(deltas.articulacion) : 0;
        const dFlex = deltas.flexibilidad != null ? Number(deltas.flexibilidad) : 0;

        setDeltaMotricidad(deltas.motricidad != null ? String(deltas.motricidad) : "");
        setDeltaArticulacion(deltas.articulacion != null ? String(deltas.articulacion) : "");
        setDeltaFlexibilidad(deltas.flexibilidad != null ? String(deltas.flexibilidad) : "");

        setOriginalXpDeltas({
            motricidad: dMotr,
            articulacion: dArt,
            flexibilidad: dFlex
        });

        // Media
        setMediaLinks(fb.mediaLinks || []);
        setVideoFile(null);
    };

    // LOAD DATA
    const { data: allFeedbacks = [], isLoading: isLoadingFeedbacks } = useFeedbacksSemanal();

    useEffect(() => {
        if (open) {
            loadLevelData(); // Always reload level data on open

            if (feedback) {
                // If feedback prop is provided (edit mode), use it directly
                hydrateFormFromFeedback(feedback);
            } else if (studentId && weekStartISO) {
                // If no feedback prop but we have studentId + week, try to find existing in cache
                if (!isLoadingFeedbacks) {
                    const existing = allFeedbacks.find((f: any) =>
                        (f.alumnoId === studentId || f.alumno_id === studentId || f.student_id === studentId) &&
                        f.semanaInicioISO === weekStartISO
                    );

                    if (existing) {
                        hydrateFormFromFeedback(existing);
                    } else {
                        // Truly new
                        resetForm();
                    }
                }
            } else {
                // Reset form for truly new feedback
                resetForm();
            }
        }
    }, [open, feedback, studentId, weekStartISO, allFeedbacks, isLoadingFeedbacks]);

    const resetForm = () => {
        setNotaProfesor("");
        setSonido(5.0);
        setCognicion(5.0);
        setDeltaMotricidad("");
        setDeltaArticulacion("");
        setDeltaFlexibilidad("");
        setOriginalXpDeltas({ motricidad: 0, articulacion: 0, flexibilidad: 0 });
        setMediaLinks([]);
        setVideoFile(null);
        setActiveTab('evaluacion');
    };

    // OPTIMIZACIÓN: Usar allUsers de useUsers() para datos cacheados
    const { data: allUsersData = [] } = useUsers();

    const loadLevelData = async () => {
        if (!studentId) return;
        setLoadingLevelData(true);
        try {
            // Usar datos cacheados de useUsers()
            const user = allUsersData.find(u => u.id === studentId);
            const level = user?.nivelTecnico || 1;
            console.log('[loadLevelData] Using cached user level:', level, 'for student:', studentId);
            setCurrentLevel(level);

            // Fetch CURRENT level config for XP targets (requirements to EXIT current level)
            const allConfigs = await localDataClient.entities.LevelConfig.list();
            const config = allConfigs.find(c => c.level === level) || null;
            setCurrentLevelConfig(config);

            // Fetch CURRENT level criteria (requirements to EXIT current level)
            const criteria = await computeKeyCriteriaStatus(studentId, level);
            console.log('[loadLevelData] Loaded criteria for level:', level, criteria);
            setNextLevelCriteria(criteria);

            const check = await canPromote(studentId, level);
            console.log('[loadLevelData] Promotion check:', check);
            setPromotionCheck(check);
        } catch (error) {
            console.error('Error loading level data:', error);
        } finally {
            setLoadingLevelData(false);
        }
    };

    const handleCriteriaToggle = async (criterionId: string, currentStatus: string) => {
        const newStatus = currentStatus === 'PASSED' ? 'FAILED' : 'PASSED';
        // Optimistic update
        setNextLevelCriteria(prev => prev.map(c =>
            c.criterion.id === criterionId ? { ...c, status: newStatus } : c
        ));

        try {
            const allStatus = await localDataClient.entities.StudentCriteriaStatus.list();
            const existing = allStatus.find(s => s.studentId === studentId && s.criterionId === criterionId);

            if (existing && existing.id && existing.id.length === 36) {
                await localDataClient.entities.StudentCriteriaStatus.update(existing.id, { status: newStatus as any });
            } else {
                await localDataClient.entities.StudentCriteriaStatus.create({
                    studentId: studentId,
                    criterionId: criterionId,
                    status: newStatus as any,
                    assessedAt: new Date().toISOString(),
                    assessedBy: (effectiveUser as any)?.id
                });
            }
            const check = await canPromote(studentId, currentLevel);
            setPromotionCheck(check);
        } catch (error) {
            console.error('Error updating criteria:', error);
            toast({ variant: "destructive", title: "Error", description: "Error al actualizar criterio" });
            loadLevelData();
        }
    };

    const handlePromote = async (force = false) => {
        const nextLevel = currentLevel + 1;

        try {
            const reason = force ? 'Promoción forzada por profesor' : 'Promoción por evaluación';
            await promoteLevel(studentId, nextLevel, reason, (effectiveUser as any)?.id || 'system');

            // Reset XP inputs for the new level context
            setDeltaMotricidad("");
            setDeltaArticulacion("");
            setDeltaFlexibilidad("");
            setOriginalXpDeltas({ motricidad: 0, articulacion: 0, flexibilidad: 0 });

            // Refresh all level data for the new level
            await loadLevelData();
        } catch (error) {
            console.error('Error promoting:', error);
            toast({ variant: "destructive", title: "Error", description: "Error al promover" });
        }
    };

    const handleDemote = async () => {
        if (currentLevel <= 1) return; // Can't go below level 1
        const prevLevel = currentLevel - 1;

        try {
            await promoteLevel(studentId, prevLevel, 'Descenso de nivel por profesor', (effectiveUser as any)?.id || 'system');

            // Reset XP inputs for the new level context
            setDeltaMotricidad("");
            setDeltaArticulacion("");
            setDeltaFlexibilidad("");
            setOriginalXpDeltas({ motricidad: 0, articulacion: 0, flexibilidad: 0 });

            await loadLevelData();
        } catch (error) {
            console.error('Error demoting:', error);
            toast({ variant: "destructive", title: "Error", description: "Error al cambiar nivel" });
        }
    };

    const handleSave = async () => {
        if (!studentId || !weekStartISO) {
            console.error("Faltan datos requeridos");
            return;
        }

        setIsSubmitting(true);
        try {
            let finalMediaLinks = [...mediaLinks];

            // Handle Video Upload
            if (videoFile) {
                setUploadingVideo(true);
                try {
                    const uploadResult = await uploadVideoToYouTube(videoFile, {
                        contexto: 'feedback_profesor',
                        profesor_id: (effectiveUser as any)?.id || "unknown",
                        profesor_nombre: (effectiveUser as any)?.full_name || (effectiveUser as any)?.email || 'Profesor',
                        alumno_id: studentId,
                        semana_inicio_iso: weekStartISO,
                        comentarios: notaProfesor,
                    });

                    if (uploadResult.ok && uploadResult.videoUrl) {
                        finalMediaLinks.push(uploadResult.videoUrl);
                    } else {
                        throw new Error(uploadResult.error || 'Error al subir el vídeo');
                    }
                } catch (videoError) {
                    console.error("Error upload video", videoError);
                    toast({ variant: "destructive", title: "Error vídeo", description: "No se pudo subir el vídeo." });
                    setUploadingVideo(false);
                    // Usually we stop if video fails, or ask user? We'll stop to avoid saving incomplete state.
                    setIsSubmitting(false);
                    return;
                } finally {
                    setUploadingVideo(false);
                }
            }

            // XP Deltas object
            const xpDeltas: any = {};
            if (deltaMotricidad) xpDeltas.motricidad = Number(deltaMotricidad);
            if (deltaArticulacion) xpDeltas.articulacion = Number(deltaArticulacion);
            if (deltaFlexibilidad) xpDeltas.flexibilidad = Number(deltaFlexibilidad);

            // FIRST: Fetch existing record to get previous habilidades
            const existingFeedbacks = await localDataClient.entities.FeedbackSemanal.filter({
                alumnoId: studentId,
                semanaInicioISO: weekStartISO
            });
            const existingRecord = existingFeedbacks.length > 0 ? existingFeedbacks[0] : null;
            const existingHabilidades = existingRecord?.habilidades || {};

            console.log('[ModalFeedbackSemanal] Save - Existing record:', existingRecord);
            console.log('[ModalFeedbackSemanal] Save - Existing habilidades:', existingHabilidades);

            // COMPUTE XP DELTA TO APPLY (difference from previous)
            const previousXpDeltas = existingHabilidades.xpDeltas || {};
            const xpDeltaToApply = {
                motricidad: (xpDeltas.motricidad || 0) - (previousXpDeltas.motricidad || 0),
                articulacion: (xpDeltas.articulacion || 0) - (previousXpDeltas.articulacion || 0),
                flexibilidad: (xpDeltas.flexibilidad || 0) - (previousXpDeltas.flexibilidad || 0),
            };

            console.log('[ModalFeedbackSemanal] Save - XP delta calculation:', {
                newInput: xpDeltas,
                previousStored: previousXpDeltas,
                toApply: xpDeltaToApply
            });

            // MERGE habilidades: keep existing data, update sonido/cognicion/xpDeltas
            const mergedHabilidades = {
                ...existingHabilidades,
                sonido: Number(sonido),
                cognicion: Number(cognicion),
                xpDeltas: xpDeltas, // Store the USER'S INPUT (so we remember it next time)
            };

            const dataToSave = {
                alumnoId: studentId,
                profesorId: (effectiveUser as any)?.id || "current-prof-id",
                semanaInicioISO: weekStartISO,
                notaProfesor: notaProfesor,
                sonido: Number(sonido),
                cognicion: Number(cognicion),
                habilidades: mergedHabilidades,
                mediaLinks: normalizeMediaLinks(finalMediaLinks),
                lastEditedAt: new Date().toISOString(),
            };

            // SAVE the feedback record
            if (existingRecord) {
                await localDataClient.entities.FeedbackSemanal.update(existingRecord.id, dataToSave);
            } else {
                await localDataClient.entities.FeedbackSemanal.create(dataToSave);
            }

            // Apply XP Deltas to system (Side Effect) - Only if there is a difference
            const hasXPToApply = xpDeltaToApply.motricidad !== 0 || xpDeltaToApply.articulacion !== 0 || xpDeltaToApply.flexibilidad !== 0;
            if (hasXPToApply) {
                const { addXP } = await import('@/shared/services/xpService');
                if (xpDeltaToApply.motricidad !== 0) await addXP(studentId, 'motricidad', xpDeltaToApply.motricidad, 'PROF');
                if (xpDeltaToApply.articulacion !== 0) await addXP(studentId, 'articulacion', xpDeltaToApply.articulacion, 'PROF');
                if (xpDeltaToApply.flexibilidad !== 0) await addXP(studentId, 'flexibilidad', xpDeltaToApply.flexibilidad, 'PROF');
                console.log('[ModalFeedbackSemanal] Applied XP deltas:', xpDeltaToApply);
            } else {
                console.log('[ModalFeedbackSemanal] No XP changes to apply');
            }



            if (onSaved) onSaved();
            onOpenChange(false);
        } catch (error) {
            console.error("Error guardando feedback:", error);
            toast({
                variant: "destructive",
                title: "Error",
                description: "No se pudo guardar el feedback.",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    // Shared content for both Dialog and Drawer
    const modalHeader = (
        <div className="px-6 py-4 border-b border-border bg-muted/40 shrink-0 flex flex-row items-center justify-between space-y-0">
            <div>
                <div className="flex items-center gap-2 text-lg font-semibold">
                    <MessageSquare className="w-5 h-5 text-[var(--color-primary)]" />
                    Feedback Profesor
                </div>
                <div className="text-sm text-[var(--color-text-secondary)] mt-1">
                    {weekLabel || "Semana seleccionada"}
                </div>
            </div>
        </div>
    );

    const modalFooter = (
        <div className="p-4 border-t border-border bg-background flex justify-end gap-3 shrink-0">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                Cancelar
            </Button>
            <Button variant="primary" onClick={handleSave} disabled={isSubmitting || uploadingVideo} className="min-w-[150px]">
                <Save className="w-4 h-4 mr-2" />
                {isSubmitting ? (uploadingVideo ? "Subiendo vídeo..." : "Guardando...") : "Guardar Feedback"}
            </Button>
        </div>
    );

    const modalBody = (
        <div className="flex-1 overflow-auto">
            <div className={cn("grid h-full", isMobile ? "grid-cols-1" : "grid-cols-1 lg:grid-cols-12 min-h-[500px]")}>

                {/* LEFT COLUMN: Contexto / Nivel (4 cols) */}
                <div className={cn(
                    "border-[var(--color-border-default)] bg-[var(--color-surface-muted)]/30 p-4",
                    isMobile ? "border-b" : "lg:col-span-4 border-r space-y-6"
                )}>
                    {/* Tablet: horizontal layout (Level | Requirements+Buttons), Mobile/Desktop: vertical */}
                    <div className={cn(
                        isTablet ? "flex gap-4 items-stretch" : "space-y-6"
                    )}>
                        {/* Level Card */}
                        <div className={cn(
                            "bg-[var(--color-surface-default)] rounded-xl p-5 border border-[var(--color-border-default)] shadow-sm text-center flex flex-col justify-center",
                            isTablet && "w-1/3 shrink-0"
                        )}>
                            <span className="text-xs text-[var(--color-text-secondary)] uppercase tracking-wider font-medium">Nivel Actual</span>
                            <div className={cn("font-bold text-[var(--color-primary)] my-2", isTablet ? "text-4xl" : "text-5xl")}>{currentLevel}</div>
                            <div className="inline-flex items-center justify-center gap-1.5">
                                <Badge variant="outline" className="text-xs">
                                    Siguiente: {currentLevel + 1}
                                </Badge>
                                <TooltipProvider delayDuration={100}>
                                    <Tooltip>
                                        <TooltipTrigger>
                                            <HelpCircle className="w-3.5 h-3.5 text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] cursor-help" />
                                        </TooltipTrigger>
                                        <TooltipContent
                                            side="right"
                                            sideOffset={8}
                                            className="max-w-xs"
                                            style={{ zIndex: 9999 }}
                                        >
                                            {projectedPromotionStatus?.allowed ? (
                                                <p className="text-green-500 font-medium">✓ Cumples todos los requisitos</p>
                                            ) : (
                                                <div className="space-y-3">
                                                    <p className="font-semibold">Requisitos para Nivel {currentLevel + 1}</p>

                                                    {/* Experiencia (XP) Section */}
                                                    {(() => {
                                                        const xpItems = projectedPromotionStatus?.missing?.filter(m => m.includes('XP:')) || [];
                                                        if (xpItems.length === 0) return null;
                                                        return (
                                                            <div>
                                                                <p className="font-medium text-xs uppercase text-[var(--color-text-secondary)]">Experiencia</p>
                                                                <ul className="text-xs list-disc pl-4 mt-1">
                                                                    {xpItems.map((m, i) => {
                                                                        const cleaned = m.replace(' XP:', ':');
                                                                        return <li key={i}>{cleaned}</li>;
                                                                    })}
                                                                </ul>
                                                            </div>
                                                        );
                                                    })()}

                                                    {/* Criterios Section */}
                                                    {(() => {
                                                        const criteriaItems = projectedPromotionStatus?.missing?.filter(m => m.startsWith('Criterio:')) || [];
                                                        if (criteriaItems.length === 0) return null;
                                                        return (
                                                            <div>
                                                                <p className="font-medium text-xs uppercase text-[var(--color-text-secondary)]">Criterios</p>
                                                                <ul className="text-xs list-disc pl-4 mt-1">
                                                                    {criteriaItems.map((m: any, i: number) => {
                                                                        const desc = m.replace('Criterio: ', '');
                                                                        const criterion = nextLevelCriteria.find((c: any) => c.criterion.description === desc);
                                                                        const skill = (criterion as any)?.criterion?.skill || '';
                                                                        const skillLabel = skill.charAt(0).toUpperCase() + skill.slice(1);
                                                                        return <li key={i}>{skillLabel}: {desc}</li>;
                                                                    })}
                                                                </ul>
                                                            </div>
                                                        );
                                                    })()}
                                                </div>
                                            )}
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            </div>
                        </div>

                        {/* Right side: Criteria + Buttons (grouped together on tablet) */}
                        <div className={cn(
                            isTablet ? "flex-1 flex flex-col justify-between" : "space-y-6"
                        )}>
                            {/* Criteria List */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-sm font-semibold text-[var(--color-text-primary)]">Requisitos de Nivel</h4>
                                    <span className="text-xs text-[var(--color-text-secondary)]">
                                        {nextLevelCriteria.filter(c => c.status === 'PASSED').length}/{nextLevelCriteria.length}
                                    </span>
                                </div>
                                <div className={cn("space-y-1 overflow-y-auto pr-1", isTablet ? "max-h-[100px]" : isMobile ? "max-h-[150px]" : "max-h-[300px]")}>
                                    {nextLevelCriteria.map((item: any) => (
                                        <div key={item.criterion.id} className="flex items-start space-x-2 p-1.5 rounded hover:bg-[var(--color-surface-muted)] transition-colors">
                                            <Checkbox
                                                id={`crit-${item.criterion.id}`}
                                                checked={item.status === 'PASSED'}
                                                onCheckedChange={() => handleCriteriaToggle(item.criterion.id, item.status)}
                                                disabled={item.criterion.source !== 'PROF'}
                                                className="mt-0.5"
                                            />
                                            <div className="grid gap-0.5 leading-none">
                                                <label htmlFor={`crit-${item.criterion.id}`} className="text-xs font-medium text-[var(--color-text-primary)] cursor-pointer">
                                                    {item.criterion.description}
                                                </label>
                                                <span className="text-[10px] text-[var(--color-text-secondary)] uppercase">
                                                    {item.criterion.skill} • {item.criterion.source}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                    {nextLevelCriteria.length === 0 && (
                                        <p className="text-xs text-[var(--color-text-secondary)] italic text-center py-2">Sin criterios definidos.</p>
                                    )}
                                </div>
                            </div>

                            {/* Promotion / Demote Actions */}
                            <div className={cn("space-y-2", isTablet ? "pt-2" : "mt-4")}>
                                <Button
                                    type="button"
                                    onClick={() => handlePromote(!projectedPromotionStatus?.allowed)}
                                    className="w-full"
                                    size="sm"
                                    variant={projectedPromotionStatus?.allowed ? 'default' : 'destructive'}
                                >
                                    <Trophy className="w-4 h-4 mr-2" />
                                    {projectedPromotionStatus?.allowed ? `Ascender a Nivel ${currentLevel + 1}` : `Forzar Nivel ${currentLevel + 1}`}
                                </Button>

                                {currentLevel > 1 && (
                                    <Button
                                        type="button"
                                        onClick={handleDemote}
                                        className="w-full"
                                        size="sm"
                                        variant="outline"
                                    >
                                        Bajar a Nivel {currentLevel - 1}
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* RIGHT COLUMN: Tabs Content (8 cols) */}
                <div className={cn("flex flex-col h-full bg-background", isMobile ? "" : "lg:col-span-8")}>
                    {/* Tab Toggles (Pills) */}
                    <div className="flex border-b border-border px-6 py-3">
                        <nav className="flex space-x-2 bg-muted p-1 rounded-lg">
                            {[
                                { id: 'evaluacion', label: 'Evaluación', icon: Activity },
                                { id: 'comentarios', label: 'Comentarios', icon: MessageSquare },
                                { id: 'multimedia', label: 'Multimedia', icon: Paperclip },
                            ].map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={cn(
                                        "flex items-center px-4 py-1.5 text-sm font-medium rounded-md transition-all",
                                        activeTab === tab.id
                                            ? "bg-[var(--color-surface-default)] text-[var(--color-primary)] shadow-sm"
                                            : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                                    )}
                                >
                                    <tab.icon className="w-4 h-4 mr-2" />
                                    {tab.label}
                                </button>
                            ))}
                        </nav>
                    </div>

                    {/* Tab Panels */}
                    <div className="p-6 flex-1 overflow-y-auto">

                        {/* 1. EVALUACIÓN */}
                        {activeTab === 'evaluacion' && (
                            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                {/* Qualitative Section */}
                                <div className="space-y-4">
                                    <h3 className="text-sm font-semibold flex items-center gap-2 text-[var(--color-primary)] uppercase tracking-wide">
                                        <Brain className="w-4 h-4" />
                                        Habilidades Cualitativas (0-10)
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-[var(--color-surface-muted)]/30 p-4 rounded-xl border border-[var(--color-border-default)]">
                                        {/* Sonido */}
                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between">
                                                <Label className="flex items-center gap-2">
                                                    <Music className="w-4 h-4 text-blue-500" />
                                                    Sonido
                                                </Label>
                                                <span className="font-mono text-sm font-bold text-[var(--color-primary)]">{sonido}/10</span>
                                            </div>
                                            <Slider
                                                value={[sonido]}
                                                onValueChange={(vals) => setSonido(vals[0])}
                                                max={10}
                                                step={0.5}
                                                className="py-1"
                                            />
                                        </div>
                                        {/* Cognición */}
                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between">
                                                <Label className="flex items-center gap-2">
                                                    <Brain className="w-4 h-4 text-purple-500" />
                                                    Cognición
                                                </Label>
                                                <span className="font-mono text-sm font-bold text-[var(--color-primary)]">{cognicion}/10</span>
                                            </div>
                                            <Slider
                                                value={[cognicion]}
                                                onValueChange={(vals) => setCognicion(vals[0])}
                                                max={10}
                                                step={0.5}
                                                className="py-1"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <Separator />

                                {/* Quantitative Section (Deltas) */}
                                <div className="space-y-4">
                                    <h3 className="text-sm font-semibold flex items-center gap-2 text-[var(--color-primary)] uppercase tracking-wide">
                                        <Activity className="w-4 h-4" />
                                        Habilidades XP (Transacciones)
                                    </h3>
                                    <div className="grid gap-4">
                                        {[
                                            { id: 'motricidad', label: 'Motricidad', value: deltaMotricidad, setter: setDeltaMotricidad, targetXP: currentLevelConfig?.minXpMotr },
                                            { id: 'articulacion', label: 'Articulación', value: deltaArticulacion, setter: setDeltaArticulacion, targetXP: currentLevelConfig?.minXpArt },
                                            { id: 'flexibilidad', label: 'Flexibilidad', value: deltaFlexibilidad, setter: setDeltaFlexibilidad, targetXP: currentLevelConfig?.minXpFlex },
                                        ].map((skill) => (
                                            <div key={skill.id} className="flex items-center justify-between p-3 rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-default)] shadow-sm">
                                                <div>
                                                    <Label className="text-base">{skill.label}</Label>
                                                    <div className="text-xs text-[var(--color-text-secondary)] mt-0.5">
                                                        {/* XP Preview Calculation OR Static Inline */}
                                                        {(() => {
                                                            // Map skill ID to short key used in promotionCheck.xp
                                                            const shortKey = skill.id === 'motricidad' ? 'motr' : skill.id === 'articulacion' ? 'art' : 'flex';
                                                            const currentTotal = promotionCheck?.xp?.[shortKey] || 0;
                                                            const originalVal = originalXpDeltas[skill.id] || 0;
                                                            const inputVal = Number(skill.value) || 0;

                                                            const hasInput = skill.value !== "" && skill.value !== "0";

                                                            if (hasInput) {
                                                                const baseXP = currentTotal - originalVal;
                                                                const projectedXP = baseXP + inputVal;
                                                                return (
                                                                    <div className="flex items-center gap-1.5 font-mono text-[11px] md:text-xs">
                                                                        <span className="text-[var(--color-text-secondary)]">{baseXP}</span>
                                                                        <span className="text-[var(--color-primary)] font-bold">+ {inputVal}</span>
                                                                        <span className="text-[var(--color-text-secondary)]">→</span>
                                                                        <span className="text-[var(--color-text-primary)] font-bold">{projectedXP}</span>
                                                                        <span className="text-[var(--color-text-muted)] ml-1">/ {skill.targetXP} XP</span>
                                                                    </div>
                                                                );
                                                            }

                                                            return <CurrentXPInline studentId={studentId} skill={skill.id as any} simple target={skill.targetXP} />;
                                                        })()}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs text-[var(--color-text-secondary)] font-mono">+/- XP</span>
                                                    <Input
                                                        type="number"
                                                        placeholder="0"
                                                        value={skill.value}
                                                        onChange={(e) => skill.setter(e.target.value)}
                                                        className="w-20 text-right font-mono"
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* 2. COMENTARIOS */}
                        {activeTab === 'comentarios' && (
                            <div className="space-y-4 h-full flex flex-col animate-in fade-in slide-in-from-bottom-2 duration-300">
                                <Label htmlFor="notaProfesor" className="text-base font-semibold">Observaciones Generales</Label>
                                <Textarea
                                    id="notaProfesor"
                                    placeholder="Escribe aquí tus comentarios, feedback cualitativo y observaciones sobre la semana..."
                                    value={notaProfesor}
                                    onChange={(e) => setNotaProfesor(e.target.value)}
                                    className="flex-1 resize-none p-4 text-base leading-relaxed bg-[var(--color-surface-muted)]/20"
                                />
                            </div>
                        )}

                        {/* 3. MULTIMEDIA */}
                        {activeTab === 'multimedia' && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300 overflow-hidden">
                                <div>
                                    <Label className="text-base font-semibold mb-2 block">Material Adjunto</Label>
                                    <p className="text-sm text-[var(--color-text-secondary)] mb-4">
                                        Añade enlaces a vídeos, partituras o grabaciones para el alumno.
                                    </p>
                                    <MediaLinksInput
                                        value={mediaLinks}
                                        onChange={setMediaLinks}
                                        showFileUpload={true}
                                        videoFile={videoFile}
                                        onVideoFileChange={setVideoFile}
                                        uploadingVideo={uploadingVideo}
                                        disabled={isSubmitting || uploadingVideo}
                                        onPreview={onMediaClick ? (idx) => onMediaClick(mediaLinks, idx) : undefined}
                                    />
                                </div>
                            </div>
                        )}

                    </div>
                </div>
            </div>
        </div>
    );

    // Render: Dialog on desktop, Drawer on mobile/tablet
    if (isMobile) {
        return (
            <Drawer open={open} onOpenChange={onOpenChange}>
                <DrawerContent className="max-h-[90vh] flex flex-col">
                    <DrawerTitle className="sr-only">Feedback del Profesor</DrawerTitle>
                    <DrawerDescription className="sr-only">Formulario para evaluar al alumno</DrawerDescription>
                    {modalHeader}
                    {modalBody}
                    {modalFooter}
                </DrawerContent>
            </Drawer>
        );
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[90vh] p-0 overflow-hidden flex flex-col bg-background" aria-describedby={undefined}>
                <DialogTitle className="sr-only">Feedback del Profesor</DialogTitle>
                {modalHeader}
                {modalBody}
                {modalFooter}
            </DialogContent>
        </Dialog>
    );
}
