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
const CARD_METRIC = "app-card border border-[var(--color-border-default)] bg-[var(--color-surface)] hover:shadow-sm transition-shadow";

export const componentStyles = {
  layout: {
    // Fondos y backgrounds (compatibilidad hacia atrás)
    appBackground: "bg-background text-foreground",
    pageBackground: "bg-background",
    sidebarBackground: "bg-card text-ui",
    panelBackground: "app-panel",
    
    // Nuevos patrones de layout de página
    page: "max-w-[var(--page-max-width)] mx-auto px-3 md:px-6 lg:px-[var(--page-padding-x)] py-4 md:py-6 lg:py-[var(--page-padding-y)] space-y-4 md:space-y-6 lg:space-y-[var(--page-section-gap-y)]",
    
    pageHeaderRow: "flex items-center justify-between gap-4 flex-wrap",
    
    pageContent: "space-y-[var(--page-section-gap-y)]",
    
    // Grid de 12 columnas
    grid12: "grid grid-cols-12 gap-x-2 md:gap-x-4 lg:gap-x-[var(--grid-gap-x)] gap-y-2 md:gap-y-4 lg:gap-y-[var(--grid-gap-y)]",
    
    // Grid main + aside (12 columnas)
    grid12MainAside: "", // Se usa junto con grid12, las clases específicas se aplican en los hijos
    grid12Main: "col-span-12 lg:col-span-8",
    grid12Aside: "col-span-12 lg:col-span-4",
    
    // Grids responsive reutilizables
    grid2: "grid grid-cols-1 md:grid-cols-2 gap-x-[var(--grid-gap-x)] gap-y-[var(--grid-gap-y)]",
    grid3: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-[var(--grid-gap-x)] gap-y-[var(--grid-gap-y)]",
    grid4: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-[var(--grid-gap-x)] gap-y-[var(--grid-gap-y)]",
    
    // Fila de KPIs (responsive)
    kpiRow: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-[var(--grid-gap-x)] gap-y-[var(--grid-gap-y)]",
    
    // Sección de tabla
    tableSection: "overflow-x-auto",
    
    // Barra de filtros
    filterBar: "flex flex-wrap items-center gap-2 md:gap-3",
    // Espaciados compactos reutilizables
    gapCompact: "gap-1.5",
    paddingCompact: "p-1.5",
  },

  typography: {
    // Títulos usan Tenor Sans (fontFamilyHeadings) desde variables CSS
    pageTitle: "text-2xl sm:text-3xl md:text-4xl font-bold text-ui font-headings",
    sectionTitle: "text-base sm:text-lg md:text-xl font-semibold text-ui font-headings",
    cardTitle: "text-sm sm:text-base md:text-lg font-semibold text-ui font-headings",
    // Textos base usan fuente del sistema (fontFamilyBase) desde variables CSS
    bodyText: "text-base sm:text-base md:text-base text-ui font-base",
    smallMetaText: "text-xs text-[var(--color-text-secondary)] font-base",
    pageSubtitle: "text-base sm:text-base md:text-base text-ui/80 leading-relaxed font-base",
    // Textos pequeños para elementos compactos (ejercicios, rondas, etc.)
    compactText: "text-xs",
    compactTextTiny: "text-[10px]",
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
    // Elementos compactos (ejercicios, rondas en secuencia)
    compactItem: "flex items-center gap-1.5 p-1.5 bg-[var(--color-surface-elevated)] border border-[var(--color-border-default)] rounded-[var(--radius-ctrl)] text-xs",
    compactItemHover: "flex items-center gap-1.5 p-1.5 bg-[var(--color-surface-elevated)] border border-[var(--color-border-default)] rounded-[var(--radius-ctrl)] text-xs cursor-pointer hover:bg-[var(--color-surface-muted)] transition-colors",
  },

  controls: {
    inputDefault: "ctrl-field",
    inputSm: "ctrl-field ctrl-field-sm",
    inputUnderline: "border-b-2 border-[var(--color-border-strong)] bg-transparent rounded-none px-0 py-2 text-ui placeholder:text-ui/60 focus-visible:border-[var(--color-primary)] focus-visible:ring-0",
    selectDefault: "ctrl-field",
    textareaDefault: "ctrl-field",
  },

  // Patrón estándar para campos de formulario (Label + Input/Select/Textarea)
  form: {
    // Contenedor de campo completo (incluye Label + Input + mensajes)
    field: "space-y-1.5",
    // Solo el espaciado entre Label y control
    fieldLabel: "block mb-1.5",
    // Mensaje de ayuda/error debajo del campo
    fieldMessage: "text-xs mt-1",
    // Descripción opcional
    fieldDescription: "text-xs text-[var(--color-text-secondary)] mt-1",
  },

  buttons: {
    primary: "btn btn-primary btn-md",
    secondary: "btn btn-secondary btn-md",
    ghost: "btn btn-ghost btn-md",
    outline: "btn btn-outline btn-md",
    danger: "btn btn-danger btn-md",
    // Botones pequeños con iconos (para ejercicios, rondas, etc.)
    iconSmall: "h-6 px-2 text-xs rounded-[var(--btn-radius)]",
    iconTiny: "h-5 px-1 text-xs rounded-[var(--btn-radius)]",
    // Botones de acción compactos (Editar Sesión, Eliminar, etc.)
    actionCompact: "text-xs h-7 rounded-[var(--btn-radius)]",
  },

  tabs: {
    tabsSegmentedContainer: "inline-flex items-center gap-1 rounded-[var(--btn-radius)] bg-[var(--color-surface-muted)] p-1.5 shadow-sm",
    tabsSegmentedItem: "px-4 py-2 text-sm sm:text-base rounded-[var(--btn-radius)] transition-all duration-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[hsl(var(--ring))] text-ui/80 hover:bg-[var(--color-surface-muted)] font-buttons font-medium min-h-[var(--btn-height)]",
    tabsSegmentedItemActive: "bg-[var(--color-primary-soft)] text-[var(--color-text-primary)] border border-[var(--color-primary)] shadow-sm font-buttons font-medium",
    tabsUnderlineContainer: "flex items-center gap-1 border-b border-[var(--color-border-default)]",
    tabsUnderlineItem: "px-2.5 py-2 text-sm text-ui/80 hover:text-ui border-b-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] focus-visible:ring-offset-2 focus-visible:ring-offset-background font-buttons font-medium",
    tabsUnderlineItemActive: "text-ui border-[hsl(var(--ring))] font-buttons font-medium",
  },

  nav: {
    menuSectionTitle: "text-xs uppercase tracking-wide text-ui/70 font-semibold px-2.5 py-2",
    menuItem: "flex items-center gap-2 px-2.5 py-2 rounded-lg text-ui/90 hover:bg-[var(--color-surface-muted)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] focus-visible:ring-offset-2 focus-visible:ring-offset-background",
    menuItemActive: "bg-[var(--sidebar-item-active-bg,var(--color-primary-soft))] text-[var(--sidebar-item-active-text,var(--color-text-primary))] border border-[var(--color-primary)] shadow-sm",
  },

  empty: {
    emptyIcon: "w-16 h-16 mx-auto mb-4 icon-empty",
    emptyText: "text-ui/80 text-sm",
  },

  auth: {
    // Contenedor principal de la página de login
    loginPageContainer: "min-h-screen flex items-center justify-center p-4 relative overflow-hidden",
    loginPageBackground: "absolute inset-0 overflow-hidden pointer-events-none",
    loginCardContainer: "relative z-10 w-full max-w-md",
    loginCard: "border-2 shadow-2xl backdrop-blur-sm",
    loginHeader: "text-center space-y-6 pb-8 pt-8",
    loginLogoContainer: "flex justify-center",
    loginLogoWrapper: "relative w-20 h-20 rounded-2xl flex items-center justify-center shadow-lg overflow-hidden transition-transform hover:scale-105",
    loginLogoShine: "absolute inset-0 opacity-30",
    loginTitleContainer: "space-y-2",
    loginSubtitleContainer: "space-y-2",
    loginDivider: "flex items-center justify-center gap-2 pt-2",
    loginDividerLine: "h-1 w-12 rounded-full",
    loginDividerIcon: "w-5 h-5",
    loginForm: "space-y-5",
    loginFooter: "mt-8 pt-6 border-t border-[var(--color-border-default)] text-center",
    loginFooterLinks: "flex flex-wrap items-center justify-center gap-2 text-xs text-[var(--color-text-secondary)]",
    loginFooterLink: "text-[var(--color-text-primary)] hover:underline transition-colors",
    loginDecorativeCircle: "absolute -top-40 -right-40 w-80 h-80 rounded-full opacity-20 blur-3xl",
    loginDecorativeCircleBottom: "absolute -bottom-40 -left-40 w-80 h-80 rounded-full opacity-20 blur-3xl",
    loginPatternOverlay: "absolute inset-0 opacity-[0.03]",
  },

  status: {
    badgeDefault: "inline-flex items-center rounded-full bg-[var(--color-surface-muted)] text-ui text-xs px-2 py-0.5",
    badgeInfo: "inline-flex items-center rounded-full bg-[var(--color-info)]/10 text-[var(--color-info)] border border-[var(--color-info)]/20 text-xs px-2 py-0.5",
    badgeSuccess: "inline-flex items-center rounded-full bg-[var(--color-success)]/10 text-[var(--color-success)] border border-[var(--color-success)]/20 text-xs px-2 py-0.5",
    badgeWarning: "inline-flex items-center rounded-full bg-[var(--color-warning)]/10 text-[var(--color-warning)] border border-[var(--color-warning)]/20 text-xs px-2 py-0.5",
    badgeDanger: "inline-flex items-center rounded-full bg-[var(--color-danger)]/10 text-[var(--color-danger)] border border-[var(--color-danger)]/20 text-xs px-2 py-0.5",
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
    toneRowPlan: "pl-3 border-l-4 border-l-[var(--color-primary)]",
    toneRowSemana: "pl-3 border-l-4 border-l-[var(--color-primary)]",
    toneRowFeedback: "pl-3 border-l-4 border-l-[var(--color-info)]",

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
    tabsSegmentedContainer: "inline-flex items-center gap-1 rounded-[var(--btn-radius)] bg-[var(--color-surface-muted)] p-1.5 shadow-sm",
    tabsSegmentedButton: "px-4 py-2 text-sm sm:text-base rounded-[var(--btn-radius)] transition-all duration-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[hsl(var(--ring))] text-ui/80 hover:bg-[var(--color-surface-muted)] font-buttons font-medium min-h-[var(--btn-height)]",
    tabsSegmentedButtonActive: "bg-[var(--color-primary-soft)] text-[var(--color-text-primary)] border border-[var(--color-primary)] shadow-sm font-buttons font-medium",
    tabsUnderlineContainer: "flex items-center gap-1 border-b border-[var(--color-border-default)]",
    tabsUnderlineButton: "px-2.5 py-2 text-sm text-ui/80 hover:text-ui border-b-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] focus-visible:ring-offset-2 focus-visible:ring-offset-background font-buttons font-medium",
    tabsUnderlineButtonActive: "text-ui border-[hsl(var(--ring))] font-buttons font-medium",
  },
} as const;


