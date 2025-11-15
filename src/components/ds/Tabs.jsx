import React from "react";

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
  className = ""
}) {
  const activeItem = items.find(item => item.value === value);

  if (variant === "segmented") {
    return (
      <div className="space-y-6">
        <div 
          className={`segmented-tabs ${className}`}
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
                className={`segmented-btn ${isActive ? 'segmented-btn-active' : ''}`}
                role="tab"
                aria-selected={isActive}
                aria-current={isActive ? "true" : undefined}
                tabIndex={isActive ? 0 : -1}
              >
                {Icon && <Icon className="w-4 h-4 sm:mr-2" />}
                <span className={Icon ? "hidden sm:inline" : ""}>{item.label}</span>
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

  // Variante underline
  return (
    <div className="space-y-6">
      <div 
        className={`tabs-underline ${className}`}
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
              className={`tab-underline ${isActive ? 'tab-underline-active' : ''}`}
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