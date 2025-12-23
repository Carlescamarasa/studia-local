/**
 * Mapa centralizado de estilos por tipo de pieza de UI.
 * No aplica lógica; sólo define combinaciones de clases/tokens reutilizables.
 * Los componentes se irán migrando progresivamente a usar estas claves.
 */
// Helpers base para compactar variantes de card/panel
// NOTA: .app-card ya incluye radius, padding y shadow desde tokens CSS (index.css)
// Solo añadimos variantes de color/borde que no están en la clase base
const CARD_BASE = "ui-card app-card bg-[var(--color-surface)]"; // El borde ya está en .app-card con opacidad
const CARD_ELEVATED = "ui-card app-card bg-[var(--color-surface-elevated)]"; // El borde ya está en .app-card con opacidad
const PANEL_BASE = "ui-panel app-panel";
const CARD_TONE_PRIMARY = "ui-card app-card border-2 border-[var(--color-primary)] bg-[var(--color-primary-soft)]";
const CARD_TONE_ACCENT = "ui-card app-card border-2 border-[var(--color-accent)] bg-[var(--color-surface)]";
const CARD_TONE_SECONDARY = "ui-card app-card border-2 border-[var(--color-secondary)] bg-[var(--color-surface)]";
const PANEL_SESSION = "ui-panel app-panel bg-[var(--color-surface-muted)] hover:shadow-md transition-all";
const CARD_METRIC = "ui-card app-card border border-[var(--color-border-default)]/20 bg-[var(--color-surface)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.12)] hover:-translate-y-0.5 transition-all duration-300";

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
    pageTitle: "text-2xl sm:text-3xl md:text-4xl font-semibold text-ui font-headings tracking-[-0.02em] leading-[1.1]",
    sectionTitle: "text-base sm:text-lg md:text-xl font-semibold text-ui font-headings tracking-[-0.01em]",
    cardTitle: "text-sm sm:text-base md:text-lg font-semibold text-ui font-headings tracking-[-0.01em]",
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
    itemRow: "flex items-center gap-2 px-3 py-2 border-b border-[var(--color-border-default)] hover:bg-[var(--color-surface-muted)] transition-colors",
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
    // Botones de eliminar sutiles (ghost con texto rojo, sin fondo rojo sólido)
    deleteSubtle: "text-[var(--color-danger)] hover:text-[var(--color-danger)] hover:bg-[var(--color-danger)]/10",
    // Botón de eliminar icono (para semanas, etc.)
    deleteIcon: "h-8 w-8 p-0 text-[var(--color-danger)] hover:bg-[var(--color-danger)]/10 rounded-[var(--btn-radius)]",
    // Botones de editar/duplicar sutiles (ghost con color de texto normal)
    editSubtle: "text-[var(--color-text-primary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-muted)]",
    // Botón de editar/duplicar icono (para semanas, etc.)
    editIcon: "h-8 w-8 p-0 text-[var(--color-text-primary)] hover:bg-[var(--color-surface-muted)] rounded-[var(--btn-radius)]",
    // Spinner inline para botones (usar con loading prop)
    spinnerInline: "w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin",
    spinnerInlineSm: "w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin",
    spinnerInlineLg: "w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin",
    // Variantes de radius para botones
    square: "rounded-sm", // 2-4px - muy cuadrado
    modern: "rounded-md", // 6px - moderno intermedio
  },

  tabs: {
    tabsSegmentedContainer: "inline-flex items-center gap-1 rounded-[var(--btn-radius)] bg-[var(--color-surface-muted)] p-1.5 shadow-sm",
    tabsSegmentedItem: "px-5 py-2 text-sm sm:text-base rounded-[var(--btn-radius)] transition-all duration-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[hsl(var(--ring))] text-ui/80 hover:bg-[var(--color-surface-muted)] font-buttons font-medium min-h-[var(--btn-height)]",
    tabsSegmentedItemActive: "bg-[var(--color-primary-soft)] text-[var(--color-text-primary)] border border-[var(--color-primary)] shadow-sm font-buttons font-medium",
    tabsUnderlineContainer: "flex items-center gap-1 border-b border-[var(--color-border-default)]",
    tabsUnderlineItem: "px-2.5 py-2 text-sm text-ui/80 hover:text-ui border-b-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] focus-visible:ring-offset-2 focus-visible:ring-offset-background font-buttons font-medium",
    tabsUnderlineItemActive: "text-ui border-[hsl(var(--ring))] font-buttons font-medium",
  },

  nav: {
    menuSectionTitle: "text-xs uppercase tracking-wide text-ui/70 font-semibold px-2.5 py-2",
    menuItem: "flex items-center gap-2 px-2.5 py-2 rounded-lg text-ui/90 hover:bg-[var(--color-surface-muted)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] focus-visible:ring-offset-2 focus-visible:ring-offset-background",
    menuItemActive: "bg-[var(--color-primary)]/10 text-[var(--color-text-primary)] border border-[var(--color-primary)]/20 shadow-sm",
  },

  empty: {
    // Estados vacíos básicos
    emptyIcon: "w-16 h-16 mx-auto mb-4 icon-empty text-[var(--color-text-secondary)]",
    emptyText: "text-ui/80 text-sm",
    emptyTitle: "text-lg font-semibold text-ui mb-2",
    emptyDescription: "text-sm text-[var(--color-text-secondary)] mb-4",
    // Contenedor de empty state
    emptyContainer: "flex flex-col items-center justify-center py-12 px-4 text-center",
    emptyContainerCompact: "flex flex-col items-center justify-center py-8 px-4 text-center",
    // Variantes por tipo
    emptyNoData: "flex flex-col items-center justify-center py-12 px-4 text-center",
    emptyNoResults: "flex flex-col items-center justify-center py-8 px-4 text-center",
    emptyError: "flex flex-col items-center justify-center py-12 px-4 text-center",
    // Acciones en empty states
    emptyAction: "mt-4",
  },

  auth: {
    // Contenedor principal de la página de login
    loginPageContainer: "min-h-screen flex items-center justify-center p-4 relative overflow-hidden",
    loginPageBackground: "absolute inset-0 overflow-hidden pointer-events-none",
    loginCardContainer: "relative z-10 w-full max-w-md",
    loginCard: "border-2 shadow-2xl backdrop-blur-sm",
    loginHeader: "text-center space-y-6 pb-8 pt-8",
    loginLogoContainer: "flex justify-center",
    loginLogoWrapper: "relative w-20 h-20 rounded-2xl flex items-center justify-center overflow-hidden transition-transform hover:scale-105",
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
    // Estados semánticos expandidos
    statusActive: "inline-flex items-center rounded-full bg-gradient-to-r from-[var(--color-success)]/10 to-[var(--color-success)]/5 text-[var(--color-success)] border border-[var(--color-success)]/20 text-xs px-2 py-0.5",
    statusPending: "inline-flex items-center rounded-full bg-[var(--color-warning)]/10 text-[var(--color-warning)] border border-[var(--color-warning)]/20 text-xs px-2 py-0.5",
    statusCompleted: "inline-flex items-center rounded-full bg-[var(--color-info)]/10 text-[var(--color-info)] border border-[var(--color-info)]/20 text-xs px-2 py-0.5",
    statusCancelled: "inline-flex items-center rounded-full bg-[var(--color-danger)]/10 text-[var(--color-danger)] border border-[var(--color-danger)]/20 text-xs px-2 py-0.5",
    // Prioridades
    priorityLow: "inline-flex items-center rounded-full bg-[var(--color-info)]/10 text-[var(--color-info)] border border-[var(--color-info)]/20 text-xs px-2 py-0.5",
    priorityMedium: "inline-flex items-center rounded-full bg-[var(--color-warning)]/10 text-[var(--color-warning)] border border-[var(--color-warning)]/20 text-xs px-2 py-0.5",
    priorityHigh: "inline-flex items-center rounded-full bg-[var(--color-danger)]/10 text-[var(--color-danger)] border border-[var(--color-danger)]/20 text-xs px-2 py-0.5",
    priorityCritical: "inline-flex items-center rounded-full bg-[var(--color-danger)]/20 text-[var(--color-danger)] border-2 border-[var(--color-danger)]/40 text-xs px-2 py-0.5 font-semibold",
  },

  loading: {
    // Spinner base (usar con variantes de tamaño)
    spinner: "border-[var(--color-primary)] border-t-transparent rounded-full animate-spin",
    spinnerSm: "w-4 h-4 border-2",
    spinnerMd: "w-6 h-6 border-2",
    spinnerLg: "w-8 h-8 border-[3px]",
    spinnerXl: "w-12 h-12 border-4",
    // Contenedor de loading con texto
    container: "flex flex-col items-center gap-4",
    containerFullPage: "flex items-center justify-center min-h-screen bg-background",
    containerCentered: "flex items-center justify-center min-h-[80vh]",
    // Texto de loading
    text: "text-[var(--color-text-secondary)] text-sm",
    textFullPage: "text-ui/80 text-sm",
  },

  skeleton: {
    // Base para skeleton (animación de pulso)
    base: "animate-pulse bg-[var(--color-surface-muted)] rounded-[var(--radius-ctrl)]",
    // Variantes específicas
    card: "animate-pulse bg-[var(--color-surface-muted)] rounded-[var(--radius-card)]",
    text: "animate-pulse bg-[var(--color-surface-muted)] rounded h-4",
    textSm: "animate-pulse bg-[var(--color-surface-muted)] rounded h-3",
    textLg: "animate-pulse bg-[var(--color-surface-muted)] rounded h-5",
    avatar: "animate-pulse bg-[var(--color-surface-muted)] rounded-full",
    avatarSm: "animate-pulse bg-[var(--color-surface-muted)] rounded-full w-8 h-8",
    avatarMd: "animate-pulse bg-[var(--color-surface-muted)] rounded-full w-10 h-10",
    avatarLg: "animate-pulse bg-[var(--color-surface-muted)] rounded-full w-12 h-12",
    // Para líneas de texto en listas
    line: "animate-pulse bg-[var(--color-surface-muted)] rounded h-4 w-full",
    lineShort: "animate-pulse bg-[var(--color-surface-muted)] rounded h-4 w-3/4",
    lineLong: "animate-pulse bg-[var(--color-surface-muted)] rounded h-4 w-full",
  },

  // Microinteracciones y animaciones
  motion: {
    // Transiciones base
    transitionBase: "transition-all duration-300 ease-out",
    transitionFast: "transition-all duration-150 ease-out",
    transitionSlow: "transition-all duration-400 ease-out",
    // Transiciones específicas
    transitionTransform: "transition-transform duration-300 ease-out",
    transitionColors: "transition-colors duration-300 ease-out",
    transitionOpacity: "transition-opacity duration-300 ease-out",
    transitionShadow: "transition-shadow duration-300 ease-out",
    // Hover effects
    hoverScale: "hover:scale-[1.02] transition-transform duration-300 ease-out",
    hoverScaleSmall: "hover:scale-[1.01] transition-transform duration-300 ease-out",
    hoverLift: "hover:-translate-y-0.5 transition-transform duration-300 ease-out",
    // Active effects
    activeScale: "active:scale-[0.98] transition-transform duration-150 ease-out",
    activeScaleSmall: "active:scale-[0.97] transition-transform duration-150 ease-out",
    // Focus effects
    focusRing: "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2",
    // Animaciones de entrada
    fadeIn: "animate-in fade-in duration-200",
    slideUp: "animate-in slide-in-from-bottom-2 duration-300",
    scaleIn: "animate-in zoom-in-95 duration-200",
    // Para cards
    cardHover: "hover:scale-[1.02] hover:shadow-lg transition-all duration-300 ease-out",
    cardActive: "active:scale-[0.98] transition-transform duration-150 ease-out",
  },

  // Sistema de elevación
  elevation: {
    // Niveles de elevación (sombras)
    level1: "shadow-[0_1px_2px_rgba(0,0,0,0.04)]",
    level2: "shadow-[0_2px_8px_rgba(0,0,0,0.08)]",
    level3: "shadow-[0_4px_16px_rgba(0,0,0,0.12)]",
    level4: "shadow-[0_8px_24px_rgba(0,0,0,0.16)]",
    level5: "shadow-[0_12px_32px_rgba(0,0,0,0.20)]",
    // Hover elevación
    hoverLevel1: "hover:shadow-[0_2px_8px_rgba(0,0,0,0.08)] transition-shadow duration-200",
    hoverLevel2: "hover:shadow-[0_4px_16px_rgba(0,0,0,0.12)] transition-shadow duration-200",
    hoverLevel3: "hover:shadow-[0_8px_24px_rgba(0,0,0,0.16)] transition-shadow duration-200",
  },

  // Sistema de tablas mejoradas
  table: {
    // Contenedor de tabla
    container: "w-full overflow-x-auto",
    containerSticky: "w-full overflow-x-auto relative",
    // Tabla base
    table: "w-full caption-bottom text-sm border-collapse",
    // Header
    header: "sticky top-0 z-10 border-b border-[var(--color-border-default)]/30 bg-[var(--color-surface-muted)]/50",
    headerCell: "h-12 px-4 text-left align-middle font-semibold uppercase text-[11px] tracking-wide text-[var(--color-text-secondary)] bg-[var(--color-surface-muted)]/50",
    headerCellSortable: "cursor-pointer hover:bg-[var(--color-surface-muted)]/70 transition-colors",
    // Body
    body: "bg-[var(--color-surface)]",
    // Row
    row: "border-b border-[var(--color-border-default)]/20 transition-colors",
    rowZebra: "even:bg-[var(--color-surface-muted)]/20",
    rowHover: "hover:bg-[var(--color-surface-muted)]/30",
    rowSelected: "bg-[var(--color-primary-soft)] border-l-4 border-l-[var(--color-primary)]",
    rowClickable: "cursor-pointer",
    // Cell - sin bordes verticales
    cell: "px-4 py-3 align-middle text-[var(--color-text-primary)]",
    cellCompact: "px-3 py-2 align-middle text-[var(--color-text-primary)]",
  },

  // Sistema de iconografía
  icons: {
    xs: "w-3 h-3",
    sm: "w-4 h-4",
    md: "w-5 h-5",
    lg: "w-6 h-6",
    xl: "w-8 h-8",
    "2xl": "w-12 h-12",
    // Con colores semánticos
    primary: "text-[var(--color-primary)]",
    secondary: "text-[var(--color-text-secondary)]",
    success: "text-[var(--color-success)]",
    warning: "text-[var(--color-warning)]",
    danger: "text-[var(--color-danger)]",
    info: "text-[var(--color-info)]",
    muted: "text-[var(--color-text-secondary)]",
  },

  // Sistema de formularios mejorados
  forms: {
    // Contenedor de campo
    fieldContainer: "space-y-1.5",
    // Label
    label: "block text-sm font-medium text-[var(--color-text-primary)] mb-1.5",
    labelRequired: "after:content-['*'] after:ml-0.5 after:text-[var(--color-danger)]",
    labelOptional: "after:content-['_(opcional)'] after:ml-1 after:text-[var(--color-text-secondary)] after:text-xs after:font-normal",
    // Input/Select/Textarea
    input: "ctrl-field",
    inputError: "ctrl-field border-[var(--color-danger)] focus-visible:border-[var(--color-danger)] focus-visible:ring-[var(--color-danger)]/20",
    inputSuccess: "ctrl-field border-[var(--color-success)] focus-visible:border-[var(--color-success)]",
    // Mensajes
    errorMessage: "text-xs text-[var(--color-danger)] mt-1 flex items-center gap-1",
    successMessage: "text-xs text-[var(--color-success)] mt-1 flex items-center gap-1",
    helpMessage: "text-xs text-[var(--color-text-secondary)] mt-1",
    // Indicadores visuales
    errorIcon: "w-3 h-3 text-[var(--color-danger)]",
    successIcon: "w-3 h-3 text-[var(--color-success)]",
  },

  // Sistema de modales mejorados
  modal: {
    // Overlay
    overlay: "fixed inset-0 z-[250] bg-[var(--color-overlay-backdrop)] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
    // Contenedor
    container: "fixed left-[50%] top-[50%] z-[251] grid w-full translate-x-[-50%] translate-y-[-50%] gap-4 border border-[var(--color-border-strong)] bg-[var(--color-surface-card)] p-6 shadow-[0_8px_24px_rgba(0,0,0,0.16)] duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] rounded-[var(--radius-modal)]",
    // Tamaños
    sizeSm: "max-w-sm",
    sizeMd: "max-w-lg",
    sizeLg: "max-w-2xl",
    sizeXl: "max-w-4xl",
    sizeFull: "max-w-[95vw]",
    // Header
    header: "flex flex-col space-y-1.5 text-center sm:text-left",
    title: "text-lg font-semibold leading-none tracking-tight text-[var(--color-text-primary)]",
    description: "text-sm text-[var(--color-text-secondary)]",
    // Footer
    footer: "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 gap-2",
    // Close button (accesible para touch - mínimo 44x44px)
    closeButton: "absolute right-3 top-3 p-2 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2 disabled:pointer-events-none touch-manipulation",
  },

  // Sistema de notificaciones/toasts
  notifications: {
    // Contenedor base
    toast: "group pointer-events-auto relative flex w-full items-center justify-between space-x-4 overflow-hidden rounded-[var(--radius-card)] border p-4 pr-8 shadow-lg transition-all",
    // Variantes por tipo
    toastSuccess: "border-[var(--color-success)]/30 bg-[var(--color-success)]/10 text-[var(--color-success)]",
    toastError: "border-[var(--color-danger)]/30 bg-[var(--color-danger)]/10 text-[var(--color-danger)]",
    toastWarning: "border-[var(--color-warning)]/30 bg-[var(--color-warning)]/10 text-[var(--color-warning)]",
    toastInfo: "border-[var(--color-info)]/30 bg-[var(--color-info)]/10 text-[var(--color-info)]",
    toastDefault: "border-[var(--color-border-default)] bg-[var(--color-surface)] text-[var(--color-text-primary)]",
    // Descripción
    description: "text-sm text-[var(--color-text-secondary)]",
    // Acciones
    actionButton: "bg-[var(--color-primary)] text-[var(--color-text-inverse)] hover:bg-[var(--color-secondary)]",
    cancelButton: "bg-[var(--color-surface-muted)] text-[var(--color-text-primary)] hover:bg-[var(--color-surface-muted)]/80",
  },

  // Responsive y touch
  touch: {
    // Touch targets mínimos (44x44px recomendado por WCAG)
    targetMin: "min-h-[44px] min-w-[44px]",
    targetComfortable: "min-h-[48px] min-w-[48px]",
    // Espaciado para gestos
    swipeArea: "touch-pan-y",
    // Bottom sheet para móvil
    bottomSheet: "fixed inset-x-0 bottom-0 z-[252] bg-[var(--color-surface)] border-t border-[var(--color-border-strong)] rounded-t-[var(--radius-modal)] shadow-[0_-8px_24px_rgba(0,0,0,0.16)] data-[state=open]:animate-slide-in-from-bottom data-[state=closed]:animate-slide-out-to-bottom",
  },

  // Drag and Drop visual
  dnd: {
    // Elemento siendo arrastrado
    dragging: "opacity-50 scale-95 rotate-2",
    // Zona de drop
    dropZone: "border-2 border-dashed border-[var(--color-primary)] bg-[var(--color-primary-soft)]/30 rounded-[var(--radius-card)] p-4",
    dropZoneActive: "border-[var(--color-primary)] bg-[var(--color-primary-soft)]/50",
    dropZoneInvalid: "border-[var(--color-danger)] bg-[var(--color-danger)]/10",
    // Preview del elemento arrastrado
    dragPreview: "shadow-lg border-2 border-[var(--color-primary)] bg-[var(--color-surface)] rounded-[var(--radius-card)] p-2",
    // Indicador de posición
    dropIndicator: "h-1 bg-[var(--color-primary)] rounded-full mx-2 my-1",
  },

  // Accesibilidad
  a11y: {
    // Skip link
    skipLink: "skip-link",
    // Focus mejorado
    focusEnhanced: "focus-visible-enhanced",
    // Screen reader only
    srOnly: "sr-only absolute w-px h-px p-0 -m-px overflow-hidden whitespace-nowrap border-0",
  },

  // FASE 2: Refinamiento - Estilos translúcidos y degradados
  effects: {
    // Reproductor translúcido y flotante (glassmorphism)
    playerTranslucent: "bg-[var(--color-surface)]/15 backdrop-blur-xl border border-[var(--color-border-default)]/20 rounded-[var(--radius-card)] shadow-[0_8px_32px_rgba(0,0,0,0.12)] overflow-hidden",
    playerTranslucentHover: "hover:shadow-[0_12px_40px_rgba(0,0,0,0.15)] transition-all duration-300",
    // Degradados sutiles para botones primary
    gradientPrimary: "bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-secondary)]",
    gradientPrimaryHover: "bg-gradient-to-br from-[var(--color-secondary)] to-[var(--color-primary)]",
    // Degradados sutiles para acentos
    gradientAccent: "bg-gradient-to-br from-[var(--color-accent)] to-[var(--color-primary)]",
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
    tabsSegmentedButton: "px-5 py-2 text-sm sm:text-base rounded-[var(--btn-radius)] transition-all duration-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[hsl(var(--ring))] text-ui/80 hover:bg-[var(--color-surface-muted)] font-buttons font-medium min-h-[var(--btn-height)]",
    tabsSegmentedButtonActive: "bg-[var(--color-primary-soft)] text-[var(--color-text-primary)] border border-[var(--color-primary)] shadow-sm font-buttons font-medium",
    tabsUnderlineContainer: "flex items-center gap-1 border-b border-[var(--color-border-default)]",
    tabsUnderlineButton: "px-2.5 py-2 text-sm text-ui/80 hover:text-ui border-b-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] focus-visible:ring-offset-2 focus-visible:ring-offset-background font-buttons font-medium",
    tabsUnderlineButtonActive: "text-ui border-[hsl(var(--ring))] font-buttons font-medium",
  },
} as const;


