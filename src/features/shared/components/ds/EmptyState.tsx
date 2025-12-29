import { componentStyles } from "@/design/componentStyles";
import { cn } from "@/lib/utils";
import { Button } from "./Button";

/**
 * EmptyState - Componente mejorado para estados vacíos
 * 
 * @param {ReactNode} icon - Icono o ilustración
 * @param {string} title - Título del empty state
 * @param {string} description - Descripción opcional
 * @param {ReactNode} action - Botón o acción opcional
 * @param {string} variant - Variante: 'noData' | 'noResults' | 'error' | 'default'
 * @param {string} className - Clases adicionales
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  variant = 'default',
  className,
  ...props
}) {
  const containerClass = {
    noData: componentStyles.empty.emptyNoData,
    noResults: componentStyles.empty.emptyNoResults,
    error: componentStyles.empty.emptyError,
    default: componentStyles.empty.emptyContainer,
  }[variant];

  return (
    <div className={cn(containerClass, className)} {...props}>
      {icon && (
        <div className={componentStyles.empty.emptyIcon}>
          {icon}
        </div>
      )}
      {title && (
        <h3 className={componentStyles.empty.emptyTitle}>
          {title}
        </h3>
      )}
      {description && (
        <p className={componentStyles.empty.emptyDescription}>
          {description}
        </p>
      )}
      {action && (
        <div className={componentStyles.empty.emptyAction}>
          {action}
        </div>
      )}
    </div>
  );
}

