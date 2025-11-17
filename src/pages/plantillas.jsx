
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

export default function PlantillasPage() {
  return (
    <RequireRole anyOf={["PROF", "ADMIN"]}>
      <PlantillasPageContent />
    </RequireRole>
  );
}

function PlantillasPageContent() {
  const currentUser = getCurrentUser();
  const isLoading = false;

  const [activeTab, setActiveTab] = useState("piezas");

  const tabs = [
    {
      value: "piezas",
      label: "Piezas",
      icon: Music,
      content: <PiezasTab />,
    },
    {
      value: "planes",
      label: "Planes",
      icon: BookOpen, // Changed from Calendar to BookOpen
      content: <PlanesTab />,
    },
    {
      value: "ejercicios",
      label: "Ejercicios",
      icon: Layers,
      content: <EjerciciosTab />,
    },
  ];

  // 👉 ESTA LÍNEA YA NO ES NECESARIA
  // const activeTabDef = tabs.find((t) => t.value === activeTab);

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        icon={BookOpen} // Changed from Edit3 to BookOpen
        title="Plantillas"
        subtitle="Crea y gestiona piezas, planes y ejercicios"
      />

      <div className="max-w-7xl mx-auto p-4 md:p-6 lg:px-8">
        <Tabs
          variant="segmented"
          value={activeTab}
          onChange={setActiveTab}
          items={tabs}
        />
        {/* The content block is removed as per the instructions */}
      </div>
    </div>
  );
}
