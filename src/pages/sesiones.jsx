import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ds";
import { PlayCircle } from "lucide-react";

export default function SesionesPage() {
  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="icon-tile">
            <PlayCircle className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Sesiones de Práctica</h1>
            <p className="text-gray-500">Configura bloques y rondas de ejercicios</p>
          </div>
        </div>
      </div>

      <Card className="app-card">
        <CardHeader>
          <CardTitle>Próximamente</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">
            Diseña sesiones con bloques personalizados y configuración de rondas.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}