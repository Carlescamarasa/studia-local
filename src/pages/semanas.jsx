import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ds";
import PageHeader from "@/components/ds/PageHeader";
import { componentStyles } from "@/design/componentStyles";

export default function SemanasPage() {
  return (
    <div className={componentStyles.layout.page}>
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