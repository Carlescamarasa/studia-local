 
/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useState, useEffect, Suspense, lazy } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Settings, Info, Layout, Activity, Package, PlayCircle, ShieldCheck } from 'lucide-react';
import { PageHeader } from '@/features/shared/components/ds/PageHeader';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/features/shared/components/ui/tabs';
import RequireRole from '@/features/auth/components/RequireRole';
import { useEffectiveUser } from '@/providers/EffectiveUserProvider';
import { Loader2 } from 'lucide-react';

// Lazy loading components
const AppVersionContent = lazy(() => import('../components/AppVersionContent'));
const DesignContent = lazy(() => import('../components/DesignContent'));
const MaintenancePanel = lazy(() => import('../components/maintenance/MaintenancePanel'));
const ImportExportContent = lazy(() => import('../components/ImportExportContent'));
const MultimediaContent = lazy(() => import('../components/MultimediaContent'));
const LevelConfigContent = lazy(() => import('../components/LevelConfigContent'));

const TABS = [
    { id: 'version', label: 'Versión', icon: Info, color: 'var(--color-info)' },
    { id: 'design', label: 'Diseño', icon: Layout, color: 'var(--color-primary)' },
    { id: 'maintenance', label: 'Mantenimiento', icon: Activity, color: 'var(--color-warning)' },
    { id: 'multimedia', label: 'Multimedia', icon: PlayCircle, color: 'var(--color-success)' },
    { id: 'levels', label: 'Niveles', icon: Activity, color: 'var(--color-info)' },
    { id: 'import', label: 'Datos', icon: Package, color: 'var(--color-primary)' },
];

/**
 * ConfiguracionPage - Administration and system settings
 */
export default function ConfiguracionPage() {
    const [searchParams, setSearchParams] = useSearchParams();
    const currentTab = searchParams.get('tab') || 'version';
    const effectiveUser = useEffectiveUser();

    // Sync state with URL
    const handleTabChange = (tabId: string) => {
        setSearchParams({ tab: tabId });
    };

    return (
        <RequireRole anyOf={['ADMIN']}>
            <div className="min-h-screen bg-background">
                <PageHeader
                    icon={Settings}
                    title="Configuración"
                    subtitle="Gestión del sistema, versiones y herramientas de mantenimiento"
                />

                <div className="studia-section">
                    <Tabs
                        value={currentTab}
                        onValueChange={handleTabChange}
                        className="space-y-6"
                    >
                        <TabsList className="bg-surface-muted/50 p-1 rounded-xl flex-wrap justify-start h-auto gap-1">
                            {TABS.map((tab) => (
                                <TabsTrigger
                                    key={tab.id}
                                    value={tab.id}
                                    className="data-[state=active]:bg-surface data-[state=active]:shadow-sm rounded-lg px-4 py-2.5 transition-all"
                                >
                                    <tab.icon className="w-4 h-4 mr-2" style={{ color: currentTab === tab.id ? tab.color : 'inherit' }} />
                                    {tab.label}
                                </TabsTrigger>
                            ))}
                        </TabsList>

                        <Suspense fallback={
                            <div className="flex items-center justify-center p-12">
                                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                            </div>
                        }>
                            <TabsContent value="version" className="outline-none">
                                <AppVersionContent />
                            </TabsContent>

                            <TabsContent value="design" className="outline-none">
                                <DesignContent />
                            </TabsContent>

                            <TabsContent value="maintenance" className="outline-none">
                                <MaintenancePanel embedded />
                            </TabsContent>

                            <TabsContent value="multimedia" className="outline-none">
                                <MultimediaContent />
                            </TabsContent>

                            <TabsContent value="levels" className="outline-none">
                                <LevelConfigContent />
                            </TabsContent>

                            <TabsContent value="import" className="outline-none">
                                <ImportExportContent />
                            </TabsContent>
                        </Suspense>
                    </Tabs>

                    {/* Footer Info */}
                    <div className="mt-12 pt-6 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
                        <div className="flex items-center gap-2">
                            <ShieldCheck className="w-3.5 h-3.5 text-success" />
                            <span>Sesión de administrador verificada</span>
                        </div>
                        <div>
                            <span>Estudio Local &bull; Admin v2</span>
                        </div>
                    </div>
                </div>
            </div>
        </RequireRole>
    );
}
