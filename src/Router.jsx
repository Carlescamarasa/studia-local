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
const ImportExport = lazy(() => import("@/pages/import-export.jsx"));
const Estadisticas = lazy(() => import("@/pages/estadisticas.jsx"));
const Estudiantes = lazy(() => import("@/pages/estudiantes.jsx"));
const Calendario = lazy(() => import("@/pages/calendario.jsx"));
const LocalPage = lazy(() => import("@/pages/local.jsx"));
const Plantillas = lazy(() => import("@/pages/plantillas.jsx"));
const Design = lazy(() => import("@/pages/design.jsx"));
const Testseed = lazy(() => import("@/pages/testseed.jsx"));
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
const AppVersion = lazy(() => import("@/pages/admin/AppVersion.jsx"));
const Habilidades = lazy(() => import("@/pages/habilidades.jsx"));

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
          <Route path="/debug/formulario-rapido" element={<DebugFormularioRapido />} />
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
          <Route path="import-export" element={<ImportExport />} />
          <Route path="estadisticas" element={<Estadisticas />} />
          <Route path="estudiantes" element={<Estudiantes />} />
          <Route path="calendario" element={<Calendario />} />
          <Route path="plantillas" element={<Plantillas />} />
          <Route path="design" element={<Design />} />
          <Route path="testseed" element={<Testseed />} />
          <Route path="test-loading" element={<TestLoading />} />
          <Route path="local" element={<LocalPage />} />
          <Route path="qa-visual" element={<QAVisualPage />} />
          <Route path="debug/subidaYT" element={<DebugSubidaYT />} />
          <Route path="debug/level-system" element={<LevelSystemDebug />} />
          <Route path="soporte" element={<Soporte />} />
          <Route path="soporte-prof" element={<SoporteProf />} />
          <Route path="ayuda" element={<Ayuda />} />
          <Route path="habilidades" element={<Habilidades />} />
          <Route path="version" element={<Navigate to="/admin/version" replace />} />
          <Route path="admin/version" element={<AppVersion />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
