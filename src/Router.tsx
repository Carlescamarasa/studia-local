import React, { Suspense, lazy } from "react";
import { Routes, Route, Navigate, useSearchParams, useLocation } from "react-router-dom";
import RequireAuth from "@/features/auth/components/RequireAuth";
import PublicRoute from "@/features/auth/components/PublicRoute";
import { useAuth } from "@/auth/AuthProvider";

// Lazy load de páginas para code-splitting
const IndexPage = lazy(() => import("@/features/dashboard/pages/IndexPage"));
const Usuarios = lazy(() => import("@/features/admin/pages/UsuariosPage"));
const Reportes = lazy(() => import("@/features/reports/pages/ReportesPage"));
const Planes = lazy(() => import("@/features/planning/pages/PlanesPage"));
const Piezas = lazy(() => import("@/features/repertoire/pages/PiezasPage"));
const Sesiones = lazy(() => import("@/features/sessions/pages/SesionesPage"));
const Semana = lazy(() => import("@/features/progreso/pages/SemanaPage"));
const Semanas = lazy(() => import("@/features/progreso/pages/SemanasPage"));
const AsignacionDetalle = lazy(() => import("@/features/asignaciones/pages/AsignacionDetallePage"));
const AdaptarAsignacion = lazy(() => import("@/features/asignaciones/pages/AdaptarAsignacionPage"));
const Hoy = lazy(() => import("@/features/dashboard/pages/HoyPage"));
const Perfil = lazy(() => import("@/features/user/pages/PerfilPage"));

// Student
const Calendario = lazy(() => import("@/features/calendar/pages/CalendarioPage"));
const LocalPage = lazy(() => import("@/features/local/pages/LocalPage"));
const Biblioteca = lazy(() => import("@/features/library/pages/BibliotecaPage"));
// Removed Design
// Removed Testseed
const TestLoading = lazy(() => import("@/features/dev/pages/TestLoadingPage"));
const Layout = lazy(() => import("@/features/ui/Layout"));
const QAVisualPage = lazy(() => import("@/features/qa/pages/QAVisualPage"));
const LoginPage = lazy(() => import("@/features/auth/pages/LoginPage"));
const ResetPasswordPage = lazy(() => import("@/features/auth/pages/ResetPasswordPage"));
const InvitationPage = lazy(() => import("@/features/auth/pages/InvitationPage"));
const DebugFormularioRapido = lazy(() => import("@/features/debug/pages/DebugFormularioRapidoPage"));
const DebugSubidaYT = lazy(() => import("@/features/debug/pages/DebugSubidaYTPage"));
const LevelSystemDebug = lazy(() => import("@/features/debug/pages/LevelSystemDebugPage"));
const Soporte = lazy(() => import("@/features/support/pages/SoportePage"));
const SoporteProf = lazy(() => import("@/features/support/pages/SoporteProfPage"));
const Ayuda = lazy(() => import("@/features/support/pages/AyudaPage"));
// Removed AppVersion (admin/AppVersion)
// Removed Habilidades
const StudiaConceptPage = lazy(() => import("@/features/estudio/pages/StudiaConceptPage"));
// Removed ContenidoMultimediaPage
const MochilaPage = lazy(() => import("@/features/progreso/pages/MochilaPage"));
const Progreso = lazy(() => import("@/features/progreso/components/ProgresoPage"));
const Cuaderno = lazy(() => import("@/features/cuaderno"));
// Legacy: Preparacion removed
const Configuracion = lazy(() => import("@/features/admin/pages/ConfiguracionPage"));
const Studia = lazy(() => import("@/features/estudio/pages/StudiaPage"));
const NotFound = lazy(() => import("@/features/ui/NotFound"));

// Componente de carga
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="text-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
      <p className="mt-2 text-sm text-gray-600">Cargando...</p>
    </div>
  </div>
);

/**
 * Redirect legacy routes (/agenda, /preparacion, /estudiantes, /asignaciones) to /cuaderno
 * Preserves query params: semana, alumnoId, tab
 */
function RedirectToCuaderno() {
  const { appRole } = useAuth();
  const [searchParams] = useSearchParams();

  const isProfOrAdmin = appRole === 'PROF' || appRole === 'ADMIN';

  if (!isProfOrAdmin) {
    return <Navigate to="/" replace />;
  }

  // Build cuaderno URL preserving relevant params
  const newParams = new URLSearchParams();

  // Preserve semana param
  if (searchParams.has('semana')) {
    newParams.set('semana', searchParams.get('semana')!);
  }

  // Preserve alumnoId/studentId
  const alumnoId = searchParams.get('alumnoId') || searchParams.get('studentId');
  if (alumnoId) {
    newParams.set('alumnoId', alumnoId);
  }

  // Map tab from preparacion if exists
  if (searchParams.has('tab')) {
    newParams.set('tab', searchParams.get('tab')!);
  }

  const queryString = newParams.toString();
  const targetUrl = `/cuaderno${queryString ? `?${queryString}` : ''}`;

  return <Navigate to={targetUrl} replace />;
}

export default function AppRouter() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Rutas públicas */}
        <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
        <Route path="/reset-password" element={<PublicRoute><ResetPasswordPage /></PublicRoute>} />
        <Route path="/invitation" element={<PublicRoute><InvitationPage /></PublicRoute>} />

        {/* Ruta de debug - accesible sin autenticación para facilitar depuración */}
        {import.meta.env.DEV && (
          <>
            <Route path="/debug/formulario-rapido" element={<DebugFormularioRapido />} />
            <Route path="/concept" element={<StudiaConceptPage />} />
          </>
        )}

        {/* Ruta /studia: Full-screen práctica sin sidebar */}
        <Route
          path="/studia"
          element={
            <RequireAuth>
              <Suspense fallback={<PageLoader />}>
                <Studia />
              </Suspense>
            </RequireAuth>
          }
        />

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
          <Route path="asignacion-detalle" element={<AsignacionDetalle />} />
          <Route path="adaptar-asignacion" element={<AdaptarAsignacion />} />
          <Route path="hoy" element={<Hoy />} />
          <Route path="agenda" element={<RedirectToCuaderno />} />
          <Route path="perfil" element={<Perfil />} />

          <Route path="estudiantes" element={<RedirectToCuaderno />} />
          <Route path="calendario" element={<Calendario />} />
          <Route path="biblioteca" element={<Biblioteca />} />
          <Route path="test-loading" element={<TestLoading />} />
          <Route path="local" element={<LocalPage />} />
          <Route path="qa-visual" element={<QAVisualPage />} />
          <Route path="debug/subidaYT" element={<DebugSubidaYT />} />
          <Route path="debug/level-system" element={<LevelSystemDebug />} />
          <Route path="soporte" element={<Soporte />} />
          <Route path="soporte-prof" element={<SoporteProf />} />
          <Route path="ayuda" element={<Ayuda />} />
          <Route path="mochila" element={<MochilaPage />} />
          <Route path="cuaderno" element={<Cuaderno />} />
          <Route path="preparacion" element={<RedirectToCuaderno />} />
          <Route path="asignaciones" element={<RedirectToCuaderno />} />

          {/* Canonical Routes */}
          <Route path="progreso" element={<Progreso />} />
          <Route path="configuracion" element={<Configuracion />} />

          {/* Legacy Redirects - Configuración */}
          <Route path="import-export" element={<Navigate to="/configuracion?tab=import" replace />} />
          <Route path="design" element={<Navigate to="/configuracion?tab=design" replace />} />
          <Route path="testseed" element={<Navigate to="/configuracion?tab=tests" replace />} />
          <Route path="version" element={<Navigate to="/configuracion?tab=version" replace />} />
          <Route path="admin/version" element={<Navigate to="/configuracion?tab=version" replace />} />
          <Route path="admin/configuracion" element={<Navigate to="/configuracion" replace />} />
          <Route path="contenido-multimedia" element={<Navigate to="/configuracion?tab=multimedia" replace />} />

          {/* Legacy Redirects - Progreso */}
          <Route path="estadisticas" element={<Navigate to="/progreso?tab=estadisticas" replace />} />
          <Route path="habilidades" element={<Navigate to="/progreso?tab=habilidades" replace />} />
          <Route path="plantillas" element={<Navigate to="/biblioteca" replace />} />

        </Route>

        {/* Catch-all: 404 Not Found */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}
