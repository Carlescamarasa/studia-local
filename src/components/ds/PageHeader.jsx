import React, { useState } from "react";
import { componentStyles } from "@/design/componentStyles";
import { Menu, X, Info } from "lucide-react";
import { useSidebar } from "@/components/ui/SidebarState";
import { Button } from "@/components/ui/button";

/**
 * PageHeader - Componente unificado para headers de página
 * @param {string} icon - Nombre del componente de icono de lucide-react
 * @param {string} title - Título de la página
 * @param {string} subtitle - Subtítulo (opcional)
 * @param {React.ReactNode} actions - Slot para acciones (botones, etc.)
 * @param {React.ReactNode} filters - Slot para filtros (opcional)
 * @param {string} className - Clases adicionales
 * @param {string} iconVariant - Variante del icono (deprecated: siempre usa estilo plain)
 * @param {boolean} showMenuButton - Mostrar botón de menú en mobile (default: true)
 */
export default function PageHeader({ 
  icon: Icon, 
  title, 
  subtitle, 
  actions, 
  filters,
  className = "",
  iconVariant = "plain", // Siempre usa estilo plain por defecto
  showMenuButton = true
}) {
  const { abierto, toggleSidebar } = useSidebar();
  const [filtersExpanded, setFiltersExpanded] = useState(true);
  
  // Icono siempre en estilo plain (color de marca, sin sombreado, sin bordes)
  const iconClass = "w-4 h-4 sm:w-4 sm:h-4 md:w-5 md:h-5 text-[var(--color-primary)]";

  return (
    <div className={`page-header header-modern ${className}`} data-testid="page-header">
      <div className="px-2 sm:px-3 md:px-6 py-1 sm:py-1.5 md:py-2">
        <div className="max-w-7xl mx-auto">
          {/* Primera fila: Botón menú (mobile) + Icono + Título + Botón Filtros */}
          <div className="flex items-center gap-1.5 sm:gap-2 md:gap-2.5 mb-0 sm:mb-0.5 md:mb-1">
            {/* Botón de menú solo en mobile */}
            {showMenuButton && (
              <button
                onClick={toggleSidebar}
                className="lg:hidden hover:bg-[var(--color-surface-muted)] active:bg-[var(--color-surface-muted)]/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 p-2 rounded-[var(--btn-radius,0.25rem)] transition-all h-10 w-10 min-h-[44px] min-w-[44px] flex items-center justify-center shrink-0 touch-manipulation"
                aria-label={abierto ? "Cerrar menú" : "Abrir menú"}
                aria-controls="sidebar"
                aria-expanded={abierto}
                type="button"
              >
                {abierto ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            )}
            {Icon && (
              <Icon className={iconClass} />
            )}
            {title && (
              <h1 className={`${componentStyles.typography.pageTitle} text-base sm:text-lg md:text-xl lg:text-2xl flex-1`}>{title}</h1>
            )}
            {/* Botón de filtros en línea con el título */}
            {filters && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFiltersExpanded(!filtersExpanded)}
                className={`${componentStyles.buttons.outline} flex items-center justify-center gap-1.5 text-xs sm:text-sm h-11 w-11 sm:h-9 sm:w-auto sm:min-w-0 min-h-[44px] min-w-[44px] px-0 sm:px-3 py-0 sm:py-2 touch-manipulation shrink-0`}
                aria-label={filtersExpanded ? "Ocultar filtros" : "Mostrar filtros"}
                aria-expanded={filtersExpanded}
              >
                <Info className="w-5 h-5 sm:w-4 sm:h-4" />
                {filtersExpanded ? (
                  <span className="hidden sm:inline ml-0.5">Ocultar</span>
                ) : (
                  <span className="hidden sm:inline ml-0.5">Filtros</span>
                )}
              </Button>
            )}
          </div>
          {/* Segunda fila: Subtítulo - solo en desktop si hay espacio */}
          {subtitle && (
            <div className="hidden sm:flex items-center mb-0.5 md:mb-1">
              {/* Espaciador para alinear con el título (mismo ancho que icono + gap-3) */}
              {Icon && <div className="w-8 md:w-12 shrink-0" />}
              <div className="flex-1 min-w-0">
                <p className={`${componentStyles.typography.pageSubtitle} text-xs sm:text-sm md:text-base`}>
                  {subtitle}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
      {(filters || actions) && (
        <div className="w-full flex justify-center px-2 sm:px-3 md:px-6 pb-1 sm:pb-1.5 md:pb-2">
          <div className="w-full max-w-full">
            <div className="flex flex-col md:flex-row gap-1.5 sm:gap-2 md:gap-2.5 items-start md:items-center justify-between">
              {filters && (
                <div className={`flex gap-1.5 sm:gap-2 flex-wrap flex-1 w-full md:w-auto text-sm transition-all duration-300 ${
                  filtersExpanded ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0 overflow-hidden'
                }`}>
                  {filters}
                </div>
              )}
              {actions && (
                <div className="flex gap-1.5 sm:gap-2 flex-wrap items-center w-full md:w-auto">
                  {actions}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}