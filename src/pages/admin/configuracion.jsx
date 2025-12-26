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
import { Settings, GitBranch, Palette, Signal, FlaskConical, ArrowLeftRight, Image } from "lucide-react";
import RequireRole from "@/components/auth/RequireRole";
import { useEffectiveUser } from "@/providers/EffectiveUserProvider";
import PageHeader from "@/components/ds/PageHeader";
import Tabs from "@/components/ds/Tabs";
import { componentStyles } from "@/design/componentStyles";
import { LoadingSpinner } from "@/components/ds";
import TabBoundary from "@/components/common/TabBoundary";

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
    const { effectiveUser, realUser } = useEffectiveUser();



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
        { value: 'version', label: 'Versión', icon: GitBranch },
        { value: 'niveles', label: 'Niveles', icon: Signal },
        { value: 'multimedia', label: 'Multimedia', icon: Image },
        { value: 'design', label: 'UI', icon: Palette },
        { value: 'tests', label: 'Tests', icon: FlaskConical },
        { value: 'import', label: 'Datos', icon: ArrowLeftRight },
    ];

    // Render tab content
    const renderTabContent = () => {
        switch (tabActiva) {
            case 'version':
                return (
                    <TabBoundary>
                        <AppVersionContent />
                    </TabBoundary>
                );
            case 'design':
                return (
                    <TabBoundary>
                        <DesignContent hideLevelsTab />
                    </TabBoundary>
                );
            case 'niveles':
                return (
                    <TabBoundary>
                        <LevelConfigView />
                    </TabBoundary>
                );
            case 'tests':
                return (
                    <TabBoundary>
                        <TestSeedContent />
                    </TabBoundary>
                );
            case 'import':
                return (
                    <TabBoundary>
                        <ImportExportContent />
                    </TabBoundary>
                );
            case 'multimedia':
                return (
                    <TabBoundary>
                        <MultimediaContent />
                    </TabBoundary>
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

            <div className="studia-section">
                <div className="mb-6">
                    <Tabs
                        variant="segmented"
                        value={tabActiva}
                        onChange={handleTabChange}
                        className="w-full"
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
