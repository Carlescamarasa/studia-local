import { componentStyles } from "@/design/componentStyles";
import { cn } from "@/lib/utils";

/**
 * Skeleton - Componente reutilizable para skeleton loaders
 * 
 * @param {string} variant - Variante del skeleton: 'text' | 'textSm' | 'textLg' | 'card' | 'avatar' | 'avatarSm' | 'avatarMd' | 'avatarLg' | 'line' | 'lineShort' | 'lineLong'
 * @param {string} className - Clases adicionales
 * @param {string} width - Ancho personalizado (opcional, ej: 'w-32', 'w-1/2')
 * @param {string} height - Altura personalizada (opcional, ej: 'h-8')
 */
export function Skeleton({
  variant = 'text',
  className,
  width,
  height,
  ...props
}) {
  const variantClass = componentStyles.skeleton[variant] || componentStyles.skeleton.base;

  return (
    <div
      className={cn(
        variantClass,
        width,
        height,
        className
      )}
      {...props}
    />
  );
}

/**
 * SkeletonText - Helper para múltiples líneas de texto skeleton
 */
export function SkeletonText({ lines = 3, className }) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          variant={i === lines - 1 ? 'lineShort' : 'line'}
        />
      ))}
    </div>
  );
}

/**
 * SkeletonCard - Helper para skeleton de card completa
 */
export function SkeletonCard({ className }) {
  return (
    <div className={cn(componentStyles.skeleton.card, "p-4 space-y-3", className)}>
      <Skeleton variant="textLg" width="w-3/4" />
      <SkeletonText lines={2} />
      <div className="flex gap-2">
        <Skeleton variant="textSm" width="w-16" />
        <Skeleton variant="textSm" width="w-20" />
      </div>
    </div>
  );
}

