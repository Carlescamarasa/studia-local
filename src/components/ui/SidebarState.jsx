import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';

const SidebarContext = createContext(null);

export function SidebarProvider({ children }) {
  const location = useLocation();
  const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 1024;
  const isModoEstudio = location.pathname === '/hoy';
  
  const [abierto, setAbierto] = useState(() => {
    // En mobile, siempre cerrado por defecto
    if (!isDesktop) {
      return false;
    }
    
    // En modo estudio (/hoy), cerrado por defecto
    if (isModoEstudio) {
      return false;
    }
    
    // En desktop (excepto modo estudio), siempre abierto por defecto
    // Ignoramos localStorage para forzar el comportamiento por defecto
    return true;
  });

  // Actualizar estado cuando cambia la ruta o el tamaño de ventana
  useEffect(() => {
    const checkDesktop = () => window.innerWidth >= 1024;
    const nowDesktop = checkDesktop();
    const nowModoEstudio = location.pathname === '/hoy';
    
    if (nowDesktop && !nowModoEstudio) {
      // En desktop (excepto modo estudio), forzar abierto
      setAbierto(true);
    } else if (nowModoEstudio) {
      // En modo estudio, cerrar
      setAbierto(false);
    } else if (!nowDesktop) {
      // En mobile, cerrar
      setAbierto(false);
    }
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