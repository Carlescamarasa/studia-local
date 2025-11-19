import React, {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
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
  // Paleta de grises neutros con acentos en color de marca
  // Ajustado para mantener ratios de contraste WCAG similares al modo claro
  const deriveDarkColors = (lightColors) => {
    return {
      ...lightColors,
      // REGLA: primary SIEMPRE #fd9840 (obligatorio, no cambia en dark)
      primary: lightColors.primary || '#fd9840',
      primarySoft: 'rgba(253, 152, 64, 0.1)', // Versión oscura del primary soft con opacidad
      secondary: lightColors.secondary || '#FB8C3A',
      accent: lightColors.accent || '#F97316', // Color de marca para acentos
      // Estados mantienen coherencia
      success: lightColors.success || '#10B981',
      warning: lightColors.warning || '#F59E0B',
      danger: lightColors.danger || '#EF4444',
      info: lightColors.info || '#3B82F6',
      // Neutrales: fondos oscuros ajustados para contraste similar al modo claro
      // Modo claro: background #FFFFFF, surface #F9FAFB (diff: ~0.4% más oscuro)
      // Modo oscuro equivalente: background más claro, surface ligeramente más claro
      background: '#121212',      // Fondo oscuro (contraste ~16:1 con texto blanco, similar a #FFFFFF vs #1A1F2E)
      surface: '#1A1A1A',         // Superficie oscura (contraste ~15:1, similar a #F9FAFB vs #1A1F2E)
      surfaceElevated: '#242424', // Superficie elevada (contraste ~14:1, similar a #FFFFFF vs #1A1F2E pero menos marcado)
      surfaceMuted: '#171717',    // Elementos muted (contraste ~15.5:1, similar a #F3F4F6 vs #1A1F2E)
      // Colores de texto ajustados para ratios similares al modo claro
      // Modo claro: primary #1A1F2E (~16:1), secondary #4A5568 (~8:1), muted #718096 (~5:1)
      text: {
        primary: '#FFFFFF',       // Texto blanco puro (contraste ~16:1 con background, igual que modo claro)
        secondary: '#B4B4B4',     // Gris claro (contraste ~8:1 con surface, similar a #4A5568 en claro)
        muted: '#929292',         // Gris medio (contraste ~5:1 con surface, similar a #718096 en claro)
        inverse: '#1A1F2E',       // Fondo oscuro para texto inverso (contraste con blanco)
      },
      // Colores de borde ajustados para visibilidad similar al modo claro
      // Modo claro: default #E2E8F0, muted #EDF2F7, strong #CBD5E0 (diferencias sutiles pero visibles)
      border: {
        default: '#3A3A3A',       // Bordes visibles (contraste ~6:1 con surface, similar a #E2E8F0 en claro)
        muted: '#2A2A2A',         // Bordes muted (contraste ~9:1 con surface, similar a #EDF2F7 en claro)
        strong: '#4D4D4D',        // Bordes fuertes (contraste ~4:1 con surface, similar a #CBD5E0 en claro)
      },
    };
  };

  // Helper para derivar chrome dark (sidebar, header) desde chrome light
  // Modo claro: sidebar #F9FAFB, header #FFFFFF (diferencia sutil)
  const deriveDarkChrome = () => {
    return {
      sidebar: {
        background: '#1A1A1A',    // Sidebar (igual que surface) - contraste consistente
        border: '#4D4D4D',        // Borde (igual que border.strong) - visibilidad similar al modo claro
        activeItemBg: 'rgba(253, 152, 64, 0.15)', // Item activo con color de marca más visible
        activeItemText: '#FFFFFF', // Texto blanco (contraste ~13:1 con sidebar, similar al modo claro)
        mutedItemText: '#929292', // Texto muted (igual que text.muted) - consistencia
      },
      header: {
        background: '#242424',     // Header (igual que surfaceElevated) - contraste mejorado
        border: '#3A3A3A',         // Borde (igual que border.default) - visibilidad similar al modo claro
      },
    };
  };

  // Helper para derivar controls dark desde controls light
  // Modo claro: field background #FFFFFF, border #E2E8F0 (contraste alto)
  const deriveDarkControls = () => {
    return {
      field: {
        height: '2.5rem',
        background: '#1F1F1F',    // Fondo oscuro (contraste ~15:1 con texto, similar a #FFFFFF en claro)
        border: '#3A3A3A',        // Borde (igual que border.default) - visibilidad consistente
        radius: 'lg',
      },
      button: {
        height: '2.5rem',
        radius: 'lg',
        shadow: 'md',             // Sombra más pronunciada en oscuro para profundidad
      },
      search: {
        background: '#1F1F1F',    // Fondo oscuro (igual que field) - consistencia
        border: '#3A3A3A',        // Borde (igual que border.default) - visibilidad consistente
        radius: 'lg',
        height: '2.5rem',
      },
    };
  };

  // Estado para el diseño actual
  const [design, setDesign] = useState(() => {
    let initialDesign;
    try {
      const custom = localStorage.getItem("custom_design_preset");
      if (custom) {
        const parsed = JSON.parse(custom);
        // Normalizar para asegurar estructura completa con merge profundo
        const normalized = normalizeDesign(parsed);
        // Si el tema es dark, aplicar colores dark, chrome y controls
        if (normalized.theme === 'dark') {
          initialDesign = {
            ...normalized,
            colors: deriveDarkColors(normalized.colors),
            chrome: deriveDarkChrome(),
            controls: deriveDarkControls(),
          };
        } else {
          initialDesign = normalized;
        }
      } else {
        // Si no hay custom, usar el preset base por defecto
        const defaultPreset = findPresetById(presetId) || getDefaultPreset();
        const normalized = normalizeDesign(defaultPreset.design);
        // Si el preset tiene theme dark, aplicar colores dark, chrome y controls
        if (normalized.theme === 'dark') {
          initialDesign = {
            ...normalized,
            colors: deriveDarkColors(normalized.colors),
            chrome: deriveDarkChrome(),
            controls: deriveDarkControls(),
          };
        } else {
          initialDesign = normalized;
        }
      }
    } catch (_) {
      // En caso de error, usar diseño por defecto
      const defaultPreset = findPresetById(presetId) || getDefaultPreset();
      initialDesign = normalizeDesign(defaultPreset.design);
    }
    
    // Inicializar variables CSS de forma síncrona antes del primer render
    // Esto evita el flash de contenido sin estilos
    try {
      const normalized = normalizeDesign(initialDesign);
      const root = document.documentElement;
      
      // Determinar tema efectivo
      let effectiveTheme = normalized.theme;
      let designToUse = normalized;
      
      if (normalized.theme === 'system') {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        effectiveTheme = prefersDark ? 'dark' : 'light';
        
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
      
      // Aplicar variables CSS inmediatamente
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
      console.error('[DesignProvider] Error inicializando CSS variables:', {
        error: error?.message || error,
        presetId,
      });
      // En caso de error, usar diseño por defecto
      const vars = generateCSSVariables(DEFAULT_DESIGN);
      const root = document.documentElement;
      Object.entries(vars).forEach(([key, value]) => {
        root.style.setProperty(key, value);
      });
    }
    
    return initialDesign;
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
  // useLayoutEffect se ejecuta de forma síncrona antes de que el navegador pinte
  // Esto evita el flash de contenido sin estilos (FOUC)
  useLayoutEffect(() => {
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
      console.error('[DesignProvider] Error generando CSS variables:', {
        error: error?.message || error,
      });
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
      console.error('[DesignProvider] Error guardando preset de diseño:', {
        error: e?.message || e,
      });
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
