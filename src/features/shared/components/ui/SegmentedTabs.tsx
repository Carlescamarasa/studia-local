import React from "react";
import { cn } from "@/lib/utils";
import { componentStyles } from "@/design/componentStyles";

/**
 * SegmentedTabs - Tabs tipo pill conectadas 100% al Design System
 * Responde a: radius, densidad, focus, y colores brand
 * Estados: hover, focus, active (seleccionado)
 */
export default function SegmentedTabs({ value, onChange, options, className = "" }) {
  return (
    <div 
      className={cn(componentStyles.components.tabsSegmentedContainer, className)}
      role="tablist"
      aria-label="Pestañas de navegación"
    >
      {options.map((option) => {
        const isActive = value === option.value;
        return (
          <button
            key={option.value}
            onClick={() => onChange(option.value)}
            className={cn(
              componentStyles.components.tabsSegmentedButton,
              isActive && componentStyles.components.tabsSegmentedButtonActive
            )}
            role="tab"
            aria-selected={isActive}
            aria-current={isActive ? "true" : undefined}
            tabIndex={isActive ? 0 : -1}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}