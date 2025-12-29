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
interface FormFieldProps extends React.HTMLAttributes<HTMLDivElement> {
  label?: string;
  required?: boolean;
  optional?: boolean;
  error?: string;
  success?: string;
  help?: string;
  helpText?: string;
  children: React.ReactElement | React.ReactNode;
}

export function FormField({
  label,
  required = false,
  optional = false,
  error,
  success,
  help,
  helpText,
  children,
  className,
  ...props
}: FormFieldProps) {
  // Combinar help y helpText (helpText es el alias común usado en el proyecto)
  const helpMessage = help || helpText;
  const labelClass = cn(
    componentStyles.forms.label,
    required && componentStyles.forms.labelRequired,
    optional && componentStyles.forms.labelOptional
  );

  // Generar ID único si no existe
  const fieldId = useMemo(() => {
    return (children as React.ReactElement<any>)?.props?.id || `field-${Math.random().toString(36).substr(2, 9)}`;
  }, [children]);

  // Función recursiva para encontrar y mejorar el Input
  const enhanceInputInTree = (element: React.ReactNode, isRoot = false): React.ReactNode => {
    if (!React.isValidElement(element)) {
      return element;
    }

    const reactElement = element as React.ReactElement<any>;

    // Si es un Input (verificamos por props comunes de input o por displayName)
    const isInput = reactElement.props?.type === 'password' ||
      reactElement.props?.type === 'text' ||
      reactElement.props?.type === 'email' ||
      reactElement.props?.type === 'number' ||
      reactElement.props?.type === 'tel' ||
      reactElement.props?.type === 'url' ||
      reactElement.type === 'input' ||
      (reactElement.type as any)?.name === 'Input' ||
      (reactElement.type as any)?.displayName === 'Input' ||
      (typeof reactElement.type === 'object' && (reactElement.type as any)?.render?.name === 'Input');

    if (isInput) {
      // Es un Input, aplicar clases de error/success
      const inputClassName = cn(
        reactElement.props.className,
        error && componentStyles.forms.inputError,
        success && componentStyles.forms.inputSuccess
      );

      return React.cloneElement(reactElement, {
        id: fieldId,
        className: inputClassName,
        "aria-invalid": error ? "true" : undefined,
        "aria-describedby": error || success || helpMessage ? `${fieldId}-message` : undefined,
      });
    }

    // Si tiene children, procesarlos recursivamente
    if (reactElement.props.children) {
      const enhancedChildrenInTree = React.Children.map(reactElement.props.children, (child) =>
        enhanceInputInTree(child, false)
      );
      return React.cloneElement(reactElement, {
        children: enhancedChildrenInTree,
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

