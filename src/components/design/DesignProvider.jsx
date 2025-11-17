import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  DEFAULT_DESIGN,
  generateCSSVariables,
  normalizeDesign,
} from "./designConfig";
import {
  getAllPresets,
  saveCustomPreset,
  deleteCustomPreset,
  isBuiltInPreset,
} from "./DesignPresets";
import {
  DESIGN_PRESETS,
  findPresetById,
  getDefaultPreset,
} from "./BasePresets";

const DesignContext = createContext({
  design: DEFAULT_DESIGN,
  setDesign: () => {},
  setDesignPartial: () => {},
  resetDesign: () => {},
  loadPreset: () => ({ success: false }),
  exportDesign: () => '',
  importDesign: () => ({ success: false }),
  config: DEFAULT_DESIGN,
  setConfig: () => {},
  reset: () => {},
  presets: {},
  deleteDesignPreset: () => {},
  isBuiltInPreset: () => false,
  // Nuevos: sistema de presets base
      currentPresetId: 'studia',
  setPresetId: () => {},
  basePresets: DESIGN_PRESETS,
});

export function useDesign() {
  return useContext(DesignContext);
}

/**
 * Helper para actualizar un objeto anidado usando un path
 * Ejemplo: setDesignPartial('colors.primary', '#FF0000')
 */
function setNestedValue(obj, path, value) {
  const keys = path.split('.');
  const lastKey = keys.pop();
  const target = keys.reduce((current, key) => {
    if (!current[key] || typeof current[key] !== 'object') {
      current[key] = {};
    }
    return current[key];
  }, obj);
  target[lastKey] = value;
  return { ...obj };
}

export function DesignProvider({ children }) {
  // Estado para presetId base (solo 'studia' disponible)
  const [presetId, setPresetId] = useState(() => {
    try {
      const saved = localStorage.getItem("studia_base_preset_id");
      if (saved && findPresetById(saved)) {
        return saved;
      }
    } catch (_) {}
    return 'studia'; // Preset único oficial
  });

  // Helper para derivar colores dark desde colores light
  // Usa los mismos colores cálidos que PRESET_STUDIA_DARK para mantener consistencia
  const deriveDarkColors = (lightColors) => {
    return {
      ...lightColors,
      // REGLA: primary SIEMPRE #fd9840 (obligatorio, no cambia en dark)
      primary: lightColors.primary || '#fd9840',
      primarySoft: '#2A1F16',     // Versión oscura cálida del primary soft
      secondary: lightColors.secondary || '#FB8C3A',
      // Estados mantienen coherencia
      success: lightColors.success || '#10B981',
      warning: lightColors.warning || '#F59E0B',
      danger: lightColors.danger || '#EF4444',
      info: lightColors.info || '#3B82F6',
      // Neutrales: fondos oscuros con tinte cálido (marrón oscuro/negro cálido)
      background: '#1A1512',      // Negro cálido (marrón muy oscuro)
      surface: '#231D18',         // Superficie oscura cálida
      surfaceElevated: '#2A241F', // Superficie elevada oscura cálida
      surfaceMuted: '#1F1915',   // Gris oscuro cálido
      // Colores de texto oscuros cálidos
      text: {
        primary: '#F5F0E8',       // Texto claro cálido (crema claro)
        secondary: '#D4C4B0',    // Gris claro cálido (beige claro)
        muted: '#A69581',         // Gris medio cálido
        inverse: '#1A1512',       // Fondo oscuro para texto inverso
      },
      // Colores de borde oscuros cálidos
      border: {
        default: '#3A3229',       // Bordes oscuros cálidos (marrón oscuro)
        muted: '#2A241F',
        strong: '#4A3F35',        // Bordes oscuros cálidos más marcados
      },
    };
  };

  // Helper para derivar chrome dark (sidebar, header) desde chrome light
  const deriveDarkChrome = () => {
    return {
      sidebar: {
        background: '#231D18',    // Sidebar oscuro cálido coherente
        border: '#3A3229',        // Borde oscuro cálido
        activeItemBg: '#2A1F16', // Item activo oscuro cálido (primary soft oscuro)
        activeItemText: '#F5F0E8', // Texto claro cálido
        mutedItemText: '#A69581', // Texto muted cálido
      },
      header: {
        background: '#2A241F',     // Header oscuro cálido
        border: '#3A3229',        // Borde oscuro cálido
      },
    };
  };

  // Helper para derivar controls dark desde controls light
  const deriveDarkControls = () => {
    return {
      field: {
        height: '2.5rem',
        background: '#231D18',    // Fondo oscuro cálido
        border: '#3A3229',        // Borde oscuro cálido
        radius: 'lg',
      },
      button: {
        height: '2.5rem',
        radius: 'lg',
        shadow: 'md',             // Sombra más pronunciada en oscuro
      },
      search: {
        background: '#231D18',    // Fondo oscuro cálido
        border: '#3A3229',        // Borde oscuro cálido
        radius: 'lg',
        height: '2.5rem',
      },
    };
  };

  // Estado para el diseño actual
  const [design, setDesign] = useState(() => {
    try {
      const custom = localStorage.getItem("custom_design_preset");
      if (custom) {
        const parsed = JSON.parse(custom);
        // Normalizar para asegurar estructura completa con merge profundo
        const normalized = normalizeDesign(parsed);
        // Si el tema es dark, aplicar colores dark, chrome y controls
        if (normalized.theme === 'dark') {
          return {
            ...normalized,
            colors: deriveDarkColors(normalized.colors),
            chrome: deriveDarkChrome(),
            controls: deriveDarkControls(),
          };
        }
        return normalized;
      }
    } catch (_) {}
    // Si no hay custom, usar el preset base por defecto
    const defaultPreset = findPresetById(presetId) || getDefaultPreset();
    const normalized = normalizeDesign(defaultPreset.design);
    // Si el preset tiene theme dark, aplicar colores dark, chrome y controls
    if (normalized.theme === 'dark') {
      return {
        ...normalized,
        colors: deriveDarkColors(normalized.colors),
        chrome: deriveDarkChrome(),
        controls: deriveDarkControls(),
      };
    }
    return normalized;
  });

  // Función para cambiar de preset base
  const handleSetPresetId = (id) => {
    const preset = findPresetById(id);
    if (preset) {
      setPresetId(id);
      // Limpiar preset personalizado al cambiar de preset base
      localStorage.removeItem("custom_design_preset");
      const normalized = normalizeDesign(preset.design);
      // Si el tema actual es dark, aplicar colores dark, chrome y controls
      if (normalized.theme === 'dark') {
        setDesign({
          ...normalized,
          colors: deriveDarkColors(normalized.colors),
          chrome: deriveDarkChrome(),
          controls: deriveDarkControls(),
        });
      } else {
        setDesign(normalized);
      }
    }
  };

  // Cuando cambie presetId, guardar en localStorage
  useEffect(() => {
    localStorage.setItem("studia_base_preset_id", presetId);
  }, [presetId]);

  // Generar e inyectar CSS variables en el DOM
  useEffect(() => {
    try {
      // Normalizar design antes de generar variables
      const normalized = normalizeDesign(design);
      const root = document.documentElement;
      
      // Aplicar clase de serif si corresponde
      if (normalized.typography?.serifHeadings) {
        document.body.classList.add('ds-serif');
      } else {
        document.body.classList.remove('ds-serif');
      }
      
      // Aplicar clase de densidad
      document.body.classList.remove('ds-density-compact', 'ds-density-normal', 'ds-density-spacious');
      document.body.classList.add(`ds-density-${normalized.layout?.density || 'normal'}`);

      // Alternar modo oscuro/claro según el preset activo
      // Si es 'system', detectar la preferencia del sistema
      let effectiveTheme = normalized.theme;
      let designToUse = normalized;
      
      if (normalized.theme === 'system') {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        effectiveTheme = prefersDark ? 'dark' : 'light';
        
        // Si el sistema prefiere dark, aplicar colores dark temporalmente
        if (prefersDark) {
          designToUse = {
            ...normalized,
            colors: deriveDarkColors(normalized.colors),
            chrome: deriveDarkChrome(),
            controls: deriveDarkControls(),
          };
        }
      } else if (normalized.theme === 'dark') {
        designToUse = {
          ...normalized,
          colors: deriveDarkColors(normalized.colors),
          chrome: deriveDarkChrome(),
          controls: deriveDarkControls(),
        };
      }
      
      // Aplicar variables CSS del diseño correcto
      const finalVars = generateCSSVariables(designToUse);
      Object.entries(finalVars).forEach(([key, value]) => {
        root.style.setProperty(key, value);
      });
      
      // Aplicar clase dark según el tema efectivo
      if (effectiveTheme === 'dark') {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    } catch (error) {
      console.error('Error generando CSS variables:', error);
      // En caso de error, usar diseño por defecto
      const vars = generateCSSVariables(DEFAULT_DESIGN);
      const root = document.documentElement;
      Object.entries(vars).forEach(([key, value]) => {
        root.style.setProperty(key, value);
      });
    }
  }, [design]);

  // Guardar preset cuando cambie
  useEffect(() => {
    try {
      localStorage.setItem("custom_design_preset", JSON.stringify(design));
    } catch (e) {
      console.error("Failed to save design preset", e);
    }
  }, [design]);

  // Detectar cambios en la preferencia del sistema cuando el tema es 'system'
  // Esto fuerza una re-renderización cuando cambia la preferencia del sistema
  useEffect(() => {
    if (design?.theme !== 'system') return;
    
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      // Forzar actualización del diseño para que se re-evalúe el tema efectivo
      setDesign(prev => ({ ...prev }));
    };
    
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [design?.theme]);

  // Actualizar parcialmente el diseño usando un path
  const setDesignPartial = (path, value) => {
    setDesign(prev => {
      const updated = setNestedValue(prev, path, value);
      
      // Si se cambia el tema
      if (path === 'theme') {
        const normalized = normalizeDesign(updated);
        
        // Si es dark, aplicar colores dark
        if (value === 'dark') {
        return {
            ...normalized,
          colors: deriveDarkColors(normalized.colors),
            chrome: deriveDarkChrome(),
            controls: deriveDarkControls(),
            theme: 'dark',
        };
      }
      
        // Si es light, restaurar colores light del preset base
        if (value === 'light') {
          const preset = findPresetById(presetId) || getDefaultPreset();
          const normalizedPreset = normalizeDesign(preset.design);
          return {
            ...normalizedPreset,
            theme: 'light',
          };
        }
        
        // Si es system, mantener colores light pero marcar como system
        if (value === 'system') {
        const preset = findPresetById(presetId) || getDefaultPreset();
          const normalizedPreset = normalizeDesign(preset.design);
        return {
            ...normalizedPreset,
            theme: 'system',
        };
        }
      }
      
      return updated;
    });
  };

  // Resetear a valores por defecto
  const resetDesign = () => {
    setDesign(DEFAULT_DESIGN);
  };

  // Cargar un preset
  const loadPreset = (presetId) => {
    const presets = getAllPresets();
    const preset = presets[presetId];
    if (preset) {
      // Normalizar para asegurar estructura completa
      setDesign(normalizeDesign(preset.config));
      return { success: true };
    }
    return { success: false, error: 'Preset no encontrado' };
  };

  // Exportar diseño actual como JSON
  const exportDesign = () => {
    return JSON.stringify(design, null, 2);
  };

  // Importar diseño desde JSON
  const importDesign = (jsonString) => {
    try {
      const imported = JSON.parse(jsonString);
      // Validar estructura básica
      if (typeof imported !== 'object') {
        throw new Error('Formato inválido');
      }
      // Normalizar para asegurar estructura completa
      setDesign(normalizeDesign(imported));
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const value = useMemo(
    () => ({
      design,
      setDesign,
      setDesignPartial,
      resetDesign,
      loadPreset,
      exportDesign,
      importDesign,
      // Aliases para compatibilidad con código existente
      config: design,
      setConfig: setDesign,
      reset: resetDesign,
      // Funciones originales
      presets: getAllPresets(),
      deleteDesignPreset: () => {
        deleteCustomPreset();
        setDesign(DEFAULT_DESIGN);
      },
      isBuiltInPreset,
      // Nuevos: sistema de presets base
      currentPresetId: presetId || 'studia',
      setPresetId: handleSetPresetId,
      basePresets: DESIGN_PRESETS,
    }),
    [design, presetId]
  );

  return (
    <DesignContext.Provider value={value}>
      {children}
    </DesignContext.Provider>
  );
}
