import React, { useMemo } from "react";
import { cn } from "@/lib/utils";
import { componentStyles } from "@/design/componentStyles";
import { AlertCircle, CheckCircle2, HelpCircle } from "lucide-react";

/**
 * FormField - Componente mejorado para campos de formulario
 * 
 * @param {string} label - Etiqueta del campo
 * @param {boolean} required - Si el campo es requerido
 * @param {boolean} optional - Si el campo es opcional (muestra indicador)
 * @param {string} error - Mensaje de error
 * @param {string} success - Mensaje de éxito
 * @param {string} help - Mensaje de ayuda
 * @param {ReactNode} children - Input/Select/Textarea
 * @param {string} className - Clases adicionales
 */
export default function FormField({
  label,
  required = false,
  optional = false,
  error,
  success,
  help,
  children,
  className,
  ...props
}) {
  const labelClass = cn(
    componentStyles.forms.label,
    required && componentStyles.forms.labelRequired,
    optional && componentStyles.forms.labelOptional
  );

  // Generar ID único si no existe
  const fieldId = useMemo(() => {
    return children?.props?.id || `field-${Math.random().toString(36).substr(2, 9)}`;
  }, [children]);

  // Clonar children para añadir clases de error/success y ID
  const enhancedChildren = React.Children.map(children, (child) => {
    if (React.isValidElement(child)) {
      const childClassName = cn(
        child.props.className,
        error && componentStyles.forms.inputError,
        success && componentStyles.forms.inputSuccess
      );
      return React.cloneElement(child, {
        id: fieldId,
        className: childClassName,
        "aria-invalid": error ? "true" : undefined,
        "aria-describedby": error || success || help ? `${fieldId}-message` : undefined,
      });
    }
    return child;
  });

  return (
    <div className={cn(componentStyles.forms.fieldContainer, className)} {...props}>
      {label && (
        <label className={labelClass} htmlFor={fieldId}>
          {label}
        </label>
      )}
      {enhancedChildren}
      {(error || success || help) && (
        <div 
          id={`${fieldId}-message`}
          className={
            error 
              ? componentStyles.forms.errorMessage
              : success
              ? componentStyles.forms.successMessage
              : componentStyles.forms.helpMessage
          }
        >
          {error && <AlertCircle className={componentStyles.forms.errorIcon} />}
          {success && <CheckCircle2 className={componentStyles.forms.successIcon} />}
          {help && <HelpCircle className={componentStyles.icons.sm} />}
          <span>{error || success || help}</span>
        </div>
      )}
    </div>
  );
}

