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
  helpText, // Nueva prop para ayudar con el warning de React
  children,
  className,
  ...props
}) {
  // Combinar help y helpText (helpText es el alias común usado en el proyecto)
  const helpMessage = help || helpText;
  const labelClass = cn(
    componentStyles.forms.label,
    required && componentStyles.forms.labelRequired,
    optional && componentStyles.forms.labelOptional
  );

  // Generar ID único si no existe
  const fieldId = useMemo(() => {
    return children?.props?.id || `field-${Math.random().toString(36).substr(2, 9)}`;
  }, [children]);

  // Función recursiva para encontrar y mejorar el Input
  const enhanceInputInTree = (element, isRoot = false) => {
    if (!React.isValidElement(element)) {
      return element;
    }

    // Si es un Input (verificamos por props comunes de input o por displayName)
    const isInput = element.props?.type === 'password' || 
                    element.props?.type === 'text' || 
                    element.props?.type === 'email' ||
                    element.props?.type === 'number' ||
                    element.props?.type === 'tel' ||
                    element.props?.type === 'url' ||
                    element.type === 'input' ||
                    (element.type?.name === 'Input') ||
                    (element.type?.displayName === 'Input') ||
                    (typeof element.type === 'object' && element.type?.render?.name === 'Input');

    if (isInput) {
      // Es un Input, aplicar clases de error/success
      // inputError ya incluye ctrl-field, así que solo agregamos las clases de estado
      const inputClassName = cn(
        element.props.className,
        error && componentStyles.forms.inputError,
        success && componentStyles.forms.inputSuccess
      );
      
      return React.cloneElement(element, {
        id: fieldId,
        className: inputClassName,
        "aria-invalid": error ? "true" : undefined,
        "aria-describedby": error || success || helpMessage ? `${fieldId}-message` : undefined,
      });
    }

    // Si tiene children, procesarlos recursivamente
    if (element.props.children) {
      const enhancedChildren = React.Children.map(element.props.children, (child) =>
        enhanceInputInTree(child, false)
      );
      return React.cloneElement(element, {
        children: enhancedChildren,
      });
    }

    return element;
  };

  // Clonar children para añadir clases de error/success y ID
  const enhancedChildren = React.Children.map(children, (child) => {
    return enhanceInputInTree(child, true);
  });

  return (
    <div className={cn(componentStyles.forms.fieldContainer, className)} {...props}>
      {label && (
        <label className={labelClass} htmlFor={fieldId}>
          {label}
        </label>
      )}
      {enhancedChildren}
      {(error || success || helpMessage) && (
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
          {helpMessage && <HelpCircle className={componentStyles.icons.sm} />}
          <span>{error || success || helpMessage}</span>
        </div>
      )}
    </div>
  );
}

