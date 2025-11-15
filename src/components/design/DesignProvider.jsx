import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { DEFAULT_DESIGN } from "@/components/design/design.config";
import { getAllPresets, saveCustomPreset, deleteCustomPreset, isBuiltInPreset } from "@/components/design/DesignPresets";

const DesignContext = createContext(null);

const LS_KEY = "studia.design.v1";

/**
 * Aplica la configuración de diseño a CSS variables
 */
function applyToCSS(config) {
  const root = document.documentElement;
  
  // Radios
  const cardRadius = config.radius.card === '2xl' ? '1.25rem' : config.radius.card === 'xl' ? '1rem' : '0.75rem';
  const ctrlRadius = config.radius.controls === 'xl' ? '1rem' : '0.75rem';
  
  root.style.setProperty('--radius-card', cardRadius);
  root.style.setProperty('--radius-ctrl', ctrlRadius);
  root.style.setProperty('--radius-pill', '0.5rem');
  
  // Sombras
  const shadowValue = 
    config.shadow === 'card' ? '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)' :
    config.shadow === 'md' ? '0 4px 12px rgba(0,0,0,0.08)' :
    'none';
  root.style.setProperty('--shadow-card', shadowValue);
  
  // Densidad (espaciados para cards/headers)
  const headerPad = config.density === 'compact' ? '1rem' : '1.5rem';
  const contentPad = config.density === 'compact' ? '0.75rem' : '1rem';
  root.style.setProperty('--space-card-header', headerPad);
  root.style.setProperty('--space-card-content', contentPad);
  
  // Focus ring
  const focusRing = config.focus === 'orange' 
    ? '0 0 0 3px rgba(253,152,64,0.35)' 
    : '0 0 0 3px rgba(59,130,246,0.35)';
  root.style.setProperty('--focus-ring', focusRing);
  
  // Toggle serif en headings
  document.body.classList.toggle('ds-serif', !!config.serifHeadings);
}

export function DesignProvider({ children }) {
  // Siempre inicializar con DEFAULT_DESIGN, ignorando localStorage
  const [config, setConfigState] = useState(DEFAULT_DESIGN);

  const setConfig = (newConfig) => {
    setConfigState(newConfig);
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(newConfig));
    } catch (err) {
      console.warn('No se pudo guardar config de diseño:', err);
    }
  };

  const reset = () => {
    setConfig(DEFAULT_DESIGN);
  };

  const loadPreset = (presetId) => {
    const presets = getAllPresets();
    const preset = presets[presetId];
    if (preset) {
      setConfig(preset.config);
      return { success: true };
    }
    return { success: false, error: 'Preset no encontrado' };
  };

  const saveAsPreset = (id, name, description) => {
    return saveCustomPreset(id, name, description, config);
  };

  const deletePreset = (id) => {
    if (isBuiltInPreset(id)) {
      return { success: false, error: 'No se pueden eliminar presets built-in' };
    }
    return deleteCustomPreset(id);
  };

  useEffect(() => {
    applyToCSS(config);
  }, [config]);

  const value = useMemo(() => ({ 
    config, 
    setConfig, 
    reset,
    loadPreset,
    saveAsPreset,
    deletePreset,
    getAllPresets,
  }), [config]);

  return (
    <DesignContext.Provider value={value}>
      {children}
    </DesignContext.Provider>
  );
}

export function useDesign() {
  const ctx = useContext(DesignContext);
  if (!ctx) {
    throw new Error('useDesign debe usarse dentro de DesignProvider');
  }
  return ctx;
}