/**
 * Mapa centralizado de estilos por tipo de pieza de UI.
 * No aplica lógica; sólo define combinaciones de clases/tokens reutilizables.
 * Los componentes se irán migrando progresivamente a usar estas claves.
 */
export const componentStyles = {
  layout: {
    appBackground: "bg-background text-foreground",
    pageBackground: "bg-background",
    sidebarBackground: "bg-card text-ui",
    panelBackground: "app-panel",
    // TODO(FASE1-DS4): Verificar usos reales de `sidebarBackground` vs `app-panel`.
    // Si sólo es para layout de sidebar, mover a capa de layout y reducir aquí (C: residual).
  },

  typography: {
    pageTitle: "text-3xl font-bold text-ui",
    sectionTitle: "text-lg md:text-xl font-semibold text-ui",
    cardTitle: "text-base md:text-lg font-semibold text-ui",
    bodyText: "text-sm md:text-base text-ui",
    smallMetaText: "text-xs text-muted",
    pageSubtitle: "text-sm md:text-base text-ui/80 leading-relaxed",
    // TODO(FASE1-DS4): Revisar que `smallMetaText` no se use para contenido primario. Si se detecta, migrar a `text-ui/80`.
  },

  components: {
    // Botones
    buttonPrimary: "btn-primary btn-md",
    buttonSecondary: "btn-secondary btn-md",
    buttonGhost: "btn-ghost btn-md",
    buttonOutline: "btn-outline btn-md",
    // TODO(FASE1-DS4): Confirmar que todas las variantes pasan por `.btn-*` exclusivamente.

    // Inputs y selects (conectados al Design System vía ctrl-field)
    inputDefault: "ctrl-field",
    inputSm: "ctrl-field ctrl-field-sm",
    inputLg: "ctrl-field ctrl-field-lg",
    selectDefault: "ctrl-field",

    // Cards y paneles (más contraste frente al fondo)
    cardBase:
      "rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface)] shadow-sm",
    cardElevated:
      "rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface-elevated)] shadow-[var(--shadow-card)]",
    // KPIs: borde y fondo ligados al color primario para destacar
    cardKpi:
      "rounded-xl border border-[var(--color-primary)] bg-[var(--color-primary-soft)] shadow-sm hover:shadow-md transition-shadow",
    // Paneles neutros (filtros, contenedores secundarios)
    panelBase:
      "rounded-xl border border-[var(--color-border-muted)] bg-[var(--color-surface)]",
    // TODO(FASE1-DS4): Duplicidad de patrones: `rounded-xl border bg-*` repetido en cardBase/cardElevated/panelBase/cardStudent.
    // Candidato a factorizar como `cardBase` + variaciones de background/border/shadow para reducir repetición (compactación).

    // Variantes por tipo de entidad (Agenda)
    cardStudent: "rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface)] shadow-sm",
    cardAsignacion: "rounded-xl border-2 border-[var(--color-primary)] bg-[var(--color-primary-soft)] shadow-sm",
    cardPlan: "rounded-xl border-2 border-[var(--color-accent)] bg-[var(--color-surface)] shadow-sm",
    cardSemana: "rounded-xl border-2 border-[var(--color-secondary)] bg-[var(--color-surface)] shadow-sm",
    panelSesion: "rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface-muted)] hover:shadow-md transition-all",
    // TODO(FASE1-DS4): `cardStudent` ≈ `cardBase`; `cardAsignacion/Plan/Semana` podrían ser (cardBase + tone/border var).
    // `panelSesion` quizá deba ser (panelBase + surface-muted + hover-shadow) para maximizar reutilización.

    // Tonos de fila (sin cambiar estructura de DOM)
    toneRowPlan: "pl-3 border-l-4 border-l-[var(--color-accent)]",
    toneRowSemana: "pl-3 border-l-4 border-l-[var(--color-secondary)]",
    // TODO(FASE1-DS4): Candidatos a estilo único `toneRow(colorToken)` si añadimos helper o composición (evitar 2 claves si son idénticas).

    // Menú lateral
    menuSectionTitle:
      "text-xs uppercase tracking-wide text-ui/70 font-semibold px-2.5 py-2",
    menuItem:
      "flex items-center gap-2 px-2.5 py-2 rounded-lg text-ui/90 hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] focus-visible:ring-offset-2 focus-visible:ring-offset-background",
    menuItemActive:
      "bg-[var(--color-primary-soft)] text-[var(--color-text-primary)] border border-[var(--color-primary)] shadow-sm",
    // TODO(FASE1-DS4): `menuItem` usa `hover:bg-muted`; considerar reemplazo por `--color-surface-muted` para coherencia con resto del sistema.

    // Chips / badges genéricos
    chipDefault: "inline-flex items-center rounded-full bg-[var(--color-surface-muted)] text-ui text-xs px-2 py-0.5",
    // Badges status con tokens (suaves por opacidad de fondo/borde)
    badgeStatusSuccess: "rounded-full bg-[var(--color-success)]/10 text-[var(--color-success)] border border-[var(--color-success)]/20 text-xs",
    badgeStatusWarning: "rounded-full bg-[var(--color-warning)]/10 text-[var(--color-warning)] border border-[var(--color-warning)]/20 text-xs",
    badgeStatusDanger: "rounded-full bg-[var(--color-danger)]/10 text-[var(--color-danger)] border border-[var(--color-danger)]/20 text-xs",
    // TODO(FASE1-DS4): Unificar badges status mediante patrón único + token de estado (evitar 3 claves casi idénticas).

    // Tabla
    tableHeaderCell: "h-12 px-4 text-left align-middle font-semibold uppercase text-[11px] tracking-wide bg-[var(--color-surface-muted)] text-ui/80",
    tableRow: "border-b border-[var(--color-border-default)] transition-colors hover:bg-[var(--color-surface-muted)]",
    tableRowSelected: "bg-[hsl(var(--brand-50))] border-l-4 border-l-[hsl(var(--brand-500))]",
    // TODO(FASE1-DS4): Confirmar eliminación de `hover:bg-muted` en toda la tabla (coherencia var --color-surface-muted).

    // Estados vacíos / placeholders
    emptyStateIcon: "w-16 h-16 mx-auto mb-4 icon-empty",
    emptyStateText: "text-ui/80 text-sm",
    // Contraste alineado con guía (evitar `text-muted` en contenido primario).

    // Tabs - variantes estandarizadas
    tabsSegmentedContainer:
      "inline-flex items-center gap-1 rounded-full bg-muted p-1 shadow-sm",
    tabsSegmentedButton:
      "px-3 py-1.5 text-xs sm:text-sm rounded-full transition-colors duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[hsl(var(--ring))] text-ui/80 hover:bg-muted",
    tabsSegmentedButtonActive:
      "bg-[var(--color-primary-soft)] text-[var(--color-text-primary)] border border-[var(--color-primary)] shadow-sm",

    tabsUnderlineContainer:
      "flex items-center gap-1 border-b border-[var(--color-border-default)]",
    tabsUnderlineButton:
      "px-2.5 py-2 text-sm text-ui/80 hover:text-ui border-b-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] focus-visible:ring-offset-2 focus-visible:ring-offset-background",
    tabsUnderlineButtonActive:
      "text-ui border-[hsl(var(--ring))]",
    // TODO(FASE1-DS4): Validar que `--ring` (HSL Tailwind) y `--color-*` conviven bien y fijar preferencia (documentar en README).
  },
} as const;


