import * as React from "react";
import { componentStyles } from "@/design/componentStyles";
import { cn } from "@/lib/utils";

type SkeletonVariant = 'text' | 'textSm' | 'textLg' | 'card' | 'avatar' | 'avatarSm' | 'avatarMd' | 'avatarLg' | 'line' | 'lineShort' | 'lineLong' | 'base';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: SkeletonVariant;
  width?: string;
  height?: string;
}

/**
 * Skeleton - Componente reutilizable para skeleton loaders
 * 
 * @param {string} variant - Variante del skeleton: 'text' | 'textSm' | 'textLg' | 'card' | 'avatar' | 'avatarSm' | 'avatarMd' | 'avatarLg' | 'line' | 'lineShort' | 'lineLong'
 * @param {string} className - Clases adicionales
 * @param {string} width - Ancho personalizado (opcional, ej: 'w-32', 'w-1/2')
 * @param {string} height - Altura personalizada (opcional, ej: 'h-8')
 */
const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>(({
  variant = 'text',
  className,
  width,
  height,
  ...props
}, ref) => {
  const variantClass = componentStyles.skeleton[variant] || componentStyles.skeleton.base;

  return (
    <div
      ref={ref}
      className={cn(
        variantClass,
        width,
        height,
        className
      )}
      {...props}
    />
  );
});
Skeleton.displayName = "Skeleton";

interface SkeletonTextProps extends React.HTMLAttributes<HTMLDivElement> {
  lines?: number;
}

/**
 * SkeletonText - Helper para múltiples líneas de texto skeleton
 */
const SkeletonText = React.forwardRef<HTMLDivElement, SkeletonTextProps>(({
  lines = 3,
  className,
  ...props
}, ref) => {
  return (
    <div ref={ref} className={cn("space-y-2", className)} {...props}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          variant={i === lines - 1 ? 'lineShort' : 'line'}
        />
      ))}
    </div>
  );
});
SkeletonText.displayName = "SkeletonText";

type SkeletonCardProps = React.HTMLAttributes<HTMLDivElement>;

/**
 * SkeletonCard - Helper para skeleton de card completa
 */
const SkeletonCard = React.forwardRef<HTMLDivElement, SkeletonCardProps>(({
  className,
  ...props
}, ref) => {
  return (
    <div ref={ref} className={cn(componentStyles.skeleton.card, "p-4 space-y-3", className)} {...props}>
      <Skeleton variant="textLg" width="w-3/4" />
      <SkeletonText lines={2} />
      <div className="flex gap-2">
        <Skeleton variant="textSm" width="w-16" />
        <Skeleton variant="textSm" width="w-20" />
      </div>
    </div>
  );
});
SkeletonCard.displayName = "SkeletonCard";

export { Skeleton, SkeletonText, SkeletonCard };
