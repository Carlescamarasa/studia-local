import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye, Play } from "lucide-react";
import { MediaIcon, getMediaLabel } from "./MediaEmbed";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { componentStyles } from "@/design/componentStyles";

/**
 * Componente que muestra badges/chips de enlaces multimedia
 * Versión mejorada con preview y mejor UI
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
    <TooltipProvider>
      <div className="flex items-center gap-2 flex-wrap">
        {displayLinks.map((url, idx) => {
          const label = getMediaLabel(url);
          
          return (
            <Tooltip key={idx}>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onMediaClick?.(idx)}
                  className={`h-8 gap-1.5 text-xs ${componentStyles.buttons.outline}`}
                >
                  <MediaIcon url={url} className="w-3.5 h-3.5" />
                  <span>{label}</span>
                  <Play className="w-3 h-3 text-[var(--color-text-secondary)]" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs max-w-xs truncate">{url}</p>
              </TooltipContent>
            </Tooltip>
          );
        })}
        
        {hasMore && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onMediaClick?.(0)}
            className={`h-8 gap-1 text-xs ${componentStyles.buttons.outline} text-[var(--color-info)] hover:text-[var(--color-info)]/80`}
          >
            <Eye className="w-3.5 h-3.5" />
            +{normalizedLinks.length - maxDisplay} más
          </Button>
        )}
      </div>
    </TooltipProvider>
  );
}