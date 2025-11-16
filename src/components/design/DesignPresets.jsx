/**
 * Sistema de Presets del Design System
 * Permite guardar, cargar y gestionar múltiples configuraciones visuales
 */

import { DEFAULT_DESIGN } from './designConfig';

export const BUILT_IN_PRESETS = {
  light: {
    name: 'Light',
    description: 'Tema claro por defecto',
    config: {
      ...DEFAULT_DESIGN,
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
  dark: {
    name: 'Dark',
    description: 'Tema oscuro refinado',
    config: {
      ...DEFAULT_DESIGN,
      theme: 'dark',
      colors: {
        ...DEFAULT_DESIGN.colors,
        primary: '#60a5fa',
        primarySoft: '#0b1220',
        secondary: '#93c5fd',
        accent: '#f59e0b',
        background: '#0b0f19',
        surface: '#0f172a',
        surfaceElevated: '#111827',
        surfaceMuted: '#1f2937',
        text: {
          primary: '#e5e7eb',
          secondary: '#cbd5e1',
          muted: '#94a3b8',
          inverse: '#0b0f19',
        },
        border: {
          default: '#1f2937',
          muted: '#0b1220',
          strong: '#334155',
        },
      },
      layout: {
        ...DEFAULT_DESIGN.layout,
        density: 'normal',
        shadow: 'md',
      },
      focus: {
        ring: {
          width: '2px',
          style: 'solid',
          color: 'rgba(96, 165, 250, 0.6)',
          offset: '2px',
        },
      },
    },
  },
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