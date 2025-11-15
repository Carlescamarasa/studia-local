import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ds";
import { BookOpen } from "lucide-react";

export default function PlanesPage() {
  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="icon-tile">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Planes de Estudio</h1>
            <p className="text-gray-500">Diseña planes pedagógicos estructurados</p>
          </div>
        </div>
      </div>

      <Card className="app-card">
        <CardHeader>
          <CardTitle>Próximamente</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">
            Crea planes con semanas y sesiones organizadas.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}