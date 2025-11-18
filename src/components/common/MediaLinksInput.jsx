import React, { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X, Eye, AlertCircle } from "lucide-react";
import { MediaIcon, getMediaLabel } from "./MediaEmbed";
import { isValidUrl, extractUrlsFromText, normalizeMediaLinks } from "../utils/media";
import { componentStyles } from "@/design/componentStyles";

const MAX_LINKS = 10;

/**
 * Hook para obtener el título de una URL
 * Usa un proxy CORS para evitar problemas de CORS
 */
function usePageTitle(url) {
  const [title, setTitle] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!url || !isValidUrl(url)) {
      setTitle(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setTitle(null);
    
    // Intentar obtener el título usando un proxy CORS
    // Usamos allorigins.win como proxy público (gratuito, sin API key)
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
    
    fetch(proxyUrl)
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch');
        return res.json();
      })
      .then(data => {
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
          
          // Para Google Drive, el título a veces está en un elemento específico
          if (!pageTitle && url.includes('drive.google.com')) {
            const driveTitle = doc.querySelector('[data-title]')?.getAttribute('data-title') ||
                              doc.querySelector('.docs-title-input')?.value ||
                              doc.querySelector('title')?.textContent?.split(' - ')[0]?.trim();
            if (driveTitle) {
              pageTitle = driveTitle;
            }
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
        console.warn('No se pudo obtener el título de la URL:', url, error);
        setTitle(null);
      })
      .finally(() => {
        setIsLoading(false);
      });
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
      className={`flex items-start gap-2 p-2 rounded-lg border transition-colors w-full ${
        isValid 
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
 */
export default function MediaLinksInput({ value = [], onChange, onPreview }) {
  const [inputText, setInputText] = useState('');
  const [errors, setErrors] = useState([]);

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
    <div className="space-y-3">
      <div>
        <Label htmlFor="mediaLinks">Enlaces multimedia (opcional)</Label>
        <Textarea
          id="mediaLinks"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={`https://ejemplo.com/imagen.jpg
https://youtu.be/VIDEO
https://soundcloud.com/artist/track
https://drive.google.com/file/d/ID/view`}
          rows={4}
          className={`resize-none font-mono text-xs ${componentStyles.controls.inputDefault}`}
        />
        <p className="text-xs text-[var(--color-text-secondary)] mt-1">
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