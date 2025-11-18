import "./App.css";
import { LocalDataProvider } from "@/local-data/LocalDataProvider";
import { DataProvider } from "@/providers/DataProvider";
import AppRouter from "./Router";   // 👈 Usa el router central
import { Toaster } from "@/components/ui/toaster";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/auth/AuthProvider";
import { DesignProvider } from "@/components/design/DesignProvider";

// Crear una instancia de QueryClient
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <DesignProvider>
        <AuthProvider>
          <LocalDataProvider>
            <DataProvider>
              <AppRouter />
              <Toaster />
            </DataProvider>
          </LocalDataProvider>
        </AuthProvider>
      </DesignProvider>
    </QueryClientProvider>
  );
}

export default App;
