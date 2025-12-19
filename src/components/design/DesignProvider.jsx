import React, {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
  useCallback,
} from "react";

import {
  DEFAULT_DESIGN,
  generateCSSVariables,
  normalizeDesign,
  // New imports for refactored model
  createDefaultDesignBase,
  migrateToDesignBase,
  mergeDesignWithMode,
  diffDesignPartitioned,
  applyChangeToOverlay,
  revertChangeInOverlay,
  DARK_MODE_DEFAULTS,
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

// ============================================================================
// STORAGE KEYS
// ============================================================================
const STORAGE_KEYS = {
  BASE_DESIGN: "studia_design_base_v2",    // Nuevo: estructura DesignBase
  LEGACY_DESIGN: "custom_design_preset",    // Legacy: para migración
  PREVIEW_OVERLAY: "studia_preview_overlay", // sessionStorage
  ACTIVE_MODE: "studia_active_mode",         // localStorage: 'light'|'dark'
  BASE_PRESET_ID: "studia_base_preset_id",   // ID del preset base
};

// ============================================================================
// CONTEXT
// ============================================================================
const DesignContext = createContext({
  // Estado principal
  baseDesign: null,
  activeMode: 'light',
  previewOverlay: null,
  isPreviewActive: false,
  effectiveDesign: DEFAULT_DESIGN,

  // Acciones de modo
  setActiveMode: () => { },

  // Acciones de preview
  setDesignPartial: () => { },
  clearPreview: () => { },
  revertChange: () => { },

  // Diffs particionados
  getPartitionedDiff: () => ({ common: [], light: [], dark: [] }),

  // Export
  exportFull: () => ({}),
  exportDiff: () => ({}),
  exportFullAndDiff: () => ({}),

  // Legacy compatibility
  design: DEFAULT_DESIGN,
  setDesign: () => { },
  resetDesign: () => { },
  loadPreset: () => ({ success: false }),
  exportDesign: () => '',
  importDesign: () => ({ success: false }),
  config: DEFAULT_DESIGN,
  setConfig: () => { },
  reset: () => { },
  presets: {},
  deleteDesignPreset: () => { },
  isBuiltInPreset: () => false,
  currentPresetId: 'studia',
  setPresetId: () => { },
  basePresets: DESIGN_PRESETS,
  // Deprecated - removed commitPreview
  previewDesign: null,
  setPreviewDesign: () => { },
  getDesignDiff: () => [],
});

export function useDesign() {
  return useContext(DesignContext);
}

export function DesignProvider({ children }) {
  // ============================================================================
  // ESTADO: MODO ACTIVO (light/dark) - NO genera diffs
  // ============================================================================
  const [activeMode, setActiveModeState] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.ACTIVE_MODE);
      if (saved === 'light' || saved === 'dark') return saved;
    } catch (_) { }
    return 'light';
  });

  const setActiveMode = useCallback((mode) => {
    if (mode !== 'light' && mode !== 'dark') return;
    setActiveModeState(mode);
    localStorage.setItem(STORAGE_KEYS.ACTIVE_MODE, mode);
  }, []);

  // ============================================================================
  // ESTADO: PRESET BASE ID (para futuras expansiones, solo 'studia' por ahora)
  // ============================================================================
  const [presetId, setPresetIdState] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.BASE_PRESET_ID);
      if (saved && findPresetById(saved)) return saved;
    } catch (_) { }
    return 'studia';
  });

  // ============================================================================
  // ESTADO: BASE DESIGN (DesignBase con common + modes)
  // ============================================================================
  const [baseDesign, setBaseDesign] = useState(() => {
    try {
      // 1. Intentar cargar nueva estructura
      const newFormat = localStorage.getItem(STORAGE_KEYS.BASE_DESIGN);
      if (newFormat) {
        const parsed = JSON.parse(newFormat);
        if (parsed.common && parsed.modes) {
          return parsed;
        }
      }

      // 2. Migrar desde formato legacy si existe
      const legacy = localStorage.getItem(STORAGE_KEYS.LEGACY_DESIGN);
      if (legacy) {
        const parsed = JSON.parse(legacy);
        const migrated = migrateToDesignBase(parsed);
        // Guardar en nuevo formato y limpiar legacy
        localStorage.setItem(STORAGE_KEYS.BASE_DESIGN, JSON.stringify(migrated));
        localStorage.removeItem(STORAGE_KEYS.LEGACY_DESIGN);
        console.log('[DesignProvider] Migrated legacy design to new format');
        return migrated;
      }

      // 3. Usar preset base por defecto
      return createDefaultDesignBase();
    } catch (error) {
      console.error('[DesignProvider] Error loading base design:', error);
      return createDefaultDesignBase();
    }
  });

  // Persistir base design cuando cambie
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.BASE_DESIGN, JSON.stringify(baseDesign));
    } catch (error) {
      console.error('[DesignProvider] Error saving base design:', error);
    }
  }, [baseDesign]);

  // ============================================================================
  // ESTADO: PREVIEW OVERLAY (sessionStorage - solo sesión)
  // ============================================================================
  const [previewOverlay, setPreviewOverlay] = useState(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEYS.PREVIEW_OVERLAY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && (parsed.common || parsed.modes)) {
          return parsed;
        }
      }
    } catch (_) { }
    return null;
  });

  // Persistir preview overlay en sessionStorage
  useEffect(() => {
    try {
      if (previewOverlay) {
        sessionStorage.setItem(STORAGE_KEYS.PREVIEW_OVERLAY, JSON.stringify(previewOverlay));
      } else {
        sessionStorage.removeItem(STORAGE_KEYS.PREVIEW_OVERLAY);
      }
    } catch (error) {
      console.error('[DesignProvider] Error saving preview overlay:', error);
    }
  }, [previewOverlay]);

  // ============================================================================
  // COMPUTED: PREVIEW ACTIVO, EFFECTIVE DESIGN
  // ============================================================================
  const isPreviewActive = previewOverlay !== null &&
    (Object.keys(previewOverlay.common || {}).length > 0 ||
      Object.keys(previewOverlay.modes?.light || {}).length > 0 ||
      Object.keys(previewOverlay.modes?.dark || {}).length > 0);

  const effectiveDesign = useMemo(() => {
    return mergeDesignWithMode(baseDesign, activeMode, previewOverlay);
  }, [baseDesign, activeMode, previewOverlay]);

  // ============================================================================
  // ACCIONES: MODIFICAR PREVIEW OVERLAY
  // ============================================================================

  /**
   * setDesignPartial - Modifica un token en el overlay
   * @param {string} path - Ruta del token (ej: 'colors.primary')
   * @param {any} value - Nuevo valor
   * @param {string} scope - 'common' | 'light' | 'dark' (default: según activeMode si es color, sino common)
   */
  const setDesignPartial = (path, value, explicitScope) => {
    // Determinar scope automáticamente si no se especifica
    let scope = explicitScope;
    if (!scope) {
      // Los colores, chrome y controls van al modo activo por defecto
      // Todo lo demás va a common
      const modeSpecificPaths = ['colors.', 'chrome.', 'controls.', 'colors'];
      const isModeSpecific = modeSpecificPaths.some(p => path.startsWith(p) || path === p);
      scope = isModeSpecific ? activeMode : 'common';
    }

    const newOverlay = applyChangeToOverlay(previewOverlay, path, value, scope);
    setPreviewOverlay(newOverlay);
  };

  /**
   * clearPreview - Limpia todo el overlay y vuelve al base
   */
  const clearPreview = () => {
    setPreviewOverlay(null);
  };

  /**
   * revertChange - Revierte un cambio específico del overlay
   */
  const revertChange = (path, scope) => {
    const newOverlay = revertChangeInOverlay(previewOverlay, path, scope);
    setPreviewOverlay(newOverlay);
  };

  // ============================================================================
  // DIFFS PARTICIONADOS
  // ============================================================================
  const getPartitionedDiff = () => {
    return diffDesignPartitioned(baseDesign, previewOverlay);
  };

  // ============================================================================
  // EXPORTS
  // ============================================================================
  const exportFull = () => {
    return {
      type: 'full',
      timestamp: new Date().toISOString(),
      baseDesign: baseDesign,
    };
  };

  const exportDiff = () => {
    return {
      type: 'diff',
      timestamp: new Date().toISOString(),
      overlay: previewOverlay || { common: {}, modes: { light: {}, dark: {} } },
      diff: getPartitionedDiff(),
    };
  };

  const exportFullAndDiff = () => {
    return {
      type: 'full+diff',
      timestamp: new Date().toISOString(),
      baseDesign: baseDesign,
      overlay: previewOverlay || { common: {}, modes: { light: {}, dark: {} } },
      diff: getPartitionedDiff(),
    };
  };

  // ============================================================================
  // INYECCIÓN DE CSS VARIABLES
  // ============================================================================
  useLayoutEffect(() => {
    try {
      const root = document.documentElement;
      const design = effectiveDesign;

      // Aplicar clases de tipografía
      if (design.typography?.serifHeadings) {
        document.body.classList.add('ds-serif');
      } else {
        document.body.classList.remove('ds-serif');
      }

      // Aplicar clase de densidad
      document.body.classList.remove('ds-density-compact', 'ds-density-normal', 'ds-density-spacious');
      document.body.classList.add(`ds-density-${design.layout?.density || 'normal'}`);

      // Generar y aplicar CSS variables
      const vars = generateCSSVariables(design);
      Object.entries(vars).forEach(([key, value]) => {
        root.style.setProperty(key, value);
      });

      // Aplicar clase dark/light según activeMode
      if (activeMode === 'dark') {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    } catch (error) {
      console.error('[DesignProvider] Error applying CSS variables:', error);
      // Fallback to defaults
      const vars = generateCSSVariables(DEFAULT_DESIGN);
      const root = document.documentElement;
      Object.entries(vars).forEach(([key, value]) => {
        root.style.setProperty(key, value);
      });
    }
  }, [effectiveDesign, activeMode]);

  // ============================================================================
  // LEGACY COMPATIBILITY (para componentes que aún usan la API antigua)
  // ============================================================================

  // "design" plano para compatibilidad
  const legacyDesign = effectiveDesign;

  const setDesignLegacy = (newDesign) => {
    // Migrar a nuevo formato y setear como base
    const migrated = migrateToDesignBase(newDesign);
    setBaseDesign(migrated);
    setPreviewOverlay(null);
  };

  const resetDesign = () => {
    setBaseDesign(createDefaultDesignBase());
    setPreviewOverlay(null);
  };

  const loadPreset = (presetIdParam) => {
    const presets = getAllPresets();
    const preset = presets[presetIdParam];
    if (preset?.config) {
      const migrated = migrateToDesignBase(preset.config);
      setBaseDesign(migrated);
      setPreviewOverlay(null);
      return { success: true };
    }
    return { success: false, error: 'Preset no encontrado' };
  };

  const exportDesign = () => {
    return JSON.stringify(effectiveDesign, null, 2);
  };

  const importDesign = (jsonString) => {
    try {
      const imported = JSON.parse(jsonString);
      if (typeof imported !== 'object') {
        throw new Error('Formato inválido');
      }
      const migrated = migrateToDesignBase(imported);
      setBaseDesign(migrated);
      setPreviewOverlay(null);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const handleSetPresetId = (id) => {
    const preset = findPresetById(id);
    if (!preset) return;

    // If this preset is already active AND there's no preview overlay, do nothing
    // This is the expected behavior when there's only one theme - clicking it shouldn't change anything
    const isAlreadyActive = presetId === id;
    const hasNoPreview = previewOverlay === null ||
      (Object.keys(previewOverlay.common || {}).length === 0 &&
        Object.keys(previewOverlay.modes?.light || {}).length === 0 &&
        Object.keys(previewOverlay.modes?.dark || {}).length === 0);

    if (isAlreadyActive && hasNoPreview) {
      // Already on this preset with no changes - do nothing
      return;
    }

    // If clicking on a DIFFERENT preset, load it as preview
    if (!isAlreadyActive) {
      setPresetIdState(id);
      localStorage.setItem(STORAGE_KEYS.BASE_PRESET_ID, id);
      const migrated = migrateToDesignBase(preset.design);
      setPreviewOverlay({
        common: migrated.common || {},
        modes: migrated.modes || { light: {}, dark: {} },
      });
    } else {
      // Same preset but has preview - just clear the preview to reset to base
      setPreviewOverlay(null);
    }
  };

  // Legacy getDesignDiff (returns flat array for old components)
  const legacyGetDesignDiff = () => {
    const partitioned = getPartitionedDiff();
    return [...partitioned.common, ...partitioned.light, ...partitioned.dark];
  };

  // Legacy revertChange (needs scope extraction)
  const legacyRevertChange = (path, originalValue) => {
    // Find which scope this path is in
    const partitioned = getPartitionedDiff();
    let scope = 'common';
    if (partitioned.light.some(c => c.path === path)) scope = 'light';
    else if (partitioned.dark.some(c => c.path === path)) scope = 'dark';
    revertChange(path, scope);
  };

  // ============================================================================
  // CONTEXT VALUE
  // ============================================================================
  const value = useMemo(() => ({
    // New API
    baseDesign,
    activeMode,
    setActiveMode,
    previewOverlay,
    isPreviewActive,
    effectiveDesign,
    setDesignPartial,
    clearPreview,
    revertChange,
    getPartitionedDiff,
    exportFull,
    exportDiff,
    exportFullAndDiff,

    // Legacy API (for backward compatibility)
    design: legacyDesign,
    setDesign: setDesignLegacy,
    resetDesign,
    loadPreset,
    exportDesign,
    importDesign,
    config: legacyDesign,
    setConfig: setDesignLegacy,
    reset: resetDesign,
    presets: getAllPresets(),
    deleteDesignPreset: () => {
      deleteCustomPreset();
      resetDesign();
    },
    isBuiltInPreset,
    currentPresetId: presetId,
    setPresetId: handleSetPresetId,
    basePresets: DESIGN_PRESETS,

    // Legacy preview API (deprecated, for compatibility)
    previewDesign: isPreviewActive ? effectiveDesign : null,
    setPreviewDesign: (d) => {
      if (d) {
        const migrated = migrateToDesignBase(d);
        setPreviewOverlay({
          common: migrated.common,
          modes: migrated.modes,
        });
      } else {
        clearPreview();
      }
    },
    getDesignDiff: legacyGetDesignDiff,
    // NOTE: commitPreview removed - use export instead
  }), [
    baseDesign,
    activeMode,
    previewOverlay,
    isPreviewActive,
    effectiveDesign,
    presetId,
  ]);

  return (
    <DesignContext.Provider value={value}>
      {children}
    </DesignContext.Provider>
  );
}
