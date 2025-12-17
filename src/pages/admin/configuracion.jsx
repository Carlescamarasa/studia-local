/**
 * Configuración - Admin-only configuration page with tabs
 * 
 * Consolidates:
 * - Versión (formerly Sistema/AppVersion)
 * - Panel de Diseño (design page without Niveles)
 * - Niveles (extracted from Panel de Diseño)
 * - Tests & Seeds
 * - Importar y Exportar
 * - Multimedia
 */

import React, { useState, useEffect, lazy, Suspense } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Settings } from "lucide-react";
import RequireRole from "@/components/auth/RequireRole";
import PageHeader from "@/components/ds/PageHeader";
import Tabs from "@/components/ds/Tabs";
import { componentStyles } from "@/design/componentStyles";
import { LoadingSpinner } from "@/components/ds";

// Lazy load tab contents for code-splitting
const AppVersionContent = lazy(() => import("./AppVersionContent"));
const DesignContent = lazy(() => import("./DesignContent"));
const LevelConfigView = lazy(() => import("@/components/admin/LevelConfigView"));
const TestSeedContent = lazy(() => import("./TestSeedContent"));
const ImportExportContent = lazy(() => import("./ImportExportContent"));
const MultimediaContent = lazy(() => import("./MultimediaContent"));

// Valid tabs for normalization
const VALID_TABS = ['version', 'design', 'niveles', 'tests', 'import', 'multimedia'];

const TabLoader = () => (
    <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" text="Cargando..." />
    </div>
);

function ConfiguracionPageContent() {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();

    // Tab state from URL with fallback to 'version'
    const [tabActiva, setTabActiva] = useState(() => {
        const tabFromUrl = searchParams.get('tab');
        return VALID_TABS.includes(tabFromUrl) ? tabFromUrl : 'version';
    });

    // Sync URL with tab state
    useEffect(() => {
        const params = new URLSearchParams(searchParams);
        params.set('tab', tabActiva);
        setSearchParams(params, { replace: true });
    }, [tabActiva, setSearchParams, searchParams]);

    // Handle tab change
    const handleTabChange = (newTab) => {
        setTabActiva(newTab);
    };

    // Tab configuration
    const tabItems = [
        { value: 'version', label: 'Versión' },
        { value: 'design', label: 'Panel de Diseño' },
        { value: 'niveles', label: 'Niveles' },
        { value: 'tests', label: 'Tests & Seeds' },
        { value: 'import', label: 'Importar y Exportar' },
        { value: 'multimedia', label: 'Multimedia' },
    ];

    // Render tab content
    const renderTabContent = () => {
        switch (tabActiva) {
            case 'version':
                return (
                    <Suspense fallback={<TabLoader />}>
                        <AppVersionContent />
                    </Suspense>
                );
            case 'design':
                return (
                    <Suspense fallback={<TabLoader />}>
                        <DesignContent hideLevelsTab />
                    </Suspense>
                );
            case 'niveles':
                return (
                    <Suspense fallback={<TabLoader />}>
                        <LevelConfigView />
                    </Suspense>
                );
            case 'tests':
                return (
                    <Suspense fallback={<TabLoader />}>
                        <TestSeedContent />
                    </Suspense>
                );
            case 'import':
                return (
                    <Suspense fallback={<TabLoader />}>
                        <ImportExportContent />
                    </Suspense>
                );
            case 'multimedia':
                return (
                    <Suspense fallback={<TabLoader />}>
                        <MultimediaContent />
                    </Suspense>
                );
            default:
                return null;
        }
    };

    return (
        <div className="min-h-screen bg-background">
            <PageHeader
                icon={Settings}
                title="Configuración"
                subtitle="Ajustes del sistema y herramientas de administración"
            />

            <div className={componentStyles.layout.page}>
                <div className="flex justify-center mb-6">
                    <Tabs
                        value={tabActiva}
                        onChange={handleTabChange}
                        items={tabItems}
                    />
                </div>

                {renderTabContent()}
            </div>
        </div>
    );
}

export default function ConfiguracionPage() {
    return (
        <RequireRole anyOf={['ADMIN']}>
            <ConfiguracionPageContent />
        </RequireRole>
    );
}
