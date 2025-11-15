import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "@/pages/Layout";

// Páginas
import IndexPage from "@/pages/index.jsx";
import LocalPage from "@/pages/local.jsx";
import Hoy from "@/pages/hoy.jsx";
import Semana from "@/pages/semana.jsx";
import Semanas from "@/pages/semanas.jsx";
import Editor from "@/pages/editor.jsx";
import Ejercicios from "@/pages/ejercicios.jsx";
import Estadisticas from "@/pages/estadisticas.jsx";
import Estudiantes from "@/pages/estudiantes.jsx";
import Agenda from "@/pages/agenda.jsx";
import Asignaciones from "@/pages/asignaciones.jsx";
import AsignacionDetalle from "@/pages/asignacion-detalle.jsx";
import Plantillas from "@/pages/plantillas.jsx";
import Piezas from "@/pages/piezas.jsx";
import Planes from "@/pages/planes.jsx";
import Perfil from "@/pages/perfil.jsx";
import ImportExport from "@/pages/import-export.jsx";
import TestSeed from "@/pages/testseed.jsx";
import QaVisual from "@/pages/qa-visual.jsx";
import DesignPage from "@/pages/design.jsx";

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<IndexPage />} />
          <Route path="/local" element={<LocalPage />} />

          <Route path="/hoy" element={<Hoy />} />
          <Route path="/semana" element={<Semana />} />
          <Route path="/semanas" element={<Semanas />} />
          <Route path="/editor" element={<Editor />} />
          <Route path="/ejercicios" element={<Ejercicios />} />
          <Route path="/estadisticas" element={<Estadisticas />} />
          <Route path="/estudiantes" element={<Estudiantes />} />
          <Route path="/agenda" element={<Agenda />} />
          <Route path="/asignaciones" element={<Asignaciones />} />
          <Route path="/asignacion-detalle" element={<AsignacionDetalle />} />
          <Route path="/plantillas" element={<Plantillas />} />
          <Route path="/piezas" element={<Piezas />} />
          <Route path="/planes" element={<Planes />} />
          <Route path="/perfil" element={<Perfil />} />
          <Route path="/import-export" element={<ImportExport />} />
          <Route path="/testseed" element={<TestSeed />} />
          <Route path="/qa-visual" element={<QaVisual />} />
          <Route path="/design" element={<DesignPage />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
