import React, { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { isAuthError } from '@/lib/authHelpers';
import { toast } from 'sonner';
import { AuthState, AuthContextValue } from '@/features/auth/types';
import { UserRole, StudiaUser } from '@/features/shared/types/domain';
import { Session } from '@supabase/supabase-js';

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/**
 * Calcula el rol de la aplicación basándose en el email del usuario
 * @param {string | undefined} email - Email del usuario
 * @returns {UserRole} - Rol: 'ADMIN', 'PROF' o 'ESTU'
 */
function calculateAppRoleFromEmail(email?: string): UserRole {
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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // ============================================================================
  // ESTADO UNIFICADO DE AUTENTICACIÓN
  // ============================================================================
  const [authState, setAuthState] = useState<AuthState>({
    session: null,
    user: null,
    profile: null,
    loading: true,
    initialProfileLoaded: false,
    error: null,
  });

  // Refs para control de carga
  const fetchingProfileRef = useRef(false);
  const lastProfileUserIdRef = useRef<string | null>(null);
  const sessionCheckIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sessionNotFoundShownRef = useRef(false);

  // Extraer valores del estado para compatibilidad
  const user = authState.user;
  const session = authState.session;
  const profile = authState.profile;
  const loading = authState.loading;
  const authError = authState.error;

  const appRole = useMemo(() => {
    return calculateAppRoleFromEmail(user?.email);
  }, [user?.email]);

  // ============================================================================
  // FUNCIÓN PARA CARGAR PERFIL - OPTIMIZADA
  // ============================================================================
  const fetchProfile = useCallback(async (userId: string | null, isInitialLoad = false) => {
    if (!userId) {
      setAuthState(prev => ({ ...prev, profile: null }));
      lastProfileUserIdRef.current = null;
      fetchingProfileRef.current = false;
      return;
    }

    if (fetchingProfileRef.current && lastProfileUserIdRef.current === userId) {
      return;
    }

    if (lastProfileUserIdRef.current === userId && authState.profile?.id === userId) {
      return;
    }

    fetchingProfileRef.current = true;
    lastProfileUserIdRef.current = userId;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, role, profesor_asignado_id, is_active, created_at, updated_at')
        .eq('id', userId)
        .single();

      if (error) {
        setAuthState(prev => ({
          ...prev,
          profile: null,
          loading: isInitialLoad ? false : prev.loading,
        }));
        fetchingProfileRef.current = false;
        return;
      }

      setAuthState(prev => ({
        ...prev,
        profile: data as StudiaUser,
        initialProfileLoaded: isInitialLoad ? true : prev.initialProfileLoaded,
        loading: isInitialLoad ? false : prev.loading,
      }));

      fetchingProfileRef.current = false;
    } catch (err) {
      setAuthState(prev => ({
        ...prev,
        profile: null,
        loading: isInitialLoad ? false : prev.loading,
      }));
      fetchingProfileRef.current = false;
    }
  }, [authState.profile?.id]);

  const signOut = useCallback(async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      // Ignore signout errors if session is already missing
    }

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

  const handleAuthErrorEvent = useCallback(async (event: any) => {
    const error = event.detail?.error;
    if (error && isAuthError(error)) {
      const isSessionNotFound = error.message?.includes('session_not_found') ||
        error.status === 403 ||
        error.code === 'session_not_found';

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

      if (isSessionNotFound && !sessionNotFoundShownRef.current) {
        sessionNotFoundShownRef.current = true;
        toast.error('Sesión expirada. Por favor, vuelve a iniciar sesión.');

        setTimeout(() => {
          if (!window.location.pathname.includes('/auth/login')) {
            window.location.href = '/auth/login';
          }
        }, 2000);
      }

      try {
        await supabase.auth.signOut();
      } catch (signOutError) { }
    }
  }, []);

  useEffect(() => {
    window.addEventListener('auth-error', handleAuthErrorEvent);
    return () => window.removeEventListener('auth-error', handleAuthErrorEvent);
  }, [handleAuthErrorEvent]);

  useEffect(() => {
    let isMounted = true;
    const SESSION_TIMEOUT_MS = 10000;

    const getSessionWithTimeout = (): Promise<{ data: { session: Session | null }; error: any }> => {
      const sessionPromise = supabase.auth.getSession();
      const timeoutPromise = new Promise<{ data: { session: Session | null }; error: any }>((_, reject) =>
        setTimeout(() => reject(new Error('Session fetch timeout')), SESSION_TIMEOUT_MS)
      );
      return Promise.race([sessionPromise as any, timeoutPromise]);
    };

    getSessionWithTimeout()
      .then(async ({ data: { session }, error }) => {
        if (!isMounted) return;

        if (error) {
          // Handle initial session fetch error
        }

        setAuthState(prev => ({
          ...prev,
          session,
          user: session?.user ?? null,
          error: null,
        }));

        if (session?.user?.id) {
          await fetchProfile(session.user.id, true);
        } else {
          setAuthState(prev => ({
            ...prev,
            profile: null,
            loading: false,
            initialProfileLoaded: true,
          }));
        }
      })
      .catch(() => {
        if (!isMounted) return;
        setAuthState(prev => ({ ...prev, loading: false, initialProfileLoaded: true }));
      });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;

      if (event === 'SIGNED_OUT') {
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
        return;
      }

      const userIdChanged = !user || user.id !== session?.user.id;

      if (session) {
        setAuthState(prev => ({
          ...prev,
          session,
          user: session.user,
          error: null,
          loading: userIdChanged ? true : prev.loading,
        }));

        if (userIdChanged) {
          await fetchProfile(session.user.id, false);
        }
      }
    });

    sessionCheckIntervalRef.current = setInterval(async () => {
      if (!isMounted) return;
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session && user) {
          await signOut();
        }
      } catch (e) { }
    }, 30 * 60 * 1000);

    return () => {
      isMounted = false;
      subscription.unsubscribe();
      if (sessionCheckIntervalRef.current) {
        clearInterval(sessionCheckIntervalRef.current as any);
      }
    };
  }, [fetchProfile, user, signOut]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;

    if (data?.user) {
      setAuthState(prev => ({ ...prev, user: data.user, loading: true }));
      await fetchProfile(data.user.id, false);
    }
    return data;
  }, [fetchProfile]);

  const checkSession = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      return !!session;
    } catch {
      return false;
    }
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) throw error;
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    session,
    profile,
    loading,
    authError,
    appRole,
    signIn,
    signOut,
    checkSession,
    resetPassword,
  }), [user, session, profile, loading, authError, appRole, signIn, signOut, checkSession, resetPassword]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
