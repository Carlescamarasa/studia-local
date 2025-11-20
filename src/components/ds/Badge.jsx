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
  const variantClasses = {
    neutral: "badge-default",
    default: "badge-default",
    primary: "bg-[var(--color-primary-soft)] text-[var(--color-primary)] border border-[var(--color-primary)]",
    success: "bg-[var(--color-success)]/10 text-[var(--color-success)] border border-[var(--color-success)]/20",
    warning: "bg-[var(--color-warning)]/10 text-[var(--color-warning)] border border-[var(--color-warning)]/20",
    danger: "bg-[var(--color-danger)]/10 text-[var(--color-danger)] border border-[var(--color-danger)]/20",
    info: "bg-[var(--color-info)]/10 text-[var(--color-info)] border border-[var(--color-info)]/20",
    outline: "badge-outline"
  }[variant] || "badge-default";

  return (
    <span
      className={cn("inline-flex items-center rounded-full text-xs px-2 py-0.5 font-medium", variantClasses, className)}
      {...props}
    >
      {children}
    </span>
  );
}