import React, { useState, useEffect, useRef } from "react";
import { componentStyles } from "@/design/componentStyles";
import { Menu, X, Info } from "lucide-react";
import { useSidebar } from "@/components/ui/SidebarState";
import { Button } from "@/components/ui/button";
import { HotkeysModalButton } from "@/hooks/useHotkeysModal.jsx";
import { useLocation } from "react-router-dom";

/**
 * PageHeader - Componente unificado para headers de página
 * @param {React.ComponentType<{className?: string}>} icon - Componente de icono de lucide-react
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
  showMenuButton = true,
  showHotkeys = true
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

      // Si el evento viene de un botón o input, no interferir
      const target = e.target;
      if (target && (target.closest('button') || target.closest('input') || target.closest('[role="button"]'))) {
        return;
      }

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
      className={`page-header-shell header-modern ${className}`}
      data-testid="page-header"
    >
      {/* Main header row - uses standard page-header-inner/grid classes */}
      {/* Padding matches body content: px-3 md:px-6 lg:px-[var(--page-padding-x)] */}
      <div className="page-header-inner px-3 md:px-6 lg:px-[var(--page-padding-x)]">
        <div className="page-header-grid">
          {/* Title area (icon + title) */}
          <div className="page-header-title">
            {/* Botón de menú solo en mobile (< 451px) */}
            {showMenuButton && (
              <button
                onClick={toggleSidebar}
                className="min-[451px]:hidden hover:bg-[var(--color-surface-muted)] active:bg-[var(--color-surface-muted)]/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 p-2.5 rounded-[var(--btn-radius,0.25rem)] transition-all min-h-[48px] min-w-[48px] h-12 w-12 flex items-center justify-center shrink-0 touch-manipulation -ml-1"
                aria-label={abierto ? "Cerrar menú" : "Abrir menú"}
                aria-controls="sidebar"
                aria-expanded={abierto}
                type="button"
              >
                {abierto ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            )}
            {/* Icon + Title: clickable en mobile para toggle sidebar */}
            <div
              className={`flex items-center flex-1 ${window.innerWidth < 768 ? 'cursor-pointer' : 'pointer-events-none cursor-default'}`}
              style={{ gap: 'var(--header-title-gap, 0.5rem)' }}
              onClick={() => {
                // Solo toggle en móvil (< 768px)
                if (window.innerWidth < 768) {
                  toggleSidebar();
                }
              }}
              role="button"
              tabIndex={-1}
              aria-hidden="true"
            >
              {Icon && (
                <Icon className={`${iconClass} shrink-0`} />
              )}
              <div className="min-w-0 flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
                {title && (
                  <h1 className={`${componentStyles.typography.pageTitle} text-base sm:text-lg md:text-xl lg:text-2xl`}>{title}</h1>
                )}
                {/* Subtitle inline on desktop, wraps if needed */}
                {subtitle && (
                  <p className={`${componentStyles.typography.pageSubtitle} text-xs sm:text-sm text-[var(--color-text-secondary)] hidden md:block truncate max-w-full`}>
                    {subtitle}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Actions area (buttons, always right side) */}
          <div className="page-header-actions">
            {actions}
            {/* Botón de hotkeys discreto details */}
            {/* Botón de hotkeys discreto details - Solo desktop */}
            {showHotkeys && (
              <div className="hidden lg:block">
                <HotkeysModalButton />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Controls row (filters, tabs, search) - only shown if filters exist */}
      {filters && (
        <div className="page-header-inner px-3 md:px-6 lg:px-[var(--page-padding-x)] border-t border-[var(--color-border-muted)]">
          <div className="page-header-controls">
            {filters}
          </div>
        </div>
      )}
    </div>
  );
}