export const designSystem = {
  colors: {
    // Paleta principal
    // TODO(auditoría-DS3): Confirmar alineación completa con `src/components/design/designConfig.ts`.
    // - Este archivo define tokens referencia pero actualmente no parece ser consumido directamente por los componentes.
    // - Verificar si 'accent', 'info', 'surfaceElevated' y 'textInverse' deben existir aquí para reflejar todos los tokens de `DEFAULT_DESIGN.colors`.
    primary: "var(--color-primary)",
    primarySoft: "var(--color-primary-soft)",
    secondary: "var(--color-secondary)",

    background: "var(--color-background)",
    surface: "var(--color-surface)",
    surfaceMuted: "var(--color-surface-muted)",

    // Texto
    textPrimary: "var(--color-text-primary)",
    textSecondary: "var(--color-text-secondary)",
    textMuted: "var(--color-text-muted)",
    // TODO(auditoría-DS3): Falta mapeo explícito para `textInverse` si lo usamos en botones (btn-primary).

    // Estados
    success: "var(--color-success)",
    warning: "var(--color-warning)",
    danger: "var(--color-danger)",

    // Bordes y anillos
    border: "var(--color-border-default)",
    borderMuted: "var(--color-border-muted)",
    borderStrong: "var(--color-border-strong)",
    ring: "var(--ring)",
  },

  typography: {
    fontFamilyBase: "var(--font-family-base)",
    fontFamilyHeadings: "var(--font-family-headings)",

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
    // TODO(auditoría-DS3): Validar si `--space-base` existe. `generateCSSVariables` emite `--space-{sm,base,md,lg,xl}` según densidad; confirmar usos reales.
  },

  radius: {
    radiusSm: "4px",
    radiusMd: "8px",
    radiusLg: "12px",
    radiusFull: "9999px",
    // TODO(auditoría-DS3): El sistema operativo usa `--radius-card` / `--radius-ctrl` vía CSS vars.
    // Este bloque es referencia; revisar si se puede derivar todo desde `designConfig` para evitar duplicidad.
  },

  shadows: {
    shadowSm: "0 1px 2px rgba(15, 23, 42, 0.06)",
    shadowMd: "var(--shadow-card)",
    shadowLg: "0 20px 40px rgba(15, 23, 42, 0.12)",
    // TODO(auditoría-DS3): `shadowMd` depende de `--shadow-card`. Confirmar que todas las cartas usan `--shadow-card` exclusivamente.
  },

  motion: {
    transitionBase: "150ms ease-out",
    transitionFast: "100ms ease-out",
    transitionSlow: "250ms ease-out",
    // TODO(auditoría-DS3): Documentar conexión de estos tokens con utilidades/clases. Buscar usos reales.
  },
} as const;


