import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ds";
import { Music } from "lucide-react";

export default function PiezasPage() {
  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="icon-tile">
            <Music className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-ui">Piezas Musicales</h1>
            <p className="text-ui/80">Gestiona tu biblioteca de piezas</p>
          </div>
        </div>
      </div>

      <Card className="app-card">
        <CardHeader>
          <CardTitle>Próximamente</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-ui/80">
            Aquí podrás crear y editar piezas musicales con todos sus elementos.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}