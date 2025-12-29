import React, { useState, useEffect } from "react";
import { Button } from "@/features/shared/components/ui/button";
import { Textarea } from "@/features/shared/components/ui/textarea";
import { CheckCircle, XCircle, Clock, RotateCcw, Home, Loader2 } from "lucide-react";
import MediaPreviewModal from "@/features/shared/components/media/MediaPreviewModal";
import MediaLinksInput from "@/features/shared/components/media/MediaLinksInput";
import { componentStyles } from "@/design/componentStyles";
import { uploadVideoToYouTube } from "@/utils/uploadVideoToYouTube";
import { toast } from "sonner";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/features/shared/components/ui/dialog";
import { cn } from "@/lib/utils";
import { shouldIgnoreHotkey } from "@/utils/hotkeys";

interface EmojiCalidadProps {
    nivel: number;
}

const EmojiCalidad = ({ nivel }: EmojiCalidadProps) => {
    const emojis: Record<number, { emoji: string; label: string }> = {
        1: { emoji: "😣", label: "Muy difícil" },
        2: { emoji: "😕", label: "Difícil" },
        3: { emoji: "🙂", label: "Bien" },
        4: { emoji: "😄", label: "Excelente" },
    };

    const config = emojis[nivel] || emojis[3];

    return (
        <div className="flex flex-col items-center">
            <span className="text-xl sm:text-2xl">{config.emoji}</span>
            <span className="text-[9px] sm:text-[10px] font-medium mt-0 sm:mt-0.5 text-[var(--color-text-primary)]">{config.label}</span>
        </div>
    );
};

interface UserProfile {
    full_name?: string;
    name?: string;
}

interface Sesion {
    nombre: string;
    [key: string]: unknown;
}

interface ResumenFinalProps {
    /** Datos de la sesión */
    sesion: Sesion;
    /** Tiempo real en segundos */
    tiempoReal: number;
    /** Tiempo previsto en segundos */
    tiempoPrevisto: number;
    /** Set de índices de ejercicios completados */
    completados: Set<number>;
    /** Set de índices de ejercicios omitidos */
    omitidos: Set<number>;
    /** Total de ejercicios en la sesión */
    totalEjercicios: number;
    /** Callback para guardar y salir */
    onGuardarYSalir: () => void;
    /** Callback para reiniciar la sesión */
    onReiniciar: () => void;
    /** Callback para guardar calidad, notas y media */
    onCalidadNotas?: (calidad: number, notas: string, mediaLinks: string[]) => Promise<void>;
    /** Si el diálogo está abierto */
    open?: boolean;
    /** Callback para cambiar estado del diálogo */
    onOpenChange?: (open: boolean) => void;
    /** ID del usuario para subida de vídeo */
    userId?: string;
    /** Perfil del usuario para subida de vídeo */
    userProfile?: UserProfile;
    /** ID del registro de sesión para contexto */
    registroSesionId?: string;
    /** ID del profesor asignado */
    profesorAsignadoId?: string;
}

export default function ResumenFinal({
    sesion,
    tiempoReal,
    tiempoPrevisto,
    completados,
    omitidos,
    totalEjercicios,
    onGuardarYSalir,
    onReiniciar,
    onCalidadNotas,
    open = true,
    onOpenChange,
    userId,
    userProfile,
    registroSesionId,
    profesorAsignadoId
}: ResumenFinalProps) {
    const [calidad, setCalidad] = useState(3);
    const [notas, setNotas] = useState("");
    const [mediaLinks, setMediaLinks] = useState<string[]>([]);
    const [videoFile, setVideoFile] = useState<File | null>(null);
    const [uploadingVideo, setUploadingVideo] = useState(false);
    const [guardado, setGuardado] = useState(false);
    const [showPreview, setShowPreview] = useState(false);
    const [previewIndex, setPreviewIndex] = useState(0);

    const pendientes = totalEjercicios - completados.size - omitidos.size;

    // Hotkeys para ResumenFinal: 1-4 para valoración rápida, Ctrl+Enter para guardar
    useEffect(() => {
        if (!open) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            // No procesar si está en un campo editable (notas, etc.)
            if (shouldIgnoreHotkey(e)) return;

            // Teclas 1-4: valoración rápida
            if (['1', '2', '3', '4'].includes(e.key)) {
                e.preventDefault();
                const nivel = parseInt(e.key);
                setCalidad(nivel);
                return;
            }

            // Ctrl+Enter: guardar feedback y cerrar
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.preventDefault();
                if (!guardado && !uploadingVideo) {
                    handleGuardarFeedback();
                }
                return;
            }
        };

        window.addEventListener('keydown', handleKeyDown, true);
        return () => {
            window.removeEventListener('keydown', handleKeyDown, true);
        };
    }, [open, calidad, guardado, uploadingVideo]);

    const handleGuardarFeedback = async () => {
        let finalMediaLinks = [...mediaLinks];

        // Si hay vídeo, subirlo primero
        if (videoFile && userId && userProfile) {
            setUploadingVideo(true);

            try {
                const uploadResult = await uploadVideoToYouTube(videoFile, {
                    contexto: 'sesion_estudio',
                    alumno_id: userId,
                    alumno_nombre: userProfile.full_name || userProfile.name || 'Alumno',
                    profesor_id: profesorAsignadoId || undefined,
                    sesion_id: registroSesionId || undefined,
                    comentarios: notas.trim() || sesion?.nombre || 'Autoevaluación de sesión',
                });

                if (uploadResult.ok && uploadResult.videoUrl) {
                    // Añadir la URL del vídeo a mediaLinks
                    finalMediaLinks = [...finalMediaLinks, uploadResult.videoUrl];
                    toast.success('Vídeo subido correctamente');
                } else {
                    throw new Error(uploadResult.error || 'Error al subir el vídeo');
                }
            } catch (error) {
                console.error('[ResumenFinal] Error subiendo vídeo:', error);
                toast.error(`La sesión se guardará, pero hubo un error al subir el vídeo: ${error instanceof Error ? error.message : 'Error desconocido'}`);
                // Continuar con el guardado aunque falle la subida del vídeo
            } finally {
                setUploadingVideo(false);
            }
        }

        // Guardar feedback con mediaLinks (incluyendo el vídeo subido si hubo)
        if (onCalidadNotas) {
            // Llamar a onCalidadNotas y esperar a que termine
            await onCalidadNotas(calidad, notas, finalMediaLinks);
        }

        setGuardado(true);

        // Esperar un poco más para asegurar que el guardado se complete
        setTimeout(() => {
            onGuardarYSalir();
        }, 1500);
    };

    const handlePreview = (index: number) => {
        setPreviewIndex(index);
        setShowPreview(true);
    };

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent
                    className={cn(
                        // Mobile: full-screen
                        "w-full h-[100dvh] max-h-none rounded-none p-4 overflow-y-auto",
                        // Desktop: centrado
                        "sm:w-full sm:max-w-xl sm:h-auto sm:max-h-[90vh] sm:rounded-[var(--radius-modal)] sm:p-6",
                        // Ocultar botón de cerrar por defecto (ya tenemos uno personalizado)
                        "[&>button[data-radix-dialog-close]]:hidden"
                    )}
                >
                    <DialogHeader className="text-center">
                        <div className="flex flex-col items-center space-y-1.5 sm:space-y-2">
                            <div className="icon-tile mx-auto mb-2 sm:mb-3 bg-[var(--color-success)]/10 w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center">
                                <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-[var(--color-success)]" />
                            </div>
                            <DialogTitle className={`text-lg sm:text-xl ${componentStyles.typography.pageTitle} text-center`}>¡Sesión Completada!</DialogTitle>
                            <DialogDescription className="text-xs sm:text-sm mt-0.5 sm:mt-1 text-center">{sesion.nombre}</DialogDescription>
                        </div>
                    </DialogHeader>
                    <div className="flex-1 overflow-y-auto min-h-0 space-y-3 sm:space-y-4">
                        {/* Métricas: Completados / Omitidos / Minutos */}
                        <section className="flex flex-wrap items-center gap-4 justify-center pb-2 sm:pb-3 border-b border-[var(--color-border-default)]">
                            <div className="text-center">
                                <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 mx-auto mb-1 text-[var(--color-success)]" />
                                <p className="text-base sm:text-lg font-bold text-[var(--color-text-primary)]">{completados.size}</p>
                                <p className="text-xs sm:text-sm text-[var(--color-text-secondary)]">Completados</p>
                            </div>

                            <div className="text-center">
                                <XCircle className="w-4 h-4 sm:w-5 sm:h-5 mx-auto mb-1 text-[var(--color-text-secondary)]" />
                                <p className="text-base sm:text-lg font-bold text-[var(--color-text-primary)]">{omitidos.size}</p>
                                <p className="text-xs sm:text-sm text-[var(--color-text-secondary)]">Omitidos</p>
                            </div>

                            <div className="text-center">
                                <Clock className="w-4 h-4 sm:w-5 sm:h-5 mx-auto mb-1 text-[var(--color-info)]" />
                                <p className="text-base sm:text-lg font-bold text-[var(--color-text-primary)]">
                                    {Math.floor(tiempoReal / 60)}:{String(tiempoReal % 60).padStart(2, '0')}
                                </p>
                                <p className="text-xs sm:text-sm text-[var(--color-text-secondary)]">Minutos</p>
                            </div>
                        </section>

                        {/* Bloque de feedback: caritas */}
                        <section className="space-y-2 sm:space-y-3">
                            <h2 className={`font-semibold text-sm sm:text-base text-center ${componentStyles.typography.sectionTitle}`}>¿Cómo fue la práctica?</h2>

                            <div className="grid grid-cols-4 gap-2 sm:gap-3 w-full max-w-md mx-auto">
                                {[1, 2, 3, 4].map((nivel) => (
                                    <button
                                        key={nivel}
                                        onClick={() => setCalidad(nivel)}
                                        className={cn(
                                            "flex flex-col items-center justify-center p-2 sm:p-3 app-panel border-2 transition-all w-full",
                                            calidad === nivel
                                                ? 'border-[var(--color-primary)] bg-[var(--color-primary-soft)]'
                                                : 'border-[var(--color-border-default)] hover:bg-[var(--color-surface-muted)]'
                                        )}
                                        aria-label={`Calificar como ${["Muy difícil", "Difícil", "Bien", "Excelente"][nivel - 1]}`}
                                    >
                                        <EmojiCalidad nivel={nivel} />
                                    </button>
                                ))}
                            </div>
                        </section>

                        {/* Notas sobre la práctica */}
                        <section className="space-y-1.5">
                            <label htmlFor="notas-practica" className="block text-sm font-medium text-[var(--color-text-primary)] pl-3">
                                Notas sobre la práctica (opcional)
                            </label>
                            <Textarea
                                id="notas-practica"
                                value={notas}
                                onChange={(e) => setNotas(e.target.value)}
                                placeholder="¿Qué te ha gustado? ¿Retos a futuro? ¿Cómo piensas superarlos?"
                                rows={2}
                                className={cn("text-xs sm:text-sm app-panel resize-none w-full", componentStyles.controls.inputDefault)}
                                aria-label="Notas sobre la práctica"
                            />
                        </section>

                        {/* Input de subida de vídeo y enlaces multimedia */}
                        <section className="space-y-1.5 overflow-hidden">
                            <label className="block text-sm font-medium text-[var(--color-text-primary)] pl-3">
                                Recursos Adjuntos (opcional)
                            </label>
                            <MediaLinksInput
                                value={mediaLinks}
                                onChange={setMediaLinks}
                                onPreview={handlePreview}
                                showFileUpload={true}
                                videoFile={videoFile}
                                onVideoFileChange={setVideoFile}
                                uploadingVideo={uploadingVideo}
                                disabled={guardado}
                                videoId="video-sesion"
                            />
                        </section>
                    </div>

                    {/* Footer: Botones finales */}
                    <footer className="mt-2 flex flex-col-reverse gap-3 sm:mt-4 sm:flex-row sm:justify-end shrink-0">
                        <Button
                            variant="outline"
                            onClick={onReiniciar}
                            className={cn("flex-1 min-w-[120px] text-xs sm:text-sm h-9 sm:h-10", componentStyles.buttons.outline)}
                        >
                            <RotateCcw className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1" />
                            Repetir
                        </Button>
                        <Button
                            onClick={handleGuardarFeedback}
                            disabled={guardado || uploadingVideo}
                            className={cn("flex-1 min-w-[120px] text-xs sm:text-sm h-9 sm:h-10", componentStyles.buttons.primary)}
                        >
                            {uploadingVideo ? (
                                <>
                                    <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 animate-spin" />
                                    Subiendo vídeo...
                                </>
                            ) : guardado ? (
                                <>
                                    <CheckCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1" />
                                    Guardado
                                </>
                            ) : (
                                <>
                                    <Home className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1" />
                                    Finalizar
                                </>
                            )}
                        </Button>
                    </footer>
                </DialogContent>
            </Dialog>

            {showPreview && (
                <MediaPreviewModal
                    urls={mediaLinks}
                    initialIndex={previewIndex}
                    open={showPreview}
                    onClose={() => setShowPreview(false)}
                />
            )}
        </>
    );
}
