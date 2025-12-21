/**
 * Routes Tests - Navigation and routing validation
 */

import { createTestResult, createAction, createEvidence, type TestContext, type TestResult } from '../testContract';

// Import route definitions
const ALL_ROUTES = [
    '/', '/usuarios', '/reportes', '/planes', '/piezas', '/sesiones', '/semana', '/semanas',
    '/asignacion-detalle', '/adaptar-asignacion', '/hoy', '/agenda', '/perfil',
    '/calendario', '/biblioteca', '/test-loading', '/local', '/qa-visual',
    '/soporte', '/soporte-prof', '/ayuda', '/mochila', '/preparacion',
    '/progreso', '/configuracion', '/studia'
];

const UTILITY_PAGES = ['/perfil', '/asignacion-detalle', '/adaptar-asignacion'];

const DEPRECATED_ROUTES = [
    { path: '/testseed', redirectTo: '/configuracion?tab=tests', reason: 'Replaced by Maintenance Panel' },
    { path: '/import-export', redirectTo: '/configuracion?tab=import', reason: 'Moved to Configuración tab' },
    { path: '/design', redirectTo: '/configuracion?tab=design', reason: 'Moved to Configuración tab' },
    { path: '/version', redirectTo: '/configuracion?tab=version', reason: 'Moved to Configuración tab' },
    { path: '/estadisticas', redirectTo: '/progreso?tab=estadisticas', reason: 'Moved to Progreso tab' },
    { path: '/habilidades', redirectTo: '/progreso?tab=habilidades', reason: 'Moved to Progreso tab' },
];

const MENU_BY_ROLE = {
    ADMIN: [
        '/agenda', '/progreso', '/soporte-prof', '/calendario',
        '/usuarios', '/preparacion', '/biblioteca', '/reportes', '/configuracion'
    ],
    PROF: [
        '/agenda', '/progreso', '/soporte-prof', '/calendario',
        '/preparacion', '/biblioteca'
    ],
    ESTU: [
        '/hoy', '/progreso', '/calendario', '/soporte'
    ]
};

/**
 * Menu Coverage Audit
 * Checks all routes against menu definitions by role
 */
export async function testMenuCoverage(ctx: TestContext): Promise<TestResult> {
    const startTime = Date.now();

    try {
        const orphanedRoutes: Record<string, string[]> = {};
        const brokenLinks: any[] = [];
        const checks: any[] = [];
        const actions: any[] = [];
        let totalOrphans = 0;

        // Check each role
        for (const [role, menuItems] of Object.entries(MENU_BY_ROLE)) {
            const orphans = ALL_ROUTES.filter(route =>
                !menuItems.includes(route) &&
                !UTILITY_PAGES.includes(route) &&
                route !== '/studia' && // Fullscreen, no sidebar
                !route.startsWith('/debug') &&
                route !== '/' // Index redirects based on role
            );

            orphanedRoutes[role] = orphans;
            totalOrphans += orphans.length;

            checks.push({
                role,
                menuItems: menuItems.length,
                orphanedRoutes: orphans.length,
                status: orphans.length === 0 ? 'ok' : 'warn'
            });

            // Check for broken menu links (menu items that don't exist in routes)
            for (const menuItem of menuItems) {
                if (!ALL_ROUTES.includes(menuItem) && !menuItem.startsWith('/progreso') && !menuItem.startsWith('/configuracion')) {
                    brokenLinks.push({ role, menuItem, issue: 'Route does not exist' });
                }
            }
        }

        // Create evidence table
        const evidenceItems: any[] = [];

        // Add orphaned routes
        for (const [role, orphans] of Object.entries(orphanedRoutes)) {
            for (const route of orphans) {
                evidenceItems.push({
                    route,
                    inMenu: 'NO',
                    affectedRoles: role,
                    suggestion: 'Add to menu or mark as utility page'
                });
            }
        }

        // Add broken links
        for (const link of brokenLinks) {
            evidenceItems.push({
                route: link.menuItem,
                inMenu: 'YES (BROKEN)',
                affectedRoles: link.role,
                suggestion: 'Remove from menu or create route'
            });
        }

        // Create actions
        if (totalOrphans > 0) {
            const orphanList = Object.values(orphanedRoutes).flat().join(', ');
            actions.push(createAction(
                'Add orphaned routes to menus',
                `These routes exist but are not in any menu: ${orphanList}`,
                { file: 'src/pages/Layout.jsx', command: 'Review navigationByRole object' }
            ));

            actions.push(createAction(
                'Mark as utility pages',
                'If these are internal/utility pages, add them to UTILITY_PAGES list',
                { file: 'src/utils/tests/routesTests.ts' }
            ));
        }

        if (brokenLinks.length > 0) {
            actions.push(createAction(
                'Fix broken menu links',
                `${brokenLinks.length} menu item(s) point to non-existent routes`,
                { file: 'src/pages/Layout.jsx' }
            ));
        }

        const status = brokenLinks.length > 0 ? 'fail' : totalOrphans > 0 ? 'warn' : 'pass';
        const severity = brokenLinks.length > 0 ? 'high' : totalOrphans > 0 ? 'medium' : 'low';

        return createTestResult({
            id: 'routes-menu-coverage',
            title: 'Menu Coverage Audit',
            status,
            severity,
            whyItMatters: 'Orphaned routes are inaccessible to users via navigation. Broken links lead to 404 errors.',
            metrics: {
                totalRoutes: ALL_ROUTES.length,
                orphanedRoutes: totalOrphans,
                brokenLinks: brokenLinks.length,
                roles: Object.keys(MENU_BY_ROLE).length
            },
            evidence: createEvidence(
                totalOrphans > 0
                    ? `${totalOrphans} route(s) exist but are not in any menu`
                    : 'All routes are properly linked',
                evidenceItems
            ),
            actions,
            duration: Date.now() - startTime
        });

    } catch (error: any) {
        return createTestResult({
            id: 'routes-menu-coverage',
            title: 'Menu Coverage Audit',
            status: 'fail',
            severity: 'high',
            whyItMatters: 'Navigation structure validation failed',
            evidence: createEvidence(`Error: ${error.message}`, []),
            actions: [createAction('Check route definitions', 'Verify ALL_ROUTES and MENU_BY_ROLE are correct')],
            duration: Date.now() - startTime,
            debug: error
        });
    }
}

/**
 * Deprecated Routes Detector
 * Finds routes marked as deprecated
 */
export async function testDeprecatedRoutes(ctx: TestContext): Promise<TestResult> {
    const startTime = Date.now();

    try {
        const evidenceItems = DEPRECATED_ROUTES.map(route => ({
            route: route.path,
            redirectsTo: route.redirectTo,
            reason: route.reason,
            action: 'Keep redirect or remove entirely'
        }));

        const actions = DEPRECATED_ROUTES.length > 0 ? [
            createAction(
                'Review deprecated routes',
                'These routes redirect to new locations. Consider removing if no longer needed.',
                { file: 'src/Router.jsx', command: 'Search for "Legacy Redirects"' }
            )
        ] : [];

        return createTestResult({
            id: 'cleanup-deprecated-routes',
            title: 'Deprecated Routes Detector',
            status: DEPRECATED_ROUTES.length > 0 ? 'warn' : 'pass',
            severity: 'low',
            whyItMatters: 'Deprecated routes add maintenance overhead and can confuse users',
            metrics: {
                deprecatedRoutes: DEPRECATED_ROUTES.length
            },
            evidence: createEvidence(
                `${DEPRECATED_ROUTES.length} deprecated route(s) found`,
                evidenceItems
            ),
            actions,
            duration: Date.now() - startTime
        });

    } catch (error: any) {
        return createTestResult({
            id: 'cleanup-deprecated-routes',
            title: 'Deprecated Routes Detector',
            status: 'fail',
            severity: 'low',
            whyItMatters: 'Could not scan for deprecated routes',
            evidence: createEvidence(`Error: ${error.message}`, []),
            actions: [],
            duration: Date.now() - startTime,
            debug: error
        });
    }
}
