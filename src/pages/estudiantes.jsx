import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ds";
import PageHeader from "@/components/ds/PageHeader";
import { componentStyles } from "@/design/componentStyles";
import { Users } from "lucide-react";
import RequireRole from "@/components/auth/RequireRole";

export default function EstudiantesPage() {
  return (
    <RequireRole anyOf={['PROF', 'ADMIN']}>
      <div className={componentStyles.layout.page}>
        <PageHeader
          icon={Users}
          title="Mis Estudiantes"
          subtitle="Gestiona y visualiza información de tus estudiantes"
        />

        <Card className={componentStyles.containers.cardBase}>
          <CardHeader>
            <CardTitle>Estudiantes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className={componentStyles.typography.bodyText}>
              Esta página está en desarrollo. Aquí podrás gestionar y visualizar información de tus estudiantes.
            </p>
          </CardContent>
        </Card>
      </div>
    </RequireRole>
  );
}

