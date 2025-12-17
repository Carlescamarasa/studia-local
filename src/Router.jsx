import React, { Suspense, lazy } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import RequireAuth from "@/components/auth/RequireAuth";
import PublicRoute from "@/components/auth/PublicRoute";

// Lazy load de páginas para code-splitting
const IndexPage = lazy(() => import("@/pages/index.jsx"));
const Usuarios = lazy(() => import("@/pages/usuarios.jsx"));
const Reportes = lazy(() => import("@/pages/reportes.jsx"));
const Planes = lazy(() => import("@/pages/planes.jsx"));
const Piezas = lazy(() => import("@/pages/piezas.jsx"));
const Sesiones = lazy(() => import("@/pages/sesiones.jsx"));
const Semana = lazy(() => import("@/pages/semana.jsx"));
const Semanas = lazy(() => import("@/pages/semanas.jsx"));
const Asignaciones = lazy(() => import("@/pages/asignaciones.jsx"));
const AsignacionDetalle = lazy(() => import("@/pages/asignacion-detalle.jsx"));
const AdaptarAsignacion = lazy(() => import("@/pages/adaptar-asignacion.jsx"));
const Hoy = lazy(() => import("@/pages/hoy.jsx"));
const Agenda = lazy(() => import("@/pages/agenda.jsx"));
const Perfil = lazy(() => import("@/pages/perfil.jsx"));
const ImportExport = lazy(() => import("@/pages/import-export.jsx")); // Still used in redirect? No, redirect goes to config?tab=import. The page itself is likely used inside Config tabs or not. Layout says Config uses ImportExportContent.  Actually ImportExport page might be different from Content. Let's check config imports. 
// Config page imports: import ImportExportContent from "./ImportExportContent". 
// src/pages/import-export.jsx might be the standalone page. 
// If I redirect /import-export to /configuracion?tab=import, I don't need the Route for import-export, so I don't need the lazy import of the page.
const Estudiantes = lazy(() => import("@/pages/estudiantes.jsx"));
const Calendario = lazy(() => import("@/pages/calendario.jsx"));
const LocalPage = lazy(() => import("@/pages/local.jsx"));
const Biblioteca = lazy(() => import("@/pages/biblioteca.jsx"));
// Removed Design
// Removed Testseed
const TestLoading = lazy(() => import("@/pages/test-loading.jsx"));
const Layout = lazy(() => import("@/pages/Layout.jsx"));
const QAVisualPage = lazy(() => import("@/pages/qa-visual.jsx"));
const LoginPage = lazy(() => import("@/pages/auth/LoginPage.jsx"));
const ResetPasswordPage = lazy(() => import("@/pages/auth/ResetPasswordPage.jsx"));
const InvitationPage = lazy(() => import("@/pages/auth/InvitationPage.jsx"));
const DebugFormularioRapido = lazy(() => import("@/pages/DebugFormularioRapido.jsx"));
const DebugSubidaYT = lazy(() => import("@/pages/debug/DebugSubidaYTPage.jsx"));
const LevelSystemDebug = lazy(() => import("@/pages/debug/LevelSystemDebug.jsx"));
const Soporte = lazy(() => import("@/pages/soporte.jsx"));
const SoporteProf = lazy(() => import("@/pages/soporte-prof.jsx"));
const Ayuda = lazy(() => import("@/pages/ayuda.jsx"));
// Removed AppVersion (admin/AppVersion)
// Removed Habilidades
const StudiaConceptPage = lazy(() => import("@/pages/StudiaConceptPage.jsx"));
// Removed ContenidoMultimediaPage
const MochilaPage = lazy(() => import("@/pages/MochilaPage.jsx"));
const Progreso = lazy(() => import("@/pages/progreso.jsx"));
const Preparacion = lazy(() => import("@/pages/preparacion.jsx"));
const Configuracion = lazy(() => import("@/pages/admin/configuracion.jsx"));

// Componente de carga
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="text-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
      <p className="mt-2 text-sm text-gray-600">Cargando...</p>
    </div>
  </div>
);

export default function AppRouter() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Rutas públicas */}
        <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
        <Route path="/reset-password" element={<PublicRoute><ResetPasswordPage /></PublicRoute>} />
        <Route path="/invitation" element={<PublicRoute><InvitationPage /></PublicRoute>} />

        {/* Ruta de debug - accesible sin autenticación para facilitar depuración */}
        {process.env.NODE_ENV === 'development' && (
          <>
            <Route path="/debug/formulario-rapido" element={<DebugFormularioRapido />} />
            <Route path="/concept" element={<StudiaConceptPage />} />
          </>
        )}

        {/* Rutas protegidas: todas requieren autenticación */}
        <Route
          element={
            <RequireAuth>
              <Suspense fallback={<PageLoader />}>
                <Layout />
              </Suspense>
            </RequireAuth>
          }
        >
          <Route index element={<IndexPage />} />
          <Route path="usuarios" element={<Usuarios />} />
          <Route path="reportes" element={<Reportes />} />
          <Route path="planes" element={<Planes />} />
          <Route path="piezas" element={<Piezas />} />
          <Route path="sesiones" element={<Sesiones />} />
          <Route path="semana" element={<Semana />} />
          <Route path="semanas" element={<Semanas />} />
          <Route path="asignaciones" element={<Asignaciones />} />
          <Route path="asignacion-detalle" element={<AsignacionDetalle />} />
          <Route path="adaptar-asignacion" element={<AdaptarAsignacion />} />
          <Route path="hoy" element={<Hoy />} />
          <Route path="agenda" element={<Agenda />} />
          <Route path="perfil" element={<Perfil />} />
          <Route path="import-export" element={<Navigate to="/configuracion?tab=import" replace />} />
          <Route path="progreso" element={<Progreso />} />
          <Route path="preparacion" element={<Preparacion />} />
          <Route path="estadisticas" element={<Navigate to="/progreso?tab=estadisticas" replace />} />
          <Route path="estudiantes" element={<Estudiantes />} />
          <Route path="calendario" element={<Calendario />} />
          <Route path="biblioteca" element={<Biblioteca />} />
          <Route path="plantillas" element={<Navigate to="/biblioteca" replace />} />
          <Route path="design" element={<Navigate to="/configuracion?tab=design" replace />} />
          <Route path="testseed" element={<Navigate to="/configuracion?tab=tests" replace />} />
          <Route path="test-loading" element={<TestLoading />} />
          <Route path="local" element={<LocalPage />} />
          <Route path="qa-visual" element={<QAVisualPage />} />
          <Route path="debug/subidaYT" element={<DebugSubidaYT />} />
          <Route path="debug/level-system" element={<LevelSystemDebug />} />
          <Route path="soporte" element={<Soporte />} />
          <Route path="soporte-prof" element={<SoporteProf />} />
          <Route path="ayuda" element={<Ayuda />} />
          <Route path="habilidades" element={<Navigate to="/progreso?tab=habilidades" replace />} />
          <Route path="contenido-multimedia" element={<Navigate to="/configuracion?tab=multimedia" replace />} />
          <Route path="mochila" element={<MochilaPage />} />
          <Route path="version" element={<Navigate to="/configuracion?tab=version" replace />} />
          <Route path="admin/version" element={<Navigate to="/configuracion?tab=version" replace />} />
          {/* Rutas de configuración canónicas y redirects */}
          <Route path="configuracion" element={<Configuracion />} />
          <Route path="admin/configuracion" element={<Navigate to="/configuracion" replace />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
