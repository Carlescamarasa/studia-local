
// src/Layout.js
import React, { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ROUTES, toConfiguracion, toProgreso } from "@/lib/routes";
import {
  Users,
  Music,
  Calendar,
  Target,
  Activity,
  Settings,
  PlayCircle,
  Menu as MenuIcon,
  X,
  ChevronRight,
  LogOut,
  Edit3,
  PanelLeft,
  FileDown,
  FileVideo,
  Beaker,
  Layers,
  Palette,
  Bug,
  MessageSquare,
  HelpCircle,
  Tag,
  Star,
  Sun,
  Moon,
  Backpack,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ds";
import SkipLink from "@/components/ds/SkipLink";
import { setCurrentUser, localDataClient } from "@/api/localDataClient";
import { useLocalData } from "@/local-data/LocalDataProvider";
import logoLTS from "@/assets/Logo_LTS.svg";
import RoleBootstrap from "@/components/auth/RoleBootstrap";
import { useAuth } from "@/auth/AuthProvider";
import { isAuthError } from "@/lib/authHelpers";
import { SidebarProvider, useSidebar } from "@/components/ui/SidebarState";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { getAppName } from "@/components/utils/appMeta";
import { componentStyles } from "@/design/componentStyles";
import { Outlet } from "react-router-dom";
import { displayName, getEffectiveRole, useEffectiveUser } from "@/components/utils/helpers";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PerfilModal from "@/components/common/PerfilModal";
import { useDesign } from "@/components/design/DesignProvider";
import ReportErrorButton from "@/components/common/ReportErrorButton";
import { useQuery } from "@tanstack/react-query";
import { listErrorReports } from "@/api/errorReportsAPI";
import { Badge } from "@/components/ds";
import { SupportTicketsBadge } from "@/components/common/SupportTicketsBadge";
import { shouldIgnoreHotkey, matchesHotkey, getHotkeyById, HOTKEYS_CONFIG, isMac } from "@/utils/hotkeys";
import HotkeysModal from "@/components/common/HotkeysModal";
import { HotkeysModalProvider, useHotkeysModal } from "@/hooks/useHotkeysModal.jsx";
import { useAppVersion } from "@/hooks/useAppVersion";
import { useCurrentProfile } from "@/hooks/useCurrentProfile";
import LevelBadge from "@/components/common/LevelBadge";
import AdminUpdateNotice from "@/components/common/AdminUpdateNotice";

/* ------------------------------ Navegación ------------------------------ */
const navigationByRole = {
  ADMIN: [
    { title: "Agenda", url: ROUTES.AGENDA, icon: Calendar, group: "Docencia" },
    { title: "Progreso", url: toProgreso('resumen'), icon: Activity, group: "Docencia" },
    { title: "Tickets alumnos", url: ROUTES.SOPORTE_PROF, icon: MessageSquare, group: "Docencia" },
    { title: "Usuarios", url: ROUTES.USUARIOS, icon: Users, group: "Gestión" },
    { title: "Preparación", url: ROUTES.PREPARACION, icon: Target, group: "Gestión" },
    { title: "Biblioteca", url: ROUTES.BIBLIOTECA, icon: Edit3, group: "Gestión" },
    { title: "Reportes", url: ROUTES.REPORTES, icon: Bug, group: "Sistema" },
    { title: "Configuración", url: toConfiguracion('version'), icon: Settings, group: "Sistema" },
  ],
  PROF: [
    { title: "Agenda", url: ROUTES.AGENDA, icon: Calendar, group: "Docencia" },
    { title: "Progreso", url: toProgreso('resumen'), icon: Activity, group: "Docencia" },
    { title: "Tickets alumnos", url: ROUTES.SOPORTE_PROF, icon: MessageSquare, group: "Docencia" },
    { title: "Preparación", url: ROUTES.PREPARACION, icon: Target, group: "Gestión" },
    { title: "Biblioteca", url: ROUTES.BIBLIOTECA, icon: Edit3, group: "Gestión" },
  ],
  ESTU: [
    { title: "Studia ahora", url: ROUTES.HOY, icon: PlayCircle, group: "Estudio" },
    { title: "Progreso", url: toProgreso('resumen'), icon: Activity, group: "Estudio" },
    { title: "Calendario", url: ROUTES.CALENDARIO, icon: Calendar, group: "Estudio" },
    { title: "Centro de dudas", url: ROUTES.SOPORTE, icon: MessageSquare, group: "Estudio" },
  ],
};

const mainPageByRole = {
  ADMIN: "/usuarios",
  PROF: "/agenda",
  ESTU: "/hoy",
};

const ROLE_LABEL = { ADMIN: "Administrador", PROF: "Profesor", ESTU: "Estudiante" };
const SIDEBAR_WIDTH = 280;

/* ------------------------------- Layout --------------------------------- */
function LayoutContent() {
  const location = useLocation();
  const navigate = useNavigate();
  const { abierto, toggleSidebar, closeSidebar } = useSidebar();
  const { usuarios } = useLocalData();
  const { signOut, user, loading: authLoading, checkSession, handleAuthError } = useAuth();
  const { setShowHotkeysModal } = useHotkeysModal();

  const [pointerStart, setPointerStart] = useState({ x: 0, y: 0, id: null });
  const [isMobile, setIsMobile] = useState(false);
  const toggleLockRef = useRef(0);
  const headerToggleButtonRef = useRef(null);
  const { design, setDesignPartial } = useDesign();
  const { currentVersion } = useAppVersion();

  const appName = getAppName();

  const safeToggle = () => {
    const now = Date.now();
    if (now - toggleLockRef.current < 300) {
      return;
    }
    toggleLockRef.current = now;
    toggleSidebar();
  };

  const handleHeaderClick = (e) => {
    const el = e.target.closest('button, a, input, select, textarea');
    if (el) {
      return;
    }
    safeToggle();
  };

  /* Usuario actual - usar useEffectiveUser() unificado */
  const effectiveUser = useEffectiveUser();
  const { profile, refetch: refetchProfile } = useCurrentProfile();

  // NOTE: Removed forced refetch - useCurrentProfile has 5min staleTime
  // which is sufficient. Forcing refetch on every mount causes unnecessary requests.

  // Usar profile si está disponible (tiene datos más frescos de Supabase), sino effectiveUser
  const displayUser = profile || effectiveUser;

  // console.log('DEBUG: Layout displayUser:', displayUser);
  // console.log('DEBUG: Layout nivelTecnico:', displayUser?.nivelTecnico);
  // console.log('DEBUG: Layout nivel (label):', displayUser?.nivel);

  const isAdmin = effectiveUser?.rolPersonalizado === 'ADMIN';
  const isLoading = false; // No hay loading en local

  /* Detector mobile */
  useEffect(() => {
    const check = () => {
      const wasMobile = isMobile;
      const nowMobile = window.innerWidth < 1024;
      setIsMobile(nowMobile);
    };
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  /* Cerrar sidebar al navegar en mobile */
  useEffect(() => {
    if (isMobile) {
      closeSidebar();
    }
  }, [location.pathname, isMobile, closeSidebar]);

  // A11y: mover foco fuera del sidebar cuando se cierra en mobile
  useEffect(() => {
    const sidebarEl = document.getElementById("sidebar");
    const active = document.activeElement;
    if (isMobile && !abierto && sidebarEl && active && sidebarEl.contains(active)) {
      headerToggleButtonRef.current?.focus?.();
    }
  }, [abierto, isMobile]);

  // A11y: al abrir el sidebar en mobile, mover el foco al propio sidebar
  useEffect(() => {
    if (!isMobile) return;
    if (abierto) {
      const sidebarEl = document.getElementById("sidebar");
      const mainEl = document.querySelector("main");
      const active = document.activeElement;
      if (mainEl && active && mainEl.contains(active)) {
        // Evitar tener foco en un descendiente de un contenedor aria-hidden/inert
        sidebarEl?.focus?.();
      }
    }
  }, [abierto, isMobile]);

  /* Hotkeys globales */
  useEffect(() => {
    const userRole = effectiveUser?.rolPersonalizado || 'ESTU';

    const handleKey = (e) => {
      // Usar helper centralizado para detectar campos editables
      if (shouldIgnoreHotkey(e)) return;

      // Mapeo de IDs de hotkeys a sus acciones
      const hotkeyActions = {
        'toggle-sidebar': () => {
          e.preventDefault();
          safeToggle();
        },
        'toggle-theme': () => {
          e.preventDefault();
          const currentTheme = design?.theme || 'light';
          const newTheme = currentTheme === 'light' ? 'dark' : 'light';
          setDesignPartial('theme', newTheme);
        },
        'toggle-hotkeys-modal': () => {
          e.preventDefault();
          setShowHotkeysModal(prev => !prev);
        },
        'logout': () => {
          e.preventDefault();
          if (window.confirm('¿Estás seguro de que quieres cerrar sesión?')) {
            signOut();
          }
        },
        // Navegación
        'go-studia': () => {
          e.preventDefault();
          navigate(createPageUrl('hoy'));
        },
        'go-week': () => {
          e.preventDefault();
          navigate(createPageUrl('semana'));
        },
        'go-stats-estu': () => {
          e.preventDefault();
          navigate(createPageUrl('estadisticas'));
        },
        'go-calendar-estu': () => {
          e.preventDefault();
          navigate(createPageUrl('calendario'));
        },
        'go-support': () => {
          e.preventDefault();
          navigate(createPageUrl('soporte'));
        },
        'go-assignments': () => {
          e.preventDefault();
          navigate(createPageUrl('asignaciones'));
        },
        'go-agenda': () => {
          e.preventDefault();
          navigate(createPageUrl('agenda'));
        },
        'go-templates': () => {
          e.preventDefault();
          navigate(createPageUrl('biblioteca'));
        },
        'go-stats-prof': () => {
          e.preventDefault();
          navigate(createPageUrl('estadisticas'));
        },
        'go-calendar-prof': () => {
          e.preventDefault();
          navigate(createPageUrl('calendario'));
        },
        'go-users': () => {
          e.preventDefault();
          navigate(ROUTES.USUARIOS);
        },
        'go-import': () => {
          e.preventDefault();
          navigate(toConfiguracion('import'));
        },
        'go-design': () => {
          e.preventDefault();
          navigate(toConfiguracion('design'));
        },
      };

      // Procesar hotkeys globales permitidos para este rol
      for (const hotkey of HOTKEYS_CONFIG) {
        if (hotkey.scope !== 'global' || !hotkey.roles.includes(userRole)) {
          continue;
        }

        // Verificar si el hotkey coincide (primary o aliases)
        if (matchesHotkey(e, hotkey)) {
          const action = hotkeyActions[hotkey.id];
          if (action) {
            action();
            return; // Handler procesó el evento
          }
        }
      }
    };

    window.addEventListener("keydown", handleKey, { capture: true, passive: false });
    return () => window.removeEventListener("keydown", handleKey, { capture: true });
  }, [design, setDesignPartial, safeToggle, navigate, effectiveUser, signOut, setShowHotkeysModal]);

  /* Gestos: swipe desde borde para abrir; swipe izq para cerrar */
  useEffect(() => {
    if (!isMobile) return;

    const onDown = (e) => {
      setPointerStart({ x: e.clientX, y: e.clientY, id: e.pointerId });
    };

    const onMove = (e) => {
      if (!pointerStart.id || pointerStart.id !== e.pointerId) return;
      const dx = e.clientX - pointerStart.x;
      const dy = e.clientY - pointerStart.y;
      if (Math.abs(dy) > Math.abs(dx)) return;

      if (!abierto && pointerStart.x <= 24 && dx > 50) {
        safeToggle();
        setPointerStart({ x: 0, y: 0, id: null });
      }
      if (abierto && dx < -50) {
        closeSidebar();
        setPointerStart({ x: 0, y: 0, id: null });
      }
    };

    const onEnd = () => setPointerStart({ x: 0, y: 0, id: null });

    document.addEventListener("pointerdown", onDown, { passive: true });
    document.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerup", onEnd, { passive: true });
    document.addEventListener("pointercancel", onEnd, { passive: true });

    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onEnd);
      document.removeEventListener("pointercancel", onEnd);
    };
  }, [isMobile, abierto, pointerStart, closeSidebar]);

  /* Bloquear scroll debajo cuando el sidebar está abierto en mobile */
  useEffect(() => {
    if (isMobile && abierto) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => (document.body.style.overflow = "");
  }, [abierto, isMobile]);

  // Rutas públicas que no deben redirigir a login
  const publicRoutes = ['/login', '/reset-password'];
  const isPublicRoute = publicRoutes.includes(location.pathname);

  // Detectar cuando la sesión caduca y redirigir al login
  useEffect(() => {
    // No redirigir si estamos en una ruta pública
    if (isPublicRoute) return;

    // Solo verificar si no está cargando y no hay usuario
    if (!authLoading && !user) {
      // La sesión caducó o no hay usuario autenticado
      // RequireAuth debería manejar esto, pero esto es un respaldo
      navigate('/login', { replace: true });
    }
  }, [user, authLoading, location.pathname, navigate, isPublicRoute]);

  // Verificación proactiva de sesión usando checkSession
  useEffect(() => {
    // No verificar si estamos en una ruta pública
    if (isPublicRoute) return;

    // Solo verificar si hay usuario (si no hay usuario, RequireAuth ya maneja la redirección)
    if (!user || authLoading || !checkSession) {
      return;
    }

    // Verificar sesión periódicamente (cada 2 minutos) como respaldo adicional
    const sessionCheckInterval = setInterval(async () => {
      try {
        const isValid = await checkSession();
        if (!isValid) {
          // Sesión inválida - redirigir
          navigate('/login', { replace: true });
        }
      } catch (error) {
        // Si hay error de autenticación, manejarlo
        if (error && isAuthError(error)) {
          if (handleAuthError) {
            await handleAuthError(error);
          }
          navigate('/login', { replace: true });
        }
      }
    }, 2 * 60 * 1000); // 2 minutos

    return () => {
      clearInterval(sessionCheckInterval);
    };
  }, [user, authLoading, location.pathname, navigate, checkSession, handleAuthError, isPublicRoute]);

  const onMenuItemClick = () => {
    if (isMobile) closeSidebar();
  };

  // Obtener el rol efectivo usando la función unificada
  const { appRole } = useAuth();
  const userRole = getEffectiveRole({ appRole, currentUser: effectiveUser }) || null;

  // Obtener conteos de reportes para el badge (solo para ADMIN)
  // IMPORTANTE: Este hook debe estar antes del return condicional
  const { data: reportCounts } = useQuery({
    queryKey: ['error-reports-counts'],
    queryFn: async () => {
      if (userRole !== 'ADMIN') {
        return { nuevos: 0, enRevision: 0 };
      }

      try {
        // Usar la misma lógica que la página de reportes: traer todos y filtrar
        // Esto asegura que contamos igual que la vista de reportes
        const allReports = await listErrorReports();

        // Filtrar excluyendo 'resuelto', igual que cuando statusFilter = 'active'
        const activeReports = allReports.filter(r => r.status !== 'resuelto');

        // Contar por estado
        const nuevos = activeReports.filter(r => r.status === 'nuevo').length;
        const enRevision = activeReports.filter(r => r.status === 'en_revision').length;

        return {
          nuevos,
          enRevision
        };
      } catch (error) {
        // Ignorar errores CORS o de red silenciosamente
        // Estos pueden ocurrir si la sesión expiró o hay problemas de conectividad
        if (error?.message?.includes('CORS') ||
          error?.message?.includes('NetworkError') ||
          error?.message?.includes('No hay sesión activa') ||
          error?.code === 'PGRST301' ||
          error?.status === 401 ||
          error?.status === 403) {
          return { nuevos: 0, enRevision: 0 };
        }
        // Solo loguear errores inesperados
        console.error('[Layout] Error obteniendo conteos de reportes:', error);
        return { nuevos: 0, enRevision: 0 };
      }
    },
    enabled: Boolean(userRole) && userRole === 'ADMIN' && Boolean(user),
    // OPTIMIZATION: Reduced polling from 30s to 5min
    refetchInterval: 5 * 60 * 1000, // 5 min
    staleTime: 2 * 60 * 1000,       // 2 min cache
    retry: false, // No reintentar si falla (evita spam de errores)
  });

  // Debug: verificar el rol calculado (desactivado)

  if (isLoading) {
    return (
      <LoadingSpinner
        size="xl"
        variant="fullPage"
        text={`Cargando ${appName}...`}
      />
    );
  }

  // Mapeo de URLs a los roles que tienen acceso
  // Mapeo de URLs a los roles que tienen acceso
  const pagePermissions = {
    [ROUTES.USUARIOS]: ['ADMIN'],
    [ROUTES.REPORTES]: ['PROF', 'ADMIN'],
    [ROUTES.ESTUDIANTES]: ['PROF', 'ADMIN'],
    [ROUTES.ASIGNACIONES]: ['PROF', 'ADMIN'],
    [ROUTES.PREPARACION]: ['PROF', 'ADMIN'],
    [ROUTES.BIBLIOTECA]: ['PROF', 'ADMIN'],
    [ROUTES.AGENDA]: ['PROF', 'ADMIN'],
    [ROUTES.CALENDARIO]: ['ESTU', 'PROF', 'ADMIN'],
    [ROUTES.HOY]: ['ESTU'],
    '/semana': ['ESTU'], // Not in ROUTES yet but fine
    [ROUTES.PROGRESO]: ['ESTU', 'PROF', 'ADMIN'],
    '/estadisticas': ['ESTU', 'PROF', 'ADMIN'],
    '/habilidades': ['ESTU', 'PROF', 'ADMIN'],
    '/design': ['ADMIN'], // Legacy
    '/admin/version': ['ADMIN'], // Legacy
    '/admin/configuracion': ['ADMIN'], // Legacy
    [ROUTES.CONFIGURACION]: ['ADMIN'],
    '/testseed': ['ADMIN'], // Legacy
    '/import-export': ['ADMIN'], // Legacy
    [ROUTES.SOPORTE]: ['ESTU'],
    [ROUTES.SOPORTE_PROF]: ['PROF', 'ADMIN'],
    '/contenido-multimedia': ['PROF', 'ADMIN'], // Legacy
    '/mochila': ['ESTU'],
  };

  // Filtrar items del sidebar según los permisos reales de acceso
  const allItems = navigationByRole[userRole] || navigationByRole.ESTU;
  const items = allItems.filter(item => {
    // Strip query params from URL for permission check
    const pathOnly = item.url.split('?')[0];
    const allowedRoles = pagePermissions[pathOnly];
    return allowedRoles && allowedRoles.includes(userRole);
  });

  const grouped = items.reduce((acc, it) => {
    (acc[it.group] ||= []).push(it);
    return acc;
  }, {});

  const logout = async () => {
    try {
      // Cerrar sesión en Supabase
      await signOut();
    } catch (error) {
      // Si es un error de sesión faltante o expirada, es válido continuar
      // El objetivo es cerrar sesión y si no hay sesión, ya estamos en el estado deseado
      if (error?.message?.includes('Auth session missing') ||
        error?.message?.includes('JWT expired') ||
        error?.status === 403) {
        // No mostrar error si simplemente no hay sesión
      } else {
        console.error("Error al cerrar sesión:", error);
      }
    }

    // Limpiar datos locales siempre (incluso si falló el signOut de Supabase)
    try {
      if (localDataClient?.auth?.logout) {
        await localDataClient.auth.logout();
      }
    } catch (localError) {
      console.warn('[Layout] Error limpiando datos locales:', localError);
    }

    // Redirigir a login siempre
    navigate("/login", { replace: true });
  };

  const [perfilModalOpen, setPerfilModalOpen] = useState(false);

  const goProfile = () => {
    if (isMobile) closeSidebar();
    setPerfilModalOpen(true);
  };

  /* ------------------------------- Render -------------------------------- */
  return (
    <RoleBootstrap>
      <SkipLink href="#main-content" />
      <div
        className="min-h-screen w-full bg-background"
        data-sidebar-abierto={abierto}
        id="main-content"
      >
        {/* Overlay mobile */}
        <div
          className={`fixed inset-0 bg-black/30 z-[80] lg:hidden transition-opacity duration-200 ${abierto ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
            }`}
          onClick={(e) => {
            closeSidebar();
          }}
          aria-hidden="true"
        />

        {/* Sidebar - Siempre fixed */}
        <aside
          id="sidebar"
          aria-label="Menú de navegación"
          aria-hidden={!abierto}
          data-open={abierto}
          inert={!abierto ? "" : undefined}
          tabIndex="-1"
          className={`
            z-[90] flex flex-col sidebar-modern
            transition-transform duration-200 will-change-transform transform-gpu
            fixed inset-y-0 left-0 w-[280px]
            border-r border-[var(--color-border-strong)]
            shadow-[1px_0_4px_rgba(0,0,0,0.2)]
            ${abierto ? "translate-x-0" : "-translate-x-full lg:-translate-x-full"}
          `}
          style={{
            transform: abierto ? 'translateX(0)' : 'translateX(-100%)',
            backgroundColor: 'var(--sidebar-bg)',
            pointerEvents: !abierto ? 'none' : 'auto',
          }}
        >
          {/* Header del sidebar */}
          <div className="border-b border-[var(--color-border-default)]/30 p-6">
            <div className="flex items-center gap-3">
              <div className="w-16 h-16 rounded-xl flex items-center justify-center overflow-hidden">
                <img
                  src={logoLTS}
                  alt={appName}
                  className="w-full h-full object-contain"
                />
              </div>
              <div>
                <h2 className="font-bold text-[var(--color-text-primary)] text-lg font-headings">{appName}</h2>
                <div className="flex flex-col gap-1">
                  <p className="text-xs text-[var(--color-text-secondary)] uppercase tracking-wide font-medium">
                    {ROLE_LABEL[userRole] || "Estudiante"}
                  </p>
                  {displayUser?.nivelTecnico && userRole === 'ESTU' && (
                    <div className="mt-0.5">
                      <LevelBadge level={displayUser.nivelTecnico} label={displayUser.nivel} />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Navegación */}
          <div className="flex-1 overflow-y-auto p-3">
            {Object.entries(grouped).map(([group, groupItems]) => (
              <div key={group} className="mb-6">
                <p className={componentStyles.components.menuSectionTitle}>
                  {group}
                </p>
                <div className="space-y-1">
                  {groupItems.map((item) => {
                    // Fix: compare pathnames only (strip query string) so /progreso?tab=xxx highlights "Progreso"
                    const itemPathname = item.url.split('?')[0];
                    const isActive = itemPathname === '/'
                      ? location.pathname === '/'
                      : (location.pathname === itemPathname || location.pathname.startsWith(`${itemPathname}/`));
                    const isReportes = item.url === '/reportes';
                    const isSoporte = item.url === '/soporte-prof' || item.url === '/soporte';
                    const nuevos = reportCounts?.nuevos || 0;
                    const enRevision = reportCounts?.enRevision || 0;
                    const totalCount = isReportes ? (nuevos + enRevision) : 0;

                    return (
                      <Link
                        key={item.title}
                        to={createPageUrl(item.url.split("/").pop())}
                        className={
                          isActive
                            ? `${componentStyles.components.menuItem} ${componentStyles.components.menuItemActive}`
                            : componentStyles.components.menuItem
                        }
                        onClick={onMenuItemClick}
                      >
                        <div className="relative shrink-0">
                          <item.icon className="w-5 h-5 text-[var(--color-text-secondary)]" />
                          {isReportes && totalCount > 0 && (
                            <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-[var(--color-danger)] rounded-full z-10">
                              {totalCount > 99 ? '99+' : totalCount}
                            </span>
                          )}
                        </div>
                        <span className="font-medium flex-1">{item.title}</span>
                        {isReportes && totalCount > 0 && (
                          <div className="flex items-center gap-1 ml-2 shrink-0">
                            {nuevos > 0 && (
                              <Badge variant="danger" className="text-[10px] px-1.5 py-0 h-5 min-w-[20px] flex items-center justify-center">
                                {nuevos}
                              </Badge>
                            )}
                            {enRevision > 0 && (
                              <Badge variant="warning" className="text-[10px] px-1.5 py-0 h-5 min-w-[20px] flex items-center justify-center">
                                {enRevision}
                              </Badge>
                            )}
                          </div>
                        )}
                        {isSoporte && <SupportTicketsBadge />}
                        {isActive && <ChevronRight className="w-4 h-4 ml-auto shrink-0" />}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Pie del sidebar */}
          <div className="border-t border-[var(--color-border-default)]/30 p-4 pt-3 space-y-3 text-[var(--color-text-secondary)]">
            <button
              onClick={goProfile}
              className="flex items-center gap-3 px-2 w-full hover:bg-[var(--color-surface-muted)] rounded-xl py-2 transition-all cursor-pointer min-h-[44px]"
              aria-label="Ver perfil de usuario"
            >
              <div className="w-10 h-10 bg-gradient-to-br from-[var(--color-surface-muted)] to-[var(--color-surface-muted)]/20 rounded-full flex items-center justify-center">
                <span className="text-[var(--color-text-primary)] font-semibold text-sm">
                  {(displayName(effectiveUser || { name: "U" }))
                    .slice(0, 1)
                    .toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className="font-medium text-[var(--color-text-primary)] text-sm truncate">
                  {displayName(effectiveUser) || "Usuario"}
                </p>
                <div className="flex items-center gap-2">
                  <p className="text-xs text-[var(--color-text-secondary)] truncate">{effectiveUser?.email}</p>
                </div>
              </div>
            </button>

            <div className="flex items-center gap-1 w-full">
              {/* Ayuda */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate(createPageUrl('ayuda'))}
                      className={`flex-1 justify-center gap-2 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-muted)] min-h-[44px] h-10 rounded-xl ${componentStyles.buttons.ghost}`}
                      aria-label="Centro de Ayuda"
                    >
                      <HelpCircle className="w-5 h-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Ayuda</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {/* Toggle Tema - Ahora separado */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDesignPartial('theme', (design?.theme === 'dark' ? 'light' : 'dark'))}
                      className={`flex-1 justify-center gap-2 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-muted)] min-h-[44px] h-10 rounded-xl ${componentStyles.buttons.ghost}`}
                      aria-label={design?.theme === 'dark' ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
                    >
                      {design?.theme === 'dark' ? (
                        <Sun className="w-5 h-5" />
                      ) : (
                        <Moon className="w-5 h-5" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{design?.theme === 'dark' ? "Modo claro" : "Modo oscuro"}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {/* Ocultar menú */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={safeToggle}
                      className={`flex-1 justify-center gap-2 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-muted)] min-h-[44px] h-10 rounded-xl ${componentStyles.buttons.ghost}`}
                      aria-label="Ocultar menú"
                    >
                      <PanelLeft className="w-5 h-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Ocultar menú</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={logout}
              className={`w-full justify-start gap-2 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-muted)] min-h-[44px] h-10 rounded-xl ${componentStyles.buttons.ghost}`}
              aria-label="Cerrar sesión"
            >
              <LogOut className="w-4 h-4" />
              Cerrar sesión
            </Button>
          </div>
        </aside>

        {/* Contenido principal - Ancho completo cuando sidebar cerrado */}
        <main
          className="min-h-screen transition-all duration-200 flex flex-col"
          style={{
            marginLeft: !isMobile && abierto ? `${SIDEBAR_WIDTH}px` : '0',
          }}
          aria-hidden={isMobile && abierto}
          inert={isMobile && abierto ? "" : undefined}
          tabIndex={isMobile && abierto ? -1 : undefined}
        >

          {/* Botón flotante para desktop - solo visible cuando está cerrado */}
          {!isMobile && !abierto && (
            <div
              className="fixed z-[95] transition-all duration-200"
              style={{
                left: 0,
                top: 88,
              }}
            >
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={safeToggle}
                      className="rounded-xl rounded-l-none border-l-0 shadow-card bg-card hover:bg-[var(--color-surface-muted)] h-12 w-8 px-0"
                      aria-label="Mostrar menú (Ctrl/⌘+M)"
                      aria-controls="sidebar"
                      aria-expanded={false}
                    >
                      <PanelLeft className="w-4 h-4 text-[var(--color-text-primary)]" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <p>Mostrar menú (Ctrl/⌘+M)</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          )}

          {/* Área de contenido */}
          <div className="flex-1">
            <Outlet />
          </div>

          {/* Botón flotante de reporte de errores - Ocultar en modo estudio (/hoy) */}
          {!location.pathname.startsWith('/hoy') && <ReportErrorButton />}

          {/* Footer global - centrado con nombre de app */}
          <footer className="border-t border-[var(--color-border-default)] bg-card text-xs text-[var(--color-text-secondary)] mt-auto">
            <div className="max-w-7xl mx-auto px-4 py-4 md:py-5 flex flex-wrap items-center justify-center gap-2 text-center">
              <span>
                {appName}
                {currentVersion?.version && (
                  <span className="ml-1.5 text-[var(--color-text-secondary)]">
                    {currentVersion.version}
                  </span>
                )}
                {' '}© {new Date().getFullYear()}
              </span>
              <span className="opacity-40">-</span>
              <a
                href="https://latrompetasonara.com"
                target="_blank"
                rel="noreferrer"
                className="text-[var(--color-text-primary)] hover:underline transition-colors"
              >
                La Trompeta Sonará
              </a>
              <span className="opacity-40">•</span>
              <a
                href="https://instagram.com/latrompetasonara"
                target="_blank"
                rel="noreferrer"
                className="text-[var(--color-text-primary)] hover:underline transition-colors"
              >
                Instagram
              </a>
            </div>
          </footer>
        </main>
      </div>
      <PerfilModal
        open={perfilModalOpen}
        onOpenChange={setPerfilModalOpen}
      />
      <AdminUpdateNotice />
    </RoleBootstrap>
  );
}

// Componente interno que usa el hook para el modal
function HotkeysModalWrapper() {
  const { showHotkeysModal, setShowHotkeysModal } = useHotkeysModal();
  return (
    <HotkeysModal
      open={showHotkeysModal}
      onOpenChange={setShowHotkeysModal}
    />
  );
}

/* Wrapper con providers del estado del sidebar y hotkeys modal */
export default function Layout() {
  return (
    <HotkeysModalProvider>
      <SidebarProvider>
        <LayoutContent />
        <HotkeysModalWrapper />
      </SidebarProvider>
    </HotkeysModalProvider>
  );
}
