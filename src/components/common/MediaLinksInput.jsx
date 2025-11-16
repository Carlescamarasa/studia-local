import React, { useState } from "react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X, Eye, AlertCircle } from "lucide-react";
import { MediaIcon, getMediaLabel } from "./MediaEmbed";
import { isValidUrl, extractUrlsFromText, normalizeMediaLinks } from "../utils/media";

const MAX_LINKS = 10;

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
          className="resize-none font-mono text-xs"
        />
        <p className="text-xs text-ui/80 mt-1">
          Pega una URL por línea. Soporta imágenes, audio, vídeo, PDF, YouTube, Vimeo, SoundCloud y Google Drive.
        </p>
        {errors.length > 0 && (
          <div className="flex items-center gap-2 mt-2 text-xs text-red-600">
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
        <div className="border rounded-lg p-3 bg-[var(--color-surface-muted)] space-y-2">
          <p className="text-xs font-semibold text-ui">
            Enlaces agregados ({value.length}/{MAX_LINKS}):
          </p>
          <div className="space-y-2">
            {value.map((url, idx) => {
              const isValid = isValidUrl(url);
              const label = getMediaLabel(url);
              
              return (
                <div 
                  key={idx} 
                  className={`flex items-center gap-2 p-2 rounded-lg border transition-colors ${
                    isValid 
                      ? 'bg-white border-[var(--color-border-default)] hover:border-[var(--color-border-strong)]' 
                      : 'bg-red-50 border-red-200'
                  }`}
                >
                  <MediaIcon url={url} className="w-4 h-4 shrink-0 text-ui/80" />
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {label}
                      </Badge>
                      {!isValid && (
                        <span className="text-xs text-red-600 font-medium">Inválido</span>
                      )}
                    </div>
                    <p className="text-xs text-ui/80 truncate mt-0.5">{url}</p>
                  </div>
                  
                  <div className="flex gap-1 shrink-0">
                    {isValid && onPreview && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handlePreview(idx)}
                        className="h-8 w-8 p-0"
                        aria-label="Ver preview"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemove(idx)}
                      className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                      aria-label="Eliminar enlace"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}