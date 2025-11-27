import React, { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, X, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { componentStyles } from "@/design/componentStyles";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import MediaLinksInput from "./MediaLinksInput";

/**
 * Componente reutilizable que combina la subida de video y enlaces multimedia
 * 
 * @param {Object} props
 * @param {File|null} props.videoFile - Archivo de video seleccionado
 * @param {Function} props.setVideoFile - Función para actualizar el archivo de video
 * @param {Array<string>} props.mediaLinks - Array de URLs de medios
 * @param {Function} props.setMediaLinks - Función para actualizar los enlaces
 * @param {boolean} [props.uploadingVideo=false] - Indica si se está subiendo el video
 * @param {boolean} [props.disabled=false] - Deshabilita todos los inputs
 * @param {Function} [props.onPreview] - Callback para previsualizar medios (recibe index)
 * @param {string} [props.videoId] - ID único para el input de video (default: "video-upload")
 */
export default function MediaUploadSection({
  videoFile,
  setVideoFile,
  mediaLinks,
  setMediaLinks,
  uploadingVideo = false,
  disabled = false,
  onPreview,
  videoId = "video-upload",
}) {
  const videoFileInputRef = useRef(null);
  const dropzoneRef = useRef(null);

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (disabled || uploadingVideo) return;

    const files = Array.from(e.dataTransfer.files);
    const videoFile = files.find(file => file.type.startsWith('video/'));
    
    if (videoFile) {
      setVideoFile(videoFile);
    }
  };

  const isDisabled = disabled || uploadingVideo;

  return (
    <div className="space-y-4">
      {/* Input de subida de vídeo */}
      <section className="space-y-2">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium text-[var(--color-text-primary)]">
            Subir vídeo (opcional)
          </h3>
          <TooltipProvider delayDuration={300} skipDelayDuration={0}>
            <Tooltip delayDuration={300}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-5 w-5 p-0 shrink-0"
                  aria-label="Información sobre privacidad del vídeo"
                  disabled={isDisabled}
                >
                  <HelpCircle className="w-4 h-4 text-[var(--color-text-secondary)]" />
                </Button>
              </TooltipTrigger>
              <TooltipContent 
                side="right" 
                className="max-w-xs z-[130]"
                onPointerDownOutside={(e) => e.preventDefault()}
                sideOffset={8}
              >
                <p className="text-xs">
                  El vídeo se subirá a una cuenta de YouTube oculta. Solo tú y tu profesor podréis acceder mediante el enlace compartido.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <p className="text-xs text-[var(--color-text-secondary)] break-words">
          Por ejemplo, un fragmento de la sesión, una duda o tu progreso.
        </p>
        <div
          ref={dropzoneRef}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={() => !isDisabled && videoFileInputRef.current?.click()}
          className={cn(
            "border-2 border-dashed rounded-xl p-6 text-center transition-colors cursor-pointer",
            videoFile 
              ? "border-[var(--color-success)] bg-[var(--color-success)]/10" 
              : "border-[var(--color-border-default)] bg-[var(--color-surface-muted)]/50 hover:border-[var(--color-primary)] hover:bg-[var(--color-primary)]/5",
            isDisabled && "opacity-50 pointer-events-none cursor-not-allowed"
          )}
        >
          <Upload className="w-12 h-12 mx-auto mb-3 text-[var(--color-text-secondary)]" />
          <p className="text-sm font-medium text-[var(--color-text-primary)] mb-1">
            {videoFile ? videoFile.name : 'Arrastra un archivo aquí o haz clic para seleccionar'}
          </p>
          {videoFile && (
            <p className="text-xs text-[var(--color-text-secondary)] mb-4">
              {(videoFile.size / 1024 / 1024).toFixed(2)} MB
            </p>
          )}
          {!videoFile && (
            <p className="text-xs text-[var(--color-text-secondary)] mb-4">
              Formato: Video (máx. 500MB)
            </p>
          )}
          <Input
            ref={videoFileInputRef}
            id={videoId}
            type="file"
            accept="video/*"
            onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
            className="hidden"
            disabled={isDisabled}
          />
          <div className="flex items-center justify-center gap-2" onClick={(e) => e.stopPropagation()}>
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                videoFileInputRef.current?.click();
              }}
              disabled={isDisabled}
              className={cn("text-xs h-9", componentStyles.buttons.outline)}
            >
              <Upload className="w-4 h-4 mr-2" />
              {videoFile ? 'Cambiar archivo' : 'Seleccionar archivo'}
            </Button>
            {videoFile && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setVideoFile(null);
                  if (videoFileInputRef.current) videoFileInputRef.current.value = '';
                }}
                disabled={isDisabled}
                className="text-xs h-9"
              >
                <X className="w-4 h-4 mr-2" />
                Eliminar
              </Button>
            )}
          </div>
        </div>
      </section>

      {/* Input manual de mediaLinks (para URLs directas) */}
      <section className="space-y-1">
        <MediaLinksInput
          value={mediaLinks}
          onChange={setMediaLinks}
          onPreview={onPreview}
        />
      </section>
    </div>
  );
}

