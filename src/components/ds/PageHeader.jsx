import React, { useState, useEffect, useRef } from "react";
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
  const [filtersExpanded, setFiltersExpanded] = useState(false); // Por defecto oculto
  const [highlightButton, setHighlightButton] = useState(false);
  
  // Refs para gestos de swipe
  const swipeStartRef = useRef({ x: 0, y: 0, time: 0 });
  const headerRef = useRef(null);
  const isMobileRef = useRef(false);
  
  // Detectar si es móvil
  useEffect(() => {
    const checkMobile = () => {
      isMobileRef.current = window.innerWidth < 1024;
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  // Gestos de swipe en el header
  useEffect(() => {
    if (!headerRef.current) return;
    const header = headerRef.current;
    
    const handleTouchStart = (e) => {
      if (!isMobileRef.current) return;
      const touch = e.touches[0];
      swipeStartRef.current = {
        x: touch.clientX,
        y: touch.clientY,
        time: Date.now()
      };
    };
    
    const handleTouchMove = (e) => {
      if (!isMobileRef.current || !swipeStartRef.current.x) return;
      const touch = e.touches[0];
      const dx = Math.abs(touch.clientX - swipeStartRef.current.x);
      const dy = Math.abs(touch.clientY - swipeStartRef.current.y);
      
      // Solo prevenir scroll si el movimiento es principalmente horizontal
      // o si es vertical y hay filtros disponibles
      if (dx > dy && dx > 20) {
        e.preventDefault(); // Prevenir scroll horizontal durante swipe horizontal
      } else if (dy > dx && dy > 20 && filters) {
        e.preventDefault(); // Prevenir scroll vertical durante swipe vertical en header con filtros
      }
    };
    
    const handleTouchEnd = (e) => {
      if (!isMobileRef.current || !swipeStartRef.current.x) return;
      
      const touch = e.changedTouches[0];
      const dx = touch.clientX - swipeStartRef.current.x;
      const dy = touch.clientY - swipeStartRef.current.y;
      const dt = Date.now() - swipeStartRef.current.time;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      // Reset
      swipeStartRef.current = { x: 0, y: 0, time: 0 };
      
      // Validar que sea un swipe rápido y con suficiente distancia
      if (dt > 500 || distance < 30) return;
      
      // Determinar dirección principal
      const isHorizontal = Math.abs(dx) > Math.abs(dy);
      
      if (isHorizontal) {
        // Swipe horizontal: izquierda-derecha para sidebar
        if (dx > 50 && !abierto) {
          // Swipe derecha: abrir sidebar
          toggleSidebar();
        } else if (dx < -50 && abierto) {
          // Swipe izquierda: cerrar sidebar
          toggleSidebar();
        }
      } else {
        // Swipe vertical: arriba-abajo para filtros
        if (filters) {
          if (dy > 50 && !filtersExpanded) {
            // Swipe abajo: mostrar filtros
            setFiltersExpanded(true);
          } else if (dy < -50 && filtersExpanded) {
            // Swipe arriba: ocultar filtros
            setFiltersExpanded(false);
          }
        }
      }
    };
    
    header.addEventListener('touchstart', handleTouchStart, { passive: true });
    header.addEventListener('touchmove', handleTouchMove, { passive: false });
    header.addEventListener('touchend', handleTouchEnd, { passive: true });
    
    return () => {
      header.removeEventListener('touchstart', handleTouchStart);
      header.removeEventListener('touchmove', handleTouchMove);
      header.removeEventListener('touchend', handleTouchEnd);
    };
  }, [abierto, filters, filtersExpanded, toggleSidebar]);
  
  // Highlight del botón de filtros al cargar la página (solo una vez por sesión)
  useEffect(() => {
    // Verificar si ya se mostró el highlight en esta sesión
    const highlightShown = sessionStorage.getItem('pageHeaderFiltersHighlightShown');
    
    if (!highlightShown && filters) {
      // Mostrar highlight solo si no se ha mostrado antes en esta sesión
      setHighlightButton(true);
      sessionStorage.setItem('pageHeaderFiltersHighlightShown', 'true');
      
      const timer = setTimeout(() => {
        setHighlightButton(false);
      }, 1000); // 1 segundo de parpadeo
      
      return () => clearTimeout(timer);
    }
  }, [filters]);
  
  // Icono siempre en estilo plain (color de marca, sin sombreado, sin bordes)
  const iconClass = "w-4 h-4 sm:w-4 sm:h-4 md:w-5 md:h-5 text-[var(--color-primary)]";

  return (
    <div 
      ref={headerRef}
      className={`page-header header-modern ${className}`} 
      data-testid="page-header" 
      style={{ position: 'relative', zIndex: 1 }}
    >
      <div className="px-2 sm:px-3 md:px-6 py-1 sm:py-1.5 md:py-2" style={{ position: 'relative', zIndex: 1 }}>
        <div className="max-w-7xl mx-auto">
          {/* Primera fila: Botón menú (mobile) + Icono + Título + Botón Filtros */}
          <div className="flex items-center gap-2 sm:gap-2 md:gap-2.5 mb-0 sm:mb-0.5 md:mb-1" style={{ position: 'relative', zIndex: 1 }}>
            {/* Botón de menú solo en mobile */}
            {showMenuButton && (
              <button
                onClick={toggleSidebar}
                className="lg:hidden hover:bg-[var(--color-surface-muted)] active:bg-[var(--color-surface-muted)]/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 p-3 rounded-[var(--btn-radius,0.25rem)] transition-all min-h-[48px] min-w-[48px] h-12 w-12 flex items-center justify-center shrink-0 touch-manipulation -ml-1 -mr-1 relative z-10"
                aria-label={abierto ? "Cerrar menú" : "Abrir menú"}
                aria-controls="sidebar"
                aria-expanded={abierto}
                type="button"
                style={{ pointerEvents: 'auto' }}
              >
                {abierto ? <X className="w-6 h-6 pointer-events-none" /> : <Menu className="w-6 h-6 pointer-events-none" />}
              </button>
            )}
            {Icon && (
                <Icon className={iconClass} />
            )}
            {title && (
              <h1 className={`${componentStyles.typography.pageTitle} text-base sm:text-lg md:text-xl lg:text-2xl flex-1 min-w-0`}>{title}</h1>
            )}
            {/* Acciones en línea con el título (si no hay filtros) */}
            {actions && !filters && (
              <div className="flex items-center gap-1 sm:gap-1.5 shrink-0 ml-1 sm:ml-2">
                {actions}
              </div>
            )}
            {/* Botón de filtros en línea con el título */}
            {filters && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFiltersExpanded(!filtersExpanded)}
                className={`${componentStyles.buttons.outline} flex items-center justify-center gap-1.5 text-xs sm:text-sm min-h-[48px] min-w-[48px] h-12 w-12 sm:h-9 sm:w-auto sm:min-w-0 px-3 sm:px-3 py-3 sm:py-2 touch-manipulation shrink-0 transition-all duration-300 -mr-1 relative z-10 ${
                  highlightButton 
                    ? 'ring-1 ring-[var(--color-primary)]/30 bg-[var(--color-primary-soft)]/50 animate-pulse-1s' 
                    : ''
                }`}
                aria-label={filtersExpanded ? "Ocultar filtros" : "Mostrar filtros"}
                aria-expanded={filtersExpanded}
                style={{ pointerEvents: 'auto' }}
              >
                <Info className={`w-6 h-6 sm:w-4 sm:h-4 transition-all duration-300 pointer-events-none ${
                  highlightButton 
                    ? 'text-[var(--color-primary)]' 
                    : ''
                }`} />
                {filtersExpanded ? (
                  <span className="hidden sm:inline ml-0.5 pointer-events-none">Ocultar</span>
                ) : (
                  <span className="hidden sm:inline ml-0.5 pointer-events-none">Filtros</span>
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
      {filters && (
        <div className="w-full flex justify-center px-2 sm:px-3 md:px-6 pb-1 sm:pb-1.5 md:pb-2">
          <div className="w-full max-w-full">
            <div className="flex flex-col md:flex-row gap-1.5 sm:gap-2 md:gap-2.5 items-start md:items-center justify-between">
              <div className={`flex gap-1.5 sm:gap-2 flex-wrap flex-1 w-full md:w-auto text-sm transition-all duration-300 ${
                filtersExpanded ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0 overflow-hidden'
              }`}>
                {filters}
              </div>
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