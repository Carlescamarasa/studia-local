import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ds";
import PageHeader from "@/components/ds/PageHeader";
import { componentStyles } from "@/design/componentStyles";

export default function SemanasPage() {
  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
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