import React from "react";

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
    <div className={`page-header ${className}`}>
      <div className="page-header-container">
        <div className="flex items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {Icon && (
              <div className="icon-tile">
                <Icon className="w-6 h-6" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h1 className="page-header-title">{title}</h1>
              {subtitle && <p className="page-header-subtitle">{subtitle}</p>}
            </div>
          </div>
          {actions && <div className="flex gap-2 shrink-0">{actions}</div>}
        </div>
        {filters && <div className="space-y-3">{filters}</div>}
      </div>
    </div>
  );
}