import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/auth/AuthProvider';
import { useLocation } from 'react-router-dom';
import { Button } from '@/features/shared/components/ui/button';
import { Textarea } from '@/features/shared/components/ui/textarea';
import { Label } from '@/features/shared/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/features/shared/components/ui/select';
import { Camera, X, Loader2, Mic, Square, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { toPng } from 'html-to-image';
import { componentStyles } from '@/design/componentStyles';
import { supabase } from '@/lib/supabaseClient';
import { createErrorReport } from '@/api/errorReportsAPI';
import ScreenshotEditor from './ScreenshotEditor';
import MediaLinksInput from "@/features/shared/components/media/MediaLinksInput";
import { uploadVideoToYouTube } from '@/utils/uploadVideoToYouTube';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
  DrawerOverlay,
  DrawerPortal,
  DrawerClose
} from '@/features/shared/components/ui/drawer';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogOverlay,
  DialogPortal
} from '@/features/shared/components/ui/dialog';

interface ScreenshotState {
  blob: Blob;
  url: string;
}

interface AudioRecordingState {
  blob: Blob;
  url: string;
}

interface ReportErrorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialError?: Error | string | null;
  initialCategory?: string | null;
}

interface ContextData {
  url: string;
  pathname: string;
  userAgent: string;
  screenSize: {
    width: number;
    height: number;
  };
  timestamp: string;
  userId: string | null;
  userEmail: string | null;
  consoleLogs: {
    message: string;
    timestamp: string;
  };
  error: {
    message: string;
    stack?: string;
    name?: string;
  } | null;
  mediaLinks?: string[];
}

const CATEGORIES = [
  {
    value: 'algo_no_funciona',
    label: 'Algo no funciona',
    description: 'Errores técnicos, botones que no responden, páginas que no cargan'
  },
  {
    value: 'se_ve_mal',
    label: 'Se ve mal o confuso',
    description: 'Problemas de diseño, colores, tamaños, layout'
  },
  {
    value: 'no_encuentro',
    label: 'No encuentro lo que busco',
    description: 'Navegación, menús, organización'
  },
  {
    value: 'sugerencia',
    label: 'Me gustaría que hubiera',
    description: 'Sugerencias de nuevas funcionalidades'
  },
  {
    value: 'otro',
    label: 'Otro',
    description: 'Cualquier otra cosa'
  }
];

export default function ReportErrorModal({ open, onOpenChange, initialError = null, initialCategory = null }: ReportErrorModalProps) {
  // Hooks siempre en el mismo orden
  const auth = useAuth();
  const location = useLocation();

  // Extraer user de forma segura
  const user = auth?.user || null;

  // Estados siempre en el mismo orden
  const [category, setCategory] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [screenshot, setScreenshot] = useState<ScreenshotState | null>(null);
  const [isCapturing, setIsCapturing] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const screenshotPreviewRef = useRef<HTMLImageElement>(null);

  // Estados para grabación de voz
  const [audioRecording, setAudioRecording] = useState<AudioRecordingState | null>(null);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingTime, setRecordingTime] = useState<number>(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<BlobPart[]>([]);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);

  const [isEditing, setIsEditing] = useState<boolean>(false);

  // Estados para video y mediaLinks
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [mediaLinks, setMediaLinks] = useState<string[]>([]);
  const [uploadingVideo, setUploadingVideo] = useState<boolean>(false);

  // Capturar logs recientes de la consola
  const captureConsoleLogs = () => {
    // Interceptar logs (esto es una aproximación, los logs reales se capturan del estado)
    // Por ahora, retornamos un mensaje indicando que los logs están disponibles
    return {
      message: 'Los logs de consola están disponibles en el contexto del navegador',
      timestamp: new Date().toISOString()
    };
  };

  // Capturar contexto automático
  const captureContext = React.useCallback((): ContextData => {
    return {
      url: typeof window !== 'undefined' ? window.location.href : '',
      pathname: location?.pathname || '',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
      screenSize: {
        width: typeof window !== 'undefined' ? window.innerWidth : 0,
        height: typeof window !== 'undefined' ? window.innerHeight : 0
      },
      timestamp: new Date().toISOString(),
      userId: user?.id || null,
      userEmail: user?.email || null,
      consoleLogs: captureConsoleLogs(),
      error: initialError ? {
        message: (initialError as any)?.message || String(initialError),
        stack: (initialError as any)?.stack,
        name: (initialError as any)?.name
      } : null
    };
  }, [location?.pathname, user?.id, user?.email, initialError]);

  // Capturar pantalla
  const handleCaptureScreenshot = async () => {
    setIsCapturing(true);
    // Preservar estado actual antes de cerrar
    const preservedCategory = category;
    const preservedAudio = audioRecording;

    try {
      // Cerrar temporalmente el modal antes de capturar
      const wasOpen = open;
      if (wasOpen) {
        isTemporaryCloseRef.current = true;
        onOpenChange(false);
        // Esperar a que el modal se cierre completamente
        await new Promise(resolve => setTimeout(resolve, 300));
      }

      // Encontrar el contenedor principal que incluye sidebar + main
      // #main-content contiene tanto el sidebar como el área principal
      const mainContent = document.querySelector('#main-content') || document.querySelector('main') || document.body as HTMLElement;

      // Capturar usando html-to-image (soporta CSS moderno y variables P3)
      const dataUrl = await toPng(mainContent as HTMLElement, {
        cacheBust: true,
        backgroundColor: null,
        skipFonts: true, // Avoid "font is undefined" error in embed-webfonts
        filter: (node: any) => {
          // Excluir nodos que no sean elementos
          if (!node.tagName) return true;

          // Excluir sidebar solo en mobile pequeño (<= 450px) para ver el contenido detrás
          if (window.innerWidth <= 450 && node.id === 'sidebar') {
            return false;
          }

          // Excluir overlays y modales
          try {
            // @ts-ignore
            const style = window.getComputedStyle(node);
            const zIndex = parseInt(style.zIndex);
            const isHighZIndex = zIndex >= 50;
            const isFixedOverlay = node.classList.contains('fixed') &&
              node.classList.contains('inset-0') &&
              isHighZIndex;

            const hasRadixDialogAttr = node.hasAttribute('data-radix-dialog-overlay') ||
              node.hasAttribute('data-radix-dialog-content') ||
              node.hasAttribute('data-radix-portal');

            // Si es un overlay o parte del diálogo, lo filtramos (return false)
            if (isFixedOverlay || hasRadixDialogAttr) {
              return false;
            }
            return true;
          } catch (e) {
            return true;
          }
        }
      });

      // Reabrir el modal si estaba abierto
      if (wasOpen) {
        onOpenChange(true);
        // Restaurar estado preservado
        setCategory(preservedCategory);
        setAudioRecording(preservedAudio);
      }

      if (dataUrl) {
        // Convertir Data URL a Blob para mantener consistencia con el flujo anterior
        const res = await fetch(dataUrl);
        const blob = await res.blob();
        setScreenshot({ blob, url: dataUrl });
        setIsCapturing(false);
      }

    } catch (error) {
      console.error('[ReportErrorModal] Error capturando pantalla:', error);
      toast.error('Error al capturar la pantalla');
      setIsCapturing(false);

      // Asegurarse de que el modal se reabra en caso de error
      if (open) {
        onOpenChange(true);
        // Restaurar estado preservado
        setCategory(preservedCategory);
        setAudioRecording(preservedAudio);
      }
    }
  };

  // Subir screenshot a Supabase Storage
  const uploadScreenshot = async (blob: Blob) => {
    if (!blob || !user) return null;

    try {
      const fileName = `screenshot_${Date.now()}_${user.id}.png`;
      const { data, error } = await supabase.storage
        .from('error-reports')
        .upload(fileName, blob, {
          contentType: 'image/png',
          upsert: false
        });

      if (error) throw error;

      // Obtener URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('error-reports')
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (error) {
      console.error('[ReportErrorModal] Error subiendo screenshot:', error);
      return null;
    }
  };

  // Subir audio a Supabase Storage
  const uploadAudio = async (blob: Blob) => {
    if (!blob || !user) return null;

    try {
      const fileName = `audio_${Date.now()}_${user.id}.webm`;
      const { data, error } = await supabase.storage
        .from('error-reports')
        .upload(fileName, blob, {
          contentType: 'audio/webm',
          upsert: false
        });

      if (error) throw error;

      // Obtener URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('error-reports')
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (error) {
      console.error('[ReportErrorModal] Error subiendo audio:', error);
      return null;
    }
  };

  // Iniciar grabación de voz
  const handleStartRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(audioBlob);
        setAudioRecording({ blob: audioBlob, url });
        setRecordingTime(0);

        // Detener el stream
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      // Timer para mostrar el tiempo de grabación
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

      toast.success('Grabación iniciada');
    } catch (error) {
      console.error('[ReportErrorModal] Error iniciando grabación:', error);
      toast.error('Error al acceder al micrófono. Verifica los permisos.');
    }
  };

  // Detener grabación de voz
  const handleStopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);

      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }

      toast.success('Grabación finalizada');
    }
  };

  // Formatear tiempo de grabación
  const formatRecordingTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Limpiar grabación
  const handleRemoveAudio = () => {
    setAudioRecording(null);
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    setRecordingTime(0);
  };

  // Enviar reporte
  const handleSubmit = async () => {
    if (!category || !description.trim()) {
      toast.error('Por favor, completa la categoría y la descripción');
      return;
    }

    setIsSubmitting(true);

    try {
      // Subir screenshot si existe
      let screenshotUrl = null;
      if (screenshot?.blob) {
        screenshotUrl = await uploadScreenshot(screenshot.blob);
      }

      // Subir audio si existe
      let audioUrl = null;
      if (audioRecording?.blob) {
        audioUrl = await uploadAudio(audioRecording.blob);
      }

      // Subir video si existe
      let videoUrl: string | null = null;
      if (videoFile) {
        setUploadingVideo(true);
        try {
          const uploadResult = await uploadVideoToYouTube(videoFile, {
            contexto: 'error_report',
            user_id: user?.id,
            user_nombre: user?.email || 'Usuario',
            comentarios: description.trim() || undefined,
          });

          if (uploadResult.ok && uploadResult.videoUrl) {
            videoUrl = uploadResult.videoUrl;
          } else {
            throw new Error(uploadResult.error || 'Error al subir el vídeo');
          }
        } catch (error: any) {
          console.error('[ReportErrorModal] Error subiendo vídeo:', error);
          toast.error(`Error al subir el vídeo: ${error instanceof Error ? error.message : 'Error desconocido'}`);
          setUploadingVideo(false);
          setIsSubmitting(false);
          return;
        } finally {
          setUploadingVideo(false);
        }
      }

      // Capturar contexto (usar la función memoizada)
      const context = captureContext();

      // Agregar mediaLinks al contexto (video + enlaces multimedia manuales)
      const finalMediaLinks = [...mediaLinks];
      if (videoUrl) {
        finalMediaLinks.push(videoUrl);
      }
      if (finalMediaLinks.length > 0) {
        context.mediaLinks = finalMediaLinks;
      }

      // Crear reporte usando la API
      await createErrorReport({
        userId: user?.id || null,
        category: category,
        description: description.trim(),
        screenshotUrl: screenshotUrl || undefined,
        audioUrl: audioUrl || undefined,
        context: context,
      });

      toast.success('✅ Reporte enviado correctamente. ¡Gracias por tu ayuda!');

      // Notificar a ErrorBoundary si está esperando confirmación
      window.dispatchEvent(new CustomEvent('error-report-sent'));

      // Limpiar formulario
      setCategory('');
      setDescription('');
      setScreenshot(null);
      setAudioRecording(null);
      setRecordingTime(0);
      setVideoFile(null);
      setMediaLinks([]);
      onOpenChange(false);
    } catch (error: any) {
      console.error('[ReportErrorModal] Error enviando reporte:', {
        error: error?.message || error,
        code: error?.code,
      });
      toast.error('Error al enviar el reporte. Inténtalo de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Ref para rastrear si el cierre es temporal (para captura) o definitivo
  const isTemporaryCloseRef = useRef<boolean>(false);

  // Limpiar y establecer valores iniciales cuando se abre/cierra el modal
  useEffect(() => {
    if (open) {
      // Si es una reapertura después de un cierre temporal, no resetear
      if (isTemporaryCloseRef.current) {
        isTemporaryCloseRef.current = false;
        return;
      }

      // Al abrir, establecer valores desde props o eventos
      if (initialError) {
        setCategory(initialCategory || 'algo_no_funciona');
        // Manejar tanto objetos Error como objetos serializados
        const errorMessage = (initialError as any)?.message ||
          (typeof (initialError as any)?.toString === 'function' ? (initialError as any).toString() : null) ||
          (typeof initialError === 'string' ? initialError : String(initialError || ''));
        setDescription(errorMessage);
      } else if (initialCategory) {
        setCategory(initialCategory);
      } else {
        setCategory('');
      }
    } else {
      // Solo limpiar si no es un cierre temporal
      if (!isTemporaryCloseRef.current) {
        setCategory('');
        setDescription('');
        setScreenshot(null);
        setAudioRecording(null);
        setRecordingTime(0);
        setIsRecording(false);
        if (recordingTimerRef.current) {
          clearInterval(recordingTimerRef.current);
          recordingTimerRef.current = null;
        }
        // Detener grabación si está activa
        if (mediaRecorderRef.current && isRecording) {
          mediaRecorderRef.current.stop();
          mediaRecorderRef.current.stream?.getTracks().forEach(track => track.stop());
        }
      }
    }
  }, [open, initialError, initialCategory, isRecording]);

  // Escuchar eventos para abrir modal
  useEffect(() => {
    const handleOpenReport = (event: Event) => {
      const customEvent = event as CustomEvent;
      if (customEvent.detail?.error) {
        const errorMessage = customEvent.detail.error?.message || customEvent.detail.error?.toString || String(customEvent.detail.error || '');
        setCategory(customEvent.detail.category || 'algo_no_funciona');
        setDescription(errorMessage);
      } else if (customEvent.detail?.category) {
        setCategory(customEvent.detail.category);
      }
      // El modal se abre desde el componente padre (Layout)
    };

    window.addEventListener('open-error-report', handleOpenReport);
    return () => window.removeEventListener('open-error-report', handleOpenReport);
  }, []);

  useEffect(() => {
    if (!open) {
      window.dispatchEvent(new CustomEvent('report-modal-closed'));

      const cleanup = () => {
        const body = document.body;
        if (body.style.pointerEvents === 'none') {
          body.style.pointerEvents = '';
        }
        if (body.style.cursor === 'none') {
          body.style.cursor = '';
        }
        const lockedCount = parseInt(body.getAttribute('data-scroll-locked') || '0');
        if (lockedCount > 0) {
          if (lockedCount <= 1) {
            body.removeAttribute('data-scroll-locked');
          } else {
            body.setAttribute('data-scroll-locked', String(lockedCount - 1));
          }
        }
      };

      setTimeout(cleanup, 50);
      setTimeout(cleanup, 200);
      return cleanup;
    }

    // Disparar evento cuando se abre el modal
    // Esto permite que hoy.jsx pause el cronómetro y desactive hotkeys
    window.dispatchEvent(new CustomEvent('report-modal-opened'));

    // Listener para prevenir hotkeys del modo estudio (Space, Enter, 'n', etc.)
    // pero permitir Escape y letras normales para inputs
    const handleKeyDown = (e: KeyboardEvent) => {
      // Permitir Escape siempre
      if (e.key === 'Escape') {
        return;
      }

      // Permitir si está en un input, textarea, select o contenteditable
      const target = e.target as HTMLElement;
      if (target && (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable
      )) {
        return;
      }

      // Bloquear hotkeys específicos del modo estudio: Space, Enter, 'n', 'N'
      // Estos son los hotkeys que se usan en hoy.jsx para controlar la sesión
      const estudioHotkeys = [
        ' ', // Space
        'Enter',
        'n',
        'N',
        'i',
        'I',
        '?'
      ];

      if (estudioHotkeys.includes(e.key)) {
        e.stopImmediatePropagation();
        e.stopPropagation();
        e.preventDefault();
      }
    };

    // Usar capture: true para interceptar antes de que llegue a hoy.jsx
    window.addEventListener('keydown', handleKeyDown, { capture: true, passive: false });

    return () => {
      window.removeEventListener('keydown', handleKeyDown, { capture: true });

      const cleanup = () => {
        const body = document.body;
        if (body.style.pointerEvents === 'none') {
          body.style.pointerEvents = '';
        }
        if (body.style.cursor === 'none') {
          body.style.cursor = '';
        }
        const lockedCount = parseInt(body.getAttribute('data-scroll-locked') || '0');
        if (lockedCount > 0) {
          if (lockedCount <= 1) {
            body.removeAttribute('data-scroll-locked');
          } else {
            body.setAttribute('data-scroll-locked', String(lockedCount - 1));
          }
        }
      };

      setTimeout(cleanup, 50);
      setTimeout(cleanup, 200);
    };
  }, [open]);

  // Check for desktop view
  const isDesktop = useMediaQuery("(min-width: 1024px)");

  const commonTitle = "Reportar problema o sugerencia";
  const commonDesc = "Ayúdanos a mejorar la aplicación. Describe el problema o tu sugerencia y, si quieres, incluye una captura de pantalla.";

  // Form content extracted for reuse
  const formContent = (
    <div className="space-y-4">
      {/* Categoría */}
      <div className="space-y-2">
        <Label htmlFor="category">Categoría *</Label>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger id="category">
            <SelectValue placeholder="Selecciona una categoría" />
          </SelectTrigger>
          <SelectContent className="!z-[9999]">
            {CATEGORIES.map((cat) => (
              <SelectItem key={cat.value} value={cat.value}>
                <div>
                  <div className="font-medium">{cat.label}</div>
                  <div className="text-xs text-muted-foreground">{cat.description}</div>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Descripción */}
      <div className="space-y-2">
        <Label htmlFor="description">Descripción *</Label>
        <Textarea
          id="description"
          placeholder="Describe el problema o tu sugerencia..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={6}
          className="resize-none"
        />
      </div>

      {/* Captura de pantalla */}
      <div className="space-y-2">
        <Label>Captura de pantalla (opcional)</Label>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleCaptureScreenshot}
            disabled={isCapturing}
            className={`${componentStyles.buttons.outline} gap-2`}
          >
            {isCapturing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Capturando...
              </>
            ) : (
              <>
                <Camera className="w-4 h-4" />
                Capturar pantalla
              </>
            )}
          </Button>
          {screenshot && !isEditing && (
            <Button
              type="button"
              variant="ghost"
              onClick={() => setScreenshot(null)}
              className="gap-2"
            >
              <X className="w-4 h-4" />
              Eliminar
            </Button>
          )}
        </div>

        {screenshot && !isEditing && (
          <div className="mt-2 border rounded-lg p-2 bg-[var(--color-surface-muted)]">
            <img
              ref={screenshotPreviewRef}
              src={screenshot.url}
              alt="Vista previa de captura"
              className="max-w-full h-auto rounded"
            />
            <div className="mt-2 flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditing(true)}
                className={`${componentStyles.buttons.outline} gap-2`}
              >
                <Pencil className="w-4 h-4" />
                Editar captura
              </Button>
            </div>
          </div>
        )}

        {isEditing && screenshot && (
          <div className="mt-2">
            <ScreenshotEditor
              imageUrl={screenshot.url}
              onSave={(edited: any) => {
                if (screenshot.blob) {
                  URL.revokeObjectURL(screenshot.url);
                }
                setScreenshot(edited);
                setIsEditing(false);
              }}
              onCancel={() => setIsEditing(false)}
            />
          </div>
        )}
      </div>

      {/* Nota de voz */}
      <div className="space-y-2">
        <Label>Nota de voz (opcional)</Label>
        <div className="flex gap-2">
          {!isRecording && !audioRecording ? (
            <Button
              type="button"
              variant="outline"
              onClick={handleStartRecording}
              disabled={isSubmitting}
              className={`${componentStyles.buttons.outline} gap-2`}
            >
              <Mic className="w-4 h-4" />
              Grabar nota de voz
            </Button>
          ) : isRecording ? (
            <Button
              type="button"
              variant="outline"
              onClick={handleStopRecording}
              className={`${componentStyles.buttons.outline} gap-2 ${isRecording ? 'bg-[var(--color-danger)]/10 border-[var(--color-danger)] text-[var(--color-danger)]' : ''}`}
            >
              <Square className="w-4 h-4 fill-current" />
              Detener grabación ({formatRecordingTime(recordingTime)})
            </Button>
          ) : null}
          {audioRecording && (
            <>
              <Button
                type="button"
                variant="ghost"
                onClick={handleRemoveAudio}
                className="gap-2"
              >
                <X className="w-4 h-4" />
                Eliminar
              </Button>
            </>
          )}
        </div>

        {audioRecording && (
          <div className="mt-2 border rounded-lg p-2 bg-[var(--color-surface-muted)]">
            <audio controls src={audioRecording.url} className="w-full">
              Tu navegador no soporta el elemento audio.
            </audio>
          </div>
        )}
      </div>

      {/* Video y enlaces multimedia */}
      <MediaLinksInput
        value={mediaLinks}
        onChange={setMediaLinks}
        showFileUpload={true}
        videoFile={videoFile}
        onVideoFileChange={setVideoFile}
        uploadingVideo={uploadingVideo}
        disabled={isSubmitting}
        videoId="video-error-report"
      />
    </div>
  );

  const commonFooterButtons = (
    <>
      <Button
        variant="outline"
        onClick={() => onOpenChange(false)}
        disabled={isSubmitting}
        className={`${componentStyles.buttons.outline} flex-1 min-w-[150px]`}
      >
        Cancelar
      </Button>
      <Button
        onClick={handleSubmit}
        disabled={isSubmitting || uploadingVideo || !category || !description.trim()}
        className={`${componentStyles.buttons.primary} flex-1 min-w-[150px] gap-2`}
      >
        {isSubmitting ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Enviando...
          </>
        ) : (
          'Enviar reporte'
        )}
      </Button>
    </>
  );

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className={`${componentStyles.modal.content} sm:max-w-2xl max-h-[90vh] overflow-y-auto`}>
          <DialogHeader className={componentStyles.modal.header}>
            <DialogTitle className={componentStyles.modal.title}>
              {commonTitle}
            </DialogTitle>
            <DialogDescription className={componentStyles.modal.description}>
              {commonDesc}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            {formContent}
          </div>

          <DialogFooter className={`flex-row justify-end space-x-2 ${componentStyles.modal.footer}`}>
            {commonFooterButtons}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[90vh] flex flex-col">
        <DrawerHeader className="text-left">
          <DrawerTitle>{commonTitle}</DrawerTitle>
          <DrawerDescription>{commonDesc}</DrawerDescription>
        </DrawerHeader>

        <div className="p-4 overflow-y-auto flex-1">
          {formContent}
        </div>

        <DrawerFooter className="pt-2">
          <div className="flex gap-3 w-full">
            {commonFooterButtons}
          </div>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
