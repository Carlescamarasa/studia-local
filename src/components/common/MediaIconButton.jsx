import React from 'react';
import { MediaIcon, getMediaLabel } from './MediaEmbed';
import { resolveMedia, MediaKind } from '../utils/media';
import { Button } from '@/components/ui/button';
import { componentStyles } from '@/design/componentStyles';

/**
 * Componente que muestra un icono clickeable para un medio
 * Al hacer clic, se ejecuta onOpen con la URL
 */
export default function MediaIconButton({ url, onOpen, className = '' }) {
  const media = resolveMedia(url);
  const label = getMediaLabel(url);
  const Icon = () => <MediaIcon url={url} className="w-5 h-5" />;

  return (
    <Button
      type="button"
      variant="outline"
      onClick={() => onOpen(url)}
      className={`flex flex-col items-center justify-center gap-1.5 p-3 h-auto min-h-[80px] w-[100px] sm:w-[120px] border border-[var(--color-border-default)] hover:border-[var(--color-border-strong)] hover:bg-[var(--color-surface-elevated)] transition-colors ${className}`}
      aria-label={`Abrir ${label}`}
    >
      <div className="text-[var(--color-text-primary)]">
        <Icon />
      </div>
      <span className="text-xs text-center text-[var(--color-text-secondary)] line-clamp-2">
        {label}
      </span>
    </Button>
  );
}

