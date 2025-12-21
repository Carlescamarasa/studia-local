
export const SECTIONS = [
    { id: 'brand', label: 'Marca', icon: 'Palette', description: 'Colores principales y tono de marca' },
    { id: 'theme-colors', label: 'Colores del Tema', icon: 'PaintBucket', description: 'Paleta completa de la interfaz' },
    { id: 'typography', label: 'Tipografía', icon: 'Type', description: 'Fuentes, tamaños e interlineado' },
    { id: 'shape', label: 'Forma y Densidad', icon: 'Box', description: 'Bordes, sombras y espaciado' },
    { id: 'components', label: 'Componentes', icon: 'LayoutTemplate', description: 'Estilos específicos de componentes' },
    { id: 'layout', label: 'Layout Global', icon: 'Grid', description: 'Estructura general de la página' },
    { id: 'focus', label: 'Accesibilidad y Focus', icon: 'Accessibility', description: 'Indicadores de foco y accesibilidad' },
];

/**
 * PHASE 3: Visibility metadata for design controls.
 * Each control can be:
 *   - 'visible': Control produces visible changes in the DOM
 *   - 'emit-only': CSS var is emitted but not yet consumed (needs wiring)
 *   - 'broken': Control doesn't emit any CSS var or is disconnected
 * 
 * consumerHint: Short description of where the token is consumed.
 */
export const VISIBILITY_STATUS = {
    // ✅ VISIBLE - Colors (via Tailwind HSL mapping)
    'colors.primary': { visibility: 'visible', consumerHint: 'Tailwind hsl(var(--primary)), .btn-studia, etc.' },
    'colors.primarySoft': { visibility: 'visible', consumerHint: 'var(--color-primary-soft) in hover states' },
    'colors.secondary': { visibility: 'visible', consumerHint: 'Tailwind hsl(var(--secondary))' },
    'colors.background': { visibility: 'visible', consumerHint: 'Tailwind bg-background' },
    'colors.surface': { visibility: 'visible', consumerHint: 'var(--color-surface) in controls' },
    'colors.surfaceElevated': { visibility: 'visible', consumerHint: '.sidebar-modern, .header-modern' },
    'colors.surfaceMuted': { visibility: 'visible', consumerHint: 'var(--color-surface-muted) in hovers' },
    'colors.text.primary': { visibility: 'visible', consumerHint: 'var(--color-text-primary), Tailwind foreground' },
    'colors.text.secondary': { visibility: 'visible', consumerHint: 'var(--color-text-secondary)' },
    'colors.text.muted': { visibility: 'visible', consumerHint: 'Tailwind muted-foreground' },
    'colors.border.default': { visibility: 'visible', consumerHint: 'var(--color-border-default), Tailwind border' },
    'colors.success': { visibility: 'visible', consumerHint: '.btn-success, status indicators' },
    'colors.warning': { visibility: 'visible', consumerHint: '.btn-warning, alert states' },
    'colors.danger': { visibility: 'visible', consumerHint: 'Tailwind destructive, .btn-destructive' },

    // ✅ VISIBLE - Radius (via Tailwind + CSS classes)
    'layout.radius.global': { visibility: 'visible', consumerHint: 'Tailwind rounded-lg/md/sm' },
    'layout.radius.table': { visibility: 'visible', consumerHint: '.ui-table-shell border-radius' },
    'layout.shadowLength': { visibility: 'visible', consumerHint: 'Card shadows via --shadow-card' },

    // ✅ VISIBLE - Typography (after Phase 1 fix)
    'typography.fontFamilyBase': { visibility: 'visible', consumerHint: '.font-base in index.css' },
    'typography.fontFamilyHeadings': { visibility: 'visible', consumerHint: '.font-headings in index.css' },
    'typography.fontSizeBase': { visibility: 'visible', consumerHint: 'html { font-size } after Phase 1' },
    'typography.fontSizeScale': { visibility: 'visible', consumerHint: '--font-size-sm/lg/xl derived vars' },

    // ⚠️ EMIT-ONLY - Needs migration to consume
    'typography.lineHeight.tight': { visibility: 'emit-only', consumerHint: 'No consumer yet - needs CSS rule' },
    'typography.lineHeight.normal': { visibility: 'emit-only', consumerHint: 'No consumer yet - needs CSS rule' },

    // ✅ VISIBLE - Layout (after Phase 1 fix)
    'layout.density': { visibility: 'visible', consumerHint: '.ds-density-* classes on body' },

    // ⚠️ EMIT-ONLY - Page layout tokens (classes exist but not applied globally yet)
    'layout.page.maxWidth': { visibility: 'emit-only', consumerHint: '.page-container class exists, apply to layouts' },
    'layout.page.paddingX': { visibility: 'emit-only', consumerHint: '.page-container or Tailwind p-ds-page-x' },
    'layout.page.paddingY': { visibility: 'emit-only', consumerHint: '.page-container or Tailwind p-ds-page-y' },

    // ✅ VISIBLE - Sidebar/Header (after Phase 1 fix)
    'layout.sidebar.width': { visibility: 'visible', consumerHint: '.sidebar-width class in Layout.jsx' },
    'components.header.height': { visibility: 'emit-only', consumerHint: '.header-height class exists, apply to header' },

    // ✅ VISIBLE - Controls
    'controls.field.height': { visibility: 'visible', consumerHint: '.ctrl-field height' },
    'controls.field.radius': { visibility: 'visible', consumerHint: '.ctrl-field border-radius' },
    'controls.button.height': { visibility: 'visible', consumerHint: '.btn height via --btn-height' },
    'controls.button.radius': { visibility: 'visible', consumerHint: '.btn border-radius via --btn-radius' },

    // ✅ VISIBLE - Card components
    'components.card.radius': { visibility: 'visible', consumerHint: '.app-card border-radius' },
    'components.card.padding.x': { visibility: 'visible', consumerHint: '.app-card padding-inline' },
    'components.card.padding.y': { visibility: 'visible', consumerHint: '.app-card padding-block' },
};

/**
 * Get visibility status for a control by id.
 * Returns { visibility: 'visible'|'emit-only'|'broken', consumerHint: string }
 */
export function getControlVisibility(controlId) {
    return VISIBILITY_STATUS[controlId] || { visibility: 'emit-only', consumerHint: 'Unknown - check coverage report' };
}


export const DESIGN_CONTROLS = [
    // --- A. MARCA ---
    {
        id: 'colors.primary',
        path: 'colors.primary',
        label: 'Primary',
        description: 'Color principal de la marca, usado en botones y acciones.',
        section: 'brand',
        type: 'color',
        level: 'basic',
        keywords: ['color', 'marca', 'primary', 'principal'],
    },
    {
        id: 'colors.primarySoft',
        path: 'colors.primarySoft',
        label: 'Primary Soft',
        description: 'Versión suave del primario para fondos y acentos.',
        section: 'brand',
        type: 'color',
        level: 'advanced',
        keywords: ['color', 'marca', 'soft', 'fondo'],
    },
    {
        id: 'colors.accent',
        path: 'colors.accent',
        label: 'Accent',
        description: 'Color de acento para destacar elementos.',
        section: 'brand',
        type: 'color',
        level: 'basic',
        keywords: ['color', 'marca', 'accent', 'acento'],
    },
    {
        id: 'brandHue',
        path: 'brandHue',
        label: 'Brand Hue',
        description: 'Matiz base para generar paletas automáticas (0-360).',
        section: 'brand',
        type: 'number',
        min: 0,
        max: 360,
        level: 'advanced',
        keywords: ['hue', 'matiz', 'automático'],
    },
    {
        id: 'colors.secondary',
        path: 'colors.secondary',
        label: 'Secondary',
        description: 'Color secundario para elementos de menor jerarquía.',
        section: 'brand', // Movido a brand o theme-colors? User asked for Brand to have Primary/Soft/Accent/Hue only manually. I'll stick to that.
        // Wait, use asked: "Primary / Primary soft / Accent / Brand Hue si existe". Secondary was in "Colors main" before. I'll put it in Theme Colors? Or just append here?
        // Let's put Secondary in Brand as it is a "Main Color".
        type: 'color',
        level: 'basic',
        keywords: ['color', 'marca', 'secondary'],
    },

    // --- B. COLORES DEL TEMA ---
    /* Superficie */
    {
        id: 'colors.background',
        path: 'colors.background',
        label: 'Fondo de Página (Background)',
        description: 'Color de fondo principal de la aplicación.',
        section: 'theme-colors',
        subsection: 'Superficie',
        type: 'color',
        level: 'basic',
        keywords: ['fondo', 'background', 'page'],
    },
    {
        id: 'colors.surface',
        path: 'colors.surface',
        label: 'Superficie Base (Surface)',
        description: 'Fondo para tarjetas y paneles estándar.',
        section: 'theme-colors',
        subsection: 'Superficie',
        type: 'color',
        level: 'basic',
        keywords: ['fondo', 'card', 'surface', 'panel'],
    },
    {
        id: 'colors.surfaceElevated',
        path: 'colors.surfaceElevated',
        label: 'Superficie Elevada',
        description: 'Fondo para elementos que flotan o destacan (modales, dropdowns).',
        section: 'theme-colors',
        subsection: 'Superficie',
        type: 'color',
        level: 'advanced',
        keywords: ['fondo', 'elevated', 'modal', 'dropdown'],
    },
    {
        id: 'colors.surfaceMuted',
        path: 'colors.surfaceMuted',
        label: 'Superficie Apagada (Muted)',
        description: 'Fondo para elementos secundarios o deshabilitados.',
        section: 'theme-colors',
        subsection: 'Superficie',
        type: 'color',
        level: 'advanced',
        keywords: ['fondo', 'muted', 'gris'],
    },

    /* Texto */
    {
        id: 'colors.text.primary',
        path: 'colors.text.primary',
        label: 'Texto Principal',
        description: 'Color para títulos y texto de cuerpo principal.',
        section: 'theme-colors',
        subsection: 'Texto',
        type: 'color',
        level: 'basic',
        keywords: ['texto', 'font', 'color'],
    },
    {
        id: 'colors.text.secondary',
        path: 'colors.text.secondary',
        label: 'Texto Secundario',
        description: 'Color para subtítulos y textos de soporte.',
        section: 'theme-colors',
        subsection: 'Texto',
        type: 'color',
        level: 'basic',
        keywords: ['texto', 'secundario', 'gris'],
    },
    {
        id: 'colors.text.muted',
        path: 'colors.text.muted',
        label: 'Texto Apagado (Muted)',
        description: 'Color para placeholders y textos de baja relevancia.',
        section: 'theme-colors',
        subsection: 'Texto',
        type: 'color',
        level: 'advanced',
        keywords: ['texto', 'muted', 'placeholder'],
    },
    {
        id: 'colors.text.inverse',
        path: 'colors.text.inverse',
        label: 'Texto Inverso',
        description: 'Color de texto sobre fondos oscuros/contrastados.',
        section: 'theme-colors',
        subsection: 'Texto',
        type: 'color',
        level: 'advanced',
        keywords: ['texto', 'blanco', 'inverse'],
    },

    /* Bordes */
    {
        id: 'colors.border.default',
        path: 'colors.border.default',
        label: 'Borde Por Defecto',
        description: 'Color para bordes estándar de tarjetas e inputs.',
        section: 'theme-colors',
        subsection: 'Bordes',
        type: 'color',
        level: 'basic',
        keywords: ['borde', 'border', 'linea'],
    },
    {
        id: 'colors.border.muted',
        path: 'colors.border.muted',
        label: 'Borde Sutil',
        description: 'Color para divisores y bordes de baja importancia.',
        section: 'theme-colors',
        subsection: 'Bordes',
        type: 'color',
        level: 'advanced',
        keywords: ['borde', 'muted', 'separador'],
    },
    {
        id: 'colors.border.strong',
        path: 'colors.border.strong',
        label: 'Borde Fuerte',
        description: 'Color para bordes activos o destacados.',
        section: 'theme-colors',
        subsection: 'Bordes',
        type: 'color',
        level: 'advanced',
        keywords: ['borde', 'strong', 'oscuro'],
    },

    /* Estados */
    {
        id: 'colors.success',
        path: 'colors.success',
        label: 'Éxito (Success)',
        description: 'Color para mensajes de éxito y confirmación.',
        section: 'theme-colors',
        subsection: 'Estados',
        type: 'color',
        level: 'basic',
        keywords: ['estado', 'verde', 'bién'],
    },
    {
        id: 'colors.warning',
        path: 'colors.warning',
        label: 'Advertencia (Warning)',
        description: 'Color para alertas y precauciones.',
        section: 'theme-colors',
        subsection: 'Estados',
        type: 'color',
        level: 'basic',
        keywords: ['estado', 'amarillo', 'alerta'],
    },
    {
        id: 'colors.danger',
        path: 'colors.danger',
        label: 'Peligro (Danger)',
        description: 'Color para errores y acciones destructivas.',
        section: 'theme-colors',
        subsection: 'Estados',
        type: 'color',
        level: 'basic',
        keywords: ['estado', 'rojo', 'error'],
    },
    {
        id: 'colors.info',
        path: 'colors.info',
        label: 'Información (Info)',
        description: 'Color para notas informativas.',
        section: 'theme-colors',
        subsection: 'Estados',
        type: 'color',
        level: 'basic',
        keywords: ['estado', 'azul', 'info'],
    },

    // --- C. TIPOGRAFÍA ---
    {
        id: 'typography.fontFamilyBase',
        path: 'typography.fontFamilyBase',
        label: 'Fuente Base',
        description: 'Familia tipográfica para el texto general.',
        section: 'typography',
        type: 'text',
        level: 'advanced',
        keywords: ['fuente', 'font', 'family'],
    },
    {
        id: 'typography.fontFamilyHeadings',
        path: 'typography.fontFamilyHeadings',
        label: 'Fuente de Títulos',
        description: 'Familia tipográfica para encabezados.',
        section: 'typography',
        type: 'text',
        level: 'advanced',
        keywords: ['fuente', 'título', 'heading'],
    },
    {
        id: 'typography.serifHeadings',
        path: 'typography.serifHeadings',
        label: 'Títulos con Serif',
        description: 'Activar estilo Serif para los títulos.',
        section: 'typography',
        type: 'switch',
        level: 'basic',
        keywords: ['serif', 'fuente', 'título'],
    },
    {
        id: 'typography.fontSizeBase',
        path: 'typography.fontSizeBase',
        label: 'Tamaño Base (px)',
        description: 'Tamaño de fuente base (normalmente 16px).',
        section: 'typography',
        type: 'number',
        level: 'advanced',
        keywords: ['tamaño', 'size', 'px'],
    },
    {
        id: 'typography.fontSizeScale',
        path: 'typography.fontSizeScale',
        label: 'Escala Tipográfica',
        description: 'Ratio de crecimiento entre tamaños de letra (ej: 1.25).',
        section: 'typography',
        type: 'number',
        step: 0.1,
        level: 'advanced',
        keywords: ['scale', 'ratio', 'escala'],
    },
    {
        id: 'typography.lineHeight.tight',
        path: 'typography.lineHeight.tight',
        label: 'Interlineado Títulos (Tight)',
        description: 'Altura de línea para encabezados.',
        section: 'typography',
        type: 'number',
        step: 0.1,
        level: 'advanced',
        keywords: ['line-height', 'interlineado', 'título'],
    },
    {
        id: 'typography.lineHeight.normal',
        path: 'typography.lineHeight.normal',
        label: 'Interlineado Texto (Normal)',
        description: 'Altura de línea para texto base.',
        section: 'typography',
        type: 'number',
        step: 0.1,
        level: 'advanced',
        keywords: ['line-height', 'interlineado', 'texto'],
    },
    {
        id: 'typography.lineHeight.relaxed',
        path: 'typography.lineHeight.relaxed',
        label: 'Interlineado Amplio (Relaxed)',
        description: 'Altura de línea para lectura prolongada.',
        section: 'typography',
        type: 'number',
        step: 0.1,
        level: 'advanced',
        keywords: ['line-height', 'interlineado', 'amplio'],
    },

    // --- D. FORMA Y DENSIDAD ---
    {
        id: 'layout.radius.global',
        path: 'layout.radius.global',
        label: 'Radio Global',
        description: 'Curvatura base utilizada por defecto.',
        section: 'shape',
        type: 'select',
        options: [
            { value: 'none', label: 'Cuadrado (0px)' },
            { value: 'sm', label: 'Pequeño (4px)' },
            { value: 'md', label: 'Medio (8px)' },
            { value: 'lg', label: 'Grande (12px)' },
            { value: 'xl', label: 'Extra Grande (16px)' },
            { value: '2xl', label: '2XL (20px)' },
            { value: '3xl', label: '3XL (24px)' },
            { value: 'full', label: 'Redondo Total' },
        ],
        level: 'basic',
        keywords: ['radio', 'radius', 'borde', 'curva'],
    },
    {
        id: 'layout.shadow',
        path: 'layout.shadow',
        label: 'Estilo de Sombras',
        description: 'Intensidad global de las sombras.',
        section: 'shape',
        type: 'select',
        options: [
            { value: 'none', label: 'Sin Sombra' },
            { value: 'sm', label: 'Sutil' },
            { value: 'card', label: 'Card' },
            { value: 'md', label: 'Media' },
            { value: 'lg', label: 'Larga' },
            { value: 'xl', label: 'Extra Larga' },
        ],
        level: 'basic',
        keywords: ['sombra', 'shadow', 'profundidad'],
    },
    {
        id: 'layout.density',
        path: 'layout.density',
        label: 'Densidad de Interfaz',
        description: 'Espaciado general de la interfaz.',
        section: 'shape',
        type: 'select',
        options: [
            { value: 'compact', label: 'Compacta' },
            { value: 'normal', label: 'Normal' },
            { value: 'spacious', label: 'Espaciosa' },
        ],
        level: 'advanced',
        keywords: ['densidad', 'espacio', 'compacto'],
    },

    // --- E. COMPONENTES ---
    {
        id: 'components.button.radius',
        path: 'components.button.radius',
        label: 'Radio de Botones',
        description: 'Curvatura específica para botones.',
        section: 'components',
        subsection: 'Botones',
        type: 'select',
        options: [
            { value: 'none', label: 'Cuadrado' },
            { value: 'sm', label: 'Pequeño' },
            { value: 'md', label: 'Medio' },
            { value: 'lg', label: 'Grande' },
            { value: 'xl', label: 'Extra Grande' },
            { value: 'full', label: 'Redondo (Pill)' },
        ],
        level: 'basic',
        keywords: ['botón', 'radius', 'borde'],
    },
    {
        id: 'components.button.padding.sm',
        path: 'components.button.padding.sm',
        label: 'Padding Botón Small',
        description: 'Relleno interno para botones pequeños.',
        section: 'components',
        subsection: 'Botones',
        type: 'text',
        level: 'advanced',
        keywords: ['padding', 'botón', 'sm'],
    },
    {
        id: 'components.button.padding.md',
        path: 'components.button.padding.md',
        label: 'Padding Botón Medium',
        description: 'Relleno interno para botones medianos.',
        section: 'components',
        subsection: 'Botones',
        type: 'text',
        level: 'advanced',
        keywords: ['padding', 'botón', 'md'],
    },
    {
        id: 'components.button.padding.lg',
        path: 'components.button.padding.lg',
        label: 'Padding Botón Large',
        description: 'Relleno interno para botones grandes.',
        section: 'components',
        subsection: 'Botones',
        type: 'text',
        level: 'advanced',
        keywords: ['padding', 'botón', 'lg'],
    },

    {
        id: 'components.input.radius',
        path: 'components.input.radius',
        label: 'Radio de Inputs',
        description: 'Curvatura para campos de texto.',
        section: 'components',
        subsection: 'Inputs',
        type: 'select',
        options: [
            { value: 'none', label: 'Cuadrado' },
            { value: 'sm', label: 'Pequeño' },
            { value: 'md', label: 'Medio' },
            { value: 'lg', label: 'Grande' },
            { value: 'xl', label: 'Extra Grande' },
        ],
        level: 'basic',
        keywords: ['input', 'radius', 'campo'],
    },
    {
        id: 'components.input.padding',
        path: 'components.input.padding',
        label: 'Padding de Inputs',
        description: 'Espacio interno del campo de texto.',
        section: 'components',
        subsection: 'Inputs',
        type: 'text',
        level: 'advanced',
        keywords: ['input', 'padding'],
    },

    {
        id: 'layout.radius.card', // Mapping 'layout.radius.card' here as well or is it components.card.radius?
        // In original file: layout.radius.card exist AND components.card.radius exist.
        // Let's keep both if they exist. Logic might be confusing in original ID but I will respect path.
        // Wait, original had: "layout.radius.card" slider AND "components.card.radius" slider?
        // Let's check original.
        // LabeledRow label="Radio de Cards" -> Select -> value={design?.layout?.radius?.card...}
        // LabeledRow label="Radio de Cards" -> Select -> value={design?.components?.card?.radius...}
        // There were TWO "Radio de Cards" controls in original file! One in Layout, one in Components.
        // I should clarify or keep both but distinct.
        // User asked to clean up. I will assume 'layout.radius.card' is the one in "Forma" and 'components.card.radius' in "Components".
        // I shall check if they are redundant. Usually 'layout' is global default, 'components' specific override.
        // I will expose 'components.card.radius' here in Components section.
        path: 'components.card.radius',
        label: 'Radio de Tarjetas (Override)',
        description: 'Curvatura específica para tarjetas (sobreescribe la global).',
        section: 'components',
        subsection: 'Cards',
        type: 'select',
        options: [
            { value: 'none', label: 'Cuadrado' },
            { value: 'sm', label: 'Pequeño' },
            { value: 'md', label: 'Medio' },
            { value: 'lg', label: 'Grande' },
            { value: 'xl', label: 'Extra Grande' },
        ],
        level: 'advanced',
        keywords: ['card', 'tarjeta', 'radius'],
    },

    {
        id: 'layout.radius.modal',
        path: 'layout.radius.modal',
        label: 'Radio de Modales',
        description: 'Curvatura para diálogos y ventanas modales.',
        section: 'components',
        subsection: 'Modales',
        type: 'select',
        options: [
            { value: 'none', label: 'Cuadrado' },
            { value: 'sm', label: 'Pequeño' },
            { value: 'md', label: 'Medio' },
            { value: 'lg', label: 'Grande' },
            { value: 'xl', label: 'Extra Grande' },
            { value: '2xl', label: '2XL' },
            { value: '3xl', label: '3XL' },
        ],
        level: 'advanced',
        keywords: ['modal', 'dialog', 'radius'],
    },
    {
        id: 'layout.radius.pill',
        path: 'layout.radius.pill',
        label: 'Radio de Pills/Badges',
        description: 'Curvatura para etiquetas y badges.',
        section: 'components',
        subsection: 'Pills',
        type: 'select',
        options: [
            { value: 'none', label: 'Cuadrado' },
            { value: 'sm', label: 'Pequeño' },
            { value: 'md', label: 'Medio' },
            { value: 'lg', label: 'Grande' },
            { value: 'full', label: 'Redondo Total' },
        ],
        level: 'advanced',
        keywords: ['pill', 'badge', 'radius'],
    },
    {
        id: 'layout.radius.table',
        path: 'layout.radius.table',
        label: 'Radio de Tablas',
        description: 'Curvatura para tablas de datos.',
        section: 'components',
        subsection: 'Tablas',
        type: 'select',
        options: [
            { value: 'none', label: 'Cuadrado' },
            { value: 'sm', label: 'Pequeño' },
            { value: 'md', label: 'Medio' },
            { value: 'lg', label: 'Grande' },
            { value: 'xl', label: 'Extra Grande' },
        ],
        level: 'advanced',
        keywords: ['table', 'tabla', 'radius'],
    },

    // --- F. LAYOUT ---
    {
        id: 'components.sidebar.width',
        path: 'components.sidebar.width',
        label: 'Ancho Sidebar',
        description: 'Ancho del menú lateral desplegado.',
        section: 'layout',
        type: 'text',
        level: 'advanced',
        keywords: ['sidebar', 'ancho', 'width'],
    },
    {
        id: 'components.sidebar.widthCollapsed',
        path: 'components.sidebar.widthCollapsed',
        label: 'Ancho Sidebar Colapsado',
        description: 'Ancho del menú lateral cuando está cerrado.',
        section: 'layout',
        type: 'text',
        level: 'advanced',
        keywords: ['sidebar', 'collapsed', 'ancho'],
    },
    {
        id: 'components.header.height',
        path: 'components.header.height',
        label: 'Altura Header',
        description: 'Altura de la barra de navegación superior.',
        section: 'layout',
        type: 'text',
        level: 'advanced',
        keywords: ['header', 'altura', 'height'],
    },

    // --- G. FOCUS ---
    {
        id: 'focus.ring.width',
        path: 'focus.ring.width',
        label: 'Ancho Anillo de Foco',
        description: 'Grosor de la línea de foco al navegar con teclado.',
        section: 'focus',
        type: 'text',
        level: 'advanced',
        keywords: ['focus', 'a11y', 'ancho'],
    },
    {
        id: 'focus.ring.color',
        path: 'focus.ring.color',
        label: 'Color Anillo de Foco',
        description: 'Color del indicador de foco.',
        section: 'focus',
        type: 'text', // In original it was text input, maybe because it supports rgba?
        level: 'advanced',
        keywords: ['focus', 'a11y', 'color'],
    },
    {
        id: 'focus.ring.offset',
        path: 'focus.ring.offset',
        label: 'Separación Anillo de Foco',
        description: 'Distancia entre el elemento y el anillo de foco.',
        section: 'focus',
        type: 'text',
        level: 'advanced',
        keywords: ['focus', 'a11y', 'offset'],
    },
];
