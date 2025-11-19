import React, { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Camera, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import html2canvas from 'html2canvas';
import { useAuth } from '@/auth/AuthProvider';
import { useLocation } from 'react-router-dom';
import { componentStyles } from '@/design/componentStyles';
import { createErrorReport } from '@/api/errorReportsAPI';

const CATEGORIES = [
  {
    value: 'algo_no_funciona',
    label: 'Algo no funciona',
    description: 'Errores técnicos, botones que no responden, páginas que no cargan',
  },
  {
    value: 'se_ve_mal',
    label: 'Se ve mal o confuso',
    description: 'Problemas de diseño, colores, tamaños, layout',
  },
  {
    value: 'no_encuentro',
    label: 'No encuentro lo que busco',
    description: 'Navegación, menús, organización',
  },
  {
    value: 'sugerencia',
    label: 'Me gustaría que hubiera...',
    description: 'Sugerencias de nuevas funcionalidades',
  },
  {
    value: 'otro',
    label: 'Otro',
    description: 'Cualquier otra cosa',
  },
];

/**
 * Captura los logs recientes de la consola
 */
function captureRecentLogs() {
  const logs = [];
  const originalLog = console.log;
  const originalError = console.error;
  const originalWarn = console.warn;
  
  // Esta función captura los logs que ya se han emitido
  // Para una implementación más completa, se podría usar un interceptor
  // Por ahora, retornamos información básica
  return {
    userAgent: navigator.userAgent,
    url: window.location.href,
    timestamp: new Date().toISOString(),
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight,
    },
  };
}

export default function ReportErrorModal({ open, onOpenChange, error = null, errorInfo = null }) {
  const { user } = useAuth();
  const location = useLocation();
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [screenshot, setScreenshot] = useState(null);
  const [screenshotPreview, setScreenshotPreview] = useState(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef(null);

  // Si se abre con un error, pre-llenar la descripción
  useEffect(() => {
    if (open && error) {
      setCategory('algo_no_funciona');
      setDescription(`Error: ${error?.message || error?.toString() || 'Error desconocido'}\n\n${errorInfo?.componentStack || ''}`);
    } else if (open) {
      // Limpiar formulario al abrir sin error
      setCategory('');
      setDescription('');
      setScreenshot(null);
      setScreenshotPreview(null);
    }
  }, [open, error, errorInfo]);

  const handleCaptureScreenshot = async () => {
    setIsCapturing(true);
    try {
      // Capturar toda la página
      const canvas = await html2canvas(document.body, {
        useCORS: true,
        logging: false,
        scale: 0.5, // Reducir tamaño para mejor rendimiento
      });
      
      // Convertir a blob
      canvas.toBlob((blob) => {
        if (blob) {
          setScreenshot(blob);
          setScreenshotPreview(URL.createObjectURL(blob));
          toast.success('Captura de pantalla realizada');
        }
      }, 'image/png', 0.8);
    } catch (err) {
      console.error('[ReportErrorModal] Error capturando pantalla:', err);
      toast.error('Error al capturar la pantalla');
    } finally {
      setIsCapturing(false);
    }
  };

  const handleRemoveScreenshot = () => {
    if (screenshotPreview) {
      URL.revokeObjectURL(screenshotPreview);
    }
    setScreenshot(null);
    setScreenshotPreview(null);
  };

  const handleSubmit = async () => {
    if (!category) {
      toast.error('Por favor, selecciona una categoría');
      return;
    }

    if (!description.trim()) {
      toast.error('Por favor, describe el problema o sugerencia');
      return;
    }

    setIsSubmitting(true);
    try {
      // Capturar contexto
      const context = {
        ...captureRecentLogs(),
        pathname: location.pathname,
        userId: user?.id,
        userEmail: user?.email,
        error: error ? {
          message: error?.message || error?.toString(),
          stack: error?.stack,
          name: error?.name,
        } : null,
        errorInfo: errorInfo ? {
          componentStack: errorInfo.componentStack,
        } : null,
      };

      // Crear reporte
      await createErrorReport({
        category,
        description: description.trim(),
        screenshot,
        context,
      });

      toast.success('✅ Reporte enviado. ¡Gracias por tu ayuda!');
      
      // Limpiar y cerrar
      setCategory('');
      setDescription('');
      setScreenshot(null);
      if (screenshotPreview) {
        URL.revokeObjectURL(screenshotPreview);
        setScreenshotPreview(null);
      }
      onOpenChange(false);
    } catch (err) {
      console.error('[ReportErrorModal] Error enviando reporte:', err);
      toast.error('Error al enviar el reporte. Inténtalo de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedCategory = CATEGORIES.find(c => c.value === category);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg" className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Reportar problema o sugerencia</DialogTitle>
          <DialogDescription>
            Tu feedback nos ayuda a mejorar la aplicación. Describe el problema o tu sugerencia.
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
                    <div className="flex flex-col">
                      <span className="font-medium">{cat.label}</span>
                      <span className="text-xs text-muted-foreground">{cat.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedCategory && (
              <p className="text-sm text-muted-foreground mt-1">
                {selectedCategory.description}
              </p>
            )}
          </div>

          {/* Descripción */}
          <div className="space-y-2">
            <Label htmlFor="description">Descripción *</Label>
            <Textarea
              id="description"
              placeholder="Describe el problema, lo que esperabas que pasara, y cualquier detalle que pueda ayudar..."
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
                disabled={isCapturing || isSubmitting}
                className={componentStyles.buttons.outline}
              >
                {isCapturing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Capturando...
                  </>
                ) : (
                  <>
                    <Camera className="w-4 h-4 mr-2" />
                    Capturar pantalla
                  </>
                )}
              </Button>
              {screenshotPreview && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleRemoveScreenshot}
                  className={componentStyles.buttons.outline}
                >
                  <X className="w-4 h-4 mr-2" />
                  Eliminar
                </Button>
              )}
            </div>
            {screenshotPreview && (
              <div className="mt-2 border rounded-lg p-2 bg-muted">
                <img
                  src={screenshotPreview}
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
            disabled={!category || !description.trim() || isSubmitting}
            className={componentStyles.buttons.primary}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
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

