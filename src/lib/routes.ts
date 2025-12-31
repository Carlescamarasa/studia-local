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

    // Other known paths
    BIBLIOTECA: "/biblioteca",
    USUARIOS: "/usuarios",
    CALENDARIO: "/calendario",
    SOPORTE: "/soporte",
    SOPORTE_PROF: "/soporte-prof",
    ASIGNACION_DETALLE: "/asignacion-detalle",
    ADAPTAR_ASIGNACION: "/adaptar-asignacion",
    CUADERNO: "/cuaderno",

    // Legacy paths (redirected to CUADERNO in Router.jsx):
    // AGENDA, PREPARACION, ESTUDIANTES, ASIGNACIONES
};

/**
 * Helper to generate Configuration URL with specific tab
 * @param {string} tab - The tab to select (e.g., 'version', 'design', 'niveles', 'tests', 'import', 'multimedia')
 * @returns {string} The full path
 */
export const toConfiguracion = (tab?: string) => {
    return tab ? `${ROUTES.CONFIGURACION}?tab=${tab}` : ROUTES.CONFIGURACION;
};

/**
 * Helper to generate Progreso URL with specific tab
 * @param {string} tab - The tab to select (e.g., 'resumen', 'habilidades', 'estadisticas', 'mochila', 'feedback', 'comparar')
 * @returns {string} The full path
 */
export const toProgreso = (tab?: string) => {
    return tab ? `${ROUTES.PROGRESO}?tab=${tab}` : ROUTES.PROGRESO;
};

/**
 * Helper to generate Studia URL with session context
 * @param {object} params - { asignacionId, semanaIdx, sesionIdx }
 * @returns {string} The full path with query params
 */
export const toStudia = ({ asignacionId, semanaIdx, sesionIdx }: { asignacionId?: string; semanaIdx?: number; sesionIdx?: number }) => {
    const params = new URLSearchParams();
    if (asignacionId) params.set('asignacionId', asignacionId);
    if (semanaIdx !== undefined) params.set('semanaIdx', String(semanaIdx));
    if (sesionIdx !== undefined) params.set('sesionIdx', String(sesionIdx));
    return `${ROUTES.STUDIA}?${params.toString()}`;
};
