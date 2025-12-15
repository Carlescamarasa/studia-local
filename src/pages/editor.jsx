import React, { useState } from "react";
// Eliminado: importación de base44Client, ya no es necesaria
// Reemplazado por lógica local con almacenamiento en localStorage
import { Card, CardContent } from "@/components/ds";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ds";
import { Shield, Music, BookOpen, Layers } from "lucide-react";
import PiezasTab from "@/components/editor/PiezasTab";
import PlanesTab from "@/components/editor/PlanesTab";
import BloquesTab from "@/components/editor/BloquesTab";
import PageHeader from "@/components/ds/PageHeader";
import { componentStyles } from "@/design/componentStyles";
import { useEffectiveUser } from "@/components/utils/helpers";

export default function EditorPage() {
  const [activeTab, setActiveTab] = useState("planes");

  const effectiveUser = useEffectiveUser();

  if (effectiveUser?.rolPersonalizado === 'ESTU') {
    return (
      <div className="flex items-center justify-center min-h-[80vh]">
        <Card className={`max-w-md ${componentStyles.containers.cardBase} border-[var(--color-danger)]`}>
          <CardContent className="pt-6 text-center space-y-4">
            <Shield className={`w-16 h-16 mx-auto ${componentStyles.empty.emptyIcon} text-[var(--color-danger)]`} />
            <div>
              <h3 className={`${componentStyles.typography.sectionTitle} mb-2`}>Acceso Denegado</h3>
              <p className={componentStyles.typography.bodyText}>
                El editor de contenido pedagógico requiere permisos de Profesor o Administrador.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={componentStyles.layout.page}>
      <div className="mb-6">
        <Alert className={`mb-6 ${componentStyles.containers.panelBase} border-l-4 border-l-[var(--color-info)] bg-[var(--color-info)]/10`}>
          <Layers className="w-6 h-6 text-[var(--color-info)]" />
          <AlertDescription>
            <h2 className={`${componentStyles.typography.sectionTitle} text-[var(--color-info)] mb-1`}>Editor de Biblioteca</h2>
            <p className={componentStyles.typography.bodyText}>
              Estás editando la biblioteca. Los cambios NO afectan a asignaciones existentes.
            </p>
          </AlertDescription>
        </Alert>

        <PageHeader
          title="Macro-Editor de Contenido"
          subtitle="Crea y gestiona piezas, planes y bloques pedagógicos"
        />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 lg:w-[500px]">
          <TabsTrigger value="piezas" className="flex items-center gap-2">
            <Music className="w-4 h-4" />
            Piezas
          </TabsTrigger>
          <TabsTrigger value="planes" className="flex items-center gap-2">
            <BookOpen className="w-4 h-4" />
            Planes
          </TabsTrigger>
          <TabsTrigger value="bloques" className="flex items-center gap-2">
            <Layers className="w-4 h-4" />
            Bloques
          </TabsTrigger>
        </TabsList>

        <TabsContent value="piezas" className="space-y-4">
          <PiezasTab />
        </TabsContent>

        <TabsContent value="planes" className="space-y-4">
          <PlanesTab />
        </TabsContent>

        <TabsContent value="bloques" className="space-y-4">
          <BloquesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
