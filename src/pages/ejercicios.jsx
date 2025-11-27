import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ds";
import PageHeader from "@/components/ds/PageHeader";
import { componentStyles } from "@/design/componentStyles";

export default function EjerciciosPage() {
  return (
    <div className={componentStyles.layout.page}>
      <PageHeader
        title="Ejercicios"
        subtitle="Biblioteca de ejercicios técnicos"
      />

      <Card className={componentStyles.containers.cardBase}>
        <CardHeader>
          <CardTitle>Próximamente</CardTitle>
        </CardHeader>
        <CardContent>
          <p className={componentStyles.typography.bodyText}>
            Aquí podrás gestionar ejercicios técnicos y de calentamiento.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}