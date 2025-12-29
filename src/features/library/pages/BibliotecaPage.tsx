
import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Music, BookOpen, Layers } from "lucide-react";
import PiezasTab from "@/components/editor/PiezasTab";
import PlanesTab from "@/components/editor/PlanesTab";
import EjerciciosTab from "@/components/editor/EjerciciosTab";
import RequireRole from "@/components/auth/RequireRole";
import PageHeader from "@/components/ds/PageHeader";
import Tabs from "@/components/ds/Tabs";

interface TabItem {
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

    const tabs: TabItem[] = [
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
                    items={tabs}
                />
                {/* Lazy-rendered content: only active tab mounts */}
                <div className="mt-4">
                    {renderActiveTabContent()}
                </div>
            </div>
        </div>
    );
}
