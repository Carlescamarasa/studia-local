import "./App.css";
import { LocalDataProvider } from "./local-data/LocalDataProvider";
import AppRouter from "./Router";
import { Toaster } from "@/components/ui/toaster";

function App() {
  return (
    <LocalDataProvider>
      <AppRouter />
      <Toaster />
    </LocalDataProvider>
  );
}

export default App;
