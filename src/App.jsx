import "./App.css";
import { LocalDataProvider } from "./local-data/LocalDataProvider";
import { Toaster } from "@/components/ui/toaster";

function App() {
  return (
    <LocalDataProvider>
      <Toaster />
    </LocalDataProvider>
  );
}

export default App;
