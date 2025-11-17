export const designSystem = {
  colors: {
    // Base
    background: "var(--color-background)",
    surface: "var(--color-surface)",
    surfaceElevated: "var(--color-surface-elevated)",
    surfaceMuted: "var(--color-surface-muted)",

    // Texto
    textPrimary: "var(--color-text-primary)",
    textSecondary: "var(--color-text-secondary)",
    textMuted: "var(--color-text-muted)",
    textInverse: "var(--color-text-inverse)",

    // Acciones y marca
    primary: "var(--color-primary)",
    primarySoft: "var(--color-primary-soft)",
    secondary: "var(--color-secondary)",
    accent: "var(--color-accent)",

    // Estados
    default: "var(--color-border-default)", // Neutral/border por defecto
    info: "var(--color-info)",
    success: "var(--color-success)",
    warning: "var(--color-warning)",
    danger: "var(--color-danger)",

    // Bordes y foco
    border: "var(--color-border-default)",
    borderMuted: "var(--color-border-muted)",
    borderStrong: "var(--color-border-strong)",
    ring: "var(--ring)",
  },

  typography: {
    fontFamilyBase: "var(--font-family-base)",
    fontFamilyHeadings: "var(--font-family-headings)",

    // Clasificación: todos A (esenciales) como referencia tipográfica
    textXs: "0.75rem", // 12px
    textSm: "0.875rem", // 14px
    textBase: "1rem", // 16px
    textLg: "1.125rem", // 18px
    textXl: "1.25rem", // 20px

    headingSm: "1.25rem", // 20px
    headingMd: "1.5rem", // 24px
    headingLg: "2rem", // 32px

    lineHeightTight: 1.25,
    lineHeightNormal: 1.5,
    lineHeightRelaxed: 1.75,
  },

  spacing: {
    spacingXs: "var(--space-sm)",
    spacingSm: "var(--space-base)",
    spacingMd: "var(--space-md)",
    spacingLg: "var(--space-lg)",
    spacingXl: "var(--space-xl)",
  },

  radius: {
    radiusSm: "4px",
    radiusMd: "8px",
    radiusLg: "12px",
    radiusFull: "9999px",
  },

  shadows: {
    shadowSm: "0 1px 2px rgba(15, 23, 42, 0.06)",
    shadowMd: "var(--shadow-card)",
    shadowLg: "0 20px 40px rgba(15, 23, 42, 0.12)",
  },

  motion: {
    transitionBase: "150ms ease-out",
    transitionFast: "100ms ease-out",
    transitionSlow: "250ms ease-out",
  },

  layout: {
    page: {
      maxWidth: "1280px", // max-w-7xl equivalente
      paddingX: "1rem", // 16px base, responsive se maneja en CSS
      paddingY: "1.5rem", // 24px base
      sectionGapY: "1.5rem", // 24px separación entre secciones
    },
    grid: {
      columns: 12,
      gapX: "1rem", // 16px gap horizontal
      gapY: "1rem", // 16px gap vertical
    },
    sidebar: {
      width: "16rem", // 256px - ya existe en components.sidebar, pero lo exponemos aquí también
    },
    section: {
      paddingY: "1rem", // 16px padding vertical de secciones
    },
    density: 1.0, // Multiplicador de densidad (1.0 = normal, >1 más aire, <1 más denso)
  },
} as const;


