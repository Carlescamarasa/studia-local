
// src/Layout.js
import React, { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
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
  UserCog,
  Edit3,
  PanelLeft,
  PanelLeftClose,
  FileDown,
  Beaker,
  Layers,
  Palette,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { getCurrentUser, setCurrentUser } from "@/api/localDataClient";
import { useLocalData } from "@/local-data/LocalDataProvider";
import logoLTS from "@/assets/Logo_LTS.png";
import RoleBootstrap from "@/components/auth/RoleBootstrap";
import { SidebarProvider, useSidebar } from "@/components/ui/SidebarState";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { getAppName } from "@/components/utils/appMeta";
import { DesignProvider } from "@/components/design/DesignProvider";
import { componentStyles } from "@/design/componentStyles";
import { Outlet } from "react-router-dom";
import { displayName } from "@/components/utils/helpers";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

/* ------------------------------ Navegación ------------------------------ */
const navigationByRole = {
  ADMIN: [
    { title: "Usuarios", url: "/usuarios", icon: Users, group: "Planificador" },
    { title: "Asignaciones", url: "/asignaciones", icon: Target, group: "Planificador" },
    { title: "Plantillas", url: "/plantillas", icon: Edit3, group: "Planificador" },
    { title: "Agenda", url: "/agenda", icon: Calendar, group: "Vista" },
    { title: "Estadísticas", url: "/estadisticas", icon: Activity, group: "Vista" },
    { title: "Panel de Diseño", url: "/design", icon: Palette, group: "Admin" },
    { title: "Tests & Seeds", url: "/testseed", icon: Settings, group: "Admin" },
    { title: "Importar y Exportar", url: "/import-export", icon: FileDown, group: "Admin" },
  ],
  PROF: [
    { title: "Mis Estudiantes", url: "/estudiantes", icon: Users, group: "Planificador" },
    { title: "Asignaciones", url: "/asignaciones", icon: Target, group: "Planificador" },
    { title: "Plantillas", url: "/plantillas", icon: Edit3, group: "Planificador" },
    { title: "Agenda", url: "/agenda", icon: Calendar, group: "Vista" },
    { title: "Estadísticas", url: "/estadisticas", icon: Activity, group: "Vista" },
  ],
  ESTU: [
    { title: "Estudiar Ahora", url: "/hoy", icon: PlayCircle, group: "Estudio" },
    { title: "Mi Semana", url: "/semana", icon: Calendar, group: "Estudio" },
    { title: "Mis Estadísticas", url: "/estadisticas", icon: Activity, group: "Estudio" },
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

  const [simulatingUser, setSimulatingUser] = useState(null);
  const [pointerStart, setPointerStart] = useState({ x: 0, y: 0, id: null });
  const [isMobile, setIsMobile] = useState(false);
  const toggleLockRef = useRef(0);
  const headerToggleButtonRef = useRef(null);

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

  /* Usuario actual - usar getCurrentUser() local */
  const currentUser = getCurrentUser();
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

  /* Simulación */
  useEffect(() => {
    const sim = sessionStorage.getItem("simulatingUser");
    if (sim) setSimulatingUser(JSON.parse(sim));
  }, [location]);

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

  /* Hotkey: Ctrl/⌘ + M - funciona SIEMPRE (incluso con modales) */
  useEffect(() => {
    const handleKey = (e) => {
      const active = document.activeElement;
      const inEditable =
        ["INPUT", "TEXTAREA", "SELECT"].includes(active?.tagName) ||
        active?.isContentEditable;
      if (inEditable) return;

      if ((e.metaKey || e.ctrlKey) && (e.key === "m" || e.key === "M")) {
        e.preventDefault();
        safeToggle();
      }
    };
    window.addEventListener("keydown", handleKey, { capture: true, passive: false });
    return () => window.removeEventListener("keydown", handleKey, { capture: true });
  }, []);

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

  const onMenuItemClick = () => {
    if (isMobile) closeSidebar();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[hsl(var(--brand-500))] border-t-transparent rounded-full animate-spin" />
          <p className="text-muted">Cargando {appName}...</p>
        </div>
      </div>
    );
  }

  const userRole =
    simulatingUser?.rolPersonalizado || currentUser?.rolPersonalizado || "ESTU";
  const items = navigationByRole[userRole] || navigationByRole.ESTU;

  const grouped = items.reduce((acc, it) => {
    (acc[it.group] ||= []).push(it);
    return acc;
  }, {});

  const logout = async () => {
    sessionStorage.removeItem("simulatingUser");
    sessionStorage.removeItem("originalUser");
    sessionStorage.removeItem("originalPath");
    // No llamar a base44.auth.logout() - solo limpiar sessionStorage
  };

  const stopSimulation = () => {
    const originalPath = sessionStorage.getItem("originalPath");
    sessionStorage.removeItem("simulatingUser");
    sessionStorage.removeItem("originalUser");
    sessionStorage.removeItem("originalPath");
    setSimulatingUser(null);

    if (originalPath) {
      navigate(originalPath, { replace: true });
    } else {
      const r = currentUser?.rolPersonalizado;
      const target = mainPageByRole[r] || "/hoy";
      navigate(createPageUrl(target.split("/").pop()), { replace: true });
    }
  };

  const goProfile = () => {
    if (isMobile) closeSidebar();
    navigate(createPageUrl("perfil"));
  };

  /* ------------------------------- Render -------------------------------- */
  return (
    <RoleBootstrap>
      <div
        className="min-h-screen w-full bg-background"
        data-sidebar-abierto={abierto}
      >
        {/* Overlay mobile */}
        <div
          className={`fixed inset-0 bg-black/30 z-[80] lg:hidden transition-opacity duration-200 ${
            abierto ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
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
          aria-hidden={!abierto && isMobile}
          data-open={abierto}
          inert={!abierto && isMobile ? "" : undefined}
          tabIndex={-1}
          className={`
            bg-card border-r border-ui z-[90] flex flex-col
            transition-transform duration-200 will-change-transform transform-gpu
            fixed inset-y-0 left-0 w-[280px]
            ${abierto ? "translate-x-0" : "-translate-x-full lg:-translate-x-full"}
          `}
          style={{
            transform: abierto ? 'translateX(0)' : 'translateX(-100%)',
          }}
        >
          {/* Header del sidebar */}
          <div className="border-b border-ui p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-card overflow-hidden">
                <img 
                  src={logoLTS} 
                  alt={appName}
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <h2 className="font-bold text-ui text-lg">{appName}</h2>
                <p className="text-xs text-ui/80 uppercase tracking-wide font-medium">
                  {ROLE_LABEL[userRole] || "Estudiante"}
                </p>
              </div>
            </div>
          </div>

          {/* Navegación */}
          <div className="flex-1 overflow-y-auto p-3">
            {Object.entries(grouped).map(([group, groupItems]) => (
              <div key={group} className="mb-4">
                <p className={componentStyles.components.menuSectionTitle}>
                  {group}
                </p>
                <div className="space-y-1">
                  {groupItems.map((item) => {
                    const isActive = location.pathname === item.url;
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
                        <item.icon className="w-5 h-5 text-ui/80" />
                        <span className="font-medium">{item.title}</span>
                        {isActive && <ChevronRight className="w-4 h-4 ml-auto" />}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Pie del sidebar */}
          <div className="border-t border-ui p-4 pt-3 space-y-3 text-ui/90">
            {/* Selector de usuario local */}
            <div className="px-2 py-2 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border-strong)]">
              <label className="text-[11px] font-medium text-ui mb-1 block">
                Usuario Local:
              </label>
              <Select
                value={currentUser?.id || ''}
                onValueChange={(val) => {
                  setCurrentUser(val);
                  window.location.reload();
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Seleccionar usuario" />
                </SelectTrigger>
                <SelectContent>
                  {usuarios.map((user) => (
                    <SelectItem key={user.id} value={String(user.id)}>
                      {displayName(user)} ({ROLE_LABEL[user.rolPersonalizado]})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {simulatingUser && (
              <div className="px-2 py-2 rounded-xl bg-amber-50 border border-amber-200">
                <div className="flex items-start gap-2">
                  <UserCog className="w-4 h-4 text-amber-700 mt-0.5" />
                  <div className="text-[11px] text-amber-900 leading-snug">
                    Simulando:{" "}
                    <span className="font-semibold">{displayName(simulatingUser)}</span>
                    <span className="text-amber-700">
                      {" "}
                      ({ROLE_LABEL[simulatingUser.rolPersonalizado]})
                    </span>
                    <div className="mt-1">
                      <button
                        onClick={stopSimulation}
                        className="text-[11px] text-amber-700 hover:text-amber-900 underline underline-offset-2"
                      >
                        Terminar simulación
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {!isMobile && (
              <Button
                variant="ghost"
                size="sm"
                onClick={safeToggle}
                className="w-full justify-start gap-2 text-ui/80 hover:text-ui hover:bg-muted min-h-[44px] h-10 rounded-xl"
                aria-label="Ocultar menú lateral"
              >
                <PanelLeftClose className="w-4 h-4" />
                Ocultar menú (Ctrl/⌘+M)
              </Button>
            )}

            <button
              onClick={goProfile}
              className="flex items-center gap-3 px-2 w-full hover:bg-muted rounded-xl py-2 transition-all cursor-pointer min-h-[44px]"
              aria-label="Ver perfil de usuario"
            >
              <div className="w-10 h-10 bg-gradient-to-br from-[hsl(var(--muted))] to-[hsl(var(--muted-foreground)/0.2)] rounded-full flex items-center justify-center">
                <span className="text-ui font-semibold text-sm">
                  {(displayName(simulatingUser || currentUser || { name: "U" }))
                    .slice(0, 1)
                    .toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className="font-medium text-ui text-sm truncate">
                  {displayName(simulatingUser || currentUser) || "Usuario"}
                </p>
                <p className="text-xs text-ui/80 truncate">{currentUser?.email}</p>
              </div>
            </button>

            <Button
              variant="ghost"
              size="sm"
              onClick={logout}
              className="w-full justify-start gap-2 text-ui/80 hover:text-ui hover:bg-muted min-h-[44px] h-10 rounded-xl"
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
        >
          {/* Header mobile */}
          <header
            className="bg-card border-b border-ui px-4 py-3 lg:hidden sticky top-0 z-[70] cursor-pointer active:bg-muted transition-colors"
            onClick={handleHeaderClick}
            role="button"
            aria-label={abierto ? "Cerrar menú" : "Abrir menú"}
            aria-controls="sidebar"
            aria-expanded={abierto}
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                safeToggle();
              }
            }}
          >
            <div className="flex items-center justify-between min-h-[44px]">
              <button
                ref={headerToggleButtonRef}
                className="hover:bg-muted p-2 rounded-xl transition-all min-h-[44px] min-w-[44px] flex items-center justify-center"
                onClick={(e) => {
                  e.stopPropagation();
                  safeToggle();
                }}
                aria-label={abierto ? "Cerrar menú" : "Abrir menú"}
                aria-controls="sidebar"
                aria-expanded={abierto}
              >
                {abierto ? <X className="w-5 h-5" /> : <MenuIcon className="w-5 h-5" />}
              </button>
              <h1 className="text-base font-bold text-ui">{appName}</h1>
              <div className="w-11" />
            </div>
          </header>

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
                      className="rounded-xl rounded-l-none border-l-0 shadow-card bg-card hover:bg-muted h-12 w-8 px-0"
                      aria-label="Mostrar menú (Ctrl/⌘+M)"
                      aria-controls="sidebar"
                      aria-expanded={false}
                    >
                      <PanelLeft className="w-4 h-4 text-ui" />
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

          {/* Footer global - centrado con nombre de app */}
          <footer className="border-t border-ui bg-card text-xs text-ui/80 mt-auto">
            <div className="max-w-7xl mx-auto px-4 py-4 md:py-5 flex flex-wrap items-center justify-center gap-2 text-center">
              <span>{appName} © {new Date().getFullYear()}</span>
              <span className="opacity-40">-</span>
              <a
                href="https://latrompetasonara.com"
                target="_blank"
                rel="noreferrer"
                className="text-ui hover:underline transition-colors"
              >
                La Trompeta Sonará
              </a>
              <span className="opacity-40">•</span>
              <a
                href="https://instagram.com/latrompetasonara"
                target="_blank"
                rel="noreferrer"
                className="text-ui hover:underline transition-colors"
              >
                Instagram
              </a>
            </div>
          </footer>
        </main>
      </div>
    </RoleBootstrap>
  );
}

/* Wrapper con providers del estado del sidebar y diseño */
export default function Layout() {
  return (
    <DesignProvider>
      <SidebarProvider>
        <LayoutContent />
      </SidebarProvider>
    </DesignProvider>
  );
}
