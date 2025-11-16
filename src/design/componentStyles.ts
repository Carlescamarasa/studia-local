/**
 * Mapa centralizado de estilos por tipo de pieza de UI.
 * No aplica lógica; sólo define combinaciones de clases/tokens reutilizables.
 * Los componentes se irán migrando progresivamente a usar estas claves.
 */
// Helpers base para compactar variantes de card/panel
// NOTA: .app-card ya incluye radius, padding y shadow desde tokens CSS (index.css)
// Solo añadimos variantes de color/borde que no están en la clase base
const CARD_BASE = "app-card border border-[var(--color-border-strong)] bg-[var(--color-surface)]";
const CARD_ELEVATED = "app-card border border-[var(--color-border-strong)] bg-[var(--color-surface-elevated)]";
const PANEL_BASE = "app-panel";
const CARD_TONE_PRIMARY = "app-card border-2 border-[var(--color-primary)] bg-[var(--color-primary-soft)]";
const CARD_TONE_ACCENT = "app-card border-2 border-[var(--color-accent)] bg-[var(--color-surface)]";
const CARD_TONE_SECONDARY = "app-card border-2 border-[var(--color-secondary)] bg-[var(--color-surface)]";
const PANEL_SESSION = "app-panel bg-[var(--color-surface-muted)] hover:shadow-md transition-all";
const CARD_METRIC = "app-card border border-[var(--color-primary)] bg-[var(--color-primary-soft)] hover:shadow-md transition-shadow";

export const componentStyles = {
  layout: {
    appBackground: "bg-background text-foreground",
    pageBackground: "bg-background",
    sidebarBackground: "bg-card text-ui",
    panelBackground: "app-panel",
  },

  typography: {
    pageTitle: "text-3xl font-bold text-ui",
    sectionTitle: "text-lg md:text-xl font-semibold text-ui",
    cardTitle: "text-base md:text-lg font-semibold text-ui",
    bodyText: "text-sm md:text-base text-ui",
    smallMetaText: "text-xs text-muted",
    pageSubtitle: "text-sm md:text-base text-ui/80 leading-relaxed",
  },

  // Nuevos grupos genéricos
  containers: {
    cardBase: CARD_BASE,
    cardElevated: CARD_ELEVATED,
    cardMetric: CARD_METRIC,
    panelBase: PANEL_BASE,
  },

  items: {
    itemCard: CARD_BASE,
    itemCardHighlight: CARD_TONE_PRIMARY,
    itemRow: "flex items-center gap-2 px-3 py-2 rounded-lg border-b border-[var(--color-border-default)] hover:bg-[var(--color-surface-muted)] transition-colors",
    itemRowTone: "pl-3 border-l-4",
  },

  controls: {
    inputDefault: "ctrl-field",
    inputSm: "ctrl-field ctrl-field-sm",
    inputUnderline: "border-b-2 border-[var(--color-border-strong)] bg-transparent rounded-none px-0 py-2 text-ui placeholder:text-ui/60 focus-visible:border-[var(--color-primary)] focus-visible:ring-0",
    selectDefault: "ctrl-field",
  },

  buttons: {
    primary: "btn btn-primary btn-md",
    secondary: "btn btn-secondary btn-md",
    ghost: "btn btn-ghost btn-md",
    outline: "btn btn-outline btn-md",
    danger: "btn btn-danger btn-md",
  },

  tabs: {
    tabsSegmentedContainer: "inline-flex items-center gap-1 rounded-full bg-[var(--color-surface-muted)] p-1 shadow-sm",
    tabsSegmentedItem: "px-3 py-1.5 text-xs sm:text-sm rounded-full transition-colors duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[hsl(var(--ring))] text-ui/80 hover:bg-[var(--color-surface-muted)]",
    tabsSegmentedItemActive: "bg-[var(--color-primary-soft)] text-[var(--color-text-primary)] border border-[var(--color-primary)] shadow-sm",
    tabsUnderlineContainer: "flex items-center gap-1 border-b border-[var(--color-border-default)]",
    tabsUnderlineItem: "px-2.5 py-2 text-sm text-ui/80 hover:text-ui border-b-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] focus-visible:ring-offset-2 focus-visible:ring-offset-background",
    tabsUnderlineItemActive: "text-ui border-[hsl(var(--ring))]",
  },

  nav: {
    menuSectionTitle: "text-xs uppercase tracking-wide text-ui/70 font-semibold px-2.5 py-2",
    menuItem: "flex items-center gap-2 px-2.5 py-2 rounded-lg text-ui/90 hover:bg-[var(--color-surface-muted)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] focus-visible:ring-offset-2 focus-visible:ring-offset-background",
    menuItemActive: "bg-[var(--color-primary-soft)] text-[var(--color-text-primary)] border border-[var(--color-primary)] shadow-sm",
  },

  empty: {
    emptyIcon: "w-16 h-16 mx-auto mb-4 icon-empty",
    emptyText: "text-ui/80 text-sm",
  },

  status: {
    badgeDefault: "inline-flex items-center rounded-full bg-[var(--color-surface-muted)] text-ui text-xs px-2 py-0.5",
    badgeInfo: "rounded-full bg-[var(--color-info)]/10 text-[var(--color-info)] border border-[var(--color-info)]/20 text-xs",
    badgeSuccess: "rounded-full bg-[var(--color-success)]/10 text-[var(--color-success)] border border-[var(--color-success)]/20 text-xs",
    badgeWarning: "rounded-full bg-[var(--color-warning)]/10 text-[var(--color-warning)] border border-[var(--color-warning)]/20 text-xs",
    badgeDanger: "rounded-full bg-[var(--color-danger)]/10 text-[var(--color-danger)] border border-[var(--color-danger)]/20 text-xs",
  },

  // Componentes (mantener como alias para compatibilidad hacia atrás)
  components: {
    // Botones (alias hacia buttons.*)
    buttonPrimary: "btn btn-primary btn-md",
    buttonSecondary: "btn btn-secondary btn-md",
    buttonGhost: "btn btn-ghost btn-md",
    buttonOutline: "btn btn-outline btn-md",

    // Inputs y selects (alias hacia controls.*)
    inputDefault: "ctrl-field",
    inputSm: "ctrl-field ctrl-field-sm",
    inputLg: "ctrl-field ctrl-field-lg",
    selectDefault: "ctrl-field",

    // Cards y paneles (alias hacia containers.*)
    cardBase: CARD_BASE,
    cardElevated: CARD_ELEVATED,
    cardKpi: CARD_METRIC,
    panelBase: PANEL_BASE,

    // Variantes por tipo de entidad (alias hacia items.*)
    cardStudent: CARD_BASE,
    cardAsignacion: CARD_TONE_PRIMARY,
    cardPlan: CARD_TONE_ACCENT,
    cardSemana: CARD_TONE_SECONDARY,
    panelSesion: PANEL_SESSION,

    // Tonos de fila (alias hacia items.itemRowTone con variantes)
    toneRowPlan: "pl-3 border-l-4 border-l-[var(--color-accent)]",
    toneRowSemana: "pl-3 border-l-4 border-l-[var(--color-secondary)]",

    // Menú lateral (alias hacia nav.*)
    menuSectionTitle: "text-xs uppercase tracking-wide text-ui/70 font-semibold px-2.5 py-2",
    menuItem: "flex items-center gap-2 px-2.5 py-2 rounded-lg text-ui/90 hover:bg-[var(--color-surface-muted)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] focus-visible:ring-offset-2 focus-visible:ring-offset-background",
    menuItemActive: "bg-[var(--color-primary-soft)] text-[var(--color-text-primary)] border border-[var(--color-primary)] shadow-sm",

    // Chips / badges (alias hacia status.*)
    chipDefault: "inline-flex items-center rounded-full bg-[var(--color-surface-muted)] text-ui text-xs px-2 py-0.5",
    badgeStatusSuccess: "rounded-full bg-[var(--color-success)]/10 text-[var(--color-success)] border border-[var(--color-success)]/20 text-xs",
    badgeStatusWarning: "rounded-full bg-[var(--color-warning)]/10 text-[var(--color-warning)] border border-[var(--color-warning)]/20 text-xs",
    badgeStatusDanger: "rounded-full bg-[var(--color-danger)]/10 text-[var(--color-danger)] border border-[var(--color-danger)]/20 text-xs",

    // Tabla (mantener por ahora, no hay grupo genérico equivalente)
    tableHeaderCell: "h-12 px-4 text-left align-middle font-semibold uppercase text-[11px] tracking-wide bg-[var(--color-surface-muted)] text-ui/80",
    tableRow: "border-b border-[var(--color-border-default)] transition-colors hover:bg-[var(--color-surface-muted)]",
    tableRowSelected: "bg-[hsl(var(--brand-50))] border-l-4 border-l-[hsl(var(--brand-500))]",

    // Estados vacíos (alias hacia empty.*)
    emptyStateIcon: "w-16 h-16 mx-auto mb-4 icon-empty",
    emptyStateText: "text-ui/80 text-sm",

    // Tabs (alias hacia tabs.*)
    tabsSegmentedContainer: "inline-flex items-center gap-1 rounded-full bg-[var(--color-surface-muted)] p-1 shadow-sm",
    tabsSegmentedButton: "px-3 py-1.5 text-xs sm:text-sm rounded-full transition-colors duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[hsl(var(--ring))] text-ui/80 hover:bg-[var(--color-surface-muted)]",
    tabsSegmentedButtonActive: "bg-[var(--color-primary-soft)] text-[var(--color-text-primary)] border border-[var(--color-primary)] shadow-sm",
    tabsUnderlineContainer: "flex items-center gap-1 border-b border-[var(--color-border-default)]",
    tabsUnderlineButton: "px-2.5 py-2 text-sm text-ui/80 hover:text-ui border-b-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] focus-visible:ring-offset-2 focus-visible:ring-offset-background",
    tabsUnderlineButtonActive: "text-ui border-[hsl(var(--ring))]",
  },
} as const;


