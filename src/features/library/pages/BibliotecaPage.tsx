
import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Music, BookOpen, Layers } from "lucide-react";
import PiezasTab from "@/features/editor/components/PiezasTab";
import PlanesTab from "@/features/editor/components/PlanesTab";
import EjerciciosTab from "@/features/editor/components/EjerciciosTab";
import RequireRole from "@/features/auth/components/RequireRole";
import { PageHeader } from "@/features/shared/components/ds/PageHeader";
import { Tabs } from "@/features/shared/components/ds/Tabs";

interface LibraryTabItem {
    value: string;
    label: string;
    icon: React.ElementType;
}

const VALID_TABS = ['piezas', 'planes', 'ejercicios'];

export default function BibliotecaPage() {
    return (
        <RequireRole anyOf={["PROF", "ADMIN"]}>
            <BibliotecaPageContent />
        </RequireRole>
    );
}

function BibliotecaPageContent() {
    const [searchParams, setSearchParams] = useSearchParams();
    const tabFromUrl = searchParams.get('tab');
    const initialTab = (tabFromUrl && VALID_TABS.includes(tabFromUrl)) ? tabFromUrl : 'piezas';

    const [activeTab, setActiveTab] = useState(initialTab);

    // Sync tab state with URL changes
    useEffect(() => {
        if (tabFromUrl && VALID_TABS.includes(tabFromUrl) && tabFromUrl !== activeTab) {
            setActiveTab(tabFromUrl);
        }
    }, [tabFromUrl, activeTab]);

    // Update URL when tab changes
    const handleTabChange = (newTab: string) => {
        setActiveTab(newTab);
        setSearchParams({ tab: newTab });
    };

    // OPTIMIZATION: Lazy render tab content to avoid mounting all tabs simultaneously
    // This prevents 3 parallel data fetches on page load
    const renderActiveTabContent = () => {
        switch (activeTab) {
            case "piezas":
                return <PiezasTab />;
            case "planes":
                return <PlanesTab />;
            case "ejercicios":
                return <EjerciciosTab />;
            default:
                return null;
        }
    };

    const tabs: LibraryTabItem[] = [
        {
            value: "piezas",
            label: "Piezas",
            icon: Music,
        },
        {
            value: "planes",
            label: "Planes",
            icon: BookOpen,
        },
        {
            value: "ejercicios",
            label: "Ejercicios",
            icon: Layers,
        },
    ];

    return (
        <div className="min-h-screen bg-background">
            <PageHeader
                icon={BookOpen}
                title="Biblioteca"
                subtitle="Gestiona tu biblioteca de piezas, planes y ejercicios"
            />

            <div className="studia-section">
                <Tabs
                    variant="segmented"
                    value={activeTab}
                    onChange={handleTabChange}
                    items={tabs as any}
                />
                {/* Lazy-rendered content: only active tab mounts */}
                <div className="mt-4">
                    {renderActiveTabContent()}
                </div>
            </div>
        </div>
    );
}
