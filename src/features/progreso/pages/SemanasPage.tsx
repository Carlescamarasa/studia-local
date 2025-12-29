import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/features/shared/components/ds";
import { PageHeader } from "@/features/shared/components/ds/PageHeader";
import { componentStyles } from "@/design/componentStyles";

export default function SemanasPage() {
  return (
    <div className="studia-section">
      <PageHeader
        title="Semanas"
        subtitle="Organiza semanas dentro de planes"
      />

      <Card className={componentStyles.containers.cardBase}>
        <CardHeader>
          <CardTitle>Próximamente</CardTitle>
        </CardHeader>
        <CardContent>
          <p className={componentStyles.typography.bodyText}>
            Gestiona las semanas que componen tus planes de estudio.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}