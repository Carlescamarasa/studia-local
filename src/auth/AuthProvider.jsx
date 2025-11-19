import React, { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabaseClient';

const AuthContext = createContext(undefined);

/**
 * Calcula el rol de la aplicación basándose en el email del usuario
 * @param {string} email - Email del usuario
 * @returns {string} - Rol: 'ADMIN', 'PROF' o 'ESTU'
 */
function calculateAppRoleFromEmail(email) {
  if (!email) return 'ESTU';
  
  const normalizedEmail = email.toLowerCase().trim();
  
  // Admin
  if (normalizedEmail === 'carlescamarasa@gmail.com') {
    return 'ADMIN';
  }
  
  // Profesores
  if (normalizedEmail === 'carlescamarasa+profe@gmail.com' || 
      normalizedEmail === 'atorrestrompeta@gmail.com') {
    return 'PROF';
  }
  
  // Por defecto: Estudiante
  return 'ESTU';
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const fetchingProfileRef = useRef(false);
  const currentUserIdRef = useRef(null);
  
  // Calcular appRole basándose en el email del usuario
  const appRole = useMemo(() => {
    return calculateAppRoleFromEmail(user?.email);
  }, [user?.email]);

  // Función para obtener el perfil desde Supabase
  const fetchProfile = async (userId) => {
    if (!userId) {
      setProfile(null);
      currentUserIdRef.current = null;
      fetchingProfileRef.current = false;
      return;
    }

    // Evitar múltiples llamadas simultáneas para el mismo usuario
    if (fetchingProfileRef.current && currentUserIdRef.current === userId) {
      return;
    }

    fetchingProfileRef.current = true;
    currentUserIdRef.current = userId;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        // Si no hay perfil o hay error de RLS, usar valores por defecto
        // No lanzar error - simplemente no establecer perfil
        if (error.message.includes('infinite recursion')) {
          console.error('Error de políticas RLS en Supabase. Revisa las políticas de la tabla profiles.');
        } else {
          console.warn('No se encontró perfil para el usuario:', error.message);
        }
        setProfile(null);
        fetchingProfileRef.current = false;
        return;
      }

      setProfile(data);
      // Nota: appRole ahora se calcula desde el email, no desde profile.role
      fetchingProfileRef.current = false;
    } catch (err) {
      // Error no crítico - usar valores por defecto
      console.error('Error obteniendo perfil:', err);
      setProfile(null);
      fetchingProfileRef.current = false;
    }
  };

  useEffect(() => {
    let isMounted = true;

    // Obtener sesión inicial
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!isMounted) return;
      setUser(session?.user ?? null);
      if (session?.user?.id) {
        await fetchProfile(session.user.id);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    // Suscribirse a cambios de autenticación
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;
      
      // Si no hay sesión (sesión expirada o usuario cerrado sesión), limpiar estado
      if (!session) {
        setUser(null);
        setProfile(null);
        currentUserIdRef.current = null;
        fetchingProfileRef.current = false;
        setLoading(false);
        return;
      }
      
      // Actualizar usuario inmediatamente
      setUser(session.user);
      setLoading(false);
      
      // Obtener perfil en background (no bloquear)
      if (session?.user?.id) {
        fetchProfile(session.user.id).catch(err => {
          console.error('Error obteniendo perfil en onAuthStateChange:', err);
        });
      } else {
        setProfile(null);
        currentUserIdRef.current = null;
        fetchingProfileRef.current = false;
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback(async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw error;
    }

    // Actualizar estado inmediatamente después del login exitoso
    // onAuthStateChange se disparará también, pero esto asegura respuesta rápida
    if (data?.user) {
      setUser(data.user);
      setLoading(false);
      // Obtener perfil en background (no bloquear)
      if (data.user.id) {
        // Llamar a fetchProfile directamente (está en el scope del componente)
        fetchProfile(data.user.id).catch(err => {
          console.error('Error obteniendo perfil después del login:', err);
        });
      }
    }

    return data;
  }, []); // fetchProfile está en el scope del componente, no necesita estar en deps

  const signOut = useCallback(async () => {
    try {
    const { error } = await supabase.auth.signOut();
      // Si el error es que no hay sesión (403, AuthSessionMissingError), es válido continuar
      // ya que el objetivo es cerrar sesión y si no hay sesión, ya estamos en el estado deseado
      if (error && error.message !== 'Auth session missing!' && error.message !== 'JWT expired') {
        // Solo lanzar error si no es un error de sesión faltante
        throw error;
      }
    } catch (error) {
      // Si es un error de sesión faltante, es válido continuar con la limpieza
      if (error?.message?.includes('Auth session missing') || error?.message?.includes('JWT expired')) {
        // Continuar con la limpieza aunque falló el signOut
      } else {
        // Otros errores pueden ser importantes, relanzarlos
      throw error;
      }
    }
    
    // Limpiar perfil al cerrar sesión (siempre, incluso si falló el signOut)
    setProfile(null);
    fetchingProfileRef.current = false;
    currentUserIdRef.current = null;
  }, []);

  // Usar useMemo para estabilizar el valor del contexto
  const value = useMemo(() => ({
    user,
    profile,
    appRole,
    loading,
    signIn,
    signOut,
  }), [user, profile, appRole, loading, signIn, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth debe usarse dentro de AuthProvider');
  }
  return context;
}

