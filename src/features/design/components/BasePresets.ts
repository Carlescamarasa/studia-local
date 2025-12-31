/**
 * Sistema de Presets de Estilo Base
 * Define múltiples variaciones visuales que comparten la misma estructura de tokens.
 * REGLA CRÍTICA: Todos los presets deben usar #fd9840 como color de marca/primary.
 * Solo pueden variar: neutrales, tipografía, radius, sombras, densidad.
 */

 
/* eslint-disable @typescript-eslint/no-unused-vars */
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
 * PRESET: studia (único estilo oficial)
 * Inspirado en: bulletproofmusician.com
 * Diseño limpio, legible y profesional para La Trompeta Sonará
 * 
 * Características:
 * - Fondo blanco puro para máxima legibilidad
 * - Neutros fríos/claros (grises azulados) para contraste suave
 * - Radius moderados (lg/xl) para modernidad sin exceso
 * - Sombras suaves para profundidad sutil
 * - Tipografía: Tenor Sans en títulos, sistema (Inter/system-ui) en body
 * - Espaciado generoso pero funcional
 * - Color de marca: #fd9840 (obligatorio)
 */
const PRESET_STUDIA: DesignPreset = {
  id: 'studia',
  label: 'Studia',
  description: 'Estilo oficial limpio y profesional inspirado en bulletproofmusician.com',
  design: {
    ...DEFAULT_DESIGN,
    layout: {
      ...DEFAULT_DESIGN.layout,
      radius: {
        global: 'lg',            // 12px - radius moderado
        card: 'xl',              // 16px - cards elegantemente redondeadas
        controls: 'lg',           // 12px - inputs/botones moderados
        pill: 'full',             // Pills completamente redondeadas
        modal: 'xl',              // 16px - modales elegantes
        table: 'lg',              // 12px - tablas con radius moderado
      },
      shadow: 'card',             // Sombras suaves elegantes
      density: 'normal',          // Densidad media (equilibrio)
      page: {
        maxWidth: '1200px',       // Ancho moderado para lectura óptima
        paddingX: '1.5rem',       // 24px - padding horizontal funcional
        paddingY: '1.5rem',       // 24px - padding vertical funcional
        sectionGapY: '2rem',       // 32px - espacio entre secciones claro
      },
      grid: {
        columns: 12,
        gapX: '1rem',              // 16px - gaps funcionales
        gapY: '1rem',             // 16px
      },
    },
    colors: {
      ...DEFAULT_DESIGN.colors,
      // REGLA: primary SIEMPRE #fd9840 (obligatorio)
      primary: '#fd9840',
      primarySoft: '#FFF5ED',     // Versión muy clara del naranja
      secondary: deriveSecondary('#fd9840'),
      accent: '#F97316',           // Naranja complementario
      // Estados estándar
      success: '#10B981',
      warning: '#F59E0B',
      danger: '#EF4444',
      info: '#3B82F6',
      // Neutrales: fondo blanco puro, neutros fríos/claros para máxima legibilidad
      background: '#FFFFFF',      // Blanco puro
      surface: '#F9FAFB',         // Gris frío muy claro
      surfaceElevated: '#FFFFFF', // Blanco puro
      surfaceMuted: '#F3F4F6',    // Gris frío claro
      text: {
        primary: '#1A1F2E',       // Texto oscuro pero legible (azul-gris oscuro)
        secondary: '#4A5568',    // Gris medio frío
        muted: '#718096',        // Gris claro frío
        inverse: '#FFFFFF',
      },
      border: {
        default: '#E2E8F0',       // Bordes fríos sutiles
        muted: '#EDF2F7',
        strong: '#CBD5E0',        // Bordes fríos más marcados
      },
    },
    typography: {
      ...DEFAULT_DESIGN.typography,
      // Tipografía: Tenor Sans en títulos, Raleway en body para legibilidad
      fontFamilyHeadings: '"Tenor Sans", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      fontFamilyBase: '"Raleway", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", "Inter", sans-serif',
      fontSizeBase: 16,           // Tamaño base estándar
      fontSizeScale: 1.25,         // Escala moderada
      serifHeadings: false,
      lineHeight: {
        tight: 1.3,               // Espaciado funcional
        normal: 1.6,               // Espaciado cómodo para lectura
        relaxed: 1.75,             // Relajado
      },
    },
    focus: {
      ring: {
        width: '2px',
        style: 'solid',
        color: 'rgba(253, 152, 64, 0.5)', // Primary con opacidad moderada
        offset: '2px',
      },
    },
    chrome: {
      sidebar: {
        surface: '#F9FAFB',       // Sidebar gris frío claro
        text: '#1A1F2E',          // Texto oscuro legible
        border: '#E2E8F0',        // Borde frío suave
        activeItemBg: '#FFF5ED',  // Item activo con primary soft
        activeItemText: '#1A1F2E', // Texto oscuro legible
        mutedItemText: '#718096', // Texto muted frío
        hoverItemBg: '#F3F4F6',   // Hover gris claro
        itemRadius: 'md',
        itemPadding: '0.5rem 0.75rem',
        itemGap: '0.5rem',
        dividerColor: '#E2E8F0',
        paddingX: '0.5rem',
        paddingY: '0.5rem',
      },
      header: {
        background: '#FFFFFF',     // Header blanco puro
        border: '#E2E8F0',        // Borde frío suave
      },
    },
    controls: {
      field: {
        height: '2.5rem',         // 40px - altura funcional
        background: '#FFFFFF',    // Fondo blanco
        border: '#E2E8F0',        // Borde frío
        radius: 'lg',             // Radius moderado
      },
      button: {
        height: '2.5rem',         // 40px - altura funcional
        radius: 'lg',             // Radius moderado
        shadow: 'sm',             // Sombra suave
      },
      search: {
        background: '#FFFFFF',    // Fondo blanco
        border: '#E2E8F0',        // Borde frío
        radius: 'lg',             // Radius moderado (no pill completo)
        height: '2.5rem',          // 40px
      },
    },
    components: {
      ...DEFAULT_DESIGN.components,
      card: {
        ...DEFAULT_DESIGN.components.card,
        padding: {
          ...DEFAULT_DESIGN.components.card.padding,
          x: '1.25rem',           // 20px - padding funcional
          y: '1.25rem',           // 20px
        },
        radius: 'xl',             // Cards elegantemente redondeadas
        shadow: 'card',           // Sombra suave elegante
      },
      input: {
        padding: '0.5rem 0.875rem', // Funcional
        radius: 'lg',
        border: '1px solid',
        borderColor: 'var(--color-border-default)',
        focusRing: '2px solid var(--color-primary)',
        focusRingOffset: '2px',
      },
      button: {
        padding: {
          sm: '0.375rem 0.75rem',
          md: '0.5rem 1rem',      // Funcional
          lg: '0.75rem 1.5rem',
        },
        radius: 'lg',
        variants: {
          ...DEFAULT_DESIGN.components.button.variants,
        },
      },
      select: {
        padding: '0.5rem 0.875rem',
        radius: 'lg',
        border: '1px solid',
        borderColor: 'var(--color-border-default)',
      },
    },
    brandHue: getBrandHue('#fd9840'),
    theme: 'light', // Por defecto usar modo claro
  },
};

/**
 * Lista de todos los presets base disponibles
 * NOTA: Solo existe un único preset oficial "Studia" (light y dark se manejan con toggle de tema)
 */
export const DESIGN_PRESETS: DesignPreset[] = [
  PRESET_STUDIA,
  // Nota: El modo dark se maneja mediante el toggle de tema en DesignProvider.
  // Los colores dark se derivan automáticamente usando deriveDarkColors(), deriveDarkChrome() y deriveDarkControls().
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
  return PRESET_STUDIA;
}
