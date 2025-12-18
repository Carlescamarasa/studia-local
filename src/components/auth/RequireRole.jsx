import React from "react";
import { useAuth } from "@/auth/AuthProvider";
import { Card, CardContent } from "@/components/ds";
import { Button } from "@/components/ui/button";
import { Shield, ArrowLeft } from "lucide-react";
import { componentStyles } from "@/design/componentStyles";
import { getEffectiveRole, useEffectiveUser } from "@/components/utils/helpers";

/**
 * Componente guard que valida acceso por rol.
 * Si el usuario no tiene uno de los roles permitidos, muestra mensaje de "Acceso denegado".
 */
export default function RequireRole({ children, anyOf = [] }) {
  const { appRole, loading } = useAuth();
  const effectiveUser = useEffectiveUser();

  // Esperar a que termine de cargar
  if (loading) {
    return null;
  }

  // Usar la función unificada para obtener el rol efectivo
  const effectiveRole = getEffectiveRole({ appRole, currentUser: effectiveUser });

  // Si tiene acceso, renderizar children
  if (anyOf.includes(effectiveRole)) {
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