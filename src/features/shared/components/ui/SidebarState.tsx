import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
/* eslint-disable react-refresh/only-export-components */
import { useLocation } from 'react-router-dom';

interface SidebarContextType {
  abierto: boolean;
  toggleSidebar: () => void;
  openSidebar: () => void;
  closeSidebar: () => void;
}

const SidebarContext = createContext<SidebarContextType | null>(null);

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 1024;
  const isModoEstudio = location.pathname.startsWith('/hoy');

  const [abierto, setAbierto] = useState(() => {
    // En mobile, siempre cerrado por defecto
    if (!isDesktop) {
      return false;
    }

    // En desktop, siempre abierto por defecto (incluyendo /hoy)
    return true;
  });

  // Actualizar estado cuando cambia el tamaño de ventana - SOLO para mobile
  useEffect(() => {
    const checkDesktop = () => window.innerWidth >= 1024;
    const nowDesktop = checkDesktop();

    if (!nowDesktop) {
      // En mobile, asegurar cerrado al redimensionar a mobile
      setAbierto(false);
    }
    // En desktop respetamos el estado actual (no forzamos true)
  }, [location.pathname]);

  useEffect(() => {
    // Solo guardar en localStorage si el usuario lo cambió manualmente
    // No guardamos el estado automático para que siempre respete el comportamiento por defecto
    if (isDesktop && !isModoEstudio) {
      // En desktop (excepto modo estudio), no guardar - siempre abierto
      return;
    }
    localStorage.setItem('ui.sidebar.abierto', String(abierto));
  }, [abierto, isDesktop, isModoEstudio]);

  const toggleSidebar = useCallback(() => {
    setAbierto(prev => !prev);
  }, []);

  const openSidebar = useCallback(() => {
    setAbierto(true);
  }, []);

  const closeSidebar = useCallback(() => {
    setAbierto(false);
  }, []);

  return (
    <SidebarContext.Provider value={{ abierto, toggleSidebar, openSidebar, closeSidebar }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error('useSidebar debe usarse dentro de SidebarProvider');
  }
  return context;
}

/**
 * Safe version of useSidebar that returns default values when no provider exists.
 * Use this in components that may render outside of SidebarProvider (e.g., /studia).
 */
export function useSidebarSafe() {
  const context = useContext(SidebarContext);
  if (!context) {
    return { abierto: false, toggleSidebar: () => { }, openSidebar: () => { }, closeSidebar: () => { } };
  }
  return context;
}