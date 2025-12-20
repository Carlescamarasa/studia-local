import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ds";
import PageHeader from "@/components/ds/PageHeader";
import { componentStyles } from "@/design/componentStyles";

export default function SesionesPage() {
  return (
    <div className="studia-section">
      <PageHeader
        title="Sesiones de Práctica"
        subtitle="Configura bloques y rondas de ejercicios"
      />

      <Card className={componentStyles.containers.cardBase}>
        <CardHeader>
          <CardTitle>Próximamente</CardTitle>
        </CardHeader>
        <CardContent>
          <p className={componentStyles.typography.bodyText}>
            Diseña sesiones con bloques personalizados y configuración de rondas.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}