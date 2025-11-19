import React, { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { isAuthError } from '@/lib/authHelpers';

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
  const sessionCheckIntervalRef = useRef(null);
  
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
          console.error('[AuthProvider] Error de políticas RLS en Supabase:', {
            error: error.message,
            code: error.code,
            userId,
          });
        } else {
          if (process.env.NODE_ENV === 'development') {
            console.warn('[AuthProvider] No se encontró perfil para el usuario:', {
              userId,
              error: error.message,
            });
          }
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
      console.error('[AuthProvider] Error obteniendo perfil:', {
        error: err?.message || err,
        code: err?.code,
        userId,
      });
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
      
      // Manejar eventos específicos de expiración
      if (event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
        if (event === 'SIGNED_OUT') {
          // Sesión cerrada explícitamente o expirada
          setUser(null);
          setProfile(null);
          currentUserIdRef.current = null;
          fetchingProfileRef.current = false;
          setLoading(false);
          return;
        } else if (event === 'TOKEN_REFRESHED') {
          // Token refrescado - verificar que la sesión sigue válida
          if (session?.user) {
            setUser(session.user);
            setLoading(false);
            if (session.user.id) {
              fetchProfile(session.user.id).catch(err => {
                if (process.env.NODE_ENV === 'development') {
                  console.error('[AuthProvider] Error obteniendo perfil después de refresh:', err);
                }
              });
            }
          } else {
            // Token refrescado pero no hay sesión válida - limpiar
            setUser(null);
            setProfile(null);
            currentUserIdRef.current = null;
            fetchingProfileRef.current = false;
            setLoading(false);
          }
          return;
        }
      }
      
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
          if (process.env.NODE_ENV === 'development') {
            console.error('[AuthProvider] Error obteniendo perfil en onAuthStateChange:', err);
          }
        });
      } else {
        setProfile(null);
        currentUserIdRef.current = null;
        fetchingProfileRef.current = false;
      }
    });

    // Escuchar eventos de error de autenticación desde remoteDataAPI
    const handleAuthErrorEvent = async (event) => {
      if (!isMounted) return;
      const error = event.detail?.error;
      if (error && isAuthError(error)) {
        // Forzar cierre de sesión cuando se detecta error de autenticación
        setUser(null);
        setProfile(null);
        currentUserIdRef.current = null;
        fetchingProfileRef.current = false;
        setLoading(false);
        try {
          await supabase.auth.signOut();
        } catch (signOutError) {
          // Ignorar errores al cerrar sesión
        }
      }
    };

    window.addEventListener('auth-error', handleAuthErrorEvent);

    // Verificación periódica de sesión (cada 5 minutos)
    sessionCheckIntervalRef.current = setInterval(async () => {
      if (!isMounted) return;
      
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error && isAuthError(error)) {
          // Sesión expirada - limpiar estado
          setUser(null);
          setProfile(null);
          currentUserIdRef.current = null;
          fetchingProfileRef.current = false;
          setLoading(false);
          return;
        }
        
        // Si no hay sesión pero tenemos usuario en estado, limpiar
        if (!session && user) {
          setUser(null);
          setProfile(null);
          currentUserIdRef.current = null;
          fetchingProfileRef.current = false;
          setLoading(false);
        } else if (session?.user && (!user || user.id !== session.user.id)) {
          // Si hay sesión pero el usuario cambió, actualizar
          setUser(session.user);
          if (session.user.id) {
            fetchProfile(session.user.id).catch(err => {
              if (process.env.NODE_ENV === 'development') {
                console.error('[AuthProvider] Error obteniendo perfil en verificación periódica:', err);
              }
            });
          }
        }
      } catch (err) {
        // Error al verificar sesión - no hacer nada para no interrumpir la experiencia
        if (process.env.NODE_ENV === 'development') {
          console.warn('[AuthProvider] Error en verificación periódica de sesión:', err);
        }
      }
    }, 5 * 60 * 1000); // 5 minutos

    return () => {
      isMounted = false;
      subscription.unsubscribe();
      window.removeEventListener('auth-error', handleAuthErrorEvent);
      if (sessionCheckIntervalRef.current) {
        clearInterval(sessionCheckIntervalRef.current);
        sessionCheckIntervalRef.current = null;
      }
    };
  }, [user]);

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
          if (process.env.NODE_ENV === 'development') {
            console.error('[AuthProvider] Error obteniendo perfil después del login:', err);
          }
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
    setUser(null);
    setProfile(null);
    fetchingProfileRef.current = false;
    currentUserIdRef.current = null;
  }, []);

  // Función para verificar manualmente la sesión
  const checkSession = useCallback(async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error && isAuthError(error)) {
        // Sesión expirada - limpiar estado
        setUser(null);
        setProfile(null);
        currentUserIdRef.current = null;
        fetchingProfileRef.current = false;
        setLoading(false);
        return false;
      }
      
      if (!session) {
        // No hay sesión - limpiar si tenemos usuario en estado
        if (user) {
          setUser(null);
          setProfile(null);
          currentUserIdRef.current = null;
          fetchingProfileRef.current = false;
          setLoading(false);
        }
        return false;
      }
      
      // Hay sesión válida - actualizar estado si es necesario
      if (!user || user.id !== session.user.id) {
        setUser(session.user);
        if (session.user.id) {
          await fetchProfile(session.user.id);
        }
      }
      
      return true;
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('[AuthProvider] Error al verificar sesión:', err);
      }
      return false;
    }
  }, [user, fetchProfile]);

  // Función para manejar errores de autenticación
  const handleAuthError = useCallback(async (error) => {
    if (!isAuthError(error)) {
      return;
    }
    
    // Forzar cierre de sesión
    await signOut();
  }, [signOut]);

  // Usar useMemo para estabilizar el valor del contexto
  const value = useMemo(() => ({
    user,
    profile,
    appRole,
    loading,
    signIn,
    signOut,
    checkSession,
    handleAuthError,
  }), [user, profile, appRole, loading, signIn, signOut, checkSession, handleAuthError]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth debe usarse dentro de AuthProvider');
  }
  return context;
}

