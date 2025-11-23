import React, { useState, useEffect } from "react";
import { Button } from "@/components/ds/Button";
import { Card, CardContent } from "@/components/ds";
import { CalendarDays, ChevronLeft, ChevronRight, ChevronDown, ChevronUp } from "lucide-react";
import { componentStyles } from "@/design/componentStyles";
import { useIsMobile } from "@/hooks/use-mobile";

/**
 * Hook para manejar el estado del PeriodHeader
 * Permite compartir el estado entre el botón (en actions) y el panel (fuera del PageHeader)
 */
export function usePeriodHeaderState(defaultOpenDesktop = true) {
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = useState(() => {
    return !isMobile && defaultOpenDesktop;
  });

  useEffect(() => {
    if (isMobile) {
      setIsOpen(false);
    } else if (defaultOpenDesktop) {
      setIsOpen(true);
    }
  }, [isMobile, defaultOpenDesktop]);

  const toggleOpen = () => {
    setIsOpen(!isOpen);
  };

  return { isOpen, toggleOpen };
}

/**
 * PeriodHeaderButton - Botón pill que debe ir en `actions` del PageHeader
 * 
 * @param {Object} props
 * @param {string} props.label - Etiqueta principal (ej: "Semana 47")
 * @param {string} props.rangeText - Texto del rango (ej: "17–23 nov 2025")
 * @param {boolean} props.isOpen - Estado de apertura del panel
 * @param {Function} props.onToggle - Handler para toggle del panel
 */
export function PeriodHeaderButton({ label, rangeText, isOpen, onToggle }) {
  const displayText = rangeText ? `${label} · ${rangeText}` : label;

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onToggle}
      className={`${componentStyles.buttons.outline} flex items-center justify-center gap-1 sm:gap-1.5 text-xs sm:text-sm h-8 sm:h-9 px-2 sm:px-3 py-1.5 touch-manipulation shrink-0 transition-all duration-300 whitespace-nowrap`}
      aria-label={isOpen ? "Ocultar navegación" : "Mostrar navegación"}
      aria-expanded={isOpen}
      type="button"
    >
      <CalendarDays className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
      <span className="text-xs sm:text-sm">{displayText}</span>
      {isOpen ? (
        <ChevronUp className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
      ) : (
        <ChevronDown className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
      )}
    </Button>
  );
}

/**
 * PeriodHeaderPanel - Panel colapsable que se renderiza fuera del PageHeader
 * 
 * @param {Object} props
 * @param {boolean} props.isOpen - Si el panel está abierto
 * @param {Function} props.onPrev - Handler para ir al período anterior
 * @param {Function} props.onNext - Handler para ir al período siguiente
 * @param {Function} props.onToday - Handler para ir al período actual
 * @param {React.ReactNode} props.children - Contenido adicional dentro del panel (opcional)
 */
export function PeriodHeaderPanel({ isOpen, onPrev, onNext, onToday, children }) {
  if (!isOpen) return null;

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 py-3 md:py-4">
      <Card className={componentStyles.containers.cardBase}>
        <CardContent className="p-3 sm:p-4 md:p-6 space-y-4 md:space-y-6">
          {/* Controles de navegación */}
          <div className="flex gap-2 sm:gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onPrev?.();
              }}
              className={`flex-1 h-9 sm:h-10 ${componentStyles.buttons.outline}`}
              aria-label="Período anterior"
              type="button"
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="hidden sm:inline ml-1">Anterior</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onToday?.();
              }}
              className={`flex-1 h-9 sm:h-10 ${componentStyles.buttons.outline}`}
              aria-label="Ir a período actual"
              type="button"
            >
              Hoy
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onNext?.();
              }}
              className={`flex-1 h-9 sm:h-10 ${componentStyles.buttons.outline}`}
              aria-label="Período siguiente"
              type="button"
            >
              <span className="hidden sm:inline mr-1">Siguiente</span>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          {/* Contenido adicional (opcional) */}
          {children && (
            <div className="pt-2 border-t border-[var(--color-border-default)]">
              {children}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * PeriodHeader - Componente completo (wrapper para compatibilidad)
 * Usa PeriodHeaderButton en actions y PeriodHeaderPanel fuera del PageHeader
 * 
 * @param {Object} props
 * @param {string} props.label - Etiqueta principal (ej: "Semana 47")
 * @param {string} props.rangeText - Texto del rango (ej: "17–23 nov 2025")
 * @param {boolean} props.defaultOpenDesktop - Si debe estar abierto por defecto en desktop (default: true)
 * @param {Function} props.onPrev - Handler para ir al período anterior
 * @param {Function} props.onNext - Handler para ir al período siguiente
 * @param {Function} props.onToday - Handler para ir al período actual
 * @param {React.ReactNode} props.children - Contenido adicional dentro del panel (opcional)
 */
export default function PeriodHeader({
  label,
  rangeText,
  defaultOpenDesktop = true,
  onPrev,
  onNext,
  onToday,
  children,
}) {
  const { isOpen, toggleOpen } = usePeriodHeaderState(defaultOpenDesktop);

  return (
    <>
      <PeriodHeaderButton
        label={label}
        rangeText={rangeText}
        isOpen={isOpen}
        onToggle={toggleOpen}
      />
      <PeriodHeaderPanel
        isOpen={isOpen}
        onPrev={onPrev}
        onNext={onNext}
        onToday={onToday}
        children={children}
      />
    </>
  );
}

