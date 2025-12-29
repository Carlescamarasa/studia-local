import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/features/shared/components/ds";
import { PageHeader } from "@/features/shared/components/ds/PageHeader";
import { componentStyles } from "@/design/componentStyles";

export default function PiezasPage() {
  return (
    <div className="studia-section">
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