
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { getCurrentUser } from "@/api/localDataClient";
import { Card, CardContent } from "@/components/ds"; // Changed import path here
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, Music, BookOpen, Layers } from "lucide-react";
import PiezasTab from "@/components/editor/PiezasTab";
import PlanesTab from "@/components/editor/PlanesTab";
import BloquesTab from "@/components/editor/BloquesTab";

export default function EditorPage() {
  const [activeTab, setActiveTab] = useState("planes");

  const currentUser = getCurrentUser();

  if (currentUser?.rolPersonalizado === 'ESTU') {
    return (
      <div className="flex items-center justify-center min-h-[80vh]">
        <Card className="max-w-md border-red-200">
          <CardContent className="pt-6 text-center space-y-4">
            <Shield className="w-16 h-16 mx-auto text-red-500" />
            <div>
              <h3 className="font-semibold text-lg text-gray-900 mb-2">Acceso Denegado</h3>
              <p className="text-ui/80">
                El editor de contenido pedagógico requiere permisos de Profesor o Administrador.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-[1600px] mx-auto">
      <div className="mb-6">
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-l-4 border-blue-500 p-4 rounded-lg mb-6">
          <div className="flex items-center gap-3">
            <Layers className="w-6 h-6 text-blue-600" />
            <div>
              <h2 className="font-semibold text-blue-900">Editor de Plantillas</h2>
              <p className="text-sm text-blue-700">
                Estás editando plantillas. Los cambios NO afectan a asignaciones existentes.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Macro-Editor de Contenido</h1>
            <p className="text-ui/80 mt-1">Crea y gestiona piezas, planes y bloques pedagógicos</p>
          </div>
        </div>
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
