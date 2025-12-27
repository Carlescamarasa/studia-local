import React from "react";
import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";
import { MediaIcon, getMediaLabel } from "./MediaEmbed";
import { componentStyles } from "@/design/componentStyles";

/**
 * Componente que muestra badges/chips de enlaces multimedia
 * Versión simplificada sin tooltips
 */
export default function MediaLinksBadges({ mediaLinks = [], onMediaClick, compact = false, maxDisplay = 3 }) {
  if (!mediaLinks || mediaLinks.length === 0) return null;

  // Normalizar mediaLinks: convertir objetos {url, kind} a strings
  const normalizedLinks = mediaLinks.map(link => {
    if (typeof link === 'string') return link;
    if (link && typeof link === 'object' && link.url) return link.url;
    return '';
  }).filter(Boolean);

  const displayLinks = compact ? normalizedLinks.slice(0, maxDisplay) : normalizedLinks;
  const hasMore = compact && normalizedLinks.length > maxDisplay;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {displayLinks.map((url, idx) => {
        const label = getMediaLabel(url);

        return (
          <Button
            key={idx}
            variant="outline"
            size="sm"
            onClick={() => {
              if (onMediaClick) {
                onMediaClick(idx);
              } else {
                window.open(url, '_blank', 'noopener,noreferrer');
              }
            }}
            className={`h-8 w-8 p-0 ${componentStyles.buttons.outline}`}
            aria-label={`Abrir ${label}`}
          >
            <MediaIcon url={url} className="w-4 h-4" />
            <span className="sr-only">{label}</span>
          </Button>
        );
      })}

      {hasMore && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => onMediaClick?.(0)}
          className={`h-8 w-8 p-0 ${componentStyles.buttons.outline} text-[var(--color-info)] hover:text-[var(--color-info)]/80`}
          aria-label={`Ver ${normalizedLinks.length - maxDisplay} enlaces más`}
        >
          <Eye className="w-4 h-4" />
          <span className="sr-only">+{normalizedLinks.length - maxDisplay} más</span>
        </Button>
      )}
    </div>
  );
}