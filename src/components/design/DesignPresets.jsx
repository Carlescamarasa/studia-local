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
    description: 'Tema oscuro refinado con grises neutros y acentos en color de marca',
    config: {
      ...DEFAULT_DESIGN,
      theme: 'dark',
      colors: {
        ...DEFAULT_DESIGN.colors,
        primary: '#fd9840',        // Color de marca (naranja)
        primarySoft: 'rgba(253, 152, 64, 0.1)',
        secondary: '#FB8C3A',
        accent: '#F97316',          // Color de marca para acentos
        background: '#000000',      // Negro puro
        surface: '#0A0A0A',         // Superficie casi negra
        surfaceElevated: '#121212', // Superficie elevada ligeramente más clara
        surfaceMuted: '#050505',   // Casi negro para muted
        text: {
          primary: '#FFFFFF',       // Texto blanco
          secondary: '#CCCCCC',      // Gris claro
          muted: '#999999',         // Gris medio
          inverse: '#000000',       // Fondo negro para texto inverso
        },
        border: {
          default: '#1A1A1A',       // Bordes casi negros
          muted: '#0F0F0F',
          strong: '#252525',        // Bordes ligeramente más claros
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
          color: 'rgba(253, 152, 64, 0.5)', // Color de marca con opacidad
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