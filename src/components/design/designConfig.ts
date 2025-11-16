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
export type ThemeValue = 'light' | 'dark';

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
      global: 'lg',            // Radio base para todo
      card: 'lg',              // Cards
      controls: 'lg',          // Inputs, buttons
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
  },
  
  // Tipografía
  typography: {
    fontFamilyBase: 'Inter, system-ui, -apple-system, sans-serif',
    fontFamilyHeadings: 'Inter, system-ui, -apple-system, sans-serif',
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
        x: '1rem',      // 16px - padding horizontal base de la card
        y: '1rem',      // 16px - padding vertical base de la card
        header: {
          x: '1rem',    // 16px - padding horizontal del header
          y: '1rem',    // 16px - padding vertical del header (top)
          // Nota: el padding-bottom del header suele ser menor (pb-2 ≈ 0.5rem)
          // pero usamos y para el padding-block completo; ajustar según necesidad
        },
        content: {
          x: '1rem',    // 16px - padding horizontal del content
          y: '1rem',    // 16px - padding vertical del content
        },
        footer: {
          x: '1rem',    // 16px - padding horizontal del footer
          y: '1rem',    // 16px - padding vertical del footer
        },
      },
      radius: 'lg',     // rounded-xl en Tailwind = 0.75rem (12px), que corresponde a 'lg' en RADIUS_MAP
      shadow: 'card',   // shadow-sm equivalente, pero usamos 'card' del SHADOW_MAP
      border: '1px solid',
      borderColor: 'var(--color-border-default)',
      background: 'var(--color-surface-elevated)',
      gap: '1rem',      // 16px - gap interno entre elementos (equivalente a space-y-4)
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
  
  // Componentes
  if (normalized.components) {
    if (normalized.components.input) {
      vars['--input-padding'] = normalized.components.input.padding || DEFAULT_DESIGN.components.input.padding;
      vars['--input-radius'] = getRadiusValue(normalized.components.input.radius || DEFAULT_DESIGN.components.input.radius);
      // TODO(auditoría-DS3): Confirmar uso de `--input-radius`. En CSS global se usa principalmente `--radius-ctrl`.
    }
    if (normalized.components.button) {
      vars['--button-padding-sm'] = normalized.components.button.padding?.sm || DEFAULT_DESIGN.components.button.padding.sm;
      vars['--button-padding-md'] = normalized.components.button.padding?.md || DEFAULT_DESIGN.components.button.padding.md;
      vars['--button-padding-lg'] = normalized.components.button.padding?.lg || DEFAULT_DESIGN.components.button.padding.lg;
      vars['--button-radius'] = getRadiusValue(normalized.components.button.radius || DEFAULT_DESIGN.components.button.radius);
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
      vars['--sidebar-width'] = normalized.components.sidebar.width || DEFAULT_DESIGN.components.sidebar.width;
      vars['--sidebar-width-collapsed'] = normalized.components.sidebar.widthCollapsed || DEFAULT_DESIGN.components.sidebar.widthCollapsed;
    }
    if (normalized.components.header) {
      vars['--header-height'] = normalized.components.header.height || DEFAULT_DESIGN.components.header.height;
    }
  }
  
  return vars;
}

