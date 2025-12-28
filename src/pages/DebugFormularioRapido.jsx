import React, { useState } from "react";
import FormularioRapido from "@/features/asignaciones/components/FormularioRapido";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/auth/AuthProvider";
import { DataProvider } from "@/providers/DataProvider";
import { LocalDataProvider } from "@/local-data/LocalDataProvider";
import { DesignProvider } from "@/components/design/DesignProvider";
import { Toaster } from "@/components/ui/toaster";

// Crear una instancia de QueryClient para debug (puede ser la misma que la global)
const debugQueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

/**
 * Página de debug para aislar y probar FormularioRapido sin interferencias externas.
 * 
 * Acceso: http://localhost:5173/debug/formulario-rapido
 * 
 * Esta página:
 * - Renderiza FormularioRapido siempre abierto
 * - Usa debugInline=true para renderizar sin portal (a pantalla completa)
 * - Incluye todos los providers necesarios
 * - Permite depurar problemas de interacción de forma aislada
 */
function DebugFormularioRapidoPage() {
  const [closed, setClosed] = useState(false);

  const handleClose = () => {
    console.log('[DebugFormularioRapido] onClose llamado');
    setClosed(true);
  };

  if (closed) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Modal cerrado (debug)</h1>
          <p className="text-sm text-slate-400 mb-4">
            Para volver a abrir, recarga la página o vuelve a la ruta /debug/formulario-rapido
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm"
          >
            Recargar página
          </button>
        </div>
      </div>
    );
  }

  return (
    <QueryClientProvider client={debugQueryClient}>
      <DesignProvider>
        <AuthProvider>
          <LocalDataProvider>
            <DataProvider>
              {/* Fondo simple para debug - contenedor relative para que los fixed funcionen correctamente */}
              <div className="relative min-h-screen w-full bg-slate-900">
                {/* FormularioRapido con debugInline=true para renderizar sin portal */}
                <FormularioRapido
                  onClose={handleClose}
                  debugInline={true}
                />
              </div>
              <Toaster />
            </DataProvider>
          </LocalDataProvider>
        </AuthProvider>
      </DesignProvider>
    </QueryClientProvider>
  );
}

export default DebugFormularioRapidoPage;

