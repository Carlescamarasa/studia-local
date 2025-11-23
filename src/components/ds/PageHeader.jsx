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
      {/* Zona 1: Appbar - Icono + Título + Subtítulo (solo desktop) + Acciones (derecha) */}
      <div className="px-2 sm:px-3 md:px-6 py-1.5 sm:py-2 md:py-2.5 border-b border-[var(--color-border-default)]" style={{ position: 'relative', zIndex: 1 }}>
        <div className="max-w-7xl mx-auto">
          {/* Primera fila: Botón menú (mobile) + Icono + Título + Acciones (derecha) */}
          <div className="flex items-center gap-2 sm:gap-2 md:gap-3 mb-1 md:mb-1.5" style={{ position: 'relative', zIndex: 1 }}>
            {/* Botón de menú solo en mobile */}
            {showMenuButton && (
              <button
                onClick={toggleSidebar}
                className="lg:hidden hover:bg-[var(--color-surface-muted)] active:bg-[var(--color-surface-muted)]/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 p-2 rounded-[var(--btn-radius,0.25rem)] transition-all min-h-[40px] min-w-[40px] h-10 w-10 flex items-center justify-center shrink-0 touch-manipulation -ml-1 relative z-10"
                aria-label={abierto ? "Cerrar menú" : "Abrir menú"}
                aria-controls="sidebar"
                aria-expanded={abierto}
                type="button"
                style={{ pointerEvents: 'auto' }}
              >
                {abierto ? <X className="w-5 h-5 pointer-events-none" /> : <Menu className="w-5 h-5 pointer-events-none" />}
              </button>
            )}
            {Icon && (
              <Icon className={iconClass} />
            )}
            {title && (
              <h1 className={`${componentStyles.typography.pageTitle} text-base sm:text-lg md:text-xl lg:text-2xl flex-1 min-w-0`}>{title}</h1>
            )}
            {/* Acciones siempre a la derecha en zona 1 */}
            {actions && (
              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 ml-auto">
                {actions}
              </div>
            )}
          </div>
          {/* Segunda fila: Subtítulo - SOLO en desktop (md+) */}
          {subtitle && (
            <div className="hidden md:flex items-center mt-0.5 mb-0.5">
              {/* Espaciador para alinear con el título (mismo ancho que icono + gap) */}
              {Icon && <div className="w-5 md:w-6 shrink-0" />}
              <div className="flex-1 min-w-0 ml-1">
                <p className={`${componentStyles.typography.pageSubtitle} text-xs sm:text-sm text-[var(--color-text-secondary)]`}>
                  {subtitle}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
      {/* Zona 2: Filtros rápidos (search + chips/selects compactos) - Siempre visibles si existen */}
      {filters && (
        <div className="w-full bg-[var(--color-surface-elevated)] border-b border-[var(--color-border-default)] px-2 sm:px-3 md:px-6 py-2 sm:py-2.5">
          <div className="max-w-7xl mx-auto">
            <div className="flex gap-1.5 sm:gap-2 flex-wrap items-center">
              {filters}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}