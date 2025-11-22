import React, { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { isAuthError } from '@/lib/authHelpers';
import { toast } from 'sonner';

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
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);
  const fetchingProfileRef = useRef(false);
  const currentUserIdRef = useRef(null);
  const sessionCheckIntervalRef = useRef(null);
  const recursionErrorRef = useRef(false);
  const sessionNotFoundShownRef = useRef(false); // Evitar mostrar múltiples toasts
  
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
      // Petición específica a la tabla profiles
      const profileQuery = supabase
        .from('profiles')
        .select('id, full_name, role, profesor_asignado_id, is_active, created_at, updated_at')
        .eq('id', userId)
        .single();

      const { data, error } = await profileQuery;

      if (error) {
        // Separar errores de red de "no hay perfil"
        // Solo considerar NetworkError si viene de esta petición específica a profiles
        const isNetworkError = error.message?.includes('NetworkError') || 
                               (error.message?.includes('fetch') && !error.code) ||
                               error.name === 'TypeError';
        
        if (isNetworkError) {
          // Error de red en la petición a profiles: registrar específicamente
          if (import.meta.env.DEV) {
            console.warn('[AuthProvider] Error de red al cargar perfil desde /profiles:', {
              userId,
              error: error.message,
              code: error.code,
              endpoint: 'profiles',
            });
          }
          setProfile(null);
          fetchingProfileRef.current = false;
          return;
        }

        // Si no hay perfil o hay error de RLS, usar valores por defecto
        if (error.message.includes('infinite recursion')) {
          console.error('[AuthProvider] Error de políticas RLS en Supabase:', {
            error: error.message,
            code: error.code,
            userId,
          });
        } else if (error.code === 'PGRST116') {
          // No hay fila: realmente no existe perfil
          console.warn('[AuthProvider] No se encontró perfil en la tabla profiles:', {
            userId,
          });
        } else {
          // Otro tipo de error
          if (process.env.NODE_ENV === 'development') {
            console.warn('[AuthProvider] Error al cargar perfil:', {
              userId,
              error: error.message,
              code: error.code,
            });
          }
        }
        setProfile(null);
        fetchingProfileRef.current = false;
        return;
      }

      // Si hay data, establecer perfil
      if (!data) {
        // Respuesta 200 pero sin datos
        console.warn('[AuthProvider] No se encontró perfil en la tabla profiles (respuesta vacía):', {
          userId,
        });
        setProfile(null);
        fetchingProfileRef.current = false;
        return;
      }

      setProfile(data);
      // Nota: appRole ahora se calcula desde el email, no desde profile.role
      fetchingProfileRef.current = false;
    } catch (err) {
      // Error de red o excepción no controlada en la petición a profiles
      // Detectar errores de red de varias formas, pero SOLO si vienen de esta petición
      const errorMessage = err?.message || err?.toString() || '';
      const errorName = err?.name || '';
      
      // Verificar que el error realmente viene de la petición a profiles
      // Los errores de otras peticiones no deberían llegar aquí si se manejan bien
      const isNetworkError = 
        (errorMessage.includes('NetworkError') || 
         errorMessage.includes('Failed to fetch') ||
         (errorName === 'TypeError' && errorMessage.includes('fetch'))) &&
        // Asegurar que no es un error de otra petición (por ejemplo, Edge Functions)
        !errorMessage.includes('/functions/v1/');
      
      if (isNetworkError) {
        // Error de red específico de la petición a profiles
        // Registrar como warning en lugar de error para no saturar la consola
        // Solo en desarrollo mostramos el error completo
        if (import.meta.env.DEV) {
          console.warn('[AuthProvider] Error de red al cargar perfil desde /profiles (se reintentará automáticamente):', {
            userId,
            error: errorMessage || errorName,
            endpoint: 'profiles',
          });
        }
        // No tratar como "no hay perfil"; el problema es de red
        // Mantener profile como null pero permitir reintentos
      } else {
        // Otro tipo de error o error que no es de network
        console.error('[AuthProvider] Error obteniendo perfil desde /profiles:', {
          error: errorMessage || err,
          code: err?.code,
          userId,
          endpoint: 'profiles',
          // Si el error menciona otro endpoint, indicarlo
          suspectedEndpoint: errorMessage.includes('/functions/') ? 'edge-function' : 'profiles',
        });
      }
      setProfile(null);
      fetchingProfileRef.current = false;
    }
  };

  useEffect(() => {
    let isMounted = true;

    // Obtener sesión inicial
    supabase.auth.getSession().then(async ({ data: { session }, error }) => {
      if (!isMounted) return;
      
      // Manejar errores de sesión explícitamente
      if (error) {
        const isSessionNotFound = error.message?.includes('session_not_found') || 
                                  error.status === 403 ||
                                  error.code === 'session_not_found';
        
        if (isSessionNotFound && !sessionNotFoundShownRef.current) {
          sessionNotFoundShownRef.current = true;
          toast.error('Sesión expirada. Por favor, vuelve a iniciar sesión.', {
            duration: 5000,
          });
          
          // Limpiar estado
          setUser(null);
          setSession(null);
          setProfile(null);
          setAuthError(error);
          currentUserIdRef.current = null;
          fetchingProfileRef.current = false;
          setLoading(false);
          
          // Limpiar tokens locales
          try {
            await supabase.auth.signOut();
          } catch (signOutError) {
            // Ignorar errores al cerrar sesión
          }
          
          // Redirigir a login después de 2 segundos
          setTimeout(() => {
            if (window.location.pathname !== '/auth/login' && window.location.pathname !== '/login') {
              window.location.href = '/auth/login';
            }
          }, 2000);
          
          return;
        }
      }
      
      setSession(session);
      setUser(session?.user ?? null);
      setAuthError(null);
      sessionNotFoundShownRef.current = false;
      
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
          setSession(null);
          setProfile(null);
          setAuthError(null);
          currentUserIdRef.current = null;
          fetchingProfileRef.current = false;
          recursionErrorRef.current = false; // Resetear flag al cerrar sesión
          sessionNotFoundShownRef.current = false;
          setLoading(false);
          return;
        } else if (event === 'TOKEN_REFRESHED') {
          // Token refrescado - verificar que la sesión sigue válida
          if (session?.user) {
            setSession(session);
            setUser(session.user);
            setAuthError(null);
            sessionNotFoundShownRef.current = false;
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
            setSession(null);
            setProfile(null);
            setAuthError(null);
            currentUserIdRef.current = null;
            fetchingProfileRef.current = false;
            sessionNotFoundShownRef.current = false;
            setLoading(false);
          }
          return;
        }
      }
      
      // Si no hay sesión (sesión expirada o usuario cerrado sesión), limpiar estado
      if (!session) {
        setUser(null);
        setSession(null);
        setProfile(null);
        setAuthError(null);
        currentUserIdRef.current = null;
        fetchingProfileRef.current = false;
        recursionErrorRef.current = false; // Resetear flag al cerrar sesión
        sessionNotFoundShownRef.current = false;
        setLoading(false);
        return;
      }
      
      // Actualizar usuario inmediatamente
      setSession(session);
      setUser(session.user);
      setAuthError(null);
      sessionNotFoundShownRef.current = false;
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
        const isSessionNotFound = error.message?.includes('session_not_found') || 
                                  error.status === 403 ||
                                  error.code === 'session_not_found';
        
        // Forzar cierre de sesión cuando se detecta error de autenticación
        setUser(null);
        setSession(null);
        setProfile(null);
        setAuthError(error);
        currentUserIdRef.current = null;
        fetchingProfileRef.current = false;
        recursionErrorRef.current = false;
        sessionNotFoundShownRef.current = false;
        setLoading(false);
        
        // Mostrar mensaje solo si no se ha mostrado recientemente
        if (isSessionNotFound && !sessionNotFoundShownRef.current) {
          sessionNotFoundShownRef.current = true;
          toast.error('Sesión expirada. Por favor, vuelve a iniciar sesión.', {
            duration: 5000,
          });
          
          // Redirigir a login después de 2 segundos
          setTimeout(() => {
            if (window.location.pathname !== '/auth/login' && window.location.pathname !== '/login') {
              window.location.href = '/auth/login';
            }
          }, 2000);
        }
        
        try {
          await supabase.auth.signOut();
        } catch (signOutError) {
          // Ignorar errores al cerrar sesión
        }
      }
    };

    window.addEventListener('auth-error', handleAuthErrorEvent);

    // Verificación periódica de sesión (cada 5 minutos) - SOLO si no hay error de recursión
    sessionCheckIntervalRef.current = setInterval(async () => {
      if (!isMounted) return;
      
      // No verificar si hay un error de recursión activo
      if (recursionErrorRef.current) {
        return;
      }
      
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error && isAuthError(error)) {
          const isSessionNotFound = error.message?.includes('session_not_found') || 
                                    error.status === 403 ||
                                    error.code === 'session_not_found';
          
          // Sesión expirada - limpiar estado
          setUser(null);
          setSession(null);
          setProfile(null);
          setAuthError(error);
          currentUserIdRef.current = null;
          fetchingProfileRef.current = false;
          recursionErrorRef.current = false;
          
          // Mostrar mensaje solo si no se ha mostrado recientemente
          if (isSessionNotFound && !sessionNotFoundShownRef.current) {
            sessionNotFoundShownRef.current = true;
            toast.error('Sesión expirada. Por favor, vuelve a iniciar sesión.', {
              duration: 5000,
            });
            
            // Limpiar tokens locales
            try {
              await supabase.auth.signOut();
            } catch (signOutError) {
              // Ignorar errores al cerrar sesión
            }
            
            // Redirigir a login después de 2 segundos
            setTimeout(() => {
              if (window.location.pathname !== '/auth/login' && window.location.pathname !== '/login') {
                window.location.href = '/auth/login';
              }
            }, 2000);
          }
          
          setLoading(false);
          return;
        }
        
        setAuthError(null);
        setSession(session);
        
        // Si no hay sesión pero tenemos usuario en estado, limpiar
        if (!session && user) {
          setUser(null);
          setSession(null);
          setProfile(null);
          currentUserIdRef.current = null;
          fetchingProfileRef.current = false;
          recursionErrorRef.current = false;
          sessionNotFoundShownRef.current = false;
          setLoading(false);
        } else if (session?.user && (!user || user.id !== session.user.id)) {
          // Si hay sesión pero el usuario cambió, actualizar
          setSession(session);
          setUser(session.user);
          setAuthError(null);
          sessionNotFoundShownRef.current = false;
          if (session.user.id && !recursionErrorRef.current) {
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
    setSession(null);
    setProfile(null);
    setAuthError(null);
    fetchingProfileRef.current = false;
    currentUserIdRef.current = null;
    sessionNotFoundShownRef.current = false;
  }, []);

  // Función para verificar manualmente la sesión
  const checkSession = useCallback(async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error && isAuthError(error)) {
        const isSessionNotFound = error.message?.includes('session_not_found') || 
                                  error.status === 403 ||
                                  error.code === 'session_not_found';
        
        // Sesión expirada - limpiar estado
        setUser(null);
        setSession(null);
        setProfile(null);
        setAuthError(error);
        currentUserIdRef.current = null;
        fetchingProfileRef.current = false;
        
        // Mostrar mensaje solo si no se ha mostrado recientemente
        if (isSessionNotFound && !sessionNotFoundShownRef.current) {
          sessionNotFoundShownRef.current = true;
          toast.error('Sesión expirada. Por favor, vuelve a iniciar sesión.', {
            duration: 5000,
          });
          
          // Limpiar tokens locales
          try {
            await supabase.auth.signOut();
          } catch (signOutError) {
            // Ignorar errores al cerrar sesión
          }
          
          // Redirigir a login después de 2 segundos
          setTimeout(() => {
            if (window.location.pathname !== '/auth/login' && window.location.pathname !== '/login') {
              window.location.href = '/auth/login';
            }
          }, 2000);
        }
        
        setLoading(false);
        return false;
      }
      
      setAuthError(null);
      setSession(session);
      
      if (!session) {
        // No hay sesión - limpiar si tenemos usuario en estado
        if (user) {
          setUser(null);
          setSession(null);
          setProfile(null);
          currentUserIdRef.current = null;
          fetchingProfileRef.current = false;
          sessionNotFoundShownRef.current = false;
          setLoading(false);
        }
        return false;
      }
      
      // Hay sesión válida - actualizar estado si es necesario
      if (!user || user.id !== session.user.id) {
        setSession(session);
        setUser(session.user);
        setAuthError(null);
        sessionNotFoundShownRef.current = false;
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

  // Función para recuperar contraseña
  const resetPassword = useCallback(async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      throw error;
    }

    return true;
  }, []);

  // Usar useMemo para estabilizar el valor del contexto
  const value = useMemo(() => ({
    user,
    session,
    profile,
    appRole,
    loading,
    authError,
    signIn,
    signOut,
    checkSession,
    handleAuthError,
    resetPassword,
  }), [user, session, profile, appRole, loading, authError, signIn, signOut, checkSession, handleAuthError, resetPassword]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth debe usarse dentro de AuthProvider');
  }
  return context;
}

