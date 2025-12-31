import React from "react";

import { Card, CardContent } from "@/features/shared/components/ds";
import { Button } from "@/features/shared/components/ui/button";
import { Shield, ArrowLeft } from "lucide-react";
import { componentStyles } from "@/design/componentStyles";
import { useEffectiveUser } from "@/providers/EffectiveUserProvider";

interface RequireRoleProps {
  children: React.ReactNode;
  anyOf?: Array<'ADMIN' | 'PROF' | 'ESTU'>;
}

export default function RequireRole({ children, anyOf = [] }: RequireRoleProps) {
  const { effectiveRole, realRole, loading: effectiveLoading } = useEffectiveUser();

  // Esperar a que termine de cargar
  if (effectiveLoading) {
    return null; // O un spinner si lo prefieres
  }

  // ADMIN real puede navegar a cualquier página (admin override)
  if (realRole === 'ADMIN') {
    return <>{children}</>;
  }

  // Si tiene acceso por rol efectivo, renderizar children
  if (effectiveRole && (anyOf as string[]).includes(effectiveRole)) {
    return <>{children}</>;
  }

  // Si no tiene acceso, mostrar mensaje de error
  return (
    <div className="flex items-center justify-center min-h-screen w-full" style={{ zIndex: 1 }}>
      <Card className={`max-w-md ${componentStyles.containers.cardBase} border-[var(--color-danger)]`}>
        <CardContent className="pt-6 text-center space-y-4">
          <Shield className={`w-16 h-16 mx-auto ${componentStyles.empty.emptyIcon} text-[var(--color-danger)]`} />
          <div>
            <h3 className={`${componentStyles.typography.sectionTitle} mb-2`}>Acceso Denegado</h3>
            <p className={componentStyles.typography.bodyText}>
              No tienes permisos para acceder a esta página.
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Rol actual: {effectiveRole || 'sin rol'} | Roles permitidos: {anyOf.join(', ')}
            </p>
          </div>

          <div className="pt-2">
            <Button
              onClick={() => window.history.back()}
              variant="outline"
              className={`${componentStyles.buttons.outline} gap-2 mx-auto`}
            >
              <ArrowLeft className="w-4 h-4" />
              Volver
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}