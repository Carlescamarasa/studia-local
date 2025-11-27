import React from "react";
import { componentStyles } from "@/design/componentStyles";
import { cn } from "@/lib/utils";

/**
 * SkipLink - Componente de accesibilidad para skip links
 * Permite a usuarios de teclado saltar al contenido principal
 * 
 * @param {string} href - ID del elemento al que saltar (ej: "#main-content")
 * @param {string} text - Texto del skip link
 * @param {string} className - Clases adicionales
 */
export default function SkipLink({ 
  href = "#main-content",
  text = "Saltar al contenido principal",
  className,
  ...props
}) {
  return (
    <a
      href={href}
      className={cn(componentStyles.a11y.skipLink, className)}
      {...props}
    >
      {text}
    </a>
  );
}

