import React, { useState, useEffect, useRef } from "react";
import { Label } from "@/features/shared/components/ui/label";
import { Textarea } from "@/features/shared/components/ui/textarea";
import { Badge } from "@/features/shared/components/ds/Badge";
import { Button } from "@/features/shared/components/ui/button";
import { Input } from "@/features/shared/components/ui/input";
import { X, Eye, AlertCircle, Upload, HelpCircle, FileText, Image, Music, Loader2, Link as LinkIcon, Video } from "lucide-react";
import { toast } from "sonner";
import { MediaIcon, getMediaLabel } from "./MediaEmbed";
import { isValidUrl, extractUrlsFromText, normalizeMediaLinks } from "@/features/shared/utils/media";
import { componentStyles } from "@/design/componentStyles";
import { cn } from "@/lib/utils";
import { uploadFile, getAcceptedMimeTypes, detectFileType, ACCEPTED_FILE_TYPES } from "@/lib/storageUpload";
import { remoteDataAPI } from "@/api/remoteDataAPI";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/features/shared/components/ui/tooltip";

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

import { ArrowUp, ArrowDown, Pencil, Check, GripVertical, ExternalLink } from 'lucide-react';


/**
 * Componente individual para cada enlace multimedia
 * Permite usar hooks dentro del map
 */
function MediaLinkItem({
  url,
  name,
  index,
  isValid,
  label,
  totalItems,
  onPreview,
  onRemove,
  onMove,
  onRename,
  isVideoFile = false,
  showMoveControls = true
}) {
  const { title, isLoading } = usePageTitle(!isVideoFile ? url : null); // Don't fetch title for video files
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(name || '');

  // Update local edited name when prop changes
  useEffect(() => {
    // If we have a custom name, use it. 
    // If not, and we have a fetched title, use that as default (but don't save it yet)
    // If not, use empty string
    if (name) {
      setEditedName(name);
    } else if (title) {
      // Only set default if not already set, to avoid overwriting user edits
      // But here we want to show it as placeholder or initial value
    }
  }, [name, title]);

  // Initialize with title if no custom name exists
  useEffect(() => {
    if (!name && title) {
      // We could auto-set the name, but better to keep it null until user edits
      // Just let the display prioritize: name > title > url
    }
  }, [title, name]);

  const handleSaveRename = () => {
    if (onRename) {
      onRename(index, editedName.trim() || null);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSaveRename();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setEditedName(name || '');
    }
  };

  const displayName = name || title;

  return (
    <div
      className={`flex items-start gap-2 p-2 rounded-lg border transition-colors w-full group overflow-hidden min-w-0 ${isValid
        ? 'bg-[var(--color-surface)] border-[var(--color-border-default)] hover:border-[var(--color-border-strong)]'
        : 'bg-[var(--color-danger)]/5 border-[var(--color-danger)]/20'
        }`}
    >
      {/* Reorder Controls */}
      {showMoveControls ? (
        <div className="flex flex-col gap-0.5 mt-0.5 opacity-30 group-hover:opacity-100 transition-opacity shrink-0">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onMove(index, -1)}
            disabled={index === 0}
            className="h-4 w-4 p-0 hover:bg-[var(--color-surface-hover)] disabled:opacity-10"
            aria-label="Mover arriba"
          >
            <ArrowUp className="w-2.5 h-2.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onMove(index, 1)}
            disabled={index === totalItems - 1}
            className="h-4 w-4 p-0 hover:bg-[var(--color-surface-hover)] disabled:opacity-10"
            aria-label="Mover abajo"
          >
            <ArrowDown className="w-2.5 h-2.5" />
          </Button>
        </div>
      ) : (
        <div className="w-4 shrink-0 flex items-center justify-center mt-2 opacity-30">
          {/* Placeholder or dedicated icon for pinned items */}
        </div>
      )}

      {isVideoFile ? (
        <div className="mt-1.5 shrink-0 bg-[var(--color-danger)]/10 rounded p-0.5 text-[var(--color-danger)]">
          <Video className="w-3.5 h-3.5" />
        </div>
      ) : (
        <MediaIcon url={url} className="w-4 h-4 shrink-0 text-[var(--color-text-secondary)] mt-1.5" />
      )}


      <div className="flex-1 min-w-0 overflow-hidden">
        <div className="flex items-center gap-2 min-w-0 mb-0.5 flex-wrap">
          {isVideoFile && (
            <Badge variant="outline" className="text-[10px] h-4 px-1 py-0 border-[var(--color-danger)]/30 text-[var(--color-danger)] bg-[var(--color-danger)]/10 shrink-0">
              Vídeo
            </Badge>
          )}
          {!isVideoFile && (
            <Badge variant="outline" className="text-[10px] h-4 px-1 py-0 shrink-0 text-[var(--color-text-secondary)] font-normal">
              {label}
            </Badge>
          )}

          {!isValid && (
            <span className="text-[10px] text-[var(--color-danger)] font-medium shrink-0">Inválido</span>
          )}
        </div>

        {isEditing ? (
          <div className="flex items-center gap-2 mt-0.5">
            <Input
              value={editedName}
              onChange={(e) => setEditedName(e.target.value)}
              onKeyDown={handleKeyDown}
              className="h-6 text-xs bg-[var(--color-surface)] px-1.5 py-0"
              placeholder={title || "Nombre del archivo"}
              autoFocus
            />
            <Button
              size="sm"
              variant="ghost"
              className="h-6 w-6 p-0 text-[var(--color-success)] hover:bg-[var(--color-success)]/10"
              onClick={handleSaveRename}
            >
              <Check className="w-3 h-3" />
            </Button>
          </div>
        ) : (
          <div className="group/title flex items-center gap-2">
            {displayName ? (
              <p className="text-sm text-[var(--color-text-primary)] truncate font-medium" title={displayName}>
                {displayName}
              </p>
            ) : (
              <p className="text-sm text-[var(--color-text-primary)] truncate" title={url}>
                {isLoading ? 'Cargando título...' : (isVideoFile ? 'Archivo de vídeo' : url)}
              </p>
            )}

            {!isVideoFile && onRename && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setEditedName(name || title || '');
                  setIsEditing(true);
                }}
                className="h-5 w-5 p-0 opacity-0 group-hover/title:opacity-100 transition-opacity text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-muted)]"
                aria-label="Renombrar"
              >
                <Pencil className="w-3 h-3" />
              </Button>
            )}
          </div>
        )}

        {/* Show URL/Filename subtly */}
        {!isEditing && (
          <p className="text-[10px] text-[var(--color-text-muted)] truncate opacity-80" title={url}>
            {url}
          </p>
        )}
      </div>

      <div className="flex gap-1 shrink-0 items-center self-center sm:self-start sm:mt-0.5">
        {isValid && !isVideoFile && (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center h-7 w-7 text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] hover:bg-[var(--color-surface-muted)] rounded-md transition-colors"
            title="Abrir en nueva pestaña"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        )}
        {isValid && onPreview && !isVideoFile && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onPreview(index)}
            className="h-7 w-7 p-0 shrink-0 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-muted)]"
            aria-label="Ver preview"
          >
            <Eye className="w-3.5 h-3.5" />
          </Button>
        )}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onRemove(index)}
          className="h-7 w-7 p-0 shrink-0 text-[var(--color-text-muted)] hover:text-[var(--color-danger)] hover:bg-[var(--color-danger)]/10"
          aria-label="Eliminar enlace"
        >
          <X className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}

export interface MediaItem {
  url: string;
  name?: string | null;
}

interface MediaLinksInputProps {
  value?: (string | MediaItem)[];
  onChange: (value: (string | MediaItem)[]) => void;
  onPreview?: (index: number) => void;
  showFileUpload?: boolean;
  videoFile?: File | null;
  onVideoFileChange?: ((file: File | null) => void) | null;
  uploadingVideo?: boolean;
  onAssetRegistered?: ((asset: any) => void) | null;
  originType?: string | null;
  originId?: string | null;
  originLabel?: string | null;
  disabled?: boolean;
  videoId?: string;
}

export default function MediaLinksInput({
  value = [],
  onChange,
  onPreview,
  showFileUpload = false,
  videoFile = null,
  onVideoFileChange = null,
  uploadingVideo = false,
  onAssetRegistered = null,
  originType = null,
  originId = null,
  originLabel = null,
  disabled = false,
  videoId = "video-upload"
}: MediaLinksInputProps) {
  const videoFileInputRef = useRef(null);
  const fileInputRef = useRef(null);
  const dropzoneRef = useRef(null);
  const [inputText, setInputText] = useState('');
  const [isDragActive, setIsDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingFileName, setUploadingFileName] = useState('');

  // Normalize internal value to always be objects
  const richItems = Array.isArray(value) ? value.map(item => {
    if (typeof item === 'string') return { url: item, name: null };
    return item;
  }) : [];

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setIsDragActive(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setIsDragActive(true);
  };

  const handleUnifiedDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (disabled || uploading || uploadingVideo) return;

    const files = Array.from(e.dataTransfer.files);

    // Check for video files if video upload is enabled
    // Only accept ONE video file drop if onVideoFileChange is provided
    const videoFiles = files.filter(file => file.type.startsWith('video/'));
    const otherFiles = files.filter(file => !file.type.startsWith('video/'));

    if (videoFiles.length > 0) {
      if (!onVideoFileChange) {
        toast.error("La subida de vídeo no está habilitada en este contexto.");
      } else if (videoFile) {
        toast.error("Ya existe un vídeo subido. Elimínalo para subir otro.");
      } else {
        // Take the first video
        onVideoFileChange(videoFiles[0]);
        if (videoFiles.length > 1) {
          toast.warning("Solo se puede subir un vídeo principal. Los otros vídeos han sido ignorados.");
        }
      }
    }

    // Process other files
    if (otherFiles.length > 0) {
      await handleFileUpload(otherFiles);
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
      // If we only dropped video files and they were handled, validation is implied.
      // But if we dropped unsupported types:
      const hasUnkown = files.some(file => detectFileType(file) === 'unknown' && !file.type.startsWith('video/'));
      if (hasUnkown) {
        toast.error('Tipo de archivo no soportado. Usa PDF, imágenes o audio.');
      }
      return;
    }

    // Check link limit
    // Current total = (videoFile ? 1 : 0) + richItems.length
    // New total = Current total + validFiles.length
    const currentTotal = (videoFile ? 1 : 0) + richItems.length;
    if (currentTotal + validFiles.length > MAX_LINKS) {
      toast.error(`Máximo ${MAX_LINKS} elementos permitidos en total.`);
      return;
    }

    setUploading(true);
    const newItems = [];

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
              originalName: file.name,
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
        // Use filename as default name
        newItems.push({ url: result.url, name: file.name });
      } else {
        toast.error(result.error || `Error al subir ${file.name}`);
      }
    }

    setUploading(false);
    setUploadingFileName('');

    if (newItems.length > 0) {
      // Add new items protecting objects
      const combined = [...richItems, ...newItems];
      // Normalize but preserve objects
      const normalized = normalizeMediaLinks(combined, true).slice(0, MAX_LINKS - (videoFile ? 1 : 0));
      onChange(normalized);
    }
  };

  const handleInputKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleParseInput();
    }
  };

  const handleParseInput = () => {
    if (!inputText.trim()) return;

    const urls = extractUrlsFromText(inputText);

    if (urls.length === 0) {
      // Maybe the user typed a title or something that is not a url? 
      // For now, strict URL requirement as per original requirement "Input de Texto: ... un campo para pegar URLs"
      toast.error('No se detectó una URL válida');
      return;
    }

    const currentTotal = (videoFile ? 1 : 0) + richItems.length;
    if (currentTotal + urls.length > MAX_LINKS) {
      toast.error(`Límite alcanzado (${MAX_LINKS} items máximo)`);
      return;
    }

    // Convert strings to objects
    const newItems = urls.map(u => ({ url: u, name: null }));

    // Combinar con existentes y deduplicar
    const combined = [...richItems, ...newItems];
    const normalized = normalizeMediaLinks(combined, true).slice(0, MAX_LINKS - (videoFile ? 1 : 0));

    onChange(normalized);
    setInputText('');
  };

  const handleRemoveItem = (index) => {
    // If video is present, indices might be shifted in the UI? 
    // No, we will manage two separate lists in the UI render but handle removal by knowing what we are removing.
    // However, if we unify the list visually, we should probably know the source.
    // Let's implement handles separately for clarity or check index.

    const updated = richItems.filter((_, i) => i !== index);
    onChange(updated);
  };

  const handleMove = (index, direction) => {
    if (index + direction < 0 || index + direction >= richItems.length) return;
    const newItems = [...richItems];
    [newItems[index], newItems[index + direction]] = [newItems[index + direction], newItems[index]];
    onChange(newItems);
  };

  const handleRename = (index, newName) => {
    const newItems = [...richItems];
    if (newItems[index]) {
      newItems[index] = { ...newItems[index], name: newName };
      onChange(newItems);
    }
  };

  const currentCount = (videoFile ? 1 : 0) + richItems.length;
  const isLimitReached = currentCount >= MAX_LINKS;

  // Unified items list for rendering
  // We want the Video file (if exists) to appear first or appropriately.
  // The 'value' links follow.

  return (
    <div className="space-y-4 w-full max-w-full overflow-hidden">
      {/* Unified Compact Dropzone Area */}
      <div
        ref={dropzoneRef}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleUnifiedDrop}
        className={cn(
          "relative rounded-xl border-2 border-dashed transition-all duration-200 p-6 flex flex-col items-center justify-center text-center gap-4 group",
          isDragActive ? "border-[var(--color-primary)] bg-[var(--color-primary-soft)]/30 scale-[1.01]" : "border-[var(--color-border-default)] bg-[var(--color-surface-muted)]/50 hover:bg-[var(--color-surface-muted)] hover:border-[var(--color-border-strong)]",
          (uploading || uploadingVideo) && "pointer-events-none opacity-80"
        )}
      >
        {/* Uploading Overlay State */}
        {(uploading || uploadingVideo) && (
          <div className="absolute inset-0 bg-[var(--color-surface)]/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center rounded-xl">
            <Loader2 className="w-8 h-8 text-[var(--color-primary)] animate-spin mb-2" />
            <p className="text-sm font-medium text-[var(--color-text-primary)]">
              {uploadingVideo ? "Subiendo vídeo..." : `Subiendo ${uploadingFileName}...`}
            </p>
          </div>
        )}

        {/* Iconography */}
        <div className="flex items-center justify-center gap-3 text-[var(--color-text-muted)] group-hover:text-[var(--color-text-secondary)] transition-colors pointer-events-none">
          <Upload className="w-8 h-8" />
        </div>

        {/* Instruction Text */}
        <div className="space-y-1 pointer-events-none">
          <h3 className="font-semibold text-[var(--color-text-primary)]">Arrastra archivos aquí</h3>
          <p className="text-xs text-[var(--color-text-secondary)]">
            Vídeo, Audio, Imágenes, PDF
          </p>
        </div>

        {/* URL Input Area (Visual Integration) */}
        <div className="w-full max-w-md relative z-20">
          <div className="flex shadow-sm rounded-lg overflow-hidden border border-[var(--color-border-default)] bg-[var(--color-surface)] focus-within:ring-2 focus-within:ring-[var(--color-primary)]/20 focus-within:border-[var(--color-primary)] transition-all">
            <div className="flex items-center justify-center w-10 bg-[var(--color-surface-muted)] border-r border-[var(--color-border-default)] text-[var(--color-text-secondary)]">
              <LinkIcon className="w-4 h-4" />
            </div>
            <input
              type="text"
              className="flex-1 px-3 py-2.5 text-sm outline-none bg-transparent text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)]"
              placeholder="O pega un enlace de YouTube, Drive, SoundCloud..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleInputKeyDown}
              disabled={isLimitReached && !inputText}
            />
            <button
              onClick={handleParseInput}
              disabled={!inputText.trim() || isLimitReached}
              className="px-4 py-1 text-xs font-bold uppercase tracking-wider text-[var(--color-primary)] hover:bg-[var(--color-primary-soft)] disabled:opacity-50 disabled:hover:bg-transparent transition-colors"
            >
              Añadir
            </button>
          </div>

          {/* Hidden file inputs for fallback clicking on the container background? 
                   Actually, standard UX is clicking a button to select files, dragging is alternate.
                   Let's add a small "or select files" button below input 
               */}
          <div className="mt-2 flex justify-center gap-2">
            <Button
              type="button"
              variant="link"
              size="sm"
              className="text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] h-auto p-0"
              onClick={() => fileInputRef.current?.click()}
            >
              Seleccionar archivos
            </Button>
            {onVideoFileChange && (
              <>
                <span className="text-[var(--color-text-muted)] text-xs">•</span>
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  className="text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] h-auto p-0"
                  onClick={() => videoFileInputRef.current?.click()}
                >
                  Seleccionar vídeo
                </Button>
              </>
            )}
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept={getAcceptedMimeTypes()}
          onChange={(e) => {
            if (e.target.files?.length) handleFileUpload(Array.from(e.target.files));
            e.target.value = '';
          }}
          className="hidden"
          multiple
        />

        <input
          ref={videoFileInputRef}
          type="file"
          accept="video/*"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file && onVideoFileChange) onVideoFileChange(file);
            e.target.value = '';
          }}
          className="hidden"
        />
      </div>

      {/* Unified List Items */}
      <div className="bg-[var(--color-surface-muted)]/50 rounded-xl border border-[var(--color-border-default)] overflow-hidden w-full max-w-full">
        {/* Header / Counter */}
        <div className="bg-[var(--color-surface-muted)] px-4 py-2 border-b border-[var(--color-border-default)] flex justify-between items-center text-xs">
          <span className="font-medium text-[var(--color-text-secondary)]">Recursos Adjuntos</span>
          <span className={`${isLimitReached ? 'text-[var(--color-primary)] font-bold' : 'text-[var(--color-text-muted)]'}`}>
            {currentCount}/{MAX_LINKS} items
          </span>
        </div>

        <div className="divide-y divide-[var(--color-border-default)]/50">
          {currentCount === 0 && (
            <div className="p-8 text-center text-[var(--color-text-muted)] text-sm italic">
              No hay recursos añadidos
            </div>
          )}

          {/* Video Item (Pinned at top) */}
          {videoFile && (
            <div className="px-3 py-2">
              <MediaLinkItem
                url={videoFile.name} // Display filename
                name={videoFile.name}
                isVideoFile={true}
                isValid={true}
                index={-1} // Special index
                totalItems={currentCount}
                showMoveControls={false}
                onRemove={() => onVideoFileChange(null)}
              />
            </div>
          )}

          {/* Link Items */}
          {richItems.map((item, index) => (
            <div key={index + item.url} className="px-3 py-1 first:pt-2 last:pb-2 overflow-hidden max-w-full">
              <MediaLinkItem
                {...item}
                index={index}
                totalItems={richItems.length}
                isValid={isValidUrl(item.url)}
                label={getMediaLabel(item.url)}
                onRemove={handleRemoveItem}
                onMove={handleMove}
                onPreview={onPreview}
                onRename={handleRename}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}