import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';

const SidebarContext = createContext(null);

export function SidebarProvider({ children }) {
  const location = useLocation();
  
  const [abierto, setAbierto] = useState(() => {
    const isModoEstudio = location.pathname === '/hoy' || location.pathname.startsWith('/estudio');
    if (isModoEstudio) return false;
    
    const stored = localStorage.getItem('ui.sidebar.abierto');
    if (stored !== null) {
      return stored === 'true';
    }
    return window.innerWidth >= 1024;
  });

  useEffect(() => {
    localStorage.setItem('ui.sidebar.abierto', String(abierto));
  }, [abierto]);

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