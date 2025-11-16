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
  currentPresetId: 'default',
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
  // Estado para presetId base (default, soft, contrast)
  const [presetId, setPresetId] = useState(() => {
    try {
      const saved = localStorage.getItem("studia_base_preset_id");
      if (saved && findPresetById(saved)) {
        return saved;
      }
    } catch (_) {}
    return 'default';
  });

  // Estado para el diseño actual
  const [design, setDesign] = useState(() => {
    try {
      const custom = localStorage.getItem("custom_design_preset");
      if (custom) {
        const parsed = JSON.parse(custom);
        // Normalizar para asegurar estructura completa con merge profundo
        return normalizeDesign(parsed);
      }
    } catch (_) {}
    // Si no hay custom, usar el preset base por defecto
    const defaultPreset = findPresetById(presetId) || getDefaultPreset();
    return normalizeDesign(defaultPreset.design);
  });

  // Función para cambiar de preset base
  const handleSetPresetId = (id) => {
    const preset = findPresetById(id);
    if (preset) {
      setPresetId(id);
      // Limpiar preset personalizado al cambiar de preset base
      localStorage.removeItem("custom_design_preset");
      setDesign(normalizeDesign(preset.design));
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
      const vars = generateCSSVariables(normalized);
      const root = document.documentElement;
      
      // Aplicar todas las variables CSS
      Object.entries(vars).forEach(([key, value]) => {
        root.style.setProperty(key, value);
      });
      
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
      if (normalized.theme === 'dark') {
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

  // Actualizar parcialmente el diseño usando un path
  const setDesignPartial = (path, value) => {
    setDesign(prev => setNestedValue(prev, path, value));
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
      currentPresetId: presetId,
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
