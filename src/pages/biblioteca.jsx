
import React, { useState } from "react";
// Eliminado: importación de base44Client, ya no es necesaria
// Reemplazado por lógica local con almacenamiento en localStorage
import { getCurrentUser } from "@/api/localDataClient";
import { Music, BookOpen, Layers } from "lucide-react";
import PiezasTab from "../components/editor/PiezasTab";
import PlanesTab from "../components/editor/PlanesTab";
import EjerciciosTab from "../components/editor/EjerciciosTab";
import RequireRole from "@/components/auth/RequireRole";
import PageHeader from "@/components/ds/PageHeader";
import Tabs from "@/components/ds/Tabs";
import { componentStyles } from "@/design/componentStyles";

export default function BibliotecaPage() {
  return (
    <RequireRole anyOf={["PROF", "ADMIN"]}>
      <BibliotecaPageContent />
    </RequireRole>
  );
}

function BibliotecaPageContent() {
  const currentUser = getCurrentUser();
  const isLoading = false;

  const [activeTab, setActiveTab] = useState("piezas");

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

  // Tab definitions without content - content is rendered separately
  const tabs = [
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

      <div className={componentStyles.layout.page}>
        <Tabs
          variant="segmented"
          value={activeTab}
          onChange={setActiveTab}
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
