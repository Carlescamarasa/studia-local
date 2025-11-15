import "./App.css";
import { LocalDataProvider } from "./local-data/LocalDataProvider";
import Pages from "@/pages/index.jsx";
import { Toaster } from "@/components/ui/toaster";

function App() {
  return (
    <LocalDataProvider>
      <Pages />
      <Toaster />
    </LocalDataProvider>
  );
}

export default App;
