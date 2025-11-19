import React, { useEffect, useRef } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/auth/AuthProvider';
import { supabase } from '@/lib/supabaseClient';
import { isAuthError } from '@/lib/authHelpers';

export default function RequireAuth({ children }) {
  const { user, loading, checkSession, signOut } = useAuth();
  const checkIntervalRef = useRef(null);

  // Verificación activa de sesión cada 30 segundos
  useEffect(() => {
    // Solo verificar si hay usuario (no tiene sentido verificar si no hay usuario)
    if (!user) {
      return;
    }

    // Verificar inmediatamente al montar
    checkSession?.();

    // Configurar verificación periódica cada 30 segundos
    checkIntervalRef.current = setInterval(async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        // Si hay error de autenticación o no hay sesión, forzar cierre de sesión
        if (error && isAuthError(error)) {
          await signOut?.();
          return;
        }
        
        if (!session) {
          // No hay sesión pero tenemos usuario en estado - forzar actualización
          await checkSession?.();
        } else {
          // Verificar que la sesión sigue válida usando checkSession
          await checkSession?.();
        }
      } catch (err) {
        // Error al verificar - no hacer nada para no interrumpir la experiencia
        if (process.env.NODE_ENV === 'development') {
          console.warn('[RequireAuth] Error en verificación de sesión:', err);
        }
      }
    }, 30 * 1000); // 30 segundos

    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
        checkIntervalRef.current = null;
      }
    };
  }, [user, checkSession, signOut]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
          <p className="text-[var(--color-text-secondary)]">Verificando autenticación...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

