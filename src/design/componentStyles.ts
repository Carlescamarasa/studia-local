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
  },

  typography: {
    pageTitle: "text-3xl font-bold text-ui",
    sectionTitle: "text-lg md:text-xl font-semibold text-ui",
    cardTitle: "text-base md:text-lg font-semibold text-ui",
    bodyText: "text-sm md:text-base text-ui",
    smallMetaText: "text-xs text-muted",
    pageSubtitle: "text-sm md:text-base text-ui/80 leading-relaxed",
  },

  components: {
    // Botones
    buttonPrimary: "btn-primary btn-md",
    buttonSecondary: "btn-secondary btn-md",
    buttonGhost: "btn-ghost btn-md",
    buttonOutline: "btn-outline btn-md",

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

    // Variantes por tipo de entidad (Agenda)
    cardStudent: "rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface)] shadow-sm",
    cardAsignacion: "rounded-xl border-2 border-[var(--color-primary)] bg-[var(--color-primary-soft)] shadow-sm",
    cardPlan: "rounded-xl border-2 border-[var(--color-accent)] bg-[var(--color-surface)] shadow-sm",
    cardSemana: "rounded-xl border-2 border-[var(--color-secondary)] bg-[var(--color-surface)] shadow-sm",
    panelSesion: "rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface-muted)] hover:shadow-md transition-all",

    // Tonos de fila (sin cambiar estructura de DOM)
    toneRowPlan: "pl-3 border-l-4 border-l-[var(--color-accent)]",
    toneRowSemana: "pl-3 border-l-4 border-l-[var(--color-secondary)]",

    // Menú lateral
    menuSectionTitle:
      "text-xs uppercase tracking-wide text-ui/70 font-semibold px-2.5 py-2",
    menuItem:
      "flex items-center gap-2 px-2.5 py-2 rounded-lg text-ui/90 hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] focus-visible:ring-offset-2 focus-visible:ring-offset-background",
    menuItemActive:
      "bg-[var(--color-primary-soft)] text-[var(--color-text-primary)] border border-[var(--color-primary)] shadow-sm",

    // Chips / badges genéricos
    chipDefault: "inline-flex items-center rounded-full bg-muted text-ui text-xs px-2 py-0.5",
    badgeStatusSuccess: "rounded-full bg-green-100 text-green-800 text-xs",
    badgeStatusWarning: "rounded-full bg-amber-100 text-amber-800 text-xs",
    badgeStatusDanger: "rounded-full bg-red-100 text-red-800 text-xs",

    // Tabla
    tableHeaderCell: "h-12 px-4 text-left align-middle font-semibold text-muted-foreground uppercase text-[11px] tracking-wide bg-muted",
    tableRow: "border-b border-ui transition-colors hover:bg-muted",
    tableRowSelected: "bg-[hsl(var(--brand-50))] border-l-4 border-l-[hsl(var(--brand-500))]",

    // Estados vacíos / placeholders
    emptyStateIcon: "w-16 h-16 mx-auto mb-4 icon-empty",
    emptyStateText: "text-muted text-sm",

    // Tabs - variantes estandarizadas
    tabsSegmentedContainer:
      "inline-flex items-center gap-1 rounded-full bg-muted p-1 shadow-sm",
    tabsSegmentedButton:
      "px-3 py-1.5 text-xs sm:text-sm rounded-full transition-colors duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[hsl(var(--ring))] text-ui/80 hover:bg-muted",
    tabsSegmentedButtonActive:
      "bg-[var(--color-primary-soft)] text-[var(--color-text-primary)] border border-[var(--color-primary)] shadow-sm",

    tabsUnderlineContainer:
      "flex items-center gap-1 border-b border-ui",
    tabsUnderlineButton:
      "px-2.5 py-2 text-sm text-ui/80 hover:text-ui border-b-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] focus-visible:ring-offset-2 focus-visible:ring-offset-background",
    tabsUnderlineButtonActive:
      "text-ui border-[hsl(var(--ring))]",
  },
} as const;


