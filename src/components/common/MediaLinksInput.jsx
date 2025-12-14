import React, { useState, useEffect, useRef } from "react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Eye, AlertCircle, Upload, HelpCircle, FileText, Image, Music, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { MediaIcon, getMediaLabel } from "./MediaEmbed";
import { isValidUrl, extractUrlsFromText, normalizeMediaLinks } from "../utils/media";
import { componentStyles } from "@/design/componentStyles";
import { cn } from "@/lib/utils";
import { uploadFile, getAcceptedMimeTypes, detectFileType, ACCEPTED_FILE_TYPES } from "@/lib/storageUpload";
import { remoteDataAPI } from "@/api/remoteDataAPI";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const MAX_LINKS = 10;

/**
 * Hook para obtener el título de una URL
 * Usa un proxy CORS para evitar problemas de CORS
 */
/**
 * Extrae el ID del archivo de una URL de Google Drive
 */
function extractGoogleDriveId(url) {
  // Formato: drive.google.com/file/d/{id}
  const fileMatch = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (fileMatch) return fileMatch[1];

  // Formato: drive.google.com/open?id={id}
  const openMatch = url.match(/drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/);
  if (openMatch) return openMatch[1];

  // Formato: drive.google.com/uc?id={id}
  const ucMatch = url.match(/drive\.google\.com\/uc\?id=([a-zA-Z0-9_-]+)/);
  if (ucMatch) return ucMatch[1];

  return null;
}

/**
 * Fetch con timeout personalizado y manejo silencioso de errores
 */
function fetchWithTimeout(url, options = {}, timeout = 6000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  return fetch(url, { ...options, signal: controller.signal })
    .finally(() => clearTimeout(timeoutId))
    .catch(error => {
      // Silenciar todos los errores (timeout, CORS, QUIC, etc.)
      // No lanzar el error, simplemente retornar null
      if (error.name === 'AbortError' ||
        error.message?.includes('timeout') ||
        error.message?.includes('QUIC') ||
        error.message?.includes('CORS') ||
        error.message?.includes('Failed to fetch')) {
        return null;
      }
      // Para otros errores, también silenciar
      return null;
    });
}

function usePageTitle(url) {
  const [title, setTitle] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!url || !isValidUrl(url)) {
      setTitle(null);
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    // Para SoundCloud, YouTube, Vimeo: no intentar obtener título (no es necesario)
    // El embed funciona sin título y evita problemas de CORS
    if (url.includes('soundcloud.com') ||
      url.includes('youtube.com') ||
      url.includes('youtu.be') ||
      url.includes('vimeo.com')) {
      setTitle(null);
      setIsLoading(false);
      return;
    }

    // Para Google Drive, intentar extraer el ID y usar un nombre más descriptivo
    if (url.includes('drive.google.com')) {
      const driveId = extractGoogleDriveId(url);
      if (driveId) {
        // Usar un nombre descriptivo basado en el ID
        setTitle(`Archivo de Google Drive (${driveId.substring(0, 8)}...)`);
        setIsLoading(false);

        // Intentar obtener el título real en segundo plano (sin bloquear)
        // pero no mostrar loading mientras tanto
        const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
        fetchWithTimeout(proxyUrl, {}, 6000)
          .then(res => {
            if (cancelled) return null;
            if (!res || !res.ok) return null;
            return res.json();
          })
          .then(data => {
            if (!data) return;
            if (cancelled) return;
            if (data.contents) {
              const parser = new DOMParser();
              const doc = parser.parseFromString(data.contents, 'text/html');

              let pageTitle = doc.querySelector('title')?.textContent?.trim() || null;

              if (!pageTitle) {
                pageTitle = doc.querySelector('meta[property="og:title"]')?.getAttribute('content')?.trim() || null;
              }

              if (!pageTitle) {
                const driveTitle = doc.querySelector('[data-title]')?.getAttribute('data-title') ||
                  doc.querySelector('.docs-title-input')?.value ||
                  doc.querySelector('title')?.textContent?.split(' - ')[0]?.trim();
                if (driveTitle) {
                  pageTitle = driveTitle;
                }
              }

              if (pageTitle) {
                pageTitle = pageTitle
                  .replace(/\s*-\s*Google\s+Docs\s*/i, '')
                  .replace(/\s*-\s*Google\s+Drive\s*/i, '')
                  .trim();

                if (pageTitle && pageTitle.length > 0) {
                  setTitle(pageTitle);
                }
              }
            }
          })
          .catch((err) => {
            // Silenciar errores para Google Drive ya que tenemos un fallback
            console.warn('Google Drive title fetch failed (non-critical):', err.message);
          });
      }

      return () => {
        cancelled = true;
      };
    }

    setIsLoading(true);
    setTitle(null);

    // Intentar obtener el título usando un proxy CORS (solo para URLs que no son de servicios conocidos)
    // Usamos allorigins.win como proxy público (gratuito, sin API key)
    // Si falla, simplemente no mostramos título (no es crítico)
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;

    fetchWithTimeout(proxyUrl, {}, 6000)
      .then(res => {
        if (cancelled) return null;
        if (!res || !res.ok) return null;
        return res.json();
      })
      .then(data => {
        if (!data || cancelled) return;
        if (data.contents) {
          // Parsear el HTML para obtener el título
          const parser = new DOMParser();
          const doc = parser.parseFromString(data.contents, 'text/html');

          // Intentar múltiples formas de obtener el título
          let pageTitle = doc.querySelector('title')?.textContent?.trim() || null;

          // Si no hay título en <title>, buscar en meta tags
          if (!pageTitle) {
            pageTitle = doc.querySelector('meta[property="og:title"]')?.getAttribute('content')?.trim() || null;
          }

          // Limpiar el título (eliminar " - Google Docs" u otros sufijos comunes)
          if (pageTitle) {
            pageTitle = pageTitle
              .replace(/\s*-\s*Google\s+Docs\s*/i, '')
              .replace(/\s*-\s*Google\s+Drive\s*/i, '')
              .trim();

            // Solo establecer si tiene contenido real (no solo espacios)
            if (pageTitle && pageTitle.length > 0) {
              setTitle(pageTitle);
            }
          }
        }
      })
      .catch((error) => {
        // Silenciar completamente los errores de CORS, timeout, etc.
        // No loggear ni mostrar errores - simplemente no mostrar título
        if (!cancelled) {
          setTitle(null);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [url]);

  return { title, isLoading };
}

/**
 * Componente individual para cada enlace multimedia
 * Permite usar hooks dentro del map
 */
function MediaLinkItem({ url, index, isValid, label, onPreview, onRemove }) {
  const { title, isLoading } = usePageTitle(url);

  return (
    <div
      className={`flex items-start gap-2 p-2 rounded-lg border transition-colors w-full ${isValid
        ? 'bg-[var(--color-surface-elevated)] border-[var(--color-border-default)] hover:border-[var(--color-border-strong)]'
        : 'bg-[var(--color-danger)]/10 border-[var(--color-danger)]/20'
        }`}
    >
      <MediaIcon url={url} className="w-4 h-4 shrink-0 text-[var(--color-text-secondary)] mt-0.5" />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 min-w-0 mb-1 flex-wrap">
          <Badge variant="outline" className="text-xs shrink-0">
            {label}
          </Badge>
          {!isValid && (
            <span className="text-xs text-[var(--color-danger)] font-medium shrink-0">Inválido</span>
          )}
        </div>
        {title ? (
          <>
            <p className="text-xs font-medium text-[var(--color-text-primary)] break-words mt-0.5" title={title}>
              {title}
            </p>
            <p className="text-xs text-[var(--color-text-muted)] break-all mt-0.5" title={url}>
              {url}
            </p>
          </>
        ) : (
          <p className="text-xs text-[var(--color-text-primary)] break-all mt-0.5" title={url}>
            {isLoading ? 'Cargando título...' : url}
          </p>
        )}
      </div>

      <div className="flex gap-1 shrink-0 mt-0.5">
        {isValid && onPreview && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onPreview(index)}
            className="h-8 w-8 p-0 shrink-0"
            aria-label="Ver preview"
          >
            <Eye className="w-4 h-4" />
          </Button>
        )}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onRemove(index)}
          className="h-8 w-8 p-0 shrink-0 text-[var(--color-danger)] hover:text-[var(--color-danger)]/80 hover:bg-[var(--color-danger)]/10"
          aria-label="Eliminar enlace"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

/**
 * Componente para entrada y gestión de enlaces multimedia
 * Valida, normaliza y muestra preview de enlaces
 * Opcionalmente incluye funcionalidad de subida de video
 */
export default function MediaLinksInput({
  value = [],
  onChange,
  onPreview,
  // File upload props (optional)
  showFileUpload = false,
  videoFile = null,
  onVideoFileChange = null,
  uploadingVideo = false,
  // DB Registration props (optional)
  onAssetRegistered = null,
  originType = null,
  originId = null,
  originLabel = null,

  // Other props
  disabled = false,
  videoId = "video-upload"
}) {
  const videoFileInputRef = useRef(null);
  const fileInputRef = useRef(null);
  const dropzoneRef = useRef(null);
  const [inputText, setInputText] = useState('');
  const [errors, setErrors] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadingFileName, setUploadingFileName] = useState('');

  // File type icon mapping
  const getFileTypeIcon = (type) => {
    switch (type) {
      case 'pdf': return FileText;
      case 'image': return Image;
      case 'audio': return Music;
      default: return Upload;
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  // Handle drop for video files (legacy)
  const handleVideoDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (disabled || uploadingVideo || !onVideoFileChange) return;

    const files = Array.from(e.dataTransfer.files);
    const droppedVideoFile = files.find(file => file.type.startsWith('video/'));

    if (droppedVideoFile) {
      onVideoFileChange(droppedVideoFile);
    }
  };

  // Handle drop for static files (PDF/Image/Audio)
  const handleFileDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (disabled || uploading) return;

    const files = Array.from(e.dataTransfer.files);
    await handleFileUpload(files);
  };

  // Handle file selection from input
  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      await handleFileUpload(files);
    }
    // Reset input to allow re-selecting same file
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Upload files to Supabase Storage
  const handleFileUpload = async (files) => {
    if (files.length === 0) return;

    // Filter to accepted types only
    const validFiles = files.filter(file => {
      const type = detectFileType(file);
      return type !== 'unknown';
    });

    if (validFiles.length === 0) {
      toast.error('Tipo de archivo no soportado. Usa PDF, imágenes o audio.');
      return;
    }

    // Check link limit
    if (value.length + validFiles.length > MAX_LINKS) {
      toast.error(`Máximo ${MAX_LINKS} enlaces permitidos`);
      return;
    }

    setUploading(true);
    const newUrls = [];

    for (const file of validFiles) {
      setUploadingFileName(file.name);

      const result = await uploadFile(file, 'ejercicios');

      if (result.success && result.url) {
        // Register in DB if needed
        if (onAssetRegistered && originType && originId) {
          try {
            // Map simplified types to DB types
            const type = detectFileType(file);
            const assetTypeMap = { 'image': 'image', 'video': 'video', 'audio': 'audio', 'pdf': 'pdf' };
            const fileType = assetTypeMap[type] || 'other';

            const newAsset = await remoteDataAPI.mediaAssets.create({
              url: result.url,
              name: file.name,
              fileType: fileType,
              state: 'uploaded',
              storagePath: result.path,
              originType: originType,
              originId: originId,
              originLabel: originLabel,
              originContext: {}
            });
            onAssetRegistered(newAsset);
            toast.success("Archivo subido y registrado");
          } catch (e) {
            console.error("DB registration failed", e);
            // Non-blocking error, user still gets the URL
            toast.success(`${file.name} subido correctamente (falló el registro en DB)`);
          }
        } else {
          toast.success(`${file.name} subido correctamente`);
        }
        newUrls.push(result.url);
      } else {
        toast.error(result.error || `Error al subir ${file.name}`);
      }
    }

    setUploading(false);
    setUploadingFileName('');

    if (newUrls.length > 0) {
      const combined = [...value, ...newUrls];
      const normalized = normalizeMediaLinks(combined).slice(0, MAX_LINKS);
      onChange(normalized);
    }
  };

  const isDisabled = disabled || uploadingVideo || uploading;

  const handleParse = () => {
    const urls = extractUrlsFromText(inputText);
    setErrors([]);

    if (urls.length === 0) {
      setErrors(['No se encontraron URLs válidas']);
      return;
    }

    if (urls.length > MAX_LINKS) {
      setErrors([`Máximo ${MAX_LINKS} enlaces permitidos`]);
      return;
    }

    // Combinar con existentes y deduplicar
    const combined = [...value, ...urls];
    const normalized = normalizeMediaLinks(combined).slice(0, MAX_LINKS);

    onChange(normalized);
    setInputText('');
    setErrors([]);
  };

  const handleRemove = (index) => {
    const updated = value.filter((_, i) => i !== index);
    onChange(updated);
  };

  const handlePreview = (index) => {
    if (onPreview) {
      onPreview(index);
    }
  };

  return (
    <div className="space-y-4">
      {/* File Upload Section (optional) */}
      {showFileUpload && onVideoFileChange && (
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
            onDrop={handleVideoDrop}
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
              onChange={(e) => onVideoFileChange(e.target.files?.[0] || null)}
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
                    onVideoFileChange(null);
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
      )}

      {/* File Upload Section for PDF/Image/Audio */}
      {showFileUpload && (
        <section className="space-y-2">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-medium text-[var(--color-text-primary)]">
              Subir archivos (PDF, Imagen, Audio)
            </h3>
          </div>
          <p className="text-xs text-[var(--color-text-secondary)] break-words">
            Arrastra archivos aquí o haz clic para seleccionar. Se subirán a la nube.
          </p>
          <div
            onDragOver={handleDragOver}
            onDrop={handleFileDrop}
            onClick={() => !isDisabled && fileInputRef.current?.click()}
            className={cn(
              "border-2 border-dashed rounded-xl p-6 text-center transition-colors cursor-pointer",
              uploading
                ? "border-[var(--color-primary)] bg-[var(--color-primary)]/10"
                : "border-[var(--color-border-default)] bg-[var(--color-surface-muted)]/50 hover:border-[var(--color-primary)] hover:bg-[var(--color-primary)]/5",
              isDisabled && "opacity-50 pointer-events-none cursor-not-allowed"
            )}
          >
            {uploading ? (
              <>
                <Loader2 className="w-12 h-12 mx-auto mb-3 text-[var(--color-primary)] animate-spin" />
                <p className="text-sm font-medium text-[var(--color-text-primary)] mb-1">
                  Subiendo {uploadingFileName}...
                </p>
              </>
            ) : (
              <>
                <div className="flex items-center justify-center gap-2 mb-3">
                  <FileText className="w-8 h-8 text-[var(--color-text-secondary)]" />
                  <Image className="w-8 h-8 text-[var(--color-text-secondary)]" />
                  <Music className="w-8 h-8 text-[var(--color-text-secondary)]" />
                </div>
                <p className="text-sm font-medium text-[var(--color-text-primary)] mb-1">
                  Arrastra archivos aquí o haz clic para seleccionar
                </p>
                <p className="text-xs text-[var(--color-text-secondary)] mb-4">
                  PDF, imágenes (JPG, PNG, GIF, WebP) o audio (MP3, WAV, OGG) - máx. 10MB
                </p>
              </>
            )}
            <Input
              ref={fileInputRef}
              type="file"
              accept={getAcceptedMimeTypes()}
              onChange={handleFileSelect}
              className="hidden"
              disabled={isDisabled}
              multiple
            />
            {!uploading && (
              <div className="flex items-center justify-center gap-2" onClick={(e) => e.stopPropagation()}>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                  disabled={isDisabled}
                  className={cn("text-xs h-9", componentStyles.buttons.outline)}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Seleccionar archivos
                </Button>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Media Links Input Section */}
      <div>
        <Label htmlFor="mediaLinks">Enlaces multimedia (opcional)</Label>
        <Textarea
          id="mediaLinks"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={`https://ejemplo.com/imagen.jpg
https://youtu.be/VIDEO
https://soundcloud.com/artist/track
https://drive.google.com/file/d/ID/view?usp=sharing&format=mp3`}
          rows={4}
          className={`resize-none font-mono text-xs ${componentStyles.controls.inputDefault}`}
          autoComplete="off"
          data-form-type="other"
        />
        <p className="text-xs text-[var(--color-text-secondary)] mt-1 break-words">
          Pega una URL por línea. Soporta imágenes, audio, vídeo, PDF, YouTube, Vimeo, SoundCloud y Google Drive.
        </p>
        {errors.length > 0 && (
          <div className="flex items-center gap-2 mt-2 text-xs text-[var(--color-danger)]">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errors.join(', ')}</span>
          </div>
        )}
        {inputText.trim() && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleParse}
            className="mt-2"
            disabled={value.length >= MAX_LINKS}
          >
            Agregar enlaces ({value.length}/{MAX_LINKS})
          </Button>
        )}
      </div>

      {value.length > 0 && (
        <div className="border rounded-lg p-3 bg-[var(--color-surface-muted)] space-y-2 w-full min-w-0 max-w-full overflow-hidden">
          <p className="text-xs font-semibold text-[var(--color-text-primary)]">
            Enlaces agregados ({value.length}/{MAX_LINKS}):
          </p>
          <div className="space-y-2 w-full min-w-0 max-w-full">
            {value.map((url, idx) => {
              if (!url || typeof url !== 'string') {
                return null;
              }

              const trimmedUrl = url.trim();
              if (!trimmedUrl) {
                return null;
              }

              const isValid = isValidUrl(trimmedUrl);
              const label = getMediaLabel(trimmedUrl);

              return (
                <MediaLinkItem
                  key={idx}
                  url={trimmedUrl}
                  index={idx}
                  isValid={isValid}
                  label={label}
                  onPreview={handlePreview}
                  onRemove={handleRemove}
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}