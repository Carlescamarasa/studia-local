import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ds";
import PageHeader from "@/components/ds/PageHeader";
import { componentStyles } from "@/design/componentStyles";

export default function PlanesPage() {
  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <PageHeader
        title="Planes de Estudio"
        subtitle="Diseña planes pedagógicos estructurados"
      />

      <Card className={componentStyles.containers.cardBase}>
        <CardHeader>
          <CardTitle>Próximamente</CardTitle>
        </CardHeader>
        <CardContent>
          <p className={componentStyles.typography.bodyText}>
            Crea planes con semanas y sesiones organizadas.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}