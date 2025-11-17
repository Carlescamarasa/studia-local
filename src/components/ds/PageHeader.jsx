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
          <div className="flex items-center justify-between gap-4 mb-3 md:mb-4">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              {Icon && (
                <div className="w-9 h-9 rounded-xl bg-[var(--color-primary-soft)] border border-[var(--color-primary)] text-ui flex items-center justify-center">
                  <Icon className="w-6 h-6" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h1 className={`${componentStyles.typography.pageTitle} mb-1`}>{title}</h1>
                {subtitle && (
                  <p className={componentStyles.typography.pageSubtitle}>
                    {subtitle}
                  </p>
                )}
              </div>
            </div>
            {actions && <div className="flex gap-2 shrink-0">{actions}</div>}
          </div>
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