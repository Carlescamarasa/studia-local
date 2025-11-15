import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ds";
import { Calendar } from "lucide-react";

export default function SemanasPage() {
  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="icon-tile">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Semanas</h1>
            <p className="text-gray-500">Organiza semanas dentro de planes</p>
          </div>
        </div>
      </div>

      <Card className="app-card">
        <CardHeader>
          <CardTitle>Próximamente</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">
            Gestiona las semanas que componen tus planes de estudio.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}