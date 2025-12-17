/**
 * Centralized route definitions to avoid hardcoded strings.
 */

export const ROUTES = {
    // Main
    HOME: "/",
    LOGIN: "/login",

    // Apps
    PROGRESO: "/progreso",
    CONFIGURACION: "/configuracion",
    REPORTES: "/reportes",

    // Other known paths (can be expanded)
    AGENDA: "/agenda",
    BIBLIOTECA: "/biblioteca",
    USUARIOS: "/usuarios",
    PREPARACION: "/preparacion",
    HOY: "/hoy",
    CALENDARIO: "/calendario",
    SOPORTE: "/soporte",
    SOPORTE_PROF: "/soporte-prof",
    ESTUDIANTES: "/estudiantes",
    ASIGNACIONES: "/asignaciones",
    ASIGNACION_DETALLE: "/asignacion-detalle",
    ADAPTAR_ASIGNACION: "/adaptar-asignacion",
};

/**
 * Helper to generate Configuration URL with specific tab
 * @param {string} tab - The tab to select (e.g., 'version', 'design', 'niveles', 'tests', 'import', 'multimedia')
 * @returns {string} The full path
 */
export const toConfiguracion = (tab) => {
    return tab ? `${ROUTES.CONFIGURACION}?tab=${tab}` : ROUTES.CONFIGURACION;
};

/**
 * Helper to generate Progreso URL with specific tab
 * @param {string} tab - The tab to select (e.g., 'resumen', 'habilidades', 'estadisticas', 'mochila', 'feedback', 'comparar')
 * @returns {string} The full path
 */
export const toProgreso = (tab) => {
    return tab ? `${ROUTES.PROGRESO}?tab=${tab}` : ROUTES.PROGRESO;
};
