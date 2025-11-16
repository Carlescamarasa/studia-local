export const designSystem = {
  colors: {
    // Paleta principal
    // TODO(FASE1-DS4): Confirmar alineación completa con `src/components/design/designConfig.ts`.
    // - Este archivo define tokens referencia pero actualmente no parece ser consumido directamente por los componentes.
    // - Verificar si 'accent', 'info', 'surfaceElevated' y 'textInverse' deben existir aquí para reflejar todos los tokens de `DEFAULT_DESIGN.colors`.
    // Clasificación:
    // - primary (A: esencial) | primarySoft (B: derivable desde primary)
    // - secondary (A: esencial)
    // - background/surface/surfaceMuted (A: esenciales) | surfaceElevated (FALTA aquí, existe en DEFAULT_DESIGN → añadir o derivar) 
    primary: "var(--color-primary)",
    primarySoft: "var(--color-primary-soft)",
    secondary: "var(--color-secondary)",

    background: "var(--color-background)",
    surface: "var(--color-surface)",
    surfaceElevated: "var(--color-surface-elevated)",
    surfaceMuted: "var(--color-surface-muted)",

    // Texto
    textPrimary: "var(--color-text-primary)",
    textSecondary: "var(--color-text-secondary)",
    textMuted: "var(--color-text-muted)",
    textInverse: "var(--color-text-inverse)",
    // Candidatos (B/C):
    // - textMuted (B: podría ser derivado/opacidad de textSecondary si deseamos compactar)

    // Estados
    success: "var(--color-success)",
    warning: "var(--color-warning)",
    danger: "var(--color-danger)",
    info: "var(--color-info)",
    accent: "var(--color-accent)",

    // Bordes y anillos
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
    // TODO(FASE1-DS4): Validar si `--space-base` existe y su consumo real.
    // Clasificación:
    // - spacing{Xs..Xl} (A: esenciales si hay consumo); si no hay consumos directos → C (residuales) y podrían derivarse vía utilidades/tokens de densidad.
  },

  radius: {
    radiusSm: "4px",
    radiusMd: "8px",
    radiusLg: "12px",
    radiusFull: "9999px",
    // TODO(FASE1-DS4): El sistema usa `--radius-card` / `--radius-ctrl` vía CSS vars (designConfig).
    // Clasificación:
    // - Estos valores aquí son (C: residuales) si no se referencian directamente; preferir única fuente desde `designConfig`.
  },

  shadows: {
    shadowSm: "0 1px 2px rgba(15, 23, 42, 0.06)",
    shadowMd: "var(--shadow-card)",
    shadowLg: "0 20px 40px rgba(15, 23, 42, 0.12)",
    // TODO(FASE1-DS4): `shadowMd` depende de `--shadow-card`. Confirmar que todas las cartas usan `--shadow-card` exclusivamente. 
    // Clasificación:
    // - shadowMd (A: esencial como alias a var) | shadowSm/shadowLg (B: podrían derivarse desde un mapa central si apenas se usan).
  },

  motion: {
    transitionBase: "150ms ease-out",
    transitionFast: "100ms ease-out",
    transitionSlow: "250ms ease-out",
    // TODO(FASE1-DS4): Documentar conexión de estos tokens con utilidades/clases. Buscar usos reales (posible C si no hay consumo).
  },
} as const;


