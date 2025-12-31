 
/* eslint-disable @typescript-eslint/no-unused-vars */
import React from 'react';
import { MediaIcon, getMediaLabel } from './MediaEmbed';
import { resolveMedia, MediaKind } from '@/features/shared/utils/media';
import { Button } from '@/features/shared/components/ui/button';
import { componentStyles } from '@/design/componentStyles';

interface MediaIconButtonProps {
  url: string;
  onOpen: (url: string) => void;
  className?: string;
}

/**
 * Componente que muestra un icono clickeable para un medio
 * Al hacer clic, se ejecuta onOpen con la URL
 */
export default function MediaIconButton({ url, onOpen, className = '' }: MediaIconButtonProps) {
  const media = resolveMedia(url);
  const label = getMediaLabel(url);
  const Icon = () => <MediaIcon url={url} className="w-5 h-5" />;

  return (
    <Button
      type="button"
      variant="outline"
      onClick={() => onOpen(url)}
      className={`flex items-center justify-center p-2 h-10 w-10 border border-[var(--color-border-default)] hover:border-[var(--color-border-strong)] hover:bg-[var(--color-surface-elevated)] transition-colors ${className}`}
      aria-label={`Abrir ${label}`}
    >
      <div className="text-[var(--color-text-primary)]">
        <Icon />
      </div>
      <span className="sr-only">{label}</span>
    </Button>
  );
}

