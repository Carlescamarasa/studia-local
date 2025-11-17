import React, { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabaseClient';

const AuthContext = createContext(undefined);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [appRole, setAppRole] = useState('ESTU');
  const [loading, setLoading] = useState(true);
  const fetchingProfileRef = useRef(false);
  const currentUserIdRef = useRef(null);

  // Función para obtener el perfil desde Supabase
  const fetchProfile = async (userId) => {
    if (!userId) {
      setProfile(null);
      setAppRole('ESTU');
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
        // No lanzar error - simplemente usar ESTU como fallback
        if (error.message.includes('infinite recursion')) {
          console.error('Error de políticas RLS en Supabase. Revisa las políticas de la tabla profiles.');
        } else {
          console.warn('No se encontró perfil para el usuario:', error.message);
        }
        setProfile(null);
        setAppRole('ESTU');
        fetchingProfileRef.current = false;
        return;
      }

      setProfile(data);
      // appRole = profile.role si existe, sino 'ESTU' por defecto
      setAppRole(data?.role || 'ESTU');
      fetchingProfileRef.current = false;
    } catch (err) {
      // Error no crítico - usar valores por defecto
      console.error('Error obteniendo perfil:', err);
      setProfile(null);
      setAppRole('ESTU');
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
        setAppRole('ESTU');
      }
      setLoading(false);
    });

    // Suscribirse a cambios de autenticación
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;
      
      // Actualizar usuario inmediatamente
      setUser(session?.user ?? null);
      setLoading(false);
      
      // Obtener perfil en background (no bloquear)
      if (session?.user?.id) {
        fetchProfile(session.user.id).catch(err => {
          console.error('Error obteniendo perfil en onAuthStateChange:', err);
        });
      } else {
        setProfile(null);
        setAppRole('ESTU');
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
    const { error } = await supabase.auth.signOut();
    if (error) {
      throw error;
    }
    // Limpiar perfil al cerrar sesión
    setProfile(null);
    setAppRole('ESTU');
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

