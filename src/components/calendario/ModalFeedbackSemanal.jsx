import React, { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ds/Button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ds";
import { MessageSquare, Music, Brain, Save, X, Activity, Paperclip, CheckSquare, Trophy, HelpCircle } from "lucide-react";
import { FeedbacksSemanalAPI } from "@/data/feedbacksSemanalClient";
import { useToast } from "@/components/ui/use-toast";
import MediaLinksInput from "@/components/common/MediaLinksInput";
import { normalizeMediaLinks } from "@/components/utils/media";
import { cn } from "@/lib/utils";
import { localDataClient } from '@/api/localDataClient';
import { computeKeyCriteriaStatus, canPromote, promoteLevel } from '@/utils/levelLogic';
import { useEffectiveUser } from '@/components/utils/helpers';
import { Checkbox } from '@/components/ui/checkbox';
import { uploadVideoToYouTube } from "@/utils/uploadVideoToYouTube";
import CurrentXPInline from '@/components/evaluaciones/CurrentXPInline';

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
    onSaved
}) {
    const { toast } = useToast();
    const effectiveUser = useEffectiveUser();
    const [isSubmitting, setIsSubmitting] = useState(false);

    // TABS state
    const [activeTab, setActiveTab] = useState('evaluacion'); // evaluacion | comentarios | multimedia

    // --- LEFT COLUMN STATE (Level Logic) ---
    const [currentLevel, setCurrentLevel] = useState(0);
    const [nextLevelCriteria, setNextLevelCriteria] = useState([]);
    const [promotionCheck, setPromotionCheck] = useState(null);
    const [loadingLevelData, setLoadingLevelData] = useState(false);

    // --- RIGHT COLUMN STATE ---

    // 1. Evaluación: Qualitative (0-10)
    const [sonido, setSonido] = useState(5.0);
    const [cognicion, setCognicion] = useState(5.0);

    // 1. Evaluación: XP Deltas (Manual +/-)
    const [deltaMotricidad, setDeltaMotricidad] = useState("");
    const [deltaArticulacion, setDeltaArticulacion] = useState("");
    const [deltaFlexibilidad, setDeltaFlexibilidad] = useState("");

    // 2. Comentarios
    const [notaProfesor, setNotaProfesor] = useState("");

    // 3. Multimedia
    const [mediaLinks, setMediaLinks] = useState([]);
    const [videoFile, setVideoFile] = useState(null);
    const [uploadingVideo, setUploadingVideo] = useState(false);


    // LOAD DATA
    useEffect(() => {
        if (open) {
            loadLevelData(); // Always reload level data on open

            if (feedback) {
                setNotaProfesor(feedback.notaProfesor || "");
                setSonido(feedback.sonido != null ? Number(feedback.sonido) : 5.0);
                setCognicion(feedback.cognicion != null ? Number(feedback.cognicion) : 5.0);

                // We don't load PER-SESSION deltas usually, as they are transactional.
                const deltas = feedback.xp_delta_by_skill || {};
                setDeltaMotricidad(deltas.motricidad || "");
                setDeltaArticulacion(deltas.articulacion || "");
                setDeltaFlexibilidad(deltas.flexibilidad || "");

                // Media
                setMediaLinks(feedback.mediaLinks || []);
                setVideoFile(null);
            } else {
                // Reset form
                setNotaProfesor("");
                setSonido(5.0);
                setCognicion(5.0);
                setDeltaMotricidad("");
                setDeltaArticulacion("");
                setDeltaFlexibilidad("");
                setMediaLinks([]);
                setVideoFile(null);
                setActiveTab('evaluacion'); // Default tab
            }
        }
    }, [open, feedback, studentId]);

    const loadLevelData = async () => {
        if (!studentId) return;
        setLoadingLevelData(true);
        try {
            const user = await localDataClient.entities.User.get(studentId);
            const level = user?.nivelTecnico || 0;
            setCurrentLevel(level);

            const criteria = await computeKeyCriteriaStatus(studentId, level + 1);
            setNextLevelCriteria(criteria);

            const check = await canPromote(studentId, level);
            setPromotionCheck(check);
        } catch (error) {
            console.error('Error loading level data:', error);
        } finally {
            setLoadingLevelData(false);
        }
    };

    const handleCriteriaToggle = async (criterionId, currentStatus) => {
        const newStatus = currentStatus === 'PASSED' ? 'FAILED' : 'PASSED';
        // Optimistic update
        setNextLevelCriteria(prev => prev.map(c =>
            c.criterion.id === criterionId ? { ...c, status: newStatus } : c
        ));

        try {
            const allStatus = await localDataClient.entities.StudentCriteriaStatus.list();
            const existing = allStatus.find(s => s.studentId === studentId && s.criterionId === criterionId);

            if (existing && existing.id && existing.id.length === 36) {
                await localDataClient.entities.StudentCriteriaStatus.update(existing.id, { status: newStatus });
            } else {
                await localDataClient.entities.StudentCriteriaStatus.create({
                    studentId: studentId,
                    criterionId: criterionId,
                    status: newStatus,
                    assessedAt: new Date().toISOString(),
                    assessedBy: effectiveUser?.id
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

    const handlePromote = async () => {
        if (!confirm(`¿Confirmar promoción a Nivel ${currentLevel + 1}?`)) return;
        try {
            await promoteLevel(studentId, currentLevel + 1, 'Promoción por evaluación', effectiveUser?.id || 'system');
            toast({ title: "¡Alumno promovido!", description: `Nivel ${currentLevel + 1} alcanzado.` });
            loadLevelData();
        } catch (error) {
            console.error('Error promoting:', error);
            toast({ variant: "destructive", title: "Error", description: "Error al promover" });
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
                        profesor_id: effectiveUser?.id || "unknown",
                        profesor_nombre: effectiveUser?.full_name || effectiveUser?.email || 'Profesor',
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
            const xpDeltas = {};
            if (deltaMotricidad) xpDeltas.motricidad = Number(deltaMotricidad);
            if (deltaArticulacion) xpDeltas.articulacion = Number(deltaArticulacion);
            if (deltaFlexibilidad) xpDeltas.flexibilidad = Number(deltaFlexibilidad);

            const dataToSave = {
                alumnoId: studentId,
                profesorId: effectiveUser?.id || "current-prof-id",
                semanaInicioISO: weekStartISO,
                notaProfesor: notaProfesor,
                sonido: Number(sonido),
                cognicion: Number(cognicion),
                habilidades: {},
                xp_delta_by_skill: xpDeltas, // NEW FIELD
                mediaLinks: normalizeMediaLinks(finalMediaLinks),
                lastEditedAt: new Date().toISOString(),
            };

            await FeedbacksSemanalAPI.upsertFeedbackSemanal(dataToSave);

            // Apply XP Deltas to system (Side Effect)
            if (Object.keys(xpDeltas).length > 0) {
                const { addXP } = await import('@/services/xpService');
                if (xpDeltas.motricidad) await addXP(studentId, 'motricidad', xpDeltas.motricidad, 'PROF');
                if (xpDeltas.articulacion) await addXP(studentId, 'articulacion', xpDeltas.articulacion, 'PROF');
                if (xpDeltas.flexibilidad) await addXP(studentId, 'flexibilidad', xpDeltas.flexibilidad, 'PROF');
            }

            toast({
                title: "Feedback guardado",
                description: "Los datos se han actualizado correctamente.",
            });

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

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[90vh] p-0 overflow-hidden flex flex-col bg-background">
                {/* HEADER */}
                {/* HEADER */}
                <DialogHeader className="px-6 py-4 border-b border-border bg-muted/40 shrink-0 flex flex-row items-center justify-between space-y-0">
                    <div>
                        <DialogTitle className="flex items-center gap-2 text-lg">
                            <MessageSquare className="w-5 h-5 text-[var(--color-primary)]" />
                            Feedback Profesor
                        </DialogTitle>
                        <div className="text-sm text-[var(--color-text-secondary)] mt-1">
                            {weekLabel || "Semana seleccionada"}
                        </div>
                    </div>
                </DialogHeader>

                {/* CONTENT - 2 COLUMNS */}
                <div className="flex-1 overflow-auto">
                    <div className="grid grid-cols-1 lg:grid-cols-12 h-full min-h-[500px]">

                        {/* LEFT COLUMN: Contexto / Nivel (4 cols) */}
                        <div className="lg:col-span-4 border-r border-[var(--color-border-default)] bg-[var(--color-surface-muted)]/30 p-4 space-y-6">
                            {/* Level Card */}
                            <div className="bg-[var(--color-surface-default)] rounded-xl p-5 border border-[var(--color-border-default)] shadow-sm text-center">
                                <span className="text-xs text-[var(--color-text-secondary)] uppercase tracking-wider font-medium">Siguiente Nivel</span>
                                <div className="text-5xl font-bold text-[var(--color-primary)] my-2">{currentLevel + 1}</div>
                                <Badge variant="outline" className="text-xs">
                                    Actual: {currentLevel}
                                </Badge>
                            </div>

                            {/* Criteria List */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-sm font-semibold text-[var(--color-text-primary)]">Requisitos de Nivel</h4>
                                    <span className="text-xs text-[var(--color-text-secondary)]">
                                        {nextLevelCriteria.filter(c => c.status === 'PASSED').length}/{nextLevelCriteria.length}
                                    </span>
                                </div>
                                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                                    {nextLevelCriteria.map((item) => (
                                        <div key={item.criterion.id} className="flex items-start space-x-3 p-2 rounded hover:bg-[var(--color-surface-muted)] transition-colors">
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
                                        <p className="text-xs text-[var(--color-text-secondary)] italic text-center">Sin criterios definidos.</p>
                                    )}
                                </div>
                            </div>

                            {/* Promotion Button */}
                            <Button
                                type="button"
                                onClick={handlePromote}
                                className="w-full mt-2"
                                size="sm"
                                variant={promotionCheck?.allowed ? 'primary' : 'outline'}
                                disabled={!promotionCheck?.allowed}
                            >
                                <Trophy className="w-4 h-4 mr-2" />
                                Ascender de Nivel
                            </Button>
                        </div>

                        {/* RIGHT COLUMN: Tabs Content (8 cols) */}
                        <div className="lg:col-span-8 flex flex-col h-full bg-background">
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
                                                    { id: 'motricidad', label: 'Motricidad', value: deltaMotricidad, setter: setDeltaMotricidad, targetXP: promotionCheck?.config?.minXpMotr },
                                                    { id: 'articulacion', label: 'Articulación', value: deltaArticulacion, setter: setDeltaArticulacion, targetXP: promotionCheck?.config?.minXpArt },
                                                    { id: 'flexibilidad', label: 'Flexibilidad', value: deltaFlexibilidad, setter: setDeltaFlexibilidad, targetXP: promotionCheck?.config?.minXpFlex },
                                                ].map((skill) => (
                                                    <div key={skill.id} className="flex items-center justify-between p-3 rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-default)] shadow-sm">
                                                        <div>
                                                            <Label className="text-base">{skill.label}</Label>
                                                            <div className="text-xs text-[var(--color-text-secondary)] mt-0.5">
                                                                <CurrentXPInline studentId={studentId} skill={skill.id} simple target={skill.targetXP} />
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
                                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
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
                                            />
                                        </div>
                                    </div>
                                )}

                            </div>
                        </div>
                    </div>
                </div>

                {/* FOOTER ACTIONS */}
                <div className="p-4 border-t border-border bg-background flex justify-end gap-3 shrink-0">
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                        Cancelar
                    </Button>
                    <Button variant="primary" onClick={handleSave} disabled={isSubmitting || uploadingVideo} className="min-w-[150px]">
                        <Save className="w-4 h-4 mr-2" />
                        {isSubmitting ? (uploadingVideo ? "Subiendo vídeo..." : "Guardando...") : "Guardar Feedback"}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
