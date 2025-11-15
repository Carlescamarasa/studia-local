import React from "react";
import { cn } from "@/lib/utils";

/**
 * Badge - Componente de insignia del Design System
 * 100% conectado a tokens del DS en globals.css
 * @param {string} variant - Variante: neutral|primary|success|warning|danger|info|outline
 * @param {string} className - Clases adicionales
 */
export default function Badge({ 
  variant = "neutral",
  className = "",
  children,
  ...props
}) {
  const variantClass = {
    neutral: "badge-default",
    default: "badge-default",
    primary: "badge-primary",
    success: "badge-success",
    warning: "badge-warning",
    danger: "badge-danger",
    info: "badge-info",
    outline: "badge-outline"
  }[variant] || "badge-default";

  return (
    <span
      className={cn("badge", variantClass, className)}
      {...props}
    >
      {children}
    </span>
  );
}