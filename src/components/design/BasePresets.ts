/**
 * Sistema de Presets de Estilo Base
 * Define múltiples variaciones visuales que comparten la misma estructura de tokens.
 * REGLA CRÍTICA: Todos los presets deben usar #fd9840 como color de marca/primary.
 * Solo pueden variar: neutrales, tipografía, radius, sombras, densidad.
 */

import { DesignTokens, DEFAULT_DESIGN } from './designConfig';

/**
 * Helper para derivar primarySoft desde primary (#fd9840)
 * Crea una versión muy clara del color primario para fondos suaves
 */
function derivePrimarySoft(primary: string): string {
  // #fd9840 en versión muy clara (tint 95%)
  return '#FFF5ED'; // Versión muy clara de naranja
}

/**
 * Helper para derivar secondary desde primary
 * Crea una versión ligeramente más oscura/saturada
 */
function deriveSecondary(primary: string): string {
  // Versión ligeramente más oscura de #fd9840
  return '#FB8C3A'; // #fd9840 con más saturación
}

/**
 * Helper para calcular brandHue desde primary
 * #fd9840 ≈ hsl(28, 98%, 62%)
 */
function getBrandHue(primary: string): number {
  return 28; // Hue de #fd9840
}

export interface DesignPreset {
  id: string;
  label: string;
  description: string;
  design: DesignTokens;
}

/**
 * PRESET: default
 * Diseño base de Studia con primary = #fd9840
 * Neutrales estándar, radius medianos, sombras moderadas
 */
const PRESET_DEFAULT: DesignPreset = {
  id: 'default',
  label: 'Studia – Default',
  description: 'Diseño base con neutrales estándar y radius medianos',
  design: {
    ...DEFAULT_DESIGN,
    colors: {
      ...DEFAULT_DESIGN.colors,
      // REGLA: primary SIEMPRE #fd9840
      primary: '#fd9840',
      primarySoft: derivePrimarySoft('#fd9840'),
      secondary: deriveSecondary('#fd9840'),
      // Accent puede ser diferente (no es marca)
      accent: '#F97316', // Naranja complementario
      // Estados y neutrales se mantienen estándar
      success: '#10B981',
      warning: '#F59E0B',
      danger: '#EF4444',
      info: '#3B82F6',
      background: '#FFFFFF',
      surface: '#F9FAFB',
      surfaceElevated: '#FFFFFF',
      surfaceMuted: '#F3F4F6',
      text: {
        primary: '#111827',
        secondary: '#6B7280',
        muted: '#9CA3AF',
        inverse: '#FFFFFF',
      },
      border: {
        default: '#E5E7EB',
        muted: '#F3F4F6',
        strong: '#D1D5DB',
      },
    },
    focus: {
      ring: {
        width: '2px',
        style: 'solid',
        color: 'rgba(253, 152, 64, 0.5)', // primary con opacidad
        offset: '2px',
      },
    },
    brandHue: getBrandHue('#fd9840'),
  },
};

/**
 * PRESET: soft
 * Inspirado en apps de fitness/wellness (imagen referencia 1)
 * Características:
 * - Neutrales pastel y suaves
 * - Radius grandes (xl, 2xl)
 * - Sombras muy suaves (sm, card)
 * - Densidad normal/aireada
 * - Tipografía más redonda/amigable
 */
const PRESET_SOFT: DesignPreset = {
  id: 'soft',
  label: 'Studia – Soft',
  description: 'Estilo suave con neutrales pastel, radius grandes y sombras sutiles',
  design: {
    ...PRESET_DEFAULT.design,
    colors: {
      ...PRESET_DEFAULT.design.colors,
      // REGLA: primary SIEMPRE #fd9840 (no cambia)
      primary: '#fd9840',
      primarySoft: '#FFF8F0', // Versión aún más suave
      secondary: deriveSecondary('#fd9840'),
      // Neutrales más suaves/pastel
      background: '#FEFEFE', // Blanco ligeramente cálido
      surface: '#FAFAFA', // Gris muy claro
      surfaceElevated: '#FFFFFF',
      surfaceMuted: '#F5F5F5', // Gris muy suave
      text: {
        primary: '#1A1A1A', // Negro ligeramente más suave
        secondary: '#6B7280',
        muted: '#9CA3AF',
        inverse: '#FFFFFF',
      },
      border: {
        default: '#E8E8E8', // Bordes más suaves
        muted: '#F0F0F0',
        strong: '#D8D8D8',
      },
    },
    layout: {
      ...PRESET_DEFAULT.design.layout,
      radius: {
        global: 'xl', // Radius más grandes
        card: '2xl', // Cards muy redondeadas
        controls: 'xl', // Inputs/botones más redondeados
        pill: 'full', // Pills completamente redondeadas
        modal: '2xl', // Modales muy redondeadas
      },
      shadow: 'card', // Sombras muy sutiles
      density: 'normal',
    },
    typography: {
      ...PRESET_DEFAULT.design.typography,
      // Tipografía ligeramente más grande y espaciada
      fontSizeBase: 16,
      fontSizeScale: 1.2, // Escala ligeramente más suave
      lineHeight: {
        tight: 1.3,
        normal: 1.6, // Más espaciado
        relaxed: 1.8,
      },
    },
    focus: {
      ring: {
        width: '2px',
        style: 'solid',
        color: 'rgba(253, 152, 64, 0.4)', // Más suave
        offset: '3px',
      },
    },
  },
};

/**
 * PRESET: contrast
 * Inspirado en dashboards profesionales (imagen referencia 3)
 * Características:
 * - Alto contraste entre neutrales
 * - Radius pequeños (sm, md)
 * - Sombras más marcadas (md, lg)
 * - Densidad compacta
 * - Tipografía más definida
 */
const PRESET_CONTRAST: DesignPreset = {
  id: 'contrast',
  label: 'Studia – Contrast',
  description: 'Estilo de alto contraste con radius pequeños y sombras marcadas',
  design: {
    ...PRESET_DEFAULT.design,
    colors: {
      ...PRESET_DEFAULT.design.colors,
      // REGLA: primary SIEMPRE #fd9840 (no cambia)
      primary: '#fd9840',
      primarySoft: '#FFF0E0', // Versión más contrastada
      secondary: deriveSecondary('#fd9840'),
      // Neutrales más contrastados
      background: '#FFFFFF',
      surface: '#F5F5F5', // Más oscuro que default
      surfaceElevated: '#FFFFFF',
      surfaceMuted: '#E8E8E8', // Más oscuro para mayor contraste
      text: {
        primary: '#000000', // Negro puro para máximo contraste
        secondary: '#4B5563', // Más oscuro
        muted: '#6B7280',
        inverse: '#FFFFFF',
      },
      border: {
        default: '#D1D5DB', // Bordes más marcados
        muted: '#E5E7EB',
        strong: '#9CA3AF', // Bordes muy marcados
      },
    },
    layout: {
      ...PRESET_DEFAULT.design.layout,
      radius: {
        global: 'md', // Radius más pequeños
        card: 'md', // Cards menos redondeadas
        controls: 'md', // Inputs/botones menos redondeados
        pill: 'lg', // Pills moderadamente redondeadas
        modal: 'lg', // Modales menos redondeadas
      },
      shadow: 'lg', // Sombras más marcadas
      density: 'compact', // Densidad compacta
    },
    typography: {
      ...PRESET_DEFAULT.design.typography,
      // Tipografía más definida
      fontSizeBase: 15, // Ligeramente más pequeño
      fontSizeScale: 1.3, // Escala más agresiva
      lineHeight: {
        tight: 1.2,
        normal: 1.5,
        relaxed: 1.7,
      },
    },
    focus: {
      ring: {
        width: '3px', // Ring más grueso
        style: 'solid',
        color: 'rgba(253, 152, 64, 0.7)', // Más visible
        offset: '2px',
      },
    },
  },
};

/**
 * Lista de todos los presets base disponibles
 */
export const DESIGN_PRESETS: DesignPreset[] = [
  PRESET_DEFAULT,
  PRESET_SOFT,
  PRESET_CONTRAST,
];

/**
 * Helper para encontrar un preset por ID
 */
export function findPresetById(id: string): DesignPreset | undefined {
  return DESIGN_PRESETS.find(p => p.id === id);
}

/**
 * Helper para obtener el preset por defecto
 */
export function getDefaultPreset(): DesignPreset {
  return PRESET_DEFAULT;
}

