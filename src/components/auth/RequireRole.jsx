import React from "react";
import { useAuth } from "@/auth/AuthProvider";
import { Card, CardContent } from "@/components/ds";
import { Shield } from "lucide-react";
import { componentStyles } from "@/design/componentStyles";

/**
 * Componente guard que valida acceso por rol.
 * Si el usuario no tiene uno de los roles permitidos, muestra mensaje de "Acceso denegado".
 * Respeta simulación de usuario desde sessionStorage.
 */
export default function RequireRole({ children, anyOf = [] }) {
  const { appRole, loading } = useAuth();

  // Esperar a que termine de cargar
  if (loading) {
    return null;
  }

  // Detectar simulación (mantener compatibilidad si existe)
  const simulatingUser = sessionStorage.getItem('simulatingUser');
  const effectiveRole = simulatingUser 
    ? JSON.parse(simulatingUser).rolPersonalizado 
    : appRole;

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
        </CardContent>
      </Card>
    </div>
  );
}