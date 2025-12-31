import React from "react";
import { componentStyles } from "@/design/componentStyles";
import { cn } from "@/lib/utils";

interface SkipLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  href?: string;
  text?: string;
  className?: string;
}

/**
 * SkipLink - Componente de accesibilidad para skip links
 * Permite a usuarios de teclado saltar al contenido principal
 */
export function SkipLink({
  href = "#main-content",
  text = "Saltar al contenido principal",
  className,
  ...props
}: SkipLinkProps) {
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

