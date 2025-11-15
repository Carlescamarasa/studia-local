import './App.css'
import Pages from "@/pages/index.jsx"
import { Toaster } from "@/components/ui/toaster"
import { LocalDataProvider } from "@/local-data/LocalDataProvider"

function App() {
  return (
    <LocalDataProvider>
      <Pages />
      <Toaster />
    </LocalDataProvider>
  )
}

export default App 