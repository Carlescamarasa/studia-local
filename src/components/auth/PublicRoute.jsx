import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/auth/AuthProvider';
import { createPageUrl } from '@/utils';
import { roleHome } from '@/components/auth/roleMap';

/**
 * Componente para proteger rutas públicas.
 * - Permite acceso a usuarios no autenticados
 * - Si el usuario está autenticado y está en /login, redirige a su página de inicio según su rol
 * - Si el usuario está autenticado y está en /reset-password, permite el acceso (para cambiar contraseña)
 */
export default function PublicRoute({ children }) {
  const { user, loading, appRole } = useAuth();
  
  // Si está cargando, mostrar loader
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
          <p className="text-[var(--color-text-secondary)]">Cargando...</p>
        </div>
      </div>
    );
  }
  
  // Si el usuario está autenticado y está en /login, redirigir a su página de inicio
  if (user && window.location.pathname === '/login') {
    const targetPage = roleHome[appRole] || roleHome.ESTU;
    const pageName = targetPage.replace(/^\//, '');
    return <Navigate to={createPageUrl(pageName)} replace />;
  }
  
  // Para otras rutas públicas (como /reset-password), permitir acceso incluso si está autenticado
  return children;
}

