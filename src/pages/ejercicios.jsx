import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ds";
import { Dumbbell } from "lucide-react";

export default function EjerciciosPage() {
  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="icon-tile">
            <Dumbbell className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Ejercicios</h1>
            <p className="text-ui/80">Biblioteca de ejercicios técnicos</p>
          </div>
        </div>
      </div>

      <Card className="app-card">
        <CardHeader>
          <CardTitle>Próximamente</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-ui/80">
            Aquí podrás gestionar ejercicios técnicos y de calentamiento.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}