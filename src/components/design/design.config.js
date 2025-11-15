/**
 * Design System Configuration - Origen único de verdad
 * Estructura completa y profesional para todo el sistema de diseño
 */

// Mapeo de valores de radius a píxeles
const RADIUS_MAP = {
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
const SHADOW_MAP = {
  none: 'none',
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  md: '0 4px 12px rgba(0, 0, 0, 0.08)',
  lg: '0 10px 25px rgba(0, 0, 0, 0.1)',
  xl: '0 20px 40px rgba(0, 0, 0, 0.12)',
  card: '0 1px 3px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.04)',
};

// Mapeo de densidad a espaciado
const DENSITY_MAP = {
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

/**
 * Estructura completa del Design System
 */
export const DEFAULT_DESIGN = {
  // Colores principales
  colors: {
    primary: '#4F46E5',        // Indigo
    secondary: '#6366F1',      // Indigo claro
    accent: '#F97316',          // Naranja
    success: '#10B981',        // Verde
    warning: '#F59E0B',         // Ámbar
    danger: '#EF4444',         // Rojo
    info: '#3B82F6',           // Azul
    
    // Colores de superficie
    background: '#FFFFFF',
    surface: '#F9FAFB',
    surfaceElevated: '#FFFFFF',
    
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
        header: '1rem',
        content: '1rem',
        footer: '1rem',
      },
      radius: 'lg',
      shadow: 'md',
      border: '1px solid',
      borderColor: 'var(--color-border-default)',
      background: 'var(--color-surface-elevated)',
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
      color: 'rgba(79, 70, 229, 0.5)', // primary con opacidad
      offset: '2px',
    },
  },
  
  // Brand (compatibilidad con sistema anterior)
  brandHue: 26,
  theme: 'light',
};

/**
 * Helper para obtener valor de radius en píxeles
 */
export function getRadiusValue(radiusKey) {
  return RADIUS_MAP[radiusKey] || RADIUS_MAP.lg;
}

/**
 * Helper para obtener valor de shadow
 */
export function getShadowValue(shadowKey) {
  return SHADOW_MAP[shadowKey] || SHADOW_MAP.md;
}

/**
 * Helper para obtener espaciado según densidad
 */
export function getSpacingForDensity(density) {
  return DENSITY_MAP[density] || DENSITY_MAP.normal;
}

/**
 * Merge profundo de objetos
 */
function deepMerge(target, source) {
  const output = { ...target };
  if (isObject(target) && isObject(source)) {
    Object.keys(source).forEach(key => {
      if (isObject(source[key])) {
        if (!(key in target)) {
          Object.assign(output, { [key]: source[key] });
        } else {
          output[key] = deepMerge(target[key], source[key]);
        }
      } else {
        Object.assign(output, { [key]: source[key] });
      }
    });
  }
  return output;
}

function isObject(item) {
  return item && typeof item === 'object' && !Array.isArray(item);
}

/**
 * Normalizar design object para asegurar estructura completa
 */
export function normalizeDesign(design) {
  return deepMerge(DEFAULT_DESIGN, design || {});
}

/**
 * Generar CSS variables desde el design object
 */
export function generateCSSVariables(design) {
  // Normalizar design para asegurar estructura completa
  const normalized = normalizeDesign(design);
  const vars = {};
  
  // Colores
  if (normalized.colors) {
    Object.entries(normalized.colors).forEach(([key, value]) => {
      if (typeof value === 'string') {
        vars[`--color-${key}`] = value;
      } else if (typeof value === 'object' && value !== null) {
        Object.entries(value).forEach(([subKey, subValue]) => {
          vars[`--color-${key}-${subKey}`] = subValue;
        });
      }
    });
  }
  
  // Radius
  if (normalized.layout?.radius) {
    Object.entries(normalized.layout.radius).forEach(([key, value]) => {
      vars[`--radius-${key === 'global' ? 'base' : key}`] = getRadiusValue(value);
    });
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
  }
  
  // Componentes
  if (normalized.components) {
    if (normalized.components.input) {
      vars['--input-padding'] = normalized.components.input.padding || DEFAULT_DESIGN.components.input.padding;
      vars['--input-radius'] = getRadiusValue(normalized.components.input.radius || DEFAULT_DESIGN.components.input.radius);
    }
    if (normalized.components.button) {
      vars['--button-padding-sm'] = normalized.components.button.padding?.sm || DEFAULT_DESIGN.components.button.padding.sm;
      vars['--button-padding-md'] = normalized.components.button.padding?.md || DEFAULT_DESIGN.components.button.padding.md;
      vars['--button-padding-lg'] = normalized.components.button.padding?.lg || DEFAULT_DESIGN.components.button.padding.lg;
      vars['--button-radius'] = getRadiusValue(normalized.components.button.radius || DEFAULT_DESIGN.components.button.radius);
    }
    if (normalized.components.card) {
      vars['--card-padding-header'] = normalized.components.card.padding?.header || DEFAULT_DESIGN.components.card.padding.header;
      vars['--card-padding-content'] = normalized.components.card.padding?.content || DEFAULT_DESIGN.components.card.padding.content;
      vars['--card-radius'] = getRadiusValue(normalized.components.card.radius || DEFAULT_DESIGN.components.card.radius);
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
