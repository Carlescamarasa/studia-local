import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/auth/AuthProvider';
import { useLocation } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogOverlay, DialogPortal } from '@/components/ui/dialog';
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Camera, X, Loader2, Mic, Square, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import html2canvas from 'html2canvas';
import { componentStyles } from '@/design/componentStyles';
import { supabase } from '@/lib/supabaseClient';
import { createErrorReport } from '@/api/errorReportsAPI';
import ScreenshotEditor from './ScreenshotEditor';

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
    label: 'Me gustaría que hubiera...',
    description: 'Sugerencias de nuevas funcionalidades'
  },
  {
    value: 'otro',
    label: 'Otro',
    description: 'Cualquier otra cosa'
  }
];

export default function ReportErrorModal({ open, onOpenChange, initialError = null, initialCategory = null }) {
  // Hooks siempre en el mismo orden
  const auth = useAuth();
  const location = useLocation();
  
  // Extraer user de forma segura
  const user = auth?.user || null;
  
  // Estados siempre en el mismo orden
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [screenshot, setScreenshot] = useState(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const screenshotPreviewRef = useRef(null);
  
  // Estados para grabación de voz
  const [audioRecording, setAudioRecording] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordingTimerRef = useRef(null);
  
  const [isEditing, setIsEditing] = useState(false);

  // Capturar logs recientes de la consola
  const captureConsoleLogs = () => {
    const logs = [];
    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;
    
    // Interceptar logs (esto es una aproximación, los logs reales se capturan del estado)
    // Por ahora, retornamos un mensaje indicando que los logs están disponibles
    return {
      message: 'Los logs de consola están disponibles en el contexto del navegador',
      timestamp: new Date().toISOString()
    };
  };

  // Capturar contexto automático
  const captureContext = React.useCallback(() => {
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
        message: initialError?.message || String(initialError),
        stack: initialError?.stack,
        name: initialError?.name
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
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      // Encontrar el contenedor principal (el main o el body)
      const mainContent = document.querySelector('main') || document.body;
      
      // Capturar sin el modal visible
      const canvas = await html2canvas(mainContent, {
        useCORS: true,
        logging: false,
        scale: 0.5, // Reducir tamaño para mejor rendimiento
        backgroundColor: null,
        ignoreElements: (element) => {
          // Excluir cualquier overlay o modal restante
          const zIndex = parseInt(window.getComputedStyle(element).zIndex);
          const isHighZIndex = zIndex >= 50;
          const isFixedOverlay = element.classList.contains('fixed') && 
                                 element.classList.contains('inset-0') && 
                                 isHighZIndex;
          
          // Excluir cualquier elemento con atributos de Radix Dialog
          const hasRadixDialogAttr = element.hasAttribute('data-radix-dialog-overlay') ||
                                     element.hasAttribute('data-radix-dialog-content') ||
                                     element.hasAttribute('data-radix-portal');
          
          // Excluir elementos dentro de portales o modales
          const isInModal = element.closest('[data-radix-dialog-overlay]') !== null ||
                            element.closest('[data-radix-dialog-content]') !== null ||
                            element.closest('[data-radix-portal]') !== null;
          
          return isFixedOverlay || hasRadixDialogAttr || isInModal;
        }
      });
      
      // Reabrir el modal si estaba abierto
      if (wasOpen) {
        await new Promise(resolve => setTimeout(resolve, 100));
        onOpenChange(true);
        // Restaurar estado preservado
        setCategory(preservedCategory);
        setAudioRecording(preservedAudio);
      }
      
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          setScreenshot({ blob, url });
          setIsCapturing(false);
        }
      }, 'image/png', 0.8);
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
  const uploadScreenshot = async (blob) => {
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
  const uploadAudio = async (blob) => {
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
  const formatRecordingTime = (seconds) => {
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

      // Capturar contexto (usar la función memoizada)
      const context = captureContext();

      // Crear reporte usando la API
      await createErrorReport({
        userId: user?.id || null,
        category: category,
        description: description.trim(),
        screenshotUrl: screenshotUrl,
        audioUrl: audioUrl,
        context: context,
      });

      toast.success('✅ Reporte enviado correctamente. ¡Gracias por tu ayuda!');
      
      // Limpiar formulario
      setCategory('');
      setDescription('');
      setScreenshot(null);
      setAudioRecording(null);
      setRecordingTime(0);
      onOpenChange(false);
    } catch (error) {
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
  const isTemporaryCloseRef = useRef(false);

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
        setDescription(initialError?.message || String(initialError) || '');
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
    const handleOpenReport = (event) => {
      if (event.detail?.error) {
        setCategory(event.detail.category || 'algo_no_funciona');
        setDescription(event.detail.error?.message || '');
      } else if (event.detail?.category) {
        setCategory(event.detail.category);
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

    window.dispatchEvent(new CustomEvent('report-modal-opened'));

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        return;
      }
      
      const target = e.target;
      if (target && (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable
      )) {
        return;
      }

      e.stopImmediatePropagation();
      e.stopPropagation();
      e.preventDefault();
    };

    window.addEventListener('keydown', handleKeyDown, { capture: true, passive: false });
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
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
    };
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange} modal={true}>
      <DialogPortal>
        <DialogOverlay className="!z-[9997]" />
        <DialogPrimitive.Content className={`fixed left-[50%] top-[50%] !z-[9998] grid w-full translate-x-[-50%] translate-y-[-50%] gap-4 border border-[var(--color-border-strong)] bg-[var(--color-surface)] p-6 shadow-[0_8px_24px_rgba(0,0,0,0.16)] duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] rounded-[var(--radius-modal)] max-w-2xl max-h-[90vh] overflow-y-auto ${componentStyles.modal.sizeLg}`}>
        <DialogHeader>
          <DialogTitle>Reportar problema o sugerencia</DialogTitle>
          <DialogDescription>
            Ayúdanos a mejorar la aplicación. Describe el problema o tu sugerencia y, si quieres, incluye una captura de pantalla.
          </DialogDescription>
        </DialogHeader>

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
                  onSave={(edited) => {
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
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
            className={componentStyles.buttons.outline}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !category || !description.trim()}
            className={`${componentStyles.buttons.primary} gap-2`}
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
        </DialogFooter>
        <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
          <X className="h-5 w-5" />
          <span className="sr-only">Close</span>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  );
}

