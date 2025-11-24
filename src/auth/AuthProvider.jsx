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
  // ============================================================================
  // ESTADO UNIFICADO DE AUTENTICACIÓN
  // ============================================================================
  // Usamos un estado unificado para evitar condiciones de carrera y bucles
  const [authState, setAuthState] = useState({
    session: null,
    user: null,
    profile: null,
    loading: true,           // Solo true durante carga inicial
    initialProfileLoaded: false, // Flag para saber si ya cargamos el perfil inicial
    error: null,
  });
  
  // Refs para control de carga
  const fetchingProfileRef = useRef(false);
  const lastProfileUserIdRef = useRef(null); // Trackear último userId cargado
  const sessionCheckIntervalRef = useRef(null);
  const sessionNotFoundShownRef = useRef(false);
  
  // Extraer valores del estado para compatibilidad
  const user = authState.user;
  const session = authState.session;
  const profile = authState.profile;
  const loading = authState.loading;
  const authError = authState.error;
  
  // Calcular appRole basándose en el email del usuario
  const appRole = useMemo(() => {
    return calculateAppRoleFromEmail(user?.email);
  }, [user?.email]);

  // ============================================================================
  // FUNCIÓN PARA CARGAR PERFIL - OPTIMIZADA
  // ============================================================================
  // Solo carga el perfil una vez por usuario y evita recargas innecesarias
  const fetchProfile = useCallback(async (userId, isInitialLoad = false) => {
    if (!userId) {
      setAuthState(prev => ({ ...prev, profile: null }));
      lastProfileUserIdRef.current = null;
      fetchingProfileRef.current = false;
      return;
    }

    // Evitar múltiples llamadas simultáneas para el mismo usuario
    if (fetchingProfileRef.current && lastProfileUserIdRef.current === userId) {
      if (import.meta.env.DEV) {
        console.log('[AuthProvider] fetchProfile ya en progreso para userId:', userId);
      }
      return;
    }

    // Evitar llamadas si ya tenemos el perfil cargado para este usuario
    if (lastProfileUserIdRef.current === userId && authState.profile?.id === userId) {
      if (import.meta.env.DEV) {
        console.log('[AuthProvider] Perfil ya cargado para userId:', userId);
      }
      return;
    }

    fetchingProfileRef.current = true;
    lastProfileUserIdRef.current = userId;

    if (import.meta.env.DEV) {
      console.log(`[AuthProvider] ${isInitialLoad ? 'Carga inicial' : 'Refetch'} de perfil para userId:`, userId);
    }

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
          setAuthState(prev => ({
            ...prev,
            profile: null,
            loading: isInitialLoad ? false : prev.loading,
          }));
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
          if (import.meta.env.DEV) {
            console.warn('[AuthProvider] Error al cargar perfil:', {
              userId,
              error: error.message,
              code: error.code,
            });
          }
        }
        setAuthState(prev => ({
          ...prev,
          profile: null,
          loading: isInitialLoad ? false : prev.loading,
        }));
        fetchingProfileRef.current = false;
        return;
      }

      // Si hay data, establecer perfil
      if (!data) {
        // Respuesta 200 pero sin datos
        if (import.meta.env.DEV) {
        console.warn('[AuthProvider] No se encontró perfil en la tabla profiles (respuesta vacía):', {
          userId,
        });
        }
        setAuthState(prev => ({
          ...prev,
          profile: null,
          loading: isInitialLoad ? false : prev.loading,
        }));
        fetchingProfileRef.current = false;
        return;
      }

      // Actualizar estado con el perfil cargado
      setAuthState(prev => ({
        ...prev,
        profile: data,
        initialProfileLoaded: isInitialLoad ? true : prev.initialProfileLoaded,
        loading: isInitialLoad ? false : prev.loading, // Solo cambiar loading en carga inicial
      }));
      
      if (import.meta.env.DEV) {
        console.log('[AuthProvider] Perfil cargado exitosamente para userId:', userId);
      }
      
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
      setAuthState(prev => ({
        ...prev,
        profile: null,
        loading: isInitialLoad ? false : prev.loading,
      }));
      fetchingProfileRef.current = false;
    }
  }, []); // Sin dependencias - función estable que no cambia

  // ============================================================================
  // FLUJO DE CARGA DE PERFIL OPTIMIZADO
  // ============================================================================
  // 1. Se ejecuta UNA VEZ al montar el componente (sin dependencias que cambien)
  // 2. Obtiene la sesión inicial
  // 3. Si hay sesión y usuario, carga el perfil UNA VEZ
  // 4. Se suscribe a cambios de autenticación
  // 5. Solo recarga el perfil si cambia el ID del usuario (nuevo login)
  // ============================================================================
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
          setAuthState({
            session: null,
            user: null,
            profile: null,
            loading: false,
            initialProfileLoaded: false,
            error,
          });
          lastProfileUserIdRef.current = null;
          fetchingProfileRef.current = false;
          
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
      
      // Actualizar estado con sesión inicial
      setAuthState(prev => ({
        ...prev,
        session,
        user: session?.user ?? null,
        error: null,
      }));
      sessionNotFoundShownRef.current = false;
      
      // Solo cargar perfil si hay sesión y usuario, y no está ya cargado
      if (session?.user?.id) {
        // Cargar perfil inicial (loading será true hasta que termine)
        await fetchProfile(session.user.id, true);
      } else {
        // No hay sesión - marcar como cargado sin perfil
        setAuthState(prev => ({
          ...prev,
          profile: null,
          loading: false,
          initialProfileLoaded: true,
        }));
      }
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
          setAuthState({
            session: null,
            user: null,
            profile: null,
            loading: false,
            initialProfileLoaded: false,
            error: null,
          });
          lastProfileUserIdRef.current = null;
          fetchingProfileRef.current = false;
          sessionNotFoundShownRef.current = false;
          return;
        } else if (event === 'TOKEN_REFRESHED') {
          // Token refrescado - verificar que la sesión sigue válida
          // NO recargar el perfil a menos que cambie el usuario
          if (session?.user) {
            setAuthState(prev => ({
              ...prev,
              session,
              user: session.user,
              error: null,
            }));
            sessionNotFoundShownRef.current = false;
            // Solo recargar perfil si el usuario cambió (muy raro en TOKEN_REFRESHED)
            if (session.user.id && lastProfileUserIdRef.current !== session.user.id) {
              if (import.meta.env.DEV) {
                console.log('[AuthProvider] TOKEN_REFRESHED: usuario cambió, recargando perfil');
              }
              fetchProfile(session.user.id, false).catch(err => {
                if (import.meta.env.DEV) {
                  console.error('[AuthProvider] Error obteniendo perfil después de refresh:', err);
                }
              });
            }
          } else {
            // Token refrescado pero no hay sesión válida - limpiar
            setAuthState({
              session: null,
              user: null,
              profile: null,
              loading: false,
              initialProfileLoaded: false,
              error: null,
            });
            lastProfileUserIdRef.current = null;
            fetchingProfileRef.current = false;
            sessionNotFoundShownRef.current = false;
          }
          return;
        }
      }
      
      // Si no hay sesión (sesión expirada o usuario cerrado sesión), limpiar estado
      if (!session) {
        setAuthState({
          session: null,
          user: null,
          profile: null,
          loading: false,
          initialProfileLoaded: false,
          error: null,
        });
        lastProfileUserIdRef.current = null;
        fetchingProfileRef.current = false;
        sessionNotFoundShownRef.current = false;
        return;
      }
      
      // Actualizar usuario inmediatamente
      const userIdChanged = !authState.user || authState.user.id !== session.user.id;
      
      setAuthState(prev => ({
        ...prev,
        session,
        user: session.user,
        error: null,
        // Solo poner loading en true si es un usuario nuevo y aún no tenemos perfil
        loading: userIdChanged && !prev.initialProfileLoaded ? true : prev.loading,
      }));
      sessionNotFoundShownRef.current = false;
      
      // Obtener perfil solo si el usuario cambió (nuevo login)
      if (session?.user?.id && userIdChanged) {
        if (import.meta.env.DEV) {
          console.log('[AuthProvider] onAuthStateChange: usuario cambió, cargando perfil:', session.user.id);
        }
        fetchProfile(session.user.id, !authState.initialProfileLoaded).catch(err => {
          if (import.meta.env.DEV) {
            console.error('[AuthProvider] Error obteniendo perfil en onAuthStateChange:', err);
          }
        });
      } else if (session?.user?.id && !userIdChanged) {
        // Mismo usuario, no recargar perfil
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
        setAuthState({
          session: null,
          user: null,
          profile: null,
          loading: false,
          initialProfileLoaded: false,
          error,
        });
        lastProfileUserIdRef.current = null;
        fetchingProfileRef.current = false;
        sessionNotFoundShownRef.current = false;
        
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

    // Verificación periódica de sesión (cada 30 minutos) - REDUCIDO para evitar spam
    // IMPORTANTE: Solo verifica la sesión, NO recarga el perfil a menos que cambie el usuario
    sessionCheckIntervalRef.current = setInterval(async () => {
      if (!isMounted) return;
      
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error && isAuthError(error)) {
          const isSessionNotFound = error.message?.includes('session_not_found') || 
                                    error.status === 403 ||
                                    error.code === 'session_not_found';
          
          // Sesión expirada - limpiar estado
          setAuthState({
            session: null,
            user: null,
            profile: null,
            loading: false,
            initialProfileLoaded: false,
            error,
          });
          lastProfileUserIdRef.current = null;
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
          return;
        }
        
        // Actualizar estado solo si cambió algo
        setAuthState(prev => {
        // Si no hay sesión pero tenemos usuario en estado, limpiar
          if (!session && prev.user) {
            return {
              session: null,
              user: null,
              profile: null,
              loading: false,
              initialProfileLoaded: false,
              error: null,
            };
          }
          
          // Si hay sesión pero el usuario cambió, actualizar (muy raro)
          if (session?.user && (!prev.user || prev.user.id !== session.user.id)) {
            return {
              ...prev,
              session,
              user: session.user,
              error: null,
            };
          }
          
          // Solo actualizar error si cambió
          if (prev.error !== null) {
            return { ...prev, error: null };
          }
          
          return prev; // No hay cambios
        });
        
        // Solo recargar perfil si cambió el usuario (muy raro en verificación periódica)
        if (session?.user?.id && lastProfileUserIdRef.current !== session.user.id) {
          if (import.meta.env.DEV) {
            console.log('[AuthProvider] Verificación periódica: usuario cambió, recargando perfil');
          }
          fetchProfile(session.user.id, false).catch(err => {
            if (import.meta.env.DEV) {
                console.error('[AuthProvider] Error obteniendo perfil en verificación periódica:', err);
              }
            });
        }
      } catch (err) {
        // Error al verificar sesión - no hacer nada para no interrumpir la experiencia
        if (import.meta.env.DEV) {
          console.warn('[AuthProvider] Error en verificación periódica de sesión:', err);
        }
      }
    }, 30 * 60 * 1000); // 30 minutos (reducido de 5 minutos para evitar llamadas innecesarias)

    return () => {
      isMounted = false;
      subscription.unsubscribe();
      window.removeEventListener('auth-error', handleAuthErrorEvent);
      if (sessionCheckIntervalRef.current) {
        clearInterval(sessionCheckIntervalRef.current);
        sessionCheckIntervalRef.current = null;
      }
    };
    // IMPORTANTE: Sin dependencias que cambien frecuentemente
    // Solo se ejecuta al montar/desmontar el componente
    // fetchProfile está memoizado y se accede a través del ref cuando es necesario
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Dependencias vacías: solo se ejecuta una vez

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
      setAuthState(prev => ({
        ...prev,
        user: data.user,
        // Mantener loading hasta que se cargue el perfil inicial
        loading: !prev.initialProfileLoaded,
      }));
      
      // Obtener perfil en background (no bloquear)
      if (data.user.id) {
        fetchProfile(data.user.id, !authState.initialProfileLoaded).catch(err => {
          if (import.meta.env.DEV) {
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
    setAuthState({
      session: null,
      user: null,
      profile: null,
      loading: false,
      initialProfileLoaded: false,
      error: null,
    });
    fetchingProfileRef.current = false;
    lastProfileUserIdRef.current = null;
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
        setAuthState({
          session: null,
          user: null,
          profile: null,
          loading: false,
          initialProfileLoaded: false,
          error,
        });
        lastProfileUserIdRef.current = null;
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
        
        return false;
      }
      
      // Hay sesión válida - actualizar estado si es necesario
      if (!session) {
        // No hay sesión - limpiar si tenemos usuario en estado
        if (authState.user) {
          setAuthState({
            session: null,
            user: null,
            profile: null,
            loading: false,
            initialProfileLoaded: false,
            error: null,
          });
          lastProfileUserIdRef.current = null;
          fetchingProfileRef.current = false;
          sessionNotFoundShownRef.current = false;
        }
        return false;
      }
      
      // Hay sesión válida - actualizar estado solo si cambió el usuario
      const userIdChanged = !authState.user || authState.user.id !== session.user.id;
      if (userIdChanged) {
        setAuthState(prev => ({
          ...prev,
          session,
          user: session.user,
          error: null,
        }));
        sessionNotFoundShownRef.current = false;
        if (session.user.id) {
          await fetchProfile(session.user.id, !authState.initialProfileLoaded);
        }
      }
      
      return true;
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('[AuthProvider] Error al verificar sesión:', err);
      }
      return false;
    }
  }, []); // Sin dependencias - función estable

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
  // Extraer valores del estado unificado
  const value = useMemo(() => ({
    user: authState.user,
    session: authState.session,
    profile: authState.profile,
    appRole,
    loading: authState.loading,
    authError: authState.error,
    signIn,
    signOut,
    checkSession,
    handleAuthError,
    resetPassword,
  }), [authState.user, authState.session, authState.profile, authState.loading, authState.error, appRole, signIn, signOut, checkSession, handleAuthError, resetPassword]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  
  if (!context) {
    // En desarrollo, durante HMR, intenta no crashear toda la app
    if (import.meta.env.DEV && import.meta.hot) {
      if (import.meta.env.DEV) {
        console.warn('[AuthProvider] useAuth llamado sin provider durante HMR - devolviendo objeto temporal');
      }
      // Devuelve un objeto mínimo para que nada explote durante HMR
      return {
        session: null,
        user: null,
        profile: null,
        appRole: 'ESTU',
        loading: true,
        authError: null,
        signIn: async () => ({ user: null, session: null }),
        signOut: async () => {},
        checkSession: async () => false,
        handleAuthError: async () => {},
        resetPassword: async () => true,
      };
    }
    
    // En producción, sí quiero que esto sea un error duro
    throw new Error('useAuth debe usarse dentro de AuthProvider');
  }
  
  return context;
}

