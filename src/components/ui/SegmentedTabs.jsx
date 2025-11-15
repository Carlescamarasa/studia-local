import React from "react";

/**
 * SegmentedTabs - Tabs tipo pill conectadas 100% al Design System
 * Responde a: radius, densidad, focus, y colores brand
 * Estados: hover, focus, active (seleccionado)
 */
export default function SegmentedTabs({ value, onChange, options, className = "" }) {
  return (
    <div 
      className={`segmented ${className}`} 
      role="tablist"
      aria-label="Pestañas de navegación"
    >
      {options.map((option) => {
        const isActive = value === option.value;
        return (
          <button
            key={option.value}
            onClick={() => onChange(option.value)}
            className={`segmented-btn ${isActive ? 'segmented-btn-active' : ''}`}
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