import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/auth/AuthProvider';
import { useLocation } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Camera, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import html2canvas from 'html2canvas';
import { componentStyles } from '@/design/componentStyles';
import { supabase } from '@/lib/supabaseClient';
import { createErrorReport } from '@/api/errorReportsAPI';

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
    try {
      const canvas = await html2canvas(document.body, {
        useCORS: true,
        logging: false,
        scale: 0.5, // Reducir tamaño para mejor rendimiento
      });
      
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

      // Capturar contexto (usar la función memoizada)
      const context = captureContext();

      // Crear reporte usando la API
      await createErrorReport({
        userId: user?.id || null,
        category: category,
        description: description.trim(),
        screenshotUrl: screenshotUrl,
        context: context,
      });

      toast.success('✅ Reporte enviado correctamente. ¡Gracias por tu ayuda!');
      
      // Limpiar formulario
      setCategory('');
      setDescription('');
      setScreenshot(null);
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

  // Limpiar y establecer valores iniciales cuando se abre/cierra el modal
  useEffect(() => {
    if (open) {
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
      // Al cerrar, limpiar todo
      setCategory('');
      setDescription('');
      setScreenshot(null);
    }
  }, [open, initialError, initialCategory]);

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg" className="max-h-[90vh] overflow-y-auto">
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
              <SelectContent>
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
              {screenshot && (
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
            
            {screenshot && (
              <div className="mt-2 border rounded-lg p-2 bg-[var(--color-surface-muted)]">
                <img
                  ref={screenshotPreviewRef}
                  src={screenshot.url}
                  alt="Vista previa de captura"
                  className="max-w-full h-auto rounded"
                />
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
      </DialogContent>
    </Dialog>
  );
}

