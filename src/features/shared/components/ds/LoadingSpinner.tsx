import { componentStyles } from "@/design/componentStyles";
import { cn } from "@/lib/utils";

/**
 * LoadingSpinner - Componente reutilizable para estados de carga
 * 
 * @param {string} size - Tamaño del spinner: 'sm' | 'md' | 'lg' | 'xl'
 * @param {string} variant - Variante del contenedor: 'inline' | 'centered' | 'fullPage'
 * @param {string} text - Texto opcional a mostrar debajo del spinner
 * @param {string} className - Clases adicionales para el contenedor
 */
export function LoadingSpinner({
  size = 'md',
  variant = 'inline',
  text,
  className
}: {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'inline' | 'centered' | 'fullPage';
  text?: string;
  className?: string;
}) {
  const spinnerSizeClass = {
    sm: componentStyles.loading.spinnerSm,
    md: componentStyles.loading.spinnerMd,
    lg: componentStyles.loading.spinnerLg,
    xl: componentStyles.loading.spinnerXl,
  }[size];

  const containerClass = {
    inline: componentStyles.loading.container,
    centered: `${componentStyles.loading.container} ${componentStyles.loading.containerCentered}`,
    fullPage: `${componentStyles.loading.container} ${componentStyles.loading.containerFullPage}`,
  }[variant];

  const textClass = variant === 'fullPage'
    ? componentStyles.loading.textFullPage
    : componentStyles.loading.text;

  return (
    <div className={cn(containerClass, className)}>
      <div className={cn(componentStyles.loading.spinner, spinnerSizeClass)} />
      {text && <p className={textClass}>{text}</p>}
    </div>
  );
}

