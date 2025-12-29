import "./App.css";
import { LocalDataProvider } from "@/local-data/LocalDataProvider";
import { DataProvider } from "@/providers/DataProvider";
import { EffectiveUserProvider } from "@/providers/EffectiveUserProvider";
import AppRouter from "./Router";   // 👈 Usa el router central
import { Toaster } from "@/features/shared/components/ui/toaster";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/auth/AuthProvider";
import { DesignProvider } from "@/features/design/components/DesignProvider";
import ErrorBoundary from "@/features/shared/components/common/ErrorBoundary";
import GlobalErrorReportHandler from "@/features/shared/components/common/GlobalErrorReportHandler";

// Crear una instancia de QueryClient
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// Expose to window for debugging and cross-component access
if (typeof window !== 'undefined') {
  window.__queryClient = queryClient;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <DesignProvider>
        <AuthProvider>
          <EffectiveUserProvider>
            <LocalDataProvider>
              <DataProvider>
                {/* Handler global para reportes de errores - siempre montado dentro de los providers */}
                <GlobalErrorReportHandler />
                <ErrorBoundary>
                  <AppRouter />
                  <Toaster />
                </ErrorBoundary>
              </DataProvider>
            </LocalDataProvider>
          </EffectiveUserProvider>
        </AuthProvider>
      </DesignProvider>
    </QueryClientProvider>
  );
}

export default App;
