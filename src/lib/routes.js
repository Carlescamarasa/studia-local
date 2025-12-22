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

    // Student
    HOY: "/hoy",
    STUDIA: "/studia",

    // Other known paths (can be expanded)
    AGENDA: "/agenda",
    BIBLIOTECA: "/biblioteca",
    USUARIOS: "/usuarios",
    PREPARACION: "/preparacion",
    CALENDARIO: "/calendario",
    SOPORTE: "/soporte",
    SOPORTE_PROF: "/soporte-prof",
    ESTUDIANTES: "/estudiantes",
    ASIGNACIONES: "/asignaciones",
    ASIGNACION_DETALLE: "/asignacion-detalle",
    ADAPTAR_ASIGNACION: "/adaptar-asignacion",
    CUADERNO: "/cuaderno",
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

/**
 * Helper to generate Studia URL with session context
 * @param {object} params - { asignacionId, semanaIdx, sesionIdx }
 * @returns {string} The full path with query params
 */
export const toStudia = ({ asignacionId, semanaIdx, sesionIdx }) => {
    const params = new URLSearchParams();
    if (asignacionId) params.set('asignacionId', asignacionId);
    if (semanaIdx !== undefined) params.set('semanaIdx', String(semanaIdx));
    if (sesionIdx !== undefined) params.set('sesionIdx', String(sesionIdx));
    return `${ROUTES.STUDIA}?${params.toString()}`;
};
