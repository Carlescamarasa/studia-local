/**
 * Design System Configuration - Origen único de verdad
 * Estructura completa y profesional para todo el sistema de diseño
 * Con tipos TypeScript para máxima seguridad y autocompletado
 */

// ============================================================================
// TIPOS Y MAPAS
// ============================================================================

export type RadiusValue = 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | 'full';
export type ShadowValue = 'none' | 'sm' | 'md' | 'lg' | 'xl' | 'card';
export type DensityValue = 'compact' | 'normal' | 'spacious';
export type ThemeValue = 'light' | 'dark' | 'system';
export type ModeValue = 'light' | 'dark';

// Mapeo de valores de radius a píxeles
export const RADIUS_MAP: Record<RadiusValue, string> = {
  none: '0px',
  sm: '0.25rem',   // 4px
  md: '0.5rem',    // 8px
  lg: '0.75rem',   // 12px
  xl: '1rem',      // 16px
  '2xl': '1.25rem', // 20px
  '3xl': '1.5rem',  // 24px
  full: '9999px',
};

// Mapeo de valores de shadow a CSS
export const SHADOW_MAP: Record<ShadowValue, string> = {
  none: 'none',
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  md: '0 4px 12px rgba(0, 0, 0, 0.08)',
  lg: '0 10px 25px rgba(0, 0, 0, 0.1)',
  xl: '0 20px 40px rgba(0, 0, 0, 0.12)',
  card: '0 1px 3px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.04)',
};

// Mapeo de densidad a espaciado
export const DENSITY_MAP: Record<DensityValue, Record<string, string>> = {
  compact: {
    base: '0.5rem',      // 8px
    sm: '0.25rem',       // 4px
    md: '0.75rem',       // 12px
    lg: '1rem',          // 16px
    xl: '1.5rem',        // 24px
  },
  normal: {
    base: '0.75rem',     // 12px
    sm: '0.5rem',        // 8px
    md: '1rem',          // 16px
    lg: '1.5rem',        // 24px
    xl: '2rem',          // 32px
  },
  spacious: {
    base: '1rem',        // 16px
    sm: '0.75rem',       // 12px
    md: '1.5rem',        // 24px
    lg: '2rem',          // 32px
    xl: '3rem',          // 48px
  },
};

// ============================================================================
// INTERFACES TYPESCRIPT
// ============================================================================

/**
 * DesignBase - Nueva estructura con tokens comunes y modos light/dark separados.
 * Esto permite diffs particionados y cambio de modo sin generar "cambios fantasma".
 */
export interface DesignBase {
  common: Partial<DesignTokens>;
  modes: {
    light: Partial<DesignTokens>;
    dark: Partial<DesignTokens>;
  };
}

/**
 * DesignOverlay - Overlay de preview temporal (solo sesión).
 * Misma estructura que DesignBase pero todos los campos son opcionales.
 */
export interface DesignOverlay {
  common?: Partial<DesignTokens>;
  modes?: {
    light?: Partial<DesignTokens>;
    dark?: Partial<DesignTokens>;
  };
}

/**
 * DesignChangePartitioned - Resultado de diff particionado por scope
 */
export interface DesignChangePartitioned {
  path: string;
  from: any;
  to: any;
  scope: 'common' | 'light' | 'dark';
}

export interface DesignTokens {
  // Colores principales
  colors: {
    primary: string;
    primarySoft?: string;
    secondary: string;
    accent: string;
    success: string;
    warning: string;
    danger: string;
    info: string;
    // Colores de superficie
    background: string;
    surface: string;
    surfaceElevated: string;
    surfaceMuted?: string;
    // Colores de texto
    text: {
      primary: string;
      secondary: string;
      muted: string;
      inverse: string;
    };
    // Colores de borde
    border: {
      default: string;
      muted: string;
      strong: string;
    };
  };

  // Layout y espaciado
  layout: {
    radius: {
      global: RadiusValue;
      card: RadiusValue;
      controls: RadiusValue;
      pill: RadiusValue;
      modal: RadiusValue;
    };
    density: DensityValue;
    shadow: ShadowValue;
    gaps: {
      xs: string;
      sm: string;
      md: string;
      lg: string;
      xl: string;
      '2xl': string;
    };
    // Nuevos tokens de layout de página
    page: {
      maxWidth: string;
      paddingX: string;
      paddingY: string;
      sectionGapY: string;
    };
    grid: {
      columns: number;
      gapX: string;
      gapY: string;
    };
    sidebar: {
      width: string;
    };
    section: {
      paddingY: string;
    };
  };

  // Tipografía
  typography: {
    fontFamilyBase: string;
    fontFamilyHeadings: string;
    fontFamilySerif: string;
    fontSizeBase: number;
    fontSizeScale: number;
    serifHeadings: boolean;
    lineHeight: {
      tight: number;
      normal: number;
      relaxed: number;
    };
  };

  // Chrome (shell de la app: sidebar, header, paneles laterales)
  chrome: {
    sidebar: {
      background: string;
      border: string;
      activeItemBg: string;
      activeItemText: string;
      mutedItemText?: string;
    };
    header: {
      background: string;
      border: string;
    };
  };

  // Controls (botones, inputs, search, textareas, selects)
  controls: {
    field: {
      height: string;
      background: string;
      border: string;
      radius: RadiusValue;
    };
    button: {
      height: string;
      radius: RadiusValue;
      shadow: ShadowValue;
    };
    search: {
      background: string;
      border: string;
      radius: RadiusValue;
      height: string;
    };
  };

  // Componentes específicos
  components: {
    input: {
      padding: string;
      radius: RadiusValue;
      border: string;
      borderColor: string;
      focusRing: string;
      focusRingOffset: string;
    };
    select: {
      padding: string;
      radius: RadiusValue;
      border: string;
      borderColor: string;
    };
    card: {
      padding: {
        x: string;
        y: string;
        header: {
          x: string;
          y: string;
        };
        content: {
          x: string;
          y: string;
        };
        footer: {
          x: string;
          y: string;
        };
      };
      radius: RadiusValue;
      shadow: ShadowValue;
      border: string;
      borderColor: string;
      background: string;
      gap: string;
    };
    button: {
      padding: {
        sm: string;
        md: string;
        lg: string;
      };
      radius: RadiusValue;
      variants: {
        primary: {
          background: string;
          color: string;
          hover: string;
        };
        secondary: {
          background: string;
          color: string;
          border: string;
        };
        outline: {
          background: string;
          color: string;
          border: string;
        };
      };
    };
    sidebar: {
      width: string;
      widthCollapsed: string;
      background: string;
      border: string;
    };
    header: {
      height: string;
      padding: string;
      background: string;
      border: string;
    };
  };

  // Focus y accesibilidad
  focus: {
    ring: {
      width: string;
      style: string;
      color: string;
      offset: string;
    };
  };

  // Brand (compatibilidad con sistema anterior)
  brandHue: number;
  theme: ThemeValue;
}

// ============================================================================
// CONFIGURACIÓN POR DEFECTO
// ============================================================================

export const DEFAULT_DESIGN: DesignTokens = {
  // Colores principales
  colors: {
    primary: '#fd9840',        // Color de marca Studia (naranja)
    primarySoft: '#FFF5ED',    // Versión muy clara del primary para fondos suaves
    secondary: '#FB8C3A',      // Versión ligeramente más oscura del primary
    accent: '#F97316',          // Naranja complementario
    success: '#10B981',        // Verde
    warning: '#F59E0B',         // Ámbar
    danger: '#EF4444',         // Rojo
    info: '#3B82F6',           // Azul

    // Colores de superficie
    background: '#FFFFFF',
    surface: '#F9FAFB',
    surfaceElevated: '#FFFFFF',
    surfaceMuted: '#F3F4F6',

    // Colores de texto
    text: {
      primary: '#111827',
      secondary: '#6B7280',
      muted: '#9CA3AF',
      inverse: '#FFFFFF',
    },

    // Colores de borde
    border: {
      default: '#E5E7EB',
      muted: '#F3F4F6',
      strong: '#D1D5DB',
    },
  },

  // Layout y espaciado
  layout: {
    radius: {
      global: 'sm',            // Radio base para todo (cambiar a sm para más cuadrado)
      card: 'none',            // Cards más cuadradas (cambiar de sm a none para muy cuadradas)
      controls: 'lg',          // Inputs, buttons (se maneja en controls.button.radius)
      pill: 'lg',              // Badges, pills
      modal: 'xl',             // Modales
    },
    density: 'normal',         // compact | normal | spacious
    shadow: 'md',              // none | sm | md | lg | xl | card
    gaps: {
      xs: '0.25rem',           // 4px
      sm: '0.5rem',            // 8px
      md: '0.75rem',           // 12px
      lg: '1rem',              // 16px
      xl: '1.5rem',            // 24px
      '2xl': '2rem',           // 32px
    },
    // Nuevos tokens de layout de página
    page: {
      maxWidth: '1280px',      // max-w-7xl equivalente (80rem)
      paddingX: '1rem',        // 16px base (responsive se maneja en CSS)
      paddingY: '2rem',        // 32px base (aumentado de 24px para más respiración)
      sectionGapY: '2rem',     // 32px separación entre secciones (aumentado de 24px)
    },
    grid: {
      columns: 12,             // Grid de 12 columnas
      gapX: '1rem',            // 16px gap horizontal
      gapY: '1rem',            // 16px gap vertical
    },
    sidebar: {
      width: '16rem',          // 256px - ya existe en components.sidebar, pero lo exponemos aquí también
    },
    section: {
      paddingY: '1rem',        // 16px padding vertical de secciones
    },
  },

  // Tipografía
  typography: {
    fontFamilyBase: '"Raleway", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    fontFamilyHeadings: '"Tenor Sans", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    fontFamilySerif: 'Georgia, "Times New Roman", serif',
    fontSizeBase: 16,          // px
    fontSizeScale: 1.25,        // Ratio entre tamaños
    serifHeadings: false,
    lineHeight: {
      tight: 1.25,
      normal: 1.5,
      relaxed: 1.75,
    },
  },

  // Chrome (shell de la app)
  chrome: {
    sidebar: {
      background: 'var(--color-surface-elevated)',
      border: 'var(--color-border-default)',
      activeItemBg: 'var(--color-primary-soft)',
      activeItemText: 'var(--color-text-primary)',
      mutedItemText: 'var(--color-text-secondary)',
    },
    header: {
      background: 'var(--color-surface-elevated)',
      border: 'var(--color-border-default)',
    },
  },

  // Controls (botones, inputs, search)
  controls: {
    field: {
      height: '2.5rem', // 40px - altura estándar para inputs
      background: 'var(--color-surface)',
      border: 'var(--color-border-default)',
      radius: 'lg',
    },
    button: {
      height: '2.5rem', // 40px - altura estándar para botones
      radius: 'lg', // Cambiado de 'sm' a 'lg' para botones redondeados (12px)
      shadow: 'none', // Sin sombra por defecto
    },
    search: {
      background: 'var(--color-surface)',
      border: 'var(--color-border-default)',
      radius: 'lg',
      height: '2.5rem', // 40px - altura estándar para search
    },
  },

  // Componentes específicos
  components: {
    input: {
      padding: '0.5rem 0.75rem',
      radius: 'lg',
      border: '1px solid',
      borderColor: 'var(--color-border-default)',
      focusRing: '2px solid var(--color-primary)',
      focusRingOffset: '2px',
    },
    select: {
      padding: '0.5rem 0.75rem',
      radius: 'lg',
      border: '1px solid',
      borderColor: 'var(--color-border-default)',
    },
    card: {
      padding: {
        x: '1rem',    // 16px - padding horizontal base de la card (reducido de 24px)
        y: '1rem',    // 16px - padding vertical base de la card (reducido de 24px)
        header: {
          x: '1rem',  // 16px - padding horizontal del header (reducido de 24px)
          y: '0.75rem',  // 12px - padding vertical del header (reducido de 24px)
          // Nota: el padding-bottom del header suele ser menor (pb-2 ≈ 0.5rem)
          // pero usamos y para el padding-block completo; ajustar según necesidad
        },
        content: {
          x: '1rem',  // 16px - padding horizontal del content (reducido de 24px)
          y: '0.75rem',  // 12px - padding vertical del content (reducido de 24px)
        },
        footer: {
          x: '1rem',  // 16px - padding horizontal del footer (reducido de 24px)
          y: '0.75rem',  // 12px - padding vertical del footer (reducido de 24px)
        },
      },
      radius: 'lg',     // rounded-xl en Tailwind = 0.75rem (12px), que corresponde a 'lg' en RADIUS_MAP
      shadow: 'card',   // shadow-sm equivalente, pero usamos 'card' del SHADOW_MAP
      border: '1px solid',
      borderColor: 'var(--color-border-default)',
      background: 'var(--color-surface-elevated)',
      gap: '0.75rem',      // 12px - gap interno entre elementos (reducido de 16px, equivalente a space-y-3)
    },
    button: {
      padding: {
        sm: '0.375rem 0.75rem',
        md: '0.5rem 1rem',
        lg: '0.75rem 1.5rem',
      },
      radius: 'lg',
      variants: {
        primary: {
          background: 'var(--color-primary)',
          color: 'var(--color-text-inverse)',
          hover: 'var(--color-secondary)',
        },
        secondary: {
          background: 'var(--color-surface)',
          color: 'var(--color-text-primary)',
          border: '1px solid var(--color-border-default)',
        },
        outline: {
          background: 'transparent',
          color: 'var(--color-primary)',
          border: '1px solid var(--color-primary)',
        },
      },
    },
    sidebar: {
      width: '16rem',          // 256px
      widthCollapsed: '4rem',  // 64px
      background: 'var(--color-surface-elevated)',
      border: '1px solid var(--color-border-default)',
    },
    header: {
      height: '4rem',          // 64px
      padding: '0 1.5rem',
      background: 'var(--color-surface-elevated)',
      border: '1px solid var(--color-border-default)',
    },
  },

  // Focus y accesibilidad
  focus: {
    ring: {
      width: '2px',
      style: 'solid',
      color: 'rgba(253, 152, 64, 0.5)', // primary (#fd9840) con opacidad
      offset: '2px',
    },
  },

  // Brand (compatibilidad con sistema anterior)
  brandHue: 28, // Hue de #fd9840
  theme: 'light',
};

// ============================================================================
// FUNCIONES HELPER
// ============================================================================

/**
 * Helper para obtener valor de radius en píxeles
 */
export function getRadiusValue(radiusKey: RadiusValue | string): string {
  return RADIUS_MAP[radiusKey as RadiusValue] || RADIUS_MAP.lg;
}

/**
 * Helper para obtener valor de shadow
 */
export function getShadowValue(shadowKey: ShadowValue | string): string {
  return SHADOW_MAP[shadowKey as ShadowValue] || SHADOW_MAP.md;
}

/**
 * Helper para obtener espaciado según densidad
 */
export function getSpacingForDensity(density: DensityValue | string): Record<string, string> {
  return DENSITY_MAP[density as DensityValue] || DENSITY_MAP.normal;
}

/**
 * Merge profundo de objetos
 */
function deepMerge<T extends Record<string, any>>(target: T, source: Partial<T>): T {
  const output = { ...target };
  if (isObject(target) && isObject(source)) {
    Object.keys(source).forEach((key) => {
      const keyTyped = key as keyof T;
      if (isObject(source[keyTyped])) {
        if (!(keyTyped in target)) {
          Object.assign(output, { [keyTyped]: source[keyTyped] });
        } else {
          output[keyTyped] = deepMerge(target[keyTyped] as any, source[keyTyped] as any);
        }
      } else {
        Object.assign(output, { [keyTyped]: source[keyTyped] });
      }
    });
  }
  return output;
}

function isObject(item: any): item is Record<string, any> {
  return item && typeof item === 'object' && !Array.isArray(item);
}

/**
 * Normalizar design object para asegurar estructura completa
 */
export function normalizeDesign(design: Partial<DesignTokens> | null | undefined): DesignTokens {
  return deepMerge(DEFAULT_DESIGN, design || {});
}

/**
 * Generar CSS variables desde el design object
 */
export function generateCSSVariables(design: Partial<DesignTokens> | null | undefined): Record<string, string> {
  // Normalizar design para asegurar estructura completa
  const normalized = normalizeDesign(design);
  const vars: Record<string, string> = {};
  const toKebab = (s: string) =>
    s.replace(/([a-z0-9])([A-Z])/g, "$1-$2").replace(/_/g, "-").toLowerCase();

  // TODO(auditoría-DS3): El README referencia este archivo como `src/design/designConfig.ts`,
  // pero la ruta real es `src/components/design/designConfig.ts`. Actualizar README en la limpieza final.

  // Colores
  if (normalized.colors) {
    Object.entries(normalized.colors).forEach(([key, value]) => {
      if (typeof value === 'string') {
        vars[`--color-${toKebab(key)}`] = value;
      } else if (typeof value === 'object' && value !== null) {
        Object.entries(value).forEach(([subKey, subValue]) => {
          vars[`--color-${toKebab(key)}-${toKebab(subKey)}`] = subValue as string;
        });
      }
    });
  }

  // Escala de marca HSL para utilidades [hsl(var(--brand-500))] usadas en estilos
  // Tomamos el tono desde brandHue y aplicamos una escala de luminosidad estándar
  const brandHue = typeof (normalized as any).brandHue === 'number' ? (normalized as any).brandHue : 26;
  const brandSaturation = 100; // saturación fija para consistencia visual
  const brandScale: Record<string, number> = {
    '50': 97,
    '100': 92,
    '200': 84,
    '300': 74,
    '400': 62,
    '500': 52,
    '600': 45,
    '700': 37,
    '800': 30,
    '900': 24,
  };
  Object.entries(brandScale).forEach(([k, l]) => {
    vars[`--brand-${k}`] = `${brandHue} ${brandSaturation}% ${l}%`;
  });

  // Radius
  if (normalized.layout?.radius) {
    Object.entries(normalized.layout.radius).forEach(([key, value]) => {
      vars[`--radius-${key === 'global' ? 'base' : key}`] = getRadiusValue(value as RadiusValue);
    });
    // Alias de compatibilidad: emitir también --radius-ctrl (consumido por CSS global)
    try {
      const controlsRadius = (normalized.layout.radius as any).controls;
      if (controlsRadius) {
        vars['--radius-ctrl'] = getRadiusValue(controlsRadius as RadiusValue);
      }
      const cardRadius = (normalized.layout.radius as any).card;
      if (cardRadius) {
        // Alinear nombre consumido por CSS global
        vars['--radius-card'] = getRadiusValue(cardRadius as RadiusValue);
      }
    } catch (_e) {
      // no-op
    }
    // Alias de compatibilidad con CSS global aplicado en FASE 3:
    // - Se emite `--radius-ctrl` y `--radius-card` desde layout.radius
  }

  // Shadows
  vars['--shadow-card'] = getShadowValue(normalized.layout?.shadow || 'md');
  vars['--shadow-control'] = getShadowValue(normalized.layout?.shadow === 'none' ? 'none' : 'sm');

  // Spacing según densidad
  const density = normalized.layout?.density || 'normal';
  const spacing = getSpacingForDensity(density);
  Object.entries(spacing).forEach(([key, value]) => {
    vars[`--space-${key}`] = value;
  });

  // Gaps
  if (normalized.layout?.gaps) {
    Object.entries(normalized.layout.gaps).forEach(([key, value]) => {
      vars[`--gap-${key}`] = value;
    });
  }

  // Layout de página
  if (normalized.layout?.page) {
    vars['--page-max-width'] = normalized.layout.page.maxWidth || DEFAULT_DESIGN.layout.page.maxWidth;
    vars['--page-padding-x'] = normalized.layout.page.paddingX || DEFAULT_DESIGN.layout.page.paddingX;
    vars['--page-padding-y'] = normalized.layout.page.paddingY || DEFAULT_DESIGN.layout.page.paddingY;
    vars['--page-section-gap-y'] = normalized.layout.page.sectionGapY || DEFAULT_DESIGN.layout.page.sectionGapY;
  }

  // Layout de grid
  if (normalized.layout?.grid) {
    vars['--grid-columns'] = String(normalized.layout.grid.columns || DEFAULT_DESIGN.layout.grid.columns);
    vars['--grid-gap-x'] = normalized.layout.grid.gapX || DEFAULT_DESIGN.layout.grid.gapX;
    vars['--grid-gap-y'] = normalized.layout.grid.gapY || DEFAULT_DESIGN.layout.grid.gapY;
  }

  // Layout de sidebar
  if (normalized.layout?.sidebar) {
    vars['--sidebar-width'] = normalized.layout.sidebar.width || DEFAULT_DESIGN.layout.sidebar.width;
  }

  // Layout de sección
  if (normalized.layout?.section) {
    vars['--section-padding-y'] = normalized.layout.section.paddingY || DEFAULT_DESIGN.layout.section.paddingY;
  }

  // Focus ring (con valores por defecto)
  const focusRing = normalized.focus?.ring || DEFAULT_DESIGN.focus.ring;
  vars['--focus-ring'] = `${focusRing.width} ${focusRing.style} ${focusRing.color}`;
  vars['--focus-ring-offset'] = focusRing.offset;

  // Tipografía
  if (normalized.typography) {
    vars['--font-family-base'] = normalized.typography.fontFamilyBase || DEFAULT_DESIGN.typography.fontFamilyBase;
    vars['--font-family-headings'] = normalized.typography.serifHeadings
      ? (normalized.typography.fontFamilySerif || DEFAULT_DESIGN.typography.fontFamilySerif)
      : (normalized.typography.fontFamilyHeadings || DEFAULT_DESIGN.typography.fontFamilyHeadings);
    vars['--font-size-base'] = `${normalized.typography.fontSizeBase || DEFAULT_DESIGN.typography.fontSizeBase}px`;
    // TODO(auditoría-DS3): Evaluar si hace falta exponer más escala (sm, md, lg) como CSS vars derivadas de `fontSizeBase` + `fontSizeScale`.
  }

  // Chrome (shell de la app)
  if (normalized.chrome) {
    if (normalized.chrome.sidebar) {
      vars['--sidebar-bg'] = normalized.chrome.sidebar.background || DEFAULT_DESIGN.chrome.sidebar.background;
      vars['--sidebar-border'] = normalized.chrome.sidebar.border || DEFAULT_DESIGN.chrome.sidebar.border;
      vars['--sidebar-item-active-bg'] = normalized.chrome.sidebar.activeItemBg || DEFAULT_DESIGN.chrome.sidebar.activeItemBg;
      vars['--sidebar-item-active-text'] = normalized.chrome.sidebar.activeItemText || DEFAULT_DESIGN.chrome.sidebar.activeItemText;
      if (normalized.chrome.sidebar.mutedItemText) {
        vars['--sidebar-item-muted-text'] = normalized.chrome.sidebar.mutedItemText;
      }
    }
    if (normalized.chrome.header) {
      vars['--header-bg'] = normalized.chrome.header.background || DEFAULT_DESIGN.chrome.header.background;
      vars['--header-border'] = normalized.chrome.header.border || DEFAULT_DESIGN.chrome.header.border;
    }
  }

  // Controls (botones, inputs, search)
  if (normalized.controls) {
    if (normalized.controls.field) {
      vars['--ctrl-field-height'] = normalized.controls.field.height || DEFAULT_DESIGN.controls.field.height;
      vars['--ctrl-field-bg'] = normalized.controls.field.background || DEFAULT_DESIGN.controls.field.background;
      vars['--ctrl-field-border'] = normalized.controls.field.border || DEFAULT_DESIGN.controls.field.border;
      vars['--ctrl-field-radius'] = getRadiusValue(normalized.controls.field.radius || DEFAULT_DESIGN.controls.field.radius);
    }
    if (normalized.controls.button) {
      vars['--btn-height'] = normalized.controls.button.height || DEFAULT_DESIGN.controls.button.height;
      vars['--btn-radius'] = getRadiusValue(normalized.controls.button.radius || DEFAULT_DESIGN.controls.button.radius);
      vars['--btn-shadow'] = getShadowValue(normalized.controls.button.shadow || DEFAULT_DESIGN.controls.button.shadow);
    }
    if (normalized.controls.search) {
      vars['--search-bg'] = normalized.controls.search.background || DEFAULT_DESIGN.controls.search.background;
      vars['--search-border'] = normalized.controls.search.border || DEFAULT_DESIGN.controls.search.border;
      vars['--search-radius'] = getRadiusValue(normalized.controls.search.radius || DEFAULT_DESIGN.controls.search.radius);
      vars['--search-height'] = normalized.controls.search.height || DEFAULT_DESIGN.controls.search.height;
    }
  }

  // Componentes
  if (normalized.components) {
    if (normalized.components.input) {
      vars['--input-padding'] = normalized.components.input.padding || DEFAULT_DESIGN.components.input.padding;
      vars['--input-radius'] = getRadiusValue(normalized.components.input.radius || DEFAULT_DESIGN.components.input.radius);
      // Extraer width del border (ej: "2px solid" -> "2px")
      const borderValue = normalized.components.input.border || DEFAULT_DESIGN.components.input.border;
      const borderWidth = borderValue.split(' ')[0] || '1px';
      vars['--input-border-width'] = borderWidth;
      vars['--input-border-color'] = normalized.components.input.borderColor || DEFAULT_DESIGN.components.input.borderColor;
      // TODO(auditoría-DS3): Confirmar uso de `--input-radius`. En CSS global se usa principalmente `--radius-ctrl`.
    }
    if (normalized.components.button) {
      vars['--button-padding-sm'] = normalized.components.button.padding?.sm || DEFAULT_DESIGN.components.button.padding.sm;
      vars['--button-padding-md'] = normalized.components.button.padding?.md || DEFAULT_DESIGN.components.button.padding.md;
      vars['--button-padding-lg'] = normalized.components.button.padding?.lg || DEFAULT_DESIGN.components.button.padding.lg;
      // Alias de compatibilidad: --button-radius usa --btn-radius si está disponible
      const btnRadius = normalized.controls?.button?.radius || normalized.components.button.radius || DEFAULT_DESIGN.components.button.radius;
      vars['--button-radius'] = getRadiusValue(btnRadius);
    }
    if (normalized.components.card) {
      const card = normalized.components.card;
      const cardDefault = DEFAULT_DESIGN.components.card;

      // Padding base de la card (X/Y separados)
      vars['--card-padding-x'] = card.padding?.x || cardDefault.padding.x;
      vars['--card-padding-y'] = card.padding?.y || cardDefault.padding.y;

      // Padding específico de header
      vars['--card-header-padding-x'] = card.padding?.header?.x || cardDefault.padding.header.x;
      vars['--card-header-padding-y'] = card.padding?.header?.y || cardDefault.padding.header.y;

      // Padding específico de content
      vars['--card-content-padding-x'] = card.padding?.content?.x || cardDefault.padding.content.x;
      vars['--card-content-padding-y'] = card.padding?.content?.y || cardDefault.padding.content.y;

      // Padding específico de footer
      vars['--card-footer-padding-x'] = card.padding?.footer?.x || cardDefault.padding.footer.x;
      vars['--card-footer-padding-y'] = card.padding?.footer?.y || cardDefault.padding.footer.y;

      // Radius y shadow
      vars['--card-radius'] = getRadiusValue(card.radius || cardDefault.radius);
      vars['--radius-card'] = vars['--radius-card'] || vars['--card-radius']; // Alias consistente
      vars['--shadow-card'] = getShadowValue(card.shadow || cardDefault.shadow);

      // Gap interno
      vars['--card-gap'] = card.gap || cardDefault.gap;
    }
    if (normalized.components.sidebar) {
      // Prioridad: layout.sidebar.width > components.sidebar.width
      vars['--sidebar-width'] = normalized.layout?.sidebar?.width || normalized.components.sidebar.width || DEFAULT_DESIGN.components.sidebar.width;
      vars['--sidebar-width-collapsed'] = normalized.components.sidebar.widthCollapsed || DEFAULT_DESIGN.components.sidebar.widthCollapsed;
    }
    if (normalized.components.header) {
      vars['--header-height'] = normalized.components.header.height || DEFAULT_DESIGN.components.header.height;
    }
  }

  // ============================================================================
  // MAPEO DE VARS SHADCN/TAILWIND PARA COMPATIBILIDAD
  // ============================================================================
  // Los componentes UI (table, select, etc.) usan clases Tailwind que dependen
  // de vars shadcn (--background, --muted, --card, etc.). Mapeamos desde el
  // sistema propio para mantener consistencia y soporte Dark mode.

  // Helper para convertir hex a HSL (formato esperado por shadcn)
  const hexToHsl = (hex: string): string => {
    if (!hex || typeof hex !== 'string') {
      // Fallback a gris neutro si no hay color válido
      return '0 0% 50%';
    }
    // Remover # si existe
    hex = hex.replace('#', '').trim();
    // Validar que tenga 6 caracteres
    if (hex.length !== 6) {
      return '0 0% 50%';
    }
    const r = parseInt(hex.substring(0, 2), 16) / 255;
    const g = parseInt(hex.substring(2, 4), 16) / 255;
    const b = parseInt(hex.substring(4, 6), 16) / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0, s = 0, l = (max + min) / 2;

    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        case b: h = ((r - g) / d + 4) / 6; break;
      }
    }

    return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
  };

  // Mapeo de colores del sistema propio a vars shadcn
  // IMPORTANTE: Estas vars se aplican directamente al root, por lo que funcionan
  // tanto en light como en dark mode. No necesitamos duplicarlas en .dark
  const colors = normalized.colors;
  if (colors) {
    // Background y foreground
    vars['--background'] = hexToHsl(colors.background || DEFAULT_DESIGN.colors.background);
    vars['--foreground'] = hexToHsl(colors.text?.primary || DEFAULT_DESIGN.colors.text.primary);

    // Card (surface elevated)
    vars['--card'] = hexToHsl(colors.surfaceElevated || DEFAULT_DESIGN.colors.surfaceElevated);
    vars['--card-foreground'] = hexToHsl(colors.text?.primary || DEFAULT_DESIGN.colors.text.primary);

    // Popover (igual que card)
    vars['--popover'] = hexToHsl(colors.surfaceElevated || DEFAULT_DESIGN.colors.surfaceElevated);
    vars['--popover-foreground'] = hexToHsl(colors.text?.primary || DEFAULT_DESIGN.colors.text.primary);

    // Primary (color de marca) - SIEMPRE #fd9840
    vars['--primary'] = hexToHsl(colors.primary || DEFAULT_DESIGN.colors.primary);
    vars['--primary-foreground'] = hexToHsl(colors.text?.inverse || DEFAULT_DESIGN.colors.text.inverse);

    // Secondary (surface)
    vars['--secondary'] = hexToHsl(colors.surface || DEFAULT_DESIGN.colors.surface);
    vars['--secondary-foreground'] = hexToHsl(colors.text?.primary || DEFAULT_DESIGN.colors.text.primary);

    // Muted (surface muted)
    vars['--muted'] = hexToHsl(colors.surfaceMuted || DEFAULT_DESIGN.colors.surfaceMuted || colors.surface || DEFAULT_DESIGN.colors.surface);
    vars['--muted-foreground'] = hexToHsl(colors.text?.secondary || DEFAULT_DESIGN.colors.text.secondary);

    // Accent (surface muted)
    vars['--accent'] = hexToHsl(colors.surfaceMuted || DEFAULT_DESIGN.colors.surfaceMuted || colors.surface || DEFAULT_DESIGN.colors.surface);
    vars['--accent-foreground'] = hexToHsl(colors.text?.primary || DEFAULT_DESIGN.colors.text.primary);

    // Destructive (danger)
    vars['--destructive'] = hexToHsl(colors.danger || DEFAULT_DESIGN.colors.danger);
    vars['--destructive-foreground'] = hexToHsl(colors.text?.inverse || DEFAULT_DESIGN.colors.text.inverse);

    // Border (border default)
    vars['--border'] = hexToHsl(colors.border?.default || DEFAULT_DESIGN.colors.border.default);
    vars['--input'] = hexToHsl(colors.border?.default || DEFAULT_DESIGN.colors.border.default);
    vars['--ring'] = hexToHsl(colors.text?.primary || DEFAULT_DESIGN.colors.text.primary);
  }

  return vars;
}

// ============================================================================
// DIFF UTILITIES
// ============================================================================

interface DesignChange {
  path: string;
  from: any;
  to: any;
}

/**
 * Recursively compute flattened paths and values from an object
 */
function flattenObject(obj: Record<string, any>, prefix = ''): Record<string, any> {
  const result: Record<string, any> = {};

  for (const key in obj) {
    if (!Object.prototype.hasOwnProperty.call(obj, key)) continue;

    const value = obj[key];
    const newPath = prefix ? `${prefix}.${key}` : key;

    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(result, flattenObject(value, newPath));
    } else {
      result[newPath] = value;
    }
  }

  return result;
}

/**
 * Compute difference between two design objects (base vs next)
 * Returns array of { path, from, to } for changed values only
 * Both objects are normalized before comparison
 */
export function diffDesign(
  base: Partial<DesignTokens> | null | undefined,
  next: Partial<DesignTokens> | null | undefined
): DesignChange[] {
  const normalizedBase = normalizeDesign(base);
  const normalizedNext = normalizeDesign(next);

  const flatBase = flattenObject(normalizedBase as Record<string, any>);
  const flatNext = flattenObject(normalizedNext as Record<string, any>);

  const changes: DesignChange[] = [];
  const allPaths = Array.from(new Set([...Object.keys(flatBase), ...Object.keys(flatNext)]));

  for (const path of allPaths) {
    const fromValue = flatBase[path];
    const toValue = flatNext[path];

    // Compare values (handle arrays and primitives)
    const fromStr = JSON.stringify(fromValue);
    const toStr = JSON.stringify(toValue);

    if (fromStr !== toStr) {
      changes.push({ path, from: fromValue, to: toValue });
    }
  }

  // Sort by path for consistent output
  changes.sort((a, b) => a.path.localeCompare(b.path));

  return changes;
}

/**
 * Apply a single change (revert) to a design object
 * Returns a new object with the change applied
 */
export function applyDesignChange(
  design: Partial<DesignTokens>,
  path: string,
  value: any
): Partial<DesignTokens> {
  const result = JSON.parse(JSON.stringify(design)); // Deep clone
  const keys = path.split('.');
  let current: any = result;

  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (!current[key] || typeof current[key] !== 'object') {
      current[key] = {};
    }
    current = current[key];
  }

  current[keys[keys.length - 1]] = value;
  return result;
}

// ============================================================================
// NUEVO MODELO: FUNCIONES PARA DesignBase + DesignOverlay + MODOS
// ============================================================================

/**
 * Colores derivados para modo dark (no personalizables, se aplican automáticamente)
 * Estos valores se usan SOLO para inyectar CSS vars, NO se persisten.
 */
export const DARK_MODE_DEFAULTS: Partial<DesignTokens> = {
  colors: {
    primary: '#fd9840',
    primarySoft: 'rgba(253, 152, 64, 0.1)',
    secondary: '#FB8C3A',
    accent: '#F97316',
    success: '#10B981',
    warning: '#F59E0B',
    danger: '#EF4444',
    info: '#3B82F6',
    background: '#121212',
    surface: '#1A1A1A',
    surfaceElevated: '#242424',
    surfaceMuted: '#171717',
    text: {
      primary: '#FFFFFF',
      secondary: '#B4B4B4',
      muted: '#929292',
      inverse: '#1A1F2E',
    },
    border: {
      default: '#3A3A3A',
      muted: '#2A2A2A',
      strong: '#4D4D4D',
    },
  },
};

/**
 * Colores por defecto para modo LIGHT.
 * Fondo claro, texto oscuro.
 */
export const LIGHT_MODE_DEFAULTS: Partial<DesignTokens> = {
  colors: {
    primary: '#E67E22',
    primarySoft: 'rgba(230, 126, 34, 0.1)',
    secondary: '#D35400',
    accent: '#F39C12',
    success: '#27AE60',
    warning: '#F1C40F',
    danger: '#E74C3C',
    info: '#3498DB',
    background: '#FAFAFA',
    surface: '#FFFFFF',
    surfaceElevated: '#FFFFFF',
    surfaceMuted: '#F5F5F5',
    text: {
      primary: '#1A1A1A',
      secondary: '#4A4A4A',
      muted: '#6B6B6B',
      inverse: '#FFFFFF',
    },
    border: {
      default: '#E0E0E0',
      muted: '#EEEEEE',
      strong: '#BDBDBD',
    },
  },
};

/**
 * Crear un DesignBase por defecto desde la configuración actual
 */
export function createDefaultDesignBase(): DesignBase {
  return {
    common: { ...DEFAULT_DESIGN, theme: undefined } as Partial<DesignTokens>,
    modes: {
      light: LIGHT_MODE_DEFAULTS,
      dark: DARK_MODE_DEFAULTS,
    },
  };
}

/**
 * Migrar un design plano legacy a la nueva estructura DesignBase
 */
export function migrateToDesignBase(legacyDesign: Partial<DesignTokens>): DesignBase {
  const normalized = normalizeDesign(legacyDesign);
  // El legacy se convierte en "common", los modos empiezan vacíos (dark usa defaults)
  return {
    common: { ...normalized, theme: undefined } as Partial<DesignTokens>,
    modes: {
      light: LIGHT_MODE_DEFAULTS,
      dark: DARK_MODE_DEFAULTS,
    },
  };
}

/**
 * Mergear DesignBase con un modo específico para obtener DesignTokens finales.
 * También aplica un overlay de preview si existe.
 */
export function mergeDesignWithMode(
  base: DesignBase,
  mode: ModeValue,
  overlay?: DesignOverlay | null
): DesignTokens {
  // 1. Empezar con base.common
  let result = deepMerge(DEFAULT_DESIGN, base.common || {});

  // 2. Aplicar overrides del modo
  const modeOverrides = base.modes?.[mode] || {};
  result = deepMerge(result, modeOverrides);

  // 3. Si hay overlay, aplicar overlay.common
  if (overlay?.common) {
    result = deepMerge(result, overlay.common);
  }

  // 4. Si hay overlay, aplicar overlay.modes[mode]
  if (overlay?.modes?.[mode]) {
    result = deepMerge(result, overlay.modes[mode]!);
  }

  return result;
}

/**
 * Calcular diff particionado entre base y overlay
 * Retorna cambios separados por scope: common, light, dark
 */
export function diffDesignPartitioned(
  base: DesignBase,
  overlay: DesignOverlay | null | undefined
): { common: DesignChangePartitioned[]; light: DesignChangePartitioned[]; dark: DesignChangePartitioned[] } {
  const result = {
    common: [] as DesignChangePartitioned[],
    light: [] as DesignChangePartitioned[],
    dark: [] as DesignChangePartitioned[],
  };

  if (!overlay) return result;

  // Diff common
  if (overlay.common) {
    const baseCommonFlat = flattenObject((base.common || {}) as Record<string, any>);
    const overlayCommonFlat = flattenObject((overlay.common || {}) as Record<string, any>);

    for (const path of Object.keys(overlayCommonFlat)) {
      const from = baseCommonFlat[path];
      const to = overlayCommonFlat[path];
      if (JSON.stringify(from) !== JSON.stringify(to)) {
        result.common.push({ path, from, to, scope: 'common' });
      }
    }
  }

  // Diff light
  if (overlay.modes?.light) {
    const baseLightFlat = flattenObject((base.modes?.light || {}) as Record<string, any>);
    const overlayLightFlat = flattenObject((overlay.modes?.light || {}) as Record<string, any>);

    for (const path of Object.keys(overlayLightFlat)) {
      const from = baseLightFlat[path];
      const to = overlayLightFlat[path];
      if (JSON.stringify(from) !== JSON.stringify(to)) {
        result.light.push({ path, from, to, scope: 'light' });
      }
    }
  }

  // Diff dark
  if (overlay.modes?.dark) {
    const baseDarkFlat = flattenObject((base.modes?.dark || {}) as Record<string, any>);
    const overlayDarkFlat = flattenObject((overlay.modes?.dark || {}) as Record<string, any>);

    for (const path of Object.keys(overlayDarkFlat)) {
      const from = baseDarkFlat[path];
      const to = overlayDarkFlat[path];
      if (JSON.stringify(from) !== JSON.stringify(to)) {
        result.dark.push({ path, from, to, scope: 'dark' });
      }
    }
  }

  // Sort each for consistency
  result.common.sort((a, b) => a.path.localeCompare(b.path));
  result.light.sort((a, b) => a.path.localeCompare(b.path));
  result.dark.sort((a, b) => a.path.localeCompare(b.path));

  return result;
}

/**
 * Aplicar un cambio al overlay en el scope correcto.
 * Retorna un nuevo overlay con el cambio aplicado.
 */
export function applyChangeToOverlay(
  overlay: DesignOverlay | null,
  path: string,
  value: any,
  scope: 'common' | 'light' | 'dark'
): DesignOverlay {
  const result: DesignOverlay = overlay
    ? JSON.parse(JSON.stringify(overlay))
    : { common: {}, modes: { light: {}, dark: {} } };

  if (scope === 'common') {
    if (!result.common) result.common = {};
    setNestedValue(result.common, path, value);
  } else {
    if (!result.modes) result.modes = { light: {}, dark: {} };
    if (!result.modes[scope]) result.modes[scope] = {};
    setNestedValue(result.modes[scope]!, path, value);
  }

  return result;
}

/**
 * Revertir un cambio en el overlay (eliminar el path del scope correspondiente)
 */
export function revertChangeInOverlay(
  overlay: DesignOverlay | null,
  path: string,
  scope: 'common' | 'light' | 'dark'
): DesignOverlay {
  if (!overlay) return { common: {}, modes: { light: {}, dark: {} } };

  const result: DesignOverlay = JSON.parse(JSON.stringify(overlay));

  const deleteNestedPath = (obj: any, pathStr: string) => {
    const keys = pathStr.split('.');
    let current = obj;
    for (let i = 0; i < keys.length - 1; i++) {
      if (!current[keys[i]]) return;
      current = current[keys[i]];
    }
    delete current[keys[keys.length - 1]];
  };

  if (scope === 'common' && result.common) {
    deleteNestedPath(result.common, path);
  } else if (result.modes?.[scope]) {
    deleteNestedPath(result.modes[scope]!, path);
  }

  return result;
}

/**
 * Helper interno para setear valor anidado en un objeto
 */
function setNestedValue(obj: any, path: string, value: any): void {
  const keys = path.split('.');
  let current = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    if (!current[keys[i]] || typeof current[keys[i]] !== 'object') {
      current[keys[i]] = {};
    }
    current = current[keys[i]];
  }
  current[keys[keys.length - 1]] = value;
}

