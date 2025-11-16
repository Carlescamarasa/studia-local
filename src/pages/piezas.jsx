import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ds";
import PageHeader from "@/components/ds/PageHeader";
import { componentStyles } from "@/design/componentStyles";

export default function PiezasPage() {
  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <PageHeader
        title="Piezas Musicales"
        subtitle="Gestiona tu biblioteca de piezas"
      />

      <Card className={componentStyles.containers.cardBase}>
        <CardHeader>
          <CardTitle>Próximamente</CardTitle>
        </CardHeader>
        <CardContent>
          <p className={componentStyles.typography.bodyText}>
            Aquí podrás crear y editar piezas musicales con todos sus elementos.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}