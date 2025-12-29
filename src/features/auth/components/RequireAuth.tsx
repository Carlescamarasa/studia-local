import React, { useEffect, useRef } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/auth/AuthProvider';
import { supabase } from '@/lib/supabaseClient';
import { isAuthError } from '@/lib/authHelpers';

export default function RequireAuth({ children }) {
  const { user, loading, checkSession, signOut } = useAuth();
  const checkIntervalRef = useRef(null);
  const lastCheckRef = useRef(null);

  // Verificación optimizada de sesión: menos frecuente y solo cuando es necesario
  useEffect(() => {
    // Solo verificar si hay usuario
    if (!user) {
      return;
    }

    // Verificar inmediatamente al montar solo si no se ha verificado recientemente
    const now = Date.now();
    if (!lastCheckRef.current || (now - lastCheckRef.current) > 60000) { // Solo si pasó más de 1 minuto
      checkSession?.();
      lastCheckRef.current = now;
    }

    // Configurar verificación periódica cada 5 minutos (en lugar de 30 segundos)
    // AuthProvider ya tiene su propia verificación cada 5 minutos
    checkIntervalRef.current = setInterval(async () => {
      const now = Date.now();
      // Solo verificar si pasó suficiente tiempo desde la última verificación
      if (lastCheckRef.current && (now - lastCheckRef.current) < 60000) {
        return; // Ya se verificó recientemente
      }

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
          lastCheckRef.current = Date.now();
        } else {
          // Verificar que la sesión sigue válida usando checkSession
          await checkSession?.();
          lastCheckRef.current = Date.now();
        }
      } catch (err) {
        // Error al verificar - no hacer nada para no interrumpir la experiencia
        if (import.meta.env.DEV) {
          console.warn('[RequireAuth] Error en verificación de sesión:', err);
        }
      }
    }, 5 * 60 * 1000); // 5 minutos (sincronizado con AuthProvider)

    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
        checkIntervalRef.current = null;
      }
    };
  }, [user?.id, checkSession, signOut]); // Solo reejecutar si cambia el ID del usuario

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

