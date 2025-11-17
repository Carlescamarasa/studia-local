import React from "react";
import { componentStyles } from "@/design/componentStyles";

/**
 * PageHeader - Componente unificado para headers de página
 * @param {string} icon - Nombre del componente de icono de lucide-react
 * @param {string} title - Título de la página
 * @param {string} subtitle - Subtítulo (opcional)
 * @param {React.ReactNode} actions - Slot para acciones (botones, etc.)
 * @param {React.ReactNode} filters - Slot para filtros (opcional)
 * @param {string} className - Clases adicionales
 */
export default function PageHeader({ 
  icon: Icon, 
  title, 
  subtitle, 
  actions, 
  filters,
  className = "" 
}) {
  return (
    <div className={`page-header ${className}`} data-testid="page-header">
      <div className="px-4 md:px-6 py-4">
        <div className="max-w-7xl mx-auto">
          {/* Primera fila: Icono + Título */}
          <div className="flex items-center gap-3 mb-2">
            {Icon && (
              <div className="w-9 h-9 rounded-xl bg-[var(--color-primary-soft)] border border-[var(--color-primary)] text-ui flex items-center justify-center shrink-0">
                <Icon className="w-6 h-6" />
              </div>
            )}
            {title && (
              <h1 className={`${componentStyles.typography.pageTitle}`}>{title}</h1>
            )}
          </div>
          {/* Segunda fila: Subtítulo */}
          {subtitle && (
            <div className="flex items-center mb-3">
              {/* Espaciador para alinear con el título (mismo ancho que icono + gap-3) */}
              {Icon && <div className="w-12 shrink-0" />}
              <div className="flex-1 min-w-0">
                <p className={componentStyles.typography.pageSubtitle}>
                  {subtitle}
                </p>
              </div>
            </div>
          )}
          {/* Tercera fila: Acciones */}
          {actions && (
            <div className="flex gap-2 flex-wrap items-center">
              {/* Espaciador para alinear con el título (mismo ancho que icono + gap-3) */}
              {Icon && <div className="w-12 shrink-0" />}
              <div className="flex-1 min-w-0">
                {actions}
              </div>
            </div>
          )}
        </div>
      </div>
      {filters && (
        <div className="w-full flex justify-center px-4 md:px-6 pb-4">
          <div className="w-full max-w-full space-y-3">{filters}</div>
        </div>
      )}
    </div>
  );
}