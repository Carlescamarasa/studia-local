/**
 * Sistema de Presets del Design System
 * Permite guardar, cargar y gestionar múltiples configuraciones visuales
 */

import { DEFAULT_DESIGN } from './design.config';

export const BUILT_IN_PRESETS = {
  default: {
    name: 'Studia Default',
    description: 'Configuración predeterminada del sistema',
    config: {
      ...DEFAULT_DESIGN,
      brandHue: 26,
      typography: {
        ...DEFAULT_DESIGN.typography,
        serifHeadings: true,
      },
      layout: {
        ...DEFAULT_DESIGN.layout,
        density: 'normal',
        shadow: 'md',
      },
    }
  },
  minimal: {
    name: 'Minimal',
    description: 'Diseño limpio y minimalista',
    config: {
      ...DEFAULT_DESIGN,
      brandHue: 26,
      typography: {
        ...DEFAULT_DESIGN.typography,
        serifHeadings: false,
      },
      layout: {
        ...DEFAULT_DESIGN.layout,
        density: 'compact',
        shadow: 'none',
      },
    }
  },
  comfortable: {
    name: 'Comfortable',
    description: 'Espaciado amplio y radios generosos',
    config: {
      ...DEFAULT_DESIGN,
      brandHue: 26,
      typography: {
        ...DEFAULT_DESIGN.typography,
        serifHeadings: true,
      },
      layout: {
        ...DEFAULT_DESIGN.layout,
        radius: {
          ...DEFAULT_DESIGN.layout.radius,
          card: '2xl',
          controls: 'xl',
        },
        density: 'spacious',
        shadow: 'card',
      },
    }
  },
  sharp: {
    name: 'Sharp',
    description: 'Esquinas marcadas, alto contraste',
    config: {
      ...DEFAULT_DESIGN,
      brandHue: 26,
      typography: {
        ...DEFAULT_DESIGN.typography,
        serifHeadings: false,
      },
      layout: {
        ...DEFAULT_DESIGN.layout,
        radius: {
          ...DEFAULT_DESIGN.layout.radius,
          global: 'md',
          card: 'md',
          controls: 'md',
        },
        density: 'compact',
        shadow: 'md',
      },
    }
  }
};

const CUSTOM_PRESETS_KEY = 'studia.design.customPresets.v1';

/**
 * Obtener todos los presets disponibles (built-in + custom)
 */
export function getAllPresets() {
  try {
    const customRaw = localStorage.getItem(CUSTOM_PRESETS_KEY);
    const custom = customRaw ? JSON.parse(customRaw) : {};
    return { ...BUILT_IN_PRESETS, ...custom };
  } catch {
    return BUILT_IN_PRESETS;
  }
}

/**
 * Guardar un preset personalizado
 */
export function saveCustomPreset(id, name, description, config) {
  try {
    const customRaw = localStorage.getItem(CUSTOM_PRESETS_KEY);
    const custom = customRaw ? JSON.parse(customRaw) : {};
    
    custom[id] = { name, description, config };
    localStorage.setItem(CUSTOM_PRESETS_KEY, JSON.stringify(custom));
    
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Eliminar un preset personalizado
 */
export function deleteCustomPreset(id) {
  try {
    const customRaw = localStorage.getItem(CUSTOM_PRESETS_KEY);
    const custom = customRaw ? JSON.parse(customRaw) : {};
    
    delete custom[id];
    localStorage.setItem(CUSTOM_PRESETS_KEY, JSON.stringify(custom));
    
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Verificar si un preset es built-in (no se puede eliminar)
 */
export function isBuiltInPreset(id) {
  return Object.keys(BUILT_IN_PRESETS).includes(id);
}

/**
 * Exportar todos los presets personalizados como JSON
 */
export function exportCustomPresets() {
  try {
    const customRaw = localStorage.getItem(CUSTOM_PRESETS_KEY);
    return customRaw || '{}';
  } catch {
    return '{}';
  }
}

/**
 * Importar presets desde JSON
 */
export function importCustomPresets(json) {
  try {
    const imported = JSON.parse(json);
    
    // Validar estructura básica
    if (typeof imported !== 'object') {
      throw new Error('Formato inválido');
    }
    
    // Merge con presets existentes
    const customRaw = localStorage.getItem(CUSTOM_PRESETS_KEY);
    const existing = customRaw ? JSON.parse(customRaw) : {};
    
    const merged = { ...existing, ...imported };
    localStorage.setItem(CUSTOM_PRESETS_KEY, JSON.stringify(merged));
    
    return { success: true, count: Object.keys(imported).length };
  } catch (error) {
    return { success: false, error: error.message };
  }
}