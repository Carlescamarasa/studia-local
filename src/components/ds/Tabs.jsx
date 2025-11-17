import React, { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { componentStyles } from "@/design/componentStyles";

/**
 * Tabs - Componente de pestañas del Design System
 * 100% conectado al Design System con tokens semánticos
 * Renderiza automáticamente el contenido de la pestaña activa
 */
export default function Tabs({ 
  value, 
  onChange, 
  items, 
  variant = "segmented",
  className = "",
  showIconsOnlyMobile = false
}) {
  const activeItem = items.find(item => item.value === value);
  const containerRef = useRef(null);
  const sliderRef = useRef(null);
  const buttonsRef = useRef({});
  const [showIconsOnly, setShowIconsOnly] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [sliderStyle, setSliderStyle] = useState({});

  // Detectar si estamos en mobile usando media query
  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 768px)');
    setIsMobile(mediaQuery.matches);

    const handleChange = (e) => {
      setIsMobile(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Detectar si hay espacio suficiente para mostrar texto
  useEffect(() => {
    if (variant !== "segmented") return;

    // Si showIconsOnlyMobile está activo y estamos en mobile, solo mostrar iconos
    if (showIconsOnlyMobile && isMobile) {
      setShowIconsOnly(true);
      return;
    }

    // En desktop sin showIconsOnlyMobile, siempre mostrar texto + icono
    // No ejecutar la detección automática de espacio para evitar cambios de tamaño
    if (!showIconsOnlyMobile && !isMobile) {
      setShowIconsOnly(false);
      return;
    }

    // Solo ejecutar detección de espacio si estamos en mobile o si showIconsOnlyMobile no está definido
    let timeoutId;
    let rafId;
    let isChecking = false;

    const checkSpace = () => {
      if (isChecking || !containerRef.current) return;
      
      isChecking = true;
      rafId = requestAnimationFrame(() => {
        const container = containerRef.current;
        if (!container) {
          isChecking = false;
          return;
        }

        const buttons = container.querySelectorAll('button');
        if (buttons.length === 0) {
          isChecking = false;
          timeoutId = setTimeout(checkSpace, 100);
          return;
        }

        // Verificar si algún texto se está cortando
        let hasOverflow = false;
        let totalNeeded = 0;

        buttons.forEach(button => {
          const text = button.querySelector('span');
          if (text && text.offsetWidth > 0) {
            // Verificar overflow
            if (text.scrollWidth > text.offsetWidth + 2) {
              hasOverflow = true;
            }
            // Calcular ancho necesario
            const icon = button.querySelector('svg');
            const iconWidth = icon ? 24 : 0;
            totalNeeded += iconWidth + text.scrollWidth + 24;
          }
        });

        if (totalNeeded > 0) {
          const availableWidth = container.offsetWidth || container.clientWidth;
          const gapWidth = (items.length - 1) * 4;
          const shouldShowIconsOnly = hasOverflow || totalNeeded > (availableWidth - gapWidth - 10);
          
          setShowIconsOnly(prev => {
            if (prev !== shouldShowIconsOnly) {
              isChecking = false;
              return shouldShowIconsOnly;
            }
            isChecking = false;
            return prev;
          });
        } else {
          isChecking = false;
        }
      });
    };

    // Ejecutar después de renderizar
    timeoutId = setTimeout(checkSpace, 250);
    
    const resizeObserver = new ResizeObserver(() => {
      if (!isChecking) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(checkSpace, 200);
      }
    });
    
    // Observar el contenedor cuando esté disponible
    const checkAndObserve = () => {
      if (containerRef.current) {
        resizeObserver.observe(containerRef.current);
      } else {
        setTimeout(checkAndObserve, 100);
      }
    };
    checkAndObserve();

    return () => {
      clearTimeout(timeoutId);
      if (rafId) cancelAnimationFrame(rafId);
      resizeObserver.disconnect();
      isChecking = false;
    };
  }, [variant, items.length, showIconsOnlyMobile, isMobile]);

  // Actualizar posición del slider cuando cambia la tab activa o se redimensiona
  useEffect(() => {
    if (variant !== "segmented" || !containerRef.current) return;

    const updateSliderPosition = () => {
      const activeButton = buttonsRef.current[value];
      if (!activeButton || !sliderRef.current) return;

      const container = containerRef.current;
      const containerRect = container.getBoundingClientRect();
      const buttonRect = activeButton.getBoundingClientRect();

      const left = buttonRect.left - containerRect.left;
      const width = buttonRect.width;

      setSliderStyle({
        left: `${left}px`,
        width: `${width}px`,
        opacity: 1,
      });
    };

    // Usar requestAnimationFrame para asegurar que el DOM esté actualizado
    const rafId = requestAnimationFrame(() => {
      setTimeout(updateSliderPosition, 0);
    });

    // Observar cambios en el tamaño del contenedor
    const resizeObserver = new ResizeObserver(() => {
      updateSliderPosition();
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      cancelAnimationFrame(rafId);
      resizeObserver.disconnect();
    };
  }, [value, variant, showIconsOnly, items]);

  if (variant === "segmented") {
    return (
      <div className="space-y-6">
        <div className="flex justify-center w-full overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0 scrollbar-hide">
          <div 
            ref={containerRef}
            className={cn(
              componentStyles.components.tabsSegmentedContainer, 
              "flex w-full flex-shrink-0 relative",
              showIconsOnly ? "min-w-[75vw] md:min-w-0" : "min-w-fit md:min-w-0",
              className
            )}
            role="tablist"
            aria-label="Pestañas de navegación"
            data-testid="tabs-segmented"
          >
            {/* Slider deslizante - debe estar detrás de los botones pero visible */}
            <div
              ref={sliderRef}
              className="absolute top-1.5 bottom-1.5 bg-[var(--color-primary-soft)] border border-[var(--color-primary)] rounded-[var(--btn-radius)] shadow-sm transition-all duration-300 ease-out pointer-events-none"
              style={{
                ...sliderStyle,
                opacity: sliderStyle.opacity ?? 0,
                zIndex: 1,
              }}
            />
            
            {items.map((item) => {
              const Icon = item.icon;
              const isActive = value === item.value;
              return (
                <button
                  key={item.value}
                  ref={(el) => {
                    if (el) buttonsRef.current[item.value] = el;
                  }}
                  onClick={() => onChange(item.value)}
                  className={cn(
                    // Usar componentStyles en lugar de clases hardcodeadas
                    componentStyles.components.tabsSegmentedButton,
                    // Clases necesarias para el layout y posicionamiento
                    "relative flex-1 min-w-0 flex items-center justify-center",
                    // Asegurar que los botones no tengan background sólido que tape el slider
                    // El background activo se maneja con el slider, no con el botón
                    isActive ? "text-[var(--color-text-primary)]" : "text-ui/80",
                    !isActive && "hover:bg-[var(--color-surface-muted)]/50",
                    // Layout: flex-row para iconos solo, flex-col para icono + texto
                    showIconsOnly ? "flex-row" : "flex-col",
                    // Asegurar que min-h se respete incluso con flex-col
                    "min-h-[var(--btn-height)]"
                  )}
                  style={{ 
                    zIndex: 2,
                    backgroundColor: 'transparent',
                  }}
                  role="tab"
                  aria-selected={isActive}
                  aria-current={isActive ? "true" : undefined}
                  aria-label={item.label}
                  title={item.label}
                  tabIndex={isActive ? 0 : -1}
                >
                  {Icon && (
                    <Icon className={cn(
                      "w-4 h-4 shrink-0",
                      showIconsOnly ? "" : "mb-1"
                    )} />
                  )}
                  {!showIconsOnly && (
                    <span className="text-center leading-tight line-clamp-2">{item.label}</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {activeItem?.content && (
          <div role="tabpanel" aria-labelledby={`tab-${activeItem.value}`}>
            {activeItem.content}
          </div>
        )}
      </div>
    );
  }

  // Variante underline
  return (
    <div className="space-y-6">
      <div 
        className={cn(componentStyles.components.tabsUnderlineContainer, className)}
        role="tablist"
        aria-label="Pestañas de navegación"
      >
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = value === item.value;
          return (
            <button
              key={item.value}
              onClick={() => onChange(item.value)}
              className={cn(
                componentStyles.components.tabsUnderlineButton,
                isActive && componentStyles.components.tabsUnderlineButtonActive
              )}
              role="tab"
              aria-selected={isActive}
              aria-current={isActive ? "true" : undefined}
              tabIndex={isActive ? 0 : -1}
            >
              {Icon && <Icon className="w-4 h-4" />}
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {activeItem?.content && (
        <div role="tabpanel" aria-labelledby={`tab-${activeItem.value}`}>
          {activeItem.content}
        </div>
      )}
    </div>
  );
}