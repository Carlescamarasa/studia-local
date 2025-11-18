import React from "react";
import { cn } from "@/lib/utils";
import { AlertCircle, CheckCircle, Info, AlertTriangle } from "lucide-react";

/**
 * Alert - Componente de alerta unificado
 * @param {string} variant - Variante: info|success|warning|danger
 * @param {string} title - Título de la alerta
 * @param {React.ReactNode} children - Contenido de la alerta
 * @param {string} className - Clases adicionales
 */
export default function Alert({ 
  variant = "info",
  title,
  children,
  className = "",
  ...props
}) {
  const icons = {
    info: Info,
    success: CheckCircle,
    warning: AlertTriangle,
    danger: AlertCircle
  };

  const variants = {
    info: "bg-[hsl(var(--info)/0.1)] border-[hsl(var(--info)/0.3)] text-[hsl(var(--info))]",
    success: "bg-[hsl(var(--success)/0.1)] border-[hsl(var(--success)/0.3)] text-[hsl(var(--success))]",
    warning: "bg-[hsl(var(--warning)/0.1)] border-[hsl(var(--warning)/0.3)] text-[hsl(var(--warning))]",
    danger: "bg-[hsl(var(--danger)/0.1)] border-[hsl(var(--danger)/0.3)] text-[hsl(var(--danger))]"
  };

  const Icon = icons[variant];
  const variantClass = variants[variant];

  return (
    <div
      role="alert"
      className={cn(
        "relative rounded-[var(--radius-card,0.25rem)] border p-4",
        variantClass,
        className
      )}
      {...props}
    >
      <div className="flex gap-3">
        {Icon && <Icon className="w-5 h-5 shrink-0" />}
        <div className="flex-1 space-y-1">
          {title && <h5 className="font-semibold text-sm">{title}</h5>}
          <div className="text-sm [&_p]:leading-relaxed opacity-90">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * AlertTitle - Componente de título para Alert
 * Wrapper simple para mantener compatibilidad con shadcn
 */
export function AlertTitle({ children, className = "", ...props }) {
  return (
    <h5 className={cn("font-semibold text-sm mb-1", className)} {...props}>
      {children}
    </h5>
  );
}

/**
 * AlertDescription - Componente de descripción para Alert
 * Wrapper simple para mantener compatibilidad con shadcn
 */
export function AlertDescription({ children, className = "", ...props }) {
  return (
    <div className={cn("text-sm [&_p]:leading-relaxed", className)} {...props}>
      {children}
    </div>
  );
}