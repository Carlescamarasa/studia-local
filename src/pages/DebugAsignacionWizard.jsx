import React from "react";
import AsignacionWizard from "@/components/asignaciones/AsignacionWizard";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/auth/AuthProvider";
import { DataProvider } from "@/providers/DataProvider";
import { LocalDataProvider } from "@/local-data/LocalDataProvider";
import { DesignProvider } from "@/components/design/DesignProvider";
import { Toaster } from "@/components/ui/toaster";

// Crear una instancia de QueryClient para debug
const debugQueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

/**
 * Página de debug para aislar y probar AsignacionWizard sin interferencias externas.
 * 
 * Acceso: http://localhost:5173/debug/asignacion-wizard
 * 
 * Esta página:
 * - Renderiza AsignacionWizard siempre abierto
 * - Incluye todos los providers necesarios
 * - Permite depurar problemas de interacción de forma aislada
 */
function DebugAsignacionWizardPage() {
  return (
    <QueryClientProvider client={debugQueryClient}>
      <DesignProvider>
        <AuthProvider>
          <LocalDataProvider>
            <DataProvider>
              {/* Fondo simple para debug - contenedor centrado */}
              <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
                {/* Contenedor con ancho máximo */}
                <div className="max-w-3xl w-full">
                  <AsignacionWizard />
                </div>
              </div>
              <Toaster />
            </DataProvider>
          </LocalDataProvider>
        </AuthProvider>
      </DesignProvider>
    </QueryClientProvider>
  );
}

export default DebugAsignacionWizardPage;

