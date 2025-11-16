import React from "react";
import { Routes, Route } from "react-router-dom";

// Páginas
import IndexPage from "@/pages/index.jsx";
import Usuarios from "@/pages/usuarios.jsx";
import Planes from "@/pages/planes.jsx";
import Piezas from "@/pages/piezas.jsx";
import Sesiones from "@/pages/sesiones.jsx";
import Semana from "@/pages/semana.jsx";
import Semanas from "@/pages/semanas.jsx";
import Asignaciones from "@/pages/asignaciones.jsx";
import AsignacionDetalle from "@/pages/asignacion-detalle.jsx";
import AdaptarAsignacion from "@/pages/adaptar-asignacion.jsx";
import Hoy from "@/pages/hoy.jsx";
import Agenda from "@/pages/agenda.jsx";
import Perfil from "@/pages/perfil.jsx";
import ImportExport from "@/pages/import-export.jsx";
import Estadisticas from "@/pages/estadisticas.jsx";
import Estudiantes from "@/pages/estudiantes.jsx";
import LocalPage from "@/pages/local.jsx";
import Plantillas from "@/pages/plantillas.jsx";
import Design from "@/pages/design.jsx";
import Testseed from "@/pages/testseed.jsx";
import Layout from "@/pages/Layout.jsx";
import QAVisualPage from "@/pages/qa-visual.jsx";

export default function AppRouter() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<IndexPage />} />
        <Route path="/usuarios" element={<Usuarios />} />
        <Route path="/planes" element={<Planes />} />
        <Route path="/piezas" element={<Piezas />} />
        <Route path="/sesiones" element={<Sesiones />} />
        <Route path="/semana" element={<Semana />} />
        <Route path="/semanas" element={<Semanas />} />
        <Route path="/asignaciones" element={<Asignaciones />} />
        <Route path="/asignacion-detalle" element={<AsignacionDetalle />} />
        <Route path="/adaptar-asignacion" element={<AdaptarAsignacion />} />
        <Route path="/hoy" element={<Hoy />} />
        <Route path="/agenda" element={<Agenda />} />
        <Route path="/perfil" element={<Perfil />} />
        <Route path="/import-export" element={<ImportExport />} />
        <Route path="/estadisticas" element={<Estadisticas />} />
        <Route path="/estudiantes" element={<Estudiantes />} />
        <Route path="/plantillas" element={<Plantillas />} />
        <Route path="/design" element={<Design />} />
        <Route path="/testseed" element={<Testseed />} />
        <Route path="/local" element={<LocalPage />} />
        <Route path="/qa-visual" element={<QAVisualPage />} />
      </Route>
    </Routes>
  );
}
